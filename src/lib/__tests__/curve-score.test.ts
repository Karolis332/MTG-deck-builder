import { describe, it, expect } from 'vitest';
import { computeCurveScore, HIGH_CMC_COMMANDER_THRESHOLD } from '../curve-score';
import { getScaledCurve } from '../deck-templates';

// Build a card list that exactly matches a scaled target curve, for a clean
// "perfect match" baseline.
function cardsFromCurve(curve: Record<number, number>): Array<{ cmc: number }> {
  const cards: Array<{ cmc: number }> = [];
  for (const [cmc, count] of Object.entries(curve)) {
    for (let i = 0; i < count; i++) cards.push({ cmc: Number(cmc) });
  }
  return cards;
}

describe('computeCurveScore', () => {
  it('has zero per-bucket deltas — and a high score — for a deck matching the target curve exactly (low-CMC commander)', () => {
    const nonLandSlots = 61;
    const target = getScaledCurve('midrange', nonLandSlots);
    const cards = cardsFromCurve(target);
    const result = computeCurveScore('midrange', 3, cards);
    for (const delta of Object.values(result.perBucket)) expect(delta).toBe(0);
    // Not necessarily exactly 100: the archetype template's manaCurve bucket
    // counts and its separately-declared avgCmc range aren't perfectly
    // consistent with each other (pre-existing deck-templates.ts data, out
    // of this round's scope) — the avg-CMC term can still cost a few points
    // even on a bucket-perfect curve. High score, not necessarily perfect.
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('penalizes a curve that is all high-CMC cards', () => {
    const cards = Array.from({ length: 40 }, () => ({ cmc: 7 }));
    const result = computeCurveScore('aggro', 2, cards);
    expect(result.score).toBeLessThan(50);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('reports per-bucket deltas keyed by CMC bucket string', () => {
    const cards = [{ cmc: 1 }, { cmc: 1 }, { cmc: 2 }, { cmc: 8 }];
    const result = computeCurveScore('midrange', 3, cards);
    expect(Object.keys(result.perBucket)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7+']);
    // An 8-drop buckets into '7+'.
    expect(result.perBucket['7+']).toBeGreaterThanOrEqual(1);
  });

  it('handles an empty nonland pool without throwing or producing NaN', () => {
    const result = computeCurveScore('midrange', 4, []);
    expect(Number.isNaN(result.score)).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('a high-CMC commander (>= threshold) shifts the target curve down vs a low-CMC one', () => {
    const nonLandSlots = 61;
    // Same raw card pool for both — only commanderCmc differs.
    const cards = cardsFromCurve(getScaledCurve('midrange', nonLandSlots));
    const low = computeCurveScore('midrange', HIGH_CMC_COMMANDER_THRESHOLD - 1, cards);
    const high = computeCurveScore('midrange', HIGH_CMC_COMMANDER_THRESHOLD, cards);
    // The deck was built to match the UNADJUSTED curve, so once the target
    // shifts (high-CMC commander), the match should get strictly worse.
    expect(high.score).toBeLessThan(low.score);
  });

  it('clamps score to [0, 100]', () => {
    const cards = Array.from({ length: 60 }, (_, i) => ({ cmc: i % 8 }));
    const result = computeCurveScore('spellslinger', 6, cards);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
