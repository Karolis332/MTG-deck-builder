/**
 * Deck Score v1.1 — Win access & redundancy (W). docs/DECK_SCORE_SPEC.md §1 W.
 *
 * v1 asked "is the whole board in hand at once, inside turn-t mana?" and every
 * fair deck answered no, so W starved and the §2 quality cap pinned 9 of 16
 * fixtures to 20-30. v1.1 asks the question the spec actually poses — how fast
 * does this deck close — by running an EXPECTED CUMULATIVE OUTPUT schedule per
 * recipe family and reading off `t*`, the first turn the schedule reaches the
 * finish predicate. Access (`J_l`) and the delay decay stay exactly as §1 W
 * specifies; only readiness changed.
 *
 * Families: compact combo, creature pressure, aristocrats drain, control
 * inevitability, token/Food conversion, Voltron, alternate win — the seven §1 W
 * names. Combo and alternate win keep the v1 mana-readiness path (they assemble
 * a fixed set, they do not accumulate output); the four output families use the
 * schedule.
 *
 * // ponytail: the schedule is a goldfish — no blockers, no removal, no
 * // interaction from the table, and expected copies rather than a sampled
 * // distribution. §1 W licenses exactly that ("a conditional goldfish
 * // scheduling proxy, not a game simulator"). Upgrade path is a sampled
 * // schedule, not more terms in this one.
 */
import {
  TYPED_COMBOS, COMBO_TUTORS, GRAVEYARD_ROUTES, comboTutor, manaOutlet, etbOutlet, needsOutlet,
  tutorReachesSlot, unboundedDrawSink, libraryDrawSink, libraryWinCard,
  type ComboSlot, type TypedCombo,
} from './deck-score-catalog/combos';
import {
  finisherOutputOf, drawEventsPerTurn, allocateDamage, horizonFor, MAX_TURN, COMMANDER_HORIZON,
  type DamageUnit, type FinisherKind,
} from './deck-score-finishers';
import {
  buildSpellSchedule, castTriggerFinisher, burstPayoffOf, burstFinish, isPrintedRitual,
  type SpellSchedule, type BurstPayoff,
} from './deck-score-spells';
import { clip, H, Hf, buildDisjointAccessPolynomial, readAccessAt, drawSampleSizes, type Pool } from './deck-score-math';
import { gameShape, normsFor, type FormatNorms, type ScoreFormat } from './deck-score-norms';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import type { CardFeature } from './deck-score-features';
import type { Archetype } from './deck-templates';

/** `guaranteed` = in the command zone: always accessible, never in the library. */
interface Member { name: string; cmc: number; quantity: number; guaranteed?: boolean }
interface RecipePool { members: Member[]; r: number }
interface Recipe {
  /** The output schedule this recipe was accepted on, when it has one. */
  schedule?: DamageSchedule;
  id: string;
  label: string;
  pools: RecipePool[];
  extraCost: number;
  criticalNames: Set<string>;
  /** Closing turn from an output schedule. Set = skip the mana-readiness scan. */
  tStar?: number;
  /** v1.4 stage 3i: the turn that MAXIMISES §1's utility over `t >= t*`, when
   * it differs from the first finish (§10.8: "report the first finish and the
   * utility-maximising turn separately"). `pools`/`label` describe THIS turn's
   * line, so `evaluateRecipe` values what was selected. */
  valueTurn?: number;
  /** v1.4 stage 3j: the utility the LINE SELECTION actually maximised, for the
   * families that pick their line per turn (`maximiseOverTurns`). Valuing the
   * stored line at OTHER turns scores (line(t1), t2) pairs the selection never
   * considered, and that cross-product is NOT monotone under dilution: on
   * `brawl:365001669` +1 unknown slot moved the argmax from T6 (r4, 39 members)
   * to T8 (r2, 30 members), and re-scanning that cheaper line back at T6 raised
   * W by 13.1. Invariant (D)/(B): selection = valuation, so no re-maximisation. */
  selected?: { u: number; access: number; turn: number };
  /** §10.6.1 audited execution trace; copied onto the emitted `ClosingLine`. */
  trace?: { resource: string; tutor: string; finish: string };
}

/**
 * §1 W's seven families, by the recipe id each publishes. Part of the frozen
 * domain (§10.7 stage 1b): stage 2 measures S norms against this recipe set,
 * so adding or removing a family is a score-version change, not an edit.
 */
/**
 * Section 10.8 item 6: the W SCHEDULER version, frozen beside the catalogue,
 * the combos and the win families. Bump it whenever the mana ledger, the
 * deployment rule, the cantrip ledger, the finish predicate or the horizon
 * changes - every S norm measured against an older value is superseded.
 */
export const W_SCHEDULER_VERSION = 'v14-stage3w';

export const WIN_FAMILIES: readonly string[] = [
  'combo', 'combat_wide', 'tokens', 'drain', 'combat_tall', 'alt_win', 'control', 'spells',
];

// ── W-zero audit (§10.6.2) ────────────────────────────────────────────────

/**
 * Why a family did NOT produce a recipe. §10.6.2 asks every W=0 list to be
 * classified as known-absent / unsupported-family / missing-prerequisite /
 * bad-input; a classifier can only do that if each builder says which gate it
 * failed. `code` is the stable key the audit groups on, `detail` is evidence.
 */
export interface WinAuditNote { family: string; code: string; detail: string }

/** Collector threaded through the builders. `undefined` in the scoring path. */
type Audit = WinAuditNote[] | undefined;

function note(audit: Audit, family: string, code: string, detail: string): null {
  audit?.push({ family, code, detail });
  return null;
}

/** Library copies only — a commander is never drawn, so it never enters `J_l`. */
function poolK(pool: RecipePool): number {
  return pool.members.reduce((s, m) => s + (m.guaranteed ? 0 : m.quantity), 0);
}

/**
 * §1 W: "First satisfy/decrement guaranteed commander requirements and drop
 * pools with r_j=0." A commander filling this role removes one required
 * library copy; a pool it fills alone needs no draw at all (access 1).
 */
function poolR(pool: RecipePool): number {
  const guaranteed = pool.members.reduce((s, m) => s + (m.guaranteed ? m.quantity : 0), 0);
  return Math.max(0, pool.r - guaranteed);
}

/**
 * Mana for the `r` copies this pool must supply: every guaranteed commander
 * slot it consumes (cast from the command zone, not drawn) plus the cheapest
 * remaining library copies.
 *
 * // ponytail: those cheapest remaining copies are a LOWER bound where §1 W
 * // asks costs to "upper-bound every eligible member/path". Charging the
 * // dearest instead only works once every pool is split into cost bins; on the
 * // hand-built heterogeneous pools it bills one 6-drop outlet's mana to a pool
 * // whose other eleven members cost 1-2 and zeroes every curated deck
 * // (measured). Upgrade path is per-pool cost-bin variants, not a sort order.
 */
/**
 * The ONE access quantity: the disjoint-pool polynomial over a recipe's
 * COMPLETE pool list, averaged over the turn's draw sample. `evaluateRecipe`,
 * the control family's `J` and — since v1.4 stage 3h — `bestLine`'s candidate
 * ranking all read it, so selection and valuation are the same monotone number.
 */
function poolsAccess(format: ScoreFormat, N: number, t: number, pools: readonly RecipePool[]): number {
  const poly = buildDisjointAccessPolynomial(N, pools.map((p) => ({ K: poolK(p), r: poolR(p) })));
  const ns = drawSampleSizes(format, t);
  return ns.reduce((s, n) => s + readAccessAt(poly, N, n), 0) / ns.length;
}

function poolCost(pool: RecipePool): number {
  let cost = 0;
  let needed = pool.r;
  const library: number[] = [];
  for (const m of pool.members) {
    for (let i = 0; i < m.quantity; i++) {
      if (m.guaranteed && needed > 0) { cost += m.cmc; needed--; }
      else if (!m.guaranteed) library.push(m.cmc);
    }
  }
  library.sort((a, b) => a - b);
  return cost + library.slice(0, Math.max(0, needed)).reduce((s, c) => s + c, 0);
}

function toMember(feature: CardFeature, quantity: number, guaranteed = false): Member {
  return { name: feature.card.name, cmc: feature.c, quantity, guaranteed };
}

/** Command-zone members of a pool: guaranteed access, one copy each. */
function commanderMembers(commanders: CardFeature[], pred: (f: CardFeature) => boolean): Member[] {
  return commanders.filter(pred).map((f) => toMember(f, 1, true));
}

/**
 * One entry per card name. Pools are built by concatenating family lists, and
 * a card that is both (say) a creature body and a typed cast-trigger source
 * would otherwise be counted twice in `poolK` and inflate `J_l`.
 */
function dedupeMembers(members: readonly Member[]): Member[] {
  const byName = new Map<string, Member>();
  for (const m of members) if (!byName.has(m.name)) byName.set(m.name, m);
  return [...byName.values()];
}

/**
 * §10.8 item 2, rituals: a ONE-SHOT ritual is not a persistent mana source.
 * Before this, `Dark Ritual`/`Seething Song` were `isRamp` with `c <= 3` and
 * therefore paid +1 mana on EVERY turn from turn 3, for ever, having been cast
 * exactly zero times. A printed ritual now leaves this bonus entirely and is
 * credited once, at its actual resolution, inside the burst budget
 * (`deck-score-spells.ts`), so neither budget can count the same copy.
 */
function isPersistentManaSource(f: CardFeature): boolean {
  // A persistent source is a PERMANENT. `isPrintedRitual` only rejects rituals
  // with a countable printed yield, so an unbounded one ("Add {R} for each
  // card in target opponent's hand", Jeska's Will) slipped through and was
  // credited a mana EVERY turn — and casting it out of the schedule's own
  // budget cost more than it returned, so deleting it RAISED the ceiling
  // (`commander 381382642`). An instant/sorcery never persists.
  const tl = f.card.type_line || '';
  if (tl.includes('Instant') || tl.includes('Sorcery')) return false;
  return f.isRamp && f.c <= 3 && !isPrintedRitual(f);
}

/**
 * §10.8 item 2: ONE mana ledger, and a persistent mana source has to be
 * deployed out of it before it produces.
 *
 * Before this the curve was `t + min(3, cheap ramp copies)` from turn 3 flat —
 * the rocks and dorks were never cast, they simply existed from turn 3. The
 * curve below plays them: each turn the deck spends the mana it actually has
 * on the cheapest ramp copies it has actually drawn, and those copies produce
 * from the FOLLOWING turn (a mana creature is summoning-sick, and charging a
 * rock the same turn is the reading that cannot invent a turn).
 *
 * `at(t)` is what the turn produces; `spendableAt(t)` is what is left once that
 * turn's own ramp deployment is paid, and it is the budget every other cost —
 * spells, activations, animation, creature and commander deployment — comes
 * out of.
 *
 * // ponytail: net +1 mana per ramp copy and the same `min(3, …)` ceiling the
 * // scalar carried, so the correction is the PAYMENT, not a new ramp model.
 * // Upgrade path is typed per-card yield in the catalogue, not a bigger cap.
 */
export interface ManaCurve {
  /** Mana produced on turn `t`: land drops plus ramp already online. */
  at(t: number): number;
  /** Mana left on turn `t` after that turn's ramp deployment. */
  spendableAt(t: number): number;
  /** Ramp mana online at the horizon — the number the old scalar reported. */
  bonus: number;
  /** The persistent mana sources themselves. §10.10 item 1: the damage schedule
   * pays for the copies it CHOOSES out of its own budget, so it needs the
   * roster, not this curve's expected-value prepass. */
  ramp?: readonly { name: string; cmc: number; quantity: number }[];
  trace: string;
}

/** Net mana a credited ramp copy adds, and the ceiling on the whole bonus. */
const RAMP_CAP = 3;

/** Exported for the stage-1d mechanics tests; `scoreDeck` reaches it through
 * `buildRecipes`. */
export function manaCurveFor(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], horizon: number,
): ManaCurve {
  const ramp = nonLand
    .filter((e) => isPersistentManaSource(e.feature))
    .map((e) => ({ name: e.feature.card.name, cmc: e.feature.c, quantity: e.quantity, paid: 0 }))
    .sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));
  const total: number[] = [0];
  const spend: number[] = [0];
  let online = 0;
  for (let t = 1; t <= horizon; t++) {
    const produced = t + online;
    let budget = produced;
    let spent = 0;
    let added = 0;
    for (const r of ramp) {
      if (online + added >= RAMP_CAP - 1e-9) break;
      const drawn = Math.min(r.quantity, r.quantity * seenBy(format, N, t, 0));
      const room = RAMP_CAP - online - added;
      const want = Math.min(drawn - r.paid, room);
      if (want <= 1e-9) continue;
      if (r.cmc > budget + 1e-9) continue;
      const take = r.cmc <= 0 ? want : Math.min(want, budget / r.cmc);
      if (take <= 1e-9) continue;
      r.paid += take;
      budget -= take * r.cmc;
      spent += take * r.cmc;
      added += take;
    }
    total[t] = produced;
    spend[t] = spent;
    // Deployed this turn, producing from the next one.
    online = Math.min(RAMP_CAP, online + added);
  }
  const clampT = (t: number): number => Math.max(1, Math.min(horizon, Math.round(t)));
  return {
    at: (t) => total[clampT(t)],
    spendableAt: (t) => Math.max(0, total[clampT(t)] - spend[clampT(t)]),
    bonus: online,
    ramp: ramp.map((r) => ({ name: r.name, cmc: r.cmc, quantity: r.quantity })),
    trace: `${ramp.length} persistent mana source(s), ${online.toFixed(2)} online by T${horizon};`
      + ` mana T3/T6/T${horizon} ${total[clampT(3)].toFixed(2)}/${total[clampT(6)].toFixed(2)}/${total[horizon].toFixed(2)}`
      + `, spendable ${(total[clampT(3)] - spend[clampT(3)]).toFixed(2)}/${(total[clampT(6)] - spend[clampT(6)]).toFixed(2)}`
      + `/${(total[horizon] - spend[horizon]).toFixed(2)}`,
  };
}

// ── The output schedule ───────────────────────────────────────────────────

/**
 * A permanent that deals `output` damage per combat/turn once it is online.
 * The four optional fields are §9.4's typed finisher rules; a creature body
 * leaves every one of them at the default and schedules exactly as it did in
 * v1.1 (upkeep 0, forgoes no mana, never runs out, no extra delay).
 */
export interface Source {
  name: string; cmc: number; quantity: number; guaranteed: boolean; output: number;
  /** Mana spent EVERY turn this source produces (animation, activation). */
  upkeepMana?: number;
  /** Mana it stops producing on a turn it attacks (an animated land). */
  manaForgone?: number;
  /** Turns of output a finite budget supports (planeswalker loyalty). */
  turns?: number;
  /** Own turns between resolving and first producing. */
  deployDelay?: number;
  kind?: FinisherKind;
  trace?: string;
  /** Attacking bodies this copy puts on the board — what a pump multiplies. */
  bodies?: number;
  /** Output on turn `t` when it varies (a cast trigger follows the deck's own
   * spell schedule). `output` stays the mean, which is what sizes the pool. */
  outputAt?: (t: number) => number;
  /** Sources sharing this key draw on ONE pool of casts per turn. */
  shareKey?: string;
  /** This row's output is only reachable by paying an EXTRA pool (the Food
   * conversion toll). A line may always decline it, so `bestLine` scans the
   * toll-free variant of every theta level too - see its note. */
  tolled?: boolean;
  /** The mana ONE chosen cast costs (10.10 item 1: a price, never a
   * compulsory package charge). */
  upkeepAt?: (t: number) => number;
  /** Casts turn `t` can offer - the CAP on how many are choosable. */
  castsAt?: (t: number) => number;
  /** The part of `outputAt(t)` the permanent produces on its OWN, with no cast
   * made this turn. 10.10 items 1-2: the rest is credited only through casts
   * the scheduler chooses and pays for, so an `act`/`dep` span carries this
   * part and the `share` span carries the remainder. */
  stackedAt?: (t: number) => number;
  /** Section 10.8 item 1: `output` is dealt to EVERY opponent at once, so its
   * per-opponent size is `output / opponents`. */
  eachOpponent?: boolean;
  /** Per-opponent damage on turn `t` when the split varies (a cast trigger
   * that pings the table AND leaves a counter behind). */
  eachOpponentAt?: (t: number) => number;
}

function sourceOf(feature: CardFeature, quantity: number, output: number, guaranteed = false): Source {
  return { name: feature.card.name, cmc: feature.c, quantity, guaranteed, output, bodies: 1 };
}

/** At most three pump effects are counted at once: a real board holds a few
 * anthems, and an unbounded stack would let a pile of team pumps manufacture a
 * clock out of one token. §9.4 asks for "bounded token/pump output". */
const MAX_STACKED_PUMP = 3;

/** Damage bought per mana — the order the turn's mana budget is spent in. */
function outputPerMana(s: Source): number {
  return s.output / Math.max(1, (s.upkeepMana ?? 0) + (s.manaForgone ?? 0));
}

