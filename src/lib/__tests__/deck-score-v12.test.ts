/**
 * Deck Score v1.2 (docs/DECK_SCORE_SPEC.md §8) — the slice-A changes:
 * the multiplicative S formula, single-plan Q counting, generic plan
 * inference, renormalised meta-free weights, the evidence gate that replaced
 * the mechanical 69 cap, and the typed-effect catalogue seam.
 */
import { describe, it, expect } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck, type DeckScoreInput } from '../deck-score';
import { WEIGHTS, weightsFor, Q_BASELINE, Q_SATURATION, type ScoreFormat } from '../deck-score-norms';
import { computeSynergy } from '../deck-score-synergy';
import {
  selectPlan, evaluatePlan, recipeFor, deploymentBudget, betterPlan, planFit, evaluateClosing, closingRecipe,
  typalTheme, typalRecipe, subtypesOf,
  COMMANDER_BAND_REFERENCE, PLAN_RECIPES,
} from '../deck-score-plans';
import { computeWin } from '../deck-score-win';
import { normsFor } from '../deck-score-norms';
import { catalogFacts, CATALOG_SIZE, oracleHash } from '../deck-score-catalog';
import { deriveCardFeature } from '../deck-score-features';
import { producerUtilisation } from '../deck-score-producers';
import type { DeckEntry } from '../deck-score-mana';

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v12-${idCounter}-${overrides.name}`,
    oracle_id: `v12-oracle-${idCounter}`,
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

function forest(quantity = 1): { card: DbCard; quantity: number } {
  return { card: mkCard({ name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: null, cmc: 0, power: null, toughness: null, colors: null }), quantity };
}

function creatures(count: number, power: number, cmc: number, tag = 'Body'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${power}p ${i}`, type_line: 'Creature — Bear',
      mana_cost: cmc === 0 ? null : `{${cmc}}`, cmc,
      power: String(power), toughness: String(Math.max(1, power)),
    }),
    quantity: 1,
  }));
}

