/**
 * Deck Score v1 — Interaction (I) and Advantage/velocity (A). docs/DECK_SCORE_SPEC.md §1.
 */
import { clip, Hf } from './deck-score-math';
import { archetypeMultiplier, type FormatNorms, type ScoreFormat, type AnswerAxis } from './deck-score-norms';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import type { Archetype } from './deck-templates';

const DRAW_NUMERAL: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, x: 2, 'that many': 2 };

/** Immediate net cards drawn, from the oracle text of ONE card (a rough g_i).
 * // ponytail: no mandatory-discard/sacrifice offset (spec's "after spending
 * // the spell and mandatory discards"); upgrade path is a curated per-card
 * // net-draw table, not a smarter regex. */
function immediateDrawUnits(oracleText: string | null): number {
  const m = (oracleText || '').match(/draw (a|one|two|three|four|x|that many) cards?/i);
  if (!m) return 0;
  return DRAW_NUMERAL[m[1].toLowerCase()] ?? 1;
}

/** `E`, `Kcheap`, `breadth` -> Interaction (I), §1. */
export function computeInteraction(
  format: ScoreFormat,
  norms: FormatNorms,
  archetype: Archetype,
  N: number,
  mainEntries: DeckEntry[],
): ComponentOutput {
  const mult = archetypeMultiplier(archetype);
  const Estar = norms.interactionUnitsTarget * mult.interactionUnits;
  const Kstar = norms.cheapAnswerTarget * mult.cheapAnswers;

  const answerers = mainEntries.filter((e) => !e.feature.isLand && e.feature.answerAxes.length > 0);
  let E = 0;
  let Kcheap = 0;
  const axisTotals: Record<AnswerAxis, number> = { creature: 0, permanent: 0, stack: 0, graveyard_or_protection: 0 };
  let weakestAxis: AnswerAxis | null = null;

  for (const entry of answerers) {
    const units = entry.feature.e * entry.quantity;
    E += units;
    if (entry.feature.c <= 2) Kcheap += entry.quantity;
    const axes = entry.feature.answerAxes;
    const share = units / axes.length;
    for (const axis of axes) axisTotals[axis] += share;
  }

  let breadth = 0;
  let weakestRatio = Infinity;
  for (const axis of Object.keys(axisTotals) as AnswerAxis[]) {
    const ratio = clip(axisTotals[axis] / norms.answerAxisTarget);
    breadth += norms.axisWeights[axis] * ratio;
    if (ratio < weakestRatio) { weakestRatio = ratio; weakestAxis = axis; }
  }

  const score = 100 * (0.55 * clip(E / Estar) + 0.25 * clip(Kcheap / Kstar) + 0.20 * breadth);
  return {
    score,
    reason: `${E.toFixed(1)}/${Estar.toFixed(1)} effective answers, ${Kcheap}/${Kstar.toFixed(1)} cheap; weakest coverage: ${weakestAxis ?? 'none'}.`,
  };
}

/** `D`, `Kvel` -> Advantage/velocity (A), §1. */
export function computeAdvantage(
  format: ScoreFormat,
  norms: FormatNorms,
  archetype: Archetype,
  N: number,
  mainEntries: DeckEntry[],
): ComponentOutput {
  const mult = archetypeMultiplier(archetype);
  const Dstar = norms.drawUnitTarget * mult.drawUnits;
  const T = norms.drawHorizonTurns;

  const drawCards = mainEntries.filter((e) => !e.feature.isLand && (e.feature.isDraw || e.feature.isDrawEngine));
  let D = 0;
  for (const entry of drawCards) {
    const { feature } = entry;
    const g = immediateDrawUnits(feature.card.oracle_text);
    const isEngine = feature.isDrawEngine;
    const a = isEngine ? 1 : 0;
    const tau = 1;
    const tActivate = Math.max(1, Math.ceil(feature.c));
    if (tActivate > T) continue;
    const repeatTerm = a * Math.min(2, Math.max(0, 1 + Math.floor((T - tActivate) / tau)));
    const v = Math.max(0, Math.min(4, g + repeatTerm));
    D += feature.e * entry.quantity * v;
  }

  const Kvel = mainEntries
    .filter((e) => !e.feature.isLand && e.feature.isDraw && !e.feature.isDrawEngine && e.feature.c <= 2)
    .reduce((s, e) => s + e.quantity, 0);
  const velocityAccess = Hf(format, N, Kvel, T, 1);

  const score = 100 * (0.65 * clip(D / Dstar) + 0.35 * clip(velocityAccess / norms.velocityAccessTarget));
  return {
    score,
    reason: `${D.toFixed(1)}/${Dstar.toFixed(1)} draw units by turn ${T}; ${Kvel} cheap velocity cards.`,
  };
}
