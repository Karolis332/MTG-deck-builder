import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards } from '@/lib/db';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE, COMMANDER_FORMATS } from '@/lib/constants';
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

/**
 * Check if a card fits within the deck's color identity.
 */
function fitsColorIdentity(card: DbCard, deckColors: Set<string>): boolean {
  if (deckColors.size === 0) return true;
  try {
    const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
    return ci.every((c) => deckColors.has(c));
  } catch {
    return true;
  }
}

/**
 * Check if a card is legal in the given format.
 */
function isLegalInFormat(card: DbCard, format: string): boolean {
  if (!format || !card.legalities) return true;
  try {
    const legalities = JSON.parse(card.legalities);
    const status = legalities[format];
    return !status || status === 'legal' || status === 'restricted';
  } catch {
    return true;
  }
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
    console.log('[AI Chat] Code version: v2-with-fast-path');

    if (!deck_id || !prompt) {
      return NextResponse.json(
        { error: 'deck_id and prompt are required' },
        { status: 400 }
      );
    }

    // Try Claude first (recommended), fall back to OpenAI
    const claudeKey = getAnthropicKey();
    const openaiKey = getOpenAIKey();
    const useClaude = !!claudeKey;
    const apiKey = claudeKey || openaiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No AI API key configured. Go to Settings to add Anthropic or OpenAI key.' },
        { status: 400 }
      );
    }

    console.log(`[AI Chat] Using provider: ${useClaude ? 'Claude Sonnet 4.5' : 'OpenAI GPT-4o'}`);

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

    // Build explicit list of all cards in deck (for duplicate prevention)
    const allCardNames = [...mainCards, ...commanderCards].map(c => c.name).sort();
    const cardNameList = allCardNames.join(', ');

    // ── EDHREC Knowledge Retrieval ──────────────────────────────────────
    // Search FTS5 for articles matching commander name, archetype, or user query
    let edhrecKnowledge = '';
    try {
      const searchTerms: string[] = [];
      if (commanderCards.length > 0) {
        searchTerms.push(commanderCards[0].name);
      }
      // Add keywords from the user's prompt
      const queryWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      searchTerms.push(...queryWords.slice(0, 3));

      if (searchTerms.length > 0) {
        const ftsQuery = searchTerms.map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
        const knowledgeRows = db.prepare(`
          SELECT ek.title, ek.chunk_text, ek.category
          FROM edhrec_knowledge_fts fts
          JOIN edhrec_knowledge ek ON fts.rowid = ek.id
          WHERE edhrec_knowledge_fts MATCH ?
          ORDER BY rank
          LIMIT 3
        `).all(ftsQuery) as Array<{ title: string; chunk_text: string; category: string }>;

        if (knowledgeRows.length > 0) {
          edhrecKnowledge = `\n═══ EDHREC KNOWLEDGE (relevant articles) ═══\n` +
            knowledgeRows.map(r => `[${r.category}] ${r.title}:\n${r.chunk_text.slice(0, 400)}`).join('\n---\n');
        }
      }
    } catch {
      // FTS5 table may not exist yet — that's fine
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
${cardNameList}

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

${edhrecKnowledge}
═══════════════════════════════════════════════════════════
RESPONSE FORMAT (strict JSON)
═══════════════════════════════════════════════════════════
{"message":"Your explanation","actions":[{"action":"swap","cardName":"Cut This","replaceWith":"Add This","quantity":1,"reason":"why"}]}
Use "swap" for replacements. Only use "add"/"cut" if deck size must change.`;

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
- ALL cards now in deck: ${allCardNames.join(', ')}
${hasCollection ? `- Collection cards available (${filteredCollectionNames.length} in deck colors): ${filteredCollectionNames.join(', ')}` : ''}

${isCommanderLike ? `CRITICAL: Deck MUST stay at ${effectiveTarget} cards. Every ADD needs a CUT.` : ''}
${hasCollection ? 'ONLY suggest ADD cards from the collection list above.' : ''}
Remember to check the card list above to avoid suggesting duplicates!`,
      });
    }

    messages.push({ role: 'user', content: prompt });

    let content: string;

    if (useClaude) {
      // Claude API call
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 4096,
          temperature: 0.7,
          messages: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          system: messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n'),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude chat API error:', response.status, errText);
        return NextResponse.json(
          { error: `Claude API error: ${response.status}` },
          { status: 502 }
        );
      }

      const data = await response.json();
      content = data.content?.[0]?.text || '';
    } else {
      // OpenAI API call
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
          response_format: { type: 'json_object' },
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

      const data = await response.json();
      content = data.choices?.[0]?.message?.content || '';
    }
    if (!content) {
      return NextResponse.json(
        { error: `Empty response from ${useClaude ? 'Claude' : 'OpenAI'}` },
        { status: 502 }
      );
    }

    let parsed: ChatResponse;
    try {
      // Claude might wrap JSON in markdown code blocks, extract it
      let jsonText = content;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[1] || jsonMatch[0];
      }
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', rawContent: content },
        { status: 502 }
      );
    }

    // ── Server-side validation & resolution ────────────────────────────
    const resolvedActions: Array<{
      action: 'cut' | 'add';
      cardId: string;
      cardName: string;
      quantity: number;
      reason: string;
      imageUri?: string;
    }> = [];

    const existingCardNames = new Set(deck.cards.map((c) => c.name.toLowerCase()));
    const rejectedCards: string[] = [];
    const rejectionReasons = {
      wrongColors: [] as string[],
      notLegal: [] as string[],
      alreadyInDeck: [] as string[],
      notFound: [] as string[],
    };

    for (const act of parsed.actions || []) {
      if (act.action === 'swap') {
        // Swap = cut + add — resolve both
        const cutCard = deck.cards.find(
          (c) => c.name.toLowerCase() === act.cardName.toLowerCase()
        );
        const addCard = act.replaceWith ? resolveCard(act.replaceWith) : null;

        if (cutCard) {
          resolvedActions.push({
            action: 'cut',
            cardId: cutCard.id || (cutCard as unknown as { card_id: string }).card_id,
            cardName: cutCard.name,
            quantity: act.quantity || 1,
            reason: act.reason,
            imageUri: cutCard.image_uri_small || undefined,
          });
        }

        if (addCard) {
          // Validate: color identity, format legality, not already in deck
          if (!fitsColorIdentity(addCard, colorSet)) {
            rejectedCards.push(`${addCard.name} (wrong colors)`);
            rejectionReasons.wrongColors.push(addCard.name);
          } else if (!isLegalInFormat(addCard, format)) {
            rejectedCards.push(`${addCard.name} (not legal in ${format})`);
            rejectionReasons.notLegal.push(addCard.name);
          } else if (existingCardNames.has(addCard.name.toLowerCase())) {
            rejectedCards.push(`${addCard.name} (already in deck)`);
            rejectionReasons.alreadyInDeck.push(addCard.name);
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
        } else if (act.replaceWith) {
          // Card not found in database
          rejectedCards.push(`${act.replaceWith} (not found in database)`);
          rejectionReasons.notFound.push(act.replaceWith);
        }
      } else if (act.action === 'cut') {
        const cutCard = deck.cards.find(
          (c) => c.name.toLowerCase() === act.cardName.toLowerCase()
        );
        if (cutCard) {
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

    // ── Enforce CUT/ADD balance for fixed-size formats ─────────────────
    if (isCommanderLike) {
      const addCount = resolvedActions.filter((a) => a.action === 'add').reduce((s, a) => s + a.quantity, 0);
      const cutCount = resolvedActions.filter((a) => a.action === 'cut').reduce((s, a) => s + a.quantity, 0);
      const sizeAfter = currentMainCount - cutCount + addCount;

      // STRICT BALANCE CHECK: Reject if severely unbalanced
      if (Math.abs(addCount - cutCount) > 2 && (addCount > 0 || cutCount > 0)) {
        const imbalance = addCount - cutCount;
        const warning = imbalance > 0
          ? `Too many ADDs (${addCount}) vs CUTs (${cutCount}). Deck would become ${sizeAfter} cards.`
          : `Too many CUTs (${cutCount}) vs ADDs (${addCount}). Deck would become ${sizeAfter} cards.`;

        console.error('[AI Chat] Unbalanced suggestions:', { addCount, cutCount, currentMainCount, sizeAfter });

        return NextResponse.json({
          message: `⚠️ ${warning}\n\nFor ${format} format, every card added must replace a card being cut. Please suggest balanced swaps (use "swap" action) to maintain ${effectiveTarget} cards.`,
          actions: [],
        });
      }

      // MINOR IMBALANCE: Auto-correct by trimming excess
      if (sizeAfter !== effectiveTarget && (addCount > 0 || cutCount > 0)) {
        let excess = sizeAfter - effectiveTarget;

        if (excess > 0) {
          // Too many ADDs — trim from the end
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
          // Too many CUTs — trim from the end
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

    // Append detailed rejection feedback to message
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
      if (rejectionReasons.notFound.length > 0) {
        message += `\n- ❌ Not found in database: ${rejectionReasons.notFound.join(', ')}`;
      }

      message += `\n\n💡 **Tip**: Check the "ALL CARDS CURRENTLY IN DECK" list in my context to avoid duplicates.`;
    }

    return NextResponse.json({
      message,
      actions: resolvedActions,
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'AI chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
