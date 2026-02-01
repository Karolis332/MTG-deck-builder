import { NextRequest, NextResponse } from 'next/server';
import { getDb, getDeckWithCards } from '@/lib/db';
import { getRuleBasedSuggestions, getOllamaSuggestions } from '@/lib/ai-suggest';
import { getSynergySuggestions } from '@/lib/deck-builder-ai';
import { getCardGlobalScore } from '@/lib/global-learner';
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
    const { deck_id } = body;

    if (!deck_id) {
      return NextResponse.json({ error: 'deck_id is required' }, { status: 400 });
    }

    const deckData = getDeckWithCards(deck_id);
    if (!deckData) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const deck = deckData as { format: string; cards: Array<{ quantity: number; board: string; card_id?: string } & DbCard> };
    const format = deck.format || 'standard';

    // Try Ollama first
    const ollamaSuggestions = await getOllamaSuggestions(deck.cards, format);
    if (ollamaSuggestions && ollamaSuggestions.length > 0) {
      return NextResponse.json({
        suggestions: ollamaSuggestions,
        proposedChanges: [],
        source: 'ollama',
      });
    }

    // Use synergy-aware suggestions (better than basic rules)
    const synergySuggestions = getSynergySuggestions(deck.cards, format, deck_id);
    const ruleSuggestions = getRuleBasedSuggestions(deck.cards, format);

    const seenIds = new Set(synergySuggestions.map((s) => s.card.id));
    const combined = [
      ...synergySuggestions,
      ...ruleSuggestions.filter((s) => !seenIds.has(s.card.id)),
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

  // Find underperforming cards in the deck using global data
  const weakInDeck: Array<{ card: DbCard; winRate: number; gamesPlayed: number }> = [];
  for (const entry of mainCards) {
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

  // Propose cuts
  for (const weak of weakInDeck.slice(0, 5)) {
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

  // Propose adds from top suggestions
  const cutsCount = changes.length;
  for (const suggestion of suggestions.slice(0, cutsCount || 3)) {
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
