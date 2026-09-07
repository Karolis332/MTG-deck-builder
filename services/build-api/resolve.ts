/**
 * Shared card-name resolver for the build-api handlers (/analyze, /optimize,
 * /cards/lookup keep their own column lists but the lookup order is the same).
 *
 * Exact (NOCASE-indexed) first, LIKE DFC fallback only on a miss — the OR form
 * was an unindexed full scan per name (incident 2026-08-25), and exact-first
 * keeps 'Mountain' from resolving to its reversible 'Mountain // Mountain'
 * printing.
 */
import { getDb } from '../../src/lib/db';
import type { DbCard } from '../../src/lib/types';

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

export function makeCardResolver(): CardResolver {
  const db = getDb();
  const findExact = db.prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1');
  const findDfc = db.prepare('SELECT * FROM cards WHERE name LIKE ? COLLATE NOCASE LIMIT 1');
  return (name: string) =>
    (findExact.get(name) || findDfc.get(`${name} //%`)) as DbCard | undefined;
}

export function resolveDeckLines(lines: DeckLineInput[], findCard: CardResolver): ResolveResult {
  const resolved: ResolvedLine[] = [];
  const unresolved: string[] = [];
  for (const line of lines) {
    const name = String(line.name || '').trim();
    if (!name || name.length > 200) continue;
    const row = findCard(name);
    if (!row) {
      unresolved.push(name);
      continue;
    }
    resolved.push({
      card: row,
      quantity: Math.max(1, Math.floor(Number(line.quantity)) || 1),
      board: typeof line.board === 'string' && line.board ? line.board : 'main',
    });
  }
  return { resolved, unresolved };
}
