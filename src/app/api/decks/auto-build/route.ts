import { NextRequest, NextResponse } from 'next/server';
import { createDeck, addCardToDeck } from '@/lib/db';
import { autoBuildDeck } from '@/lib/deck-builder-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name = 'AI Built Deck',
      format = 'standard',
      colors = [],
      strategy,
      useCollection = false,
    } = body;

    if (!Array.isArray(colors) || colors.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one color (W, U, B, R, G)' },
        { status: 400 }
      );
    }

    const result = autoBuildDeck({
      format,
      colors,
      strategy,
      useCollection,
    });

    if (result.cards.length === 0) {
      return NextResponse.json(
        { error: 'Could not build a deck. Make sure the card database is seeded.' },
        { status: 400 }
      );
    }

    // Create deck and add all cards
    const deck = createDeck(name, format, `Auto-built ${result.strategy} deck. Themes: ${result.themes.join(', ') || 'general goodstuff'}`);

    for (const entry of result.cards) {
      addCardToDeck(Number(deck.id), entry.card.id, entry.quantity, entry.board);
    }

    return NextResponse.json({
      deckId: deck.id,
      strategy: result.strategy,
      themes: result.themes,
      totalCards: result.cards.reduce((s, c) => s + c.quantity, 0),
      mainCards: result.cards.filter((c) => c.board === 'main').reduce((s, c) => s + c.quantity, 0),
      sideboardCards: result.cards.filter((c) => c.board === 'sideboard').reduce((s, c) => s + c.quantity, 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auto-build failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
