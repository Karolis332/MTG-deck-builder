/**
 * Match ML Feature Extraction — computes per-match features for the ML pipeline.
 *
 * After each Arena match is parsed, this module extracts gameplay features
 * (curve efficiency, deck penetration, commander tax, removal counts, etc.)
 * and stores them in the match_ml_features table.
 *
 * These features are consumed by scripts/train_model.py during training.
 */

import { getDb } from '@/lib/db';
import type { ArenaMatch } from '@/lib/arena-log-reader';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MatchMLFeatures {
  matchId: number;
  deckId: number | null;
  deckVersionId: number | null;
  avgCmcPlayed: number | null;
  curveEfficiency: number | null;
  firstPlayTurn: number | null;
  cardsDrawnPerTurn: number | null;
  uniqueCardsPlayed: number;
  deckPenetration: number | null;
  commanderCastCount: number;
  commanderFirstCastTurn: number | null;
  removalPlayedCount: number;
  counterspellCount: number;
  versionAgeDays: number | null;
  changesSinceLastVersion: number | null;
}

// ── Removal / counterspell grpId detection ──────────────────────────────────
// We can't reliably detect card types from grpIds alone, so we check the
// cards table when possible. For now, we use a heuristic count.

function countRemovalCards(db: ReturnType<typeof getDb>, grpIds: string[]): number {
  if (grpIds.length === 0) return 0;
  let count = 0;

  // Try to resolve grpIds to card oracle text
  // grpIds are Arena internal IDs — check arena_grp_id_map if available
  try {
    const stmt = db.prepare(`
      SELECT c.oracle_text FROM arena_grp_id_map m
      JOIN cards c ON c.id = m.scryfall_id
      WHERE m.grp_id = ?
    `);

    for (const grpId of grpIds) {
      const row = stmt.get(grpId) as { oracle_text: string | null } | undefined;
      if (!row?.oracle_text) continue;
      const text = row.oracle_text.toLowerCase();
      if (
        text.includes('destroy target') ||
        text.includes('exile target') ||
        text.includes('deals') && text.includes('damage to') ||
        text.includes('-x/-x') ||
        text.includes('return target') && text.includes('to its owner')
      ) {
        count++;
      }
    }
  } catch {
    // arena_grp_id_map table may not exist
  }

  return count;
}

function countCounterspells(db: ReturnType<typeof getDb>, grpIds: string[]): number {
  if (grpIds.length === 0) return 0;
  let count = 0;

  try {
    const stmt = db.prepare(`
      SELECT c.oracle_text FROM arena_grp_id_map m
      JOIN cards c ON c.id = m.scryfall_id
      WHERE m.grp_id = ?
    `);

    for (const grpId of grpIds) {
      const row = stmt.get(grpId) as { oracle_text: string | null } | undefined;
      if (!row?.oracle_text) continue;
      const text = row.oracle_text.toLowerCase();
      if (text.includes('counter target spell') || text.includes('counter target activated')) {
        count++;
      }
    }
  } catch {
    // arena_grp_id_map table may not exist
  }

  return count;
}

// ── Curve efficiency ────────────────────────────────────────────────────────

/**
 * Curve efficiency measures how well the player used mana each turn.
 * A perfect curve plays 1 mana on T1, 2 on T2, etc.
 * Score is ratio of actual mana spent vs theoretical max.
 */
function computeCurveEfficiency(
  cardsPlayedByTurn: Record<number, string[]>,
  db: ReturnType<typeof getDb>
): number | null {
  const turns = Object.keys(cardsPlayedByTurn).map(Number).filter(t => t > 0);
  if (turns.length === 0) return null;

  let totalManaSpent = 0;
  let totalManaAvailable = 0;

  for (const turn of turns) {
    totalManaAvailable += turn; // Simplified: assume 1 land per turn
    const cards = cardsPlayedByTurn[turn] || [];

    // Try to look up CMC for each card played
    for (const grpId of cards) {
      try {
        const row = db.prepare(`
          SELECT c.cmc FROM arena_grp_id_map m
          JOIN cards c ON c.id = m.scryfall_id
          WHERE m.grp_id = ?
        `).get(grpId) as { cmc: number } | undefined;
        if (row) totalManaSpent += row.cmc;
      } catch {
        // Fallback: assume average CMC of 2.5
        totalManaSpent += 2.5;
      }
    }
  }

  return totalManaAvailable > 0 ? Math.min(1, totalManaSpent / totalManaAvailable) : null;
}

// ── Main feature computation ────────────────────────────────────────────────

/**
 * Compute ML features from a parsed Arena match.
 * Stores the features in match_ml_features table.
 *
 * @param arenaMatchDbId - The id in arena_parsed_matches table
 * @param match - The parsed match data
 * @param deckId - Optional linked deck ID
 * @param deckVersionId - Optional version ID
 */
