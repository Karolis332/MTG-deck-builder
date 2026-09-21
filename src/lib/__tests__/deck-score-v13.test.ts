/**
 * Deck Score v1.3 (docs/DECK_SCORE_SPEC.md §9 decision 3 + §9.6 step 1) —
 * producer utilisation replaces B, and the catalogue is evaluated one mode at
 * a time instead of as a union of every alternative mode's requirements.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, type DeckScoreInput } from '../deck-score';
import { computeSynergy } from '../deck-score-synergy';
import { selectPlan, evaluatePlan, recipeFor } from '../deck-score-plans';
import { producerUtilisation, CONSUMERS_FOR_FULL_USE } from '../deck-score-producers';
import { catalogFacts, catalogNames } from '../deck-score-catalog';
import { generateEntry, type GeneratableCard } from '../deck-score-catalog/generate';
import { deriveCardFeature } from '../deck-score-features';
import { FIXTURES } from '../../../scripts/deck-score-fixtures';
import type { DeckEntry } from '../deck-score-mana';

// Coverage round 1 tripled the catalogue shard (4,467 -> 14,909 entries), so
// every pile-building and catalogue-walking test in this file got ~3x slower
// and several landed within noise of vitest's 15 s default. Raised per file
// rather than per test: the work is corpus-sized, not hung.
vi.setConfig({ testTimeout: 120_000 });

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v13-${idCounter}-${overrides.name}`,
    oracle_id: `v13-oracle-${idCounter}`,
    mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: null,
    colors: '["G"]', color_identity: '["G"]', keywords: '[]',
    set_code: 'tst', set_name: 'Test Set', collector_number: String(idCounter), rarity: 'common',
    image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
    price_usd: null, price_usd_foil: null,
    legalities: '{"standard":"legal","commander":"legal","brawl":"legal","standardbrawl":"legal"}',
    power: '2', toughness: '2', loyalty: null, produced_mana: null, edhrec_rank: null,
    layout: 'normal', updated_at: '2024-01-01', subtypes: null, arena_id: null,
    ...overrides,
  };
}

type Row = { card: DbCard; quantity: number };

/** Synthetic cards carry no catalogue entry, so the §8 evidence gate would
 * give them zero on-plan credit. These suites test the PLAN and UTILISATION
 * layers; mark them covered, exactly as the v1.2 suite does. */
function entriesOf(cards: Row[]): DeckEntry[] {
  return cards.map((c) => ({ feature: { ...deriveCardFeature(c.card), covered: true, s: 1 }, quantity: c.quantity }));
}

function creatures(count: number, power: number, cmc: number, tag: string): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${power}p ${i}`, type_line: 'Creature — Bear',
      mana_cost: `{${cmc}}`, cmc, power: String(power), toughness: String(Math.max(1, power)),
    }),
    quantity: 1,
  }));
}

function removal(count: number, cmc: number, tag: string): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${cmc} ${i}`, type_line: 'Instant', oracle_text: 'Destroy target creature.',
      mana_cost: `{${cmc}}`, cmc, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function cantrips(count: number, tag: string): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Sorcery', oracle_text: 'Draw a card.',
      mana_cost: '{1}', cmc: 1, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

/** Only output is life: no body, no mana, no cards, no answers. */
function lifeGainer(count: number, tag = 'Healer'): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Enchantment', oracle_text: 'At the beginning of your upkeep, you gain 2 life.',
      mana_cost: '{1}{W}', cmc: 2, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

/** Only output is a life-gain conversion: it consumes, it does not produce. */
function lifePayoffs(count: number, tag = 'Sanguine'): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Enchantment', oracle_text: 'Whenever you gain life, each opponent loses 1 life.',
      mana_cost: '{2}{B}', cmc: 3, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function standardDeck(main: Row[]): DeckScoreInput {
  return { format: 'standard', main, commander: [], sideboard: [], unresolved: [], cardDataVersion: 'test-v13', corpus: null };
}

function gen(name: string, type_line: string, oracle_text: string, cmc = 2, mana_cost = '{2}'): GeneratableCard {
  return { name, mana_cost, cmc, type_line, oracle_text };
}

// ── §9.3 producer utilisation ─────────────────────────────────────────────

