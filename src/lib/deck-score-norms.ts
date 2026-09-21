/**
 * Deck Score v1.1 — frozen constants (weights, format norms, archetype
 * multipliers, hard caps). docs/DECK_SCORE_SPEC.md §1 "Weights and format
 * norms" + §2 "Gated composition".
 *
 * Every number here is copied straight from the spec tables. Changing a
 * number without bumping SCORE_VERSION breaks the "freeze inference rules
 * and norms by score version" contract (§1).
 *
 * v1.1.0 (2026-09-19): the W closing-turn constants and the per-format count
 * targets are the frozen output of the §4 grid search re-centred on §7 --
 * see verify-2026-09-19/deck-score/calibration.md for the run, the held-out
 * losses and the two settings that were REJECTED (the Standard searched
 * winner, which lost to the §7 centre on the chronological validation split,
 * and a per-format quality-cap intercept, which §2 defines globally).
 */

export type ScoreFormat = 'commander' | 'brawl' | 'competitivebrawl' | 'standardbrawl' | 'standard';
export type ComponentKey =
  | 'mana' | 'curve' | 'interaction' | 'advantage' | 'win' | 'synergy' | 'meta' | 'structure';

/** One of the three calibrated profiles the spec's tables actually give
 * (§1 "Application slugs": commander / {brawl,competitivebrawl,standardbrawl} / standard). */
export type ScoreProfile = 'commander' | 'brawl' | 'standard';

export function profileOf(format: ScoreFormat): ScoreProfile {
  if (format === 'commander') return 'commander';
  if (format === 'standard') return 'standard';
  return 'brawl';
}

export function isCommanderFamily(format: ScoreFormat): boolean {
  return format === 'commander' || format === 'brawl' || format === 'competitivebrawl' || format === 'standardbrawl';
}

/** §1 table row 1: reference library size for count-target scaling. */
export function referenceLibrarySize(format: ScoreFormat): number {
  if (format === 'standardbrawl') return 59;
  if (isCommanderFamily(format)) return 99;
  return 60;
}

/** §1 table row 2: players / life total lost to eliminate one opponent. */
export interface GameShape {
  players: number;
  lifePerOpponent: number;
}
const GAME_SHAPE: Record<ScoreProfile, GameShape> = {
  commander: { players: 4, lifePerOpponent: 40 },
  brawl: { players: 2, lifePerOpponent: 25 },
  standard: { players: 2, lifePerOpponent: 20 },
};
export function gameShape(format: ScoreFormat): GameShape {
  return GAME_SHAPE[profileOf(format)];
}

// ── §1 "Weights and format norms" — weight table (fractions of 100) ────────

export const WEIGHTS: Record<ScoreProfile, Record<ComponentKey, number>> = {
  commander: { mana: 20, curve: 10, interaction: 16, advantage: 14, win: 20, synergy: 17, meta: 3, structure: 0 },
  brawl: { mana: 20, curve: 15, interaction: 20, advantage: 12, win: 16, synergy: 14, meta: 3, structure: 0 },
  standard: { mana: 20, curve: 16, interaction: 20, advantage: 10, win: 14, synergy: 12, meta: 8, structure: 0 },
};

/**
 * v1.2 (§8 "Missing meta"): Fmeta carries ZERO weight, and the core weights
 * are renormalised ONCE per profile by `w'_i = w_i / (1 - w_meta)` — divide by
 * .97 for Commander/Brawl and .92 for Standard.
 *
 * This is an explicit VERSION-LEVEL exception to §1 "Never redistribute
 * weight", not a per-deck missing-data switch: supplying or removing a corpus
 * snapshot cannot select a different weight vector. Scored meta returns only
 * with a real validated snapshot builder and a fresh calibration.
 */
