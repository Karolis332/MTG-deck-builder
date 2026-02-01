/**
 * Global Learning Engine
 *
 * Aggregates match data across all users/decks to build a global card
 * performance model. Each match updates:
 *
 * 1. card_performance — per-card win rates by format and matchup
 * 2. meta_snapshots   — what archetypes/colors are popular per format
 * 3. opening_hand_stats — which cards correlate with wins when in opener
 * 4. Elo ratings       — cards gain/lose rating based on opponent strength
 *
 * The suggestion engine and deck builder consume these tables to replace
 * EDHREC rank as the primary card quality signal once enough data exists.
 */

import { getDb } from '@/lib/db';
import { parseGameLog } from '@/lib/match-log-parser';

// ── Types ──────────────────────────────────────────────────────────────────

interface MatchRow {
  id: number;
  deck_id: number | null;
  result: string;
  play_draw: string | null;
  opponent_name: string | null;
  opponent_deck_colors: string | null;
  turns: number | null;
  my_life_end: number | null;
  opponent_life_end: number | null;
  my_cards_seen: string | null;
  opponent_cards_seen: string | null;
  game_format: string | null;
  raw_log: string | null;
  created_at: string;
}

interface DeckCardRow {
  card_id: string;
  name: string;
  quantity: number;
}

interface CardPerfRow {
  card_name: string;
  format: string;
  opponent_colors: string;
  games_played: number;
  games_in_deck: number;
  wins_when_played: number;
  wins_when_in_deck: number;
  total_drawn: number;
  rating: number;
}

// ── Core update functions (called after every match insert) ────────────────

/**
 * Update global card performance stats for a single match.
 * Tracks both "card was in deck" and "card was actually drawn/played".
 */
