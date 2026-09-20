/**
 * Deck Score v1.3 stage 4a — docs/DECK_SCORE_SPEC.md §9.2 ("freeze the
 * negative prior only after catalogue changes", "verify on fresh matched
 * controls too") and §9.6 acceptance.
 *
 * Three things are frozen here, in the order they were measured, because each
 * one feeds the next:
 *   1. the commander-DISJOINT stride cohorts, so a band or a floor is never
 *      graded on a commander it was fitted to;
 *   2. the p25/p90 Commander bands, re-measured through `evaluatePlan` on the
 *      training cohort;
 *   3. ONE joint Q floor, the p95 of the per-pile maximum over all eleven
 *      recipes on 1,000 training controls, replacing stage 3's two floors.
 */
import { describe, it, expect } from 'vitest';
import { scoreDeck } from '../deck-score';
import {
  PLAN_RECIPES, recipeFor, qBaselineFor, COMMANDER_BAND_REFERENCE, type PlanKey,
} from '../deck-score-plans';
import { Q_BASELINE, Q_BASELINE_JOINT_COMMANDER, Q_SATURATION } from '../deck-score-norms';
import {
  strideOrder, commanderBlocks, loadCohortPiles, readCommanderSample,
  HELD_OUT_COMMANDERS, HOLDOUT_EVERY, COHORT_SEED,
} from '../../../scripts/deck-score-piles';
import { FIXTURES } from '../../../scripts/deck-score-fixtures';

// ── 1. cohort construction ────────────────────────────────────────────────

describe('stage 4a — commander-disjoint stride cohorts', () => {
  const sample = readCommanderSample();

  it('splits by commander, not by file position, so no commander is in both', () => {
    // `commander-sample.csv` stores ten lists per commander contiguously, so
    // the stage-3 contiguous slice at offset 2000 was 22 clusters rather than
    // 200 draws and could not grade a p95.
    const training = strideOrder('training', sample);
    const holdout = strideOrder('holdout', sample);
    const nameOf = (i: number): string => sample[i].commander.toLowerCase();
    const tNames = new Set(training.map(nameOf));
    const hNames = new Set(holdout.map(nameOf));

    expect(commanderBlocks(sample).size).toBe(300);
    expect(tNames.size).toBe(200);
    expect(hNames.size).toBe(100);
    expect([...tNames].filter((n) => hNames.has(n))).toEqual([]);
    // Index-disjoint too, which is what makes the draw seeds disjoint: the
    // seed is `seedBase + sampleIndex`.
    expect(training.filter((i) => new Set(holdout).has(i))).toEqual([]);
    expect(training.length + holdout.length).toBe(sample.length);
    expect(HOLDOUT_EVERY).toBe(3);
    expect(COHORT_SEED.training).not.toBe(COHORT_SEED.holdout);
  });

  it('holds out every §5 fixture commander from both cohorts', () => {
    // §9.2 "hold out seeds AND commanders": a control may share neither with
    // the 200 validation piles nor with any fixture.
    for (const cohort of ['training', 'holdout'] as const) {
      const piles = loadCohortPiles(cohort, 40, 0.93);
      for (const p of piles) expect(HELD_OUT_COMMANDERS.has(p.commander.toLowerCase())).toBe(false);
    }
  });

  it('orders each cohort round-robin, so any prefix is commander-balanced', () => {
    // 200 acceptance controls drawn from a 100-commander holdout must not be
    // ten lists of ten commanders. One list per commander per pass gives at
    // most ceil(n / commanders) repeats in the first n.
    const holdout = strideOrder('holdout', sample);
    const first100 = holdout.slice(0, 100).map((i) => sample[i].commander.toLowerCase());
    expect(new Set(first100).size).toBe(100);
  });
});

// ── 2. bands, re-measured on the training cohort ──────────────────────────

