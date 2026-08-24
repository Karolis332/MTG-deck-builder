/**
 * Optimal-CMC curve scoring. docs/SYNERGY_ENGINE_DESIGN.md §2.
 *
 * Target curve comes from the archetype template (getScaledCurve) with a
 * commander-CMC adjustment: commanders at CMC >= 5 shift the support curve
 * down (you must DO something before turn 5, so cheap support matters more
 * when the commander itself eats an expensive slot).
 *
 * Pure function — no DB access.
 */

import { getScaledCurve, getTemplate } from './deck-templates';
import type { Archetype } from './deck-templates';

// ── v1 calibration constants (pending §6 research — see synergy-graph.ts
// for the same caveat on ISS_NORMALIZE_CEILING) ────────────────────────────

/** Penalty per card of deviation in a single CMC bucket. */
export const BUCKET_WEIGHT = 2;
/** Penalty per full CMC unit the deck's average deviates from the target. */
export const AVG_CMC_WEIGHT = 5;
/** High-CMC commander threshold — at/above this, shift the support curve
 * down and lower the target average (the commander already occupies an
 * expensive slot; the 99 needs to function before it lands). */
export const HIGH_CMC_COMMANDER_THRESHOLD = 5;
/** Fraction of the 6-and-7+ buckets redistributed down into the 2/3 buckets
 * when the commander is expensive. */
export const HIGH_CMC_SHIFT_FRACTION = 0.3;
/** Average-CMC target reduction applied under the same condition. */
export const HIGH_CMC_AVG_ADJUSTMENT = 0.2;

export interface CurveCard {
  cmc: number;
}

export interface CurveScoreResult {
  /** 0-100, clamped. 100 = matches the (commander-adjusted) target exactly. */
  score: number;
  /** actual - target per CMC bucket (string keys "0".."6","7+"). */
  perBucket: Record<string, number>;
  /** Human-readable call-outs for buckets off by >= 2 cards. */
  notes: string[];
}

function bucketKey(cmc: number): string {
  return cmc >= 7 ? '7+' : String(Math.max(0, Math.floor(cmc)));
}

/**
 * Apply the high-CMC-commander adjustment to a raw scaled-curve target:
 * move a fraction of the 6 and 7+ bucket counts down into buckets 2 and 3.
 */
function adjustTargetForCommander(rawTarget: Record<number, number>, commanderCmc: number): Record<number, number> {
  if (commanderCmc < HIGH_CMC_COMMANDER_THRESHOLD) return { ...rawTarget };
  const adjusted = { ...rawTarget };
  let shifted = 0;
  for (const bucket of [6, 7]) {
    const count = adjusted[bucket] || 0;
    const move = Math.round(count * HIGH_CMC_SHIFT_FRACTION);
    adjusted[bucket] = count - move;
    shifted += move;
  }
  const half = Math.round(shifted / 2);
  adjusted[2] = (adjusted[2] || 0) + half;
  adjusted[3] = (adjusted[3] || 0) + (shifted - half);
  return adjusted;
}

/**
 * Score a deck's nonland CMC curve against its archetype's scaled target,
 * adjusted for an expensive commander.
 */
export function computeCurveScore(
  archetype: Archetype,
  commanderCmc: number,
  nonLandCards: CurveCard[],
): CurveScoreResult {
  const nonLandSlots = nonLandCards.length;
  const template = getTemplate(archetype);
  const rawTarget = nonLandSlots > 0 ? getScaledCurve(archetype, nonLandSlots) : {};
  const target = adjustTargetForCommander(rawTarget, commanderCmc);

  const actualBuckets: Record<string, number> = {};
  let totalCmc = 0;
  for (const c of nonLandCards) {
    const key = bucketKey(c.cmc);
    actualBuckets[key] = (actualBuckets[key] || 0) + 1;
    totalCmc += c.cmc;
  }
  const actualAvg = nonLandSlots > 0 ? totalCmc / nonLandSlots : 0;

  const targetAvgRaw = (template.avgCmc[0] + template.avgCmc[1]) / 2;
  const targetAvg = commanderCmc >= HIGH_CMC_COMMANDER_THRESHOLD
    ? Math.max(0, targetAvgRaw - HIGH_CMC_AVG_ADJUSTMENT)
    : targetAvgRaw;

  const perBucket: Record<string, number> = {};
  const bucketKeys = ['0', '1', '2', '3', '4', '5', '6', '7+'];
  let bucketPenalty = 0;
  const notes: string[] = [];
  for (const key of bucketKeys) {
    const numKey = key === '7+' ? 7 : Number(key);
    const targetCount = target[numKey] || 0;
    const actualCount = actualBuckets[key] || 0;
    const delta = actualCount - targetCount;
    perBucket[key] = delta;
    bucketPenalty += BUCKET_WEIGHT * Math.abs(delta);
    if (delta >= 2) notes.push(`Too many ${key}-drops (${actualCount} vs target ${targetCount})`);
    else if (delta <= -2) notes.push(`Missing ${key}-drops (${actualCount} vs target ${targetCount})`);
  }

  const avgPenalty = AVG_CMC_WEIGHT * Math.abs(actualAvg - targetAvg);
  const score = Math.max(0, Math.min(100, Math.round(100 - bucketPenalty - avgPenalty)));

  if (Math.abs(actualAvg - targetAvg) >= 0.3) {
    notes.push(
      actualAvg > targetAvg
        ? `Average CMC ${actualAvg.toFixed(2)} is high (target ~${targetAvg.toFixed(2)})`
        : `Average CMC ${actualAvg.toFixed(2)} is low (target ~${targetAvg.toFixed(2)})`
    );
  }

  return { score, perBucket, notes };
}