export function updateGlobalCardPerformance(matchId: number): void {
  const db = getDb();
  const match = db.prepare('SELECT * FROM match_logs WHERE id = ?').get(matchId) as MatchRow | undefined;
  if (!match) return;

  const format = match.game_format || 'standard';
  const isWin = match.result === 'win';

  // Cards the player actually saw (played/drawn)
  let myCardsSeen: string[] = [];
  try { myCardsSeen = JSON.parse(match.my_cards_seen || '[]'); } catch {}
  const seenSet = new Set(myCardsSeen);

  // Opponent colors for matchup-specific tracking
  let oppColors: string[] = [];
  try { oppColors = JSON.parse(match.opponent_deck_colors || '[]'); } catch {}
  const oppColorKey = oppColors.sort().join('');

  // Get full deck card list (if deck_id exists)
  let deckCards: DeckCardRow[] = [];
  if (match.deck_id) {
    deckCards = db.prepare(`
      SELECT dc.card_id, c.name, dc.quantity
      FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ? AND dc.board = 'main'
    `).all(match.deck_id) as DeckCardRow[];
  }

  // Build the set of all card names to update
  // Include both deck cards and seen cards (in case log shows cards not in deck list)
  const allCards = new Set<string>();
  for (const dc of deckCards) allCards.add(dc.name);
  for (const cn of myCardsSeen) allCards.add(cn);

  if (allCards.size === 0) return;

  const upsert = db.prepare(`
    INSERT INTO card_performance (card_name, format, opponent_colors,
      games_played, games_in_deck, wins_when_played, wins_when_in_deck, total_drawn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(card_name, format, opponent_colors) DO UPDATE SET
      games_played = card_performance.games_played + excluded.games_played,
      games_in_deck = card_performance.games_in_deck + excluded.games_in_deck,
      wins_when_played = card_performance.wins_when_played + excluded.wins_when_played,
      wins_when_in_deck = card_performance.wins_when_in_deck + excluded.wins_when_in_deck,
      total_drawn = card_performance.total_drawn + excluded.total_drawn,
      updated_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    allCards.forEach((cardName) => {
      const wasSeen = seenSet.has(cardName);
      const inDeck = deckCards.some((dc) => dc.name === cardName);

      // Update matchup-specific row
      if (oppColorKey) {
        upsert.run(
          cardName, format, oppColorKey,
          wasSeen ? 1 : 0,          // games_played
          inDeck ? 1 : 0,           // games_in_deck
          wasSeen && isWin ? 1 : 0, // wins_when_played
          inDeck && isWin ? 1 : 0,  // wins_when_in_deck
          wasSeen ? 1 : 0           // total_drawn
        );
      }

      // Update aggregate row (all matchups)
      upsert.run(
        cardName, format, '',
        wasSeen ? 1 : 0,
        inDeck ? 1 : 0,
        wasSeen && isWin ? 1 : 0,
        inDeck && isWin ? 1 : 0,
        wasSeen ? 1 : 0
      );
    });
  });

  tx();
}

/**
 * Update Elo ratings for cards that were played in this match.
 * Cards gain rating for winning against strong opposition and lose for
 * losing against weak opposition.
 */
export function updateCardEloRatings(matchId: number): void {
  const db = getDb();
  const match = db.prepare('SELECT * FROM match_logs WHERE id = ?').get(matchId) as MatchRow | undefined;
  if (!match) return;

  const format = match.game_format || 'standard';
  const isWin = match.result === 'win';
  const isDraw = match.result === 'draw';

  let myCardsSeen: string[] = [];
  try { myCardsSeen = JSON.parse(match.my_cards_seen || '[]'); } catch {}

  let oppCardsSeen: string[] = [];
  try { oppCardsSeen = JSON.parse(match.opponent_cards_seen || '[]'); } catch {}

  if (myCardsSeen.length === 0) return;

  // Get opponent card ratings to compute opponent strength
  const oppRatings: number[] = [];
  for (const cardName of oppCardsSeen) {
    const row = db.prepare(
      `SELECT rating FROM card_performance
       WHERE card_name = ? AND format = ? AND opponent_colors = ''`
    ).get(cardName, format) as { rating: number } | undefined;
    oppRatings.push(row?.rating ?? 1500);
  }

  const oppStrength = oppRatings.length > 0
    ? oppRatings.reduce((a, b) => a + b, 0) / oppRatings.length
    : 1500;

  const actualScore = isWin ? 1.0 : isDraw ? 0.5 : 0.0;

  const updateRating = db.prepare(`
    UPDATE card_performance SET rating = ?, updated_at = datetime('now')
    WHERE card_name = ? AND format = ? AND opponent_colors = ''
  `);

  const tx = db.transaction(() => {
    for (const cardName of myCardsSeen) {
      const row = db.prepare(
        `SELECT rating, games_played FROM card_performance
         WHERE card_name = ? AND format = ? AND opponent_colors = ''`
      ).get(cardName, format) as { rating: number; games_played: number } | undefined;

      if (!row) continue;

      const K = row.games_played < 20 ? 32 : 16;
      const expected = 1 / (1 + Math.pow(10, (oppStrength - row.rating) / 400));
      const newRating = row.rating + K * (actualScore - expected);

      updateRating.run(newRating, cardName, format);
    }
  });

  tx();
}

/**
 * Track what color combinations / archetypes opponents are playing.
 * Uses 7-day windows aligned to Monday for trend detection.
 */
export function updateMetaSnapshot(matchId: number): void {
  const db = getDb();
  const match = db.prepare('SELECT * FROM match_logs WHERE id = ?').get(matchId) as MatchRow | undefined;
  if (!match) return;

  const format = match.game_format || 'standard';
  const isWin = match.result === 'win';

  let oppColors: string[] = [];
  try { oppColors = JSON.parse(match.opponent_deck_colors || '[]'); } catch {}
  const oppColorKey = oppColors.sort().join('') || 'Unknown';

  // Compute window: Monday-aligned 7-day windows
  const matchDate = new Date(match.created_at);
  const dayOfWeek = matchDate.getDay(); // 0=Sun, 1=Mon
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(matchDate);
  monday.setDate(monday.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const windowStart = monday.toISOString().split('T')[0];
  const windowEnd = new Date(monday.getTime() + 7 * 86400000).toISOString().split('T')[0];

  const upsert = db.prepare(`
    INSERT INTO meta_snapshots (format, color_combination, games_seen, wins, window_start, window_end)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(format, color_combination, window_start) DO UPDATE SET
      games_seen = meta_snapshots.games_seen + 1,
      wins = meta_snapshots.wins + excluded.wins
  `);

  // Track opponent's appearance (their "wins" = our losses, i.e., they won)
  upsert.run(format, oppColorKey, isWin ? 0 : 1, windowStart, windowEnd);
}

/**
 * Track which cards in the opening hand correlate with wins.
 * Uses turn 0/1 data from the game log parser.
 */
export function updateOpeningHandStats(matchId: number): void {
  const db = getDb();
  const match = db.prepare('SELECT * FROM match_logs WHERE id = ?').get(matchId) as MatchRow | undefined;
  if (!match || !match.raw_log) return;

  const format = match.game_format || 'standard';
  const isWin = match.result === 'win';

  // Need player name to parse
  const oppName = match.opponent_name || '';
  const rollLines = match.raw_log.split('\n').filter((l) => /rolled\s+/i.test(l));
  let playerName = '';
  for (const rl of rollLines) {
    const rm = rl.trim().match(/^(\S+)\s+rolled/i);
    if (rm && rm[1].toLowerCase() !== oppName.toLowerCase()) {
      playerName = rm[1];
      break;
    }
  }
  if (!playerName) return;

  const parsed = parseGameLog(match.raw_log, playerName);

  // Cards at turn 0 or turn 1 = opening hand
  const openingCards = new Set<string>();
  const t0 = parsed.myCardsByTurn[0] || [];
  const t1 = parsed.myCardsByTurn[1] || [];
  for (const c of t0) openingCards.add(c);
  // If no turn 0 data, use turn 1 as proxy for opening hand
  if (t0.length === 0) {
    for (const c of t1) openingCards.add(c);
  }

  if (openingCards.size === 0) return;

  // Detect mulligan from raw log
  const hasMulligan = /mulligan/i.test(match.raw_log);

  const upsert = db.prepare(`
    INSERT INTO opening_hand_stats (card_name, format, in_opening_hand, wins_in_opening, mulliganed_away, wins_after_mulligan)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(card_name, format) DO UPDATE SET
      in_opening_hand = opening_hand_stats.in_opening_hand + excluded.in_opening_hand,
      wins_in_opening = opening_hand_stats.wins_in_opening + excluded.wins_in_opening,
      mulliganed_away = opening_hand_stats.mulliganed_away + excluded.mulliganed_away,
      wins_after_mulligan = opening_hand_stats.wins_after_mulligan + excluded.wins_after_mulligan,
      updated_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    openingCards.forEach((cardName) => {
      upsert.run(
        cardName, format,
        1,                        // in_opening_hand
        isWin ? 1 : 0,           // wins_in_opening
        hasMulligan ? 1 : 0,     // mulliganed_away (rough: if any mull happened)
        hasMulligan && isWin ? 1 : 0 // wins_after_mulligan
      );
    });
  });

  tx();
}

