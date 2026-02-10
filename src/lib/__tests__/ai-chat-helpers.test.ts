import { describe, it, expect } from 'vitest';
import {
  fitsColorIdentity,
  isLegalInFormat,
  extractRejectedCards,
  buildRejectionReminder,
} from '../ai-chat-helpers';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    mana_cost: '{1}{R}',
    cmc: 2,
    type_line: 'Instant',
    oracle_text: null,
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
    legalities: '{"standard":"legal","modern":"legal","commander":"legal"}',
    power: null,
    toughness: null,
    loyalty: null,
    produced_mana: null,
    edhrec_rank: null,
    layout: 'normal',
    updated_at: '2024-01-01',
    subtypes: null,
    arena_id: null,
    ...overrides,
  };
}

describe('fitsColorIdentity', () => {
  it('passes mono-W card in WU deck', () => {
    const card = makeCard({ color_identity: '["W"]' });
    expect(fitsColorIdentity(card, new Set(['W', 'U']))).toBe(true);
  });

  it('fails mono-B card in WU deck', () => {
    const card = makeCard({ color_identity: '["B"]' });
    expect(fitsColorIdentity(card, new Set(['W', 'U']))).toBe(false);
  });

  it('passes colorless card in any deck', () => {
    const card = makeCard({ color_identity: '[]' });
    expect(fitsColorIdentity(card, new Set(['W', 'U']))).toBe(true);
  });

  it('passes any card when deck has empty color identity', () => {
    const card = makeCard({ color_identity: '["B", "R"]' });
    expect(fitsColorIdentity(card, new Set())).toBe(true);
  });

  it('passes multicolor card when all colors match', () => {
    const card = makeCard({ color_identity: '["W", "U"]' });
    expect(fitsColorIdentity(card, new Set(['W', 'U', 'B']))).toBe(true);
  });

  it('fails multicolor card when one color is outside identity', () => {
    const card = makeCard({ color_identity: '["W", "B"]' });
    expect(fitsColorIdentity(card, new Set(['W', 'U']))).toBe(false);
  });

  it('returns true for null color_identity', () => {
    const card = makeCard({ color_identity: null as unknown as string });
    expect(fitsColorIdentity(card, new Set(['W']))).toBe(true);
  });

  it('returns true for malformed JSON', () => {
    const card = makeCard({ color_identity: 'not-json' });
    expect(fitsColorIdentity(card, new Set(['W']))).toBe(true);
  });
});

describe('isLegalInFormat', () => {
  it('passes card legal in standard', () => {
    const card = makeCard({ legalities: '{"standard":"legal"}' });
    expect(isLegalInFormat(card, 'standard')).toBe(true);
  });

  it('fails banned card', () => {
    const card = makeCard({ legalities: '{"standard":"banned"}' });
    expect(isLegalInFormat(card, 'standard')).toBe(false);
  });

  it('passes restricted card', () => {
    const card = makeCard({ legalities: '{"vintage":"restricted"}' });
    expect(isLegalInFormat(card, 'vintage')).toBe(true);
  });

  it('passes when format not in legalities (missing key)', () => {
    const card = makeCard({ legalities: '{"standard":"legal"}' });
    expect(isLegalInFormat(card, 'pioneer')).toBe(true);
  });

  it('passes when legalities is null', () => {
    const card = makeCard({ legalities: null as unknown as string });
    expect(isLegalInFormat(card, 'standard')).toBe(true);
  });

  it('passes when format is empty string', () => {
    const card = makeCard({ legalities: '{"standard":"banned"}' });
    expect(isLegalInFormat(card, '')).toBe(true);
  });

  it('fails not_legal status', () => {
    const card = makeCard({ legalities: '{"commander":"not_legal"}' });
    expect(isLegalInFormat(card, 'commander')).toBe(false);
  });

  it('returns true for malformed JSON legalities', () => {
    const card = makeCard({ legalities: 'bad-json' });
    expect(isLegalInFormat(card, 'standard')).toBe(true);
  });
});

