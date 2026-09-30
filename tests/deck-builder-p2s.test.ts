import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Offline: EDHREC is a per-commander stub (P2-S #4/#5 need real-shaped entries), CF is empty.
const { EDHREC } = vi.hoisted(() => ({
  EDHREC: {} as Record<string, { topCards: Array<{ name: string; synergy: number; inclusion: number }>; themes: string[] }>,
}));
vi.mock('../src/lib/edhrec', async (orig) => ({
  ...(await orig<typeof import('../src/lib/edhrec')>()),
  getEdhrecRecommendations: async (name: string) => EDHREC[name] ?? null,
  getEdhrecThemeCards: async () => null,
}));
vi.mock('../src/lib/cf-api-client', async (orig) => ({
  ...(await orig<typeof import('../src/lib/cf-api-client')>()),
  getCFRecommendations: async () => [],
}));

// `@/lib/db` resolves its data directory once at import — scratch dir first.
const DIR = path.join(process.cwd(), 'data', 'test-deck-builder-p2s');
process.env.MTG_DB_DIR = DIR;
type DbLib = typeof import('@/lib/db');
type BuilderLib = typeof import('@/lib/deck-builder-ai');

const ANY_COLOR = "{T}: Add one mana of any color in your commander's color identity.";
const HENGE = 'This spell costs {X} less to cast, where X is the greatest power among creatures you control.\n{T}: Add {G}{G}. You gain 2 life.\nWhenever a nontoken creature you control enters, put a +1/+1 counter on it and draw a card.';
const ARENA = 'At the beginning of your upkeep, you lose 1 life and draw a card.';
const ORACLE = 'When this creature enters, look at the top X cards of your library, where X is your devotion to blue. Put up to one of them on top of your library and the rest on the bottom of your library in a random order. If X is greater than or equal to the number of cards in your library, you win the game.';
const CONSULTATION = 'Choose a card name. Exile the top six cards of your library, then reveal cards from the top of your library until you reveal a card with the chosen name. Put that card into your hand and exile all other cards revealed this way.';

describe('autoBuildDeck — P2-S scoring regressions (synthetic DB)', () => {
  let db: DbLib;
  let builder: BuilderLib;

  beforeAll(async () => {
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR, { recursive: true });
    db = await import('@/lib/db');
    expect(db.getDataDir()).toBe(DIR); // hard stop: never touch the real DB
    builder = await import('@/lib/deck-builder-ai');

    const d = db.getDb();
    const legal = JSON.stringify({ commander: 'legal', brawl: 'legal' });
    const insert = d.prepare(`
      INSERT INTO cards (id, oracle_id, name, cmc, mana_cost, type_line, oracle_text, color_identity, colors, legalities,
                         set_code, set_name, collector_number, rarity, edhrec_rank, subtypes, keywords, game_changer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tst', 'Test Set', '1', 'common', ?, ?, ?, 0)
    `);
    const add = (name: string, cmc: number, cost: string, type: string, text: string, ci: string[], o: { rank?: number | null; subtypes?: string[]; keywords?: string[] } = {}) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      insert.run(id, `o-${id}`, name, cmc, cost, type, text, JSON.stringify(ci), JSON.stringify(ci), legal,
        o.rank === undefined ? 1000 : o.rank, o.subtypes ? JSON.stringify(o.subtypes) : null, JSON.stringify(o.keywords ?? []));
    };

    for (const [n, c] of [['Plains', 'W'], ['Island', 'U'], ['Swamp', 'B'], ['Mountain', 'R'], ['Forest', 'G']]) {
      add(n, 0, '', `Basic Land — ${n}`, `({T}: Add {${c}}.)`, [c]);
    }
    // Colourless role flood, rank 50: outranks every staple below on the generic signals alone.
    for (let i = 1; i <= 20; i++) add(`Test Rock ${i}`, 2, '{2}', 'Artifact', '{T}: Add {C}.', [], { rank: 50 });
    for (let i = 1; i <= 18; i++) add(`Test Divination ${i}`, 3, '{3}', 'Sorcery', 'Draw two cards.', [], { rank: 50 });
    for (let i = 1; i <= 16; i++) add(`Test Kill ${i}`, 2, '{2}', 'Instant', 'Destroy target creature.', [], { rank: 50 });
    for (let i = 1; i <= 4; i++) add(`Test Wrath ${i}`, 4, '{4}', 'Sorcery', 'Destroy all creatures.', [], { rank: 50 });
    for (let i = 1; i <= 6; i++) add(`Test Veil ${i}`, 1, '{1}', 'Instant', 'Creatures you control gain hexproof and indestructible until end of turn.', [], { rank: 50 });
    for (let i = 1; i <= 8; i++) add(`Test Tutor ${i}`, 2, '{2}', 'Sorcery', 'Search your library for a card, put it into your hand, then shuffle.', [], { rank: 50 });
    for (let i = 1; i <= 6; i++) add(`Test Flyer ${i}`, 7, '{7}', 'Creature — Dragon', 'Flying, trample\nWhenever this creature deals combat damage to a player, that player loses the game.', [], { rank: 50, subtypes: ['Dragon'] });

    // #4 — an EDHREC entry (synergy 0, inclusion .4) versus the plain rank-100 twin.
    add('Test Four Cmdr', 3, '{2}{B}', 'Legendary Creature — Zombie', 'Menace', ['B'], { subtypes: ['Zombie'] });
    add('Test Signet Staple', 2, '{2}', 'Artifact', ANY_COLOR, [], { rank: 100 });
    add('Test Signet Plain', 2, '{2}', 'Artifact', ANY_COLOR, [], { rank: 100 });
    EDHREC['Test Four Cmdr'] = { topCards: [{ name: 'Test Signet Staple', synergy: 0, inclusion: 0.4 }], themes: [] };

    // #5 — vampire tribal with the EDHREC "Tokens" theme.
    add('Test Vampire Lord', 4, '{2}{B}{B}', 'Legendary Creature — Vampire Noble', 'Other Vampires you control get +1/+1.\nWhenever you cast another Vampire spell, create a 1/1 black Vampire creature token with lifelink.', ['B'], { subtypes: ['Vampire', 'Noble'] });
    for (let i = 1; i <= 12; i++) add(`Test Vampire ${i}`, 3, '{2}{B}', 'Creature — Vampire', 'Lifelink', ['B'], { subtypes: ['Vampire'] });
    add('Test Vampire Maker', 3, '{2}{B}', 'Sorcery', 'Create a 1/1 black Vampire creature token with lifelink.', ['B']);
    add('Test Thopter Maker', 3, '{3}', 'Sorcery', 'Create a 1/1 colorless Thopter artifact creature token with flying.', []);
    add('Test Procession', 4, '{3}{W}', 'Enchantment', 'If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.', []);
    EDHREC['Test Vampire Lord'] = { topCards: [], themes: ['Tokens'] };

    // #8 — a creature-gated engine and an upkeep engine.
    add('Test Walker Cmdr', 4, '{2}{B}{G}', 'Legendary Creature — Elf Warlock', 'Flying', ['B', 'G'], { subtypes: ['Elf', 'Warlock'] });
    add('Test Henge', 9, '{7}{G}{G}', 'Legendary Artifact', HENGE, ['G'], { rank: 200 });
    add('Test Arena', 3, '{1}{B}{B}', 'Enchantment', ARENA, ['B'], { rank: 200 });
    add('Test Way', 2, '{1}{B}', 'Legendary Enchantment', 'When this enchantment enters, empower Jace 2. (Put two loyalty counters on a Jace token you control.)\nWhenever a creature you control dies, put a loyalty counter on each planeswalker you control.', ['B'], { rank: 200 });

    // #3 — cEDH-tier staples (names seeded by migration 46 in cedh_staples) at a lower rank than the flood.
    add('Test Combo Cmdr', 3, '{1}{U}{B}', 'Legendary Creature — Human Wizard', 'Flying', ['U', 'B'], { subtypes: ['Human', 'Wizard'] });
    add('Sol Ring', 1, '{1}', 'Artifact', '{T}: Add {C}{C}.', [], { rank: 600 });
    add('Mana Crypt', 0, '{0}', 'Artifact', 'At the beginning of your upkeep, flip a coin. If you lose the flip, Mana Crypt deals 3 damage to you.\n{T}: Add {C}{C}.', [], { rank: 600 });
    add('Chrome Mox', 0, '{0}', 'Artifact', 'Imprint — When this artifact enters, you may exile a nonartifact, nonland card from your hand.\n{T}: Add one mana of any of the exiled card\'s colors.', [], { rank: 600 });
    add('Mana Vault', 1, '{1}', 'Artifact', 'Mana Vault doesn\'t untap during your untap step.\n{4}: Untap Mana Vault.\n{T}: Add {C}{C}{C}.', [], { rank: 600 });
    add('Lotus Petal', 0, '{0}', 'Artifact', '{T}, Sacrifice this artifact: Add one mana of any color.', [], { rank: 600 });
    add('Dark Ritual', 1, '{B}', 'Instant', 'Add {B}{B}{B}.', ['B'], { rank: 600 });
    add("Thassa's Oracle", 2, '{U}{U}', 'Creature — Merfolk Wizard', ORACLE, ['U'], { rank: 600, subtypes: ['Merfolk', 'Wizard'] });
    add('Demonic Consultation', 1, '{B}', 'Instant', CONSULTATION, ['B'], { rank: 900 });
    add('Pact of Negation', 0, '{0}', 'Instant', 'Counter target spell.\nAt the beginning of your next upkeep, pay {3}{U}{U}. If you don\'t, you lose the game.', ['U'], { rank: 600 });
    add('Force of Will', 5, '{3}{U}{U}', 'Instant', 'You may pay 1 life and exile a blue card from your hand rather than pay this spell\'s mana cost.\nCounter target spell.', ['U'], { rank: 600 });
    add('Flusterstorm', 1, '{U}', 'Instant', 'Counter target instant or sorcery spell unless its controller pays {1}.\nStorm', ['U'], { rank: 600 });
    add('Demonic Tutor', 2, '{1}{B}', 'Sorcery', 'Search your library for a card, put that card into your hand, then shuffle.', ['B'], { rank: 600 });
  }, 60_000);

  afterAll(() => {
    db.getDb().close();
    fs.rmSync(DIR, { recursive: true, force: true });
  });

  const compsOf = async (commanderName: string, strategy?: string) => {
    const res = await builder.buildScoredCandidatePool({ format: 'commander', colors: [], commanderName, captureComponents: true, ...(strategy ? { strategy } : {}) });
    return (name: string) => res.componentsByName?.get(name) ?? {};
  };

  it('#4: an EDHREC entry never scores below the global-rank fallback its twin gets', async () => {
    const comp = await compsOf('Test Four Cmdr');
    const staple = comp('Test Signet Staple');
    const plain = comp('Test Signet Plain');
    expect(plain.globalRank).toBeCloseTo(49.75, 2);
    expect((staple.edhrec ?? 0) + (staple.globalRank ?? 0)).toBeGreaterThanOrEqual(plain.globalRank);
  }, 60_000);

  it('#5: in a tribal build the tokens theme rewards a token maker only when it makes the tribe', async () => {
    const comp = await compsOf('Test Vampire Lord');
    expect(comp('Test Vampire Maker').theme ?? 0).toBeGreaterThanOrEqual(15);
    expect(comp('Test Procession').theme ?? 0).toBeGreaterThanOrEqual(15); // a token payoff, not a maker
    expect(comp('Test Thopter Maker').theme ?? 0).toBe(0);
    expect(comp('Test Thopter Maker').profileSynergy ?? 0).toBe(0);
  }, 60_000);

  it('#8: a creature-gated engine gets no engine bonus in a creature-light template', async () => {
    const sf = await compsOf('Test Walker Cmdr', 'superfriends');
    expect(sf('Test Arena').drawEngine).toBe(28);
    expect(sf('Test Henge').drawEngine).toBeUndefined();
    expect(sf('Test Henge').creatureGate).toBeLessThan(0);
    // A superfriends loyalty engine (a Way) reads 'whenever a creature you control dies' too — it is the plan, never gated.
    expect(sf('Test Way').creatureGate).toBeUndefined();
    const mid = await compsOf('Test Walker Cmdr', 'midrange');
    expect(mid('Test Henge').drawEngine).toBe(28);
    expect(mid('Test Henge').creatureGate).toBeUndefined();
  }, 60_000);

  it('#3: a combo shell seats cEDH staples before the role quotas and taxes the top end', async () => {
    const r = await builder.autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Test Combo Cmdr', strategy: 'combo', captureComponents: true });
    expect(r.strategy).toBe('combo');
    const names = new Set(r.cards.filter((e) => e.board === 'main').map((e) => e.card.name));
    for (const n of ["Thassa's Oracle", 'Demonic Consultation', 'Pact of Negation', 'Force of Will', 'Chrome Mox', 'Lotus Petal', 'Mana Crypt', 'Demonic Tutor']) {
      expect(names.has(n), n).toBe(true);
    }
    expect((r.reasoning ?? []).filter((x) => x.role === 'combo-staple').length).toBeGreaterThanOrEqual(8);
    const comp = r.scoredPool!.find((p) => p.name === 'Test Flyer 1')!.components;
    expect(comp.strategyFit ?? 0).toBeLessThanOrEqual(-40);
    expect(r.cards.filter((e) => e.board === 'main' && e.card.name.startsWith('Test Flyer')).length).toBeLessThanOrEqual(1);
  }, 60_000);
});
