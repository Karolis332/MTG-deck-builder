import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck, buildOptimalLandBase } from '../land-intelligence';

// U3 — a mono-colour build must never include a nonbasic whose only job is
// colour fixing (it is strictly worse than the basic it mimics), while real
// utility lands and neutral untapped fetches still get in.
describe('mono-colour fixing-only land exclusion', () => {
  function poolNames(colors: string[], landPayoffs?: boolean): Set<string> {
    const rows = scoreLandsForDeck({ colors, format: 'commander', landPayoffs });
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

  it('excludes weak/conditional colourless utility in mono-green (Reliquary Tower, Plaza of Harmony, Branch of Vitu-Ghazi)', () => {
    const pool = poolNames(['G']);
    expect(pool.has('Reliquary Tower')).toBe(false);
    expect(pool.has('Plaza of Harmony')).toBe(false);
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

  it('keeps untapped fetches that can find the deck colour (Misty Rainforest, Wooded Foothills, Windswept Heath, Verdant Catacombs) in mono-green with land payoffs — real thinning, not forced (B-D9)', () => {
    const pool = poolNames(['G'], true);
    expect(pool.has('Misty Rainforest')).toBe(true);
    expect(pool.has('Wooded Foothills')).toBe(true);
    expect(pool.has('Windswept Heath')).toBe(true);
    expect(pool.has('Verdant Catacombs')).toBe(true);
  });

  it('keeps an untapped fetch (Polluted Delta) in mono-blue with land payoffs — it can find the deck colour (B-D9)', () => {
    const pool = poolNames(['U'], true);
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
    // Unpriced lands (price_usd null, e.g. Soulstone Sanctuary — now a
    // legitimate oracle-text-detected manland) bypass the price cap, so
    // this stays a loose ceiling, not an exact count.
    expect(result.totalNonBasic).toBeLessThan(4);
    expect(result.basicDistribution.Forest).toBeGreaterThanOrEqual(34);
  });

  // Round 2 (2026-09-26): 55cebd0's filter over-excluded real utility and
  // under-excluded a family of tapped sac-for-basic lands.
  it('excludes tapped sacrifice-for-basic lands with no independent mana ability (Bad River, Flood Plain, Rocky Tar Pit, Mountain Valley, Grasslands) in mono', () => {
    expect(poolNames(['U']).has('Bad River')).toBe(false);
    expect(poolNames(['U']).has('Flood Plain')).toBe(false);
    expect(poolNames(['R']).has('Rocky Tar Pit')).toBe(false);
    expect(poolNames(['R']).has('Mountain Valley')).toBe(false);
    expect(poolNames(['G']).has('Grasslands')).toBe(false);
  });

  it('multicolour: the same sac-for-basic family stays eligible (Rocky Tar Pit in a B/R deck) — the fetched basic matters there', () => {
    const rows = scoreLandsForDeck({ colors: ['B', 'R'], format: 'commander' });
    expect(rows.find((r) => r.card.name === 'Rocky Tar Pit')).toBeDefined();
  });

  it('keeps manlands in mono (Mutavault, Den of the Bugbear, Inkmoth Nexus, Blinkmoth Nexus) — the creature mode is the premium payoff', () => {
    expect(poolNames(['R']).has('Mutavault')).toBe(true);
    expect(poolNames(['R']).has('Den of the Bugbear')).toBe(true);
    expect(poolNames(['R']).has('Inkmoth Nexus')).toBe(true);
    expect(poolNames(['R']).has('Blinkmoth Nexus')).toBe(true);
  });

  it('keeps manlands detected by oracle text, not a hardcoded list (Lair of the Hydra, Hall of Storm Giants, Mishra\'s Factory, Soulstone Sanctuary)', () => {
    expect(poolNames(['G']).has('Lair of the Hydra')).toBe(true);
    expect(poolNames(['U']).has('Hall of Storm Giants')).toBe(true);
    expect(poolNames(['R']).has("Mishra's Factory")).toBe(true);
    expect(poolNames(['G']).has('Soulstone Sanctuary')).toBe(true);
  });

  it('does not treat a land that animates a DIFFERENT permanent as a manland (Mech Hangar: "Target Vehicle becomes an artifact creature")', () => {
    expect(poolNames(['R']).has('Mech Hangar')).toBe(false);
  });

  it('keeps Nykthos, Shrine to Nyx in mono — devotion scales with a mono deck', () => {
    expect(poolNames(['R']).has('Nykthos, Shrine to Nyx')).toBe(true);
  });

  it('keeps Ancient Tomb in mono — unconditional {C}{C} is real fast mana', () => {
    expect(poolNames(['R']).has('Ancient Tomb')).toBe(true);
  });

  it('keeps Urza\'s Saga in mono — chapter III value isn\'t mana-dependent', () => {
    expect(poolNames(['R']).has("Urza's Saga")).toBe(true);
  });

  it('keeps Cavern of Souls in mono only when the deck runs a tribe (Goblin) — excluded with no tribe', () => {
    const rows = scoreLandsForDeck({ colors: ['R'], format: 'commander', tribalTypes: ['goblin'] });
    expect(rows.find((r) => r.card.name === 'Cavern of Souls')).toBeDefined();
    expect(poolNames(['R']).has('Cavern of Souls')).toBe(false);
  });

  // U9a finding 4 — Secluded Courtyard's "any colour" is restricted to
  // creature spells of a chosen type, same shape as Cavern of Souls, but it
  // has no uncounterable clause (or any other bonus) — just fixing. It never
  // beats a Mountain in mono-red, tribal deck or not.
  it('excludes Secluded Courtyard in mono-red even in a Goblin tribal deck — fixing only, no uncounterable clause', () => {
    const rows = scoreLandsForDeck({ colors: ['R'], format: 'commander', tribalTypes: ['goblin'] });
    expect(rows.find((r) => r.card.name === 'Secluded Courtyard')).toBeUndefined();
  });

  it('keeps tapped MDFC spell-lands in mono (Valakut Awakening // Valakut Stoneforge, Khalni Ambush // Khalni Territory, Bala Ged Recovery // Bala Ged Sanctuary) — priced as tapped-land-equivalent, not excluded twice', () => {
    expect(poolNames(['R']).has('Valakut Awakening // Valakut Stoneforge')).toBe(true);
    expect(poolNames(['G']).has('Khalni Ambush // Khalni Territory')).toBe(true);
    expect(poolNames(['G']).has('Bala Ged Recovery // Bala Ged Sanctuary')).toBe(true);
  });
});
