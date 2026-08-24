import { describe, it, expect } from 'vitest';
import { getRoleQuotas, roleCapsFor, pickByRole } from '../deck-builder-constraints';
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

// Review 2026-08-23 C4 — tutors had no RoleQuotas field, so the picker had
// nothing to target and 24/27 harness builds shipped 0-1 tutors.
describe('getRoleQuotas tutor quota', () => {
  it('defaults to the archetype\'s low (casual) tutors band when powerLevel is absent', () => {
    const quotas = getRoleQuotas('combo', 61, null);
    // combo template tutors band is [4, 7] -> midpoint round(5.5) = 6
    expect(quotas.tutor).toBe(6);
  });

  it('scales up for optimized/cedh power levels', () => {
    const casual = getRoleQuotas('midrange', 61, null);
    const optimized = getRoleQuotas('midrange', 61, null, 'optimized');
    const cedh = getRoleQuotas('midrange', 61, null, 'cedh');
    expect(optimized.tutor).toBeGreaterThanOrEqual(casual.tutor);
    expect(cedh.tutor).toBeGreaterThanOrEqual(optimized.tutor);
    expect(optimized.tutor).toBeGreaterThanOrEqual(6);
    expect(cedh.tutor).toBeGreaterThanOrEqual(7);
  });

  it('roleCapsFor includes a tutor cap derived from the tutor quota', () => {
    const quotas = getRoleQuotas('combo', 61, null);
    const caps = roleCapsFor(quotas);
    expect(caps.tutor).toBe(quotas.tutor + 2);
  });
});

describe('pickByRole tutor wiring', () => {
  it('fills the tutor role quota from the pool, distinct from ramp/draw', () => {
    const pool = [
      { card: makeCard({ id: 'demonic-tutor', name: 'Demonic Tutor', type_line: 'Sorcery', cmc: 2, oracle_text: 'Search your library for a card, put that card into your hand, then shuffle.' }), score: 90 },
      { card: makeCard({ id: 'vampiric-tutor', name: 'Vampiric Tutor', type_line: 'Instant', cmc: 1, oracle_text: 'Search your library for a card and put that card on top of your library. You lose 2 life.' }), score: 85 },
      { card: makeCard({ id: 'cultivate', name: 'Cultivate', type_line: 'Sorcery', cmc: 3, oracle_text: 'Search your library for up to two basic land cards, reveal those cards, and put one onto the battlefield tapped and the other into your hand. Then shuffle.' }), score: 80 },
      { card: makeCard({ id: 'harmonize', name: 'Harmonize', type_line: 'Sorcery', cmc: 4, oracle_text: 'Draw three cards.' }), score: 70 },
      { card: makeCard({ id: 'filler', name: 'Filler Bear', type_line: 'Creature — Bear', cmc: 2, oracle_text: '' }), score: 10 },
    ];

    const quotas = getRoleQuotas('combo', 30, null);
    const result = pickByRole({
      pool,
      nonLandTarget: 30,
      quotas,
      payoffNames: new Set(),
      getMaxQty: () => 1,
      isCommanderFormat: true,
    });

    expect(result.roleFills.tutor).toBeGreaterThanOrEqual(2);
    const tutorPicks = result.picks.filter((p) => p.role === 'tutor').map((p) => p.card.name);
    expect(tutorPicks).toContain('Demonic Tutor');
    expect(tutorPicks).toContain('Vampiric Tutor');
    // Cultivate is land-fetch — it must land in ramp, never tutor.
    expect(tutorPicks).not.toContain('Cultivate');
    const rampPicks = result.picks.filter((p) => p.role === 'ramp').map((p) => p.card.name);
    expect(rampPicks).toContain('Cultivate');
  });
});
