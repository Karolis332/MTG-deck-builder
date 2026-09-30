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
const DIR = path.join(process.cwd(), 'data', 'test-deck-builder-p1');
process.env.MTG_DB_DIR = DIR;
type DbLib = typeof import('@/lib/db');
type BuilderLib = typeof import('@/lib/deck-builder-ai');
type AnalysisLib = typeof import('@/lib/commander-analysis');

const UID = 999911;
// Real oracle text (card DB 2026-09-30).
const AEVE = 'Storm (When you cast this spell, copy it for each spell cast before it this turn. Copies become tokens.)\nAeve isn\'t legendary if it\'s a token.\nAeve enters with a +1/+1 counter on it for each other Ooze you control.';
const KARN = 'Karn\'s power and toughness are each equal to the greatest mana value among artifacts you control.\nAt the beginning of your upkeep, add {C} for each artifact you control. This mana can\'t be spent to cast nonartifact spells. Until end of turn, you don\'t lose this mana as steps and phases end.';
const SLIME = 'Create a 0/0 green Ooze creature token with trample. Put X +1/+1 counters on it, where X is two plus the total number of cards you own in exile and in your graveyard that are Oozes or are named Slime Against Humanity.\nA deck can have any number of cards named Slime Against Humanity.';
const HOOF = 'Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.';
const RAMP = 'Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.';

