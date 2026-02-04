import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parseGameLog } from '@/lib/match-log-parser';
import { analyzeMatchesForDeck } from '@/lib/match-analyzer';
import {
  updateGlobalCardPerformance,
  updateCardEloRatings,
  updateMetaSnapshot,
  updateOpeningHandStats,
} from '@/lib/global-learner';

// GET /api/match-logs?deck_id=123
export async function GET(req: NextRequest) {
  const deckId = req.nextUrl.searchParams.get('deck_id');
  const db = getDb();

  let logs;
  if (deckId) {
    // Combine match_logs and arena_parsed_matches linked to this deck
    logs = db.prepare(`
      SELECT id, deck_id, result, play_draw, opponent_name,
             opponent_deck_colors, turns, my_life_end, opponent_life_end,
             my_cards_seen, opponent_cards_seen, notes, game_format,
             created_at, 'manual' as source
      FROM match_logs WHERE deck_id = ?
      UNION ALL
      SELECT id, deck_id, result, NULL as play_draw, opponent_name,
             NULL as opponent_deck_colors, turns, NULL as my_life_end,
             NULL as opponent_life_end, cards_played as my_cards_seen,
             opponent_cards_seen, NULL as notes, format as game_format,
             parsed_at as created_at, 'arena' as source
      FROM arena_parsed_matches WHERE deck_id = ?
      ORDER BY created_at DESC
    `).all(Number(deckId), Number(deckId));
  } else {
    logs = db.prepare(`
      SELECT id, deck_id, result, play_draw, opponent_name,
             opponent_deck_colors, turns, my_life_end, opponent_life_end,
             my_cards_seen, opponent_cards_seen, notes, game_format,
             created_at, 'manual' as source
      FROM match_logs
      UNION ALL
      SELECT id, deck_id, result, NULL as play_draw, opponent_name,
             NULL as opponent_deck_colors, turns, NULL as my_life_end,
             NULL as opponent_life_end, cards_played as my_cards_seen,
             opponent_cards_seen, NULL as notes, format as game_format,
             parsed_at as created_at, 'arena' as source
      FROM arena_parsed_matches
      ORDER BY created_at DESC
      LIMIT 100
    `).all();
  }

  // Stats summary (combined from both tables)
  const stats = deckId
    ? db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
          SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
          AVG(turns) as avg_turns
        FROM (
          SELECT result, turns FROM match_logs WHERE deck_id = ?
          UNION ALL
          SELECT result, turns FROM arena_parsed_matches WHERE deck_id = ?
        )
      `).get(Number(deckId), Number(deckId)) as Record<string, number>
    : null;

  return NextResponse.json({ logs, stats });
}

// POST /api/match-logs — parse raw game log and store
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { deck_id, raw_log, player_name, notes, game_format } = body;

  if (!raw_log || !player_name) {
    return NextResponse.json(
      { error: 'raw_log and player_name are required' },
      { status: 400 }
    );
  }

  const parsed = parseGameLog(raw_log, player_name);
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO match_logs (
      deck_id, result, play_draw, opponent_name, opponent_deck_colors,
      turns, my_life_end, opponent_life_end,
      my_cards_seen, opponent_cards_seen, notes, raw_log, game_format
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    deck_id || null,
    parsed.result,
    parsed.playDraw,
    parsed.opponentName,
    JSON.stringify(parsed.opponentDeckColors),
    parsed.turns,
    parsed.myLifeEnd,
    parsed.opponentLifeEnd,
    JSON.stringify(parsed.myCardsSeen),
    JSON.stringify(parsed.opponentCardsSeen),
    notes || null,
    raw_log,
    game_format || null
  );

  const log = db.prepare('SELECT * FROM match_logs WHERE id = ?').get(
    result.lastInsertRowid
  );

  // Update global learning tables
  const matchId = Number(result.lastInsertRowid);
  try {
    updateGlobalCardPerformance(matchId);
    updateCardEloRatings(matchId);
    updateMetaSnapshot(matchId);
    updateOpeningHandStats(matchId);
  } catch {}

  // Auto-analyze per-deck insights after each upload
  let analysis = null;
  if (deck_id) {
    try {
      analysis = analyzeMatchesForDeck(Number(deck_id));
    } catch {}
  }

  return NextResponse.json({ log, parsed, analysis });
}

// DELETE /api/match-logs?id=123
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('DELETE FROM match_logs WHERE id = ?').run(Number(id));
  return NextResponse.json({ ok: true });
}
