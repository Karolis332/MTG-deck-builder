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

function getCachedRecommendations(deckHash: string): CFRecommendation[] | null {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - LOCAL_CACHE_TTL_HOURS * 3600_000).toISOString();
    const rows = db.prepare(`
      SELECT card_name, cf_score, similar_deck_count
      FROM cf_cache
      WHERE deck_hash = ? AND fetched_at > ?
      ORDER BY cf_score DESC
    `).all(deckHash, cutoff) as Array<{ card_name: string; cf_score: number; similar_deck_count: number }>;

    if (rows.length === 0) return null;
    return rows.map(r => ({
      card_name: r.card_name,
      cf_score: r.cf_score,
      similar_deck_count: r.similar_deck_count || 0,
      reason: `Found in ${r.similar_deck_count || 0} similar decks`,
    }));
  } catch {
    return null;
  }
}

function cacheRecommendations(deckHash: string, recs: CFRecommendation[]): void {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cf_cache (deck_hash, card_name, cf_score, similar_deck_count, fetched_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    const tx = db.transaction(() => {
      for (const rec of recs) {
        stmt.run(deckHash, rec.card_name, rec.cf_score, rec.similar_deck_count);
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
