import { describe, it, expect } from 'vitest';
import { applyDeckBudget, applyBracketTarget } from '../deck-builder-ai';
import { bracketPoolExclusions, bracketOffenseCategory } from '../bracket';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    mana_cost: '{1}{R}',
    cmc: 2,
    type_line: 'Creature',
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

describe('bracketPoolExclusions', () => {
  it('target 1-2 excludes all four categories', () => {
    for (const t of [1, 2] as const) {
      const s = bracketPoolExclusions(t);
      expect(s.has('game_changer')).toBe(true);
      expect(s.has('mass_land_denial')).toBe(true);
      expect(s.has('extra_turn')).toBe(true);
      expect(s.has('fast_mana')).toBe(true);
    }
  });
  it('target 3 excludes only mass land denial', () => {
    const s = bracketPoolExclusions(3);
    expect([...s]).toEqual(['mass_land_denial']);
  });
  it('target 4-5 excludes nothing', () => {
    expect(bracketPoolExclusions(4).size).toBe(0);
    expect(bracketPoolExclusions(5).size).toBe(0);
  });
});

describe('bracketOffenseCategory', () => {
  it('flags a game changer', () => {
    expect(bracketOffenseCategory(makeCard({ name: 'Anything', game_changer: 1 }))).toBe('game_changer');
  });
  it('flags mass land denial by name', () => {
    expect(bracketOffenseCategory(makeCard({ name: 'Armageddon' }))).toBe('mass_land_denial');
  });
  it('flags fast mana by name', () => {
    expect(bracketOffenseCategory(makeCard({ name: 'Sol Ring' }))).toBe('fast_mana');
  });
  it('returns null for a clean card', () => {
    expect(bracketOffenseCategory(makeCard({ name: 'Grizzly Bears' }))).toBeNull();
  });
});

describe('applyDeckBudget', () => {
  it('per-card cap exemptions: owned cards and null price stay untouched by the budget loop', () => {
    const expensive = makeCard({ name: 'Expensive Owned', price_usd: '80.00' });
    const unpriced = makeCard({ name: 'Unpriced Staple', price_usd: null });
    const cheapCandidate = makeCard({ name: 'Cheap Replacement', price_usd: '2.00' });
    const picked = [
      { card: expensive, quantity: 1, board: 'main' as const },
      { card: unpriced, quantity: 1, board: 'main' as const },
    ];
    const pool = [{ card: cheapCandidate, score: 50 }];
    const ownedQty = new Map([['Expensive Owned', 1]]);

    const { cards, replacedForBudget } = applyDeckBudget(picked, pool, 5, ownedQty, true, undefined);
    // Owned card and unpriced card both count as $0 for the total, which is
    // already under the $5 cap, so no swap happens.
    expect(replacedForBudget).toEqual([]);
    expect(cards.map((c) => c.card.name)).toEqual(['Expensive Owned', 'Unpriced Staple']);
  });

  it('replaces the most expensive unowned card with a cheaper same-role candidate until under budget', () => {
    const bomb = makeCard({ name: 'Bomb', price_usd: '40.00', type_line: 'Creature' });
    const filler = makeCard({ name: 'Filler', price_usd: '1.00', type_line: 'Creature' });
    const replacement = makeCard({ name: 'Budget Creature', price_usd: '3.00', type_line: 'Creature' });
    const picked = [
      { card: bomb, quantity: 1, board: 'main' as const },
      { card: filler, quantity: 1, board: 'main' as const },
    ];
    const pool = [{ card: replacement, score: 40 }];

    const { cards, replacedForBudget } = applyDeckBudget(picked, pool, 10, new Map(), false, undefined);
    expect(replacedForBudget.length).toBe(1);
    expect(replacedForBudget[0].out).toBe('Bomb');
    expect(replacedForBudget[0].in).toBe('Budget Creature');
    const total = cards.reduce((s, c) => s + parseFloat(c.card.price_usd || '0') * c.quantity, 0);
    expect(total).toBeLessThanOrEqual(10);
  });

  it('terminates (bounded by deck size) even when no candidate can bring the deck under budget', () => {
    const bomb = makeCard({ name: 'Bomb', price_usd: '40.00' });
    const picked = [{ card: bomb, quantity: 1, board: 'main' as const }];
    const { cards, replacedForBudget } = applyDeckBudget(picked, [], 1, new Map(), false, undefined);
    expect(replacedForBudget).toEqual([]);
    expect(cards[0].card.name).toBe('Bomb');
  });

  it('a land swap falls back to an existing basic in the deck (basics are the floor)', () => {
    const pricyLand = makeCard({ name: 'Pricy Dual', price_usd: '30.00', type_line: 'Land' });
    const basic = makeCard({ name: 'Mountain', price_usd: '0.10', type_line: 'Basic Land' });
    const picked = [
      { card: pricyLand, quantity: 1, board: 'main' as const },
      { card: basic, quantity: 5, board: 'main' as const },
    ];
    const { cards, replacedForBudget } = applyDeckBudget(picked, [], 5, new Map(), false, undefined);
    expect(replacedForBudget.length).toBe(1);
    expect(cards.find((c) => c.card.name === 'Pricy Dual')).toBeUndefined();
    expect(cards.find((c) => c.card.name === 'Mountain')?.quantity).toBe(6);
  });
});

