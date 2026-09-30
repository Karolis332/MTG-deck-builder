// Unit L (2026-09-30) — audit A-D8: mono-colour colourless lands capped by pip intensity; premium regex ignores own-permanent exile.
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
describe('mono-colour colourless cap (A-D8)', () => {
  it('at most 2 colourless lands when a nonland card has 3 pips of the colour', () => {
    const result = buildOptimalLandBase({
      colors: ['G'], format: 'commander', targetLandCount: 37, isCommander: true, tribalTypes: ['ooze'],
      existingNonLandCards: [{ mana_cost: '{2}{G}{G}{G}', quantity: 1 }, { mana_cost: '{1}{G}', quantity: 30 }],
    });
    const colourless = result.lands.filter(({ card }) => {
      const produced: string[] = JSON.parse(card.produced_mana || '[]');
      return !produced.includes('G') && !/search your library/i.test(card.oracle_text || ''); // a Forest fetch is a G source
    });
    expect(colourless.length).toBeLessThanOrEqual(2);
  });

  it('Northampton Farm ("exile target creature you own") is not premium removal in mono', () => {
    expect(scoreMap({ colors: ['G'], format: 'commander' }).has('Northampton Farm')).toBe(false);
  });
});