/**
 * Expected copies of a `cost` spell an expected `budget` of leftover mana pays
 * for. At `budget >= cost` this is the plain `budget / cost` the ledger always
 * used, and below `(1 - AFFORD_BAND) * cost` it is still exactly ZERO, so
 * section 10.8 item 2's rule survives untouched: no turn part-finances a spell
 * it could not cast. All that changed is the last `AFFORD_BAND` of the cost,
 * where the old `cost > budget -> skip` test STEPPED from zero to a whole
 * copy. The leftover is an expectation over hands, not mana in hand, so the
 * copies it buys ramp across that band instead of switching. Exported for the
 * stage-3d unit test.
 */
export const AFFORD_BAND = 0.25;
export function affordable(budget: number, cost: number): number {
  if (cost <= 0) return Infinity;
  const ratio = Math.max(0, budget) / cost;
  if (ratio >= 1) return ratio;
  return Math.max(0, (ratio - (1 - AFFORD_BAND)) / AFFORD_BAND);
}

/**
 * Copies of one card seen by turn `t` - the base draw only.
 *
 * MEASURED AND REJECTED (stage 1b): widening this by the deck's typed
 * repeatable draw (`extraDraws`) cut the Commander W-zero share 27.6 % -> 18.6 %,
 * and took `precon-witherbloom` 54 -> 59 and `imotekh` 60 -> 66, both OUT of
 * their section 10.6.3 retained bands, because W is the binding term in their
 * quality cap. Section 9.4 asks for draw EVENTS in draw-damage output, not in
 * the board-size expectation, so the parameter stays wired for the finisher
 * rules and the schedule keeps the base draw.
 */
function seenBy(format: ScoreFormat, N: number, t: number, _extraDraws: number): number {
  return Math.min(1, Hf(format, N, 1, t, 1));
}

export interface DamageSchedule {
  /** First turn EVERY opponent is dead under a feasible allocation, or null. */
  tStar: number | null;
  /** Expected table damage on each turn 2..horizon. */
  perTurn: readonly number[];
  /** Aggregate table output by the horizon - the number that explains a null
   * `tStar` together with `shortfall`. */
  ceiling: number;
  /** Life still on the most-alive opponent at the end of turn t (index = turn),
   * i.e. the section 10.8 shortfall, reportable at T12/T16/T20. */
  shortfall: readonly number[];
  /** Per-turn, per-source contributions, printed by `pile-diag --win`. */
  detail: readonly string[];
  /** Per-turn mana ledger: produced / spells / activations / deployment / left. */
  ledger: readonly string[];
}

/** Section 10.8 item 1: the finish predicate is per opponent, not aggregate. */
export interface FinishTarget {
  /** Life each opponent starts on (40 Commander, 25 Brawl, 21 for Voltron). */
  perOpponent: number;
  opponents: number;
}

/**
 * `E[output at tau] = sum_i q_i . P(card i seen by tau-1) . [copy paid for by
 * tau-1] . output_i`, allocated to actual opponents, and
 * `t* = min t <= H : every opponent is at 0`.
 *
 * Attacks start on turn 2; a copy paid for on tau-1 contributes on tau
 * (summoning sickness). Section 10.8 item 2 made three things true here that
 * were not before:
 *
 *   deployment  every body, every commander and every engine is CAST out of
 *               the same per-turn budget as the spells, activations and
 *               animation. The command zone is availability, not free casting.
 *   rituals     a one-shot ritual is no longer +N mana on every turn; the mana
 *               curve carries only persistent sources, each of them deployed.
 *   allocation  120 aggregate is not a finish. Each-opponent output hits all
 *               three at once; everything else is aimed one opponent at a time
 *               and cannot spend its overkill on the next one.
 *
 * Section 9.4 "debit shared mana, fodder and life once": each turn has ONE
 * budget, spent in the order spells -> activations -> deployment.
 */
/** Exported for the stage-1d mechanics tests (the ledger, the deployment debit
 * and the per-opponent allocation each need a hand-built source list). */
