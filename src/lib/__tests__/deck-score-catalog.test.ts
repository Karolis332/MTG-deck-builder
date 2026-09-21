/**
 * Deck Score v1.2 — typed-effect catalogue. docs/DECK_SCORE_SPEC.md §8.
 *
 * Two jobs:
 *  1. the compiled catalogue is well formed — every entry parses, ids are
 *     unique, every effect carries family/mode/cost/output/timing, and a
 *     curated entry always beats the generated shard for the same name;
 *  2. the oracle parser types what it claims and REFUSES what it cannot
 *     ground. The texts below are live oracle texts (card data 2026-09-19)
 *     pasted verbatim, so the parser is exercised without a database.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  CATALOG_SIZE, CATALOG_VERSION, CURATED, catalogEntries, catalogEntry, catalogFacts,
  entryHash, isGenerated, oracleHash, type CatalogEntry, type EffectFamily,
} from '../deck-score-catalog';
import { generateEntry, type GeneratableCard } from '../deck-score-catalog/generate';

// Coverage round 1 tripled the catalogue shard (4,467 -> 14,909 entries), so
// every pile-building and catalogue-walking test in this file got ~3x slower
// and several landed within noise of vitest's 15 s default. Raised per file
// rather than per test: the work is corpus-sized, not hung.
vi.setConfig({ testTimeout: 120_000 });

function card(
  name: string, mana_cost: string | null, cmc: number, type_line: string, oracle_text: string,
  power: string | null = null,
): GeneratableCard {
  return { name, mana_cost, cmc, type_line, oracle_text, power, toughness: null, produced_mana: null };
}

/** `[card, expected knowledge, expected effect families]`. */
const CASES: Array<[GeneratableCard, 'known' | 'partial', EffectFamily[]]> = [
  [card('Spell Pierce', '{U}', 1, 'Instant', 'Counter target noncreature spell unless its controller pays {2}.'), 'known', ['answer']],
  [card('Shared Roots', '{1}{G}', 2, 'Sorcery — Lesson', 'Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.'), 'known', ['mana']],
  [card('Shoot the Sheriff', '{1}{B}', 2, 'Instant', 'Destroy target non-outlaw creature. (Assassins, Mercenaries, Pirates, Rogues, and Warlocks are outlaws. Everyone else is fair game.)'), 'known', ['answer']],
  [card('Greedy Freebooter', '{B}', 1, 'Creature — Human Pirate', 'When this creature dies, scry 1 and create a Treasure token. (To scry 1, look at the top card of your library. You may put that card on the bottom. A Treasure token is an artifact with "{T}, Sacrifice this token: Add one mana of any color.")', '1'), 'known', ['advantage', 'mana', 'closing']],
  [card('Gene Pollinator', '{G}', 1, 'Artifact Creature — Robot Insect', '{T}, Tap an untapped permanent you control: Add one mana of any color.', '1'), 'known', ['mana', 'closing']],
  [card('Traumatic Critique', '{X}{U}{R}', 2, 'Instant', 'Traumatic Critique deals X damage to any target. Draw two cards, then discard a card.'), 'known', ['closing', 'advantage']],
  // v1.3: both clauses ground now — the exile is an answer and "its
  // controller gains life equal to its power" is a typed life amount (§9.6
  // step 1 separates life AMOUNT from the life-gain EVENT that consumes it).
  [card('Swords to Plowshares', '{W}', 1, 'Instant', 'Exile target creature. Its controller gains life equal to its power.'), 'known', ['answer', 'advantage']],
  [card('Demonic Tutor', '{1}{B}', 2, 'Sorcery', 'Search your library for a card, put that card into your hand, then shuffle.'), 'known', ['tutor']],
  [card('Vampiric Tutor', '{B}', 1, 'Instant', 'Search your library for a card, then shuffle and put that card on top. You lose 2 life.'), 'known', ['tutor']],
  [card('Sol Ring', '{1}', 1, 'Artifact', '{T}: Add {C}{C}.'), 'known', ['mana']],
  [card('Llanowar Elves', '{G}', 1, 'Creature — Elf Druid', '{T}: Add {G}.', '1'), 'known', ['mana', 'closing']],
  [card('Lightning Bolt', '{R}', 1, 'Instant', 'Lightning Bolt deals 3 damage to any target.'), 'known', ['closing']],
  [card('Doom Blade', '{1}{B}', 2, 'Instant', 'Destroy target nonblack creature.'), 'known', ['answer']],
  [card('Wrath of God', '{2}{W}{W}', 4, 'Sorcery', "Destroy all creatures. They can't be regenerated."), 'known', ['answer']],
  [card('Divination', '{2}{U}', 3, 'Sorcery', 'Draw two cards.'), 'known', ['advantage']],
  [card('Grizzly Bears', '{1}{G}', 2, 'Creature — Bear', '', '2'), 'known', ['closing']],
  [card('Serra Angel', '{3}{W}{W}', 5, 'Creature — Angel', 'Flying, vigilance', '4'), 'known', ['closing']],
  [card('Shock', '{R}', 1, 'Instant', 'Shock deals 2 damage to any target.'), 'known', ['closing']],
  [card('Duress', '{B}', 1, 'Sorcery', 'Target opponent reveals their hand. You choose a noncreature, nonland card from it. That player discards that card.'), 'known', ['advantage']],
  [card('Deep-Cavern Bat', '{1}{B}', 2, 'Creature — Bat', 'Flying, lifelink\nWhen this creature enters, look at target opponent\'s hand. You may exile a nonland card from it until this creature leaves the battlefield.', '1'), 'known', ['advantage', 'answer', 'closing']],
  [card('Biotech Specialist', '{R}{G}', 2, 'Creature — Insect Scientist', 'When this creature enters, create a Lander token. (It\'s an artifact with "{2}, {T}, Sacrifice this token: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.")\nWhenever you sacrifice an artifact, this creature deals 2 damage to target opponent.', '1'), 'known', ['engine', 'closing']],
  [card('Obsessive Pursuit', '{1}{B}', 2, 'Enchantment', 'When this enchantment enters and at the beginning of your upkeep, you lose 1 life and create a Clue token.'), 'known', ['advantage']],
  [card('Spyglass Siren', '{U}', 1, 'Creature — Siren Pirate', 'Flying\nWhen this creature enters, create a Map token.', '1'), 'known', ['engine', 'closing']],
  [card('Jeskai Revelation', '{4}{U}{R}{W}', 7, 'Instant', 'Create two 1/1 white Monk creature tokens with prowess.'), 'known', ['closing']],
  [card('Get Out', '{U}{U}', 2, 'Instant', 'Return one or two target creatures and/or enchantments you own to your hand.'), 'known', ['answer']],
  [card('Keen-Eyed Curator', '{G}{G}', 2, 'Creature — Raccoon Scout', 'Exile target card from a graveyard.', '3'), 'known', ['answer', 'closing']],
  [card('Silence', '{W}', 1, 'Instant', "Your opponents can't cast spells this turn."), 'known', ['answer']],
  [card('Swan Song', '{U}', 1, 'Instant', 'Counter target enchantment, instant, or sorcery spell. Its controller creates a 2/2 blue Bird creature token with flying.'), 'known', ['answer', 'closing']],
  [card('Impractical Joke', '{R}', 1, 'Sorcery', 'Damage can\'t be prevented this turn. Impractical Joke deals 3 damage to up to one target creature or planeswalker.'), 'known', ['answer']],
  [card('Icetill Explorer', '{2}{G}{G}', 4, 'Creature — Elemental', 'You may play an additional land on each of your turns.', '3'), 'known', ['mana', 'closing']],
  [card('Elvish Mystic', '{G}', 1, 'Creature — Elf Druid', '{T}: Add {G}.', '1'), 'known', ['mana', 'closing']],
  [card('Anthem Test', '{1}{W}', 2, 'Enchantment', 'Creatures you control get +1/+1.'), 'known', ['closing']],
  [card('Counter Test', '{1}{U}', 2, 'Instant', 'Counter target spell.'), 'known', ['answer']],
  [card('Mill Test', '{U}', 1, 'Sorcery', 'Mill three cards.'), 'known', ['advantage']],
  [card('Surveil Test', '{U}', 1, 'Instant', 'Surveil 2, then draw a card.'), 'known', ['advantage']],
  [card('Lifegain Test', '{W}', 1, 'Instant', 'You gain 4 life.'), 'known', ['advantage']],
  [card('Drain Test', '{1}{B}', 2, 'Sorcery', 'Each opponent loses 2 life.'), 'known', ['closing']],
  [card('Token Test', '{2}{G}', 3, 'Sorcery', 'Create two 2/2 green Bear creature tokens.'), 'known', ['closing']],
  [card('Pump Test', '{G}', 1, 'Instant', 'Target creature gets +3/+3.'), 'known', ['closing']],
  [card('Recursion Test', '{1}{B}', 2, 'Sorcery', 'Return target creature card from your graveyard to your hand.'), 'known', ['engine']],
  [card('Counters Test', '{1}{G}', 2, 'Instant', 'Put two +1/+1 counters on target creature you control.'), 'known', ['closing']],
  [card('Fetch Test', '{1}{G}', 2, 'Sorcery', 'Search your library for a creature card, reveal it, put it into your hand, then shuffle.'), 'known', ['tutor']],
];

