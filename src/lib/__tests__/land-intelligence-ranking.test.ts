import { describe, it, expect } from 'vitest';
import { scoreLandsForDeck, buildOptimalLandBase, analyzeManaDemands, colorSourceTargets, type LandScore } from '../land-intelligence';
import { countColorSources, buildManaSourceContext, type ManaSourceCard } from '../mana-sources';

// Unit L (2026-09-30) — audit B-D2 / A-D2 / A-D7 / A-D8 / B-D9. Runs on the
// repo test DB after `scripts/classify_lands.py --db data/mtg-deck-builder.db`.

const WUBG = ['W', 'U', 'B', 'G'];
const WUBRG = ['W', 'U', 'B', 'R', 'G'];

function scoreMap(opts: Parameters<typeof scoreLandsForDeck>[0]): Map<string, LandScore> {
  return new Map(scoreLandsForDeck(opts).map((r) => [r.card.name, r]));
}
function get(m: Map<string, LandScore>, name: string): LandScore {
  const r = m.get(name);
  if (!r) throw new Error(`${name} not in scored pool`);
  return r;
}

describe('untapped only when true', () => {
  const m = scoreMap({ colors: WUBG, format: 'commander' });

  it('an unconditional "enters tapped." land (Grand Coliseum) is tapped even though the classifier branch defaulted it untapped', () => {
    expect(get(m, 'Grand Coliseum').entersUntapped).toBe(false);
  });

  it('reveal-a-type lands are tapped without the tribe and untapped with it (Temple of the Dragon Queen, Murmuring Bosk)', () => {
    expect(get(m, 'Temple of the Dragon Queen').entersUntapped).toBe(false);
    expect(get(m, 'Murmuring Bosk').entersUntapped).toBe(false);
    const dragons = scoreMap({ colors: WUBG, format: 'commander', tribalTypes: ['dragon'] });
    expect(get(dragons, 'Temple of the Dragon Queen').entersUntapped).toBe(true);
  });

  it('a first-three-turns land (Starting Town) gets half credit', () => {
    expect(get(m, 'Starting Town').untappedCredit).toBe(0.5);
  });

  it('"two or more opponents" lands are untapped in Commander and tapped in a two-player format', () => {
    expect(get(m, 'Vault of Champions').entersUntapped).toBe(true);
    const legacy = scoreMap({ colors: ['W', 'B'], format: 'legacy' });
    expect(get(legacy, 'Vault of Champions').entersUntapped).toBe(false);
  });

  it('a check land whose named basic type is a deck colour stays untapped (Woodland Cemetery in B/G)', () => {
    expect(get(scoreMap({ colors: ['B', 'G'], format: 'commander' }), 'Woodland Cemetery').entersUntapped).toBe(true);
  });
});

describe('tier fixes and specific cards', () => {
  it('tapped tri-fetch / Landscape sit at tier 3, below a check land', () => {
    const m = scoreMap({ colors: ['B', 'R', 'G'], format: 'commander' });
    expect(get(m, 'Riveteers Overlook').tier).toBe(3);
    expect(get(m, 'Riveteers Overlook').score).toBeLessThan(get(m, 'Woodland Cemetery').score);
    const gur = scoreMap({ colors: ['G', 'U', 'R'], format: 'commander' });
    expect(get(gur, 'Bountiful Landscape').tier).toBe(3);
    expect(get(gur, 'Bountiful Landscape').entersUntapped).toBe(false);
  });

  it('Verge, channel and artifact lands are tier 2', () => {
    const wb = scoreMap({ colors: ['W', 'B'], format: 'commander' });
    expect(get(wb, 'Bleachbone Verge').tier).toBe(2);
    expect(get(wb, 'Bleachbone Verge').reasons).not.toContain('conditional colored mana');
    const u = scoreMap({ colors: ['U', 'R'], format: 'commander' });
    expect(get(u, 'Otawara, Soaring City').tier).toBe(2);
    expect(get(u, 'Seat of the Synod').tier).toBe(2);
  });

  it('a tapped land producing 3 deck colours in a 3+ colour deck moves to tier 3; a tapped 2-colour land stays tier 4', () => {
    const m = scoreMap({ colors: WUBG, format: 'commander' });
    expect(get(m, 'Zagoth Triome').tier).toBe(3);
    expect(get(m, 'Zagoth Triome').clearsBar).toBe(true);
    expect(get(m, 'Dismal Backwater').tier).toBe(4);
    expect(get(m, 'Dismal Backwater').clearsBar).toBe(false);
    expect(get(m, 'Tarnished Citadel').tier).toBe(4); // 3 life per activation — worse than a basic
    expect(get(m, 'Tarnished Citadel').clearsBar).toBe(false);
  });

  it('Three Tree City is colourless whenever the deck has no tribe (not only in mono)', () => {
    const m = scoreMap({ colors: WUBG, format: 'commander' });
    expect(get(m, 'Three Tree City').producesColors.filter((c) => 'WUBRG'.includes(c))).toEqual([]);
    expect(get(m, 'Three Tree City').score).toBeLessThan(get(m, 'Mana Confluence').score);
  });

  it('Reflecting Pool is a real 4-colour source (only the Gate-only wording is never-coloured)', () => {
    const pool = get(scoreMap({ colors: WUBG, format: 'commander' }), 'Reflecting Pool');
    expect(pool.producesColors.filter((c) => WUBG.includes(c)).length).toBe(4);
    expect(pool.reasons).not.toContain('conditional colored mana');
  });

  it('ranking: untapped real fixing beats conditional / literally-tapped junk in a 4-colour deck', () => {
    const m = scoreMap({ colors: WUBG, format: 'commander' });
    const good = ['Mana Confluence', 'Reflecting Pool', 'Yavimaya Coast', 'Hengegate Pathway // Mistgate Pathway', 'Vault of Champions'].map((n) => get(m, n).score);
    const junk = ['Temple of the Dragon Queen', 'Starting Town', 'Grand Coliseum', 'Murmuring Bosk', 'Three Tree City', 'Brokers Hideout', 'Tranquil Landscape'].map((n) => get(m, n).score);
    expect(Math.min(...good)).toBeGreaterThan(Math.max(...junk));
  });
});

