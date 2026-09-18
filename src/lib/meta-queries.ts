/**
 * Meta queries — the read layer over the scraped tournament corpus
 * (`community_decks` / `community_deck_cards`).
 *
 * Two corpus hazards are handled here, once, so no caller can get them wrong:
 *
 * 1. A single card is stored as SEVERAL rows per deck. Every aggregate collapses
 *    (deck, card, board) with SUM(quantity) BEFORE averaging. Skipping this step
 *    has already produced wrong land counts and wrong copy counts twice.
 * 2. Whole sources carry no `event_date` (mtgtop8: 5931 Standard decks, all NULL).
 *    Undated decks are excluded whenever a time window is requested, otherwise a
 *    "last 30 days" query silently answers with lists from before the last bannings.
 *    Pass `includeUndated` to opt back in.
 */
import { getDb } from './db';

export interface MetaWindow {
  /** Format slug as stored in community_decks, e.g. 'standard'. */
  format: string;
  /** Inclusive ISO lower bound on event_date. Takes precedence over `days`. */
  since?: string;
  /** Convenience alternative to `since`: a window ending today. */
  days?: number;
  /** Restrict to these sources, e.g. ['mtgo']. Empty/undefined means all. */
  sources?: string[];
  /** Include decks whose event_date is NULL. Default false whenever a window is set. */
  includeUndated?: boolean;
}

export interface ArchetypeStat {
  archetype: string;
  /** Punctuation/case-normalized grouping key; variants share one key. */
  archetypeKey: string;
  decks: number;
  /** Share of all decks in the window, 0..1. */
  share: number;
  wins: number;
  losses: number;
  draws: number;
  /** null when the sources in this window carry no W/L at all. */
  winRate: number | null;
  newestEvent: string | null;
}

export interface ConsensusCard {
  name: string;
  /** Share of decks in the window playing at least one copy, 0..1. */
  inclusion: number;
  /** Average copies among the decks that play it (not across all decks). */
  avgQty: number;
  decks: number;
}

export interface ArchetypeConsensus {
  archetype: string;
  deckCount: number;
  main: ConsensusCard[];
  sideboard: ConsensusCard[];
}

export interface MetaCardStat {
  name: string;
  decks: number;
  inclusion: number;
  avgQty: number;
  wins: number;
  losses: number;
  winRate: number | null;
}

export interface MetaDeckSummary {
  id: number;
  source: string;
  sourceId: string | null;
  archetype: string | null;
  deckName: string | null;
  player: string | null;
  eventName: string | null;
  eventDate: string | null;
  placement: number | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  record: string | null;
}

export interface MetaDeck extends MetaDeckSummary {
  main: Array<{ name: string; quantity: number }>;
  sideboard: Array<{ name: string; quantity: number }>;
  mainCount: number;
  sideboardCount: number;
}

export interface SourceFreshness {
  source: string;
  decks: number;
  withDate: number;
  withRecord: number;
  oldestEvent: string | null;
  newestEvent: string | null;
}

interface WindowSql {
  where: string;
  params: unknown[];
}

/**
 * Sources spell the same archetype differently — mtgtop8 alone carries
 * "Mono Green Landfall" (451), "Mono-green Landfall" (8) and "Monogreen Landfall" (5)
 * as three separate labels. Grouping on the raw string splits one archetype into
 * several rows and understates all of them.
 *
 * Only punctuation and case are collapsed. Genuinely different granularity is left
 * alone: mtgo's colour-guild "Mono-Green" stays distinct from "Mono-Green Landfall",
 * because merging those is a taxonomy decision, not a typo fix.
 */
const ARCHETYPE_KEY_SQL = `lower(replace(replace(replace(COALESCE(d.archetype,'Unknown'),'-',''),' ',''),'_',''))`;

export function archetypeKey(name: string): string {
  return name.toLowerCase().replace(/[-\s_]/g, '');
}

const MAX_LIMIT = 500;

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function resolveSince(w: MetaWindow): string | undefined {
  if (w.since) return w.since;
  if (typeof w.days === 'number' && Number.isFinite(w.days) && w.days > 0) {
    return isoDaysAgo(Math.floor(w.days));
  }
  return undefined;
}