export function scheduleDamage(
  format: ScoreFormat, N: number, sources: readonly Source[], manaCurve: ManaCurve,
  finish: FinishTarget, extraDraws = 0,
): DamageSchedule {
  const horizon = horizonFor(format);
  const perTurn: number[] = [];
  const detail: string[] = [];
  const ledger: string[] = [];
  const shortfall: number[] = new Array(horizon + 1).fill(finish.perOpponent);
  let cumulative = 0;
  let tStar: number | null = null;
  const opponents = Math.max(1, Math.round(finish.opponents));
  const remaining = new Array(opponents).fill(finish.perOpponent);
  const priced = [...sources].sort((a, b) => outputPerMana(b) - outputPerMana(a) || a.name.localeCompare(b.name));
  // Best output per mana SPENT DEPLOYING goes down first.
  const deployOrder = sources
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (b.s.output / Math.max(1, b.s.cmc)) - (a.s.output / Math.max(1, a.s.cmc))
      || a.s.name.localeCompare(b.s.name) || a.i - b.i);
  // `paidCum[i][t]` = expected copies of source `i` whose casting cost is paid
  // by the END of turn t; a copy paid on p is online from p+1 plus its own
  // `deployDelay`.
  const paid = new Array(sources.length).fill(0);
  const firstPaid = new Array(sources.length).fill(Infinity);
  const paidCum: number[][] = sources.map(() => new Array(horizon + 2).fill(0));
  // §10.10 item 2, reserved future-payment ledger: a chosen deployment whose
  // claimed output needs a per-turn activation/upkeep payment reserves that
  // payment on every turn it claims output for. Later turns enter net of
  // `due(t)`, and an optional deployment may not be taken if it makes a
  // reservation unpayable — "a damage coefficient alone cannot fund its future
  // payments". Setting a use to zero removes its future costs and output
  // together, because the reservation is only written when the item is taken.
  const due = new Array(horizon + 2).fill(0);
  const indexOf = new Map(sources.map((s, i) => [s, i]));
  let deploySpend = 0;
  let rampSpend = 0;
  // §10.10 item 1: the ramp is a CHOICE inside the same allocation, not an
  // expected-value prepass. `manaCurveFor` still prices it for the spell/burst
  // ledgers; the damage schedule pays for the copies it actually wants out of
  // its own per-turn budget, so diluting a ramp copy can no longer hand the
  // deployment a hundredth of freed mana (stage 3g phase 1, `348699891`).
  const ramp = (manaCurve.ramp ?? []).map((r) => ({ ...r, paid: 0 }));
  let rampOnline = 0;
  const norms = normsFor(format);
  const decayAt = (s: number): number =>
    Math.pow(2, -Math.max(0, s - norms.fastClosingTurn) / norms.delayHalfLifeTurns);
  /** §10.10's common currency: decay-discounted damage from turn `from` to H,
   * expressed relative to turn `t`, so an item that pays now and one that pays
   * later are comparable in ONE order. */
  // §10.10 item 2 / §10.8: values are read against the PROFILE's planning
  // horizon, never the current search bound, so an H12 diagnostic truncates the
  // same H20-planned trace instead of re-prioritising it.
  const planHorizon = format === 'commander' ? COMMANDER_HORIZON : MAX_TURN;
  const futureFactor = (t: number, from: number): number => {
    let f = 0;
    for (let s = Math.max(2, from); s <= planHorizon; s++) f += decayAt(s) / decayAt(t);
    return f;
  };
  /** §10.10 item 2: an item's OWN causal damage, by turn, per unit of `x`.
   * `per` = copies firing per unit x; `from`/`to` bound the turns it fires.
   * No other item is re-simulated and no unchosen future spell appears. */
  interface ProjSpan {
    from: number; to: number; src: Source; per: number;
    /** Which half of a cast trigger output this span causes. A body/`dep`
     * carries only what the permanent makes on its own; the shared cast
     * package carries the cast-driven half. Sources with no split are
     * `stacked` and read their whole output (10.10 items 1-2). */
    part: 'stacked' | 'cast';
    /** 10.10 R2: this span's damage is the cast package this deployment
     * reserved, so it is NOT counted a second time by the tau scan or the
     * settlement - the `share` item that buys those casts carries it.
     * Valuation only. */
    reserved?: boolean;
  }
  interface TurnItem {
    kind: 'share' | 'act' | 'dep' | 'ramp';
    i: number; key: string; cost: number; want: number; value: number;
    spans: ProjSpan[];
    /** Per-copy mana this item owes on EVERY turn of its spans (0 for a body
     * that just attacks). Reserved in `due` when the item is taken. */
    upkeep?: number;
    /** 10.10 R2: per-copy mana this deployment reserves on turn `s` for the
     * casts it commits to buy there. Indexed by turn. */
    reserve?: number[];
  }
  for (let t = 1; t <= horizon; t++) {
    // §10.10 item 2: B_entry = what this state's paid sources produce, less the
    // compulsory dues its OWN previous choices created (none are modelled here:
    // every upkeep in this schedule is optional with the printed non-payment
    // consequence). Lands are one drop a turn; the ramp online is what this
    // schedule chose to cast and paid for.
    const produced = t + rampOnline;
    // §10.10 item 2: `B_entry` is net of the compulsory dues this state's own
    // previous choices created. The hold is released to the activation that
    // owns it as soon as that activation is taken (below), so a due is never
    // charged twice.
    const dueNow = Math.min(due[t] ?? 0, produced);
    let budget = produced;
    let spellSpend = 0;
    let upkeepSpend = 0;
    let turnOutput = 0;
    let eachOpponentTurn = 0;
    let pumpPerBody = 0;
    const units: DamageUnit[] = [];
    const onlineCopies = (s: Source): number | null => {
      const delay = s.deployDelay ?? 0;
      const te = t - delay;
      if (te < 2) return null;
      const i = indexOf.get(s) as number;
      // A finite budget (loyalty, a one-turn pump) pays for `turns` own turns,
      // starting the turn the source actually resolved.
      if (Number.isFinite(s.turns ?? Infinity) && te - firstPaid[i] > (s.turns as number)) return null;
      const online = paidCum[i][te - 1] ?? 0;
      return online > 1e-9 ? online : null;
    };
    // Every cast trigger on the board fires off the SAME spells, so the turn's
    // spell mana is charged once for the whole family and only in proportion to
    // how much of it is online. §10.10 item 1: that package is OPTIONAL - it is
    // boxed at B_entry like every other item, it competes in the same value
    // order, and a family that buys no damage is skipped entirely.
    const sharedScale = new Map<string, number>();
    /** Price of ONE cast, by share key. */
    const sharedSpend = new Map<string, number>();
    /** Casts turn `t` offers that key - a CAP, never a charge. */
    const sharedCasts = new Map<string, number>();
    for (const s of priced) {
      if (!s.shareKey || sharedSpend.has(s.shareKey)) continue;
      const online = onlineCopies(s);
      if (online === null || online <= 0) continue;
      // A package that declares its casts is priced PER CAST; one that does not
      // keeps the v1.4 form - a single all-or-nothing unit, priced at what the
      // online share of it would spend.
      const price = s.upkeepAt ? s.upkeepAt(t) : 0;
      sharedSpend.set(s.shareKey, s.castsAt ? price : price * Math.min(1, online));
      sharedCasts.set(s.shareKey, s.castsAt ? s.castsAt(t) : 1);
    }
    // ── the turn's items, every box frozen at B_entry BEFORE any is paid ──
    const items: TurnItem[] = [];
    const box = (want: number, cost: number): number =>
      (cost <= 0 ? want : Math.min(want, affordable(produced, cost)));
    // Anthems resolve first, and only because a pump changes what a body is
    // worth. Every typed anthem carries cost 0, so this is §10.10's "resolve
    // positive-value zero-cost items under their finite resource bounds first".
    // ponytail: a priced anthem is valued at its bonus over the bodies already
    // online; upgrade path is a joint pump/body solve if a costed anthem types.
    const bodiesOnline = priced.reduce((sum, s) =>
      sum + (s.kind === 'anthem' ? 0 : (onlineCopies(s) ?? 0) * (s.bodies ?? 0)), 0);
    for (const s of priced) {
      if (s.kind !== 'anthem') continue;
      const online = onlineCopies(s);
      if (online === null) continue;
      const spend = (s.upkeepMana ?? 0) + (s.manaForgone ?? 0);
      let copies = box(online, spend);
      if (spend > 0) {
        if ((s.outputAt ? s.outputAt(t) : s.output) * bodiesOnline <= 0) continue;
        copies = Math.min(copies, budget / spend);
        if (copies <= 1e-9) continue;
        budget -= copies * spend;
        upkeepSpend += copies * spend;
      }
      const unit = s.outputAt ? s.outputAt(t) : s.output;
      pumpPerBody += Math.min(copies, MAX_STACKED_PUMP) * unit;
    }
    // Activations, deployments, the shared spell package and the ramp all
    // compete in ONE value order (§10.10 item 2), never in category prepasses.
    /** One copy's damage at turn `at`, split into the two channels the
     * finish predicate needs: damage to EVERY opponent, and one assignable
     * unit of power (overkill on a unit is not reassignable). */
    // Pure in `(s, at, part)` for the whole of turn `t` — `pumpPerBody` is
    // final once the anthems above resolved and `opponents` is fixed. The same
    // triple is asked for by the `dep` value loop, the `cum` build, every tau's
    // `finishesBy` and the settlement pass, so it is memoised EXACTLY (same
    // object, no recomputation, no approximation).
    const ptCache = new Map<number, { each: number; power: number }>();
    const perTurnOf = (
      s: Source, at: number, part: 'stacked' | 'cast',
    ): { each: number; power: number } => {
      const ck = (((indexOf.get(s) as number) ?? -1) * (horizon + 2) + at) * 2
        + (part === 'cast' ? 1 : 0);
      const hit = ptCache.get(ck);
      if (hit !== undefined) return hit;
      const full = s.outputAt ? s.outputAt(at) : s.output;
      const eachFull = s.eachOpponentAt ? s.eachOpponentAt(at) : (s.eachOpponent ? full / opponents : 0);
      // What this copy deals with NO cast made this turn. A source outside a
      // cast package owns its whole output and schedules exactly as it did
      // before (a body, a walker, an animated land); a member of a cast
      // package with no declared split is cast-driven end to end.
      const onOwn = s.stackedAt ? s.stackedAt(at) : (s.shareKey ? 0 : full);
      const eachOnOwn = s.stackedAt || s.shareKey ? 0 : eachFull;
      const unit = part === 'stacked' ? onOwn : Math.max(0, full - onOwn);
      const each = part === 'stacked' ? eachOnOwn : Math.max(0, eachFull - eachOnOwn);
      // The body (and any pump raising it) belongs to the permanent, never to
      // the cast package.
      const out = { each,
        power: Math.max(0, unit - each * opponents)
          + (part === 'stacked' ? pumpPerBody * (s.bodies ?? 0) : 0) };
      ptCache.set(ck, out);
      return out;
    };
    const perCopyNow = (s: Source, scale: number): number => {
      const unit = (s.outputAt ? s.outputAt(t) : s.output) * scale;
      const perOpp = s.eachOpponentAt ? s.eachOpponentAt(t) * scale : (s.eachOpponent ? unit / opponents : 0);
      const single = Math.max(0, unit - perOpp * opponents);
      return perOpp * opponents + single + pumpPerBody * (s.bodies ?? 0);
    };
    /** The cast-driven half of one copy output this turn, at full casts. */
    const castPartNow = (s: Source): number => {
      const d = perTurnOf(s, t, 'cast');
      return d.each * opponents + d.power;
    };
    for (const [key, price] of sharedSpend) {
      const nCasts = sharedCasts.get(key) ?? 0;
      const spans: ProjSpan[] = [];
      let now = 0;
      // One unit of `x` is ONE CHOSEN CAST, so the whole expected package is
      // `nCasts` units and a span carries the per-cast share of each online
      // copy CAST-DRIVEN output. The permanent own stacked output is not here:
      // it rides its `act`/`dep` span and needs no cast to happen.
      for (const s of priced) {
        if (s.shareKey !== key) continue;
        const online = onlineCopies(s);
        if (online === null) continue;
        now += online * castPartNow(s);
        if (nCasts > 1e-9) spans.push({ from: t, to: t, src: s, per: online / nCasts, part: 'cast' });
      }
      if (now <= 0 || price <= 0 || nCasts <= 1e-9) {
        sharedScale.set(key, price > 0 && nCasts > 1e-9 ? 0 : 1);
        continue;
      }
      items.push({ kind: 'share', i: 0, key, cost: price, want: box(nCasts, price),
        value: now / nCasts, spans });
    }
    for (let i = 0; i < priced.length; i++) {
      const s = priced[i];
      if (s.kind === 'anthem') continue;
      const online = onlineCopies(s);
      if (online === null) continue;
      const spend = (s.upkeepMana ?? 0) + (s.manaForgone ?? 0);
      // 10.10 R1: an activation's value is what its span carries - the
      // permanent's OWN output. The cast-driven half is bought, at a price,
      // through the shared cast package; valuing it here credited casts
      // nobody chose (3t STOP 2).
      const nowD = perTurnOf(s, t, 'stacked');
      const now = nowD.each * opponents + nowD.power;
      if (now <= 1e-12) continue;
      items.push({ kind: 'act', i, key: `act:${s.name}`, cost: spend, want: box(online, spend), value: now,
        spans: [{ from: t, to: t, src: s, per: 1, part: 'stacked' }] });
    }
    for (const { s, i } of deployOrder) {
      const cap = s.guaranteed ? 1 : s.quantity * seenBy(format, N, t, extraDraws);
      const want = cap - paid[i];
      if (want <= 1e-9) continue;
      const cost = Math.max(0, s.cmc);
      // §10.10 items 2/4: the affordability box is frozen at the turn's ENTRY
      // budget, so it never moves with a competing item's want; the shared mana
      // constraint below is the only thing the items compete for.
      const delay = s.deployDelay ?? 0;
      const life = s.turns ?? Infinity;
      const from = t + 1 + delay;
      const to = Number.isFinite(life) ? Math.min(horizon, t + delay + life) : horizon;
      // 10.10 items 1-2: what this deployment is worth is what IT causes. For a
      // cast trigger that is its stacked half only - the cast-driven half is
      // bought turn by turn through the shared cast package, at a price, and
      // valuing it here credited casts nobody chose: `s.output` is the MEAN of
      // `outputAt` over the IDENTIFIED library, so removing one off-plan answer
      // made the library cheaper, raised every cast count, moved the value of
      // three zero-stacked cast triggers and re-ordered the turn-3 deployment
      // knapsack (`commander 381147684`: T3 deployment 3.87 -> 4.02, t* 11 ->
      // 10, +5.15 T_abs on a strictly worse deck).
      let value = 0;
      // 10.10 R2: a cast-trigger deployment is valued by the CASTS IT
      // RESERVES. On every turn of its span it commits to buy, at that turn's
      // per-cast price, as many casts as the turn offers and as production net
      // of the standing reservations can pay; those commitments are written
      // into `due` when the item is taken (below) and released as the casts
      // are bought. Zero use => no reservation and value 0: a pinger with
      // nothing to cast is correctly worth nothing, and a deployment whose
      // reserved casts are unpayable is filtered by `payable()`.
      let reserve: number[] | undefined;
      if (s.stackedAt || s.shareKey) {
        const spans: ProjSpan[] = [{ from, to, src: s, per: 1, part: 'stacked' }];
        let castValue = 0;
        for (let u = from; u <= to; u++) {
          const d = perTurnOf(s, u, 'stacked');
          value += (d.each * opponents + d.power) * (decayAt(u) / decayAt(t));
          const c = perTurnOf(s, u, 'cast');
          const castUnit = c.each * opponents + c.power;
          // A package that does not declare its casts is ONE all-or-nothing
          // unit, exactly as `sharedCasts` prices it; reading 0 here left
          // every such deployment worth nothing and it was never deployed.
          const nCasts = s.castsAt ? s.castsAt(u) : 1;
          if (castUnit <= 1e-12 || nCasts <= 1e-9) continue;
          const price = s.upkeepAt ? s.upkeepAt(u) : 0;
          const room = price > 1e-9
            ? Math.max(0, (u + rampOnline) - (due[u] ?? 0)) / price : Infinity;
          const x = Math.min(nCasts, room);
          if (x <= 1e-9) continue;
          castValue += castUnit * (x / nCasts) * (decayAt(u) / decayAt(t));
          if (price > 1e-9) {
            if (!reserve) reserve = new Array(horizon + 2).fill(0);
            reserve[u] = x * price;
          }
        }
        if (castValue > 1e-12) {
          value += castValue;
          spans.push({ from, to, src: s, per: 1, part: 'cast', reserved: true });
        }
        if (value <= 1e-12) continue;
        items.push({ kind: 'dep', i, key: `dep:${s.name}`, cost, want: box(want, cost), value,
          spans, reserve, upkeep: (s.upkeepMana ?? 0) + (s.manaForgone ?? 0) });
        continue;
      }
      value = s.output * futureFactor(t, from);
      if (value <= 1e-12) continue;
      items.push({ kind: 'dep', i, key: `dep:${s.name}`, cost, want: box(want, cost), value,
        spans: [{ from, to, src: s, per: 1, part: 'stacked' }],
        upkeep: (s.upkeepMana ?? 0) + (s.manaForgone ?? 0) });
    }
    // A ramp copy is priced in the same currency: the mana it will produce,
    // valued at the best damage per mana this turn can actually buy.
    const lambda = items.reduce((m, it) => (it.kind === 'dep' && it.cost > 0
      ? Math.max(m, it.value / it.cost) : m), 0);
    if (lambda > 0 && rampOnline < RAMP_CAP - 1e-9) {
      for (let j = 0; j < ramp.length; j++) {
        const r = ramp[j];
        const want = Math.min(r.quantity * seenBy(format, N, t, 0) - r.paid, RAMP_CAP - rampOnline);
        if (want <= 1e-9) continue;
        const cost = Math.max(0, r.cmc);
        items.push({ kind: 'ramp', i: j, key: `ramp:${r.name}`, cost,
          want: box(want, cost), value: lambda * futureFactor(t, t + 1), spans: [] });
      }
    }
    // Fractional knapsack over the shared budget: descending value per mana,
    // positive-value zero-cost items first, canonical key as the tie-break.
    const live = items.filter((it) => it.want > 1e-9);
    const density = (it: TurnItem): number => (it.cost <= 0 ? Infinity : it.value / it.cost);
    /** Fill `take` along `seq` under one shared mana constraint; returns the
     * budget left. Wants are the boxes frozen at `B_entry`; nothing is
     * recomputed against the residual. */
    /** Copies of a deployment whose future reservations are payable: on every
     * turn it claims output for, `due(s) + x*upkeep` must fit that turn's
     * production. */
    const payable = (it: TurnItem): number => {
      if (it.kind !== 'dep') return Infinity;
      let room = Infinity;
      if (it.reserve) {
        for (let s = t; s <= horizon; s++) {
          const q = it.reserve[s] ?? 0;
          if (q > 1e-9) room = Math.min(room, Math.max(0, (s + rampOnline) - due[s]) / q);
        }
      }
      const c = it.upkeep ?? 0;
      if (c <= 1e-9) return room;
      for (const sp of it.spans) {
        for (let s = sp.from; s <= Math.min(sp.to, horizon); s++) {
          room = Math.min(room, Math.max(0, (s + rampOnline) - due[s]) / c);
        }
      }
      return room;
    };
    const fill = (seq: readonly TurnItem[], into: Map<string, number>, budget0: number): number => {
      let b = budget0;
      // The hold this turn's own dues place on OPTIONAL new spending. An
      // activation that owns a reservation releases it as it is taken.
      // stage 3o: the hold may never exceed what this turn's activations can
      // actually absorb. `due` reserves an OPTIONAL per-turn payment on every
      // turn of a deployment's span, but on a turn where the activation is not
      // even offered - `box` zeroes it below 75 % of its cost, so an unanimated
      // manland has no `act` item at all - the reservation holds mana against a
      // payment that cannot be made. That hold sat at `produced` on the early
      // turns, so `b - held` was a near-zero residual and an INFINITESIMAL
      // change in the expected deployed copies (`quantity * seenBy(N)`) moved
      // the free mana by tens of percent: +4 unknown slots on `standard:1445903`
      // shrank the reservation, bought more ramp on T3/T4 and closed the kill a
      // turn EARLIER (t* 10 -> 9, W 23.9 -> 33.7, total +7.8). A reservation is
      // only real up to the payment on offer, so it is bounded by it; the
      // release below is unchanged (SS 10.10 item 1: a debit that is a choice is
      // charged when the choice is taken).
      // 10.10 R2: a cast-trigger deployment reserves the price of the casts
      // it commits to; the `share` item IS that purchase, so it releases the
      // hold exactly as an `act` does.
      const offered = live.reduce((sum, it) =>
        sum + (it.kind === 'act' || it.kind === 'share' ? it.want * it.cost : 0), 0);
      let held = Math.min(dueNow, offered);
      for (const it of live) {
        if (it.kind === 'act' || it.kind === 'share') held -= (into.get(it.key) ?? 0) * it.cost;
      }
      held = Math.max(0, held);
      // §10.10 item 2: `RAMP_CAP` is ONE shared resource. Each ramp item's want
      // was boxed against the whole remaining room, so two options could each
      // take it and the total paid overshot the cap — mana spent on copies that
      // produce nothing, and an ADDED ramp option lowered the optimum
      // (`commander 381382642`). The room is spent once, along the value order.
      let rampRoom = RAMP_CAP - rampOnline;
      for (const it of live) if (it.kind === 'ramp') rampRoom -= into.get(it.key) ?? 0;
      for (const it of seq) {
        let room = Math.min(it.want - (into.get(it.key) ?? 0), payable(it));
        if (it.kind === 'ramp') room = Math.min(room, Math.max(0, rampRoom));
        if (room <= 1e-9) continue;
        const cap = it.kind === 'dep' || it.kind === 'ramp' ? Math.max(0, b - held) : b;
        const x = it.cost <= 0 ? room : Math.min(room, cap / it.cost);
        if (x <= 1e-9) continue;
        into.set(it.key, (into.get(it.key) ?? 0) + x);
        b -= x * it.cost;
        if (it.kind === 'ramp') rampRoom -= x;
        if (it.kind === 'act' || it.kind === 'share') held = Math.max(0, held - x * it.cost);
      }
      return b;
    };
    const byValue = live.filter((it) => it.value > 1e-12)
      .sort((a, b) => density(b) - density(a) || a.key.localeCompare(b.key));
    // ── §10.10 item 2: "Finish has priority over terminal output" ──
    // For tau = t..H ascending, solve the same turn problem with value =
    // each item's own projected damage through tau and test the finish
    // predicate for EVERY opponent. The first feasible tau wins; then the
    // leftover budget maximises the discounted contribution; ties break on
    // least spend, then canonical id. With no feasible tau this is exactly
    // the previous objective. Closes 3j OPEN 1: the per-turn value maximum
    // preferred a body whose discounted future output beat the activation
    // that closed a turn earlier, and W reads the FIRST FINISH.
    const spanUnits = (it: TurnItem, s: number, x: number, out: DamageUnit[]): number => {
      let each = 0;
      for (const sp of it.spans) {
        if (s < sp.from || s > sp.to || sp.reserved) continue;
        const d = perTurnOf(sp.src, s, sp.part);
        each += d.each * sp.per * x;
        if (d.power > 1e-9) out.push({ power: d.power, count: sp.per * x });
      }
      return each;
    };
    const needed = remaining.reduce((sum, r) => sum + r, 0);
    const scan = Number.isFinite(needed) && needed > 1e-9 && live.length > 0 && budget > 1e-9;
    // Cumulative aggregate damage per unit of x, by tau — the cheap necessary
    // condition that keeps the per-opponent simulation off the hot path.
    const cum = new Map<string, number[]>();
    /** The turns an item's spans actually cover — outside them `spanUnits` is
     * identically zero, so the cumulative array is flat there. An `act` or
     * `share` span is a single turn, so this is the whole horizon of work for
     * most items. */
    const spanLo = (it: TurnItem): number =>
      it.spans.reduce((m, sp) => Math.min(m, sp.from), Infinity);
    const spanHi = (it: TurnItem): number =>
      it.spans.reduce((m, sp) => Math.max(m, sp.to), -Infinity);
    if (scan) {
      for (const it of live) {
        const arr = new Array(horizon + 2).fill(0);
        let acc = 0;
        const lo = Math.max(Math.max(2, t), spanLo(it));
        const hi = Math.min(horizon, spanHi(it));
        for (let s = Math.max(2, t); s <= horizon; s++) {
          if (s >= lo && s <= hi) {
            const u: DamageUnit[] = [];
            acc += spanUnits(it, s, 1, u) * opponents + u.reduce((sum, x) => sum + x.power * x.count, 0);
          }
          arr[s] = acc;
        }
        cum.set(it.key, arr);
      }
    }
    const aggregate = (alloc: Map<string, number>, tau: number): number => {
      let sum = 0;
      for (const [k, x] of alloc) sum += ((cum.get(k) as number[])?.[tau] ?? 0) * x;
      return sum;
    };
    /** The FIRST turn `alloc` clears every opponent, or `Infinity`. Identical
     * to `finishesBy(alloc, tau)` for every tau (`finishTurnOf <= tau`), and
     * computed once instead of once per tau. */
    const finishTurnOf = (alloc: Map<string, number>, upTo: number): number => {
      const rem = remaining.slice();
      for (let s = Math.max(2, t); s <= upTo; s++) {
        const u: DamageUnit[] = [];
        let each = 0;
        for (const it of live) {
          const x = alloc.get(it.key) ?? 0;
          if (x > 1e-9) each += spanUnits(it, s, x, u);
        }
        allocateDamage(rem, each, u);
        if (rem.every((r) => r <= 1e-9)) return s;
      }
      return Infinity;
    };
    const finishesBy = (alloc: Map<string, number>, tau: number): boolean => {
      const rem = remaining.slice();
      for (let s = Math.max(2, t); s <= tau; s++) {
        const u: DamageUnit[] = [];
        let each = 0;
        for (const it of live) {
          const x = alloc.get(it.key) ?? 0;
          if (x > 1e-9) each += spanUnits(it, s, x, u);
        }
        allocateDamage(rem, each, u);
        if (rem.every((r) => r <= 1e-9)) return true;
      }
      return false;
    };
    let chosen: Map<string, number> | null = null;
    // `byValue`, `budget` and every closure `fill` reads are fixed for the whole
    // tau scan, so the ordinary value allocation and the turn it finishes on do
    // not depend on tau: both are computed once instead of once per tau.
    let byContribution: Map<string, number> | null = null;
    let byContributionFinish = Infinity;
    for (let tau = Math.max(2, t); scan && tau <= horizon && chosen === null; tau++) {
      const seq = live
        .filter((it) => ((cum.get(it.key) as number[])[tau] ?? 0) > 1e-12)
        .sort((a, b) => {
          const da = a.cost <= 0 ? Infinity : (cum.get(a.key) as number[])[tau] / a.cost;
          const db = b.cost <= 0 ? Infinity : (cum.get(b.key) as number[])[tau] / b.cost;
          return db - da || a.key.localeCompare(b.key);
        });
      if (seq.length === 0) continue;
      // Ceiling first: if the whole budget spent on projected damage cannot
      // reach every opponent by tau, no allocation can, and the per-opponent
      // simulation is skipped.
      const witness = new Map<string, number>();
      fill(seq, witness, budget);
      if (aggregate(witness, tau) + 1e-9 < needed) continue;
      if (!finishesBy(witness, tau)) continue;
      // "then maximise the discounted contribution subject to that finish":
      // the ordinary value allocation is tried FIRST, so the finish rule only
      // moves an allocation that would otherwise miss this tau. The projected
      // -density fill is the fallback witness (max projected damage).
      if (byContribution === null) {
        byContribution = new Map<string, number>();
        fill(byValue, byContribution, budget);
        byContributionFinish = finishTurnOf(byContribution, horizon);
      }
      chosen = aggregate(byContribution, tau) + 1e-9 >= needed
        && byContributionFinish <= tau ? byContribution : witness;
    }
    const take = chosen ?? new Map<string, number>();
    for (const it of live) budget -= (take.get(it.key) ?? 0) * it.cost;
    budget = fill(byValue, take, budget);
    for (const it of live) {
      const x = take.get(it.key) ?? 0;
      if (x <= 1e-9) continue;
      if (it.kind === 'share') {
        sharedScale.set(it.key, x / (sharedCasts.get(it.key) || 1));
        spellSpend += x * it.cost;
      }
      else if (it.kind === 'act') upkeepSpend += x * it.cost;
      else if (it.kind === 'dep') {
        paid[it.i] += x; deploySpend += x * it.cost;
        if (!Number.isFinite(firstPaid[it.i])) firstPaid[it.i] = t;
        const c = it.upkeep ?? 0;
        if (c > 1e-9) {
          for (const sp of it.spans) {
            for (let s = sp.from; s <= Math.min(sp.to, horizon); s++) due[s] += x * c;
          }
        }
        if (it.reserve) {
          for (let s = t; s <= horizon; s++) {
            const q = it.reserve[s] ?? 0;
            if (q > 1e-9) due[s] += x * q;
          }
        }
      } else { ramp[it.i].paid += x; rampSpend += x * it.cost; }
    }
    for (const [key] of sharedSpend) if (!sharedScale.has(key)) sharedScale.set(key, 0);
    // ── what the chosen allocation actually deals ──
    for (const s of priced) {
      if (s.kind === 'anthem') continue;
      // 10.10 R1: the two halves of ONE row settle exactly as the two spans
      // that were chosen and paid for. The permanent's own output rides the
      // `act` copies; the cast-driven half rides the SHARE package, whose
      // value and span were built over every online copy — so it is credited
      // on the online copies at the scale of the casts actually bought, and
      // NO damage is credited without a chosen, priced cast. That scale is
      // ZERO when no share item was taken, never the old `?? 1`, which
      // credited a spellslinger's whole cast output free against a body row
      // of the same card; and a pinger with no stacked output has no `act`
      // item at all, which silently dropped its bought casts (3t STOP 2).
      const actCopies = take.get(`act:${s.name}`) ?? 0;
      const scale = s.shareKey ? sharedScale.get(s.shareKey) ?? 0 : 0;
      const castCopies = scale > 1e-9 ? (onlineCopies(s) ?? 0) : 0;
      if (actCopies <= 1e-9 && castCopies <= 1e-9) continue;
      const st = perTurnOf(s, t, 'stacked');
      const ct = perTurnOf(s, t, 'cast');
      const castPower = ct.power * scale;
      eachOpponentTurn += actCopies * st.each + castCopies * ct.each * scale;
      if (st.power > 1e-9 && actCopies > 1e-9) units.push({ power: st.power, count: actCopies });
      if (castPower > 1e-9 && castCopies > 1e-9) units.push({ power: castPower, count: castCopies });
      const dealt = actCopies * (st.each * opponents + st.power)
        + castCopies * (ct.each * scale * opponents + castPower);
      turnOutput += dealt;
      if (s.kind && dealt > 0) detail.push(`T${t} ${s.name} (${s.kind}) ${dealt.toFixed(2)}`);
    }
    if (pumpPerBody > 0) detail.push(`T${t} pump +${pumpPerBody.toFixed(2)} per body`);
    for (let i = 0; i < sources.length; i++) paidCum[i][t] = paid[i];
    rampOnline = Math.min(RAMP_CAP, ramp.reduce((sum, r) => sum + r.paid, 0));
    if (t >= 2) {
      allocateDamage(remaining, eachOpponentTurn, units);
      perTurn.push(turnOutput);
      cumulative += turnOutput;
      if (tStar === null && remaining.every((r) => r <= 1e-9)) tStar = t;
    }
    shortfall[t] = Math.max(...remaining);
    ledger.push(`T${t} mana ${produced.toFixed(2)} | spells ${spellSpend.toFixed(2)}`
      + ` | activations ${upkeepSpend.toFixed(2)} | deployment ${deploySpend.toFixed(2)} cumulative`
      + ` | ramp ${rampSpend.toFixed(2)} cumulative`
      + ` | left ${budget.toFixed(2)} | table damage ${turnOutput.toFixed(2)}`
      + ` | opponents ${remaining.map((r) => r.toFixed(1)).join('/')}`);
  }
  return { tStar, perTurn, ceiling: cumulative, shortfall, detail, ledger };
}

