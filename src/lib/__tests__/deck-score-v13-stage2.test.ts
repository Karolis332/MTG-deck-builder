/**
 * Deck Score v1.3 stage 2 — docs/DECK_SCORE_SPEC.md §9 decisions 1 and 2:
 * probability-weighted Standard deployment, and the Commander generic-Q floor
 * learned from separate matched negative controls.
 */
import { describe, it, expect, vi } from 'vitest';
import type { DbCard } from '../types';
import { scoreDeck } from '../deck-score';
import { computeSynergy } from '../deck-score-synergy';
import {
  selectPlan, evaluatePlan, recipeFor, recipesFor, planFit, qBaselineFor,
  castingProbability, deploymentCredit, deploymentBudget, isManlandFinisher,
  PLAN_RECIPES, STANDARD_RECIPES, type PlanEvaluation,
} from '../deck-score-plans';
import {
  Q_BASELINE, Q_BASELINE_CLOSING, Q_BASELINE_CLOSING_BRAWL, Q_BASELINE_JOINT_COMMANDER, Q_BASELINE_JOINT_BRAWL, Q_SATURATION,
  DEPLOYMENT_PROBABILITY_TARGET, qSlotSaturationFor,
} from '../deck-score-norms';
import { deriveCardFeature } from '../deck-score-features';
import { loadRandomPiles } from '../../../scripts/deck-score-fixtures';
import { loadMatchedPiles } from '../../../scripts/deck-score-piles';
import type { DeckEntry } from '../deck-score-mana';

// Coverage round 1 tripled the catalogue shard (4,467 -> 14,909 entries), so
// every pile-building and catalogue-walking test in this file got ~3x slower
// and several landed within noise of vitest's 15 s default. Raised per file
// rather than per test: the work is corpus-sized, not hung.
vi.setConfig({ testTimeout: 120_000 });

let idCounter = 0;
function mkCard(overrides: Partial<DbCard> & { name: string }): DbCard {
  idCounter += 1;
  return {
    id: `v13s2-${idCounter}-${overrides.name}`,
    oracle_id: `v13s2-oracle-${idCounter}`,
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
 * them no on-plan credit at all. These suites test the PLAN layer; mark them
 * covered, exactly as the v1.2 and v1.3 suites do. */
function entriesOf(cards: Row[]): DeckEntry[] {
  return cards.map((c) => ({ feature: { ...deriveCardFeature(c.card), covered: true, s: 1 }, quantity: c.quantity }));
}

function creatures(count: number, power: number, cmc: number, tag: string): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${power}p${cmc}c ${i}`, type_line: 'Creature — Bear',
      mana_cost: `{${cmc}}`, cmc, power: String(power), toughness: String(Math.max(1, power)),
    }),
    quantity: 1,
  }));
}

function removal(count: number, cmc: number, tag: string): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${cmc} ${i}`, type_line: 'Instant', oracle_text: 'Destroy target creature.',
      mana_cost: `{${cmc}}`, cmc, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

function cantrips(count: number, tag: string): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    card: mkCard({
      name: `${tag} ${i}`, type_line: 'Sorcery', oracle_text: 'Draw a card.',
      mana_cost: '{1}', cmc: 1, power: null, toughness: null,
    }),
    quantity: 1,
  }));
}

// ── §9.1 probability-weighted Standard deployment ─────────────────────────

