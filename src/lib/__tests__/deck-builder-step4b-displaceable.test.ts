import { describe, it, expect } from 'vitest';
import { isStep4bDisplaceable } from '../deck-builder-ai';
import type { Step4bDisplaceableCtx } from '../deck-builder-ai';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    mana_cost: '{2}',
    cmc: 2,
    type_line: 'Artifact',
    oracle_text: null,
    colors: '[]',
    color_identity: '[]',
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

function baseCtx(overrides: Partial<Step4bDisplaceableCtx> = {}): Step4bDisplaceableCtx {
  return {
    category: 'draw',
    protectedNames: new Set<string>(),
    tribalNames: new Set<string>(),
    rampCount: 10,
    rampFloor: 10,
    ...overrides,
  };
}

describe('isStep4bDisplaceable', () => {
  it('protects a mana rock at the ramp floor', () => {
    const rock = makeCard({ name: 'Signet', mana_cost: '{C}{C}', oracle_text: '{T}: Add {C}{C}.' });
    const pick = { card: rock, quantity: 1, board: 'main' as const };
    expect(isStep4bDisplaceable(pick, baseCtx({ rampCount: 10, rampFloor: 10 }))).toBe(false);
  });

  it('lets the same mana rock go once above the floor', () => {
    const rock = makeCard({ name: 'Signet', mana_cost: '{C}{C}', oracle_text: '{T}: Add {C}{C}.' });
    const pick = { card: rock, quantity: 1, board: 'main' as const };
    expect(isStep4bDisplaceable(pick, baseCtx({ rampCount: 11, rampFloor: 10 }))).toBe(true);
  });

  it('never displaces removal', () => {
    const removal = makeCard({ name: 'Doom Blade', type_line: 'Instant', oracle_text: 'Destroy target creature.' });
    const pick = { card: removal, quantity: 1, board: 'main' as const };
    expect(isStep4bDisplaceable(pick, baseCtx())).toBe(false);
  });

  it('displaces a plain utility card', () => {
    const utility = makeCard({ name: 'Filler', type_line: 'Creature — Bear', oracle_text: null });
    const pick = { card: utility, quantity: 1, board: 'main' as const };
    expect(isStep4bDisplaceable(pick, baseCtx())).toBe(true);
  });

  it('never displaces a planeswalker in a superfriends build, regardless of which category is being backfilled', () => {
    const walker = makeCard({ name: 'Some Walker', type_line: 'Legendary Planeswalker — Tam', oracle_text: '+1: Draw a card.' });
    const pick = { card: walker, quantity: 1, board: 'main' as const };
    // Walker permanents are governed by their own dedicated floor — a
    // superfriends build must never let ANY other category's backfill
    // (not just 'planeswalker's) cut into that floor (U11 fix 2 regression).
    expect(isStep4bDisplaceable(pick, baseCtx({ category: 'planeswalker', isSuperfriends: true }))).toBe(false);
    expect(isStep4bDisplaceable(pick, baseCtx({ category: 'counters', isSuperfriends: true }))).toBe(false);
  });

  it('a planeswalker is displaceable outside a superfriends build (no dedicated floor manages it)', () => {
    const walker = makeCard({ name: 'Some Walker', type_line: 'Legendary Planeswalker — Tam', oracle_text: '+1: Draw a card.' });
    const pick = { card: walker, quantity: 1, board: 'main' as const };
    expect(isStep4bDisplaceable(pick, baseCtx({ category: 'counters', isSuperfriends: false }))).toBe(true);
  });

  it('protects a planeswalker whose own ability text classifies as ramp (Quintorius Kand: "Add {R}")', () => {
    // The walker-protection guard must run BEFORE the ramp-floor branch — a
    // planeswalker with an incidental mana ability (an ultimate that adds
    // mana) otherwise gets primary category 'ramp', whose early return
    // skipped the walker check entirely and let Step 4b cut a walker floor
    // pick to backfill an unrelated category (18 -> 17 walkers on a real Tam
    // build, U11 fix 2 second regression).
    const quintorius = makeCard({
      name: 'Quintorius Kand',
      type_line: 'Legendary Planeswalker — Quintorius',
      oracle_text:
        'Whenever you cast a spell from exile, Quintorius Kand deals 2 damage to each opponent and you gain 2 life.\n'
        + '+1: Create a 3/2 red and white Spirit creature token.\n'
        + '−3: Discover 4.\n'
        + '−6: Exile any number of target cards from your graveyard. Add {R} for each card exiled this way. You may play those cards this turn.',
    });
    const pick = { card: quintorius, quantity: 1, board: 'main' as const };
    // Even with rampCount comfortably above rampFloor (would pass the ramp
    // branch if reached), the walker guard must fire first.
    expect(isStep4bDisplaceable(pick, baseCtx({
      category: 'planeswalker', isSuperfriends: true, rampCount: 20, rampFloor: 5,
    }))).toBe(false);
  });
});
