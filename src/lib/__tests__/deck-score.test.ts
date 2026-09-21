import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, SCORE_VERSION, type DeckScoreInput } from '../deck-score';
import { H, J, choose } from '../deck-score-math';
import { WEIGHTS, type ScoreFormat, type ComponentKey } from '../deck-score-norms';
import { computeSynergy } from '../deck-score-synergy';
import { computeMeta } from '../deck-score-meta';
import { normsFor } from '../deck-score-norms';
import { deriveCardFeature } from '../deck-score-features';
import type { DeckEntry } from '../deck-score-mana';

// Coverage round 1 tripled the catalogue shard (4,467 -> 14,909 entries), so
// every pile-building and catalogue-walking test in this file got ~3x slower
// and several landed within noise of vitest's 15 s default. Raised per file
// rather than per test: the work is corpus-sized, not hung.
vi.setConfig({ testTimeout: 120_000 });

// ── Test fixtures ────────────────────────────────────────────────────────

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `test-${idCounter}-${overrides.name}`,
    oracle_id: `oracle-${idCounter}`,
    mana_cost: '{1}{G}',
    cmc: 2,
    type_line: 'Creature — Bear',
    oracle_text: null,
    colors: '["G"]',
    color_identity: '["G"]',
    keywords: '[]',
    set_code: 'tst',
    set_name: 'Test Set',
    collector_number: String(idCounter),
    rarity: 'common',
    image_uri_small: null,
    image_uri_normal: null,
    image_uri_large: null,
    image_uri_art_crop: null,
    price_usd: null,
    price_usd_foil: null,
    legalities: '{"standard":"legal","commander":"legal","brawl":"legal","standardbrawl":"legal"}',
    power: '2',
    toughness: '2',
    loyalty: null,
    produced_mana: null,
    edhrec_rank: null,
    layout: 'normal',
    updated_at: '2024-01-01',
    subtypes: null,
    arena_id: null,
    ...overrides,
  };
}

function forest(quantity = 1): { card: DbCard; quantity: number } {
  return { card: mkCard({ name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: null, cmc: 0, power: null, toughness: null, colors: null }), quantity };
}

const COMMANDER = mkCard({
  name: 'Test Commander',
  type_line: 'Legendary Creature — Human',
  oracle_text: 'Whenever a creature you control dies, draw a card.',
  power: '4', toughness: '4', cmc: 3, mana_cost: '{2}{G}',
});

/** A small, structurally-valid (warns but never fails on size) Commander
 * deck with no closing recipe at all — every nonland card is a vanilla,
 * unclassified sorcery, so `computeWin` hits its "no recipes" branch. */
function noWinDeck(): DeckScoreInput {
  const spells = Array.from({ length: 6 }, (_, i) =>
    ({ card: mkCard({ name: `Filler Sorcery ${i}`, type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null, colors: null }), quantity: 1 }));
  return {
    format: 'commander',
    main: [forest(10), ...spells],
    commander: [COMMANDER],
    sideboard: [],
    unresolved: [],
    cardDataVersion: 'test-v1',
    corpus: null,
  };
}

/** A small deck with an actual creature-pressure win line and a full spread
 * of roles, used for the "everything computes to a finite score" checks. */
function fullDeck(): DeckScoreInput {
  const ramp = mkCard({ name: 'Test Rock', type_line: 'Artifact', oracle_text: 'Add one mana of any color.', mana_cost: '{1}', cmc: 1, power: null, toughness: null, produced_mana: '["G"]' });
  const draw = mkCard({ name: 'Test Cantrip', type_line: 'Sorcery', oracle_text: 'Draw a card.', mana_cost: '{G}', cmc: 1, power: null, toughness: null });
  const removal = mkCard({ name: 'Test Bolt', type_line: 'Instant', oracle_text: 'Destroy target creature.', mana_cost: '{1}{G}', cmc: 2, power: null, toughness: null });
  const protection = mkCard({ name: 'Test Ward', type_line: 'Instant', oracle_text: 'Target creature gains hexproof until end of turn.', mana_cost: '{G}', cmc: 1, power: null, toughness: null });
  const bigCreature = mkCard({ name: 'Test Beater', type_line: 'Creature — Bear', mana_cost: '{3}{G}', cmc: 4, power: '6', toughness: '6' });
  const foodProducer = mkCard({ name: 'Test Chef', type_line: 'Creature — Human', oracle_text: 'When this creature enters, create a Food token.', mana_cost: '{1}{G}', cmc: 2, power: '2', toughness: '2' });
  const foodPayoff = mkCard({ name: 'Test Glutton', type_line: 'Creature — Beast', oracle_text: 'Sacrifice a Food: Put a +1/+1 counter on this creature.', mana_cost: '{2}{G}', cmc: 3, power: '3', toughness: '3' });
  return {
    format: 'commander',
    main: [
      forest(12),
      { card: ramp, quantity: 1 }, { card: draw, quantity: 1 }, { card: removal, quantity: 1 },
      { card: protection, quantity: 1 }, { card: bigCreature, quantity: 1 },
      { card: foodProducer, quantity: 1 }, { card: foodPayoff, quantity: 1 },
    ],
    commander: [COMMANDER],
    sideboard: [],
    unresolved: [],
    cardDataVersion: 'test-v1',
    corpus: null,
  };
}

