import { describe, it, expect } from 'vitest';
import { applyDeadCardPass } from '../deck-builder-ai';
import type { DbCard } from '../types';

function makeCard(overrides: Partial<DbCard> = {}): DbCard {
  return {
    id: 'test-id',
    oracle_id: 'test-oracle',
    name: 'Test Card',
    mana_cost: '{1}{G}',
    cmc: 2,
    type_line: 'Creature',
    oracle_text: null,
    colors: '["G"]',
    color_identity: '["G"]',
    keywords: '[]',
    set_code: 'tst',
    set_name: 'Test Set',
    collector_number: '1',
    rarity: 'common',
    image_uri_small: null,
    image_uri_normal: null,
    image_uri_large: null,
    image_uri_art_crop: null,
    price_usd: null,
    price_usd_foil: null,
    legalities: '{"commander":"legal"}',
    power: null,
    toughness: null,
    loyalty: null,
    produced_mana: null,
    edhrec_rank: null,
    layout: 'normal',
    updated_at: '2024-01-01',
    subtypes: null,
    arena_id: null,
    game_changer: 0,
    ...overrides,
  } as DbCard;
}

describe('applyDeadCardPass', () => {
  it('replaces a narrow tutor with fewer than 3 targets in the deck', () => {
    const courier = makeCard({
      name: 'Courier of Comestibles',
      type_line: 'Creature — Human Citizen',
      oracle_text: 'When this creature enters, you may search your library for a Food card, reveal it, put it into your hand, then shuffle.',
    });
    const filler = makeCard({ name: 'Grizzly Bears', type_line: 'Creature — Bear' });
    // Same primary category as the courier (tutor) so it's a same-role swap.
    const replacement = makeCard({
      name: 'Broad Tutor',
      type_line: 'Sorcery',
      oracle_text: 'Search your library for a creature card, reveal it, put it into your hand, then shuffle.',
    });
    const picked = [
      { card: courier, quantity: 1, board: 'main' as const },
      { card: filler, quantity: 1, board: 'main' as const },
    ];
    const pool = [{ card: replacement, score: 40 }];

    const { cards, replacedAsDead } = applyDeadCardPass(picked, pool, ['G'], undefined);
    expect(replacedAsDead.length).toBe(1);
    expect(replacedAsDead[0].out).toBe('Courier of Comestibles');
    expect(replacedAsDead[0].in).toBe('Broad Tutor');
    expect(cards.length).toBe(2); // deck size preserved
  });

  it('keeps a narrow tutor when the deck has enough targets', () => {
    const courier = makeCard({
      name: 'Courier of Comestibles',
      type_line: 'Creature — Human Citizen',
      oracle_text: 'When this creature enters, you may search your library for a Food card, reveal it, put it into your hand, then shuffle.',
    });
    const foodA = makeCard({ name: 'Food A', type_line: 'Artifact — Food' });
    const foodB = makeCard({ name: 'Food B', type_line: 'Artifact — Food' });
    const foodC = makeCard({ name: 'Food C', type_line: 'Artifact — Food' });
    const picked = [
      { card: courier, quantity: 1, board: 'main' as const },
      { card: foodA, quantity: 1, board: 'main' as const },
      { card: foodB, quantity: 1, board: 'main' as const },
      { card: foodC, quantity: 1, board: 'main' as const },
    ];
    const { cards, replacedAsDead } = applyDeadCardPass(picked, [], ['G'], undefined);
    expect(replacedAsDead).toEqual([]);
    expect(cards.find((c) => c.card.name === 'Courier of Comestibles')).toBeDefined();
  });

  it('replaces a {C}{C} card when the deck has too few colourless sources', () => {
    const command = makeCard({
      name: "Kozilek's Command",
      mana_cost: '{X}{C}{C}',
      type_line: 'Instant',
      colors: '[]',
      color_identity: '[]',
      oracle_text: 'Choose two —',
    });
    const filler = makeCard({ name: 'Filler Instant', mana_cost: '{2}', type_line: 'Instant' });
    // Same primary category as the command (plain 'utility' — no ramp/draw/
    // tutor text and not a named board wipe).
    const replacement = makeCard({ name: 'Plain Instant', mana_cost: '{1}{U}', type_line: 'Instant', oracle_text: 'Deal 1 damage.' });
    const picked = [
      { card: command, quantity: 1, board: 'main' as const },
      { card: filler, quantity: 1, board: 'main' as const },
    ];
    const pool = [{ card: replacement, score: 40 }];

    const { cards, replacedAsDead } = applyDeadCardPass(picked, pool, ['G'], undefined);
    expect(replacedAsDead.length).toBe(1);
    expect(replacedAsDead[0].out).toBe("Kozilek's Command");
    expect(replacedAsDead[0].in).toBe('Plain Instant');
    expect(cards.length).toBe(2);
  });

  it('keeps a {C}{C} card when enough colourless sources are in the deck', () => {
    const command = makeCard({
      name: "Kozilek's Command",
      mana_cost: '{X}{C}{C}',
      type_line: 'Instant',
      colors: '[]',
      color_identity: '[]',
      oracle_text: 'Choose two —',
    });
    const sources = Array.from({ length: 12 }, (_, i) =>
      makeCard({ name: `Wastes Rock ${i}`, oracle_text: '{T}: Add {C}.', type_line: 'Artifact' })
    );
    const picked = [
      { card: command, quantity: 1, board: 'main' as const },
      ...sources.map((card) => ({ card, quantity: 1, board: 'main' as const })),
    ];
    const { cards, replacedAsDead } = applyDeadCardPass(picked, [], ['G'], undefined);
    expect(replacedAsDead).toEqual([]);
    expect(cards.find((c) => c.card.name === "Kozilek's Command")).toBeDefined();
  });

  it('replaces a mono-colour dead fixer', () => {
    const lantern = makeCard({
      name: 'Chromatic Lantern',
      type_line: 'Artifact',
      oracle_text: 'Lands you control have "{T}: Add one mana of any color."\n{T}: Add one mana of any color.',
    });
    const filler = makeCard({ name: 'Filler Artifact', type_line: 'Artifact' });
    const replacement = makeCard({ name: 'Mind Stone', type_line: 'Artifact', oracle_text: '{T}: Add one mana of any color.' });
    const picked = [
      { card: lantern, quantity: 1, board: 'main' as const },
      { card: filler, quantity: 1, board: 'main' as const },
    ];
    const pool = [{ card: replacement, score: 40 }];

    const { cards, replacedAsDead } = applyDeadCardPass(picked, pool, ['G'], undefined);
    expect(replacedAsDead.length).toBe(1);
    expect(replacedAsDead[0].out).toBe('Chromatic Lantern');
    expect(cards.length).toBe(2);
  });

  it('does not flag Chromatic Lantern in a two-colour deck', () => {
    const lantern = makeCard({
      name: 'Chromatic Lantern',
      type_line: 'Artifact',
      oracle_text: 'Lands you control have "{T}: Add one mana of any color."\n{T}: Add one mana of any color.',
    });
    const picked = [{ card: lantern, quantity: 1, board: 'main' as const }];
    const { replacedAsDead } = applyDeadCardPass(picked, [], ['G', 'W'], undefined);
    expect(replacedAsDead).toEqual([]);
  });

  it('owned-only replacement: a collection build never swaps in an unpickable candidate', () => {
    const courier = makeCard({
      name: 'Courier of Comestibles',
      type_line: 'Creature — Human Citizen',
      oracle_text: 'When this creature enters, you may search your library for a Food card, reveal it, put it into your hand, then shuffle.',
    });
    const unowned = makeCard({
      name: 'Unowned Tutor',
      type_line: 'Sorcery',
      oracle_text: 'Search your library for a creature card, reveal it, put it into your hand, then shuffle.',
    });
    const owned = makeCard({
      name: 'Owned Elf',
      type_line: 'Sorcery',
      oracle_text: 'Search your library for a creature card, reveal it, put it into your hand, then shuffle.',
    });
    const picked = [{ card: courier, quantity: 1, board: 'main' as const }];
    // Unowned candidate scores higher but canPick rejects it.
    const pool = [
      { card: unowned, score: 90 },
      { card: owned, score: 10 },
    ];
    const canPick = (card: DbCard) => card.name === 'Owned Elf';

    const { cards, replacedAsDead } = applyDeadCardPass(picked, pool, ['G'], undefined, canPick);
    expect(replacedAsDead[0].in).toBe('Owned Elf');
    expect(cards[0].card.name).toBe('Owned Elf');
  });

  it('leaves a dead card in place (no crash, no removal) when no safe replacement exists', () => {
    const courier = makeCard({
      name: 'Courier of Comestibles',
      type_line: 'Creature — Human Citizen',
      oracle_text: 'When this creature enters, you may search your library for a Food card, reveal it, put it into your hand, then shuffle.',
    });
    const picked = [{ card: courier, quantity: 1, board: 'main' as const }];
    const { cards, replacedAsDead } = applyDeadCardPass(picked, [], ['G'], undefined);
    expect(replacedAsDead).toEqual([]);
    expect(cards.length).toBe(1);
    expect(cards[0].card.name).toBe('Courier of Comestibles');
  });
});

