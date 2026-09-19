import { describe, it, expect } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, SCORE_VERSION, type DeckScoreInput } from '../deck-score';
import { H, J, choose } from '../deck-score-math';
import { WEIGHTS, type ScoreFormat, type ComponentKey } from '../deck-score-norms';
import { computeSynergy } from '../deck-score-synergy';
import { computeMeta } from '../deck-score-meta';
import { normsFor } from '../deck-score-norms';
import { deriveCardFeature } from '../deck-score-features';
import type { DeckEntry } from '../deck-score-mana';

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
  it.each(formats)('%s weights sum to 100', (_format, profile) => {
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

// ── Synergy quota-gaming ────────────────────────────────────────────────

describe('computeSynergy — broken producer/consumer links', () => {
  it('scores lower when a dependent payoff has no producer to support it', () => {
    const norms = normsFor('commander');
    const payoff = mkCard({ name: 'Sac Payoff', type_line: 'Creature — Beast', oracle_text: 'Sacrifice a Food: draw a card.', mana_cost: '{2}{G}', cmc: 3, power: '3', toughness: '3' });
    const producer = mkCard({ name: 'Food Maker', type_line: 'Creature — Chef', oracle_text: 'When this creature enters, create a Food token.', mana_cost: '{1}{G}', cmc: 2, power: '2', toughness: '2' });
    const filler = mkCard({ name: 'Plain Filler', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, power: '2', toughness: '2' });

    const linked: DeckEntry[] = [
      { feature: deriveCardFeature(payoff), quantity: 1 },
      { feature: deriveCardFeature(producer), quantity: 1 },
    ];
    const broken: DeckEntry[] = [
      { feature: deriveCardFeature(payoff), quantity: 1 },
      { feature: deriveCardFeature(filler), quantity: 1 }, // same quota/curve, no Food producer
    ];

    const linkedScore = computeSynergy('commander', norms, 'midrange', 99, linked);
    const brokenScore = computeSynergy('commander', norms, 'midrange', 99, broken);
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

  it('a board that only beats ONE 40-life opponent gets no Commander combat line', () => {
    const w = winOf({
      format: 'commander', main: [forest(12), ...bodies], commander: [COMMANDER],
      sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
    });
    expect(w).toBe(0);
  });

  it('the same board does close a 20-life Standard game', () => {
    const w = winOf({
      format: 'standard', main: [forest(24), ...creatures(14, 2, 1)], commander: [],
      sideboard: [], unresolved: [], cardDataVersion: 'test-v1', corpus: null,
    });
    expect(w).toBeGreaterThan(0);
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
  // Spec S1 W: "First satisfy/decrement guaranteed commander requirements."
  // The sac outlet sits in the command zone, so the aristocrats recipe must
  // still assemble; before the fix its outlet pool was empty and the whole
  // recipe was dropped.
  const outletCommander = mkCard({
    name: 'Command Zone Outlet', type_line: 'Legendary Creature - Human',
    oracle_text: 'Sacrifice a creature: Draw a card.',
    mana_cost: '{1}{B}', cmc: 2, power: '2', toughness: '2',
  });
  const inertCommander = mkCard({
    name: 'Inert Commander', type_line: 'Legendary Creature - Human',
    oracle_text: 'Vigilance.', mana_cost: '{1}{B}', cmc: 2, power: '2', toughness: '2',
  });
  const drainPayoff = mkCard({
    name: 'Table Drain', type_line: 'Enchantment',
    oracle_text: 'Whenever a creature you control dies, each opponent loses 1 life.',
    mana_cost: '{1}{B}', cmc: 2, power: null, toughness: null,
  });
  const deck = (commander: DbCard): DeckScoreInput => ({
    format: 'commander',
    main: [forest(12), { card: drainPayoff, quantity: 1 }, ...creatures(6, 1, 1, 'Fodder')],
    commander: [commander], sideboard: [], unresolved: [],
    cardDataVersion: 'test-v1', corpus: null,
  });

  it('a command-zone sac outlet still completes the aristocrats line', () => {
    expect(winOf(deck(outletCommander))).toBeGreaterThan(0);
  });

  it('and the same list with no outlet anywhere has no line at all', () => {
    expect(winOf(deck(inertCommander))).toBe(0);
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
    expect(coverage?.cap).toBe(69);
  });
});

describe('SCORE_VERSION', () => {
  it('is a frozen semver-shaped string', () => {
    expect(SCORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('component key coverage', () => {
  it('scoreDeck always returns all 8 component keys in a stable order', () => {
    const expected: ComponentKey[] = ['mana', 'curve', 'interaction', 'advantage', 'win', 'synergy', 'meta', 'structure'];
    const result = scoreDeck(fullDeck());
    expect(result.components.map((c) => c.key)).toEqual(expected);
  });
});
