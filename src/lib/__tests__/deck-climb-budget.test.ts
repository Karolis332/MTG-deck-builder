import { describe, it, expect } from 'vitest';
import { climbDeck, type ClimbCard } from '../deck-climb';

interface PricedCard extends ClimbCard { value: number; price: number }
const mk = (name: string, value: number, price: number): PricedCard => ({ name, value, price });
const totalPrice = (deck: readonly (PricedCard | null)[]): number => deck.reduce((s, c) => s + (c?.price ?? 0), 0);
const evaluate = (deck: readonly (PricedCard | null)[]): number => deck.reduce((s, c) => s + (c?.value ?? 0), 0);

describe('climbDeck canSwap (buy budget)', () => {
  const budget = 50;
  const start = [1, 2, 3, 4, 5].map((v) => mk(`start${v}`, v, 5)); // total price 25
  const pool = [
    mk('cheapA', 10, 5), mk('cheapB', 20, 5), mk('cheapC', 30, 5),
    mk('pricey1', 1000, 1000), mk('pricey2', 2000, 1000), mk('pricey3', 3000, 1000),
  ];
  const canSwap = (deck: readonly PricedCard[], slot: number, card: PricedCard): boolean =>
    totalPrice(deck) - (deck[slot]?.price ?? 0) + card.price <= budget;

  it('never exceeds the budget and evaluates fewer candidates than without the hook', () => {
    const withHook = climbDeck(start, pool, evaluate, { batch: 5, topK: 5, canSwap });
    const withoutHook = climbDeck(start, pool, evaluate, { batch: 5, topK: 5 });

    expect(totalPrice(withHook.deck)).toBeLessThanOrEqual(budget);
    expect(withHook.deck.some((c) => c.price === 1000)).toBe(false);
    expect(withHook.evaluations).toBeLessThan(withoutHook.evaluations);
    // Without the gate the high-value, unaffordable cards win the swap — proof the hook is load-bearing.
    expect(withoutHook.deck.some((c) => c.price === 1000)).toBe(true);
  });

  it('onEvaluate is a pure observer: identical deck/score/evaluations with or without it, ticking once per evaluation', () => {
    const without = climbDeck(start, pool, evaluate, { batch: 5, topK: 5, canSwap });
    const ticks: number[] = [];
    const withHook = climbDeck(start, pool, evaluate, { batch: 5, topK: 5, canSwap, onEvaluate: (n) => ticks.push(n) });

    expect(withHook.deck).toEqual(without.deck);
    expect(withHook.score).toBe(without.score);
    expect(withHook.evaluations).toBe(without.evaluations);
    expect(ticks).toEqual(Array.from({ length: withHook.evaluations }, (_, i) => i + 1));
  });
});
