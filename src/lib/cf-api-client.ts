/**
 * Client for the Grimoire Collaborative Filtering API.
 *
 * Calls the cloud CF engine for deck-specific recommendations,
 * with local SQLite caching for offline use.
 */

import { getDb } from '@/lib/db';
import { CF_API_DEFAULT_URL } from '@/lib/constants';
import type { DbCard } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CFRecommendation {
  card_name: string;
  cf_score: number;
  similar_deck_count: number;
  reason: string;
}

export interface CFRecommendResponse {
  recommendations: CFRecommendation[];
  model_version: string;
  deck_count: number;
  color_identity: string;
}

export interface SimilarDeck {
  source: string;
  source_id: string;
  deck_name: string | null;
  author: string | null;
  similarity: number;
  commander: string;
  card_count: number;
  url: string | null;
}

export interface SimilarDecksResponse {
  similar_decks: SimilarDeck[];
}

// ── Config ───────────────────────────────────────────────────────────────────

const CF_TIMEOUT_MS = 5000;
const LOCAL_CACHE_TTL_HOURS = 24;

export function getCFApiUrl(): string {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_state WHERE key = 'cf_api_url'").get() as { value: string } | undefined;
    if (row?.value) return row.value;
  } catch {}
  return CF_API_DEFAULT_URL;
}

function isCFEnabled(): boolean {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_state WHERE key = 'cf_enabled'").get() as { value: string } | undefined;
    return row?.value !== 'false';
  } catch {
    return true;
  }
}

export function getCFApiKey(): string {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_state WHERE key = 'cf_api_key'").get() as { value: string } | undefined;
    return row?.value || '';
  } catch {
    return '';
  }
}

export function buildCFHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = getCFApiKey();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return headers;
}

// ── Deck hashing (must match Python side) ────────────────────────────────────

