import { describe, it, expect } from 'vitest';
import { buildDoneResult } from '../services/build-api/best-deck-worker';
import type { RunBestDeckResult } from '../src/lib/best-deck-run';
import type { DbCard } from '../src/lib/types';

const fakeCard = (name: string, owned = false): DbCard & { owned: boolean } => ({
  id: name,
  oracle_id: name,
  name,
  mana_cost: '{1}{R}',
  cmc: 2,
  type_line: 'Creature — Human',
  oracle_text: '',
  colors: '["R"]',
  color_identity: '["R"]',
  keywords: null,
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
  updated_at: '',
  subtypes: null,
  arena_id: null,
  owned,
});

const fakeResult: RunBestDeckResult = {
  commander: fakeCard('Fake Commander'),
  deck: [fakeCard('Owned Card', true), fakeCard('Bought Card', false)],
  buyList: [{ name: 'Bought Card', priceUsd: 3.336 }],
  buyUsd: 3.336,
  budgetUsd: 10,
  objective: 42.5,
  power: { powerLevel: 3, bracket: 2 },
  climb: { converged: true, stopReason: 'converged', passes: 1, evaluations: 10, swaps: 0, poolSize: 50 },
  commanders: [],
  note: null,
  unresolved: [],
  ownedResolved: 2,
  upgrades: [{ name: 'Sol Ring', priceUsd: 2, replaces: 'Owned Card', gain: 1.5 }],
  replacements: [{ forCard: 'Bought Card', options: [{ name: 'Owned Card', delta: -0.1 }] }],
  nearMisses: [{ name: 'Fake Commander', owned: false, priceUsd: null, delta: 0.1, slot: 'Owned Card' }],
};

const fakeRequest = { owned: [{ name: 'Owned Card' }, { name: 'Sol Ring' }], budgetUsd: 10 };

describe('buildDoneResult — full BuildResult/BestDeckResult key set (refuter H1)', () => {
  it('fills every non-optional BuildResult field the web renders unconditionally', () => {
    const out = buildDoneResult(fakeResult, fakeRequest, 1234) as Record<string, unknown>;

    // BuildResult's non-optional fields (black-grimoire-web/src/components/builder/types.ts) —
    // deck-result.tsx calls .map on themes/cards with no guard, so these must never be undefined.
    expect(out.commander).toBe('Fake Commander');
    expect(out.partner).toBeNull();
    expect(out.format).toBe('commander');
    expect(out.strategy).toBe('best-deck');
    expect(Array.isArray(out.themes)).toBe(true);
    expect(out.tribalType).toBeNull();
    expect(out.elapsedMs).toBe(1234);
    expect(Array.isArray(out.cards)).toBe(true);
    expect(out.collectionMode).toBe(true);
    expect(out.collectionMatched).toBe(2); // sourced straight from RunBestDeckResult.ownedResolved (refuter L3)

    // BestDeckResult's additional fields.
    expect(out.buyList).toEqual(fakeResult.buyList);
    expect(out.buyUsd).toBeCloseTo(3.34, 2); // rounded to cents
    expect(out.budgetUsd).toBe(10);
    expect(out.objective).toBe(42.5);
    expect(out.power).toEqual({ powerLevel: 3, bracket: 2 });
    expect(out.climb).toEqual(fakeResult.climb);
    expect(Array.isArray(out.commanders)).toBe(true);
    expect(out.note).toBeNull();
    expect(Array.isArray(out.unresolved)).toBe(true);

    const price = out.price as Record<string, unknown>;
    expect(price.currency).toBe('USD');
    expect(price.total).toBeCloseTo(3.34, 2);
    expect(price.maxDeckPrice).toBe(10);
    expect(price.maxCardPrice).toBeNull();
  });

  it('v2: upgrades/replacements/nearMisses carry imageUri resolved from the card rows (null for an unknown name)', () => {
    const out = buildDoneResult(fakeResult, fakeRequest, 1234) as Record<string, unknown>;

    const upgrades = out.upgrades as Array<Record<string, unknown>>;
    expect(upgrades).toHaveLength(1);
    expect(upgrades[0]).toMatchObject({ name: 'Sol Ring', priceUsd: 2, replaces: 'Owned Card', gain: 1.5 });
    expect(upgrades[0].imageUri === null || typeof upgrades[0].imageUri === 'string').toBe(true);

    const replacements = out.replacements as Array<Record<string, unknown>>;
    expect(replacements).toHaveLength(1);
    expect(replacements[0].forCard).toBe('Bought Card');
    const options = replacements[0].options as Array<Record<string, unknown>>;
    expect(options[0]).toMatchObject({ name: 'Owned Card', delta: -0.1 });
    expect('imageUri' in options[0]).toBe(true);

    const nearMisses = out.nearMisses as Array<Record<string, unknown>>;
    expect(nearMisses).toHaveLength(1);
    // "Fake Commander" is not a real card in the DB — imageUri must fall back to null, not throw.
    expect(nearMisses[0]).toMatchObject({ name: 'Fake Commander', owned: false, priceUsd: null, delta: 0.1, slot: 'Owned Card', imageUri: null });
  });
});
