import { NextRequest, NextResponse } from 'next/server';
import { getDb, updateLiveSessionDeck, linkArenaMatchToDeck } from '@/lib/db';

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId');
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  }

  const db = getDb();
  const session = db.prepare(
    `SELECT ls.deck_id, d.name as deck_name
     FROM live_game_sessions ls
     LEFT JOIN decks d ON ls.deck_id = d.id
     WHERE ls.match_id = ?`
  ).get(matchId) as { deck_id: number | null; deck_name: string | null } | undefined;

  return NextResponse.json({
    deckId: session?.deck_id ?? null,
    deckName: session?.deck_name ?? null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { matchId, deckId } = await request.json();

    if (!matchId || !deckId) {
      return NextResponse.json({ error: 'matchId and deckId required' }, { status: 400 });
    }

    // Update live_game_sessions
    updateLiveSessionDeck(matchId, deckId);

    // Also link in arena_parsed_matches (confidence 1.0 = user-selected)
    linkArenaMatchToDeck(matchId, deckId, 1.0);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
