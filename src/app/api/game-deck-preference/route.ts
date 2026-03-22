import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const row = db.prepare(
    "SELECT value FROM app_state WHERE key = 'game_deck_preference'"
  ).get() as { value: string } | undefined;

  return NextResponse.json({
    deckId: row ? parseInt(row.value, 10) : null,
  });
}

export async function POST(request: Request) {
  try {
    const { deckId } = await request.json();
    const db = getDb();

    db.prepare(
      "INSERT OR REPLACE INTO app_state (key, value) VALUES ('game_deck_preference', ?)"
    ).run(String(deckId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save preference';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