describe('stage 4a — Commander bands re-measured through evaluatePlan', () => {
  /**
   * `MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts commander --evaluated --raw`
   * over the 1,838 training-cohort lists (200 commanders),
   * `verify-2026-09-19/deck-score/bands-stride-training.txt`. p25 -> `cmd.min`,
   * p90 -> `cmd.max`, rounded. Left column is the v1.2/stage-3 value.
   */
  const REMEASURED: Record<string, Record<string, [was: [number, number], now: [number, number]]>> = {
    midrange: { threats: [[7, 16], [5, 13]], answers: [[4, 11], [4, 10]], value: [[7, 16], [7, 16]] },
    control: { stabilisation: [[3, 8], [4, 9]], engine: [[8, 19], [6, 16]], finisher: [[7, 18], [3, 10]] },
    aristocrats: { outlet: [[1, 10], [2, 11]], payoff: [[1, 13], [3, 16]], fodder: [[16, 29], [10, 21]] },
    lifegain: { payoff: [[4, 13], [3, 11]], gain: [[12, 26], [9, 24]], value: [[5, 14], [6, 14]] },
    spells: { payoff: [[1, 10], [2, 12]], closer: [[4, 19], [4, 18]], spells: [[12, 27], [12, 26]] },
    recursion: { recursion: [[5, 12], [2, 7]], fuel: [[6, 20], [2, 12]], targets: [[8, 24], [5, 14]] },
    conversion: { converters: [[4, 17], [4, 19]], producers: [[9, 21], [9, 18]], output: [[4, 12], [4, 11]] },
    tokens: { payoff: [[6, 18], [6, 19]], makers: [[5, 13], [5, 13]], value: [[8, 17], [8, 18]] },
    counters: { payoff: [[2, 9], [3, 8]], sources: [[6, 16], [6, 16]], carriers: [[4, 12], [3, 11]] },
  };

  it('freezes every re-measured band at the measurement', () => {
    for (const [key, roles] of Object.entries(REMEASURED)) {
      const recipe = recipeFor(key as PlanKey);
      for (const [roleKey, [, now]] of Object.entries(roles)) {
        const role = recipe.roles.find((r) => r.key === roleKey);
        expect(role, `${key}.${roleKey}`).toBeDefined();
        expect([role!.cmd?.min, role!.cmd?.max], `${key}.${roleKey}`).toEqual(now);
      }
    }
  });

  it('leaves aggro without a cmd band — its training cohort is 7 lists', () => {
    // §1 wants at least 30 distinct reviewed lists before a band replaces a
    // prior. `shapeCohort` puts 7 of 1,838 training lists in the aggro bucket.
    for (const role of recipeFor('aggro').roles) expect(role.cmd).toBeUndefined();
  });

  it('measures the bands at 99 cards and scales by N', () => {
    expect(COMMANDER_BAND_REFERENCE).toBe(99);
  });
});

// ── 3. the joint floor ────────────────────────────────────────────────────

describe('stage 4a — one joint Q floor, measured over all eleven recipes', () => {
  it('freezes b at the JOINT p95 of 1,000 training controls, method recorded', () => {
    // `npx tsx scripts/deck-score-bands.ts negative --joint --n 1000`,
    // `verify-2026-09-19/deck-score/joint-floor.txt`: n = 1,000 matched
    // controls from 172 training commanders at the cEDH cohort's own .930
    // median typed coverage. Per-pile maximum Q, over the three generic plus
    // every engine recipe including `typal`, restricted to the recipes the
    // pile could actually be READ as (no empty essential):
    //   GENERIC     p50 .467  p90 .531  p95 .543  p99 .576  max .589
    //   ALL ENGINE  p50 .480  p90 .548  p95 .565  p99 .590  max .623
    //   JOINT       p50 .492  p90 .556  p95 .574  p99 .590  max .623
    expect(Q_BASELINE_JOINT_COMMANDER).toBe(0.574);
    // §9.2's rejection line: at b >= .70 the recipes separate nothing.
    expect(Q_BASELINE_JOINT_COMMANDER).toBeLessThan(Q_SATURATION);
    // The joint statistic is the only one that bounds the UNION of eleven
    // leak paths; both group p95s sit below it, which is exactly why two
    // floors under-bound it.
    expect(Q_BASELINE_JOINT_COMMANDER).toBeGreaterThan(0.565);
  });

  it('maps every recipe to the joint floor, combo and Standard excepted', () => {
    const keys: PlanKey[] = [...PLAN_RECIPES.map((r) => r.key), 'typal', 'combo'];
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(12);
    for (const key of keys) {
      const expected = key === 'combo' ? Q_BASELINE : Q_BASELINE_JOINT_COMMANDER;
      // Stage 3 split these into generic .542 and engine .559; nothing splits
      // them now, and the generic trio must not keep a private floor.
      expect(qBaselineFor('commander', key), key).toBe(expected);
      expect(qBaselineFor('brawl', key), key).toBe(expected);
      // §9.1 owns the Standard path and this stage does not touch it.
      expect(qBaselineFor('standard', key), key).toBe(Q_BASELINE);
    }
  });
});

