import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const deckId = Number(params.id);
    if (isNaN(deckId)) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    const db = getDb();

    // Verify deck ownership
    const deck = db.prepare(
      'SELECT id FROM decks WHERE id = ? AND user_id = ?'
    ).get(deckId, authUser.userId);
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Get the latest build explanation
    const row = db.prepare(
      `SELECT strategy_explanation, role_breakdown, card_reasons,
              model_used, build_time_ms, commander_name, strategy, created_at
       FROM ai_build_logs
       WHERE deck_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
    ).get(deckId) as {
      strategy_explanation: string | null;
      role_breakdown: string | null;
      card_reasons: string | null;
      model_used: string | null;
      build_time_ms: number | null;
      commander_name: string | null;
      strategy: string | null;
      created_at: string;
    } | undefined;

    if (!row) {
      return NextResponse.json({ explanation: null });
    }

    let roleBreakdown: Record<string, string[]> = {};
    let cardReasons: Record<string, string> = {};

    try { roleBreakdown = JSON.parse(row.role_breakdown || '{}'); } catch {}
    try { cardReasons = JSON.parse(row.card_reasons || '{}'); } catch {}

    return NextResponse.json({
      explanation: {
        strategy: row.strategy_explanation,
        roleBreakdown,
        cardReasons,
        modelUsed: row.model_used,
        buildTimeMs: row.build_time_ms,
        commanderName: row.commander_name,
        themes: row.strategy,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch explanation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
