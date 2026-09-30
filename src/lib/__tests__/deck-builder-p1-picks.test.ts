import { describe, it, expect } from 'vitest';
import { pickByRole, getRoleQuotas, CardNameSet, formatMaxCopies, ANY_NUMBER_DEFAULT_COPIES } from '../deck-builder-constraints';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard>): DbCard {
  return {
    id: 'test-id', oracle_id: 'test-oracle', name: 'Test Card', mana_cost: '{2}', cmc: 2, type_line: 'Artifact',
    oracle_text: null, colors: '[]', color_identity: '[]', keywords: '[]', set_code: 'tst', set_name: 'Test Set',
    collector_number: '1', rarity: 'common', image_uri_small: null, image_uri_normal: null, image_uri_large: null,
    image_uri_art_crop: null, price_usd: null, price_usd_foil: null, legalities: '{"commander":"legal"}', power: null,
    toughness: null, loyalty: null, produced_mana: null, edhrec_rank: null, layout: 'normal', updated_at: '2024-01-01',
    subtypes: null, arena_id: null, game_changer: 0, ...overrides,
  } as DbCard;
}
const RAMP = 'Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.';
const DRAW = 'Draw three cards.';
const REMOVAL = 'Destroy target creature.';
const SLIME = 'Create a 0/0 green Ooze creature token with trample.\nA deck can have any number of cards named Slime Against Humanity.';

/** A role-rich pool: `n` of each quota role, scores descending from 100. */
function rolePool(n: number) {
  const out: Array<{ card: DbCard; score: number }> = [];
  let score = 100;
  for (let i = 1; i <= n; i++) {
    out.push({ card: makeCard({ id: `ramp-${i}`, name: `Ramp ${i}`, type_line: 'Sorcery', oracle_text: RAMP }), score: score-- });
    out.push({ card: makeCard({ id: `draw-${i}`, name: `Draw ${i}`, type_line: 'Sorcery', oracle_text: DRAW }), score: score-- });
    out.push({ card: makeCard({ id: `kill-${i}`, name: `Kill ${i}`, type_line: 'Instant', oracle_text: REMOVAL }), score: score-- });
  }
  return out;
}

describe('CardNameSet (A-D6): an Arena-rebalanced "A-X" and its paper "X" are one card', () => {
  it('has/add/delete all key on the A--stripped name', () => {
    const s = new CardNameSet();
    s.add('A-Minsc & Boo, Timeless Heroes');
    expect(s.has('Minsc & Boo, Timeless Heroes')).toBe(true);
    expect(s.has('A-Minsc & Boo, Timeless Heroes')).toBe(true);
    expect(s.size).toBe(1);
    s.delete('Minsc & Boo, Timeless Heroes');
    expect(s.has('A-Minsc & Boo, Timeless Heroes')).toBe(false);
  });

  it('pickByRole never takes both halves of a rebalanced pair', () => {
    const pool = [
      { card: makeCard({ id: 'minsc', name: 'Minsc & Boo, Timeless Heroes', type_line: 'Legendary Planeswalker — Minsc', oracle_text: DRAW }), score: 90 },
      { card: makeCard({ id: 'a-minsc', name: 'A-Minsc & Boo, Timeless Heroes', type_line: 'Legendary Planeswalker — Minsc', oracle_text: DRAW }), score: 89 },
      ...rolePool(6),
    ];
    const result = pickByRole({ pool, nonLandTarget: 20, quotas: getRoleQuotas('midrange', 20, null), payoffNames: new Set(), getMaxQty: () => 1, isCommanderFormat: true });
    const minsc = result.picks.filter((p) => /Minsc & Boo/.test(p.card.name));
    expect(minsc.length).toBe(1);
    expect(minsc[0].card.name).toBe('Minsc & Boo, Timeless Heroes');
  });
});