// ── Query functions (consumed by deck builder / suggestion engine) ──────────

export interface CardGlobalScore {
  confidence: number;      // 0-1, based on games played (1.0 at 20+ games)
  playedWinRate: number;   // win rate when card was drawn/played
  deckWinRate: number;     // win rate when card was in deck (regardless of draw)
  elo: number;             // Elo rating (1500 = neutral)
  gamesPlayed: number;
}

/**
 * Get the global learned score for a card in a format.
 * Returns neutral defaults when no data exists (cold start).
 */
export function getCardGlobalScore(cardName: string, format: string): CardGlobalScore {
  const db = getDb();
  const row = db.prepare(
    `SELECT * FROM card_performance
     WHERE card_name = ? AND format = ? AND opponent_colors = ''`
  ).get(cardName, format) as CardPerfRow | undefined;

  if (!row || row.games_played === 0) {
    return { confidence: 0, playedWinRate: 0.5, deckWinRate: 0.5, elo: 1500, gamesPlayed: 0 };
  }

  return {
    confidence: Math.min(row.games_played / 20, 1.0),
    playedWinRate: row.games_played > 0 ? row.wins_when_played / row.games_played : 0.5,
    deckWinRate: row.games_in_deck > 0 ? row.wins_when_in_deck / row.games_in_deck : 0.5,
    elo: row.rating,
    gamesPlayed: row.games_played,
  };
}

/**
 * Get matchup-specific card score (e.g., how does this card perform vs Rakdos).
 */
