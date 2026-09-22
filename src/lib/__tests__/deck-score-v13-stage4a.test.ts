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
import { describe, it, expect, vi } from 'vitest';
import { scoreDeck } from '../deck-score';
import {
  PLAN_RECIPES, recipeFor, qBaselineFor, COMMANDER_BAND_REFERENCE, type PlanKey,
} from '../deck-score-plans';
import { Q_BASELINE, Q_BASELINE_CLOSING, Q_BASELINE_CLOSING_BRAWL, Q_BASELINE_JOINT_COMMANDER, Q_BASELINE_JOINT_BRAWL, Q_SATURATION } from '../deck-score-norms';
import {
  strideOrder, commanderBlocks, loadCohortPiles, readCommanderSample,
  HELD_OUT_COMMANDERS, HOLDOUT_EVERY, COHORT_SEED,
} from '../../../scripts/deck-score-piles';
import { FIXTURES } from '../../../scripts/deck-score-fixtures';

// Coverage round 1 tripled the catalogue shard (4,467 -> 14,909 entries), so
// every pile-building and catalogue-walking test in this file got ~3x slower
// and several landed within noise of vitest's 15 s default. Raised per file
// rather than per test: the work is corpus-sized, not hung.
vi.setConfig({ testTimeout: 120_000 });

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

    // Round 1 (refuter finding R3): the 5 fixture commanders are dropped from
    // `commanderBlocks`, so a fixture list can no longer enter EITHER stride.
    // 300 -> 295 blocks, 200 -> 196 training names, 100 -> 99 holdout names.
    // Stage 2: `isHeldOutCommander` also matches the front face, so the
    // `Kuja, Genome Sorcerer // Trance Kuja` block leaves as well — 294
    // blocks, 98 holdout names, and the parity of every later block flips,
    // which is why the strides move by more than Kuja's ten lists
    // (1,824 -> 1,798 training, 903 -> 919 holdout, 1,075 ids in common).
    expect(commanderBlocks(sample).size).toBe(294);
    expect(tNames.size).toBe(196);
    expect(hNames.size).toBe(98);
    expect([...tNames].filter((n) => hNames.has(n))).toEqual([]);
    // Index-disjoint too, which is what makes the draw seeds disjoint: the
    // seed is `seedBase + sampleIndex`.
    expect(training.filter((i) => new Set(holdout).has(i))).toEqual([]);
    // The held-out commanders' lists are in neither stride, so the two
    // cohorts no longer partition the sample — that is the point of R3.
    expect(training.length).toBe(1798);
    expect(holdout.length).toBe(919);
    expect(training.length + holdout.length).toBeLessThan(sample.length);
    for (const i of [...training, ...holdout]) {
      expect(HELD_OUT_COMMANDERS.has(sample[i].commander.toLowerCase())).toBe(false);
    }
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
    // 98 holdout commanders after the stage-2 front-face fix, so the 99th
    // draw is the first repeat.
    expect(new Set(first100).size).toBe(98);
  });
});

// ── 2. bands, re-measured on the training cohort ──────────────────────────

