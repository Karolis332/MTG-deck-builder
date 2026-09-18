/**
 * Deck ingest — the write half of the tournament corpus.
 *
 * Every scraper adapter hands raw decks to `upsertDecks`, which is the single
 * place that decides what a valid corpus row looks like. Two rules matter:
 *
 * - Duplicate card names are merged HERE, at the boundary. The existing corpus
 *   stores a single card as several rows per deck, which has silently corrupted
 *   land counts and copy counts twice; nothing ingested through this module can
 *   add more of them.
 * - (source, source_id) is the natural key, enforced by a unique index
 *   (migration 44), so re-running a scrape over the same event is a no-op.
 */
import { getDb } from './db';

export interface ScrapedCard {
  name: string;
  quantity: number;
}

export interface RawScrapedDeck {
  source: string;
  sourceId: string;
  format: string;
  archetype?: string | null;
  deckName?: string | null;
  playerName?: string | null;
  eventName?: string | null;
  eventDate?: string | null;
  placement?: number | null;
  record?: string | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  tournamentType?: string | null;
  main: ScrapedCard[];
  sideboard?: ScrapedCard[];
}

export interface NormalizedDeck {
  source: string;
  sourceId: string;
  format: string;
  archetype: string | null;
  deckName: string | null;
  playerName: string | null;
  eventName: string | null;
  eventDate: string | null;
  placement: number | null;
  record: string | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  tournamentType: string | null;
  main: ScrapedCard[];
  sideboard: ScrapedCard[];
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  newestEventDate: string | null;
  errors: Array<{ sourceId: string; error: string }>;
}

export interface IngestStatus {
  source: string;
  format: string | null;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  decksSeen: number;
  decksInserted: number;
  decksUpdated: number;
  decksSkipped: number;
  newestEventDate: string | null;
  error: string | null;
}

const MAX_CARD_NAME = 200;
const MAX_QTY = 99;
const MAX_TEXT = 300;
/** A Magic match record above this is a scrape error, not a result. */
const MAX_GAMES = 100;

/** "5-0" / "8-1-1" → counts. Anything ambiguous returns null rather than a guess. */
export function parseRecord(record: string | null | undefined): {
  wins: number;
  losses: number;
  draws: number;
} | null {
  if (typeof record !== 'string') return null;
  const parts = record.trim().split('-');
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map((p) => {
    const t = p.trim();
    return /^\d+$/.test(t) ? Number(t) : NaN;
  });
  if (nums.some((n) => !Number.isFinite(n))) return null;
  if (nums.some((n) => n > MAX_GAMES)) return null;

  return { wins: nums[0], losses: nums[1], draws: nums[2] ?? 0 };
}

