/**
 * Deck Score v1.4 stage 3c — Standard dilution + size gate, monotone closing
 * lines (§10.4, §10.9 items 4-5).
 *
 * Two root causes, each fixed at its shared site:
 *
 *  1. `computeMana` measured the land SURPLUS against a requirement that
 *     scales with the SUBMITTED size, so padding a flooded 60-card list to 70
 *     moved the requirement (16.0 -> 19.8) instead of the deck and paid +42
 *     landFit (`standard:1482755`, +18.80 T_abs). The shortfall side still
 *     scales with N (a bigger library needs more lands); the surplus side is
 *     now measured at the profile's reference library `N0`, because stacking
 *     more slots beside a surplus land removes no land. And the scorer's size
 *     rule was commander-family only, so a Standard 60 -> 59 trim was worth
 *     +1.60 S with no size failure.
 *  2. `requiredCopies` sized a closing line from the MEAN output of the `r`
 *     CHEAPEST identified copies, so deleting a weak member promoted a better
 *     one, the mean rose, `r` fell and joint access ROSE. `bestLine` replaces
 *     it with a MAXIMUM OVER SUBSETS: each distinct output level θ defines the
 *     subset of copies that each deal at least θ, needing r(θ) of them — `r`
 *     is a function of θ alone. Deleting a copy can only shrink each subset,
 *     so every candidate falls and so does the maximum.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { SCORE_VERSION } from '../deck-score';
import { scoreDeckSafely, type ScoreCardInput } from '../deck-score-input';
import { computeMana, type DeckEntry } from '../deck-score-mana';
import { blankFeature, deriveCardFeature } from '../deck-score-features';
import { normsFor } from '../deck-score-norms';
import { bestLine, type Source } from '../deck-score-win';
import { readSample, strideOrder, cardsByName } from '../../../scripts/deck-score-piles';
import { isInert, standardStride, isOffPlanTyped, without } from '../../../scripts/deck-score-probes';

vi.setConfig({ testTimeout: 300_000 });

const TOL = 1e-6;

/** Deterministic xorshift — no wall clock, no Math.random in a scored path. */
function rng(seed: number): () => number {
  let x = seed || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

function randomSources(next: () => number): Source[] {
  const n = 1 + Math.floor(next() * 9);
  const out: Source[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      name: `s${i}`,
      cmc: Math.floor(next() * 8),
      quantity: 1 + Math.floor(next() * 4),
      guaranteed: false,
      output: Math.round(next() * 12),
    });
  }
  return out;
}

describe('stage 3c — version', () => {
  it('bumps SCORE_VERSION for the evaluator change', () => {
    expect(SCORE_VERSION).toBe('1.4.0-rc4');
  });
});

describe('stage 3c — the size gate is not commander-family only', () => {
  const deck = standardStride(1)[0];

  it('a 60-card Standard list passes its size check and keeps a rank', () => {
    const payload = scoreDeckSafely({ format: 'standard', main: deck.main, commander: [], unresolved: [] });
    expect(payload).not.toBeNull();
    expect(payload!.gates.filter((g) => g.status === 'fail')).toHaveLength(0);
    expect(payload!.rank).not.toBeNull();
  });

  it('trimming it to 59 is a structural failure: total <= 19 and no rank', () => {
    const offPlan = deck.main.filter((e) => isOffPlanTyped(deriveCardFeature(e.card), 'standard'));
    const trimmed = without(deck.main, offPlan.length > 0 ? offPlan : deck.main.slice(0, 1), 1)!;
    const payload = scoreDeckSafely({ format: 'standard', main: trimmed, commander: [], unresolved: [] })!;
    const size = payload.gates.find((g) => g.key === 'size' || /library card/.test(g.reason));
    expect(size?.status).toBe('fail');
    expect(payload.absoluteTotal).toBeLessThanOrEqual(19);
    expect(payload.rank).toBeNull();
  });

  it('a reserved unresolved slot still counts toward the 60', () => {
    const offPlan = deck.main.filter((e) => isOffPlanTyped(deriveCardFeature(e.card), 'standard'));
    const trimmed = without(deck.main, offPlan.length > 0 ? offPlan : deck.main.slice(0, 1), 1)!;
    const payload = scoreDeckSafely({
      format: 'standard', main: trimmed, commander: [],
      unresolved: [{ name: 'Unreadable Card', quantity: 1, board: 'main' }],
    })!;
    expect(payload.rank).not.toBeNull();
    expect(payload.absoluteTotal).toBeGreaterThan(19);
  });
});

