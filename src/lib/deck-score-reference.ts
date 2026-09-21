/**
 * Deck Score v1.4 stage 2c — the RANK layer. docs/DECK_SCORE_SPEC.md §10.9.
 *
 * One frozen weighted empirical CDF per admitted format, measured on that
 * format's eligible real TRAINING lists, and the pure mapping
 *
 *   rank_p(t) = 100 * (F_p(t-) + .5 * m_p(t))
 *
 * Nothing here scores a deck, reads the DB or fits a curve: the knots are the
 * complete sorted full-precision absolute totals with their cumulative family
 * weights, written by `scripts/deck-score-bands.ts reference freeze --write`.
 *
 * A format with no cohort (competitivebrawl, standardbrawl) has NO file and
 * therefore no rank — §10.9 item 2, "no reference is borrowed merely because
 * another format also has 100 cards".
 */
import { SCORE_VERSION, type ScoreFormat } from './deck-score-norms';
import COMMANDER_JSON from './deck-score-reference/commander.json';
import BRAWL_JSON from './deck-score-reference/brawl.json';
import STANDARD_JSON from './deck-score-reference/standard.json';

/** Bump whenever the sampling frame, family definition or mapping changes.
 * A stored reference carrying any other value is incompatible (§10.9 item 2,
 * "a missing/incompatible reference or dataset version yields no comparable
 * rank"), never silently reused. */
export const REFERENCE_VERSION = '1.4.0-ref1';

export interface ReferenceKnot {
  /** One distinct full-precision absolute total present in the reference. */
  t: number;
  /** Family weight strictly below `t` — `F_p(t-)`. */
  below: number;
  /** Family weight exactly at `t` — `m_p(t)`. */
  mass: number;
  /** Rows at `t`; `n > 1` is a tied interval. */
  n: number;
}

export interface DeckScoreReference {
  profile: ScoreFormat;
  referenceVersion: string;
  scoreVersion: string;
  catalogueHash: string;
  domainHash: string;
  cohortHash: string;
  families: number;
  /** §10.9 item 2 / stage 3: the DECLARED grouping the families were counted
   * on. Commander/Brawl group by commander name; Standard groups by
   * tournament/event (the same frame its frozen S saturation uses), which the
   * 27 date-families blocker made an explicit sampling-frame decision. */
  familyFrame: string;
  rows: number;
  excluded: Record<string, number>;
  frozenAt: string;
  largestAtom: number;
  tiedIntervals: number;
  knots: ReferenceKnot[];
}

const FILES: Partial<Record<ScoreFormat, DeckScoreReference>> = {
  commander: COMMANDER_JSON as unknown as DeckScoreReference,
  brawl: BRAWL_JSON as unknown as DeckScoreReference,
  standard: STANDARD_JSON as unknown as DeckScoreReference,
};

/**
 * The stored reference, or null when it is absent, unfrozen (0 knots) or
 * built by another score/reference version. Never falls back to another
 * profile's CDF.
 */
export function resolveReference(ref: DeckScoreReference | null | undefined): DeckScoreReference | null {
  if (!ref || !Array.isArray(ref.knots) || ref.knots.length === 0) return null;
  if (ref.referenceVersion !== REFERENCE_VERSION || ref.scoreVersion !== SCORE_VERSION) return null;
  return ref;
}

export function referenceFor(format: ScoreFormat): DeckScoreReference | null {
  return resolveReference(FILES[format] ?? null);
}

/** `rank_p(t)`: midrank at a knot, cumulative weight below between knots,
 * 0/100 below/above the support. No interpolation, no endpoint stretch. */
export function rankOf(ref: DeckScoreReference, t: number): number {
  const knots = ref.knots;
  let lo = 0;
  let hi = knots.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (knots[mid].t <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
  }
  if (idx < 0) return 0;
  const k = knots[idx];
  return 100 * (k.t === t ? k.below + 0.5 * k.mass : k.below + k.mass);
}

export interface ReferenceSample { value: number; family: string }

/**
 * The frozen CDF of one cohort: every row weighted `1/(F_p*n_f)` so each of
 * the `F_p` families carries total weight `1/F_p` (§10.9 item 2).
 */
export function buildReferenceKnots(samples: readonly ReferenceSample[]): {
  knots: ReferenceKnot[]; families: number; rows: number; largestAtom: number; tiedIntervals: number;
} {
  const size = new Map<string, number>();
  for (const s of samples) size.set(s.family, (size.get(s.family) ?? 0) + 1);
  const families = size.size;
  const byValue = new Map<number, { mass: number; n: number }>();
  for (const s of samples) {
    const w = 1 / (families * (size.get(s.family) as number));
    const cell = byValue.get(s.value) ?? { mass: 0, n: 0 };
    cell.mass += w;
    cell.n += 1;
    byValue.set(s.value, cell);
  }
  const knots: ReferenceKnot[] = [];
  let below = 0;
  let largestAtom = 0;
  let tiedIntervals = 0;
  for (const t of [...byValue.keys()].sort((a, b) => a - b)) {
    const cell = byValue.get(t) as { mass: number; n: number };
    knots.push({ t, below, mass: cell.mass, n: cell.n });
    below += cell.mass;
    largestAtom = Math.max(largestAtom, cell.mass);
    if (cell.n > 1) tiedIntervals += 1;
  }
  return { knots, families, rows: samples.length, largestAtom, tiedIntervals };
}

/** Weighted mean rank of the reference's own rows — 50 by construction. */
export function meanReferenceRank(ref: DeckScoreReference): number {
  return ref.knots.reduce((sum, k) => sum + k.mass * rankOf(ref, k.t), 0);
}