const WEIGHTS_V12: Record<ScoreProfile, Record<ComponentKey, number>> = Object.fromEntries(
  (Object.keys(WEIGHTS) as ScoreProfile[]).map((profile) => {
    const raw = WEIGHTS[profile];
    const divisor = 1 - raw.meta / 100;
    const renormalised = Object.fromEntries(
      (Object.keys(raw) as ComponentKey[]).map((key) => [
        key,
        key === 'meta' || key === 'structure' ? 0 : raw[key] / divisor,
      ]),
    ) as Record<ComponentKey, number>;
    return [profile, renormalised];
  }),
) as Record<ScoreProfile, Record<ComponentKey, number>>;

export function weightsFor(format: ScoreFormat): Record<ComponentKey, number> {
  return WEIGHTS_V12[profileOf(format)];
}

export type AnswerAxis = 'creature' | 'permanent' | 'stack' | 'graveyard_or_protection';

export interface FormatNorms {
  /** Land deadband delta; falloff width d. */
  landDeadband: number;
  landFalloffWidth: number;
  /** Color-source reliability target. */
  pColor: number;
  /** T2 usable-play probability target. */
  pEarly: number;
  /** Interaction units target; cheap-answer copies target. */
  interactionUnitsTarget: number;
  cheapAnswerTarget: number;
  /** Answer-axis target. */
  answerAxisTarget: number;
  /** Creature / permanent / stack / graveyard-or-protection axis weights. */
  axisWeights: Record<AnswerAxis, number>;
  /** Draw horizon; draw-unit target; velocity access target. */
  drawHorizonTurns: number;
  drawUnitTarget: number;
  velocityAccessTarget: number;
  /** Fast closing turn; delay half-life (turns). */
  fastClosingTurn: number;
  delayHalfLifeTurns: number;
  /** Largest `r` a win pool may demand (deck-score-win `requiredCopies`). */
  poolSizeCap: number;
  /** Complete-line access target. */
  winAccessTarget: number;
  /** Supported plan fraction target. */
  planFractionTarget: number;
  /** Default repeatable-enabler supply per dependent payoff. */
  enablerSupplyDefault: number;
  /** Corpus minimum distinct lists; shrinkage prior lists. */
  corpusMinLists: number;
  corpusShrinkagePrior: number;
  /** Corpus age window (days); decay half-life (days). */
  corpusAgeWindowDays: number;
  corpusDecayHalfLifeDays: number;
  /** W/L minimum matches; pseudo-matches. null = "unavailable" per spec. */
  wlMinMatches: number | null;
  wlPseudoMatches: number | null;
}

const NORMS: Record<ScoreProfile, FormatNorms> = {
  commander: {
    landDeadband: 2, landFalloffWidth: 8,
    pColor: 0.90, pEarly: 0.85,
    interactionUnitsTarget: 12, cheapAnswerTarget: 7,
    answerAxisTarget: 2,
    axisWeights: { creature: 0.25, permanent: 0.25, stack: 0.25, graveyard_or_protection: 0.25 },
    drawHorizonTurns: 6, drawUnitTarget: 10, velocityAccessTarget: 0.90,
    fastClosingTurn: 7, delayHalfLifeTurns: 5, poolSizeCap: 10,
    winAccessTarget: 0.15, planFractionTarget: 0.55,
    enablerSupplyDefault: 8,
    corpusMinLists: 30, corpusShrinkagePrior: 200,
    corpusAgeWindowDays: 180, corpusDecayHalfLifeDays: 90,
    wlMinMatches: null, wlPseudoMatches: null,
  },
  brawl: {
    landDeadband: 2, landFalloffWidth: 8,
    pColor: 0.90, pEarly: 0.90,
    interactionUnitsTarget: 10.2, cheapAnswerTarget: 5.95,
    answerAxisTarget: 2,
    axisWeights: { creature: 0.40, permanent: 0.20, stack: 0.25, graveyard_or_protection: 0.15 },
    drawHorizonTurns: 5, drawUnitTarget: 6.8, velocityAccessTarget: 0.90,
    fastClosingTurn: 6, delayHalfLifeTurns: 4, poolSizeCap: 4,
    winAccessTarget: 0.25, planFractionTarget: 0.50,
    enablerSupplyDefault: 8,
    corpusMinLists: 30, corpusShrinkagePrior: 200,
    corpusAgeWindowDays: 90, corpusDecayHalfLifeDays: 30,
    wlMinMatches: null, wlPseudoMatches: null,
  },
  standard: {
    landDeadband: 1, landFalloffWidth: 5,
    pColor: 0.90, pEarly: 0.90,
    interactionUnitsTarget: 8, cheapAnswerTarget: 5,
    answerAxisTarget: 1,
    axisWeights: { creature: 0.50, permanent: 0.20, stack: 0.20, graveyard_or_protection: 0.10 },
    drawHorizonTurns: 4, drawUnitTarget: 4, velocityAccessTarget: 0.90,
    fastClosingTurn: 6, delayHalfLifeTurns: 2, poolSizeCap: 4,
    winAccessTarget: 0.60, planFractionTarget: 0.50,
    enablerSupplyDefault: 8,
    corpusMinLists: 30, corpusShrinkagePrior: 200,
    corpusAgeWindowDays: 30, corpusDecayHalfLifeDays: 14,
    wlMinMatches: 100, wlPseudoMatches: 50,
  },
};

