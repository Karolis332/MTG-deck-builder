import { describe, it, expect } from 'vitest';
import {
  tagCard,
  pairEdge,
  cmdEdge,
  commanderResourceProfile,
  computeSynergyGraph,
  explainEdges,
  ISS_BASE,
  ISS_LAMBDA,
  ISS_NORMALIZE_CEILING,
  type CardLike,
} from '../synergy-graph';

// Real oracle text pulled from the live DB (2026-08-24) — same discipline as
// the C2 regression tests: verify against what Scryfall actually prints,
// not a remembered/guessed wording.
const KRENKO: CardLike = {
  name: 'Krenko, Mob Boss',
  oracleText: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.',
  typeLine: 'Legendary Creature — Goblin Warrior',
};

const SKULLCLAMP: CardLike = {
  name: 'Skullclamp',
  oracleText: 'Equipped creature gets +1/-1.\nWhenever equipped creature dies, draw two cards.\nEquip {1}',
  typeLine: 'Artifact — Equipment',
};

const MEREN: CardLike = {
  name: 'Meren of Clan Nel Toth',
  oracleText: "Whenever another creature you control dies, you get an experience counter.\nAt the beginning of your end step, choose target creature card in your graveyard. If that card's mana value is less than or equal to the number of experience counters you have, return it to the battlefield. Otherwise, put it into your hand.",
  typeLine: 'Legendary Creature — Human Shaman',
};

const BLOOD_ARTIST: CardLike = {
  name: 'Blood Artist',
  oracleText: 'Whenever this creature or another creature dies, target player loses 1 life and you gain 1 life.',
  typeLine: 'Creature — Vampire',
};

const VISCERA_SEER: CardLike = {
  name: 'Viscera Seer',
  oracleText: 'Sacrifice a creature: Scry 1. (Look at the top card of your library. You may put that card on the bottom.)',
  typeLine: 'Creature — Vampire Wizard',
};

describe('tagCard — real oracle text', () => {
  it('Krenko, Mob Boss produces tokens', () => {
    const tags = tagCard(KRENKO);
    expect(tags.produces.has('tokens')).toBe(true);
  });

  it('Skullclamp consumes tokens (name-override — its own text never says "token")', () => {
    expect(SKULLCLAMP.oracleText).not.toMatch(/token/i);
    const tags = tagCard(SKULLCLAMP);
    expect(tags.consumes.has('tokens')).toBe(true);
  });

  it('Meren of Clan Nel Toth consumes creature_death and graveyard_fill', () => {
    const tags = tagCard(MEREN);
    expect(tags.consumes.has('creature_death')).toBe(true);
    expect(tags.consumes.has('graveyard_fill')).toBe(true);
  });

  it('Blood Artist consumes creature_death (aristocrats drain payoff)', () => {
    const tags = tagCard(BLOOD_ARTIST);
    expect(tags.consumes.has('creature_death')).toBe(true);
  });

  it('Viscera Seer produces creature_death (sac outlet)', () => {
    const tags = tagCard(VISCERA_SEER);
    expect(tags.produces.has('creature_death')).toBe(true);
  });

  it('lands are never tagged (no produces/consumes)', () => {
    const tags = tagCard({ name: 'Command Tower', oracleText: "{T}: Add one mana of any color in your commander's color identity.", typeLine: 'Land' });
    expect(tags.produces.size).toBe(0);
    expect(tags.consumes.size).toBe(0);
  });

  // Regression (found via the Krenko-vs-Tazri ISS spot check, 2026-08-24): a
  // bare /where x is/i pattern in mana_ramp's consume list matched ANY
  // ability defining a variable X for ANY purpose — not just mana/X-spell
  // payoffs — which falsely tagged both Krenko ("X is the number of Goblins
  // you control") and Tazri ("X is the number of colors...") as mana_ramp
  // consumers, crediting every mana rock in their decks with a commander
  // edge on VOLUME rather than genuine synergy.
  it('Krenko does NOT consume mana_ramp (its "X" is a Goblin count, not a mana payoff)', () => {
    const tags = tagCard(KRENKO);
    expect(tags.consumes.has('mana_ramp')).toBe(false);
  });

  it('a defined-X-for-a-non-mana-purpose ability does not falsely consume mana_ramp', () => {
    const tazriLike: CardLike = {
      name: 'General Tazri',
      oracleText: 'When General Tazri enters, you may search your library for an Ally creature card, reveal it, put it into your hand, then shuffle.\n{W}{U}{B}{R}{G}: Ally creatures you control get +X/+X until end of turn, where X is the number of colors among those creatures.',
      typeLine: 'Legendary Creature — Human Ally',
    };
    const tags = tagCard(tazriLike);
    expect(tags.consumes.has('mana_ramp')).toBe(false);
  });

  it('a genuine X-spell payoff still consumes mana_ramp', () => {
    const xSpellCard: CardLike = {
      name: 'X Spells Matter',
      oracleText: 'Whenever you cast a spell with {X} in its mana cost, copy that spell.',
      typeLine: 'Enchantment',
    };
    const tags = tagCard(xSpellCard);
    expect(tags.consumes.has('mana_ramp')).toBe(true);
  });
});