function hashDeck(cardNames: string[], commander: string): string {
  // Simple hash for cache keying — matches Python deck_hasher.py logic
  const normalized = cardNames.map(c => c.trim().toLowerCase()).sort();
  normalized.unshift(`commander:${commander.trim().toLowerCase()}`);
  const payload = normalized.join('|');

  // Simple djb2 hash → hex (not cryptographic, just for cache keying)
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash + payload.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ── Local cache ──────────────────────────────────────────────────────────────

// The `reason` column was added after the original cf_cache migration (schema.ts
// migration 24) shipped. Rather than bump the shared migration array (owned by
// another slice), add it lazily here — SQLite's ADD COLUMN is a cheap no-op to
// retry, so a failed "duplicate column" attempt is simply ignored.
let reasonColumnEnsured = false;
function ensureCfCacheReasonColumn(db: ReturnType<typeof getDb>): void {
  if (reasonColumnEnsured) return;
  reasonColumnEnsured = true;
  try {
    db.exec('ALTER TABLE cf_cache ADD COLUMN reason TEXT');
  } catch {
    // column already exists — ignore
  }
}

function getCachedRecommendations(deckHash: string): CFRecommendation[] | null {
  try {
    const db = getDb();
    ensureCfCacheReasonColumn(db);
    const cutoff = new Date(Date.now() - LOCAL_CACHE_TTL_HOURS * 3600_000).toISOString();
    const rows = db.prepare(`
      SELECT card_name, cf_score, similar_deck_count, reason
      FROM cf_cache
      WHERE deck_hash = ? AND fetched_at > ?
      ORDER BY cf_score DESC
    `).all(deckHash, cutoff) as Array<{ card_name: string; cf_score: number; similar_deck_count: number; reason: string | null }>;

    if (rows.length === 0) return null;
    return rows.map(r => ({
      card_name: r.card_name,
      cf_score: r.cf_score,
      similar_deck_count: r.similar_deck_count || 0,
      reason: r.reason || `Found in ${r.similar_deck_count || 0} similar decks`,
    }));
  } catch {
    return null;
  }
}

function cacheRecommendations(deckHash: string, recs: CFRecommendation[]): void {
  try {
    const db = getDb();
    ensureCfCacheReasonColumn(db);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cf_cache (deck_hash, card_name, cf_score, similar_deck_count, reason, fetched_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    const tx = db.transaction(() => {
      for (const rec of recs) {
        stmt.run(deckHash, rec.card_name, rec.cf_score, rec.similar_deck_count, rec.reason || null);
      }
    });
    tx();
  } catch {}
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function getCFRecommendations(
  deckCards: string[],
  commander: string,
  limit: number = 30,
): Promise<CFRecommendation[]> {
  if (!isCFEnabled()) return [];

  const deckHash = hashDeck(deckCards, commander);

  // Check local cache first
  const cached = getCachedRecommendations(deckHash);
  if (cached) return cached;

  // Call CF API
  const url = getCFApiUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CF_TIMEOUT_MS);

    const resp = await fetch(`${url}/recommend`, {
      method: 'POST',
      headers: buildCFHeaders(),
      body: JSON.stringify({ cards: deckCards, commander, limit }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return [];

    const data: CFRecommendResponse = await resp.json();
    if (data.recommendations.length > 0) {
      cacheRecommendations(deckHash, data.recommendations);
    }
    return data.recommendations;
  } catch {
    // API unreachable — return empty, fall back to other engines
    return [];
  }
}

export async function getSimilarDecks(
  deckCards: string[],
  commander: string,
  limit: number = 10,
): Promise<SimilarDeck[]> {
  if (!isCFEnabled()) return [];

  const url = getCFApiUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CF_TIMEOUT_MS);

    const resp = await fetch(`${url}/similar-decks`, {
      method: 'POST',
      headers: buildCFHeaders(),
      body: JSON.stringify({ cards: deckCards, commander, limit }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return [];
    const data: SimilarDecksResponse = await resp.json();
    return data.similar_decks;
  } catch {
    return [];
  }
}

/**
 * Resolve CF recommendations to DbCard objects from the local database.
 * Returns AISuggestion-compatible objects for integration with existing code.
 */
export function resolveCFToDbCards(
  recs: CFRecommendation[],
  existingIds: Set<string>,
): Array<{ card: DbCard; reason: string; score: number }> {
  const db = getDb();
  const results: Array<{ card: DbCard; reason: string; score: number }> = [];

  for (const rec of recs) {
    try {
      const card = db.prepare(
        "SELECT * FROM cards WHERE name = ? LIMIT 1"
      ).get(rec.card_name) as DbCard | undefined;

      if (!card) continue;
      if (existingIds.has(card.id)) continue;

      results.push({
        card,
        reason: `CF: ${rec.reason} (score: ${rec.cf_score.toFixed(2)})`,
        score: rec.cf_score,
      });
    } catch {}
  }

  return results;
}

// ── Deck Optimization ────────────────────────────────────────────────────────

export interface MatchRecord {
  result: 'win' | 'loss';
  opponent_colors?: string;
  opponent_archetype?: string;
  turns?: number;
  cards_drawn?: string[];
  cards_played?: string[];
}

export interface CardSuggestion {
  card_name: string;
  score: number;
  reason: string;
  category: string;
}

export interface OptimizeDeckResponse {
  cuts: CardSuggestion[];
  adds: CardSuggestion[];
  win_rate: number;
  total_matches: number;
  analysis: string;
  model_version: string;
}

export async function optimizeDeck(
  deckCards: string[],
  commander: string,
  matches: MatchRecord[],
  format: string = 'brawl',
  limit: number = 10,
): Promise<OptimizeDeckResponse | null> {
  if (!isCFEnabled()) return null;
  if (matches.length === 0) return null;

  const url = getCFApiUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const resp = await fetch(`${url}/optimize-deck`, {
      method: 'POST',
      headers: buildCFHeaders(),
      body: JSON.stringify({ cards: deckCards, commander, matches, format, limit }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// ── EDHREC Consensus ────────────────────────────────────────────────────────

export interface ConsensusCard {
  card_name: string;
  in_edhrec: boolean;
  in_user_deck: boolean;
  edhrec_quantity: number;
  category: 'missing_staple' | 'unique_pick' | 'consensus';
}

export interface EDHRECConsensusResponse {
  commander: string;
  edhrec_deck_found: boolean;
  edhrec_card_count: number;
  user_card_count: number;
  overlap_count: number;
  overlap_pct: number;
  missing_staples: ConsensusCard[];
  unique_picks: ConsensusCard[];
  consensus_cards: ConsensusCard[];
}

export async function getEDHRECConsensus(
  deckCards: string[],
  commander: string,
): Promise<EDHRECConsensusResponse | null> {
  if (!isCFEnabled()) return null;

  const url = getCFApiUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CF_TIMEOUT_MS);

    const resp = await fetch(`${url}/edhrec-consensus`, {
      method: 'POST',
      headers: buildCFHeaders(),
      body: JSON.stringify({ cards: deckCards, commander }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// ── Bandit outcome events ────────────────────────────────────────────────────

/**
 * Report a game outcome (win/loss) for a deck to the CF bandit (POST /events/track).
 * The server attributes a delayed reward (+1.5 win / -0.2 loss) across all
 * main-board cards. Fire-and-forget: telemetry must never block match ingestion.
 */
export async function reportGameOutcomeToCF(deckId: number, result: string): Promise<void> {
  if (result !== 'win' && result !== 'loss') return; // draws carry no reward signal
  if (!isCFEnabled()) return;
  try {
    const db = getDb();
    const cmd = db.prepare(
      `SELECT c.name, c.color_identity FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
       WHERE dc.deck_id = ? AND dc.board = 'commander' LIMIT 1`
    ).get(deckId) as { name: string; color_identity: string | null } | undefined;
    if (!cmd) return; // bandit events are commander-scoped

    const deckCards = (db.prepare(
      `SELECT c.name FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
       WHERE dc.deck_id = ? AND dc.board = 'main'`
    ).all(deckId) as Array<{ name: string }>).map((r) => r.name);
    if (deckCards.length === 0) return;

    let colorIdentity = '';
    try { colorIdentity = (JSON.parse(cmd.color_identity || '[]') as string[]).join(''); } catch { /* leave empty */ }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    await fetch(`${getCFApiUrl()}/events/track`, {
      method: 'POST',
      headers: buildCFHeaders(),
      body: JSON.stringify({
        event_type: result === 'win' ? 'game_won' : 'game_lost',
        commander: cmd.name,
        color_identity: colorIdentity,
        deck_cards: deckCards,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(t));
  } catch { /* never block ingestion on telemetry */ }
}

/**
 * Fire-and-forget POST to /events/track with an arbitrary event payload.
 * Shared by the bandit outcome reporters above and by suggestion-impression
 * tracking (suggestions_shown / suggestion_dismissed). Never throws — a
 * telemetry failure must never block the caller.
 */
export async function trackCFEvent(payload: Record<string, unknown>): Promise<void> {
  if (!isCFEnabled()) return;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    await fetch(`${getCFApiUrl()}/events/track`, {
      method: 'POST',
      headers: buildCFHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(t));
  } catch { /* never block on telemetry */ }
}

// ── Commander top decks (benchmark reference decks) ─────────────────────────

export interface CFTopDeckCard {
  card_name: string;
  board: string;
  quantity: number;
}

export interface CFTopDeck {
  id: string;
  source: string;
  source_id: string;
  url: string | null;
  deck_name: string | null;
  author: string | null;
  likes: number;
  views: number;
  format: string;
  card_count: number;
  cards: CFTopDeckCard[];
}

export interface CFTopDecksResponse {
  commander: string;
  count: number;
  decks: CFTopDeck[];
}

const TOP_DECKS_TIMEOUT_MS = 8000;

function topDecksCacheKey(commander: string, format: string): string {
  return `topdecks:${format}:${commander.trim().toLowerCase()}`;
}

function getCachedTopDecks(cacheKey: string): CFTopDecksResponse | null {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - LOCAL_CACHE_TTL_HOURS * 3600_000).toISOString();
    const row = db.prepare(
      `SELECT card_name FROM cf_cache WHERE deck_hash = ? AND fetched_at > ? LIMIT 1`
    ).get(cacheKey, cutoff) as { card_name: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.card_name) as CFTopDecksResponse;
  } catch {
    return null;
  }
}

function cacheTopDecks(cacheKey: string, data: CFTopDecksResponse): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO cf_cache (deck_hash, card_name, cf_score, similar_deck_count, fetched_at)
       VALUES (?, ?, 0, ?, datetime('now'))`
    ).run(cacheKey, JSON.stringify(data), data.decks.length);
  } catch { /* cache is best-effort */ }
}

/**
 * Fetch the top-liked reference decks for a commander from the VPS CF API
 * (GET /commander-top-decks), used by the deck benchmark route. Fail-soft:
 * returns null on any error so the benchmark can degrade gracefully.
 */
export async function getCommanderTopDecks(
  commander: string,
  format: 'commander' | 'historicBrawl',
  limit = 30,
): Promise<CFTopDecksResponse | null> {
  if (!isCFEnabled()) return null;

  const cacheKey = topDecksCacheKey(commander, format);
  const cached = getCachedTopDecks(cacheKey);
  if (cached) return cached;

  const url = getCFApiUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TOP_DECKS_TIMEOUT_MS);

    const qs = new URLSearchParams({ commander, limit: String(limit), format });
    const resp = await fetch(`${url}/commander-top-decks?${qs.toString()}`, {
      headers: buildCFHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data: CFTopDecksResponse = await resp.json();
    cacheTopDecks(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Test connection to the CF API.
 */
export async function testCFConnection(): Promise<{ ok: boolean; deckCount?: number; error?: string }> {
  const url = getCFApiUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CF_TIMEOUT_MS);

    const resp = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    return { ok: true, deckCount: data.deck_count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Connection failed' };
  }
}
