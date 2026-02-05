import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards } from '@/lib/db';
import { getRuleBasedSuggestions, getOllamaSuggestions } from '@/lib/ai-suggest';
import { getSynergySuggestions } from '@/lib/deck-builder-ai';
import { getCardGlobalScore } from '@/lib/global-learner';
import { getOpenAISuggestions, resolveOpenAISuggestions } from '@/lib/openai-suggest';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE, COMMANDER_FORMATS } from '@/lib/constants';
import { validateAgainstTemplate } from '@/lib/deck-templates';
import { analyzeCommander } from '@/lib/commander-synergy';
import type { DbCard } from '@/lib/types';

interface ProposedChange {
  action: 'cut' | 'add';
  cardId: string;
  cardName: string;
  quantity: number;
  reason: string;
  winRate?: number;
  imageUri?: string;
}

/**
 * Compute the deck's color identity. For commander formats, this comes
 * from the commander card(s). For other formats, from all main deck cards.
 */
function getDeckColorIdentity(
  cards: Array<{ quantity: number; board: string } & DbCard>
): Set<string> {
  const colorSet = new Set<string>();
  const commanderCards = cards.filter((c) => c.board === 'commander');
  const source = commanderCards.length > 0
    ? commanderCards
    : cards.filter((c) => c.board === 'main');

  for (const card of source) {
    try {
      const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
      ci.forEach((c) => colorSet.add(c));
    } catch {}
  }
  return colorSet;
}

/**
 * Check if a card fits within the deck's color identity.
 */
