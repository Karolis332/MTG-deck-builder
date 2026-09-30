import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Offline: no live EDHREC / CF calls.
vi.mock('../src/lib/edhrec', async (orig) => ({
  ...(await orig<typeof import('../src/lib/edhrec')>()),
  getEdhrecRecommendations: async () => null,
  getEdhrecThemeCards: async () => null,
}));
vi.mock('../src/lib/cf-api-client', async (orig) => ({
  ...(await orig<typeof import('../src/lib/cf-api-client')>()),
  getCFRecommendations: async () => [],
}));

const DIR = path.join(process.cwd(), 'data', 'test-price-cap-pool');
process.env.MTG_DB_DIR = DIR;
type DbLib = typeof import('@/lib/db');
type BuilderLib = typeof import('@/lib/deck-builder-ai');

const UID = 999903;

// U8b regression: an unowned unpriced card (no printing has a nonfoil/foil/etched
// USD) entering a maxDeckPrice pool gets counted as $0, making the budget fiction.
describe('buildScoredCandidatePool — unpriced cards under a deck budget', () => {
  let db: DbLib;
  let builder: BuilderLib;

  beforeAll(async () => {
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });
    db = await import('@/lib/db');
    expect(db.getDataDir()).toBe(DIR);
    builder = await import('@/lib/deck-builder-ai');

    const d = db.getDb();
    const legal = JSON.stringify({ commander: 'legal' });
    const insert = d.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, mana_cost, type_line, oracle_text, color_identity, colors, legalities,
                         set_code, set_name, collector_number, rarity, edhrec_rank, price_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tst', 'Test Set', '1', 'common', ?, ?)
    `);
    const add = (name: string, price: string | null) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      insert.run(id, `o-${id}`, name, 2, '{1}{R}', 'Creature — Test', '', JSON.stringify(['R']), JSON.stringify(['R']), legal, 1000, price);
    };

    add('Test Commander', null);
    add('Priced Unowned', '3.00');
    add('Unpriced Unowned', null);
    add('Unpriced Owned', null);

    d.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, 'price-test', 'price@test.local', 'x')`).run(UID);
    d.prepare("INSERT INTO collection (user_id, card_id, quantity, source) VALUES (?, ?, 1, 'test')")
      .run(UID, (d.prepare('SELECT id FROM cards WHERE name = ?').get('Unpriced Owned') as { id: string }).id);
  }, 60_000);

  afterAll(() => {
    db.getDb().close();
    fs.rmSync(DIR, { recursive: true, force: true });
  });

  it('excludes an unowned unpriced card once maxDeckPrice alone is set', async () => {
    const r = await builder.buildScoredCandidatePool({
      format: 'commander', colors: ['R'], commanderName: 'Test Commander', maxDeckPrice: 150,
    });
    const names = r.pool.map((p) => p.card.name);
    expect(names).toContain('Priced Unowned');
    expect(names).not.toContain('Unpriced Unowned');
    expect(r.priceCapExcluded).toBeGreaterThanOrEqual(1);
  });

  it('keeps an owned unpriced card even under maxDeckPrice', async () => {
    const r = await builder.buildScoredCandidatePool({
      format: 'commander', colors: ['R'], commanderName: 'Test Commander', maxDeckPrice: 150,
      useCollection: true, userId: UID,
    });
    expect(r.pool.map((p) => p.card.name)).toContain('Unpriced Owned');
  });

  it('no cap at all: unpriced cards stay eligible', async () => {
    const r = await builder.buildScoredCandidatePool({
      format: 'commander', colors: ['R'], commanderName: 'Test Commander',
    });
    expect(r.pool.map((p) => p.card.name)).toContain('Unpriced Unowned');
  });
});
