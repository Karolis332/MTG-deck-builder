// Unit P2-L (2026-09-30) — integrate-2 B-D8 Tainted Pact singleton basics.
import { describe, it, expect } from 'vitest';
import { buildOptimalLandBase } from '../land-intelligence';

describe('B-D8 Tainted Pact: one copy per basic name', () => {
  const total = (r: ReturnType<typeof buildOptimalLandBase>) =>
    r.lands.reduce((s, l) => s + l.quantity, 0) + Object.values(r.basicDistribution).reduce((s, q) => s + q, 0);
  it('singletonBasics caps every basic name at 1 and still fills the land count', () => {
    const r = buildOptimalLandBase({ colors: ['U', 'B'], format: 'commander', targetLandCount: 34, isCommander: true, singletonBasics: true });
    expect(Object.values(r.basicDistribution).every((q) => q <= 1)).toBe(true);
    expect(total(r)).toBe(34);
  });
  it('a thin nonbasic pool (pauper) goes regular basic → snow basic → any scored land, never a duplicate name', () => {
    const r = buildOptimalLandBase({ colors: ['U', 'B'], format: 'commander', targetLandCount: 34, isCommander: true, singletonBasics: true, rarityFilter: 'pauper' });
    expect(Object.values(r.basicDistribution).every((q) => q <= 1)).toBe(true);
    expect(Object.keys(r.basicDistribution).filter((n) => n.startsWith('Snow-Covered ')).sort()).toEqual(['Snow-Covered Island', 'Snow-Covered Swamp']);
    expect(total(r)).toBe(34);
  });
});