/** Build the shared `community_decks` filter. Every value is bound, never interpolated. */
function windowSql(w: MetaWindow): WindowSql {
  const clauses = ['d.format = ?'];
  const params: unknown[] = [w.format];

  const since = resolveSince(w);
  if (since) {
    clauses.push(
      w.includeUndated
        ? '(d.event_date IS NULL OR d.event_date >= ?)'
        : '(d.event_date IS NOT NULL AND d.event_date >= ?)'
    );
    params.push(since);
  } else if (!w.includeUndated) {
    // No window requested: everything is in scope, dated or not.
  }

  const sources = (w.sources ?? []).filter((s) => typeof s === 'string' && s.length > 0);
  if (sources.length) {
    clauses.push(`d.source IN (${sources.map(() => '?').join(',')})`);
    params.push(...sources);
  }

  return { where: clauses.join(' AND '), params };
}

/** Wins/losses are NULL for whole sources; treat "no data at all" as an unknown rate. */
function winRate(wins: number, losses: number): number | null {
  const played = wins + losses;
  return played > 0 ? wins / played : null;
}

function clampLimit(limit: unknown, fallback: number): number {
  const n = Math.floor(Number(limit));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, MAX_LIMIT);
}

/**
 * Archetype breakdown for a window, most-played first.
 * Win rate is aggregated across the archetype's decks, and is null when the
 * window's sources carry no records.
 */
export function getArchetypeStats(w: MetaWindow): ArchetypeStat[] {
  const { where, params } = windowSql(w);
  const rows = getDb()
    .prepare(
      `SELECT COALESCE(d.archetype, 'Unknown') AS archetype,
              COUNT(*) AS decks,
              COALESCE(SUM(d.wins), 0) AS wins,
              COALESCE(SUM(d.losses), 0) AS losses,
              COALESCE(SUM(d.draws), 0) AS draws,
              MAX(d.event_date) AS newestEvent
         FROM community_decks d
        WHERE ${where}
        GROUP BY COALESCE(d.archetype, 'Unknown')
        ORDER BY decks DESC, archetype ASC`
    )
    .all(...params) as Array<{
    archetype: string;
    decks: number;
    wins: number;
    losses: number;
    draws: number;
    newestEvent: string | null;
  }>;

  // Merge spelling variants of the same archetype, keeping the most common label.
  const merged = new Map<string, ArchetypeStat & { topLabelDecks: number }>();
  for (const r of rows) {
    const key = archetypeKey(r.archetype);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        archetype: r.archetype,
        archetypeKey: key,
        decks: r.decks,
        share: 0,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        winRate: null,
        newestEvent: r.newestEvent,
        topLabelDecks: r.decks,
      });
      continue;
    }
    existing.decks += r.decks;
    existing.wins += r.wins;
    existing.losses += r.losses;
    existing.draws += r.draws;
    if (r.newestEvent && (!existing.newestEvent || r.newestEvent > existing.newestEvent)) {
      existing.newestEvent = r.newestEvent;
    }
    if (r.decks > existing.topLabelDecks) {
      existing.archetype = r.archetype;
      existing.topLabelDecks = r.decks;
    }
  }

  const total = rows.reduce((sum, r) => sum + r.decks, 0);
  return [...merged.values()]
    .map(({ topLabelDecks: _drop, ...stat }) => ({
      ...stat,
      share: total > 0 ? stat.decks / total : 0,
      winRate: winRate(stat.wins, stat.losses),
    }))
    .sort((a, b) => b.decks - a.decks || a.archetype.localeCompare(b.archetype));
}

/**
 * The consensus list for one archetype: every card, how often it appears, and how
 * many copies the decks that play it run.
 */