describe('producer utilisation (§9.3) — the term that replaced B', () => {
  it('is 0 for production no present consumer can use', () => {
    const rows = producerUtilisation(entriesOf(lifeGainer(4))).rows;
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.side).toBe('produces');
      expect(row.resource).toBe('life');
      expect(row.u).toBe(0);
      expect(row.servedOutput).toBe(0);
    }
  });

  it('is 1 once the deck carries the route that consumes it', () => {
    const util = producerUtilisation(entriesOf([...lifeGainer(4), ...lifePayoffs(CONSUMERS_FOR_FULL_USE)]));
    const produced = util.rows.filter((r) => r.side === 'produces');
    expect(produced.length).toBeGreaterThan(0);
    for (const row of produced) expect(row.u).toBe(1);
    expect(util.consumers.get('life')).toBeGreaterThanOrEqual(CONSUMERS_FOR_FULL_USE);
  });

  it('keeps Kuja-style creature tokens and Treasure at full credit with no payoff', () => {
    // §9.3: "Kuja's useful creature tokens and Treasure have direct
    // combat/mana uses and retain full credit without a token payoff."
    const tokens = mkCard({
      name: 'Token Engine', type_line: 'Enchantment', mana_cost: '{2}{R}', cmc: 3, power: null, toughness: null,
      oracle_text: 'At the beginning of combat on your turn, create a 1/1 red Goblin creature token.',
    });
    const treasure = mkCard({
      name: 'Coin Press', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, power: null, toughness: null,
      oracle_text: 'At the beginning of your end step, create a Treasure token.',
    });
    const deck = entriesOf([{ card: tokens, quantity: 6 }, { card: treasure, quantity: 6 }]);
    const util = producerUtilisation(deck);
    expect(util.of(deck[0].feature)).toBe(1);
    expect(util.of(deck[1].feature)).toBe(1);
    expect(util.rows).toHaveLength(0); // nothing charged: both reach a direct use
  });

  it('gives life-gain no engine credit without a life route, and full credit with one', () => {
    const spine = [...creatures(12, 3, 3, 'Beater'), ...removal(6, 2, 'Zap'), ...cantrips(6, 'Peek')];
    const starvedDeck = entriesOf([...spine, ...lifeGainer(10)]);
    const routedDeck = entriesOf([...spine, ...lifeGainer(10), ...lifePayoffs(4)]);
    expect(computeSynergy(null, 60, starvedDeck).U).toBe(0);
    expect(computeSynergy(null, 60, routedDeck).U).toBe(1);
    // The life sources are the same 10 copies in both lists. Only the route
    // differs, so any credit difference is utilisation, not composition.
    const starved = evaluatePlan(recipeFor('lifegain'), 60, starvedDeck);
    const routed = evaluatePlan(recipeFor('lifegain'), 60, routedDeck);
    expect(starved.roles.find((r) => r.role.key === 'gain')?.supply).toBe(0);
    expect(routed.roles.find((r) => r.role.key === 'gain')?.supply).toBeGreaterThan(0);
  });

  it('needs expendable bodies AND a death source before deaths are output', () => {
    // §9.3: "deaths require expendable bodies AND a death source, not a count
    // of death triggers."
    const outlet = mkCard({
      name: 'Altar', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, power: null, toughness: null,
      oracle_text: 'Sacrifice a creature: Scry 1.',
    });
    const noBodies = producerUtilisation(entriesOf([{ card: outlet, quantity: 4 }, ...lifePayoffs(4, 'Drain')]));
    const withBodies = producerUtilisation(entriesOf([
      { card: outlet, quantity: 4 }, ...lifePayoffs(4, 'Drain'), ...creatures(8, 1, 1, 'Chump'),
    ]));
    expect(noBodies.producers.get('creature death')).toBeGreaterThan(0);
    const stranded = noBodies.rows.find((r) => r.name === 'Altar');
    expect(stranded?.u).toBe(0);
    // Bodies alone are not the fix either — they are the second half of it.
    expect(withBodies.of(entriesOf([{ card: outlet, quantity: 1 }])[0].feature)).toBeGreaterThan(0);
  });

  it('is monotone under deletion: blanking payoffs never raises S, W or the total', () => {
    // §4's quota-gaming operation on a synthetic aristocrats list. This is
    // exactly the invariant B could not satisfy (§9.3): deleting the
    // worst-fed members of a mean RAISES it, and raised S with it.
    const outlet = mkCard({
      name: 'Carrion Feeder', type_line: 'Creature — Zombie', mana_cost: '{B}', cmc: 1, power: '1', toughness: '1',
      oracle_text: 'Sacrifice a creature: Put a +1/+1 counter on this creature.',
    });
    const payoff = mkCard({
      name: 'Blood Vendor', type_line: 'Creature — Vampire', mana_cost: '{1}{B}', cmc: 2, power: '1', toughness: '1',
      oracle_text: 'Whenever this creature or another creature dies, each opponent loses 1 life and you gain 1 life.',
    });
    const lands: Row[] = [{
      card: mkCard({ name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: null, cmc: 0, power: null, toughness: null }),
      quantity: 24,
    }];
    const main: Row[] = [
      { card: outlet, quantity: 4 }, { card: payoff, quantity: 6 },
      ...creatures(14, 2, 2, 'Fodder'), ...removal(6, 2, 'Zap'), ...cantrips(6, 'Peek'), ...lands,
    ];
    const blanked: Row[] = main.map((row) => (row.card.name === 'Blood Vendor'
      ? { ...row, card: { ...row.card, oracle_text: '', keywords: '[]' } }
      : row));
    const before = scoreDeck(standardDeck(main));
    const after = scoreDeck(standardDeck(blanked));
    const comp = (r: typeof before, key: string): number => r.components.find((c) => c.key === key)?.score ?? 0;
    expect(comp(after, 'synergy')).toBeLessThanOrEqual(comp(before, 'synergy'));
    expect(comp(after, 'win')).toBeLessThanOrEqual(comp(before, 'win'));
    expect(after.score).toBeLessThanOrEqual(before.score);
  });

  it('reports B as a legacy field pinned at 1', () => {
    const healthy = computeSynergy(null, 60, entriesOf([
      ...creatures(14, 3, 3, 'Beater'), ...removal(10, 2, 'Zap'), ...cantrips(10, 'Peek'),
    ]));
    expect(healthy).toHaveProperty('B');
    expect(healthy.B).toBe(1);
    // …and on the deck v1.2 would have discounted through the payoff mean:
    const starved = computeSynergy(null, 60, entriesOf([...lifePayoffs(6), ...creatures(20, 3, 3, 'Beater')]));
    expect(starved.B).toBe(1);
  });
});

