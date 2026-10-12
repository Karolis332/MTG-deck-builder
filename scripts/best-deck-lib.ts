/**
 * File/DB ownership readers for the CLI engine (`collection-best-deck.ts`, `model-lab.ts`).
 * The request-driven engine primitives (constants, lookups, pool/seed building, scoring) live in
 * `src/lib/best-deck.ts` and are re-exported below so this file's importers keep compiling.
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import type { DbCard } from '../src/lib/types';
import { resolveCard, legalIn, BASIC_RE } from '../src/lib/best-deck';

export * from '../src/lib/best-deck';

/** Card names in list order, each repeated by its quantity ("18 Forest" → 18 entries); headers and blanks skipped. */
export function parseList(text: string): string[] {
  return text.split(/\r?\n/)
    .map((l) => /^(\d+)x?\s+(.+?)(?:\s*\([A-Za-z0-9]{2,6}\)\s*\S+)?$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .flatMap((m) => Array<string>(Number(m[1])).fill(m[2]));
}
export const readList = (file: string): string[] => parseList(fs.readFileSync(file, 'utf8'));

export interface Owned { cards: DbCard[]; decks: Map<string, string[]> }

/** Paper: collection.txt ∪ decks/paper/decks/*.txt (each card usable once, basics unlimited). Arena: DB rows source='arena', user 1. */
export function loadOwned(source: string): Owned {
  const names = new Set<string>();
  const decks = new Map<string, string[]>();
  if (source === 'paper') {
    readList('decks/paper/collection.txt').forEach((n) => names.add(n));
    for (const f of fs.readdirSync('decks/paper/decks').filter((x) => x.endsWith('.txt'))) {
      const list = readList(path.join('decks/paper/decks', f));
      list.forEach((n) => names.add(n));
      if (list.length) decks.set(resolveCard(list[0])?.name ?? list[0], list.slice(1));
    }
  } else {
    const rows = getDb().prepare("select distinct c.name from collection col join cards c on c.id = col.card_id where col.source = 'arena' and col.user_id = 1").all() as { name: string }[];
    rows.forEach((r) => names.add(r.name));
  }
  const cards = [...names].map(resolveCard).filter((c): c is DbCard => !!c);
  return { cards: [...new Map(cards.map((c) => [c.name, c])).values()], decks };
}

export const legalPool = (owned: Owned, format: string): DbCard[] => owned.cards.filter((c) => legalIn(c, format) && !BASIC_RE.test(c.name));
