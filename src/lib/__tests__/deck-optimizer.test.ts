import { describe, it, expect } from 'vitest';
import {
  findLegalityIssues,
  rankCuts,
  pairSwaps,
  scoreDeck,
  isLegalInFormat,
  type OptimizerCard,
  type OptimizerContext,
} from '../deck-optimizer';
import type { RatioHealth } from '../card-classifier';

function card(overrides: Partial<OptimizerCard> & { name: string }): OptimizerCard {
  return {
    quantity: 1,
    board: 'main',
    cmc: 3,
    typeLine: 'Creature — Goblin',
    colorIdentity: ['R'],
    legalities: JSON.stringify({ commander: 'legal', standard: 'legal' }),
    oracleText: '',
    categories: ['utility'],
    primary: 'utility',
    ...overrides,
  };
}

function health(category: string, current: number, max: number, status: 'low' | 'ok' | 'high'): RatioHealth {
  return { category, label: category, current, target: { min: 0, max, target: max }, status, color: '' };
}

describe('findLegalityIssues', () => {
  it('flags not-legal, off-colour and over-limit cards', () => {
    const cards = [
      card({ name: 'Banned One', legalities: JSON.stringify({ commander: 'banned' }) }),
      card({ name: 'Blue Card', colorIdentity: ['U'] }),
      card({ name: 'Twice', quantity: 2 }),
      card({ name: 'Mountain', typeLine: 'Basic Land — Mountain', quantity: 30, colorIdentity: [] }),
      card({ name: 'Persistent Petitioners', quantity: 12, oracleText: 'A deck can have any number of cards named Persistent Petitioners.' }),
    ];
    const ctx: OptimizerContext = { format: 'commander', commanderColors: ['R'], health: [] };
    const issues = findLegalityIssues(cards, ctx);
    expect(issues.map((i) => `${i.name}:${i.problem}`)).toEqual([
      'Banned One:not_legal',
      'Blue Card:off_color',
      'Twice:too_many_copies',
    ]);
  });

  it('allows four copies in 60-card formats and maps competitivebrawl to the brawl key', () => {
    const cards = [card({ name: 'Playset', quantity: 4, legalities: JSON.stringify({ standard: 'legal' }) })];
    expect(findLegalityIssues(cards, { format: 'standard', health: [] })).toEqual([]);
    expect(isLegalInFormat(JSON.stringify({ brawl: 'legal' }), 'competitivebrawl')).toBe(true);
  });
});

describe('rankCuts', () => {
  it('puts the illegal card first, then the zero-synergy utility card and the over-quota removal', () => {
    const cards = [
      card({ name: 'Solid Synergy', primary: 'synergy', categories: ['synergy'] }),
      card({ name: 'Illegal Thing', legalities: JSON.stringify({ commander: 'banned' }) }),
      card({ name: 'Spare Removal', primary: 'removal', categories: ['removal'] }),
      card({ name: 'Dead Weight' }),
      card({ name: 'Arcane Signet', primary: 'ramp', categories: ['ramp'], cmc: 2 }),
      card({ name: 'Island', typeLine: 'Basic Land — Island', colorIdentity: [] }),
    ];
    const ctx: OptimizerContext = {
      format: 'commander',
      commanderColors: ['R', 'U'],
      cardISS: new Map([
        ['Solid Synergy', 12], ['Illegal Thing', 4], ['Spare Removal', 0], ['Dead Weight', 0], ['Arcane Signet', 0],
      ]),
      health: [health('removal', 14, 12, 'high')],
    };
    const cuts = rankCuts(cards, ctx);
    expect(cuts.map((c) => c.name)).toEqual(['Illegal Thing', 'Dead Weight', 'Spare Removal']);
    expect(cuts[0].hard).toBe(true);
    expect(cuts[1].reasons.join(' ')).toMatch(/No synergy edges/);
    expect(cuts[2].reasons.join(' ')).toMatch(/over quota/);
    // ramp with zero synergy is not a cut: function cards are judged on quota only
    expect(cuts.some((c) => c.name === 'Arcane Signet')).toBe(false);
  });

  it('never cuts lands and respects the limit', () => {
    const cards = Array.from({ length: 12 }, (_, i) =>
      card({ name: `Filler ${i}`, primary: 'utility', cmc: 5 + (i % 3) }),
    ).concat([card({ name: 'Swamp', typeLine: 'Basic Land — Swamp', colorIdentity: [] })]);
    const ctx: OptimizerContext = {
      format: 'commander',
      cardISS: new Map(cards.map((c) => [c.name, 0])),
      health: [],
    };
    const cuts = rankCuts(cards, ctx, 5);
    expect(cuts).toHaveLength(5);
    expect(cuts.every((c) => c.name !== 'Swamp')).toBe(true);
    // ties broken by higher CMC first
    expect(cuts[0].cmc).toBeGreaterThanOrEqual(cuts[4].cmc);
  });

  it('60-card: meta absence and curve glut are weak signals; protected cards survive', () => {
    const cards = [
      card({ name: 'Meta Staple', cmc: 2 }),
      card({ name: 'Random Rare', cmc: 2 }),
      card({ name: 'Key Payoff', cmc: 2 }),
    ];
    const ctx: OptimizerContext = {
      format: 'standard',
      metaRanks: new Map([['meta staple', 1]]),
      curvePerBucket: { '2': 3 },
      health: [],
      protectedNames: ['Key Payoff'],
    };
    const cuts = rankCuts(cards, ctx);
    expect(cuts.map((c) => c.name)).toEqual(['Random Rare']);
    expect(cuts[0].quantity).toBe(1);
  });
});

describe('pairSwaps', () => {
  it('pairs by category first, falls back to any non-land add, never reuses an add', () => {
    const cuts = rankCuts(
      [
        card({ name: 'Weak Removal', primary: 'removal', categories: ['removal'] }),
        card({ name: 'Weak Draw', primary: 'draw', categories: ['draw'] }),
      ],
      { format: 'commander', health: [health('removal', 13, 12, 'high'), health('draw', 13, 12, 'high')] },
    );
    const swaps = pairSwaps(cuts, [
      { name: 'Better Draw', category: 'draw' },
      { name: 'Some Land', category: 'land' },
      { name: 'Any Spell', category: 'utility' },
    ]);
    expect(swaps).toEqual([
      { cut: 'Weak Draw', add: 'Better Draw', reason: expect.any(String) },
      { cut: 'Weak Removal', add: 'Any Spell', reason: expect.any(String) },
    ]);
  });
});

describe('scoreDeck', () => {
  it('subtracts 10 per legality issue (max 30) and 5 for a land miss of 3+', () => {
    const issue = { name: 'x', problem: 'not_legal' as const, detail: '' };
    expect(scoreDeck(90, [], 0)).toBe(90);
    expect(scoreDeck(90, [issue], 3)).toBe(75);
    expect(scoreDeck(90, [issue, issue, issue, issue], 0)).toBe(60);
  });
});
