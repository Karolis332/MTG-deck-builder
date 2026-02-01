import { NextRequest, NextResponse } from 'next/server';
import { getDeckWithCards } from '@/lib/db';
import { getRuleBasedSuggestions, getOllamaSuggestions } from '@/lib/ai-suggest';
import { getSynergySuggestions } from '@/lib/deck-builder-ai';
import type { DbCard } from '@/lib/types';

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

    const deck = deckData as { format: string; cards: Array<{ quantity: number; board: string } & DbCard> };
    const format = deck.format || 'standard';

    // Try Ollama first
    const ollamaSuggestions = await getOllamaSuggestions(deck.cards, format);
    if (ollamaSuggestions && ollamaSuggestions.length > 0) {
      return NextResponse.json({
        suggestions: ollamaSuggestions,
        source: 'ollama',
      });
    }

    // Use synergy-aware suggestions (better than basic rules)
    const synergySuggestions = getSynergySuggestions(deck.cards, format, deck_id);
    if (synergySuggestions.length > 0) {
      // Merge with rule-based for structural suggestions (lands, removal)
      const ruleSuggestions = getRuleBasedSuggestions(deck.cards, format);
      const seenIds = new Set(synergySuggestions.map((s) => s.card.id));
      const combined = [
        ...synergySuggestions,
        ...ruleSuggestions.filter((s) => !seenIds.has(s.card.id)),
      ].sort((a, b) => b.score - a.score).slice(0, 15);

      return NextResponse.json({
        suggestions: combined,
        source: 'synergy',
      });
    }

    // Fallback to basic rules
    const ruleSuggestions = getRuleBasedSuggestions(deck.cards, format);
    return NextResponse.json({
      suggestions: ruleSuggestions,
      source: 'rules',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Suggestion generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
