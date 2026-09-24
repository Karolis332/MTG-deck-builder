import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

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
const DIR = path.join(process.cwd(), 'data', 'test-collection-synergy-min');
process.env.MTG_DB_DIR = DIR;
type DbLib = typeof import('@/lib/db');
type BuilderLib = typeof import('@/lib/deck-builder-ai');

const UID = 999901;
const RODOLF_ORACLE = 'Flying, deathtouch, lifelink\nWhenever you gain life, Rodolf Duskbringer gains indestructible until end of turn.\nAt the beginning of your end step, you may pay {1}{W/B}. When you do, return target creature card with mana value X or less from your graveyard to the battlefield, where X is the amount of life you gained this turn.';

// Regression 2026-09-24 (Rodolf Duskbringer, 2,577-card ManaBox collection →
// 6 spells + 74 basics): since the craft-list change the scored pool holds
// UNOWNED cards too, and the synergy-minimum swap (Step 4b) removed a pick
// before learning the unowned candidate could not be added — one owned card
// lost per unowned lifegain/graveyard candidate.
describe('autoBuildDeck collection mode — synergy minimums never swap in unowned cards', () => {
  let db: DbLib;
  let builder: BuilderLib;
  const owned = new Set<string>();

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
                         set_code, set_name, collector_number, rarity, edhrec_rank)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tst', 'Test Set', '1', 'common', ?)
    `);
    const add = (name: string, cmc: number, cost: string, type: string, text: string, ci: string[], isOwned: boolean) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      insert.run(id, `o-${id}`, name, cmc, cost, type, text, JSON.stringify(ci), JSON.stringify(ci), legal, 1000);
      if (isOwned) owned.add(name);
    };

    add('Rodolf Duskbringer', 6, '{5}{B}', 'Legendary Creature — Vampire Soldier', RODOLF_ORACLE, ['B', 'W'], true);
    add('Plains', 0, '', 'Basic Land — Plains', '({T}: Add {W}.)', ['W'], false);
    add('Swamp', 0, '', 'Basic Land — Swamp', '({T}: Add {B}.)', ['B'], false);
    for (let i = 1; i <= 6; i++) add(`Test Rock ${i}`, 2, '{2}', 'Artifact', '{T}: Add {B}.', [], true);
    for (let i = 1; i <= 18; i++) add(`Test Insight ${i}`, 3, '{2}{B}', 'Sorcery', 'Draw two cards.', ['B'], true);
    for (let i = 1; i <= 18; i++) add(`Test Doom ${i}`, 2, '{1}{B}', 'Instant', 'Destroy target creature.', ['B'], true);
    for (let i = 1; i <= 4; i++) add(`Test Wrath ${i}`, 4, '{2}{W}{W}', 'Sorcery', 'Destroy all creatures.', ['W'], true);
    // Unowned: every one matches the commander's lifegain/graveyard minimums.
    for (let i = 1; i <= 40; i++) {
      add(`Test Lifebinder ${i}`, 2, '{1}{W}', 'Creature — Human Cleric', 'Lifelink\nWhen this creature enters, you gain 3 life and return target creature card from your graveyard to your hand.', ['W'], false);
    }

    d.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, 'coll-test', 'coll@test.local', 'x')`).run(UID);
    const col = d.prepare("INSERT INTO collection (user_id, card_id, quantity, source) VALUES (?, ?, 1, 'test')");
    for (const name of owned) {
      col.run(UID, (d.prepare('SELECT id FROM cards WHERE name = ?').get(name) as { id: string }).id);
    }
  }, 60_000);

  afterAll(() => {
    db.getDb().close();
    fs.rmSync(DIR, { recursive: true, force: true });
  });

  it('keeps the owned spells and ships only owned cards or basics', async () => {
    const r = await builder.autoBuildDeck({
      format: 'commander', colors: [], commanderName: 'Rodolf Duskbringer', useCollection: true, userId: UID,
    });
    const main = r.cards.filter((e) => e.board === 'main');
    const nonland = main.filter((e) => !(e.card.type_line || '').includes('Land'));
    expect(main.filter((e) => !owned.has(e.card.name) && !/^Basic Land/.test(e.card.type_line || ''))).toEqual([]);
    // 46 owned spells in the fixture; before the fix the swap drained them all.
    expect(nonland.length).toBeGreaterThanOrEqual(40);
  }, 60_000);
});
