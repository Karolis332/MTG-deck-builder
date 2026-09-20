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

/** Total expected damage the same schedule reaches by `MAX_TURN` — the number
 * that explains a null `closingTurn`. Diagnostics only. */
export function combatCeiling(
  format: ScoreFormat, N: number, sources: readonly Source[], rampBonus: number,
): number {
  let cumulative = 0;
  for (let t = 2; t <= MAX_TURN; t++) {
    const mana = availableManaAtTurn(t - 1, rampBonus);
    const seen = Math.min(1, Hf(format, N, 1, t - 1, 1));
    for (const s of sources) {
      if (s.guaranteed) { if (Math.ceil(s.cmc) <= t) cumulative += s.output; }
      else if (s.cmc <= mana) cumulative += s.quantity * seen * s.output;
    }
  }
  return cumulative;
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
  // Zero-output members are not threats and must not SIZE the line either: one
  // 0/0 Walking Ballista sorted first made `mean` 0 and returned null, deleting
  // every combat recipe the deck had (`the-cabbage-merchant`, W = 0 with a
  // 205-damage schedule behind it).
  const byCost = [...members].filter((m) => m.output > 0).sort((a, b) => a.cmc - b.cmc || b.output - a.output);
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

export interface PressureOutput { recipes: Recipe[]; bodies: Source[]; converted: Source[] }

function pressureRecipes(
  format: ScoreFormat, N: number, nonLand: DeckEntry[], commanders: CardFeature[],
  rampBonus: number, target: number, poolSizeCap: number,
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
  const pressure = scheduleRecipe('combat_wide', (r) => `Creature pressure (${r} threats)`,
    format, N, bodies, verifiedBodies, [], rampBonus, target, poolSizeCap);
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
  const tokenMakers = producerEntries((f) => f.isCreatureTokenProducer);
  const foodMakers = converters.length > 0
    ? producerEntries((f) => isFoodLike(f) && !f.isCreatureTokenProducer)
    : [];
  const producers = [...tokenMakers, ...foodMakers];
  if (producers.length > 0) {
    // ponytail: a flat 2 power per producer per turn, the v1 assumption kept.
    // Upgrade path is a curated per-card token table.
    const isCommanderProducer = (e: DeckEntry) => commanders.includes(e.feature);
    const converted: Source[] = [
      ...bodies,
      ...producers.map((e) => sourceOf(e.feature, e.quantity, producerOutput(e.feature), isCommanderProducer(e))),
    ];
    const verifiedConverted = [
      ...verifiedBodies,
      ...producers.filter((e) => e.feature.s >= 1)
        .map((e) => toMember(e.feature, e.quantity, isCommanderProducer(e))),
    ];
    const extra: RecipePool[] = foodMakers.length > 0 ? [{ members: converters, r: 1 }] : [];
    const tokens = scheduleRecipe('tokens', (r) => `Token/Food conversion (${r} bodies)`,
      format, N, converted, verifiedConverted, extra, rampBonus, target, poolSizeCap);
    if (tokens) out.push(tokens);
    return { recipes: out, bodies, converted };
  }
  return { recipes: out, bodies, converted: bodies };
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
  // §8: the exemption needs a DURABLE advantage engine - something that keeps
  // producing - not a stack of one-shot draw spells. Counting `D >= D*` as an
  // alternative let a Food midrange list with six fat creatures read as
  // "Control inevitability" (cabbage-cedh-input, score 73 in a 35-50 band).
  if (!totals.hasDrawEngine) return null;
  // …and stabilisation means answers that are actually up early: §8's "E >= E*
  // with >= 2 cheap answers by T3".
  const cheapAnswers = nonLand
    .filter((e) => e.feature.answerAxes.length > 0 && e.feature.c <= 3 && e.feature.s >= 1)
    .reduce((sum, e) => sum + e.quantity, 0);
  if (cheapAnswers < 2) return null;
  const durable = Math.min(clip(totals.E / totals.Estar), clip(totals.D / totals.Dstar));
  if (durable <= 0) return null;

  // §8: a control deck closes with planeswalkers, repeatable damage/draw
  // engines, manlands and typed "you win" permanents as readily as with a fat
  // body - a creatureless list had NO finisher pool at all and returned W = 0.
  const isFinisher = (f: CardFeature) =>
    (f.power != null && f.power >= 4) ||
    /\bPlaneswalker\b/.test(f.card.type_line || '') ||
    f.isAltWin ||
    f.isCreatureTokenProducer ||
    RE_MANLAND.test(f.card.oracle_text || '') ||
    (f.isDrawEngine && f.isDrainPayoff) ||
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

/** Diagnostic twin of `computeWin`: every recipe it built, with pool sizes,
 * t* and u. Scripts only — the scorer never calls it. */
export function winDiagnostic(
  format: ScoreFormat, norms: FormatNorms, archetype: Archetype, N: number,
  mainEntries: DeckEntry[], commanders: CardFeature[], totals: WinTotals,
): string {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  const shape = gameShape(format);
  const opponents = Math.max(1, shape.players - 1);
  const combatTarget = shape.lifePerOpponent * opponents;
  const rampBonus = rampBonusFor(nonLand);
  const all = [...nonLand, ...commanders.map((f) => ({ feature: f, quantity: 1, guaranteed: true }))];
  const recipes: Recipe[] = [...findComboRecipes(all)];
  const pressure = pressureRecipes(format, N, nonLand, commanders, rampBonus, combatTarget, norms.poolSizeCap);
  recipes.push(...pressure.recipes);
  const drain = drainRecipe(format, N, nonLand, commanders, rampBonus, shape.lifePerOpponent, norms.poolSizeCap);
  if (drain) recipes.push(drain);
  const voltron = voltronRecipe(format, N, nonLand, commanders, rampBonus, opponents);
  if (voltron) recipes.push(voltron);
  const altWin = altWinRecipe(nonLand, commanders);
  if (altWin) recipes.push(altWin);
  const control = controlRecipe(format, norms, N, nonLand, commanders, totals);
  if (control) recipes.push(control.recipe);
  const lines = [
    `combat ceiling by T12: bodies ${combatCeiling(format, N, pressure.bodies, rampBonus).toFixed(1)}, with conversion ${combatCeiling(format, N, pressure.converted, rampBonus).toFixed(1)} (target ${combatTarget})`,
    `N=${N} target=${combatTarget} ramp=${rampBonus.toFixed(2)} E=${totals.E.toFixed(1)}/${totals.Estar.toFixed(1)} D=${totals.D.toFixed(1)}/${totals.Dstar.toFixed(1)} engine=${totals.hasDrawEngine}`,
    `recipes built: ${recipes.length}`,
    '| recipe | pools (members x r) | t* | u |',
    '|---|---|---:|---:|',
  ];
  for (const r of recipes) {
    const e = control && r.id === 'control'
      ? { recipe: r, u: control.u, atTurn: 8, access: control.access }
      : evaluateRecipe(format, norms, N, r, rampBonus);
    const pools = r.pools.map((pl) => `${pl.members.length}x r${pl.r}`).join(' + ');
    lines.push(`| ${r.label} | ${pools} | ${e.atTurn || r.tStar || '-'} | ${e.u.toFixed(3)} |`);
  }
  return lines.join(String.fromCharCode(10));
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
  // §1 W: "A finish predicate must defeat EVERY remaining opponent: 3x40 combat
  // damage or 21 commander damage to EACH opponent in Commander, 25/20 life in
  // Brawl/Standard."
  const shape = gameShape(format);
  const opponents = Math.max(1, shape.players - 1);
  const combatTarget = shape.lifePerOpponent * opponents;
  const rampBonus = rampBonusFor(nonLand);

  const all = [...nonLand, ...commanders.map((f) => ({ feature: f, quantity: 1, guaranteed: true }))];
  const recipes: Recipe[] = [...findComboRecipes(all)];

  recipes.push(...pressureRecipes(format, N, nonLand, commanders, rampBonus, combatTarget, norms.poolSizeCap).recipes);
  const drain = drainRecipe(format, N, nonLand, commanders, rampBonus, shape.lifePerOpponent, norms.poolSizeCap);
  if (drain) recipes.push(drain);
  const voltron = voltronRecipe(format, N, nonLand, commanders, rampBonus, opponents);
  if (voltron) recipes.push(voltron);
  const altWin = altWinRecipe(nonLand, commanders);
  if (altWin) recipes.push(altWin);
  const control = controlRecipe(format, norms, N, nonLand, commanders, totals);
  if (control) recipes.push(control.recipe);

  if (recipes.length === 0) {
    return { score: 0, closing: null, closingLines: [], reason: 'no supported closing line: no catalogued win recipe present; t* never reached within 12 turns.' };
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
  // The plan S reads is the best line the deck ASSEMBLES, not the best line
  // full stop: a cEDH list whose Thoracle package is out-scored for W by its
  // own "control inevitability" reading is still built around the combo, and
  // without this it had no recipe to be read by and fell back to a generic
  // one. `evals` is already sorted by u, so the first hit is the best of them.
  // W's own score still comes from `best` - this only exposes the line.
  const lineOf = (e: typeof evals[number]): ClosingLine => ({
    id: e.recipe.id,
    label: e.recipe.label,
    pieces: e.recipe.pools.flatMap((pool) => pool.members.map((m) => m.name)),
    required: e.recipe.pools.reduce((sum, pool) => sum + poolR(pool), 0),
    cost: e.recipe.pools.reduce((sum, pool) => sum + poolCost(pool), 0) + e.recipe.extraCost,
    tStar: e.atTurn || MAX_TURN,
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
    reason: `${best.recipe.label}: closes T${best.atTurn || MAX_TURN}, access ${Math.round(best.access * 100)}% (u=${u1.toFixed(2)}); ${backup}; ${missing}.`,
  };
}
