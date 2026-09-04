import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

let testDb: Database.Database;
vi.mock('@/lib/db', () => ({ getDb: () => testDb }));
vi.mock('../db', () => ({ getDb: () => testDb }));

import { syncCommanderStats, roundLift } from '../sync-commander-stats';

const cmdr = 'Krenko, Mob Boss';
const cards = Array.from({ length: 12 }, (_, i) => ({
  card_name: `Card ${i}`, inclusion_rate: 0.5, avg_copies: 1, synergy_score: 0.1, deck_count: 50,
  lift: i === 0 ? 1.23456 : i === 1 ? null : undefined,
}));

function mockFetch() {
  return vi.fn(async (url: string) => {
    const body = url.includes('/commander-list')
      ? { commanders: [{ commander_name: cmdr, deck_count: 100, color_identity: 'R' }], total: 1 }
      : { total_decks: 100, color_identity: 'R', cards };
    return { ok: true, json: async () => body } as unknown as Response;
  });
}

describe('sync-commander-stats lift', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    testDb.exec(`CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT);
      INSERT INTO app_state VALUES ('cf_api_url', 'http://x');
      CREATE TABLE commander_card_stats (id INTEGER PRIMARY KEY, commander_name TEXT, card_name TEXT);`);
    vi.stubGlobal('fetch', mockFetch());
  });

  it('roundLift keeps finite numbers, nulls the rest', () => {
    expect(roundLift(1.23456)).toBe(1.2346);
    expect(roundLift(null)).toBeNull();
    expect(roundLift(undefined)).toBeNull();
    expect(roundLift(NaN)).toBeNull();
  });

  it('writes lift into the swapped commander_card_stats table', async () => {
    const r = await syncCommanderStats({ minDecks: 1 });
    expect(r.ok).toBe(true);
    const rows = testDb.prepare('SELECT card_name, lift FROM commander_card_stats ORDER BY card_name').all() as { card_name: string; lift: number | null }[];
    expect(rows).toHaveLength(12);
    expect(rows.find((x) => x.card_name === 'Card 0')?.lift).toBe(1.2346);
    expect(rows.find((x) => x.card_name === 'Card 1')?.lift).toBeNull();
    expect(rows.find((x) => x.card_name === 'Card 2')?.lift).toBeNull();
  }, 15000);
});
