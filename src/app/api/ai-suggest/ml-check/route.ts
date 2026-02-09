import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-middleware';

/**
 * GET /api/ai-suggest/ml-check?deck_id=N
 *
 * Checks whether enough Arena match data exists for a deck (or its current
 * version) to generate ML-powered card suggestions. Returns:
 * - hasEnoughData: true if 5+ games exist
 * - gamesPlayed: number of games with ML features
 * - suggestions: top predicted swaps (if personalized_suggestions exist)
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deck_id');
    if (!deckId) {
      return NextResponse.json({ error: 'deck_id is required' }, { status: 400 });
    }

    const db = getDb();
    const deckIdNum = Number(deckId);

    // Count games with ML features for this deck
    let gamesPlayed = 0;
    try {
      const row = db.prepare(`
        SELECT COUNT(*) as cnt FROM match_ml_features
        WHERE deck_id = ?
      `).get(deckIdNum) as { cnt: number };
      gamesPlayed = row.cnt;
    } catch {
      // match_ml_features table might not exist
    }

    const hasEnoughData = gamesPlayed >= 5;

    // Get personalized suggestions if available
    let suggestions: Array<{
      cardName: string;
      predictedScore: number;
      reason: string | null;
      cardId: string | null;
    }> = [];

    if (hasEnoughData) {
      try {
        const rows = db.prepare(`
          SELECT card_name, predicted_score, reason, card_id
          FROM personalized_suggestions
          WHERE deck_id = ?
          ORDER BY predicted_score DESC
          LIMIT 10
        `).all(deckIdNum) as Array<{
          card_name: string;
          predicted_score: number;
          reason: string | null;
          card_id: string | null;
        }>;

        suggestions = rows.map(r => ({
          cardName: r.card_name,
          predictedScore: r.predicted_score,
          reason: r.reason,
          cardId: r.card_id,
        }));
      } catch {
        // personalized_suggestions table might not exist
      }
    }

    // Get average ML features for insight display
    let avgFeatures: Record<string, number | null> = {};
    if (gamesPlayed > 0) {
      try {
        const row = db.prepare(`
          SELECT
            AVG(curve_efficiency) as avg_curve_efficiency,
            AVG(deck_penetration) as avg_deck_penetration,
            AVG(commander_cast_count) as avg_commander_casts,
            AVG(first_play_turn) as avg_first_play,
            AVG(removal_played_count) as avg_removal_played
          FROM match_ml_features
          WHERE deck_id = ?
        `).get(deckIdNum) as Record<string, number | null>;
        avgFeatures = row;
      } catch {
        // Table might not exist
      }
    }

    return NextResponse.json({
      hasEnoughData,
      gamesPlayed,
      suggestions,
      avgFeatures,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ML check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
