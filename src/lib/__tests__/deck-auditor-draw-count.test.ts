import { describe, it, expect } from 'vitest';
import { auditDeck } from '../deck-auditor';

// U12 fix 2: health.drawCount counted "Draw a card" inside reminder text
// (a Way of the ___'s Jace-token abilities), so Tam reported 15 draw for 7 real.
const forest = { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '({T}: Add {G}.)', produced_mana: '["G"]' };
const way = {
  name: 'Way of the Mentor', type_line: 'Legendary Enchantment', cmc: 3,
  oracle_text: 'When Way of the Mentor enters, empower Jace 5. (Put five loyalty counters on a Jace token you control. If you don\'t control one, first create a blue Jace planeswalker token with "[−1]: Surveil 1" and "[−3]: Draw a card.")\nWhenever you gain life, put a loyalty counter on each planeswalker you control.',
};
const divination = { name: 'Divination', type_line: 'Sorcery', cmc: 3, oracle_text: 'Draw two cards.' };

function deck() {
  return [
    { card: forest, quantity: 20, board: 'main' },
    { card: way, quantity: 1, board: 'main' },
    { card: divination, quantity: 1, board: 'main' },
  ];
}

describe('auditDeck drawCount ignores reminder text (U12 fix 2)', () => {
  it('superfriends: only the real draw spell counts', () => {
    const h = auditDeck(deck(), { colors: ['G'], format: 'brawl', targetLands: 20, isCommander: true, strategy: 'superfriends' });
    expect(h.drawCount).toBe(1);
  });
  it('every other archetype gets the same reminder-stripped count', () => {
    const h = auditDeck(deck(), { colors: ['G'], format: 'brawl', targetLands: 20, isCommander: true });
    expect(h.drawCount).toBe(1);
  });
});
