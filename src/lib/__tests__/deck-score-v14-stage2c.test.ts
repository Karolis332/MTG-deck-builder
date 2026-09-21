/**
 * Deck Score v1.4 stage 2c — the absolute/rank result layer.
 * docs/DECK_SCORE_SPEC.md §10.9 (headline decision), items 1-5.
 *
 *     T_abs      the composed absolute total, UNROUNDED
 *     rank_p(t)  100 * (F_p(t-) + .5*m_p(t)) in the profile's frozen CDF
 *
 * Every number pinned here was MEASURED by a named command, never chosen:
 * the references by `bands reference freeze --write` (reproduced with 0
 * mismatches by `bands verify`), the anchor totals by
 * `scripts/deck-score-report.ts`. Nothing here writes the repo card DB, the
 * catalogue shards or a reference file.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, SCORE_VERSION } from '../deck-score';
import { scoreDeckSafely } from '../deck-score-input';
import {
  REFERENCE_VERSION, buildReferenceKnots, meanReferenceRank, rankOf, referenceFor,
  resolveReference, type DeckScoreReference,
} from '../deck-score-reference';
import { readSample, strideOrder, cardsByName } from '../../../scripts/deck-score-piles';

vi.setConfig({ testTimeout: 180_000 });

// ── a tiny hand-built reference for the pure mapping ──────────────────────
//
// Three families, so every family carries weight 1/3:
//   A: 20, 20   (each 1/6) -> a TIE of mass 1/3 at t=20
//   B: 50       (1/3)
//   C: 80       (1/3)
const SAMPLES = [
  { value: 20, family: 'A' }, { value: 20, family: 'A' },
  { value: 50, family: 'B' }, { value: 80, family: 'C' },
];

function toy(overrides: Partial<DeckScoreReference> = {}): DeckScoreReference {
  const built = buildReferenceKnots(SAMPLES);
  return {
    profile: 'commander',
    referenceVersion: REFERENCE_VERSION,
    scoreVersion: SCORE_VERSION,
    catalogueHash: 'toy', domainHash: 'toy', cohortHash: 'toy',
    families: built.families, rows: built.rows, excluded: {}, frozenAt: '2026-09-21',
    largestAtom: built.largestAtom, tiedIntervals: built.tiedIntervals, knots: built.knots,
    ...overrides,
  };
}

describe('§10.9 item 2 — the mapping', () => {
  const ref = toy();

  it('is 0 below the support and 100 above it', () => {
    expect(rankOf(ref, 19.999)).toBe(0);
    expect(rankOf(ref, -5)).toBe(0);
    expect(rankOf(ref, 80.0001)).toBe(100);
    expect(rankOf(ref, 1000)).toBe(100);
  });

  it('gives a tied value the midpoint of its tied interval', () => {
    // mass 1/3 at 20, nothing below: 100*(0 + .5*1/3) = 16.666…
    expect(rankOf(ref, 20)).toBeCloseTo(100 / 6, 12);
  });

  it('gives an untied knot below + half its own mass', () => {
    // below 50 = 1/3, its own mass 1/3 -> 100*(1/3 + 1/6) = 50
    expect(rankOf(ref, 50)).toBeCloseTo(50, 12);
    expect(rankOf(ref, 80)).toBeCloseTo(100 * (2 / 3 + 1 / 6), 12);
  });

  it('returns the cumulative weight BELOW between knots — no interpolation', () => {
    // Everything strictly between 20 and 50 reads the same 1/3: a linear
    // interpolation would rise across the gap.
    expect(rankOf(ref, 20.0001)).toBeCloseTo(100 / 3, 12);
    expect(rankOf(ref, 35)).toBeCloseTo(100 / 3, 12);
    expect(rankOf(ref, 49.9999)).toBeCloseTo(100 / 3, 12);
    expect(rankOf(ref, 49.9999)).toBe(rankOf(ref, 20.0001));
  });

  it('is monotone: t1 <= t2 implies rank(t1) <= rank(t2)', () => {
    let last = -1;
    for (let t = -10; t <= 110; t += 0.37) {
      const r = rankOf(ref, t);
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
  });

  it('weights sum to 1 and the weighted training mean rank is 50', () => {
    expect(ref.knots.reduce((s, k) => s + k.mass, 0)).toBeCloseTo(1, 12);
    expect(Math.abs(meanReferenceRank(ref) - 50)).toBeLessThan(1e-9);
  });

  it('weights by family, not by list: a 10-list family still carries 1/F', () => {
    const built = buildReferenceKnots([
      ...Array.from({ length: 10 }, () => ({ value: 10, family: 'big' })),
      { value: 90, family: 'small' },
    ]);
    expect(built.families).toBe(2);
    expect(built.knots[0].mass).toBeCloseTo(0.5, 12);
    expect(built.knots[0].n).toBe(10);
    expect(built.tiedIntervals).toBe(1);
    expect(built.largestAtom).toBeCloseTo(0.5, 12);
  });

  it('distinguishes the unrounded rank from the displayed one at a band edge', () => {
    // A value whose rank is 49.7 rounds to 50 but does NOT meet a p50 lower
    // bound (§10.9: "grade bands and probes on unrounded rank").
    const edge = toy({
      knots: [{ t: 10, below: 0, mass: 0.497, n: 497 }, { t: 90, below: 0.497, mass: 0.503, n: 503 }],
    });
    const r = rankOf(edge, 11);
    expect(r).toBeCloseTo(49.7, 12);
    expect(Math.round(r)).toBe(50);
    expect(r >= 50).toBe(false);
  });
});

describe('§10.9 item 2 — reference admission', () => {
  it('rejects an incompatible reference version', () => {
    expect(resolveReference(toy({ referenceVersion: '0.0.0-old' }))).toBeNull();
  });

  it('rejects a reference frozen on another score version', () => {
    expect(resolveReference(toy({ scoreVersion: '0.0.0' }))).toBeNull();
  });

  it('rejects an unfrozen (0-knot) reference and a missing one', () => {
    expect(resolveReference(toy({ knots: [] }))).toBeNull();
    expect(resolveReference(null)).toBeNull();
  });

  it('admits commander and brawl, and NO other format', () => {
    expect(referenceFor('commander')).not.toBeNull();
    expect(referenceFor('brawl')).not.toBeNull();
    // No cohort exists for these, and a 100-card format never borrows
    // another profile's CDF.
    expect(referenceFor('competitivebrawl')).toBeNull();
    expect(referenceFor('standardbrawl')).toBeNull();
    // Standard has 27 manifest families (< 30), so its freeze is REFUSED.
    expect(referenceFor('standard')).toBeNull();
  });
});

describe('§10.9 item 2 — the frozen references', () => {
  const commander = referenceFor('commander') as DeckScoreReference;
  const brawl = referenceFor('brawl') as DeckScoreReference;

  it('pins the commander reference population and hash', () => {
    expect(commander.rows).toBe(1440);
    expect(commander.families).toBe(182);
    expect(commander.knots.length).toBe(391);
    expect(commander.tiedIntervals).toBe(187);
    expect(commander.cohortHash).toBe('f7f6d8b52eaa012a527a539c7c49e9cc60f24a74d1cc4d81126a5565e3258ccd');
    expect(commander.excluded).toEqual({ legality: 241, identity: 78, singleton: 18, duplicate: 20, unresolved: 1 });
  });

  it('pins the brawl reference population and hash', () => {
    expect(brawl.rows).toBe(785);
    expect(brawl.families).toBe(179);
    expect(brawl.knots.length).toBe(159);
    expect(brawl.tiedIntervals).toBe(67);
    expect(brawl.cohortHash).toBe('ca5bb51e16912e46e947d78d2061d1a220c960517916fe99339865ae3a8d8a45');
    expect(brawl.excluded).toEqual({ legality: 335, duplicate: 12, singleton: 6, unresolved: 5, identity: 3 });
  });

  it('has weights summing to 1 and a weighted mean rank of 50 in both', () => {
    for (const ref of [commander, brawl]) {
      expect(Math.abs(ref.knots.reduce((s, k) => s + k.mass, 0) - 1)).toBeLessThan(1e-12);
      expect(Math.abs(meanReferenceRank(ref) - 50)).toBeLessThan(1e-9);
    }
  });

  it('keeps the knots sorted with consistent cumulative weights', () => {
    for (const ref of [commander, brawl]) {
      let below = 0;
      for (const k of ref.knots) {
        expect(k.below).toBeCloseTo(below, 12);
        below += k.mass;
      }
    }
  });
});

describe('§10.9 item 7 — the 16 anchors, graded on unrounded rank', () => {
  const commander = referenceFor('commander') as DeckScoreReference;
  const brawl = referenceFor('brawl') as DeckScoreReference;
  // T_abs measured by `scripts/deck-score-report.ts` at this domain.
  const cases: Array<[string, DeckScoreReference | null, number | null, number, number, boolean]> = [
    ['1 meren-powerhouse', commander, 56.24, 65, 90, true],
    ['2 cabbage-cedh-input', commander, 59.2, 50, 90, true],
    ['3 precon-witherbloom', commander, 22.560000000000002, 15, 40, true],
    ['4 the-cabbage-merchant', commander, 54.00, 50, 90, true],
    ['5 imotekh-the-stormlord', commander, 51.120000000000005, 40, 80, true],
    ['6 tazri-beacon-of-unity', commander, 56.24, 35, 75, false],
    ['10 tazri-upgraded-arena', brawl, 68.32, 35, 65, true],
    ['11 kuja-genome-sorcerer-arena', brawl, 56.00, 25, 60, false],
    ['12 vivi-battery-arena', brawl, 86.16000000000001, 80, 100, true],
    ['14 cedhtop16-ballooncon6', commander, 92.02474226804125, 95, 100, true],
    // Uncalibrated profiles: no CDF, so no pass is possible.
    ['13 fire-lord-azula-competitive', null, null, 80, 100, false],
    ['15 standard-1445893-univerce', null, null, 65, 95, false],
    ['16 standard-1445867-aljce', null, null, 55, 90, false],
  ];
  for (const [name, ref, tAbs, lo, hi, expected] of cases) {
    it(`${name} verdict is ${expected ? 'PASS' : 'FAIL'}`, () => {
      const rank = ref && tAbs !== null ? rankOf(ref, tAbs) : null;
      expect(rank !== null && rank >= lo && rank <= hi).toBe(expected);
    });
  }

  it('pins the measured anchor ranks', () => {
    expect(rankOf(commander, 56.24)).toBeCloseTo(79.91, 2);
    expect(rankOf(commander, 22.560000000000002)).toBeCloseTo(24.40, 2);
    expect(rankOf(commander, 92.02474226804125)).toBeCloseTo(99.77, 2);
    expect(rankOf(brawl, 86.16000000000001)).toBeCloseTo(99.86, 2);
    // The atom sensitivity is real: one ULP below the precon's knot is a
    // different (lower) midrank. Equality is on the canonical numeric output.
    expect(rankOf(commander, 22.56)).toBeCloseTo(24.25, 2);
    expect(rankOf(brawl, 56.00)).toBeCloseTo(8.30, 2);
  });
});

// ── payload behaviour on real lists ───────────────────────────────────────

function strideDeck(index: number): { main: { card: DbCard; quantity: number }[]; commander: DbCard[] } {
  const byName = cardsByName();
  const sample = readSample('commander');
  const deck = sample[strideOrder('training', sample)[index]];
  const main: { card: DbCard; quantity: number }[] = [];
  const commander: DbCard[] = [];
  const commanderName = deck.commander.toLowerCase();
  let took = false;
  for (const line of deck.cards) {
    const card = byName.get(line.name.toLowerCase());
    if (!card) continue;
    if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
    main.push({ card, quantity: line.quantity });
  }
  return { main, commander };
}

describe('§10.9 item 4 — the payload', () => {
  it('carries the unrounded total, and `score` is still its rounding', () => {
    const deck = strideDeck(0);
    const payload = scoreDeckSafely({ format: 'commander', ...deck });
    expect(payload).not.toBeNull();
    expect(payload?.score).toBe(Math.round(payload?.absoluteTotal as number));
    expect(payload?.absoluteTotalDisplay).toBe(payload?.score);
  });

  it('ranks the UNROUNDED total in the profile CDF, evidence label aside', () => {
    const deck = strideDeck(1);
    const payload = scoreDeckSafely({ format: 'commander', ...deck });
    const ref = referenceFor('commander') as DeckScoreReference;
    expect(payload?.rank).toBeCloseTo(rankOf(ref, payload?.absoluteTotal as number), 12);
    expect(payload?.rankDisplay).toBe(Math.round(payload?.rank as number));
    expect(payload?.headline).toEqual({ kind: 'rank', value: payload?.rank });
    expect(['calibrated', 'provisional']).toContain(payload?.evidence);
    expect(payload?.reference?.profile).toBe('commander');
    expect(payload?.reference?.referenceVersion).toBe(REFERENCE_VERSION);
  });

  it('a provisional list uses the SAME CDF, unshifted', () => {
    const byName = cardsByName();
    const sample = readSample('commander');
    const deck = sample[strideOrder('training', sample)[2]];
    const main: { card: DbCard; quantity: number }[] = [];
    const commander: DbCard[] = [];
    const commanderName = deck.commander.toLowerCase();
    let took = false;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) continue;
      if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    // One unreadable name makes the estimate provisional (§10.5) without
    // removing the rank or moving it off this profile's reference.
    const provisional = scoreDeckSafely({
      format: 'commander', main, commander,
      unresolved: [{ name: 'Unreadable Card', quantity: 1, board: 'main' }],
    });
    expect(provisional?.evidence).toBe('provisional');
    expect(provisional?.headline.kind).toBe('rank');
    const ref = referenceFor('commander') as DeckScoreReference;
    expect(provisional?.rank).toBeCloseTo(rankOf(ref, provisional?.absoluteTotal as number), 12);
  });

  it('a confirmed rule failure leaves the rank domain but keeps the cap and components', () => {
    const deck = strideDeck(3);
    // 4 copies of one nonbasic in a singleton format: a confirmed rule fail.
    const illegal = [{ card: deck.main[0].card, quantity: 5 }, ...deck.main.slice(1)];
    const payload = scoreDeckSafely({ format: 'commander', main: illegal, commander: deck.commander });
    expect(payload?.gates.some((g) => g.kind === 'rules' && g.status === 'fail')).toBe(true);
    expect(payload?.rank).toBeNull();
    expect(payload?.rankDisplay).toBeNull();
    expect(payload?.headline).toEqual({ kind: 'none', value: null });
    expect(payload?.evidence).toBe('invalid');
    expect(payload?.score).toBeLessThanOrEqual(19);
    expect(payload?.components.length).toBe(8);
  });

  it('an uncalibrated format returns null rank and never borrows a CDF', () => {
    // A rule-VALID Competitive Brawl list: `uncalibrated` must be the reason
    // for the missing rank, not a rule failure (which would read `none`).
    const byName = cardsByName();
    const sample = readSample('brawl');
    let brawlish: ReturnType<typeof scoreDeckSafely> = null;
    for (const i of strideOrder('training', sample).slice(0, 40)) {
      const deck = sample[i];
      const main: { card: DbCard; quantity: number }[] = [];
      const commander: DbCard[] = [];
      const commanderName = deck.commander.toLowerCase();
      let took = false;
      let missing = 0;
      for (const line of deck.cards) {
        const card = byName.get(line.name.toLowerCase());
        if (!card) { missing += 1; continue; }
        if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
        main.push({ card, quantity: line.quantity });
      }
      if (missing > 0 || !commander.length) continue;
      const payload = scoreDeckSafely({ format: 'competitivebrawl', main, commander });
      if (payload && !payload.gates.some((g) => g.kind === 'rules' && g.status === 'fail')) {
        brawlish = payload;
        break;
      }
    }
    expect(brawlish).not.toBeNull();
    expect(brawlish?.rank).toBeNull();
    expect(brawlish?.rankDisplay).toBeNull();
    expect(brawlish?.headline).toEqual({ kind: 'uncalibrated', value: null });
    expect(brawlish?.evidence).toBe('uncalibrated');
    expect(brawlish?.reference).toBeNull();
    // The absolute diagnostics survive; only the percentile is withheld.
    expect(typeof brawlish?.absoluteTotal).toBe('number');
  });

  it('never throws when a profile has no reference file', () => {
    const deck = strideDeck(5);
    // A 99-card Commander list is not a legal Standard Brawl deck, so this
    // one leaves the rank domain on the RULE path — either way the reference
    // is absent and nothing throws.
    expect(() => scoreDeckSafely({ format: 'standardbrawl', ...deck })).not.toThrow();
    const payload = scoreDeckSafely({ format: 'standardbrawl', ...deck });
    expect(payload?.rank).toBeNull();
    expect(payload?.reference).toBeNull();
    expect(['uncalibrated', 'none']).toContain(payload?.headline.kind);
    expect(payload?.headline.value).toBeNull();
  });

  it('exposes the same unrounded total through the pure scorer', () => {
    const deck = strideDeck(6);
    const payload = scoreDeckSafely({ format: 'commander', ...deck });
    const pure = scoreDeck({
      format: 'commander', main: deck.main, commander: deck.commander, sideboard: [],
      unresolved: [], cardDataVersion: 'test', corpus: null,
    });
    expect(pure.absoluteTotal).toBeCloseTo(payload?.absoluteTotal as number, 12);
    expect(pure.score).toBe(Math.round(pure.absoluteTotal));
  });
});

describe('§10.9 stage 5 — latency', () => {
  it('scores the eligible Commander stride well under 20 ms median', () => {
    const byName = cardsByName();
    const sample = readSample('commander');
    const decks: Array<{ main: { card: DbCard; quantity: number }[]; commander: DbCard[] }> = [];
    for (const i of strideOrder('training', sample).slice(0, 200)) {
      const deck = sample[i];
      const main: { card: DbCard; quantity: number }[] = [];
      const commander: DbCard[] = [];
      const commanderName = deck.commander.toLowerCase();
      let took = false;
      for (const line of deck.cards) {
        const card = byName.get(line.name.toLowerCase());
        if (!card) continue;
        if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
        main.push({ card, quantity: line.quantity });
      }
      if (main.length && commander.length) decks.push({ main, commander });
    }
    const times: number[] = [];
    let cold = NaN;
    for (const deck of decks) {
      const t0 = process.hrtime.bigint();
      scoreDeckSafely({ format: 'commander', ...deck });
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      if (Number.isNaN(cold)) cold = ms;
      times.push(ms);
    }
    times.sort((a, b) => a - b);
    const p50 = times[Math.floor(times.length / 2)];
    const p95 = times[Math.floor(times.length * 0.95)];
    // §10.9 stage 5 asks for the tails and the cold call, not just the median.
    // eslint-disable-next-line no-console
    console.log(`latency n=${decks.length} cold ${cold.toFixed(2)} ms, `
      + `p50 ${p50.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, max ${times[times.length - 1].toFixed(2)} ms`);
    expect(decks.length).toBeGreaterThan(100);
    expect(p50).toBeLessThan(20);
  });
});