export function computeMatchMLFeatures(
  arenaMatchDbId: number,
  match: ArenaMatch,
  deckId?: number | null,
  deckVersionId?: number | null
): MatchMLFeatures | null {
  const db = getDb();

  // Check if match_ml_features table exists
  try {
    db.prepare('SELECT 1 FROM match_ml_features LIMIT 0').run();
  } catch {
    return null; // Table doesn't exist yet
  }

  const cardsPlayedByTurn = match.cardsPlayedByTurn || {};
  const allCardsPlayed = match.cardsPlayed || [];
  const turns = match.turns || 0;

  // Compute features
  const uniqueCardsPlayed = new Set(allCardsPlayed).size;

  // Deck penetration: unique cards played / total cards in deck
  let deckPenetration: number | null = null;
  if (match.deckCards && match.deckCards.length > 0) {
    const totalDeckCards = match.deckCards.reduce((s, c) => s + c.qty, 0);
    deckPenetration = totalDeckCards > 0 ? uniqueCardsPlayed / totalDeckCards : null;
  }

  // First play turn: earliest turn with a card played
  const playTurns = Object.keys(cardsPlayedByTurn).map(Number).filter(t => t > 0);
  const firstPlayTurn = playTurns.length > 0 ? Math.min(...playTurns) : null;

  // Cards drawn per turn estimate (cards played + hand at end ~ cards drawn)
  const cardsDrawnPerTurn = turns > 0 ? allCardsPlayed.length / turns : null;

  // Commander tracking
  const commanderCasts = match.commanderCastTurns || [];
  const commanderCastCount = commanderCasts.length;
  const commanderFirstCastTurn = commanderCasts.length > 0 ? Math.min(...commanderCasts) : null;

  // Curve efficiency
  const curveEfficiency = computeCurveEfficiency(cardsPlayedByTurn, db);

  // Avg CMC of cards played
  let avgCmcPlayed: number | null = null;
  let totalCmc = 0;
  let cmcCount = 0;
  for (const grpId of allCardsPlayed) {
    try {
      const row = db.prepare(`
        SELECT c.cmc FROM arena_grp_id_map m
        JOIN cards c ON c.id = m.scryfall_id
        WHERE m.grp_id = ?
      `).get(grpId) as { cmc: number } | undefined;
      if (row) {
        totalCmc += row.cmc;
        cmcCount++;
      }
    } catch { break; } // Table doesn't exist
  }
  if (cmcCount > 0) avgCmcPlayed = totalCmc / cmcCount;

  // Removal and counterspell counts
  const removalPlayedCount = countRemovalCards(db, allCardsPlayed);
  const counterspellCount = countCounterspells(db, allCardsPlayed);

  // Version age and changes
  let versionAgeDays: number | null = null;
  let changesSinceLastVersion: number | null = null;

  if (deckVersionId) {
    try {
      const ver = db.prepare(
        'SELECT created_at, changes_from_previous FROM deck_versions WHERE id = ?'
      ).get(deckVersionId) as { created_at: string; changes_from_previous: string | null } | undefined;

      if (ver) {
        const versionDate = new Date(ver.created_at);
        const now = new Date();
        versionAgeDays = Math.floor((now.getTime() - versionDate.getTime()) / 86400000);

        if (ver.changes_from_previous) {
          try {
            const changes = JSON.parse(ver.changes_from_previous);
            changesSinceLastVersion = Array.isArray(changes) ? changes.length : 0;
          } catch { /* empty */ }
        }
      }
    } catch { /* empty */ }
  }

  const features: MatchMLFeatures = {
    matchId: arenaMatchDbId,
    deckId: deckId || null,
    deckVersionId: deckVersionId || null,
    avgCmcPlayed,
    curveEfficiency,
    firstPlayTurn,
    cardsDrawnPerTurn,
    uniqueCardsPlayed,
    deckPenetration,
    commanderCastCount,
    commanderFirstCastTurn,
    removalPlayedCount,
    counterspellCount,
    versionAgeDays,
    changesSinceLastVersion,
  };

  // Insert into DB
  try {
    db.prepare(`
      INSERT INTO match_ml_features (
        match_id, deck_id, deck_version_id,
        avg_cmc_played, curve_efficiency, first_play_turn,
        cards_drawn_per_turn, unique_cards_played, deck_penetration,
        commander_cast_count, commander_first_cast_turn,
        removal_played_count, counterspell_count,
        version_age_days, changes_since_last_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(match_id) DO UPDATE SET
        deck_id = excluded.deck_id,
        deck_version_id = excluded.deck_version_id,
        avg_cmc_played = excluded.avg_cmc_played,
        curve_efficiency = excluded.curve_efficiency,
        first_play_turn = excluded.first_play_turn,
        cards_drawn_per_turn = excluded.cards_drawn_per_turn,
        unique_cards_played = excluded.unique_cards_played,
        deck_penetration = excluded.deck_penetration,
        commander_cast_count = excluded.commander_cast_count,
        commander_first_cast_turn = excluded.commander_first_cast_turn,
        removal_played_count = excluded.removal_played_count,
        counterspell_count = excluded.counterspell_count,
        version_age_days = excluded.version_age_days,
        changes_since_last_version = excluded.changes_since_last_version
    `).run(
      arenaMatchDbId, deckId || null, deckVersionId || null,
      avgCmcPlayed, curveEfficiency, firstPlayTurn,
      cardsDrawnPerTurn, uniqueCardsPlayed, deckPenetration,
      commanderCastCount, commanderFirstCastTurn,
      removalPlayedCount, counterspellCount,
      versionAgeDays, changesSinceLastVersion
    );
  } catch {
    // Table may not exist yet
    return features;
  }

  return features;
}