function text(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** Accepts ISO dates and datetimes; anything else becomes null instead of a bad window key. */
function isoDate(value: unknown): string | null {
  const raw = text(value, 40);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Merge duplicate names (case-insensitively), clamp quantities, drop junk. */
function normalizeCards(cards: ScrapedCard[] | undefined): ScrapedCard[] {
  if (!Array.isArray(cards)) return [];
  const merged = new Map<string, ScrapedCard>();
  for (const card of cards) {
    // Reject over-long names rather than truncating: the longest real card name is
    // ~40 chars, so a 300-char string is a parse error. Truncating would mint a
    // card name that never resolves and quietly pollute the corpus.
    const name = typeof card?.name === 'string' ? card.name.trim() : '';
    if (!name || name.length > MAX_CARD_NAME) continue;
    const qty = Math.floor(Number(card?.quantity));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const key = name.toLowerCase();
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(MAX_QTY, existing.quantity + qty);
    } else {
      merged.set(key, { name, quantity: Math.min(MAX_QTY, qty) });
    }
  }
  return [...merged.values()];
}

function intOrNull(value: unknown): number | null {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate and canonicalize one scraped deck.
 * Returns `{ error }` instead of throwing so one bad deck cannot abort a batch.
 */
export function normalizeDeck(raw: RawScrapedDeck): NormalizedDeck | { error: string } {
  const source = text(raw?.source, 40);
  const sourceId = text(raw?.sourceId, 200);
  const format = text(raw?.format, 40)?.toLowerCase();
  if (!source) return { error: 'source is required' };
  if (!sourceId) return { error: 'sourceId is required' };
  if (!format) return { error: 'format is required' };

  const main = normalizeCards(raw.main);
  if (!main.length) return { error: 'main deck is empty' };

  const fromRecord = parseRecord(raw.record);
  const wins = raw.wins != null ? intOrNull(raw.wins) : (fromRecord?.wins ?? null);
  const losses = raw.losses != null ? intOrNull(raw.losses) : (fromRecord?.losses ?? null);
  const draws = raw.draws != null ? intOrNull(raw.draws) : (fromRecord?.draws ?? null);

  return {
    source,
    sourceId,
    format,
    archetype: text(raw.archetype, 120),
    deckName: text(raw.deckName),
    playerName: text(raw.playerName, 120),
    eventName: text(raw.eventName),
    eventDate: isoDate(raw.eventDate),
    placement: raw.placement != null ? intOrNull(raw.placement) : null,
    record: text(raw.record, 20),
    wins,
    losses,
    draws,
    tournamentType: text(raw.tournamentType, 40),
    main,
    sideboard: normalizeCards(raw.sideboard),
  };
}

/**
 * Insert or refresh a batch of scraped decks. Idempotent on (source, source_id):
 * a second run over the same event updates the row and rewrites its cards.
 */
export function upsertDecks(decks: RawScrapedDeck[]): UpsertResult {
  const db = getDb();
  const result: UpsertResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    newestEventDate: null,
    errors: [],
  };

  const findExisting = db.prepare('SELECT id FROM community_decks WHERE source = ? AND source_id = ?');
  const insertDeck = db.prepare(
    `INSERT INTO community_decks
       (source, source_id, format, archetype, deck_name, placement, event_name, event_date,
        scraped_at, wins, losses, draws, record, tournament_type, player_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const updateDeck = db.prepare(
    `UPDATE community_decks
        SET format = ?, archetype = ?, deck_name = ?, placement = ?, event_name = ?,
            event_date = ?, scraped_at = ?, wins = ?, losses = ?, draws = ?, record = ?,
            tournament_type = ?, player_name = ?
      WHERE id = ?`
  );
  const deleteCards = db.prepare('DELETE FROM community_deck_cards WHERE community_deck_id = ?');
  const insertCard = db.prepare(
    'INSERT INTO community_deck_cards (community_deck_id, card_name, quantity, board) VALUES (?, ?, ?, ?)'
  );

  const writeOne = db.transaction((deck: NormalizedDeck) => {
    const scrapedAt = new Date().toISOString();
    const existing = findExisting.get(deck.source, deck.sourceId) as { id: number } | undefined;

    let deckId: number;
    if (existing) {
      updateDeck.run(
        deck.format, deck.archetype, deck.deckName, deck.placement, deck.eventName,
        deck.eventDate, scrapedAt, deck.wins, deck.losses, deck.draws, deck.record,
        deck.tournamentType, deck.playerName, existing.id
      );
      deckId = existing.id;
      result.updated++;
    } else {
      const info = insertDeck.run(
        deck.source, deck.sourceId, deck.format, deck.archetype, deck.deckName,
        deck.placement, deck.eventName, deck.eventDate, scrapedAt, deck.wins,
        deck.losses, deck.draws, deck.record, deck.tournamentType, deck.playerName
      );
      deckId = Number(info.lastInsertRowid);
      result.inserted++;
    }

    // Rewrite rather than merge: the scrape is the source of truth for the list.
    deleteCards.run(deckId);
    for (const card of deck.main) insertCard.run(deckId, card.name, card.quantity, 'main');
    for (const card of deck.sideboard) insertCard.run(deckId, card.name, card.quantity, 'sideboard');
  });

  for (const rawDeck of decks) {
    const normalized = normalizeDeck(rawDeck);
    if ('error' in normalized) {
      result.skipped++;
      result.errors.push({ sourceId: String(rawDeck?.sourceId ?? '?'), error: normalized.error });
      continue;
    }
    try {
      writeOne(normalized);
      if (normalized.eventDate && (!result.newestEventDate || normalized.eventDate > result.newestEventDate)) {
        result.newestEventDate = normalized.eventDate;
      }
    } catch (error) {
      result.skipped++;
      result.errors.push({
        sourceId: normalized.sourceId,
        error: error instanceof Error ? error.message : 'write failed',
      });
    }
  }

  return result;
}

/** Open a run-log row. Pair with finishIngestRun so a crashed run stays visible as 'running'. */
export function startIngestRun(source: string, format: string): number {
  const info = getDb()
    .prepare(
      `INSERT INTO ingest_runs (source, format, started_at, status) VALUES (?, ?, ?, 'running')`
    )
    .run(source, format, new Date().toISOString());
  return Number(info.lastInsertRowid);
}

export function finishIngestRun(
  runId: number,
  outcome: {
    status: 'ok' | 'partial' | 'failed';
    seen?: number;
    inserted?: number;
    updated?: number;
    skipped?: number;
    newestEventDate?: string | null;
    error?: string | null;
  }
): void {
  getDb()
    .prepare(
      `UPDATE ingest_runs
          SET finished_at = ?, status = ?, decks_seen = ?, decks_inserted = ?,
              decks_updated = ?, decks_skipped = ?, newest_event_date = ?, error = ?
        WHERE id = ?`
    )
    .run(
      new Date().toISOString(),
      outcome.status,
      outcome.seen ?? 0,
      outcome.inserted ?? 0,
      outcome.updated ?? 0,
      outcome.skipped ?? 0,
      outcome.newestEventDate ?? null,
      outcome.error ? String(outcome.error).slice(0, MAX_TEXT) : null,
      runId
    );
}

/** Newest run per source — what /ingest/status serves. */
export function getIngestStatus(): IngestStatus[] {
  const rows = getDb()
    .prepare(
      `SELECT r.source, r.format, r.started_at, r.finished_at, r.status, r.decks_seen,
              r.decks_inserted, r.decks_updated, r.decks_skipped, r.newest_event_date, r.error
         FROM ingest_runs r
         JOIN (SELECT source, MAX(id) AS id FROM ingest_runs GROUP BY source) latest
           ON latest.id = r.id
        ORDER BY r.started_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    source: r.source as string,
    format: (r.format as string) ?? null,
    startedAt: r.started_at as string,
    finishedAt: (r.finished_at as string) ?? null,
    status: r.status as string,
    decksSeen: r.decks_seen as number,
    decksInserted: r.decks_inserted as number,
    decksUpdated: r.decks_updated as number,
    decksSkipped: r.decks_skipped as number,
    newestEventDate: (r.newest_event_date as string) ?? null,
    error: (r.error as string) ?? null,
  }));
}
