import { NextRequest, NextResponse } from 'next/server';
import {
  storeArenaParsedMatch,
  getArenaParsedMatches,
  resolveArenaIds,
} from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, playerName, opponentName, result, format, turns, deckCards, cardsPlayed, opponentCardsSeen } = body;

    if (!matchId || !result) {
      return NextResponse.json(
        { error: 'matchId and result are required' },
        { status: 400 }
      );
    }

    // Resolve arena grpIds to card names for cardsPlayed and opponentCardsSeen
    let resolvedCardsPlayed = cardsPlayed || [];
    let resolvedOpponentCards = opponentCardsSeen || [];

    if (cardsPlayed?.length || opponentCardsSeen?.length) {
      const allIds = [...(cardsPlayed || []), ...(opponentCardsSeen || [])];
      const cardMap = resolveArenaIds(allIds);

      if (cardMap.size > 0) {
        resolvedCardsPlayed = (cardsPlayed || []).map((id: string) => {
          const card = cardMap.get(id);
          return card ? (card.name as string) : id;
        });
        resolvedOpponentCards = (opponentCardsSeen || []).map((id: string) => {
          const card = cardMap.get(id);
          return card ? (card.name as string) : id;
        });
      }
    }

    const stored = storeArenaParsedMatch({
      matchId,
      playerName: playerName || null,
      opponentName: opponentName || null,
      result,
      format: format || null,
      turns: turns || 0,
      deckCards: deckCards ? JSON.stringify(deckCards) : null,
      cardsPlayed: JSON.stringify(resolvedCardsPlayed),
      opponentCardsSeen: JSON.stringify(resolvedOpponentCards),
    });

    return NextResponse.json({ ok: stored, matchId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store arena match';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const matches = getArenaParsedMatches(100);
    return NextResponse.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch arena matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