function removal(count: number, cmc: number, tag = 'Zap'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${cmc} ${i}`, type_line: 'Instant', oracle_text: 'Destroy target creature.',
      mana_cost: `{${cmc}}`, cmc, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function cantrips(count: number, cmc = 1, tag = 'Peek'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Sorcery', oracle_text: 'Draw a card.',
      mana_cost: `{${cmc}}`, cmc, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function burn(count: number, tag = 'Bolt'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Instant', oracle_text: 'This spell deals 3 damage to any target.',
      mana_cost: '{R}', cmc: 1, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

/**
 * Synthetic cards are not in the typed catalogue, so `covered` is false and
 * v1.2's evidence gate would give every one of them zero on-plan credit.
 * These suites test the PLAN layer; mark them covered and supported, and let
 * `entriesOfUncovered` exercise the evidence gate on its own.
 *
 * `s` is forced for the same reason `covered` is. A few fixtures borrow a
 * REAL card name (`THORACLE`) with hand-written oracle text, which is a
 * catalogue version mismatch — correctly unsupported once the printing no
 * longer hashes to the reviewed text, and irrelevant to a plan-layer test.
 */
function entriesOf(cards: Array<{ card: DbCard; quantity: number }>): DeckEntry[] {
  return cards.map((c) => ({ feature: { ...deriveCardFeature(c.card), covered: true, s: 1 }, quantity: c.quantity }));
}

function entriesOfUncovered(cards: Array<{ card: DbCard; quantity: number }>): DeckEntry[] {
  return cards.map((c) => ({ feature: deriveCardFeature(c.card), quantity: c.quantity }));
}

function standardDeck(main: Array<{ card: DbCard; quantity: number }>): DeckScoreInput {
  return { format: 'standard', main, commander: [], sideboard: [], unresolved: [], cardDataVersion: 'test-v12', corpus: null };
}

// ── S = 100 * clip((Q-.30)/(.70-.30)) * R * B ─────────────────────────────

describe('computeSynergy v1.2 — the multiplicative S formula', () => {
  it('is 0 when Q is at or below the .30 unstructured baseline', () => {
    const deck = entriesOf([...creatures(4, 3, 2, 'OnPlan'), ...creatures(36, 0, 9, 'Junk')]);
    const out = computeSynergy(null, 60, deck);
    expect(out.Q).toBeLessThanOrEqual(Q_BASELINE);
    expect(out.score).toBe(0);
  });

  it('is 0 when an essential role is missing, however high Q is (R=0)', () => {
    const deck = entriesOf(creatures(30, 3, 3, 'Beater'));
    const out = computeSynergy(null, 60, deck);
    expect(out.Q).toBeGreaterThan(Q_BASELINE);
    expect(out.R).toBe(0);
    expect(out.score).toBe(0);
  });

  it('equals 100*coherence*R*B and never exceeds 100 at saturation', () => {
    const deck = entriesOf([...creatures(14, 3, 3, 'Beater'), ...removal(10, 2), ...cantrips(10)]);
    const out = computeSynergy(null, 60, deck);
    expect(out.Q).toBeGreaterThanOrEqual(Q_SATURATION);
    expect(out.score).toBeCloseTo(100 * out.R * out.B, 6);
    expect(out.score).toBeLessThanOrEqual(100);
  });
});

// ── Q counts each copy once, toward one plan ──────────────────────────────

describe('evaluatePlan v1.2 — one copy, one role, one plan', () => {
  it('assigns a card that fills two roles to exactly one of them', () => {
    const dual = mkCard({
      name: 'Dual Role Bear', type_line: 'Creature — Bear',
      oracle_text: 'When this creature enters, draw a card.',
      mana_cost: '{1}{G}', cmc: 2, power: '3', toughness: '3',
    });
    const evaluation = evaluatePlan(recipeFor('midrange'), 60, entriesOf([{ card: dual, quantity: 4 }]));
    expect(evaluation.roles.reduce((s, r) => s + r.supply, 0)).toBe(4);
    expect(evaluation.Q).toBeLessThanOrEqual(1);
  });

  it('gives an unknown-mechanic copy no on-plan credit but keeps it in F', () => {
    const known = creatures(10, 3, 3, 'Known');
    const unknownCards = Array.from({ length: 10 }, (_, i) => ({
      card: mkCard({
        name: `Unknown ${i}`, type_line: 'Creature — Bear', mana_cost: '{2}{G}', cmc: 3,
        power: null, toughness: null,
        oracle_text: 'Some long rules text that no catalogue entry or regex identifies at all.',
      }),
      quantity: 1,
    }));
    const withUnknown = evaluatePlan(recipeFor('midrange'), 60, entriesOf([...known, ...unknownCards]));
    const withoutUnknown = evaluatePlan(recipeFor('midrange'), 60, entriesOf(known));
    expect(withUnknown.Q).toBeLessThan(withoutUnknown.Q);
    expect(withUnknown.roles.find((r) => r.role.key === 'threats')!.supply).toBe(10);
  });

  it('bounds infrastructure Q mass by the direct plan mass it serves', () => {
    const rocks = Array.from({ length: 20 }, (_, i) => ({
      card: mkCard({ name: `Rock ${i}`, type_line: 'Artifact', oracle_text: 'Add one mana of any color.', mana_cost: '{2}', cmc: 2, power: null, toughness: null }),
      quantity: 1,
    }));
    const fixing = evaluatePlan(recipeFor('midrange'), 60, entriesOf(rocks)).roles.find((r) => r.role.key === 'fixing')!;
    expect(fixing.supply).toBe(20);
    expect(fixing.credited).toBe(0);
  });
});

// ── Generic plan inference on a 60-card list ──────────────────────────────

describe('selectPlan v1.2 — inference from the whole deck', () => {
  it('reads a creature-and-burn list as aggro, not the midrange fallback', () => {
    const plan = selectPlan(60, entriesOf([...creatures(16, 2, 2, 'Goblin'), ...burn(8), ...cantrips(4)]));
    expect(plan.recipe.key).toBe('aggro');
  });

  it('scoreDeck no longer labels every commanderless Standard deck midrange', () => {
    const result = scoreDeck(standardDeck([forest(24), ...creatures(20, 2, 2, 'Rush'), ...burn(12), ...cantrips(4)]));
    const synergy = result.components.find((c) => c.key === 'synergy')!;
    expect(synergy.reason).toContain('aggro');
    expect(synergy.reason).not.toContain('midrange');
  });

  it('every recipe declares an essential role and an ordered band', () => {
    for (const recipe of PLAN_RECIPES) {
      expect(recipe.roles.some((r) => r.essential)).toBe(true);
      for (const role of recipe.roles) expect(role.max).toBeGreaterThanOrEqual(role.min);
    }
  });
});

// ── Renormalised, snapshot-independent weights ────────────────────────────

describe('v1.2 weights — meta at 0, core renormalised once per profile', () => {
  const formats: Array<[ScoreFormat, keyof typeof WEIGHTS]> = [
    ['commander', 'commander'], ['brawl', 'brawl'], ['standard', 'standard'],
  ];

  it.each(formats)('%s zeroes meta, divides by (1-w_meta), and still sums to 100', (format, profile) => {
    const w = weightsFor(format);
    expect(w.meta).toBe(0);
    expect(w.structure).toBe(0);
    const divisor = 1 - WEIGHTS[profile].meta / 100;
    expect(w.mana).toBeCloseTo(WEIGHTS[profile].mana / divisor, 9);
    expect(w.synergy).toBeCloseTo(WEIGHTS[profile].synergy / divisor, 9);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });

  it('does not change when a corpus snapshot is supplied or removed', () => {
    const main = [forest(24), ...creatures(20, 2, 2, 'Rush'), ...burn(12), ...cantrips(4)];
    const snapshot = { id: 'snap', asOf: '2026-09-20', format: 'standard' as const, cardsByContext: {}, archetypes: [] };
    const withSnapshot = scoreDeck({ ...standardDeck(main), corpus: snapshot });
    const without = scoreDeck(standardDeck(main));
    expect(withSnapshot.components.map((c) => c.weight)).toEqual(without.components.map((c) => c.weight));
  });
});

// ── The typed-effect catalogue seam ───────────────────────────────────────

describe('deck-score catalogue — a typed entry beats the regex fallback', () => {
  it('ships seed entries and hashes their reviewed oracle text', () => {
    expect(CATALOG_SIZE).toBeGreaterThan(0);
    const facts = catalogFacts('Rhystic Study', 'Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.');
    expect(facts?.textMatches).toBe(true);
    expect(facts?.families.has('advantage')).toBe(true);
    expect(facts?.availability).toBe(0.5);
  });

  it('marks a catalogued card covered and supported where no regex identifies it', () => {
    const dramatic = deriveCardFeature(mkCard({
      name: 'Dramatic Reversal', type_line: 'Instant',
      oracle_text: 'Untap all nonland permanents you control.',
      mana_cost: '{1}{U}', cmc: 2, power: null, toughness: null,
    }));
    expect(dramatic.covered).toBe(true);
    expect(dramatic.s).toBe(1);
    expect(dramatic.isRamp).toBe(true);
  });

  it('falls back to the regex path when the live oracle text has drifted', () => {
    const drifted = deriveCardFeature(mkCard({
      name: 'Dramatic Reversal', type_line: 'Instant',
      oracle_text: 'Untap all nonland permanents you control. Then something new happened in errata.',
      mana_cost: '{1}{U}', cmc: 2, power: null, toughness: null,
    }));
    expect(drifted.covered).toBe(false);
    expect(oracleHash('a  b')).toBe(oracleHash('A B'));
  });
});

// ── The evidence gate ─────────────────────────────────────────────────────

describe('scoreDeck v1.2 — the evidence gate replaced the mechanical 69 cap', () => {
  it('reports typed coverage with no cap and marks the total provisional', () => {
    const result = scoreDeck(standardDeck([forest(24), ...creatures(20, 2, 2, 'Rush'), ...burn(12), ...cantrips(4)]));
    const coverage = result.gates.find((g) => g.key === 'coverage')!;
    expect(coverage.kind).toBe('evidence');
    expect(coverage.cap).toBeNull();
    expect(coverage.reason).toMatch(/typed in the effect catalogue/);
    expect(result.provisional).toBe(true);
    expect(result.gates.map((g) => g.cap)).not.toContain(69);
  });
});


// ── §8 output/deployment bins and the engine families (pile separation) ────
//
// These cover the v1.2 "pile separation belongs to S" repair: a threat has to
// clear an output bin and a deployment deadline, infrastructure is bounded by
// the essential mass it serves, and the three engine recipes recognise the
// plans the generic aggro/midrange/control trio cannot describe.

function noncreature(count: number, cmc: number, text: string, tag: string, type = 'Artifact'): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: type, oracle_text: text,
      mana_cost: `{${cmc}}`, cmc, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

describe('§8 output bin — a body, keyword or tag alone is not a threat', () => {
  it('credits a creature-token maker as pressure but never a Treasure maker', () => {
    const recipe = recipeFor('aggro');
    const pressure = recipe.roles.find((r) => r.key === 'pressure')!;
    const soldiers = deriveCardFeature(mkCard({
      name: 'Soldier Factory', type_line: 'Artifact', mana_cost: '{2}', cmc: 2,
      oracle_text: 'At the beginning of your end step, create a 1/1 white Soldier creature token.',
      power: null, toughness: null,
    }));
    const treasure = deriveCardFeature(mkCard({
      name: 'Coin Press', type_line: 'Artifact', mana_cost: '{2}', cmc: 2,
      oracle_text: 'At the beginning of your end step, create a Treasure token.',
      power: null, toughness: null,
    }));
    expect(soldiers.isCreatureTokenProducer).toBe(true);
    expect(treasure.isTokenProducer).toBe(true);
    expect(treasure.isCreatureTokenProducer).toBe(false);
    expect(pressure.fills(soldiers)).toBe(true);
    expect(pressure.fills(treasure)).toBe(false);
  });

  it('rejects a body that does not pay for itself against the plan clock', () => {
    const recipe = recipeFor('aggro');
    const pressure = recipe.roles.find((r) => r.key === 'pressure')!;
    const onCurve = deriveCardFeature(creatures(1, 2, 2, 'OnCurve')[0].card);
    const overpriced = deriveCardFeature(creatures(1, 2, 3, 'Overpriced')[0].card);
    expect(pressure.fills(onCurve)).toBe(true);
    expect(pressure.fills(overpriced)).toBe(false);
  });

  it('gives a body-only creature list no on-plan credit at all', () => {
    // 36 vanilla 1/1s for two: every recipe's threat/fodder-free essentials
    // are unmet, so R collapses and S is 0 however many bodies there are.
    const out = computeSynergy(null, 60, entriesOf([forest(24), ...creatures(36, 1, 2, 'Vanilla')]));
    expect(out.plan.roles.filter((r) => r.role.essential && r.supply > 0 && r.role.key !== 'fodder')).toHaveLength(0);
    expect(out.R).toBe(0);
    expect(out.score).toBe(0);
  });
});

describe('§8 deployment deadline — castable by the plan turn, or no credit', () => {
  it('scales the budget with the deck\'s own land density', () => {
    expect(deploymentBudget(60, 24)(3)).toBeCloseTo(3, 6);
    expect(deploymentBudget(60, 10)(3)).toBeCloseTo(10 / 60 * 10, 6);
  });

  it('refuses the modal Standard five-drop at its own deadline (known level defect)', () => {
    // Pinned so the cost of the current formula is visible, not so it is
    // endorsed. 24 lands in 60 gives 4.80 at turn 5, so `c <= 4.80` refuses
    // every five-drop even though those decks demonstrably cast them, and 45
    // of the 69 Standard tournament lists scoring S = 0 have a fully supplied
    // recipe once the deadline stops truncating. The hypergeometric-median
    // replacement was measured and reverted: it moved the held-out Standard
    // median not at all (43) and cost 11 piles. See `deploymentBudget`.
    expect(deploymentBudget(60, 24)(5)).toBeLessThan(5);
    expect(deploymentBudget(60, 24)(5)).toBeGreaterThan(4);
  });

  it('withdraws pressure credit from an identical list that cannot cast it', () => {
    // The SAME 36 nonland cards, scored once as a 60-card list (24 lands) and
    // once as a 44-card list (8 lands). Only the deck's own mana changed.
    const nonLand = entriesOf([...creatures(12, 2, 2, 'Rush'), ...burn(8), ...cantrips(8), ...removal(8, 2)]);
    const fine = evaluatePlan(recipeFor('aggro'), 60, nonLand);
    const landLight = evaluatePlan(recipeFor('aggro'), 44, nonLand);
    expect(deploymentBudget(60, 24)(3)).toBeGreaterThanOrEqual(2);
    expect(deploymentBudget(44, 8)(3)).toBeLessThan(2);
    expect(fine.roles.find((r) => r.role.key === 'pressure')!.supply).toBe(12);
    expect(landLight.roles.find((r) => r.role.key === 'pressure')!.supply).toBe(0);
  });
});

describe('§8 R and bounded infrastructure', () => {
  it('drops R below 1 as soon as one essential is under its floor', () => {
    const recipe = recipeFor('midrange');
    const short = evaluatePlan(recipe, 60, entriesOf([
      ...creatures(8, 4, 4, 'Threat'), ...removal(1, 2), ...cantrips(8),
    ]));
    const answers = short.roles.find((r) => r.role.key === 'answers')!;
    expect(answers.supply).toBeLessThan(answers.required);
    expect(short.R).toBeLessThan(1);
    expect(short.R).toBeCloseTo(answers.supply / answers.required, 6);
    expect(short.essentialFraction).toBeLessThan(1);
  });

  it('never credits infrastructure more Q mass than the essentials it serves', () => {
    const rocks = noncreature(20, 2, 'Add one mana of any color.', 'Rock');
    const evaluation = evaluatePlan(recipeFor('midrange'), 60, entriesOf([
      ...rocks, ...creatures(4, 4, 4, 'Threat'), ...removal(3, 2), ...cantrips(3),
    ]));
    const fixing = evaluation.roles.find((r) => r.role.key === 'fixing')!;
    const essential = evaluation.roles.filter((r) => r.role.essential).reduce((s, r) => s + r.credited, 0);
    expect(fixing.supply).toBeGreaterThan(essential);
    expect(fixing.credited).toBeLessThanOrEqual(essential);
  });
});

describe('§8 engine families — plans the generic trio cannot describe', () => {
  it('reads a sacrifice engine as aristocrats, not as a midrange pile', () => {
    const deck = entriesOf([
      forest(37),
      ...noncreature(6, 1, 'Sacrifice a creature: Draw a card.', 'Outlet', 'Enchantment'),
      ...noncreature(9, 2, 'Whenever a creature you control dies, each opponent loses 1 life.', 'Payoff', 'Enchantment'),
      ...creatures(20, 2, 2, 'Fodder'),
      ...cantrips(6), ...removal(6, 2),
    ]);
    const out = computeSynergy(null, 84, deck);
    expect(out.plan.recipe.key).toBe('aristocrats');
    expect(out.score).toBeGreaterThanOrEqual(85);
  });

  it('reads a life-gain / drain engine as lifegain', () => {
    const deck = entriesOf([
      forest(37),
      ...noncreature(9, 3, 'Whenever you gain life, put a +1/+1 counter on target creature.', 'Payoff', 'Enchantment'),
      ...noncreature(16, 2, 'When this artifact enters, you gain 3 life.', 'Gain'),
      ...cantrips(8), ...removal(4, 2),
    ]);
    const out = computeSynergy(null, 74, deck);
    expect(out.plan.recipe.key).toBe('lifegain');
    expect(out.score).toBeGreaterThanOrEqual(70);
  });

  it('reads a cast-trigger engine as spells', () => {
    const deck = entriesOf([
      forest(37),
      ...Array.from({ length: 6 }, (_, i) => ({
        card: mkCard({
          name: `Wizard Payoff ${i}`, type_line: 'Creature — Wizard', mana_cost: '{1}{U}', cmc: 2,
          oracle_text: 'Whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn.',
          power: '1', toughness: '2',
        }),
        quantity: 1,
      })),
      ...burn(6), ...cantrips(20), ...removal(6, 2),
    ]);
    const out = computeSynergy(null, 75, deck);
    expect(out.plan.recipe.key).toBe('spells');
    expect(out.score).toBeGreaterThanOrEqual(85);
  });
});

describe('§8 pile separation — same shape, different coherence', () => {
  // Both lists are 60 cards: 24 lands, 12 creatures at MV 2, 16 one-mana
  // spells and 8 two-mana spells. Only the OUTPUT differs.
  const coherent = [forest(24), ...creatures(12, 2, 2, 'Rush'), ...burn(8), ...cantrips(8), ...removal(8, 2)];
  const pile = [
    forest(24),
    ...creatures(12, 1, 2, 'Squire'),
    ...noncreature(8, 1, 'Target creature gets +0/+3 until end of turn.', 'Brace', 'Instant'),
    ...noncreature(8, 1, 'Target player reveals their hand.', 'Peer', 'Sorcery'),
    ...noncreature(8, 2, 'This artifact enters tapped.', 'Trinket'),
  ];

  it('keeps the quota-matched pile at S <= 5 and the coherent list at S >= 60', () => {
    const pileOut = computeSynergy(null, 60, entriesOf(pile));
    const goodOut = computeSynergy(null, 60, entriesOf(coherent));
    expect(entriesOf(pile).reduce((s, e) => s + e.quantity, 0)).toBe(entriesOf(coherent).reduce((s, e) => s + e.quantity, 0));
    expect(pileOut.score).toBeLessThanOrEqual(5);
    expect(goodOut.score).toBeGreaterThanOrEqual(60);
  });
});


// ── Round 2: §8 closing/tutor family, the evidence gate on Q, Commander bands

const THORACLE = "Thassa's Oracle";

function tutor(count: number, text: string, tag: string): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Sorcery', oracle_text: text,
      mana_cost: '{1}{B}', cmc: 2, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function altWinPiece(): { card: DbCard; quantity: number } {
  return {
    card: mkCard({
      name: THORACLE, type_line: 'Creature — Merfolk Wizard', mana_cost: '{U}{U}', cmc: 2,
      oracle_text: 'When this creature enters, look at the top X cards of your library, where X is your devotion to blue. You win the game if X is greater than or equal to the number of cards in your library.',
      power: '1', toughness: '3', colors: '["U"]', color_identity: '["U"]',
    }),
    quantity: 1,
  };
}

const COMBO_LINE = {
  id: 'alt_win', label: 'Alternate win condition',
  pieces: [THORACLE], required: 1, cost: 4, tStar: 5,
};

// ── §1 plan selection: continuous fit, not a step function ──────────────

function outlets(count: number): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `Feeder ${i}`, type_line: 'Creature \u2014 Horror', oracle_text: 'Sacrifice a creature: Scry 1.',
      mana_cost: '{1}', cmc: 1, power: '1', toughness: '1',
    }),
    quantity: 1,
  }));
}

function payoffs(count: number): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `Cutthroat ${i}`, type_line: 'Creature \u2014 Rogue',
      oracle_text: 'Whenever another creature you control dies, each opponent loses 1 life and you gain 1 life.',
      mana_cost: '{2}', cmc: 2, power: '1', toughness: '1',
    }),
    quantity: 1,
  }));
}

// -- Round 3: W recipe families and the typal plan -------------------------

const WIN_NORMS = normsFor('commander');
const STD_NORMS = normsFor('standard');
const NO_ENGINE = { E: 0, Estar: 1, D: 0, Dstar: 1, hasDrawEngine: false };

function tokenMaker(count: number, text: string, tag: string, cmc = 3): Array<{ card: DbCard; quantity: number }> {
  return noncreature(count, cmc, text, tag);
}

const CREATURE_TOKEN = 'When this artifact enters, create a 2/2 green Bear creature token.';
const FOOD = 'When this artifact enters, create a Food token.';

describe('section 8 W: token producers, zero-power bodies and the opponent prior', () => {

  it('does not let a 0-power body delete the whole combat line', () => {
    // requiredCopies sorted the cheapest member first and divided by its mean
    // output; one 0/0 Walking Ballista returned null and the deck scored W = 0
    // with a 205-damage schedule behind it (the-cabbage-merchant).
    const beaters = creatures(24, 5, 3, 'Beater');
    const ballista = mkCard({ name: 'Ballista', type_line: 'Artifact Creature', mana_cost: null, cmc: 0, power: '0', toughness: '0' });
    const withZero = computeWin('commander', WIN_NORMS, 'aggro', 99,
      entriesOf([...beaters, { card: ballista, quantity: 1 }]), [], NO_ENGINE);
    const withoutZero = computeWin('commander', WIN_NORMS, 'aggro', 99, entriesOf(beaters), [], NO_ENGINE);
    expect(withZero.score).toBeGreaterThan(0);
    expect(withZero.score).toBeCloseTo(withoutZero.score, 5);
  });

  it('counts creature-token makers with no converter, and Food makers only with one', () => {
    const shell = noncreature(20, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const tokens = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, CREATURE_TOKEN, 'Hatchery'), ...shell]), [], NO_ENGINE);
    const food = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, FOOD, 'Larder'), ...shell]), [], NO_ENGINE);
    expect(tokens.score).toBeGreaterThan(0);
    expect(food.score).toBe(0);
    const converted = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, FOOD, 'Larder'), ...shell,
        ...noncreature(2, 4, 'Creatures you control get +3/+3 until end of turn.', 'Overrun', 'Sorcery')]),
      [], NO_ENGINE);
    expect(converted.score).toBeGreaterThan(0);
  });

  it('sees a producer printed on the commander', () => {
    const commander = deriveCardFeature(mkCard({
      name: 'Token Lord', type_line: 'Legendary Creature - Bear', mana_cost: '{2}', cmc: 2,
      power: '2', toughness: '2', oracle_text: CREATURE_TOKEN,
    }));
    const shell = entriesOf(cantrips(30));
    const withCommander = computeWin('brawl', normsFor('brawl'), 'tokens', 60, shell, [commander], NO_ENGINE);
    const without = computeWin('brawl', normsFor('brawl'), 'tokens', 60, shell, [], NO_ENGINE);
    expect(withCommander.score).toBeGreaterThan(without.score);
  });

  it('halves a producer whose trigger needs an opponent to act', () => {
    const shell = noncreature(20, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const own = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, CREATURE_TOKEN, 'Hatchery'), ...shell]), [], NO_ENGINE);
    const theirs = computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, `Whenever a creature an opponent controls attacks, ${CREATURE_TOKEN}`, 'Reactive'), ...shell]),
      [], NO_ENGINE);
    expect(theirs.score).toBeLessThan(own.score);
  });

  it('sizes a counted token from the board it counts', () => {
    const scaling = 'When this artifact enters, create a 0/0 Construct artifact creature token with "This token gets +1/+1 for each artifact you control."';
    const flat = 'When this artifact enters, create a 2/2 Construct artifact creature token.';
    const shell = noncreature(24, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const big = computeWin('standard', normsFor('standard'), 'tokens', 60,
      entriesOf([...tokenMaker(6, scaling, 'Synth'), ...shell]), [], NO_ENGINE);
    const small = computeWin('standard', normsFor('standard'), 'tokens', 60,
      entriesOf([...tokenMaker(6, flat, 'Synth'), ...shell]), [], NO_ENGINE);
    expect(big.score).toBeGreaterThan(small.score);
  });

  // Once creature-token makers stopped needing a converter, the flat 2 power
  // per producer doubled every 1/1: sixteen one-mana Elf makers closed a
  // Standard aristocrats shell at 32 power a turn and out-ranked its own
  // drain line. Read the size the card prints.
  it('credits the token its printed power, not a flat 2', () => {
    const shell = noncreature(20, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const line = (size: string) => computeWin('standard', STD_NORMS, 'tokens', 60,
      entriesOf([...tokenMaker(8, `When this artifact enters, create a ${size} green Elf creature token.`, `Maker${size}`), ...shell]),
      [], NO_ENGINE).score;
    expect(line('1/1')).toBeLessThan(line('2/2'));
    expect(line('2/2')).toBeLessThan(line('4/4'));
  });
});

describe('section 8 W: control inevitability needs a durable engine and early answers', () => {
  const finishers = creatures(6, 6, 5, 'Titan');
  const cheap = removal(6, 2);
  const deck = entriesOf([...finishers, ...cheap, ...cantrips(20)]);
  const met = { E: 14, Estar: 12, D: 38, Dstar: 10, hasDrawEngine: true };

  it('fires when the engine, the early answers and the finishers are all there', () => {
    const out = computeWin('commander', WIN_NORMS, 'control', 99, deck, [], met);
    expect(out.reason).toContain('Control inevitability');
  });

  it('refuses a deck whose card advantage is all one-shot', () => {
    const out = computeWin('commander', WIN_NORMS, 'control', 99, deck, [], { ...met, hasDrawEngine: false });
    expect(out.reason).not.toContain('Control inevitability');
  });

  it('refuses a deck with fewer than two cheap answers', () => {
    const noEarly = entriesOf([...finishers, ...removal(6, 6, 'Slow'), ...cantrips(20)]);
    const out = computeWin('commander', WIN_NORMS, 'control', 99, noEarly, [], met);
    expect(out.reason).not.toContain('Control inevitability');
  });
});

describe('section 8 plan: typal / party / artifact-count', () => {
  function partyMember(i: number, cls: string): { card: DbCard; quantity: number } {
    return {
      card: mkCard({
        name: `${cls} ${i}`, type_line: `Creature - Human ${cls}`, subtypes: JSON.stringify(['Human', cls]),
        mana_cost: '{2}', cmc: 2, power: '2', toughness: '2',
      }),
      quantity: 1,
    };
  }
  const classes = ['Cleric', 'Rogue', 'Warrior', 'Wizard'];
  const roster = classes.flatMap((cls) => [0, 1, 2].map((i) => partyMember(i, cls)));
  const partyPayoffs = noncreature(6, 3, 'Creatures you control get +1/+1 for each creature in your party.', 'Rally', 'Enchantment');

  it('reads a party deck as typal and scores it on that plan', () => {
    const deck = entriesOf([...roster, ...partyPayoffs, ...removal(4, 2), ...cantrips(6)]);
    const plan = selectPlan(99, deck);
    expect(plan.recipe.key).toBe('typal');
    expect(plan.R).toBeGreaterThan(0);
  });

  it('needs both the bodies and the cards that read them', () => {
    const noPayoff = [...roster, ...cantrips(20)].map((c) => deriveCardFeature(c.card));
    expect(typalTheme(noPayoff).party).toBe(false);
    const noBodies = [...partyPayoffs, ...cantrips(20)].map((c) => deriveCardFeature(c.card));
    expect(typalTheme(noBodies).party).toBe(false);
    const both = [...roster, ...partyPayoffs].map((c) => deriveCardFeature(c.card));
    expect(typalTheme(both).party).toBe(true);
  });

  it('counts artifacts as a theme when two cards read the count', () => {
    const artifacts = noncreature(20, 2, 'Sacrifice this artifact: Scry 1.', 'Trinket');
    const readers = noncreature(2, 3, 'Creatures you control get +1/+1 for each artifact you control.', 'Forge');
    const theme = typalTheme([...artifacts, ...readers].map((c) => deriveCardFeature(c.card)));
    expect(theme.artifacts).toBe(true);
    expect(typalTheme(artifacts.map((c) => deriveCardFeature(c.card))).artifacts).toBe(false);
  });

  it('reads subtypes from the JSON column and from the type line', () => {
    const json = deriveCardFeature(mkCard({ name: 'A', type_line: 'Creature - Elf Druid', subtypes: JSON.stringify(['Elf', 'Druid']), power: '1', toughness: '1' }));
    const line = deriveCardFeature(mkCard({ name: 'B', type_line: 'Creature \u2014 Goblin Shaman', subtypes: null, power: '1', toughness: '1' }));
    expect(subtypesOf(json)).toEqual(['Elf', 'Druid']);
    expect(subtypesOf(line)).toEqual(['Goblin', 'Shaman']);
  });

  // §8 asks for "payoffs that scale with that count". The reminder text
  // "(Your party consists of up to one each of Cleric, Rogue, Warrior, and
  // Wizard.)" is printed on every party card and scales with nothing, so
  // matching it filed 20 of `tazri-beacon-of-unity`'s copies as payoffs
  // against 12 enablers — on a deck whose bodies ARE the plan.
  it('does not read a payoff out of party reminder text', () => {
    const roster = classes.flatMap((cls) => [0, 1, 2].map((i) => partyMember(i, cls)));
    const reminder = noncreature(6, 3,
      'Draw a card. (Your party consists of up to one each of Cleric, Rogue, Warrior, and Wizard.)',
      'Reminder', 'Sorcery');
    const scaling = noncreature(2, 3, 'Creatures you control get +1/+1 for each creature in your party.', 'Rally', 'Enchantment');
    const recipe = typalRecipe(typalTheme([...roster, ...scaling].map((c) => deriveCardFeature(c.card))));
    const payoff = recipe.roles.find((r) => r.key === 'payoff')!;
    expect(scaling.every((c) => payoff.fills(deriveCardFeature(c.card)))).toBe(true);
    expect(reminder.some((c) => payoff.fills(deriveCardFeature(c.card)))).toBe(false);
  });

  it('counts a maker of the tribe as an enabler, not as nothing', () => {
    const roster = classes.flatMap((cls) => [0, 1, 2].map((i) => partyMember(i, cls)));
    const scaling = noncreature(2, 3, 'Creatures you control get +1/+1 for each creature in your party.', 'Rally', 'Enchantment');
    const recipe = typalRecipe(typalTheme([...roster, ...scaling].map((c) => deriveCardFeature(c.card))));
    const enabler = recipe.roles.find((r) => r.key === 'enabler')!;
    const maker = deriveCardFeature(mkCard({
      name: 'Mobilizer', type_line: 'Creature — Orc Berserker', subtypes: JSON.stringify(['Orc', 'Berserker']),
      mana_cost: '{3}', cmc: 3, power: '3', toughness: '3',
      oracle_text: 'Whenever this creature attacks, create a tapped and attacking 1/1 red Warrior creature token.',
    }));
    expect(enabler.fills(maker)).toBe(true);
  });

  // The band and the predicates are measured together: re-running
  // `scripts/deck-score-bands.ts typal` after tightening `typalRoles` moved
  // payoff p25 from 4 to 2 and enabler p25 from 6 to 11. Freeze both numbers
  // so the next predicate change has to re-measure.
  it('carries the band measured against these predicates, not the earlier loose ones', () => {
    const recipe = typalRecipe({ tribes: ['Elf'], artifacts: false, party: false });
    const byKey = (k: string) => recipe.roles.find((r) => r.key === k)!;
    expect(byKey('payoff').cmd).toEqual({ min: 2, max: 7 });
    expect(byKey('enabler').cmd).toEqual({ min: 11, max: 29 });
  });
});

describe('\u00a71 plan selection ranks recipes on fit, not on essentials-met count', () => {
  // meren-powerhouse, measured: midrange met 3/3 essentials on Q .46 (S 40.1)
  // while aristocrats met 2/3 on Q .73 (S 92.8). A 99-card deck clears the
  // generic floors by accident, so the step function chose the vaguer plan.
  const deck = entriesOf([
    ...outlets(9), ...payoffs(11), ...creatures(16, 2, 2, 'Fodder'),
    ...removal(6, 2), ...cantrips(6),
  ]);

  it('prefers the recipe that explains more of the deck', () => {
    const chosen = selectPlan(99, deck);
    expect(chosen.recipe.key).toBe('aristocrats');
    const midrange = evaluatePlan(recipeFor('midrange'), 99, deck);
    expect(planFit(chosen)).toBeGreaterThan(planFit(midrange));
  });

  it('planFit is the plan side of S: clip((Q-.30)/.40) * R', () => {
    const plan = evaluatePlan(recipeFor('aristocrats'), 99, deck);
    const out = computeSynergy(plan, 99, deck);
    expect(planFit(plan) * 100 * out.B).toBeCloseTo(out.score, 5);
  });
});

describe('\u00a78 raw material earns credit only up to what consumes it', () => {
  // The largest remaining pile leak: 15 random cheap creatures filled the
  // aristocrats `fodder` floor beside ONE outlet and ONE payoff (pile seed
  // 145, S 33.9). Bodies with nothing to eat them are not a plan.
  const bodies = creatures(20, 2, 2, 'Body');

  it('caps fodder at three bodies per outlet/payoff copy', () => {
    const starved = entriesOf([...outlets(1), ...payoffs(1), ...bodies]);
    const plan = evaluatePlan(recipeFor('aristocrats'), 99, starved);
    const fodder = plan.roles.find((r) => r.role.key === 'fodder')!;
    expect(fodder.supply).toBe(6);
    expect(fodder.credited).toBeLessThanOrEqual(6);
    expect(plan.R).toBeLessThan(0.5);
  });

  it('leaves a deck with real throughput untouched', () => {
    const engine = entriesOf([...outlets(9), ...payoffs(11), ...bodies]);
    const plan = evaluatePlan(recipeFor('aristocrats'), 99, engine);
    expect(plan.roles.find((r) => r.role.key === 'fodder')!.supply).toBe(20);
  });
});

describe('§8 closing/tutor family — the plan is the line W actually selected', () => {
  it('scores an assembled combo deck on its own line', () => {
    const deck = entriesOf([
      altWinPiece(),
      ...tutor(6, 'Search your library for a card, put it into your hand, then shuffle.', 'Demonic'),
      ...noncreature(18, 1, 'Add one mana of any color.', 'FastMana'),
      ...noncreature(10, 2, 'Counter target spell.', 'Counter', 'Instant'),
      ...cantrips(8),
    ]);
    const out = computeSynergy(evaluateClosing(COMBO_LINE, deck), 99, deck);
    expect(out.plan.recipe.key).toBe('combo');
    expect(out.R).toBe(1);
    expect(out.score).toBeGreaterThanOrEqual(80);
  });

  it('gives a pile holding the piece but no tutors nothing for it', () => {
    const deck = entriesOf([
      altWinPiece(),
      ...creatures(20, 1, 3, 'Random'),
      ...noncreature(18, 3, 'This artifact enters tapped.', 'Junk'),
    ]);
    const closing = evaluateClosing(COMBO_LINE, deck);
    expect(closing.roles.find((r) => r.role.key === 'tutors')!.supply).toBe(0);
    expect(closing.hasEmptyEssential).toBe(true);
    expect(closing.R).toBe(0);
    // …and whichever reading §1's ordering keeps, the pile earns nothing:
    // every generic recipe is empty-essential here too, so the closing read
    // can win the tie-break — on R = 0, which is S = 0 either way.
    const chosen = betterPlan(selectPlan(99, deck), closing);
    expect(planFit(chosen)).toBe(0);
    expect(computeSynergy(chosen, 99, deck).score).toBeLessThanOrEqual(5);
  });

  it('counts a tutor only when its search filter can reach a piece', () => {
    const pieces = [deriveCardFeature(altWinPiece().card)];
    const recipe = closingRecipe(COMBO_LINE, pieces);
    const tutors = recipe.roles.find((r) => r.key === 'tutors')!;
    const unrestricted = deriveCardFeature(tutor(1, 'Search your library for a card, put it into your hand, then shuffle.', 'Demonic')[0].card);
    const creatureTutor = deriveCardFeature(tutor(1, 'Search your library for a creature card, reveal it, put it into your hand, then shuffle.', 'Worldly')[0].card);
    const landTutor = deriveCardFeature(tutor(1, 'Search your library for a Swamp card, put it onto the battlefield tapped, then shuffle.', 'Expanse')[0].card);
    expect(tutors.fills(unrestricted)).toBe(true);
    expect(tutors.fills(creatureTutor)).toBe(true);
    expect(tutors.fills(landTutor)).toBe(false);
  });

  it('emits a closing line from W only for an assembled family', () => {
    const norms = normsFor('commander');
    const totals = { E: 0, Estar: 1, D: 0, Dstar: 1, hasDrawEngine: false };
    const comboDeck = entriesOf([altWinPiece(), ...noncreature(20, 1, 'Add one mana of any color.', 'FastMana'), ...cantrips(10)]);
    const beatdown = entriesOf(creatures(30, 4, 3, 'Beater'));
    const withCombo = computeWin('commander', norms, 'combo', 99, comboDeck, [], totals);
    const withoutCombo = computeWin('commander', norms, 'aggro', 99, beatdown, [], totals);
    expect(withCombo.closing?.pieces).toContain(THORACLE);
    expect(withoutCombo.closing).toBeNull();
  });
});

describe('§8 evidence policy — Q counts only typed-covered copies', () => {
  it('keeps an uncovered copy in F while giving it no on-plan credit', () => {
    // Regex-identified but NOT typed: `covered` is false, `s` is still 1.
    const uncovered = mkCard({
      name: 'Uncatalogued Slayer', type_line: 'Instant', mana_cost: '{1}{B}', cmc: 2,
      oracle_text: 'Destroy target creature. Its controller loses 2 life and you draw a card.',
      power: null, toughness: null,
    });
    const feature = deriveCardFeature(uncovered);
    expect(feature.s).toBe(1);
    expect(feature.covered).toBe(false);
    const withIt = evaluatePlan(recipeFor('midrange'), 60, entriesOfUncovered([
      ...creatures(8, 4, 4, 'Threat'), ...cantrips(8), { card: uncovered, quantity: 4 },
    ]));
    expect(withIt.roles.find((r) => r.role.key === 'answers')!.supply).toBe(0);
    expect(withIt.Q).toBeLessThan(1);
  });
});

describe('§8 Commander bands — measured, not scaled by N/60', () => {
  it('applies the Commander floor to a 99-card list and the 60-card floor below it', () => {
    const midrange = recipeFor('midrange');
    const answers = midrange.roles.find((r) => r.key === 'answers')!;
    expect(answers.cmd).toBeDefined();
    const deck = entriesOf([...creatures(10, 4, 4, 'Threat'), ...removal(6, 2), ...cantrips(10)]);
    const asCommander = evaluatePlan(midrange, COMMANDER_BAND_REFERENCE, deck);
    const asStandard = evaluatePlan(midrange, 60, deck);
    const reqCmd = asCommander.roles.find((r) => r.role.key === 'answers')!.required;
    const reqStd = asStandard.roles.find((r) => r.role.key === 'answers')!.required;
    expect(reqCmd).toBeCloseTo(answers.cmd!.min, 6);
    expect(reqStd).toBeCloseTo(answers.min, 6);
    // The old behaviour scaled the 60-card floor to 4*99/60 = 6.6 at 99 cards.
    expect(reqCmd).toBeLessThan(answers.min * (COMMANDER_BAND_REFERENCE / 60));
  });
});

// ── §4 quota gaming: breaking a producer->consumer link must not raise S ───
//
// The §4 adversarial operation keeps lands, deck size, the MV histogram and
// colour identity fixed and only blanks a payoff/converter's rules text. Two
// measured paths let that RAISE S, and both are asserted closed here.

/** The §4 operation: same name, type, MV and colour; no rules text. */
function blankText(c: { card: DbCard; quantity: number }): { card: DbCard; quantity: number } {
  return { ...c, card: { ...c.card, oracle_text: null, keywords: null } };
}

function sacOutlets(count: number): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `Altar ${i}`, type_line: 'Artifact', oracle_text: 'Sacrifice a creature: Add {C}.',
      mana_cost: '{1}', cmc: 1, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

/** A TYPED dependent payoff: `requirementsOf` reads `creature deaths` off it. */
function drainPayoffs(count: number): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `Artist ${i}`, type_line: 'Creature — Vampire',
      oracle_text: 'Whenever another creature dies, each opponent loses 1 life and you gain 1 life.',
      mana_cost: '{1}{B}', cmc: 2, power: '1', toughness: '1',
    }),
    quantity: 1,
  }));
}

/** Fills the aristocrats payoff role WITHOUT carrying a typed requirement. */
function diesTriggers(count: number): Array<{ card: DbCard; quantity: number }> {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `Mourner ${i}`, type_line: 'Creature — Zombie',
      oracle_text: 'Whenever another creature you control dies, put a +1/+1 counter on this creature.',
      mana_cost: '{1}{B}', cmc: 2, power: '1', toughness: '1',
    }),
    quantity: 1,
  }));
}

describe('§4 quota gaming — S is non-increasing when a producer->consumer link breaks', () => {
  const aristocrats = [...sacOutlets(6), ...drainPayoffs(8), ...creatures(20, 1, 1, 'Chump'), ...cantrips(4)];

  it('does not raise S when every typed payoff is blanked (whole-deck property)', () => {
    const before = computeSynergy(null, 99, entriesOf(aristocrats));
    const after = computeSynergy(null, 99, entriesOf(aristocrats.map((c) =>
      (deriveCardFeature(c.card).isDrainPayoff ? blankText(c) : c))));
    expect(before.score).toBeGreaterThan(0);
    expect(after.score).toBeLessThanOrEqual(before.score);
  });

  it('does not let a payoff role keep R when its typed copies become vanilla', () => {
    // The payoff ROLE stays supplied by dies-triggers, so the plan is still
    // read as aristocrats. The blanked drain payoffs become vanilla bodies:
    // §4 requires that migration not pay, and the catalogue version-mismatch
    // guard is what stops a reviewed card's corpse from earning raw-material
    // credit (measured on `meren-powerhouse`: R .938 -> 1.000 before the fix).
    const deck = [...sacOutlets(6), ...drainPayoffs(4), ...diesTriggers(6), ...creatures(20, 1, 1, 'Chump')];
    const before = computeSynergy(null, 99, entriesOf(deck));
    const after = computeSynergy(null, 99, entriesOf(deck.map((c) =>
      (deriveCardFeature(c.card).isDrainPayoff ? blankText(c) : c))));
    expect(before.plan.recipe.key).toBe('aristocrats');
    expect(after.R).toBeLessThanOrEqual(before.R);
    expect(after.score).toBeLessThanOrEqual(before.score);
  });

  it('strands a dependent payoff that has no producers to consume (v1.3: u, not B)', () => {
    // v1.2 asserted B < 1 here. §9.3 retired B — a bounded payoff mean cannot
    // be non-increasing under deletion — so the charge moved to the copy: a
    // life-triggered drain with no life SOURCE in the deck reaches nothing,
    // earns u = 0, and contributes no Q or R credit. B stays 1 by definition.
    const lifeDrains = Array.from({ length: 6 }, (_, i) => ({
      card: mkCard({
        name: `Sanguine ${i}`, type_line: 'Enchantment',
        oracle_text: 'Whenever you gain life, each opponent loses 1 life.',
        mana_cost: '{2}{B}', cmc: 3, power: null, toughness: null,
      }),
      quantity: 1,
    }));
    // The beaters cost 4: a drain also reads creature DEATHS, and cheap
    // bodies would serve that route instead (§9.3 "deaths require expendable
    // bodies AND a death source"). With neither route present the copy is
    // stranded, which is what this test is about.
    const starved = entriesOf([...lifeDrains, ...creatures(20, 3, 4, 'Beater'), ...removal(6, 2), ...cantrips(6)]);
    const out = computeSynergy(null, 60, starved);
    expect(out.B).toBe(1);
    expect(out.U).toBeLessThan(1);
    const util = producerUtilisation(starved);
    const drain = util.rows.find((r) => r.name.startsWith('Sanguine'));
    expect(drain?.u).toBe(0);
    expect(drain?.resource).toBe('life');
  });

  it('cannot raise S by re-selecting a looser recipe after copies are removed', () => {
    // Removing on-plan copies may change which recipe fits best; §8's "Q
    // counts copies toward ONE compatible plan" means the new reading must
    // never score above the old one.
    const full = entriesOf(aristocrats);
    const before = computeSynergy(null, 99, full);
    for (const drop of ['Altar', 'Artist', 'Chump']) {
      const thinned = entriesOf(aristocrats.filter((c) => !c.card.name.startsWith(drop)));
      const after = computeSynergy(null, 99, thinned);
      expect(after.score).toBeLessThanOrEqual(before.score);
    }
  });

  it('withdraws coverage from a reviewed card whose printing no longer matches', () => {
    // `catalogFacts` states the contract: "a mismatch sets textMatches=false
    // and the caller must NOT treat the card as covered". The vanilla branch
    // used to hand such a card full support because it had no rules text.
    const reviewed = ['Blood Artist', 'Sol Ring', 'Zulaport Cutthroat']
      .find((n) => catalogFacts(n, null) !== null);
    expect(reviewed).toBeDefined();
    const stale = deriveCardFeature(mkCard({
      name: reviewed!, type_line: 'Creature — Vampire', oracle_text: null,
      mana_cost: '{1}{B}', cmc: 2, power: '1', toughness: '1',
    }));
    expect(catalogFacts(reviewed!, null)!.textMatches).toBe(false);
    expect(stale.covered).toBe(false);
    expect(stale.s).toBe(0.5);
  });
});
