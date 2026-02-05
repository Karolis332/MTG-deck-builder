import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deck_id');
    const limit = Math.min(50, Number(searchParams.get('limit')) || 20);

    if (!deckId) {
      return NextResponse.json({ error: 'deck_id required' }, { status: 400 });
    }

    const db = getDb();

    // Get predictions
    const predictions = db.prepare(
      `SELECT ps.card_name, ps.predicted_score, ps.reason, ps.card_id,
              c.image_uri_small, c.type_line, c.cmc, c.mana_cost
       FROM personalized_suggestions ps
       LEFT JOIN cards c ON ps.card_id = c.id
       WHERE ps.deck_id = ?
       ORDER BY ps.predicted_score DESC
       LIMIT ?`
    ).all(Number(deckId), limit) as Array<{
      card_name: string;
      predicted_score: number;
      reason: string | null;
      card_id: string | null;
      image_uri_small: string | null;
      type_line: string | null;
      cmc: number | null;
      mana_cost: string | null;
    }>;

    // Get data size for confidence indicator
    let dataSize = 0;
    try {
      const countRow = db.prepare(
        'SELECT COUNT(*) as count FROM card_performance'
      ).get() as { count: number };
      dataSize = countRow.count;
    } catch {}

    return NextResponse.json({
      predictions: predictions.map((p) => ({
        cardName: p.card_name,
        predictedScore: p.predicted_score,
        reason: p.reason,
        cardId: p.card_id,
        imageUri: p.image_uri_small,
        typeLine: p.type_line,
        cmc: p.cmc,
        manaCost: p.mana_cost,
      })),
      dataSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch predictions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