export function normsFor(format: ScoreFormat): FormatNorms {
  return NORMS[profileOf(format)];
}

/** §1 "Archetype adjustments": E-star, K-star, D-star multipliers. Everything not aggro/control is 1/1/1. */
export interface ArchetypeMultiplier {
  interactionUnits: number;
  cheapAnswers: number;
  drawUnits: number;
}
export function archetypeMultiplier(archetype: string): ArchetypeMultiplier {
  if (archetype === 'aggro') return { interactionUnits: 0.5, cheapAnswers: 0.75, drawUnits: 0.5 };
  if (archetype === 'control') return { interactionUnits: 1.3, cheapAnswers: 1, drawUnits: 1.3 };
  return { interactionUnits: 1, cheapAnswers: 1, drawUnits: 1 };
}

// ── §2 "Gated composition" ──────────────────────────────────────────────────

/** `qualityCap=20+.8*min(M,W,S)` — an excellent curve/quota tally cannot hide
 * absent mana or a missing win plan. */
export const QUALITY_CAP_INTERCEPT = 20;
export const QUALITY_CAP_SLOPE = 0.8;
export function qualityCap(
  mana: number, win: number, synergy: number,
  intercept: number = QUALITY_CAP_INTERCEPT, slope: number = QUALITY_CAP_SLOPE,
): number {
  return intercept + slope * Math.min(mana, win, synergy);
}

/** §2 hard caps, most restrictive wins (smallest number). */
export const HARD_CAP_INVALID = 0;
export const HARD_CAP_STRUCTURE = 19;
/** RETIRED by §10.5 (v1.4 stage 0): an unresolved name is missing evidence,
 * not a rule failure, so `deck-score-gates.ts` emits an evidence warn with
 * `cap: null` and keeps the copies as reserved slots. The constant stays
 * exported as the documented history of the superseded cap. */
export const HARD_CAP_UNRESOLVED = 39;

export const SCORE_VERSION = '1.4.0-rc1';

/**
 * §8 "Pile separation belongs to S": `S = 100*clip((Q-.30)/(.70-.30))*R*B`.
 * .30 is the unstructured baseline and .70 the saturation target, for all
 * three profiles. Frozen starting priors for v1.2 validation, not measured
 * estimates — `planFractionTarget` (Q*) stays in FormatNorms as the v1.1
 * historical constant and no longer divides Q.
 */
