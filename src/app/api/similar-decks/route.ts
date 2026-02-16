import { NextRequest, NextResponse } from 'next/server';
import { getDeckWithCards } from '@/lib/db';
import { getSimilarDecks } from '@/lib/cf-api-client';

export async function GET(request: NextRequest) {
  const deckId = request.nextUrl.searchParams.get('deck_id');
  if (!deckId) {
    return NextResponse.json({ error: 'deck_id required' }, { status: 400 });
  }

  const deckData = getDeckWithCards(parseInt(deckId, 10));
  if (!deckData) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  const deck = deckData as { format: string; cards: Array<{ name: string; board: string }> };
  const commanderCard = deck.cards.find((c) => c.board === 'commander');
  if (!commanderCard) {
    return NextResponse.json({ similar_decks: [] });
  }

  const mainCards = deck.cards
    .filter((c) => c.board === 'main' || c.board === 'commander')
    .map((c) => c.name);

  const similar = await getSimilarDecks(mainCards, commanderCard.name);
  return NextResponse.json({ similar_decks: similar });
}