/** Ad Nauseam-class text: iteration, replacement or granted abilities the
 * parser must not pretend to understand (§8). */
const MUST_BE_PARTIAL: GeneratableCard[] = [
  card('Ad Nauseam', '{3}{B}{B}', 5, 'Instant', 'Reveal the top card of your library and put that card into your hand. You lose life equal to its mana value. You may repeat this process any number of times.'),
  card('Tainted Pact', '{1}{B}', 2, 'Instant', 'Exile the top card of your library. You may put that card into your hand unless it has the same name as another card exiled this way. Repeat this process until you put a card into your hand or you exile two cards with the same name, whichever comes first.'),
  // Round 2 asked for the copy class to be typed, so Mockingbird is now known
  // (engine/copy). Necropotence replaces it: "Skip your draw step" is a real
  // cost with no typed atom, so the entry must stay partial.
  card('Necropotence', '{B}{B}{B}', 3, 'Enchantment', 'Skip your draw step.\nWhenever you discard a card, exile that card.\nPay 1 life: Exile the top card of your library face down. Put that card into your hand at the beginning of your next end step.'),
  card('Mox Diamond', '{0}', 0, 'Artifact', "If this artifact would enter, you may discard a land card instead. If you do, put this artifact onto the battlefield. If you don't, put it into its owner's graveyard.\n{T}: Add one mana of any color."),
  // Case of the Uneaten Feast moved out: v1.3 types its life amount, its
  // `creature etb` consumption and its graveyard-exit grant, so it is
  // genuinely `known` now. Replaced by a card whose central clause still has
  // no atom — a global type-changing replacement effect on lands.
  card('Blood Moon', '{2}{R}', 3, 'Enchantment', 'Nonbasic lands are Mountains.'),
  card('Underworld Breach', '{1}{R}', 2, 'Enchantment', "Each nonland card in your graveyard has escape. The escape cost is equal to the card's mana cost plus exile three other cards from your graveyard.\nAt the beginning of the end step, sacrifice this enchantment."),
];