/*
 *
 * COVERAGE ROUND 1 (2026-09-21) — RE-MEASURED, not re-fitted. The catalogue
 * grew from 4,467 to 14,898 entries (the generator had never been run over the
 * real corpus), so typed coverage of the matched controls' DRAW POOL went from
 * a hand-picked staple list to 66%% of the card universe. Every Q in this file
 * therefore moved, and every constant below is re-frozen at the statistic
 * `npx tsx scripts/deck-score-bands.ts verify` re-measures. Old -> new is in
 * `~/.claude/harness/runs/deck-score-2026-09-19/coverage-round1-report.md`.
 */
export const Q_BASELINE = 0.30;
export const Q_SATURATION = 0.70;

/**
 * v1.3 stage 4c: the Brawl saturation, MEASURED at the same percentile of the
 * Brawl population that `.70` occupies in the Commander one.
 *
 * Stage 4b froze `Q_BASELINE_JOINT_BRAWL` at .675, which left a .025-wide
 * window under a shared .70 saturation: kuja, vivi and azula all pinned at
 * S = 100, so S separated a deck from a pile but no longer a deck from a deck.
 * The floor is a property of the Brawl PILE population and was measured there;
 * the saturation is a property of the Brawl DECK population, so it is measured
 * there too rather than inherited.
 *
 * Statistic: the per-list MAXIMUM Q over all eleven recipes (selectable reads
 * only — the same quantity `Q_BASELINE_JOINT_*` takes the p95 of), over the
 * profile's TRAINING stride of REAL corpus lists. Re-print with
 * `npx tsx scripts/deck-score-bands.ts saturation --profile <p> --raw`
 * (`verify-2026-09-19/deck-score/saturation-{commander,brawl}.txt`).
 *
 * | max-recipe Q, training stride | n | p25 | p50 | p75 | p80 | p90 | p95 | max |
 * |---|---:|---:|---:|---:|---:|---:|---:|---:|
 * | commander | 1,838 | .523 | .603 | .683 | **.698** | .749 | .790 | .920 |
 * | brawl | 1,165 | .548 | .626 | .695 | **.712** | .754 | .787 | .893 |
 *
 * `.70` sits at the 80.7th percentile of the Commander distribution, and
 * Commander p80 is .698 — .002 from the frozen constant, inside the .002 step
 * between adjacent percentiles there. So the shared constant IS p80 of the
 * deck population it was chosen for, and p80 is what Brawl is frozen at.
 *
 * MEASURED WITH THE TYPED-COVERAGE GATE LIFTED, for the reason `evaluatedSupply`
 * lifts it for the bands: corpus typed coverage is a property of the
 * CATALOGUE's size, not of the decks (these lists sit at a median of .333
 * Commander / .371 Brawl, against the .930 the floors' controls are drawn to).
 * Gated, the Commander max-recipe Q p95 is .500 — BELOW the .574 floor — so the
 * gated statistic cannot produce a saturation above the floor at all, and the
 * number it would produce would move with every catalogue batch. See the
 * stage-4c report: under the live gate the median corpus list scores S = 0,
 * which is a catalogue-coverage defect, not a saturation one.
 */
/* Round 1: re-measured at .758 (was .712) — p80 of the Brawl training
 * stride's max-recipe Q, the same statistic stage 4c cut it from. */
export const Q_SATURATION_BRAWL = 0.758;

/**
 * Profile dispatch for the S saturation (§9.2 `S = 100*clip((Q-b)/(Qsat-b))*R`).
 * Commander and Standard keep the spec's shared `.70`: moving the Commander
 * constant is a spec change for §8/§9, not a stage decision.
 */
export function qSaturationFor(profile: ScoreProfile): number {
  return profile === 'brawl' ? Q_SATURATION_BRAWL : Q_SATURATION;
}