describe('explainEdges', () => {
  it('explains the Skullclamp <- Krenko tokens edge in both directions checked', () => {
    const reasons = explainEdges(SKULLCLAMP, KRENKO);
    expect(reasons.some((r) => r.includes('Skullclamp consumes tokens') && r.includes('Krenko, Mob Boss produces tokens'))).toBe(true);
  });

  it('returns no reasons for unrelated cards', () => {
    const vanilla: CardLike = { name: 'Grizzly Bears', oracleText: '', typeLine: 'Creature — Bear' };
    const reasons = explainEdges(vanilla, { name: 'Another Vanilla', oracleText: '', typeLine: 'Creature — Bear' });
    expect(reasons).toEqual([]);
  });
});

describe('cmdEdge / pairEdge primitives', () => {
  it('cmdEdge is 0 when there is no resource overlap', () => {
    const commander = tagCard(KRENKO);
    const unrelated = tagCard({ name: 'Grizzly Bears', oracleText: '', typeLine: 'Creature — Bear' });
    expect(cmdEdge(unrelated, commander)).toBe(0);
  });

  it('cmdEdge is > 0 when the card consumes what the commander produces', () => {
    const commander = tagCard(KRENKO);
    const skullclamp = tagCard(SKULLCLAMP);
    expect(cmdEdge(skullclamp, commander)).toBeGreaterThan(0);
  });

  it('pairEdge is capped at PAIR_EDGE_CAP (2)', () => {
    const a: CardLike = { name: 'A', oracleText: 'Create a token. Draw a card. Gain 5 life. Mill a card.', typeLine: 'Sorcery' };
    const b: CardLike = {
      name: 'B',
      oracleText: 'Whenever a token enters the battlefield, whenever you draw a card, whenever you gain life, and whenever a card is milled, you may do something.',
      typeLine: 'Enchantment',
    };
    const pe = pairEdge(tagCard(a), tagCard(b));
    expect(pe).toBeLessThanOrEqual(2);
  });
});

describe('commanderResourceProfile', () => {
  it('unions the commander\'s own oracle-text tags with SynergyCategory-derived resources', () => {
    const profile = commanderResourceProfile({
      name: 'Meren of Clan Nel Toth',
      oracleText: MEREN.oracleText,
      typeLine: MEREN.typeLine,
      synergyProfile: {
        detectedArchetype: 'aristocrats',
        triggerCategories: ['creature_dies', 'graveyard'],
        payoffType: 'general value',
        synergyMinimums: {},
        cardPoolPatterns: [],
        scoreBonuses: {},
        protectedPatterns: [],
        strategyDescription: '',
        drawReduction: 0,
        removalReduction: 0,
      },
      directNeeds: null,
    });
    expect(profile.consumes.has('creature_death')).toBe(true);
    expect(profile.consumes.has('graveyard_fill')).toBe(true);
  });
});