describe('applyBracketTarget', () => {
  it('swaps a game changer out for target 1-2 and reaches bracket 2', () => {
    const gc = makeCard({ name: 'Game Changer Card', game_changer: 1, type_line: 'Sorcery' });
    const clean = makeCard({ name: 'Clean Replacement', type_line: 'Sorcery' });
    const picked = [{ card: gc, quantity: 1, board: 'main' as const }];
    const pool = [{ card: clean, score: 30 }];

    const { cards, result } = applyBracketTarget(picked, pool, 2, undefined, []);
    expect(result.target).toBe(2);
    expect(result.result).toBe(2);
    expect(result.swapped.length).toBe(1);
    expect(result.swapped[0]).toEqual({ out: 'Game Changer Card', in: 'Clean Replacement', category: 'game_changer' });
    expect(cards[0].card.name).toBe('Clean Replacement');
  });

  it('target 3 keeps the top-3 highest-scored game changers and swaps only the rest', () => {
    const gcs = ['GC1', 'GC2', 'GC3', 'GC4'].map((name, i) =>
      makeCard({ name, game_changer: 1, type_line: 'Artifact' })
    );
    const replacement = makeCard({ name: 'Safe Artifact', type_line: 'Artifact' });
    const picked = gcs.map((card) => ({ card, quantity: 1, board: 'main' as const }));
    // Score GC4 lowest so it's the one swapped out.
    const pool = [
      { card: gcs[0], score: 100 }, { card: gcs[1], score: 90 }, { card: gcs[2], score: 80 },
      { card: gcs[3], score: 10 }, { card: replacement, score: 50 },
    ];
    const { cards, result } = applyBracketTarget(picked, pool, 3, undefined, []);
    expect(result.swapped.length).toBe(1);
    expect(result.swapped[0].out).toBe('GC4');
    expect(cards.map((c) => c.card.name).sort()).toEqual(['GC1', 'GC2', 'GC3', 'Safe Artifact'].sort());
  });

  it('reports the result honestly when no safe candidate exists to swap in', () => {
    const gc = makeCard({ name: 'Lonely Game Changer', game_changer: 1 });
    const picked = [{ card: gc, quantity: 1, board: 'main' as const }];
    const { result } = applyBracketTarget(picked, [], 2, undefined, []);
    expect(result.target).toBe(2);
    expect(result.result).toBeGreaterThan(2);
    expect(result.swapped).toEqual([]);
  });
});
