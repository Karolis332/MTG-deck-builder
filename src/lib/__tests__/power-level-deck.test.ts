import { describe, it, expect } from 'vitest';
import { buildPowerLevelInputs, type CardLookupEntry, type DeckCardRow } from '../power-level-deck';
import { isCommanderFormat } from '../deck-optimizer';

const entry = (overrides: Partial<CardLookupEntry> = {}): CardLookupEntry => ({
  minPrice: 5,
  edhrecRank: 100,
  cmc: 2,
  typeLine: 'Artifact',
  layout: 'normal',
  manaCost: '{2}',
  oracleText: null,
  gameChanger: false,
  producedMana: null,
  colors: null,
  ...overrides,
});

describe('buildPowerLevelInputs', () => {
  it('maps commander + main board cards, using the MIN price and edhrec_rank from the lookup', () => {
    const cards: DeckCardRow[] = [
      { name: 'Krenko, Mob Boss', quantity: 1, board: 'commander' },
      { name: 'Sol Ring', quantity: 1, board: 'main' },
    ];
    const lookup = new Map<string, CardLookupEntry>([
      ['krenko, mob boss', entry({ minPrice: 12, edhrecRank: 50 })],
      ['sol ring', entry({ minPrice: 1.5, edhrecRank: 1 })],
    ]);

    const { inputs, commanders, cardsWithoutPrice } = buildPowerLevelInputs(cards, lookup);

    expect(commanders).toEqual(['Krenko, Mob Boss']);
    expect(cardsWithoutPrice).toEqual([]);
    const sol = inputs.find((c) => c.name === 'Sol Ring');
    expect(sol?.price).toBe(1.5);
    expect(sol?.edhrecRank).toBe(1);
  });

  it('excludes sideboard/maybeboard cards from the scored inputs', () => {
    const cards: DeckCardRow[] = [
      { name: 'Commander', quantity: 1, board: 'commander' },
      { name: 'Sideboard Card', quantity: 1, board: 'sideboard' },
    ];
    const lookup = new Map<string, CardLookupEntry>([
      ['commander', entry()],
      ['sideboard card', entry()],
    ]);

    const { inputs } = buildPowerLevelInputs(cards, lookup);
    expect(inputs.map((c) => c.name)).toEqual(['Commander']);
  });

  it('flags cards with no resolvable price as cardsWithoutPrice', () => {
    const cards: DeckCardRow[] = [
      { name: 'Commander', quantity: 1, board: 'commander' },
      { name: 'Unknown Foil', quantity: 1, board: 'main' },
    ];
    const lookup = new Map<string, CardLookupEntry>([
      ['commander', entry()],
      ['unknown foil', entry({ minPrice: null })],
    ]);

    const { cardsWithoutPrice } = buildPowerLevelInputs(cards, lookup);
    expect(cardsWithoutPrice).toEqual(['Unknown Foil']);
  });
});

describe('power-level route format gate (shared isCommanderFormat)', () => {
  it('rejects 60-card formats', () => {
    expect(isCommanderFormat('standard')).toBe(false);
  });

  it('accepts commander formats', () => {
    expect(isCommanderFormat('commander')).toBe(true);
    expect(isCommanderFormat('brawl')).toBe(true);
  });
});