describe('formatMaxCopies (A-D5): "any number of cards named" lifts the singleton cap', () => {
  it('singleton formats cap at 1, 60-card at maxCopies, any-number at the default copy count', () => {
    expect(formatMaxCopies(REMOVAL, true, 1)).toBe(1);
    expect(formatMaxCopies(REMOVAL, false, 4)).toBe(4);
    expect(formatMaxCopies(SLIME, true, 1)).toBe(ANY_NUMBER_DEFAULT_COPIES);
    expect(formatMaxCopies(SLIME, false, 4)).toBe(ANY_NUMBER_DEFAULT_COPIES);
  });

  it('pickByRole takes every copy getMaxQty allows in a commander format', () => {
    const pool = [
      { card: makeCard({ id: 'slime', name: 'Slime Against Humanity', type_line: 'Sorcery', oracle_text: SLIME }), score: 95 },
      ...rolePool(6),
    ];
    // 18 role cards + 4 Slimes < 30 slots: everything is taken, so the quantity is the cap, not the remainder.
    const result = pickByRole({
      pool, nonLandTarget: 30, quotas: getRoleQuotas('midrange', 30, null), payoffNames: new Set(),
      getMaxQty: (c) => (c.name === 'Slime Against Humanity' ? 4 : 1), isCommanderFormat: true,
      passBScoreFloor: 0,
    });
    expect(result.picks.find((p) => p.card.name === 'Slime Against Humanity')?.quantity).toBe(4);
  });
});

describe('pickByRole pick order (A-D1): score floors', () => {
  it('Pass A skips a role card below scoreFloor; it never fills the quota as that role', () => {
    const pool = [
      ...rolePool(6),
      { card: makeCard({ id: 'weak', name: 'Weak Removal', type_line: 'Instant', oracle_text: REMOVAL }), score: 10 },
    ];
    const quotas = { ...getRoleQuotas('midrange', 40, null), removal: 7 }; // 6 good removal + 1 short
    const result = pickByRole({ pool, nonLandTarget: 40, quotas, payoffNames: new Set(), getMaxQty: () => 1, isCommanderFormat: true, scoreFloor: 50, passBScoreFloor: 50 });
    const weak = result.picks.find((p) => p.card.name === 'Weak Removal');
    expect(weak === undefined || weak.reason.startsWith('fallback fill')).toBe(true);
    expect(result.roleFills.removal).toBe(6);
  });

  it('Pass B admits a roleless card at or above passBScoreFloor and one named in synergyNames; the rest stay filler', () => {
    const pool = [
      { card: makeCard({ id: 'value', name: 'Plain Value', type_line: 'Creature — Bear', oracle_text: 'Trample' }), score: 95 },
      ...rolePool(3), // 9 role cards: quotas take 6, caps admit the rest, slots remain for the roleless cards
      { card: makeCard({ id: 'tribe', name: 'Tribe Buddy', type_line: 'Creature — Bear', oracle_text: 'Vigilance' }), score: 20 },
      { card: makeCard({ id: 'junk', name: 'Plain Junk', type_line: 'Creature — Bear', oracle_text: 'Haste' }), score: 5 },
    ];
    // Small explicit quotas so Pass A leaves room and Pass B is what seats the roleless cards.
    const quotas = { ...getRoleQuotas('midrange', 12, null), ramp: 2, draw: 2, removal: 2, tutor: 0, board_wipe: 0, protection: 0, synergy_payoff: 0, win_condition: 0 };
    const result = pickByRole({
      pool, nonLandTarget: 12, quotas, payoffNames: new Set(), getMaxQty: () => 1, isCommanderFormat: true,
      passBScoreFloor: 50, synergyNames: new Set(['Tribe Buddy']),
    });
    const value = result.picks.find((p) => p.card.name === 'Plain Value');
    expect(value).toBeDefined();
    expect(value!.reason.startsWith('fallback fill')).toBe(false);
    const tribe = result.picks.find((p) => p.card.name === 'Tribe Buddy');
    expect(tribe?.role).toBe('synergy');
    const junk = result.picks.find((p) => p.card.name === 'Plain Junk');
    expect(junk === undefined || junk.reason.startsWith('fallback fill')).toBe(true);
  });

  it('legacy path (no floors) is unchanged: a roleless card is only ever fallback fill', () => {
    const pool = [
      { card: makeCard({ id: 'value', name: 'Plain Value', type_line: 'Creature — Bear', oracle_text: 'Trample' }), score: 95 },
      ...rolePool(4),
    ];
    const result = pickByRole({ pool, nonLandTarget: 13, quotas: getRoleQuotas('midrange', 13, null), payoffNames: new Set(), getMaxQty: () => 1, isCommanderFormat: true });
    const value = result.picks.find((p) => p.card.name === 'Plain Value');
    expect(value?.reason.startsWith('fallback fill')).toBe(true);
  });
});