describe('extractRejectedCards', () => {
  it('extracts all 4 rejection types', () => {
    const msg = `Here are my suggestions.

⚠️ **Some suggestions were filtered** (server-side validation):
- ❌ Already in deck: Storm Crow, Lightning Bolt
- ❌ Wrong color identity: Doom Blade, Go for the Throat (deck is {W, U})
- ❌ Not legal in standard: Channel, Black Lotus
- ❌ Not found in database: Fake Card, Another Fake`;

    const result = extractRejectedCards(msg);
    expect(result.alreadyInDeck).toEqual(['Storm Crow', 'Lightning Bolt']);
    expect(result.wrongColors).toEqual(['Doom Blade', 'Go for the Throat']);
    expect(result.notLegal).toEqual(['Channel', 'Black Lotus']);
    expect(result.notFound).toEqual(['Fake Card', 'Another Fake']);
  });

  it('returns empty arrays for message with no rejections', () => {
    const msg = 'Here are some great suggestions for your deck!';
    const result = extractRejectedCards(msg);
    expect(result.alreadyInDeck).toEqual([]);
    expect(result.wrongColors).toEqual([]);
    expect(result.notLegal).toEqual([]);
    expect(result.notFound).toEqual([]);
  });

  it('handles partial rejections (only some types present)', () => {
    const msg = `⚠️ **Some suggestions were filtered**:
- ❌ Already in deck: Counterspell
- ❌ Not found in database: Made Up Card`;

    const result = extractRejectedCards(msg);
    expect(result.alreadyInDeck).toEqual(['Counterspell']);
    expect(result.wrongColors).toEqual([]);
    expect(result.notLegal).toEqual([]);
    expect(result.notFound).toEqual(['Made Up Card']);
  });

  it('handles empty string', () => {
    const result = extractRejectedCards('');
    expect(result.alreadyInDeck).toEqual([]);
    expect(result.wrongColors).toEqual([]);
    expect(result.notLegal).toEqual([]);
    expect(result.notFound).toEqual([]);
  });

  it('handles single card per category', () => {
    const msg = `- ❌ Already in deck: Sol Ring
- ❌ Wrong color identity: Murder`;

    const result = extractRejectedCards(msg);
    expect(result.alreadyInDeck).toEqual(['Sol Ring']);
    expect(result.wrongColors).toEqual(['Murder']);
  });
});

describe('buildRejectionReminder', () => {
  it('builds reminder for rejected cards', () => {
    const result = buildRejectionReminder({
      alreadyInDeck: ['Storm Crow'],
      wrongColors: ['Doom Blade'],
      notLegal: [],
      notFound: [],
    });

    expect(result).toContain('REJECTED CARDS FROM LAST TURN');
    expect(result).toContain('Storm Crow (already in deck)');
    expect(result).toContain('Doom Blade (wrong color identity)');
    expect(result).toContain('DIFFERENT cards instead');
  });

  it('returns empty string when no rejections', () => {
    const result = buildRejectionReminder({
      alreadyInDeck: [],
      wrongColors: [],
      notLegal: [],
      notFound: [],
    });
    expect(result).toBe('');
  });

  it('includes all categories when present', () => {
    const result = buildRejectionReminder({
      alreadyInDeck: ['A'],
      wrongColors: ['B'],
      notLegal: ['C'],
      notFound: ['D'],
    });

    expect(result).toContain('A (already in deck)');
    expect(result).toContain('B (wrong color identity)');
    expect(result).toContain('C (not legal in format)');
    expect(result).toContain('D (not found in database)');
  });

  it('handles multiple cards per category', () => {
    const result = buildRejectionReminder({
      alreadyInDeck: ['Sol Ring', 'Mana Crypt'],
      wrongColors: [],
      notLegal: [],
      notFound: [],
    });

    expect(result).toContain('Sol Ring (already in deck)');
    expect(result).toContain('Mana Crypt (already in deck)');
  });
});
