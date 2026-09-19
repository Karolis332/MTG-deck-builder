/**
 * Deck Score v1 — frozen constants (weights, format norms, archetype
 * multipliers, hard caps). docs/DECK_SCORE_SPEC.md §1 "Weights and format
 * norms" + §2 "Gated composition".
 *
 * Every number here is copied straight from the spec tables. Changing a
 * number without bumping SCORE_VERSION breaks the "freeze inference rules
 * and norms by score version" contract (§1).
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

export function weightsFor(format: ScoreFormat): Record<ComponentKey, number> {
  return WEIGHTS[profileOf(format)];
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
    fastClosingTurn: 4, delayHalfLifeTurns: 4,
    winAccessTarget: 0.25, planFractionTarget: 0.55,
    enablerSupplyDefault: 8,
    corpusMinLists: 30, corpusShrinkagePrior: 200,
    corpusAgeWindowDays: 180, corpusDecayHalfLifeDays: 90,
    wlMinMatches: null, wlPseudoMatches: null,
  },
  brawl: {
    landDeadband: 2, landFalloffWidth: 8,
    pColor: 0.90, pEarly: 0.90,
    interactionUnitsTarget: 12, cheapAnswerTarget: 7,
    answerAxisTarget: 2,
    axisWeights: { creature: 0.40, permanent: 0.20, stack: 0.25, graveyard_or_protection: 0.15 },
    drawHorizonTurns: 5, drawUnitTarget: 8, velocityAccessTarget: 0.90,
    fastClosingTurn: 4, delayHalfLifeTurns: 3,
    winAccessTarget: 0.35, planFractionTarget: 0.50,
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
    fastClosingTurn: 4, delayHalfLifeTurns: 2,
    winAccessTarget: 0.70, planFractionTarget: 0.50,
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
export function qualityCap(mana: number, win: number, synergy: number): number {
  return 20 + 0.8 * Math.min(mana, win, synergy);
}

/** §2 hard caps, most restrictive wins (smallest number). */
export const HARD_CAP_INVALID = 0;
export const HARD_CAP_STRUCTURE = 19;
export const HARD_CAP_UNRESOLVED = 39;

export const SCORE_VERSION = '1.0.0';
