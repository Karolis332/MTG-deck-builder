import { NextRequest, NextResponse } from 'next/server';
import { getDeckWithCards } from '@/lib/db';
import { getRuleBasedSuggestions, getOllamaSuggestions } from '@/lib/ai-suggest';
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

    // Try Ollama first, fall back to rule-based
    const ollamaSuggestions = await getOllamaSuggestions(deck.cards, format);

    if (ollamaSuggestions && ollamaSuggestions.length > 0) {
      return NextResponse.json({
        suggestions: ollamaSuggestions,
        source: 'ollama',
      });
    }

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
