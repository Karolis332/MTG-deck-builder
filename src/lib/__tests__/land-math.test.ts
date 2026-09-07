import { describe, it, expect } from 'vitest';
import { karstenLands, karstenFormula, countMdfcLandBacks, effectiveLandCount } from '../land-math';

describe('karstenLands', () => {
  it('60-card: avg MV 2.5 with 4 cheap draw/ramp → 23', () => {
    // 19.59 + 1.90*2.5 - 0.28*4 = 23.22
    expect(karstenLands(60, 2.5, 4)).toBe(23);
  });

  it('60-card: the Orzhov repartee list (avg 1.97, 6 cheap) → 22', () => {
    // 19.59 + 1.90*1.97 - 0.28*6 = 21.65
    expect(karstenLands(60, 1.97, 6)).toBe(22);
  });

  it('99-card: avg MV 3.0 with 8 cheap → 39', () => {
    // 31.42 + 3.13*3 - 0.28*8 = 38.57
    expect(karstenLands(99, 3.0, 8)).toBe(39);
  });

  it('clamps to a sane band', () => {
    expect(karstenLands(60, 0, 40)).toBe(16);
    expect(karstenLands(99, 9, 0)).toBe(45);
  });

  it('names the formula per deck size', () => {
    expect(karstenFormula(60)).toContain('19.59');
    expect(karstenFormula(99)).toContain('31.42');
  });
});

describe('countMdfcLandBacks', () => {
  it('counts modal DFCs with a land back face, not land fronts or non-land backs', () => {
    const n = countMdfcLandBacks([
      { type_line: 'Sorcery // Land', layout: 'modal_dfc', quantity: 2 },
      { type_line: 'Land // Land', layout: 'modal_dfc', quantity: 1 },
      { type_line: 'Creature — Elf // Creature — Elf', layout: 'transform', quantity: 3 },
      { type_line: 'Instant', quantity: 4 },
    ]);
    expect(n).toBe(2);
  });

  it('credits 0.38 of a land per land-back', () => {
    expect(effectiveLandCount(21, 2)).toBe(21.8);
  });
});
