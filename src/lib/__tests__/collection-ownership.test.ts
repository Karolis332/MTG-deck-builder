import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { buildOwnedQtyMap, ownedNamesSubquery, ownedNamesSubqueryInline } from '../collection-ownership';

// U9a finding 8 — 'arena' rows imported before the source rename are
// tagged 'arena_csv'. A source filter of 'arena' must match both, the way
// src/lib/db.ts's collection queries already do, or a legacy-import user's
// Arena-scoped ownership checks (and therefore the auto-build route's
// Arena-scoped collection detection) silently see nothing.
describe('collection-ownership: source "arena" matches legacy "arena_csv" rows', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE cards (id TEXT PRIMARY KEY, name TEXT);
      CREATE TABLE collection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        card_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        source TEXT DEFAULT 'import'
      );
    `);
    db.prepare("INSERT INTO cards (id, name) VALUES ('c1', 'Sol Ring')").run();
    db.prepare("INSERT INTO cards (id, name) VALUES ('c2', 'Arcane Signet')").run();
    // Legacy import: tagged 'arena_csv', not 'arena'.
    db.prepare("INSERT INTO collection (user_id, card_id, quantity, source) VALUES (1, 'c1', 2, 'arena_csv')").run();
    // A paper row that must NOT leak into an 'arena'-scoped query.
    db.prepare("INSERT INTO collection (user_id, card_id, quantity, source) VALUES (1, 'c2', 3, 'paper')").run();
  });

  afterEach(() => db.close());

  it('buildOwnedQtyMap: source "arena" finds a legacy "arena_csv" row', () => {
    const owned = buildOwnedQtyMap(db, { userId: 1, source: 'arena' });
    expect(owned.get('Sol Ring')).toBe(2);
    expect(owned.has('Arcane Signet')).toBe(false); // paper row excluded
  });

  it('ownedNamesSubquery: source "arena" includes a legacy "arena_csv" row', () => {
    const { sql, params } = ownedNamesSubquery({ userId: 1, source: 'arena' });
    const names = db.prepare(sql).all(...params) as Array<{ cname: string }>;
    expect(names.some((n) => n.cname === 'Sol Ring')).toBe(true);
    expect(names.some((n) => n.cname === 'Arcane Signet')).toBe(false);
  });

  it('ownedNamesSubqueryInline: source "arena" includes a legacy "arena_csv" row', () => {
    const sql = ownedNamesSubqueryInline({ userId: 1, source: 'arena' });
    const names = db.prepare(sql).all() as Array<{ cname: string }>;
    expect(names.some((n) => n.cname === 'Sol Ring')).toBe(true);
    expect(names.some((n) => n.cname === 'Arcane Signet')).toBe(false);
  });

  it('an exact non-arena source is unaffected by the arena_csv widening', () => {
    const owned = buildOwnedQtyMap(db, { userId: 1, source: 'paper' });
    expect(owned.get('Arcane Signet')).toBe(3);
    expect(owned.has('Sol Ring')).toBe(false);
  });
});