/**
 * v1.4 stage 2 (§10.2) — `Q_sat,p`, the saturation of the REPLACEMENT S.
 *
 *     N0 = 99 (98 with a verified partner pair) / 59 Standard Brawl / 60 Standard
 *     D  = max(N0, submitted library copies incl. reserved unresolved slots)
 *     U  = max over feasible recipes of the useful nonland-copy credit
 *     S  = 100 * clip(Q_slot / Q_sat,p),  Q_slot = U / D,  b_S = 0
 *
 * MEASURED, not chosen: p80 of `Q_slot` over the profile's ELIGIBLE REAL
 * TRAINING cohort — `cohorts-v14.json` rows with `exclusion: 'none'`, scored
 * through `scoreDeck` itself (no `--raw`, no lifted coverage gate, mechanically
 * incomplete lists included), with the inverse weighted empirical CDF
 * `q_p = inf{x: cumulativeWeight(x) >= p*totalWeight}` at EQUAL TOTAL WEIGHT
 * PER COMMANDER FAMILY. p80 is the percentile policy §10.2 freezes for every
 * independently calibrated profile; there is no p60/p75/p90 search, no
 * borrowing of the Commander number for Brawl and no anchor-specific value.
 *
 * Re-print with `npx tsx scripts/deck-score-bands.ts saturation --profile <p>`;
 * `bands verify` re-derives all three and fails on any mismatch. The legacy
 * `Q_SATURATION*`/`Q_BASELINE*` constants above are in the units of v1.3's
 * `U/F`, which this statistic replaces — §10.2 "Neither .70 nor the legacy
 * nonland-Q floors carry over to Q_slot's different units."
 *
 * MEASURED 2026-09-21 on the corrected stage-2 cohorts (the ten `Kuja` lists
 * left both Commander strides), catalogue 14,924 entries, domain `21fa0be02940`:
 *
 * | Q_slot, eligible real training cohort | families | n | p10 | p50 | p80 |
 * |---|---:|---:|---:|---:|---:|
 * | commander | 182 | 1,460 | .2525 | .3535 | **.4343 = 43/99** |
 * | brawl | 179 | 797 | .2525 | .3535 | **.4061 = 40.2/99** |
 * | standard | 42 | 360 | .2833 | .4000 | **.4833 = 29/60** |
 *
 * Commander and Standard moved one slot up from the first stage-2 measurement
 * when the assignment became the §10.2 MAXIMUM (a copy parked in a role that
 * is already at its bound is now re-spent where it is useful); Brawl did not
 * move. The sensitivity row is unchanged in kind: alternative family grouping
 * gives the same p80 on both, unweighted .4268 / .4833.
 *
 * Every value is an achieved `U/D`, so each constant is an exact rational in
 * the profile's slot count — with a fractional numerator where §9.3 producer
 * utilisation credits part of a copy (Brawl's 40.2). Standard's family key is the TOURNAMENT
 * (`event_name|event_date`); its date grouping (27 families, below §10.2's 30)
 * and the unweighted quantile both give the same .4667, so the grouping choice
 * moves nothing there. Commander and Brawl weight by commander family.
 * FROZEN on the stage-1d W domain (`scheduler: v14-stage1d`, domain hash
 * `21fa0be02940c884620b08cfd3cbf9558fb42abf1f7d31428c38fda167da2c6b`,
 * `verify-2026-09-19/deck-score/domain-v14.json`) 2026-09-21 stage 2b:
 * `bands freeze` re-measured all three p80s and all 45 band cells on this
 * domain and moved nothing (they were already measured here — see the
 * MEASURED block above). `bands verify` reproduces this domain and these
 * three statistics exactly; a future catalogue/scheduler change needs
 * `bands freeze --write` again and a fresh domain hash in this comment.
 */
export const Q_SLOT_SATURATION: Record<ScoreProfile, number> = {
  commander: 0.43434343,
  brawl: 0.40606061,
  standard: 0.48333333,
};

export function qSlotSaturationFor(profile: ScoreProfile): number {
  return Q_SLOT_SATURATION[profile];
}

