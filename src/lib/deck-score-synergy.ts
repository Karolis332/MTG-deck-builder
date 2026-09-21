/**
 * Deck Score v1.4 — Synergy / plan coherence (S). docs/DECK_SCORE_SPEC.md
 * §10.2 (which supersedes §1/§8/§9 for this component).
 *
 *     D      = max(N0, submitted library copies incl. reserved slots)
 *     U      = max over feasible recipes of the useful nonland-copy credit
 *     Q_slot = U / D,  b_S = 0
 *     S      = 100 * clip(Q_slot / Q_sat,p)
 *
 * TWO v1.3 terms are gone. The fitted floor `b` (`Q_BASELINE_*`) is replaced
 * by MECHANICAL ZERO: 100% of the 1,517 Commander S zeros sat below that
 * floor, which is what made the median real deck read as a pile. And `*R`
 * leaves both the score and the ranking (§10.3): multiplying supply by R drops
 * the separation AUC .884 -> .538, real R p50 is .79 while a typed pile's is
 * 1.00. R survives as the legacy diagnostic field and its weakest-requirement
 * reason; a recipe whose essential is entirely absent is still invalidated by
 * `hasEmptyEssential`, and partial supply still earns only its bounded credit.
 *
 * The denominator is D, not F: dividing by nonland copies paid a deck for
 * replacing a nonland with a land, and a submitted library that is short of
 * N0 keeps the legal denominator with the missing slots as blank padding.
 *
 * HISTORY (v1.1 -> v1.3), kept because it explains the shape of the code:
 *
 * v1.1 was `S = 100*(.40*clip(Q/Q*) + .35*R + .25*B)`: three additive terms,
 * so a deck with a saturated Q and B but NO essential role still scored 65.
 * v1.2 made it multiplicative, `S = 100*clip((Q-.30)/.40)*R*B`. v1.3 removes
 * the B multiplier entirely —
 *
 *     S = 100 * clip((Q - .30) / (.70 - .30)) * R
 *
 * — because §9.3 proves a bounded payoff-only B cannot be non-increasing
 * under deletion AND equal 1 on the empty set: blanking the worst-fed payoffs
 * raised the precon's B from .808 to 1 and its S from 39.7 to 44.0. The
 * mechanical distinction B was carrying now lives in
 * `deck-score-producers.ts`, which charges UNSERVED PRODUCTION where it
 * originates: each producer's Q and R credit is multiplied by its own
 * utilisation, so deleting a consumer can only shrink credit.
 *
 * `B` survives as a legacy diagnostic field, always 1, so the payload shape
 * the wiring reads does not change (§9.3 "legacy diagnostic B=1").
 *
 * U counts each supported nonland copy at most ONCE toward one compatible
 * plan role; R is the min over that recipe's essential roles of verified
 * useful supply over required supply.
 */
import { clip } from './deck-score-math';
import { qSlotSaturationFor, type ScoreProfile } from './deck-score-norms';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import { selectPlan, type PlanEvaluation } from './deck-score-plans';
import { producerUtilisation } from './deck-score-producers';

export interface SynergyOutput extends ComponentOutput {
  /** §10.2 `Q_slot = U / D`. */
  Q: number;
  /** §10.2 `U`: useful nonland-copy credit of the selected recipe, and `D`,
   * the library slots it is spread over. (The legacy `U` field below is a
   * different quantity — mean producer utilisation — kept for the scripts.) */
  usefulMass: number;
  D: number;
  /** LEGACY DIAGNOSTIC (§10.3): reported with its weakest-requirement reason,
   * never multiplied into S and never used to rank a recipe. */
  R: number;
  /** LEGACY, always 1. v1.2's payoff-mean multiplier, retired by §9.3. */
  B: number;
  plan: PlanEvaluation;
  /** §10.2: `b_S = 0`. The v1.3 fitted floor is retired, and the field stays
   * so the diagnostic scripts that print it keep their shape. */
  b: number;
  /** Mean producer utilisation over the charged producers, copy-weighted.
   * 1 when the deck produces nothing that needs a route. */
  U: number;
  /** A typed requirement of a selected payoff whose supply we cannot count —
   * §8's evidence policy: no fabricated credit, raise the evidence gate. */
  unknownPrerequisite: string | null;
}

/** `Q`, `R` -> Synergy / plan coverage (S). §9.3. */
export function computeSynergy(
  archetypePlan: PlanEvaluation | null,
  N: number,
  mainEntries: readonly DeckEntry[],
  profile: ScoreProfile = 'commander',
): SynergyOutput {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  const emptyPlan = archetypePlan ?? selectPlan(Math.max(1, N), nonLand, [], undefined, profile);
  if (F === 0) {
    return {
      score: 0, Q: 0, usefulMass: 0, D: emptyPlan.D, R: 0, B: 1, U: 1, plan: emptyPlan, b: 0, unknownPrerequisite: null,
      reason: `0% of the library supports no plan; U 0.0/${emptyPlan.D}; weakest dependency none 0/0; 0 unsupported payoffs.`,
    };
  }

  const plan = emptyPlan;
  const Q = plan.Q;
  const R = plan.R;

  // Producer utilisation is already folded into Q and R by `evaluatePlan`;
  // recomputing it here is for the REASON line only — which producers the
  // deck is failing to convert, and by how much.
  const util = producerUtilisation(nonLand);
  const charged = util.rows.reduce((s, r) => s + r.quantity, 0);
  const served = util.rows.reduce((s, r) => s + r.quantity * r.u, 0);
  const U = charged > 0 ? served / charged : 1;
  const stranded = util.rows.filter((r) => r.u === 0).reduce((s, r) => s + r.quantity, 0);

  // §10.2: `S = 100*clip(Q_slot / Q_sat,p)`, a monotone transform of the SAME
  // U objective `planFit` maximised when it picked this recipe.
  const score = 100 * clip(Q / qSlotSaturationFor(profile));

  return {
    score, Q, usefulMass: plan.U, D: plan.D, R, B: 1, U, plan, b: 0, unknownPrerequisite: null,
    // §1's reason template, with §10.7's "publish ... selected recipe, U/D":
    // the percentage is now Q_slot = U/D, not the v1.3 U/F.
    reason: `${Math.round(Q * 100)}% of the library supports ${plan.recipe.key}; U ${plan.U.toFixed(1)}/${plan.D}; weakest dependency ${plan.weakest.key} ${plan.weakest.supply.toFixed(1)}/${Math.round(plan.weakest.required)}; ${stranded} unsupported payoffs.`,
  };
}