describe('§9.1 a(c,d) = clip(P(cast by d) / .5)', () => {
  it('prices the modal 24/60 Standard deck exactly as the spec states', () => {
    // The two numbers §9.1 names. A seven-drop at its own T7 deadline is cast
    // on time under half the time, so it supplies under half a copy; by T10 it
    // is past even money and supplies a whole one.
    expect(castingProbability(60, 24, 7, 7)).toBeCloseTo(0.244, 3);
    expect(deploymentCredit(60, 24, 7, 7)).toBeCloseTo(0.487, 3);
    expect(castingProbability(60, 24, 7, 10)).toBeCloseTo(0.519, 3);
    expect(deploymentCredit(60, 24, 7, 10)).toBe(1);
    expect(DEPLOYMENT_PROBABILITY_TARGET).toBe(0.5);
  });

  it('earns nothing when the cost exceeds the deadline', () => {
    expect(castingProbability(60, 24, 8, 7)).toBe(0);
    expect(deploymentCredit(60, 24, 8, 7)).toBe(0);
  });

  it('repairs the round-4 defect: the modal five-drop is no longer refused at T5', () => {
    // REPLACES the v1.2 pin "refuses the modal Standard five-drop at its own
    // deadline", which recorded a known defect rather than endorsing it:
    // `deploymentBudget(60,24)(5)` is 4.80 — a MEAN used as a cutoff — so
    // `c <= 4.80` deleted every five-drop, and 45 of the 69 Standard positives
    // scoring S = 0 had a fully supplied recipe once the deadline stopped
    // truncating. The mean is unchanged for the Commander-family profiles that
    // keep the binary rule; Standard now reads the probability instead.
    expect(deploymentBudget(60, 24)(5)).toBeGreaterThan(4);
    expect(deploymentBudget(60, 24)(5)).toBeLessThan(5);
    expect(castingProbability(60, 24, 5, 5)).toBeCloseTo(0.520, 3);
    expect(deploymentCredit(60, 24, 5, 5)).toBe(1);
  });

  it('flows the fraction into BOTH Q and R, never into an integer pool', () => {
    // Eight seven-drop threats at the midrange T7 deadline: 8 x .4874 = 3.90
    // useful copies against a floor of 4, so R lands just under 1 and Q counts
    // the same fractional mass. The Commander-family binary rule refuses them
    // outright at the same land density.
    const deck = entriesOf([
      ...creatures(8, 7, 7, 'Titan'), ...removal(14, 2, 'Bolt'), ...cantrips(14, 'Opt'),
    ]);
    const std = evaluatePlan(recipeFor('midrange', 'standard'), 60, deck, [], undefined, 'standard');
    const threats = std.roles.find((r) => r.role.key === 'threats')!;
    expect(threats.supply).toBeCloseTo(8 * 0.4874, 2);
    expect(Number.isInteger(threats.supply)).toBe(false);
    expect(std.R).toBeCloseTo(threats.supply / threats.required, 6);
    expect(std.R).toBeLessThan(1);
    expect(std.Q).toBeGreaterThan(0);

    const cmd = evaluatePlan(recipeFor('midrange'), 60, deck, [], undefined, 'commander');
    expect(cmd.roles.find((r) => r.role.key === 'threats')!.supply).toBe(0);
  });
});

describe('§9.1 the Standard generic trio', () => {
  it('gives aggro pressure T3 and ONE combined reach/protection/reload role T4', () => {
    const aggro = recipeFor('aggro', 'standard');
    const essentials = aggro.roles.filter((r) => r.essential);
    expect(essentials.map((r) => [r.key, r.deadline])).toEqual([['pressure', 3], ['reach', 4]]);
    // The combined role takes reach, protection OR reload. The v1.2 recipe
    // demanded a separate reload whose measured p25 on the positive cohort was
    // zero, because those lists' reach and reload are the same cards.
    const reach = essentials[1];
    const reload = deriveCardFeature(cantrips(1, 'Reload')[0].card);
    const burn = deriveCardFeature(mkCard({
      name: 'Reach Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1,
      oracle_text: 'Reach Bolt deals 3 damage to any target.', power: null, toughness: null,
    }));
    expect(reach.fills(reload)).toBe(true);
    expect(reach.fills(burn)).toBe(true);
  });

  it('gives midrange threats T7 through MV7 with the output test still applied', () => {
    const essentials = recipeFor('midrange', 'standard').roles.filter((r) => r.essential);
    expect(essentials.map((r) => [r.key, r.deadline])).toEqual([['threats', 7], ['answers', 5], ['value', 5]]);
    // MV 7 is admitted, but only through the SAME power-for-cost bin: a 7/7
    // for seven passes, a 4/4 for seven does not.
    const threats = essentials[0];
    expect(threats.fills(deriveCardFeature(creatures(1, 7, 7, 'Titan')[0].card))).toBe(true);
    expect(threats.fills(deriveCardFeature(creatures(1, 4, 7, 'Overcosted')[0].card))).toBe(false);
  });

  it('gives control stabilisation T3, engine T5 and finisher T10', () => {
    expect(recipeFor('control', 'standard').roles.filter((r) => r.essential).map((r) => [r.key, r.deadline]))
      .toEqual([['stabilisation', 3], ['engine', 5], ['finisher', 10]]);
  });

  it('pins the bands measured on the training split with this same evaluator', () => {
    // p25 / p90 over the oldest 60% of the 2,747 dated positives (1,648 lists),
    // measured through `evaluatePlan(..., 'standard')`: aggro n=74,
    // midrange n=672, control n=170.
    // `npx tsx scripts/deck-score-bands.ts` reprints the percentile table.
    const band = (key: 'aggro' | 'midrange' | 'control') => Object.fromEntries(
      recipeFor(key, 'standard').roles.filter((r) => r.essential).map((r) => [r.key, [r.min, r.max]]));
    expect(band('aggro')).toEqual({ pressure: [4, 15], reach: [7, 12] });
    expect(band('midrange')).toEqual({ threats: [4, 10], answers: [6, 15], value: [4, 12] });
    expect(band('control')).toEqual({ stabilisation: [8, 11], engine: [7, 15], finisher: [4, 9] });
  });

  it('lets a typed manland finisher supply R without entering nonland Q', () => {
    const manland = deriveCardFeature(mkCard({
      name: 'Restless Ridgeline', type_line: 'Land', mana_cost: null, cmc: 0, power: null, toughness: null,
      oracle_text: '{2}{R}: Restless Ridgeline becomes a 3/1 red Elemental creature with trample until end of turn.',
    }));
    const utility = deriveCardFeature(mkCard({
      name: 'Plain Cave', type_line: 'Land', mana_cost: null, cmc: 0, power: null, toughness: null,
      oracle_text: '{T}: Add {R}.',
    }));
    expect(isManlandFinisher(manland)).toBe(true);
    expect(isManlandFinisher(utility)).toBe(false);

    const nonLand = entriesOf([...removal(10, 2, 'Sweep'), ...cantrips(10, 'Dig')]);
    const lands: DeckEntry[] = [{ feature: { ...manland, covered: true, s: 1 }, quantity: 4 }];
    const finisher = (e: PlanEvaluation) => e.roles.find((r) => r.role.key === 'finisher')!.supply;
    const without = evaluatePlan(recipeFor('control', 'standard'), 60, nonLand, [], undefined, 'standard');
    const withLands = evaluatePlan(recipeFor('control', 'standard'), 60, nonLand, lands, undefined, 'standard');
    expect(finisher(without)).toBe(0);
    expect(finisher(withLands)).toBe(4);
    // R moves, Q does not: a land is not a nonland copy.
    expect(withLands.R).toBeGreaterThan(without.R);
    expect(withLands.Q).toBe(without.Q);
  });
});

