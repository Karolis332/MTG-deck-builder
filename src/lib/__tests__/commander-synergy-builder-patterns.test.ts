// Unit C (2026-09-30, B-D3 / A-D3): builder-only trigger forms behind
// `opts.builderPatterns`. Every case pins the DEFAULT read too — Deck Score
// (deck-score.ts:99) passes no opts and must keep seeing b82d099's answer.
import { describe, it, expect } from 'vitest';
import { analyzeCommander, mergeProfiles } from '../commander-synergy';

const BUILDER = { superfriends: true, tribalPayoff: true, builderPatterns: true };

const KESS =
  'Flying\n' +
  'Once during each of your turns, you may cast an instant or sorcery spell from your graveyard. If a spell cast this way would be put into your graveyard, exile it instead.';
const YGRA =
  'Ward—Sacrifice a Food.\n' +
  'Other creatures are Food artifacts in addition to their other types and have "{2}, {T}, Sacrifice this permanent: You gain 3 life."\n' +
  'Whenever a Food is put into a graveyard from the battlefield, put two +1/+1 counters on Ygra.';
const TAM =
  'Planeswalker spells you cast cost {1} less to cast.\n' +
  '{W}{U}{B}{R}{G}, {T}: Proliferate X times, where X is the number of planeswalker types among planeswalkers you control. (To proliferate, choose any number of permanents and/or players, then give each another counter of each kind already there.)';
const JHOIRA = 'Whenever you cast a historic spell, draw a card. (Artifacts, legendaries, and Sagas are historic.)';
const JODAH = 'You may pay {W}{U}{B}{R}{G} rather than pay the mana cost for spells that you cast.';
const PLURAL_COMBAT = 'Whenever one or more creatures you control deal combat damage to a player, draw a card.';
const THRASIOS =
  "{4}: Scry 1, then reveal the top card of your library. If it's a land card, put it onto the battlefield tapped. Otherwise, draw a card.\n" +
  'Partner (You can have two commanders if both have partner.)';

