// Unit P2-L (2026-09-30) — integrate-2 #1 transform land backs.
import { describe, it, expect } from 'vitest';
import { isLandBackDfc } from '../deck-builder-ai';
import type { DbCard } from '../types';

const card = (c: Partial<DbCard>): DbCard => c as DbCard;

describe('#1 transform artifacts are not land backs', () => {
  it('isLandBackDfc needs a modal DFC — a transforming Equipment // Land is a spell, not a land slot', () => {
    expect(isLandBackDfc(card({ type_line: 'Artifact — Equipment // Land', layout: 'transform' }))).toBe(false);
    expect(isLandBackDfc(card({ type_line: 'Sorcery // Land', layout: 'modal_dfc' }))).toBe(true);
    expect(isLandBackDfc(card({ type_line: 'Land // Land', layout: 'modal_dfc' }))).toBe(false);
  });
});