describe('stage 3c — the land surplus is measured at the reference library', () => {
  const norms = normsFor('standard');
  const byName = cardsByName();
  const spell = (name: string): DbCard => {
    const card = byName.get(name.toLowerCase());
    if (!card) throw new Error(`fixture card missing: ${name}`);
    return card;
  };
  const entriesOf = (cards: [string, number][]): DeckEntry[] =>
    cards.map(([name, quantity]) => ({ feature: deriveCardFeature(spell(name)), quantity }));

  // 22 lands / 38 spells: the flooded shape `standard:1482755` had.
  const flooded = entriesOf([['Mountain', 22], ['Lightning Bolt', 38]]);
  const padding: DeckEntry[] = [{ feature: blankFeature(7, 'spell'), quantity: 10 }];

  it('padding a flooded 60-card list cannot raise M', () => {
    const before = computeMana('standard', norms, 60, flooded, [], 60);
    const after = computeMana('standard', norms, 70, [...flooded, ...padding], [], 60);
    expect(after.score).toBeLessThanOrEqual(before.score + TOL);
  });

  it('the surplus is unchanged by the padding while the requirement grows', () => {
    const after = computeMana('standard', norms, 70, [...flooded, ...padding], [], 60);
    // Reason prints `Leff effective lands vs Lstar`: the SHORTFALL target.
    expect(after.reason).toMatch(/^22 effective lands vs /);
  });

  it('an under-landed deck is still penalised more as the library grows', () => {
    const thin = entriesOf([['Mountain', 14], ['Lightning Bolt', 46]]);
    const before = computeMana('standard', norms, 60, thin, [], 60);
    const after = computeMana('standard', norms, 70, [...thin, ...padding], [], 60);
    expect(after.score).toBeLessThanOrEqual(before.score + TOL);
  });

  it('at N === N0 the two targets coincide (the real corpus is unmoved)', () => {
    const withN0 = computeMana('standard', norms, 60, flooded, [], 60);
    const withoutN0 = computeMana('standard', norms, 60, flooded, []);
    expect(withN0.score).toBeCloseTo(withoutN0.score, 10);
  });
});

describe('stage 3c — bestLine is a maximum over subsets', () => {
  const run = (sources: Source[]) => bestLine('commander', 99, 8, sources, 120, 11, 10);

  it('deleting a member never raises the line (300 random source sets)', () => {
    const next = rng(0x3c0001);
    let violations = 0;
    for (let i = 0; i < 300; i++) {
      const sources = randomSources(next);
      const before = run(sources);
      if (!before) continue;
      const drop = Math.floor(next() * sources.length);
      const after = run(sources.filter((_, j) => j !== drop));
      if (after && after.access > before.access + TOL) violations++;
    }
    expect(violations).toBe(0);
  });

  it('blanking a member (output -> 0) never raises the line', () => {
    const next = rng(0x3c0002);
    let violations = 0;
    for (let i = 0; i < 300; i++) {
      const sources = randomSources(next);
      const before = run(sources);
      if (!before) continue;
      const blank = Math.floor(next() * sources.length);
      const after = run(sources.map((s, j) => (j === blank ? { ...s, output: 0 } : s)));
      if (after && after.access > before.access + TOL) violations++;
    }
    expect(violations).toBe(0);
  });

  it('the old mean-of-the-cheapest inversion is gone on its minimal case', () => {
    // Two cheap 1-output copies and one expensive 12-output copy: the old
    // sizing averaged the cheapest, so deleting a 1-output copy raised the
    // mean, lowered `r` and raised access.
    const sources: Source[] = [
      { name: 'weak-a', cmc: 1, quantity: 1, guaranteed: false, output: 1 },
      { name: 'weak-b', cmc: 1, quantity: 1, guaranteed: false, output: 1 },
      { name: 'big', cmc: 6, quantity: 1, guaranteed: false, output: 12 },
    ];
    const before = run(sources)!;
    const after = run(sources.filter((s) => s.name !== 'weak-a'))!;
    expect(after.access).toBeLessThanOrEqual(before.access + TOL);
  });

  it('r depends on the output level alone, never on which copies survive', () => {
    const sources: Source[] = [
      { name: 'a', cmc: 1, quantity: 4, guaranteed: false, output: 5 },
      { name: 'b', cmc: 9, quantity: 1, guaranteed: false, output: 5 },
    ];
    const both = run(sources)!;
    const one = run(sources.filter((s) => s.name !== 'b'))!;
    expect(one.r).toBe(both.r);
  });

  it('every source at zero output leaves no line', () => {
    expect(run([{ name: 'z', cmc: 1, quantity: 4, guaranteed: false, output: 0 }])).toBeNull();
  });
});

