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
import type { ClosingLine } from './deck-score-win';

export type PlanKey = 'aggro' | 'midrange' | 'control' | 'aristocrats' | 'lifegain' | 'spells' | 'combo' | 'typal';

export interface PlanRole {
  key: string;
  /** R is the min over ESSENTIAL roles only (§8). */
  essential: boolean;
  /** Bounded infrastructure: Q mass is capped at `max` AND at the ESSENTIAL
   * plan mass it serves (§8 "earns no more Q mass than the directly
   * supported plan cards it serves"). */
  infrastructure?: boolean;
  /** Required / upper supply band in copies at PLAN_BAND_REFERENCE (60). */
  min: number;
  max: number;
  /** Commander-shaped band, measured at COMMANDER_BAND_REFERENCE (99) on real
   * Commander lists. Absent = no cohort of >= 30 lists, so §1's replacement
   * rule keeps the 60-card band scaled by N/60. */
  cmd?: { min: number; max: number };
  /** §8 deployment deadline, in turns: a copy only fills this role when the
   * DECK'S OWN mana can cast it by that turn. Enforced in `evaluatePlan`,
   * where the land count is known — not inside `fills`, which stays a pure
   * per-card predicate so the band script can measure raw supply. */
  deadline?: number;
  /** A raw-material role: its USEFUL supply is capped at `ratio` copies per
   * copy of the roles that consume it (§8 "bounded infrastructure serving
   * those roles"). Fifteen cheap bodies beside ONE sacrifice outlet are not
   * fifteen units of aristocrats plan - that is exactly how random piles
   * filled the role. Unlike `infrastructure` this also bounds R, because §8
   * defines R over VERIFIED USEFUL supply, not raw category totals. */
  servedBy?: { roles: string[]; ratio: number };
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

/**
 * §8 OUTPUT BIN: "threats meeting its output/deployment bins … a body,
 * keyword, tutor or removal tag alone is insufficient."
 *
 * A threat must put repeating damage on the board AND pay for itself against
 * the plan's clock:
 *   - a printed creature body of at least `minPower` that also clears the
 *     plan's power-for-cost floor (`ratio` power per mana);
 *   - a maker of CREATURE tokens — a Treasure/Food/Clue maker produces mana
 *     or cards, never damage, and was the single largest source of fake
 *     pressure on random piles;
 *   - a planeswalker, or an anthem/overrun that converts other bodies.
 */
function threat(minPower: number, maxCost: number, ratio: number): (f: CardFeature) => boolean {
  return (f) => {
    if (f.c > maxCost) return false;
    if (isCreatureBody(f)) {
      if (f.power === null || f.power < minPower) return false;
      return f.power >= f.c * ratio;
    }
    return f.isCreatureTokenProducer || f.isPlaneswalker || f.isAnthemOrOverrun;
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

/**
 * Aggro reach: damage that does not need to get through a blocker, inside the
 * plan's clock. Evasion is the card's OWN printed keyword — `hasEvasion`
 * regexes the whole oracle text, so "destroy target creature with flying"
 * used to buy reach credit. An alternate-win card is explicitly NOT reach
 * (§8 "an alternate-win card alone is not a completed line").
 */
function reach(maxCost: number): (f: CardFeature) => boolean {
  return (f) => f.c <= maxCost && (
    f.isDirectDamage || f.isDrainPayoff || f.isAnthemOrOverrun ||
    (isCreatureBody(f) && f.hasKeywordEvasion && f.power !== null && f.power >= 2)
  );
}

function infrastructure(f: CardFeature): boolean {
  return f.isRamp || f.isTreasureProducer;
}

// ── §8 engine-family predicates ───────────────────────────────────────────
//
// "Engine family: sacrifice/fodder, recursion/reanimation/graveyard casting,
// ETB/death triggers, lifegain/life-payment/counters, creature versus
// noncreature tokens, artifact/tribal/spell conditions and conversions."
//
// Each of these is a CONSUMER/PRODUCER pair test, never a tribe or a name: a
// deck earns an engine recipe only when it carries the outlet AND the payoff
// AND the resource the payoff consumes.

/** A repeatable sacrifice outlet — the engine's throughput. */
function sacOutlet(f: CardFeature): boolean {
  return f.isSacOutlet;
}

/** Something that converts a creature dying into damage or cards. */
function deathPayoff(f: CardFeature): boolean {
  return f.isDrainPayoff || f.hasDiesTrigger;
}

/** Expendable bodies: creature tokens, or a creature cheap enough that
 * feeding it to the outlet is a profitable line rather than a loss. */
function fodder(maxCost: number): (f: CardFeature) => boolean {
  return (f) => f.isCreatureTokenProducer || (isCreatureBody(f) && f.c <= maxCost && f.power !== null);
}

/** Life gained is a resource only where something consumes it (§8
 * "lifegain/life-payment/counters"); drain does both at once. */
function lifePayoff(f: CardFeature): boolean {
  return f.isLifegainPayoff || f.isCounterPayoff || f.isDrainPayoff;
}

function lifeSource(f: CardFeature): boolean {
  return f.isLifegainSource;
}

/** A trigger that reads casting, not a card that happens to be an instant. */
function spellPayoff(f: CardFeature): boolean {
  return f.isSpellPayoff;
}

function cheapSpell(maxCost: number): (f: CardFeature) => boolean {
  return (f) => f.c <= maxCost && /\b(?:Instant|Sorcery)\b/.test(f.card.type_line || '');
}

/** The conversion step: damage the spell engine can point at a player, or a
 * repeatable body maker it can convert into one. */
function spellCloser(f: CardFeature): boolean {
  return f.isDirectDamage || f.isAltWin || f.isCreatureTokenProducer || f.isAnthemOrOverrun;
}

// ── The frozen recipes ────────────────────────────────────────────────────
//
// MEASURED, then frozen. Source: the dated positive cohort in
// `data/export-standard.db` `community_decks` — placement 1 or a 5-0 league
// run, 2,747 lists resolved, assigned to a cohort by which recipe claims the
// most verified essential-role copies. `scripts/deck-score-bands.ts` prints
// the percentile table; the rule is min = p25, max = p90, with an essential
// role's min floored at 1 (a plan cannot require zero copies of its own
// essential role).
//
// RE-SEEDED for v1.2 (2026-09-20) after the output/deployment bins landed.
// The old numbers were measured with predicates that accepted any body and
// any token maker, so their p25s (aggro pressure 3, midrange value 1) were
// met by a constrained random pile and R was 1 on 19 of the 20 highest-S
// piles. With the bins in place the same corpus gives aggro pressure p25 10
// and midrange value p25 4 — real lists concentrate, piles do not.
// Second pass after the §8 answer-family repair (burn/bounce/edict now
// carry a target axis): `verify-2026-09-19/deck-score/bands-2026-09-20.txt`,
// n=2,747, aggro 86 / midrange 859 / control 680 after the engine recipes
// claim their own cohorts.
//
// Bands are copies per PLAN_BAND_REFERENCE nonland-bearing cards; callers
// scale by N/60. §1's "scale by N/reference N" would leave a 99-card
// Commander deck on a 60-card requirement despite carrying ~1.8x the nonland
// copies, so the scale here is always against the 60-card list the bands were
// measured on. A separate Commander positive cohort would replace this.
//
// A corpus refresh cannot move these numbers: that needs a score-version bump
// (§8 "seed 60-card bands from reviewed same-format lists, then freeze them").

/** Library size the 60-card bands below were measured at. */
export const PLAN_BAND_REFERENCE = 60;

/**
 * Library size the `cmd` bands were measured at:
 * `verify-2026-09-20/commander-bands.txt`, 2,777 real Commander lists from the
 * VPS corpus (`verify-2026-09-20/commander-sample.csv`), bucketed by the same
 * `shapeCohort` rule as Standard. §8 froze the generic bands on 60-card lists
 * and `evaluatePlan` scaled them by N/60; a 99-card deck carries ~1.7x the
 * nonland copies, so the scaling cancelled and the floors landed inside a
 * random pile's own spread. Measured directly instead. A role with no `cmd`
 * entry had a cohort below §1's "at least 30 distinct legal, reviewed lists"
 * (aggro: 11), so its prior stands.
 *
 * Measured WITHOUT the typed-coverage gate, exactly as the 60-card bands
 * were, so both sets describe the predicates rather than the catalogue's
 * current size. Both must be re-measured when typed coverage stabilises.
 */
export const COMMANDER_BAND_REFERENCE = 99;

/** §1 profile table: Commander/Brawl run 99-card libraries. A 59-card Standard
 * Brawl deck reads the 60-card bands, which is the shape it actually has. */
function usesCommanderBands(N: number): boolean {
  return N >= 90;
}

export const PLAN_RECIPES: readonly PlanRecipe[] = [
  {
    key: 'aggro',
    label: 'deployable pressure with reach and reload',
    roles: [
      { key: 'pressure', essential: true, min: 10, max: 16, deadline: 3, fills: threat(2, 3, 1) },
      { key: 'reach', essential: true, min: 4, max: 18, deadline: 4, fills: reach(4) },
      { key: 'reload', essential: true, min: 1, max: 8, deadline: 3, fills: velocity(3) },
      // Removal is not an aggro REQUIREMENT (§8 lists pressure/reach/reload),
      // but it serves the clock by clearing blockers, so it earns Q mass.
      { key: 'answers', essential: false, min: 0, max: 3, fills: answer(4) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 4, fills: infrastructure },
    ],
  },
  {
    key: 'midrange',
    label: 'timely threats, relevant answers, sustained value',
    roles: [
      { key: 'threats', essential: true, min: 4, max: 10, cmd: { min: 7, max: 16 }, deadline: 5, fills: threat(3, 5, 0.75) },
      { key: 'answers', essential: true, min: 4, max: 15, cmd: { min: 4, max: 11 }, deadline: 5, fills: answer(5) },
      { key: 'value', essential: true, min: 4, max: 21, cmd: { min: 7, max: 16 }, deadline: 5, fills: velocity(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'control',
    label: 'early stabilisation, advantage engine, accessible finisher',
    roles: [
      { key: 'stabilisation', essential: true, min: 7, max: 12, cmd: { min: 3, max: 8 }, deadline: 3, fills: answer(3) },
      { key: 'engine', essential: true, min: 12, max: 19, cmd: { min: 8, max: 19 }, deadline: 4, fills: (f) => f.isDrawEngine || velocity(4)(f) },
      { key: 'finisher', essential: true, min: 3, max: 8, cmd: { min: 7, max: 18 }, deadline: 7, fills: threat(4, 7, 0.6) },
      { key: 'answers', essential: false, min: 0, max: 2, fills: answer(6) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 4, fills: infrastructure },
    ],
  },
  // ── §8 engine families ──────────────────────────────────────────────────
  // Bands are Commander-shaped: these three plans do not exist in the
  // 60-card positive cohort the generic bands were measured on, so their
  // floors are set at the point where the reference engine decks
  // (Meren / Witherbloom precon / Vivi) clear them and a constrained random
  // pile of the same colours does not. They are frozen with score 1.2.0 on
  // the same terms as the generic bands.
  {
    key: 'aristocrats',
    label: 'sacrifice outlets converting expendable bodies into damage',
    roles: [
      { key: 'outlet', essential: true, min: 3, max: 9, cmd: { min: 1, max: 10 }, fills: sacOutlet },
      { key: 'payoff', essential: true, min: 5, max: 12, cmd: { min: 1, max: 13 }, fills: deathPayoff },
      { key: 'fodder', essential: true, min: 6, max: 18, cmd: { min: 16, max: 29 }, deadline: 4, servedBy: { roles: ['outlet', 'payoff'], ratio: 3 }, fills: fodder(3) },
      { key: 'value', essential: false, min: 0, max: 8, fills: velocity(5) },
      { key: 'answers', essential: false, min: 0, max: 5, fills: answer(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'lifegain',
    label: 'life gained as a resource, converted by counters or drain',
    roles: [
      { key: 'payoff', essential: true, min: 5, max: 12, cmd: { min: 4, max: 13 }, fills: lifePayoff },
      { key: 'gain', essential: true, min: 8, max: 22, cmd: { min: 12, max: 26 }, fills: lifeSource },
      { key: 'value', essential: true, min: 2, max: 10, cmd: { min: 5, max: 14 }, fills: velocity(6) },
      { key: 'answers', essential: false, min: 0, max: 5, fills: answer(6) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'spells',
    label: 'cast-trigger payoffs fed by cheap instants and sorceries',
    roles: [
      { key: 'payoff', essential: true, min: 3, max: 10, cmd: { min: 1, max: 10 }, fills: spellPayoff },
      { key: 'closer', essential: true, min: 2, max: 8, cmd: { min: 4, max: 19 }, fills: spellCloser },
      { key: 'spells', essential: true, min: 12, max: 32, cmd: { min: 12, max: 27 }, deadline: 4, fills: cheapSpell(4) },
      { key: 'answers', essential: false, min: 0, max: 8, fills: answer(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 10, fills: infrastructure },
    ],
  },
];

export function recipeFor(key: PlanKey): PlanRecipe {
  return PLAN_RECIPES.find((r) => r.key === key) ?? PLAN_RECIPES[1];
}

// ── Deployment ────────────────────────────────────────────────────────────

/**
 * §8: "Deployment is a useful-play/access requirement, not a ramp quota."
 *
 * Returns the mana a deck with this land density can reasonably have spent by
 * turn `t`, using §1's own draw model (`n(t)=7+t` cards seen) rather than a
 * new one: expected lands seen = landShare * (7 + t), capped by the turn
 * count because only one land may be played per turn. A role with a deadline
 * credits no copy it could not cast by then, so a 20-land pile stops earning
 * pressure credit for its three-drops.
 *
 * // ponytail: lands only. Rocks/dorks would raise the budget by a fraction
 * // of a mana and need their own availability turn; add them when the
 * // catalogue types production timing (§8 mana family).
 */
export function deploymentBudget(N: number, lands: number): (turn: number) => number {
  const landShare = N > 0 ? clip(lands / N) : 0;
  return (turn) => Math.min(turn, landShare * (7 + turn));
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
  /** An essential role with NO verified supply at all. §8: "known absence of
   * any plan gives R=B=0" — a recipe the deck holds zero pieces for is a
   * misread of the deck, not a finding about it, so selection avoids one
   * whenever another recipe is at least partially executed. */
  hasEmptyEssential: boolean;
  weakest: { key: string; supply: number; required: number };
}

/**
 * Evaluate one recipe against a deck. Each nonland copy is assigned to at
 * most ONE role — the first role in recipe order it fills — so no copy can
 * supply two requirements (§8 "Q counts each supported nonland copy at most
 * once toward ONE compatible plan").
 *
 * `entries` must already be nonland. A copy is eligible for on-plan credit
 * only when it is TYPED-covered AND fully supported (§8 "Evidence, not
 * popularity-based support": an unknown predicate "supplies no verified
 * integer K, critical recipe proof or fabricated on-plan link"). A partial
 * catalogue entry is not `covered`, so it earns nothing here; its fractional
 * `e_i` still counts everywhere else, and it still counts in the denominator F.
 */
export function evaluatePlan(
  recipe: PlanRecipe,
  N: number,
  nonLand: readonly DeckEntry[],
  /** Command-zone cards: available resources for R, never library Q mass. */
  guaranteed: readonly DeckEntry[] = [],
): PlanEvaluation {
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  const commanderShaped = usesCommanderBands(N);
  const bandOf = (role: PlanRole): { min: number; max: number; scale: number } => {
    const cmd = commanderShaped ? role.cmd : undefined;
    return cmd
      ? { min: cmd.min, max: cmd.max, scale: N / COMMANDER_BAND_REFERENCE }
      : { min: role.min, max: role.max, scale: N / PLAN_BAND_REFERENCE };
  };
  const castableBy = deploymentBudget(N, N - F);
  const librarySupply = new Map<string, number>();
  const totalSupply = new Map<string, number>();
  for (const role of recipe.roles) {
    librarySupply.set(role.key, 0);
    totalSupply.set(role.key, 0);
  }

  const assign = (entries: readonly DeckEntry[], intoLibrary: boolean): void => {
    for (const entry of entries) {
      if (entry.feature.s < 1 || !entry.feature.covered) continue; // §8 evidence policy
      const role = recipe.roles.find((r) => r.fills(entry.feature) &&
        (r.deadline === undefined || entry.feature.c <= castableBy(r.deadline)));
      if (!role) continue;
      totalSupply.set(role.key, (totalSupply.get(role.key) ?? 0) + entry.quantity);
      if (intoLibrary) librarySupply.set(role.key, (librarySupply.get(role.key) ?? 0) + entry.quantity);
    }
  };
  assign(nonLand, true);
  assign(guaranteed, false);

  // §8: infrastructure "earns no more Q mass than the directly supported plan
  // cards it serves". The cards it serves are the plan's ESSENTIAL roles —
  // counting the optional answers slot too let a pile's ramp ride on removal
  // it does not accelerate.
  let essentialCredited = 0;
  const preliminary = recipe.roles.map((role) => {
    const band = bandOf(role);
    const raw = totalSupply.get(role.key) ?? 0;
    const served = role.servedBy
      ? role.servedBy.ratio * role.servedBy.roles.reduce((s, k) => s + (totalSupply.get(k) ?? 0), 0)
      : Infinity;
    const have = Math.min(raw, served);
    const inLibrary = Math.min(librarySupply.get(role.key) ?? 0, served);
    const credited = Math.min(inLibrary, band.max * band.scale);
    if (role.essential) essentialCredited += credited;
    return { role, have, credited, required: band.min * band.scale };
  });

  const roles: RoleAssignment[] = preliminary.map(({ role, have, credited, required }) => ({
    role,
    required,
    supply: have,
    credited: role.infrastructure ? Math.min(credited, essentialCredited) : credited,
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
    hasEmptyEssential: essentials.some((r) => r.supply === 0),
    weakest,
  };
}

/**
 * §1 "Infer archetype from the actual typed plan: maximise satisfied
 * essential-requirement fraction, then supported main-deck fraction, then
 * fixed `Archetype` enum order."
 */
// -- Section 8 engine family: typal / party / artifact-count ----------------
//
// Five-colour party (`tazri-beacon-of-unity`) and artifact-count decks
// (`imotekh-the-stormlord`) were unreadable: no generic recipe counts "cards
// that reward a creature TYPE", so both scored S = 0 on a deck built entirely
// around one. The recipe is derived from the deck, like the closing line --
// the tribes are whatever the deck's own creatures are, never a name list.

/** Creature subtypes printed on a card, from `subtypes` or the type line. */
export function subtypesOf(f: CardFeature): string[] {
  const raw = f.card.subtypes;
  if (raw) {
    const parsed = raw.trim().startsWith('[') ? (JSON.parse(raw) as string[]) : raw.split(/[,\s]+/);
    return parsed.filter(Boolean);
  }
  const dash = (f.card.type_line || '').split(/[-\u2014]/)[1];
  return dash ? dash.trim().split(/\s+/).filter(Boolean) : [];
}

/** The four party classes are a rules-defined set, not a tribe choice. */
const PARTY_CLASSES = ['Cleric', 'Rogue', 'Warrior', 'Wizard'];
const RE_ARTIFACT_COUNT = /for each artifact you control|artifacts you control get|number of artifacts you control/i;
/** Text that READS a count rather than merely naming a type. */
const RE_TYPAL_REWARD = /(?:gets?|gains?) \+\d|for each|equal to the number of|other \w+s you control|whenever (?:another |a |an )?\w+ (?:you control )?enters|\bfull party\b/i;
const RE_PARTY = /\bfull party\b|\byour party\b|\bparty\b/i;

export interface TypalTheme {
  /** Subtypes (or 'Artifact') the deck's payoffs actually reward. */
  tribes: string[];
  artifacts: boolean;
  party: boolean;
}

/** What this deck counts, measured from its own creatures and payoff texts. */
export function typalTheme(all: readonly CardFeature[]): TypalTheme {
  const counts = new Map<string, number>();
  for (const f of all) {
    if (!isCreatureBody(f)) continue;
    for (const t of subtypesOf(f)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  // A theme exists only where the deck BOTH supplies the count and reads it:
  // >= 6 creatures of the type and >= 2 cards that reward having them. Without
  // the reward test 2,313 of 2,777 sample decks "were typal" - three Elves and
  // one card with the word Elf on it is not a plan.
  const rewards = all.filter((f) => RE_TYPAL_REWARD.test(f.card.oracle_text || ''));
  const mentions = (re: RegExp): number => rewards.filter((f) => re.test(f.card.oracle_text || '')).length;
  const tribes = [...counts.entries()]
    .filter(([t, n]) => n >= 6 && mentions(new RegExp(`\\b${t}s?\\b`)) >= 2)
    .map(([t]) => t);
  const party = mentions(RE_PARTY) >= 2 && PARTY_CLASSES.every((c) => (counts.get(c) ?? 0) >= 1);
  return { tribes, artifacts: mentions(RE_ARTIFACT_COUNT) >= 2, party };
}

/** A payoff READS the count; an enabler SUPPLIES it. */
function typalRoles(theme: TypalTheme): { payoff: (f: CardFeature) => boolean; enabler: (f: CardFeature) => boolean } {
  const words = [...theme.tribes, ...(theme.party ? PARTY_CLASSES : [])];
  const tribeRe = words.length > 0 ? new RegExp(`\\b(?:${words.join('|')})s?\\b`) : null;
  const payoff = (f: CardFeature): boolean => {
    const text = f.card.oracle_text || '';
    // A payoff READS the count. `typalTheme` already demands that of the cards
    // that prove a theme exists; the role test did not, so every party
    // creature carrying the reminder text "(Your party consists of up to one
    // each of Cleric, Rogue, Warrior, and Wizard.)" was filed as a payoff
    // instead of an enabler - 20 payoff copies against 12 enablers on
    // `tazri-beacon-of-unity`, a deck whose bodies ARE the plan.
    if (!RE_TYPAL_REWARD.test(text)) return false;
    if (theme.artifacts && RE_ARTIFACT_COUNT.test(text)) return true;
    if (theme.party && RE_PARTY.test(text)) return true;
    return tribeRe !== null && tribeRe.test(text);
  };
  const enabler = (f: CardFeature): boolean => {
    if (theme.artifacts && /\bArtifact\b/.test(f.card.type_line || '')) return true;
    // A card that CREATES members of the counted type supplies the count just
    // as a member does — Zurgo's mobilize Warriors, `Their Number Is Legion`'s
    // Necron Warriors. Without it the payoff tightening above leaves them in
    // no role at all, and the deck loses the count it demonstrably supplies.
    if (f.isCreatureTokenProducer && tribeRe !== null && tribeRe.test(f.card.oracle_text || '')) return true;
    if (!isCreatureBody(f)) return false;
    const subs = subtypesOf(f);
    return subs.some((t) => theme.tribes.includes(t) || (theme.party && PARTY_CLASSES.includes(t)));
  };
  return { payoff, enabler };
}

/** Measured on the 934 sample decks that name a countable theme
 * (`scripts/deck-score-bands.ts typal`, 2,777-deck Commander sample):
 * payoff p25 2 / p90 7, enabler p25 11 / p90 29. No 60-card cohort was
 * measured, so the 60-card band is the Commander one at 60/99 — scaled, and
 * labelled as such per section 1's replacement rule.
 *
 * The earlier reading of the same cohort — payoff p25 4 / p90 19, enabler p25
 * 6 / p90 26 — was measured before the role predicates were tightened, when
 * every party creature's reminder text counted as a payoff. Re-measure with
 * the script whenever `typalRoles` changes; the two must agree. */
const TYPAL_BAND = {
  payoff: { min: 1, max: 4, cmd: { min: 2, max: 7 } },
  enabler: { min: 7, max: 18, cmd: { min: 11, max: 29 } },
};

export function typalRecipe(theme: TypalTheme): PlanRecipe {
  const { payoff, enabler } = typalRoles(theme);
  const label = theme.party ? 'party' : theme.tribes[0] ?? 'artifact';
  return {
    key: 'typal',
    label: `${label} count — payoffs that read the board, enablers that supply it`,
    roles: [
      { key: 'payoff', essential: true, ...TYPAL_BAND.payoff, fills: payoff },
      { key: 'enabler', essential: true, ...TYPAL_BAND.enabler, servedBy: { roles: ['payoff'], ratio: 8 }, fills: enabler },
      { key: 'closer', essential: false, min: 0, max: 8, fills: threat(4, 6, 1) },
      { key: 'answers', essential: false, min: 0, max: 8, fills: answer(5) },
      { key: 'value', essential: false, min: 0, max: 10, fills: velocity(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 10, fills: infrastructure },
    ],
  };
}

/** Null when the deck names no countable theme at all. */
export function evaluateTypal(
  N: number, nonLand: readonly DeckEntry[], guaranteed: readonly DeckEntry[] = [],
): PlanEvaluation | null {
  const features = [...nonLand, ...guaranteed].map((e) => e.feature);
  const theme = typalTheme(features);
  if (theme.tribes.length === 0 && !theme.artifacts && !theme.party) return null;
  return evaluatePlan(typalRecipe(theme), N, nonLand, guaranteed);
}

export function selectPlan(
  N: number,
  nonLand: readonly DeckEntry[],
  guaranteed: readonly DeckEntry[] = [],
): PlanEvaluation {
  // A recipe with an essential role the deck has NO copies of describes a plan
  // the deck is not attempting; `betterPlan` drops it before §1's
  // satisfied-fraction ordering applies. Without that, a Food deck with no
  // life-gain payoff outranked its own midrange reading on Q and scored S = 0.
  // Ties fall through to PLAN_RECIPES order, the frozen enum order.
  const evaluations = PLAN_RECIPES.map((recipe) => evaluatePlan(recipe, N, nonLand, guaranteed));
  const typal = evaluateTypal(N, nonLand, guaranteed);
  if (typal) evaluations.push(typal);
  return evaluations.reduce(betterPlan, evaluations[0]);
}


// ── §8 closing/tutor family ───────────────────────────────────────────────
//
// "Closing/tutor family: exact search filters/destination/delay; ... verified
// loops and library/alternate-win predicates." A compact combo deck holds two
// pieces, twenty pieces of fast mana and a stack of counterspells; NO generic
// or engine recipe describes that, so Ballooncon scored W 90.5 and S 17.3 on
// the same list. This recipe is not frozen like the others: its essentials are
// derived from the line `deck-score-win.ts` actually selected.

/** A tutor counts only if its search filter can reach one of the pieces.
 * // ponytail: unrestricted "search your library for a card" plus a type-word
 * // match against the piece's type line. The exact typed filter/destination/
 * // delay is catalogue work (§8); this is the reachable subset of it. */
function tutorReaches(f: CardFeature, pieces: readonly CardFeature[]): boolean {
  if (!f.isTutor) return false;
  const oracle = f.card.oracle_text || '';
  if (/search your library for a card/i.test(oracle)) return true;
  return pieces.some((p) => (p.card.type_line || '')
    .split(/[^A-Za-z]+/)
    .filter((word) => word.length > 3)
    .some((word) => new RegExp(`search your library for [^.]*\\b${word}`, 'i').test(oracle)));
}

/** Counterspells and Silence-class taxes: what keeps the line resolving. */
function stackProtection(f: CardFeature): boolean {
  return f.isCounterspell || f.isProtection;
}

/**
 * Build the plan for an assembled closing line. Roles, in assignment order:
 * the pieces themselves, the tutors that reach them, the acceleration that
 * makes the line castable by `tStar`, the protection that resolves it, and
 * the selection that digs for all of the above.
 */
export function closingRecipe(line: ClosingLine, pieces: readonly CardFeature[]): PlanRecipe {
  const names = new Set(line.pieces.map((n) => n.toLowerCase()));
  // Mana the line needs beyond a plain land drop per turn by its own t*.
  const shortfall = Math.max(1, Math.ceil(line.cost - line.tStar));
  return {
    key: 'combo',
    label: `${line.label} — pieces, tutors that reach them, acceleration and protection`,
    roles: [
      { key: 'pieces', essential: true, min: line.required, max: line.required + 2, fills: (f) => names.has(f.card.name.toLowerCase()) },
      { key: 'tutors', essential: true, min: 2, max: 10, fills: (f) => tutorReaches(f, pieces) },
      { key: 'acceleration', essential: true, min: shortfall, max: 24, fills: (f) => infrastructure(f) && f.c <= 2 },
      { key: 'protection', essential: true, min: 2, max: 14, fills: stackProtection },
      { key: 'selection', essential: false, min: 0, max: 14, fills: velocity(4) },
    ],
  };
}

/**
 * §8 "Q counts each supported nonland copy at most once toward ONE compatible
 * plan". The closing plan joins the SAME §1 ordering as every other recipe —
 * it wins only when the deck actually executes it. A pile holding two combo
 * pieces and no tutors satisfies one essential of four and loses to its own
 * generic reading.
 *
 * Bands are NOT scaled by N: a combo needs its two pieces, two tutors and its
 * protection whether the library is 60 or 99 cards.
 */
export function evaluateClosing(
  line: ClosingLine,
  nonLand: readonly DeckEntry[],
  guaranteed: readonly DeckEntry[] = [],
): PlanEvaluation {
  const names = new Set(line.pieces.map((n) => n.toLowerCase()));
  const pieces = [...nonLand, ...guaranteed]
    .map((e) => e.feature)
    .filter((f) => names.has(f.card.name.toLowerCase()));
  return evaluatePlan(closingRecipe(line, pieces), PLAN_BAND_REFERENCE, nonLand, guaranteed);
}

/** The §1 ordering, exposed so `deck-score.ts` can fold in the closing plan
 * once `computeWin` has named the line. */
/** The plan-side of S: how much of the deck this recipe explains, discounted
 * by how far its weakest essential falls short. Selection maximises it. */
export function planFit(p: PlanEvaluation): number {
  return clip((p.Q - 0.30) / 0.40) * p.R;
}

export function betterPlan(best: PlanEvaluation, candidate: PlanEvaluation): PlanEvaluation {
  if (candidate.hasEmptyEssential !== best.hasEmptyEssential) {
    return best.hasEmptyEssential ? candidate : best;
  }
  // §1 orders selection by "satisfied essential-requirement fraction, then
  // supported main-deck fraction". Taken as a STEP function that key is
  // discontinuous: meren-powerhouse read as midrange (essFrac 1.00, Q .46,
  // S 40.1) while its 100-card sibling read as aristocrats (essFrac .67,
  // Q .73, S 92.8) - one card apart, 53 points of S. A generic recipe with
  // low floors is satisfied by accident on a 99-card deck, so "all essentials
  // met" is not evidence the deck is executing it. Rank on the continuous
  // plan fit instead (the same quantity S reports) and keep the step count
  // only as a tie-break; known absence of a piece still wins outright above.
  const fitBest = planFit(best);
  const fitCandidate = planFit(candidate);
  if (fitCandidate !== fitBest) return fitCandidate > fitBest ? candidate : best;
  if (candidate.essentialFraction !== best.essentialFraction) {
    return candidate.essentialFraction > best.essentialFraction ? candidate : best;
  }
  if (candidate.Q !== best.Q) return candidate.Q > best.Q ? candidate : best;
  return best;
}
