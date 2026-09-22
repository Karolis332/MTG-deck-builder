import { describe, it, expect } from 'vitest';
import { isConditionalColoredProducer, type ManaSourceCard } from '../mana-sources';

// 2026-09-22: Conduit Pylons ({1},{T}: Add one mana of any color) and
// Baldur's Gate ({2},{T}: Add X mana of any one color) were reading as
// unconditional rainbow fixing — same as City of Brass — because the
// classifier only looked for "activate only if" / "entered this turn" /
// devotion gates. A costed or X-scaled any-color activation is gated the
// same way: it costs an extra land's worth of mana for one land's fixing.
function land(oracle_text: string): ManaSourceCard {
  return { oracle_text, type_line: 'Land' } as ManaSourceCard;
}

describe('isConditionalColoredProducer — costed / X-scaled any-color activations', () => {
  it('Conduit Pylons: costed {1} activation is conditional', () => {
    const card = land('{T}: Add {C}.\n{1}, {T}: Add one mana of any color.');
    expect(isConditionalColoredProducer(card)).toBe(true);
  });

  it("Baldur's Gate: costed {2} + X-scaled activation is conditional", () => {
    const card = land('{T}: Add {C}.\n{2}, {T}: Add X mana of any one color, where X is the number of other Gates you control.');
    expect(isConditionalColoredProducer(card)).toBe(true);
  });

  it('City of Brass: free {T}-only any-color activation stays unconditional', () => {
    const card = land('Whenever this land becomes tapped, it deals 1 damage to you.\n{T}: Add one mana of any color.');
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('Mana Confluence: {T} + life payment (no extra mana cost) stays unconditional', () => {
    const card = land('{T}, Pay 1 life: Add one mana of any color.');
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it("Command Tower: {T}-only stays unconditional", () => {
    const card = land("{T}: Add one mana of any color in your commander's color identity.");
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('Exotic Orchard: {T}-only stays unconditional', () => {
    const card = land('{T}: Add one mana of any color that a land an opponent controls could produce.');
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('Cascading Cataracts: {5} costed activation is conditional (documented — costed rule catches it even without "X mana")', () => {
    const card = land('Indestructible\n{T}: Add {C}.\n{5}, {T}: Add five mana in any combination of colors.');
    expect(isConditionalColoredProducer(card)).toBe(true);
  });

  it('a bare {T}: Add one mana of any color land stays unconditional', () => {
    const card = land('{T}: Add one mana of any color.');
    expect(isConditionalColoredProducer(card)).toBe(false);
  });
});