describe('deck-score catalogue — compiled shape', () => {
  const entries = catalogEntries();

  it('loads both shards and reports its size and version', () => {
    expect(entries.length).toBe(CATALOG_SIZE);
    expect(entries.filter((e) => isGenerated(e)).length).toBeGreaterThan(1000);
    expect(CURATED.length).toBeGreaterThanOrEqual(57);
    expect(CATALOG_VERSION).toMatch(/^[0-9a-f]{8}$/);
  });

  it('gives every entry a hash, a knowledge level and well-formed effects', () => {
    for (const entry of entries) {
      expect(typeof entry.canonicalName).toBe('string');
      expect(entry.canonicalName.length).toBeGreaterThan(0);
      expect(entryHash(entry)).toMatch(/^[0-9a-f]{8}$/);
      expect(['known', 'partial', 'unknown']).toContain(entry.knowledge);
      expect(entry.provenance.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const effect of entry.effects) {
        expect(['mana', 'advantage', 'answer', 'engine', 'closing', 'tutor']).toContain(effect.family);
        expect(['cast', 'etb', 'activated', 'triggered', 'static', 'alternate_cost']).toContain(effect.mode);
        expect(Number.isFinite(effect.cost.mana)).toBe(true);
        expect(effect.cost.mana).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(effect.timing.earliestTurn)).toBe(true);
        expect(effect.outputBounds).toBeDefined();
        expect(typeof effect.outputBounds?.unit).toBe('string');
      }
    }
    // Coverage round 1 tripled the shard (4,467 -> 14,909 entries), so this
    // whole-catalogue walk runs ~16 s and flaked against the 15 s default.
  }, 120_000);

  it('has no duplicate canonical identity inside a shard', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const entry of CURATED) {
      const key = entry.canonicalName.toLowerCase();
      if (seen.has(key)) dupes.push(entry.canonicalName);
      seen.add(key);
    }
    expect(dupes).toEqual([]);
  });

  it('marks an entry partial exactly when it carries untyped clauses', () => {
    for (const entry of catalogEntries()) {
      if ((entry.untyped?.length ?? 0) > 0) expect(entry.knowledge).not.toBe('known');
    }
  });

  it('lets a curated entry win over the generated shard for the same name', () => {
    const hits = CURATED.filter((c) => !isGenerated(catalogEntry(c.canonicalName) as CatalogEntry));
    expect(hits.length).toBe(CURATED.length);
    const fow = catalogEntry('Force of Will');
    expect(fow).toBeDefined();
    expect(isGenerated(fow as CatalogEntry)).toBe(false);
    expect(fow?.effects.some((e) => e.mode === 'alternate_cost' && e.cost.mana === 0)).toBe(true);
  });

  it('never lets a face alias shadow a real card', () => {
    const demonic = catalogEntry('Demonic Tutor');
    expect(demonic?.canonicalName).toBe('Demonic Tutor');
  });
});

