import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { foldMinPrice, finalizeMinPrice } from '../scripts/update-card-data';
import type { MinPriceAcc } from '../scripts/update-card-data';

const EMPTY: MinPriceAcc = { usd: null, foil: null, etched: null };

describe('foldMinPrice / finalizeMinPrice — lowest price across printings', () => {
  it('3 printings: null usd / $5 / $3 -> $3', () => {
    let acc = EMPTY;
    acc = foldMinPrice(acc, { usd: null });
    acc = foldMinPrice(acc, { usd: '5.00' });
    acc = foldMinPrice(acc, { usd: '3.00' });
    expect(finalizeMinPrice(acc)).toBe(3);
  });

  it('all printings null usd, one foil $9 -> falls back to $9', () => {
    let acc = EMPTY;
    acc = foldMinPrice(acc, { usd: null, usd_foil: null });
    acc = foldMinPrice(acc, { usd: null, usd_foil: '9.00' });
    expect(finalizeMinPrice(acc)).toBe(9);
  });

  it('no usd or foil anywhere, etched $12 -> falls back to etched', () => {
    let acc = EMPTY;
    acc = foldMinPrice(acc, { usd: null, usd_foil: null, usd_etched: '12.00' });
    expect(finalizeMinPrice(acc)).toBe(12);
  });

  it('no printing has any price -> null', () => {
    const acc = foldMinPrice(EMPTY, { usd: null, usd_foil: null, usd_etched: null });
    expect(finalizeMinPrice(acc)).toBeNull();
  });
});

describe('price backfill UPDATE — a null incoming price never overwrites a known price', () => {
  it('COALESCE + price_usd IS NULL guard leaves an existing price untouched', () => {
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE cards (id TEXT PRIMARY KEY, oracle_id TEXT, price_usd TEXT, updated_at TEXT)`);
    db.prepare(`INSERT INTO cards (id, oracle_id, price_usd, updated_at) VALUES ('p1', 'o1', '5.00', 't0')`).run();
    db.prepare(`INSERT INTO cards (id, oracle_id, price_usd, updated_at) VALUES ('p2', 'o2', NULL, 't0')`).run();

    const backfillStmt = db.prepare(`
      UPDATE cards SET price_usd = COALESCE(price_usd, @price), updated_at = 't1'
      WHERE oracle_id = @oracle_id AND price_usd IS NULL
    `);
    // A cheaper price computed for o1 must never clobber its existing $5.00.
    backfillStmt.run({ oracle_id: 'o1', price: '3.00' });
    backfillStmt.run({ oracle_id: 'o2', price: '3.00' });

    const rows = db.prepare('SELECT id, price_usd FROM cards ORDER BY id').all() as Array<{ id: string; price_usd: string }>;
    expect(rows).toEqual([
      { id: 'p1', price_usd: '5.00' },
      { id: 'p2', price_usd: '3.00' },
    ]);
    db.close();
  });
});
