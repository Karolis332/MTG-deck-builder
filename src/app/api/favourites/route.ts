import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/favourites?deck_id=1 — returns favourite card IDs for a deck
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deck_id');

    if (!deckId) {
      return NextResponse.json({ error: 'deck_id is required' }, { status: 400 });
    }

    const db = getDb();
    const rows = db.prepare(
      'SELECT card_id FROM favourite_cards WHERE deck_id = ?'
    ).all(Number(deckId)) as Array<{ card_id: string }>;

    return NextResponse.json({
      favourites: rows.map((r) => r.card_id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load favourites';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/favourites — toggle favourite for a card in a deck
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { card_id, deck_id } = body;

    if (!card_id || !deck_id) {
      return NextResponse.json(
        { error: 'card_id and deck_id are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if already favourited
    const existing = db.prepare(
      'SELECT id FROM favourite_cards WHERE card_id = ? AND deck_id = ?'
    ).get(card_id, deck_id) as { id: number } | undefined;

    if (existing) {
      // Remove favourite
      db.prepare('DELETE FROM favourite_cards WHERE id = ?').run(existing.id);
      return NextResponse.json({ favourited: false, card_id });
    } else {
      // Add favourite
      db.prepare(
        'INSERT INTO favourite_cards (card_id, deck_id) VALUES (?, ?)'
      ).run(card_id, deck_id);
      return NextResponse.json({ favourited: true, card_id });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle favourite';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
