/**
 * Deck Score v1.3 stage 3 — docs/DECK_SCORE_SPEC.md §9 decision 5 and §9.6
 * step 3: the engine-family recipes (Food/Treasure/Clue conversion, go-wide
 * tokens, +1/+1 counters), the negative-cohort floor those families answer to,
 * and the cEDH closing-package support credit.
 */
import { describe, it, expect } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck } from '../deck-score';
import {
  selectPlan, evaluatePlan, evaluateClosing, closingRecipe, recipeFor, recipesFor,
  qBaselineFor, tutorReaches, tutorReachesInTwo, timelyStax,
  PLAN_RECIPES, CLOSING_SUPPORT_BAND, type PlanKey,
} from '../deck-score-plans';
import { Q_BASELINE, Q_BASELINE_ENGINE, Q_BASELINE_GENERIC_COMMANDER } from '../deck-score-norms';
import { deriveCardFeature } from '../deck-score-features';
import type { ClosingLine } from '../deck-score-win';
import { loadMatchedPiles } from '../../../scripts/deck-score-piles';
import { FIXTURES } from '../../../scripts/deck-score-fixtures';
import type { DeckEntry } from '../deck-score-mana';

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v13s3-${idCounter}-${overrides.name}`,
    oracle_id: `v13s3-oracle-${idCounter}`,
    mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: null,
    colors: '["G"]', color_identity: '["G"]', keywords: '[]',
    set_code: 'tst', set_name: 'Test Set', collector_number: String(idCounter), rarity: 'common',
    image_uri_small: null, image_uri_normal: null, image_uri_large: null, image_uri_art_crop: null,
    price_usd: null, price_usd_foil: null,
    legalities: '{"standard":"legal","commander":"legal","brawl":"legal","standardbrawl":"legal"}',
    power: '2', toughness: '2', loyalty: null, produced_mana: null, edhrec_rank: null,
    layout: 'normal', updated_at: '2024-01-01', subtypes: null, arena_id: null,
    ...overrides,
  };
}

type Row = { card: DbCard; quantity: number };

/** Synthetic cards carry no catalogue entry, so §8's evidence gate would give
 * them no on-plan credit. These suites test the PLAN layer; mark them covered,
 * exactly as the v1.2 and stage-2 suites do. */
function entriesOf(cards: Row[]): DeckEntry[] {
  return cards.map((c) => ({ feature: { ...deriveCardFeature(c.card), covered: true, s: 1 }, quantity: c.quantity }));
}

function many(count: number, tag: string, overrides: Partial<DbCard>): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({ name: `${tag} ${i}`, ...overrides }),
    quantity: 1,
  }));
}

const bodies = (n: number, tag: string, power = 3, cmc = 3): Row[] =>
  many(n, tag, { type_line: 'Creature — Bear', mana_cost: `{${cmc}}`, cmc, power: String(power), toughness: String(power) });
const draw = (n: number, tag: string): Row[] =>
  many(n, tag, { type_line: 'Sorcery', oracle_text: 'Draw a card.', mana_cost: '{1}', cmc: 1, power: null, toughness: null });
const lands = (n: number): Row[] =>
  many(n, 'Forest', { type_line: 'Basic Land — Forest', mana_cost: null, cmc: 0, oracle_text: null, power: null, toughness: null });

/** The ONE pile the floors are graded against, drawn exactly as
 * `scripts/deck-score-piles.ts` draws the acceptance cohort. */
function matchedPile(): { nonLand: DeckEntry[]; cmd: DeckEntry[]; N: number } {
  const pile = loadMatchedPiles(1, 2000, 0xf00d0000, 0.93)[0];
  const all: DeckEntry[] = pile.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
  return {
    nonLand: all.filter((e) => !e.feature.isLand),
    cmd: pile.input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 })),
    N: all.reduce((a, e) => a + e.quantity, 0),
  };
}

function fires(key: PlanKey, deck: DeckEntry[], N = 99): { Q: number; R: number; empty: boolean } {
  const e = evaluatePlan(recipeFor(key), N, deck, [], undefined, 'commander');
  return { Q: e.Q, R: e.R, empty: e.hasEmptyEssential };
}

// ── §9.6 step 3: one floor per recipe family ──────────────────────────────

describe('§9.6 step 3 — every recipe family answers to exactly one floor', () => {
  it('maps every recipe key, with no family left on an unmeasured default', () => {
    const generic: PlanKey[] = ['aggro', 'midrange', 'control'];
    const keys: PlanKey[] = [...PLAN_RECIPES.map((r) => r.key), 'typal', 'combo'];
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      const floor = qBaselineFor('commander', key);
      if (generic.includes(key)) expect(floor).toBe(Q_BASELINE_GENERIC_COMMANDER);
      else if (key === 'combo') expect(floor).toBe(Q_BASELINE);
      else expect(floor).toBe(Q_BASELINE_ENGINE);
      // A family carries the SAME floor in every Commander-family profile and
      // the untouched .30 in Standard (§9.1 owns that path).
      expect(qBaselineFor('brawl', key)).toBe(floor);
      expect(qBaselineFor('standard', key)).toBe(Q_BASELINE);
    }
  });

  it('freezes the engine floor at the MEASURED p95 of the per-pile maximum', () => {
    // `npx tsx scripts/deck-score-bands.ts negative --engine --n 1000`,
    // verify-2026-09-19/deck-score/engine-floor.txt: 1,000 land/curve/colour-
    // matched Commander controls at the cEDH cohort's .930 typed coverage.
    // ALL ENGINE (max per pile) p50 .480 / p90 .540 / p95 .559 / p99 .594.
    // The per-family p95s (aristocrats .507, lifegain .531, spells .554,
    // recursion .521, conversion .525, tokens .523, counters .540, typal .517)
    // were measured first and rejected: each bounds its OWN family at 5%, so
    // the union over eleven recipes is not bounded — 923/1000 S <= 5 in-sample
    // against 939/1000 for this single floor.
    expect(Q_BASELINE_ENGINE).toBe(0.559);
    expect(Q_BASELINE_ENGINE).toBeGreaterThan(Q_BASELINE_GENERIC_COMMANDER);
    expect(Q_BASELINE_ENGINE).toBeLessThan(0.70);
  });

  it('keeps the three v1.3 recipes off the Standard path', () => {
    const commanderOnly = PLAN_RECIPES.filter((r) => r.commanderOnly).map((r) => r.key);
    expect(commanderOnly).toEqual(['conversion', 'tokens', 'counters']);
    const std = recipesFor('standard').map((r) => r.key);
    for (const key of commanderOnly) expect(std).not.toContain(key);
    expect(recipesFor('commander').map((r) => r.key)).toEqual(PLAN_RECIPES.map((r) => r.key));
  });
});

// ── §9.6 step 3: the three new engine recipes ─────────────────────────────

describe('conversion — Food/Treasure/Clue produced, then spent', () => {
  const converters = many(8, 'Cook', {
    type_line: 'Creature — Chef', mana_cost: '{2}', cmc: 2, power: '2', toughness: '2',
    oracle_text: 'Sacrifice a Food: Draw a card.',
  });
  const producers = many(12, 'Baker', {
    type_line: 'Creature — Baker', mana_cost: '{3}', cmc: 3, power: '2', toughness: '2',
    oracle_text: 'When this creature enters, create a Food token.',
  });
  const output = many(8, 'Stomper', {
    type_line: 'Creature — Beast', mana_cost: '{3}', cmc: 3, power: '4', toughness: '4', oracle_text: null,
  });

  it('fires on a typed producer/converter/output list', () => {
    const deck = entriesOf([...converters, ...producers, ...output, ...draw(6, 'Opt'), ...lands(33)]);
    const nonLand = deck.filter((e) => !e.feature.isLand);
    const r = fires('conversion', nonLand);
    expect(r.empty).toBe(false);
    expect(r.R).toBe(1);
    expect(r.Q).toBeGreaterThan(Q_BASELINE_ENGINE);
    expect(selectPlan(99, nonLand, [], undefined, 'commander').recipe.key).toBe('conversion');
  });

  it('does NOT fire on a matched negative control', () => {
    const pile = matchedPile();
    const e = evaluatePlan(recipeFor('conversion'), pile.N, pile.nonLand, pile.cmd, undefined, 'commander');
    // Either the pile holds no piece of some essential role, or its supply
    // falls short of the measured floor — never a fully supplied engine.
    expect(e.hasEmptyEssential || e.R < 1 || e.Q <= Q_BASELINE_ENGINE).toBe(true);
  });

  it('bounds producers by the converters that spend them', () => {
    // Twelve Food makers beside ONE converter is not twelve units of plan:
    // §8's servedBy rule caps useful supply at 3 per converter copy.
    const one = entriesOf([...converters.slice(0, 1), ...producers, ...output, ...lands(33)])
      .filter((e) => !e.feature.isLand);
    const evaluation = evaluatePlan(recipeFor('conversion'), 99, one, [], undefined, 'commander');
    expect(evaluation.roles.find((r) => r.role.key === 'producers')?.supply).toBe(3);
  });
});

describe('tokens — a wide board converted by an anthem or an outlet', () => {
  const payoff = many(8, 'Anthem', {
    type_line: 'Enchantment', mana_cost: '{3}', cmc: 3, power: null, toughness: null,
    oracle_text: 'Creatures you control get +1/+1.',
  });
  const makers = many(10, 'Swarmer', {
    type_line: 'Creature — Elf', mana_cost: '{3}', cmc: 3, power: '2', toughness: '2',
    oracle_text: 'When this creature enters, create two 1/1 green Elf creature tokens.',
  });

  it('fires on a typed maker/payoff/value list', () => {
    const deck = entriesOf([...payoff, ...makers, ...draw(10, 'Harmonize'), ...lands(33)])
      .filter((e) => !e.feature.isLand);
    const r = fires('tokens', deck);
    expect(r.empty).toBe(false);
    expect(r.R).toBe(1);
    expect(selectPlan(99, deck, [], undefined, 'commander').recipe.key).toBe('tokens');
  });

  it('does NOT fire on a matched negative control', () => {
    const pile = matchedPile();
    const e = evaluatePlan(recipeFor('tokens'), pile.N, pile.nonLand, pile.cmd, undefined, 'commander');
    expect(e.hasEmptyEssential || e.R < 1 || e.Q <= Q_BASELINE_ENGINE).toBe(true);
  });
});

describe('counters — +1/+1 counters placed on bodies that read them', () => {
  const payoff = many(6, 'Reader', {
    type_line: 'Creature — Wizard', mana_cost: '{3}', cmc: 3, power: '2', toughness: '2',
    oracle_text: 'This creature gets +1/+0 for each +1/+1 counter on creatures you control.',
  });
  const sources = many(10, 'Placer', {
    type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null,
    oracle_text: 'Put two +1/+1 counters on target creature.',
  });

  it('fires on a typed payoff/source/carrier list', () => {
    const deck = entriesOf([...payoff, ...sources, ...bodies(10, 'Carrier', 3, 3), ...draw(4, 'Opt'), ...lands(33)])
      .filter((e) => !e.feature.isLand);
    const r = fires('counters', deck);
    expect(r.empty).toBe(false);
    expect(r.R).toBe(1);
  });

  it('refuses a creature that merely CARRIES a counter as a payoff', () => {
    // The first predicate set accepted "counters on it", undying, persist and
    // evolve, so the Cabbage paper list read as a counters deck at Q .711
    // instead of the Food engine it plays. A payoff reads the COUNT.
    const carrier = deriveCardFeature(mkCard({
      name: 'Undying Bear', oracle_text: 'Undying. This creature enters with a +1/+1 counter on it.',
    }));
    const reader = deriveCardFeature(mkCard({
      name: 'Count Reader', oracle_text: 'Whenever one or more +1/+1 counters are put on a creature you control, draw a card.',
    }));
    const payoffRole = recipeFor('counters').roles.find((r) => r.key === 'payoff')!;
    expect(payoffRole.fills(carrier)).toBe(false);
    expect(payoffRole.fills(reader)).toBe(true);
  });

  it('does NOT fire on a matched negative control', () => {
    const pile = matchedPile();
    const e = evaluatePlan(recipeFor('counters'), pile.N, pile.nonLand, pile.cmd, undefined, 'commander');
    expect(e.hasEmptyEssential || e.R < 1 || e.Q <= Q_BASELINE_ENGINE).toBe(true);
  });
});

// ── §9.5 closing-package support credit ───────────────────────────────────

const LINE: ClosingLine = {
  id: 'combo:test', label: 'Test line', pieces: ['Engine Piece', 'Second Piece'],
  required: 2, cost: 5, tStar: 4,
};

const piece = (name: string): DbCard => mkCard({
  name, type_line: 'Artifact', mana_cost: '{2}', cmc: 2, power: null, toughness: null,
  oracle_text: 'It does the combo thing.',
});

function tutorsRole(pieces: DbCard[], pool: DbCard[] = []) {
  const feats = pieces.map((c) => ({ ...deriveCardFeature(c), covered: true, s: 1 }));
  const poolFeats = pool.map((c) => ({ ...deriveCardFeature(c), covered: true, s: 1 }));
  return closingRecipe(LINE, feats, [...feats, ...poolFeats]).roles.find((r) => r.key === 'tutors')!;
}

describe('§9.5 proved support paths', () => {
  const presentPieces = [piece('Engine Piece'), piece('Second Piece')];

  it('credits a tutor that reaches a PRESENT piece, once', () => {
    const tutor = { ...deriveCardFeature(mkCard({
      name: 'Fabricate', type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, power: null, toughness: null,
      oracle_text: 'Search your library for an Artifact card, reveal it, put it into your hand, then shuffle.',
    })), covered: true, s: 1 };
    const role = tutorsRole(presentPieces);
    expect(role.fills(tutor)).toBe(true);
    // "Shared tutors count once" is `evaluatePlan`'s first-match assignment:
    // the same copy fills `tutors` whether it reaches one piece or both.
    const deck = entriesOf([
      { card: presentPieces[0], quantity: 1 }, { card: presentPieces[1], quantity: 1 },
      { card: tutor.card, quantity: 1 },
    ]);
    const evaluation = evaluateClosing(LINE, deck, [], undefined, 'commander');
    expect(evaluation.roles.find((r) => r.role.key === 'tutors')?.supply).toBe(1);
  });

  it('credits nothing for a tutor that can only reach an ABSENT piece', () => {
    // The filter names a type no present piece carries.
    const tutor = { ...deriveCardFeature(mkCard({
      name: 'Worldly Tutor', type_line: 'Instant', mana_cost: '{G}', cmc: 1, power: null, toughness: null,
      oracle_text: 'Search your library for a Creature card, reveal it, then shuffle and put that card on top.',
    })), covered: true, s: 1 };
    expect(tutorsRole(presentPieces).fills(tutor)).toBe(false);
  });

  it('refuses a tutor whose DESTINATION is the graveyard', () => {
    const mill = { ...deriveCardFeature(mkCard({
      name: 'Entomb', type_line: 'Instant', mana_cost: '{B}', cmc: 1, power: null, toughness: null,
      oracle_text: 'Search your library for an Artifact card, put it into your graveyard, then shuffle.',
    })), covered: true, s: 1 };
    expect(tutorsRole(presentPieces).fills(mill)).toBe(false);
  });

  it('refuses a tutor too slow for the line, and stops at two hops', () => {
    const feats = presentPieces.map((c) => ({ ...deriveCardFeature(c), covered: true, s: 1 }));
    const slow = { ...deriveCardFeature(mkCard({
      name: 'Diabolic Revelation', type_line: 'Sorcery', mana_cost: '{6}', cmc: 6, power: null, toughness: null,
      oracle_text: 'Search your library for an Artifact card, put it into your hand, then shuffle.',
    })), covered: true, s: 1 };
    // tStar 4: a six-mana tutor cannot be cast in time.
    expect(tutorReaches(slow, feats, LINE.tStar)).toBe(false);

    const hopOne = { ...deriveCardFeature(mkCard({
      name: 'Hop One', type_line: 'Sorcery', mana_cost: '{1}', cmc: 1, power: null, toughness: null,
      oracle_text: 'Search your library for an Artifact card, put it into your hand, then shuffle.',
    })), covered: true, s: 1 };
    const hopTwo = { ...deriveCardFeature(mkCard({
      name: 'Hop Two', type_line: 'Instant', mana_cost: '{1}', cmc: 1, power: null, toughness: null,
      oracle_text: 'Search your library for a Sorcery card, put it into your hand, then shuffle.',
    })), covered: true, s: 1 };
    // Hop two reaches the pieces only THROUGH hop one, and only when both
    // costs fit the clock; with no hop-1 set it reaches nothing.
    expect(tutorReaches(hopTwo, feats, LINE.tStar)).toBe(false);
    expect(tutorReachesInTwo(hopTwo, feats, [hopOne], LINE.tStar)).toBe(true);
    expect(tutorReachesInTwo(hopTwo, feats, [hopOne], 1)).toBe(false);
    // Hop THREE — a tutor that only finds hop two — is never admitted, because
    // hop two is not in the hop-one set.
    const hopThree = { ...deriveCardFeature(mkCard({
      name: 'Hop Three', type_line: 'Sorcery', mana_cost: '{1}', cmc: 1, power: null, toughness: null,
      oracle_text: 'Search your library for an Instant card, put it into your hand, then shuffle.',
    })), covered: true, s: 1 };
    expect(tutorReachesInTwo(hopThree, feats, [hopOne], LINE.tStar)).toBe(false);
  });

  it('credits line-compatible protection and recovery, not an unrelated body', () => {
    const recipe = closingRecipe(LINE, presentPieces.map((c) => ({ ...deriveCardFeature(c), covered: true, s: 1 })));
    const protection = recipe.roles.find((r) => r.key === 'protection')!;
    const counter = deriveCardFeature(mkCard({
      name: 'Counterspell', type_line: 'Instant', mana_cost: '{U}{U}', cmc: 2, power: null, toughness: null,
      oracle_text: 'Counter target spell.',
    }));
    const recovery = deriveCardFeature(mkCard({
      name: 'Regrowth', type_line: 'Sorcery', mana_cost: '{1}{G}', cmc: 2, power: null, toughness: null,
      oracle_text: 'Return target artifact card from your graveyard to the battlefield.',
    }));
    const vanilla = deriveCardFeature(mkCard({ name: 'Grizzly Bears' }));
    expect(protection.fills(counter)).toBe(true);
    expect(protection.fills(recovery)).toBe(true);
    expect(protection.fills(vanilla)).toBe(false);
  });

  it('credits timely stax that binds opponents, not a symmetric wall with no exit', () => {
    const tax = deriveCardFeature(mkCard({
      name: 'Thalia', type_line: 'Creature — Human Soldier', mana_cost: '{1}{W}', cmc: 2, power: '2', toughness: '1',
      oracle_text: 'Noncreature spells cost {1} more to cast.',
    }));
    const opponentLock = deriveCardFeature(mkCard({
      name: 'Rule of Law', type_line: 'Enchantment', mana_cost: '{2}{W}', cmc: 3, power: null, toughness: null,
      // Singular "each player can't" is the printed wording of the symmetric
      // locks; the first predicate only read the plural and missed all of them.
      oracle_text: "Each player can't cast more than one spell each turn.",
    }));
    const notStax = deriveCardFeature(mkCard({
      name: 'Divination', type_line: 'Sorcery', mana_cost: '{2}{U}', cmc: 3, power: null, toughness: null,
      oracle_text: 'Draw two cards.',
    }));
    expect(timelyStax(tax, LINE.tStar)).toBe(true);
    expect(timelyStax(opponentLock, LINE.tStar)).toBe(true);
    expect(timelyStax(notStax, LINE.tStar)).toBe(false);
    // Timely: the same tax past the line's own clock earns nothing.
    expect(timelyStax(opponentLock, 2)).toBe(false);
  });

  it('freezes the support bands measured on the cEDH TRAINING split', () => {
    // `npx tsx scripts/deck-score-bands.ts closing` — 18 of the 20 training
    // lists assemble a line; the 10 holdout lists never entered a band.
    // p90: tutors 11, acceleration 23, protection 10, stax 3, selection 11.
    expect(CLOSING_SUPPORT_BAND).toEqual({
      tutors: { min: 2, max: 11 },
      acceleration: { max: 23 },
      protection: { min: 2, max: 10 },
      stax: { max: 3 },
      selection: { max: 11 },
    });
  });

  it('admits a complete backup line into the same pieces role', () => {
    const backup: ClosingLine = {
      id: 'combo:backup', label: 'Backup line', pieces: ['Backup A', 'Backup B'],
      required: 2, cost: 4, tStar: 4,
    };
    const deck = entriesOf([
      { card: presentPieces[0], quantity: 1 }, { card: presentPieces[1], quantity: 1 },
      { card: piece('Backup A'), quantity: 1 }, { card: piece('Backup B'), quantity: 1 },
    ]);
    const rooted = evaluateClosing(LINE, deck, [], undefined, 'commander');
    const withBackup = evaluateClosing(LINE, deck, [], undefined, 'commander', [backup]);
    expect(rooted.roles.find((r) => r.role.key === 'pieces')?.supply).toBe(2);
    expect(withBackup.roles.find((r) => r.role.key === 'pieces')?.supply).toBe(4);
    // Each copy still earns at most ONE Q unit: four pieces, four credits.
    expect(withBackup.roles.find((r) => r.role.key === 'pieces')?.credited).toBe(4);
  });
});

// ── Fixture-backed acceptance ─────────────────────────────────────────────

describe('stage 3 acceptance, fixture-backed', () => {
  it('reads the Cabbage paper list as its Food engine, inside 55-70', () => {
    const spec = FIXTURES.find((f) => f.name === 'the-cabbage-merchant')!;
    const { input } = spec.load();
    const result = scoreDeck(input);
    const all: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const nonLand = all.filter((e) => !e.feature.isLand);
    const cmd = input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
    const N = all.reduce((a, e) => a + e.quantity, 0);
    const plan = selectPlan(Math.max(1, N), nonLand, cmd, undefined, 'commander');
    // Stage 2 read it as generic midrange at Q .600 and scored 49, out of band.
    expect(plan.recipe.key).toBe('conversion');
    expect(plan.Q).toBeCloseTo(0.649, 3);
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.score).toBeLessThanOrEqual(70);
  });

  it('keeps the 101-card Brawl Cabbage list on its legality cap', () => {
    const spec = FIXTURES.find((f) => f.name === 'cabbage-merchant-current-brawl')!;
    expect(scoreDeck(spec.load().input).score).toBeLessThanOrEqual(19);
  });

  it('pins the cEDH holdout median at or above 85', () => {
    // `npx tsx scripts/deck-score-bands.ts cedh`: the last 10 of the 30
    // reviewed lists, which never entered a support band — total median 90,
    // S median 94.1, combo Q median .676 (§9.5 forecasts .66-.70).
    const spec = FIXTURES.find((f) => f.name === 'cedhtop16-ballooncon6')!;
    const result = scoreDeck(spec.load().input);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.score).toBeLessThanOrEqual(95);
    expect(result.components.find((c) => c.key === 'synergy')?.score).toBeGreaterThanOrEqual(84.6);
  });

  it('pins ten fresh matched controls, including the S leaks that still FAIL', () => {
    // Full run, `npx tsx scripts/deck-score-bands.ts controls`: 199/200 total
    // < 25 and 175/200 S <= 5 on the contiguous slice (22 commanders);
    // `--stride` over the same held-out region with 162 commanders gives
    // 193/200 and 187/200. Both S counts miss the >= 190 target, and the
    // residual is the GENERIC trio's own 5% tail, not an engine read — so this
    // pins the leaks rather than asserting an acceptance the stage did not
    // reach. Four of these ten leak; the total gate holds on all ten.
    const controls = loadMatchedPiles(10, 2000, 0xf00d0000, 0.93);
    const scored = controls.map((c) => scoreDeck(c.input));
    const syn = scored.map((r) => Number((r.components.find((c) => c.key === 'synergy')?.score ?? 0).toFixed(1)));
    expect(scored.map((r) => r.score)).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
    expect(syn).toEqual([0, 0, 0, 8.6, 0, 6.2, 0, 0, 24.5, 20.1]);
    expect(syn.filter((v) => v <= 5).length).toBe(6);
  });

  it('never reads a closing plan on a matched control', () => {
    // §9.5 "the current 0/200 closing-plan pile reads should stay zero".
    const controls = loadMatchedPiles(20, 2000, 0xf00d0000, 0.93);
    for (const c of controls) {
      const all: DeckEntry[] = c.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
      const nonLand = all.filter((e) => !e.feature.isLand);
      const cmd = c.input.commander.map((x) => ({ feature: deriveCardFeature(x), quantity: 1 }));
      const N = all.reduce((a, e) => a + e.quantity, 0);
      expect(selectPlan(Math.max(1, N), nonLand, cmd, undefined, 'commander').recipe.key).not.toBe('combo');
    }
  });
});
