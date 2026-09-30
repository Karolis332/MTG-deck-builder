import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// `@/lib/db` resolves its data directory once at import — scratch dir first.
const DIR = path.join(process.cwd(), 'data', 'test-superfriends-optimizer-adds');
process.env.MTG_DB_DIR = DIR;
type DbLib = typeof import('@/lib/db');
type AiSuggestLib = typeof import('@/lib/ai-suggest');

// U7 step 2.3 regression: a 5-color superfriends commander (Tam, the
// Possibility-shaped: planeswalker text + a WUBRG activation cost) matches
// BOTH the 'planeswalker' and 'five_colors' trigger categories. The
// commander-synergy add block must only pull walker/proliferate/loyalty
// cards — not every generic mana-fixing staple the five_colors patterns
// also match (which is what profile.cardPoolPatterns, the union of every
// matched category's patterns, would return).
const SUPERFRIENDS_5C_ORACLE =
  'Planeswalker spells you cast cost {1} less to cast.\n{W}{U}{B}{R}{G}, {T}: Proliferate X times, where X is the number of planeswalker types among planeswalkers you control.';

describe('getRuleBasedSuggestions — superfriends synergy adds stay on-plan', () => {
  let db: DbLib;
  let aiSuggest: AiSuggestLib;

  beforeAll(async () => {
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });
    db = await import('@/lib/db');
    expect(db.getDataDir()).toBe(DIR); // hard stop: never touch the real DB
    aiSuggest = await import('@/lib/ai-suggest');

    const d = db.getDb();
    const legal = JSON.stringify({ brawl: 'legal', commander: 'legal' });
    const insert = d.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, mana_cost, type_line, oracle_text, color_identity, colors, legalities,
                         set_code, set_name, collector_number, rarity, edhrec_rank, game_changer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tst', 'Test Set', '1', 'common', ?, 0)
    `);
    const add = (name: string, cmc: number, cost: string, type: string, text: string, ci: string[], rank = 1000) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      insert.run(id, `o-${id}`, name, cmc, cost, type, text, JSON.stringify(ci), JSON.stringify(ci), legal, rank);
    };

    add('Test 5c Superfriends Commander', 4, '{W}{U}{B}{R}{G}', 'Legendary Creature — Human Wizard', SUPERFRIENDS_5C_ORACLE, ['W', 'U', 'B', 'R', 'G']);
    // A generic 5-color fixer — matches five_colors' "mana of any color"
    // pattern, must NOT be suggested with a planeswalker-plan reason.
    add('Test Rainbow Dork', 1, '{G}', 'Creature — Bird', '{T}: Add one mana of any color.', ['W', 'U', 'B', 'R', 'G'], 50);
    // A real walker + a proliferate support card — these SHOULD surface.
    add('Test New Walker', 3, '{2}{W}', 'Legendary Planeswalker — Test', '+1: Do a thing.\n-2: Do a bigger thing.', ['W'], 5000);
    add('Test Proliferate Support', 2, '{1}{U}', 'Sorcery', 'Proliferate.', ['U'], 6000);

    d.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (999905, 'sf-add-test', 'sfadd@test.local', 'x')`).run();
  }, 60_000);

  afterAll(() => {
    db.getDb().close();
    fs.rmSync(DIR, { recursive: true, force: true });
  });

  it('only suggests walkers/proliferate/loyalty cards under the planeswalker-plan reason, not generic five-color fixers', () => {
    const d = db.getDb();
    const commanderRow = d.prepare('SELECT * FROM cards WHERE name = ?').get('Test 5c Superfriends Commander') as any;
    const suggestions = aiSuggest.getRuleBasedSuggestions([], 'brawl', undefined, {
      oracleText: commanderRow.oracle_text,
      typeLine: commanderRow.type_line,
      colorIdentity: ['W', 'U', 'B', 'R', 'G'],
    });
    const byName = new Map(suggestions.map((s) => [s.card.name, s]));
    expect(byName.has('Test New Walker')).toBe(true);
    expect(byName.has('Test Proliferate Support')).toBe(true);
    // The generic fixer may still appear via other sections (land/removal),
    // but never with the planeswalker-plan reason.
    const rainbowDork = byName.get('Test Rainbow Dork');
    if (rainbowDork) {
      expect(rainbowDork.reason).not.toMatch(/planeswalker|superfriends/i);
    }
  });
});
