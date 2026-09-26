import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck, buildOptimalLandBase } from '../land-intelligence';

// U3 — a mono-colour build must never include a nonbasic whose only job is
// colour fixing (it is strictly worse than the basic it mimics), while real
// utility lands and neutral untapped fetches still get in.
describe('mono-colour fixing-only land exclusion', () => {
  function poolNames(colors: string[]): Set<string> {
    const rows = scoreLandsForDeck({ colors, format: 'commander' });
    return new Set(rows.map((r) => r.card.name));
  }

  it('excludes chosen-basic-type lands (Thran Portal, Multiversal Passage) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Thran Portal')).toBe(false);
    expect(pool.has('Multiversal Passage')).toBe(false);
  });

  it('excludes an unsatisfiable conditional dual (Kishla Village names Island/Swamp) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Kishla Village')).toBe(false);
  });

  it('excludes a pain land charging life for the deck\'s own colour (Hashep Oasis) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Hashep Oasis')).toBe(false);
  });

  it('excludes tapped sacrifice-search-a-basic gate lands (Cabaretti Courtyard, Brokers Hideout) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Cabaretti Courtyard')).toBe(false);
    expect(pool.has('Brokers Hideout')).toBe(false);
  });

  it('excludes any-colour lands (Command Tower) in mono-green — no upside over a basic', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Command Tower')).toBe(false);
  });

  it('keeps utility lands that tap for the deck colour and do something (Ba Sing Se) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Ba Sing Se')).toBe(true);
  });

  it('keeps a satisfiable conditional dual with utility (Castle Garenbrig names Forest) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Castle Garenbrig')).toBe(true);
  });

  it('keeps manlands / colourless utility lands (Rogue\'s Passage) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has("Rogue's Passage")).toBe(true);
  });

  it('multicolour: a sac-search-basic gate land (Cabaretti Courtyard, R/G) counts both R and G, is not excluded', () => {
    const rows = scoreLandsForDeck({ colors: ['R', 'G'], format: 'commander' });
    const courtyard = rows.find((r) => r.card.name === 'Cabaretti Courtyard');
    expect(courtyard).toBeDefined();
    expect(courtyard!.producesColors.filter((c) => ['R', 'G'].includes(c)).sort()).toEqual(['G', 'R']);
  });

  it('excludes a "choose a color" fixer (Temple of the Dragon Queen) in mono-green — not tied to a basic type', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Temple of the Dragon Queen')).toBe(false);
  });

  it('excludes weak/conditional colourless utility in mono-green (Reliquary Tower, Plaza of Harmony, Soulstone Sanctuary, Branch of Vitu-Ghazi)', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Reliquary Tower')).toBe(false);
    expect(pool.has('Plaza of Harmony')).toBe(false);
    expect(pool.has('Soulstone Sanctuary')).toBe(false);
    expect(pool.has('Branch of Vitu-Ghazi')).toBe(false);
  });

  it('keeps premium colourless utility (Rogue\'s Passage — hard unblockable) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has("Rogue's Passage")).toBe(true);
  });

  it('excludes tapped basic-fetchers (Evolving Wilds, Terramorphic Expanse, Fabled Passage, Escape Tunnel) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Evolving Wilds')).toBe(false);
    expect(pool.has('Terramorphic Expanse')).toBe(false);
    expect(pool.has('Fabled Passage')).toBe(false);
    expect(pool.has('Escape Tunnel')).toBe(false);
  });

  it('keeps untapped fetches that can find the deck colour (Misty Rainforest, Wooded Foothills, Windswept Heath, Verdant Catacombs) in mono-green — real thinning, not forced', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Misty Rainforest')).toBe(true);
    expect(pool.has('Wooded Foothills')).toBe(true);
    expect(pool.has('Windswept Heath')).toBe(true);
    expect(pool.has('Verdant Catacombs')).toBe(true);
  });

  it('keeps an untapped fetch (Polluted Delta) in mono-blue — it can find the deck colour', () => {
    const pool = poolNames(['U']);
    expect(pool.has('Polluted Delta')).toBe(true);
  });

  it('Three Tree City: excluded in mono-blue with no tribe (Talrand — a chosen-colour-per-tribal-count land is not general fixing)', () => {
    const rows = scoreLandsForDeck({ colors: ['U'], format: 'commander' });
    expect(rows.find((r) => r.card.name === 'Three Tree City')).toBeUndefined();
  });

  it('Three Tree City: kept in mono-red for a tribal commander (Krenko/goblin) via the tribal exemption', () => {
    const rows = scoreLandsForDeck({ colors: ['R'], format: 'commander', tribalTypes: ['goblin'] });
    expect(rows.find((r) => r.card.name === 'Three Tree City')).toBeDefined();
  });

  it('excludes restricted-spend colour production (Interplanar Beacon: only to cast planeswalker spells) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Interplanar Beacon')).toBe(false);
  });

  it('excludes an unconditionally-tapped land with no premium ability (Evendo, Waking Haven) in mono-green', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Evendo, Waking Haven')).toBe(false);
  });

  it('mono-colour: no flat floor — an artificially price-starved pool (no real utility survives) fills basics, not filler nonbasics', () => {
    const result = buildOptimalLandBase({
      colors: ['G'],
      format: 'commander',
      targetLandCount: 37,
      isCommander: true,
      maxCardPrice: 0.001, // below every real nonbasic land's price — starves the pool
    });
    expect(result.totalNonBasic).toBeLessThan(3);
    expect(result.basicDistribution.Forest).toBeGreaterThanOrEqual(34);
  });
});