// ── H (hypergeometric) ───────────────────────────────────────────────────

describe('H — hypergeometric upper tail', () => {
  /** Independent brute-force reference (small N, exact with plain doubles). */
  function bruteH(N: number, K: number, n: number, r: number): number {
    let sum = 0;
    for (let x = Math.max(0, r); x <= Math.min(K, n); x++) {
      sum += (choose(K, x) * choose(N - K, n - x)) / choose(N, n);
    }
    return sum;
  }

  it('matches brute force for N=10,K=4,n=3,r=1', () => {
    expect(H(10, 4, 3, 1)).toBeCloseTo(bruteH(10, 4, 3, 1), 9);
  });
  it('matches brute force for N=15,K=5,n=6,r=2', () => {
    expect(H(15, 5, 6, 2)).toBeCloseTo(bruteH(15, 5, 6, 2), 9);
  });
  it('matches brute force for N=20,K=8,n=7,r=3', () => {
    expect(H(20, 8, 7, 3)).toBeCloseTo(bruteH(20, 8, 7, 3), 9);
  });
  it('r=0 is always 1 (drawing at least zero is certain)', () => {
    expect(H(99, 10, 7, 0)).toBeCloseTo(1, 9);
  });
  it('K=0 with r>=1 is impossible -> 0', () => {
    expect(H(99, 0, 7, 1)).toBe(0);
  });
  it('never returns NaN/Infinity for invalid input', () => {
    expect(H(NaN, 5, 7, 1)).toBe(0);
    expect(H(10, -5, 7, 1)).toBe(0);
    expect(H(0, 0, 0, 0)).toBe(1);
  });
});

