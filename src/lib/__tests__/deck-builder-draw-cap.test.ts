import { describe, it, expect } from 'vitest';
import { isSuperfriendsDrawCard } from '../deck-builder-ai';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    mana_cost: '{1}{U}',
    cmc: 2,
    type_line: 'Instant',
    oracle_text: null,
    colors: '["U"]',
    color_identity: '["U"]',
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
    legalities: '{"commander":"legal"}',
    power: null,
    toughness: null,
    loyalty: null,
    produced_mana: null,
    edhrec_rank: null,
    layout: 'normal',
    updated_at: '2024-01-01',
    subtypes: null,
    arena_id: null,
    game_changer: 0,
    ...overrides,
  } as DbCard;
}

// U9a finding 1 — a cycling land's "Draw a card" reminder text matched the
// superfriends draw cap and got the land cut out of its nonbasic quota.
describe('isSuperfriendsDrawCard', () => {
  it('never flags a land, even one whose ability text says "Draw a card"', () => {
    const cyclingLand = makeCard({
      name: "Tranquil Thicket",
      type_line: 'Land',
      oracle_text: '{T}: Add {G}.\nCycling {2} ({2}, Discard this card: Draw a card.)',
    });
    expect(isSuperfriendsDrawCard(cyclingLand)).toBe(false);
  });

  it('flags a genuine draw spell', () => {
    const harmonize = makeCard({ name: 'Harmonize', type_line: 'Sorcery', oracle_text: 'Draw three cards.' });
    expect(isSuperfriendsDrawCard(harmonize)).toBe(true);
  });

  it('never flags a planeswalker', () => {
    const walker = makeCard({
      name: 'Jace, Test Mind',
      type_line: 'Legendary Planeswalker — Jace',
      oracle_text: '+1: Draw a card.',
    });
    expect(isSuperfriendsDrawCard(walker)).toBe(false);
  });

  // U11 fix 2 — a "Way of the ___" empowers a Jace TOKEN whose printed
  // abilities, including "[-3]: Draw a card.", are reminder text in parens
  // describing the token, not a draw ability the Way itself grants. Without
  // stripping reminder text, the draw cap cut Step 4b's walker-support
  // backfill right back out.
  it('never flags a "Way of the ___" for its Jace-token reminder text', () => {
    const wayOfTheMentor = makeCard({
      name: 'Way of the Mentor',
      type_line: 'Legendary Enchantment',
      oracle_text:
        'When Way of the Mentor enters, empower Jace 5. (Put five loyalty counters on a Jace token you control. '
        + "If you don't control one, first create a blue Jace planeswalker token with \"[-1]: Surveil 1\" and \"[-3]: Draw a card.\")\n"
        + 'Whenever you gain life, put a loyalty counter on each planeswalker you control.',
    });
    expect(isSuperfriendsDrawCard(wayOfTheMentor)).toBe(false);
  });
});
