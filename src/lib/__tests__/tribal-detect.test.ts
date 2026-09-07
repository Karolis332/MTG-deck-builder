import { describe, it, expect } from 'vitest';
import { detectTribalType, MIN_TRIBE_CARDS } from '../tribal-detect';

const goblin = (n: number) => Array.from({ length: n }, () => ({ type_line: 'Creature — Goblin', quantity: 1 }));
const krenko = { oracle_text: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.', type_line: 'Legendary Creature — Goblin Warrior' };
const nobody = { oracle_text: 'Flying.', type_line: 'Legendary Creature — Angel' };

describe('detectTribalType', () => {
  it('picks the dominant subtype once it reaches the threshold', () => {
    expect(detectTribalType(nobody, goblin(MIN_TRIBE_CARDS))).toBe('Goblin');
    expect(detectTribalType(nobody, goblin(MIN_TRIBE_CARDS - 1))).toBeNull();
  });

  it('needs fewer copies when the commander names the tribe', () => {
    expect(detectTribalType(krenko, goblin(3))).toBe('Goblin');
    expect(detectTribalType(krenko, goblin(2))).toBeNull();
  });

  it('ignores lands, non-creatures, DFC back faces and type words that are not tribes', () => {
    const cards = [
      { type_line: 'Basic Land — Mountain', quantity: 30 },
      { type_line: 'Artifact', quantity: 5 },
      { type_line: 'Legendary Creature — Elf Warrior // Land', quantity: 1 },
      ...goblin(4),
      { type_line: 'Creature — Elf Druid', quantity: 4 },
    ];
    // 4 goblins vs 5 elves (4 druids + the DFC front face) → elves win but stay under 6
    expect(detectTribalType(nobody, cards)).toBeNull();
    expect(detectTribalType(nobody, [...cards, { type_line: 'Creature — Elf', quantity: 1 }])).toBe('Elf');
  });
});
