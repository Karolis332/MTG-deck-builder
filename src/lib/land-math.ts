/**
 * Land-count arithmetic (Frank Karsten, "How many lands do you need", 2022).
 * Pure — no DB, no engine imports — so the optimizer's land target is unit-testable.
 *
 *   60-card: lands = 19.59 + 1.90 × avg MV − 0.28 × cheap draw/ramp
 *   99-card: lands = 31.42 + 3.13 × avg MV − 0.28 × cheap draw/ramp
 *
 * "cheap draw/ramp" = nonland spells with MV ≤ 2 that draw cards or make mana
 * (the caller classifies). Modal DFC land-backs count as 0.38 of a land each.
 */

export const MDFC_LAND_CREDIT = 0.38;

interface Formula {
  base: number;
  perMv: number;
  perCheap: number;
  min: number;
  max: number;
  text: string;
}

const FORMULA_60: Formula = {
  base: 19.59, perMv: 1.9, perCheap: 0.28, min: 16, max: 30,
  text: '19.59 + 1.90 × average mana value − 0.28 × cheap draw/ramp spells (60-card deck)',
};
const FORMULA_99: Formula = {
  base: 31.42, perMv: 3.13, perCheap: 0.28, min: 28, max: 45,
  text: '31.42 + 3.13 × average mana value − 0.28 × cheap draw/ramp spells (99-card deck)',
};

function formulaFor(deckSize: number): Formula {
  return deckSize >= 99 ? FORMULA_99 : FORMULA_60;
}

/** Recommended land count, rounded to a whole land and clamped to a sane band. */
export function karstenLands(deckSize: number, avgMv: number, cheapCount: number): number {
  const f = formulaFor(deckSize);
  const raw = f.base + f.perMv * avgMv - f.perCheap * cheapCount;
  return Math.min(f.max, Math.max(f.min, Math.round(raw)));
}

export function karstenFormula(deckSize: number): string {
  return formulaFor(deckSize).text;
}

export interface MdfcLike {
  type_line: string | null;
  layout?: string | null;
  quantity: number;
}

/** Copies of modal double-faced cards whose back face is a land. */
export function countMdfcLandBacks(cards: MdfcLike[]): number {
  let n = 0;
  for (const c of cards) {
    if (c.layout && c.layout !== 'modal_dfc') continue;
    const faces = (c.type_line || '').split('//');
    if (faces.length < 2) continue;
    if (/\bLand\b/.test(faces[0])) continue; // land front: already counted as a land
    if (/\bLand\b/.test(faces[1])) n += c.quantity;
  }
  return n;
}

/** Lands the deck effectively runs: real lands plus MDFC land-back credit. */
export function effectiveLandCount(landCount: number, mdfcLandBacks: number): number {
  return Math.round((landCount + mdfcLandBacks * MDFC_LAND_CREDIT) * 10) / 10;
}
