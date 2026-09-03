import { describe, it, expect } from 'vitest';
import { computeCoverageStats } from '../tiles/coverage-selectors';
import type { LiveRailCard } from '../tiles/types';

function card(overrides: Partial<LiveRailCard>): LiveRailCard {
  return {
    id: overrides.name ?? 'x',
    oracle_id: 'o1',
    name: 'Test Card',
    mana_cost: null,
    cmc: 2,
    type_line: 'Creature',
    oracle_text: null,
    colors: null,
    color_identity: null,
    keywords: null,
    set_code: 'tst',
    set_name: 'Test',
    collector_number: '1',
    rarity: 'common',
    image_uri_small: null,
    image_uri_normal: null,
    image_uri_large: null,
    image_uri_art_crop: null,
    price_usd: null,
    price_usd_foil: null,
    legalities: null,
    power: null,
    toughness: null,
    loyalty: null,
    produced_mana: null,
    edhrec_rank: null,
    layout: 'normal',
    updated_at: '',
    subtypes: null,
    arena_id: null,
    quantity: 1,
    board: 'main',
    ...overrides,
  };
}

describe('computeCoverageStats', () => {
  it('computes owned percentage over distinct main/commander cards', () => {
    const cards = [
      card({ name: 'A', owned_qty: 2 }),
      card({ name: 'B', owned_qty: 0 }),
      card({ name: 'C', owned_qty: 1 }),
      card({ name: 'Sideboard Only', board: 'sideboard', owned_qty: 0 }),
    ];
    const stats = computeCoverageStats(cards, 'commander');
    expect(stats.ownedPct).toBe(67); // 2 of 3 main/commander cards owned
  });

  it('sums price_usd * quantity for main/commander cards', () => {
    const cards = [
      card({ name: 'A', price_usd: '1.50', quantity: 2 }),
      card({ name: 'B', price_usd: '3.00', quantity: 1 }),
      card({ name: 'Side', board: 'sideboard', price_usd: '100.00', quantity: 1 }),
    ];
    const stats = computeCoverageStats(cards, 'commander');
    expect(stats.totalValueUsd).toBeCloseTo(6.0);
  });

  it('flags illegal cards via validateDeck (banned/duplicate singleton)', () => {
    const cards = [
      card({ name: 'Sol Ring', board: 'commander', type_line: 'Legendary Creature' }),
      card({ name: 'Black Lotus', board: 'main', quantity: 2 }), // non-basic duplicate is illegal in commander
    ];
    const stats = computeCoverageStats(cards, 'commander');
    expect(stats.illegalCardNames.some((n) => n.includes('Black Lotus'))).toBe(true);
  });

  it('counts not-on-Arena cards only for arena-relevant formats', () => {
    const cards = [card({ name: 'A', arena_id: null }), card({ name: 'B', arena_id: 123 })];
    expect(computeCoverageStats(cards, 'brawl').notOnArenaCount).toBe(1);
    expect(computeCoverageStats(cards, 'commander').notOnArenaCount).toBe(0);
  });
});
