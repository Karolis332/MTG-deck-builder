import { describe, it, expect } from 'vitest';
import { resolveLegalCommanderVariant, readLegalityStatus } from '../deck-builder-ai';

function card(name: string, legalities: Record<string, string>) {
  return { name, legalities: JSON.stringify(legalities) };
}

describe('resolveLegalCommanderVariant (Arena "A-" rebalance swap)', () => {
  it('keeps the resolved card when it is already legal', () => {
    const vivi = card('Vivi Ornitier', { standardbrawl: 'legal' });
    const result = resolveLegalCommanderVariant(vivi, undefined, ['standardbrawl']);
    expect(result?.card.name).toBe('Vivi Ornitier');
  });

  it('paper -> A-: swaps to the rebalanced variant when paper is not legal', () => {
    const vivi = card('Vivi Ornitier', { brawl: 'not_legal' });
    const aVivi = card('A-Vivi Ornitier', { brawl: 'legal' });
    const result = resolveLegalCommanderVariant(vivi, aVivi, ['brawl']);
    expect(result?.card.name).toBe('A-Vivi Ornitier');
  });

  it('A- -> paper: swaps to the paper variant when the resolved A- row is not legal', () => {
    // Regression: a saved deck's commander is stored as "A-Vivi Ornitier",
    // but only the paper "Vivi Ornitier" is legal in Standard Brawl.
    const aVivi = card('A-Vivi Ornitier', { standardbrawl: 'not_legal' });
    const vivi = card('Vivi Ornitier', { standardbrawl: 'legal' });
    const result = resolveLegalCommanderVariant(aVivi, vivi, ['standardbrawl']);
    expect(result?.card.name).toBe('Vivi Ornitier');
    expect(result?.status).toBe('legal');
  });

  it('returns null when neither variant is legal', () => {
    const vivi = card('Vivi Ornitier', { standard: 'not_legal' });
    const aVivi = card('A-Vivi Ornitier', { standard: 'not_legal' });
    expect(resolveLegalCommanderVariant(vivi, aVivi, ['standard'])).toBeNull();
  });

  it('returns null with no other variant and the card is illegal', () => {
    const vivi = card('Vivi Ornitier', { standard: 'not_legal' });
    expect(resolveLegalCommanderVariant(vivi, undefined, ['standard'])).toBeNull();
  });
});

describe('readLegalityStatus', () => {
  it('checks fallback keys in order (Competitive Brawl: brawl then historic)', () => {
    const c = card('Some Commander', { historic: 'legal' });
    expect(readLegalityStatus(c, ['brawl', 'historic'])).toBe('legal');
  });
});
