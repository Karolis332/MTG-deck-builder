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
import { COMBO_PAIRS } from './win-conditions';
import { clip, H, Hf, buildDisjointAccessPolynomial, readAccessAt, drawSampleSizes, type Pool } from './deck-score-math';
import { gameShape, type FormatNorms, type ScoreFormat } from './deck-score-norms';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import type { CardFeature } from './deck-score-features';
import type { Archetype } from './deck-templates';

/** `guaranteed` = in the command zone: always accessible, never in the library. */
interface Member { name: string; cmc: number; quantity: number; guaranteed?: boolean }
interface RecipePool { members: Member[]; r: number }
interface Recipe {
  id: string;
  label: string;
  pools: RecipePool[];
  extraCost: number;
  criticalNames: Set<string>;
  /** Closing turn from an output schedule. Set = skip the mana-readiness scan. */
  tStar?: number;
}

const MAX_TURN = 12;

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

function rampBonusFor(nonLand: DeckEntry[]): number {
  return Math.min(3, nonLand.filter((e) => e.feature.isRamp && e.feature.c <= 3).reduce((s, e) => s + e.quantity, 0));
}

/** One land drop per turn plus catalogued cheap ramp, online from turn 3. */
function availableManaAtTurn(t: number, rampBonus: number): number {
  return t + (t >= 3 ? rampBonus : 0);
}

// ── The output schedule ───────────────────────────────────────────────────

/** A permanent that deals `output` damage per combat/turn once it is online. */
interface Source { name: string; cmc: number; quantity: number; guaranteed: boolean; output: number }

function sourceOf(feature: CardFeature, quantity: number, output: number, guaranteed = false): Source {
  return { name: feature.card.name, cmc: feature.c, quantity, guaranteed, output };
}

/**
 * `E[output at τ] = Σ_i q_i · P(card i seen by τ−1) · [c_i castable by τ−1] · output_i`,
 * `D(t) = Σ_{τ=2..t} E[output at τ]`, `t* = min t ≤ 12 : D(t) ≥ target`.
 *
 * Attacks start on turn 2; a card cast on τ−1 contributes on τ (summoning
 * sickness). Commanders are always accessible, so only mana gates them, from
 * turn `ceil(c)`.
 */
function closingTurn(
  format: ScoreFormat, N: number, sources: readonly Source[], rampBonus: number, target: number,
): number | null {
  if (target <= 0 || sources.length === 0 || N <= 0) return null;
  let cumulative = 0;
  for (let t = 2; t <= MAX_TURN; t++) {
    const mana = availableManaAtTurn(t - 1, rampBonus);
    // P(one specific copy is among the cards seen by turn t−1) = n(t−1)/N.
    const seen = Math.min(1, Hf(format, N, 1, t - 1, 1));
    let perTurn = 0;
    for (const s of sources) {
      if (s.guaranteed) {
        if (Math.ceil(s.cmc) <= t) perTurn += s.output;
      } else if (s.cmc <= mana) {
        perTurn += s.quantity * seen * s.output;
      }
    }
    cumulative += perTurn;
    if (cumulative >= target) return t;
  }
  return null;
}

