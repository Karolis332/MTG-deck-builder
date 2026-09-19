/**
 * Desktop -> web match sync (match-sync-contract-2026-09-19.md).
 *
 * Posts locally recorded Arena matches to theblackgrimoire.com so the web
 * dashboard can show them. Pure logic + an injectable `fetchImpl` so it's
 * testable without a network. Never throws — every path returns a result
 * object; callers (the arena-matches route, the app-start hook, the
 * settings dialog) treat sync as best-effort and never block on it.
 */

import { getDb } from '@/lib/db';
import { APP_VERSION } from '@/lib/app-version';

const DEFAULT_WEB_SYNC_URL = 'https://theblackgrimoire.com';
const SYNC_BATCH_SIZE = 200;
const REQUEST_TIMEOUT_MS = 10_000;

// ── app_state helpers (same key-value pattern as sync-commander-stats.ts) ──

function getAppStateValue(key: string): string | null {
  try {
    const row = getDb().prepare('SELECT value FROM app_state WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function setAppStateValue(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

// ── Config ──────────────────────────────────────────────────────────────

export interface WebSyncConfig {
  url: string;
  token: string | null;
}

/**
 * Reads web_sync_url / web_sync_token directly (raw app_state keys owned by this
 * module). Deliberately NOT routed through PUT /api/settings: that route always
 * stores under a `setting_` prefix and its GET returns full values for any key
 * whose name doesn't contain "api_key" — it would echo the bearer token back to
 * the renderer in plaintext. See desktop-builder-report.md for the full reasoning.
 */
export function getWebSyncConfig(): WebSyncConfig {
  const rawUrl = getAppStateValue('web_sync_url');
  const url = (rawUrl && rawUrl.trim() ? rawUrl.trim() : DEFAULT_WEB_SYNC_URL).replace(/\/+$/, '');
  return { url, token: getAppStateValue('web_sync_token') };
}

export function isWebSyncConfigured(): boolean {
  return !!getWebSyncConfig().token;
}

const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** CSRF guard, layer 2 (route.ts enforces layer 1: Content-Type). True when nothing about
 *  the request's Origin / Fetch Metadata headers indicates it came from another site.
 *  Header absence passes both checks — Node's http.request (electron/ipc-handlers.ts
 *  postToApi, the cookie-less app-start `sync` call) never sends either one, only
 *  browsers do. Lives here rather than in route.ts because Next's route-export checker
 *  rejects any export from a route module besides the HTTP methods and segment config. */
export function isSameOriginRequest(headers: { get(name: string): string | null }): boolean {
  const origin = headers.get('origin');
  if (origin && !LOCAL_ORIGIN_RE.test(origin)) return false;
  if (headers.get('sec-fetch-site') === 'cross-site') return false;
  return true;
}

/** Persists url/token. Empty/whitespace values are ignored (no accidental clears). */
export function setWebSyncSettings(input: { url?: string; token?: string }): void {
  if (input.url !== undefined) {
    const trimmed = input.url.trim().replace(/\/+$/, '');
    if (trimmed) setAppStateValue('web_sync_url', trimmed);
  }
  if (input.token !== undefined) {
    const trimmed = input.token.trim();
    if (trimmed) setAppStateValue('web_sync_token', trimmed);
  }
}

export function getWebSyncStatus(): {
  configured: boolean;
  url: string;
  lastAt: string | null;
  lastResult: string | null;
} {
  const { url, token } = getWebSyncConfig();
  return {
    configured: !!token,
    url,
    lastAt: getAppStateValue('web_sync_last_at'),
    lastResult: getAppStateValue('web_sync_last_result'),
  };
}

// ── Row -> contract payload ─────────────────────────────────────────────

/** Only the non-blob columns the contract needs — raw_events/deck_cards/etc. never selected. */
export interface ArenaMatchSyncRow {
  match_id: string;
  player_name: string | null;
  opponent_name: string | null;
  result: string | null;
  format: string | null;
  format_normalized: string | null;
  turns: number | null;
  mulligan_count: number | null;
  on_play: number | null;
  match_start_time: string | null;
  match_end_time: string | null;
  player_seat: number | null;
  winner_seat: number | null;
  duration_seconds: number | null;
  player_screen_name: string | null;
  player_commander: string | null;
  parsed_at: string;
  deck_name: string | null;
}

export type SyncResultCode = 'win' | 'loss' | 'draw' | 'unknown';

export interface SyncPayloadMatch {
  matchId: string;
  playedAt: string;
  format: string | null;
  deckName: string | null;
  playerName: string | null;
  opponentName: string | null;
  result: SyncResultCode;
  turns: number | null;
  playerSeat: number | null;
  winnerSeat: number | null;
  durationSec: number | null;
  onPlay: boolean | null;
  mulligans: number | null;
}

/** SQLite `datetime('now')` yields 'YYYY-MM-DD HH:MM:SS' (UTC, no separator/zone).
 *  Values written by match-telemetry.ts are already full ISO strings (they contain 'T').
 *  The source columns are plain TEXT with no format check, so garbage (e.g. "N/A") can
 *  reach here — validate the result actually parses instead of shipping "N/AZ" (Invalid
 *  Date) to a server that 422s the whole batch on one bad row; null lets the caller's
 *  fallback chain try the next column instead. */
function toIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const patched = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(patched);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeResult(raw: string | null | undefined): SyncResultCode {
  const v = (raw ?? '').trim().toLowerCase();
  return v === 'win' || v === 'loss' || v === 'draw' ? v : 'unknown';
}

/** Server rejects a whole batch on a malformed row — never forward a non-finite number. */
function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const MAX_MATCH_ID_LEN = 128;

/** Null when `matchId` is contract-valid (non-empty, <= 128 chars); otherwise the reason
 *  to record on the row so a non-forced sync stops retrying it. */
export function invalidMatchIdReason(matchId: string | null | undefined): string | null {
  if (!matchId || matchId.trim().length === 0) return 'no match_id';
  if (matchId.length > MAX_MATCH_ID_LEN) return 'match_id too long';
  return null;
}

/** First parseable timestamp in the fallback chain, or null if none of match_end_time /
 *  match_start_time / parsed_at parse. Shared by toSyncPayload (always needs *a* value)
 *  and the pre-send filter in syncPendingMatches (needs to know when there isn't one, so
 *  the row is skipped and marked instead of sent with a fabricated time). */
export function computePlayedAt(
  row: Pick<ArenaMatchSyncRow, 'match_end_time' | 'match_start_time' | 'parsed_at'>
): string | null {
  return toIso(row.match_end_time) ?? toIso(row.match_start_time) ?? toIso(row.parsed_at) ?? null;
}

export function toSyncPayload(row: ArenaMatchSyncRow): SyncPayloadMatch {
  return {
    matchId: row.match_id,
    // The real pipeline never reaches this fallback (syncPendingMatches filters out
    // rows with no valid date before calling this) — kept so the function stays total
    // for direct/unit-test callers.
    playedAt: computePlayedAt(row) ?? new Date().toISOString(),
    format: row.format_normalized || row.format || null,
    deckName: row.deck_name ?? row.player_commander ?? null,
    playerName: row.player_screen_name || row.player_name || null,
    opponentName: row.opponent_name ?? null,
    result: normalizeResult(row.result),
    turns: toIntOrNull(row.turns),
    playerSeat: toIntOrNull(row.player_seat),
    winnerSeat: toIntOrNull(row.winner_seat),
    durationSec: toIntOrNull(row.duration_seconds),
    onPlay: row.on_play === null || row.on_play === undefined ? null : row.on_play !== 0,
    mulligans: toIntOrNull(row.mulligan_count),
  };
}

// ── Pending-row queries ─────────────────────────────────────────────────

const PENDING_COLUMNS = `
  apm.match_id, apm.player_name, apm.opponent_name, apm.result, apm.format, apm.format_normalized,
  apm.turns, apm.mulligan_count, apm.on_play, apm.match_start_time, apm.match_end_time,
  apm.player_seat, apm.winner_seat, apm.duration_seconds, apm.player_screen_name,
  apm.player_commander, apm.parsed_at, d.name AS deck_name
`;

function getPendingRows(force: boolean): ArenaMatchSyncRow[] {
  const where = force
    ? 'apm.web_synced_at IS NULL'
    : 'apm.web_synced_at IS NULL AND apm.web_sync_error IS NULL';
  return getDb()
    .prepare(
      `SELECT ${PENDING_COLUMNS}
       FROM arena_parsed_matches apm
       LEFT JOIN decks d ON d.id = apm.deck_id
       WHERE ${where}
       ORDER BY apm.id ASC`
    )
    .all() as ArenaMatchSyncRow[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function markSynced(matchIds: string[]): void {
  if (matchIds.length === 0) return;
  const now = new Date().toISOString();
  const stmt = getDb().prepare(
    'UPDATE arena_parsed_matches SET web_synced_at = ?, web_sync_error = NULL WHERE match_id = ?'
  );
  getDb().transaction((ids: string[]) => {
    for (const id of ids) stmt.run(now, id);
  })(matchIds);
}

function markRejected(rejections: Array<{ matchId: string; reason: string }>): void {
  if (rejections.length === 0) return;
  const stmt = getDb().prepare('UPDATE arena_parsed_matches SET web_sync_error = ? WHERE match_id = ?');
  getDb().transaction((items: typeof rejections) => {
    for (const r of items) stmt.run(String(r.reason).slice(0, 500), r.matchId);
  })(rejections);
}

function isRejectedEntry(r: unknown): r is { matchId: string; reason: string } {
  return !!r && typeof r === 'object' && typeof (r as { matchId?: unknown }).matchId === 'string';
}

// ── Sync ────────────────────────────────────────────────────────────────

export interface SyncResult {
  ok: boolean;
  sent: number;
  accepted: number;
  duplicates: number;
  rejected: number;
  error?: string;
}

export async function syncPendingMatches(
  opts: { fetchImpl?: typeof fetch; force?: boolean } = {}
): Promise<SyncResult> {
  const totals = { sent: 0, accepted: 0, duplicates: 0, rejected: 0 };
  let lastError: string | undefined;

  try {
    const fetchImpl = opts.fetchImpl ?? fetch;
    const { url, token } = getWebSyncConfig();

    if (!token) {
      return { ok: false, ...totals, error: 'not configured' };
    }

    const allRows = getPendingRows(!!opts.force);

    // The server validates a batch all-or-nothing (one malformed row 422s the whole
    // POST) — never let a known-bad matchId or an unparseable date poison an otherwise-
    // good batch. Reject those client-side up front so they can't block their batch-mates.
    const rows: ArenaMatchSyncRow[] = [];
    const preRejected: Array<{ matchId: string; reason: string }> = [];
    for (const row of allRows) {
      const reason = invalidMatchIdReason(row.match_id) ?? (computePlayedAt(row) === null ? 'no valid date' : null);
      if (reason) preRejected.push({ matchId: row.match_id, reason });
      else rows.push(row);
    }
    markRejected(preRejected);
    totals.rejected += preRejected.length;

    for (const batch of chunk(rows, SYNC_BATCH_SIZE)) {
      const payload = {
        client: { app: 'the-black-grimoire', version: APP_VERSION },
        matches: batch.map(toSyncPayload),
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let resp: Response;
      try {
        resp = await fetchImpl(`${url}/api/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!resp.ok) {
        let reason = `HTTP ${resp.status}`;
        try {
          const errBody = (await resp.json()) as { error?: unknown };
          if (typeof errBody?.error === 'string') reason = errBody.error;
        } catch {
          // non-JSON error body — keep the HTTP status reason
        }
        lastError = reason;

        if (resp.status === 422) {
          // Whole-batch validation failure, not transient: mark every row so a
          // non-forced sync doesn't retry the same malformed batch forever ("Sync
          // now" with force does). Other batches are independent data — keep going.
          markRejected(batch.map((r) => ({ matchId: r.match_id, reason })));
          totals.sent += batch.length;
          totals.rejected += batch.length;
          continue;
        }

        break; // 401/429/5xx/network: leave this and remaining batches unmarked for retry
      }

      const data = (await resp.json().catch(() => ({}))) as {
        accepted?: unknown;
        duplicates?: unknown;
        rejected?: unknown;
      };
      const rejectedList = Array.isArray(data.rejected) ? data.rejected.filter(isRejectedEntry) : [];
      const rejectedIds = new Set(rejectedList.map((r) => r.matchId));
      const acceptedOrDuplicateIds = batch.map((r) => r.match_id).filter((id) => !rejectedIds.has(id));

      markSynced(acceptedOrDuplicateIds);
      markRejected(rejectedList);

      totals.sent += batch.length;
      totals.accepted += Number(data.accepted) || 0;
      totals.duplicates += Number(data.duplicates) || 0;
      totals.rejected += rejectedList.length;
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'network error';
  }

  const ok = !lastError;
  try {
    setAppStateValue('web_sync_last_at', new Date().toISOString());
    setAppStateValue(
      'web_sync_last_result',
      (ok
        ? `${totals.accepted} accepted, ${totals.duplicates} duplicate, ${totals.rejected} rejected`
        : `error: ${lastError}`
      ).slice(0, 200)
    );
  } catch {
    // bookkeeping only — never let it affect the returned result
  }

  return { ok, ...totals, ...(lastError ? { error: lastError } : {}) };
}

// ── Test connection ─────────────────────────────────────────────────────

export interface TestResult {
  ok: boolean;
  userId?: string;
  matches?: number;
  error?: string;
}

export async function testWebSync(opts: { fetchImpl?: typeof fetch } = {}): Promise<TestResult> {
  try {
    const fetchImpl = opts.fetchImpl ?? fetch;
    const { url, token } = getWebSyncConfig();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetchImpl(`${url}/api/matches/ping`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const data = (await resp.json().catch(() => ({}))) as { ok?: unknown; userId?: unknown; matches?: unknown; error?: unknown };
    if (!resp.ok || data.ok !== true) {
      const error = typeof data.error === 'string' ? data.error : `HTTP ${resp.status}`;
      return { ok: false, error };
    }
    return {
      ok: true,
      userId: typeof data.userId === 'string' ? data.userId : undefined,
      matches: typeof data.matches === 'number' ? data.matches : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }
}
