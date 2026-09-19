/**
 * Deck Score v1 — Win access & redundancy (W). docs/DECK_SCORE_SPEC.md §1 W.
 *
 * // ponytail: this is the brief's explicitly-sanctioned v1 recipe catalogue
 * // (6 families instead of a versioned combo/plan database) and a "sum of
 * // pool costs <= turn-t mana, one land drop/turn + flat ramp credit"
 * // readiness proxy instead of the spec's 12-turn/8-step scheduler with
 * // colored-mana tie-breaking and summoning-sickness bookkeeping. Both are
 * // named in the brief (deck-score-core-2026-09-19.md scope item 3) as the
 * // accepted v1 simplification; upgrade path is the full scheduler in a v2.
 */
import { COMBO_PAIRS } from './win-conditions';
import { clip, H, buildDisjointAccessPolynomial, readAccessAt, drawSampleSizes, type Pool } from './deck-score-math';
import { gameShape, type FormatNorms, type ScoreFormat } from './deck-score-norms';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import type { CardFeature } from './deck-score-features';
import type { Archetype } from './deck-templates';

/** `guaranteed` = in the command zone: always accessible, never in the library. */
interface Member { name: string; cmc: number; quantity: number; guaranteed?: boolean }
interface RecipePool { members: Member[]; r: number }
interface Recipe { id: string; label: string; pools: RecipePool[]; extraCost: number; criticalNames: Set<string> }

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
 * S1 W: "action costs upper-bound every eligible member/path". The `r` copies
 * this pool actually supplies are drawn at random from all `K` members, so the
 * cost that bounds the line is the `r` DEAREST members, not the `r` cheapest.
 * Taking the cheapest let a pool claim its bargain member's timing while
 * `J_l` counted every member's access - "never attach the cheapest tutor's
 * timing to a pool containing slower tutors".
 */
/**
 * Mana for the `r` copies this pool must supply: every guaranteed commander
 * slot it consumes (cast from the command zone, not drawn) plus the cheapest
 * remaining library copies.
 *
 * // ponytail: those cheapest remaining copies are a LOWER bound, where §1 W
 * // asks costs to "upper-bound every eligible member/path". Charging the
 * // dearest instead is only sound once every pool is split into cost bins the
 * // way `creaturePressureRecipes` now is; applied to the hand-built
 * // heterogeneous pools (drain outlets, fodder) it bills one 6-drop outlet's
 * // mana to a pool whose other eleven members cost 1-2, and zeroes every
 * // curated deck (measured). Upgrade path is per-pool cost-bin variants, not
 * // a different sort order here.
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

// ── Recipe candidate builders — one per §1 W catalogue family ──────────────

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
  return out.sort((x, y) => (poolCost(x.pools[0]) + poolCost(x.pools[1])) - (poolCost(y.pools[0]) + poolCost(y.pools[1]))).slice(0, 3);
}

/** Attack steps the goldfish proxy assumes a board gets before the finish. */
const PRESSURE_ATTACK_STEPS = 3;
/** S1 W "bounded cost/output bins" - the power floors the variants split on. */
const PRESSURE_POWER_BINS = [1, 2, 3, 4, 5, 6, 8];

/**
 * S1 W: "Pools use bounded cost/output bins: action costs upper-bound every
 * eligible member/path, and outputs lower-bound them. Split faster or stronger
 * alternatives into catalogue variants."
 *
 * The previous single pool credited the AVERAGE power of every creature in the
 * deck while `poolCost` charged the cheapest members' mana - an output upper
 * bound paired with a cost lower bound. A random legal pile therefore bought a
 * fast clock with 25 unrelated creatures. Each variant here keeps only
 * creatures at or above one power floor, so the pool's credited output is its
 * WEAKEST member; the best-scoring variant wins in `computeWin`.
 */
function creaturePressureRecipes(nonLand: DeckEntry[], commanders: CardFeature[], lifeToRemoveAllOpponents: number): Recipe[] {
  const isBody = (f: CardFeature) => f.power != null && f.s >= 1 && /\bCreature\b/.test(f.card.type_line || '');
  const creatures = nonLand.filter((e) => isBody(e.feature));
  const out: Recipe[] = [];
  for (const minPower of PRESSURE_POWER_BINS) {
    const lib = creatures.filter((e) => (e.feature.power || 0) >= minPower);
    const cmd = commanderMembers(commanders, (f) => isBody(f) && (f.power || 0) >= minPower);
    const K = lib.reduce((s, e) => s + e.quantity, 0) + cmd.length;
    if (K === 0) continue;
    const r = Math.max(1, Math.ceil(lifeToRemoveAllOpponents / (minPower * PRESSURE_ATTACK_STEPS)));
    if (r > K) continue;
    out.push({
      id: `combat_wide:p${minPower}`,
      label: `Creature pressure (${r} x power>=${minPower})`,
      pools: [{ members: [...cmd, ...lib.map((e) => toMember(e.feature, e.quantity))], r }],
      extraCost: 0,
      criticalNames: new Set([...cmd.map((m) => m.name), ...lib.map((e) => e.feature.card.name)]),
    });
  }
  return out;
}