// P2-S B-D6: a payoff whose trigger names an enabler the deck lacks is dead.
// Real oracle text (card DB 2026-09-30).
describe('applyDeadCardPass — enabler census (B-D6)', () => {
  const main = (card: DbCard) => ({ card, quantity: 1, board: 'main' as const });
  const creature = (name: string, type = 'Creature — Bear', text = 'Vigilance', cmc = 2) =>
    makeCard({ name, type_line: type, oracle_text: text, cmc, power: '2', toughness: '2' });
  const bears = (n: number) => Array.from({ length: n }, (_, i) => main(creature(`Bear ${i + 1}`)));
  // Same-role substitutes the pass can reach for.
  const pool = [
    { card: makeCard({ name: 'Test Draw Sub', type_line: 'Sorcery', oracle_text: 'Draw two cards.', cmc: 3 }), score: 40 },
    { card: makeCard({ name: 'Test Ramp Sub', type_line: 'Artifact', oracle_text: '{T}: Add {G}.', cmc: 2 }), score: 40 },
    { card: makeCard({ name: 'Test Ramp Sub 2', type_line: 'Artifact', oracle_text: '{T}: Add {R}.', cmc: 2 }), score: 39 },
    { card: makeCard({ name: 'Test Tutor Sub', type_line: 'Sorcery', oracle_text: 'Search your library for a card, put it into your hand, then shuffle.', cmc: 2 }), score: 40 },
    { card: makeCard({ name: 'Test Utility Sub', type_line: 'Creature — Elf', oracle_text: 'Flying', cmc: 2 }), score: 40 },
  ];
  const colors = ['B', 'R'];
  const outOf = (cards: Array<{ card: DbCard; quantity: number; board: 'main' }>, commanderOracle?: string) =>
    applyDeadCardPass(cards, pool, colors, commanderOracle).replacedAsDead.map((r) => `${r.out}: ${r.reason}`);

  const idol = makeCard({ name: 'Idol of Oblivion', type_line: 'Artifact', cmc: 2, oracle_text: '{T}: Draw a card. Activate only if you created a token this turn.\n{8}, {T}, Sacrifice this artifact: Create a 10/10 colorless Eldrazi creature token.' });
  const sram = makeCard({ name: 'Sram, Senior Edificer', type_line: 'Legendary Creature — Dwarf Advisor', cmc: 2, oracle_text: 'Whenever you cast an Aura, Equipment, or Vehicle spell, draw a card.' });
  const hoard = makeCard({ name: "Dragon's Hoard", type_line: 'Artifact', cmc: 3, oracle_text: 'Whenever a Dragon you control enters, put a gold counter on this artifact.\n{T}, Remove a gold counter from this artifact: Draw a card.\n{T}: Add one mana of any color.' });
  const banner = makeCard({ name: "Vanquisher's Banner", type_line: 'Artifact', cmc: 5, oracle_text: 'As this artifact enters, choose a creature type.\nCreatures you control of the chosen type get +1/+1.\nWhenever you cast a creature spell of the chosen type, draw a card.' });
  const empath = makeCard({ name: 'Fierce Empath', type_line: 'Creature — Elf', cmc: 3, oracle_text: 'When this creature enters, you may search your library for a creature card with mana value 6 or greater, reveal it, put it into your hand, then shuffle.' });
  const henge = makeCard({ name: 'The Great Henge', type_line: 'Legendary Artifact', cmc: 9, oracle_text: 'This spell costs {X} less to cast, where X is the greatest power among creatures you control.\n{T}: Add {G}{G}. You gain 2 life.\nWhenever a nontoken creature you control enters, put a +1/+1 counter on it and draw a card.' });
  const altar = makeCard({ name: "Ashnod's Altar", type_line: 'Artifact', cmc: 3, oracle_text: 'Sacrifice a creature: Add {C}{C}.' });
  const makers = (n: number) => Array.from({ length: n }, (_, i) => main(makeCard({ name: `Maker ${i + 1}`, type_line: 'Sorcery', oracle_text: 'Create a 1/1 white Soldier creature token.', cmc: 2 })));

  it('Idol of Oblivion dies without token makers; the commander counts as one', () => {
    expect(outOf([main(idol), ...bears(10)])).toEqual([expect.stringMatching(/^Idol of Oblivion: .*token/)]);
    const edgar = 'Whenever you cast another Vampire spell, create a 1/1 black Vampire creature token with lifelink.';
    expect(outOf([main(idol), ...makers(3), ...bears(10)], edgar)).toEqual([]);
    expect(outOf([main(idol), ...makers(3), ...bears(10)])).toHaveLength(1);
  });

  it('Sram dies without Auras/Equipment/Vehicles', () => {
    expect(outOf([main(sram), ...bears(10)])).toEqual([expect.stringMatching(/^Sram, Senior Edificer: .*Aura/)]);
    const swords = Array.from({ length: 4 }, (_, i) => main(makeCard({ name: `Sword ${i + 1}`, type_line: 'Artifact — Equipment', oracle_text: 'Equipped creature gets +1/+1.\nEquip {1}', cmc: 2 })));
    expect(outOf([main(sram), ...swords, ...bears(10)])).toEqual([]);
  });

  it("Dragon's Hoard dies below 8 Dragons", () => {
    const dragons = (n: number) => Array.from({ length: n }, (_, i) => main(creature(`Dragon ${i + 1}`, 'Creature — Dragon', 'Flying', 5)));
    expect(outOf([main(hoard), ...dragons(5), ...bears(10)])).toEqual([expect.stringMatching(/^Dragon's Hoard: .*Dragon/)]);
    expect(outOf([main(hoard), ...dragons(8), ...bears(10)])).toEqual([]);
  });

  it("Vanquisher's Banner dies when no creature type reaches 8", () => {
    const goblins = (n: number) => Array.from({ length: n }, (_, i) => main(creature(`Goblin ${i + 1}`, 'Creature — Goblin', 'Haste', 1)));
    expect(outOf([main(banner), ...goblins(5), ...bears(5)])).toEqual([expect.stringMatching(/^Vanquisher's Banner: .*chosen type/)]);
    expect(outOf([main(banner), ...goblins(8), ...bears(5)])).toEqual([]);
  });

  it('Fierce Empath is a narrow tutor for creatures at mana value 6 or more', () => {
    const titans = (n: number) => Array.from({ length: n }, (_, i) => main(creature(`Titan ${i + 1}`, 'Creature — Giant', 'Trample', 6)));
    expect(outOf([main(empath), ...bears(12)])).toEqual([expect.stringMatching(/^Fierce Empath: narrow tutor/)]);
    expect(outOf([main(empath), ...titans(3), ...bears(12)])).toEqual([]);
  });

  it('a creature-count engine or sacrifice outlet dies below 12 creatures', () => {
    expect(outOf([main(henge), main(altar), ...bears(5)]).sort()).toEqual([
      expect.stringMatching(/^Ashnod's Altar: .*creature/),
      expect.stringMatching(/^The Great Henge: .*creature/),
    ]);
    expect(outOf([main(henge), main(altar), ...bears(12)])).toEqual([]);
  });
});
