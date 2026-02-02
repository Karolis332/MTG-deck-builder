import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards } from '@/lib/db';
import { getRuleBasedSuggestions, getOllamaSuggestions } from '@/lib/ai-suggest';
import { getSynergySuggestions } from '@/lib/deck-builder-ai';
import { getCardGlobalScore } from '@/lib/global-learner';
import { getOpenAISuggestions, resolveOpenAISuggestions } from '@/lib/openai-suggest';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE, COMMANDER_FORMATS } from '@/lib/constants';
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

    // Try Ollama first
    const ollamaSuggestions = await getOllamaSuggestions(deck.cards, format);
    if (ollamaSuggestions && ollamaSuggestions.length > 0) {
      const proposedChanges = buildProposedChanges(deck_id, deck, format, ollamaSuggestions);
      return NextResponse.json({
        suggestions: ollamaSuggestions,
        proposedChanges,
        source: 'ollama',
      });
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
      const { adds, cutNames } = resolveOpenAISuggestions(openAIResult, existingIds);

      if (adds.length > 0) {
        // Also build proposed changes (enhanced with GPT cut recommendations)
        const proposedChanges = buildProposedChanges(deck_id, deck, format, adds);

        // Merge GPT-recommended cuts that aren't already in proposedChanges
        const existingCutNames = new Set(proposedChanges.filter((c) => c.action === 'cut').map((c) => c.cardName));
        for (const cutName of cutNames) {
          if (existingCutNames.has(cutName)) continue;
          const card = deck.cards.find((c) => c.name === cutName);
          if (!card) continue;
          // Don't cut lands unless excessive
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
    const seenNames = new Set(synergySuggestions.map((s) => s.card.name));
    const combined = [
      ...synergySuggestions,
      ...ruleSuggestions.filter((s) => {
        if (seenNames.has(s.card.name)) return false;
        seenNames.add(s.card.name);
        return true;
      }),
    ].sort((a, b) => b.score - a.score).slice(0, 15);

    // ── Build proposed changes (cuts + adds) based on match data ──────
    const proposedChanges = buildProposedChanges(deck_id, deck, format, combined);

    return NextResponse.json({
      suggestions: combined,
      proposedChanges,
      source: synergySuggestions.length > 0 ? 'synergy' : 'rules',
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
 * Priority order for cuts:
 * 1. Cards that are NOT LEGAL in the deck's format
 * 2. Underperforming non-land cards (from match data)
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
  const changes: ProposedChange[] = [];

  const mainCards = deck.cards.filter((c) => c.board === 'main');
  const commanderCards = deck.cards.filter((c) => c.board === 'commander');
  const allDeckCards = [...mainCards, ...commanderCards];

  // ── Calculate land counts and limits ─────────────────────────────────
  const landCount = mainCards
    .filter((c) => (c.type_line || '').includes('Land'))
    .reduce((s, c) => s + c.quantity, 0);
  const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;
  const landsAreExcessive = landCount > targetLands + 2; // only cut lands if significantly over

  // ── 1. Illegal cards get highest cut priority ────────────────────────
  const illegalCards: Array<{ card: DbCard; status: string }> = [];
  for (const entry of allDeckCards) {
    if (!entry.legalities) continue;
    try {
      const legalities = JSON.parse(entry.legalities);
      const status = legalities[format];
      if (status && status !== 'legal' && status !== 'restricted') {
        illegalCards.push({ card: entry, status });
      }
    } catch {
      // skip malformed legalities
    }
  }

  // Deduplicate by name
  const seenIllegal = new Set<string>();
  for (const illegal of illegalCards) {
    if (seenIllegal.has(illegal.card.name)) continue;
    seenIllegal.add(illegal.card.name);
    changes.push({
      action: 'cut',
      cardId: illegal.card.id,
      cardName: illegal.card.name,
      quantity: 1,
      reason: `Not legal in ${format} (${illegal.status}) — must be replaced`,
      winRate: undefined,
      imageUri: illegal.card.image_uri_small || undefined,
    });
  }

  // ── 2. Underperforming NON-LAND cards ────────────────────────────────
  const weakInDeck: Array<{ card: DbCard; winRate: number; gamesPlayed: number }> = [];
  for (const entry of mainCards) {
    const isLand = (entry.type_line || '').includes('Land');
    // Skip lands unless we have way too many
    if (isLand && !landsAreExcessive) continue;

    const gs = getCardGlobalScore(entry.name, format);
    if (gs.confidence > 0.3 && gs.playedWinRate < 0.42) {
      weakInDeck.push({ card: entry, winRate: gs.playedWinRate, gamesPlayed: gs.gamesPlayed });
    }
  }

  // Also check per-deck insights for underperformers
  const deckInsights = db.prepare(
    `SELECT card_name, data FROM deck_insights
     WHERE deck_id = ? AND insight_type = 'underperformer'`
  ).all(deckId) as Array<{ card_name: string; data: string }>;

  for (const insight of deckInsights) {
    const card = mainCards.find((c) => c.name === insight.card_name);
    if (!card) continue;
    // Never suggest cutting lands unless excessive
    const isLand = (card.type_line || '').includes('Land');
    if (isLand && !landsAreExcessive) continue;

    const already = weakInDeck.find((w) => w.card.name === insight.card_name);
    if (already) continue;

    let data: Record<string, unknown> = {};
    try { data = JSON.parse(insight.data); } catch {}
    weakInDeck.push({
      card,
      winRate: ((data.winRate as number) || 30) / 100,
      gamesPlayed: (data.appearances as number) || 0,
    });
  }

  // Sort by win rate ascending (worst cards first)
  weakInDeck.sort((a, b) => a.winRate - b.winRate);

  // Max underperformer cuts (leave room for illegal card replacements)
  const maxWeakCuts = Math.max(0, 5 - changes.length);
  const alreadyCutNames = new Set(changes.map((c) => c.cardName));
  for (const weak of weakInDeck.slice(0, maxWeakCuts)) {
    if (alreadyCutNames.has(weak.card.name)) continue;
    changes.push({
      action: 'cut',
      cardId: weak.card.id,
      cardName: weak.card.name,
      quantity: 1,
      reason: `${Math.round(weak.winRate * 100)}% win rate in ${weak.gamesPlayed} games — underperforming`,
      winRate: Math.round(weak.winRate * 100),
      imageUri: weak.card.image_uri_small || undefined,
    });
  }

  // ── 3. Propose legal replacement adds (deduplicated by name) ─────────
  const cutsCount = changes.filter((c) => c.action === 'cut').length;
  const existingCardNames = new Set(allDeckCards.map((c) => c.name));
  const addedNames = new Set<string>();
  let addCount = 0;
  for (const suggestion of suggestions) {
    if (addCount >= (cutsCount || 3)) break;
    // Skip if already in deck or already proposed
    if (existingCardNames.has(suggestion.card.name)) continue;
    if (addedNames.has(suggestion.card.name)) continue;
    addedNames.add(suggestion.card.name);
    addCount++;

    const gs = getCardGlobalScore(suggestion.card.name, format);
    changes.push({
      action: 'add',
      cardId: suggestion.card.id,
      cardName: suggestion.card.name,
      quantity: 1,
      reason: suggestion.reason,
      winRate: gs.confidence > 0.3 ? Math.round(gs.playedWinRate * 100) : undefined,
      imageUri: suggestion.card.image_uri_small || undefined,
    });
  }

  return changes;
}
