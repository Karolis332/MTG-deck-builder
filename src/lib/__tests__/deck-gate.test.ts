import { describe, it, expect, beforeAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const FIX = path.join(__dirname, 'fixtures/deck-gate');
const CARDS = JSON.parse(fs.readFileSync(path.join(FIX, 'cards.json'), 'utf8')) as Array<
  Record<string, string | number | null>
>;

let testDb: Database.Database;
vi.mock('@/lib/db', () => ({ getDb: () => testDb }));
vi.mock('../db', () => ({ getDb: () => testDb }));

import { gateDeck, parseDecklist, type GateVerdict } from '../deck-gate';

const list = (f: string) => fs.readFileSync(path.join(FIX, `${f}.txt`), 'utf8');
const check = (v: GateVerdict, id: string) => {
  const c = v.checks.find((x) => x.id === id);
  if (!c) throw new Error(`no check "${id}" in [${v.checks.map((x) => x.id).join(', ')}]`);
  return c;
};

/** Days between the fake Arena import and "now" — past the 14-day warn floor. */
const IMPORT_AGE_DAYS = 78;

beforeAll(() => {
  testDb = new Database(':memory:');
  testDb.exec(`
    CREATE TABLE cards (
      id TEXT PRIMARY KEY, name TEXT, mana_cost TEXT, cmc REAL, type_line TEXT,
      oracle_text TEXT, colors TEXT, color_identity TEXT, legalities TEXT,
      layout TEXT, set_code TEXT, produced_mana TEXT, rarity TEXT, edhrec_rank INTEGER
    );
    CREATE TABLE collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT, quantity INTEGER,
      foil INTEGER DEFAULT 0, source TEXT, imported_at TEXT, user_id INTEGER
    );
  `);
  const ins = testDb.prepare(
    `INSERT INTO cards (id, name, mana_cost, cmc, type_line, oracle_text, colors,
     color_identity, legalities, layout, set_code, produced_mana, rarity, edhrec_rank)
     VALUES (@id, @name, @mana_cost, @cmc, @type_line, @oracle_text, @colors,
     @color_identity, @legalities, @layout, @set_code, @produced_mana, @rarity, @edhrec_rank)`
  );
  for (const c of CARDS) ins.run(c);

  // Fake Arena collection = every card in the v5 list, imported 78 days ago.
  const importedAt = new Date(Date.now() - IMPORT_AGE_DAYS * 86400_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  const findId = testDb.prepare(
    `SELECT id FROM cards WHERE name = ? COLLATE NOCASE OR name LIKE ? || ' // %' COLLATE NOCASE LIMIT 1`
  );
  const own = testDb.prepare(
    `INSERT INTO collection (card_id, quantity, source, imported_at, user_id) VALUES (?, 4, 'arena', ?, 1)`
  );
  for (const line of parseDecklist(list('emperor-v5'))) {
    const row = findId.get(line.name, line.name) as { id: string } | undefined;
    if (row) own.run(row.id, importedAt);
  }
});

describe('parseDecklist', () => {
  it('reads board headers, quantities and set codes', () => {
    const lines = parseDecklist(list('emperor-v2'));
    expect(lines.filter((l) => l.board === 'commander')).toHaveLength(1);
    expect(lines.reduce((s, l) => s + l.quantity, 0)).toBe(100);
  });
});

describe('gateDeck — the 2026-09-18 Emperor v2 list', () => {
  let v: GateVerdict;
  beforeAll(() => {
    v = gateDeck(list('emperor-v2'), { format: 'brawl', ownerId: 1 });
  });

  it('fails overall', () => {
    expect(v.verdict).toBe('fail');
  });

  it('fails ownership with the 12 cards missing from the Arena collection', () => {
    const c = check(v, 'ownership');
    expect(c.status).toBe('fail');
    expect(c.cards).toHaveLength(12);
  });

  it('fails arenaNames on the Front // Back lines Arena rejects', () => {
    const c = check(v, 'arenaNames');
    expect(c.status).toBe('fail');
    expect(c.cards!.length).toBeGreaterThanOrEqual(6);
    expect(c.cards!.some((s) => /Shatterskull Smashing$/.test(s))).toBe(true);
  });

  it('flags the plan: two thirds of the nonland cards cannot turn the commander on', () => {
    const c = check(v, 'plan');
    expect(c.status).toBe('warn');
    // The commander needs a noncreature spell with 4+ mana spent. Naming its
    // trigger is not the same as meeting it — that gap is what shipped.
    expect(v.plan!.enablerRatio).toBeLessThan(0.4);
    expect(c.detail).toMatch(/can satisfy it/);
    const mvs = v.plan!.nonInteracting.map((x) => x.cmc);
    expect([...mvs].sort((a, b) => a - b)).toEqual(mvs);
  });

  it('passes size, singleton and identity', () => {
    expect(check(v, 'size').status).toBe('pass');
    expect(check(v, 'singleton').status).toBe('pass');
    expect(check(v, 'identity').status).toBe('pass');
  });
});

describe('gateDeck — the v5 list against a complete collection', () => {
  let v: GateVerdict;
  beforeAll(() => {
    v = gateDeck(list('emperor-v5'), { format: 'brawl', ownerId: 1 });
  });

  it('does not fail', () => {
    expect(v.checks.filter((c) => c.status === 'fail')).toEqual([]);
    expect(v.verdict).not.toBe('fail');
  });

  it('warns that the collection snapshot is stale, with its age in days', () => {
    const c = check(v, 'ownership');
    expect(c.status).toBe('warn');
    expect(c.detail).toMatch(new RegExp(`${IMPORT_AGE_DAYS} days`));
  });
});

describe('gateDeck — 60-card Standard', () => {
  let v: GateVerdict;
  beforeAll(() => {
    v = gateDeck(list('standard-5copies'), { format: 'standard' });
  });

  it('accepts the 60-card size', () => {
    expect(check(v, 'size').status).toBe('pass');
    expect(v.totals.cards).toBe(60);
  });

  it('fails the copy limit on the 5-of, not on the basics', () => {
    const c = check(v, 'singleton');
    expect(c.status).toBe('fail');
    expect(c.detail).toMatch(/Manifold Mouse/);
    expect(c.detail).not.toMatch(/Mountain/);
  });
});

describe('gateDeck — split cards', () => {
  it('accepts a real split card name', () => {
    const v = gateDeck(list('split-fire-ice'), { format: 'modern' });
    expect(check(v, 'arenaNames').status).toBe('pass');
  });
});

describe('gateDeck — locks', () => {
  const before = ['Flooded Strand', 'Coastal Piracy', 'Shock'];
  // Flooded Strand is a default lock (fetch land); Coastal Piracy is locked by
  // the caller — the operator had to restore both by hand on 2026-09-18.
  const locks = ['Coastal Piracy'];

  it('fails when a locked card present before the edit is gone after it', () => {
    const v = gateDeck(list('emperor-v5'), {
      format: 'brawl',
      locks,
      before,
      after: ['Shock'],
    });
    const c = check(v, 'locks');
    expect(c.status).toBe('fail');
    expect(c.cards).toEqual(expect.arrayContaining(['Flooded Strand', 'Coastal Piracy']));
  });

  it('passes when every locked card survives', () => {
    const v = gateDeck(list('emperor-v5'), { format: 'brawl', locks, before, after: before });
    expect(check(v, 'locks').status).toBe('pass');
  });
});

describe('gateDeck — Alchemy names', () => {
  it('accepts A-Thran Portal in Brawl via the rebalanced printing', () => {
    const v = gateDeck(list('emperor-v5'), { format: 'brawl' });
    expect(check(v, 'legality').status).toBe('pass');
    expect(v.unresolved).toEqual([]);
  });
});