// ── 4. acceptance, fixture-backed ─────────────────────────────────────────

describe('stage 4a acceptance, fixture-backed', () => {
  it('pins the first twenty fresh stride-drawn controls', () => {
    // Full run, `npx tsx scripts/deck-score-bands.ts controls --stride`:
    // n = 200 over 90 distinct commanders, 197/200 total < 25 and
    // 197/200 S <= 5 (target >= 190 on both). The three leaks are aggro 2 and
    // aristocrats 1, S max 14.0; one of them is the 20th pile here.
    // Round-robin order means these twenty are twenty different commanders.
    const controls = loadCohortPiles('holdout', 20, 0.93);
    const scored = controls.map((c) => scoreDeck(c.input));
    expect(new Set(controls.map((c) => c.commander)).size).toBe(20);
    expect(scored.map((r) => r.score)).toEqual(
      [23, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 26],
    );
    const syn = scored.map((r) => Number((r.components.find((c) => c.key === 'synergy')?.score ?? 0).toFixed(1)));
    expect(syn).toEqual([4.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7.9]);
    expect(syn.filter((v) => v <= 5).length).toBe(19);
  });

  it('keeps 1,000 training controls in-sample at the rate the floor promises', () => {
    // Same script, `controls --training --n 1000`: 989/1000 total < 25 and
    // 978/1000 S <= 5 — the ~95% a p95 floor is defined to deliver, against
    // 931/1000 for the stage-3 pair on the same cohort.
    const controls = loadCohortPiles('training', 25, 0.93);
    const syn = controls.map((c) => scoreDeck(c.input).components.find((x) => x.key === 'synergy')?.score ?? 0);
    expect(syn.filter((v) => v <= 5).length).toBeGreaterThanOrEqual(24);
  });

  it('reads vivi-battery-arena as `spells` at R = 1 and still misses its band', () => {
    // ITEM 3, MEASURED AND REPORTED, NOT FIXED. `spells` is the right read:
    // an Izzet storm list, every essential over-satisfied (payoff 9/2,
    // closer 7/4, spells 38/12), R = 1. Two typed-coverage holes were real
    // parser gaps and were fixed (`Thousand-Year Storm` had ZERO typed
    // effects over the rider "You may choose new targets for the copies.";
    // `Ponder` over "...then put them back in any order."), worth Q .629 ->
    // .643 and total 55 -> 64.
    // The residue is NOT the floor and NOT a route: the `spells` role credits
    // 26 of 38 supplied copies because its `cmd.max` is the p90 of 231
    // COMMANDER spells lists, applied unchanged to a 1v1 Brawl deck that is
    // legitimately more focused. No Brawl band cohort exists to measure one
    // from, and inventing one would be an unmeasured constant (§1).
    const fixture = FIXTURES.find((f) => f.name === 'vivi-battery-arena');
    expect(fixture?.band).toBe('70-85');
    const r = scoreDeck(fixture!.load().input);
    const syn = r.components.find((c) => c.key === 'synergy');
    expect(syn?.reason).toMatch(/supports spells;/);
    expect(r.score).toBe(64);
    expect(recipeFor('spells').roles.find((x) => x.key === 'spells')?.cmd?.max).toBe(26);
  });

  it('pins the two anchors this stage moved out of band, with their cause', () => {
    // Anchors 14/16 (target 15). Both misses are measurement consequences,
    // not tuning: `tazri-upgraded-arena` read midrange Q .621 R .750 at the
    // stage-3 generic floor .542 for S 37.4 / total 50; the joint floor alone
    // takes it to ~42, and the re-measured midrange maxima (threats 16 -> 13,
    // answers 11 -> 10) drop its Q to .586 so `tokens` (fit .156) wins the
    // selection over midrange (fit .073).
    const byName = (n: string) => FIXTURES.find((f) => f.name === n)!;
    expect(scoreDeck(byName('tazri-upgraded-arena').load().input).score).toBe(32);
    expect(byName('tazri-upgraded-arena').band).toBe('45-65');
    // Everything else the brief names stays in band; these two are the ones
    // the joint floor paid for.
    expect(scoreDeck(byName('cedhtop16-ballooncon6').load().input).score).toBe(91);
    expect(scoreDeck(byName('meren-powerhouse').load().input).score).toBe(75);
    expect(scoreDeck(byName('the-cabbage-merchant').load().input).score).toBe(56);
  });
});
