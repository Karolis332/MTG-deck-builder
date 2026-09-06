import { describe, it, expect } from 'vitest';
import { karstenLandCount } from '../deck-builder-constraints';

const spell = (cmc: number, extra: Partial<{ name: string; oracle_text: string; type_line: string; rarity: string }> = {}, quantity = 1) => ({
  card: { name: extra.name ?? `c${cmc}`, oracle_text: extra.oracle_text ?? '', type_line: extra.type_line ?? 'Creature', cmc, rarity: extra.rarity ?? 'common' },
  quantity,
});

describe('karstenLandCount', () => {
  it('reproduces the 99-card formula: avgMV 3, no cheap ramp/draw → 40.81 raw, clamped to range+2', () => {
    const r = karstenLandCount([spell(3)], { deckCards: 99, range: [36, 38] });
    expect(r.raw).toBeCloseTo(31.42 + 3.13 * 3, 2);
    expect(r.lands).toBe(40);
  });

  it('subtracts 0.28 per cheap ramp/draw spell', () => {
    const cheap = Array.from({ length: 10 }, (_, i) => spell(2, { name: `rock${i}`, type_line: 'Artifact', oracle_text: '{T}: Add {C}.' }));
    const r = karstenLandCount([...cheap, ...Array.from({ length: 50 }, (_, i) => spell(3, { name: `x${i}` }))], { deckCards: 99, range: [30, 45] });
    expect(r.cheapRampDraw).toBe(10);
    const avg = (10 * 2 + 50 * 3) / 60;
    expect(r.lands).toBe(Math.round(31.42 + 3.13 * avg - 2.8));
  });

  it('credits MDFC land-backs at 0.38 (0.74 mythic)', () => {
    const base = Array.from({ length: 40 }, (_, i) => spell(3, { name: `x${i}` }));
    const plain = karstenLandCount(base, { deckCards: 99, range: [30, 45] });
    const withMdfc = karstenLandCount(
      [...base, spell(3, { name: 'm1', type_line: 'Instant // Land' }), spell(3, { name: 'm2', type_line: 'Sorcery // Land', rarity: 'mythic' })],
      { deckCards: 99, range: [30, 45] },
    );
    expect(withMdfc.mdfcCredit).toBeCloseTo(1.12, 2);
    expect(withMdfc.lands).toBe(Math.round(plain.raw - 1.12));
  });

  it('clamps to template range ± 2', () => {
    expect(karstenLandCount([spell(0)], { deckCards: 99, range: [36, 38] }).lands).toBe(34);
    expect(karstenLandCount([spell(7)], { deckCards: 99, range: [33, 35] }).lands).toBe(37);
  });

  it('scales 60-card formats by deckCards/99', () => {
    const r = karstenLandCount([spell(3)], { deckCards: 60, range: [24, 24] });
    expect(r.raw).toBeCloseTo((60 / 99) * (31.42 + 9.39), 2);
    expect(r.lands).toBe(25);
  });
});
