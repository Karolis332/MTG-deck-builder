/**
 * Deck Score v1 — Mana (M) and Curve (C) components. docs/DECK_SCORE_SPEC.md §1.
 */
import type { DbCard } from './types';
import { karstenLands, countMdfcLandBacks, effectiveLandCount, type MdfcLike } from './land-math';
import { countColorSources } from './mana-sources';
import { getScaledCurve, type Archetype } from './deck-templates';
import { HIGH_CMC_COMMANDER_THRESHOLD, HIGH_CMC_SHIFT_FRACTION } from './curve-score';
import { clip, H, Hf } from './deck-score-math';
import { pipDemandByColor, type CardFeature } from './deck-score-features';
import type { ScoreFormat, FormatNorms } from './deck-score-norms';

export interface DeckEntry {
  feature: CardFeature;
  quantity: number;
}

export interface ComponentOutput {
  score: number;
  reason: string;
}

const ENTERS_TAPPED = /enters (?:the battlefield )?tapped/i;

function b60or99(format: ScoreFormat): number {
  // §1 M: "Let B=99 for 100-card commander formats, otherwise 60" — a literal
  // reading distinct from referenceLibrarySize (which gives Standard Brawl 59).
  return format === 'commander' || format === 'brawl' || format === 'competitivebrawl' ? 99 : 60;
}

function toMdfcLike(entries: DeckEntry[]): MdfcLike[] {
  return entries.map((e) => ({ type_line: e.feature.card.type_line, layout: e.feature.card.layout, quantity: e.quantity }));
}

/** Sources of each color "usable by turn t": lands online turn 1; mana dorks
 * need a turn to shake off summoning sickness before their tap ability works. */
function sourcesUsableByTurn(mainEntries: DeckEntry[], t: number): Record<string, number> {
  const eligible: Array<{ card: DbCard; quantity: number }> = [];
  for (const e of mainEntries) {
    const { feature, quantity } = e;
    if (feature.isLand) { eligible.push({ card: feature.card, quantity }); continue; }
    const isCreature = /\bCreature\b/.test(feature.card.type_line || '');
    const deadline = isCreature ? t - 1 : t;
    if (feature.c <= deadline) eligible.push({ card: feature.card, quantity });
  }
  return countColorSources(eligible);
}

/** `landFit` + `colorFit` + `earlyMana` -> Mana (M), §1. */
export function computeMana(
  format: ScoreFormat,
  norms: FormatNorms,
  N: number,
  mainEntries: DeckEntry[],
  commanderFeatures: CardFeature[],
  /** The profile's reference library (§10.2 `N0`). The land REQUIREMENT scales
   * with the submitted size; the land SURPLUS is measured against this. */
  n0: number = N,
): ComponentOutput {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  const landEntries = mainEntries.filter((e) => e.feature.isLand);
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  if (N <= 0 || F === 0) return { score: 0, reason: '0 effective lands vs 0; no nonland spells to color-check.' };

  const totalCmc = nonLand.reduce((s, e) => s + e.feature.c * e.quantity, 0);
  const avgMv = totalCmc / F;
  const cheapCount = nonLand
    .filter((e) => e.feature.c <= 2 && (e.feature.isRamp || e.feature.isDraw))
    .reduce((s, e) => s + e.quantity, 0);

  const B = b60or99(format);
  const karstenAt = (size: number): number =>
    (size / B) * karstenLands(B, avgMv, (cheapCount * B) / size);
  const Lstar = karstenAt(N);
  // v1.4 stage 3c (§10.4 "add untyped"): a SHORTFALL is measured against the
  // submitted library — a bigger deck needs more lands to hit its drops — but
  // a SURPLUS is measured against the profile's reference library. The surplus
  // is wasted slots, and stacking more slots beside them removes no land: a
  // flooded 60-card Standard list (22 lands vs 16) was buying +42 landFit by
  // padding to 70 cards, because the requirement, not the deck, had moved
  // (`standard:1482755`, stage 3b probes). Below the reference size the two
  // targets coincide, and the size gate has already failed the list anyway.
  const Lsurplus = karstenAt(Math.min(n0, N));

  const lands = landEntries.reduce((s, e) => s + e.quantity, 0);
  const mdfcBacks = countMdfcLandBacks(toMdfcLike(mainEntries));
  const Leff = effectiveLandCount(lands, mdfcBacks);
  const deviation = Math.max(0, Lstar - Leff) + Math.max(0, Leff - Lsurplus);
  const landFit = 1 - clip((Math.max(0, deviation - norms.landDeadband)) / norms.landFalloffWidth);

  // colorFit — memoize R(t,r) since most spells share a handful of (t,r) pairs.
  const sourcesByTurn = new Map<number, Record<string, number>>();
  const getSources = (t: number) => {
    if (!sourcesByTurn.has(t)) sourcesByTurn.set(t, sourcesUsableByTurn(mainEntries, t));
    return sourcesByTurn.get(t)!;
  };
  const rCache = new Map<string, number>();
  const findR = (t: number, r: number): number => {
    const key = `${t}:${r}`;
    const cached = rCache.get(key);
    if (cached !== undefined) return cached;
    let result = Infinity;
    for (let k = 0; k <= N; k++) {
      if (Hf(format, N, k, t, r) >= norms.pColor) { result = k; break; }
    }
    rCache.set(key, result);
    return result;
  };

  const spellSet: Array<{ card: DbCard; c: number; q: number; blank?: boolean }> = [
    ...nonLand.map((e) => ({ card: e.feature.card, c: e.feature.c, q: e.quantity, blank: e.feature.blank })),
    ...commanderFeatures.map((f) => ({ card: f.card, c: f.c, q: 1 })), // "include commanders once"
  ];

  let weightedSum = 0;
  let weightTotal = 0;
  let weakest: { color: string; K: number; R: number; adequacy: number } | null = null;
  for (const spell of spellSet) {
    // §10.9 item 5: an unresolved slot's colour requirements are unknown, so
    // they are unverified — 0 adequacy, never the free 1 a costless card gets.
    if (spell.blank) { weightTotal += spell.q; continue; }
    const pips = pipDemandByColor(spell.card);
    const colors = Object.keys(pips);
    if (colors.length === 0) { weightedSum += spell.q * 1; weightTotal += spell.q; continue; }
    const t = Math.max(1, Math.min(4, Math.ceil(spell.c)));
    const sources = getSources(t);
    let minAdequacy = 1;
    for (const color of colors) {
      const r = pips[color];
      const R = findR(t, r);
      const K = color === 'C' ? Object.values(sources).reduce((s, v) => Math.max(s, v), 0) : (sources[color] || 0);
      const adequacy = Number.isFinite(R) ? clip(K / R) : 0;
      if (adequacy < minAdequacy) minAdequacy = adequacy;
      if (!weakest || adequacy < weakest.adequacy) weakest = { color, K, R: Number.isFinite(R) ? R : -1, adequacy };
    }
    weightedSum += spell.q * minAdequacy;
    weightTotal += spell.q;
  }
  const colorFit = weightTotal > 0 ? weightedSum / weightTotal : 1;

  const untappedLands = landEntries
    .filter((e) => !ENTERS_TAPPED.test(e.feature.card.oracle_text || ''))
    .reduce((s, e) => s + e.quantity, 0);
  const earlyMana = clip(H(N, untappedLands, 7, 1) / 0.95);

  const score = 100 * (0.45 * landFit + 0.45 * colorFit + 0.10 * earlyMana);
  const weakestLabel = weakest ? `${weakest.color} has ${weakest.K}/${weakest.R < 0 ? '∞' : weakest.R}` : 'no colored demand';
  return {
    score,
    reason: `${Leff} effective lands vs ${Lstar.toFixed(1)}; ${weakestLabel} timely sources.`,
  };
}