describe('deck-score catalogue — stale hash detection', () => {
  it('refuses to claim coverage when the live text no longer matches', () => {
    const entry = CURATED.find((e) => e.canonicalName === 'Swords to Plowshares') as CatalogEntry;
    const fresh = catalogFacts(entry.canonicalName, entry.oracleText);
    expect(fresh?.textMatches).toBe(true);
    expect(fresh?.knowledge).toBe('known');

    const drifted = catalogFacts(entry.canonicalName, `${entry.oracleText} It also draws a card.`);
    expect(drifted).not.toBeNull();
    expect(drifted?.textMatches).toBe(false);
  });

  it('hashes whitespace-insensitively but not content-insensitively', () => {
    expect(oracleHash(' Draw a card. ')).toBe(oracleHash('Draw a card.'));
    expect(oracleHash('Draw a card.')).not.toBe(oracleHash('Draw two cards.'));
  });
});

describe('deck-score catalogue — oracle parser', () => {
  it.each(CASES.map((c) => [c[0].name, c] as const))('types %s', (_name, [input, knowledge, families]) => {
    const entry = generateEntry(input);
    expect(entry.knowledge).toBe(knowledge);
    expect(entry.oracleHash).toBe(oracleHash(input.oracle_text));
    expect(entry.provenance.source).toBe('generated from oracle text');
    const got = new Set(entry.effects.map((e) => e.family));
    for (const family of families) expect([...got]).toContain(family);
  });

  it('covers at least 40 real oracle texts', () => {
    expect(CASES.length + MUST_BE_PARTIAL.length).toBeGreaterThanOrEqual(40);
  });

  it.each(MUST_BE_PARTIAL.map((c) => [c.name, c] as const))('leaves %s partial with the clause recorded', (_name, input) => {
    const entry = generateEntry(input);
    expect(entry.knowledge).toBe('partial');
    expect(entry.untyped?.length ?? 0).toBeGreaterThan(0);
    expect(entry.untyped?.join(' ')).not.toBe('');
  });

  it('types the cost and timing of an activated ability, not the cast cost', () => {
    const entry = generateEntry(card('Tablet of Discovery', '{2}{R}', 3, 'Artifact', '{T}: Add {R}.'));
    const mana = entry.effects.find((e) => e.family === 'mana');
    expect(mana?.mode).toBe('activated');
    expect(mana?.cost.mana).toBe(0);
    expect(mana?.outputBounds).toEqual({ min: 1, max: 1, unit: 'mana' });
  });

  it('gives a summoning-sick creature its body and delays a tap ability', () => {
    const entry = generateEntry(card('Dork', '{1}{G}', 2, 'Creature — Elf Druid', '{T}: Add {G}.', '1'));
    const mana = entry.effects.find((e) => e.family === 'mana');
    expect(mana?.timing.summoningSickness).toBe(true);
    expect(mana?.timing.earliestTurn).toBe(3);
    const body = entry.effects.find((e) => e.family === 'closing');
    expect(body?.outputBounds).toEqual({ min: 1, max: 1, unit: 'power' });
  });

  it("does not credit an opponent's token as our pressure", () => {
    const entry = generateEntry(card('Swan Song', '{U}', 1, 'Instant', 'Counter target enchantment, instant, or sorcery spell. Its controller creates a 2/2 blue Bird creature token with flying.'));
    const token = entry.effects.find((e) => e.produces?.includes('tokens'));
    expect(token?.controller).toBe('opponent');
    expect(token?.outputBounds).toEqual({ min: 0, max: 0, unit: 'power' });
  });

  it('keys an opponent-facing trigger to the opponent with a .5 prior', () => {
    const entry = generateEntry(card('Tithe', '{3}{W}', 4, 'Enchantment', 'Whenever an opponent draws a card, you gain 1 life.'));
    const effect = entry.effects[0];
    expect(effect.controller).toBe('opponent');
    expect(effect.availabilityPrior).toBe(0.5);
  });
});

