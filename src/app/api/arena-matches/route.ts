import { NextRequest, NextResponse } from 'next/server';
import {
  storeArenaParsedMatch,
  getArenaParsedMatches,
  resolveArenaIds,
  matchArenaDeckToSavedDeck,
  linkArenaMatchToDeck,
  autoLinkArenaMatches,
  getUnlinkedArenaMatches,
} from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle bulk auto-link request
    if (body.action === 'auto-link') {
      const result = autoLinkArenaMatches();
      return NextResponse.json({ ok: true, ...result });
    }

    // Handle manual link request
    if (body.action === 'link') {
      const { matchId, deckId } = body;
      if (!matchId || !deckId) {
        return NextResponse.json({ error: 'matchId and deckId are required' }, { status: 400 });
      }
      const ok = linkArenaMatchToDeck(matchId, deckId, 1.0);
      return NextResponse.json({ ok, matchId, deckId });
    }

    // Handle unlink request
    if (body.action === 'unlink') {
      const { matchId } = body;
      if (!matchId) {
        return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
      }
      const ok = linkArenaMatchToDeck(matchId, null, null);
      return NextResponse.json({ ok, matchId });
    }

    const { matchId, playerName, opponentName, result, format, turns, deckCards, cardsPlayed, opponentCardsSeen, cardsPlayedByTurn, commanderCastTurns, landsPlayedByTurn } = body;

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

    const storeResult = storeArenaParsedMatch({
      matchId,
      playerName: playerName || null,
      opponentName: opponentName || null,
      result,
      format: format || null,
      turns: turns || 0,
      deckCards: deckCards ? JSON.stringify(deckCards) : null,
      cardsPlayed: JSON.stringify(resolvedCardsPlayed),
      opponentCardsSeen: JSON.stringify(resolvedOpponentCards),
      cardsPlayedByTurn: cardsPlayedByTurn ? JSON.stringify(cardsPlayedByTurn) : null,
      commanderCastTurns: commanderCastTurns ? JSON.stringify(commanderCastTurns) : null,
      landsPlayedByTurn: landsPlayedByTurn ? JSON.stringify(landsPlayedByTurn) : null,
    });

    // Auto-link to saved deck if we have deck cards
    let deckMatch = null;
    if (storeResult.success && deckCards?.length > 0) {
      deckMatch = matchArenaDeckToSavedDeck(deckCards, format);
      if (deckMatch) {
        linkArenaMatchToDeck(matchId, deckMatch.deckId, deckMatch.confidence);
      }
    }

    // Compute ML features if match was stored
    if (storeResult.success && storeResult.id) {
      try {
        const { computeMatchMLFeatures } = await import('@/lib/match-ml-features');
        computeMatchMLFeatures(
          storeResult.id,
          {
            matchId, playerName, opponentName, result,
            format, turns: turns || 0,
            deckCards: deckCards || null,
            cardsPlayed: resolvedCardsPlayed,
            opponentCardsSeen: resolvedOpponentCards,
            cardsPlayedByTurn: cardsPlayedByTurn || {},
            commanderCastTurns: commanderCastTurns || [],
            landsPlayedByTurn: landsPlayedByTurn || {},
          },
          deckMatch?.deckId || null,
          null
        );
      } catch {
        // ML features are optional — don't fail the match store
      }
    }

    return NextResponse.json({
      ok: storeResult.success,
      matchId,
      deckMatch: deckMatch ? { deckId: deckMatch.deckId, deckName: deckMatch.deckName, confidence: deckMatch.confidence } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store arena match';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unlinkedOnly = searchParams.get('unlinked') === 'true';

    if (unlinkedOnly) {
      const matches = getUnlinkedArenaMatches(100);
      return NextResponse.json({ matches });
    }

    const matches = getArenaParsedMatches(100);
    return NextResponse.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch arena matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
