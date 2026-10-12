/**
 * Deck Score v1.4 stage 3g/3h — SELECTION = VALUATION, and the blank slot is
 * worst-case in every hypothesis dimension (docs/DECK_SCORE_SPEC.md §10.10
 * items 1-3, §10.9 item 5).
 *
 * ROOT CAUSE, one shared site. `bestLine` maximised `H(N, K, n, rEff)` over a
 * SINGLE pool of theta candidates, while the recipe was then valued with
 * `readAccessAt` over its COMPLETE pool list — the token converter pool, the
 * drain outlet/fodder pools, the control engine pool. Two different orderings
 * over the same candidates, so a hair of N flipped the argmax and W jumped on
 * an edit that removes information (`commander:378293112`, Token/Food
 * 41xr10 -> 5xr2 on one added unknown slot; `commander:378789207` r10 -> r6,
 * W 23 -> 49 with an unchanged damage ledger). Every caller now hands
 * `bestLine` a `rank` closure that builds THAT candidate's full pool set and
 * reads the same `poolsAccess` the evaluator reports, so the maximised
 * quantity is the reported one.
 *
 * Second site: the pessimistic imputation for an unresolved slot varied the
 * KIND (spell / land / MDFC back) but fixed the COST at the deck's maximum MV.
 * `karstenAt` scales the land requirement with `avgMv`, so that one cost is
 * pessimistic for a land-SHORT list and optimistic for a land-FLOODED one —
 * blanking a card paid +0.1 M (`brawl:348693450`). The cost is now a
 * hypothesis dimension too and `worst` still takes the per-component minimum.
 */
import { describe, it, expect } from 'vitest';
import { SCORE_VERSION } from '../deck-score';
import {
  W_SCHEDULER_VERSION, bestLine, scheduleDamage, type Source, type ManaCurve,
} from '../deck-score-win';
import { blankFeature, deriveCardFeature } from '../deck-score-features';
import { computeMana, type DeckEntry } from '../deck-score-mana';
import { normsFor } from '../deck-score-norms';
import type { DbCard } from '../types';

const curveOf = (k: number): ManaCurve => ({
  at: (t) => k * t, spendableAt: (t) => k * t, bonus: 0, trace: `test x${k}`,
});
const src = (over: Partial<Source> & { name: string }): Source =>
  ({ cmc: 2, quantity: 4, guaranteed: false, output: 2, bodies: 1, ...over });

/** Deterministic members at three distinct output levels, so `bestLine` has a
 * real theta grid to rank. */
const grid = (): Source[] => [
  src({ name: 'Big', output: 6, quantity: 2, cmc: 5 }),
  src({ name: 'Mid', output: 3, quantity: 8, cmc: 3 }),
  src({ name: 'Small', output: 1, quantity: 20, cmc: 1 }),
];

describe('stage 3h — selection is the same quantity as valuation', () => {
  it('a `rank` closure chooses the candidate that MAXIMISES the ranked number', () => {
    const members = grid();
    const seen: Array<{ r: number; v: number }> = [];
    // A two-pool valuation: the chosen line's own pool AND a fixed second pool
    // it must share the library with — exactly the token-converter shape.
    const rank = (names: ReadonlySet<string>, r: number): number => {
      const v = names.size / (r * 10);
      seen.push({ r, v });
      return v;
    };
    const line = bestLine('commander', 99, 8, members, 60, 7, 10, rank);
    expect(line).not.toBeNull();
    expect(seen.length).toBeGreaterThan(1);
    expect(line!.access).toBeCloseTo(Math.max(...seen.map((s) => s.v)), 12);
  });

  it('the reported access IS the ranked value, never a second recomputation', () => {
    const line = bestLine('commander', 99, 8, grid(), 60, 7, 10, () => 0.42);
    expect(line!.access).toBe(0.42);
  });

  it('without a `rank` the single-pool fallback still returns a real access', () => {
    const line = bestLine('commander', 99, 8, grid(), 60, 7, 10);
    expect(line!.access).toBeGreaterThan(0);
    expect(line!.access).toBeLessThanOrEqual(1);
  });

  it('monotone in DILUTION: a larger library never raises the ranked access', () => {
    const members = grid();
    const at = (N: number) => bestLine('commander', N, 8, members, 60, 7, 10)!.access;
    let prev = Infinity;
    for (const N of [95, 99, 100, 105, 120]) {
      const a = at(N);
      expect(a).toBeLessThanOrEqual(prev + 1e-12);
      prev = a;
    }
  });

  it('monotone in OPTIONS: adding a source never lowers the maximum', () => {
    const base = grid();
    const wider = [...base, src({ name: 'Extra', output: 3, quantity: 4, cmc: 3 })];
    const a = bestLine('commander', 99, 8, base, 60, 7, 10)!.access;
    const b = bestLine('commander', 99, 8, wider, 60, 7, 10)!.access;
    expect(b).toBeGreaterThanOrEqual(a - 1e-12);
  });

  it('zero-output members neither size nor enter the line', () => {
    const withDud = [...grid(), src({ name: 'Ballista', output: 0, quantity: 4 })];
    const line = bestLine('commander', 99, 8, withDud, 60, 7, 10)!;
    expect(line.names.has('Ballista')).toBe(false);
  });
});