function closingTurn(
  format: ScoreFormat, N: number, sources: readonly Source[], manaCurve: ManaCurve,
  finish: FinishTarget, extraDraws = 0,
): number | null {
  if (finish.perOpponent <= 0 || sources.length === 0 || N <= 0) return null;
  return scheduleDamage(format, N, sources, manaCurve, finish, extraDraws).tStar;
}

/** Total expected damage the same schedule reaches by `MAX_TURN` — the number
 * that explains a null `closingTurn`. Diagnostics only. */
export function combatCeiling(
  format: ScoreFormat, N: number, sources: readonly Source[], manaCurve: ManaCurve, extraDraws = 0,
): number {
  return scheduleDamage(format, N, sources, manaCurve, { perOpponent: Infinity, opponents: 1 }, extraDraws).ceiling;
}

/** Attack steps available by `t*` — combat starts on turn 2. */
function combatsBy(tStar: number): number {
  return Math.max(1, tStar - 1);
}

/**
 * §1 W's utility is a MAXIMUM over the feasible turns —
 * `u_l = max_{t >= t*} [Phi_l(t)] * clip(J_l(n(t))/pWin) * d_p(t)` — and NOT
 * its value at `t*` alone. Stage 3h's residual was exactly that short-circuit:
 * `r = ceil(target/(combatsBy(t)*theta))` FALLS as `t` grows and
 * `drawSampleSizes(t)` deepens, so a deck whose clock slipped one turn under
 * dilution bought a cheaper, better-accessed line and W ROSE on an added
 * unknown slot (`commander:381372568` +7.68). Evaluated here, the value of
 * every turn is a function of `t` alone; raising `t*` only SHRINKS the
 * feasible set `{t : t* <= t <= H}`, so the maximum cannot rise (§10.10
 * item 3's nesting argument).
 *
 * `Phi` needs no separate test: the damage schedule is cumulative, so its
 * predicate holds at every `t >= t*`.
 *
 * Access is memoised on `(t, the pools' (K, r) shape)` — the only inputs
 * `poolsAccess` reads — because the theta scan re-asks for the same shapes on
 * every turn.
 */
function maximiseOverTurns(
  format: ScoreFormat, N: number, tStar: number, sources: readonly Source[], target: number,
  poolSizeCap: number, poolsFor: (names: ReadonlySet<string>, r: number) => RecipePool[],
): { turn: number; line: { r: number; names: Set<string>; access: number }; u: number } | null {
  const norms = normsFor(format);
  const memo = new Map<string, number>();
  const accessOf = (t: number, pools: readonly RecipePool[]): number => {
    const key = `${t}|${pools.map((p) => `${poolK(p)}:${poolR(p)}`).join(',')}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const value = poolsAccess(format, N, t, pools);
    memo.set(key, value);
    return value;
  };
  let best: { turn: number; line: { r: number; names: Set<string>; access: number }; u: number } | null = null;
  for (let t = tStar; t <= horizonFor(format); t++) {
    const line = bestLine(format, N, t, sources, target, combatsBy(t), poolSizeCap,
      (names, r) => accessOf(t, poolsFor(names, r)));
    if (line === null) continue;
    const u = clip(line.access / norms.winAccessTarget)
      * Math.pow(2, -Math.max(0, t - norms.fastClosingTurn) / norms.delayHalfLifeTurns);
    // Ties keep the EARLIER turn: the decay is non-increasing, so a later turn
    // ties only by accident of access and the earlier close is the honest one.
    if (best === null || u > best.u + 1e-12) best = { turn: t, line, u };
  }
  return best;
}

/**
 * §1 W "bounded cost/output bins": pick the `r` CHEAPEST supported threats and
 * size `r` from THOSE members' mean output, so cost and output describe the
 * same cards.
 *
 * The cap DECOUPLES the schedule from the access term: a 60-creature random
 * pile and a 25-creature precon both ask `J_l` for six copies, so access starts
 * rewarding raw pool size. Measured both ways, neither setting is clean --
 *
 *   cap  6 (the brief's constant): Meren 41, piles 8/50 >= 25, pile max 37
 *   cap 19 (r follows the schedule): Meren 24, piles 2/50 >= 25, pile max 30
 *
 * It now lives in `FormatNorms.poolSizeCap` so the calibration grid can sweep
 * it per format (docs/DECK_SCORE_SPEC.md section 7).
 *
 * -- because at 19 the pile max (30) clears Meren (24) and the inversion gets
 * worse, while at 6 it clears only the two weakest anchors. 6 ships; the
 * constant is here so the calibration pass can move it in one line.
 */
export function bestLine(
  format: ScoreFormat, N: number, tStar: number,
  members: readonly Source[], target: number, combats: number, poolSizeCap: number,
  rank?: (names: ReadonlySet<string>, r: number) => number,
): { r: number; names: Set<string>; access: number } | null {
  // Zero-output members are not threats and must not SIZE the line either: one
  // 0/0 Walking Ballista sorted first made `mean` 0 and returned null, deleting
  // every combat recipe the deck had (`the-cabbage-merchant`, W = 0 with a
  // 205-damage schedule behind it).
  const positive = members.filter((m) => m.output > 0);
  if (positive.length === 0) return null;
  // v1.4 stage 3c (§10.4, stage 3b OPEN): a MAXIMUM OVER SUBSETS of the
  // identified sources. The old sizing took the MEAN output of the `r`
  // CHEAPEST copies, so deleting a weak member promoted a better one, the mean
  // rose, `r` fell and joint access ROSE (`381364921` +1.44 W). Here each
  // distinct output level θ defines its own line: the subset of copies that
  // each deal at least θ, needing `r(θ)=ceil(target/(combats·θ))` of them —
  // `r` depends on θ alone, never on which copies survive. Deleting a copy can
  // only remove units from each θ-subset (and can only delete a whole θ), so
  // every candidate's access falls or stays and so does the maximum. `r` is
  // still clamped at `poolSizeCap`: beyond that many copies the pool stops
  // being an access proxy, and failing instead killed every Commander pressure
  // line (120 damage over 11 combats wants 8+ small bodies).
  const thresholds = [...new Set(positive.map((m) => m.output))].sort((a, b) => b - a);
  const ns = drawSampleSizes(format, tStar);
  let best: { r: number; names: Set<string>; access: number } | null = null;
  for (const theta of thresholds) {
    const subset = positive.filter((m) => m.output >= theta);
    const r = Math.min(poolSizeCap, Math.max(1, Math.ceil(target / (combats * theta))));
    // v1.4 stage 3h: SELECTION = VALUATION. Stage 3g ranked on the VERIFIED
    // subset only, which is still not what the evaluator reads: the recipe
    // values the chosen line with `readAccessAt` over its COMPLETE pool list
    // including `extraPools` (the token converter, the drain outlet/fodder, the
    // control engine). Ranking a single pool by `H` therefore ordered theta
    // candidates differently from the number reported, and a hair of N flipped
    // the argmax (`378293112`: Token/Food 41xr10 -> 5xr2 on one added slot,
    // stage 3g phase 1 class b). Each caller now supplies `rank`, building that
    // candidate's full pool set and evaluating it, so the maximised quantity is
    // the one that is reported.
    const names = new Set(subset.map((m) => m.name));
    let access: number;
    if (rank) access = rank(names, r);
    else {
      const guaranteed = subset.reduce((sum, m) => sum + (m.guaranteed ? m.quantity : 0), 0);
      const K = subset.reduce((sum, m) => sum + (m.guaranteed ? 0 : m.quantity), 0);
      const rEff = Math.max(0, r - guaranteed);
      access = ns.reduce((sum, n) => sum + H(N, K, n, rEff), 0) / ns.length;
    }
    // Ties break on the SMALLER line, then on the higher output floor, so the
    // choice is a deterministic function of the identified set.
    if (!best || access > best.access + 1e-12 || (access > best.access - 1e-12 && r < best.r)) {
      best = { r, names, access };
    }
  }
  return best;
}

// ── Recipe families ───────────────────────────────────────────────────────

/** Becomes a creature under the controller's own control - a manland or a
 * crewed Vehicle is a finisher that dodges sorcery-speed removal. */
const RE_MANLAND = /becomes? an? [^.]*creature|crew \d/i;
const RE_REPEATABLE_DAMAGE = /deals? (\d+) damage to (?:each opponent|any target|target player|target opponent)/i;
/** A trigger the controller cannot fire alone (§1's 0.5 opponent prior). */
/** A token whose power is a running count of the controller's own board. */
/** The token's printed power, when the card prints one. */
const RE_PRINTED_TOKEN = /creates? [^.]*?(\d+)\/\d+[^.]*?token/i;
const RE_SCALING_TOKEN = /(?:gets? \+1\/\+1 for each|\+1\/\+1 counters? on it for each|X\/X[^.]*where X is the number of) [^.]*?(artifact|creature|permanent)/i;
const RE_OPPONENT_TRIGGER = /whenever [^.]*(?:an opponent|opponents|a creature an opponent controls)|opponent (?:attacks|casts|draws)/i;
const RE_CONVERTER = /sacrifice[^.]*(?:food|artifact|treasure|token|creature)[^.]*(?:deals? \d+ damage|\+\d+\/\+\d+|becomes? an?\b)/i;

/**
 * Anything that can attack. §1: "Every integer K used in a probability counts
 * only physical copies with fully verified support (s_i=1); partially
 * supported effects retain their fractional e_i credit elsewhere" — so an
 * uncertain creature still contributes `s * power` to the SCHEDULE (not a
 * probability) while `poolMembers` keeps it out of `J_l`'s K.
 */
function isBody(f: CardFeature): boolean {
  return f.power != null && f.s > 0 && /\bCreature\b/.test(f.card.type_line || '');
}

/**
 * §9.4's four typed non-creature damage families, over ALL library entries
 * ("Manlands come from ALL library entries, including lands") plus the command
 * zone. Each carries its own activation cost, mana forgone and turn budget, so
 * the schedule can debit them; a card with no typed output is simply absent.
 */
interface TypedFinishers {
  sources: Source[]; verified: Member[]; traces: string[]; extraDraws: number;
  /** Names whose output is a cast trigger — the spellslinger line's own pool. */
  castNames: Set<string>;
  /** Cast triggers whose accumulating output IS creature tokens. The token
   * family credits those names through this schedule, not a second flat time. */
  castTokenNames: Set<string>;
}

function typedFinisherSources(
  mainEntries: DeckEntry[], commanders: CardFeature[], opponents: number, sched: SpellSchedule,
): TypedFinishers {
  const draws = drawEventsPerTurn(mainEntries);
  const sources: Source[] = [];
  const verified: Member[] = [];
  const traces: string[] = [];
  const castNames = new Set<string>();
  const castTokenNames = new Set<string>();
  const add = (f: CardFeature, quantity: number, guaranteed: boolean): void => {
    // A printed cast trigger is read first: it is the only typed output whose
    // size depends on the deck around it rather than on the card alone.
    const o = castTriggerFinisher(f, opponents, sched) ?? finisherOutputOf(f, opponents, draws);
    if (!o || o.perTurn <= 0) return;
    if (o.kind === 'cast_trigger') {
      castNames.add(f.card.name);
      if (o.makesTokens) castTokenNames.add(f.card.name);
    }
    sources.push({
      name: f.card.name, cmc: f.isLand ? 0 : f.c, quantity, guaranteed, output: o.perTurn,
      upkeepMana: o.upkeepMana, manaForgone: o.manaForgone, turns: o.turns,
      deployDelay: o.deployDelay, kind: o.kind, trace: o.trace,
      outputAt: o.outputAt, shareKey: o.shareKey, upkeepAt: o.upkeepAt,
      castsAt: o.castsAt, stackedAt: o.stackedAt,
      // Only an animated land actually attacks; a walker, a pinger and a draw
      // trigger put no body on the board for a pump to raise.
      bodies: o.kind === 'manland' ? 1 : 0,
    });
    // §1 W: only FULLY supported copies may size an access pool.
    if (f.s >= 1) verified.push({ name: f.card.name, cmc: f.isLand ? 0 : f.c, quantity, guaranteed });
    traces.push(o.trace);
  };
  for (const e of mainEntries) add(e.feature, e.quantity, false);
  for (const f of commanders) add(f, 1, true);
  return { sources, verified, traces, extraDraws: draws - 1, castNames, castTokenNames };
}

function pickMembers(
  nonLand: DeckEntry[], commanders: CardFeature[], pred: (f: CardFeature) => boolean,
): Member[] {
  return [
    ...commanderMembers(commanders, pred),
    ...nonLand.filter((e) => pred(e.feature)).map((e) => toMember(e.feature, e.quantity)),
  ];
}

// ── Typed creature combos (§10.6.1) ───────────────────────────────────────

interface Candidate { feature: CardFeature; quantity: number; guaranteed?: boolean }

/** Total mana the whole recipe asks for — the sort key and the readiness cost. */
function recipeCost(recipe: Recipe): number {
  return recipe.pools.reduce((sum, p) => sum + poolCost(p), 0) + recipe.extraCost;
}

/**
 * §10.6.1's tutor predicate: a tutor earns ACCESS to a slot, priced at what it
 * actually costs to land that exact piece (its own cost plus the piece's, or
 * nothing extra when the destination is the battlefield). One tutor reaches at
 * most one slot — `buildDisjointAccessPolynomial` requires disjoint pools — so
 * a tutor that could name either piece is assigned to whichever slot has the
 * fewest members, which is the slot a real pilot would point it at.
 *
 * // ponytail: round-robin instead of a wildcard term. A tutor that finds
 * // EITHER piece is worth more than half a copy of each, and the disjoint
 * // polynomial has no way to say so. Upgrade path is a joint access term,
 * // not a different assignment order.
 */
function assignTutors(
  slots: readonly ComboSlot[], byName: Map<string, Candidate>, taken: Set<string>,
): Member[][] {
  const perSlot: Member[][] = slots.map(() => []);
  const present = COMBO_TUTORS
    .map((t) => ({ tutor: t, entry: byName.get(t.name.toLowerCase()) }))
    .filter((x): x is { tutor: typeof COMBO_TUTORS[number]; entry: Candidate } => !!x.entry)
    .filter((x) => !taken.has(x.tutor.name.toLowerCase()));
  for (const { tutor, entry } of present) {
    const reachable = slots
      .map((slot, i) => ({ slot, i }))
      .filter(({ slot }) => tutorReachesSlot(tutor, slot));
    if (reachable.length === 0) continue;
    const target = reachable.reduce((best, cur) =>
      (perSlot[cur.i].length < perSlot[best.i].length ? cur : best));
    const piece = byName.get(slots[target.i].any.find((n) => byName.has(n.toLowerCase())) ?? '');
    const mv = piece?.feature.c ?? 0;
    perSlot[target.i].push({
      name: tutor.name, cmc: tutor.cost(mv), quantity: entry.quantity, guaranteed: entry.guaranteed,
    });
    taken.add(tutor.name.toLowerCase());
  }
  return perSlot;
}

/** Mana from a nonland permanent — what `nonland_mana` counts. */
function isNonlandManaSource(f: CardFeature): boolean {
  if (f.isLand) return false;
  const produced = f.card.produced_mana;
  return !!produced && produced !== '[]' && produced !== 'null';
}

/** Is this exact combo assembled, ignoring outlets and routes? */
function piecesPresent(combo: TypedCombo, byName: Map<string, Candidate>): Candidate[] | null {
  const hits: Candidate[] = [];
  for (const slot of combo.slots) {
    const name = slot.any.find((n) => byName.has(n.toLowerCase()));
    if (!name) return null;
    hits.push(byName.get(name.toLowerCase()) as Candidate);
  }
  return hits;
}

/** The zone/board requirement a combo carries beyond its own slots. */
function routeSatisfied(combo: TypedCombo, byName: Map<string, Candidate>, opponents: number): string | null {
  if (!combo.route) return null;
  if (combo.route.kind === 'opponent_permanents') {
    return opponents >= 2 ? `${opponents} opponents' boards satisfy it` : null;
  }
  // §10.6 fetched package: a Protean Hulk death trigger only wins if the deck
  // actually holds a COMPLETE other typed line whose pieces are all creatures
  // inside the fetch's mana budget. Naming the Hulk alone would be fiction.
  if (combo.route.kind === 'fetched_package') {
    const budget = combo.route.budget ?? 6;
    for (const other of TYPED_COMBOS) {
      if (other.id === combo.id || other.route) continue;
      const hits = piecesPresent(other, byName);
      if (!hits) continue;
      if (!hits.every((h) => /\bCreature\b/.test(h.feature.card.type_line || ''))) continue;
      const mv = hits.reduce((sum, h) => sum + h.feature.c, 0);
      if (mv <= budget) return `fetches ${other.label} (total mana value ${mv} <= ${budget})`;
    }
    return null;
  }
  // §10.6 reanimation: the pair is a line only when there is something in the
  // library worth the detour.
  if (combo.route.kind === 'reanimation_target') {
    const budget = combo.route.budget ?? 7;
    const targets = [...byName.values()].filter((e) =>
      /\bCreature\b/.test(e.feature.card.type_line || '') && e.feature.c >= budget && !e.guaranteed);
    if (targets.length === 0) return null;
    const best = targets.reduce((a, b) => (b.feature.c > a.feature.c ? b : a));
    return `${targets.length} targets at mana value ${budget}+ (largest ${best.feature.card.name} at ${best.feature.c})`;
  }
  if (combo.route.kind === 'nonland_mana') {
    const sources = [...byName.values()]
      .filter((e) => isNonlandManaSource(e.feature))
      .reduce((sum, e) => sum + e.quantity, 0);
    return sources >= 3 ? `${sources} nonland mana sources` : null;
  }
  const routes = [...GRAVEYARD_ROUTES, ...COMBO_TUTORS.filter((t) => t.destination === 'graveyard').map((t) => t.name)];
  const hit = routes.filter((n) => byName.has(n.toLowerCase()));
  return hit.length > 0 ? `${hit.length} routes (${hit.slice(0, 3).join(', ')})` : null;
}

