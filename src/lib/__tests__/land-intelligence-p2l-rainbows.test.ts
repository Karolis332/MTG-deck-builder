// Unit P2-L (2026-09-30) — integrate-2 #2 conditional rainbows.
import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck, type LandScore } from '../land-intelligence';
import { isNeverColoredProducer, buildManaSourceContext } from '../mana-sources';

function scoreMap(opts: Parameters<typeof scoreLandsForDeck>[0]): Map<string, LandScore> {
  return new Map(scoreLandsForDeck(opts).map((r) => [r.card.name, r]));
}

describe('#2 conditional rainbows do not clear the bar', () => {
  const wubg = { colors: ['W', 'U', 'B', 'G'], format: 'commander' };
  it.each(['Glimmervoid', 'Thran Quarry', 'Rhystic Cave', 'Archaeological Dig', 'Undiscovered Paradise'])('%s is not worth a slot over a basic in 4 colours with no census', (name) => {
    const m = scoreMap(wubg);
    expect(m.has(name) && m.get(name)!.clearsBar).toBe(false);
  });
  it('Glimmervoid / Thran Quarry clear the bar once a third of the spells feed the condition', () => {
    const artifacts = scoreMap({ ...wubg, permanentCounts: { artifact: 25, creature: 5, total: 60 } });
    expect(artifacts.get('Glimmervoid')?.clearsBar).toBe(true);
    expect(artifacts.get('Thran Quarry')?.clearsBar ?? false).toBe(false);
    const creatures = scoreMap({ ...wubg, permanentCounts: { artifact: 5, creature: 30, total: 60 } });
    expect(creatures.get('Thran Quarry')?.clearsBar).toBe(true);
  });
  it('self-sacrifice-only colour and "unless any player pays" are never sources (ctx only)', () => {
    const ctx = buildManaSourceContext(['W', 'U']);
    const dig = { name: 'Archaeological Dig', type_line: 'Land', oracle_text: '{T}: Add {C}.\n{T}, Sacrifice this land: Add one mana of any color.' };
    const cave = { name: 'Rhystic Cave', type_line: 'Land', oracle_text: '{T}: Choose a color. Add one mana of that color unless any player pays {1}. Activate only as an instant.' };
    const outpost = { name: 'Abandoned Outpost', type_line: 'Land', oracle_text: 'This land enters tapped.\n{T}: Add {W}.\n{T}, Sacrifice this land: Add one mana of any color.' };
    expect(isNeverColoredProducer(dig, ctx)).toBe(true);
    expect(isNeverColoredProducer(cave, ctx)).toBe(true);
    expect(isNeverColoredProducer(outpost, ctx)).toBe(false);
    expect(isNeverColoredProducer(dig)).toBe(false); // default path pinned
  });
});
