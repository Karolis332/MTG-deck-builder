/**
 * Shared card-name resolver for the build-api handlers (/analyze, /optimize,
 * /cards/lookup keep their own column lists but the lookup order is the same).
 *
 * Exact (NOCASE-indexed) first, LIKE DFC fallback only on a miss — the OR form
 * was an unindexed full scan per name (incident 2026-08-25), and exact-first
 * keeps 'Mountain' from resolving to its reversible 'Mountain // Mountain'
 * printing. The fallback is skipped for names carrying LIKE wildcards: a
 * `%`-laden name turns the prefix scan into a full-table scan (~50 ms each,
 * review 2026-09-07), and no real card name contains `%` or `_`.
 */
import { getDb } from '../../src/lib/db';
import type { DbCard } from '../../src/lib/types';

export const MAX_CARD_QUANTITY = 99;
export const MAX_NAME_LENGTH = 200;

export interface DeckLineInput {
  name: string;
  quantity?: number;
  board?: string;
}

export interface ResolvedLine {
  card: DbCard;
  quantity: number;
  board: string;
}

export interface ResolveResult {
  resolved: ResolvedLine[];
  unresolved: string[];
}

export type CardResolver = (name: string) => DbCard | undefined;

const LIKE_WILDCARD_RE = /[%_]/;

/** Clamp a user-supplied quantity to 1..MAX_CARD_QUANTITY (NaN/Infinity/strings → 1). */
export function clampQuantity(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_CARD_QUANTITY, n);
}

export function makeCardResolver(): CardResolver {
  const db = getDb();
  // Art-series and token rows share real card names ("Egon, God of Death // Egon, God of Death") — never resolve to them.
  const NOT_CARD = "layout NOT IN ('art_series','token','double_faced_token','emblem')";
  const findExact = db.prepare(`SELECT * FROM cards WHERE name = ? COLLATE NOCASE AND ${NOT_CARD} LIMIT 1`);
  const findDfc = db.prepare(`SELECT * FROM cards WHERE name LIKE ? COLLATE NOCASE AND ${NOT_CARD} ORDER BY length(name) LIMIT 1`);
  // Per-resolver memo: a pasted list repeats names (basic lands, playsets) and
  // collectAdds re-resolves suggestion names — one lookup per distinct name.
  const memo = new Map<string, DbCard | undefined>();
  return (name: string) => {
    const key = name.toLowerCase();
    if (memo.has(key)) return memo.get(key);
    let row = findExact.get(name) as DbCard | undefined;
    if (!row && !LIKE_WILDCARD_RE.test(name)) {
      row = findDfc.get(`${name} //%`) as DbCard | undefined;
    }
    memo.set(key, row);
    return row;
  };
}

export function resolveDeckLines(lines: DeckLineInput[], findCard: CardResolver): ResolveResult {
  const resolved: ResolvedLine[] = [];
  const unresolved: string[] = [];
  for (const line of lines) {
    const name = String(line.name || '').trim();
    if (!name) continue;
    const row = name.length <= MAX_NAME_LENGTH ? findCard(name) : undefined;
    if (!row) {
      unresolved.push(name.slice(0, MAX_NAME_LENGTH));
      continue;
    }
    resolved.push({
      card: row,
      quantity: clampQuantity(line.quantity),
      board: typeof line.board === 'string' && line.board ? line.board : 'main',
    });
  }
  return { resolved, unresolved };
}
