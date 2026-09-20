/**
 * Deck Score v1.2 — generic plan recipes. docs/DECK_SCORE_SPEC.md §8
 * "60-card plans and S".
 *
 * Three explicit recipes (aggro / midrange / control), each declaring its
 * ESSENTIAL roles with a useful cost/output bin, a deployment deadline and a
 * lower/upper supply band. §8 is explicit that no generic plan requires ramp,
 * sacrifice outlets, creature counts or dependent payoffs unless its actual
 * route consumes them — so the only non-essential role here is bounded
 * infrastructure (fixing/acceleration), which earns Q mass only up to its
 * upper band and never more than the direct plan cards it serves.
 *
 * Recipe selection is §1's deterministic ordering: maximise the satisfied
 * essential-requirement fraction, then supported main-deck fraction, then the
 * fixed enum order aggro < midrange < control.
 *
 * // ponytail: three recipes, not eleven. The mechanical engine plans
 * // (tokens/aristocrats/voltron/...) stay on the existing commander-profile
 * // path and reuse the nearest generic recipe for R/Q; upgrade path is one
 * // recipe per engine family, driven by the typed catalogue (slice B).
 */
import { clip } from './deck-score-math';
import type { CardFeature } from './deck-score-features';
import type { DeckEntry } from './deck-score-mana';

export type PlanKey = 'aggro' | 'midrange' | 'control';

export interface PlanRole {
  key: string;
  /** R is the min over ESSENTIAL roles only (§8). */
  essential: boolean;
  /** Bounded infrastructure: Q mass is capped at `max` AND at the direct
   * plan mass it serves (§8 "earns no more Q mass than the directly
   * supported plan cards it serves"). */
  infrastructure?: boolean;
  /** Required / upper supply band in copies at the reference library size. */
  min: number;
  max: number;
  /** Verified useful supply test — timing and actual targets, never a raw
   * category total. Callers only pass features with `s === 1`. */
  fills: (f: CardFeature) => boolean;
}

export interface PlanRecipe {
  key: PlanKey;
  label: string;
  roles: readonly PlanRole[];
}

// ── Role predicates ───────────────────────────────────────────────────────

function isCreatureBody(f: CardFeature): boolean {
  return /\bCreature\b/.test(f.card.type_line || '');
}

/** Output bin: a threat must actually be able to put damage on the board —
 * a printed body of at least `power`, a token maker, a planeswalker or an
 * anthem that converts other bodies. A keyword or a tag alone is not a threat. */
function threat(minPower: number, maxCost: number): (f: CardFeature) => boolean {
  return (f) => {
    if (f.c > maxCost) return false;
    if (isCreatureBody(f)) return f.power !== null && f.power >= minPower;
    return f.isTokenProducer || f.isPlaneswalker || f.isAnthemOrOverrun;
  };
}

/** Answers with a real target axis and a deadline. */
function answer(maxCost: number): (f: CardFeature) => boolean {
  return (f) => f.c <= maxCost && (f.isRemoval || f.isCounterspell || f.isWipe) && f.answerAxes.length > 0;
}

/** Sustained value / reload: net cards, not selection or a raw tutor. */
function velocity(maxCost: number): (f: CardFeature) => boolean {
  return (f) => f.c <= maxCost && (f.isDraw || f.isDrawEngine);
}

/** Aggro reach: damage that does not need to get through a blocker. */
function reach(f: CardFeature): boolean {
  return f.isDirectDamage || f.isDrainPayoff || f.isAltWin || f.isAnthemOrOverrun ||
    (isCreatureBody(f) && f.hasEvasion && f.power !== null && f.power >= 2);
}

function infrastructure(f: CardFeature): boolean {
  return f.isRamp || f.isTreasureProducer;
}