function cardFitsColorIdentity(card: DbCard, deckColors: Set<string>): boolean {
  if (deckColors.size === 0) return true;
  try {
    const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
    if (ci.length === 0) return true; // colorless is always allowed
    return ci.every((c) => deckColors.has(c));
  } catch {
    return true;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deck_id, collection_only } = body;

    if (!deck_id) {
      return NextResponse.json({ error: 'deck_id is required' }, { status: 400 });
    }

    const deckData = getDeckWithCards(deck_id);
    if (!deckData) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const deck = deckData as { format: string; cards: Array<{ quantity: number; board: string; card_id?: string } & DbCard> };
    const format = deck.format || 'standard';
    const collectionOnly = !!collection_only;
    const isCommanderLike = COMMANDER_FORMATS.includes(format as typeof COMMANDER_FORMATS[number]);
    // Color identity restriction only applies to commander/brawl formats
    const deckColors = isCommanderLike ? getDeckColorIdentity(deck.cards) : new Set<string>();

    // Try Ollama first
    const ollamaSuggestions = await getOllamaSuggestions(deck.cards, format);
    if (ollamaSuggestions && ollamaSuggestions.length > 0) {
      const filtered = isCommanderLike
        ? ollamaSuggestions.filter((s) => cardFitsColorIdentity(s.card, deckColors))
        : ollamaSuggestions;
      if (filtered.length > 0) {
        const proposedChanges = buildProposedChanges(deck_id, deck, format, filtered);
        return NextResponse.json({
          suggestions: filtered,
          proposedChanges,
          source: 'ollama',
        });
      }
    }

    // Try OpenAI GPT if API key is configured
    const existingIds = new Set(deck.cards.map((c) => c.card_id || c.id));
    let collectionCardNames: string[] | undefined;
    if (collectionOnly) {
      const db = getDb();
      const collCards = db
        .prepare('SELECT c.name FROM collection col JOIN cards c ON col.card_id = c.id')
        .all() as Array<{ name: string }>;
      collectionCardNames = collCards.map((c) => c.name);
    }

    const openAIResult = await getOpenAISuggestions(deck.cards, format, collectionCardNames);
    if (openAIResult && openAIResult.suggestions.length > 0) {
      const { adds, cutNames } = resolveOpenAISuggestions(openAIResult, existingIds, format);

      if (adds.length > 0) {
        // Build proposed changes — pairs cuts with adds
        const proposedChanges = buildProposedChanges(deck_id, deck, format, adds);

        // For GPT-recommended cuts: only add them if we have unmatched adds
        // Count existing pairs
        const existingAdds = proposedChanges.filter((c) => c.action === 'add').length;
        const existingCuts = proposedChanges.filter((c) => c.action === 'cut').length;
        const existingCutNames = new Set(proposedChanges.filter((c) => c.action === 'cut').map((c) => c.cardName));

        // Only add GPT cuts if we need more to balance with adds
        let gptCutsAdded = 0;
        const maxGptCuts = Math.max(0, existingAdds - existingCuts);
        for (const cutName of cutNames) {
          if (gptCutsAdded >= maxGptCuts) break;
          if (existingCutNames.has(cutName)) continue;
          const card = deck.cards.find((c) => c.name === cutName);
          if (!card) continue;
          const isLand = (card.type_line || '').includes('Land');
          const landCount = deck.cards
            .filter((c) => c.board === 'main' && (c.type_line || '').includes('Land'))
            .reduce((s, c) => s + c.quantity, 0);
          const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;
          if (isLand && landCount <= targetLands + 2) continue;

          proposedChanges.push({
            action: 'cut',
            cardId: card.id || (card as unknown as { card_id: string }).card_id,
            cardName: cutName,
            quantity: 1,
            reason: 'GPT recommends replacing this card',
            imageUri: card.image_uri_small || undefined,
          });
          gptCutsAdded++;
        }

        return NextResponse.json({
          suggestions: adds,
          proposedChanges,
          source: 'openai',
        });
      }
    }

    // Use synergy-aware suggestions (better than basic rules)
    const synergySuggestions = getSynergySuggestions(deck.cards, format, deck_id, collectionOnly);
    const ruleSuggestions = getRuleBasedSuggestions(deck.cards, format, collectionOnly);

    // Deduplicate by card NAME (not ID) — same card has many printings
    // Also filter by color identity
    const seenNames = new Set(synergySuggestions.map((s) => s.card.name));
    const combined = [
      ...synergySuggestions,
      ...ruleSuggestions.filter((s) => {
        if (seenNames.has(s.card.name)) return false;
        seenNames.add(s.card.name);
        return true;
      }),
    ]
      .filter((s) => !isCommanderLike || cardFitsColorIdentity(s.card, deckColors))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    // ── Build proposed changes (cuts + adds) based on match data ──────
    const proposedChanges = buildProposedChanges(deck_id, deck, format, combined);

    // ── Template validation: health check against archetype ratios ────
    const mainDeckCards = deck.cards.filter((c) => c.board === 'main' || c.board === 'commander');
    const landCount = mainDeckCards.filter((c) => (c.type_line || '').includes('Land')).reduce((s, c) => s + c.quantity, 0);
    const rampCount = mainDeckCards.filter((c) => {
      const t = (c.oracle_text || '').toLowerCase();
      const tp = (c.type_line || '').toLowerCase();
      const n = c.name.toLowerCase();
      return (tp.includes('artifact') && t.includes('add') && t.includes('mana')) ||
        n.includes('signet') || n.includes('talisman') ||
        (t.includes('search your library for a') && t.includes('land')) ||
        n === 'sol ring' || n === 'arcane signet';
    }).reduce((s, c) => s + c.quantity, 0);
    const drawCount = mainDeckCards.filter((c) => {
      const t = (c.oracle_text || '').toLowerCase();
      return t.includes('draw a card') || t.includes('draw two') || t.includes('draw cards');
    }).reduce((s, c) => s + c.quantity, 0);
    const removalCount = mainDeckCards.filter((c) => {
      const t = (c.oracle_text || '').toLowerCase();
      return t.includes('destroy target') || t.includes('exile target') || t.includes('counter target');
    }).reduce((s, c) => s + c.quantity, 0);
    const creatureCount = mainDeckCards.filter((c) => (c.type_line || '').includes('Creature')).reduce((s, c) => s + c.quantity, 0);
    const instantSorceryCount = mainDeckCards.filter((c) => {
      const tp = (c.type_line || '').toLowerCase();
      return tp.includes('instant') || tp.includes('sorcery');
    }).reduce((s, c) => s + c.quantity, 0);
    const avgCmc = mainDeckCards.reduce((s, c) => s + c.cmc * c.quantity, 0) /
      Math.max(1, mainDeckCards.reduce((s, c) => s + c.quantity, 0));
    const colorCount = deckColors.size;

    // Detect archetype — commander synergy analysis overrides generic CMC-based
    let detectedArchetype = 'midrange';
    if (instantSorceryCount >= 20) detectedArchetype = 'spellslinger';
    else if (avgCmc >= 4.0) detectedArchetype = 'control';
    else if (avgCmc <= 2.4) detectedArchetype = 'aggro';

    // If commander format, analyze commander's oracle text for synergy
    const commanderCards = deck.cards.filter((c: { board: string }) => c.board === 'commander');
    let commanderSynergyWarnings: string[] = [];

    if (isCommanderLike && commanderCards.length > 0) {
      const cmd = commanderCards[0];
      let ci: string[] = [];
      try { ci = cmd.color_identity ? JSON.parse(cmd.color_identity) : []; } catch {}
      const profile = analyzeCommander(cmd.oracle_text || '', cmd.type_line, ci);
      if (profile) {
        if (profile.detectedArchetype) {
          detectedArchetype = profile.detectedArchetype;
        }
        // Check synergy minimums against current deck
        for (const [category, minCount] of Object.entries(profile.synergyMinimums)) {
          const patterns = profile.cardPoolPatterns;
          let synergyCount = 0;
          for (const card of mainDeckCards) {
            const text = (card.oracle_text || '').toLowerCase();
            if (patterns.some((p: string) => text.includes(p.replace(/%/g, '').toLowerCase()))) {
              synergyCount += card.quantity;
            }
          }
          if (synergyCount < minCount) {
            commanderSynergyWarnings.push(
              `Low ${category.replace(/_/g, ' ')} synergy (${synergyCount}/${minCount} needed for commander)`
            );
          }
        }
      }
    }

    const templateValidation = validateAgainstTemplate(detectedArchetype, {
      landCount, rampCount, drawCount, removalCount,
      creatureCount, avgCmc, instantSorceryCount, colorCount,
    });

    // Append commander synergy warnings to template validation
    if (commanderSynergyWarnings.length > 0) {
      templateValidation.warnings.push(...commanderSynergyWarnings);
      templateValidation.score = Math.max(0, templateValidation.score - commanderSynergyWarnings.length * 5);
    }

    return NextResponse.json({
      suggestions: combined,
      proposedChanges,
      source: synergySuggestions.length > 0 ? 'synergy' : 'rules',
      templateValidation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Suggestion generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Build a set of proposed cut/add changes by comparing current deck card
 * performance against suggested replacements.
 *
 * CRITICAL RULE: For fixed-size formats (Commander, Brawl — 100 cards),
 * every ADD must be paired with a CUT. The proposed changes must never
 * change the total deck size. Changes are always presented as balanced
 * swap pairs: [CUT cardA, ADD cardB].
 *
 * Priority order for cuts:
 * 1. Cards that are NOT LEGAL in the deck's format
 * 2. Underperforming non-land cards (from match data / insights)
 * 3. Lowest-synergy non-land cards (highest EDHREC rank = weakest)
 *
 * Lands are NEVER suggested for cutting unless the deck has more than
 * the recommended land count for that format.
 */
function buildProposedChanges(
  deckId: number,
  deck: { format: string; cards: Array<{ quantity: number; board: string } & DbCard> },
  format: string,
  suggestions: Array<{ card: DbCard; reason: string; score: number }>
): ProposedChange[] {
  const db = getDb();

  const mainCards = deck.cards.filter((c) => c.board === 'main');
  const commanderCards = deck.cards.filter((c) => c.board === 'commander');
  const allDeckCards = [...mainCards, ...commanderCards];

  // Determine if this is a fixed-size format
  const isCommanderLike = COMMANDER_FORMATS.includes(format as typeof COMMANDER_FORMATS[number]);
  const targetSize = DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default;
  const currentMainCount = mainCards.reduce((s, c) => s + c.quantity, 0);

  // ── Calculate land counts and limits ─────────────────────────────────
  const landCount = mainCards
    .filter((c) => (c.type_line || '').includes('Land'))
    .reduce((s, c) => s + c.quantity, 0);
  const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;
  const landsAreExcessive = landCount > targetLands + 2;

  // ── CRITICAL: Count and protect mana rocks ───────────────────────────
  const rampCards = mainCards.filter((c) => {
    const text = (c.oracle_text || '').toLowerCase();
    const type = (c.type_line || '').toLowerCase();
    const name = c.name.toLowerCase();
    return (
      // Mana rocks
      (type.includes('artifact') && text.includes('add') && text.includes('mana')) ||
      // Signets and Talismans
      name.includes('signet') || name.includes('talisman') ||
      // Land ramp
      text.includes('search your library for a') && text.includes('land') ||
      // Specific essential ramp cards
      name === 'sol ring' || name === 'arcane signet' || name === "commander's sphere" ||
      name === 'mind stone' || name === 'thought vessel' || name === 'fellwar stone' ||
      name === 'worn powerstone' || name === 'thran dynamo' || name === 'gilded lotus'
    );
  });
  const rampCount = rampCards.reduce((s, c) => s + c.quantity, 0);
  const protectedRampNames = new Set(rampCards.map((c) => c.name));

  // ── CRITICAL: Detect spellslinger archetype and protect enablers ─────
  const instantSorceryCount = mainCards.filter((c) => {
    const type = (c.type_line || '').toLowerCase();
    return type.includes('instant') || type.includes('sorcery');
  }).reduce((s, c) => s + c.quantity, 0);

  const isSpellslinger = instantSorceryCount >= 20;

  // Premium spellslinger enablers that should NEVER be cut in spellslinger decks
  const premiumSpellslingerCards = new Set([
    // Card selection / cantrips (foundational for spellslinger)
    'brainstorm', 'ponder', 'preordain', 'opt', 'consider', 'sleight of hand',
    // Card draw engines
    'frantic search', 'treasure cruise', 'dig through time', 'fact or fiction',
    'rhystic study', 'mystic remora', 'reconnaissance mission',
    // Tutors (find your payoffs)
    'mystical tutor', 'merchant scroll', 'muddle the mixture',
    // Premium interaction that triggers payoffs (NEVER CUT THESE)
    'counterspell', 'mana drain', 'fierce guardianship', 'force of will', 'pact of negation',
    'swan song', 'arcane denial', 'negate', 'dispel', 'flusterstorm',
    // Premium instant removal (CRITICAL for spellslinger)
    'lightning bolt', 'abrade', 'chaos warp', 'reality shift', 'rapid hybridization',
    'pongify', 'cyclonic rift', 'into the roil', 'resculpt',
    // Spell copy effects (double your value)
    'dualcaster mage', 'narset\'s reversal', 'increasing vengeance', 'fork', 'reverberate',
    // Payoffs (the reason you play spellslinger)
    'young pyromancer', 'talrand, sky summoner', 'murmuring mystic', 'storm-kiln artist',
    'guttersnipe', 'niv-mizzet, parun', 'thousand-year storm', 'aetherflux reservoir',
    'docent of perfection', 'metallurgic summonings', 'archmage emeritus',
  ]);

  const protectedSpellslingerNames = new Set<string>();
  if (isSpellslinger) {
    for (const card of mainCards) {
      if (premiumSpellslingerCards.has(card.name.toLowerCase())) {
        protectedSpellslingerNames.add(card.name);
      }
    }
  }

  // ── Build a ranked list of all possible cut candidates ──────────────
  const cutCandidates: Array<{
    card: DbCard;
    priority: number; // lower = should be cut first
    reason: string;
    winRate?: number;
  }> = [];

  const cutSeenNames = new Set<string>();

  // Priority 1: Illegal cards (priority 0-9)
  for (const entry of allDeckCards) {
    if (!entry.legalities) continue;
    try {
      const legalities = JSON.parse(entry.legalities);
      const status = legalities[format];
      if (status && status !== 'legal' && status !== 'restricted') {
        if (cutSeenNames.has(entry.name)) continue;
        cutSeenNames.add(entry.name);
        cutCandidates.push({
          card: entry,
          priority: 0,
          reason: `Not legal in ${format} (${status}) — must be replaced`,
        });
      }
    } catch {}
  }

  // Priority 2: Underperforming cards from match data (priority 10-19)
  for (const entry of mainCards) {
    const isLand = (entry.type_line || '').includes('Land');
    if (isLand && !landsAreExcessive) continue;

    // CRITICAL: NEVER cut mana rocks when ramp count is low
    if (rampCount < 10 && protectedRampNames.has(entry.name)) continue;

    // CRITICAL: NEVER cut spellslinger enablers in spellslinger decks
    if (isSpellslinger && protectedSpellslingerNames.has(entry.name)) continue;

    if (cutSeenNames.has(entry.name)) continue;

    const gs = getCardGlobalScore(entry.name, format);
    if (gs.confidence > 0.3 && gs.playedWinRate < 0.42) {
      cutSeenNames.add(entry.name);
      cutCandidates.push({
        card: entry,
        priority: 10 + (1 - gs.playedWinRate) * 10,
        reason: `${Math.round(gs.playedWinRate * 100)}% win rate in ${gs.gamesPlayed} games — underperforming`,
        winRate: Math.round(gs.playedWinRate * 100),
      });
    }
  }

  // Priority 2b: Per-deck insights for underperformers
  const deckInsights = db.prepare(
    `SELECT card_name, data FROM deck_insights
     WHERE deck_id = ? AND insight_type = 'underperformer'`
  ).all(deckId) as Array<{ card_name: string; data: string }>;

  for (const insight of deckInsights) {
    const card = mainCards.find((c) => c.name === insight.card_name);
    if (!card) continue;
    const isLand = (card.type_line || '').includes('Land');
    if (isLand && !landsAreExcessive) continue;

    // CRITICAL: NEVER cut mana rocks when ramp count is low
    if (rampCount < 10 && protectedRampNames.has(card.name)) continue;

    // CRITICAL: NEVER cut spellslinger enablers in spellslinger decks
    if (isSpellslinger && protectedSpellslingerNames.has(card.name)) continue;

    if (cutSeenNames.has(card.name)) continue;
    cutSeenNames.add(card.name);

    let data: Record<string, unknown> = {};
    try { data = JSON.parse(insight.data); } catch {}
    const wr = ((data.winRate as number) || 30) / 100;
    cutCandidates.push({
      card,
      priority: 15,
      reason: `${Math.round(wr * 100)}% win rate in ${(data.appearances as number) || 0} games — underperforming`,
      winRate: Math.round(wr * 100),
    });
  }

  // Priority 3: Lowest EDHREC rank non-land spells as fallback cuts (priority 30+)
  // These are "weakest" cards by community ranking
  const nonLandSpells = mainCards
    .filter((c) => {
      if ((c.type_line || '').includes('Land')) return false;
      if (cutSeenNames.has(c.name)) return false;

      // CRITICAL: NEVER cut mana rocks when ramp count < 10
      if (rampCount < 10 && protectedRampNames.has(c.name)) return false;

      // CRITICAL: NEVER cut spellslinger enablers in spellslinger decks
      if (isSpellslinger && protectedSpellslingerNames.has(c.name)) return false;

      return true;
    })
    .sort((a, b) => {
      // Highest EDHREC rank = weakest card = should be cut first
      const aRank = a.edhrec_rank ?? 999999;
      const bRank = b.edhrec_rank ?? 999999;
      return bRank - aRank;
    });

  for (const entry of nonLandSpells) {
    cutSeenNames.add(entry.name);
    cutCandidates.push({
      card: entry,
      priority: 30 + (entry.edhrec_rank ? entry.edhrec_rank / 100000 : 10),
      reason: `Lower-ranked card (EDHREC #${entry.edhrec_rank ?? '?'}) — consider upgrading`,
    });
  }

  // Sort candidates: lowest priority number = cut first
  cutCandidates.sort((a, b) => a.priority - b.priority);

  // ── Build ADD candidates from suggestions ────────────────────────────
  const existingCardNames = new Set(allDeckCards.map((c) => c.name));
  const addCandidates: Array<{
    card: DbCard;
    reason: string;
    winRate?: number;
  }> = [];
  const addedNames = new Set<string>();

  for (const suggestion of suggestions) {
    if (existingCardNames.has(suggestion.card.name)) continue;
    if (addedNames.has(suggestion.card.name)) continue;
    addedNames.add(suggestion.card.name);

    const gs = getCardGlobalScore(suggestion.card.name, format);
    addCandidates.push({
      card: suggestion.card,
      reason: suggestion.reason,
      winRate: gs.confidence > 0.3 ? Math.round(gs.playedWinRate * 100) : undefined,
    });
  }

  // ── Pair cuts with adds ──────────────────────────────────────────────
  const changes: ProposedChange[] = [];

  if (isCommanderLike || currentMainCount >= targetSize) {
    // Fixed-size format: every ADD must have a matching CUT
    const pairCount = Math.min(cutCandidates.length, addCandidates.length, 5);

    for (let i = 0; i < pairCount; i++) {
      const cut = cutCandidates[i];
      const add = addCandidates[i];

      changes.push({
        action: 'cut',
        cardId: cut.card.id,
        cardName: cut.card.name,
        quantity: 1,
        reason: cut.reason,
        winRate: cut.winRate,
        imageUri: cut.card.image_uri_small || undefined,
      });

      changes.push({
        action: 'add',
        cardId: add.card.id,
        cardName: add.card.name,
        quantity: 1,
        reason: add.reason,
        winRate: add.winRate,
        imageUri: add.card.image_uri_small || undefined,
      });
    }

    // If deck is OVER the target size, propose extra cuts with no adds
    if (currentMainCount > targetSize - (commanderCards.length > 0 ? 1 : 0)) {
      const excess = currentMainCount - (targetSize - (commanderCards.length > 0 ? 1 : 0));
      let extraCuts = 0;
      for (let i = pairCount; i < cutCandidates.length && extraCuts < excess; i++) {
        const cut = cutCandidates[i];
        changes.push({
          action: 'cut',
          cardId: cut.card.id,
          cardName: cut.card.name,
          quantity: 1,
          reason: `Deck is over ${targetSize} cards — ${cut.reason}`,
          winRate: cut.winRate,
          imageUri: cut.card.image_uri_small || undefined,
        });
        extraCuts++;
      }
    }
  } else {
    // Non-fixed-size format: cuts are optional, adds can be independent
    // Add cuts first
    for (const cut of cutCandidates.slice(0, 5)) {
      changes.push({
        action: 'cut',
        cardId: cut.card.id,
        cardName: cut.card.name,
        quantity: 1,
        reason: cut.reason,
        winRate: cut.winRate,
        imageUri: cut.card.image_uri_small || undefined,
      });
    }

    // Then add suggestions
    const cutsCount = changes.filter((c) => c.action === 'cut').length;
    for (const add of addCandidates.slice(0, cutsCount || 3)) {
      changes.push({
        action: 'add',
        cardId: add.card.id,
        cardName: add.card.name,
        quantity: 1,
        reason: add.reason,
        winRate: add.winRate,
        imageUri: add.card.image_uri_small || undefined,
      });
    }
  }

  return changes;
}