function buildTypedCombo(
  combo: TypedCombo, byName: Map<string, Candidate>, opponents: number, audit?: Audit,
): Recipe | null {
  const pieces = combo.slots.map((slot) => {
    const name = slot.any.find((n) => byName.has(n.toLowerCase()));
    return name ? { slot, entry: byName.get(name.toLowerCase()) as Candidate } : null;
  });
  if (pieces.some((p) => p === null)) {
    // A list holding NONE of a combo's pieces is not a failure of that combo —
    // only a partially assembled line is evidence of a missing prerequisite.
    const held = pieces.filter((p) => p !== null).length;
    if (held > 0) {
      note(audit, `combo:${combo.id}`, 'combo.pieces_missing',
        `${held}/${combo.slots.length} slots filled; missing ${combo.slots
          .filter((_, i) => pieces[i] === null).map((s) => s.any[0]).join(', ')}`);
    }
    return null;
  }
  const filled = pieces as Array<{ slot: ComboSlot; entry: Candidate }>;

  const route = routeSatisfied(combo, byName, opponents);
  if (combo.route && route === null) {
    return note(audit, `combo:${combo.id}`, 'combo.route_unsatisfied', combo.route.why);
  }

  // The outlet is claimed FIRST: a card that both finds a piece and finishes
  // the game can only be spent once, and a line without a finish is not a line.
  const taken = new Set(filled.map((p) => p.entry.feature.card.name.toLowerCase()));
  const extraPools: RecipePool[] = [];
  let outletPool: RecipePool | null = null;
  let outletCost = 0;
  let finish: string;
  if (needsOutlet(combo.resource)) {
    // §10.6: an unbounded stream of ENTER triggers needs an ETB payoff, not a
    // mana sink; unbounded mana needs a printed damage/drain/mill outlet.
    const table = combo.resource === 'creature_etb' ? etbOutlet : manaOutlet;
    const outlets = [...byName.values()]
      .map((entry) => ({ entry, outlet: table(entry.feature.card.name) }))
      .filter((x) => x.outlet && (combo.resource !== 'creature_mana' || x.outlet.creatureCastable));
    // A command-zone draw sink behind the loop draws the whole library, so the
    // outlet costs its mana but needs no access term; otherwise it is a pool
    // like any other piece.
    const sink = [...byName.values()]
      .filter((e) => e.guaranteed)
      .map((e) => unboundedDrawSink(e.feature.card.name))
      .find((d) => !!d);
    // §10.6 "infinite mana -> alternate-win outlet": the loop empties the
    // library through ANY unbounded draw sink, and the alternate-win card then
    // wins outright. A library sink is not guaranteed, so it earns its own
    // pool (§10.6 "library-sink pool separate from the command-zone sink").
    const librarySinks = [...byName.values()]
      .filter((e) => !e.guaranteed && libraryDrawSink(e.feature.card.name));
    const libraryWins = combo.resource !== 'creature_etb'
      ? [...byName.values()]
        .map((entry) => ({ entry, outlet: libraryWinCard(entry.feature.card.name) }))
        .filter((x) => !!x.outlet && (combo.resource !== 'creature_mana' || x.outlet.creatureCastable))
      : [];
    const hasSink = !!sink || librarySinks.length > 0;
    const altWinRoute = hasSink && libraryWins.length > 0 ? libraryWins : [];
    if (outlets.length === 0 && altWinRoute.length === 0) {
      return note(audit, `combo:${combo.id}`, 'combo.outlet_missing',
        `unbounded ${combo.resource} with no catalogued outlet`);
    }
    const chosen = outlets.length > 0 ? outlets : altWinRoute;
    for (const o of chosen) taken.add(o.entry.feature.card.name.toLowerCase());
    const cheapest = Math.min(...chosen.map((o) => o.entry.feature.c));
    if (sink && outlets.length > 0) outletCost = cheapest;
    else {
      outletPool = {
        members: chosen.map((o) => toMember(o.entry.feature, o.entry.quantity, o.entry.guaranteed)),
        r: 1,
      };
    }
    if (outlets.length === 0 && !sink) {
      // The alternate-win route needs the sink AS WELL as the win card, so the
      // sink is a distinct required piece with its own access term.
      for (const e of librarySinks) taken.add(e.feature.card.name.toLowerCase());
      extraPools.push({
        members: librarySinks.map((e) => toMember(e.feature, e.quantity, e.guaranteed)),
        r: 1,
      });
    }
    finish = chosen.map((o) => `${o.entry.feature.card.name} — ${o.outlet?.mechanism}`).join('; ')
      + (sink ? ` (found, not drawn: ${sink.name} — ${sink.mechanism} — empties the library once the loop is online)` : '')
      + (outlets.length === 0 && !sink
        ? ` (library emptied by ${librarySinks.map((e) => e.feature.card.name).join(', ')})` : '');
  } else if (combo.resource === 'tokens') {
    finish = combo.hasteIncluded
      ? 'the copies arrive with haste and attack the turn the loop starts'
      : 'unbounded bodies, lethal one turn cycle after the loop starts';
  } else {
    finish = `unbounded ${combo.resource}: the loop is the finish predicate`;
  }

  const tutorsBySlot = assignTutors(filled.map((p) => p.slot), byName, taken);
  const pools: RecipePool[] = filled.map((p, i) => ({
    members: [toMember(p.entry.feature, p.entry.quantity, p.entry.guaranteed), ...tutorsBySlot[i]],
    r: 1,
  }));
  if (outletPool) pools.push(outletPool);
  pools.push(...extraPools);

  const tutorNames = tutorsBySlot.flat().map((m) => m.name);
  const tutorTrace = tutorNames.length === 0
    ? 'no catalogued tutor reaches these pieces; access is the printed copies only'
    : tutorNames.map((n) => {
      const t = comboTutor(n);
      return `${n} → ${t?.destination} (${t?.note})`;
    }).join('; ');

  return {
    id: `combo:${combo.id}`,
    label: combo.label,
    pools,
    // Tokens without haste need the turn cycle the finish trace names; one
    // more mana of readiness is the schedule's way of spending a turn.
    extraCost: combo.extraCost + outletCost
      + (combo.resource === 'tokens' && !combo.hasteIncluded ? 1 : 0),
    criticalNames: new Set([
      ...filled.map((p) => p.entry.feature.card.name),
      ...(outletPool?.members.map((m) => m.name) ?? []),
    ]),
    trace: {
      resource: `${filled.map((p) => `${p.entry.feature.card.name} (${p.slot.role})`).join(' + ')}`
        + ` → unbounded ${combo.resource}. ${combo.prerequisite}`
        + (combo.route ? ` Zone requirement: ${combo.route.why} — ${route}.` : ''),
      tutor: tutorTrace,
      finish,
    },
  };
}

/**
 * §10.6.1: the tutor-assembled creature combos, each with exact pieces, an
 * audited prerequisite and a real outlet. Capped at 3 — the budget the
 * untyped `COMBO_PAIRS` scan it replaces used — so the total `computeWin`
 * slices at 8 is unchanged, and the sort puts the cheapest line first.
 */
function typedComboRecipes(all: readonly Candidate[], opponents: number, audit?: Audit): Recipe[] {
  const byName = new Map<string, Candidate>();
  for (const e of all) byName.set(e.feature.card.name.toLowerCase(), e);
  const out: Recipe[] = [];
  for (const combo of TYPED_COMBOS) {
    const built = buildTypedCombo(combo, byName, opponents, audit);
    if (built) out.push(built);
  }
  return out.sort((x, y) => recipeCost(x) - recipeCost(y)).slice(0, 3);
}

/**
 * (1) Creature pressure, and (4) token/Food conversion folded into the same
 * schedule: a converter turns each producer into an attacking body, so §1 W's
 * "Food is not a creature without a conversion effect" is satisfied by the
 * converter's presence, not assumed.
 */
/**
 * 10.10 R1 / stage 3v: ONE PHYSICAL CARD IS ONE ROW. A card that both attacks
 * and carries a typed trigger entered a family twice - once from `bodies`,
 * once from `typedFinisherSources` - so the ledger paid its mana twice, the
 * per-card keys (`act:<name>`, `dep:<name>`) collided, and `bestLine` sized a
 * line from two rows of a singleton (`deck-score-v12.test.ts:594`: r = 2 for a
 * commander, `poolR` 1, no library copy, access 0, W 0).
 *
 * The merged row keeps the split 10.10 needs: the body's power is output the
 * permanent makes on its OWN (`stackedAt`), the trigger's is cast-driven and
 * only credited through a bought cast. Merging BEFORE `bestLine` is also what
 * keeps theta monotone under blanking: one blanked card removes exactly one
 * row from every theta subset.
 */
function mergeSources(sources: readonly Source[], opponents: number): Source[] {
  const by = new Map<string, Source[]>();
  for (const s of sources) {
    const g = by.get(s.name);
    if (g) g.push(s); else by.set(s.name, [s]);
  }
  const out: Source[] = [];
  for (const group of by.values()) {
    if (group.length === 1) { out.push(group[0]); continue; }
    const full = (s: Source, u: number): number => (s.outputAt ? s.outputAt(u) : s.output);
    const own = (s: Source, u: number): number =>
      (s.stackedAt ? s.stackedAt(u) : (s.shareKey ? 0 : full(s, u)));
    const each = (s: Source, u: number): number =>
      (s.eachOpponentAt ? s.eachOpponentAt(u) : (s.eachOpponent ? full(s, u) / opponents : 0));
    const sum = (f: (s: Source, u: number) => number) =>
      (u: number): number => group.reduce((acc, s) => acc + f(s, u), 0);
    // The cast package (share key, per-cast price, cast cap) belongs to the
    // trigger half; there is at most one per card.
    const host = group.find((s) => s.shareKey) ?? group[0];
    out.push({
      name: host.name,
      cmc: Math.max(...group.map((s) => s.cmc)),
      quantity: Math.max(...group.map((s) => s.quantity)),
      guaranteed: group.some((s) => s.guaranteed),
      output: group.reduce((acc, s) => acc + s.output, 0),
      upkeepMana: group.reduce((acc, s) => acc + (s.upkeepMana ?? 0), 0),
      manaForgone: group.reduce((acc, s) => acc + (s.manaForgone ?? 0), 0),
      turns: Math.max(...group.map((s) => s.turns ?? Infinity)),
      deployDelay: Math.min(...group.map((s) => s.deployDelay ?? 0)),
      kind: group.find((s) => s.kind)?.kind,
      trace: group.map((s) => s.trace).filter((x) => !!x).join(' + ') || undefined,
      bodies: group.reduce((acc, s) => acc + (s.bodies ?? 0), 0),
      outputAt: sum(full),
      stackedAt: sum(own),
      eachOpponentAt: sum(each),
      shareKey: host.shareKey,
      upkeepAt: host.upkeepAt,
      castsAt: host.castsAt,
      tolled: group.some((s) => s.tolled),
    });
  }
  return out;
}

function scheduleRecipe(
  id: string, label: (r: number, t: number) => string, format: ScoreFormat, N: number,
  sources: Source[], verified: Member[],
  /** §10.4 / stage 3h "selection = valuation": the prerequisite pools this
   * recipe owes are a function of the line actually chosen, never a fixed toll.
   * A converter pool charged against a line that holds no Food producer made
   * DELETING the deck's last converter raise joint access 5.3x (`commander
   * 380158752`, `Fallen Ideal`: [r=1 q=1] vanished with it, access .0429 ->
   * .2287, W 11 -> 38.3, +21.84 T_abs on a strictly worse deck). */
  extraPools: (names: ReadonlySet<string>) => RecipePool[], manaCurve: ManaCurve,
  finish: FinishTarget, poolSizeCap: number, extraDraws: number, audit?: Audit,
): Recipe | null {
  const target = finish.perOpponent * finish.opponents;
  if (sources.length === 0) return note(audit, id, `${id}.no_output_source`, 'no card in the family produces output');
  sources = mergeSources(sources, Math.max(1, Math.round(finish.opponents)));
  if (verified.length === 0) return note(audit, id, `${id}.unverified`, 'every output source is only partially supported (s < 1)');
  const schedule = scheduleDamage(format, N, sources, manaCurve, finish, extraDraws);
  const tStar = schedule.tStar;
  if (tStar === null) {
    return note(audit, id, `${id}.schedule_short`,
      `${schedule.ceiling.toFixed(1)} of ${target} expected damage by T${horizonFor(format)}`
      + `, shortfall ${schedule.shortfall[horizonFor(format)].toFixed(1)} on the most-alive opponent`);
  }
  // v1.4 stage 3w (10.4): a TOLLED row (a Food/Treasure producer) is only
  // usable by a line that ALSO pays its converter pool, and `extraPools`
  // attaches that toll when the chosen names hold one. Charging it per THETA
  // SUBSET made the candidate set GROW on deletion: at `commander:381391389`
  // blanking the only Treasure producer above theta 3 deleted the toll and
  // raised the SAME theta-3 line's access .007604 -> .019493 (u .022 -> .049,
  // W 2.0 -> 4.3, total +1.84 - the total is the 20+.8*W cap). The toll-free
  // line always exists (a pure creature-token line needs no converter), so it
  // is evaluated as its OWN variant - with its OWN schedule, because a line
  // that declines the Food may not close on the turn the Food bought. Each
  // variant's row set is a fixed function of the deck, so deleting a row only
  // ever weakens a variant; the maximum over the two cannot rise.
  // The closure builds EXACTLY the pool list this function returns below, so
  // `bestLine` maximises the access the recipe is then valued at.
  // No fallback to the WHOLE `verified` list: a theta-subset that holds no
  // verified member has no verified access, and substituting every verified
  // card let an unverified 1-member line read access 1.000000 against .181818
  // for the SAME line with a second member (v1.4 stage 3n). An empty pool with
  // `r > 0` is now read as unsatisfiable (access 0) by the access polynomial,
  // which is what "no supported copy is in this line" means.
  const poolsFor = (names: ReadonlySet<string>, r: number): RecipePool[] =>
    [{ members: verified.filter((m) => names.has(m.name)), r }, ...extraPools(names)];
  const lean = sources.filter((s) => !s.tolled);
  const leanRun = lean.length > 0 && lean.length < sources.length
    ? (() => {
      const leanSchedule = scheduleDamage(format, N, lean, manaCurve, finish, extraDraws);
      if (leanSchedule.tStar === null) return null;
      const leanBest = maximiseOverTurns(format, N, leanSchedule.tStar, lean, target, poolSizeCap, poolsFor);
      return leanBest && { rows: lean, schedule: leanSchedule, tStar: leanSchedule.tStar, best: leanBest };
    })()
    : null;
  const fullBest = maximiseOverTurns(format, N, tStar, sources, target, poolSizeCap, poolsFor);
  const full = fullBest && { rows: sources, schedule, tStar, best: fullBest };
  const run = leanRun && (!full || leanRun.best.u > full.best.u + 1e-12) ? leanRun : full;
  if (run === null) return note(audit, id, `${id}.no_positive_output`, 'every scheduled source has zero output');
  const best = run.best;
  const line = best.line;
  const r = line.r;
  // Section 10.8, unmasked at H20: `requiredCopies` sizes `r` from the
  // POSITIVE-output sources only, so the access pool behind it must hold the
  // same cards. Counting zero-output bodies in `K` let twelve free 0/0
  // creatures raise `J_l` from 0 to .01 - "adding free 0-power bodies never
  // raises Win" inverted - because they widened the pool without ever being
  // asked to deal damage. At T12 both sides were W = 0 and the mismatch was
  // invisible.
  const pools: RecipePool[] = poolsFor(line.names, r);
  return {
    id, label: label(r, best.turn), pools, extraCost: 0, tStar: run.tStar,
    valueTurn: best.turn, schedule: run.schedule,
    selected: { u: best.u, access: best.line.access, turn: best.turn },
    criticalNames: new Set([...run.rows.map((s) => s.name),
      ...extraPools(line.names).flatMap((p) => p.members.map((m) => m.name))]),
  };
}

