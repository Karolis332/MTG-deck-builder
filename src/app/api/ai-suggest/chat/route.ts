import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards, getFormatStaples, getMetaCardStatsMap } from '@/lib/db';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE, COMMANDER_FORMATS } from '@/lib/constants';
import { fitsColorIdentity, isLegalInFormat, extractRejectedCards, buildRejectionReminder, extractAppliedActions, buildAntiOscillationRules } from '@/lib/ai-chat-helpers';
import { queryKnowledge, formatKnowledgeForPrompt } from '@/lib/knowledge-retrieval';
import { getCFRecommendations, getEDHRECConsensus } from '@/lib/cf-api-client';
import { getEdhrecRecommendations } from '@/lib/edhrec';
import type { DbCard } from '@/lib/types';

interface ChatAction {
  action: 'add' | 'cut' | 'swap';
  cardName: string;
  replaceWith?: string;
  quantity: number;
  reason: string;
}

interface ChatResponse {
  message: string;
  actions: ChatAction[];
}

function getOpenAIKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_openai_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

function getAnthropicKey(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'setting_anthropic_api_key'")
    .get() as { value: string } | undefined;
  return row?.value || null;
}

function resolveCard(name: string): DbCard | null {
  const db = getDb();
  return (
    (db
      .prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1')
      .get(name) as DbCard | undefined) || null
  );
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deck_id, prompt, history } = body as {
      deck_id: number;
      prompt: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    console.log('[AI Chat] === NEW REQUEST ===');
    console.log('[AI Chat] Prompt:', prompt);
    console.log('[AI Chat] Code version: v3-buffered-json-streaming');

    if (!deck_id || !prompt) {
      return NextResponse.json(
        { error: 'deck_id and prompt are required' },
        { status: 400 }
      );
    }

    // Try Claude first (recommended), fall back to OpenAI, then local data engine
    const claudeKey = getAnthropicKey();
    const openaiKey = getOpenAIKey();
    const useClaude = !!claudeKey;
    const apiKey = claudeKey || openaiKey;
    const useLocalEngine = !apiKey;

    console.log(`[AI Chat] Using provider: ${useLocalEngine ? 'Local Data Engine' : useClaude ? 'Claude' : 'OpenAI GPT-4o'}`);

    // Always fetch FRESH deck state — the deck may have changed since last turn
    const deckData = getDeckWithCards(deck_id);
    if (!deckData) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const deck = deckData as {
      name: string;
      format: string;
      user_id: number;
      cards: Array<{ quantity: number; board: string; card_id?: string } & DbCard>;
    };
    const format = deck.format || 'standard';

    // ── Fetch user's collection ────────────────────────────────────────
    const db = getDb();
    // Fetch all unique card names in collection (for total count + fast-path queries)
    const allCollectionCards = db
      .prepare(`
        SELECT DISTINCT c.name
        FROM collection col
        JOIN cards c ON col.card_id = c.id
        WHERE col.user_id = (SELECT user_id FROM decks WHERE id = ?)
        ORDER BY c.name
      `)
      .all(deck_id) as Array<{ name: string }>;

    const collectionCardNames = allCollectionCards.map(c => c.name);
    const hasCollection = allCollectionCards.length > 0;

    console.log(`[AI Chat] User collection: ${allCollectionCards.length} unique cards`);

    // ── FAST PATH: Collection visibility questions ─────────────────────
    if (prompt.match(/can you see (my )?collection|do you (have|know) (my )?collection/i)) {
      if (hasCollection) {
        return NextResponse.json({
          message: `Yes! I can see your full collection with **${allCollectionCards.length} unique cards**. I'll only suggest cards you own when making recommendations.\n\nSample from your collection: ${collectionCardNames.slice(0, 10).join(', ')}${allCollectionCards.length > 10 ? `, and ${allCollectionCards.length - 10} more...` : ''}`,
          actions: [],
        });
      } else {
        return NextResponse.json({
          message: `I don't see any cards in your collection yet. You can import your collection from:\n- Arena log file (automatic import)\n- Manual card entry\n- Bulk import\n\nOnce you have cards in your collection, I'll prefer suggesting those when making recommendations!`,
          actions: [],
        });
      }
    }

    // ── FAST PATH: Direct card info questions ──────────────────────────
    // If user asks "what does X do?" or "explain X", return oracle text directly
    const cardInfoMatch = prompt.match(/(?:what (?:does|is)|explain|tell me about) (.+?)(?:\?|$)/i);
    if (cardInfoMatch) {
      let searchName = cardInfoMatch[1].trim().toLowerCase();
      // Strip common trailing words like "do", "work", "say", etc.
      searchName = searchName.replace(/\s+(do|does|work|say|mean)$/i, '');

      console.log('[AI Chat] Card info query detected:', searchName);

      // First check if card is in the deck
      let matchedCard: DbCard | undefined = deck.cards.find(
        (c) => {
          const cardLower = c.name.toLowerCase();
          return cardLower === searchName ||
                 cardLower.includes(searchName) ||
                 searchName.includes(cardLower);
        }
      );

      // Track if card is in deck
      const inDeck = !!matchedCard;

      // If not in deck, search the entire card database
      if (!matchedCard) {
        const db = getDb();
        matchedCard = db
          .prepare('SELECT * FROM cards WHERE name LIKE ? COLLATE NOCASE LIMIT 1')
          .get(`%${searchName}%`) as DbCard | undefined;
      }

      if (matchedCard) {
        console.log('[AI Chat] Returning oracle text for:', matchedCard.name);
        const deckNote = inDeck ? '' : '\n\n*(Not in your deck)*';
        return NextResponse.json({
          message: `**${matchedCard.name}** — ${matchedCard.type_line} (CMC ${matchedCard.cmc})\n\n${matchedCard.oracle_text || 'No rules text.'}${deckNote}`,
          actions: [],
        });
      } else {
        console.log('[AI Chat] No card found in database, falling through to AI');
      }
    }

    const mainCards = deck.cards.filter((c) => c.board === 'main');
    const commanderCards = deck.cards.filter((c) => c.board === 'commander');
    const isCommanderLike = COMMANDER_FORMATS.includes(
      format as (typeof COMMANDER_FORMATS)[number]
    );

    // ── FAST PATH: Verify deck cards in collection ─────────────────────
    if (prompt.match(/are (all )?(these|the|my deck) cards? in (my )?collection|which cards?( in (this|my) deck)? (are ?n[o']?t|not|are) (in )?(my )?collection/i)) {
      const deckCardNames = [...mainCards, ...commanderCards].map(c => c.name);
      const collectionSet = new Set(collectionCardNames.map(n => n.toLowerCase()));

      const inCollection = deckCardNames.filter(name => collectionSet.has(name.toLowerCase()));
      const notInCollection = deckCardNames.filter(name => !collectionSet.has(name.toLowerCase()));

      if (notInCollection.length === 0) {
        return NextResponse.json({
          message: `✅ **All ${deckCardNames.length} cards in your deck are in your collection!**\n\nYou own every card in this deck.`,
          actions: [],
        });
      } else {
        return NextResponse.json({
          message: `**Collection Status:**\n\n✅ **In collection** (${inCollection.length} cards):\n${inCollection.join(', ')}\n\n❌ **Missing from collection** (${notInCollection.length} cards):\n${notInCollection.join(', ')}\n\n💡 You need to acquire ${notInCollection.length} cards to complete this deck.`,
          actions: [],
        });
      }
    }
    const targetSize = DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default;
    const currentMainCount = mainCards.reduce((s, c) => s + c.quantity, 0);
    const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;
    const landCount = mainCards
      .filter((c) => (c.type_line || '').includes('Land'))
      .reduce((s, c) => s + c.quantity, 0);

    // Detect color identity from commander + all cards
    const colorSet = new Set<string>();
    // Commander's color identity defines the deck's identity
    for (const card of commanderCards) {
      try {
        const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
        ci.forEach((c) => colorSet.add(c));
      } catch {}
    }
    // If no commander, derive from deck
    if (commanderCards.length === 0) {
      for (const card of mainCards) {
        try {
          const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
          ci.forEach((c) => colorSet.add(c));
        } catch {}
      }
    }
    const deckColors = Array.from(colorSet);

    // ── Build color-filtered collection for AI context ──────────────────
    // Instead of sending arbitrary 200 cards, send ALL cards that match
    // the deck's color identity (typically 500-1500 vs 2500+ total)
    let filteredCollectionNames: string[] = [];
    if (hasCollection) {
      // Build SQL color filter: exclude cards with colors outside deck identity
      const excludeColors = ['W', 'U', 'B', 'R', 'G'].filter(c => !colorSet.has(c));
      const colorClauses = excludeColors.map(c => `c.color_identity NOT LIKE '%${c}%'`);
      const colorFilter = colorClauses.length > 0 ? `AND ${colorClauses.join(' AND ')}` : '';

      const existingCardNameSet = new Set(
        [...mainCards, ...commanderCards].map(c => c.name.toLowerCase())
      );

      const filteredCards = db
        .prepare(`
          SELECT DISTINCT c.name
          FROM collection col
          JOIN cards c ON col.card_id = c.id
          WHERE col.user_id = (SELECT user_id FROM decks WHERE id = ?)
          ${colorFilter}
          ORDER BY c.edhrec_rank ASC NULLS LAST
        `)
        .all(deck_id) as Array<{ name: string }>;

      // Exclude cards already in deck
      filteredCollectionNames = filteredCards
        .map(c => c.name)
        .filter(name => !existingCardNameSet.has(name.toLowerCase()));

      console.log(`[AI Chat] Collection filtered: ${allCollectionCards.length} total → ${filteredCollectionNames.length} in color identity {${deckColors.join(',')}}`);
    }

    // ── CF Engine Recommendations ────────────────────────────────────────
    let cfRecommendations = '';
    let cfConsensus = '';
    if (commanderCards.length > 0) {
      const deckCardNames = mainCards.map(c => c.name);
      const cmdName = commanderCards[0].name;
      try {
        const [cfRecs, consensus] = await Promise.all([
          getCFRecommendations(deckCardNames, cmdName, 20).catch(() => []),
          getEDHRECConsensus(deckCardNames, cmdName).catch(() => null),
        ]);

        if (cfRecs.length > 0) {
          const collectionLower = new Set(filteredCollectionNames.map(n => n.toLowerCase()));
          const existingLower = new Set([...mainCards, ...commanderCards].map(c => c.name.toLowerCase()));
          // Filter out cards already in deck
          const relevantRecs = cfRecs.filter(r => !existingLower.has(r.card_name.toLowerCase()));

          cfRecommendations = `\n═══ CF ENGINE RECOMMENDATIONS (from similar decks in corpus) ═══\n`;
          cfRecommendations += `These cards appear most frequently in decks similar to yours:\n`;

          if (hasCollection) {
            const inColl = relevantRecs.filter(r => collectionLower.has(r.card_name.toLowerCase()));
            const notInColl = relevantRecs.filter(r => !collectionLower.has(r.card_name.toLowerCase()));
            if (inColl.length > 0) {
              cfRecommendations += `\nIN YOUR COLLECTION (prioritize these):\n`;
              cfRecommendations += inColl.map(r => `- ${r.card_name} (CF score: ${r.cf_score.toFixed(2)}, in ${r.similar_deck_count} similar decks)`).join('\n');
            }
            if (notInColl.length > 0) {
              cfRecommendations += `\n\nNOT IN COLLECTION (for reference):\n`;
              cfRecommendations += notInColl.slice(0, 5).map(r => `- ${r.card_name} (CF score: ${r.cf_score.toFixed(2)})`).join('\n');
            }
          } else {
            cfRecommendations += relevantRecs.map(r => `- ${r.card_name} (CF score: ${r.cf_score.toFixed(2)}, in ${r.similar_deck_count} similar decks)`).join('\n');
          }
          cfRecommendations += `\n\nPRIORITIZE CF-recommended cards when suggesting ADDs — they are proven in similar decks.`;
        }

        if (consensus && consensus.edhrec_deck_found) {
          cfConsensus = `\n═══ EDHREC CONSENSUS ANALYSIS ═══\n`;
          cfConsensus += `Your deck overlaps ${consensus.overlap_pct.toFixed(0)}% with the EDHREC average (${consensus.overlap_count}/${consensus.edhrec_card_count} cards).\n`;
          if (consensus.missing_staples.length > 0) {
            cfConsensus += `\nMISSING STAPLES (most ${cmdName} decks include these):\n`;
            cfConsensus += consensus.missing_staples.slice(0, 10).map(c => `- ${c.card_name}`).join('\n');
          }
          if (consensus.unique_picks.length > 0) {
            cfConsensus += `\n\nUNIQUE PICKS (in your deck but uncommon for ${cmdName}):\n`;
            cfConsensus += consensus.unique_picks.slice(0, 5).map(c => `- ${c.card_name}`).join('\n');
          }
          cfConsensus += `\n\nConsider replacing UNIQUE PICKS with MISSING STAPLES for a more consistent build.`;
        }
      } catch (e) {
        console.log('[AI Chat] CF API calls failed (non-blocking):', e);
      }
    }

    // ── Applied Actions & Anti-Oscillation ──────────────────────────────
    const { recentlyAdded, recentlyCut } = extractAppliedActions(history || []);
    const antiOscillationRules = buildAntiOscillationRules(recentlyAdded, recentlyCut);
    if (recentlyAdded.size > 0 || recentlyCut.size > 0) {
      console.log(`[AI Chat] Anti-oscillation: ${recentlyAdded.size} locked adds, ${recentlyCut.size} locked cuts`);
    }

    // Detect illegal cards
    const illegalCards: string[] = [];
    for (const card of [...mainCards, ...commanderCards]) {
      if (!card.legalities) continue;
      try {
        const legalities = JSON.parse(card.legalities);
        const status = legalities[format];
        if (status && status !== 'legal' && status !== 'restricted') {
          illegalCards.push(`${card.name} (${status})`);
        }
      } catch {}
    }

    // Detect singleton violations
    const nameCounts = new Map<string, number>();
    for (const card of mainCards) {
      const isBasic = (card.type_line || '').includes('Basic');
      if (!isBasic) {
        nameCounts.set(card.name, (nameCounts.get(card.name) || 0) + card.quantity);
      }
    }
    const singletonViolations = isCommanderLike
      ? Array.from(nameCounts.entries()).filter(([, count]) => count > 1).map(([name, count]) => `${name} (${count})`)
      : [];

    // Build deck list grouped by type — include oracle text so GPT knows what cards actually do
    const deckByType: Record<string, string[]> = {};
    for (const c of mainCards) {
      const mainType = c.type_line.split('—')[0].trim().split(' ').pop() || 'Other';
      if (!deckByType[mainType]) deckByType[mainType] = [];
      const oracle = c.oracle_text ? ` — ${c.oracle_text.replace(/\n/g, '; ')}` : '';
      deckByType[mainType].push(`${c.quantity}x ${c.name} (CMC:${c.cmc})${oracle}`);
    }
    const deckSummary = Object.entries(deckByType)
      .map(([type, cards]) => `${type} (${cards.length}):\n${cards.join('\n')}`)
      .join('\n\n');

    const commanderInfo =
      commanderCards.length > 0
        ? `Commander: ${commanderCards.map((c) => {
            const oracle = c.oracle_text ? ` — ${c.oracle_text.replace(/\n/g, '; ')}` : '';
            return `${c.name} (${c.type_line}, CMC:${c.cmc})${oracle}`;
          }).join('\n')}`
        : '';

    const effectiveTarget = isCommanderLike
      ? targetSize - (commanderCards.length > 0 ? 1 : 0)
      : targetSize;
    const sizeStatus = currentMainCount === effectiveTarget
      ? 'EXACTLY at target'
      : currentMainCount > effectiveTarget
        ? `OVER by ${currentMainCount - effectiveTarget}`
        : `UNDER by ${effectiveTarget - currentMainCount}`;

    // Build explicit list of all cards in deck, grouped by type (for duplicate prevention)
    const allCardNames = [...mainCards, ...commanderCards].map(c => c.name).sort();
    const cardListByType: Record<string, string[]> = {};
    for (const c of [...mainCards, ...commanderCards]) {
      const mainType = c.type_line?.split('—')[0].trim().split(' ').pop() || 'Other';
      if (!cardListByType[mainType]) cardListByType[mainType] = [];
      cardListByType[mainType].push(`  ${c.quantity}x ${c.name}`);
    }
    const cardNameListGrouped = Object.entries(cardListByType)
      .map(([type, cards]) => `${type}:\n${cards.join('\n')}`)
      .join('\n');

    // ── Community Knowledge Retrieval (EDHREC + MTGGoldfish) ──────────
    // Search FTS5 tables for articles matching commander name, archetype, or user query
    let communityKnowledge = '';
    {
      const searchTerms: string[] = [];
      if (commanderCards.length > 0) {
        searchTerms.push(commanderCards[0].name);
      }
      // Add keywords from the user's prompt
      const queryWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      searchTerms.push(...queryWords.slice(0, 3));

      if (searchTerms.length > 0) {
        const knowledgeChunks = queryKnowledge({
          searchTerms,
          commander: commanderCards[0]?.name,
          format,
          maxResults: 5,
        });
        communityKnowledge = formatKnowledgeForPrompt(knowledgeChunks);
      }
    }

    // ── EDHREC Average Decklist for Commander ────────────────────────────
    if (commanderCards.length > 0) {
      try {
        const cmdName = commanderCards[0].name;
        const avgCards = db.prepare(`
          SELECT card_name, category, inclusion_rate
          FROM edhrec_avg_decks
          WHERE commander_name = ?
          ORDER BY inclusion_rate DESC
          LIMIT 40
        `).all(cmdName) as Array<{ card_name: string; category: string; inclusion_rate: number }>;

        if (avgCards.length > 0) {
          const byCategory: Record<string, string[]> = {};
          for (const c of avgCards) {
            if (!byCategory[c.category]) byCategory[c.category] = [];
            byCategory[c.category].push(`${c.card_name} (${Math.round(c.inclusion_rate * 100)}%)`);
          }
          communityKnowledge += `\n═══ EDHREC AVERAGE DECKLIST for ${cmdName} ═══\n`;
          communityKnowledge += `These are the most commonly played cards in ${cmdName} decks on EDHREC:\n`;
          for (const [cat, cards] of Object.entries(byCategory)) {
            communityKnowledge += `\n${cat}: ${cards.join(', ')}`;
          }
          communityKnowledge += `\n\nUse these as reference when suggesting cards — high inclusion rate means community-validated.`;
        }
      } catch {
        // Table may not exist — that's fine
      }
    }

    // ── ML Predictions (from pipeline) ──────────────────────────────────
    let mlPredictions = '';
    try {
      const mlSuggestions = db.prepare(`
        SELECT card_name, predicted_score, reason
        FROM personalized_suggestions
        WHERE deck_id = ?
        ORDER BY predicted_score DESC
        LIMIT 15
      `).all(deck_id) as Array<{ card_name: string; predicted_score: number; reason: string | null }>;

      const mlStats = db.prepare(`
        SELECT COUNT(*) as game_count, AVG(curve_efficiency) as avg_curve, AVG(deck_penetration) as avg_penetration
        FROM match_ml_features
        WHERE deck_id = ?
      `).get(deck_id) as { game_count: number; avg_curve: number | null; avg_penetration: number | null } | undefined;

      if (mlSuggestions.length > 0) {
        const gameCount = mlStats?.game_count || 0;
        mlPredictions = `\n═══ ML PREDICTIONS (from ${gameCount} games played) ═══\nTop predicted cards for this deck:\n`;
        mlPredictions += mlSuggestions
          .map(s => `- ${s.card_name} (score: ${s.predicted_score.toFixed(2)})${s.reason ? ` — ${s.reason}` : ''}`)
          .join('\n');
        if (mlStats?.avg_curve != null || mlStats?.avg_penetration != null) {
          mlPredictions += `\nDeck stats: curve efficiency ${(mlStats.avg_curve ?? 0).toFixed(2)}, deck penetration ${(mlStats.avg_penetration ?? 0).toFixed(2)}`;
        }
        mlPredictions += `\nPrioritize ML-recommended cards when suggesting ADDs.`;
      }
    } catch {
      // Tables may not exist if ML pipeline hasn't run — that's fine
    }

    // ── EDHREC Live Recommendations (commander-specific) ──────────
    let edhrecLiveBlock = '';
    if (commanderCards.length > 0) {
      try {
        const cmdName = commanderCards[0].name;
        const edhrecData = await getEdhrecRecommendations(cmdName);
        if (edhrecData && edhrecData.topCards.length > 0) {
          const existingLower = new Set([...mainCards, ...commanderCards].map(c => c.name.toLowerCase()));
          const collectionLower = hasCollection
            ? new Set(filteredCollectionNames.map(n => n.toLowerCase()))
            : null;

          // Split EDHREC cards into owned/unowned, excluding already-in-deck
          const edhrecMissing = edhrecData.topCards
            .filter(c => !existingLower.has(c.name.toLowerCase()))
            .sort((a, b) => b.inclusion - a.inclusion);

          if (edhrecMissing.length > 0) {
            edhrecLiveBlock = `\n═══ EDHREC LIVE DATA for ${cmdName} ═══\n`;
            edhrecLiveBlock += `Cards most commonly played in ${cmdName} decks (NOT in your deck):\n`;

            if (collectionLower) {
              const ownedMissing = edhrecMissing.filter(c => collectionLower.has(c.name.toLowerCase()));
              const unownedMissing = edhrecMissing.filter(c => !collectionLower.has(c.name.toLowerCase()));
              if (ownedMissing.length > 0) {
                edhrecLiveBlock += `\nYOU OWN THESE (high priority adds):\n`;
                edhrecLiveBlock += ownedMissing.slice(0, 15).map(c =>
                  `- ${c.name} (${Math.round(c.inclusion * 100)}% of decks, synergy: ${c.synergy.toFixed(2)})`
                ).join('\n');
              }
              if (unownedMissing.length > 0) {
                edhrecLiveBlock += `\n\nNOT OWNED (reference only):\n`;
                edhrecLiveBlock += unownedMissing.slice(0, 5).map(c =>
                  `- ${c.name} (${Math.round(c.inclusion * 100)}% of decks)`
                ).join('\n');
              }
            } else {
              edhrecLiveBlock += edhrecMissing.slice(0, 15).map(c =>
                `- ${c.name} (${Math.round(c.inclusion * 100)}% of decks, synergy: ${c.synergy.toFixed(2)})`
              ).join('\n');
            }

            if (edhrecData.themes.length > 0) {
              edhrecLiveBlock += `\n\nPopular themes: ${edhrecData.themes.join(', ')}`;
            }
            edhrecLiveBlock += `\n\nPRIORITIZE EDHREC-recommended cards when suggesting ADDs — they are community-validated.`;
          }
        }
      } catch (e) {
        console.log('[AI Chat] EDHREC live fetch failed (non-blocking):', e);
      }
    }

    // ── Format Staples (from 67K scraped decks, cross-format) ────────
    let formatStaplesBlock = '';
    {
      const staples = getFormatStaples(format, deckColors, 30);
      if (staples.length > 0) {
        const existingLower = new Set([...mainCards, ...commanderCards].map(c => c.name.toLowerCase()));
        const collectionLower = hasCollection
          ? new Set(filteredCollectionNames.map(n => n.toLowerCase()))
          : null;

        // Split: in deck vs missing
        const inDeck = staples.filter(s => existingLower.has(s.cardName.toLowerCase()));
        const missing = staples.filter(s => !existingLower.has(s.cardName.toLowerCase()));

        formatStaplesBlock = `\n═══ FORMAT STAPLES (from ${staples[0].totalDecks}+ scraped decks) ═══\n`;

        if (inDeck.length > 0) {
          formatStaplesBlock += `Already in deck (good): ${inDeck.slice(0, 10).map(s =>
            `${s.cardName} (${Math.round(s.inclusionRate * 100)}%)`
          ).join(', ')}\n`;
        }

        if (missing.length > 0) {
          if (collectionLower) {
            const ownedMissing = missing.filter(s => collectionLower.has(s.cardName.toLowerCase()));
            const unownedMissing = missing.filter(s => !collectionLower.has(s.cardName.toLowerCase()));
            if (ownedMissing.length > 0) {
              formatStaplesBlock += `\nMISSING STAPLES YOU OWN (should strongly consider adding):\n`;
              formatStaplesBlock += ownedMissing.slice(0, 15).map(s =>
                `- ${s.cardName} — in ${Math.round(s.inclusionRate * 100)}% of ${format} decks (${s.deckCount}/${s.totalDecks})`
              ).join('\n');
            }
            if (unownedMissing.length > 0) {
              formatStaplesBlock += `\n\nMISSING STAPLES NOT OWNED:\n`;
              formatStaplesBlock += unownedMissing.slice(0, 5).map(s =>
                `- ${s.cardName} — in ${Math.round(s.inclusionRate * 100)}% of decks`
              ).join('\n');
            }
          } else {
            formatStaplesBlock += `\nMISSING STAPLES:\n`;
            formatStaplesBlock += missing.slice(0, 15).map(s =>
              `- ${s.cardName} — in ${Math.round(s.inclusionRate * 100)}% of ${format} decks`
            ).join('\n');
          }
        }

        formatStaplesBlock += `\n\nCards with >50% inclusion rate are FORMAT STAPLES — strongly recommend including them.`;
      }
    }

    // ── Meta Stats for Current Deck Cards ──────────────────────────
    let metaStatsBlock = '';
    {
      const deckCardNames = [...mainCards, ...commanderCards].map(c => c.name);
      const metaMap = getMetaCardStatsMap(deckCardNames, format);
      if (metaMap.size > 0) {
        // Find weak cards (low inclusion rate) — cut candidates
        const weakCards = deckCardNames
          .map(name => ({ name, stats: metaMap.get(name) }))
          .filter(c => c.stats && c.stats.inclusionRate < 0.05)
          .sort((a, b) => (a.stats?.inclusionRate ?? 0) - (b.stats?.inclusionRate ?? 0));

        const strongCards = deckCardNames
          .map(name => ({ name, stats: metaMap.get(name) }))
          .filter(c => c.stats && c.stats.inclusionRate > 0.3)
          .sort((a, b) => (b.stats?.inclusionRate ?? 0) - (a.stats?.inclusionRate ?? 0));

        if (weakCards.length > 0 || strongCards.length > 0) {
          metaStatsBlock = `\n═══ DECK META ANALYSIS (data-driven) ═══\n`;
          if (strongCards.length > 0) {
            metaStatsBlock += `Strong picks (high meta inclusion): ${strongCards.slice(0, 8).map(c =>
              `${c.name} (${Math.round((c.stats?.inclusionRate ?? 0) * 100)}%)`
            ).join(', ')}\n`;
          }
          if (weakCards.length > 0) {
            metaStatsBlock += `Weak picks (rare in meta — CUT candidates): ${weakCards.slice(0, 8).map(c =>
              `${c.name} (<${Math.round((c.stats?.inclusionRate ?? 0) * 100 + 1)}%)`
            ).join(', ')}\n`;
          }
          metaStatsBlock += `Use this data to inform CUT decisions — low-meta cards are prime cut candidates.`;
        }
      }
    }

    // System prompt — explicit and strict to prevent common errors
    const systemPrompt = `You are an expert MTG deck tuning assistant.

═══════════════════════════════════════════════════════════
CURRENT DECK STATE (YOUR SINGLE SOURCE OF TRUTH)
═══════════════════════════════════════════════════════════
Deck Name: "${deck.name}"
Format: ${format}
${commanderInfo}
Color Identity: {${deckColors.join(', ') || 'Colorless'}} — ONLY these colors allowed
Main Deck: ${currentMainCount}/${effectiveTarget} cards (${sizeStatus})
Lands: ${landCount}/${targetLands}
${illegalCards.length > 0 ? `⚠️ ILLEGAL CARDS TO REPLACE: ${illegalCards.join(', ')}` : ''}
${singletonViolations.length > 0 ? `⚠️ SINGLETON VIOLATIONS TO FIX: ${singletonViolations.join(', ')}` : ''}

ALL CARDS CURRENTLY IN DECK (${allCardNames.length} cards):
${cardNameListGrouped}

${hasCollection ? `
USER'S COLLECTION — ${allCollectionCards.length} total cards owned, ${filteredCollectionNames.length} match deck colors {${deckColors.join(', ')}}:
${filteredCollectionNames.join(', ')}

⚡ CRITICAL: ONLY suggest ADD cards from this collection list above. The user wants to play with cards they own.
` : ''}
═══════════════════════════════════════════════════════════
HARD RULES — NEVER VIOLATE THESE
═══════════════════════════════════════════════════════════
1. CHECK THE LIST ABOVE: NEVER suggest cards already in the deck
2. ONLY suggest cards in color identity {${deckColors.join(', ')}}
3. ${isCommanderLike ? `CRITICAL: Deck MUST stay at ${effectiveTarget} cards. COUNT YOUR ACTIONS:
   - Every ADD needs a CUT (use "swap" action)
   - Before responding: cuts = adds? If not, fix it.
   - Math check: ${currentMainCount} - cuts + adds = ${effectiveTarget}` : 'Keep deck around 60 cards'}
4. ${isCommanderLike ? 'Singleton format: max 1 copy of each non-basic land' : 'Max 4 copies per card'}
5. Only suggest cards legal in ${format}
6. Never cut lands unless deck has ${targetLands + 3}+ lands

═══════════════════════════════════════════════════════════
VALIDATION CHECKLIST (ANSWER BEFORE RESPONDING)
═══════════════════════════════════════════════════════════
Before you respond, verify:
${isCommanderLike ? `□ Do my CUTs equal my ADDs? (Required for ${format})` : '□ Is deck size reasonable (58-62 cards)?'}
□ Did I check "ALL CARDS CURRENTLY IN DECK" to avoid duplicates?
□ Are all my ADD cards in color identity {${deckColors.join(', ')}}?
□ Are all my ADD cards legal in ${format}?
□ Did I count the final deck size: ${currentMainCount} - cuts + adds = ?

═══════════════════════════════════════════════════════════
CURRENT DECKLIST (with oracle text for reasoning)
═══════════════════════════════════════════════════════════
${deckSummary}

${communityKnowledge}
${edhrecLiveBlock}
${formatStaplesBlock}
${metaStatsBlock}
${mlPredictions}
${cfRecommendations}
${cfConsensus}
${antiOscillationRules}
═══════════════════════════════════════════════════════════
RESPONSE FORMAT (strict JSON — NO MARKDOWN)
═══════════════════════════════════════════════════════════
Respond with ONLY valid JSON. Do NOT wrap in markdown code blocks. Do NOT use \`\`\`json tags. Output raw JSON directly:
{"message":"Your explanation","actions":[{"action":"swap","cardName":"Cut This","replaceWith":"Add This","quantity":1,"reason":"why"}]}
Use "swap" for replacements. Only use "add"/"cut" if deck size must change.
CRITICAL: Your ENTIRE response must be a single JSON object. No prose before or after. No code fences.`;

    // Build messages — short history + fresh state reminder each turn
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Only keep last 6 history messages to prevent context dilution
    if (history && history.length > 0) {
      const trimmed = history.slice(-6);
      for (const msg of trimmed) {
        messages.push({ role: msg.role, content: msg.content });
      }

      // Inject a FRESH state reminder before the user's message
      // This is critical because the deck may have changed since last turn
      messages.push({
        role: 'system',
        content: `═══ FRESH DECK STATE UPDATE ═══
The deck may have changed since your last response. Here is the CURRENT state:
- Main deck: ${currentMainCount}/${effectiveTarget} cards (${sizeStatus})
- Lands: ${landCount}/${targetLands}
- ALL cards now in deck:
${cardNameListGrouped}
${hasCollection ? `- Collection cards available (${filteredCollectionNames.length} in deck colors): ${filteredCollectionNames.join(', ')}` : ''}

${isCommanderLike ? `CRITICAL: Deck MUST stay at ${effectiveTarget} cards. Every ADD needs a CUT.` : ''}
${hasCollection ? 'ONLY suggest ADD cards from the collection list above.' : ''}
Remember to check the card list above to avoid suggesting duplicates!`,
      });
    }

    // ── Rejection feedback loop ─────────────────────────────────────────
    // Scan the last assistant message for rejected cards and remind the AI
    if (messages.length >= 2) {
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistant) {
        const rejected = extractRejectedCards(lastAssistant.content);
        const reminder = buildRejectionReminder(rejected);
        if (reminder) {
          console.log('[AI Chat] Injecting rejection reminder:', reminder);
          messages.push({ role: 'system', content: reminder });
        }
      }
    }

    messages.push({ role: 'user', content: prompt });

    // ── Helper: validate + resolve actions from AI response ─────────────
    type ResolvedAction = {
      action: 'cut' | 'add';
      cardId: string;
      cardName: string;
      quantity: number;
      reason: string;
      imageUri?: string;
    };
    const validateAndResolve = (content: string): { message: string; actions: ResolvedAction[] } => {
      const resolvedActions: ResolvedAction[] = [];
      const existingCardNames = new Set(deck.cards.map((c) => c.name.toLowerCase()));
      const rejectedCards: string[] = [];
      let antiOscillationFiltered = 0;
      // Server-side collection enforcement — LLM prompt alone is unreliable
      const collectionNameSet = hasCollection
        ? new Set(filteredCollectionNames.map(n => n.toLowerCase()))
        : null;
      const rejectionReasons = {
        wrongColors: [] as string[],
        notLegal: [] as string[],
        alreadyInDeck: [] as string[],
        notFound: [] as string[],
        notInCollection: [] as string[],
      };

      let parsed: ChatResponse;
      try {
        // Strip markdown code fences if model wrapped response
        let jsonText = content.trim();
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        // Try to extract a JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
        parsed = JSON.parse(jsonText);
      } catch {
        console.warn('[AI Chat] Non-JSON response, returning as plain message');
        // Clean code fences from display text so user doesn't see raw ```json blocks
        const cleaned = content
          .replace(/^```(?:json)?\s*\n?/gim, '')
          .replace(/\n?```\s*$/gim, '')
          .trim();
        // If it still looks like raw JSON, extract just the message field if possible
        try {
          const msgMatch = cleaned.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (msgMatch) {
            return { message: msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'), actions: [] };
          }
        } catch {}
        return { message: cleaned, actions: [] };
      }

      for (const act of parsed.actions || []) {
        if (act.action === 'swap') {
          const cutCard = deck.cards.find(
            (c) => c.name.toLowerCase() === act.cardName.toLowerCase()
          );
          const addCard = act.replaceWith ? resolveCard(act.replaceWith) : null;

          let addValid = false;
          let addRejectionReason = '';

          if (addCard) {
            if (!fitsColorIdentity(addCard, colorSet)) {
              addRejectionReason = 'wrong colors';
              rejectionReasons.wrongColors.push(addCard.name);
            } else if (!isLegalInFormat(addCard, format)) {
              addRejectionReason = `not legal in ${format}`;
              rejectionReasons.notLegal.push(addCard.name);
            } else if (existingCardNames.has(addCard.name.toLowerCase())) {
              addRejectionReason = 'already in deck';
              rejectionReasons.alreadyInDeck.push(addCard.name);
            } else if (collectionNameSet && !collectionNameSet.has(addCard.name.toLowerCase())) {
              addRejectionReason = 'not in your collection';
              rejectionReasons.notInCollection.push(addCard.name);
            } else if (recentlyCut.has(addCard.name.toLowerCase())) {
              addRejectionReason = 'was recently cut (anti-oscillation)';
              antiOscillationFiltered++;
            } else {
              addValid = true;
            }
          } else if (act.replaceWith) {
            addRejectionReason = 'not found in database';
            rejectionReasons.notFound.push(act.replaceWith);
          }

          // Anti-oscillation: can't cut a card that was recently added
          if (addValid && cutCard && recentlyAdded.has(cutCard.name.toLowerCase())) {
            addValid = false;
            addRejectionReason = 'cutting recently added card (anti-oscillation)';
            antiOscillationFiltered++;
          }

          if (addValid && addCard && cutCard) {
            resolvedActions.push({
              action: 'cut',
              cardId: cutCard.id || (cutCard as unknown as { card_id: string }).card_id,
              cardName: cutCard.name,
              quantity: act.quantity || 1,
              reason: act.reason,
              imageUri: cutCard.image_uri_small || undefined,
            });
            resolvedActions.push({
              action: 'add',
              cardId: addCard.id,
              cardName: addCard.name,
              quantity: act.quantity || 1,
              reason: act.reason,
              imageUri: addCard.image_uri_small || undefined,
            });
          } else {
            const failedName = act.replaceWith || 'unknown';
            rejectedCards.push(`${failedName} (${addRejectionReason}) — swap cancelled, kept ${act.cardName}`);
          }
        } else if (act.action === 'cut') {
          const cutCard = deck.cards.find(
            (c) => c.name.toLowerCase() === act.cardName.toLowerCase()
          );
          if (cutCard && recentlyAdded.has(cutCard.name.toLowerCase())) {
            rejectedCards.push(`${act.cardName} (anti-oscillation: was recently added)`);
            antiOscillationFiltered++;
          } else if (cutCard) {
            resolvedActions.push({
              action: 'cut',
              cardId: cutCard.id || (cutCard as unknown as { card_id: string }).card_id,
              cardName: cutCard.name,
              quantity: act.quantity || 1,
              reason: act.reason,
              imageUri: cutCard.image_uri_small || undefined,
            });
          }
        } else if (act.action === 'add') {
          const addCard = resolveCard(act.cardName);
          if (addCard) {
            if (!fitsColorIdentity(addCard, colorSet)) {
              rejectedCards.push(`${addCard.name} (wrong colors)`);
              rejectionReasons.wrongColors.push(addCard.name);
            } else if (!isLegalInFormat(addCard, format)) {
              rejectedCards.push(`${addCard.name} (not legal in ${format})`);
              rejectionReasons.notLegal.push(addCard.name);
            } else if (existingCardNames.has(addCard.name.toLowerCase())) {
              rejectedCards.push(`${addCard.name} (already in deck)`);
              rejectionReasons.alreadyInDeck.push(addCard.name);
            } else if (collectionNameSet && !collectionNameSet.has(addCard.name.toLowerCase())) {
              rejectedCards.push(`${addCard.name} (not in your collection)`);
              rejectionReasons.notInCollection.push(addCard.name);
            } else if (recentlyCut.has(addCard.name.toLowerCase())) {
              rejectedCards.push(`${addCard.name} (anti-oscillation: was recently cut)`);
              antiOscillationFiltered++;
            } else {
              resolvedActions.push({
                action: 'add',
                cardId: addCard.id,
                cardName: addCard.name,
                quantity: act.quantity || 1,
                reason: act.reason,
                imageUri: addCard.image_uri_small || undefined,
              });
            }
          } else {
            rejectedCards.push(`${act.cardName} (not found in database)`);
            rejectionReasons.notFound.push(act.cardName);
          }
        }
      }

      // Enforce CUT/ADD balance for fixed-size formats
      if (isCommanderLike) {
        const addCount = resolvedActions.filter((a) => a.action === 'add').reduce((s, a) => s + a.quantity, 0);
        const cutCount = resolvedActions.filter((a) => a.action === 'cut').reduce((s, a) => s + a.quantity, 0);
        const sizeAfter = currentMainCount - cutCount + addCount;

        const currentDistance = Math.abs(currentMainCount - effectiveTarget);
        const afterDistance = Math.abs(sizeAfter - effectiveTarget);
        const movingCloser = afterDistance < currentDistance;
        const atOrBelowTarget = sizeAfter <= effectiveTarget && sizeAfter >= effectiveTarget - 2;

        if (Math.abs(addCount - cutCount) > 2 && (addCount > 0 || cutCount > 0) && !movingCloser && !atOrBelowTarget) {
          const imbalance = addCount - cutCount;
          const warning = imbalance > 0
            ? `Too many ADDs (${addCount}) vs CUTs (${cutCount}). Deck would become ${sizeAfter} cards.`
            : `Too many CUTs (${cutCount}) vs ADDs (${addCount}). Deck would become ${sizeAfter} cards.`;

          console.error('[AI Chat] Unbalanced suggestions:', { addCount, cutCount, currentMainCount, sizeAfter });

          return {
            message: `⚠️ ${warning}\n\nFor ${format} format, every card added must replace a card being cut. Please suggest balanced swaps (use "swap" action) to maintain ${effectiveTarget} cards.`,
            actions: [],
          };
        }

        if (sizeAfter !== effectiveTarget && (addCount > 0 || cutCount > 0)) {
          let excess = sizeAfter - effectiveTarget;

          if (excess > 0) {
            for (let i = resolvedActions.length - 1; i >= 0 && excess > 0; i--) {
              if (resolvedActions[i].action === 'add') {
                const remove = Math.min(resolvedActions[i].quantity, excess);
                resolvedActions[i].quantity -= remove;
                excess -= remove;
                if (resolvedActions[i].quantity <= 0) {
                  rejectedCards.push(`${resolvedActions[i].cardName} (auto-trimmed to maintain deck size)`);
                  resolvedActions.splice(i, 1);
                }
              }
            }
          } else if (excess < 0) {
            excess = Math.abs(excess);
            for (let i = resolvedActions.length - 1; i >= 0 && excess > 0; i--) {
              if (resolvedActions[i].action === 'cut') {
                const remove = Math.min(resolvedActions[i].quantity, excess);
                resolvedActions[i].quantity -= remove;
                excess -= remove;
                if (resolvedActions[i].quantity <= 0) {
                  resolvedActions.splice(i, 1);
                }
              }
            }
          }
        }
      }

      let message = parsed.message;
      if (rejectedCards.length > 0) {
        message += `\n\n⚠️ **Some suggestions were filtered** (server-side validation):`;

        if (rejectionReasons.alreadyInDeck.length > 0) {
          message += `\n- ❌ Already in deck: ${rejectionReasons.alreadyInDeck.join(', ')}`;
        }
        if (rejectionReasons.wrongColors.length > 0) {
          message += `\n- ❌ Wrong color identity: ${rejectionReasons.wrongColors.join(', ')} (deck is {${deckColors.join(', ')}})`;
        }
        if (rejectionReasons.notLegal.length > 0) {
          message += `\n- ❌ Not legal in ${format}: ${rejectionReasons.notLegal.join(', ')}`;
        }
        if (rejectionReasons.notInCollection.length > 0) {
          message += `\n- ❌ Not in your collection: ${rejectionReasons.notInCollection.join(', ')}`;
        }
        if (rejectionReasons.notFound.length > 0) {
          message += `\n- ❌ Not found in database: ${rejectionReasons.notFound.join(', ')}`;
        }

        message += `\n\n💡 **Tip**: Only cards you own can be added. Check the collection list for available options.`;
      }

      // ── Convergence detection (fixed-point guarantee) ──────────────────
      // If ALL of the AI's suggestions were blocked by anti-oscillation,
      // the deck has reached a fixed point — no more valid changes exist.
      if (resolvedActions.length === 0 && antiOscillationFiltered > 0 && (parsed.actions || []).length > 0) {
        console.log(`[AI Chat] Fixed point reached: ${antiOscillationFiltered} suggestions blocked by anti-oscillation`);
        return {
          message: "Your deck is well-optimized! The changes you've already applied address the main areas for improvement. No further swaps needed.",
          actions: [],
        };
      }

      return { message, actions: resolvedActions };
    };

    // ── Local Data Engine (no API key fallback) ─────────────────────────
    if (useLocalEngine) {
      console.log('[AI Chat] No API key — running local data engine');

      // Gather all recommendation sources into a unified candidate list
      interface LocalCandidate {
        cardName: string;
        score: number;
        source: string;
        reason: string;
      }
      const candidates: LocalCandidate[] = [];
      const existingLower = new Set([...mainCards, ...commanderCards].map(c => c.name.toLowerCase()));
      const collectionLower = hasCollection
        ? new Set(filteredCollectionNames.map(n => n.toLowerCase()))
        : null;

      // Parse CF recommendations
      if (cfRecommendations) {
        const cfLines = cfRecommendations.match(/- (.+?) \(CF score: ([\d.]+)/g) || [];
        for (const line of cfLines) {
          const m = line.match(/- (.+?) \(CF score: ([\d.]+)/);
          if (m && !existingLower.has(m[1].toLowerCase())) {
            candidates.push({ cardName: m[1], score: parseFloat(m[2]) * 50, source: 'cf', reason: 'Recommended by similar decks' });
          }
        }
      }

      // Parse EDHREC live data
      if (edhrecLiveBlock) {
        const edhLines = edhrecLiveBlock.match(/- (.+?) \((\d+)% of decks/g) || [];
        for (const line of edhLines) {
          const m = line.match(/- (.+?) \((\d+)% of decks/);
          if (m && !existingLower.has(m[1].toLowerCase())) {
            candidates.push({ cardName: m[1], score: parseInt(m[2]), source: 'edhrec', reason: `In ${m[2]}% of ${commanderCards[0]?.name || ''} decks` });
          }
        }
      }

      // Parse format staples
      if (formatStaplesBlock) {
        const stapleLines = formatStaplesBlock.match(/- (.+?) — in (\d+)% of/g) || [];
        for (const line of stapleLines) {
          const m = line.match(/- (.+?) — in (\d+)% of/);
          if (m && !existingLower.has(m[1].toLowerCase())) {
            candidates.push({ cardName: m[1], score: parseInt(m[2]) + 20, source: 'staple', reason: `Format staple (${m[2]}% inclusion)` });
          }
        }
      }

      // Parse ML predictions
      if (mlPredictions) {
        const mlLines = mlPredictions.match(/- (.+?) \(score: ([\d.]+)\)/g) || [];
        for (const line of mlLines) {
          const m = line.match(/- (.+?) \(score: ([\d.]+)\)/);
          if (m && !existingLower.has(m[1].toLowerCase())) {
            candidates.push({ cardName: m[1], score: parseFloat(m[2]) * 30, source: 'ml', reason: 'ML model prediction' });
          }
        }
      }

      // Deduplicate and sort by score
      const seen = new Set<string>();
      const uniqueCandidates = candidates.filter(c => {
        const key = c.cardName.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Filter to collection if available, boost owned cards
      const scoredCandidates = uniqueCandidates.map(c => ({
        ...c,
        score: c.score + (collectionLower?.has(c.cardName.toLowerCase()) ? 30 : -50),
        owned: collectionLower ? collectionLower.has(c.cardName.toLowerCase()) : true,
      })).filter(c => !collectionLower || c.owned);

      scoredCandidates.sort((a, b) => b.score - a.score);

      // Find weak cards in deck (low meta inclusion — cut candidates)
      const deckCardNames = [...mainCards, ...commanderCards].map(c => c.name);
      const metaMap = getMetaCardStatsMap(deckCardNames, format);
      const weakCards = mainCards
        .filter(c => !c.type_line?.includes('Land'))
        .map(c => ({ card: c, rate: metaMap.get(c.name)?.inclusionRate ?? -1 }))
        .filter(c => c.rate >= 0 && c.rate < 0.05)
        .sort((a, b) => a.rate - b.rate);

      // Build swap actions (up to 5)
      const actions: Array<{ action: string; cardName: string; replaceWith?: string; quantity: number; reason: string }> = [];
      const maxSwaps = Math.min(5, scoredCandidates.length, weakCards.length);

      for (let i = 0; i < maxSwaps; i++) {
        const add = scoredCandidates[i];
        const cut = weakCards[i];
        if (!add || !cut) break;

        // Resolve the add card to verify it exists and is legal
        const addCard = resolveCard(add.cardName);
        if (!addCard) continue;
        if (!fitsColorIdentity(addCard, colorSet)) continue;
        if (!isLegalInFormat(addCard, format)) continue;

        actions.push({
          action: 'swap',
          cardName: cut.card.name,
          replaceWith: add.cardName,
          quantity: 1,
          reason: `${add.reason}. Replacing ${cut.card.name} (only ${Math.round(cut.rate * 100)}% meta inclusion).`,
        });
      }

      // If no swaps possible but we have add candidates, suggest them as info
      let message = '';
      const sourceBreakdown = new Map<string, number>();
      for (const c of scoredCandidates.slice(0, 10)) {
        sourceBreakdown.set(c.source, (sourceBreakdown.get(c.source) || 0) + 1);
      }
      const sourceSummary = Array.from(sourceBreakdown.entries())
        .map(([s, n]) => `${n} from ${s === 'cf' ? 'collaborative filtering' : s === 'edhrec' ? 'EDHREC' : s === 'staple' ? 'format staples' : 'ML model'}`)
        .join(', ');

      if (actions.length > 0) {
        message = `**Data-Driven Analysis** (no AI API key — using local model + 148K deck corpus)\n\n`;
        message += `Found ${scoredCandidates.length} upgrade candidates (${sourceSummary}).\n\n`;
        message += `Here are ${actions.length} recommended swaps based on meta inclusion data, EDHREC consensus, and collaborative filtering:`;
      } else if (scoredCandidates.length > 0) {
        message = `**Data-Driven Analysis** (no AI API key — using local model + 148K deck corpus)\n\n`;
        message += `Top recommendations for your deck:\n`;
        message += scoredCandidates.slice(0, 8).map(c =>
          `- **${c.cardName}** — ${c.reason} (score: ${Math.round(c.score)})`
        ).join('\n');
        message += `\n\nNo clear cut candidates found in meta data. Consider reviewing your weakest cards manually.`;
      } else {
        message = `**Data-Driven Analysis** (no AI API key)\n\nYour deck looks solid based on available data. No strong upgrade candidates found from EDHREC, collaborative filtering, or format staples. Add an Anthropic or OpenAI API key in Settings for more detailed AI analysis.`;
      }

      // Run through the same validateAndResolve pipeline as API responses
      const fakeResponse = JSON.stringify({ message, actions });
      const resolved = validateAndResolve(fakeResponse);

      return NextResponse.json(resolved);
    }

    // ── Streaming AI call ───────────────────────────────────────────────
    const systemContent = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    if (useClaude) {
      const modelRow = db.prepare("SELECT value FROM app_state WHERE key = 'setting_claude_model'").get() as { value: string } | undefined;
      const claudeModel = modelRow?.value || 'claude-sonnet-4-5-20250929';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: claudeModel,
          max_tokens: 4096,
          temperature: 0.7,
          stream: true,
          messages: chatMessages,
          system: systemContent,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude chat API error:', response.status, errText);
        let detail = '';
        try {
          const errData = JSON.parse(errText);
          detail = errData.error?.message || errData.message || errText.slice(0, 200);
        } catch {
          detail = errText.slice(0, 200);
        }
        return NextResponse.json(
          { error: `Claude API error: ${response.status} — ${detail}` },
          { status: 502 }
        );
      }

      // Stream SSE to client — buffer JSON responses, only stream natural text
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullText = '';
          let completed = false;
          let isJsonResponse = false;
          let jsonDetected = false;
          try {
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6).trim();
                if (!payload || payload === '[DONE]') continue;

                try {
                  const event = JSON.parse(payload);

                  if (event.type === 'content_block_delta' && event.delta?.text) {
                    fullText += event.delta.text;

                    // Detect if response is JSON (starts with { or ```json)
                    if (!jsonDetected) {
                      const trimmed = fullText.trimStart();
                      if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
                        isJsonResponse = true;
                        jsonDetected = true;
                        // Send a placeholder so user sees activity
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: 'Analyzing your deck...' })}\n\n`));
                      } else if (trimmed.length > 5) {
                        // Not JSON — stream normally
                        jsonDetected = true;
                        isJsonResponse = false;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: fullText })}\n\n`));
                      }
                    } else if (!isJsonResponse) {
                      // Natural text — stream delta normally
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`));
                    }
                    // If JSON response, we buffer silently (no streaming to UI)
                  } else if (event.type === 'message_stop' && !completed) {
                    completed = true;
                    const result = validateAndResolve(fullText);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', message: result.message, actions: result.actions })}\n\n`));
                  }
                } catch {
                  // Malformed SSE from upstream — skip
                }
              }
            }

            // Fallback: if we never got message_stop, finalize now
            if (fullText && !completed) {
              const result = validateAndResolve(fullText);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', message: result.message, actions: result.actions })}\n\n`));
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Stream error';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // OpenAI streaming
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('OpenAI chat API error:', response.status, errText);
        return NextResponse.json(
          { error: `OpenAI API error: ${response.status}` },
          { status: 502 }
        );
      }

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullText = '';
          let completed = false;
          let isJsonResponse = false;
          let jsonDetected = false;
          try {
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6).trim();
                if (!payload || payload === '[DONE]') continue;

                try {
                  const event = JSON.parse(payload);
                  const delta = event.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullText += delta;

                    // Detect if response is JSON (starts with { or ```json)
                    if (!jsonDetected) {
                      const trimmed = fullText.trimStart();
                      if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
                        isJsonResponse = true;
                        jsonDetected = true;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: 'Analyzing your deck...' })}\n\n`));
                      } else if (trimmed.length > 5) {
                        jsonDetected = true;
                        isJsonResponse = false;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: fullText })}\n\n`));
                      }
                    } else if (!isJsonResponse) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: delta })}\n\n`));
                    }
                  }

                  if (event.choices?.[0]?.finish_reason === 'stop' && !completed) {
                    completed = true;
                    const result = validateAndResolve(fullText);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', message: result.message, actions: result.actions })}\n\n`));
                  }
                } catch {
                  // Malformed SSE from upstream — skip
                }
              }
            }

            // Fallback: if we never got finish_reason, finalize now
            if (fullText && !completed) {
              const result = validateAndResolve(fullText);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', message: result.message, actions: result.actions })}\n\n`));
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Stream error';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'AI chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
