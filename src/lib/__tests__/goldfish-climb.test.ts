import { describe, it, expect } from 'vitest';
import { goldfish } from '../goldfish-sim';
import { climbDeck } from '../deck-climb';
import type { DbCard } from '../types';

let nextId = 0;
function card(name: string, type: string, cost: string | null, cmc: number, extra: Partial<DbCard> = {}): DbCard {
  return { id: `t${nextId++}`, name, type_line: type, mana_cost: cost, cmc, oracle_text: '', produced_mana: null, ...extra } as DbCard;
}

const forest = card('Forest', 'Basic Land — Forest', null, 0, { produced_mana: '["G"]' });
const bear = (i: number) => card(`Bear ${i}`, 'Creature — Bear', '{1}{G}', 2);
const commander = card('Commander', 'Legendary Creature — Elf', '{2}{G}', 3);

describe('goldfish', () => {
  it('is deterministic for a seed and sane on a land/spell split', () => {
    const library = [...Array(38).fill(forest), ...Array.from({ length: 61 }, (_, i) => bear(i))];
    const a = goldfish(library, [commander], { games: 200, seed: 7 });
    const b = goldfish(library, [commander], { games: 200, seed: 7 });
    expect(a).toEqual(b);
    expect(a.keep7).toBeGreaterThan(0.8);
    expect(a.landsT4).toBeGreaterThan(0.5);
    expect(a.commanderTurn).toBeLessThan(4.5);
    expect(a.tempo).toBeGreaterThan(0.5);
  });

  it('casts nothing without lands and nothing off-colour', () => {
    const noLands = goldfish(Array.from({ length: 99 }, (_, i) => bear(i)), [commander], { games: 50 });
    expect(noLands.tempo).toBe(0);
    const island = card('Island', 'Basic Land — Island', null, 0, { produced_mana: '["U"]' });
    const offColour = goldfish([...Array(38).fill(island), ...Array.from({ length: 61 }, (_, i) => bear(i))], [commander], { games: 50 });
    expect(offColour.tempo).toBe(0);
    expect(offColour.landsT4).toBeGreaterThan(0.5);
  });
});

describe('climbDeck', () => {
  it('converges to the best cards and returns a stop proof', () => {
    const value = (n: string): number => Number(n.slice(1));
    const mk = (v: number) => ({ name: `c${v}` });
    const start = [1, 2, 3, 4, 5].map(mk);
    const pool = [10, 20, 30, 2, 1].map(mk);
    const r = climbDeck(start, pool, (d) => d.reduce((s, c) => s + (c ? value(c.name) : 0), 0), { batch: 2, topK: 5 });
    expect(r.converged).toBe(true);
    expect(r.deck.map((c) => c.name).sort()).toEqual(['c10', 'c20', 'c30', 'c4', 'c5'].sort());
    expect(r.score).toBe(69);
    expect(r.stopProof?.candidatesTested).toBeGreaterThan(0);
  });

  it('never removes a locked card', () => {
    const r = climbDeck([{ name: 'c1' }], [{ name: 'c9' }], (d) => d.reduce((s, c) => s + (c ? Number(c.name.slice(1)) : 0), 0), { locked: new Set(['c1']) });
    expect(r.deck[0].name).toBe('c1');
  });
});