export interface PressureOutput {
  recipes: Recipe[];
  bodies: Source[];
  converted: Source[];
  /** Creature-token producers, priced by their printed token size. The control
   * family's finisher pool reads these as attacking bodies (§9.4). */
  tokenSources: Source[];
  /** Verified access members behind `tokenSources`. */
  tokenVerified: Member[];
}

function pressureRecipes(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  manaCurve: ManaCurve, finish: FinishTarget, poolSizeCap: number, typed: TypedFinishers, audit?: Audit,
): PressureOutput {
  const bodies: Source[] = [
    ...commanders.filter(isBody).map((f) => sourceOf(f, 1, (f.power || 0) * f.s, true)),
    ...nonLand.filter((e) => isBody(e.feature)).map((e) => sourceOf(e.feature, e.quantity, (e.feature.power || 0) * e.feature.s)),
  ];
  const out: Recipe[] = [];
  const verifiedBodies = [
    ...commanderMembers(commanders, (f) => isBody(f) && f.s >= 1),
    ...nonLand.filter((e) => isBody(e.feature) && e.feature.s >= 1).map((e) => toMember(e.feature, e.quantity)),
  ];
  // §9.4: a deck's damage is not only its creatures' power. Walkers, animated
  // lands, repeatable burn and draw triggers are typed output on the SAME
  // schedule, each with its own activation cost and turn budget. Measured: 224
  // of the 298 W-zero Commander lists reach 50-90 % of the 120-damage predicate
  // on creatures alone, so this output is what the zero was made of.
  const pressureSources = [...bodies, ...typed.sources];
  // A cast trigger is the first typed output that can ALSO be a creature body
  // (Vivi Ornitier, Guttersnipe), so the two verified lists overlap and the
  // pool would count the card twice.
  const pressureVerified = dedupeMembers([...verifiedBodies, ...typed.verified]);
  const pressure = scheduleRecipe('combat_wide', (r) => `Creature pressure (${r} threats)`,
    format, N, pressureSources, pressureVerified, () => [], manaCurve, finish, poolSizeCap, typed.extraDraws, audit);
  if (pressure) out.push(pressure);

  // (4) Conversion is its OWN variant, never a replacement: a deck with both a
  // creature clock and a token engine must be scored on whichever closes
  // faster, and the converter pool it adds only costs the conversion line
  // access. Producers become damage only when something converts them (S1 W:
  // "Food is not a creature without a conversion effect").
  // A CREATURE token attacks on its own; only Food/Treasure/Clue needs a
  // conversion effect (§1 W's rule is about Food, not about tokens). Splitting
  // them is what makes the family fire: `standard-1445867-aljce` closes with
  // Simulacrum Synthesizer Constructs and has no anthem to "convert" them, and
  // `the-cabbage-merchant` makes its Food on the COMMANDER, which the old
  // nonland-only producer list could not see at all.
  const isFoodLike = (f: CardFeature) => f.isFoodProducer || f.isTreasureProducer;
  const isConverter = (f: CardFeature) =>
    f.isAnthemOrOverrun || f.isFoodPayoff || RE_CONVERTER.test(f.card.oracle_text || '');
  const converters = pickMembers(nonLand, commanders, isConverter);
  // A producer whose trigger needs an OPPONENT to act is half a producer: the
  // §1 opponent-trigger prior, applied to output rather than to access.
  // A token whose size is a COUNT ("0/0 with a +1/+1 counter for each artifact
  // you control", "X/X where X is...") is worth what the deck actually holds,
  // not the flat 2: `standard-1445867-aljce` closes with Simulacrum
  // Synthesizer Constructs in a 30-artifact shell and read them as 2/2s.
  const boardCount = (pred: (f: CardFeature) => boolean): number => nonLand
    .filter((e) => pred(e.feature))
    .reduce((sum, e) => sum + e.quantity * Hf(format, N, 1, 6, 1), 0);
  const scale = {
    artifact: boardCount((f) => /\bArtifact\b/.test(f.card.type_line || '')),
    creature: boardCount((f) => /\bCreature\b/.test(f.card.type_line || '')),
  };
  const tokenSize = (f: CardFeature): number => {
    const text = f.card.oracle_text || '';
    const m = RE_SCALING_TOKEN.exec(text);
    if (m) {
      const counted = /artifact/i.test(m[0]) ? scale.artifact : scale.creature;
      return Math.max(2, Math.min(6, counted));
    }
    // The PRINTED size, when the card says it: a 1/1 Elf is one power, not the
    // flat 2 v1 assumed. Sixteen 1/1 makers closed a Standard aristocrats shell
    // at 32 power/turn and out-ranked its own drain line.
    // ponytail: first match only, and "create two 1/1" counts as one body.
    // Upgrade path is a curated per-card token table, as above.
    const printed = RE_PRINTED_TOKEN.exec(text);
    return printed ? Math.max(1, Number(printed[1])) : 2;
  };
  const producerOutput = (f: CardFeature): number =>
    tokenSize(f) * f.s * (RE_OPPONENT_TRIGGER.test(f.card.oracle_text || '') ? 0.5 : 1);
  const producerEntries = (pred: (f: CardFeature) => boolean): DeckEntry[] => [
    ...commanders.filter(pred).map((f) => ({ feature: f, quantity: 1 })),
    ...nonLand.filter((e) => pred(e.feature)),
  ];
  // Creature-token makers ride the plain pressure schedule; Food-likes only
  // join once something converts them.
  // A `create a 1/1 ... token` printed on a CAST TRIGGER is already scheduled
  // per cast, accumulating, by `typed.sources`; crediting it a second time as a
  // flat per-turn producer would count the same tokens twice.
  const isCastTokenMaker = (f: CardFeature) => typed.castTokenNames.has(f.card.name);
  const tokenMakers = producerEntries((f) => f.isCreatureTokenProducer && !isCastTokenMaker(f));
  const foodMakers = converters.length > 0
    ? producerEntries((f) => isFoodLike(f) && !f.isCreatureTokenProducer && !isCastTokenMaker(f))
    : [];
  if (converters.length === 0) {
    const stranded = producerEntries((f) => isFoodLike(f) && !f.isCreatureTokenProducer)
      .reduce((s, e) => s + e.quantity, 0);
    if (stranded > 0) {
      note(audit, 'tokens', 'tokens.no_converter',
        `${stranded} Food/Treasure producers and no anthem, Food payoff or sacrifice converter`);
    }
  }
  const isCommanderEntry = (e: DeckEntry) => commanders.includes(e.feature);
  const tokenSources: Source[] = tokenMakers.map((e) =>
    sourceOf(e.feature, e.quantity, producerOutput(e.feature), isCommanderEntry(e)));
  const tokenVerified: Member[] = tokenMakers.filter((e) => e.feature.s >= 1)
    .map((e) => toMember(e.feature, e.quantity, isCommanderEntry(e)));
  const producers = [...tokenMakers, ...foodMakers];
  if (producers.length > 0) {
    // ponytail: a flat 2 power per producer per turn, the v1 assumption kept.
    // Upgrade path is a curated per-card token table.
    const isCommanderProducer = (e: DeckEntry) => commanders.includes(e.feature);
    const foodNames = new Set(foodMakers.map((e) => e.feature.card.name));
    const converted: Source[] = [
      ...bodies,
      ...producers.map((e) => ({
        ...sourceOf(e.feature, e.quantity, producerOutput(e.feature), isCommanderProducer(e)),
        // Only this half owes the conversion toll; `mergeSources` ORs it onto
        // the card's single row, and `bestLine` scans the toll-free line too.
        tolled: foodNames.has(e.feature.card.name),
      })),
    ];
    const verifiedConverted = dedupeMembers([
      ...verifiedBodies,
      ...producers.filter((e) => e.feature.s >= 1)
        .map((e) => toMember(e.feature, e.quantity, isCommanderProducer(e))),
    ]);
    // The conversion toll is owed by the line that actually runs a Food-like
    // producer. A pure creature-token line needs no converter, so charging it
    // one made losing the converter a gain.
    const extra = (names: ReadonlySet<string>): RecipePool[] =>
      (foodMakers.length > 0 && [...foodNames].some((n) => names.has(n))
        ? [{ members: converters, r: 1 }] : []);
    const tokens = scheduleRecipe('tokens', (r) => `Token/Food conversion (${r} bodies)`,
      format, N, [...converted, ...typed.sources], [...verifiedConverted, ...typed.verified],
      extra, manaCurve, finish, poolSizeCap, typed.extraDraws, audit);
    if (tokens) out.push(tokens);
    return { recipes: out, bodies, converted, tokenSources, tokenVerified };
  }
  return { recipes: out, bodies, converted: bodies, tokenSources, tokenVerified };
}

/**
 * (2) Aristocrats drain. Output per trigger x triggers per turn, cumulative.
 * All-player drain removes every opponent at once, so §1 W's "different output
 * requirements" means the target is ONE opponent's life total, not the pod's.
 */
function drainRecipe(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  manaCurve: ManaCurve, lifePerOpponent: number, opponents: number, poolSizeCap: number,
  extraDraws: number, audit?: Audit,
): Recipe | null {
  const isFodder = (f: CardFeature) => f.isTokenProducer || (f.c <= 2 && /\bCreature\b/.test(f.card.type_line || ''));
  const outlets = pickMembers(nonLand, commanders, (f) => f.isSacOutlet);
  const payoffs = pickMembers(nonLand, commanders, (f) => f.isDrainPayoff);
  const fodder = pickMembers(nonLand, commanders, isFodder);
  if (outlets.length === 0 || payoffs.length === 0 || fodder.length === 0) {
    // Only a PARTIAL aristocrats shell is a missing prerequisite; a deck with
    // none of the three simply does not run the family.
    const have = [outlets.length > 0 && 'outlet', payoffs.length > 0 && 'payoff', fodder.length > 0 && 'fodder']
      .filter(Boolean) as string[];
    const missing = ['outlet', 'payoff', 'fodder'].filter((k) => !have.includes(k));
    if (have.length >= 2) note(audit, 'drain', `drain.no_${missing[0]}`, `has ${have.join(' + ')}, missing ${missing.join(' + ')}`);
    return null;
  }

  // Triggers per turn: one sacrifice, or two when a repeatable fodder engine
  // (token producer or a dies-trigger recursion commander like Meren) is there.
  const repeatableFodder = nonLand.some((e) => e.feature.isTokenProducer) ||
    commanders.some((f) => f.hasDiesTrigger);
  const triggersPerTurn = repeatableFodder ? 2 : 1;
  const cheapestOutlet = Math.min(...outlets.map((m) => m.cmc));

  // A payoff only drains once an outlet is also online, so it pays for both.
  // Same accounting as the pressure family: the schedule weights each payoff by
  // P(drawn) and `requiredCopies` then sizes the pool `J_l` prices, so the
  // number of payoffs credited as draining equals the number the access term
  // demands. Treating every payoff as simultaneously online while the pool
  // asked for one was the same output-upper-bound/access-lower-bound mismatch
  // the pressure pool used to have.
  // All-player drain removes every opponent at once, so `output` is the TABLE
  // total and `eachOpponent` splits it back to one life total per opponent
  // (section 10.8 item 1: an each-opponent trigger hits three).
  const sources: Source[] = payoffs.map((m) => ({
    name: m.name, cmc: Math.max(m.cmc, cheapestOutlet), quantity: m.quantity,
    guaranteed: !!m.guaranteed, output: triggersPerTurn * opponents, eachOpponent: true,
  }));
  const drainTarget = lifePerOpponent * opponents;
  const tStar = closingTurn(format, N, sources, manaCurve, { perOpponent: lifePerOpponent, opponents }, extraDraws);
  if (tStar === null) {
    return note(audit, 'drain', 'drain.schedule_short',
      `${combatCeiling(format, N, sources, manaCurve, extraDraws).toFixed(1)} of ${drainTarget} drain by T${horizonFor(format)}`);
  }
  // v1.4 stage 3h: rank on the recipe's WHOLE pool list (outlet + payoffs +
  // fodder), the same joint access `evaluateRecipe` reads back.
  const drainPools = (names: ReadonlySet<string>, r: number): RecipePool[] => [
    { members: outlets, r: 1 },
    { members: payoffs.filter((m) => names.has(m.name)), r },
    // v1.4 stage 3b (§10.4): the DEMAND is frozen at three bodies. Clamping
    // it to the copies this deck happens to hold made the requirement fall
    // when fodder was deleted or blanked, which RAISED joint access.
    { members: fodder, r: 3 },
  ];
  const bestDrain = maximiseOverTurns(format, N, tStar, sources, drainTarget, poolSizeCap, drainPools);
  if (bestDrain === null) return note(audit, 'drain', 'drain.no_positive_output', 'no payoff with positive output');
  const payoffLine = bestDrain.line;
  const rPayoff = payoffLine.r;

  return {
    id: 'drain',
    label: `Aristocrats drain (${triggersPerTurn}/turn, ${rPayoff} payoffs)`,
    pools: drainPools(payoffLine.names, rPayoff),
    extraCost: 1,
    criticalNames: new Set([...outlets, ...payoffs, ...fodder].map((m) => m.name)),
    selected: { u: bestDrain.u, access: payoffLine.access, turn: bestDrain.turn },
    tStar,
    valueTurn: bestDrain.turn,
  };
}

/**
 * (5) Voltron. 21 commander damage to EACH opponent, dealt sequentially, so the
 * target is 21 x opponents on one body's schedule. Brawl has no commander-damage
 * rule (CR 903.10/903.12), so this family never builds there.
 */
function voltronRecipe(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  manaCurve: ManaCurve, opponents: number, extraDraws: number, audit?: Audit,
): Recipe | null {
  if (format !== 'commander' || commanders.length !== 1) return null;
  const commander = commanders[0];
  const pump = nonLand.filter((e) => e.feature.isEquipmentOrAura);
  if (pump.length === 0) return null;

  const sources: Source[] = [
    sourceOf(commander, 1, (commander.power || 0) * commander.s, true),
    // ponytail: flat +3 power per equipment/aura, the v1 assumption kept.
    ...pump.map((e) => sourceOf(e.feature, e.quantity, 3 * e.feature.s)),
  ];
  // 21 commander damage to EACH opponent: one body attacks one player a turn,
  // so this is a per-opponent target of 21, not 63 aggregate.
  const tStar = closingTurn(format, N, sources, manaCurve, { perOpponent: 21, opponents }, extraDraws);
  if (tStar === null) {
    return note(audit, 'combat_tall', 'combat_tall.schedule_short',
      `${combatCeiling(format, N, sources, manaCurve, extraDraws).toFixed(1)} of ${21 * opponents} commander damage by T${horizonFor(format)}`);
  }

  const pumpMembers = pump.map((e) => toMember(e.feature, e.quantity));
  const r = Math.max(1, Math.ceil((21 - (commander.power || 0)) / 3));
  // v1.4 stage 3b (§10.4): `r` is the frozen requirement (21 damage at +3 a
  // piece). It is NOT clamped to the identified pool — deleting one equipment
  // lowered the requirement and paid +1.8 W on sample 381364921. A deck holding
  // fewer pieces than the line needs simply has access 0 for it.
  const pools: RecipePool[] = [{ members: pumpMembers, r }];
  const criticalNames = new Set([commander.card.name, ...pumpMembers.map((m) => m.name)]);
  if (!commander.hasEvasion) {
    const evasion = nonLand.filter((e) => e.feature.hasEvasion && (e.feature.isEquipmentOrAura || e.feature.categories.includes('protection')));
    if (evasion.length > 0) {
      pools.push({ members: evasion.map((e) => toMember(e.feature, e.quantity)), r: 1 });
      for (const e of evasion) criticalNames.add(e.feature.card.name);
    }
  }
  return { id: 'combat_tall', label: 'Voltron commander damage', pools, extraCost: 1, criticalNames, tStar };
}

/** What `controlRecipe` publishes: the recipe plus the executable schedule
 * `pile-diag --win` prints (§10.6.3 "prints the schedule (t*, J, copies per
 * role, per-turn contributions)"). */
interface ControlEval {
  recipe: Recipe;
  u: number;
  access: number;
  schedule: DamageSchedule;
  durable: number;
  tStar: number;
  engines: number;
  rFinisher: number;
}

