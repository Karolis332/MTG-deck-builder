import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

let testDb: Database.Database;
vi.mock('@/lib/db', () => ({ getDb: () => testDb }));
vi.mock('../db', () => ({ getDb: () => testDb }));

import {
  parseRecord,
  normalizeDeck,
  upsertDecks,
  startIngestRun,
  finishIngestRun,
  getIngestStatus,
  type RawScrapedDeck,
} from '../deck-ingest';

function raw(over: Partial<RawScrapedDeck> = {}): RawScrapedDeck {
  return {
    source: 'mtgo',
    sourceId: 'league-1',
    format: 'standard',
    archetype: 'Izzet',
    eventDate: '2026-09-08',
    record: '5-0',
    main: [
      { name: 'Opt', quantity: 4 },
      { name: 'Island', quantity: 20 },
    ],
    sideboard: [{ name: 'Negate', quantity: 2 }],
    ...over,
  };
}

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.exec(`
    CREATE TABLE community_decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT, source_id TEXT, format TEXT,
      archetype TEXT, deck_name TEXT, placement INTEGER, meta_share REAL, event_name TEXT,
      event_date TEXT, scraped_at TEXT, wins INTEGER, losses INTEGER, draws INTEGER,
      record TEXT, tournament_type TEXT, player_name TEXT);
    CREATE UNIQUE INDEX idx_community_decks_source_key ON community_decks(source, source_id);
    CREATE TABLE community_deck_cards (
      community_deck_id INTEGER, card_name TEXT, quantity INTEGER, board TEXT);
    CREATE TABLE ingest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, format TEXT,
      started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL DEFAULT 'running',
      decks_seen INTEGER NOT NULL DEFAULT 0, decks_inserted INTEGER NOT NULL DEFAULT 0,
      decks_updated INTEGER NOT NULL DEFAULT 0, decks_skipped INTEGER NOT NULL DEFAULT 0,
      newest_event_date TEXT, error TEXT);
  `);
});

describe('parseRecord', () => {
  it('parses wins-losses and wins-losses-draws', () => {
    expect(parseRecord('5-0')).toEqual({ wins: 5, losses: 0, draws: 0 });
    expect(parseRecord('8-1-1')).toEqual({ wins: 8, losses: 1, draws: 1 });
    expect(parseRecord(' 6 - 2 ')).toEqual({ wins: 6, losses: 2, draws: 0 });
  });

  it('returns null for anything it cannot trust', () => {
    for (const bad of ['', 'n/a', '5', 'abc-def', '1-2-3-4', null, undefined]) {
      expect(parseRecord(bad as string)).toBeNull();
    }
  });

  it('rejects implausible records rather than storing nonsense', () => {
    expect(parseRecord('999-0')).toBeNull();
    expect(parseRecord('-1-2')).toBeNull();
  });
});

describe('normalizeDeck', () => {
  it('merges duplicate card names instead of emitting two rows', () => {
    // This is the corpus bug fixed at the boundary: 3 + 1 Opt is a 4-of.
    const deck = normalizeDeck(
      raw({ main: [{ name: 'Opt', quantity: 3 }, { name: 'Opt', quantity: 1 }, { name: 'Island', quantity: 20 }] })
    );

    expect('error' in deck).toBe(false);
    if ('error' in deck) return;
    expect(deck.main).toEqual([
      { name: 'Opt', quantity: 4 },
      { name: 'Island', quantity: 20 },
    ]);
  });

  it('merges case-insensitively and trims whitespace', () => {
    const deck = normalizeDeck(
      raw({ main: [{ name: ' Opt ', quantity: 2 }, { name: 'opt', quantity: 2 }, { name: 'Island', quantity: 20 }] })
    );
    if ('error' in deck) throw new Error(deck.error);
    expect(deck.main.find((c) => c.name.toLowerCase() === 'opt')!.quantity).toBe(4);
  });

  it('derives wins/losses from the record string when they are absent', () => {
    const deck = normalizeDeck(raw({ record: '5-0', wins: undefined, losses: undefined }));
    if ('error' in deck) throw new Error(deck.error);
    expect(deck.wins).toBe(5);
    expect(deck.losses).toBe(0);
  });

  it('prefers explicit wins/losses over the record string', () => {
    const deck = normalizeDeck(raw({ record: '5-0', wins: 3, losses: 2 }));
    if ('error' in deck) throw new Error(deck.error);
    expect(deck.wins).toBe(3);
    expect(deck.losses).toBe(2);
  });

  it('normalizes dates to YYYY-MM-DD and drops unparseable ones', () => {
    expect((normalizeDeck(raw({ eventDate: '2026-09-08T13:00:00Z' })) as { eventDate: string }).eventDate).toBe('2026-09-08');
    expect((normalizeDeck(raw({ eventDate: 'sometime' })) as { eventDate: string | null }).eventDate).toBeNull();
    expect((normalizeDeck(raw({ eventDate: null })) as { eventDate: string | null }).eventDate).toBeNull();
  });

  it('rejects decks missing the identity fields or a main deck', () => {
    expect(normalizeDeck(raw({ sourceId: '' }))).toHaveProperty('error');
    expect(normalizeDeck(raw({ source: '' }))).toHaveProperty('error');
    expect(normalizeDeck(raw({ main: [] }))).toHaveProperty('error');
    expect(normalizeDeck(raw({ format: '' }))).toHaveProperty('error');
  });

  it('clamps quantities and drops junk card names', () => {
    const deck = normalizeDeck(
      raw({
        main: [
          { name: 'Opt', quantity: 999 },
          { name: '', quantity: 4 },
          { name: 'x'.repeat(300), quantity: 4 },
          { name: 'Island', quantity: 0 },
          { name: 'Sear', quantity: 2 },
        ],
      })
    );
    if ('error' in deck) throw new Error(deck.error);
    expect(deck.main.find((c) => c.name === 'Opt')!.quantity).toBe(99);
    expect(deck.main.map((c) => c.name)).toEqual(['Opt', 'Sear']);
  });

  it('lowercases the format so windows match regardless of scraper casing', () => {
    const deck = normalizeDeck(raw({ format: 'Standard' }));
    if ('error' in deck) throw new Error(deck.error);
    expect(deck.format).toBe('standard');
  });
});

