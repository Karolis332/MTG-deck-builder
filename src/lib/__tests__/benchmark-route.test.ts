import { describe, it, expect } from 'vitest';
import { assembleBenchmark, type BenchmarkDeckRow, type BenchmarkRefDeck } from '../deck-benchmark-live';

const cmdr = (name: string): BenchmarkDeckRow => ({
  name, type_line: 'Legendary Creature — Goblin', cmc: 2, oracle_text: '', game_changer: 0, board: 'commander',
});
const land = (name: string): BenchmarkDeckRow => ({ name, type_line: 'Land', cmc: 0, oracle_text: '', game_changer: 0, board: 'main' });
const ramp = (name: string, cmc = 2): BenchmarkDeckRow => ({
  name, type_line: 'Artifact', cmc, oracle_text: 'Add one mana of any color.', game_changer: 0, board: 'main',
});
const vanilla = (name: string, cmc = 4): BenchmarkDeckRow => ({
  name, type_line: 'Creature — Bear', cmc, oracle_text: '', game_changer: 0, board: 'main',
});

function refDeck(id: string, likes: number, cards: BenchmarkDeckRow[]): BenchmarkRefDeck {
  return {
    id,
    source: 'moxfield',
    url: null,
    deckName: null,
    author: null,
    likes,
    cards: cards.filter((c) => c.board !== 'commander'),
    allNames: cards.map((c) => c.name),
    commanderNames: cards.filter((c) => c.board === 'commander').map((c) => c.name),
  };
}

describe('assembleBenchmark', () => {
  const deckRows: BenchmarkDeckRow[] = [
    cmdr('Krenko, Mob Boss'),
    land('Forest'),
    land('Mountain'),
    ramp('Sol Ring', 1),
    vanilla('Nobody Plays Me'),
  ];

  const refs: BenchmarkRefDeck[] = [
    refDeck('r1', 10, [cmdr('Krenko, Mob Boss'), land('Forest'), ramp('Sol Ring', 1), ramp('Arcane Signet', 2), vanilla('Filler A')]),
    refDeck('r2', 5, [cmdr('Krenko, Mob Boss'), land('Forest'), ramp('Sol Ring', 1), vanilla('Filler B')]),
    refDeck('r3', 1, [cmdr('Krenko, Mob Boss'), land('Mountain'), ramp('Sol Ring', 1), ramp('Arcane Signet', 2)]),
  ];

  it('falls back to all refs when fewer than 5 match the target bracket', () => {
    const result = assembleBenchmark(deckRows, refs, 3);
    expect(result.bracketFilterApplied).toBe(false);
    expect(result.refCount).toBe(3);
  });

  it('computes overlap against the reference set: commander + Sol Ring shared by all, Nobody Plays Me by none', () => {
    const result = assembleBenchmark(deckRows, refs, 3);
    // build names (commander + main, lands excluded): Krenko, Sol Ring, Nobody Plays Me (3 cards)
    // each ref shares Krenko + Sol Ring => 2/3 = 66.67% per ref
    expect(result.overlapMeanPct).toBeCloseTo(200 / 3, 5);
    expect(result.overlapBestPct).toBeCloseTo(200 / 3, 5);
  });

  it('flags Arcane Signet as a missing staple (2/3 refs = 67%)', () => {
    const result = assembleBenchmark(deckRows, refs, 3);
    const names = result.staplesMissing.map((s) => s.name);
    expect(names).toContain('Arcane Signet');
  });

  it('reports oddCards for build-only cards absent from every ref', () => {
    const result = assembleBenchmark(deckRows, refs, 3);
    expect(result.oddCards).toContain('Nobody Plays Me');
  });

  it('does not report a basic land present in every ref as a missing staple', () => {
    const result = assembleBenchmark(deckRows, refs, 3);
    const names = result.staplesMissing.map((s) => s.name);
    expect(names).not.toContain('Mountain');
    expect(names).not.toContain('Forest');
  });

  it('produces a quality index between 0 and 100', () => {
    const result = assembleBenchmark(deckRows, refs, 3);
    expect(result.qualityIndex).toBeGreaterThanOrEqual(0);
    expect(result.qualityIndex).toBeLessThanOrEqual(100);
  });
});
