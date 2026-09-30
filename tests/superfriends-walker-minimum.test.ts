import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

import { vi } from 'vitest';

// Offline: no live EDHREC / CF calls from autoBuildDeck.
vi.mock('../src/lib/edhrec', async (orig) => ({
  ...(await orig<typeof import('../src/lib/edhrec')>()),
  getEdhrecRecommendations: async () => null,
  getEdhrecThemeCards: async () => null,
}));
vi.mock('../src/lib/cf-api-client', async (orig) => ({
  ...(await orig<typeof import('../src/lib/cf-api-client')>()),
  getCFRecommendations: async () => [],
}));

// `@/lib/db` resolves its data directory once at import — scratch dir first.
const DIR = path.join(process.cwd(), 'data', 'test-superfriends-walker-min');
process.env.MTG_DB_DIR = DIR;
type DbLib = typeof import('@/lib/db');
type BuilderLib = typeof import('@/lib/deck-builder-ai');

const UID = 999904;

// U6b: the builder detects a superfriends commander (506bd23) but shipped
// only whatever walkers scored well generically (Tam: 3 of a 12-22 band).
// This is the walker-count floor, mirroring the tribal minimum backfill.
const SUPERFRIENDS_ORACLE =
  'You may activate loyalty abilities of planeswalkers you control an additional time each turn.\nWhenever a planeswalker you control is dealt damage, proliferate.';

describe('autoBuildDeck — superfriends walker minimum backfill', () => {
  let db: DbLib;
  let builder: BuilderLib;

  beforeAll(async () => {
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });
    db = await import('@/lib/db');
    expect(db.getDataDir()).toBe(DIR); // hard stop: never touch the real DB
    builder = await import('@/lib/deck-builder-ai');

    const d = db.getDb();
    const legal = JSON.stringify({ commander: 'legal' });
    const insert = d.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, mana_cost, type_line, oracle_text, color_identity, colors, legalities,
                         set_code, set_name, collector_number, rarity, edhrec_rank, game_changer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tst', 'Test Set', '1', 'common', ?, 0)
    `);
    const add = (name: string, cmc: number, cost: string, type: string, text: string, ci: string[], rank = 1000) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      insert.run(id, `o-${id}`, name, cmc, cost, type, text, JSON.stringify(ci), JSON.stringify(ci), legal, rank);
    };

    add('Test Superfriends Commander', 4, '{2}{W}{U}', 'Legendary Creature — Human Wizard', SUPERFRIENDS_ORACLE, ['W', 'U']);
    // Mono-blue: none of the (white) test walkers are in its colour identity,
    // so it cannot reach the 12-walker floor regardless of the opt-in gate —
    // this isolates "does the backfill run" from "does the pool happen to
    // score walkers well", which a same-identity vanilla commander would not.
    add('Test Vanilla Commander', 3, '{2}{U}', 'Legendary Creature — Human Wizard', 'Vigilance', ['U']);

    // 25 distinct planeswalkers, mixed types, ordinary "+1/-2/-7" loyalty
    // text (no literal "loyalty ability"/"proliferate" — so Step 4b's
    // SYNERGY_REQUIREMENTS_MAP text match never picks them up; only a real
    // type-based floor does) and a deliberately WORSE edhrec_rank than the
    // filler creatures below, so natural scoring alone favors the fillers —
    // only the dedicated walker-floor backfill can push the count to 12.
    const types = ['Jace', 'Chandra', 'Gideon', 'Elspeth', 'Liliana', 'Ajani', 'Nissa', 'Teferi', 'Sorin', 'Vraska',
      'Kiora', 'Ral', 'Domri', 'Tibalt', 'Dovin', 'Nahiri', 'Saheeli', 'Huatli', 'Angrath', 'Wrenn',
      'Basri', 'Calix', 'Rowan', 'Will', 'Bahamut'];
    types.forEach((t, i) => {
      add(`Test Walker ${t}`, 3 + (i % 4), '{2}{W}', `Legendary Planeswalker — ${t}`,
        '+1: Do a small thing.\n-2: Do a bigger thing.', ['W'], 5000 + i);
    });

    for (let i = 1; i <= 10; i++) add(`Test Removal ${i}`, 2, '{1}{W}', 'Instant', 'Destroy target creature.', ['W']);
    for (let i = 1; i <= 4; i++) add(`Test Wrath ${i}`, 4, '{2}{W}{W}', 'Sorcery', 'Destroy all creatures.', ['W']);
    for (let i = 1; i <= 10; i++) add(`Test Rock ${i}`, 2, '{2}', 'Artifact', '{T}: Add {W}.', []);
    // Filler creatures deliberately outscore the walkers (better rank, real
    // ETB card draw) so the pre-fix build fills its nonland slots with these
    // instead of walkers.
    for (let i = 1; i <= 40; i++) {
      add(`Test Filler ${i}`, 3, '{2}{W}', 'Creature — Human Soldier',
        'When this creature enters, draw a card.', ['W'], 200 + i);
    }
    add('Plains', 0, '', 'Basic Land — Plains', '({T}: Add {W}.)', ['W']);
    add('Island', 0, '', 'Basic Land — Island', '({T}: Add {U}.)', ['U']);

    d.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, 'sf-wm-test', 'sfwm@test.local', 'x')`).run(UID);
  }, 60_000);

  afterAll(() => {
    db.getDb().close();
    fs.rmSync(DIR, { recursive: true, force: true });
  });

  it('a superfriends commander with 25 walkers in the pool ships at least 12 walkers, without cutting removal/wipes', async () => {
    const r = await builder.autoBuildDeck({
      format: 'commander', colors: [], commanderName: 'Test Superfriends Commander',
    });
    expect(r.strategy).toBe('superfriends');
    const main = r.cards.filter((e) => e.board === 'main');
    const walkerCount = main
      .filter((e) => (e.card.type_line || '').includes('Planeswalker'))
      .reduce((s, e) => s + e.quantity, 0);
    expect(walkerCount).toBeGreaterThanOrEqual(12);
    const distinctTypes = new Set(
      main.filter((e) => (e.card.type_line || '').includes('Planeswalker')).map((e) => e.card.name)
    ).size;
    expect(distinctTypes).toBeGreaterThanOrEqual(12);
    // Board wipes and spot removal must survive the walker backfill.
    expect(main.filter((e) => e.card.name.startsWith('Test Wrath')).length).toBeGreaterThan(0);
    expect(main.filter((e) => e.card.name.startsWith('Test Removal')).length).toBeGreaterThan(0);
  }, 60_000);

  it('a non-superfriends commander does not trigger the walker floor even with walkers in the pool', async () => {
    const r = await builder.autoBuildDeck({
      format: 'commander', colors: [], commanderName: 'Test Vanilla Commander',
    });
    expect(r.strategy).not.toBe('superfriends');
    const main = r.cards.filter((e) => e.board === 'main');
    const walkerCount = main
      .filter((e) => (e.card.type_line || '').includes('Planeswalker'))
      .reduce((s, e) => s + e.quantity, 0);
    // Not forced to the 12-walker floor — whatever score naturally picked, if any.
    expect(walkerCount).toBeLessThan(12);
  }, 60_000);
});