// ── §9.6 step 1: mode-resolved catalogue ──────────────────────────────────

describe('mode-resolved catalogue (§9.6 step 1)', () => {
  it('keeps each mode separate instead of unioning their costs and requirements', () => {
    const entry = generateEntry(gen('Two Modes', 'Artifact', '{T}: Add {G}.\n{2}, {T}: Draw a card.'));
    expect(entry.effects.length).toBeGreaterThanOrEqual(2);
    // A union would have collapsed these to one cost; mode-resolved keeps both.
    expect(new Set(entry.effects.map((e) => e.cost.mana)).size).toBeGreaterThan(1);
  });

  it('gives every loaded mode its own exclusive budget key', () => {
    const modal = catalogNames().find((n) => (catalogFacts(n, null)?.modes.length ?? 0) >= 2);
    expect(modal).toBeDefined();
    const facts = catalogFacts(modal!, null)!;
    expect(facts.modes).toHaveLength(facts.entry.effects.length);
    expect(facts.modes.every((m) => typeof m.budget === 'string' && m.budget.length > 0)).toBe(true);
    // Distinct modes default to distinct budgets, so one copy is spent once
    // per budget and a modal card cannot fill two roles from two modes.
    expect(new Set(facts.modes.map((m) => m.budget)).size).toBe(facts.modes.length);
  });

  it('types a life-gain EVENT as a consumer, separate from the life AMOUNT', () => {
    const payoff = generateEntry(gen('Blood Ledger', 'Enchantment', 'Whenever you gain life, each opponent loses 1 life.', 3, '{2}{B}'));
    expect(payoff.knowledge).toBe('known');
    expect(payoff.effects.some((e) => (e.consumes ?? []).includes('life gain event'))).toBe(true);
    expect(payoff.effects.some((e) => (e.produces ?? []).includes('life'))).toBe(false);

    const source = generateEntry(gen('Soothing Spring', 'Enchantment', 'At the beginning of your upkeep, you gain 2 life.'));
    expect(source.effects.some((e) => (e.produces ?? []).includes('life'))).toBe(true);
    expect(source.effects.some((e) => (e.consumes ?? []).includes('life gain event'))).toBe(false);
  });

  it('keeps Food, Treasure and creature tokens as three different resources', () => {
    const produced = (e: ReturnType<typeof generateEntry>): string[] => e.effects.flatMap((x) => [...(x.produces ?? [])]);
    const food = generateEntry(gen('Larder', 'Artifact', 'When this artifact enters, create a Food token.'));
    const treasure = generateEntry(gen('Vault', 'Artifact', 'When this artifact enters, create a Treasure token.'));
    const body = generateEntry(gen('Barracks', 'Artifact', 'When this artifact enters, create a 1/1 white Soldier creature token.'));
    expect(produced(food)).toContain('food');
    expect(produced(food)).not.toContain('creature token');
    expect(produced(treasure)).toContain('treasure');
    expect(produced(treasure)).not.toContain('creature token');
    expect(produced(body)).toContain('creature token');
    expect(produced(body)).not.toContain('food');
  });

  it('types graveyard exit as consuming graveyard cards', () => {
    const entry = generateEntry(gen('Second Wind', 'Sorcery', 'Return target creature card from your graveyard to the battlefield.', 2, '{1}{B}'));
    expect(entry.effects.some((e) => (e.consumes ?? []).includes('graveyard cards'))).toBe(true);
    expect(entry.effects.some((e) => (e.produces ?? []).includes('recursion'))).toBe(true);
  });

  it('types a sacrifice activation cost as consuming a creature', () => {
    const entry = generateEntry(gen('Bone Mill', 'Artifact', 'Sacrifice a creature: Draw a card.'));
    expect(entry.effects.some((e) => (e.consumes ?? []).includes('creature'))).toBe(true);
  });
});

