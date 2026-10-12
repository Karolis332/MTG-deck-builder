// Unit P2-L (2026-09-30) — integrate-2 L-open landPayoffs.
import { describe, it, expect } from 'vitest';
import { hasLandPayoffs } from '../deck-builder-ai';
import type { DbCard } from '../types';

const card = (c: Partial<DbCard>): DbCard => c as DbCard;

describe('L-open landPayoffs', () => {
  const landfall = card({ name: 'X', oracle_text: 'Landfall — Whenever a land you control enters, draw a card.', type_line: 'Creature' });
  const plain = card({ name: 'Y', oracle_text: 'Flying', type_line: 'Creature' });
  it('a landfall commander or three landfall spells turn typed fetches on', () => {
    expect(hasLandPayoffs('Landfall — Whenever a land enters under your control, you gain 1 life.', [plain])).toBe(true);
    expect(hasLandPayoffs('Flying', [landfall, landfall, landfall])).toBe(true);
    expect(hasLandPayoffs('Flying', [landfall, plain])).toBe(false);
  });
});