/** Attack steps available by `t*` — combat starts on turn 2. */
function combatsBy(tStar: number): number {
  return Math.max(1, tStar - 1);
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
function requiredCopies(
  members: readonly Source[], target: number, combats: number, poolSizeCap: number,
): number | null {
  const byCost = [...members].sort((a, b) => a.cmc - b.cmc || b.output - a.output);
  const units: Source[] = [];
  for (const m of byCost) for (let i = 0; i < m.quantity; i++) units.push(m);
  if (units.length === 0) return null;
  const cap = Math.min(poolSizeCap, units.length);
  // `r` appears on both sides ("the r cheapest"), so iterate to a fixed point,
  // then CLAMP at 6. Clamping is the point: beyond six copies the pool stops
  // being an access proxy. Failing instead of clamping killed every Commander
  // pressure line, since 120 damage over 11 combats wants 8+ small bodies.
  let r = 1;
  for (let iter = 0; iter < cap; iter++) {
    const mean = units.slice(0, r).reduce((sum, m) => sum + m.output, 0) / r;
    if (mean <= 0) return null;
    const next = Math.min(cap, Math.max(1, Math.ceil(target / (combats * mean))));
    if (next === r) break;
    r = next;
  }
  return r;
}

// ── Recipe families ───────────────────────────────────────────────────────

const RE_REPEATABLE_DAMAGE = /deals? (\d+) damage to (?:each opponent|any target|target player|target opponent)/i;
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

function pickMembers(
  nonLand: DeckEntry[], commanders: CardFeature[], pred: (f: CardFeature) => boolean,
): Member[] {
  return [
    ...commanderMembers(commanders, pred),
    ...nonLand.filter((e) => pred(e.feature)).map((e) => toMember(e.feature, e.quantity)),
  ];
}

function findComboRecipes(all: Array<{ feature: CardFeature; quantity: number; guaranteed?: boolean }>): Recipe[] {
  const byName = new Map<string, { feature: CardFeature; quantity: number; guaranteed?: boolean }>();
  for (const e of all) byName.set(e.feature.card.name.toLowerCase(), e);
  const out: Recipe[] = [];
  for (const [a, b] of COMBO_PAIRS) {
    const ea = byName.get(a.toLowerCase());
    const eb = byName.get(b.toLowerCase());
    if (!ea || !eb) continue;
    out.push({
      id: `combo:${a}+${b}`,
      label: `${a} + ${b}`,
      pools: [
        { members: [toMember(ea.feature, ea.quantity, ea.guaranteed)], r: 1 },
        { members: [toMember(eb.feature, eb.quantity, eb.guaranteed)], r: 1 },
      ],
      extraCost: 1,
      criticalNames: new Set([a, b]),
    });
  }
  return out
    .sort((x, y) => (poolCost(x.pools[0]) + poolCost(x.pools[1])) - (poolCost(y.pools[0]) + poolCost(y.pools[1])))
    .slice(0, 3);
}

/**
 * (1) Creature pressure, and (4) token/Food conversion folded into the same
 * schedule: a converter turns each producer into an attacking body, so §1 W's
 * "Food is not a creature without a conversion effect" is satisfied by the
 * converter's presence, not assumed.
 */
function scheduleRecipe(
  id: string, label: (r: number, t: number) => string, format: ScoreFormat, N: number,
  sources: Source[], verified: Member[], extraPools: RecipePool[], rampBonus: number, target: number,
  poolSizeCap: number,
): Recipe | null {
  if (sources.length === 0 || verified.length === 0) return null;
  const tStar = closingTurn(format, N, sources, rampBonus, target);
  if (tStar === null) return null;
  const r = requiredCopies(sources, target, combatsBy(tStar), poolSizeCap);
  if (r === null) return null;
  const pools: RecipePool[] = [{ members: verified, r }, ...extraPools];
  return {
    id, label: label(r, tStar), pools, extraCost: 0, tStar,
    criticalNames: new Set([...sources.map((s) => s.name), ...extraPools.flatMap((p) => p.members.map((m) => m.name))]),
  };
}

function pressureRecipes(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  rampBonus: number, target: number, poolSizeCap: number,
): Recipe[] {
  const bodies: Source[] = [
    ...commanders.filter(isBody).map((f) => sourceOf(f, 1, (f.power || 0) * f.s, true)),
    ...nonLand.filter((e) => isBody(e.feature)).map((e) => sourceOf(e.feature, e.quantity, (e.feature.power || 0) * e.feature.s)),
  ];
  const out: Recipe[] = [];
  const verifiedBodies = [
    ...commanderMembers(commanders, (f) => isBody(f) && f.s >= 1),
    ...nonLand.filter((e) => isBody(e.feature) && e.feature.s >= 1).map((e) => toMember(e.feature, e.quantity)),
  ];
  const pressure = scheduleRecipe('combat_wide', (r) => `Creature pressure (${r} threats)`,
    format, N, bodies, verifiedBodies, [], rampBonus, target, poolSizeCap);
  if (pressure) out.push(pressure);

  // (4) Conversion is its OWN variant, never a replacement: a deck with both a
  // creature clock and a token engine must be scored on whichever closes
  // faster, and the converter pool it adds only costs the conversion line
  // access. Producers become damage only when something converts them (S1 W:
  // "Food is not a creature without a conversion effect").
  const isProducer = (f: CardFeature) => f.isTokenProducer || f.isFoodProducer || f.isTreasureProducer;
  const isConverter = (f: CardFeature) =>
    f.isAnthemOrOverrun || f.isFoodPayoff || RE_CONVERTER.test(f.card.oracle_text || '');
  const converters = pickMembers(nonLand, commanders, isConverter);
  const producers = nonLand.filter((e) => isProducer(e.feature) && !isBody(e.feature));
  if (converters.length > 0 && producers.length > 0) {
    // ponytail: a flat 2 power per converted producer, the v1 assumption kept.
    // Upgrade path is a curated per-card token table.
    const converted = [...bodies, ...producers.map((e) => sourceOf(e.feature, e.quantity, 2 * e.feature.s))];
    const verifiedConverted = [
      ...verifiedBodies,
      ...producers.filter((e) => e.feature.s >= 1).map((e) => toMember(e.feature, e.quantity)),
    ];
    const tokens = scheduleRecipe('tokens', (r) => `Token/Food conversion (${r} bodies)`,
      format, N, converted, verifiedConverted, [{ members: converters, r: 1 }], rampBonus, target, poolSizeCap);
    if (tokens) out.push(tokens);
  }
  return out;
}

/**
 * (2) Aristocrats drain. Output per trigger x triggers per turn, cumulative.
 * All-player drain removes every opponent at once, so §1 W's "different output
 * requirements" means the target is ONE opponent's life total, not the pod's.
 */
function drainRecipe(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  rampBonus: number, lifePerOpponent: number, poolSizeCap: number,
): Recipe | null {
  const isFodder = (f: CardFeature) => f.isTokenProducer || (f.c <= 2 && /\bCreature\b/.test(f.card.type_line || ''));
  const outlets = pickMembers(nonLand, commanders, (f) => f.isSacOutlet);
  const payoffs = pickMembers(nonLand, commanders, (f) => f.isDrainPayoff);
  const fodder = pickMembers(nonLand, commanders, isFodder);
  if (outlets.length === 0 || payoffs.length === 0 || fodder.length === 0) return null;

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
  const sources: Source[] = payoffs.map((m) => ({
    name: m.name, cmc: Math.max(m.cmc, cheapestOutlet), quantity: m.quantity,
    guaranteed: !!m.guaranteed, output: triggersPerTurn,
  }));
  const tStar = closingTurn(format, N, sources, rampBonus, lifePerOpponent);
  if (tStar === null) return null;
  const rPayoff = requiredCopies(sources, lifePerOpponent, combatsBy(tStar), poolSizeCap);
  if (rPayoff === null) return null;

  const fodderQty = fodder.reduce((s, m) => s + m.quantity, 0);
  return {
    id: 'drain',
    label: `Aristocrats drain (${triggersPerTurn}/turn, ${rPayoff} payoffs)`,
    pools: [
      { members: outlets, r: 1 },
      { members: payoffs, r: rPayoff },
      { members: fodder, r: Math.min(3, fodderQty) },
    ],
    extraCost: 1,
    criticalNames: new Set([...outlets, ...payoffs, ...fodder].map((m) => m.name)),
    tStar,
  };
}

/**
 * (5) Voltron. 21 commander damage to EACH opponent, dealt sequentially, so the
 * target is 21 x opponents on one body's schedule. Brawl has no commander-damage
 * rule (CR 903.10/903.12), so this family never builds there.
 */
function voltronRecipe(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  rampBonus: number, opponents: number,
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
  const tStar = closingTurn(format, N, sources, rampBonus, 21 * opponents);
  if (tStar === null) return null;

  const pumpMembers = pump.map((e) => toMember(e.feature, e.quantity));
  const r = Math.max(1, Math.ceil((21 - (commander.power || 0)) / 3));
  const pools: RecipePool[] = [{ members: pumpMembers, r: Math.min(r, pumpMembers.length) }];
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

/**
 * (3) Control inevitability. §1 W allows Tfast=6 "only for a validated
 * control/stax recipe that establishes a durable advantage AND retains a
 * supported finisher; ordinary removal density cannot establish this
 * exemption" — hence the conjunction of E/E* and D/D*, and the separate
 * finisher pool.
 */
function controlRecipe(
  format: ScoreFormat, norms: FormatNorms, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  totals: WinTotals,
): { recipe: Recipe; u: number; access: number } | null {
  // The spec's exemption is conditional, not graded: "ordinary removal density
  // cannot establish this exemption". Unless the deck actually MEETS E* and
  // either D* or a repeatable draw engine, there is no control line at all --
  // without this gate every deck with a few removal spells and one cantrip
  // claimed inevitability, random piles included (measured: piles took control
  // as their best line at u=0.16).
  if (totals.E < totals.Estar) return null;
  if (totals.D < totals.Dstar && !totals.hasDrawEngine) return null;
  const durable = Math.min(clip(totals.E / totals.Estar), clip(totals.D / totals.Dstar));
  if (durable <= 0) return null;

  const isFinisher = (f: CardFeature) =>
    (f.power != null && f.power >= 4) ||
    /\bPlaneswalker\b/.test(f.card.type_line || '') ||
    f.isAltWin ||
    Number(RE_REPEATABLE_DAMAGE.exec(f.card.oracle_text || '')?.[1] ?? 0) >= 3;
  const finishers = pickMembers(nonLand, commanders, isFinisher);
  const K = finishers.reduce((s, m) => s + (m.guaranteed ? 0 : m.quantity), 0);
  const guaranteedFinisher = finishers.some((m) => m.guaranteed);
  if (K === 0 && !guaranteedFinisher) return null;

  const CONTROL_TURN = 8;
  const access = guaranteedFinisher ? 1 : Hf(format, N, K, CONTROL_TURN, 1);
  const decay = Math.pow(2, -Math.max(0, CONTROL_TURN - 6) / norms.delayHalfLifeTurns);
  const u = durable * clip(access / norms.winAccessTarget) * decay;
  return {
    u, access,
    recipe: {
      id: 'control',
      label: `Control inevitability (${finishers.length} finishers)`,
      pools: [{ members: finishers, r: 1 }],
      extraCost: 0,
      criticalNames: new Set(finishers.map((m) => m.name)),
      tStar: CONTROL_TURN,
    },
  };
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
  format: ScoreFormat, norms: FormatNorms, N: number, recipe: Recipe, rampBonus: number,
): RecipeEval {
  const pools: Pool[] = recipe.pools.map((p) => ({ K: poolK(p), r: poolR(p) }));
  const poly = buildDisjointAccessPolynomial(N, pools);
  const accessAt = (t: number): number => {
    const ns = drawSampleSizes(format, t);
    return ns.reduce((s, n) => s + readAccessAt(poly, N, n), 0) / ns.length;
  };
  const scoreAt = (t: number, access: number): number =>
    clip(access / norms.winAccessTarget) * Math.pow(2, -Math.max(0, t - norms.fastClosingTurn) / norms.delayHalfLifeTurns);

  if (recipe.tStar != null) {
    const access = accessAt(recipe.tStar);
    return { recipe, u: scoreAt(recipe.tStar, access), atTurn: recipe.tStar, access };
  }

  const totalCost = recipe.pools.reduce((s, p) => s + poolCost(p), 0) + recipe.extraCost;
  let best: RecipeEval = { recipe, u: 0, atTurn: 0, access: 0 };
  for (let t = 1; t <= MAX_TURN; t++) {
    if (totalCost > availableManaAtTurn(t, rampBonus)) continue;
    const access = accessAt(t);
    const u = scoreAt(t, access);
    if (u > best.u) best = { recipe, u, atTurn: t, access };
  }
  return best;
}

/** Raw component totals the control family needs (see deck-score-interaction). */
export interface WinTotals {
  E: number; Estar: number;
  D: number; Dstar: number; hasDrawEngine: boolean;
}

/** `u1`, `u2`, `protect` -> Win access & redundancy (W), §1. */
export function computeWin(
  format: ScoreFormat,
  norms: FormatNorms,
  archetype: Archetype,
  N: number,
  mainEntries: DeckEntry[],
  commanders: CardFeature[],
  totals: WinTotals,
): ComponentOutput {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  // §1 W: "A finish predicate must defeat EVERY remaining opponent: 3x40 combat
  // damage or 21 commander damage to EACH opponent in Commander, 25/20 life in
  // Brawl/Standard."
  const shape = gameShape(format);
  const opponents = Math.max(1, shape.players - 1);
  const combatTarget = shape.lifePerOpponent * opponents;
  const rampBonus = rampBonusFor(nonLand);

  const all = [...nonLand, ...commanders.map((f) => ({ feature: f, quantity: 1, guaranteed: true }))];
  const recipes: Recipe[] = [...findComboRecipes(all)];

  recipes.push(...pressureRecipes(format, N, nonLand, commanders, rampBonus, combatTarget, norms.poolSizeCap));
  const drain = drainRecipe(format, N, nonLand, commanders, rampBonus, shape.lifePerOpponent, norms.poolSizeCap);
  if (drain) recipes.push(drain);
  const voltron = voltronRecipe(format, N, nonLand, commanders, rampBonus, opponents);
  if (voltron) recipes.push(voltron);
  const altWin = altWinRecipe(nonLand, commanders);
  if (altWin) recipes.push(altWin);
  const control = controlRecipe(format, norms, N, nonLand, commanders, totals);
  if (control) recipes.push(control.recipe);

  if (recipes.length === 0) {
    return { score: 0, reason: 'no supported closing line: no catalogued win recipe present; t* never reached within 12 turns.' };
  }

  const evals = recipes.slice(0, 8) // §1 W: "Retain at most 8 recipes"
    .map((r) => (control && r.id === 'control'
      ? { recipe: r, u: control.u, atTurn: 8, access: control.access }
      : evaluateRecipe(format, norms, N, r, rampBonus)));
  evals.sort((a, b) => b.u - a.u || a.recipe.id.localeCompare(b.recipe.id));

  const best = evals[0];
  const secondDisjoint = evals.find((e) => e !== best && ![...e.recipe.criticalNames].some((n) => best.recipe.criticalNames.has(n)));
  const u1 = best.u;
  const u2 = secondDisjoint?.u ?? 0;

  const protectPool = nonLand.filter((e) => e.feature.isProtection && e.feature.c <= 2);
  const Kprotect = protectPool.reduce((s, e) => s + e.quantity, 0);
  const ns = drawSampleSizes(format, norms.fastClosingTurn);
  const protect = clip(ns.reduce((s, n) => s + H(N, Kprotect, n, 1), 0) / ns.length / 0.70);

  const score = 100 * (0.85 * u1 + 0.15 * Math.max(u2, u1 * protect));
  const backup = secondDisjoint
    ? `independent backup ${secondDisjoint.recipe.label} u=${secondDisjoint.u.toFixed(2)}`
    : `shared bottleneck, protection access ${Math.round(protect * 100)}%`;
  const missing = u1 === 0 ? 'no line reaches its access target in 12 turns' : 'none';
  return {
    score,
    reason: `${best.recipe.label}: closes T${best.atTurn || MAX_TURN}, access ${Math.round(best.access * 100)}% (u=${u1.toFixed(2)}); ${backup}; ${missing}.`,
  };
}