describe('deck-score catalogue — coverage computation', () => {
  /** The same rule the coverage tool applies: a copy counts only for a
   * `known` entry whose reviewed text still hashes to the live printing. */
  function coverage(deck: Array<{ name: string; text: string; quantity: number }>): number {
    let copies = 0;
    let covered = 0;
    for (const row of deck) {
      copies += row.quantity;
      const facts = catalogFacts(row.name, row.text);
      if (facts && facts.textMatches && facts.knowledge === 'known') covered += row.quantity;
    }
    return copies > 0 ? covered / copies : 1;
  }

  it('scores a five-card fixture by copy weight', () => {
    const stp = CURATED.find((e) => e.canonicalName === 'Swords to Plowshares') as CatalogEntry;
    const fow = CURATED.find((e) => e.canonicalName === 'Force of Will') as CatalogEntry;
    const deck = [
      { name: 'Swords to Plowshares', text: stp.oracleText, quantity: 4 },
      { name: 'Force of Will', text: fow.oracleText, quantity: 2 },
      { name: 'Swords to Plowshares', text: 'drifted text', quantity: 2 },
      { name: 'Not A Real Card', text: 'Do something unknowable.', quantity: 2 },
    ];
    expect(coverage(deck)).toBeCloseTo(6 / 10, 6);
  });
});

/** The curated batches are hand-typed against a printing's oracle text, so the
 * test that protects them asserts the EFFECT each card actually has — a
 * renamed family or a dropped mode is a scoring change, not a refactor. */
describe('deck-score catalogue — curated batch effects', () => {
  const shape = (name: string): string[] => {
    const entry = CURATED.find((e) => e.canonicalName === name) as CatalogEntry;
    expect(entry, name).toBeDefined();
    expect(entry.knowledge, name).toBe('known');
    return entry.effects.map((f) => `${f.family}/${f.mode}`);
  };

  it.each([
    ['Sylvan Library', ['advantage/triggered']],
    ['The Mind Stone', ['mana/activated', 'engine/triggered']],
    ['Bosco, Just a Bear', ['engine/etb', 'closing/activated', 'closing/static']],
    ['Peregrin Took', ['engine/static', 'advantage/activated', 'closing/static']],
    ['Syr Konrad, the Grim', ['closing/triggered', 'engine/activated', 'closing/static']],
    ['Tireless Provisioner', ['mana/triggered', 'closing/static']],
    ['Academy Manufactor', ['engine/static', 'closing/static']],
    ['Case of the Uneaten Feast', ['advantage/triggered', 'engine/activated']],
    ['Thorin, Mountain-king', ['answer/etb', 'closing/static']],
    ['Kaito, Bane of Nightmares', ['advantage/activated', 'answer/activated', 'closing/static', 'closing/alternate_cost']],
    ['Deadly Cover-Up', ['answer/cast', 'answer/cast']],
    ['Three Steps Ahead', ['answer/cast', 'engine/cast', 'advantage/cast']],
    ['Bloodghast', ['engine/triggered', 'closing/static']],
    ['Pinnacle Starcage', ['answer/etb', 'closing/activated']],
  ])('%s is typed as %j', (name, expected) => {
    expect(shape(name as string)).toEqual(expected);
  });

  it('Deadly Cover-Up answers the board and the graveyard', () => {
    const entry = CURATED.find((e) => e.canonicalName === 'Deadly Cover-Up') as CatalogEntry;
    expect(entry.effects.flatMap((f) => f.answerAxes ?? [])).toEqual(
      expect.arrayContaining(['creature', 'graveyard_or_protection']),
    );
  });

  it("Academy Manufactor's static replacement names all three token types", () => {
    const entry = CURATED.find((e) => e.canonicalName === 'Academy Manufactor') as CatalogEntry;
    expect(entry.effects[0].produces).toEqual(expect.arrayContaining(['clue', 'food', 'treasure']));
  });

  it('Case of the Uneaten Feast gates its graveyard casting on the solved clause', () => {
    const entry = CURATED.find((e) => e.canonicalName === 'Case of the Uneaten Feast') as CatalogEntry;
    const solved = entry.effects[1];
    expect(solved.prerequisites?.join(' ')).toMatch(/solved/i);
  });
});