export function getArchetypeConsensus(
  w: MetaWindow & { archetype: string; minInclusion?: number }
): ArchetypeConsensus {
  const { where, params } = windowSql(w);
  const db = getDb();

  const deckCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM community_decks d WHERE ${where} AND ${ARCHETYPE_KEY_SQL} = ?`
      )
      .get(...params, archetypeKey(w.archetype)) as { n: number }
  ).n;

  if (deckCount === 0) {
    return { archetype: w.archetype, deckCount: 0, main: [], sideboard: [] };
  }

  const minInclusion = typeof w.minInclusion === 'number' ? w.minInclusion : 0.35;
  const rows = db
    .prepare(
      // Collapse the duplicate rows FIRST, then aggregate across decks.
      `WITH sel AS (
         SELECT d.id FROM community_decks d WHERE ${where} AND ${ARCHETYPE_KEY_SQL} = ?
       ),
       dc AS (
         SELECT c.community_deck_id AS deck_id,
                c.card_name AS name,
                CASE WHEN c.board = 'main' THEN 'main' ELSE 'sideboard' END AS board,
                SUM(c.quantity) AS qty
           FROM community_deck_cards c
           JOIN sel ON sel.id = c.community_deck_id
          GROUP BY c.community_deck_id, c.card_name, board
       )
       SELECT name, board, COUNT(*) AS decks, AVG(qty) AS avgQty
         FROM dc
        GROUP BY name, board
        ORDER BY decks DESC, name ASC`
    )
    .all(...params, archetypeKey(w.archetype)) as Array<{
    name: string;
    board: string;
    decks: number;
    avgQty: number;
  }>;

  const main: ConsensusCard[] = [];
  const sideboard: ConsensusCard[] = [];
  for (const r of rows) {
    const inclusion = r.decks / deckCount;
    if (inclusion < minInclusion) continue;
    const card: ConsensusCard = { name: r.name, inclusion, avgQty: r.avgQty, decks: r.decks };
    (r.board === 'main' ? main : sideboard).push(card);
  }

  return { archetype: w.archetype, deckCount, main, sideboard };
}

/**
 * Card-level meta stats across the whole window: how played a card is, and how the
 * decks playing it performed. Main deck only — sideboard slots answer a different
 * question and would distort inclusion.
 */
export function getMetaCardStats(w: MetaWindow & { limit?: number }): MetaCardStat[] {
  const { where, params } = windowSql(w);
  const db = getDb();

  const deckCount = (
    db.prepare(`SELECT COUNT(*) AS n FROM community_decks d WHERE ${where}`).get(...params) as {
      n: number;
    }
  ).n;
  if (deckCount === 0) return [];

  const rows = db
    .prepare(
      `WITH sel AS (
         SELECT d.id, d.wins, d.losses FROM community_decks d WHERE ${where}
       ),
       dc AS (
         SELECT c.community_deck_id AS deck_id, c.card_name AS name, SUM(c.quantity) AS qty
           FROM community_deck_cards c
           JOIN sel ON sel.id = c.community_deck_id
          WHERE c.board = 'main'
          GROUP BY c.community_deck_id, c.card_name
       )
       SELECT dc.name AS name,
              COUNT(*) AS decks,
              AVG(dc.qty) AS avgQty,
              COALESCE(SUM(sel.wins), 0) AS wins,
              COALESCE(SUM(sel.losses), 0) AS losses
         FROM dc
         JOIN sel ON sel.id = dc.deck_id
        GROUP BY dc.name
        ORDER BY decks DESC, name ASC
        LIMIT ?`
    )
    .all(...params, clampLimit(w.limit, MAX_LIMIT)) as Array<{
    name: string;
    decks: number;
    avgQty: number;
    wins: number;
    losses: number;
  }>;

  return rows.map((r) => ({
    name: r.name,
    decks: r.decks,
    inclusion: r.decks / deckCount,
    avgQty: r.avgQty,
    wins: r.wins,
    losses: r.losses,
    winRate: winRate(r.wins, r.losses),
  }));
}

function toSummary(r: Record<string, unknown>): MetaDeckSummary {
  return {
    id: r.id as number,
    source: r.source as string,
    sourceId: (r.source_id as string) ?? null,
    archetype: (r.archetype as string) ?? null,
    deckName: (r.deck_name as string) ?? null,
    player: (r.player_name as string) ?? null,
    eventName: (r.event_name as string) ?? null,
    eventDate: (r.event_date as string) ?? null,
    placement: (r.placement as number) ?? null,
    wins: (r.wins as number) ?? null,
    losses: (r.losses as number) ?? null,
    draws: (r.draws as number) ?? null,
    record:
      (r.record as string) ??
      (r.wins != null && r.losses != null ? `${r.wins}-${r.losses}` : null),
  };
}

/** Recent decks in a window, newest first. Optionally narrowed to one archetype. */
export function searchMetaDecks(
  w: MetaWindow & { archetype?: string; minWinRate?: number; limit?: number }
): MetaDeckSummary[] {
  const { where, params } = windowSql(w);
  const clauses = [where];
  const args = [...params];

  if (w.archetype) {
    clauses.push(`${ARCHETYPE_KEY_SQL} = ?`);
    args.push(archetypeKey(w.archetype));
  }
  if (typeof w.minWinRate === 'number') {
    // Only decks that actually carry a record can satisfy a win-rate filter.
    clauses.push(
      '(d.wins IS NOT NULL AND d.losses IS NOT NULL AND (d.wins + d.losses) > 0 AND (CAST(d.wins AS REAL) / (d.wins + d.losses)) >= ?)'
    );
    args.push(w.minWinRate);
  }

  const rows = getDb()
    .prepare(
      `SELECT d.id, d.source, d.source_id, d.archetype, d.deck_name, d.player_name,
              d.event_name, d.event_date, d.placement, d.wins, d.losses, d.draws, d.record
         FROM community_decks d
        WHERE ${clauses.join(' AND ')}
        ORDER BY d.event_date DESC NULLS LAST, d.id DESC
        LIMIT ?`
    )
    .all(...args, clampLimit(w.limit, 50)) as Array<Record<string, unknown>>;

  return rows.map(toSummary);
}

/** One full decklist, duplicate rows collapsed. */
export function getMetaDeck(id: number): MetaDeck | null {
  const db = getDb();
  const head = db
    .prepare(
      `SELECT id, source, source_id, archetype, deck_name, player_name, event_name,
              event_date, placement, wins, losses, draws, record
         FROM community_decks WHERE id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!head) return null;

  const rows = db
    .prepare(
      `SELECT card_name AS name,
              CASE WHEN board = 'main' THEN 'main' ELSE 'sideboard' END AS board,
              SUM(quantity) AS quantity
         FROM community_deck_cards
        WHERE community_deck_id = ?
        GROUP BY card_name, board
        ORDER BY quantity DESC, name ASC`
    )
    .all(id) as Array<{ name: string; board: string; quantity: number }>;

  const main = rows.filter((r) => r.board === 'main').map((r) => ({ name: r.name, quantity: r.quantity }));
  const sideboard = rows
    .filter((r) => r.board !== 'main')
    .map((r) => ({ name: r.name, quantity: r.quantity }));

  return {
    ...toSummary(head),
    main,
    sideboard,
    mainCount: main.reduce((n, c) => n + c.quantity, 0),
    sideboardCount: sideboard.reduce((n, c) => n + c.quantity, 0),
  };
}

/**
 * Per-source coverage, so a caller can see which slice of the corpus is worth
 * trusting before it ranks anything.
 */
export function getCorpusFreshness(format: string): SourceFreshness[] {
  const rows = getDb()
    .prepare(
      `SELECT source,
              COUNT(*) AS decks,
              SUM(CASE WHEN event_date IS NOT NULL THEN 1 ELSE 0 END) AS withDate,
              SUM(CASE WHEN wins IS NOT NULL AND losses IS NOT NULL THEN 1 ELSE 0 END) AS withRecord,
              MIN(event_date) AS oldestEvent,
              MAX(event_date) AS newestEvent
         FROM community_decks
        WHERE format = ?
        GROUP BY source
        ORDER BY decks DESC`
    )
    .all(format) as Array<SourceFreshness>;
  return rows;
}
