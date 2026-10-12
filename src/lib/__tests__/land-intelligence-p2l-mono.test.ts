// Unit P2-L (2026-09-30) — integrate-2 #9 mono colourless / pain lands.
import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck, buildOptimalLandBase, type LandScore } from '../land-intelligence';

function scoreMap(opts: Parameters<typeof scoreLandsForDeck>[0]): Map<string, LandScore> {
  return new Map(scoreLandsForDeck(opts).map((r) => [r.card.name, r]));
}

describe('#9 mono decks: at most two colourless lands, no pain for the deck colour', () => {
  it('a Krenko-shaped mono-R base seats ≤ 2 lands that do not make R', () => {
    const r = buildOptimalLandBase({
      colors: ['R'], format: 'brawl', targetLandCount: 35, isCommander: true, tribalTypes: ['goblin'],
      existingNonLandCards: [{ mana_cost: '{2}{R}{R}', quantity: 1 }, { mana_cost: '{1}{R}', quantity: 40 }],
    });
    const colourless = r.lands.filter(({ card }) => {
      const produced: string[] = JSON.parse(card.produced_mana || '[]');
      return !produced.includes('R') && !/search your library/i.test(card.oracle_text || '');
    });
    expect(colourless.map((l) => l.card.name).length).toBeLessThanOrEqual(2);
  });
  it('"deals 1 damage to you" pain lands for the deck colour (Barbarian Ring, Fogwell\'s Gym) leave mono-R', () => {
    const m = scoreMap({ colors: ['R'], format: 'commander' });
    expect(m.has('Barbarian Ring')).toBe(false);
    expect(m.has("Fogwell's Gym")).toBe(false);
  });
});