describe('stage 4a — Commander bands re-measured through evaluatePlan', () => {
  /**
   * `MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts commander --evaluated --raw`
   * over the 1,838 training-cohort lists (200 commanders),
   * `verify-2026-09-19/deck-score/bands-stride-training.txt`. p25 -> `cmd.min`,
   * p90 -> `cmd.max`, rounded.
   *
   * ROUND 1 re-ran the same command on the corpus-wide catalogue and on the
   * R3-corrected training stride (1,824 lists, 196 commanders). STAGE 2
   * (v1.4 §10.2) re-ran it once more on the Kuja-corrected stride (1,798
   * lists, 196 commanders) with the maximum-credit assignment in place: the
   * third column is the live freeze. Every column was produced by
   * `bands verify`, which re-measures each cell and exits non-zero on a
   * mismatch, so the frozen number and the statistic cannot drift apart.
   */
  const REMEASURED: Record<string, Record<string, [stage4a: [number, number], round1: [number, number], stage2: [number, number]]>> = {
    midrange: { threats: [[5, 13], [5, 13], [5, 14]], answers: [[4, 10], [4, 11], [5, 12]], value: [[7, 16], [8, 16], [8, 17]] },
    control: { stabilisation: [[4, 9], [4, 9], [4, 9]], engine: [[6, 16], [7, 17], [7, 17]], finisher: [[3, 10], [3, 9], [3, 9]] },
    aristocrats: { outlet: [[2, 11], [3, 12], [3, 12]], payoff: [[3, 16], [4, 15], [4, 16]], fodder: [[10, 21], [13, 25], [13, 23]] },
    lifegain: { payoff: [[3, 11], [6, 12], [6, 19]], gain: [[9, 24], [16, 28], [15, 25]], value: [[6, 14], [6, 13], [6, 13]] },
    spells: { payoff: [[2, 12], [2, 12], [2, 12]], closer: [[4, 18], [5, 18], [5, 19]], spells: [[12, 26], [13, 26], [13, 27]] },
    recursion: { recursion: [[2, 7], [2, 8], [2, 8]], fuel: [[2, 12], [2, 13], [1, 12]], targets: [[5, 14], [5, 14], [5, 15]] },
    conversion: { converters: [[4, 19], [8, 20], [5, 20]], producers: [[9, 18], [9, 26], [9, 19]], output: [[4, 11], [5, 10], [5, 11]] },
    tokens: { payoff: [[6, 19], [6, 20], [6, 20]], makers: [[5, 13], [6, 15], [6, 13]], value: [[8, 18], [10, 18], [9, 19]] },
    counters: { payoff: [[3, 8], [2, 10], [3, 10]], sources: [[6, 16], [6, 18], [7, 21]], carriers: [[3, 11], [5, 15], [4, 15]] },
  };

  it('freezes every re-measured band at the measurement', () => {
    for (const [key, roles] of Object.entries(REMEASURED)) {
      const recipe = recipeFor(key as PlanKey);
      for (const [roleKey, [, , now]] of Object.entries(roles)) {
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
    //
    // ROUND 1 re-ran the identical command after the catalogue went from 4,467
    // to 14,898 entries — the controls' draw pool is now 66% typed rather than
    // a staple list — and the JOINT p95 moved to .683 (`negative-joint.txt`).
    // Re-frozen at the measurement, NOT at the value that keeps anchors in
    // band: five §5 anchors fell out of band on this number and are reported
    // as such. What it costs is recorded below.
    expect(Q_BASELINE_JOINT_COMMANDER).toBe(0.683);
    // §9.2's rejection line: at b >= .70 the recipes separate nothing.
    expect(Q_BASELINE_JOINT_COMMANDER).toBeLessThan(Q_SATURATION);
    // The joint statistic is the only one that bounds the UNION of eleven
    // leak paths; both group p95s sit below it, which is exactly why two
    // floors under-bound it.
    expect(Q_BASELINE_JOINT_COMMANDER).toBeGreaterThan(0.565);
    // THE COST, PINNED SO IT CANNOT BE LOST: the window (Qsat - b) is .017
    // wide, so S is now a step function of Q — a deck one thousandth under the
    // floor scores 0 and one two hundredths over it scores 100. §9.2 only
    // rejects b >= .70, so the statistic stands; separating deck from deck
    // again is a recipe/saturation problem for round 2.
    expect(Q_SATURATION - Q_BASELINE_JOINT_COMMANDER).toBeLessThan(0.02);
  });

  it('maps every recipe to the joint floor, combo and Standard excepted', () => {
    const keys: PlanKey[] = [...PLAN_RECIPES.map((r) => r.key), 'typal', 'combo'];
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(12);
    for (const key of keys) {
      const expected = key === 'combo' ? Q_BASELINE_CLOSING : Q_BASELINE_JOINT_COMMANDER;
      // Stage 3 split these into generic .542 and engine .559; nothing splits
      // them now, and the generic trio must not keep a private floor. Stage 4b
      // moved `combo` off `Q_BASELINE` and gave Brawl its own measured floor.
      expect(qBaselineFor('commander', key), key).toBe(expected);
      // Stage 4c: `combo` carries a measured Brawl floor of its own.
      expect(qBaselineFor('brawl', key), key).toBe(key === 'combo' ? Q_BASELINE_CLOSING_BRAWL : Q_BASELINE_JOINT_BRAWL);
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
    // ROUND 1: the R3 stride change re-draws these twenty, and the higher floor
    // closes both stage-4a leaks — 20/20 at the 20 floor, S = 0 on every one.
    // STAGE 2 (§10.2) RETIRES THE FLOOR: `b_S = 0`, so a coverage-matched
    // random pile made of real, typed, identity-legal cards reads the useful
    // mass it actually holds. These twenty now score S 76.7-100 and totals
    // 43-68. §10.1's numeric pile gate is OPEN and release-blocking; this
    // pins the measurement so the next stage sees any movement, and nothing
    // here is fitted to it.
    const controls = loadCohortPiles('holdout', 20, 0.93);
    const scored = controls.map((r) => scoreDeck(r.input));
    expect(new Set(controls.map((c) => c.commander)).size).toBe(20);
    expect(scored.map((r) => r.score)).toEqual(
      // RE-PINNED by v1.4 stage 1d: the section 10.8 resource corrections
      // cost a pile more than they cost a real list, so these fall from
      // 20-68 (p50 60) to 20-56 (p50 45) and five now sit under 25.
      [22, 48, 55, 46, 45, 29, 28, 55, 20, 55, 55, 31, 55, 54, 57, 22, 56, 54, 38, 51]);
    const syn = scored.map((r) => Number((r.components.find((c) => c.key === 'synergy')?.score ?? 0).toFixed(1)));
    expect(syn.filter((v) => v <= 5).length).toBe(0);
    expect(Math.min(...syn)).toBeCloseTo(76.7, 1);
  });

  it('keeps 1,000 training controls in-sample at the rate the floor promises', () => {
    // Same script, `controls --training --n 1000`: 989/1000 total < 25 and
    // 978/1000 S <= 5 — the ~95% a p95 floor is defined to deliver, against
    // 931/1000 for the stage-3 pair on the same cohort.
    // ROUND 1: 23/25 in-sample on the re-measured floor (the full-cohort rate
    // is in `controls --training`); the two leaks are engine-family reads.
    // STAGE 2: with `b_S = 0` there is no floor left to be in-sample of —
    // every one of the 25 reads its own useful mass, S 67.4-100, none <= 5.
    // The product-level statement lives in `bands real` (ctrl93 19.7% under
    // 25 for Commander), and §10.1's gate stays OPEN.
    const controls = loadCohortPiles('training', 25, 0.93);
    const syn = controls.map((c) => scoreDeck(c.input).components.find((x) => x.key === 'synergy')?.score ?? 0);
    expect(syn.filter((v) => v <= 5).length).toBe(0);
    expect(Math.min(...syn)).toBeCloseTo(67.4, 1);
  });

  it('reads vivi-battery-arena as `spells` at R = 1 and still misses its band', () => {
    // ITEM 3, MEASURED AND REPORTED, NOT FIXED. `spells` is the right read:
    // an Izzet storm list, every essential over-satisfied (payoff 9/2,
    // closer 7/4, spells 38/12), R = 1. Two typed-coverage holes were real
    // parser gaps and were fixed (`Thousand-Year Storm` had ZERO typed
    // effects over the rider "You may choose new targets for the copies.";
    // `Ponder` over "...then put them back in any order."), worth Q .629 ->
    // .643 and total 55 -> 64.
    // The residue was NOT the floor and NOT a route: the `spells` role credited
    // 26 of 38 supplied copies because its `cmd.max` is the p90 of 231
    // COMMANDER spells lists, applied unchanged to a 1v1 Brawl deck that is
    // legitimately more focused. Stage 4b MEASURED that cohort — 201 Historic
    // Brawl spells lists read p90 32 — and the anchor came back in band at 76,
    // so this now pins the diagnosis rather than the miss. The Commander band
    // is unchanged; only the Brawl one is new.
    const fixture = FIXTURES.find((f) => f.name === 'vivi-battery-arena');
    expect(fixture?.band).toBe('70-85');
    const r = scoreDeck(fixture!.load().input);
    const syn = r.components.find((c) => c.key === 'synergy');
    expect(syn?.reason).toMatch(/supports spells;/);
    // v1.4 stage 1b: 76 -> 67. The §9.4 control schedule replaced the flat T8
    // clock this list was closing on; it now closes on Token/Food conversion
    // at T9 (W 58.5). Out of band again, by the correction, not by a constant.
    // v1.4 stage 1c: 67 -> 90, OUT HIGH. Vivi Ornitier's printed cast trigger
    // (1 damage to each opponent AND a +1/+1 counter per noncreature spell) is
    // typed now, so the deck's own spell schedule closes the 25-life Brawl
    // predicate on turn 6 and W saturates at 98.4. Nothing was tuned to this
    // list; the measured schedule simply overshoots a band that was reviewed
    // against a flat T8 clock. Pinned with its cause, not patched (§10.6).
    // v1.4 stage 1d: 90 -> 86. Section 10.8's paid deployment means Vivi's
    // body and the spells that trigger it now compete for the same per-turn
    // mana, so the line moves from Token/Food at T6 to Creature pressure at
    // T7 and W falls 98.4 -> 82.7. Still OUT HIGH, by one point now.
    expect(r.score).toBe(86);
    // Stage 2 re-measured both cells on the corrected strides: 26 -> 27, 34
    // unchanged.
    expect(recipeFor('spells').roles.find((x) => x.key === 'spells')?.cmd?.max).toBe(27);
    expect(recipeFor('spells').roles.find((x) => x.key === 'spells')?.brawl?.max).toBe(34);
  });

  it('pins the one anchor still out of band, with its cause', () => {
    // Stage 4a left TWO out at 14/16; stage 4b's Brawl bands returned Vivi and
    // `tazri-upgraded-arena` is the survivor at 15/16. Its cause changed with
    // the measurement: it read `tokens` at the Commander bands, and once the
    // Brawl bands and a typed commander restore the party `typal` read it sits
    // at Q .655 against the measured Brawl floor .675 — under the density a
    // coverage-matched random Brawl pile reaches 5% of the time. §4 forbids
    // moving the floor to close that gap.
    // ROUND 1 INVERTED THIS ONE: `tazri-upgraded-arena` came INTO its band at
    // 68 once the corpus-wide catalogue typed its party payoffs, and four other
    // anchors went out on the re-measured floor. Anchors 15/16 -> 11/16; the
    // four are pinned in the round-1 suite with their best-plan Q, so the
    // regression is a measurement on record rather than a moved constant.
    // STAGE 2: the U/D form moves all four. Tazri 68 (unchanged, still OUT
    // high by 3), Ballooncon 92 (IN), Meren 68 (IN), and the Cabbage list
    // 20 -> 59 (IN) — its Food conversion reads 45 useful copies per 99 slots
    // now that a copy parked in a capped role is re-spent where it is useful.
    const byName = (n: string) => FIXTURES.find((f) => f.name === n)!;
    expect(scoreDeck(byName('tazri-upgraded-arena').load().input).score).toBe(68);
    expect(byName('tazri-upgraded-arena').band).toBe('45-65');
    expect(scoreDeck(byName('cedhtop16-ballooncon6').load().input).score).toBe(92);
    // v1.4 stage 1d: Meren 68 -> 56 (OUT LOW, band 65-80) and the Cabbage
    // list 59 -> 54 (OUT LOW by one, band 55-70). Both are W moves: paying
    // deployment out of the same per-turn ledger delays each list's own
    // engine, and the quality cap `20 + .8*min(M,W,S)` binds on W. Measured
    // and reported, not tuned back.
    expect(scoreDeck(byName('meren-powerhouse').load().input).score).toBe(56);
    expect(scoreDeck(byName('the-cabbage-merchant').load().input).score).toBe(54);
  });
});