describe('autoBuildDeck — P1 pick pipeline (synthetic DB)', () => {
  let db: DbLib;
  let builder: BuilderLib;
  let analysis: AnalysisLib;

  beforeAll(async () => {
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });
    db = await import('@/lib/db');
    expect(db.getDataDir()).toBe(DIR); // hard stop: never touch the real DB
    builder = await import('@/lib/deck-builder-ai');
    analysis = await import('@/lib/commander-analysis');

    const d = db.getDb();
    const legal = JSON.stringify({ commander: 'legal', brawl: 'legal' });
    const insert = d.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, mana_cost, type_line, oracle_text, color_identity, colors, legalities,
                         set_code, set_name, collector_number, rarity, edhrec_rank, subtypes, keywords, game_changer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tst', 'Test Set', '1', 'common', ?, ?, ?, 0)
    `);
    d.prepare(`INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, 'p1-test', 'p1@test.local', 'x')`).run(UID);
    const col = d.prepare("INSERT INTO collection (user_id, card_id, quantity, source) VALUES (?, ?, ?, 'arena')");
    const add = (name: string, cmc: number, cost: string, type: string, text: string, ci: string[], o: { rank?: number | null; owned?: number; subtypes?: string[]; keywords?: string[] } = {}) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      insert.run(id, `o-${id}`, name, cmc, cost, type, text, JSON.stringify(ci), JSON.stringify(ci), legal,
        o.rank === undefined ? 1000 : o.rank, o.subtypes ? JSON.stringify(o.subtypes) : null, JSON.stringify(o.keywords ?? []));
      if (o.owned) col.run(UID, id, o.owned);
    };

    // ── Aeve (G, storm keyword, Ooze tribal) ──
    add('Aeve, Progenitor Ooze', 5, '{2}{G}{G}{G}', 'Legendary Creature — Ooze', AEVE, ['G'], { subtypes: ['Ooze'], keywords: ['Storm'], owned: 1 });
    add('Forest', 0, '', 'Basic Land — Forest', '({T}: Add {G}.)', ['G']);
    for (let i = 1; i <= 14; i++) add(`Test Ooze ${i}`, 3, '{2}{G}', 'Creature — Ooze', 'Trample', ['G'], { rank: 5000, subtypes: ['Ooze'], owned: 1 });
    add('Slime Against Humanity', 3, '{2}{G}', 'Sorcery', SLIME, ['G'], { rank: 3000, owned: 4 });
    add('Test Hoof', 8, '{5}{G}{G}{G}', 'Creature — Beast', HOOF, ['G'], { rank: 100, subtypes: ['Beast'], keywords: ['Haste'], owned: 1 });
    for (let i = 1; i <= 10; i++) add(`Test Grow ${i}`, 2, '{1}{G}', 'Sorcery', RAMP, ['G'], { owned: 1 });
    for (let i = 1; i <= 10; i++) add(`Test Harmonize ${i}`, 4, '{2}{G}{G}', 'Sorcery', 'Draw three cards.', ['G'], { owned: 1 });
    for (let i = 1; i <= 8; i++) add(`Test Bite ${i}`, 2, '{1}{G}', 'Instant', 'Destroy target creature.', ['G'], { owned: 1 });
    for (let i = 1; i <= 8; i++) add(`Test Filler ${i}`, 3, '{2}{G}', 'Creature — Elf', 'Vigilance', ['G'], { rank: 6000, owned: 1 });
    // No popularity signal at all, rank beyond the 18,000 quality-floor line (a new set's cards).
    add('Test Newset Walker', 4, '{3}{G}', 'Legendary Planeswalker — Test', '+1: Draw a card.\n−3: Destroy target creature.', ['G'], { rank: 25000, owned: 1 });
    add('Test Newset Unowned', 4, '{3}{G}', 'Legendary Planeswalker — Test', '+1: Draw a card.\n−3: Destroy target artifact.', ['G'], { rank: 25000 });

    // ── Karn (colourless) ──
    add('Karn, Legacy Reforged', 5, '{5}', 'Legendary Artifact Creature — Golem', KARN, [], { subtypes: ['Golem'] });
    add('Wastes', 0, '', 'Basic Land', '({T}: Add {C}.)', []);
    for (let i = 1; i <= 70; i++) add(`Test Cog ${i}`, 2, '{2}', 'Artifact', i % 3 === 0 ? '{T}: Add {C}.' : i % 3 === 1 ? '{T}, Sacrifice this artifact: Draw a card.' : 'Whenever another artifact enters, you gain 1 life.', []);

    // ── Cantrip gate (U) and collection substitutes (B) ──
    add('Test Commander Cantrip', 3, '{2}{U}', 'Legendary Creature — Merfolk Wizard', 'Flying', ['U']);
    add('Brainstorm', 1, '{U}', 'Instant', 'Draw three cards, then put two cards from your hand on top of your library in any order.', ['U']);
    add('Test Commander Sub', 3, '{2}{B}', 'Legendary Creature — Zombie', 'Menace', ['B']);
    add('Test Wrath Top', 4, '{2}{B}{B}', 'Sorcery', 'Destroy all creatures.', ['B']);
    add('Test Wrath Low', 5, '{3}{B}{B}', 'Sorcery', 'Destroy all creatures.', ['B'], { owned: 1 });
    add('Test Wrath High', 4, '{2}{B}{B}', 'Sorcery', 'Destroy all creatures. You gain 2 life.', ['B'], { owned: 1 });
    d.prepare(`INSERT INTO commander_card_stats (commander_name, card_name, inclusion_rate, avg_copies, synergy_score, deck_count, total_commander_decks)
               VALUES ('Test Commander Sub', 'Test Wrath Top', 0.6, 1, 0.3, 100, 100)`).run();
  }, 60_000);

  afterAll(() => {
    db.getDb().close();
    fs.rmSync(DIR, { recursive: true, force: true });
  });

  it('A-D5: an "any number of cards named" card ships at its owned quantity in a collection build', async () => {
    const r = await builder.autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Aeve, Progenitor Ooze', useCollection: true, userId: UID, collectionSource: 'arena' });
    const slime = r.cards.find((e) => e.board === 'main' && e.card.name === 'Slime Against Humanity');
    expect(slime?.quantity).toBe(4);
  }, 60_000);

  it('A-D9 / A-D10: no storm penalty on a tribal build; no quality-floor penalty on an owned card in a collection build', async () => {
    const r = await builder.autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Aeve, Progenitor Ooze', useCollection: true, userId: UID, collectionSource: 'arena', captureComponents: true });
    expect(r.strategy).toBe('tribal');
    const comp = (name: string) => r.scoredPool?.find((p) => p.name === name)?.components ?? {};
    expect(comp('Test Hoof').stormFit).toBeUndefined();
    expect(comp('Test Newset Walker').qualityFloor).toBeUndefined();
    expect(comp('Test Newset Unowned').qualityFloor).toBe(-35); // the floor still exists for unowned no-signal cards
  }, 60_000);

  it('P1 item 7: a colourless commander build reaches format size (Wastes fill the land base)', async () => {
    for (const format of ['commander', 'brawl'] as const) {
      const r = await builder.autoBuildDeck({ format, colors: [], commanderName: 'Karn, Legacy Reforged' });
      const main = r.cards.filter((e) => e.board === 'main');
      expect(main.reduce((s, e) => s + e.quantity, 0)).toBe(99);
      expect(main.find((e) => e.card.name === 'Wastes')?.quantity ?? 0).toBeGreaterThan(0);
    }
  }, 60_000);

  it('A-D11: one-shot cantrips enter the arsenal only for spellslinger builds', () => {
    const names = (strategy?: string) =>
      analysis.analyzeCommanderForBuild('Test Commander Cantrip', UID, 'commander', 120, undefined, strategy ? { strategy } : undefined)!
        .arsenal.map((a) => a.card.name);
    expect(names('spellslinger')).toContain('Brainstorm');
    expect(names('midrange')).not.toContain('Brainstorm');
    expect(names()).toContain('Brainstorm'); // legacy call: unchanged
  });

  it('A-D1: a collection substitute is the best-scored owned card of the role, above the floor', () => {
    const subs = (scoreOf: (n: string) => number, scoreFloor: number) =>
      analysis.analyzeCommanderForBuild('Test Commander Sub', UID, 'commander', 120, undefined, { scoreOf, scoreFloor })!
        .arsenal.filter((a) => a.reason === 'collection_substitute').map((a) => a.card.name);
    // Rows come back in id order (High before Low), so the legacy first-row pick is High: score must be what decides.
    expect(subs((n) => (n === 'Test Wrath Low' ? 90 : 10), 0)).toEqual(['Test Wrath Low']);
    expect(subs(() => 10, 50)).toEqual([]);
  });
});