describe('J — disjoint-pool access', () => {
  it('equals H when there is exactly one pool', () => {
    const N = 40, K = 12, n = 9, r = 2;
    expect(J(N, [{ K, r }], n)).toBeCloseTo(H(N, K, n, r), 9);
  });
  it('a dropped r=0 pool does not change access (folds into the leftover term)', () => {
    const withZeroPool = J(30, [{ K: 10, r: 2 }, { K: 5, r: 0 }], 8);
    const withoutPool = J(30, [{ K: 10, r: 2 }], 8);
    expect(withZeroPool).toBeCloseTo(withoutPool, 9);
  });
  it('stays finite and in [0,1] at the degree-19 bound', () => {
    const v = J(99, [{ K: 10, r: 2 }, { K: 8, r: 1 }], 19);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});

// ── Hard caps ────────────────────────────────────────────────────────────

describe('scoreDeck — hard caps and invalid input', () => {
  it('empty deck scores 0 with a failing structure gate', () => {
    const result = scoreDeck({ format: 'commander', main: [], commander: [], sideboard: [], unresolved: [], cardDataVersion: 'v1', corpus: null });
    expect(result.score).toBe(0);
    expect(result.gates.find((g) => g.key === 'structure')?.status).toBe('fail');
    expect(result.components).toHaveLength(8);
    expect(result.components.every((c) => Number.isFinite(c.score))).toBe(true);
  });

  it('nonpositive/non-integer quantity caps at 0, never NaN', () => {
    const deck = noWinDeck();
    const mutated: DeckScoreInput = { ...deck, main: [{ ...deck.main[0], quantity: -1 }, ...deck.main.slice(1)] };
    const result = scoreDeck(mutated);
    expect(result.score).toBe(0);
    expect(Number.isNaN(result.score)).toBe(false);
  });

  it('a 101-card Commander library caps at 19', () => {
    const deck = noWinDeck();
    const currentTotal = deck.main.reduce((s, e) => s + e.quantity, 0);
    const extra = { card: mkCard({ name: 'One Too Many', type_line: 'Sorcery', mana_cost: '{1}', cmc: 1, power: null, toughness: null }), quantity: 101 - currentTotal };
    const bloated: DeckScoreInput = { ...deck, main: [...deck.main, extra] };
    const totalMain = bloated.main.reduce((s, e) => s + e.quantity, 0);
    expect(totalMain).toBe(101);
    const result = scoreDeck(bloated);
    expect(result.score).toBeLessThanOrEqual(19);
  });

  it('an unresolved card caps at 39', () => {
    const deck = noWinDeck();
    const withUnresolved: DeckScoreInput = { ...deck, unresolved: [{ name: 'Nonexistent Card', quantity: 1, board: 'main' }] };
    const result = scoreDeck(withUnresolved);
    expect(result.score).toBeLessThanOrEqual(39);
    expect(result.gates.some((g) => g.key === 'unresolved')).toBe(true);
  });

  it('an invalid commander count (3 commanders) caps at 0', () => {
    const deck = noWinDeck();
    const bad: DeckScoreInput = { ...deck, commander: [COMMANDER, COMMANDER, COMMANDER] };
    const result = scoreDeck(bad);
    expect(result.score).toBe(0);
  });
});

describe('scoreDeck — quality cap', () => {
  it('caps the total at <=20 when Win is 0 (no closing line at all)', () => {
    const result = scoreDeck(noWinDeck());
    const win = result.components.find((c) => c.key === 'win')!;
    expect(win.score).toBe(0);
    expect(result.score).toBeLessThanOrEqual(20);
  });
});

// ── Invariants ───────────────────────────────────────────────────────────

describe('scoreDeck — invariants', () => {
  it('is invariant to input card order', () => {
    const deck = fullDeck();
    const reversed: DeckScoreInput = { ...deck, main: [...deck.main].reverse() };
    expect(scoreDeck(reversed)).toEqual(scoreDeck(deck));
  });

  it('is invariant to merging vs splitting a duplicate-card quantity row', () => {
    const deck = noWinDeck();
    const split: DeckScoreInput = { ...deck, main: [forest(4), forest(6), ...deck.main.slice(1)] };
    const merged: DeckScoreInput = { ...deck, main: [forest(10), ...deck.main.slice(1)] };
    expect(scoreDeck(split)).toEqual(scoreDeck(merged));
  });

  it('is bit-identical when price_usd/edhrec_rank are permuted', () => {
    const deck = fullDeck();
    const before = scoreDeck(deck);
    const permuted: DeckScoreInput = {
      ...deck,
      main: deck.main.map((e, i) => ({ ...e, card: { ...e.card, price_usd: `${i + 1}.23`, edhrec_rank: 9999 - i } })),
      commander: deck.commander.map((c) => ({ ...c, price_usd: '500.00', edhrec_rank: 1 })),
    };
    const after = scoreDeck(permuted);
    expect(after).toEqual(before);
  });
});

// ── Meta ─────────────────────────────────────────────────────────────────

describe('computeMeta', () => {
  it('returns 50 and an evidence warning when corpus is null', () => {
    const feature = deriveCardFeature(COMMANDER);
    const entries: DeckEntry[] = [{ feature, quantity: 1 }];
    const result = computeMeta('commander', 'midrange', entries, null);
    expect(result.score).toBe(50);
    expect(result.evidenceWarn).toBe(true);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('is reflected as a warn gate on the full scoreDeck result', () => {
    const result = scoreDeck(fullDeck());
    expect(result.gates.some((g) => g.key === 'meta_evidence' && g.status === 'warn')).toBe(true);
  });
});

// ── Weights ──────────────────────────────────────────────────────────────

describe('WEIGHTS', () => {
  const formats: Array<[ScoreFormat, keyof typeof WEIGHTS]> = [
    ['commander', 'commander'], ['brawl', 'brawl'], ['standard', 'standard'],
  ];
  it.each(formats)('%s raw section-1 weights sum to 100', (_format, profile) => {
    const total = Object.values(WEIGHTS[profile]).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

});

// ── Reasons ──────────────────────────────────────────────────────────────

describe('scoreDeck — component reasons', () => {
  it('every component has a non-empty reason containing a headline number', () => {
    const result = scoreDeck(fullDeck());
    for (const c of result.components) {
      expect(c.reason.length).toBeGreaterThan(0);
      expect(/\d/.test(c.reason)).toBe(true);
    }
  });

  it('norms are defined for every score format', () => {
    const formats: ScoreFormat[] = ['commander', 'brawl', 'competitivebrawl', 'standardbrawl', 'standard'];
    for (const f of formats) expect(normsFor(f).fastClosingTurn).toBeGreaterThan(0);
  });
});

// v1.2 evidence policy: Q only credits typed-covered copies. These synthetic
// cards are not in the catalogue, so mark them covered to exercise the plan
// layer rather than the evidence gate (the gate has its own test).
function coveredFeature(card: Parameters<typeof deriveCardFeature>[0]) {
  return { ...deriveCardFeature(card), covered: true };
}

// ── Synergy quota-gaming ────────────────────────────────────────────────

describe('computeSynergy - broken producer/consumer links', () => {
  it('scores lower when the producers lose the consumers that used them', () => {
    // v1.3 (§9.3): B is retired and pinned at 1; the charge moved to the
    // PRODUCER copy. Both lists are the SAME 30 cards — the second one has
    // the §4 quota-gaming operation applied to the six payoffs, whose rules
    // text is blanked while name, type, cost and colour stay. The ten life
    // sources then reach nothing, earn u = 0, and S falls instead of rising.
    const gain = (i: number) => mkCard({ name: `Healer ${i}`, type_line: 'Enchantment', oracle_text: 'At the beginning of your upkeep, you gain 2 life.', mana_cost: '{1}{W}', cmc: 2, power: null, toughness: null });
    const payoff = (i: number) => mkCard({ name: `Sanguine ${i}`, type_line: 'Enchantment', oracle_text: 'Whenever you gain life, each opponent loses 1 life.', mana_cost: '{2}{B}', cmc: 3, power: null, toughness: null });
    const threat = (i: number) => mkCard({ name: `Threat ${i}`, type_line: 'Creature - Bear', mana_cost: '{2}{G}', cmc: 3, power: '4', toughness: '4' });
    const answer = (i: number) => mkCard({ name: `Answer ${i}`, type_line: 'Instant', oracle_text: 'Destroy target creature.', mana_cost: '{1}{G}', cmc: 2, power: null, toughness: null });
    const value = (i: number) => mkCard({ name: `Value ${i}`, type_line: 'Sorcery', oracle_text: 'Draw a card.', mana_cost: '{G}', cmc: 1, power: null, toughness: null });

    const spine: DeckEntry[] = [
      ...Array.from({ length: 4 }, (_, i) => ({ feature: coveredFeature(threat(i)), quantity: 1 })),
      ...Array.from({ length: 6 }, (_, i) => ({ feature: coveredFeature(answer(i)), quantity: 1 })),
      ...Array.from({ length: 4 }, (_, i) => ({ feature: coveredFeature(value(i)), quantity: 1 })),
      ...Array.from({ length: 10 }, (_, i) => ({ feature: coveredFeature(gain(i)), quantity: 1 })),
    ];
    const linked: DeckEntry[] = [...spine, ...Array.from({ length: 6 }, (_, i) => ({ feature: coveredFeature(payoff(i)), quantity: 1 }))];
    const broken: DeckEntry[] = [...spine, ...Array.from({ length: 6 }, (_, i) => ({ feature: coveredFeature({ ...payoff(i), oracle_text: '' }), quantity: 1 }))];

    const linkedScore = computeSynergy(null, 60, linked);
    const brokenScore = computeSynergy(null, 60, broken);
    expect(linkedScore.score).toBeGreaterThan(0);
    expect(linkedScore.B).toBe(1);
    expect(brokenScore.B).toBe(1);
    expect(linkedScore.U).toBe(1);
    expect(brokenScore.U).toBe(0);
    expect(brokenScore.score).toBeLessThan(linkedScore.score);
  });
});

// -- Win access (W) regressions -----------------------------------------

/** W only; every deck below is small, so no hard cap masks the component. */
function winOf(input: DeckScoreInput): number {
  return scoreDeck(input).components.find((c) => c.key === 'win')!.score;
}

/** `count` distinct singleton creatures, all the same power/cost. */
function creatures(count: number, power: number, cmc: number, tag = 'Body'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${power}p ${i}`, type_line: 'Creature - Bear',
      mana_cost: cmc === 0 ? null : `{${cmc}}`, cmc,
      power: String(power), toughness: String(Math.max(1, power)),
    }),
    quantity: 1,
  }));
}

describe('computeWin - the finish predicate must defeat EVERY opponent', () => {
  // Spec S1 W: "3x40 combat damage ... in Commander, 25/20 life in
  // Brawl/Standard". Fourteen 2-power bodies deal 14*2*3 = 84: enough for one
  // 40-life opponent, nowhere near the 120 a four-player pod needs.
  const bodies = creatures(14, 2, 1);

  it('the same board is worth far more against 20 life than against a 4-player pod', () => {
    const pod = winOf({
      format: 'commander', main: [forest(12), ...bodies], commander: [COMMANDER],
      sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
    });
    const duel = winOf({
      format: 'standard', main: [forest(12), ...creatures(14, 2, 1)], commander: [],
      sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
    });
    expect(duel).toBeGreaterThan(pod);
  });

  it('a 20-life Standard game closes and scores', () => {
    const w = winOf({
      format: 'standard', main: [forest(24), ...creatures(14, 2, 1)], commander: [],
      sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
    });
    expect(w).toBeGreaterThan(0);
  });
});

// -- Win v1.1: one regression per recipe family --------------------------

function winReason(input: DeckScoreInput): string {
  return scoreDeck(input).components.find((c) => c.key === 'win')!.reason;
}

const vanilla = (name: string, cmc: number, type = 'Sorcery') =>
  mkCard({ name, type_line: type, mana_cost: `{${cmc}}`, cmc, power: null, toughness: null });

function answers(count: number): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `Answer ${i}`, type_line: 'Instant', oracle_text: 'Destroy target creature.',
      mana_cost: '{1}{B}', cmc: 2, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

describe('computeWin v1.1 — pressure closes on a cumulative schedule', () => {
  it('a real Standard creature deck reaches its target and names the turn', () => {
    const deck: DeckScoreInput = {
      format: 'standard',
      main: [forest(24), ...Array.from({ length: 4 }, (_, i) => ({ card: mkCard({ name: `Threat ${i}`, mana_cost: '{1}{G}', cmc: 2, power: '3', toughness: '3' }), quantity: 4 }))],
      commander: [], sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
    };
    expect(winOf(deck)).toBeGreaterThan(40);
    expect(winReason(deck)).toMatch(/Creature pressure .*closes T\d/);
  });

  it('more copies of the same threat never close later', () => {
    const threat = (q: number) => ({ card: mkCard({ name: 'Threat', mana_cost: '{1}{G}', cmc: 2, power: '3', toughness: '3' }), quantity: q });
    const base: DeckScoreInput = {
      format: 'standard', main: [forest(24), threat(2)], commander: [],
      sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
    };
    const more: DeckScoreInput = { ...base, main: [forest(24), threat(4)] };
    expect(winOf(more)).toBeGreaterThanOrEqual(winOf(base));
  });
});

describe('computeWin v1.1 — aristocrats drain', () => {
  // Artifacts, not creatures: with a creature clock in the deck the pressure
  // line closes first and the reason string names that instead.
  const outlet = mkCard({ name: 'Sac Outlet', type_line: 'Artifact', oracle_text: 'Sacrifice a creature: Draw a card.', mana_cost: '{B}', cmc: 1, power: null, toughness: null });
  const payoff = (i: number) => mkCard({ name: `Blood Payoff ${i}`, type_line: 'Enchantment', oracle_text: 'Whenever a creature you control dies, each opponent loses 1 life.', mana_cost: '{1}{B}', cmc: 2, power: null, toughness: null });
  const maker = (i: number) => mkCard({ name: `Token Maker ${i}`, type_line: 'Artifact', oracle_text: 'When this artifact enters, create a 1/1 green Elf creature token.', mana_cost: '{B}', cmc: 1, power: null, toughness: null });
  const build = (payoffs: number): DeckScoreInput => ({
    format: 'standard',
    main: [
      forest(20),
      { card: outlet, quantity: 4 },
      ...Array.from({ length: payoffs }, (_, i) => ({ card: payoff(i), quantity: 4 })),
      ...Array.from({ length: 4 }, (_, i) => ({ card: maker(i), quantity: 4 })),
    ],
    commander: [], sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
  });

  it('outlet + payoff + fodder produces a drain line with its trigger rate', () => {
    expect(winReason(build(3))).toMatch(/Aristocrats drain \(\d+\/turn/);
  });

  it('the same shell with no drain payoff loses that line', () => {
    expect(winReason(build(0))).not.toMatch(/Aristocrats drain/);
  });
});

describe('computeWin v1.1 — control inevitability is conditional, not graded', () => {
  const finisher = mkCard({ name: 'Big Finisher', type_line: 'Creature — Dragon', mana_cost: '{4}{B}{B}', cmc: 6, power: '6', toughness: '6' });
  const engine = mkCard({ name: 'Draw Engine', type_line: 'Enchantment', oracle_text: 'At the beginning of your upkeep, draw a card.', mana_cost: '{2}{B}', cmc: 3, power: null, toughness: null });
  const build = (answerCount: number): DeckScoreInput => ({
    format: 'standard',
    main: [forest(24), ...answers(answerCount).map((a) => ({ ...a, quantity: 2 })), { card: engine, quantity: 4 }, { card: finisher, quantity: 2 }],
    commander: [], sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
  });

  it('a creatureless-plan control shell with enough answers, draw and finishers scores', () => {
    expect(winOf(build(12))).toBeGreaterThan(0);
  });

  it('ordinary removal density alone cannot claim inevitability (§1 W)', () => {
    expect(winReason(build(1))).not.toMatch(/Control inevitability/);
  });
});

describe('computeWin v1.1 — Food is not a creature without a conversion effect', () => {
  const foodMaker = (i: number) => mkCard({ name: `Food Maker ${i}`, type_line: 'Artifact', oracle_text: 'When this artifact enters, create a Food token.', mana_cost: '{1}', cmc: 1, power: null, toughness: null });
  const converter = mkCard({ name: 'Troll Cook', type_line: 'Creature — Troll', oracle_text: 'Sacrifice a Food: This creature gets +2/+2 until end of turn.', mana_cost: '{2}{G}', cmc: 3, power: '3', toughness: '3' });
  const build = (withConverter: boolean): DeckScoreInput => ({
    format: 'standard',
    main: [
      forest(22),
      ...Array.from({ length: 6 }, (_, i) => ({ card: foodMaker(i), quantity: 4 })),
      ...(withConverter ? [{ card: converter, quantity: 4 }] : [{ card: vanilla('Filler', 3), quantity: 4 }]),
    ],
    commander: [], sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
  });

  it('producers plus a converter open the conversion line', () => {
    expect(winReason(build(true))).toMatch(/Token\/Food conversion/);
  });

  it('the same producers with no converter do not', () => {
    expect(winReason(build(false))).not.toMatch(/Token\/Food conversion/);
  });
});

describe('computeWin v1.1 — Voltron needs a commander-damage rule', () => {
  const sword = mkCard({ name: 'Test Sword', type_line: 'Artifact — Equipment', oracle_text: 'Equipped creature gets +3/+3. Equip {2}', mana_cost: '{2}', cmc: 2, power: null, toughness: null });
  const deck = (format: ScoreFormat): DeckScoreInput => ({
    format,
    main: [forest(30), { card: sword, quantity: 1 }, ...creatures(20, 1, 1, 'Chump')],
    commander: [mkCard({ name: 'Voltron Commander', type_line: 'Legendary Creature — Human', oracle_text: 'Trample.', mana_cost: '{2}{G}', cmc: 3, power: '5', toughness: '5' })],
    sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
  });

  it('never builds in Brawl, which has no commander-damage shortcut', () => {
    expect(winReason(deck('brawl'))).not.toMatch(/Voltron/);
  });

  it('is available in Commander', () => {
    expect(Number.isFinite(winOf(deck('commander')))).toBe(true);
  });
});

describe('computeWin - creature-pressure pools lower-bound their output', () => {
  // Spec S1 W: "outputs lower-bound them". The pool used to credit the deck's
  // AVERAGE power to whichever members `poolCost` picked (the cheapest), so
  // free 0-power bodies bought a faster, wider clock than the real threats.
  it('adding free 0-power bodies never raises Win', () => {
    const base: DeckScoreInput = {
      format: 'commander', main: [forest(12), ...creatures(6, 8, 6, 'Threat')],
      commander: [COMMANDER], sideboard: [], unresolved: [],
      cardDataVersion: 'test-v1', corpus: null,
    };
    // Free 0/1 bodies: they cannot attack for anything, but the old pool
    // charged their 0 mana while crediting them the six real threats' power.
    const padded: DeckScoreInput = { ...base, main: [...base.main, ...creatures(12, 0, 0, 'Chaff')] };
    expect(winOf(padded)).toBeLessThanOrEqual(winOf(base));
  });
});

describe('computeWin - commanders are guaranteed pool members', () => {
  // Spec S1 W: "First satisfy/decrement guaranteed commander requirements and
  // drop pools with r_j=0." A commander that fills a role is never drawn, so it
  // leaves `J_l`'s K and decrements `r` -- worth strictly more than the same
  // body sitting in the library, and worth more than a commander that fills no
  // role at all.
  const bodyCommander = mkCard({
    name: 'Command Zone Threat', type_line: 'Legendary Creature - Dragon',
    oracle_text: 'Flying.', mana_cost: '{2}{B}', cmc: 3, power: '8', toughness: '8',
  });
  const inertCommander = mkCard({
    name: 'Inert Commander', type_line: 'Legendary Enchantment',
    oracle_text: 'Vigilance.', mana_cost: '{2}{B}', cmc: 3, power: null, toughness: null,
  });
  const deck = (commander: DbCard): DeckScoreInput => ({
    format: 'commander',
    main: [forest(30), ...creatures(24, 3, 2, 'Body')],
    commander: [commander], sideboard: [], unresolved: [],
    cardDataVersion: 'test-v1', corpus: null,
  });

  it('a commander that fills the closing role beats one that fills nothing', () => {
    expect(winOf(deck(bodyCommander))).toBeGreaterThan(winOf(deck(inertCommander)));
  });

  it('and a deck with no closing role anywhere scores 0', () => {
    expect(winOf({
      format: 'commander',
      main: [forest(30), { card: mkCard({ name: 'Blank', type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null }), quantity: 1 }],
      commander: [inertCommander], sideboard: [], unresolved: [],
      cardDataVersion: 'test-v1', corpus: null,
    })).toBe(0);
  });
});

describe('deriveCardFeature - a creature with no printed power is UNCERTAIN', () => {
  // The card row reaching `scoreDeck` used to arrive without its `power`
  // column, which deleted every creature from W's pool and returned W=0 with
  // no diagnostic. Missing power is now routed to s=0.5 so the >20%
  // effect-coverage gate reports it.
  it('drops support to 0.5 rather than reading as a creature with no body', () => {
    const known = deriveCardFeature(mkCard({ name: 'Known Bear', power: '2', toughness: '2' }));
    const unknown = deriveCardFeature(mkCard({ name: 'Column Missing Bear', power: null, toughness: null }));
    expect(known.s).toBe(1);
    expect(unknown.s).toBe(0.5);
    expect(unknown.supported).toBe(false);
  });

  it('raises the effect-coverage gate on a deck whose creatures lost their power column', () => {
    const stripped = creatures(14, 2, 1).map((e) => ({ ...e, card: { ...e.card, power: null, toughness: null } }));
    const result = scoreDeck({
      format: 'commander', main: [forest(12), ...stripped], commander: [COMMANDER],
      sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
    });
    const coverage = result.gates.find((g) => g.key === 'coverage');
    expect(coverage?.status).toBe('warn');
    // v1.2: an EVIDENCE gate with no cap replaced the mechanical 69.
    expect(coverage?.kind).toBe('evidence');
    expect(coverage?.cap).toBeNull();
    expect(result.provisional).toBe(true);
  });
});

describe('SCORE_VERSION', () => {
  it('is a frozen semver-shaped string', () => {
    // v1.3 ships as a release candidate while stages 3-4 land, so a semver
    // PRERELEASE suffix is allowed; the numeric core still has to be frozen.
    expect(SCORE_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });
});

describe('component key coverage', () => {
  it('scoreDeck always returns all 8 component keys in a stable order', () => {
    const expected: ComponentKey[] = ['mana', 'curve', 'interaction', 'advantage', 'win', 'synergy', 'meta', 'structure'];
    const result = scoreDeck(fullDeck());
    expect(result.components.map((c) => c.key)).toEqual(expected);
  });
});