function voltronRecipe(commanders: CardFeature[], nonLand: DeckEntry[]): Recipe | null {
  if (commanders.length !== 1) return null; // partners split combat damage across two bodies — not modeled in v1
  const commander = commanders[0];
  const pumpCards = nonLand.filter((e) => e.feature.isEquipmentOrAura);
  if (pumpCards.length === 0) return null;
  const commanderPower = commander.power || 0;
  const neededPump = Math.max(1, 21 - commanderPower);
  const r = Math.max(1, Math.ceil(neededPump / 3)); // ~+3 power assumed per equipment/aura
  const pools: RecipePool[] = [{ members: pumpCards.map((e) => toMember(e.feature, e.quantity)), r }];
  const criticalNames = new Set([commander.card.name, ...pumpCards.map((e) => e.feature.card.name)]);
  if (!commander.hasEvasion) {
    const evasionSources = nonLand.filter((e) => e.feature.hasEvasion && (e.feature.isEquipmentOrAura || e.feature.categories.includes('protection')));
    if (evasionSources.length > 0) {
      pools.push({ members: evasionSources.map((e) => toMember(e.feature, e.quantity)), r: 1 });
      for (const e of evasionSources) criticalNames.add(e.feature.card.name);
    }
  }
  return { id: 'combat_tall', label: 'Voltron commander damage', pools, extraCost: 1, criticalNames };
}

function drainRecipe(nonLand: DeckEntry[], commanders: CardFeature[]): Recipe | null {
  const isFodder = (f: CardFeature) => f.isTokenProducer || (f.c <= 2 && /\bCreature\b/.test(f.card.type_line || ''));
  const pick = (pred: (f: CardFeature) => boolean): Member[] => [
    ...commanderMembers(commanders, pred),
    ...nonLand.filter((e) => pred(e.feature)).map((e) => toMember(e.feature, e.quantity)),
  ];
  const outlets = pick((f) => f.isSacOutlet);
  const payoffs = pick((f) => f.isDrainPayoff);
  const fodder = pick(isFodder);
  if (outlets.length === 0 || payoffs.length === 0) return null;
  const pools: RecipePool[] = [{ members: outlets, r: 1 }, { members: payoffs, r: 1 }];
  if (fodder.length > 0) {
    const fodderQty = fodder.reduce((s, m) => s + m.quantity, 0);
    pools.push({ members: fodder, r: Math.min(3, fodderQty) });
  }
  const names = [...outlets, ...payoffs, ...fodder].map((m) => m.name);
  return { id: 'drain', label: 'Aristocrats drain', pools, extraCost: 1, criticalNames: new Set(names) };
}

function tokenConversionRecipe(nonLand: DeckEntry[], commanders: CardFeature[], lifeToRemoveAllOpponents: number): Recipe | null {
  const pick = (pred: (f: CardFeature) => boolean): Member[] => [
    ...commanderMembers(commanders, pred),
    ...nonLand.filter((e) => pred(e.feature)).map((e) => toMember(e.feature, e.quantity)),
  ];
  const producers = pick((f) => f.isTokenProducer);
  const anthems = pick((f) => f.isAnthemOrOverrun);
  if (producers.length === 0 || anthems.length === 0) return null;
  const tokensNeeded = Math.max(2, Math.ceil(lifeToRemoveAllOpponents / 6)); // ~2 power/token, 3 attack steps
  const r = Math.max(1, Math.ceil(tokensNeeded / 2));
  const names = [...producers, ...anthems].map((m) => m.name);
  return {
    id: 'tokens',
    label: 'Token conversion',
    pools: [{ members: producers, r }, { members: anthems, r: 1 }],
    extraCost: 0,
    criticalNames: new Set(names),
  };
}

function altWinRecipe(nonLand: DeckEntry[], commanders: CardFeature[]): Recipe | null {
  const altWin: Member[] = [
    ...commanderMembers(commanders, (f) => f.isAltWin),
    ...nonLand.filter((e) => e.feature.isAltWin).map((e) => toMember(e.feature, e.quantity)),
  ];
  if (altWin.length === 0) return null;
  return {
    id: 'alt_win',
    label: 'Alternate win condition',
    pools: [{ members: altWin, r: 1 }],
    extraCost: 2,
    criticalNames: new Set(altWin.map((m) => m.name)),
  };
}