// ── §9.2 negative-cohort Commander Q prior ────────────────────────────────

describe('§9.2 Commander Q floor b, measured over 1,000 matched controls', () => {
  it('freezes b at the measurement, under the .70 rejection line', () => {
    // STAGE 4a supersedes the stage-2 number. The .542 frozen here was the
    // p95 of the max over the GENERIC TRIO only; the floor now answers to the
    // p95 of the max over ALL ELEVEN recipes. See the stage-4a suite for the
    // measurement and the in-sample comparison.
    // COVERAGE ROUND 1 re-measured the same statistic on the corpus-wide
    // catalogue: .574 -> .683, still under the .70 rejection line but only by
    // .017. See the stage-4a suite for the distribution and the consequence.
    expect(Q_BASELINE_JOINT_COMMANDER).toBe(0.683);
    expect(Q_BASELINE_JOINT_COMMANDER).toBeLessThan(Q_SATURATION);
  });

  it('applies b outside Standard only, to every recipe but combo', () => {
    // SUPERSEDED THREE TIMES: stage 2 gave the engine families `Q_BASELINE`
    // (no measurement existed), stage 3 gave them a second floor of their own,
    // stage 4a collapsed both into one joint statistic, and stage 4b measured
    // Brawl on its own corpus and priced the closing plan. The enumeration
    // lives in `deck-score-v13-stage4b.test.ts` now; this keeps the shape.
    for (const key of ['aggro', 'midrange', 'control', 'aristocrats', 'lifegain', 'spells', 'typal', 'recursion'] as const) {
      expect(qBaselineFor('commander', key)).toBe(Q_BASELINE_JOINT_COMMANDER);
      expect(qBaselineFor('brawl', key)).toBe(Q_BASELINE_JOINT_BRAWL);
      expect(qBaselineFor('standard', key)).toBe(Q_BASELINE);
    }
    expect(qBaselineFor('commander', 'combo')).toBe(Q_BASELINE_CLOSING);
    // Stage 4c: Brawl's closing population is its own measurement.
    expect(qBaselineFor('brawl', 'combo')).toBe(Q_BASELINE_CLOSING_BRAWL);
  });

  it('scores a generic plan 0 at Q <= b and at most 5 just above it', () => {
    const b = Q_BASELINE_JOINT_COMMANDER;
    const S = (Q: number, R: number) => 100 * Math.max(0, Math.min(1, (Q - b) / (Q_SATURATION - b))) * R;
    expect(S(b, 1)).toBe(0);
    expect(S(b - 0.05, 1)).toBe(0);
    // Exact bound: at R = 1, S <= 5 iff Q <= b + .05*(.70-b). At stage 2's
    // b = .542 that was .5499; at stage 4a's joint b = .574 it was .5803; at
    // round 1's re-measured b = .683 it is .6839 — the whole S window is now
    // .017 wide, which is the round-2 item, not a licence to move b.
    const bound = b + 0.05 * (Q_SATURATION - b);
    expect(bound).toBeCloseTo(0.6839, 4);
    expect(S(bound, 1)).toBeCloseTo(5, 6);
    expect(S(bound + 0.005, 1)).toBeGreaterThan(5);
  });

  it('uses the SAME objective in planFit and in the reported S', () => {
    const deck = entriesOf([
      ...creatures(12, 4, 3, 'Threat'), ...removal(10, 2, 'Kill'), ...cantrips(14, 'Draw'),
    ]);
    for (const profile of ['commander', 'standard'] as const) {
      const plan = selectPlan(99, deck, [], undefined, profile);
      const out = computeSynergy(plan, 99, deck, profile);
      // §10.2: `b_S = 0` — the fitted floor is retired, and S is a monotone
      // transform of the SAME `Q_slot` planFit maximised.
      expect(out.b).toBe(0);
      expect(planFit(plan, profile)).toBe(plan.Q);
      expect(out.score).toBeCloseTo(100 * Math.min(1, plan.Q / qSlotSaturationFor(profile)), 6);
    }
  });
});

