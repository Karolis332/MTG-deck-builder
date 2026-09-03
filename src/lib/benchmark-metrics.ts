/**
 * Pure metrics for the deck-quality benchmark (scripts/deck-benchmark.ts).
 * No DB access, no I/O — everything here takes plain card data and numbers.
 */
import { classifyCard, getPrimaryCategory, computeManaCurve, type CardCategory } from './card-classifier';

export interface CardLite {
  name: string;
  oracle_text?: string | null;
  type_line?: string | null;
  cmc?: number | null;
}

/** The 8 count metrics used for compositionDistance, plus avgCmcNonLand and curve. */
export interface Composition {
  lands: number;
  ramp: number;
  draw: number;
  removal: number;
  boardWipes: number;
  tutors: number;
  winCons: number;
  protection: number;
  avgCmcNonLand: number;
  curve: Record<number, number>;
}

/** The 8 count fields compositionDistance averages over (excludes avgCmcNonLand + curve). */
export const COUNT_METRICS = [
  'lands', 'ramp', 'draw', 'removal', 'boardWipes', 'tutors', 'winCons', 'protection',
] as const;
export type CountMetric = (typeof COUNT_METRICS)[number];

const CATEGORY_TO_COUNT: Partial<Record<CardCategory, CountMetric>> = {
  ramp: 'ramp', draw: 'draw', removal: 'removal', board_wipe: 'boardWipes',
  tutor: 'tutors', win_condition: 'winCons', protection: 'protection',
};

function isLand(typeLine: string | null | undefined): boolean {
  return /\bLand\b/.test(typeLine || '');
}

/**
 * Nonland card names, keyed by lowercase (matching convention) but preserving
 * original display casing as the value — same denominator convention as the
 * harness's referenceOverlapPct. First occurrence wins on casing.
 */
export function nonlandNames(cards: CardLite[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of cards) {
    if (isLand(c.type_line)) continue;
    const key = c.name.toLowerCase();
    if (!out.has(key)) out.set(key, c.name);
  }
  return out;
}

export function compositionOf(cards: CardLite[], commanderOracle?: string): Composition {
  const comp: Composition = {
    lands: 0, ramp: 0, draw: 0, removal: 0, boardWipes: 0, tutors: 0, winCons: 0, protection: 0,
    avgCmcNonLand: 0, curve: {},
  };
  let nonLandCmcSum = 0;
  let nonLandCount = 0;

  for (const c of cards) {
    const typeLine = c.type_line || '';
    const cmc = c.cmc ?? 0;
    if (isLand(typeLine)) {
      comp.lands += 1;
      continue;
    }
    nonLandCmcSum += cmc;
    nonLandCount += 1;
    const cats = classifyCard(c.name, c.oracle_text || '', typeLine, cmc, commanderOracle);
    // A card can hit multiple count buckets (e.g. removal + protection) — count each.
    for (const cat of cats) {
      const key = CATEGORY_TO_COUNT[cat];
      if (key) comp[key] += 1;
    }
  }

  comp.avgCmcNonLand = nonLandCount ? nonLandCmcSum / nonLandCount : 0;
  comp.curve = computeManaCurve(
    cards.map((c) => ({ cmc: c.cmc ?? 0, typeLine: c.type_line || '' }))
  );
  return comp;
}

export type CompositionWithNames = Composition & { names: Map<string, string> };

export interface StapleGap {
  name: string;
  freq: number; // fraction of refs (0..1) that include this card
}

export interface MetricDelta {
  build: number;
  refMedian: number;
  delta: number; // build - refMedian, signed
}

export interface CompareResult {
  overlapMeanPct: number; // mean over refs of |build ∩ ref| / |build nonland|
  overlapBestPct: number; // max over refs of the same ratio
  staplesMissing: StapleGap[]; // refs-only cards at >=60% freq, sorted desc by freq
  oddCards: string[]; // build nonland cards absent from every ref
  deltas: Record<CountMetric | 'avgCmcNonLand', MetricDelta>;
  curveL1: number; // L1 distance between build curve and per-bucket median ref curve
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function compareToSet(build: CompositionWithNames, refs: CompositionWithNames[]): CompareResult {
  const buildNames = build.names; // lowercase key -> original casing
  const denom = Math.max(1, buildNames.size);

  let overlapSum = 0;
  let overlapBest = 0;
  const staplesFreq = new Map<string, { count: number; display: string }>();

  for (const ref of refs) {
    let hit = 0;
    for (const key of buildNames.keys()) if (ref.names.has(key)) hit++;
    const pct = (hit / denom) * 100;
    overlapSum += pct;
    overlapBest = Math.max(overlapBest, pct);

    for (const [key, display] of ref.names) {
      const entry = staplesFreq.get(key);
      if (entry) entry.count += 1;
      else staplesFreq.set(key, { count: 1, display });
    }
  }
  const refCount = Math.max(1, refs.length);

  const staplesMissing: StapleGap[] = [];
  for (const [key, { count, display }] of staplesFreq) {
    const freq = count / refCount;
    if (freq >= 0.6 && !buildNames.has(key)) staplesMissing.push({ name: display, freq });
  }
  staplesMissing.sort((a, b) => b.freq - a.freq);

  const oddCards = [...buildNames.entries()]
    .filter(([key]) => !refs.some((r) => r.names.has(key)))
    .map(([, display]) => display);

  const deltas = {} as Record<CountMetric | 'avgCmcNonLand', MetricDelta>;
  for (const key of [...COUNT_METRICS, 'avgCmcNonLand' as const]) {
    const refMedian = median(refs.map((r) => r[key]));
    deltas[key] = { build: build[key], refMedian, delta: build[key] - refMedian };
  }

  const buckets = new Set<number>();
  for (const r of [build, ...refs]) for (const b of Object.keys(r.curve)) buckets.add(Number(b));
  let curveL1 = 0;
  for (const b of buckets) {
    const refMedianAtBucket = median(refs.map((r) => r.curve[b] ?? 0));
    curveL1 += Math.abs((build.curve[b] ?? 0) - refMedianAtBucket);
  }

  return {
    overlapMeanPct: overlapSum / refCount,
    overlapBestPct: overlapBest,
    staplesMissing,
    oddCards,
    deltas,
    curveL1,
  };
}

export function qualityIndex(opts: {
  overlapMeanPct: number;
  compositionDistance: number;
  bracketMatch: boolean;
}): number {
  const overlapTerm = 50 * (opts.overlapMeanPct / 100);
  const compTerm = 30 * (1 - Math.min(1, opts.compositionDistance));
  const bracketTerm = 20 * (opts.bracketMatch ? 1 : 0);
  return overlapTerm + compTerm + bracketTerm;
}

/** Mean over the 8 count metrics of |delta| / max(1, refMedian), each capped at 1. */
export function compositionDistanceOf(deltas: Record<CountMetric | 'avgCmcNonLand', MetricDelta>): number {
  let sum = 0;
  for (const key of COUNT_METRICS) {
    const d = deltas[key];
    sum += Math.min(1, Math.abs(d.delta) / Math.max(1, d.refMedian));
  }
  return sum / COUNT_METRICS.length;
}
