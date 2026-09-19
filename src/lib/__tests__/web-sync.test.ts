import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MIGRATIONS } from '@/db/schema';

// getDb must be mocked before importing the module under test (same pattern as
// src/lib/__tests__/sideboard-guide.test.ts) — real migrations run against an
// in-memory DB so migration 45 (web_synced_at / web_sync_error) is exercised for real.
let testDb: Database.Database;
vi.mock('@/lib/db', () => ({ getDb: () => testDb }));

import {
  toSyncPayload,
  computePlayedAt,
  getWebSyncConfig,
  isWebSyncConfigured,
  setWebSyncSettings,
  syncPendingMatches,
  testWebSync,
  type ArenaMatchSyncRow,
} from '../web-sync';

function setupTestDb() {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  for (const migration of MIGRATIONS) {
    testDb.transaction(() => {
      testDb.exec(migration.sql);
      testDb.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(
        migration.version,
        migration.name
      );
    })();
  }
}

type MatchOverrides = Partial<{
  match_id: string;
  result: string | null;
  deck_id: number | null;
  web_sync_error: string | null;
  match_end_time: string | null;
  match_start_time: string | null;
  parsed_at: string;
}>;

let seq = 0;
function insertMatch(overrides: MatchOverrides = {}): string {
  const row = { match_id: `m-${++seq}`, ...overrides };
  const cols = Object.keys(row);
  testDb
    .prepare(`INSERT INTO arena_parsed_matches (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    .run(...cols.map((c) => (row as Record<string, unknown>)[c]));
  return row.match_id;
}

function getRow(matchId: string): Record<string, unknown> {
  return testDb.prepare('SELECT * FROM arena_parsed_matches WHERE match_id = ?').get(matchId) as Record<
    string,
    unknown
  >;
}

function fetchOk(body: Record<string, unknown>) {
  return vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => body }));
}

function fetchFail(status: number, body: Record<string, unknown>) {
  return vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: false, status, json: async () => body }));
}

describe('web-sync', () => {
  beforeEach(() => {
    setupTestDb();
  });

  afterEach(() => {
    if (testDb) testDb.close();
    vi.restoreAllMocks();
  });

  describe('toSyncPayload', () => {
    const base: ArenaMatchSyncRow = {
      match_id: 'm1',
      player_name: 'QuLeR',
      opponent_name: 'Bob',
      result: 'win',
      format: 'brawl',
      format_normalized: 'Historic Brawl',
      turns: 8,
      mulligan_count: 1,
      on_play: 1,
      match_start_time: null,
      match_end_time: '2026-09-19T10:00:00.000Z',
      player_seat: 1,
      winner_seat: 1,
      duration_seconds: 600,
      player_screen_name: 'QuLeR#1234',
      player_commander: 'Kuja',
      parsed_at: '2026-09-19 09:00:00',
      deck_name: null,
    };

    it('normalizes known result strings', () => {
      expect(toSyncPayload({ ...base, result: 'win' }).result).toBe('win');
      expect(toSyncPayload({ ...base, result: 'loss' }).result).toBe('loss');
      expect(toSyncPayload({ ...base, result: 'draw' }).result).toBe('draw');
    });

    it('is case-insensitive on result', () => {
      expect(toSyncPayload({ ...base, result: 'WIN' }).result).toBe('win');
    });

    it('normalizes unknown, null and empty results to unknown', () => {
      expect(toSyncPayload({ ...base, result: 'concede' }).result).toBe('unknown');
      expect(toSyncPayload({ ...base, result: null }).result).toBe('unknown');
      expect(toSyncPayload({ ...base, result: '' }).result).toBe('unknown');
    });

    it('prefers match_end_time for playedAt', () => {
      expect(toSyncPayload(base).playedAt).toBe('2026-09-19T10:00:00.000Z');
    });

    it('falls back to match_start_time when match_end_time is missing', () => {
      const row = { ...base, match_end_time: null, match_start_time: '2026-09-19T09:30:00.000Z' };
      expect(toSyncPayload(row).playedAt).toBe('2026-09-19T09:30:00.000Z');
    });

    it('falls back to parsed_at, converted from sqlite format, when both times are missing', () => {
      const row = { ...base, match_end_time: null, match_start_time: null, parsed_at: '2026-09-19 09:00:00' };
      // toIso re-serializes via Date#toISOString(), which always emits milliseconds —
      // canonical form, not the merely-string-patched 'Z'-suffixed input.
      expect(toSyncPayload(row).playedAt).toBe('2026-09-19T09:00:00.000Z');
    });

    it('skips an unparseable playedAt source instead of shipping Invalid Date', () => {
      // Source columns are plain TEXT with no format check — garbage like "N/A" would
      // otherwise string-patch straight through to "N/AZ", which the server 422s on.
      const row = { ...base, match_end_time: 'N/A', match_start_time: '2026-09-19T09:30:00.000Z' };
      expect(toSyncPayload(row).playedAt).toBe('2026-09-19T09:30:00.000Z');
      expect(Number.isNaN(new Date(toSyncPayload(row).playedAt).getTime())).toBe(false);
    });

    it('falls back to the current time when every source is unparseable', () => {
      const row = { ...base, match_end_time: 'not-a-date', match_start_time: null, parsed_at: 'garbage' };
      const payload = toSyncPayload(row);
      expect(Number.isNaN(new Date(payload.playedAt).getTime())).toBe(false);
    });

    it('maps on_play 0/1/null to boolean/null', () => {
      expect(toSyncPayload({ ...base, on_play: 1 }).onPlay).toBe(true);
      expect(toSyncPayload({ ...base, on_play: 0 }).onPlay).toBe(false);
      expect(toSyncPayload({ ...base, on_play: null }).onPlay).toBeNull();
    });

    it('prefers the joined deck_name, then player_commander, then null', () => {
      expect(toSyncPayload({ ...base, deck_name: 'My Deck' }).deckName).toBe('My Deck');
      expect(toSyncPayload({ ...base, deck_name: null }).deckName).toBe('Kuja');
      expect(toSyncPayload({ ...base, deck_name: null, player_commander: null }).deckName).toBeNull();
    });

    it('prefers player_screen_name over player_name', () => {
      expect(toSyncPayload(base).playerName).toBe('QuLeR#1234');
      expect(toSyncPayload({ ...base, player_screen_name: null }).playerName).toBe('QuLeR');
    });

    it('passes opponentName through directly', () => {
      expect(toSyncPayload(base).opponentName).toBe('Bob');
      expect(toSyncPayload({ ...base, opponent_name: null }).opponentName).toBeNull();
    });

    it('never includes blob or raw column names', () => {
      const payload = toSyncPayload(base) as unknown as Record<string, unknown>;
      expect(Object.keys(payload).sort()).toEqual(
        [
          'deckName', 'durationSec', 'format', 'matchId', 'mulligans', 'onPlay', 'opponentName',
          'playedAt', 'playerName', 'playerSeat', 'result', 'turns', 'winnerSeat',
        ].sort()
      );
    });
  });

  describe('computePlayedAt', () => {
    it('converts a plain sqlite datetime to canonical ISO (with milliseconds)', () => {
      expect(
        computePlayedAt({ match_end_time: '2026-09-19 10:00:00', match_start_time: null, parsed_at: '2026-09-19 09:00:00' })
      ).toBe('2026-09-19T10:00:00.000Z');
    });

    it('falls back to a valid match_start_time when match_end_time does not parse', () => {
      expect(
        computePlayedAt({ match_end_time: 'not-a-date', match_start_time: '2026-09-19 09:30:00', parsed_at: '2026-09-19 09:00:00' })
      ).toBe('2026-09-19T09:30:00.000Z');
    });

    it('returns null when every source is unparseable', () => {
      expect(
        computePlayedAt({ match_end_time: 'not-a-date', match_start_time: 'N/A', parsed_at: 'garbage' })
      ).toBeNull();
    });
  });

  describe('getWebSyncConfig / isWebSyncConfigured', () => {
    it('defaults to theblackgrimoire.com when unset', () => {
      expect(getWebSyncConfig()).toEqual({ url: 'https://theblackgrimoire.com', token: null });
    });

    it('strips a trailing slash from a saved URL', () => {
      setWebSyncSettings({ url: 'https://example.com/' });
      expect(getWebSyncConfig().url).toBe('https://example.com');
    });

    it('is not configured until a token is saved', () => {
      expect(isWebSyncConfigured()).toBe(false);
      setWebSyncSettings({ token: 'abc123' });
      expect(isWebSyncConfigured()).toBe(true);
    });

    it('ignores an empty/whitespace token (no accidental clear)', () => {
      setWebSyncSettings({ token: 'abc123' });
      setWebSyncSettings({ token: '   ' });
      expect(getWebSyncConfig().token).toBe('abc123');
    });
  });

  describe('syncPendingMatches', () => {
    it('does not fetch when not configured', async () => {
      insertMatch();
      const fetchImpl = vi.fn();
      const result = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, sent: 0, accepted: 0, duplicates: 0, rejected: 0, error: 'not configured' });
    });

    it('marks accepted/duplicate rows synced and records rejected reasons on 200', async () => {
      setWebSyncSettings({ token: 'tok' });
      const okId = insertMatch({ result: 'win' });
      const badId = insertMatch({ result: 'loss' });
      const fetchImpl = fetchOk({ accepted: 1, duplicates: 0, rejected: [{ matchId: badId, reason: 'bad data' }] });

      const result = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(result.ok).toBe(true);
      expect(result.sent).toBe(2);
      expect(result.accepted).toBe(1);
      expect(result.rejected).toBe(1);
      expect(getRow(okId).web_synced_at).not.toBeNull();
      expect(getRow(badId).web_synced_at).toBeNull();
      expect(getRow(badId).web_sync_error).toBe('bad data');
    });

    it('marks nothing and returns an error on 401', async () => {
      setWebSyncSettings({ token: 'tok' });
      const id = insertMatch();
      const fetchImpl = fetchFail(401, { error: 'invalid token' });

      const result = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid token');
      expect(result.sent).toBe(0);
      expect(getRow(id).web_synced_at).toBeNull();
    });

    it('marks every row of a 422 (whole-batch validation failure) so it is not retried forever', async () => {
      setWebSyncSettings({ token: 'tok' });
      const id1 = insertMatch();
      const id2 = insertMatch();
      const fetchImpl = fetchFail(422, { error: 'malformed row', field: 'matches[1].turns' });

      const result = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('malformed row');
      expect(result.sent).toBe(2);
      expect(result.rejected).toBe(2);
      expect(getRow(id1).web_synced_at).toBeNull();
      expect(getRow(id1).web_sync_error).toBe('malformed row');
      expect(getRow(id2).web_sync_error).toBe('malformed row');

      // A non-forced sync must not retry them (they'd 422 again); force does.
      const r2 = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(r2.sent).toBe(0);
      const r3 = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch, force: true });
      expect(r3.sent).toBe(2);
    });

    it('marks a row with no valid date and does not send it, while still sending other rows in the batch', async () => {
      setWebSyncSettings({ token: 'tok' });
      const badId = insertMatch({
        match_end_time: 'not-a-date',
        match_start_time: 'N/A',
        parsed_at: 'garbage',
      });
      const goodId = insertMatch();
      const fetchImpl = fetchOk({ accepted: 1, duplicates: 0, rejected: [] });

      const result = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const body = JSON.parse((fetchImpl.mock.calls[0][1] as { body: string }).body);
      expect(body.matches).toHaveLength(1);
      expect(body.matches[0].matchId).toBe(goodId);

      expect(result.sent).toBe(1);
      expect(result.rejected).toBe(1);
      expect(getRow(badId).web_synced_at).toBeNull();
      expect(getRow(badId).web_sync_error).toBe('no valid date');
      expect(getRow(goodId).web_synced_at).not.toBeNull();
    });

    it('marks nothing and returns an error when fetch throws (network failure)', async () => {
      setWebSyncSettings({ token: 'tok' });
      const id = insertMatch();
      const fetchImpl = vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      });

      const result = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
      expect(getRow(id).web_synced_at).toBeNull();
    });

    it('sends in batches of 200', async () => {
      setWebSyncSettings({ token: 'tok' });
      for (let i = 0; i < 250; i++) insertMatch();
      const fetchImpl = fetchOk({ accepted: 0, duplicates: 0, rejected: [] });

      const result = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(fetchImpl).toHaveBeenCalledTimes(2);
      const firstBody = JSON.parse((fetchImpl.mock.calls[0][1] as { body: string }).body);
      const secondBody = JSON.parse((fetchImpl.mock.calls[1][1] as { body: string }).body);
      expect(firstBody.matches).toHaveLength(200);
      expect(secondBody.matches).toHaveLength(50);
      expect(result.sent).toBe(250);
    });

    it('excludes previously-errored rows unless force is set', async () => {
      setWebSyncSettings({ token: 'tok' });
      const erroredId = insertMatch({ web_sync_error: 'bad data' });
      const fetchImpl = fetchOk({ accepted: 1, duplicates: 0, rejected: [] });

      const r1 = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(r1.sent).toBe(0);
      expect(fetchImpl).not.toHaveBeenCalled();

      const r2 = await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch, force: true });
      expect(r2.sent).toBe(1);
      expect(getRow(erroredId).web_synced_at).not.toBeNull();
    });

    it('sends the client app/version envelope', async () => {
      setWebSyncSettings({ token: 'tok' });
      insertMatch();
      const fetchImpl = fetchOk({ accepted: 1, duplicates: 0, rejected: [] });

      await syncPendingMatches({ fetchImpl: fetchImpl as unknown as typeof fetch });

      const body = JSON.parse((fetchImpl.mock.calls[0][1] as { body: string }).body);
      expect(body.client.app).toBe('the-black-grimoire');
      expect(typeof body.client.version).toBe('string');
      const headers = (fetchImpl.mock.calls[0][1] as { headers: Record<string, string> }).headers;
      expect(headers.Authorization).toBe('Bearer tok');
    });
  });

  describe('testWebSync', () => {
    it('returns ok plus userId/matches on success', async () => {
      setWebSyncSettings({ token: 'tok' });
      const fetchImpl = fetchOk({ ok: true, userId: 'user_123', matches: 42 });

      const result = await testWebSync({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(result).toEqual({ ok: true, userId: 'user_123', matches: 42 });
    });

    it('returns the server error on 401', async () => {
      setWebSyncSettings({ token: 'bad' });
      const fetchImpl = fetchFail(401, { error: 'invalid token' });

      const result = await testWebSync({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(result).toEqual({ ok: false, error: 'invalid token' });
    });

    it('returns an error when fetch throws', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new Error('offline');
      });

      const result = await testWebSync({ fetchImpl: fetchImpl as unknown as typeof fetch });

      expect(result).toEqual({ ok: false, error: 'offline' });
    });
  });
});