// ── regression pins ───────────────────────────────────────────────────────

describe('§9.1 dispatch is by FORMAT: the Standard change moves no Commander deck', () => {
  it('keeps the Standard recipes out of every other profile', () => {
    expect(recipesFor('commander')).toBe(PLAN_RECIPES);
    expect(recipesFor('brawl')).toBe(PLAN_RECIPES);
    const std = recipesFor('standard');
    for (const key of ['aggro', 'midrange', 'control'] as const) {
      expect(std.find((r) => r.key === key)).toBe(STANDARD_RECIPES.find((r) => r.key === key));
      expect(std.find((r) => r.key === key)).not.toBe(PLAN_RECIPES.find((r) => r.key === key));
    }
    // The v1.2 engine families are shared, not duplicated. The three v1.3
    // recipes are `commanderOnly`: their bands were measured only on the
    // 2,777-list Commander sample, and §1 needs a >= 30-list same-format
    // cohort before a band may be claimed, so Standard never sees them.
    const engines = (list: readonly { key: string }[]) =>
      list.filter((r) => !['aggro', 'midrange', 'control'].includes(r.key));
    expect(engines(std).map((r) => r.key)).toEqual(['aristocrats', 'lifegain', 'spells', 'recursion']);
    expect(engines(std)).toEqual(engines(PLAN_RECIPES).filter((r) => !PLAN_RECIPES.find((p) => p.key === r.key)?.commanderOnly));
  });

  it('pins the first 20 section-5 validation piles', () => {
    // Fixture-backed, seeds 0-19 of the same 200-pile acceptance set. If the
    // Standard deployment rule or the Standard recipes ever leaked into the
    // Commander profile these integers would move.
    // `npx tsx scripts/deck-score-pile-diag.ts --pins` reprints them.
    // RE-PINNED at stage 3: the three piles that used to reach 21-24 read an
    // engine recipe at the old .30 floor. With the measured engine floor the
    // whole validation set is flat at 20 (200/200 under 25, 200/200 S <= 5).
    // RE-PINNED at v1.4 stage 2: the floor that flattened them is retired
    // (§10.2 `b_S = 0`), so a constructed pile of real typed cards reads the
    // mass it holds and these twenty run 32-72. §10.1's pile gate is OPEN and
    // release-blocking — pinned as the measurement stage 3 inherits.
    const scores = loadRandomPiles(20).map((input) => scoreDeck(input).score);
    expect(scores).toEqual([65, 54, 60, 55, 65, 72, 62, 60, 59, 63, 35, 55, 69, 62, 66, 54, 66, 63, 55, 32]);
  });
});

describe('§9.2 fresh matched negative controls', () => {
  it('pins ten controls whose seeds and source lists are disjoint from training', () => {
    // offset 2000 / seedBase 0xf00d0000: neither the sample lists nor the draw
    // seeds overlap the b-training set (offset 0, seedBase 0x5eed0000) or the
    // section-5 piles. Full run, n = 200: 189/200 total < 25, 145/200 S <= 5.
    const controls = loadMatchedPiles(10, 2000, 0xf00d0000, 0.93);
    expect(controls).toHaveLength(10);
    expect(controls.map((c) => scoreDeck(c.input).score)).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
    for (const c of controls) {
      expect(c.input.main.reduce((a, rc) => a + rc.quantity, 0)).toBe(99);
      expect(c.lands).toBeGreaterThanOrEqual(20);
    }
  });
});
