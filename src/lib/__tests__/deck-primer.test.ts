import { describe, it, expect } from 'vitest';
import { parsePrimer, primerCardNames } from '../deck-primer';

const base = {
  version: 1,
  deck: { name: 'Test', commanders: ['Gilanra, Caller of Wirewood'], colours: 'RG', format: 'commander', list: 'decks/paper/decks/x.txt', status: 'proposed' },
  summary: 'Ramp into [[Apex Devastator]].',
  phases: [
    { turns: 'T1–3', goal: 'Ramp', cards: ['Nature\'s Lore'] },
    { turns: 'T4–6', goal: 'Fatties', cards: [] },
  ],
  engine: [{ title: 'Draw', flow: ['[[Gilanra, Caller of Wirewood]] mana', 'MV 6+ spell', 'draw'] }],
  winConditions: [{ name: 'Stomp', pieces: ['Apex Devastator'], flow: ['cast', 'cascade ×4'], damage: '40 to one' }],
  swaps: [{ out: 'Rorix Bladewing', in: 'Farseek', role: 'ramp', reason: 'vanilla 6/5 → T2 ramp' }],
  mulligan: { keep: ['3–5 lands'], mulligan: ['0–1 lands'] },
};

describe('deck primer schema', () => {
  it('accepts a minimal primer and fills defaults', () => {
    const p = parsePrimer(base);
    expect(p.swaps[0].verdict).toBe('recommended');
    expect(p.keepers).toEqual([]);
  });

  it('rejects a primer without a win condition', () => {
    expect(() => parsePrimer({ ...base, winConditions: [] })).toThrow();
  });

  it('rejects a one-step flow (not a diagram)', () => {
    expect(() => parsePrimer({ ...base, engine: [{ title: 'x', flow: ['only'] }] })).toThrow();
  });

  it('collects every referenced card, including [[chips]] in text', () => {
    const names = primerCardNames(parsePrimer(base));
    expect(names).toEqual(expect.arrayContaining(['Gilanra, Caller of Wirewood', 'Apex Devastator', 'Rorix Bladewing', 'Farseek', "Nature's Lore"]));
  });
});
