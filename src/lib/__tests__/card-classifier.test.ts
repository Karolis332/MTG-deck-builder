import { describe, it, expect } from 'vitest';
import {
  classifyCard,
  getPrimaryCategory,
  hasCommanderSynergy,
  computeRatioHealth,
  computeManaCurve,
  computeOverallScore,
  generateSuggestions,
  getFormatRatios,
  type ClassifiedCard,
  type CardCategory,
} from '../card-classifier';

describe('classifyCard', () => {
  it('classifies basic lands as land', () => {
    const cats = classifyCard('Forest', '', 'Basic Land — Forest', 0);
    expect(cats).toEqual(['land']);
  });

  it('classifies nonbasic lands as land', () => {
    const cats = classifyCard('Command Tower', '{T}: Add one mana of any color in your commander\'s color identity.', 'Land', 0);
    expect(cats).toEqual(['land']);
  });

  it('classifies mana dorks as ramp', () => {
    const cats = classifyCard('Llanowar Elves', '{T}: Add {G}.', 'Creature — Elf Druid', 1);
    expect(cats).toContain('ramp');
  });

  it('classifies mana rocks as ramp', () => {
    const cats = classifyCard('Arcane Signet', '{T}: Add one mana of any color in your commander\'s color identity.', 'Artifact', 2);
    expect(cats).toContain('ramp');
  });

  it('classifies land ramp spells as ramp', () => {
    const cats = classifyCard('Cultivate', 'Search your library for up to two basic land cards, reveal those cards, and put one onto the battlefield tapped and the other into your hand. Then shuffle.', 'Sorcery', 3);
    expect(cats).toContain('ramp');
  });

  it('classifies draw spells as draw', () => {
    const cats = classifyCard('Harmonize', 'Draw three cards.', 'Sorcery', 4);
    expect(cats).toContain('draw');
  });

  it('classifies named draw cards', () => {
    const cats = classifyCard('The Great Henge', 'stuff', 'Legendary Artifact', 9);
    expect(cats).toContain('draw');
  });

  it('classifies targeted removal', () => {
    const cats = classifyCard('Beast Within', 'Destroy target permanent. Its controller creates a 3/3 green Beast creature token.', 'Instant', 3);
    expect(cats).toContain('removal');
  });

  it('classifies damage-based removal', () => {
    const cats = classifyCard('Lightning Bolt', 'Lightning Bolt deals 3 damage to any target.', 'Instant', 1);
    expect(cats).toContain('removal');
  });

  it('classifies board wipes', () => {
    const cats = classifyCard('Wrath of God', 'Destroy all creatures. They can\'t be regenerated.', 'Sorcery', 4);
    expect(cats).toContain('board_wipe');
  });

  it('board wipes are not also classified as removal', () => {
    const cats = classifyCard('Wrath of God', 'Destroy all creatures. They can\'t be regenerated.', 'Sorcery', 4);
    expect(cats).not.toContain('removal');
  });

  it('classifies protection spells', () => {
    const cats = classifyCard('Heroic Intervention', 'Permanents you control gain hexproof and indestructible until end of turn.', 'Instant', 2);
    expect(cats).toContain('protection');
  });

  it('classifies equipment as protection', () => {
    const cats = classifyCard('Lightning Greaves', 'Equipped creature has haste and shroud.', 'Artifact — Equipment', 2);
    expect(cats).toContain('protection');
  });

  it('classifies high-cmc creatures as win conditions', () => {
    const cats = classifyCard('Craterhoof Behemoth', 'Trample. When Craterhoof Behemoth enters the battlefield, creatures you control get +X/+X and gain trample until end of turn, where X is the number of creatures you control.', 'Creature — Beast', 8);
    expect(cats).toContain('win_condition');
  });

  it('classifies utility cards as utility', () => {
    const cats = classifyCard('Some Random Card', 'When this enters, put a +1/+1 counter on target creature.', 'Creature — Human', 2);
    expect(cats).toContain('utility');
  });

  it('detects commander synergy with food commander', () => {
    const cmdText = 'Whenever an opponent casts a noncreature spell, create a Food token. Whenever The Cabbage Merchant deals combat damage to a player, sacrifice a Food.';
    const cats = classifyCard(
      'Tireless Provisioner',
      'Landfall — Whenever a land enters the battlefield under your control, create a Food token or a Treasure token.',
      'Creature — Elf Scout',
      3,
      cmdText
    );
    expect(cats).toContain('synergy');
  });

  it('cards can have multiple categories', () => {
    const cmdText = 'Whenever an opponent casts a noncreature spell, create a Food token.';
    const cats = classifyCard(
      'Peregrin Took',
      'Whenever you create a Food token, draw a card.',
      'Creature — Halfling Citizen',
      3,
      cmdText
    );
    expect(cats).toContain('draw');
    expect(cats).toContain('synergy');
  });
});