/**
 * v1.3 §9.2 / §9.6 + stage 4a: ONE Q floor a plan must clear in a
 * Commander-family profile before it explains anything. `S = 100 *
 * clip((Q - b) / (.70 - b)) * R` for every generic and engine recipe; `combo`
 * keeps `Q_BASELINE` because §9.5's essential-completion check is its floor
 * and its pile read must stay 0/200 rather than be priced. Standard keeps
 * `Q_BASELINE` throughout — §9.1 owns that path.
 *
 * MEASURED, then frozen: the 95th percentile of the per-pile MAXIMUM Q over
 * ALL ELEVEN recipes (the three generic plus every engine family, `typal`
 * included) on 1,000 land/curve/colour-matched Commander negative controls,
 * drawn round-robin from 172 TRAINING commanders that appear in no §5
 * fixture, in no band cohort and in no acceptance control, at the cEDH
 * cohort's own median typed coverage (.930) so unknown cards cannot be the
 * discriminator. Re-print with
 * `npx tsx scripts/deck-score-bands.ts negative --joint --n 1000`
 * (`verify-2026-09-19/deck-score/joint-floor.txt`); changing the number needs
 * a score-version bump. `b >= .70` would reject the statistic (§9.2) — at
 * that point the recipes separate nothing and the answer is a recipe change.
 *
 * | statistic (n = 1,000) | p50 | p90 | p95 | p99 | max |
 * |---|---:|---:|---:|---:|---:|
 * | GENERIC (max per pile) | .467 | .531 | .543 | .576 | .589 |
 * | ALL ENGINE (max per pile) | .480 | .548 | .565 | .590 | .623 |
 * | JOINT (max over all recipes) | .492 | .556 | **.574** | .590 | .623 |
 *
 * ONE FLOOR, NOT TWO. v1.3 stage 3 froze .542 for the generic trio and .559
 * for the engine families: two p95s bound two groups at 5% EACH, while a pile
 * leaks through whichever recipe happens to fit it, so the union was never
 * bounded. Measured on the very cohort the floors came from, the same table's
 * lower block: frozen pair 931/1000 piles at S <= 5, per-group p95s
 * (.543/.565) 938/1000, the shared joint p95 978/1000. Only the joint
 * statistic delivers the ~95% the floor is defined to deliver.
 *
 * A 99-card pile of legal singletons accidentally supplies ordinary threats,
 * answers and value at Q ~ .49 with R = 1, which at .30 earned S ~ 47. This
 * is a DENSITY test against accidental role supply, and it is why the number
 * is measured rather than chosen: it was NOT picked to save an anchor, and
 * `vivi-battery-arena` pays for it (see the stage 4a report).
 *
 * The §9.2 forecast was .46. It was measured against the FLAT §5 piles, whose
 * curve and colours are not a real deck's; a curve-matched control fills the
 * generic roles better and leaks more.
 */
/* Round 1: re-measured at .683 (was .574) over the same 1,000 matched
 * Commander controls. It now sits .017 BELOW `Q_SATURATION` (.70), so the S
 * window is 17 thousandths wide and S can no longer resolve a good deck from a
 * fair one — it reads ~0 or ~100. §9.2's rejection rule (`b >= .70` rejects the
 * statistic) is not tripped, but this is the same defect stage 4c found in
 * Brawl. It is a RECIPE/SATURATION problem, not a prior one: fitting b down to
 * keep the window open would be exactly the fit §4 forbids. Round 2 owns it. */
export const Q_BASELINE_JOINT_COMMANDER = 0.683;

