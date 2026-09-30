import { describe, it, expect } from 'vitest';
import { isWalkerSupportCard } from '../deck-builder-ai';

describe('isWalkerSupportCard (U11 fix 2)', () => {
  // Real oracle text pulled from the card DB (verify-2026-09-30 diagnosis).
  it('matches Way of the Mentor (loyalty counter, no bare "planeswalker" keyword needed)', () => {
    const card = {
      type_line: 'Legendary Enchantment',
      oracle_text:
        'When Way of the Mentor enters, empower Jace 5. (Put five loyalty counters on a Jace token you control. '
        + 'If you don\'t control one, first create a blue Jace planeswalker token with "[−1]: Surveil 1" and "[−3]: Draw a card.")\n'
        + 'Whenever you gain life, put a loyalty counter on each planeswalker you control.',
    };
    expect(isWalkerSupportCard(card)).toBe(true);
  });

  it('matches Way of the Paradox (loyalty ability)', () => {
    const card = {
      type_line: 'Legendary Enchantment',
      oracle_text:
        'When Way of the Paradox enters, empower Jace 5. (Put five loyalty counters on a Jace token you control...)\n'
        + 'Whenever you activate a loyalty ability, you gain 1 life. You may play an additional land this turn.',
    };
    expect(isWalkerSupportCard(card)).toBe(true);
  });

  it('matches Way of the Healer (planeswalkers you control)', () => {
    const card = {
      type_line: 'Legendary Enchantment',
      oracle_text:
        'When Way of the Healer enters, empower Jace 5. (Put five loyalty counters on a Jace token you control...)\n'
        + 'Planeswalkers you control have "[−2]: Create a 2/2 colorless Wizard Soldier creature token named Cadet. Surveil 1."',
    };
    expect(isWalkerSupportCard(card)).toBe(true);
  });

  it('does not match a bare-proliferate card that never mentions planeswalkers or loyalty (Evolution Sage)', () => {
    const card = {
      type_line: 'Creature — Elf Druid',
      oracle_text: 'Landfall — Whenever a land you control enters, proliferate.',
    };
    expect(isWalkerSupportCard(card)).toBe(false);
  });

  it('does not match a planeswalker permanent itself, even if its own text mentions loyalty counters', () => {
    const card = {
      type_line: 'Legendary Planeswalker — Kaito',
      oracle_text: 'Whenever a creature you control deals combat damage to a player, put a loyalty counter on Kaito.',
    };
    expect(isWalkerSupportCard(card)).toBe(false);
  });
});
