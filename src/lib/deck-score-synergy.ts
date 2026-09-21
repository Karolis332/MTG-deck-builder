/**
 * Deck Score v1.3 — Synergy / plan coverage (S).
 * docs/DECK_SCORE_SPEC.md §1 S, §8 "60-card plans and S", §9 decision 3
 * (§9 supersedes where the two differ).
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
 * Q counts each supported nonland copy at most ONCE toward one compatible
 * plan role; R is the min over that recipe's essential roles of verified
 * useful supply over required supply.
 */
import { clip } from './deck-score-math';
import { qSaturationFor, type ScoreProfile } from './deck-score-norms';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import { selectPlan, qBaselineFor, type PlanEvaluation } from './deck-score-plans';
import { producerUtilisation } from './deck-score-producers';

export interface SynergyOutput extends ComponentOutput {
  Q: number;
  R: number;
  /** LEGACY, always 1. v1.2's payoff-mean multiplier, retired by §9.3. */
  B: number;
  plan: PlanEvaluation;
  /** The Q floor the selected plan answered to (§9.2). .30 for engine and
   * closing plans; the measured negative-control prior for the generic trio
   * in a Commander-family profile. */
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
      score: 0, Q: 0, R: 0, B: 1, U: 1, plan: emptyPlan, b: qBaselineFor(profile, emptyPlan.recipe.key), unknownPrerequisite: null,
      reason: '0% supports no plan; weakest dependency none 0/0; 0 unsupported payoffs.',
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

  // §9.2: `S = 100*clip((Q-b)/(.70-b))*R`, the SAME objective `planFit`
  // maximised when it picked this recipe.
  const b = qBaselineFor(profile, plan.recipe.key);
  const coherence = clip((Q - b) / (qSaturationFor(profile) - b));
  const score = 100 * coherence * R;

  return {
    score, Q, R, B: 1, U, plan, b, unknownPrerequisite: null,
    reason: `${Math.round(Q * 100)}% supports ${plan.recipe.key}; weakest dependency ${plan.weakest.key} ${plan.weakest.supply.toFixed(1)}/${Math.round(plan.weakest.required)}; ${stranded} unsupported payoffs.`,
  };
}