/**
 * v1.3 stage 4b: the SAME joint statistic, measured on the Brawl corpus under
 * the Brawl bands. `scripts/brawl-sample.sql` pulled 1,746 Historic Brawl
 * lists over 287 commanders from the CF corpus (11,281 decks / 1,635
 * commanders); 1,000 land/curve/colour-matched controls were drawn from the
 * 179 TRAINING commanders of that file's commander-disjoint stride, under
 * Arena Brawl legality (`legalities.brawl`, 15,762 cards) and at the same
 * .930 typed-coverage target. Re-print with
 * `npx tsx scripts/deck-score-bands.ts negative --joint --n 1000 --profile brawl`
 * (`verify-2026-09-19/deck-score/joint-floor-brawl.txt`).
 *
 * | statistic (n = 1,000) | p50 | p90 | p95 | p99 | max |
 * |---|---:|---:|---:|---:|---:|
 * | GENERIC (max per pile) | .558 | .630 | .646 | .679 | .780 |
 * | ALL ENGINE (max per pile) | .574 | .645 | .667 | .707 | .723 |
 * | JOINT (max over all recipes) | .583 | .656 | **.675** | .712 | .780 |
 *
 * In-sample S <= 5 on the cohort it was frozen from: Commander's .574
 * 509/1000, per-group p95s (.646/.667) 926/1000, the shared joint p95
 * 953/1000 — the same ordering stage 4a measured for Commander, so Brawl gets
 * one floor for the same reason.
 *
 * It sits .101 above the Commander floor because a 100-card ARENA singleton
 * pile fills roles better than a 100-card paper one: the Brawl-legal pool is
 * half the size (15,762 vs 31,863) and modern-era, so a random draw lands more
 * typed removal and more cheap interaction, and the measured Brawl bands are
 * themselves wider where real 1v1 lists are wider (midrange answers p90 20 vs
 * the Commander 10, spells 32 vs 26). Both effects raise credited Q on a pile,
 * and the floor is what prices them.
 */
/* Round 1: re-measured at .733 (was .675); the Brawl saturation moved with it
 * to .758, so this window is .025 wide — unchanged in width, higher in level. */
export const Q_BASELINE_JOINT_BRAWL = 0.733;

/**
 * v1.3 stage 4b: the Q floor the CLOSING (`combo`) plan answers to in a
 * Commander-family profile. Stage 4a left it at `Q_BASELINE` (.30) on the
 * argument that §9.5's essential-completion check is its own floor; the
 * acceptance run then read `combo` on 1 of 200 fresh controls, because one
 * alternate-win card in a 99-card pile gives a single-member pool that is
 * complete BY CONSTRUCTION and fits at ~.02 while every other recipe sits
 * pinned at 0 by the .574 floor.
 *
 * MEASURED with the SAME statistic as every other floor — the 95th percentile
 * of the closing plan's Q over matched negative controls that assemble a line
 * at all (`npx tsx scripts/deck-score-bands.ts closingfloor --n 1200 --stride`,
 * `verify-2026-09-19/deck-score/closing-floor.txt`):
 *
 * | population | n | Q p50 | Q p90 | Q p95 | Q max |
 * |---|---:|---:|---:|---:|---:|
 * | controls that assemble a line | 46 | .290 | .317 | **.323** | .355 |
 * | of those, the ones whose closing plan WINS §1 ordering | 5 | .317 | .323 | .323 | .323 |
 * | reviewed cEDH Top-16 positives | 28 | .667 | .710 | .729 | .732 |
 *
 * The two populations do not overlap: the controls top out at .355 and the
 * weakest reviewed positive sits at .600, so the floor costs 0 of 28
 * positives and removes 5 of 5 control wins (0/200 on the acceptance prefix
 * and 0/853 over the whole cohort).
 *
 * MEASURED ON THE HOLDOUT, and that is not a choice: the 1,648-pile TRAINING
 * cohort assembles ZERO closing lines, so it cannot supply this statistic at
 * all. The event is rare by construction (46 of 853 = 5.4%).
 *
 * The alternative stage 4a named — refusing a one-CARD pool as an assembled
 * line — is REFUTED by the same table: all 28 reviewed cEDH positives close on
 * a single alternate-win card (`alt_win`, pieces 1, r 1), Ballooncon included,
 * so that rule costs every positive its closing plan and keeps nothing the
 * floor does not already remove. It was implemented and reverted in stage 4a
 * for the same reason; this is the measurement that settles it.
 */
