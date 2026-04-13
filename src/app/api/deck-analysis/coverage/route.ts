import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDeckWithCards } from '@/lib/db';
import { computeCollectionCoverage } from '@/lib/collection-coverage';
import { COMMANDER_FORMATS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const deckId = request.nextUrl.searchParams.get('deck_id');
  if (!deckId) {
    return NextResponse.json({ error: 'deck_id is required' }, { status: 400 });
  }

  const deckData = getDeckWithCards(Number(deckId));
  if (!deckData) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  const deck = deckData as {
    format: string;
    cards: Array<{ name: string; board: string; quantity: number }>;
  };

  const isCommanderLike = COMMANDER_FORMATS.includes(
    deck.format as typeof COMMANDER_FORMATS[number]
  );
  if (!isCommanderLike) {
    return NextResponse.json(
      { error: 'Coverage analysis is only available for Commander/Brawl formats' },
      { status: 400 }
    );
  }

  const commanderCard = deck.cards.find((c) => c.board === 'commander');
  if (!commanderCard) {
    return NextResponse.json(
      { error: 'No commander found in deck' },
      { status: 400 }
    );
  }

  const deckCardNames = deck.cards
    .filter((c) => c.board === 'main' || c.board === 'commander')
    .map((c) => c.name);

  const coverage = computeCollectionCoverage(
    commanderCard.name,
    user.id,
    deckCardNames,
    80
  );

  if (!coverage) {
    return NextResponse.json(
      { error: 'No community data available for this commander' },
      { status: 404 }
    );
  }

  return NextResponse.json({ coverage });
}
