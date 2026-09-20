/**
 * Deck Score v1.2 — Synergy / plan coverage (S).
 * docs/DECK_SCORE_SPEC.md §1 S + §8 "60-card plans and S" (§8 supersedes).
 *
 * v1.1 was `S = 100*(.40*clip(Q/Q*) + .35*R + .25*B)`: three additive terms,
 * so a deck with a saturated Q and B but NO essential role still scored 65.
 * v1.2 is multiplicative —
 *
 *     S = 100 * clip((Q - .30) / (.70 - .30)) * R * B
 *
 * — where .30 is the unstructured baseline and .70 the saturation target for
 * all three profiles. A missing essential role now zeroes S rather than
 * costing it 35 points.
 *
 * Q counts each supported nonland copy at most ONCE toward one compatible
 * plan role; R is the min over that recipe's essential roles of verified
 * useful supply over required supply; B is the copy-weighted fulfilment of
 * ALL typed requirements of real dependent payoffs, and 1 when the selected
 * plan has none.
 */
import { clip } from './deck-score-math';
import { Q_BASELINE, Q_SATURATION } from './deck-score-norms';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import type { CardFeature } from './deck-score-features';
import { catalogFacts } from './deck-score-catalog';
import { selectPlan, PLAN_BAND_REFERENCE, type PlanEvaluation } from './deck-score-plans';

/**
 * Minimum verified enabler copies a regex-derived dependent requirement needs
 * for full credit. §1's enabler norm of 8 is R's band for an ESSENTIAL role;
 * applying it to B would put every fair deck below .5 on a single Food payoff.
 * One enabler is not a supply, so the frozen floor is two.
 */
const REGEX_ENABLER_SUPPLY = 2;

export interface SynergyOutput extends ComponentOutput {
  Q: number;
  R: number;
  B: number;
  plan: PlanEvaluation;
  /** A typed requirement of a selected payoff whose supply we cannot count —
   * §8's evidence policy: no fabricated credit, raise the evidence gate. */
  unknownPrerequisite: string | null;
}

/** Typed requirement of one dependent payoff. */
interface PayoffRequirement {
  resource: string;
  copies: number;
}

function requirementsOf(feature: CardFeature): PayoffRequirement[] {
  const facts = catalogFacts(feature.card.name, feature.card.oracle_text);
  if (facts && facts.textMatches && facts.knowledge === 'known' && facts.requiredSupply.length > 0) {
    return facts.requiredSupply.map((r) => ({ resource: r.resource, copies: r.copies }));
  }
  const out: PayoffRequirement[] = [];
  if (feature.isFoodPayoff) out.push({ resource: 'food', copies: REGEX_ENABLER_SUPPLY });
  if (feature.isTokenPayoff) out.push({ resource: 'token', copies: REGEX_ENABLER_SUPPLY });
  if (feature.isDrainPayoff) out.push({ resource: 'creature deaths', copies: REGEX_ENABLER_SUPPLY });
  return out;
}

/** Copies of each supply kind this deck actually has. An unmapped resource is
 * left out on purpose: it becomes an unknown prerequisite, never a 0 or a 1. */
function supplyByResource(nonLand: readonly DeckEntry[]): Map<string, number> {
  const sum = (pred: (f: CardFeature) => boolean): number =>
    nonLand.filter((e) => e.feature.s >= 1 && e.feature.covered && pred(e.feature)).reduce((s, e) => s + e.quantity, 0);
  const creatures = sum((f) => /\bCreature\b/.test(f.card.type_line || ''));
  return new Map<string, number>([
    ['food', sum((f) => f.isFoodProducer)],
    ['token', sum((f) => f.isTokenProducer)],
    ['treasure', sum((f) => f.isTreasureProducer)],
    ['creature', creatures],
    ['creature in graveyard', creatures],
    ['creature deaths', sum((f) => f.isSacOutlet || f.hasDiesTrigger)],
    ['graveyard fuel', nonLand.reduce((s, e) => s + e.quantity, 0)],
    ['nonland mana producer', sum((f) => f.isRamp || f.isTreasureProducer)],
  ]);
}

/** `Q`, `R`, `B` -> Synergy / plan coverage (S). §8. */
export function computeSynergy(
  archetypePlan: PlanEvaluation | null,
  N: number,
  mainEntries: readonly DeckEntry[],
): SynergyOutput {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  const emptyPlan = archetypePlan ?? selectPlan(Math.max(1, N), nonLand);
  if (F === 0) {
    return {
      score: 0, Q: 0, R: 0, B: 0, plan: emptyPlan, unknownPrerequisite: null,
      reason: '0% supports no plan; weakest dependency none 0/0; 0 unsupported payoffs.',
    };
  }

  const plan = emptyPlan;
  const Q = plan.Q;
  const R = plan.R;

  // B — dependent payoffs the SELECTED plan actually carries.
  const supply = supplyByResource(nonLand);
  const scale = N / PLAN_BAND_REFERENCE;
  let unknownPrerequisite: string | null = null;
  let num = 0;
  let den = 0;
  let deadPayoffs = 0;
  for (const entry of nonLand) {
    const requirements = requirementsOf(entry.feature);
    if (requirements.length === 0) continue;
    let fulfilment = entry.feature.s;
    for (const req of requirements) {
      const have = supply.get(req.resource);
      if (have === undefined) {
        if (unknownPrerequisite === null) unknownPrerequisite = req.resource;
        continue; // unknown mechanics earn no credit and fabricate no penalty
      }
      fulfilment = Math.min(fulfilment, clip(have / Math.max(1, req.copies * scale)));
    }
    num += entry.quantity * fulfilment;
    den += entry.quantity;
    if (fulfilment === 0) deadPayoffs += entry.quantity;
  }
  // KNOWN GAP (§4 quota gaming, `precon-witherbloom`). B is a MEAN over the
  // payoff copies that carry a typed requirement, so deleting the copies whose
  // requirement is least fulfilled RAISES it: blanking Dina / Epicure / Gyome
  // takes den 3 -> 0 and B .808 -> 1, which lifts S 39.7 -> 44.0 even though Q
  // falls. No functional over that set is monotone under member deletion, and
  // anchoring the denominator to the plan's payoff ROLE does not help: only 3
  // of the 9 copies filling `lifegain.payoff` carry a requirement at all.
  // Defaulting to 0 whenever the selected plan converts a produced resource
  // was tried and rejected — it also zeroes a legitimate life-gain engine
  // whose payoffs are life-triggered (no typed requirement exists for "life"),
  // and a pure dies-trigger aristocrats deck. The gap is bounded by how many
  // converter mechanics `requirementsOf` can type, not by B's formula.
  const B = den > 0 ? num / den : 1;

  const coherence = clip((Q - Q_BASELINE) / (Q_SATURATION - Q_BASELINE));
  const score = 100 * coherence * R * B;

  return {
    score, Q, R, B, plan, unknownPrerequisite,
    reason: `${Math.round(Q * 100)}% supports ${plan.recipe.key}; weakest dependency ${plan.weakest.key} ${plan.weakest.supply}/${Math.round(plan.weakest.required)}; ${deadPayoffs} unsupported payoffs.`,
  };
}