export const Q_BASELINE_CLOSING = 0.323;

/**
 * v1.3 stage 4c: the Brawl closing floor, the SAME statistic on the Brawl
 * corpus — the p95 of the closing plan's Q over matched Brawl controls that
 * assemble a line at all. Re-print with
 * `npx tsx scripts/deck-score-bands.ts closingfloor --profile brawl --n 1200 --stride`
 * (`verify-2026-09-19/deck-score/closing-floor-brawl-holdout.txt`).
 *
 * | population | n | Q p50 | Q p90 | Q p95 | Q max |
 * |---|---:|---:|---:|---:|---:|
 * | Brawl controls that assemble a line | 106 | .279 | .328 | **.338** | .355 |
 * | of those, the ones whose closing plan WINS | 26 | .303 | .338 | .349 | .355 |
 * | reviewed cEDH positives (reference) | 28 | .667 | .710 | .729 | .732 |
 *
 * MEASURED ON THE HOLDOUT for the same structural reason the Commander one
 * was: the 1,037-pile Brawl TRAINING cohort assembles ZERO closing lines
 * (`closing-floor-brawl.txt`), so it cannot supply the statistic. The event is
 * far commoner in Brawl than in Commander (106/501 = 21% against 46/853 =
 * 5.4%) because a 100-card Arena pool is half the size and denser in
 * alternate-win cards, which is exactly why Brawl needs its own number: the
 * Commander .323 leaves 6 of 501 Brawl controls with a positive closing fit,
 * .338 leaves 2. It costs no positive — the weakest reviewed cEDH line sits at
 * .600, .245 above this floor.
 */
/* Round 1: re-measured at .373 (was .338). WEAK EVIDENCE: only 8 of 516
 * Brawl holdout controls still assemble a closing line at all (was 106), so
 * this p95 is effectively the max of 8 samples. The direction is conservative
 * (a higher floor removes more control wins and the weakest reviewed cEDH line
 * sits at .600), but the statistic needs a bigger event rate to be worth the
 * name. The Commander twin could not be measured at all this round: 0 of 1,000
 * training and 0 of 823 holdout controls assembled a line, so
 * `Q_BASELINE_CLOSING` stays at .323. Evidence: `floors-round1.txt`. */
export const Q_BASELINE_CLOSING_BRAWL = 0.373;

/**
 * §9.1 Standard deployment: a copy credited for a role with deadline `d`
 * earns `a = clip(P(cast by d) / DEPLOYMENT_PROBABILITY_TARGET)`, where P is
 * the lands-only hypergeometric probability of holding `ceil(c)` lands by that
 * turn. .5 is the "even money" reference — a mode the deck casts on time half
 * the time is one full unit of useful supply; anything rarer is discounted
 * linearly. It replaces the v1.2 binary cutoff at the truncated land MEAN,
 * which refused every five-drop of the modal 24-land Standard deck.
 */
export const DEPLOYMENT_PROBABILITY_TARGET = 0.5;

/**
 * §8 "Evidence, not popularity-based support": below this TYPED coverage of
 * nonland copies the total is provisional — shown with all components, but
 * without "calibrated" status. It is a gate with `cap: null`, not the v1
 * mechanical 69 cap.
 */
export const COVERAGE_EVIDENCE_THRESHOLD = 0.80;

/**
 * Calibration surface. `scoreDeck(input, tuning)` overlays these on the frozen
 * tables for ONE call; nothing is mutated, so a grid search can run thousands
 * of candidates in-process and the default path stays the frozen constants.
 */
export interface ScoreTuning {
  weights?: Partial<Record<ComponentKey, number>>;
  norms?: Partial<FormatNorms>;
  capIntercept?: number;
  capSlope?: number;
}