function buildRecipes(
  format: ScoreFormat,
  nonLand: DeckEntry[],
  commanders: CardFeature[],
  lifeToRemoveAllOpponents: number,
): Recipe[] {
  const all = [...nonLand, ...commanders.map((f) => ({ feature: f, quantity: 1, guaranteed: true }))];
  const recipes: Recipe[] = [...findComboRecipes(all)];
  recipes.push(...creaturePressureRecipes(nonLand, commanders, lifeToRemoveAllOpponents));
  if (format === 'commander') {
    const voltron = voltronRecipe(commanders, nonLand);
    if (voltron) recipes.push(voltron);
  }
  const drain = drainRecipe(nonLand, commanders);
  if (drain) recipes.push(drain);
  const tokens = tokenConversionRecipe(nonLand, commanders, lifeToRemoveAllOpponents);
  if (tokens) recipes.push(tokens);
  const altWin = altWinRecipe(nonLand, commanders);
  if (altWin) recipes.push(altWin);
  return recipes.slice(0, 8); // §1 W: "Retain at most 8 recipes"
}

function rampBonusFor(nonLand: DeckEntry[]): number {
  return Math.min(3, nonLand.filter((e) => e.feature.isRamp && e.feature.c <= 3).reduce((s, e) => s + e.quantity, 0));
}
function availableManaAtTurn(t: number, rampBonus: number): number {
  return t + (t >= 3 ? rampBonus : 0);
}

interface RecipeEval { recipe: Recipe; u: number; atTurn: number; access: number }

function evaluateRecipe(format: ScoreFormat, norms: FormatNorms, N: number, recipe: Recipe, rampBonus: number): RecipeEval {
  const pools: Pool[] = recipe.pools.map((p) => ({ K: poolK(p), r: poolR(p) }));
  const poly = buildDisjointAccessPolynomial(N, pools);
  const totalCost = recipe.pools.reduce((s, p) => s + poolCost(p), 0) + recipe.extraCost;
  let best: RecipeEval = { recipe, u: 0, atTurn: 0, access: 0 };
  for (let t = 1; t <= 12; t++) {
    const ready = totalCost <= availableManaAtTurn(t, rampBonus) ? 1 : 0;
    if (!ready) continue;
    const ns = drawSampleSizes(format, t);
    const access = ns.reduce((s, n) => s + readAccessAt(poly, N, n), 0) / ns.length;
    const decay = Math.pow(2, -Math.max(0, t - norms.fastClosingTurn) / norms.delayHalfLifeTurns);
    const u = ready * clip(access / norms.winAccessTarget) * decay;
    if (u > best.u) best = { recipe, u, atTurn: t, access };
  }
  return best;
}

/** `u1`, `u2`, `protect` -> Win access & redundancy (W), §1. */
export function computeWin(
  format: ScoreFormat,
  norms: FormatNorms,
  archetype: Archetype,
  N: number,
  mainEntries: DeckEntry[],
  commanders: CardFeature[],
): ComponentOutput {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  // S1 W: "A finish predicate must defeat EVERY remaining opponent: 3x40
  // combat damage ... 25/20 life in Brawl/Standard." The previous code passed
  // ONE opponent's life total, so a Commander combat line only had to deal 40 -
  // a third of the damage the spec requires. That is what let a random legal
  // pile buy a clock the curated decks could not beat.
  const shape = gameShape(format);
  const lifeToRemoveAllOpponents = shape.lifePerOpponent * Math.max(1, shape.players - 1);
  const recipes = buildRecipes(format, nonLand, commanders, lifeToRemoveAllOpponents);

  if (recipes.length === 0) {
    return { score: 0, reason: 'no supported closing line: access 0% by T0, none; no catalogued win recipe present.' };
  }

  const rampBonus = rampBonusFor(nonLand);
  const evals = recipes.map((r) => evaluateRecipe(format, norms, N, r, rampBonus));
  evals.sort((a, b) => b.u - a.u);
  const best = evals[0];
  const secondDisjoint = evals.find((e) => e !== best && ![...e.recipe.criticalNames].some((n) => best.recipe.criticalNames.has(n)));
  const u1 = best.u;
  const u2 = secondDisjoint?.u ?? 0;

  const protectPool = mainEntries.filter((e) => !e.feature.isLand && e.feature.isProtection && e.feature.c <= 2);
  const Kprotect = protectPool.reduce((s, e) => s + e.quantity, 0);
  const ns = drawSampleSizes(format, norms.fastClosingTurn);
  const protect = clip(ns.reduce((s, n) => s + H(N, Kprotect, n, 1), 0) / ns.length / 0.70);

  const score = 100 * (0.85 * u1 + 0.15 * Math.max(u2, u1 * protect));
  const backup = secondDisjoint ? `independent backup: ${secondDisjoint.recipe.label}` : `shared bottleneck, protection access ${Math.round(protect * 100)}%`;
  const missing = u1 === 0 ? 'no line reaches its access target within 12 turns under available mana' : 'none';
  return {
    score,
    reason: `${best.recipe.label}: access ${Math.round(best.access * 100)}% by T${best.atTurn || 12}, ${backup}; ${missing}.`,
  };
}
