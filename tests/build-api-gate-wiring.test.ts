/**
 * build-api gate wiring — the service must judge what it produces, must never
 * read the desktop `collection` table, must never propose a locked cut, and
 * must never ship a cut or add with a blank reason.
 *
 * Lives in tests/ because vitest.config.ts only includes src/ and tests/.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const FIX = path.join(process.cwd(), 'src/lib/__tests__/fixtures/deck-gate');
const V5 = fs.readFileSync(path.join(FIX, 'emperor-v5.txt'), 'utf8');

let testDb: Database.Database;
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, getDb: () => testDb };
});

import { optimizeDeck } from '../services/build-api/optimize';
import { commanderClosers, cutReason, deckText, readLocks, MAX_LOCKS } from '../services/build-api/gate-wiring';
import { parseDecklist } from '@/lib/deck-gate';

interface Cut {
  name: string;
  reason: string;
}
interface Add {
  name: string;
  reason: string;
}
type OptimizeOut = Record<string, unknown> & {
  cuts: Cut[];
  adds: Add[];
  lockedFromCuts: string[];
  gate: { verdict: string; checks: Array<{ id: string; status: string }> };
};

const run = (body: Record<string, unknown>): OptimizeOut =>
  optimizeDeck({ format: 'brawl', text: V5, ...body }) as OptimizeOut;

const gateCheck = (r: OptimizeOut, id: string) => r.gate.checks.find((c) => c.id === id)!;

beforeAll(() => {
  const cards = JSON.parse(fs.readFileSync(path.join(FIX, 'cards.json'), 'utf8')) as Array<
    Record<string, string | number | null>
  >;
  testDb = new Database(':memory:');
  testDb.exec(`
    CREATE TABLE cards (
      id TEXT PRIMARY KEY, name TEXT, mana_cost TEXT, cmc REAL, type_line TEXT,
      oracle_text TEXT, colors TEXT, color_identity TEXT, legalities TEXT, layout TEXT,
      set_code TEXT, collector_number TEXT, rarity TEXT, image_uri_small TEXT,
      image_uri_normal TEXT, produced_mana TEXT, edhrec_rank INTEGER, game_changer INTEGER
    );
    CREATE TABLE collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT, quantity INTEGER, foil INTEGER,
      source TEXT, imported_at TEXT, user_id INTEGER
    );
  `);
  const ins = testDb.prepare(
    `INSERT INTO cards (id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity,
     legalities, layout, set_code, produced_mana, rarity, edhrec_rank)
     VALUES (@id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @colors, @color_identity,
     @legalities, @layout, @set_code, @produced_mana, @rarity, @edhrec_rank)`
  );
  for (const c of cards) ins.run(c);
});

describe('POST /optimize — gate field', () => {
  it('judges the list the optimizer would leave behind', () => {
    const r = run({});
    expect(r.gate.verdict).toMatch(/pass|warn|fail/);
    expect(r.gate.checks.map((c) => c.id)).toEqual(
      expect.arrayContaining(['size', 'legality', 'ownership', 'arenaNames', 'plan', 'locks'])
    );
  });
});

describe('POST /optimize — reasons', () => {
  it('never returns a cut or an add without a reason', () => {
    const r = run({});
    expect(r.cuts.length).toBeGreaterThan(0);
    expect(r.cuts.filter((c) => !c.reason?.trim())).toEqual([]);
    expect(r.adds.filter((a) => !a.reason?.trim())).toEqual([]);
  });

  it('fills a blank reason list rather than shipping an empty string', () => {
    const cut = { name: 'X', quantity: 1, reasons: [], category: 'utility', cmc: 4 };
    expect(cutReason(cut, false)).not.toBe('');
    expect(cutReason(cut, true)).toMatch(/trigger condition/);
  });
});

describe('POST /optimize — locks', () => {
  it('never proposes a locked card as a cut', () => {
    const r = run({ locks: ['Coastal Piracy'] });
    const cutNames = r.cuts.map((c) => c.name);
    expect(cutNames).not.toContain('Coastal Piracy');
    // Default locks (fetch lands) hold without the caller naming them.
    expect(cutNames).not.toContain('Flooded Strand');
    expect(cutNames).not.toContain('Misty Rainforest');
    expect(gateCheck(r, 'locks').status).not.toBe('fail');
  });

  it('never cuts an extra-combat closer when the commander wins by attacking', () => {
    const r = run({});
    expect(r.cuts.map((c) => c.name)).not.toContain('Aggravated Assault');
  });

  it('caps the locks array at 50 entries and drops non-strings', () => {
    const locks = readLocks({ locks: [...Array(80).keys()].map(String).concat([42 as unknown as string, '']) });
    expect(locks).toHaveLength(MAX_LOCKS);
  });
});

describe('POST /optimize — ownership source', () => {
  it('skips ownership when the caller sends no ownedCards', () => {
    expect(gateCheck(run({}), 'ownership').status).toBe('skip');
  });

  it('runs ownership against the caller-supplied pool', () => {
    const names = parseDecklist(V5).map((l) => l.name);
    const r = run({ ownedCards: names });
    const check = gateCheck(r, 'ownership') as { status: string; cards?: string[] };
    // The gate judges the AFTER list, so anything missing must be a proposed add,
    // never a card the caller already sent.
    expect(check.status).not.toBe('skip');
    const addNames = new Set(r.adds.map((a) => a.name));
    for (const missing of check.cards ?? []) expect(addNames.has(missing)).toBe(true);

    const pool = [...names, ...r.adds.map((a) => a.name)];
    expect(gateCheck(run({ ownedCards: pool }), 'ownership').status).toBe('pass');
    expect(gateCheck(run({ ownedCards: ['Island'] }), 'ownership').status).toBe('fail');
  });

  it('never touches the collection table', () => {
    run({ ownedCards: ['Island'] });
    expect(testDb.prepare('SELECT COUNT(*) n FROM collection').get()).toEqual({ n: 0 });
  });
});

describe('gate-wiring helpers', () => {
  it('renders a decklist the gate can parse back', () => {
    const text = deckText([
      { name: 'The Emperor of Palamecia', quantity: 1, board: 'commander' },
      { name: 'Island', quantity: 2, board: 'main' },
    ]);
    const lines = parseDecklist(text);
    expect(lines).toEqual([
      { quantity: 1, name: 'The Emperor of Palamecia', board: 'commander' },
      { quantity: 2, name: 'Island', board: 'main' },
    ]);
  });

  it('counts extra-combat effects as closers only for an attacking commander', () => {
    const pool = [{ name: 'Aggravated Assault', oracle_text: 'Untap all creatures you control. After this main phase, there is an additional combat phase.' }];
    expect(commanderClosers(pool, 'Whenever The Lord Master of Hell attacks, it deals X damage')).toContain('Aggravated Assault');
    expect(commanderClosers(pool, 'Whenever you cast a noncreature spell, draw a card').size).toBe(0);
  });
});
