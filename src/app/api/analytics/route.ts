import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/analytics
// Returns all analytics snapshots for the dashboard.
// If no snapshots exist (Python script hasn't run), computes live summaries from DB.
export async function GET() {
  try {
    const db = getDb();

    // Try to read pre-computed snapshots first
    const snapshots = db
      .prepare('SELECT snapshot_type, data, created_at FROM analytics_snapshots')
      .all() as Array<{ snapshot_type: string; data: string; created_at: string }>;

    if (snapshots.length > 0) {
      const result: Record<string, unknown> = {};
      let latestUpdate = '';
      for (const s of snapshots) {
        try {
          result[s.snapshot_type] = JSON.parse(s.data);
        } catch {
          result[s.snapshot_type] = null;
        }
        if (s.created_at > latestUpdate) latestUpdate = s.created_at;
      }
      result.last_updated = latestUpdate;
      return NextResponse.json(result);
    }

    // Fallback: compute live from raw tables
    const live = computeLiveAnalytics(db);
    return NextResponse.json(live);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function computeLiveAnalytics(db: ReturnType<typeof getDb>) {
  // Win rates from match_logs
  const matchRows = db.prepare(`
    SELECT game_format, result, COUNT(*) as cnt
    FROM match_logs
    GROUP BY game_format, result
  `).all() as Array<{ game_format: string | null; result: string; cnt: number }>;

  const winRates: Record<string, { total_games: number; wins: number; losses: number; draws: number; win_rate: number }> = {};
  for (const row of matchRows) {
    const fmt = row.game_format || 'unknown';
    if (!winRates[fmt]) {
      winRates[fmt] = { total_games: 0, wins: 0, losses: 0, draws: 0, win_rate: 0 };
    }
    winRates[fmt].total_games += row.cnt;
    if (row.result === 'win') winRates[fmt].wins += row.cnt;
    else if (row.result === 'loss') winRates[fmt].losses += row.cnt;
    else if (row.result === 'draw') winRates[fmt].draws += row.cnt;
  }
  for (const fmt of Object.keys(winRates)) {
    const wr = winRates[fmt];
    wr.win_rate = wr.total_games > 0 ? Math.round(wr.wins / wr.total_games * 1000) / 10 : 0;
  }

  // Deck performance
  const deckRows = db.prepare(`
    SELECT ml.deck_id, d.name as deck_name, d.format,
           COUNT(*) as total_games,
           SUM(CASE WHEN ml.result = 'win' THEN 1 ELSE 0 END) as wins
    FROM match_logs ml
    LEFT JOIN decks d ON ml.deck_id = d.id
    WHERE ml.deck_id IS NOT NULL
    GROUP BY ml.deck_id
    ORDER BY wins * 1.0 / COUNT(*) DESC
  `).all() as Array<{ deck_id: number; deck_name: string | null; format: string | null; total_games: number; wins: number }>;

  const deckPerf = deckRows.map((r) => ({
    deck_id: r.deck_id,
    deck_name: r.deck_name || `Deck ${r.deck_id}`,
    format: r.format || 'unknown',
    total_games: r.total_games,
    wins: r.wins,
    win_rate: r.total_games > 0 ? Math.round(r.wins / r.total_games * 1000) / 10 : 0,
  }));

  // Mana curve across all decks
  const curveRows = db.prepare(`
    SELECT
      CASE WHEN c.cmc > 7 THEN 7 ELSE CAST(c.cmc AS INTEGER) END as cmc_bucket,
      SUM(dc.quantity) as total
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.board = 'main' AND c.type_line NOT LIKE '%Land%'
    GROUP BY cmc_bucket
    ORDER BY cmc_bucket
  `).all() as Array<{ cmc_bucket: number; total: number }>;

  const manaCurve: Record<string, number> = {};
  for (const r of curveRows) {
    manaCurve[String(r.cmc_bucket)] = r.total;
  }

  // Color distribution
  const colorRows = db.prepare(`
    SELECT c.color_identity, SUM(dc.quantity) as qty
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.board IN ('main', 'commander')
    GROUP BY c.color_identity
  `).all() as Array<{ color_identity: string | null; qty: number }>;

  const colorDist: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const r of colorRows) {
    const ci = r.color_identity || '';
    if (!ci || ci === '[]') {
      colorDist.C += r.qty;
    } else {
      for (const c of ['W', 'U', 'B', 'R', 'G']) {
        if (ci.includes(c)) colorDist[c] += r.qty;
      }
    }
  }

  // Type distribution
  const typeRows = db.prepare(`
    SELECT c.type_line, SUM(dc.quantity) as qty
    FROM deck_cards dc
    JOIN cards c ON dc.card_id = c.id
    WHERE dc.board = 'main'
    GROUP BY c.type_line
  `).all() as Array<{ type_line: string; qty: number }>;

  const typeDist: Record<string, number> = {
    Creature: 0, Instant: 0, Sorcery: 0, Artifact: 0,
    Enchantment: 0, Planeswalker: 0, Land: 0, Other: 0,
  };
  for (const r of typeRows) {
    let matched = false;
    for (const t of ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker', 'Land']) {
      if (r.type_line.includes(t)) {
        typeDist[t] += r.qty;
        matched = true;
        break;
      }
    }
    if (!matched) typeDist.Other += r.qty;
  }

  // Games over time (last 30 days)
  const timeRows = db.prepare(`
    SELECT date(created_at) as game_date,
           COUNT(*) as games,
           SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins
    FROM match_logs
    WHERE created_at >= date('now', '-30 days')
    GROUP BY game_date
    ORDER BY game_date
  `).all() as Array<{ game_date: string; games: number; wins: number }>;

  const gamesOverTime = timeRows.map((r) => ({
    date: r.game_date,
    games: r.games,
    wins: r.wins,
    win_rate: r.games > 0 ? Math.round(r.wins / r.games * 1000) / 10 : 0,
  }));

  return {
    win_rates: winRates,
    deck_performance: { decks: deckPerf },
    card_performance: { top: [], bottom: [] },
    mana_curve: manaCurve,
    color_distribution: colorDist,
    type_distribution: typeDist,
    games_over_time: { days: gamesOverTime },
    last_updated: null,
  };
}
