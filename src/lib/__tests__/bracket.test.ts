import { describe, it, expect } from 'vitest';
import { classifyBracket, type BracketCard } from '../bracket';

function card(name: string, opts: Partial<BracketCard> = {}): BracketCard {
  return { name, oracle_text: '', type_line: 'Creature', cmc: 2, game_changer: 0, ...opts };
}

describe('classifyBracket', () => {
  it('classifies a clean pile as bracket 2', () => {
    const cards = [card('Llanowar Elves'), card('Sol Ring'), card('Rampant Growth')];
    const result = classifyBracket(cards);
    expect(result.bracket).toBe(2);
    expect(result.gameChangers).toEqual([]);
    expect(result.massLandDenial).toEqual([]);
    expect(result.chainedExtraTurns).toBe(false);
    expect(result.twoCardCombos).toEqual([]);
  });

  it('bumps to bracket 4 with 4 game changers', () => {
    const cards = [
      card('A', { game_changer: 1 }),
      card('B', { game_changer: 1 }),
      card('C', { game_changer: 1 }),
      card('D', { game_changer: 1 }),
    ];
    const result = classifyBracket(cards);
    expect(result.bracket).toBe(4);
    expect(result.gameChangers).toHaveLength(4);
  });

  it('stays at bracket 3 with exactly 3 game changers and nothing else', () => {
    const cards = [
      card('A', { game_changer: 1 }),
      card('B', { game_changer: 1 }),
      card('C', { game_changer: 1 }),
    ];
    const result = classifyBracket(cards);
    expect(result.bracket).toBe(3);
    expect(result.gameChangers).toHaveLength(3);
  });

  it('flags Thassa\'s Oracle + Demonic Consultation as a combo, disqualifying bracket 3', () => {
    const cards = [card("Thassa's Oracle"), card('Demonic Consultation', { type_line: 'Sorcery' })];
    const result = classifyBracket(cards);
    expect(result.twoCardCombos).toEqual([["Thassa's Oracle", 'Demonic Consultation']]);
    expect(result.bracket).toBe(4);
    expect(result.bracket).not.toBe(3);
  });

  it('flags Armageddon as mass land denial, forcing bracket 4', () => {
    const cards = [card('Armageddon', { type_line: 'Sorcery' })];
    const result = classifyBracket(cards);
    expect(result.massLandDenial).toEqual(['Armageddon']);
    expect(result.bracket).toBe(4);
  });

  it('allows a single extra-turn card (only chaining is restricted, so still bracket 2)', () => {
    const cards = [card('Time Warp', { type_line: 'Sorcery' })];
    const result = classifyBracket(cards);
    expect(result.extraTurnCards).toEqual(['Time Warp']);
    expect(result.chainedExtraTurns).toBe(false);
    expect(result.bracket).toBe(2);
  });

  it('flags two extra-turn cards as chained, forcing bracket 4', () => {
    const cards = [
      card('Time Warp', { type_line: 'Sorcery' }),
      card('Temporal Mastery', { type_line: 'Sorcery' }),
    ];
    const result = classifyBracket(cards);
    expect(result.chainedExtraTurns).toBe(true);
    expect(result.bracket).toBe(4);
  });

  it('heuristically flags bracket 5 (cEDH) with 2 combo pairs and 4+ fast mana', () => {
    const cards = [
      card("Thassa's Oracle"), card('Demonic Consultation', { type_line: 'Sorcery' }),
      card('Exquisite Blood'), card('Sanguine Bond'),
      card('Mana Crypt', { type_line: 'Artifact' }),
      card('Mana Vault', { type_line: 'Artifact' }),
      card('Sol Ring', { type_line: 'Artifact' }),
      card('Chrome Mox', { type_line: 'Artifact' }),
    ];
    const result = classifyBracket(cards);
    expect(result.bracket).toBe(5);
    expect(result.reasons.some((r) => /heuristic/i.test(r))).toBe(true);
  });

  it('excludes commander names from game-changer/combo counts', () => {
    const cards = [card('The Commander', { game_changer: 1 })];
    const result = classifyBracket(cards, { commanderNames: ['The Commander'] });
    expect(result.gameChangers).toEqual([]);
    expect(result.bracket).toBe(2);
  });
});
