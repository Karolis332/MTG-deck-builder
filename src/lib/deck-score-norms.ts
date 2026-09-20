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
export const HARD_CAP_UNRESOLVED = 39;

export const SCORE_VERSION = '1.3.0-rc1';

/**
 * §8 "Pile separation belongs to S": `S = 100*clip((Q-.30)/(.70-.30))*R*B`.
 * .30 is the unstructured baseline and .70 the saturation target, for all
 * three profiles. Frozen starting priors for v1.2 validation, not measured
 * estimates — `planFractionTarget` (Q*) stays in FormatNorms as the v1.1
 * historical constant and no longer divides Q.
 */
export const Q_BASELINE = 0.30;
export const Q_SATURATION = 0.70;

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
export const Q_BASELINE_JOINT_COMMANDER = 0.574;

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