export function getCardMatchupScore(
  cardName: string, format: string, opponentColors: string
): CardGlobalScore | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT * FROM card_performance
     WHERE card_name = ? AND format = ? AND opponent_colors = ?`
  ).get(cardName, format, opponentColors) as CardPerfRow | undefined;

  if (!row || row.games_played < 2) return null;

  return {
    confidence: Math.min(row.games_played / 10, 1.0),
    playedWinRate: row.games_played > 0 ? row.wins_when_played / row.games_played : 0.5,
    deckWinRate: row.games_in_deck > 0 ? row.wins_when_in_deck / row.games_in_deck : 0.5,
    elo: row.rating,
    gamesPlayed: row.games_played,
  };
}

/**
 * Score boost based on meta popularity. Cards that perform well against
 * the most popular archetypes get a bonus.
 */
export function getMetaAdjustedScore(cardName: string, format: string): number {
  const db = getDb();

  // Top 3 color combinations in last 28 days
  const topMeta = db.prepare(`
    SELECT color_combination, SUM(games_seen) as total
    FROM meta_snapshots
    WHERE format = ? AND window_start >= date('now', '-28 days')
    GROUP BY color_combination
    ORDER BY total DESC LIMIT 3
  `).all(format) as Array<{ color_combination: string; total: number }>;

  let boost = 0;
  for (const meta of topMeta) {
    if (meta.color_combination === 'Unknown') continue;
    const perf = db.prepare(
      `SELECT wins_when_played, games_played FROM card_performance
       WHERE card_name = ? AND format = ? AND opponent_colors = ?`
    ).get(cardName, format, meta.color_combination) as { wins_when_played: number; games_played: number } | undefined;

    if (perf && perf.games_played >= 3) {
      const wr = perf.wins_when_played / perf.games_played;
      if (wr > 0.6) boost += 5; // good against a popular archetype
    }
  }

  return Math.min(boost, 15);
}

/**
 * Get the current meta breakdown for a format.
 */
export function getMetaBreakdown(format: string, days: number = 28): Array<{
  colorCombination: string;
  totalGames: number;
  totalWins: number;
  winRate: number;
  metaShare: number;
}> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT color_combination,
           SUM(games_seen) as total_games,
           SUM(wins) as total_wins
    FROM meta_snapshots
    WHERE format = ? AND window_start >= date('now', ? || ' days')
    GROUP BY color_combination
    ORDER BY total_games DESC
  `).all(format, `-${days}`) as Array<{ color_combination: string; total_games: number; total_wins: number }>;

  const grandTotal = rows.reduce((s, r) => s + r.total_games, 0) || 1;

  return rows.map((r) => ({
    colorCombination: r.color_combination,
    totalGames: r.total_games,
    totalWins: r.total_wins,
    winRate: r.total_games > 0 ? Math.round((r.total_wins / r.total_games) * 100) : 0,
    metaShare: Math.round((r.total_games / grandTotal) * 100),
  }));
}

/**
 * Get opening hand win rate rankings for a format.
 */
export function getOpeningHandRankings(format: string): Array<{
  cardName: string;
  inOpeningHand: number;
  openingWinRate: number;
  mulliganedAway: number;
  postMulliganWinRate: number | null;
}> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT card_name, in_opening_hand, wins_in_opening, mulliganed_away, wins_after_mulligan
    FROM opening_hand_stats
    WHERE format = ? AND in_opening_hand >= 3
    ORDER BY CAST(wins_in_opening AS REAL) / in_opening_hand DESC
  `).all(format) as Array<{
    card_name: string;
    in_opening_hand: number;
    wins_in_opening: number;
    mulliganed_away: number;
    wins_after_mulligan: number;
  }>;

  return rows.map((r) => ({
    cardName: r.card_name,
    inOpeningHand: r.in_opening_hand,
    openingWinRate: Math.round((r.wins_in_opening / r.in_opening_hand) * 100),
    mulliganedAway: r.mulliganed_away,
    postMulliganWinRate: r.mulliganed_away > 0
      ? Math.round((r.wins_after_mulligan / r.mulliganed_away) * 100)
      : null,
  }));
}

/**
 * Get top-rated cards in a format, sorted by Elo rating.
 */
export function getTopCards(format: string, limit: number = 50): Array<{
  cardName: string;
  elo: number;
  playedWinRate: number;
  gamesPlayed: number;
  confidence: number;
}> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT card_name, rating, wins_when_played, games_played
    FROM card_performance
    WHERE format = ? AND opponent_colors = '' AND games_played >= 3
    ORDER BY rating DESC
    LIMIT ?
  `).all(format, limit) as Array<{
    card_name: string;
    rating: number;
    wins_when_played: number;
    games_played: number;
  }>;

  return rows.map((r) => ({
    cardName: r.card_name,
    elo: Math.round(r.rating),
    playedWinRate: Math.round((r.wins_when_played / r.games_played) * 100),
    gamesPlayed: r.games_played,
    confidence: Math.min(r.games_played / 20, 1.0),
  }));
}

// ── Backfill function (processes all existing match logs) ──────────────────

/**
 * Process all existing match_logs to populate global learning tables.
 * Call this once after migration, or to rebuild from scratch.
 */
export function backfillGlobalData(): { processed: number; errors: number } {
  const db = getDb();
  const matches = db.prepare('SELECT id FROM match_logs ORDER BY created_at ASC').all() as Array<{ id: number }>;

  let processed = 0;
  let errors = 0;

  for (const match of matches) {
    try {
      updateGlobalCardPerformance(match.id);
      updateMetaSnapshot(match.id);
      updateOpeningHandStats(match.id);
      updateCardEloRatings(match.id);
      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}