describe('analyzeCommander — builderPatterns (opt-in, Unit C 2026-09-30)', () => {
  it('Kess: default = reanimator (pinned); builder = spells shell, graveyard dropped', () => {
    const def = analyzeCommander(KESS, 'Legendary Creature — Human Wizard', ['U', 'B', 'R'], '{1}{U}{B}{R}');
    expect(def?.detectedArchetype).toBe('reanimator');
    expect(def?.triggerCategories).toEqual(['graveyard']);

    const b = analyzeCommander(KESS, 'Legendary Creature — Human Wizard', ['U', 'B', 'R'], '{1}{U}{B}{R}', BUILDER);
    expect(b?.triggerCategories).toContain('alt_zone_cast');
    expect(b?.triggerCategories).not.toContain('graveyard');
    expect(b?.detectedArchetype).toBe('spellslinger');
    expect(b?.synergyMinimums).not.toHaveProperty('graveyard');
  });

  it('alt_zone_cast wins over graveyard in inferArchetype (builder only)', () => {
    // Both categories present: a graveyard clause the cast-from-graveyard strip
    // does not touch, plus the Kess clause.
    const text = KESS + '\nWhenever a creature card is put into your graveyard from anywhere, scry 1.';
    const def = analyzeCommander(text, 'Legendary Creature — Human Wizard', ['U', 'B', 'R'], undefined, { superfriends: true, tribalPayoff: true });
    expect(def?.detectedArchetype).toBe('reanimator');
    const b = analyzeCommander(text, 'Legendary Creature — Human Wizard', ['U', 'B', 'R'], undefined, BUILDER);
    expect(b?.triggerCategories).toEqual(expect.arrayContaining(['alt_zone_cast', 'graveyard']));
    expect(b?.detectedArchetype).toBe('spellslinger');
  });

  it('cast-from-graveyard form is instants/sorceries only (Chainer stays a graveyard read)', () => {
    const chainer = 'Discard a card: You may cast a creature spell from your graveyard this turn. Activate only once each turn.';
    const b = analyzeCommander(chainer, 'Legendary Creature — Human Minion', ['B', 'R'], undefined, BUILDER);
    expect(b?.triggerCategories).not.toContain('alt_zone_cast');
    expect(b?.triggerCategories).toContain('graveyard');
  });

  it('Ygra: default = null (pinned); builder = creature_dies → aristocrats', () => {
    expect(analyzeCommander(YGRA, 'Legendary Creature — Elemental Cat', ['B', 'G'], '{3}{B}{G}')).toBeNull();
    const b = analyzeCommander(YGRA, 'Legendary Creature — Elemental Cat', ['B', 'G'], '{3}{B}{G}', BUILDER);
    expect(b?.triggerCategories).toContain('creature_dies');
    expect(b?.detectedArchetype).toBe('aristocrats');
  });

  it('plural "deal combat damage" is an attack trigger (builder only)', () => {
    const def = analyzeCommander(PLURAL_COMBAT, 'Legendary Creature — Elf Rogue', ['G', 'U'], '{1}{G}{U}');
    expect(def?.triggerCategories ?? []).not.toContain('attack_trigger');
    const b = analyzeCommander(PLURAL_COMBAT, 'Legendary Creature — Elf Rogue', ['G', 'U'], '{1}{G}{U}', BUILDER);
    expect(b?.triggerCategories).toContain('attack_trigger');
  });

  it('Tam: activation cost {W}{U}{B}{R}{G},{T} is not five_colors (builder); default keeps it (pinned)', () => {
    const def = analyzeCommander(TAM, 'Legendary Creature — Gorgon Wizard', ['G', 'U'], '{1}{G}{U}', { superfriends: true, tribalPayoff: true });
    expect(def?.triggerCategories).toContain('five_colors');
    const b = analyzeCommander(TAM, 'Legendary Creature — Gorgon Wizard', ['G', 'U'], '{1}{G}{U}', BUILDER);
    expect(b?.triggerCategories).not.toContain('five_colors');
    expect(b?.synergyMinimums).not.toHaveProperty('five_colors');
    expect(b?.triggerCategories).toContain('planeswalker');
    expect(b?.detectedArchetype).toBe('superfriends');
  });

  it('Jodah: WUBRG outside an activation cost still reads five_colors (builder)', () => {
    const b = analyzeCommander(JODAH, 'Legendary Creature — Human Wizard', ['W', 'U', 'B', 'R', 'G'], '{1}{U}{R}{W}', BUILDER);
    expect(b?.triggerCategories).toContain('five_colors');
  });

  it('Jhoira: historic → artifact_synergy, not spell_cast (builder); default = spellslinger (pinned)', () => {
    const def = analyzeCommander(JHOIRA, 'Legendary Creature — Human Artificer', ['U', 'R'], '{2}{U}{R}');
    expect(def?.detectedArchetype).toBe('spellslinger');
    const b = analyzeCommander(JHOIRA, 'Legendary Creature — Human Artificer', ['U', 'R'], '{2}{U}{R}', BUILDER);
    expect(b?.triggerCategories).toContain('artifact_synergy');
    expect(b?.triggerCategories).not.toContain('spell_cast');
    expect(b?.detectedArchetype).not.toBe('spellslinger');
    expect(b?.drawReduction).toBe(3);
  });

  it('a real instant/sorcery cast trigger next to "historic" keeps spell_cast', () => {
    const text = JHOIRA + '\nWhenever you cast an instant or sorcery spell, scry 1.';
    const b = analyzeCommander(text, 'Legendary Creature — Human Artificer', ['U', 'R'], '{2}{U}{R}', BUILDER);
    expect(b?.triggerCategories).toEqual(expect.arrayContaining(['artifact_synergy', 'spell_cast']));
  });

  it('mergeProfiles honours builderPatterns for the merged archetype', () => {
    const kess = analyzeCommander(KESS + '\nWhenever a creature card is put into your graveyard from anywhere, scry 1.', 'Legendary Creature — Human Wizard', ['U', 'B', 'R'], undefined, BUILDER)!;
    const thrasios = analyzeCommander(THRASIOS, 'Legendary Creature — Merfolk Wizard', ['G', 'U'], '{G}{U}', BUILDER);
    expect(thrasios).toBeNull();
    const other = analyzeCommander('Whenever a creature you control dies, draw a card.', 'Legendary Creature — Human', ['B'], undefined, BUILDER)!;
    expect(mergeProfiles(kess, other).detectedArchetype).toBe('aristocrats');
    const merged = mergeProfiles(kess, { ...other, triggerCategories: ['graveyard'] } as typeof other, { builderPatterns: true });
    expect(merged.detectedArchetype).toBe('spellslinger');
    expect(mergeProfiles(kess, { ...other, triggerCategories: ['graveyard'] } as typeof other).detectedArchetype).toBe('reanimator');
  });
});