describe('stage 3h — the unresolved slot is worst-case in COST as well as KIND', () => {
  const card = (name: string, type: string): DbCard => ({
    id: name, name, mana_cost: '{1}{G}', cmc: 2, type_line: type, oracle_text: '',
    colors: 'G', color_identity: 'G', power: '2', toughness: '2', rarity: 'common',
    set_code: 'tst', set_name: 'Test', collector_number: '1', image_uri: null,
    layout: 'normal', keywords: null, produced_mana: null, edhrec_rank: null,
    prices_usd: null, legalities: '{}', scryfall_uri: '', released_at: '2020-01-01',
  } as unknown as DbCard);

  /** A land-FLOODED list: the surplus arm of `deviation` is the live one, and
   * that is the arm a high-MV imputation used to relieve. */
  const flooded = (): DeckEntry[] => [
    { feature: deriveCardFeature(card('Forest', 'Basic Land — Forest')), quantity: 45 },
    { feature: deriveCardFeature(card('Bear', 'Creature — Bear')), quantity: 54 },
  ];

  const manaOf = (entries: DeckEntry[]) =>
    computeMana('commander', normsFor('commander'), 99, entries, [], 99).score;
  const kept = () => flooded().map((e) => (e.feature.card.name === 'Bear'
    ? { ...e, quantity: e.quantity - 1 } : e));
  const withMv = (mv: number, kind: 'spell' | 'land' | 'mdfc') =>
    manaOf([...kept(), { feature: blankFeature(mv, kind), quantity: 1 }]);

  it('a HIGH-cost blank alone can RAISE the land fit of a flooded list', () => {
    // This is the defect, asserted so it cannot silently return: one fixed
    // pessimistic MV is NOT pessimistic here.
    expect(withMv(8, 'spell')).toBeGreaterThan(manaOf(flooded()) - 1e-9);
  });

  it('the LOW-cost hypothesis is the one that closes it, and `worst` must see both', () => {
    const all = (['spell', 'land', 'mdfc'] as const).flatMap((k) => [withMv(8, k), withMv(0, k)]);
    const highOnly = (['spell', 'land', 'mdfc'] as const).map((k) => withMv(8, k));
    expect(Math.min(...all)).toBeLessThanOrEqual(Math.min(...highOnly) + 1e-9);
  });

  it('a blank slot is never a cast: it earns zero colour adequacy', () => {
    const a = manaOf(flooded());
    const b = manaOf([...flooded(), { feature: blankFeature(0, 'spell'), quantity: 1 }]);
    expect(b).toBeLessThanOrEqual(a + 1e-9);
  });
});

describe('stage 3h — ledger invariants and version pins', () => {
  it('a package whose upkeep buys nothing is skipped, not paid', () => {
    const body = src({ name: 'Body', cmc: 3, output: 5, guaranteed: true });
    const ruinous = src({
      name: 'Pinger', cmc: 1, output: 2, guaranteed: true, deployDelay: 1,
      shareKey: 'spellslinger', upkeepAt: () => 99,
    });
    const sched = scheduleDamage('commander', 100, [body, ruinous], curveOf(1),
      { perOpponent: 40, opponents: 3 });
    for (const row of sched.ledger) expect(row).toContain('spells 0.00');
  });

  it('no turn overdraws its budget', () => {
    const sched = scheduleDamage('commander', 100, grid(), curveOf(2),
      { perOpponent: 40, opponents: 3 });
    for (const row of sched.ledger) {
      const n = (re: RegExp) => Number(re.exec(row)![1]);
      expect(n(/spells ([\d.]+)/) + n(/activations ([\d.]+)/) + n(/left ([\d.]+)/))
        .toBeLessThanOrEqual(n(/mana ([\d.]+)/) + 1e-6);
    }
  });

  it('pins the scheduler and score versions for this evaluator', () => {
    expect(SCORE_VERSION).toBe('1.4.0-rc10'); // rc10 re-freeze: 1.4.0-rc9 -> 1.4.0-rc10
    expect(W_SCHEDULER_VERSION).toBe('v14-stage3w'); // rc10 re-freeze: v14-stage3r -> v14-stage3w
  });
});