/**
 * (3) Control inevitability. §1 W allows Tfast=6 "only for a validated
 * control/stax recipe that establishes a durable advantage AND retains a
 * supported finisher; ordinary removal density cannot establish this
 * exemption" — hence the conjunction of E/E* and D/D*, and the separate
 * finisher pool.
 */
function controlRecipe(
  format: ScoreFormat, norms: FormatNorms, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  totals: WinTotals, typed: TypedFinishers, pressure: PressureOutput, manaCurve: ManaCurve,
  finish: FinishTarget, audit?: Audit,
): ControlEval | null {
  const combatTarget = finish.perOpponent * finish.opponents;
  // The spec's exemption is conditional, not graded: "ordinary removal density
  // cannot establish this exemption". Unless the deck actually MEETS E* and
  // either D* or a repeatable draw engine, there is no control line at all --
  // without this gate every deck with a few removal spells and one cantrip
  // claimed inevitability, random piles included (measured: piles took control
  // as their best line at u=0.16).
  if (totals.E < totals.Estar) {
    return note(audit, 'control', 'control.answers_short', `E ${totals.E.toFixed(1)} < E* ${totals.Estar.toFixed(1)}`);
  }
  // §8: the exemption needs a DURABLE advantage engine - something that keeps
  // producing - not a stack of one-shot draw spells. Counting `D >= D*` as an
  // alternative let a Food midrange list with six fat creatures read as
  // "Control inevitability" (cabbage-cedh-input, score 73 in a 35-50 band).
  if (!totals.hasDrawEngine) {
    return note(audit, 'control', 'control.no_draw_engine', 'answers without a repeatable advantage engine');
  }
  // …and stabilisation means answers that are actually up early: §8's "E >= E*
  // with >= 2 cheap answers by T3".
  const cheapAnswers = nonLand
    .filter((e) => e.feature.answerAxes.length > 0 && e.feature.c <= 3 && e.feature.s >= 1)
    .reduce((sum, e) => sum + e.quantity, 0);
  if (cheapAnswers < 2) {
    return note(audit, 'control', 'control.stabilisation_short', `${cheapAnswers} answers at MV<=3 (needs 2)`);
  }
  const durable = Math.min(clip(totals.E / totals.Estar), clip(totals.D / totals.Dstar));
  if (durable <= 0) return note(audit, 'control', 'control.durable_zero', 'E or D is zero');

  // §9.4 finisher POOL: only cards with an executable output reading. A big
  // body swings, a creature-token maker makes attackers, and the four typed
  // families (walker loyalty, animated land, repeatable burn, draw damage)
  // bring their own costs. "Unknown output cannot prove a finish; unfulfilled
  // alternate-win conditions never enter the finisher pool" — so `isAltWin`
  // and the old untyped `RE_REPEATABLE_DAMAGE` / `isDrawEngine && isDrainPayoff`
  // readings are gone; each of those is a different family's job.
  const isBigBody = (f: CardFeature) => isBody(f) && (f.power ?? 0) >= 4;
  const bigBodies: Source[] = [
    ...commanders.filter(isBigBody).map((f) => sourceOf(f, 1, (f.power || 0) * f.s, true)),
    ...nonLand.filter((e) => isBigBody(e.feature))
      .map((e) => sourceOf(e.feature, e.quantity, (e.feature.power || 0) * e.feature.s)),
  ];
  const finisherSources = [...bigBodies, ...pressure.tokenSources, ...typed.sources];
  const finishers: Member[] = dedupeMembers([
    ...commanderMembers(commanders, (f) => isBigBody(f) && f.s >= 1),
    ...nonLand.filter((e) => isBigBody(e.feature) && e.feature.s >= 1).map((e) => toMember(e.feature, e.quantity)),
    ...pressure.tokenVerified,
    ...typed.verified,
  ]);
  if (finisherSources.length === 0 || finishers.length === 0) {
    return note(audit, 'control', 'control.no_finisher', 'stabilises and draws but holds no typed finisher output');
  }

  // §10.6.3: `t* = first t <= 12 satisfying the whole-table finish predicate`,
  // on the SAME cost/output bins access is priced from. A computed T8 is
  // allowed; a default T8 is not.
  const schedule = scheduleDamage(format, N, finisherSources, manaCurve, finish, typed.extraDraws);
  if (schedule.tStar === null) {
    return note(audit, 'control', 'control.schedule_short',
      `${schedule.ceiling.toFixed(1)} of ${combatTarget} finisher output by T${horizonFor(format)}`
      + `, shortfall ${schedule.shortfall[horizonFor(format)].toFixed(1)}`);
  }
  const tStar = schedule.tStar;
  // §9.4 JOINT access: the engine that sustains the plan and the finisher that
  // ends it are BOTH required by t*, so they enter one disjoint polynomial and
  // J is read once. Applying it again inside the output would double-charge.
  // Built BEFORE the line so `bestLine` can rank its candidates on this same
  // joint quantity (v1.4 stage 3h: selection = valuation).
  const engines: Member[] = pickMembers(nonLand, commanders, (f) => f.isDrawEngine && f.s >= 1);
  const engineNames = new Set(engines.map((m) => m.name));
  const finisherNames = new Set(finishers.map((m) => m.name));
  const enginePool: RecipePool = { members: engines.filter((m) => !finisherNames.has(m.name)), r: 1 };
  // Same rule: the finisher demand comes from the output schedule, never from
  // the number of finishers that happen to be identified.
  //
  // v1.4 stage 3x: the engine requirement is never DROPPED. The engine pool
  // used to enter only while it had members, so deleting the last
  // non-finisher engine (the rest being finishers or s<1) removed a factor
  // < 1 and RAISED J (synthetic: J .163 -> .957). Two variants, each a fixed
  // row set: a separate engine plus r finishers, or one of the line's own
  // finishers IS the engine plus r-1 others. An empty pool reads 0, deletion
  // only shrinks rows, so the max over the two cannot rise (3w's shape).
  const controlLine = (names: ReadonlySet<string> | null, r: number): { pools: RecipePool[]; access: number } => {
    const line = names ? finishers.filter((m) => names.has(m.name)) : finishers;
    const separate: RecipePool[] = [enginePool, { members: line, r }];
    const self: RecipePool[] = [
      { members: line.filter((m) => engineNames.has(m.name)), r: 1 },
      { members: line.filter((m) => !engineNames.has(m.name)), r: r - 1 },
    ];
    const a = poolsAccess(format, N, tStar, separate);
    const b = poolsAccess(format, N, tStar, self);
    return b > a ? { pools: self, access: b } : { pools: separate, access: a };
  };
  const finisherLine = bestLine(format, N, tStar, finisherSources, combatTarget, combatsBy(tStar),
    norms.poolSizeCap, (names, r) => controlLine(names, r).access);
  const rFinisher = finisherLine?.r ?? 1;
  const { pools, access: J } = controlLine(finisherLine ? finisherLine.names : null, rFinisher);
  const finisherPool = pools[pools.length - 1];

  // §9.4 `u_control = durable * J(t*) * 2^(-max(0, t* - Tfast)/h)`. The spec
  // writes the constant 6; it means Tfast, which the frozen norms put at 7 for
  // Commander — §10.6.3 forbids a NEW constant, so the existing one is used.
  // J is RAW, not `clip(J/pWin)`: that normalisation saturated every control
  // line above 15 % access, which is exactly the flatness §9.4 removes.
  const decay = Math.pow(2, -Math.max(0, tStar - norms.fastClosingTurn) / norms.delayHalfLifeTurns);
  const u = durable * J * decay;
  return {
    u, access: J, schedule, durable, tStar, engines: poolK(pools[0]), rFinisher: poolR(finisherPool),
    recipe: {
      id: 'control',
      schedule,
      label: `Control inevitability (${finishers.length} finishers, closes T${tStar})`,
      pools,
      extraCost: 0,
      criticalNames: new Set(finishers.map((m) => m.name)),
      tStar,
      trace: {
        resource: `durable ${durable.toFixed(2)} from E ${totals.E.toFixed(1)}/${totals.Estar.toFixed(1)}`
          + ` and D ${totals.D.toFixed(1)}/${totals.Dstar.toFixed(1)}; ${engines.length} repeatable draw engines`,
        tutor: `joint access J=${J.toFixed(3)} over ${pools.length} pools`
          + ` (engine r${poolR(pools[0])} of ${poolK(pools[0])}, finisher r${poolR(finisherPool)} of ${poolK(finisherPool)}) at T${tStar}`,
        finish: `${combatTarget} damage by T${tStar}: ${schedule.detail.slice(0, 3).join('; ') || 'creature combat only'}`
          + ` [${typed.traces.slice(0, 3).join(' | ') || 'no typed non-creature output'}]`,
      },
    },
  };
}

/**
 * (8) Spellslinger / storm. Two readings of the same deck, both scheduled:
 *
 *   cast triggers  the pingers ALONE, on the deck's own spell schedule, so a
 *                  Guttersnipe shell that cannot win on creature power is not
 *                  scored as though its only damage were 2/2 bodies.
 *   burst          one-shot storm copies and {X} finishers, priced against the
 *                  turn's mana plus typed rituals (§10.6.3's shape: a computed
 *                  turn, never a default one).
 *
 * Both publish the family id `spells`; `computeWin` keeps whichever the delay
 * decay and access term rate higher.
 */
function spellsRecipes(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  typed: TypedFinishers, sched: SpellSchedule, manaCurve: ManaCurve, finish: FinishTarget,
  poolSizeCap: number, opponents: number, audit?: Audit,
): Recipe[] {
  const out: Recipe[] = [];
  const castSources = typed.sources.filter((s) => s.kind === 'cast_trigger');
  if (castSources.length > 0) {
    const verified = typed.verified.filter((m) => typed.castNames.has(m.name));
    const line = scheduleRecipe('spells', (r, t) => `Spellslinger cast triggers (${r} sources, closes T${t})`,
      format, N, castSources, verified, () => [], manaCurve, finish, poolSizeCap, typed.extraDraws, audit);
    if (line) {
      line.trace = {
        resource: sched.trace,
        tutor: `${verified.length} verified trigger source(s) in the access pool`,
        finish: castSources.map((c) => c.trace).filter(Boolean).slice(0, 3).join(' | ') || 'typed cast-trigger output',
      };
      out.push(line);
    }
  } else if (sched.noncreatureCopies > 0) {
    note(audit, 'spells', 'spells.no_cast_trigger',
      `${sched.noncreatureCopies} noncreature spells and no typed cast trigger on any permanent`);
  }

  const payoffs: BurstPayoff[] = [];
  for (const e of nonLand) {
    const p = burstPayoffOf(e.feature, e.quantity, false, opponents);
    if (p) payoffs.push(p);
  }
  for (const f of commanders) {
    const p = burstPayoffOf(f, 1, true, opponents);
    if (p) payoffs.push(p);
  }
  if (payoffs.length === 0) return out;
  const burst = burstFinish(format, sched, payoffs, (t) => manaCurve.spendableAt(t),
    finish.perOpponent, finish.opponents);
  if (burst.tStar === null || !burst.best) {
    note(audit, 'spells', 'spells.burst_short',
      `${burst.ceiling.toFixed(1)} of ${finish.perOpponent * finish.opponents}`
      + ` storm/{X} burst damage by T${horizonFor(format)}`);
    return out;
  }
  const payoffPool: RecipePool = {
    members: payoffs.map((p) => ({ name: p.name, cmc: p.cmc, quantity: p.quantity, guaranteed: p.guaranteed })),
    r: 1,
  };
  const pools: RecipePool[] = [payoffPool];
  const ritualMembers = burst.usesBurstMana
    ? nonLand.filter((e) => isPrintedRitual(e.feature))
      .map((e) => toMember(e.feature, e.quantity))
    : [];
  if (ritualMembers.length > 0) pools.push({ members: ritualMembers, r: 1 });
  out.push({
    id: 'spells',
    label: `${burst.best.kind === 'storm' ? 'Storm' : '{X} finisher'} burst (${burst.best.name}, closes T${burst.tStar})`,
    pools,
    extraCost: 0,
    criticalNames: new Set([burst.best.name, ...ritualMembers.map((m) => m.name)]),
    tStar: burst.tStar,
    trace: {
      resource: sched.trace,
      tutor: `${payoffPool.members.length} typed burst payoff(s)`
        + `${ritualMembers.length > 0 ? ` + ${ritualMembers.length} typed ritual(s)` : ''}`,
      finish: burst.trace,
    },
  });
  return out;
}

function altWinRecipe(nonLand: DeckEntry[], commanders: CardFeature[]): Recipe | null {
  const altWin = pickMembers(nonLand, commanders, (f) => f.isAltWin);
  if (altWin.length === 0) return null;
  return {
    id: 'alt_win',
    label: 'Alternate win condition',
    pools: [{ members: altWin, r: 1 }],
    extraCost: 2,
    criticalNames: new Set(altWin.map((m) => m.name)),
    trace: {
      resource: `${altWin.map((m) => m.name).join(', ')} — the card's own rules text states the win`,
      tutor: 'none modelled: the alternate-win pool is the access term',
      finish: 'the printed "you win the game" clause, once its condition is met',
    },
  };
}

// ── Evaluation ────────────────────────────────────────────────────────────

interface RecipeEval { recipe: Recipe; u: number; atTurn: number; access: number }

/**
 * `u_l = max_t ready_l(t) · clip(J_l(n(t))/pWin) · 2^(−max(0,t−Tfast)/h)` (§1 W).
 * A recipe carrying `tStar` already knows its turn from its output schedule;
 * the rest scan for the first turn their fixed cost is affordable.
 */
function evaluateRecipe(
  format: ScoreFormat, norms: FormatNorms, N: number, recipe: Recipe, manaCurve: ManaCurve,
): RecipeEval {
  // stage 3j: the selection already maximised §1's utility over the feasible
  // turns WITH the line that turn chose; re-scanning the stored line over every
  // other turn is a different (and non-monotone) objective. See `Recipe.selected`.
  if (recipe.selected) {
    return { recipe, u: recipe.selected.u, atTurn: recipe.selected.turn, access: recipe.selected.access };
  }
  const accessAt = (t: number): number => poolsAccess(format, N, t, recipe.pools);
  const scoreAt = (t: number, access: number): number =>
    clip(access / norms.winAccessTarget) * Math.pow(2, -Math.max(0, t - norms.fastClosingTurn) / norms.delayHalfLifeTurns);

  // stage 3i: §1's utility is the MAXIMUM over the feasible turns, and a
  // scheduled recipe's feasible set is `t* <= t <= H` (its damage schedule is
  // cumulative, so `Phi` holds at every later turn). Valuing it at `t*` alone
  // let an added unknown slot RAISE W: the clock slipped a turn, `n(t)`
  // deepened and access beat the decay (`commander:381372590` Voltron T8 4% ->
  // T9 5%, +2.24 total). Scanning restores §10.10 item 3's nesting argument —
  // a later `t*` can only remove turns from this maximum. `maximiseOverTurns`
  // already did this for the families whose LINE also moves with `t`; here the
  // pools are fixed, so one scan over the same `scoreAt` is the whole rule.
  if (recipe.tStar != null) {
    let best: RecipeEval = { recipe, u: -1, atTurn: recipe.tStar, access: 0 };
    for (let t = recipe.tStar; t <= horizonFor(format); t++) {
      const access = accessAt(t);
      const u = scoreAt(t, access);
      if (u > best.u + 1e-12) best = { recipe, u, atTurn: t, access };
    }
    return best;
  }

  const totalCost = recipe.pools.reduce((s, p) => s + poolCost(p), 0) + recipe.extraCost;
  let best: RecipeEval = { recipe, u: 0, atTurn: 0, access: 0 };
  for (let t = 1; t <= horizonFor(format); t++) {
    if (totalCost > manaCurve.spendableAt(t)) continue;
    const access = accessAt(t);
    const u = scoreAt(t, access);
    if (u > best.u) best = { recipe, u, atTurn: t, access };
  }
  return best;
}

/**
 * The control family carries its own `u`/`access` (it is scheduled and
 * access-normalised inside `controlRecipe`); every other family is priced by
 * `evaluateRecipe`.
 */
function evalOf(
  format: ScoreFormat, norms: FormatNorms, N: number, recipe: Recipe, manaCurve: ManaCurve,
  control: ControlEval | null,
): RecipeEval {
  if (control && recipe.id === 'control') {
    return { recipe, u: control.u, atTurn: control.recipe.tStar ?? horizonFor(format), access: control.access };
  }
  return evaluateRecipe(format, norms, N, recipe, manaCurve);
}

/**
 * §8 closing/tutor family: the assembled line S needs to read. Only emitted
 * for the two families that ASSEMBLE a fixed set (compact combo, alternate
 * win) — the output-schedule families already have a generic plan that
 * describes them, and their "critical names" are a whole creature suite, not
 * a combo.
 */
export interface ClosingLine {
  id: string;
  label: string;
  /** The pieces that must all be present and castable. */
  pieces: string[];
  /** Distinct pieces the line needs (sum of pool r after commander credit). */
  required: number;
  /** Total mana the whole line costs, including its `extraCost` slack. */
  cost: number;
  /** Turn the line goes off, from W's own evaluation. */
  tStar: number;
  /**
   * §10.6.1: no line is admitted without an audited execution trace. `resource`
   * names the loop and what makes it repeat, `tutor` the access to the pieces,
   * `finish` the outlet that converts the loop into a finish predicate. Only
   * the modelled creature-combo family sets it today; the generic families
   * carry their schedule in `label` instead.
   */
  trace?: { resource: string; tutor: string; finish: string };
}