describe('colour-deficit selection and the quality-bar cap (A-D2)', () => {
  function basic(color: string): ManaSourceCard {
    const name = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' }[color]!;
    return { name, type_line: `Basic Land — ${name}`, produced_mana: JSON.stringify([color]), oracle_text: '' };
  }
  function landSources(result: ReturnType<typeof buildOptimalLandBase>, colors: string[]): Record<string, number> {
    const cards = [
      ...result.lands.map(({ card, quantity }) => ({ card, quantity })),
      ...Object.entries(result.basicDistribution).map(([name, quantity]) => ({ card: basic('WUBRG'.split('').find((c) => basic(c).name === name)!), quantity })),
    ];
    return countColorSources(cards, buildManaSourceContext(colors, cards));
  }

  it('Karsten-style targets: CC two-drops demand more sources than a single pip on a six-drop', () => {
    const t = colorSourceTargets(analyzeManaDemands([{ mana_cost: '{U}{U}', quantity: 10 }, { mana_cost: '{5}{W}', quantity: 1 }]), 'commander');
    expect(t.U).toBeGreaterThanOrEqual(24);
    expect(t.W).toBeLessThanOrEqual(14);
    expect(t.W).toBeGreaterThan(0);
  });

  it('the second-heaviest colour gets its sources in a 5-colour deck (Tam: B starved at 19)', () => {
    const colors = WUBRG;
    const result = buildOptimalLandBase({
      colors, format: 'commander', targetLandCount: 38, isCommander: true,
      existingNonLandCards: [
        { mana_cost: '{U}{U}', quantity: 10 }, { mana_cost: '{1}{B}{B}', quantity: 8 },
        { mana_cost: '{5}{W}', quantity: 1 }, { mana_cost: '{5}{R}', quantity: 1 }, { mana_cost: '{5}{G}', quantity: 1 },
      ],
    });
    const s = landSources(result, colors);
    expect(s.B).toBeGreaterThanOrEqual(22);
    expect(s.B).toBeGreaterThan(s.W + 4); // rainbows hand W sources out for free
    expect(s.U).toBeGreaterThanOrEqual(s.B);
  });

  it('only lands that clear the quality bar are selected — junk never fills the 4-5 colour quota', () => {
    const scored = scoreLandsForDeck({ colors: WUBG, format: 'commander' });
    const byName = new Map(scored.map((s) => [s.card.name, s]));
    const result = buildOptimalLandBase({ colors: WUBG, format: 'commander', targetLandCount: 38, isCommander: true });
    expect(result.totalNonBasic).toBeGreaterThanOrEqual(30); // whatever beats a basic, not a quota
    for (const { card } of result.lands) expect(byName.get(card.name)?.clearsBar, card.name).toBe(true);
    const junk = ['Temple of the Dragon Queen', 'Starting Town', 'Grand Coliseum', 'Murmuring Bosk', 'Three Tree City', 'Brokers Hideout', 'Tranquil Landscape', 'Deceptive Landscape', 'Foreboding Landscape'];
    expect(result.lands.map((l) => l.card.name).filter((n) => junk.includes(n))).toEqual([]);
  });

  it('the nonbasic count follows the candidates that clear the bar, not a flat 30', () => {
    const scored = scoreLandsForDeck({ colors: WUBG, format: 'commander' });
    const keep = new Set(scored.filter((s) => s.clearsBar).slice(0, 12).map((s) => s.card.name));
    const excludeNames = new Set(scored.map((s) => s.card.name).filter((n) => !keep.has(n)));
    const result = buildOptimalLandBase({ colors: WUBG, format: 'commander', targetLandCount: 38, isCommander: true, excludeNames });
    expect(result.totalNonBasic).toBeLessThanOrEqual(12);
    expect(Object.values(result.basicDistribution).reduce((a, b) => a + b, 0)).toBe(38 - result.totalNonBasic);
  });
});
