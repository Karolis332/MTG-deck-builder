import { describe, it, expect } from 'vitest';
import { exportToArena, exportToText, exportToMtgo } from '../deck-export';
import type { DeckCardEntry, DbCard } from '../types';

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    mana_cost: '{1}{R}',
    cmc: 2,
    type_line: 'Instant',
    oracle_text: 'Deal 3 damage',
    colors: '["R"]',
    color_identity: '["R"]',
    keywords: '[]',
    set_code: 'tst',
    set_name: 'Test Set',
    collector_number: '1',
    rarity: 'common',
    image_uri_small: null,
    image_uri_normal: null,
    image_uri_large: null,
    image_uri_art_crop: null,
    price_usd: null,
    price_usd_foil: null,
    legalities: '{}',
    power: null,
    toughness: null,
    loyalty: null,
    produced_mana: null,
    edhrec_rank: null,
    layout: 'normal',
    updated_at: '2024-01-01',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<DeckCardEntry> = {}): DeckCardEntry {
  return {
    id: 1,
    deck_id: 1,
    card_id: 'test-id',
    quantity: 4,
    board: 'main' as const,
    sort_order: 0,
    card: makeCard(),
    ...overrides,
  };
}

describe('exportToArena', () => {
  it('exports main deck cards', () => {
    const cards = [makeEntry({ card: makeCard({ name: 'Lightning Bolt', set_code: 'M21', collector_number: '199' }) })];
    const result = exportToArena('Test Deck', cards);
    expect(result).toContain('Deck');
    expect(result).toContain('4 Lightning Bolt (M21) 199');
  });

  it('exports commander section', () => {
    const cards = [
      makeEntry({ board: 'commander', quantity: 1, card: makeCard({ name: 'Atraxa', set_code: 'cm2', collector_number: '10' }) }),
      makeEntry({ card: makeCard({ name: 'Plains', set_code: 'mh3', collector_number: '300' }) }),
    ];
    const result = exportToArena('Commander Deck', cards);
    expect(result.startsWith('Commander')).toBe(true);
    expect(result).toContain('1 Atraxa (CM2) 10');
  });

  it('exports sideboard', () => {
    const cards = [
      makeEntry({ card: makeCard({ name: 'Bolt', set_code: 'a25', collector_number: '141' }) }),
      makeEntry({ board: 'sideboard', quantity: 2, card: makeCard({ name: 'Negate', set_code: 'rix', collector_number: '44' }) }),
    ];
    const result = exportToArena('Test', cards);
    expect(result).toContain('Sideboard');
    expect(result).toContain('2 Negate (RIX) 44');
  });

  it('exports companion section', () => {
    const cards = [
      makeEntry({ board: 'companion', quantity: 1, card: makeCard({ name: 'Lurrus', set_code: 'iko', collector_number: '226' }) }),
    ];
    const result = exportToArena('Test', cards);
    expect(result).toContain('Companion');
    expect(result).toContain('1 Lurrus (IKO) 226');
  });

  it('handles empty card list', () => {
    expect(exportToArena('Empty', [])).toBe('');
  });

  it('uppercases set codes', () => {
    const cards = [makeEntry({ card: makeCard({ name: 'Card', set_code: 'abc', collector_number: '1' }) })];
    const result = exportToArena('Test', cards);
    expect(result).toContain('(ABC)');
  });
});

describe('exportToText', () => {
  it('includes deck name as comment', () => {
    const cards = [makeEntry({ card: makeCard({ name: 'Lightning Bolt' }) })];
    const result = exportToText('My Deck', cards);
    expect(result).toContain('// My Deck');
  });

  it('formats cards with Nx prefix', () => {
    const cards = [makeEntry({ quantity: 3, card: makeCard({ name: 'Lightning Bolt' }) })];
    const result = exportToText('Test', cards);
    expect(result).toContain('3x Lightning Bolt');
  });

  it('separates maindeck and sideboard', () => {
    const cards = [
      makeEntry({ card: makeCard({ name: 'Bolt' }) }),
      makeEntry({ board: 'sideboard', quantity: 2, card: makeCard({ name: 'Negate' }) }),
    ];
    const result = exportToText('Test', cards);
    expect(result).toContain('// Maindeck');
    expect(result).toContain('// Sideboard');
  });

  it('includes commander section', () => {
    const cards = [
      makeEntry({ board: 'commander', quantity: 1, card: makeCard({ name: 'Atraxa' }) }),
    ];
    const result = exportToText('Test', cards);
    expect(result).toContain('// Commander');
  });

  it('handles empty card list', () => {
    const result = exportToText('Empty', []);
    expect(result).toContain('// Empty');
  });
});

describe('exportToMtgo', () => {
  it('exports main cards', () => {
    const cards = [makeEntry({ quantity: 4, card: makeCard({ name: 'Lightning Bolt' }) })];
    const result = exportToMtgo('Test', cards);
    expect(result).toBe('4 Lightning Bolt');
  });

  it('includes commander cards in main section', () => {
    const cards = [
      makeEntry({ board: 'commander', quantity: 1, card: makeCard({ name: 'Atraxa' }) }),
      makeEntry({ quantity: 4, card: makeCard({ name: 'Bolt' }) }),
    ];
    const result = exportToMtgo('Test', cards);
    const lines = result.split('\n');
    expect(lines).toContain('1 Atraxa');
    expect(lines).toContain('4 Bolt');
  });

  it('separates sideboard with header', () => {
    const cards = [
      makeEntry({ card: makeCard({ name: 'Bolt' }) }),
      makeEntry({ board: 'sideboard', quantity: 2, card: makeCard({ name: 'Negate' }) }),
    ];
    const result = exportToMtgo('Test', cards);
    expect(result).toContain('Sideboard');
    expect(result).toContain('2 Negate');
  });

  it('handles empty card list', () => {
    expect(exportToMtgo('Empty', [])).toBe('');
  });
});
