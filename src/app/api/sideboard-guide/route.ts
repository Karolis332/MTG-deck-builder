import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { generateSideboardGuide, getCachedGuides } from '@/lib/sideboard-guide';

/**
 * GET /api/sideboard-guide?deckId=123
 * Retrieve cached sideboard guides for a deck.
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const deckId = parseInt(searchParams.get('deckId') ?? '');
  if (isNaN(deckId)) {
    return NextResponse.json({ error: 'deckId is required' }, { status: 400 });
  }

  // Verify deck belongs to user
  const db = getDb();
  const deck = db.prepare('SELECT id FROM decks WHERE id = ? AND user_id = ?').get(deckId, authUser.userId);
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  const guides = getCachedGuides(deckId);
  return NextResponse.json({ guides });
}

/**
 * POST /api/sideboard-guide
 * Generate sideboard guides for a deck using Claude AI.
 * Body: { deckId: number }
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorizedResponse();

  const body = await request.json();
  const deckId = body.deckId as number;
  if (!deckId) {
    return NextResponse.json({ error: 'deckId is required' }, { status: 400 });
  }

  const db = getDb();

  // Verify deck belongs to user
  const deck = db.prepare('SELECT id, format FROM decks WHERE id = ? AND user_id = ?').get(deckId, authUser.userId) as { id: number; format: string } | undefined;
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  // Get deck cards
  const cards = db.prepare(
    `SELECT dc.quantity, dc.board, c.name, c.type_line, c.mana_cost
     FROM deck_cards dc
     JOIN cards c ON dc.card_id = c.id
     WHERE dc.deck_id = ?`
  ).all(deckId) as Array<{
    quantity: number;
    board: string;
    name: string;
    type_line: string;
    mana_cost: string | null;
  }>;

  const deckCards = cards.map(c => ({
    name: c.name,
    quantity: c.quantity,
    board: c.board,
    typeLine: c.type_line,
    manaCost: c.mana_cost ?? undefined,
  }));

  try {
    const guides = await generateSideboardGuide(deckId, deckCards, deck.format ?? 'standard');
    return NextResponse.json({ guides });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
