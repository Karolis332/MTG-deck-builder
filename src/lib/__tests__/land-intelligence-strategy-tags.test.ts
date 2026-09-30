// Unit L (2026-09-30) — audit A-D7: the land scorer reads synergy_tags per strategy.
import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck, buildOptimalLandBase, type LandScore } from '../land-intelligence';

function scoreMap(opts: Parameters<typeof scoreLandsForDeck>[0]): Map<string, LandScore> {
  return new Map(scoreLandsForDeck(opts).map((r) => [r.card.name, r]));
}
function get(m: Map<string, LandScore>, name: string): LandScore {
  const r = m.get(name);
  if (!r) throw new Error(`${name} not in scored pool`);
  return r;
}
const WUBRG = ['W', 'U', 'B', 'R', 'G'];

describe('strategy → synergy_tags bonus (A-D7)', () => {
  it('aristocrats credits sacrifice outlets (High Market)', () => {
    const plain = get(scoreMap({ colors: ['B', 'G'], format: 'commander' }), 'High Market').score;
    const aristo = get(scoreMap({ colors: ['B', 'G'], format: 'commander', strategy: 'aristocrats' }), 'High Market');
    expect(aristo.score).toBeGreaterThan(plain);
    expect(aristo.reasons.some((r) => r.startsWith('strategy'))).toBe(true);
  });

  it('superfriends credits proliferate (Karn\'s Bastion) and walker-restricted mana at full value (Interplanar Beacon)', () => {
    const plain = scoreMap({ colors: WUBRG, format: 'commander' });
    const sf = scoreMap({ colors: WUBRG, format: 'commander', strategy: 'superfriends' });
    expect(get(sf, "Karn's Bastion").score).toBeGreaterThan(get(plain, "Karn's Bastion").score);
    expect(get(sf, 'Interplanar Beacon').score).toBeGreaterThan(get(plain, 'Interplanar Beacon').score);
    expect(get(sf, 'Interplanar Beacon').reasons).not.toContain('restricted producer');
  });

  it('artifacts credits artifact lands and artifact tutors (Seat of the Synod, Inventors\' Fair)', () => {
    const plain = scoreMap({ colors: ['U', 'R'], format: 'commander' });
    const art = scoreMap({ colors: ['U', 'R'], format: 'commander', strategy: 'artifacts' });
    expect(get(art, 'Seat of the Synod').score).toBeGreaterThan(get(plain, 'Seat of the Synod').score);
    expect(get(art, "Inventors' Fair").score).toBeGreaterThan(get(plain, "Inventors' Fair").score);
  });
});
