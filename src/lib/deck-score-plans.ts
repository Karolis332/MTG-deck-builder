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
import { clip, H } from './deck-score-math';
import type { CardFeature } from './deck-score-features';
import type { DeckEntry } from './deck-score-mana';
import type { ClosingLine } from './deck-score-win';
import { producerUtilisation, type Utilisation } from './deck-score-producers';
import {
  DEPLOYMENT_PROBABILITY_TARGET, Q_BASELINE, Q_BASELINE_CLOSING, Q_BASELINE_JOINT_COMMANDER, Q_BASELINE_JOINT_BRAWL,
  Q_SATURATION, type ScoreProfile,
} from './deck-score-norms';

export type PlanKey = 'aggro' | 'midrange' | 'control' | 'aristocrats' | 'lifegain' | 'spells' | 'combo' | 'typal' | 'recursion' | 'conversion' | 'tokens' | 'counters';

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
  /** Stage 4b: the same band re-measured on real Historic Brawl lists (1v1,
   * 25 life, 100 cards). Absent = that recipe's Brawl cohort held fewer than
   * §1's 30 lists, so the Commander band stands in — never a scaled guess. */
  brawl?: { min: number; max: number };
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
  /** Bands measured ONLY on the 2,777-list Commander sample. §1's replacement
   * rule needs a cohort of >= 30 reviewed same-format lists before a band may
   * be claimed, and no 60-card cohort was measured for these, so they are not
   * offered to the Standard path at all (§9.1 dispatches by format). */
  commanderOnly?: boolean;
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

/**
 * §9.1: "Typed manland finishers may supply R without entering nonland Q."
 *
 * A land that animates itself into a real body is the finisher of most fair
 * 60-card control decks — `control.finisher` was empty on 56 of the 69 R=0
 * Standard positives precisely because every one of those bodies lives in the
 * land slot. The animation clause is the type test; the printed size in the
 * same sentence is the output bin, so a Clue-cracking or mana-only utility
 * land earns nothing.
 *
 * Lands never enter `nonLand`, so this can only be reached through the
 * supply-only channel `evaluatePlan` already uses for the command zone: it
 * moves R, never Q, exactly as §9.1 requires.
 */
const RE_MANLAND = /becomes? an?[^.]*\b(\d+)\/\d+[^.]*creature|becomes? a creature[^.]*\b(\d+)\/\d+/i;

