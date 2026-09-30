// Unit P2-L (2026-09-30) — integrate-2 B-D1 land target.
import { describe, it, expect } from 'vitest';
import { resolveLandTarget } from '../deck-builder-ai';
import { getRecommendedLands } from '../deck-templates';

describe('B-D1 land target follows ramp and curve', () => {
  it('combo at MV 1.9 with 16 honest ramp pieces: recommendation − 2 (ramp) − 2 (curve), floor 30', () => {
    expect(resolveLandTarget('combo', 4, 16, 1.9)).toBe(Math.max(30, getRecommendedLands('combo', 4) - 4));
    expect(resolveLandTarget('combo', 1, 40, 1.0)).toBe(30);
    expect(resolveLandTarget('not-a-template', 2, 8, 3.2)).toBe(resolveLandTarget('midrange', 2, 8, 3.2));
  });
  it('no adjustment below 8 ramp / MV ≥ 3; −1 per 3 ramp over 8; −1 under MV 3, −2 under 2.5', () => {
    const base = Math.min(38, Math.max(30, getRecommendedLands('midrange', 2)));
    expect(resolveLandTarget('midrange', 2, 8, 3.2)).toBe(base);
    expect(resolveLandTarget('midrange', 2, 11, 2.7)).toBe(base - 2);
    expect(resolveLandTarget('midrange', 2, 14, 2.4)).toBe(base - 4);
  });
  it('a landfall deck keeps the recommendation — its ramp is land drops', () => {
    expect(resolveLandTarget('midrange', 2, 26, 3.07, true)).toBe(Math.min(38, Math.max(30, getRecommendedLands('midrange', 2))));
  });
});