/** Raw component totals the control family needs (see deck-score-interaction). */
export interface WinTotals {
  E: number; Estar: number;
  D: number; Dstar: number; hasDrawEngine: boolean;
}

/** `u1`, `u2`, `protect` -> Win access & redundancy (W), §1. */
export interface WinOutput extends ComponentOutput {
  /** Non-null only when the best line is compact combo or alternate win. */
  closing: ClosingLine | null;
  /** §9.5: every COMPLETE assembled line that meets the W access target, best
   * first. `closing` is the root; the rest are the compatible backups S may
   * admit. Empty when no line assembles. */
  closingLines: readonly ClosingLine[];
}

/** Every family, built once. `computeWin`, `winDiagnostic` and `winAudit` all
 * read the SAME construction — an audit of a different build would be fiction. */
interface BuiltRecipes {
  recipes: Recipe[];
  control: ControlEval | null;
  pressure: PressureOutput;
  manaCurve: ManaCurve;
  combatTarget: number;
  spells: SpellSchedule;
}

function buildRecipes(
  format: ScoreFormat, norms: FormatNorms, N: number, mainEntries: DeckEntry[],
  commanders: CardFeature[], totals: WinTotals, audit?: Audit,
): BuiltRecipes {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  // §1 W: "A finish predicate must defeat EVERY remaining opponent: 3x40 combat
  // damage or 21 commander damage to EACH opponent in Commander, 25/20 life in
  // Brawl/Standard."
  const shape = gameShape(format);
  const opponents = Math.max(1, shape.players - 1);
  const combatTarget = shape.lifePerOpponent * opponents;
  const manaCurve = manaCurveFor(format, N, nonLand, horizonFor(format));
  const all = [...nonLand, ...commanders.map((f) => ({ feature: f, quantity: 1, guaranteed: true }))];

  const spells = buildSpellSchedule(format, N, nonLand, (t) => manaCurve.spendableAt(t));
  const typed = typedFinisherSources(mainEntries, commanders, opponents, spells);
  const recipes: Recipe[] = [...typedComboRecipes(all, opponents, audit)];
  const finish: FinishTarget = { perOpponent: shape.lifePerOpponent, opponents };
  const pressure = pressureRecipes(format, N, nonLand, commanders, manaCurve, finish, norms.poolSizeCap, typed, audit);
  recipes.push(...pressure.recipes);
  const drain = drainRecipe(format, N, nonLand, commanders, manaCurve, shape.lifePerOpponent, opponents,
    norms.poolSizeCap, typed.extraDraws, audit);
  if (drain) recipes.push(drain);
  const voltron = voltronRecipe(format, N, nonLand, commanders, manaCurve, opponents, typed.extraDraws, audit);
  if (voltron) recipes.push(voltron);
  const altWin = altWinRecipe(nonLand, commanders);
  if (altWin) recipes.push(altWin);
  recipes.push(...spellsRecipes(format, N, nonLand, commanders, typed, spells, manaCurve, finish,
    norms.poolSizeCap, opponents, audit));
  const control = controlRecipe(format, norms, N, nonLand, commanders, totals, typed, pressure, manaCurve, finish, audit);
  if (control) recipes.push(control.recipe);
  return { recipes, control, pressure, manaCurve, combatTarget, spells };
}

/** Diagnostic twin of `computeWin`: every recipe it built, with pool sizes,
 * t* and u. Scripts only — the scorer never calls it. */
export function winDiagnostic(
  format: ScoreFormat, norms: FormatNorms, archetype: Archetype, N: number,
  mainEntries: DeckEntry[], commanders: CardFeature[], totals: WinTotals,
): string {
  const { recipes, control, pressure, manaCurve, combatTarget, spells } =
    buildRecipes(format, norms, N, mainEntries, commanders, totals);
  const lines = [
    `combat ceiling by T12: bodies ${combatCeiling(format, N, pressure.bodies, manaCurve).toFixed(1)}, with conversion ${combatCeiling(format, N, pressure.converted, manaCurve).toFixed(1)} (target ${combatTarget})`,
    `N=${N} target=${combatTarget} ramp=${manaCurve.bonus.toFixed(2)} E=${totals.E.toFixed(1)}/${totals.Estar.toFixed(1)} D=${totals.D.toFixed(1)}/${totals.Dstar.toFixed(1)} engine=${totals.hasDrawEngine}`,
    `spell schedule: ${spells.trace}`,
    `  casts/turn T2..T12: ${spells.noncreature.slice(2).map((x) => x.toFixed(2)).join(' ')}`
      + `; spell mana debited ${spells.manaSpent.slice(2).map((x) => x.toFixed(1)).join(' ')}`
      + `; burst mana ${spells.burstMana.slice(2).map((x) => x.toFixed(1)).join(' ')}`,
    `recipes built: ${recipes.length}`,
    '| recipe | pools (members x r) | t* | u |',
    '|---|---|---:|---:|',
  ];
  for (const r of recipes) {
    const e = evalOf(format, norms, N, r, manaCurve, control);
    const pools = r.pools.map((pl) => `${pl.members.length}x r${pl.r}`).join(' + ');
    lines.push(`| ${r.label} | ${pools} | ${e.atTurn || r.tStar || '-'} | ${e.u.toFixed(3)} |`);
  }
  // Any recipe that carries an audited trace prints it, not just control:
  // §10.6.1 asks every admitted line to expose resource / tutor / finish.
  for (const r of recipes) {
    if (!r.trace || r.id === 'control') continue;
    lines.push(`trace ${r.id} — ${r.label}`);
    lines.push(`  resource: ${r.trace.resource}`);
    lines.push(`  tutor:    ${r.trace.tutor}`);
    lines.push(`  finish:   ${r.trace.finish}`);
  }
  if (control) {
    lines.push('');
    lines.push(`control schedule: t*=${control.tStar} J=${control.access.toFixed(3)} durable=${control.durable.toFixed(3)}`
      + ` u=${control.u.toFixed(3)} | engine pool ${control.engines} copies r1, finisher pool`
      + ` ${poolK(control.recipe.pools[control.recipe.pools.length - 1])} copies r${control.rFinisher}`);
    lines.push(`per-turn output T2..T12: ${control.schedule.perTurn.map((x) => x.toFixed(1)).join(' ')}`
      + ` (ceiling ${control.schedule.ceiling.toFixed(1)})`);
    for (const d of control.schedule.detail.slice(0, 12)) lines.push(`  ${d}`);
    if (control.recipe.trace) {
      lines.push(`  resource: ${control.recipe.trace.resource}`);
      lines.push(`  tutor:    ${control.recipe.trace.tutor}`);
      lines.push(`  finish:   ${control.recipe.trace.finish}`);
    }
  }
  const audited: WinAuditNote[] = [];
  buildRecipes(format, norms, N, mainEntries, commanders, totals, audited);
  for (const n of audited) lines.push(`rejected ${n.family}: ${n.code} — ${n.detail}`);
  return lines.join(String.fromCharCode(10));
}

/**
 * Section 10.8 item 3: the reproducible PER-TURN WITNESS for one list. Prints
 * the mana ledger of the line W actually selected - what the turn produced,
 * what the spells took, what the activations took, what deployment has cost so
 * far, what was left, the damage dealt and the life each opponent still has -
 * beside the spell schedule, the joint access, the first close and the score.
 *
 * Scripts only; `scoreDeck` never calls it.
 */
export function winWitness(
  format: ScoreFormat, norms: FormatNorms, archetype: Archetype, N: number,
  mainEntries: DeckEntry[], commanders: CardFeature[], totals: WinTotals,
): string {
  const { recipes, control, manaCurve, combatTarget, spells } =
    buildRecipes(format, norms, N, mainEntries, commanders, totals);
  const win = computeWin(format, norms, archetype, N, mainEntries, commanders, totals);
  const evals = recipes.slice(0, 8).map((r) => evalOf(format, norms, N, r, manaCurve, control));
  evals.sort((a, b) => b.u - a.u || a.recipe.id.localeCompare(b.recipe.id));
  const best = evals[0];
  const horizon = horizonFor(format);
  const lines = [
    `witness: ${format}, N=${N}, horizon T${horizon}, finish ${gameShape(format).lifePerOpponent}`
      + ` to each of ${Math.max(1, gameShape(format).players - 1)} opponent(s)`
      + ` (${combatTarget} aggregate)`,
    `mana curve: ${manaCurve.trace}`,
    `spell schedule: ${spells.trace}`,
    `  casts/turn T2..T${horizon}: ${spells.noncreature.slice(2, horizon + 1).map((x) => x.toFixed(2)).join(' ')}`,
    `  no-replacement casts:       ${spells.noncreatureNoReplacement.slice(2, horizon + 1).map((x) => x.toFixed(2)).join(' ')}`,
    `  spell mana debited:         ${spells.manaSpent.slice(2, horizon + 1).map((x) => x.toFixed(1)).join(' ')}`,
    `  ritual copies ${spells.ritualCopies}, net burst ${spells.ritualNetBurst.toFixed(1)}`,
    '',
    `selected line: ${best ? best.recipe.label : 'none'}`
      + `${best ? ` | t*=${best.atTurn} | joint access J=${best.access.toFixed(3)} | u=${best.u.toFixed(3)}` : ''}`,
    `W ${win.score.toFixed(1)} | ${win.reason}`,
  ];
  const sched = best?.recipe.schedule;
  if (sched) {
    lines.push('');
    lines.push('| turn | mana ledger |');
    lines.push('|---|---|');
    for (const row of sched.ledger) lines.push(`| ${row.split(' ')[0]} | ${row.slice(row.indexOf(' ') + 1)} |`);
    lines.push('');
    lines.push(`shortfall on the most-alive opponent: `
      + [12, 16, 20].filter((t) => t <= horizon)
        .map((t) => `T${t} ${sched.shortfall[t].toFixed(1)}`).join(', '));
    lines.push(`first close: ${sched.tStar === null ? 'none' : `T${sched.tStar}`}`
      + `; aggregate table output by T${horizon} ${sched.ceiling.toFixed(1)}`);
    lines.push('per-source contributions:');
    for (const d of sched.detail.slice(0, 40)) lines.push(`  ${d}`);
  } else {
    lines.push('(the selected line assembles a fixed set; it carries no output schedule)');
  }
  return lines.join(String.fromCharCode(10));
}

/**
 * §10.6.2's W-zero audit surface: the score plus every family's rejection
 * reason, from the same `buildRecipes` call the scorer uses. Scripts only.
 */
export function winAudit(
  format: ScoreFormat, norms: FormatNorms, archetype: Archetype, N: number,
  mainEntries: DeckEntry[], commanders: CardFeature[], totals: WinTotals,
): { win: WinOutput; notes: WinAuditNote[]; built: string[] } {
  const notes: WinAuditNote[] = [];
  const { recipes } = buildRecipes(format, norms, N, mainEntries, commanders, totals, notes);
  return {
    win: computeWin(format, norms, archetype, N, mainEntries, commanders, totals),
    notes,
    built: recipes.map((r) => r.id),
  };
}

export function computeWin(
  format: ScoreFormat,
  norms: FormatNorms,
  archetype: Archetype,
  N: number,
  mainEntries: DeckEntry[],
  commanders: CardFeature[],
  totals: WinTotals,
): WinOutput {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  const { recipes, control, manaCurve } = buildRecipes(format, norms, N, mainEntries, commanders, totals);

  if (recipes.length === 0) {
    return {
      score: 0, closing: null, closingLines: [],
      reason: `no supported closing line: no catalogued win recipe present; t* never reached within ${horizonFor(format)} turns.`,
    };
  }

  const evals = recipes.slice(0, 8) // §1 W: "Retain at most 8 recipes"
    .map((r) => evalOf(format, norms, N, r, manaCurve, control));
  evals.sort((a, b) => b.u - a.u || a.recipe.id.localeCompare(b.recipe.id));

  const protectPool = nonLand.filter((e) => e.feature.isProtection && e.feature.c <= 2);
  const Kprotect = protectPool.reduce((s, e) => s + e.quantity, 0);
  const ns = drawSampleSizes(format, norms.fastClosingTurn);
  const protect = clip(ns.reduce((s, n) => s + H(N, Kprotect, n, 1), 0) / ns.length / 0.70);

  // v1.4 stage 3n: the primary and its independent backup are ONE choice, and
  // taking the primary greedily as the `u` argmax is not that choice's maximum
  // — the backup term depends on which critical names the primary already
  // spent. Measured on `brawl 365001669`: blanking one card cost the Token/Food
  // line the argmax, Creature pressure took over, and because ITS critical
  // names are narrower the alternate-win line became independent, so the backup
  // went u .06 -> .50 and W ROSE 63.0 -> 67.7 on a DELETION (arm D, +1 unknown
  // slot, the same row inverted). The winning pair existed in the base arm too;
  // greedy never looked at it. Maximising over the pairs makes the reported
  // number a maximum over a feasible set, which removing a card can only
  // shrink (§10.10 item 3). `evals` is sorted by u then id, so a tie still
  // keeps the same primary the greedy rule picked.
  const pairs = evals.map((e) => {
    const second = evals.find((o) => o !== e
      && ![...o.recipe.criticalNames].some((n) => e.recipe.criticalNames.has(n)));
    return { e, second, value: 0.85 * e.u + 0.15 * Math.max(second?.u ?? 0, e.u * protect) };
  });
  const pair = pairs.reduce((a, b) => (b.value > a.value + 1e-12 ? b : a));
  const best = pair.e;
  const secondDisjoint = pair.second;
  const u1 = best.u;

  const score = 100 * pair.value;
  const backup = secondDisjoint
    ? `independent backup ${secondDisjoint.recipe.label} u=${secondDisjoint.u.toFixed(2)}`
    : `shared bottleneck, protection access ${Math.round(protect * 100)}%`;
  const missing = u1 === 0 ? 'no line reaches its access target in 12 turns' : 'none';
  // The plan S reads is the best line the deck ASSEMBLES, not the best line
  // full stop: a cEDH list whose Thoracle package is out-scored for W by its
  // own "control inevitability" reading is still built around the combo, and
  // without this it had no recipe to be read by and fell back to a generic
  // one. `evals` is already sorted by u, so the first hit is the best of them.
  // W's own score still comes from `best` - this only exposes the line.
  const lineOf = (e: typeof evals[number]): ClosingLine => ({
    id: e.recipe.id,
    label: e.recipe.label,
    // The pieces are the line's critical cards, not every pool member: a
    // tutor bought into a piece pool for ACCESS is support, and the closing
    // plan has a `tutors` role that prices it. Folding tutors into `pieces`
    // both overfills that role and starves the one they belong to.
    pieces: [...e.recipe.criticalNames],
    required: e.recipe.pools.reduce((sum, pool) => sum + poolR(pool), 0),
    cost: e.recipe.pools.reduce((sum, pool) => sum + poolCost(pool), 0) + e.recipe.extraCost,
    tStar: e.atTurn || horizonFor(format),
    trace: e.recipe.trace,
  });
  const assembled = evals.filter((e) => e.recipe.id.startsWith('combo:') || e.recipe.id === 'alt_win');
  const assembling = assembled[0];
  const closing: ClosingLine | null = assembling ? lineOf(assembling) : null;
  // §9.5 "admit complete compatible backup lines from the bounded <= 8-recipe
  // catalogue": a line is admitted only when it is COMPLETE — every pool has
  // its members — and reaches the same access target W already holds it to.
  // `evals` is capped at 8 recipes upstream, so the catalogue bound holds.
  //
  // MEASURED, stage 4a, NOT FIXED HERE. The ROOT line is deliberately NOT held
  // to that bar, and holding it there was tried and reverted. One alternate-win
  // card drawn into a 99-card negative control gives a single-member pool that
  // is complete by construction and reads EXACTLY like a real one: Katsumasa
  // control sample 372715497 alt_win access 14% u=0.94 against
  // `cedhtop16-ballooncon6` alt_win access 14% u=0.95. `access >=
  // winAccessTarget` on the root removes both — Ballooncon loses its closing
  // plan (S 85 -> 50.5, total 88 -> 60) and an anchor with it.
  // The closing PLAN already separates them correctly (Ballooncon S 85 vs the
  // pile's S 2.2, weakest `tutors 1/2`); the residue is that `combo` alone
  // still answers to `Q_BASELINE` = .30 while every other recipe moved to the
  // measured .574, so a fit of .022 beats ten recipes pinned at 0. §9.5's
  // reason for .30 was "the pile read stays 0/200"; at 1/200 that has expired,
  // and the fix is a closing floor measured the same way (stage 4b), not a
  // filter that costs the anchor.
  const closingLines = assembled
    .filter((e) => e.access >= norms.winAccessTarget && e.recipe.pools.every((pool) => pool.members.length >= poolR(pool)))
    .map(lineOf);
  return {
    score,
    closing,
    closingLines,
    reason: `${best.recipe.label}: closes T${best.atTurn || horizonFor(format)}, access ${Math.round(best.access * 100)}% (u=${u1.toFixed(2)}); ${backup}; ${missing}.`,
  };
}
