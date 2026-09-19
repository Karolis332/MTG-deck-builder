/**
 * Deck Score v1 — Synergy / plan coverage (S). docs/DECK_SCORE_SPEC.md §1.
 */
import { clip } from './deck-score-math';
import { referenceLibrarySize, type FormatNorms, type ScoreFormat } from './deck-score-norms';
import { getTemplate, type Archetype } from './deck-templates';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import type { CardFeature } from './deck-score-features';

const TARGETED_CATEGORIES = new Set(['removal', 'board_wipe', 'protection', 'win_condition', 'synergy', 'tutor']);

/** Generic infrastructure (ramp/draw) counts toward the plan only up to the
 * template's upper band — extra copies beyond that are redundant, not on-plan. */
function onPlanShare(feature: CardFeature, rampQty: number, drawQty: number, rampMax: number, drawMax: number): number {
  if (feature.categories.some((c) => TARGETED_CATEGORIES.has(c))) return 1;
  if (feature.isRamp) return clip(rampMax / Math.max(1, rampQty));
  if (feature.isDraw) return clip(drawMax / Math.max(1, drawQty));
  const mechanicFlag = feature.isFoodProducer || feature.isFoodPayoff || feature.isTreasureProducer ||
    feature.isTokenProducer || feature.isTokenPayoff || feature.isSacOutlet || feature.isDrainPayoff ||
    feature.isAnthemOrOverrun || feature.isAltWin || feature.isEquipmentOrAura || feature.isComboPiece;
  return mechanicFlag ? 1 : 0;
}

/** Whether a dependent payoff's producer requirement is actually met — this
 * is the mechanism the spec's "quota-gaming" invariant (§4) checks: a
 * quota-perfect pile with the payoff but no producer must score lower here. */
function linkedSupport(feature: CardFeature, counts: { food: number; token: number; sac: number }): number {
  if (feature.isFoodPayoff) return counts.food > 0 ? feature.s : 0;
  if (feature.isTokenPayoff) return counts.token > 0 ? feature.s : 0;
  if (feature.isDrainPayoff) return counts.sac > 0 ? feature.s : 0;
  return feature.s;
}

/** `Q`, `R`, `B` -> Synergy / plan coverage (S), §1. */
export function computeSynergy(
  format: ScoreFormat,
  norms: FormatNorms,
  archetype: Archetype,
  N: number,
  mainEntries: DeckEntry[],
): ComponentOutput {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  if (F === 0) return { score: 0, reason: '0% supports no plan; weakest dependency none 0/0; 0 unsupported payoffs.' };

  const template = getTemplate(archetype);
  const scale = N / referenceLibrarySize(format);

  const rampQty = nonLand.filter((e) => e.feature.isRamp).reduce((s, e) => s + e.quantity, 0);
  const drawQty = nonLand.filter((e) => e.feature.isDraw).reduce((s, e) => s + e.quantity, 0);
  const removalQty = nonLand.filter((e) => e.feature.isRemoval || e.feature.isWipe).reduce((s, e) => s + e.quantity, 0);
  const creatureQty = nonLand.filter((e) => /\bCreature\b/.test(e.feature.card.type_line || '')).reduce((s, e) => s + e.quantity, 0);
  const winConditionQty = nonLand.filter((e) => e.feature.isWinConditionRole).reduce((s, e) => s + e.quantity, 0);

  let Q = 0;
  for (const e of nonLand) {
    const onPlan = onPlanShare(e.feature, rampQty, drawQty, template.ramp.totalMax, template.draw.totalMax);
    Q += e.quantity * e.feature.s * onPlan;
  }
  Q /= F;

  const requirements: Array<{ key: string; actual: number; target: number }> = [
    { key: 'ramp', actual: rampQty, target: template.ramp.totalMin * scale },
    { key: 'draw', actual: drawQty, target: template.draw.totalMin * scale },
    { key: 'removal', actual: removalQty, target: template.removal.totalMin * scale },
  ];
  if (template.creatures[0] > 0) requirements.push({ key: 'creatures', actual: creatureQty, target: template.creatures[0] * scale });
  if (template.winConditionSlots[0] > 0) requirements.push({ key: 'win conditions', actual: winConditionQty, target: template.winConditionSlots[0] * scale });

  let R = 1;
  let weakest = { key: 'none', actual: 0, target: 0, ratio: 1 };
  for (const req of requirements) {
    if (req.target <= 0) continue;
    const ratio = clip(req.actual / req.target);
    if (ratio < R) R = ratio;
    if (ratio < weakest.ratio) weakest = { ...req, ratio };
  }

  const foodCount = nonLand.filter((e) => e.feature.isFoodProducer).reduce((s, e) => s + e.quantity, 0);
  const tokenCount = nonLand.filter((e) => e.feature.isTokenProducer).reduce((s, e) => s + e.quantity, 0);
  const sacCount = nonLand.filter((e) => e.feature.isSacOutlet).reduce((s, e) => s + e.quantity, 0);
  const dependentPayoffs = nonLand.filter((e) => e.feature.isFoodPayoff || e.feature.isTokenPayoff || e.feature.isDrainPayoff);
  let B = 1;
  let deadPayoffs = 0;
  if (dependentPayoffs.length > 0) {
    let num = 0;
    let den = 0;
    for (const e of dependentPayoffs) {
      const linked = linkedSupport(e.feature, { food: foodCount, token: tokenCount, sac: sacCount });
      num += e.quantity * linked;
      den += e.quantity;
      if (linked === 0) deadPayoffs += e.quantity;
    }
    B = den > 0 ? num / den : 1;
  }

  const score = 100 * (0.40 * clip(Q / norms.planFractionTarget) + 0.35 * R + 0.25 * B);
  return {
    score,
    reason: `${Math.round(Q * 100)}% supports ${archetype}; weakest dependency ${weakest.key} ${weakest.actual}/${Math.round(weakest.target)}; ${deadPayoffs} unsupported payoffs.`,
  };
}
