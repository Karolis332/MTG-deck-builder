import { describe, it, expect } from 'vitest';
import {
  compositionOf,
  compareToSet,
  qualityIndex,
  compositionDistanceOf,
  nonlandNames,
  type CompositionWithNames,
} from '../benchmark-metrics';

// Minimal card fixtures. oracle_text is chosen to hit specific classifyCard
// buckets so composition counts are predictable.
const land = (name: string) => ({ name, type_line: 'Land', cmc: 0, oracle_text: '' });
const ramp = (name: string, cmc = 2) => ({ name, type_line: 'Artifact', cmc, oracle_text: 'Add one mana of any color.' });
const draw = (name: string, cmc = 3) => ({ name, type_line: 'Sorcery', cmc, oracle_text: 'Draw two cards.' });
const vanilla = (name: string, cmc = 4) => ({ name, type_line: 'Creature — Bear', cmc, oracle_text: '' });

function withNames(cards: ReturnType<typeof land>[]): CompositionWithNames {
  return { ...compositionOf(cards), names: nonlandNames(cards) };
}

describe('compositionOf', () => {
  it('counts lands separately and computes avgCmcNonLand over nonland only', () => {
    const cards = [land('Forest'), land('Island'), ramp('Sol Ring', 1), draw('Divination', 3)];
    const comp = compositionOf(cards);
    expect(comp.lands).toBe(2);
    expect(comp.ramp).toBe(1);
    expect(comp.draw).toBe(1);
    expect(comp.avgCmcNonLand).toBeCloseTo(2, 5); // (1+3)/2
  });
});

describe('compareToSet', () => {
  // Build: 2 nonland cards, one shared with all 3 refs, one shared with none.
  const build = withNames([ramp('Sol Ring', 1), vanilla('Nobody Plays Me')]);

  const ref1 = withNames([ramp('Sol Ring', 1), draw('Rhystic Study', 3), ramp('Arcane Signet', 2)]);
  const ref2 = withNames([ramp('Sol Ring', 1), draw('Rhystic Study', 3), draw('Sylvan Library', 1)]);
  const ref3 = withNames([ramp('Sol Ring', 1), vanilla('Filler Beater'), draw('Sylvan Library', 1)]);
  const refs = [ref1, ref2, ref3];

  it('computes overlap mean/best by hand: build has 2 nonland cards, only Sol Ring ever matches', () => {
    // Each ref: hit=1 (Sol Ring only) / denom=2 => 50%. Mean and best are both 50.
    const result = compareToSet(build, refs);
    expect(result.overlapMeanPct).toBeCloseTo(50, 5);
    expect(result.overlapBestPct).toBeCloseTo(50, 5);
  });

  it('flags staplesMissing at exactly the 60% frequency threshold', () => {
    const result = compareToSet(build, refs);
    // Rhystic Study appears in 2/3 refs = 66.7% >= 60% -> staple, missing from build.
    // Sylvan Library appears in 2/3 refs = 66.7% >= 60% -> staple, missing from build.
    // Arcane Signet / Filler Beater each appear in 1/3 = 33% -> not a staple.
    const names = result.staplesMissing.map((s) => s.name);
    expect(names).toContain('Rhystic Study');
    expect(names).toContain('Sylvan Library');
    expect(names).not.toContain('Arcane Signet');
    expect(names).not.toContain('Filler Beater');
    // Sol Ring is in the build, so even at 100% freq it must not appear as missing.
    expect(names).not.toContain('Sol Ring');
  });

  it('flags oddCards as build nonland cards present in zero refs, in original casing', () => {
    const result = compareToSet(build, refs);
    expect(result.oddCards).toEqual(['Nobody Plays Me']);
  });
});

describe('qualityIndex', () => {
  it('returns 100 for a perfect match (full overlap, zero distance, bracket match)', () => {
    const score = qualityIndex({ overlapMeanPct: 100, compositionDistance: 0, bracketMatch: true });
    expect(score).toBe(100);
  });

  it('returns 0 for a total miss (no overlap, max distance, bracket mismatch)', () => {
    const score = qualityIndex({ overlapMeanPct: 0, compositionDistance: 1, bracketMatch: false });
    expect(score).toBe(0);
  });

  it('caps compositionDistance contribution even if distance exceeds 1', () => {
    const capped = qualityIndex({ overlapMeanPct: 0, compositionDistance: 5, bracketMatch: false });
    const atOne = qualityIndex({ overlapMeanPct: 0, compositionDistance: 1, bracketMatch: false });
    expect(capped).toBe(atOne);
  });
});

describe('compositionDistanceOf', () => {
  it('is 0 when build matches ref medians exactly on all 8 count metrics', () => {
    const build = withNames([ramp('Sol Ring', 1)]);
    const distance = compositionDistanceOf(
      compareToSet(build, [build, build]).deltas
    );
    expect(distance).toBe(0);
  });
});
