import { describe, it, expect } from 'vitest';
import { resolveDeckLines, clampQuantity, MAX_CARD_QUANTITY, type CardResolver } from '../services/build-api/resolve';
import type { DbCard } from '../src/lib/types';

const fakeCard = (name: string): DbCard => ({ id: name, name } as DbCard);
const known = new Set(['sol ring', 'mountain']);
const calls: string[] = [];
const resolver: CardResolver = (name) => {
  calls.push(name);
  return known.has(name.toLowerCase()) ? fakeCard(name) : undefined;
};

describe('clampQuantity', () => {
  it('bounds user quantities to 1..MAX and treats garbage as 1', () => {
    expect(clampQuantity(20_000_000)).toBe(MAX_CARD_QUANTITY);
    expect(clampQuantity(1e9)).toBe(MAX_CARD_QUANTITY);
    expect(clampQuantity('Infinity')).toBe(1);
    expect(clampQuantity(NaN)).toBe(1);
    expect(clampQuantity(-4)).toBe(1);
    expect(clampQuantity('4')).toBe(4);
    expect(clampQuantity(2.9)).toBe(2);
  });
});

describe('resolveDeckLines', () => {
  it('resolves, clamps, defaults the board and reports misses (including over-long names)', () => {
    calls.length = 0;
    const { resolved, unresolved } = resolveDeckLines(
      [
        { name: 'Sol Ring', quantity: 500 },
        { name: 'Mountain', quantity: 30, board: 'sideboard' },
        { name: 'Nope' },
        { name: 'x'.repeat(250) },
        { name: '   ' },
      ],
      resolver,
    );
    expect(resolved.map((r) => `${r.quantity} ${r.card.name} ${r.board}`)).toEqual(['99 Sol Ring main', '30 Mountain sideboard']);
    expect(unresolved).toEqual(['Nope', 'x'.repeat(200)]);
    // over-long names are reported without a lookup
    expect(calls).toEqual(['Sol Ring', 'Mountain', 'Nope']);
  });
});
