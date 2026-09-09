// Power level algorithm by EDHPowerLevel.com (edhpowerlevel.com), reimplemented
// with permission pending; not affiliated.
import { describe, it, expect } from 'vitest';
import { mapCurve, computePowerLevel, DEFAULT_FACTORS, type PowerLevelCardInput } from '../power-level-edhpl';

describe('mapCurve', () => {
  const stops = [0, 0.5, 1.5, 3.5, 6, 10, 15, 25, 40, 65, 100];

  it('returns 0 at or below the first stop', () => {
    expect(mapCurve(0, stops)).toBe(0);
    expect(mapCurve(-5, stops)).toBe(0);
  });

  it('returns (n-1)*o above the last stop', () => {
    expect(mapCurve(1000, stops, 1.25)).toBeCloseTo((stops.length - 1) * 1.25, 6);
  });

  it('interpolates linearly within a bucket, scaled by o', () => {
    // price=10 sits exactly on stops[5]; o=1.25 -> bucket start 5*1.25=6.25
    expect(mapCurve(10, stops, 1.25)).toBeCloseTo(6.25, 6);
    // halfway between stops[1]=0.5 and stops[2]=1.5 -> index 1.5, o=1
    expect(mapCurve(1.0, stops, 1)).toBeCloseTo(1.5, 6);
  });
});

function card(overrides: Partial<PowerLevelCardInput>): PowerLevelCardInput {
  return {
    name: 'Test Card',
    quantity: 1,
    price: 1,
    edhrecRank: 10000,
    cmc: 2,
    typeLine: 'Creature — Human',
    layout: 'normal',
    ...overrides,
  };
}

describe('computePowerLevel — basic land', () => {
  it('basic lands always score impact = 2 * quantity, ignoring price/rank', () => {
    const result = computePowerLevel(
      [card({ name: 'Mountain', typeLine: 'Basic Land — Mountain', quantity: 10, price: 999, edhrecRank: 1 })],
      [],
    );
    expect(result.perCard[0].impact).toBe(20);
    expect(result.perCard[0].isLand).toBe(true);
    expect(result.perCard[0].cmc).toBe(0);
  });
});

describe('computePowerLevel — nonbasic land', () => {
  it('scales impact by factors.land and zeroes cmc', () => {
    const nonlandCard = card({ name: 'Regular Nonland', price: 5, edhrecRank: 3000, cmc: 3 });
    const [nonland] = computePowerLevel([nonlandCard], []).perCard;

    const landCard = card({
      name: 'Command Tower', typeLine: 'Land', price: 5, edhrecRank: 3000, cmc: 0,
    });
    const [land] = computePowerLevel([landCard], []).perCard;

    // same price/rank rating as the nonland card above, scaled by land factor
    expect(land.impact).toBeCloseTo(nonland.impact * DEFAULT_FACTORS.land, 6);
    expect(land.isLand).toBe(true);
    expect(land.cmc).toBe(0);
  });
});

describe('computePowerLevel — reserved list', () => {
  it('multiplies price by factors.reserved before rating', () => {
    const base = card({ name: 'Some Reserved Card', price: 50, edhrecRank: 20000 });
    const [unreserved] = computePowerLevel([base], []).perCard;
    const [reserved] = computePowerLevel([{ ...base, reserved: true }], []).perCard;

    expect(reserved.priceRating).toBeLessThan(unreserved.priceRating);
    // effective price after the 0.2 factor: 50*0.2=10, same bucket as $10 flat
    const expectedPriceRating = mapCurve(10, DEFAULT_FACTORS.priceCurve, 1 + DEFAULT_FACTORS.favorPrice);
    expect(reserved.priceRating).toBeCloseTo(expectedPriceRating, 6);
  });
});

