import { describe, it, expect } from 'vitest';
import {
  isConditionalColoredProducer, chosenTypeLandColors, fetchLandColors, realManaSources, isNeverColoredProducer,
  countColorSources, type ManaSourceCard, type ManaSourceContext,
} from '../mana-sources';

// 2026-09-22: Conduit Pylons ({1},{T}: Add one mana of any color) and
// Baldur's Gate ({2},{T}: Add X mana of any one color) were reading as
// unconditional rainbow fixing — same as City of Brass — because the
// classifier only looked for "activate only if" / "entered this turn" /
// devotion gates. A costed or X-scaled any-color activation is gated the
// same way: it costs an extra land's worth of mana for one land's fixing.
function land(oracle_text: string): ManaSourceCard {
  return { oracle_text, type_line: 'Land' } as ManaSourceCard;
}

describe('isConditionalColoredProducer — costed / X-scaled any-color activations', () => {
  it('Conduit Pylons: costed {1} activation is conditional', () => {
    const card = land('{T}: Add {C}.\n{1}, {T}: Add one mana of any color.');
    expect(isConditionalColoredProducer(card)).toBe(true);
  });

  it("Baldur's Gate: costed {2} + X-scaled activation is conditional", () => {
    const card = land('{T}: Add {C}.\n{2}, {T}: Add X mana of any one color, where X is the number of other Gates you control.');
    expect(isConditionalColoredProducer(card)).toBe(true);
  });

  it('City of Brass: free {T}-only any-color activation stays unconditional', () => {
    const card = land('Whenever this land becomes tapped, it deals 1 damage to you.\n{T}: Add one mana of any color.');
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('Mana Confluence: {T} + life payment (no extra mana cost) stays unconditional', () => {
    const card = land('{T}, Pay 1 life: Add one mana of any color.');
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it("Command Tower: {T}-only stays unconditional", () => {
    const card = land("{T}: Add one mana of any color in your commander's color identity.");
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('Exotic Orchard: {T}-only stays unconditional', () => {
    const card = land('{T}: Add one mana of any color that a land an opponent controls could produce.');
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('Cascading Cataracts: {5} costed activation is conditional (documented — costed rule catches it even without "X mana")', () => {
    const card = land('Indestructible\n{T}: Add {C}.\n{5}, {T}: Add five mana in any combination of colors.');
    expect(isConditionalColoredProducer(card)).toBe(true);
  });

  it('a bare {T}: Add one mana of any color land stays unconditional', () => {
    const card = land('{T}: Add one mana of any color.');
    expect(isConditionalColoredProducer(card)).toBe(false);
  });
});

// 2026-09-30: honest colour count (landbase-diagnosis.md §5.2-5.3). Every
// function takes an optional ManaSourceContext; WITHOUT it, output must stay
// byte-identical to today (Deck Score pins countColorSources with no ctx).
describe('honest colour count (ctx opt-in)', () => {
  const ctx: ManaSourceContext = {
    deckColors: ['W', 'U', 'B', 'R', 'G'],
    basicColors: ['W', 'B'],
    typedLandColors: ['W', 'B'],
  };

  it('chosen-type land: 1 colour (the best single deck colour), never 5', () => {
    const card = land("As this land enters, choose a basic land type.\n{T}: Add one mana of the chosen type.");
    expect(chosenTypeLandColors(card, ctx)).toEqual(['W']);
    // colorPriority overrides the default deckColors[0] pick
    expect(chosenTypeLandColors(card, { ...ctx, colorPriority: ['B', 'W'] })).toEqual(['B']);
  });

  it('generic basic-land fetcher: only the colours whose basics the deck runs', () => {
    const card = land('{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.');
    expect(fetchLandColors(card, ctx)).toEqual(['W', 'B']);
  });

  it('typed fetch is unaffected by ctx (already scoped to named basic types)', () => {
    const card = land('{T}, Pay 1 life, Sacrifice this land: Search your library for a Plains or Island card, put it onto the battlefield, then shuffle.');
    expect(fetchLandColors(card, ctx)).toEqual(['W', 'U']);
  });

  it('Gemstone Caverns: counter-gated mana is not a source', () => {
    const card = land(
      "If this card is in your opening hand and you're not the starting player, you may begin the game with this land on the battlefield with a luck counter on it. If you do, exile a card from your hand.\n{T}: Add {C}. If this land has a luck counter on it, instead add one mana of any color."
    );
    expect(isConditionalColoredProducer(card, ctx)).toBe(true);
    expect(isConditionalColoredProducer(card)).toBe(false); // without ctx: today's value
  });

  it("Mirrodin's Core: mana gated behind removing a counter is not a source", () => {
    const card = land('{T}: Add {C}.\n{T}: Put a charge counter on this land.\n{T}, Remove a charge counter from this land: Add one mana of any color.');
    expect(isConditionalColoredProducer(card, ctx)).toBe(true);
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('Plaza of Harmony: "any type a Gate could produce" is not a source', () => {
    const card = land('{T}: Add {C}.\n{T}: Add one mana of any type that a Gate you control could produce.');
    expect(isConditionalColoredProducer(card, ctx)).toBe(true);
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('Forgotten Monument: mana granted only to OTHER permanents is not a source', () => {
    const card = land('{T}: Add {C}.\nOther Caves you control have "{T}, Pay 1 life: Add one mana of any color."');
    expect(isConditionalColoredProducer(card, ctx)).toBe(true);
    expect(isConditionalColoredProducer(card)).toBe(false);
  });

  it('a Verge is full credit (not conditional) when the deck runs a land of the gating basic type', () => {
    const card = land('{T}: Add {B}.\n{T}: Add {W}. Activate only if you control a Plains or a Swamp.');
    // ctx.typedLandColors includes W (a Plains-typed land is in the deck)
    expect(isConditionalColoredProducer(card, ctx)).toBe(false);
    // without ctx, or without the deck running that basic type, stays conditional
    expect(isConditionalColoredProducer(card)).toBe(true);
    // the gate is satisfied by EITHER named basic type — only fails when the
    // deck runs neither Plains- nor Swamp-typed lands
    const noPlainsNoSwamp: ManaSourceContext = { deckColors: ['U', 'R', 'G'], basicColors: [], typedLandColors: ['U', 'R', 'G'] };
    expect(isConditionalColoredProducer(card, noPlainsNoSwamp)).toBe(true);
  });

  it('without ctx, realManaSources / countColorSources return exactly today\'s value', () => {
    const passage: ManaSourceCard = { name: 'Multiversal Passage', type_line: 'Land', oracle_text: 'As this land enters, choose a basic land type.\n{T}: Add one mana of the chosen type.' };
    const wilds: ManaSourceCard = { name: 'Evolving Wilds', type_line: 'Land', oracle_text: '{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.' };
    const gemstone: ManaSourceCard = { name: 'Gemstone Caverns', type_line: 'Land', produced_mana: JSON.stringify(['W', 'U', 'B', 'R', 'G']), oracle_text: "If this land has a luck counter on it, instead add one mana of any color." };
    expect(realManaSources(passage).colors).toEqual(['W', 'U', 'B', 'R', 'G']);
    expect(realManaSources(wilds).colors).toEqual(['W', 'U', 'B', 'R', 'G']);
    expect(realManaSources(gemstone).reliable).toBe(true); // not caught without ctx — today's (overcounting) behaviour
    expect(countColorSources([{ card: passage, quantity: 1 }, { card: wilds, quantity: 1 }, { card: gemstone, quantity: 1 }]))
      .toEqual({ W: 3, U: 3, B: 3, R: 3, G: 3 });
  });
});

// Unit L (2026-09-30, audit B-D2): "any type that a land you control could
// produce" (Reflecting Pool) was read as never-coloured alongside the Gate-only
// wording (Plaza of Harmony). Only the Gate-count gate is a trap.
describe('isNeverColoredProducer — Reflecting Pool vs Plaza of Harmony', () => {
  const ctx: ManaSourceContext = { deckColors: ['W', 'U'], basicColors: ['W', 'U'], typedLandColors: ['W', 'U'] };
  it('Reflecting Pool is a real source with ctx', () => {
    const pool = land('{T}: Add one mana of any type that a land you control could produce.');
    expect(isNeverColoredProducer(pool, ctx)).toBe(false);
    expect(isConditionalColoredProducer(pool, ctx)).toBe(false);
  });
  it('Plaza of Harmony (Gate-only) stays never-coloured with ctx', () => {
    const plaza = land('When this land enters, if you control two or more Gates, you gain 3 life.\n{T}: Add {C}.\n{T}: Add one mana of any type that a Gate you control could produce.');
    expect(isNeverColoredProducer(plaza, ctx)).toBe(true);
  });
});

// Unit L: colour that costs a permanent, a costed basic-land search, or colour
// read off the graveyard is conditional — with ctx only (Deck Score's default
// path is pinned by the "without ctx" test above).
describe('isConditionalColoredProducer — sacrifice-cost, costed fetch, graveyard-gated colour (ctx only)', () => {
  const ctx: ManaSourceContext = { deckColors: ['W', 'U', 'B'], basicColors: ['W', 'U', 'B'], typedLandColors: ['W', 'U', 'B'] };
  const quarry = land('{T}: Add {C}.\n{T}, Sacrifice a creature: Add one mana of any color.');
  const field = land('{T}: Add {C}.\n{2}, {T}, Sacrifice this land: Destroy target nonbasic land an opponent controls. You may search your library for a basic land card, put it onto the battlefield, then shuffle.');
  const havens = land('{T}: Add {C}.\n{T}: Add one mana of any color among legendary creature cards in your graveyard.');
  const misty = land('{T}, Pay 1 life, Sacrifice this land: Search your library for a Forest or Island card, put it onto the battlefield, then shuffle.');
  it('Lazotep Quarry, Demolition Field, The Grey Havens are conditional with ctx', () => {
    expect(isConditionalColoredProducer(quarry, ctx)).toBe(true);
    expect(isConditionalColoredProducer(field, ctx)).toBe(true);
    expect(isConditionalColoredProducer(havens, ctx)).toBe(true);
  });
  it('a free "{T}, Sacrifice this land" fetch stays unconditional', () => {
    expect(isConditionalColoredProducer(misty, ctx)).toBe(false);
  });
  it('without ctx nothing changes', () => {
    expect(isConditionalColoredProducer(quarry)).toBe(false);
    expect(isConditionalColoredProducer(field)).toBe(false);
    expect(isConditionalColoredProducer(havens)).toBe(false);
  });
});

describe('isConditionalColoredProducer / isNeverColoredProducer — creature-tap colour and Gond Gate (ctx only)', () => {
  const ctx: ManaSourceContext = { deckColors: ['W', 'U', 'B'], basicColors: ['W', 'U', 'B'], typedLandColors: ['W', 'U', 'B'] };
  it("Survivors' Encampment (tap an untapped creature) is conditional with ctx, unchanged without", () => {
    const camp = land('{T}: Add {C}.\n{T}, Tap an untapped creature you control: Add one mana of any color.');
    expect(isConditionalColoredProducer(camp, ctx)).toBe(true);
    expect(isConditionalColoredProducer(camp)).toBe(false);
  });
  it('Gond Gate ("any color that a Gate you control could produce") is never-coloured with ctx', () => {
    const gate = land('Gates you control enter untapped.\n{T}: Add {C}.\n{T}: Add one mana of any color that a Gate you control could produce.');
    expect(isNeverColoredProducer(gate, ctx)).toBe(true);
    expect(isNeverColoredProducer(gate)).toBe(false);
  });
});
