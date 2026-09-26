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