describe('upsertDecks', () => {
  it('inserts a new deck with its cards', () => {
    const result = upsertDecks([raw()]);

    expect(result).toMatchObject({ inserted: 1, updated: 0, skipped: 0 });
    const row = testDb.prepare('SELECT * FROM community_decks').get() as Record<string, unknown>;
    expect(row.source_id).toBe('league-1');
    expect(row.wins).toBe(5);
    const cards = testDb.prepare('SELECT card_name, quantity, board FROM community_deck_cards ORDER BY board, card_name').all();
    expect(cards).toHaveLength(3);
  });

  it('is idempotent — re-ingesting the same event changes nothing', () => {
    upsertDecks([raw()]);
    const second = upsertDecks([raw()]);

    expect(second).toMatchObject({ inserted: 0, updated: 1 });
    expect((testDb.prepare('SELECT COUNT(*) n FROM community_decks').get() as { n: number }).n).toBe(1);
    expect((testDb.prepare('SELECT COUNT(*) n FROM community_deck_cards').get() as { n: number }).n).toBe(3);
  });

  it('replaces the card list on update rather than appending duplicates', () => {
    upsertDecks([raw()]);
    upsertDecks([raw({ main: [{ name: 'Consider', quantity: 4 }], sideboard: [] })]);

    const cards = testDb.prepare('SELECT card_name FROM community_deck_cards').all() as Array<{ card_name: string }>;
    expect(cards.map((c) => c.card_name)).toEqual(['Consider']);
  });

  it('counts invalid decks as skipped without aborting the batch', () => {
    const result = upsertDecks([raw({ sourceId: 'ok-1' }), raw({ sourceId: '' }), raw({ sourceId: 'ok-2' })]);

    expect(result.inserted).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('keeps two sources with the same source_id apart', () => {
    upsertDecks([raw({ source: 'mtgo', sourceId: 'x' }), raw({ source: 'mtgtop8', sourceId: 'x' })]);
    expect((testDb.prepare('SELECT COUNT(*) n FROM community_decks').get() as { n: number }).n).toBe(2);
  });
});

describe('ingest run log', () => {
  it('records a run from start to finish and reports it as status', () => {
    const runId = startIngestRun('mtgo', 'standard');
    finishIngestRun(runId, {
      status: 'ok',
      seen: 10,
      inserted: 8,
      updated: 2,
      skipped: 0,
      newestEventDate: '2026-09-08',
    });

    const status = getIngestStatus();
    expect(status).toHaveLength(1);
    expect(status[0]).toMatchObject({
      source: 'mtgo',
      status: 'ok',
      decksInserted: 8,
      newestEventDate: '2026-09-08',
    });
    expect(status[0].finishedAt).toBeTruthy();
  });

  it('records a failure with its message so a broken source is visible', () => {
    const runId = startIngestRun('mtggoldfish', 'standard');
    finishIngestRun(runId, { status: 'failed', error: 'HTTP 403 (Cloudflare)' });

    const [status] = getIngestStatus();
    expect(status.status).toBe('failed');
    expect(status.error).toContain('403');
  });

  it('returns only the newest run per source', () => {
    finishIngestRun(startIngestRun('mtgo', 'standard'), { status: 'ok', inserted: 1 });
    finishIngestRun(startIngestRun('mtgo', 'standard'), { status: 'ok', inserted: 5 });

    const status = getIngestStatus();
    expect(status).toHaveLength(1);
    expect(status[0].decksInserted).toBe(5);
  });
});
