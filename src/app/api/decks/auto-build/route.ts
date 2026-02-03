import { NextRequest, NextResponse } from 'next/server';
import { createDeck, addCardToDeck, getCardByName } from '@/lib/db';
import { autoBuildDeck } from '@/lib/deck-builder-ai';
import { COMMANDER_FORMATS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name = 'AI Built Deck',
      format = 'standard',
      colors = [],
      strategy,
      useCollection = false,
      commanderName,
    } = body;

    const isCmdFormat = COMMANDER_FORMATS.includes(format);

    if (isCmdFormat && !commanderName) {
      return NextResponse.json(
        { error: 'Please select a commander' },
        { status: 400 }
      );
    }

    if (!isCmdFormat && (!Array.isArray(colors) || colors.length === 0)) {
      return NextResponse.json(
        { error: 'Please select at least one color (W, U, B, R, G)' },
        { status: 400 }
      );
    }

    const result = await autoBuildDeck({
      format,
      colors,
      strategy,
      useCollection,
      commanderName: isCmdFormat ? commanderName : undefined,
    });

    if (result.cards.length === 0) {
      return NextResponse.json(
        { error: 'Could not build a deck. Make sure the card database is seeded.' },
        { status: 400 }
      );
    }

    // Create deck and add all cards
    const description = isCmdFormat && commanderName
      ? `Commander: ${commanderName}. ${result.strategy} strategy. Themes: ${result.themes.join(', ') || 'general goodstuff'}`
      : `Auto-built ${result.strategy} deck. Themes: ${result.themes.join(', ') || 'general goodstuff'}`;
    const deck = createDeck(name, format, description);
    const deckId = Number(deck.id);

    // Add commander to commander zone
    if (isCmdFormat && commanderName) {
      const cmdCard = getCardByName(commanderName) as { id: string } | undefined;
      if (cmdCard) {
        addCardToDeck(deckId, cmdCard.id, 1, 'commander');
      }
    }

    for (const entry of result.cards) {
      addCardToDeck(deckId, entry.card.id, entry.quantity, entry.board);
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