// ── §9.6 cross-cutting: the recursion recipe Imotekh plays ────────────────

describe('the artifact/graveyard-recursion recipe (§9.6 cross-cutting)', () => {
  const recur = (i: number): DbCard => mkCard({
    name: `Reclaim ${i}`, type_line: 'Sorcery', mana_cost: '{1}{B}', cmc: 2, power: null, toughness: null,
    oracle_text: 'Return target artifact card from your graveyard to the battlefield.',
  });
  const fuel = (i: number): DbCard => mkCard({
    name: `Dredger ${i}`, type_line: 'Sorcery', mana_cost: '{B}', cmc: 1, power: null, toughness: null,
    oracle_text: 'Mill three cards.',
  });
  const target = (i: number): DbCard => mkCard({
    name: `Construct ${i}`, type_line: 'Artifact Creature — Construct', mana_cost: '{3}', cmc: 3,
    power: '3', toughness: '3', oracle_text: 'When this creature enters, draw a card.',
  });

  it('fires on a list that actually recurs permanents', () => {
    const deck = entriesOf([
      ...Array.from({ length: 8 }, (_, i) => ({ card: recur(i), quantity: 1 })),
      ...Array.from({ length: 8 }, (_, i) => ({ card: fuel(i), quantity: 1 })),
      ...Array.from({ length: 14 }, (_, i) => ({ card: target(i), quantity: 1 })),
    ]);
    const evaluation = evaluatePlan(recipeFor('recursion'), 60, deck);
    expect(evaluation.R).toBeGreaterThan(0);
    expect(evaluation.hasEmptyEssential).toBe(false);
    expect(selectPlan(60, deck).recipe.key).toBe('recursion');
  });

  it('does not fire on a list holding the raw materials but no recursion', () => {
    // A pile has bodies and mill by accident; without something that brings
    // permanents back it is not playing this plan. An artifact COUNT would
    // have claimed it — §9.6 rejects the quota for exactly this reason.
    const deck = entriesOf([
      ...Array.from({ length: 8 }, (_, i) => ({ card: fuel(i), quantity: 1 })),
      ...Array.from({ length: 14 }, (_, i) => ({ card: target(i), quantity: 1 })),
      ...creatures(10, 2, 2, 'Filler'),
    ]);
    const evaluation = evaluatePlan(recipeFor('recursion'), 60, deck);
    expect(evaluation.R).toBe(0);
    expect(evaluation.hasEmptyEssential).toBe(true);
    expect(selectPlan(60, deck).recipe.key).not.toBe('recursion');
  });
});

// ── §9.6 step 3: the four worst-covered reference lists ───────────────────

describe('typed coverage of the four lists section 9.6 names', () => {
  // Fixture-backed: these read the live card DB through the same loader the
  // coverage tool uses, and `covered` is the same predicate (a `known` entry
  // whose reviewed oracle hash still matches the printing being scored).
  const NAMES = ['precon-witherbloom', 'tazri-beacon-of-unity', 'tazri-upgraded-arena', 'imotekh-the-stormlord'];

  for (const name of NAMES) {
    it(`${name} is over 80% typed`, () => {
      const spec = FIXTURES.find((f) => f.name === name);
      expect(spec, `fixture ${name} is missing`).toBeDefined();
      let copies = 0;
      let covered = 0;
      for (const row of spec!.load().input.main) {
        const feature = deriveCardFeature(row.card);
        if (feature.isLand) continue;
        copies += row.quantity;
        if (feature.covered) covered += row.quantity;
      }
      expect(copies).toBeGreaterThan(50);
      expect(covered / copies).toBeGreaterThan(0.80);
    });
  }
});