describe('getPrimaryCategory', () => {
  it('prioritizes board_wipe over removal', () => {
    expect(getPrimaryCategory(['board_wipe', 'removal'])).toBe('board_wipe');
  });

  it('prioritizes removal over ramp', () => {
    expect(getPrimaryCategory(['ramp', 'removal'])).toBe('removal');
  });

  it('defaults to utility for empty', () => {
    expect(getPrimaryCategory([])).toBe('utility');
  });

  it('returns land for lands', () => {
    expect(getPrimaryCategory(['land'])).toBe('land');
  });
});

describe('hasCommanderSynergy', () => {
  const cabbageMerchantText = 'Whenever an opponent casts a noncreature spell, create a Food token. Whenever The Cabbage Merchant deals combat damage to a player, sacrifice a Food.';

  it('detects food synergy', () => {
    expect(
      hasCommanderSynergy('Create a Food token.', 'Creature', cabbageMerchantText)
    ).toBe(true);
  });

  it('detects sacrifice synergy', () => {
    expect(
      hasCommanderSynergy('Whenever you sacrifice a permanent, draw a card.', 'Creature', cabbageMerchantText)
    ).toBe(true);
  });

  it('detects combat damage synergy', () => {
    expect(
      hasCommanderSynergy('This creature can\'t be blocked. Whenever it deals combat damage to a player, draw a card.', 'Creature', cabbageMerchantText)
    ).toBe(true);
  });

  it('rejects unrelated cards', () => {
    expect(
      hasCommanderSynergy('Flying. When this creature dies, return it to its owner\'s hand.', 'Creature', cabbageMerchantText)
    ).toBe(false);
  });

  it('ignores lands', () => {
    expect(
      hasCommanderSynergy('{T}: Add {G}. Create a Food token.', 'Land', cabbageMerchantText)
    ).toBe(false);
  });
});

describe('computeRatioHealth', () => {
  it('marks low categories as low', () => {
    const categories: Record<CardCategory, ClassifiedCard[]> = {
      land: Array(20).fill({ name: 'x' }) as ClassifiedCard[],
      ramp: [],
      draw: [],
      removal: [],
      board_wipe: [],
      protection: [],
      synergy: [],
      win_condition: [],
      utility: [],
    };
    const health = computeRatioHealth(categories, 'brawl');
    const rampHealth = health.find(h => h.category === 'ramp');
    expect(rampHealth?.status).toBe('low');
    const landHealth = health.find(h => h.category === 'land');
    expect(landHealth?.status).toBe('low');
  });

  it('marks healthy categories as ok', () => {
    const categories: Record<CardCategory, ClassifiedCard[]> = {
      land: Array(38).fill({ name: 'x' }) as ClassifiedCard[],
      ramp: Array(10).fill({ name: 'x' }) as ClassifiedCard[],
      draw: Array(10).fill({ name: 'x' }) as ClassifiedCard[],
      removal: Array(10).fill({ name: 'x' }) as ClassifiedCard[],
      board_wipe: Array(3).fill({ name: 'x' }) as ClassifiedCard[],
      protection: Array(4).fill({ name: 'x' }) as ClassifiedCard[],
      synergy: Array(8).fill({ name: 'x' }) as ClassifiedCard[],
      win_condition: Array(7).fill({ name: 'x' }) as ClassifiedCard[],
      utility: [],
    };
    const health = computeRatioHealth(categories, 'brawl');
    expect(health.every(h => h.status === 'ok')).toBe(true);
  });
});