export function isManlandFinisher(f: CardFeature): boolean {
  if (!f.isLand) return false;
  const m = RE_MANLAND.exec(f.card.oracle_text || '');
  if (!m) return false;
  const power = Number(m[1] ?? m[2]);
  return Number.isFinite(power) && power >= 2;
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

// §9.6 step 1 / cross-cutting: "add the engine-family recipe Imotekh actually
// plays (artifact/graveyard recursion), not an artifact-count quota."
//
// The three roles are the actual loop, not a type tally: something that brings
// permanents BACK, something that puts them there, and permanents worth the
// trip. An artifact-count reward is neither — a deck with thirty artifacts and
// no way to reuse them is not playing this plan, so no role reads a count.

// MEASURED, then tightened. The first predicate set accepted any graveyard
// keyword (flashback / escape / disturb) as recursion, any discard or
// dies-trigger as fuel, and any body of power >= 1 as a target. It claimed 99
// of 300 Standard positives and read the univerce AGGRO list as "95% supports
// recursion", and piles under 25 fell 156 -> 138. This plan is about
// PERMANENTS coming back, repeatedly; spell flashback is a different deck.
const RE_GRAVEYARD_EXIT = /return(?:s)? [^.]*(?:creature|artifact|permanent)[^.]*from your graveyard to the battlefield|cast(?:s)? [^.]*(?:creature|artifact|permanent)[^.]*from your graveyard|puts? [^.]*(?:creature|artifact|permanent) cards? from [a-z' ]*graveyard onto the battlefield|\bunearth\b|\bembalm\b|\beternalize\b|\bencore\b/i;
const RE_GRAVEYARD_ENTRY = /\bmills? (?:a|an|one|two|three|four|five|x|\d+)|puts? the top [a-z0-9 ]*cards? of your library into your graveyard/i;

/** Brings a PERMANENT back out of YOUR graveyard, or casts it from there. */
function graveyardRecursion(f: CardFeature): boolean {
  return RE_GRAVEYARD_EXIT.test(f.card.oracle_text || '');
}

/** Puts our own permanents into the graveyard: self-mill, or a sacrifice
 * outlet. A dies TRIGGER is a payoff, not fuel — it reads the event, it does
 * not cause it. Without fuel the recursion has nothing to return. */
function graveyardFuel(f: CardFeature): boolean {
  return RE_GRAVEYARD_ENTRY.test(f.card.oracle_text || '') || f.isSacOutlet;
}

// ── §9.6 step 3 engine families: conversion / tokens / counters ───────────
//
// §8's engine list names "creature versus noncreature tokens, artifact/tribal/
// spell conditions and conversions" and "lifegain/life-payment/counters". The
// three recipes below are the conversions that had no recipe at all, which is
// why `the-cabbage-merchant` — a deck whose whole plan is Food into bodies —
// read as generic midrange and `--allplans` showed an empty essential in every
// engine recipe.
//
// Each is a PRODUCER/CONSUMER pair test. The consumer role is listed FIRST in
// every one of them: a card that both makes the resource and spends it (Bosco,
// Unlucky Cabbage Merchant) is scarce, and `evaluatePlan` assigns each copy to
// the first role it fills, so putting the abundant producer first would strand
// the engine's own converters in the wrong slot.

/** Food, Treasure and Clue — stored resources, never bodies. Each is worth a
 * life, a mana or a card only where something spends it, which is why
 * `deck-score-producers.ts` charges them and `DIRECT_OUTPUT` excludes Food. */
const RE_CLUE_PRODUCER = /create[^.]*clue/i;

function storedResourceProducer(f: CardFeature): boolean {
  return f.isFoodProducer || f.isTreasureProducer || RE_CLUE_PRODUCER.test(f.card.oracle_text || '');
}

/** The spend side of that link: a sacrifice-for-effect, the Food→life→payoff
 * route, the counter route, or a trigger/count that reads the tokens. */
const RE_SAC_STORED = /sacrifice (?:a|an|another|that|two|three|x|\d+) (?:artifact|food|treasure|clue|token)/i;
const RE_TOKEN_ENTERS = /whenever (?:a|an|another|one or more)[^.]*(?:artifact|token)[^.]*enters/i;
const RE_TOKEN_COUNT = /for each token you control|number of tokens you control/i;

function storedResourceConverter(f: CardFeature): boolean {
  const oracle = f.card.oracle_text || '';
  return f.isFoodPayoff || f.isTokenPayoff || f.isLifegainPayoff || f.isCounterPayoff ||
    RE_SAC_STORED.test(oracle) || RE_TOKEN_ENTERS.test(oracle) ||
    RE_ARTIFACT_COUNT.test(oracle) || RE_TOKEN_COUNT.test(oracle);
}

/** What an engine converts INTO: a body that attacks, an anthem that turns a
 * board into damage, drain, or burn. Without this role a conversion recipe
 * would describe a loop that never touches an opponent. */
function engineOutput(maxCost: number, minPower: number, ratio: number): (f: CardFeature) => boolean {
  return (f) => threat(minPower, maxCost, ratio)(f) || f.isDrainPayoff || f.isDirectDamage;
}

/** Reads a wide board: an anthem, a per-creature count, a token payoff, a
 * sacrifice outlet or a drain. A body alone is not a go-wide payoff. */
const RE_WIDE_COUNT = /for each creature you control|number of creatures you control|creatures you control get/i;

function widePayoff(f: CardFeature): boolean {
  return f.isAnthemOrOverrun || f.isTokenPayoff || f.isCounterPayoff || f.isSacOutlet ||
    f.isDrainPayoff || RE_WIDE_COUNT.test(f.card.oracle_text || '');
}

/** PUTS +1/+1 counters — the supply side of the counters engine. The keyword
 * list is the rules-defined set of mechanics that place them, so a card
 * carrying only the word "counter" (a counterspell, a loyalty ability) is not
 * a source. */
const RE_COUNTER_SOURCE = /put (?:a|an|one|two|three|four|five|x|that many|\d+)[^.]*\+1\/\+1 counters? on|enters(?: the battlefield)? with[^.]*\+1\/\+1 counters?|\b(?:adapt|evolve|modular|outlast|bloodthirst|mentor|training|proliferate|graft|riot)\b/i;

function counterSource(f: CardFeature): boolean {
  return RE_COUNTER_SOURCE.test(f.card.oracle_text || '');
}

/** Reads the counters rather than merely carrying them. The first predicate
 * set also accepted "counters on it", `undying`, `persist` and `evolve`, which
 * is every creature that happens to arrive with a counter: the Cabbage paper
 * list then read as a counters deck at Q .711 instead of the Food engine it
 * plays. A payoff READS THE COUNT or multiplies it; carrying one does not. */
const RE_COUNTER_READS = /for each \+1\/\+1 counter|whenever (?:one or more )?\+1\/\+1 counters? (?:is|are) put|double the number of \+1\/\+1 counters|\bproliferate\b|as long as [^.]*\+1\/\+1 counter/i;

function counterPayoff(f: CardFeature): boolean {
  return f.isCounterPayoff || RE_COUNTER_READS.test(f.card.oracle_text || '');
}

/** Worth recurring: a permanent that pays for the trip every time it arrives
 * — a real body, or an artifact/creature carrying an ETB or death trigger. */
function recursionTarget(f: CardFeature): boolean {
  const permanent = isCreatureBody(f) || /\bArtifact\b/.test(f.card.type_line || '');
  if (!permanent) return false;
  return f.hasDiesTrigger || /when(?:ever)? this (?:creature|artifact|permanent) enters/i.test(f.card.oracle_text || '') ||
    (f.power !== null && f.power >= 2 && f.c >= 3);
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
 * (With the gate ON the same run reads midrange threats p25 1 against 5 —
 * the corpus lists sit far below the .93 coverage the controls are drawn to,
 * so a gated band is a floor every control clears by construction.)
 *
 * v1.3 stage 4a RE-MEASUREMENT, the numbers now frozen above:
 * `MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts commander --evaluated --raw`
 * (`verify-2026-09-19/deck-score/bands-stride-training.txt`). Two changes from
 * the v1.2 reading:
 *  1. TRAINING COHORT ONLY. The sample stores ten lists per commander
 *     contiguously; the 200 acceptance controls are now drawn from a disjoint
 *     set of commanders (`strideOrder` in `scripts/deck-score-piles.ts`), and
 *     no band may be fitted to a commander that grades it. 1,838 lists / 200
 *     commanders here, 939 / 100 held out.
 *  2. EVALUATED SUPPLY for every recipe, not just the stage-3 engine three.
 *     The v1.2 generic bands counted bare `fills` matches, so a role with a
 *     deadline was given a floor built from copies the scorer then refuses to
 *     cast, and the cohort was every deck `shapeCohort` assigned rather than
 *     the decks that hold all of the plan's essentials. Largest moves:
 *     control finisher 7/18 -> 3/10, recursion fuel 6/20 -> 2/12, aristocrats
 *     fodder 16/29 -> 10/21, midrange threats 7/16 -> 5/13.
 * `typal` (payoff 2/7, enabler 11/29) and the §9.5 closing support bands
 * re-measured IDENTICAL on their cohorts and are untouched. `aggro` still has
 * no `cmd` band: its cohort is 7 lists.
 *
 * Lowering a band raises R, so the negative-control floors were re-measured
 * AFTER this freeze, never before — see `Q_BASELINE_JOINT_COMMANDER`.
 *
 * v1.3 stage 4b — the `brawl` bands beside them:
 * `... commander --evaluated --raw --profile brawl`
 * (`verify-2026-09-19/deck-score/bands-brawl-training.txt`), over the TRAINING
 * stride of `verify-2026-09-20/brawl-sample.csv` — 1,166 Historic Brawl lists
 * from 200 commanders, drawn by `scripts/brawl-sample.sql` from the CF
 * corpus's 11,281 historicBrawl decks, with the same commander-disjoint split
 * and the same fixture commanders excluded. Arena Brawl is a 100-card
 * singleton deck, so the reference size is COMMANDER_BAND_REFERENCE again and
 * only the cohort changes.
 *
 * §1's replacement rule is applied per ROLE, by its own cohort size: a band is
 * frozen only where the recipe held >= 30 Brawl lists with every essential
 * present, and the rest keep the Commander band (never the 60-card one).
 * Frozen (cohort n): midrange 345, control 186, spells 201, aristocrats 67,
 * recursion 37, counters 36, typal 285. NOT frozen, Commander band stands:
 * lifegain 28, conversion 23, tokens 18, aggro 4 (which has no `cmd` band
 * either, so it keeps the 60-card prior).
 *
 * The moves are what 1v1 at 25 life does to a 100-card list: midrange answers
 * 4/10 -> 7/20 and control stabilisation 4/9 -> 5/12 (a duel rewards
 * interaction density), spells 12/26 -> 15/32 and aristocrats fodder 10/21 ->
 * 12/24 (a focused Brawl list runs more of its one thing), against modest
 * trims to midrange threats 13 -> 11 and recursion fuel 2/12 -> 1/7.
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
      { key: 'threats', essential: true, min: 4, max: 10, cmd: { min: 5, max: 13 }, brawl: { min: 5, max: 11 }, deadline: 5, fills: threat(3, 5, 0.75) },
      { key: 'answers', essential: true, min: 4, max: 15, cmd: { min: 4, max: 10 }, brawl: { min: 7, max: 20 }, deadline: 5, fills: answer(5) },
      { key: 'value', essential: true, min: 4, max: 21, cmd: { min: 7, max: 16 }, brawl: { min: 7, max: 15 }, deadline: 5, fills: velocity(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'control',
    label: 'early stabilisation, advantage engine, accessible finisher',
    roles: [
      { key: 'stabilisation', essential: true, min: 7, max: 12, cmd: { min: 4, max: 9 }, brawl: { min: 5, max: 12 }, deadline: 3, fills: answer(3) },
      { key: 'engine', essential: true, min: 12, max: 19, cmd: { min: 6, max: 16 }, brawl: { min: 6, max: 17 }, deadline: 4, fills: (f) => f.isDrawEngine || velocity(4)(f) },
      { key: 'finisher', essential: true, min: 3, max: 8, cmd: { min: 3, max: 10 }, brawl: { min: 3, max: 11 }, deadline: 7, fills: threat(4, 7, 0.6) },
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
      { key: 'outlet', essential: true, min: 3, max: 9, cmd: { min: 2, max: 11 }, brawl: { min: 2, max: 9 }, fills: sacOutlet },
      { key: 'payoff', essential: true, min: 5, max: 12, cmd: { min: 3, max: 16 }, brawl: { min: 2, max: 11 }, fills: deathPayoff },
      { key: 'fodder', essential: true, min: 6, max: 18, cmd: { min: 10, max: 21 }, brawl: { min: 12, max: 24 }, deadline: 4, servedBy: { roles: ['outlet', 'payoff'], ratio: 3 }, fills: fodder(3) },
      { key: 'value', essential: false, min: 0, max: 8, fills: velocity(5) },
      { key: 'answers', essential: false, min: 0, max: 5, fills: answer(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'lifegain',
    label: 'life gained as a resource, converted by counters or drain',
    roles: [
      { key: 'payoff', essential: true, min: 5, max: 12, cmd: { min: 3, max: 11 }, fills: lifePayoff },
      { key: 'gain', essential: true, min: 8, max: 22, cmd: { min: 9, max: 24 }, fills: lifeSource },
      { key: 'value', essential: true, min: 2, max: 10, cmd: { min: 6, max: 14 }, fills: velocity(6) },
      { key: 'answers', essential: false, min: 0, max: 5, fills: answer(6) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'spells',
    label: 'cast-trigger payoffs fed by cheap instants and sorceries',
    roles: [
      { key: 'payoff', essential: true, min: 3, max: 10, cmd: { min: 2, max: 12 }, brawl: { min: 2, max: 10 }, fills: spellPayoff },
      { key: 'closer', essential: true, min: 2, max: 8, cmd: { min: 4, max: 18 }, brawl: { min: 4, max: 19 }, fills: spellCloser },
      { key: 'spells', essential: true, min: 12, max: 32, cmd: { min: 12, max: 26 }, brawl: { min: 15, max: 32 }, deadline: 4, fills: cheapSpell(4) },
      { key: 'answers', essential: false, min: 0, max: 8, fills: answer(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 10, fills: infrastructure },
    ],
  },
  {
    // Bands are a PRIOR, not a measurement: the 60-card positive cohort has no
    // graveyard-recursion column and no Commander cohort of >= 30 reviewed
    // lists exists for it either, so §1's replacement rule applies and these
    // floors sit where the reference recursion decks (Imotekh, Meren) clear
    // them and a colour-matched random pile does not. Both raw-material roles
    // are bounded by the recursion count they serve, which is what stops a
    // pile's loose creatures and dies-triggers from filling them.
    key: 'recursion',
    label: 'permanents recurred from the graveyard, and the fuel that fills it',
    roles: [
      { key: 'recursion', essential: true, min: 4, max: 10, cmd: { min: 2, max: 7 }, brawl: { min: 2, max: 6 }, fills: graveyardRecursion },
      { key: 'fuel', essential: true, min: 4, max: 14, cmd: { min: 2, max: 12 }, brawl: { min: 1, max: 7 }, servedBy: { roles: ['recursion'], ratio: 4 }, fills: graveyardFuel },
      { key: 'targets', essential: true, min: 6, max: 18, cmd: { min: 5, max: 14 }, brawl: { min: 5, max: 13 }, deadline: 5, servedBy: { roles: ['recursion'], ratio: 5 }, fills: recursionTarget },
      { key: 'value', essential: false, min: 0, max: 8, fills: velocity(5) },
      { key: 'answers', essential: false, min: 0, max: 5, fills: answer(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  // ── §9.6 step 3: the three conversions that had no recipe ───────────────
  //
  // Bands MEASURED on the 2,777-list Commander sample
  // (`npx tsx scripts/deck-score-bands.ts commander --evaluated --raw`, cohorts
  // assigned by the band-free `shapeCohort` rule) and frozen here as p25/p90 of
  // that cohort, with an essential role's min floored at 1 —
  // `verify-2026-09-19/deck-score/commander-bands-stage3-evaluated.txt`.
  //
  // `--evaluated` is §9.1's "remeasure using this SAME evaluator": the v1.2
  // Commander bands counted bare `fills` matches, so a role with a deadline got
  // a floor built from copies the scorer then refuses to cast. Measured that
  // way the conversion `output` floor was 6 while the Cabbage paper list -- a
  // deck whose whole plan is Food -- could deploy 3, and R was pinned at .50 by
  // the measurement method rather than by the deck. `--raw` lifts only the
  // typed-coverage gate, because corpus coverage is a property of the
  // catalogue's size: gating it here freezes floors of p25 = 0.
  //
  // The 60-card `min`/`max` is the Commander band at 60/99 and is a scaled
  // prior, not a measurement: `commanderOnly` keeps these recipes off the
  // Standard path entirely, so it is only ever reached by a 59-card Standard
  // Brawl deck, which is a Commander-family profile.
  {
    key: 'conversion',
    commanderOnly: true,
    label: 'Food/Treasure/Clue produced, then spent on bodies, life or cards',
    roles: [
      { key: 'converters', essential: true, min: 2, max: 10, cmd: { min: 4, max: 19 }, fills: storedResourceConverter },
      { key: 'producers', essential: true, min: 5, max: 13, cmd: { min: 9, max: 18 }, servedBy: { roles: ['converters'], ratio: 3 }, fills: storedResourceProducer },
      { key: 'output', essential: true, min: 2, max: 7, cmd: { min: 4, max: 11 }, deadline: 6, fills: engineOutput(6, 3, 0.75) },
      { key: 'value', essential: false, min: 0, max: 8, fills: velocity(5) },
      { key: 'answers', essential: false, min: 0, max: 5, fills: answer(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'tokens',
    commanderOnly: true,
    label: 'a wide board of creature tokens, converted by anthems or an outlet',
    roles: [
      { key: 'payoff', essential: true, min: 4, max: 11, cmd: { min: 6, max: 19 }, fills: widePayoff },
      { key: 'makers', essential: true, min: 3, max: 8, cmd: { min: 5, max: 13 }, deadline: 5, servedBy: { roles: ['payoff'], ratio: 3 }, fills: (f) => f.isCreatureTokenProducer },
      { key: 'value', essential: true, min: 5, max: 10, cmd: { min: 8, max: 18 }, fills: velocity(5) },
      { key: 'answers', essential: false, min: 0, max: 5, fills: answer(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'counters',
    commanderOnly: true,
    label: '+1/+1 counters placed on bodies that read them',
    roles: [
      { key: 'payoff', essential: true, min: 1, max: 5, cmd: { min: 3, max: 8 }, brawl: { min: 2, max: 10 }, fills: counterPayoff },
      { key: 'sources', essential: true, min: 4, max: 10, cmd: { min: 6, max: 16 }, brawl: { min: 6, max: 17 }, servedBy: { roles: ['payoff'], ratio: 3 }, fills: counterSource },
      { key: 'carriers', essential: true, min: 2, max: 7, cmd: { min: 3, max: 11 }, brawl: { min: 5, max: 14 }, deadline: 5, servedBy: { roles: ['sources'], ratio: 2 }, fills: threat(2, 5, 0.6) },
      { key: 'value', essential: false, min: 0, max: 8, fills: velocity(5) },
      { key: 'answers', essential: false, min: 0, max: 5, fills: answer(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
];

// ── §9.1 the Standard generic trio ────────────────────────────────────────
//
// "For Standard, essentials/deadlines become aggro pressure T3 plus ONE
// combined reach/protection/reload role T4; midrange threats T7, answers T5,
// value T5; control stabilisation T3, engine T5, finisher T10. Keep
// midrange/control's three essentials; allow verified midrange threat modes
// through MV7 with their output test. Other profiles retain their clocks."
//
// The aggro reload floor was the measured defect: its p25 was ZERO on the
// 60-card positive cohort while the recipe demanded a mandatory minimum of 1,
// because the cohort's reach and its reload are the same cards. One combined
// role is the shape those lists actually have.
//
// Bands below are MEASURED with the probability-weighted evaluator on the
// TRAINING half of the dated Standard positives (oldest 60% by `event_date`,
// the same chronological split `deck-score-calibrate.ts` validates on) —
// `npx tsx scripts/deck-score-bands.ts` prints the percentile table and
// `deck-score-v13.test.ts` pins them. The v1.2 numbers were measured before
// deployment filtering existed, so they described a different supply.

/** Reach, protection or reload: whatever lets the clock finish the game. */
function reachOrReload(maxCost: number): (f: CardFeature) => boolean {
  return (f) => reach(maxCost)(f) || velocity(maxCost)(f) || (f.c <= maxCost && f.isProtection);
}

export const STANDARD_RECIPES: readonly PlanRecipe[] = [
  {
    key: 'aggro',
    label: 'deployable pressure with reach, protection or reload',
    roles: [
      { key: 'pressure', essential: true, min: 4, max: 15, deadline: 3, fills: threat(2, 3, 1) },
      { key: 'reach', essential: true, min: 7, max: 12, deadline: 4, fills: reachOrReload(4) },
      { key: 'answers', essential: false, min: 0, max: 6, fills: answer(4) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 4, fills: infrastructure },
    ],
  },
  {
    key: 'midrange',
    label: 'timely threats, relevant answers, sustained value',
    roles: [
      { key: 'threats', essential: true, min: 4, max: 10, deadline: 7, fills: threat(3, 7, 0.75) },
      { key: 'answers', essential: true, min: 6, max: 15, deadline: 5, fills: answer(5) },
      { key: 'value', essential: true, min: 4, max: 12, deadline: 5, fills: velocity(5) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 8, fills: infrastructure },
    ],
  },
  {
    key: 'control',
    label: 'early stabilisation, advantage engine, accessible finisher',
    roles: [
      { key: 'stabilisation', essential: true, min: 8, max: 11, deadline: 3, fills: answer(3) },
      { key: 'engine', essential: true, min: 7, max: 15, deadline: 5, fills: (f) => f.isDrawEngine || velocity(5)(f) },
      { key: 'finisher', essential: true, min: 4, max: 9, deadline: 10, fills: (f) => threat(4, 7, 0.6)(f) || isManlandFinisher(f) },
      { key: 'answers', essential: false, min: 0, max: 4, fills: answer(6) },
      { key: 'fixing', essential: false, infrastructure: true, min: 0, max: 4, fills: infrastructure },
    ],
  },
];

/** The generic trio is profile-specific (§9.1); the engine families are not. */
export function recipesFor(profile: ScoreProfile): readonly PlanRecipe[] {
  if (profile !== 'standard') return PLAN_RECIPES;
  const generic = new Set<PlanKey>(['aggro', 'midrange', 'control']);
  return [...STANDARD_RECIPES, ...PLAN_RECIPES.filter((r) => !generic.has(r.key) && !r.commanderOnly)];
}

export function recipeFor(key: PlanKey, profile: ScoreProfile = 'commander'): PlanRecipe {
  const list = recipesFor(profile);
  return list.find((r) => r.key === key) ?? list[1];
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
 * MEASURED, NOT ADOPTED (round 4). Using the mean as a hard cutoff is wrong
 * twice over: a mean is not an achievable land count, and `c <= mean` then
 * truncates it, discarding the upper half of the draw. It lands on the modal
 * Standard deck — 24 lands in 60 gives 4.80 at turn 5, so every five-drop was
 * refused, and 45 of the 69 Standard tournament lists scoring S = 0 have a
 * fully supplied recipe once the deadline stops truncating (coverage explains
 * only 19). Replacing it with the hypergeometric MEDIAN (largest `c <= t`
 * with `H(N, lands, 7+t, c) >= .5`) was implemented and measured: held-out
 * Standard median stayed at 43 and S = 0 fell only 39 -> 36 of 120, because
 * the lists that need it want six- and seven-drops at deadline 7, not the one
 * extra mana the median buys; meanwhile piles under 25 fell 176 -> 165 / 200
 * and pile S max rose 29.2 -> 33.3. Reverted: it regresses the pile target
 * and moves no anchor. Take it together with the pile-separation work.
 *
 * // ponytail: lands only. Rocks/dorks would raise the budget by a fraction
 * // of a mana and need their own availability turn; add them when the
 * // catalogue types production timing (§8 mana family). Measured median
 * // cheap-accel count on the affected Standard lists is 0, so they would not
 * // have rescued that cohort either.
 */
export function deploymentBudget(N: number, lands: number): (turn: number) => number {
  const landShare = N > 0 ? clip(lands / N) : 0;
  return (turn) => Math.min(turn, landShare * (7 + turn));
}

/**
 * §9.1: "For a known mode costing c by role deadline d, credit `q*a(c,d)`,
 * where `a=clip(P(cast by d)/.5)`; lands-only P is the mean of
 * `H(N,L,6+d,ceil(c))` and `H(N,L,7+d,ceil(c))`, zero if c>d."
 *
 * P is the probability the deck has drawn `ceil(c)` LANDS by turn d, averaged
 * over the play/draw hand sizes §1 already uses for 1v1. Nothing here rounds
 * an expected land count into a cutoff, which is the defect this replaces.
 *
 * // ponytail: lands only, printed cost only. An additional or alternate mana
 * // cost needs a typed executable path (§9.1) and the catalogue does not type
 * // one yet, so `c` stays `CardFeature.c` = printed MV — the conservative
 * // direction: an alternate cheap mode is never assumed, only the cost the
 * // card prints. Rocks/dorks are the same deferral as `deploymentBudget`.
 */
export function castingProbability(N: number, lands: number, c: number, deadline: number): number {
  if (!Number.isFinite(c) || !Number.isFinite(deadline)) return 0;
  if (c > deadline) return 0;
  const r = Math.ceil(c);
  if (r <= 0) return 1;
  return (H(N, lands, 6 + deadline, r) + H(N, lands, 7 + deadline, r)) / 2;
}

/** `a(c,d)` — the fractional useful supply one copy contributes (§9.1). */
export function deploymentCredit(N: number, lands: number, c: number, deadline: number): number {
  return clip(castingProbability(N, lands, c, deadline) / DEPLOYMENT_PROBABILITY_TARGET);
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
  /** Supply-only entries: available resources for R, never library Q mass.
   * Command-zone cards, plus §9.1's typed manland finishers for Standard. */
  guaranteed: readonly DeckEntry[] = [],
  /** Shared across the recipes of one deck so u_p is computed once and every
   * recipe is scored against the SAME assignment (§9.3 "maximise the same
   * score over feasible assignments with the recipe fixed"). */
  utilisation?: Utilisation,
  /** §9.1 dispatches the deployment rule BY FORMAT, never by library size:
   * a 59-card Standard Brawl deck keeps the Commander-family clocks. */
  profile: ScoreProfile = 'commander',
): PlanEvaluation {
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  const commanderShaped = usesCommanderBands(N);
  const bandOf = (role: PlanRole): { min: number; max: number; scale: number } => {
    // Stage 4b: a 100-card Brawl deck is Commander-SHAPED but not a Commander
    // deck — 1v1 and 25 life make its real lists more focused, so it reads its
    // own measured band where one exists and falls back to the Commander band
    // (never to the 60-card one) where the Brawl cohort was under 30 lists.
    const cmd = commanderShaped ? (profile === 'brawl' ? role.brawl ?? role.cmd : role.cmd) : undefined;
    return cmd
      ? { min: cmd.min, max: cmd.max, scale: N / COMMANDER_BAND_REFERENCE }
      : { min: role.min, max: role.max, scale: N / PLAN_BAND_REFERENCE };
  };
  // §9.1: Standard weights a copy by the probability its OWN mana casts it by
  // the deadline; every other profile keeps the v1.2 binary land-mean cutoff.
  const lands = Math.max(0, N - F);
  const castableBy = deploymentBudget(N, lands);
  const deployWeight = (c: number, deadline: number | undefined): number => {
    if (deadline === undefined) return 1;
    if (profile === 'standard') return deploymentCredit(N, lands, c, deadline);
    return c <= castableBy(deadline) ? 1 : 0;
  };
  const librarySupply = new Map<string, number>();
  const totalSupply = new Map<string, number>();
  for (const role of recipe.roles) {
    librarySupply.set(role.key, 0);
    totalSupply.set(role.key, 0);
  }

  // §9.3: a producer's Q and R credit is multiplied by its utilisation, so
  // production nothing consumes is charged where it originates instead of
  // discounting the whole of S through a payoff mean.
  const util = utilisation ?? producerUtilisation(nonLand, guaranteed);
  const assign = (entries: readonly DeckEntry[], intoLibrary: boolean): void => {
    for (const entry of entries) {
      if (entry.feature.s < 1 || !entry.feature.covered) continue; // §8 evidence policy
      let weight = 0;
      const role = recipe.roles.find((r) => {
        if (!r.fills(entry.feature)) return false;
        weight = deployWeight(entry.feature.c, r.deadline);
        return weight > 0;
      });
      if (!role) continue;
      // §9.1 "Fractional supply enters Q and R, never an integer probability
      // pool": the weight multiplies the copy's credit here and nowhere else.
      const credit = entry.quantity * util.of(entry.feature) * weight;
      totalSupply.set(role.key, (totalSupply.get(role.key) ?? 0) + credit);
      if (intoLibrary) librarySupply.set(role.key, (librarySupply.get(role.key) ?? 0) + credit);
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
 * the script whenever `typalRoles` changes; the two must agree.
 *
 * Stage 4b: `... typal --profile brawl` over 285 themed Historic Brawl
 * training lists reads payoff p25 2 / p90 7 (identical) and enabler p25 9 /
 * p90 29 — one copy of slack on the enabler floor, frozen because the cohort
 * clears §1's 30 lists. */
const TYPAL_BAND = {
  payoff: { min: 1, max: 4, cmd: { min: 2, max: 7 }, brawl: { min: 2, max: 7 } },
  enabler: { min: 7, max: 18, cmd: { min: 11, max: 29 }, brawl: { min: 9, max: 29 } },
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
  utilisation?: Utilisation, profile: ScoreProfile = 'commander',
): PlanEvaluation | null {
  const features = [...nonLand, ...guaranteed].map((e) => e.feature);
  const theme = typalTheme(features);
  if (theme.tribes.length === 0 && !theme.artifacts && !theme.party) return null;
  return evaluatePlan(typalRecipe(theme), N, nonLand, guaranteed, utilisation, profile);
}

export function selectPlan(
  N: number,
  nonLand: readonly DeckEntry[],
  guaranteed: readonly DeckEntry[] = [],
  shared?: Utilisation,
  profile: ScoreProfile = 'commander',
): PlanEvaluation {
  const utilisation = shared ?? producerUtilisation(nonLand, guaranteed);
  // A recipe with an essential role the deck has NO copies of describes a plan
  // the deck is not attempting; `betterPlan` drops it before §1's
  // satisfied-fraction ordering applies. Without that, a Food deck with no
  // life-gain payoff outranked its own midrange reading on Q and scored S = 0.
  // Ties fall through to PLAN_RECIPES order, the frozen enum order.
  const evaluations = recipesFor(profile)
    .map((recipe) => evaluatePlan(recipe, N, nonLand, guaranteed, utilisation, profile));
  const typal = evaluateTypal(N, nonLand, guaranteed, utilisation, profile);
  if (typal) evaluations.push(typal);
  return evaluations.reduce((best, c) => betterPlan(best, c, profile), evaluations[0]);
}


// ── §8 closing/tutor family ───────────────────────────────────────────────
//
// "Closing/tutor family: exact search filters/destination/delay; ... verified
// loops and library/alternate-win predicates." A compact combo deck holds two
// pieces, twenty pieces of fast mana and a stack of counterspells; NO generic
// or engine recipe describes that, so Ballooncon scored W 90.5 and S 17.3 on
// the same list. This recipe is not frozen like the others: its essentials are
// derived from the line `deck-score-win.ts` actually selected.

/**
 * §9.5: "exact tutors to present pieces/support (at most two tutor hops, with
 * target/destination/cost/delay checked)".
 *
 * DESTINATION — a search that ends in the graveyard or exile does not deliver
 * a castable piece; hand, battlefield and top of library do. TARGET — the
 * filter must name a word from the reachable card's type line, or be
 * unrestricted. COST/DELAY — the tutor has to be affordable inside the line's
 * own schedule, so a six-mana tutor earns nothing for a line that goes off on
 * turn three.
 */
const RE_TUTOR_DEAD_END = /search your library for [^.]*(?:put (?:it|them|that card) into (?:your|its owner's) graveyard|exile (?:it|them|that card))/i;

function searchFilterMatches(oracle: string, target: CardFeature): boolean {
  if (/search your library for a card/i.test(oracle)) return true;
  return (target.card.type_line || '')
    .split(/[^A-Za-z]+/)
    .filter((word) => word.length > 3)
    .some((word) => new RegExp(`search your library for [^.]*\\b${word}`, 'i').test(oracle));
}

export function tutorReaches(f: CardFeature, pieces: readonly CardFeature[], byTurn = Infinity): boolean {
  if (!f.isTutor) return false;
  const oracle = f.card.oracle_text || '';
  if (RE_TUTOR_DEAD_END.test(oracle)) return false;
  if (f.c > byTurn) return false;
  return pieces.some((p) => searchFilterMatches(oracle, p));
}

/**
 * Hop two: a tutor that cannot name a piece but CAN find a tutor that can.
 * Two hops is the spec's limit, so this never recurses — the hop-1 set is
 * fixed before hop 2 is computed and a hop-2 tutor is never itself a target.
 * Both hops' costs must fit the line's schedule together, which is what stops
 * a chain of three-mana tutors from "reaching" a turn-three line.
 */
export function tutorReachesInTwo(
  f: CardFeature, pieces: readonly CardFeature[], hopOne: readonly CardFeature[], byTurn: number,
): boolean {
  if (tutorReaches(f, pieces, byTurn)) return true;
  if (!f.isTutor) return false;
  const oracle = f.card.oracle_text || '';
  if (RE_TUTOR_DEAD_END.test(oracle)) return false;
  return hopOne.some((t) => f.c + t.c <= byTurn && searchFilterMatches(oracle, t));
}

/** Counterspells, Silence-class taxes and the recovery that rebuys a piece out
 * of the graveyard — §9.5's "line-compatible protection/recovery". */
function stackProtection(f: CardFeature): boolean {
  return f.isCounterspell || f.isProtection || graveyardRecursion(f);
}

/**
 * §9.5: "timely stax that obstructs opponent actions while permitting our line
 * or a paid exit". A tax or restriction binding OPPONENTS, or a symmetric one
 * whose exit is a payment, landing inside the line's own clock. Nothing in
 * this role reaches W by construction — `computeWin` never sees a plan — so a
 * stax tag "earns neither invented extra turns nor a faster W clock".
 */
const RE_STAX_OPPONENT = /opponents? (?:can't|cannot)|each player (?:can't|cannot)|players can't|each opponent (?:sacrifices|skips|loses)|don't untap during|can't (?:be cast|search their|draw more than|untap)/i;
const RE_STAX_TAX = /(?:spells?|abilities)[^.]*(?:your opponents|opponents)[^.]*cost \{\d+\} more|cost \{\d+\} more to cast/i;

export function timelyStax(f: CardFeature, byTurn: number): boolean {
  if (f.c > byTurn) return false;
  const oracle = f.card.oracle_text || '';
  return RE_STAX_OPPONENT.test(oracle) || RE_STAX_TAX.test(oracle);
}

/**
 * §9.5 support-role upper bands, MEASURED on the TRAINING split of the 30
 * reviewed cEDH Top-16 lists (the first 20 in file order; the last 10 are the
 * holdout the acceptance run reports separately) —
 * `npx tsx scripts/deck-score-bands.ts closing`, output in
 * `verify-2026-09-19/deck-score/closing-bands.txt`: 18 of the 20 training
 * lists assemble a line, and the upper band is p90 of that cohort's supply
 * under the same evaluator (tutors 11, acceleration 23, protection 10, stax 3,
 * selection 11). Only the UPPER bands come from the cohort — §9.5 freezes
 * upper support bands, and a minimum taken from the same p25 would demand
 * seven tutors of every deck that holds a combo. The `pieces` band stays
 * derived from the line itself, because a line needs its own pieces whatever a
 * cohort of other decks holds.
 */
export const CLOSING_SUPPORT_BAND = {
  tutors: { min: 2, max: 11 },
  acceleration: { max: 23 },
  protection: { min: 2, max: 10 },
  stax: { max: 3 },
  selection: { max: 11 },
} as const;

/**
 * Build the plan for an assembled closing line. Roles, in assignment order:
 * the pieces themselves (from the root line AND any admitted backup), the
 * tutors that reach them within two hops, the acceleration that makes the line
 * castable by `tStar`, the protection or recovery that resolves it, the timely
 * stax that buys the turns, and the selection that digs for all of the above.
 *
 * §9.5 "each copy earns at most one Q unit for a complete line's pieces OR a
 * proved support path" is `evaluatePlan`'s own first-match assignment: one
 * copy, one role. "Shared tutors count once" falls out of the same rule — a
 * tutor that reaches two admitted lines is still one copy in `tutors`.
 */
export function closingRecipe(
  line: ClosingLine,
  pieces: readonly CardFeature[],
  /** Every candidate copy in the deck — hop 1 is resolved over ALL of them
   * before hop 2 is asked about any card, so the predicate cannot depend on
   * the order `evaluatePlan` walks the deck in. */
  pool: readonly CardFeature[] = [],
  backups: readonly ClosingLine[] = [],
): PlanRecipe {
  const names = new Set([line, ...backups].flatMap((l) => l.pieces).map((n) => n.toLowerCase()));
  // Mana the line needs beyond a plain land drop per turn by its own t*.
  const shortfall = Math.max(1, Math.ceil(line.cost - line.tStar));
  // A tutor has until the line goes off, plus the turn it is cast on.
  const byTurn = Math.max(1, line.tStar);
  const hopOne = pool.filter((f) => tutorReaches(f, pieces, byTurn));
  const tutorFills = (f: CardFeature): boolean => tutorReachesInTwo(f, pieces, hopOne, byTurn);
  return {
    key: 'combo',
    label: `${line.label} — pieces, tutors that reach them, acceleration, protection and stax`,
    roles: [
      { key: 'pieces', essential: true, min: line.required, max: line.required + 2 + backups.length * 2, fills: (f) => names.has(f.card.name.toLowerCase()) },
      { key: 'tutors', essential: true, ...CLOSING_SUPPORT_BAND.tutors, fills: tutorFills },
      { key: 'acceleration', essential: true, min: shortfall, max: CLOSING_SUPPORT_BAND.acceleration.max, fills: (f) => infrastructure(f) && f.c <= 2 },
      { key: 'protection', essential: true, ...CLOSING_SUPPORT_BAND.protection, fills: stackProtection },
      { key: 'stax', essential: false, min: 0, max: CLOSING_SUPPORT_BAND.stax.max, fills: (f) => timelyStax(f, byTurn) },
      { key: 'selection', essential: false, min: 0, max: CLOSING_SUPPORT_BAND.selection.max, fills: velocity(4) },
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
  utilisation?: Utilisation,
  profile: ScoreProfile = 'commander',
  /** §9.5 "admit complete compatible backup lines": their pieces join the same
   * `pieces` role, so a copy still earns at most one Q unit. */
  backups: readonly ClosingLine[] = [],
): PlanEvaluation {
  const names = new Set([line, ...backups].flatMap((l) => l.pieces).map((n) => n.toLowerCase()));
  const pool = [...nonLand, ...guaranteed].map((e) => e.feature);
  const pieces = pool.filter((f) => names.has(f.card.name.toLowerCase()));
  // No role here carries a deadline, so the deployment rule cannot reach it;
  // the profile is threaded only so the closing plan is ranked by the SAME S
  // objective as the recipe it competes with (§9.2).
  return evaluatePlan(closingRecipe(line, pieces, pool, backups), PLAN_BAND_REFERENCE, nonLand, guaranteed, utilisation, profile);
}

/**
 * §9.2 / §9.6 / stage 4a: the Q floor a plan must clear before it explains
 * anything. ONE floor for every generic and engine recipe, the p95 of the
 * per-pile MAXIMUM over all eleven of them on 1,000 matched negative controls
 * — see `Q_BASELINE_JOINT_COMMANDER` for the table and for why the stage-3
 * pair (.542 generic / .559 engine) was replaced: two p95s bound two groups at
 * 5% each, not their union, and the union is what a pile leaks through.
 *
 * A 99-card pile has ~1.8x the nonland copies of the cohort the generic bands
 * were measured on and fills ordinary threat/answer/value roles by accident;
 * a typed sacrifice outlet beside its payoff and its fodder is not an accident
 * — but at .30 the accident still scored, which is what this floor prices.
 */
export function qBaselineFor(profile: ScoreProfile, key: PlanKey): number {
  if (profile === 'standard') return Q_BASELINE;
  // Stage 4b: the closing plan is priced too. Completing its line's essentials
  // is NOT a floor — a one-card alternate-win pool in a 99-card pile is
  // complete by construction — so `combo` answers to its own measured
  // negative-control p95 (`Q_BASELINE_CLOSING`), which no reviewed cEDH
  // positive is anywhere near.
  if (key === 'combo') return Q_BASELINE_CLOSING;
  // Stage 4b: Brawl has its own corpus, its own bands and therefore its own
  // measured floor — the Commander number grades a different population.
  return profile === 'brawl' ? Q_BASELINE_JOINT_BRAWL : Q_BASELINE_JOINT_COMMANDER;
}

/** The plan-side of S: how much of the deck this recipe explains, discounted
 * by how far its weakest essential falls short. Selection maximises it, and it
 * is the SAME quantity `computeSynergy` reports (§9.2 "use the same final S
 * objective in planFit and scoring") — never select on one floor and report
 * another. */
export function planFit(p: PlanEvaluation, profile: ScoreProfile = 'commander'): number {
  const b = qBaselineFor(profile, p.recipe.key);
  return clip((p.Q - b) / (Q_SATURATION - b)) * p.R;
}

/** The §1 ordering, exposed so `deck-score.ts` can fold in the closing plan
 * once `computeWin` has named the line. */
export function betterPlan(
  best: PlanEvaluation, candidate: PlanEvaluation, profile: ScoreProfile = 'commander',
): PlanEvaluation {
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
  const fitBest = planFit(best, profile);
  const fitCandidate = planFit(candidate, profile);
  if (fitCandidate !== fitBest) return fitCandidate > fitBest ? candidate : best;
  if (candidate.essentialFraction !== best.essentialFraction) {
    return candidate.essentialFraction > best.essentialFraction ? candidate : best;
  }
  if (candidate.Q !== best.Q) return candidate.Q > best.Q ? candidate : best;
  return best;
}
