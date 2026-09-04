import { describe, it, expect } from 'vitest';
import { applyBracketBudget, defaultTargetBracket } from '../deck-builder-constraints';
import { classifyBracket, type BracketCard } from '../bracket';

const card = (name: string, opts: Partial<BracketCard> = {}): BracketCard =>
  ({ name, oracle_text: '', type_line: 'Creature', cmc: 2, game_changer: 0, ...opts });
const pool = (entries: Array<[BracketCard, number]>) => entries.map(([c, score]) => ({ card: c, score }));

describe('applyBracketBudget', () => {
  it('is a no-op for bracket 4/5 targets', () => {
    const gcs = ['A', 'B', 'C', 'D'].map((n) => card(n, { game_changer: 1 }));
    const r = applyBracketBudget(gcs, pool(gcs.map((c) => [c, 1])), 4);
    expect(r.cards).toHaveLength(4);
    expect(r.removed).toEqual([]);
  });

  it('B2: drops every game changer lowest-score-first and refills from the pool', () => {
    const deck = [card('GC-lo', { game_changer: 1 }), card('GC-hi', { game_changer: 1 }), card('Bear')];
    const filler = [card('Elf'), card('Goblin'), card('GC-pool', { game_changer: 1 })];
    const p = pool([[deck[0], 10], [deck[1], 90], [deck[2], 50], [filler[0], 40], [filler[1], 30], [filler[2], 99]]);
    const r = applyBracketBudget(deck, p, 2);
    expect(r.removed.sort()).toEqual(['GC-hi', 'GC-lo']);
    expect(r.added).toEqual(['Elf', 'Goblin']); // GC-pool skipped despite top score
    expect(r.cards).toHaveLength(3);
    expect(classifyBracket(r.cards).bracket).toBe(2);
  });

  it('B3: keeps the 3 highest-scored game changers', () => {
    const deck = ['A', 'B', 'C', 'D', 'E'].map((n, i) => card(n, { game_changer: 1, cmc: i }));
    const p = pool(deck.map((c, i) => [c, i * 10] as [BracketCard, number]));
    const r = applyBracketBudget(deck, p, 3);
    expect(r.removed.sort()).toEqual(['A', 'B']);
    expect(r.cards.map((c) => c.name).sort()).toEqual(['C', 'D', 'E']);
    expect(classifyBracket(r.cards).bracket).toBe(3);
  });

  it('breaks combo pairs and removes mass land denial', () => {
    const deck = [card("Thassa's Oracle"), card('Demonic Consultation'), card('Armageddon'), card('Bear')];
    const p = pool([[deck[0], 80], [deck[1], 20], [deck[2], 70], [deck[3], 10], [card('Elf'), 5], [card('Ox'), 4]]);
    const r = applyBracketBudget(deck, p, 3);
    expect(r.removed.sort()).toEqual(['Armageddon', 'Demonic Consultation']);
    expect(r.added).toEqual(['Elf', 'Ox']);
    expect(classifyBracket(r.cards).twoCardCombos).toEqual([]);
  });

  it('refill never completes a combo with a card already in the deck', () => {
    const deck = [card("Thassa's Oracle"), card('Armageddon')];
    const p = pool([[card('Demonic Consultation'), 100], [card('Elf'), 1]]);
    const r = applyBracketBudget(deck, p, 3);
    expect(r.added).toEqual(['Elf']);
  });

  it('B3 pulls top-quartile pool game changers in, up to the budget', () => {
    const deck = ['A', 'B', 'C', 'D'].map((n) => card(n));
    const strongGc = card('Rhystic Study', { game_changer: 1 });
    const weakGc = card('Weak GC', { game_changer: 1 });
    const p = pool([[deck[0], 50], [deck[1], 40], [deck[2], 30], [deck[3], 20], [strongGc, 99], [weakGc, 1], [card('X'), 10], [card('Y'), 9]]);
    const r = applyBracketBudget(deck, p, 3);
    expect(r.added).toEqual(['Rhystic Study']);
    expect(r.removed).toEqual(['D']); // lowest-scored pick displaced
    expect(r.cards).toHaveLength(4);
    expect(classifyBracket(r.cards).bracket).toBe(3);
  });

  it('B2 never pulls game changers in', () => {
    const deck = [card('A'), card('B')];
    const p = pool([[deck[0], 1], [deck[1], 1], [card('GC', { game_changer: 1 }), 99], [card('X'), 2], [card('Y'), 2]]);
    expect(applyBracketBudget(deck, p, 2).added).toEqual([]);
  });

  it('collapses chained extra turns to a single non-recastable one', () => {
    const deck = [card('Time Warp', { type_line: 'Sorcery' }), card('Temporal Manipulation', { type_line: 'Sorcery' }), card('Bear')];
    const p = pool([[deck[0], 10], [deck[1], 20], [deck[2], 5], [card('Elf'), 1]]);
    const r = applyBracketBudget(deck, p, 3);
    expect(r.removed).toEqual(['Time Warp']);
    expect(classifyBracket(r.cards).chainedExtraTurns).toBe(false);
  });

  it('defaults target from powerLevel', () => {
    expect(defaultTargetBracket('casual')).toBe(2);
    expect(defaultTargetBracket('optimized')).toBe(3);
    expect(defaultTargetBracket('cedh')).toBe(5);
    expect(defaultTargetBracket(undefined)).toBeUndefined();
  });
});
