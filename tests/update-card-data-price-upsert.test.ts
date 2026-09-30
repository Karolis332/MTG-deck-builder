import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';

// Exercises the exact UPDATE clause `scripts/update-card-data.ts` runs for the
// price columns, on a scratch in-memory DB — a bulk snapshot's null price for
// a printing must never erase an already-known price (COALESCE keeps the old
// value; the script previously hard-set price_usd = @price_usd, nulling it).
describe('update-card-data price upsert (COALESCE, never null-out)', () => {
  const updateSql = `
    UPDATE cards SET
      price_usd = COALESCE(@price_usd, price_usd),
      price_usd_foil = COALESCE(@price_usd_foil, price_usd_foil)
    WHERE id = @pk
  `;

  function setup() {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE cards (id TEXT PRIMARY KEY, price_usd TEXT, price_usd_foil TEXT)');
    db.prepare('INSERT INTO cards (id, price_usd, price_usd_foil) VALUES (?, ?, ?)').run('c1', '12.34', '20.00');
    return db;
  }

  it('a null bulk price keeps the existing known price', () => {
    const db = setup();
    db.prepare(updateSql).run({ pk: 'c1', price_usd: null, price_usd_foil: null });
    const row = db.prepare('SELECT price_usd, price_usd_foil FROM cards WHERE id = ?').get('c1') as { price_usd: string; price_usd_foil: string };
    expect(row.price_usd).toBe('12.34');
    expect(row.price_usd_foil).toBe('20.00');
  });

  it('a real bulk price still overwrites the old one', () => {
    const db = setup();
    db.prepare(updateSql).run({ pk: 'c1', price_usd: '9.99', price_usd_foil: null });
    const row = db.prepare('SELECT price_usd, price_usd_foil FROM cards WHERE id = ?').get('c1') as { price_usd: string; price_usd_foil: string };
    expect(row.price_usd).toBe('9.99');
    expect(row.price_usd_foil).toBe('20.00'); // still preserved, its own bulk value was null
  });
});