describe('computePowerLevel — card override', () => {
  it('applies the hand-tuned price override for Sol Ring', () => {
    const solRing = card({ name: 'Sol Ring', price: 2, edhrecRank: 5, cmc: 1 });
    const plain = card({ name: 'Generic Ramp Rock', price: 2, edhrecRank: 5, cmc: 1 });

    const [solRingResult] = computePowerLevel([solRing], []).perCard;
    const [plainResult] = computePowerLevel([plain], []).perCard;

    // Sol Ring override multiplies price by 8 (2 -> 16) before rating
    expect(solRingResult.priceRating).toBeCloseTo(
      mapCurve(16, DEFAULT_FACTORS.priceCurve, 1 + DEFAULT_FACTORS.favorPrice), 6,
    );
    expect(solRingResult.impact).toBeGreaterThan(plainResult.impact);
  });
});

describe('computePowerLevel — full synthetic deck (hand-computed)', () => {
  // Four unique cards chosen so the arithmetic is easy to verify by hand:
  //   A: nonland, $10, rank 100,   cmc 3, qty 1 -> impact 13.666666667
  //   B: Mountain (basic land),               qty 10 -> impact 20
  //   C: Sol Ring (price override x8), $2, rank 5, cmc 1, qty 1 -> impact 15.333333333
  //   D: nonland, $50 reserved (->$10), rank 20000, cmc 4, qty 1 -> impact 7.073529412
  const deck: PowerLevelCardInput[] = [
    card({ name: 'Card A', price: 10, edhrecRank: 100, cmc: 3, colors: ['R'] }),
    card({ name: 'Mountain', typeLine: 'Basic Land — Mountain', quantity: 10, price: 0.1, edhrecRank: 999999, cmc: 0 }),
    card({ name: 'Sol Ring', price: 2, edhrecRank: 5, cmc: 1, colors: [] }),
    card({ name: 'Card D', price: 50, edhrecRank: 20000, cmc: 4, colors: ['U'], reserved: true }),
  ];

  const result = computePowerLevel(deck, []);

  it('computes total impact', () => {
    expect(result.impactTotal).toBeCloseTo(56.073529412, 5);
  });

  it('computes avg nonland cmc', () => {
    expect(result.avgCost).toBeCloseTo(2.67, 6);
  });

  it('computes tipping point', () => {
    expect(result.tippingPoint).toBe(3);
  });

  it('computes efficiency and score', () => {
    expect(result.efficiency).toBeCloseTo(0.744705882, 5);
    expect(result.score).toBeCloseTo(55.239023, 3);
  });

  it('computes power level and bracket', () => {
    expect(result.powerLevel).toBeCloseTo(0.22, 2);
    expect(result.bracket).toBe(1);
    expect(result.minBracketPartial).toBe(0);
  });
});

describe('computePowerLevel — partial minimum bracket signals', () => {
  it('floors the bracket when a deck runs 3+ restricted extra-turn cards', () => {
    const deck: PowerLevelCardInput[] = [
      card({ name: 'Time Warp', oracleText: 'Target player takes an extra turn after this one.', price: 5, edhrecRank: 2000 }),
      card({ name: 'Temporal Manipulation', oracleText: 'Target player takes an extra turn after this one.', price: 5, edhrecRank: 2000 }),
      card({ name: 'Walk the Aeons', oracleText: 'Target player takes an extra turn after this one.', price: 5, edhrecRank: 2000 }),
    ];
    const result = computePowerLevel(deck, []);
    expect(result.minBracketPartial).toBeGreaterThanOrEqual(3);
    expect(result.bracket).toBeGreaterThanOrEqual(4);
  });

  it('floors the bracket for any Game Changer beyond the bracket-2 allowance', () => {
    const deck: PowerLevelCardInput[] = [
      card({ name: 'The One Ring', gameChanger: true, price: 40, edhrecRank: 50 }),
    ];
    const result = computePowerLevel(deck, []);
    // one Game Changer already exceeds the bracket-1 (max 0) allowance
    expect(result.minBracketPartial).toBeGreaterThanOrEqual(2);
  });
});