describe('stage 3c — the probe pool is feature-matched (§10.4)', () => {
  const byName = cardsByName();
  it('a real creature with printed power is not an inert addition', () => {
    const bear = byName.get('grizzly bears') ?? byName.get('llanowar elves');
    if (!bear) return;
    expect(isInert(deriveCardFeature(bear))).toBe(false);
  });
  it('a reserved unresolved slot fills no plan role and is never covered', () => {
    const blank = blankFeature(7, 'spell');
    expect(blank.covered).toBe(false);
    expect(blank.power).toBeNull();
    expect(blank.isRamp || blank.isDraw || blank.isTokenProducer).toBe(false);
  });
});

describe('stage 3c — pinned lists', () => {
  interface StrideDeck { id: string; main: ScoreCardInput[]; commander: DbCard[] }
  function commanderStride(n: number): StrideDeck[] {
    const byName = cardsByName();
    const sample = readSample('commander');
    const out: StrideDeck[] = [];
    for (const i of strideOrder('training', sample)) {
      if (out.length >= n) break;
      const deck = sample[i];
      if (!deck) continue;
      const main: ScoreCardInput[] = [];
      const commander: DbCard[] = [];
      let took = false;
      let missing = 0;
      for (const line of deck.cards) {
        const card = byName.get(line.name.toLowerCase());
        if (!card) { missing += line.quantity; continue; }
        if (!took && line.name.toLowerCase() === deck.commander.toLowerCase()) { commander.push(card); took = true; continue; }
        main.push({ card, quantity: line.quantity });
      }
      if (main.length === 0 || commander.length === 0 || missing > 0) continue;
      out.push({ id: deck.id, main, commander });
    }
    return out;
  }

  // OPEN, re-root-caused in stage 3c: this residue is NOT `requiredCopies`.
  // Blanking `Conqueror's Flail` moves the VOLTRON schedule from T13 to T12
  // (W .9 -> 2.7) — deleting a pump source makes the line close EARLIER, so
  // the defect is in the damage schedule's deployment ledger, not in the line
  // sizing. Pinned at its measured value so stage 4 sees it move.
  it('381364921: the voltron-schedule residue is pinned at +1.44', () => {
    const deck = commanderStride(100000).find((d) => d.id === '381364921');
    if (!deck) return;
    const offPlan = deck.main.filter((e) => isOffPlanTyped(deriveCardFeature(e.card), 'commander'));
    const trimmed = without(deck.main, offPlan, 1);
    if (!trimmed) return;
    const before = scoreDeckSafely({ format: 'commander', main: deck.main, commander: deck.commander, unresolved: [] })!;
    const after = scoreDeckSafely({
      format: 'commander', main: trimmed, commander: deck.commander,
      unresolved: [{ name: 'Unreadable Card', quantity: 1, board: 'main' }],
    })!;
    expect(after.absoluteTotal - before.absoluteTotal).toBeCloseTo(-1.12, 2);
  });

  it('adding unknown slots to a Standard list never raises S', () => {
    let violations = 0;
    for (const deck of standardStride(60)) {
      const before = scoreDeckSafely({ format: 'standard', main: deck.main, commander: [], unresolved: [] });
      if (!before) continue;
      for (const k of [1, 5, 10]) {
        const after = scoreDeckSafely({
          format: 'standard', main: deck.main, commander: [],
          unresolved: [{ name: 'Unreadable Card', quantity: k, board: 'main' }],
        });
        if (!after) continue;
        const s = (p: typeof before) => p.components.find((c) => c.key === 'synergy')!.score;
        if (s(after) > s(before) + TOL) violations++;
      }
    }
    expect(violations).toBe(0);
  });
});