// Triangle-counting: a synthetic Krenko-like mini-deck with hand-verified
// expected values, per the exact formula in docs/SYNERGY_ENGINE_DESIGN.md §1:
//   cardISS(c) = B*[cmdEdge(c)>0] + lambda * sum_{o!=c} pairEdge(c,o)*[cmdEdge(o)>0]
describe('computeSynergyGraph — triangle counting (synthetic mini-deck)', () => {
  const commander: CardLike = {
    name: 'Token Lord',
    oracleText: 'Create three 1/1 Goblin creature tokens.',
    typeLine: 'Legendary Creature — Goblin',
  };
  // Consumes tokens (edge to commander), produces card_draw.
  const cardA: CardLike = { name: 'Sac For Value', oracleText: 'Sacrifice a token: Draw a card.', typeLine: 'Artifact' };
  // Consumes tokens (edge to commander) AND consumes card_draw (pairs with A)
  // AND also produces card_draw + tokens via its second clause.
  const cardB: CardLike = {
    name: 'Feedback Loop',
    oracleText: 'Whenever a token you control dies, draw a card. Whenever you draw a card, create a 1/1 colorless token.',
    typeLine: 'Enchantment',
  };
  // No commander edge, no resource tags at all.
  const filler: CardLike = { name: 'Vanilla Flyer', oracleText: 'Flying.', typeLine: 'Creature — Bird' };

  it('tags confirm the hand-verified setup', () => {
    const cTags = tagCard(commander);
    const aTags = tagCard(cardA);
    const bTags = tagCard(cardB);
    expect(cTags.produces.has('tokens')).toBe(true);
    expect(aTags.consumes.has('tokens')).toBe(true);
    expect(aTags.produces.has('card_draw')).toBe(true);
    expect(bTags.consumes.has('tokens')).toBe(true);
    expect(bTags.consumes.has('card_draw')).toBe(true);
    expect(bTags.produces.has('tokens')).toBe(true);
    expect(bTags.produces.has('card_draw')).toBe(true);

    expect(cmdEdge(aTags, cTags)).toBeGreaterThan(0);
    expect(cmdEdge(bTags, cTags)).toBeGreaterThan(0);
    // pairEdge(A,B): A produces card_draw (B consumes it) + B produces
    // tokens/card_draw (A consumes tokens) = 2 raw overlaps, capped at 2.
    expect(pairEdge(aTags, bTags)).toBe(2);
  });

  it('computes cardISS per the exact formula: base + lambda*pairEdge for each commander-synergizing partner', () => {
    const { cardISS } = computeSynergyGraph([cardA, cardB, filler], {
      ...commander,
      synergyProfile: null,
      directNeeds: null,
    });

    // A: base (cmdEdge>0) + lambda * pairEdge(A,B) * [cmdEdge(B)>0]
    const expectedA = ISS_BASE + ISS_LAMBDA * 2;
    // B: base (cmdEdge>0) + lambda * pairEdge(B,A) * [cmdEdge(A)>0]
    const expectedB = ISS_BASE + ISS_LAMBDA * 2;
    expect(cardISS.get('Sac For Value')).toBe(expectedA);
    expect(cardISS.get('Feedback Loop')).toBe(expectedB);
    // Filler has no commander edge and no resource overlap with anything.
    expect(cardISS.get('Vanilla Flyer')).toBe(0);
  });

  it('deckISS is the normalized average of cardISS across unique nonland cards', () => {
    const { deckISS } = computeSynergyGraph([cardA, cardB, filler], {
      ...commander,
      synergyProfile: null,
      directNeeds: null,
    });
    const avg = (14 + 14 + 0) / 3; // (B + lambda*2) twice, filler 0
    const expected = Math.max(0, Math.min(100, Math.round((avg / ISS_NORMALIZE_CEILING) * 100)));
    expect(deckISS).toBe(expected);
    expect(deckISS).toBeGreaterThan(0);
  });

  it('topSynergyPairs surfaces the A<->B pair with an explanation, not the filler', () => {
    const { topSynergyPairs } = computeSynergyGraph([cardA, cardB, filler], {
      ...commander,
      synergyProfile: null,
      directNeeds: null,
    });
    expect(topSynergyPairs.length).toBe(1);
    const [top] = topSynergyPairs;
    expect([top.a, top.b].sort()).toEqual(['Feedback Loop', 'Sac For Value']);
    expect(top.reasons.length).toBeGreaterThan(0);
  });

  it('dedupes cards by name (a second copy does not create a self-pair)', () => {
    const { cardISS } = computeSynergyGraph([cardA, cardA, cardB], {
      ...commander,
      synergyProfile: null,
      directNeeds: null,
    });
    expect(cardISS.size).toBe(2);
  });

  it('an empty nonland pool yields deckISS 0, not NaN', () => {
    const { deckISS, cardISS, topSynergyPairs } = computeSynergyGraph([], {
      ...commander,
      synergyProfile: null,
      directNeeds: null,
    });
    expect(deckISS).toBe(0);
    expect(cardISS.size).toBe(0);
    expect(topSynergyPairs).toEqual([]);
  });
});