/** Reproduce curve-score.ts's high-CMC-commander target shift (the function
 * itself isn't exported, only its tuning constants are). */
function shiftTargetForCommander(rawTarget: Record<number, number>, commanderCmc: number): Record<number, number> {
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

function bucketOf(cmc: number): number {
  return cmc >= 7 ? 7 : Math.max(0, Math.floor(cmc));
}

/** `TV` (target-histogram distance) + `early` (turn-2 usable play) -> Curve (C), §1. */
export function computeCurve(
  format: ScoreFormat,
  norms: FormatNorms,
  archetype: Archetype,
  N: number,
  mainEntries: DeckEntry[],
  commanderCmc: number,
): ComponentOutput {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  if (F === 0) return { score: 0, reason: '0-drops 0/0; no nonland spells to curve-check.' };

  const rawTarget = getScaledCurve(archetype, F);
  const target = shiftTargetForCommander(rawTarget, commanderCmc);
  const targetTotal = Object.values(target).reduce((a, b) => a + b, 0) || 1;

  const actualBuckets: Record<number, number> = {};
  let blanks = 0;
  for (const e of nonLand) {
    // §10.9 item 5: an unresolved slot has no known cost, so it is imputed
    // into the bin that maximises the histogram distance (below) — it still
    // occupies a nonland slot, so it is already inside `F`.
    if (e.feature.blank) { blanks += e.quantity; continue; }
    actualBuckets[bucketOf(e.feature.c)] = (actualBuckets[bucketOf(e.feature.c)] || 0) + e.quantity;
  }

  const distance = (extraBucket: number | null): { tv: number; bucket: number; count: number } => {
    let total = 0;
    let largestGapBucket = 0;
    let largestGap = -1;
    for (let b = 0; b <= 7; b++) {
      const count = (actualBuckets[b] || 0) + (b === extraBucket ? blanks : 0);
      const gap = Math.abs(count / F - (target[b] || 0) / targetTotal);
      total += gap;
      if (gap > largestGap) { largestGap = gap; largestGapBucket = b; }
    }
    return { tv: total * 0.5, bucket: largestGapBucket, count: (actualBuckets[largestGapBucket] || 0) + (largestGapBucket === extraBucket ? blanks : 0) };
  };
  // The worst bin, by construction: TV under it is >= TV under the bin the
  // blanked card actually occupied, so losing a name never flattens the curve.
  let worst = distance(null);
  if (blanks > 0) {
    for (let b = 0; b <= 7; b++) {
      const candidate = distance(b);
      if (candidate.tv > worst.tv) worst = candidate;
    }
  }
  const { tv, bucket: largestGapBucket, count: largestGapCount } = worst;

  // A slot of unknown cost is never a proved turn-2 play.
  const Kplay = nonLand.filter((e) => !e.feature.blank && e.feature.c <= 2).reduce((s, e) => s + e.quantity, 0);
  const early = clip(Hf(format, N, Kplay, 2, 1) / norms.pEarly);

  const score = 100 * (0.70 * (1 - tv) + 0.30 * early);
  const bucketLabel = largestGapBucket >= 7 ? '7+' : String(largestGapBucket);
  return {
    score,
    reason: `${bucketLabel}-drops ${largestGapCount}/${Math.round(target[largestGapBucket] || 0)}; ${Math.round(early * 100)}% chance of a useful play by turn 2.`,
  };
}
