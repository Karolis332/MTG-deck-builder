// Unit L (2026-09-30) — audit B-D9: typed fetches in mono only with land payoffs.
import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck, type LandScore } from '../land-intelligence';

function scoreMap(opts: Parameters<typeof scoreLandsForDeck>[0]): Map<string, LandScore> {
  return new Map(scoreLandsForDeck(opts).map((r) => [r.card.name, r]));
}
function get(m: Map<string, LandScore>, name: string): LandScore {
  const r = m.get(name);
  if (!r) throw new Error(`${name} not in scored pool`);
  return r;
}
describe('mono-colour typed fetches (B-D9)', () => {
  it('typed fetches leave a mono deck unless land payoffs are present', () => {
    expect(scoreMap({ colors: ['R'], format: 'commander' }).has('Wooded Foothills')).toBe(false);
    expect(scoreMap({ colors: ['R'], format: 'commander', landPayoffs: true }).has('Wooded Foothills')).toBe(true);
  });
});
