/**
 * Deck Score v1 — bounded probability math. docs/DECK_SCORE_SPEC.md §1.
 *
 * Pure, deterministic, no recursion depth beyond a bounded loop. `N` here is
 * always a deck library size (<=110ish), so plain `number` (IEEE double) is
 * exact enough for every combinatorial ratio this module computes — no
 * BigInt required.
 */

import type { ScoreFormat } from './deck-score-norms';

export function clip(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/** Round to one decimal — component-score display precision (§1). */
export function round1(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 10) / 10;
}

/** log(C(n,k)), 0 outside 0<=k<=n. Iterative — safe for n up to a few hundred. */
function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  const kk = Math.min(k, n - k);
  let acc = 0;
  for (let i = 1; i <= kk; i++) {
    acc += Math.log(n - kk + i) - Math.log(i);
  }
  return acc;
}

/** Exact-enough `C(n,k)` via the log form above. */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n || n < 0) return 0;
  return Math.exp(logChoose(n, k));
}

/**
 * Hypergeometric upper-tail: `H(N,K,n,r) = Σ[x=r..min(K,n)] C(K,x)C(N-K,n-x)/C(N,n)`.
 * Impossible binomial terms are zero; `n` is clamped to `min(N,n)`. Invalid
 * (non-integer/negative) parameters return 0 rather than NaN — §1 "empty
 * positive-purpose denominators yield 0."
 */
export function H(N: number, K: number, n: number, r: number): number {
  if (![N, K, n, r].every((v) => Number.isFinite(v))) return 0;
  const N_ = Math.max(0, Math.round(N));
  const K_ = Math.max(0, Math.min(N_, Math.round(K)));
  const n_ = Math.max(0, Math.min(N_, Math.round(n)));
  const r_ = Math.max(0, Math.round(r));
  if (N_ === 0 || n_ === 0) return r_ === 0 ? 1 : 0;
  const logDenom = logChoose(N_, n_);
  if (!Number.isFinite(logDenom)) return 0;
  const xMax = Math.min(K_, n_);
  let sum = 0;
  for (let x = r_; x <= xMax; x++) {
    const logNum = logChoose(K_, x) + logChoose(N_ - K_, n_ - x);
    if (Number.isFinite(logNum)) sum += Math.exp(logNum - logDenom);
  }
  return clip(sum);
}

/**
 * Sample size `n(t)` per §1: Commander (4-player) always draws on t;
 * 1v1-shaped formats (Brawl/Standard here) average the "on the play" and
 * "on the draw" hand sizes rather than picking one arbitrarily.
 * `n(t)=7+t` for Commander, mean of `6+t`/`7+t` otherwise.
 */
export function drawSampleSizes(format: ScoreFormat, t: number): number[] {
  if (format === 'commander') return [7 + t];
  return [6 + t, 7 + t];
}

/** `H` averaged over the format's applicable sample size(s) — see above. */
export function Hf(format: ScoreFormat, N: number, K: number, t: number, r: number): number {
  const ns = drawSampleSizes(format, t);
  return ns.reduce((s, n) => s + H(N, K, n, r), 0) / ns.length;
}

/** A pool: `r` of `K` physical copies required (§1 W "role pools"). */
export interface Pool {
  K: number;
  r: number;
}

/** Truncated polynomial (index = degree, value = coefficient), degree <= maxDeg. */
type Poly = number[];

function polyBinomial(n: number, maxDeg: number): Poly {
  const out: Poly = new Array(maxDeg + 1).fill(0);
  const top = Math.min(Math.max(0, Math.round(n)), maxDeg);
  for (let i = 0; i <= top; i++) out[i] = choose(n, i);
  return out;
}

/** `Σ[x=r..min(K,maxDeg)] C(K,x) z^x`, truncated to `maxDeg`. */
function poolPoly(pool: Pool, maxDeg: number): Poly {
  const full = polyBinomial(pool.K, maxDeg);
  const r = Math.max(0, Math.round(pool.r));
  for (let i = 0; i < r && i < full.length; i++) full[i] = 0;
  return full;
}

function polyMultiply(a: Poly, b: Poly, maxDeg: number): Poly {
  const out: Poly = new Array(maxDeg + 1).fill(0);
  for (let i = 0; i < a.length && i <= maxDeg; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j + i <= maxDeg && j < b.length; j++) {
      if (b[j] === 0) continue;
      out[i + j] += a[i] * b[j];
    }
  }
  return out;
}

/** Bounded degree used everywhere J_l is evaluated (§1 W: "degree ≤19"). */
export const J_MAX_DEGREE = 19;

/**
 * Disjoint-pool access, §1 W:
 * `J_l(n)=[z^n]{(1+z)^(N-ΣK_j) * Π_j(Σ[x=r_j..min(K_j,n)] C(K_j,x)z^x)} / C(N,n)`.
 *
 * Pools with `r_j<=0` are dropped from the product (§1: "drop pools with
 * r_j=0") — their cards fold back into the generic leftover term instead of
 * reducing the sample. Coefficients are truncated to `J_MAX_DEGREE`; `n`
 * beyond that degree reads the last computed (highest-degree) coefficient's
 * host polynomial evaluated at the clamped degree, which is the same bound
 * the spec imposes on recipe scheduling (<=12 turns => n<=19 for Commander).
 */
export function buildDisjointAccessPolynomial(N: number, pools: Pool[]): Poly {
  const active = pools.filter((p) => p.r > 0 && p.K > 0);
  const usedK = active.reduce((s, p) => s + p.K, 0);
  const leftover = Math.max(0, N - usedK);
  let product = polyBinomial(leftover, J_MAX_DEGREE);
  for (const pool of active) {
    product = polyMultiply(product, poolPoly(pool, J_MAX_DEGREE), J_MAX_DEGREE);
  }
  return product;
}

/** Read `J_l(n)` off a polynomial built by `buildDisjointAccessPolynomial`. */
export function readAccessAt(poly: Poly, N: number, n: number): number {
  const deg = Math.max(0, Math.min(J_MAX_DEGREE, Math.round(n)));
  const denom = choose(N, Math.round(n));
  if (denom <= 0) return 0;
  return clip((poly[deg] ?? 0) / denom);
}

/** One-call convenience: `J_l(n)` for a single evaluation (tests, small call sites). */
export function J(N: number, pools: Pool[], n: number): number {
  return readAccessAt(buildDisjointAccessPolynomial(N, pools), N, n);
}
