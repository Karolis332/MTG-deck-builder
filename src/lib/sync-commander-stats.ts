/**
 * Sync per-commander card statistics from the CF API into local SQLite.
 *
 * TypeScript port of scripts/sync_commander_stats.py so the packaged Electron
 * app can refresh stats on its own (no Python dependency). The scraper deepens
 * the VPS corpus nightly; this pulls that into the local DB so desktop builds
 * actually benefit. Atomic staging-table swap prevents data loss on crash.
 */

import { getDb } from './db';

interface CommanderListEntry { commander_name: string; deck_count: number; color_identity?: string }
interface CardStat { card_name: string; inclusion_rate: number; avg_copies: number; synergy_score: number; deck_count: number }
interface CommanderStatsResp { total_decks?: number; color_identity?: string | string[] | null; cards?: CardStat[] }

const SYNC_KEY = 'commander_stats_synced_at';
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** Run a single DDL/DML statement (static SQL only). */
function ddl(sql: string): void {
  getDb().prepare(sql).run();
}

function getAppState(key: string): string | null {
  try {
    const row = getDb().prepare('SELECT value FROM app_state WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function setAppState(key: string, value: string): void {
  getDb().prepare(
    `INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

function normalizeColorIdentity(ci: string | string[] | null | undefined): string {
  if (!ci) return '';
  if (Array.isArray(ci)) return ci.filter((c) => 'WUBRG'.includes(c)).join('');
  return ci.replace(/[^WUBRG]/g, '');
}

async function apiGet(base: string, apiKey: string | null, path: string, params: Record<string, string | number>): Promise<unknown> {
  const url = new URL(base.replace(/\/+$/, '') + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const backoff = [3000, 8000, 15000];
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const headers: Record<string, string> = { 'User-Agent': 'BlackGrimoire/1.0 (sync)' };
      if (apiKey) headers['x-api-key'] = apiKey;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url.toString(), { headers, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, backoff[attempt]));
    }
  }
  throw new Error(`API ${path} failed after 3 attempts: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
}

async function fetchCommanderList(base: string, apiKey: string | null, minDecks: number): Promise<CommanderListEntry[]> {
  const out: CommanderListEntry[] = [];
  let offset = 0;
  const pageSize = 500;
  for (;;) {
    const data = await apiGet(base, apiKey, '/commander-list', { min_decks: minDecks, offset, limit: pageSize }) as { commanders?: CommanderListEntry[]; total?: number };
    const batch = data.commanders ?? [];
    out.push(...batch);
    offset += batch.length;
    if (offset >= (data.total ?? 0) || batch.length < pageSize) break;
  }
  return out;
}

export interface SyncResult { ok: boolean; commanders: number; cardStats: number; errors: number; skippedReason?: string }

export async function syncCommanderStats(opts?: { minDecks?: number }): Promise<SyncResult> {
  const minDecks = opts?.minDecks ?? 20;
  const base = getAppState('cf_api_url');
  if (!base) return { ok: false, commanders: 0, cardStats: 0, errors: 0, skippedReason: 'no cf_api_url configured' };
  const apiKey = getAppState('cf_api_key');
  const db = getDb();

  const commanders = await fetchCommanderList(base, apiKey, minDecks);
  if (commanders.length === 0) return { ok: false, commanders: 0, cardStats: 0, errors: 0, skippedReason: 'empty commander list' };

  ddl('DROP TABLE IF EXISTS commander_card_stats_staging');
  ddl(`CREATE TABLE commander_card_stats_staging (
    id INTEGER PRIMARY KEY AUTOINCREMENT, commander_name TEXT NOT NULL, card_name TEXT NOT NULL,
    inclusion_rate REAL NOT NULL DEFAULT 0, avg_copies REAL NOT NULL DEFAULT 1, synergy_score REAL NOT NULL DEFAULT 0,
    deck_count INTEGER NOT NULL DEFAULT 0, total_commander_decks INTEGER NOT NULL DEFAULT 0,
    color_identity TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(commander_name, card_name))`);
  ddl('DROP TABLE IF EXISTS card_deck_index_staging');
  ddl(`CREATE TABLE card_deck_index_staging (
    id INTEGER PRIMARY KEY AUTOINCREMENT, card_name TEXT NOT NULL, commander_name TEXT NOT NULL,
    inclusion_rate REAL NOT NULL DEFAULT 0, UNIQUE(card_name, commander_name))`);

  const insStat = db.prepare(`INSERT OR REPLACE INTO commander_card_stats_staging
    (commander_name, card_name, inclusion_rate, avg_copies, synergy_score, deck_count, total_commander_decks, color_identity, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
  const insIdx = db.prepare(`INSERT OR IGNORE INTO card_deck_index_staging (card_name, commander_name, inclusion_rate) VALUES (?, ?, ?)`);

  let errors = 0;
  let totalStats = 0;
  for (const cmdr of commanders) {
    let data: CommanderStatsResp;
    try {
      data = await apiGet(base, apiKey, '/commander-stats', { commander: cmdr.commander_name, limit: 300 }) as CommanderStatsResp;
    } catch {
      errors++;
      continue;
    }
    const totalDecks = data.total_decks ?? 0;
    const ci = normalizeColorIdentity(data.color_identity);
    const rows = data.cards ?? [];
    const tx = db.transaction(() => {
      for (const c of rows) {
        insStat.run(cmdr.commander_name, c.card_name,
          Math.round(c.inclusion_rate * 1e6) / 1e6, Math.round(c.avg_copies * 1e4) / 1e4,
          Math.round(c.synergy_score * 1e6) / 1e6, Math.trunc(c.deck_count), Math.trunc(totalDecks), ci);
        if (c.inclusion_rate >= 0.05) insIdx.run(c.card_name, cmdr.commander_name, Math.round(c.inclusion_rate * 1e6) / 1e6);
      }
    });
    tx();
    totalStats += rows.length;
    await new Promise((r) => setTimeout(r, 80)); // be polite to the API
  }

  const stagingCount = (db.prepare('SELECT COUNT(*) c FROM commander_card_stats_staging').get() as { c: number }).c;
  if (stagingCount < 1000 && commanders.length > 10) {
    ddl('DROP TABLE IF EXISTS commander_card_stats_staging');
    ddl('DROP TABLE IF EXISTS card_deck_index_staging');
    return { ok: false, commanders: commanders.length, cardStats: 0, errors, skippedReason: `staging too small (${stagingCount})` };
  }

  // Atomic swap inside a transaction so readers see old-or-new, never partial.
  db.transaction(() => {
    ddl('DROP TABLE IF EXISTS commander_card_stats');
    ddl('ALTER TABLE commander_card_stats_staging RENAME TO commander_card_stats');
    ddl('CREATE INDEX IF NOT EXISTS idx_ccs_commander ON commander_card_stats(commander_name)');
    ddl('CREATE INDEX IF NOT EXISTS idx_ccs_card ON commander_card_stats(card_name)');
    ddl('CREATE INDEX IF NOT EXISTS idx_ccs_incl ON commander_card_stats(commander_name, inclusion_rate DESC)');
    ddl('DROP TABLE IF EXISTS card_deck_index');
    ddl('ALTER TABLE card_deck_index_staging RENAME TO card_deck_index');
    ddl('CREATE INDEX IF NOT EXISTS idx_cdi_card ON card_deck_index(card_name)');
    ddl('CREATE INDEX IF NOT EXISTS idx_cdi_commander ON card_deck_index(commander_name)');
  })();

  setAppState(SYNC_KEY, new Date().toISOString());
  return { ok: true, commanders: commanders.length, cardStats: totalStats, errors };
}

/**
 * Run a sync only if the CF API is configured and stats are >7 days old.
 * Fire-and-forget from startup — never blocks app launch.
 */
export function syncCommanderStatsIfStale(): void {
  try {
    if (!getAppState('cf_api_url')) return;
    const last = getAppState(SYNC_KEY);
    if (last && Date.now() - new Date(last).getTime() < STALE_MS) return;
    void syncCommanderStats()
      .then((r) => console.log('[StatsSync]', r.ok ? `refreshed ${r.commanders} commanders / ${r.cardStats} stats (${r.errors} errors)` : `skipped: ${r.skippedReason}`))
      .catch((err) => console.error('[StatsSync] failed:', err instanceof Error ? err.message : err));
  } catch (err) {
    console.error('[StatsSync] guard error:', err instanceof Error ? err.message : err);
  }
}