describe('computeManaCurve', () => {
  it('groups cards by cmc bucket', () => {
    const cards = [
      { cmc: 1, typeLine: 'Creature' },
      { cmc: 1, typeLine: 'Creature' },
      { cmc: 2, typeLine: 'Instant' },
      { cmc: 3, typeLine: 'Sorcery' },
      { cmc: 8, typeLine: 'Creature' },
    ];
    const curve = computeManaCurve(cards);
    expect(curve[1]).toBe(2);
    expect(curve[2]).toBe(1);
    expect(curve[3]).toBe(1);
    expect(curve[7]).toBe(1); // 8+ grouped into 7
  });

  it('excludes lands', () => {
    const cards = [
      { cmc: 0, typeLine: 'Land' },
      { cmc: 2, typeLine: 'Creature' },
    ];
    const curve = computeManaCurve(cards);
    expect(curve[0]).toBeUndefined();
    expect(curve[2]).toBe(1);
  });
});

describe('computeOverallScore', () => {
  it('returns 100 for perfect ratios', () => {
    const health = [
      { category: 'land', label: 'Lands', current: 38, target: { min: 35, max: 40, target: 38 }, status: 'ok' as const, color: '' },
      { category: 'ramp', label: 'Ramp', current: 10, target: { min: 8, max: 12, target: 10 }, status: 'ok' as const, color: '' },
    ];
    expect(computeOverallScore(health)).toBe(100);
  });

  it('deducts points for low categories', () => {
    const health = [
      { category: 'ramp', label: 'Ramp', current: 2, target: { min: 8, max: 12, target: 10 }, status: 'low' as const, color: '' },
    ];
    expect(computeOverallScore(health)).toBeLessThan(100);
  });
});

describe('getFormatRatios', () => {
  it('returns brawl ratios for brawl', () => {
    const ratios = getFormatRatios('brawl');
    expect(ratios.deckSize).toBe(100);
    expect(ratios.targets.land.target).toBe(38);
  });

  it('returns 60-card ratios for standardbrawl', () => {
    const ratios = getFormatRatios('standardbrawl');
    expect(ratios.deckSize).toBe(60);
    expect(ratios.targets.land.target).toBe(25);
  });

  it('returns commander ratios', () => {
    const ratios = getFormatRatios('commander');
    expect(ratios.deckSize).toBe(100);
    expect(ratios.targets.land.target).toBe(37);
  });

  it('returns generic ratios for unknown formats', () => {
    const ratios = getFormatRatios('modern');
    expect(ratios.deckSize).toBe(60);
  });
});

describe('generateSuggestions', () => {
  it('suggests adding cards for low categories', () => {
    const health = [
      { category: 'ramp', label: 'Ramp', current: 3, target: { min: 8, max: 12, target: 10 }, status: 'low' as const, color: '' },
    ];
    const suggestions = generateSuggestions(health, 3.0, 'brawl');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toContain('Add 5 more ramp');
  });

  it('suggests cutting cards for high categories', () => {
    const health = [
      { category: 'removal', label: 'Removal', current: 16, target: { min: 8, max: 12, target: 10 }, status: 'high' as const, color: '' },
    ];
    const suggestions = generateSuggestions(health, 3.0, 'brawl');
    expect(suggestions[0]).toContain('cutting 4 removal');
  });

  it('warns about high average CMC', () => {
    const suggestions = generateSuggestions([], 4.5, 'brawl');
    expect(suggestions.some(s => s.includes('too high'))).toBe(true);
  });

  it('returns empty for perfect deck', () => {
    const suggestions = generateSuggestions([], 3.1, 'brawl');
    expect(suggestions.length).toBe(0);
  });
});
