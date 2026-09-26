import { describe, it, expect } from 'vitest';
import {
  narrowTutorTarget,
  countTargets,
  colorlessPipCount,
  isColorlessSource,
  isMonoColourDeadFixer,
} from '../card-relevance';

// Real oracle text pulled from the repo card DB 2026-09-26.
const CARDS = {
  courierOfComestibles: {
    name: 'Courier of Comestibles',
    type_line: 'Creature — Human Citizen',
    oracle_text:
      "When this creature enters, you may search your library for a Food card, reveal it, put it into your hand, then shuffle. If you don't put a card into your hand this way, create a Food token.",
    mana_cost: '{1}{G}',
  },
  radioactiveSpider: {
    name: 'Radioactive Spider',
    type_line: 'Creature — Spider',
    oracle_text:
      'Reach, deathtouch\nFateful Bite — {2}, Sacrifice this creature: Search your library for a Spider Hero card, reveal it, put it into your hand, then shuffle. Activate only as a sorcery.',
    mana_cost: '{G}',
  },
  worldlyTutor: {
    name: 'Worldly Tutor',
    type_line: 'Instant',
    oracle_text: 'Search your library for a creature card, reveal it, then shuffle and put the card on top.',
    mana_cost: '{G}',
  },
  demonicTutor: {
    name: 'Demonic Tutor',
    type_line: 'Sorcery',
    oracle_text: 'Search your library for a card, put that card into your hand, then shuffle.',
    mana_cost: '{1}{B}',
  },
  formidableSpeaker: {
    name: 'Formidable Speaker',
    type_line: 'Creature — Elf Druid',
    oracle_text:
      'When this creature enters, you may discard a card. If you do, search your library for a creature card, reveal it, put it into your hand, then shuffle.\n{1}, {T}: Untap another target permanent.',
    mana_cost: '{2}{G}',
  },
  stoneforgeMystic: {
    name: 'Stoneforge Mystic',
    type_line: 'Creature — Kor Artificer',
    oracle_text:
      'When this creature enters, you may search your library for an Equipment card, reveal it, put it into your hand, then shuffle.\n{1}{W}, {T}: You may put an Equipment card from your hand onto the battlefield.',
    mana_cost: '{1}{W}',
  },
  kozileksCommand: {
    name: "Kozilek's Command",
    type_line: 'Kindred Instant — Eldrazi',
    oracle_text:
      'Choose two —\n• Target player creates X 0/1 colorless Eldrazi Spawn creature tokens with "Sacrifice this token: Add {C}."\n• Target player scries X, then draws a card.\n• Exile target creature with mana value X or less.\n• Exile up to X target cards from graveyards.',
    mana_cost: '{X}{C}{C}',
  },
  mindStone: {
    name: 'Mind Stone',
    type_line: 'Artifact',
    oracle_text: '{T}: Add {C}.\n{1}, {T}, Sacrifice this artifact: Draw a card.',
    mana_cost: '{2}',
  },
  chromaticLantern: {
    name: 'Chromatic Lantern',
    type_line: 'Artifact',
    oracle_text: 'Lands you control have "{T}: Add one mana of any color."\n{T}: Add one mana of any color.',
    mana_cost: '{3}',
  },
  arcaneSignet: {
    name: 'Arcane Signet',
    type_line: 'Artifact',
    oracle_text: "{T}: Add one mana of any color in your commander's color identity.",
    mana_cost: '{2}',
  },
};

describe('narrowTutorTarget', () => {
  it('flags a Food tutor as narrow', () => {
    expect(narrowTutorTarget(CARDS.courierOfComestibles)).toEqual({ kind: 'subtype', value: 'Food' });
  });

  it('flags a Spider Hero tutor as narrow', () => {
    expect(narrowTutorTarget(CARDS.radioactiveSpider)).toEqual({ kind: 'subtype', value: 'Spider Hero' });
  });

  it('treats "search for a creature card" as broad', () => {
    expect(narrowTutorTarget(CARDS.worldlyTutor)).toBeNull();
    expect(narrowTutorTarget(CARDS.formidableSpeaker)).toBeNull();
  });

  it('treats "search for a card" (any card) as broad', () => {
    expect(narrowTutorTarget(CARDS.demonicTutor)).toBeNull();
  });

  it('flags an Equipment tutor as narrow', () => {
    expect(narrowTutorTarget(CARDS.stoneforgeMystic)).toEqual({ kind: 'subtype', value: 'Equipment' });
  });

  it('returns null for cards with no tutor effect', () => {
    expect(narrowTutorTarget(CARDS.mindStone)).toBeNull();
    expect(narrowTutorTarget(CARDS.chromaticLantern)).toBeNull();
  });
});

describe('countTargets', () => {
  it('counts Food-type cards and Food-token producers', () => {
    const target = { kind: 'subtype' as const, value: 'Food' };
    const pool = [
      { name: 'Cauldron Familiar', type_line: 'Creature — Cat', oracle_text: null },
      { name: 'Trail of Crumbs', type_line: 'Enchantment', oracle_text: 'create a Food token' },
      { name: 'Grizzly Bears', type_line: 'Creature — Bear', oracle_text: null },
    ];
    expect(countTargets(target, pool)).toBe(1);
  });

  it('counts zero when nothing matches', () => {
    const target = { kind: 'subtype' as const, value: 'Spider Hero' };
    const pool = [{ name: 'Grizzly Bears', type_line: 'Creature — Bear', oracle_text: null }];
    expect(countTargets(target, pool)).toBe(0);
  });

  it('counts by exact name for name targets', () => {
    const target = { kind: 'name' as const, value: 'Craterhoof Behemoth' };
    const pool = [
      { name: 'Craterhoof Behemoth', type_line: 'Creature', oracle_text: null },
      { name: 'Somewhere Else', type_line: 'Creature', oracle_text: null },
    ];
    expect(countTargets(target, pool)).toBe(1);
  });
});

describe('colorlessPipCount', () => {
  it('counts only {C} symbols, not generic mana', () => {
    expect(colorlessPipCount("{X}{C}{C}")).toBe(2);
    expect(colorlessPipCount('{2}{G}')).toBe(0);
    expect(colorlessPipCount(null)).toBe(0);
  });
});

describe('isColorlessSource', () => {
  it('recognises a plain {C} tap ability', () => {
    expect(isColorlessSource(CARDS.mindStone)).toBe(true);
  });

  it('recognises Eldrazi Spawn/Scion makers', () => {
    expect(isColorlessSource(CARDS.kozileksCommand)).toBe(true);
  });

  it('does not count a plain "any color" fixer', () => {
    expect(isColorlessSource(CARDS.chromaticLantern)).toBe(false);
    expect(isColorlessSource(CARDS.arcaneSignet)).toBe(false);
  });
});

describe('isMonoColourDeadFixer', () => {
  it('flags Chromatic Lantern in a mono-colour deck', () => {
    expect(isMonoColourDeadFixer(CARDS.chromaticLantern, ['G'])).toBe(true);
  });

  it('does not flag Chromatic Lantern in a multicolour deck', () => {
    expect(isMonoColourDeadFixer(CARDS.chromaticLantern, ['G', 'W'])).toBe(false);
  });

  it('does not flag Arcane Signet or Mind Stone even in mono', () => {
    expect(isMonoColourDeadFixer(CARDS.arcaneSignet, ['G'])).toBe(false);
    expect(isMonoColourDeadFixer(CARDS.mindStone, ['G'])).toBe(false);
  });
});