// ── The frozen recipes ────────────────────────────────────────────────────
//
// MEASURED, then frozen. Source: the dated positive cohort in
// `data/export-standard.db` `community_decks` — placement 1 or a 5-0 league
// run, 2,747 lists resolved, assigned to a cohort by which recipe claims the
// most verified essential-role copies (aggro 1,280 / midrange 837 / control
// 630). `scripts/deck-score-bands.ts` prints the percentile table; the rule
// is min = p25, max = p90, with an essential role's min floored at 1 (a plan
// cannot require zero copies of its own essential role).
//
// Bands are copies per PLAN_BAND_REFERENCE nonland-bearing cards; callers
// scale by N/60. §1's "scale by N/reference N" would leave a 99-card
// Commander deck on a 60-card requirement despite carrying ~1.8x the nonland
// copies, so the scale here is always against the 60-card list the bands were
// measured on. A separate Commander positive cohort would replace this.
//
// A corpus refresh cannot move these numbers: that needs a score-version bump
// (§8 "seed 60-card bands from reviewed same-format lists, then freeze them").

/** Library size the bands below were measured at. */
export const PLAN_BAND_REFERENCE = 60;

export const PLAN_RECIPES: readonly PlanRecipe[] = [
  {
    key: 'aggro',
    label: 'deployable pressure with reach and reload',
    roles: [
      { key: 'pressure', essential: true, min: 3, max: 11, fills: threat(2, 3) },
      { key: 'reach', essential: true, min: 1, max: 12, fills: reach },
      { key: 'reload', essential: true, min: 1, max: 16, fills: velocity(3) },
      // Removal is not an aggro REQUIREMENT (§8 lists pressure/reach/reload),
      // but it serves the clock by clearing blockers, so it earns Q mass.
      { key: 'answers', essential: false, min: 0, max: 2, fills: answer(4) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 13, fills: infrastructure },
    ],
  },
  {
    key: 'midrange',
    label: 'timely threats, relevant answers, sustained value',
    roles: [
      { key: 'threats', essential: true, min: 3, max: 10, fills: threat(3, 5) },
      { key: 'answers', essential: true, min: 2, max: 9, fills: answer(5) },
      { key: 'value', essential: true, min: 1, max: 17, fills: velocity(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 13, fills: infrastructure },
    ],
  },
  {
    key: 'control',
    label: 'early stabilisation, advantage engine, accessible finisher',
    roles: [
      { key: 'stabilisation', essential: true, min: 2, max: 8, fills: answer(3) },
      { key: 'engine', essential: true, min: 9, max: 19, fills: (f) => f.isDrawEngine || velocity(4)(f) },
      { key: 'finisher', essential: true, min: 6, max: 10, fills: threat(4, 7) },
      { key: 'answers', essential: false, min: 0, max: 2, fills: answer(6) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 4, fills: infrastructure },
    ],
  },
];

export function recipeFor(key: PlanKey): PlanRecipe {
  return PLAN_RECIPES.find((r) => r.key === key) ?? PLAN_RECIPES[1];
}

// ── Assignment ────────────────────────────────────────────────────────────

export interface RoleAssignment {
  role: PlanRole;
  /** Required supply after scaling to the actual library size. */
  required: number;
  /** Verified useful copies assigned to this role. */
  supply: number;
  /** Q mass credited after the upper band / infrastructure caps. */
  credited: number;
}

export interface PlanEvaluation {
  recipe: PlanRecipe;
  roles: RoleAssignment[];
  /** Q: supported nonland copies on plan, each counted at most once, over F. */
  Q: number;
  /** R: min over essential roles of verified useful supply / required supply. */
  R: number;
  /** Fraction of essential roles fully satisfied — the §1 selection key. */
  essentialFraction: number;
  weakest: { key: string; supply: number; required: number };
}

/**
 * Evaluate one recipe against a deck. Each nonland copy is assigned to at
 * most ONE role — the first role in recipe order it fills — so no copy can
 * supply two requirements (§8 "Q counts each supported nonland copy at most
 * once toward ONE compatible plan").
 *
 * `entries` must already be nonland. Only copies with `s === 1` are eligible:
 * §8's evidence policy gives an unknown predicate no on-plan credit and no
 * verified supply, though it still counts in the denominator F.
 */
export function evaluatePlan(
  recipe: PlanRecipe,
  N: number,
  nonLand: readonly DeckEntry[],
  /** Command-zone cards: available resources for R, never library Q mass. */
  guaranteed: readonly DeckEntry[] = [],
): PlanEvaluation {
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  const scale = N / PLAN_BAND_REFERENCE;
  const librarySupply = new Map<string, number>();
  const totalSupply = new Map<string, number>();
  for (const role of recipe.roles) {
    librarySupply.set(role.key, 0);
    totalSupply.set(role.key, 0);
  }

  const assign = (entries: readonly DeckEntry[], intoLibrary: boolean): void => {
    for (const entry of entries) {
      if (entry.feature.s < 1) continue; // unknown mechanics earn no on-plan credit
      const role = recipe.roles.find((r) => r.fills(entry.feature));
      if (!role) continue;
      totalSupply.set(role.key, (totalSupply.get(role.key) ?? 0) + entry.quantity);
      if (intoLibrary) librarySupply.set(role.key, (librarySupply.get(role.key) ?? 0) + entry.quantity);
    }
  };
  assign(nonLand, true);
  assign(guaranteed, false);

  // Direct (non-infrastructure) plan mass bounds how much infrastructure may
  // count toward Q.
  let directCredited = 0;
  const preliminary = recipe.roles.map((role) => {
    const have = totalSupply.get(role.key) ?? 0;
    const credited = Math.min(librarySupply.get(role.key) ?? 0, role.max * scale);
    if (!role.infrastructure) directCredited += credited;
    return { role, have, credited };
  });

  const roles: RoleAssignment[] = preliminary.map(({ role, have, credited }) => ({
    role,
    required: role.min * scale,
    supply: have,
    credited: role.infrastructure ? Math.min(credited, directCredited) : credited,
  }));

  const essentials = roles.filter((r) => r.role.essential);
  let R = essentials.length > 0 ? 1 : 0;
  let satisfied = 0;
  let weakest = { key: 'none', supply: 0, required: 0 };
  let weakestRatio = Infinity;
  for (const r of essentials) {
    const ratio = r.required > 0 ? clip(r.supply / r.required) : 1;
    if (ratio >= 1) satisfied += 1;
    if (ratio < R) R = ratio;
    if (ratio < weakestRatio) {
      weakestRatio = ratio;
      weakest = { key: r.role.key, supply: r.supply, required: r.required };
    }
  }

  const creditedTotal = roles.reduce((s, r) => s + r.credited, 0);
  return {
    recipe,
    roles,
    Q: F > 0 ? creditedTotal / F : 0,
    R,
    essentialFraction: essentials.length > 0 ? satisfied / essentials.length : 0,
    weakest,
  };
}

/**
 * §1 "Infer archetype from the actual typed plan: maximise satisfied
 * essential-requirement fraction, then supported main-deck fraction, then
 * fixed `Archetype` enum order."
 */
export function selectPlan(
  N: number,
  nonLand: readonly DeckEntry[],
  guaranteed: readonly DeckEntry[] = [],
): PlanEvaluation {
  const evaluations = PLAN_RECIPES.map((recipe) => evaluatePlan(recipe, N, nonLand, guaranteed));
  return evaluations.reduce((best, candidate) => {
    if (candidate.essentialFraction !== best.essentialFraction) {
      return candidate.essentialFraction > best.essentialFraction ? candidate : best;
    }
    if (candidate.Q !== best.Q) return candidate.Q > best.Q ? candidate : best;
    return best; // stable: PLAN_RECIPES order is the frozen enum order
  }, evaluations[0]);
}
