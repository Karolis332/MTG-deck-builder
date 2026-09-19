import { describe, it, expect } from 'vitest';
import { computeCraftList, ownedPoolPrefix } from '../deck-builder-ai';
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

describe('computeCraftList', () => {
  it('returns undefined when useCollection is false, regardless of pool contents', () => {
    const pool = [{ card: makeCard({ name: 'Sol Ring' }), score: 90 }];
    const result = computeCraftList(pool, [], new Set(), new Map(), [], undefined, false);
    expect(result).toBeUndefined();
  });

  it('surfaces exactly the unowned cards that outscore the picked deck, with role and wouldReplace', () => {
    const cheapRemoval = makeCard({
      id: 'owned-removal', name: 'Owned Removal', type_line: 'Instant', cmc: 2,
      oracle_text: 'Destroy target creature.',
    });
    const bestRemoval = makeCard({
      id: 'craft-removal', name: 'Swords to Plowshares', type_line: 'Instant', cmc: 1,
      oracle_text: 'Exile target creature.', rarity: 'uncommon', price_usd: '2.50',
      legalities: '{"standard":"not_legal","brawl":"legal"}',
    });
    const bestRamp = makeCard({
      id: 'craft-ramp', name: 'Sol Ring', type_line: 'Artifact', cmc: 1,
      oracle_text: 'Add {C}{C}.', rarity: 'uncommon', price_usd: '1.75',
      legalities: '{"standard":"not_legal","brawl":"legal"}',
    });
    const bestDraw = makeCard({
      id: 'craft-draw', name: 'Rhystic Study', type_line: 'Enchantment', cmc: 3,
      oracle_text: 'Draw a card.', rarity: 'rare', price_usd: '40.00',
      legalities: '{"standard":"not_legal","brawl":"not_legal"}',
    });
    const ownedFiller = makeCard({ id: 'owned-bear', name: 'Owned Bear', type_line: 'Creature — Bear', cmc: 2, oracle_text: '' });
    const ownedLand = makeCard({ id: 'owned-land', name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0 });

    // Sorted by score descending, as buildScoredCandidatePool's returned pool is.
    const scoredPool = [
      { card: bestDraw, score: 95 },
      { card: bestRamp, score: 90 },
      { card: bestRemoval, score: 85 },
      { card: cheapRemoval, score: 40 },
      { card: ownedFiller, score: 20 },
      { card: ownedLand, score: 5 },
    ];

    const picked: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }> = [
      { card: cheapRemoval, quantity: 1, board: 'main' },
      { card: ownedFiller, quantity: 1, board: 'main' },
      { card: ownedLand, quantity: 1, board: 'main' },
    ];
    const pickedNames = new Set(picked.map((p) => p.card.name));
    const ownedQty = new Map<string, number>([
      ['Owned Removal', 1], ['Owned Bear', 1], ['Forest', 40],
    ]);
    const reasoning = [{ cardName: 'Owned Removal', role: 'removal', reason: 'role quota: removal' }];

    const result = computeCraftList(scoredPool, picked, pickedNames, ownedQty, reasoning, undefined, true);

    expect(result).toBeDefined();
    expect(result!.map((c) => c.name)).toEqual(['Rhystic Study', 'Sol Ring', 'Swords to Plowshares']);

    const removalEntry = result!.find((c) => c.name === 'Swords to Plowshares')!;
    expect(removalEntry.role).toBe('removal');
    expect(removalEntry.wouldReplace).toBe('Owned Removal');
    expect(removalEntry.onArena).toBe(true);
    expect(removalEntry.priceUsd).toBe(2.5);
    expect(removalEntry.rarity).toBe('uncommon');

    const drawEntry = result!.find((c) => c.name === 'Rhystic Study')!;
    expect(drawEntry.onArena).toBe(false); // not_legal in both brawl keys
    expect(drawEntry.wouldReplace).toBeUndefined(); // no owned pick in the 'draw' role

    // Owned/picked/basic-land cards never appear in the craft list.
    expect(result!.some((c) => c.name === 'Owned Bear' || c.name === 'Owned Removal' || c.name === 'Forest')).toBe(false);
  });

  it('caps the list at 15 entries even when more unowned candidates outscore the deck', () => {
    const scoredPool = Array.from({ length: 20 }, (_, i) => ({
      card: makeCard({ id: `craft-${i}`, name: `Craft Card ${i}`, oracle_text: '' }),
      score: 100 - i,
    }));
    const result = computeCraftList(scoredPool, [], new Set(), new Map(), [], undefined, true);
    expect(result).toHaveLength(15);
    expect(result![0].name).toBe('Craft Card 0'); // still ordered by score desc
  });

  it('reuses an existing reasoning entry (repair-displaced pick) instead of the role fallback', () => {
    const displaced = makeCard({ id: 'displaced', name: 'Displaced Engine', oracle_text: 'Draw a card.' });
    const reasoning = [{ cardName: 'Displaced Engine', role: 'draw', reason: 'engine fix: +New Card for Displaced Engine' }];
    const result = computeCraftList(
      [{ card: displaced, score: 50 }], [], new Set(), new Map(), reasoning, undefined, true
    );
    expect(result![0].reason).toBe('engine fix: +New Card for Displaced Engine');
  });
});

describe('ownedPoolPrefix', () => {
  // Regression: the CF-recommendation seed (and the theme-detection sample)
  // read a positional prefix of the pool. Once the pool started carrying
  // unowned candidates too (for the craft list), that prefix had to keep
  // returning ONLY owned names, in the same relative order, or a collection
  // build's CF/network input — and therefore its scores and final picks —
  // would silently drift build to build.
  const pool = ['Sol Ring', 'Rhystic Study', 'Cultivate', 'Skullclamp', 'Llanowar Elves'];
  const ownedQty = new Map([['Cultivate', 1], ['Llanowar Elves', 1]]);

  it('returns only owned names, in original relative order, on a collection build', () => {
    const seed = ownedPoolPrefix(pool, (name) => name, ownedQty, true, 30).map((n) => n);
    expect(seed).toEqual(['Cultivate', 'Llanowar Elves']);
    expect(seed.every((n) => ownedQty.has(n))).toBe(true);
  });

  it('returns the raw prefix unfiltered when not a collection build', () => {
    const seed = ownedPoolPrefix(pool, (name) => name, ownedQty, false, 3);
    expect(seed).toEqual(['Sol Ring', 'Rhystic Study', 'Cultivate']);
  });

  it('respects the cap after filtering to owned', () => {
    const bigPool = Array.from({ length: 50 }, (_, i) => `Card ${i}`);
    const bigOwned = new Map(bigPool.filter((_, i) => i % 2 === 0).map((n) => [n, 1]));
    const seed = ownedPoolPrefix(bigPool, (name) => name, bigOwned, true, 10);
    expect(seed).toHaveLength(10);
    expect(seed.every((n) => bigOwned.has(n))).toBe(true);
  });
});
