/**
 * Deck Score v1.4 stage 1c — the spellslinger / storm damage family.
 * docs/DECK_SCORE_SPEC.md §9.4 (typed finisher output), §10.6.2 (the W-zero
 * audit), §1 W (families, access, delay decay).
 *
 * Stage 1b's audit found 350 Commander lists (19.2 %) classified `known_absent`
 * and EVERY one of them on `combat_wide.schedule_short`, with Guttersnipe,
 * Coruscation Mage, Grapeshot, Mana Geyser and Torment of Hailfire as the top
 * causes by lift. Those decks are not absent a plan — their damage is a CAST
 * TRIGGER and an X/storm burst, and W only ever counted creature power, walker
 * loyalty, animated lands, activated burn and draw triggers. This module types
 * the missing output:
 *
 *   spell schedule   how many instants/sorceries (and how many noncreature
 *                    spells) the deck actually casts on turn t, from its own
 *                    density, the turn's mana and typed cantrip replacement.
 *   cast triggers    Guttersnipe / Kessig Flamebreather / Electrostatic Field /
 *                    Coruscation Mage / Vivi Ornitier / Kuja: damage per cast,
 *                    a +1/+1 counter per cast, a prowess-style pump per cast.
 *   burst            storm copies (Grapeshot, Tendrils) and X finishers
 *                    (Exsanguinate, Crackle with Power, Fireball, Jaya's) —
 *                    one-shot, priced against the turn's mana plus typed
 *                    rituals, never a default turn.
 *
 * Everything here is an EXPECTATION on the same conditional-goldfish schedule
 * W already runs: no blockers, no interaction, expected copies rather than a
 * sampled distribution. Unknown output proves nothing (§10.2): a ritual whose
 * yield is "for each tapped land your opponents control" adds 0, and Torment of
 * Hailfire's "loses 3 life UNLESS that player sacrifices" is not damage this
 * model can prove, so it supplies none.
 *
 * // ponytail: printed-text parsing weighted by the feature's support
 * // coefficient `s`, exactly as deck-score-finishers.ts already does. Upgrade
 * // path is moving the per-cast readings into the catalogue's `outputBounds`,
 * // not more regexes here.
 */
import { MAX_TURN, MAX_HORIZON, horizonFor, allocateDamage, type DamageUnit, type FinisherOutput } from './deck-score-finishers';
import { drawSampleSizes } from './deck-score-math';
import type { ScoreFormat } from './deck-score-norms';
import type { DeckEntry } from './deck-score-mana';
import type { CardFeature } from './deck-score-features';

/** Every cast-trigger source shares ONE spell expenditure per turn (§9.4
 * "debit shared mana, fodder and life once"): two Guttersnipes fire off the
 * same spells, they do not each buy their own. */
export const SPELL_SHARE_KEY = 'spellslinger';

// ── the spell schedule ────────────────────────────────────────────────────

export interface SpellSchedule {
  /** Expected instants/sorceries cast on own turn t (index = turn). */
  instantSorcery: readonly number[];
  /** Expected noncreature spells cast on own turn t — always >= the above. */
  noncreature: readonly number[];
  /** Cumulative noncreature casts through turn t. */
  cumNoncreature: readonly number[];
  /** Mana those casts consume on turn t — what the schedule debits once. */
  manaSpent: readonly number[];
  /** Extra one-turn mana from typed rituals, expected, by turn t. */
  burstMana: readonly number[];
  /** Section 10.8 item 3: the same series with cantrip replacement switched
   * off. Reported beside `noncreature`, never scored. */
  noncreatureNoReplacement: readonly number[];
  /** Printed ritual copies credited to `burstMana`, and their net yield. */
  ritualCopies: number;
  ritualNetBurst: number;
  /** Library copies of each suite — the access pools are sized from these. */
  instantSorceryCopies: number;
  noncreatureCopies: number;
  meanCmc: number;
  trace: string;
}

/** "Add {R}{R}{R}" / "Add {C}{C}" — a printed, countable mana burst. */
const RE_RITUAL = /(?:^|\n)\s*add ((?:\{[^}]+\}\s*)+)(?:\.|$)/im;
/** "Add {R} for each tapped land your opponents control" — an UNKNOWN yield. */
const RE_UNBOUNDED_RITUAL = /\badd\b[^.\n]*\bfor each\b/i;
const RE_CANTRIP = /draw a card|then draw a card|draw two cards/i;

/** Pips in an `Add {..}{..}` clause: `{C}`/`{R}` = 1, `{2}` = 2. */
function pipsOf(text: string): number {
  let total = 0;
  for (const m of text.matchAll(/\{([^}]+)\}/g)) {
    const n = Number(m[1]);
    total += Number.isFinite(n) ? n : 1;
  }
  return total;
}

/** A card whose printed text adds a countable, bounded burst of mana. */
export function isPrintedRitual(f: CardFeature): boolean {
  const text = f.card.oracle_text || '';
  if (RE_UNBOUNDED_RITUAL.test(text)) return false;
  const m = RE_RITUAL.exec(text);
  return m !== null && pipsOf(m[1]) - f.c > 0;
}

function isInstantOrSorcery(f: CardFeature): boolean {
  return /\b(Instant|Sorcery)\b/.test(f.card.type_line || '');
}

/** A spell that is not a creature spell — what a "noncreature spell" trigger
 * watches for. Lands are not cast at all. */
function isNoncreatureSpell(f: CardFeature): boolean {
  return !f.isLand && !/\bCreature\b/.test(f.card.type_line || '');
}

/** Expected copies of a `K`-copy suite among the cards seen by turn `t`. */
function seenCopies(format: ScoreFormat, N: number, K: number, t: number): number {
  if (N <= 0 || K <= 0) return 0;
  const ns = drawSampleSizes(format, t);
  const n = ns.reduce((s, x) => s + x, 0) / ns.length;
  return Math.min(K, (K * Math.min(n, N)) / N);
}

/** Cards the base draw alone has seen by turn `t`. */
function seenCards(format: ScoreFormat, N: number, t: number): number {
  if (N <= 0) return 0;
  const ns = drawSampleSizes(format, t);
  return Math.min(N, ns.reduce((s, x) => s + x, 0) / ns.length);
}

/** Expected copies of a `K`-copy suite among `seen` cards of an `N`-card deck. */
function copiesAmong(K: number, N: number, seen: number): number {
  if (N <= 0 || K <= 0) return 0;
  return Math.min(K, (K * Math.min(seen, N)) / N);
}

/**
 * Section 10.8 item 3 -- the CANTRIP LEDGER, replacing the old
 * `1/(1 - cantripShare*density)` multiplier.
 *
 * That multiplier was a closed-form branching expectation applied straight to
 * the suite's seen copies and capped at 2. It carried no card ledger: it never
 * spent the cantrip, never bounded the chain by the library, and, being a plain
 * per-turn factor, it let a replacement a turn-12 cast would draw raise the
 * copies a turn-4 cast could choose from. The ledger below is the same effect
 * made finite and causal:
 *
 *   cards seen(t) = base draw(t) + replacements drawn by cantrips ALREADY cast,
 *                   bounded by N -- a cantrip spends its own copy and draws ONE
 *                   card, so seeing one card deeper is all it buys.
 *   casts(t)      = min(mana(t)/meanCmc, copies among the cards seen - cast so
 *                   far) -- a physical copy is cast once, never before it is seen.
 *   replacements  = casts(t) * cantripShare: a replacement is a card drawn at
 *                   the deck's own cantrip density, NOT automatically another
 *                   cantrip. Three passes let this turn's own chain resolve
 *                   inside this turn; nothing is borrowed from a later turn.
 *
 * `withReplacement = false` is the no-replacement diagnostic section 10.8
 * item 3 asks to be published beside the corrected number.
 */
function castSeries(
  format: ScoreFormat, N: number, K: number, meanCmc: number, cantripShare: number,
  manaAt: (t: number) => number, withReplacement = true,
): number[] {
  const out = new Array(MAX_HORIZON + 1).fill(0);
  if (K <= 0 || meanCmc <= 0 || N <= 0) return out;
  const share = withReplacement ? Math.max(0, Math.min(1, cantripShare)) : 0;
  let cast = 0;
  let replacements = 0;
  for (let t = 1; t <= horizonFor(format); t++) {
    const base = seenCards(format, N, t);
    const affordable = manaAt(t) / meanCmc;
    let now = 0;
    let fresh = 0;
    for (let pass = 0; pass < 3; pass++) {
      const seen = Math.min(N, base + replacements + fresh);
      now = Math.max(0, Math.min(affordable, copiesAmong(K, N, seen) - cast));
      fresh = now * share;
    }
    out[t] = now;
    cast += now;
    replacements += fresh;
  }
  return out;
}

/**
 * The deck's own casting schedule. `manaAt` is W's land/ramp curve, passed in
 * so the spell schedule and the damage schedule price the same turn.
 */
export function buildSpellSchedule(
  format: ScoreFormat, N: number, nonLand: readonly DeckEntry[], manaAt: (t: number) => number,
): SpellSchedule {
  const tally = (pred: (f: CardFeature) => boolean): { copies: number; mana: number; cantrips: number } => {
    let copies = 0; let mana = 0; let cantrips = 0;
    for (const e of nonLand) {
      if (!pred(e.feature)) continue;
      copies += e.quantity;
      mana += e.quantity * e.feature.c;
      if (RE_CANTRIP.test(e.feature.card.oracle_text || '')) cantrips += e.quantity;
    }
    return { copies, mana, cantrips };
  };
  const is = tally(isInstantOrSorcery);
  const nc = tally(isNoncreatureSpell);
  const meanIs = is.copies > 0 ? is.mana / is.copies : 0;
  const meanNc = nc.copies > 0 ? nc.mana / nc.copies : 0;

  const instantSorcery = castSeries(format, N, is.copies, meanIs,
    is.copies > 0 ? is.cantrips / is.copies : 0, manaAt);
  const ncCantripShare = nc.copies > 0 ? nc.cantrips / nc.copies : 0;
  const noncreature = castSeries(format, N, nc.copies, meanNc, ncCantripShare, manaAt);
  const noncreatureNoReplacement = castSeries(format, N, nc.copies, meanNc, ncCantripShare, manaAt, false);

  const cumNoncreature = new Array(MAX_HORIZON + 1).fill(0);
  const manaSpent = new Array(MAX_HORIZON + 1).fill(0);
  for (let t = 1; t <= horizonFor(format); t++) {
    cumNoncreature[t] = cumNoncreature[t - 1] + noncreature[t];
    // The noncreature series is the superset; charging it once charges the
    // instant/sorcery casts inside it too.
    manaSpent[t] = Math.min(manaAt(t), noncreature[t] * meanNc);
  }

  // Typed rituals: printed `Add {..}` with a countable yield, net of their own
  // cost. "for each <something an opponent controls>" is unknown output and
  // adds nothing (§10.2). The turn's burst is capped by the mana available to
  // start the chain.
  let netBurst = 0;
  let ritualCopies = 0;
  const ritualNames: string[] = [];
  const unbounded: string[] = [];
  for (const e of nonLand) {
    const text = e.feature.card.oracle_text || '';
    if (RE_UNBOUNDED_RITUAL.test(text)) { unbounded.push(e.feature.card.name); continue; }
    if (!isPrintedRitual(e.feature)) continue;
    // §10.8 item 2: EVERY printed ritual is credited here, once, and W's
    // `rampBonusFor` now excludes all of them, so the two budgets are disjoint
    // by construction rather than by this exclusion. `net` is the printed gross
    // burst minus the copy's own casting cost, i.e. the ritual is paid for.
    const net = pipsOf((RE_RITUAL.exec(text) as RegExpExecArray)[1]) - e.feature.c;
    netBurst += e.quantity * net * e.feature.s;
    ritualCopies += e.quantity;
    ritualNames.push(e.feature.card.name);
  }
  const burstMana = new Array(MAX_HORIZON + 1).fill(0);
  if (netBurst > 0 && N > 0) {
    for (let t = 1; t <= horizonFor(format); t++) {
      const drawnShare = seenCopies(format, N, N, t) / N;
      burstMana[t] = Math.min(manaAt(t), netBurst * drawnShare);
    }
  }

  return {
    instantSorcery, noncreature, cumNoncreature, manaSpent, burstMana,
    noncreatureNoReplacement, ritualCopies, ritualNetBurst: netBurst,
    instantSorceryCopies: is.copies, noncreatureCopies: nc.copies,
    meanCmc: meanNc,
    trace: `${is.copies} instants/sorceries (mean MV ${meanIs.toFixed(1)}), ${nc.copies} noncreature spells`
      + ` (mean MV ${meanNc.toFixed(1)}), casts T4/T8/T12 `
      + `${noncreature[4].toFixed(2)}/${noncreature[8].toFixed(2)}/${noncreature[12].toFixed(2)}`
      + `; no-replacement casts T4/T8/T12 `
      + `${noncreatureNoReplacement[4].toFixed(2)}/${noncreatureNoReplacement[8].toFixed(2)}/${noncreatureNoReplacement[12].toFixed(2)}`
      + `, cantrip share ${ncCantripShare.toFixed(2)}`
      + (ritualNames.length > 0 ? `; ${ritualCopies} ritual copies +${netBurst.toFixed(1)} net (${ritualNames.slice(0, 3).join(', ')})` : '')
      + (unbounded.length > 0 ? `; ${unbounded.length} unbounded ritual(s) counted as 0 (${unbounded.slice(0, 2).join(', ')})` : ''),
  };
}

// ── cast triggers ─────────────────────────────────────────────────────────

/** A printed `Whenever you cast ...` clause, one per oracle line. */
const RE_CAST_TRIGGER = /whenever you cast(?: or copy)? ([^,]{0,60}?)spells?(?:[^,]{0,40})?,\s*(.+)$/i;
const RE_TRIGGER_DAMAGE = /deals? (\d+) damage to (each opponent|any target|target player|target opponent|each player)/i;
const RE_TRIGGER_DRAIN = /each opponent loses (\d+) life/i;
const RE_TRIGGER_COUNTER = /put an? \+1\/\+1 counter on/i;
const RE_TRIGGER_PUMP = /gets \+(\d+)\/\+\d+ until end of turn/i;
/** "create a 1/1 red Elemental creature token" — a body that stays. */
const RE_TRIGGER_TOKEN = /creates? [^.]*?(\d+)\/\d+ [^.]*?creature token/i;
const RE_ONCE = /once each turn|your first (?:spell|instant|noncreature)|only once/i;

export interface CastTrigger {
  /** Damage dealt to the table by ONE cast. */
  perCastDamage: number;
  /** The part of `perCastDamage` that hits EVERY opponent, per opponent. */
  perCastEachOpponent: number;
  /** Power this body gains for the turn from ONE cast (prowess-style). */
  perCastTempPower: number;
  /**
   * Power that STAYS on the board after ONE cast: a +1/+1 counter on this body,
   * or the power of a creature token the trigger creates.
   */
  perCastPermPower: number;
  /** True when the permanent power comes from tokens rather than counters —
   * the token family must not also count this card as a flat producer. */
  makesTokens: boolean;
  suite: 'instant_sorcery' | 'noncreature';
  oncePerTurn: boolean;
  trace: string;
}

/** Can this card's own body carry a pump into combat? A Defender or a card with
 * no printed power gains nothing from +1/+1 counters. */
function canAttack(f: CardFeature): boolean {
  return (f.power ?? 0) >= 0 && f.power != null
    && /\bCreature\b/.test(f.card.type_line || '')
    && !/\bDefender\b/.test(f.card.oracle_text || '');
}

/**
 * Every printed cast trigger on ONE card, summed. `suite` is the widest scope
 * any of its triggers watches: an "instant or sorcery" trigger fires on a
 * strictly smaller set than a "noncreature spell" trigger, and reading the
 * narrower series is the conservative choice.
 */
export function castTriggerOf(f: CardFeature, opponents: number): CastTrigger | null {
  const text = f.card.oracle_text || '';
  if (!/whenever you cast/i.test(text)) return null;
  let damage = 0; let eachOpp = 0; let temp = 0; let perm = 0; let makesTokens = false;
  let suite: 'instant_sorcery' | 'noncreature' = 'instant_sorcery';
  let once = false;
  const why: string[] = [];
  const attacks = canAttack(f);
  for (const line of text.split(/\n+/)) {
    const m = RE_CAST_TRIGGER.exec(line.trim());
    if (!m) continue;
    const scope = m[1].toLowerCase();
    const body = m[2];
    // "an instant or sorcery spell" is the narrow suite; anything else
    // ("a noncreature spell", "a spell", "your first spell") is read as the
    // noncreature series, a lower bound on every wider wording.
    if (!/instant or sorcery/.test(scope)) suite = 'noncreature';
    if (RE_ONCE.test(line)) once = true;
    const dmg = RE_TRIGGER_DAMAGE.exec(body);
    if (dmg) {
      const table = /each opponent|each player/i.test(dmg[2]);
      const hits = table ? opponents : 1;
      damage += Number(dmg[1]) * hits;
      if (table) eachOpp += Number(dmg[1]);
      why.push(`${dmg[1]} damage to ${dmg[2]}`);
    }
    const drain = RE_TRIGGER_DRAIN.exec(body);
    if (drain) {
      damage += Number(drain[1]) * opponents;
      eachOpp += Number(drain[1]);
      why.push(`${drain[1]} life from each opponent`);
    }
    if (attacks && RE_TRIGGER_COUNTER.test(body)) { perm += 1; why.push('+1/+1 counter'); }
    const pump = attacks ? RE_TRIGGER_PUMP.exec(body) : null;
    if (pump) { temp += Number(pump[1]); why.push(`+${pump[1]}/+0 this turn`); }
    // A creature token made per cast is a body that stays and attacks from the
    // next turn — the same accumulating shape as a +1/+1 counter, and it does
    // not need THIS permanent to be able to attack.
    const token = RE_TRIGGER_TOKEN.exec(body);
    if (token && Number(token[1]) > 0) {
      perm += Number(token[1]); makesTokens = true; why.push(`${token[1]}-power token`);
    }
  }
  // Prowess is the same trigger, printed as a keyword.
  if (attacks && temp === 0 && perm === 0 && f.card.keywords && /"prowess"/i.test(f.card.keywords)) {
    temp += 1; suite = 'noncreature'; why.push('prowess +1/+1 this turn');
  }
  if (damage <= 0 && temp <= 0 && perm <= 0) return null;
  return {
    perCastDamage: damage * f.s,
    perCastEachOpponent: eachOpp * f.s,
    perCastTempPower: temp * f.s,
    perCastPermPower: perm * f.s,
    makesTokens,
    suite, oncePerTurn: once,
    trace: `${f.card.name}: per ${suite === 'instant_sorcery' ? 'instant/sorcery' : 'noncreature spell'}`
      + ` cast — ${why.join(', ')}${once ? ' (once each turn)' : ''}`,
  };
}

/**
 * The cast trigger as a schedule source: instantaneous output scales with the
 * casts made on turn `t`, a +1/+1 counter accumulates from every cast BEFORE
 * this combat. `perTurn` is the mean over the scheduled turns — the static
 * figure `requiredCopies` sizes the access pool from, and the sort key the
 * turn's mana budget is spent in.
 */
export function castTriggerFinisher(
  f: CardFeature, opponents: number, sched: SpellSchedule,
): FinisherOutput | null {
  const trig = castTriggerOf(f, opponents);
  if (!trig) return null;
  const series = trig.suite === 'instant_sorcery' ? sched.instantSorcery : sched.noncreature;
  const cum = sched.cumNoncreature;
  // A +1/+1 counter only accrues from a cast made while the permanent is
  // ALREADY on the battlefield, so the stack starts at the turn its own mana
  // cost is first payable — not at turn 1.
  const onlineTurn = Math.max(1, Math.ceil(f.c));
  const outputAt = (t: number): number => {
    const casts = trig.oncePerTurn ? Math.min(1, series[t] ?? 0) : (series[t] ?? 0);
    const since = Math.max(0, (cum[t - 1] ?? 0) - (cum[Math.min(t - 1, onlineTurn)] ?? 0));
    const stacked = trig.oncePerTurn ? Math.min(Math.max(0, t - 1 - onlineTurn), since) : since;
    return (trig.perCastDamage + trig.perCastTempPower) * casts + trig.perCastPermPower * stacked;
  };
  // The per-opponent part of `outputAt`: the ping every opponent takes. What is
  // left (counters, tokens, prowess) is single-target combat power.
  const eachOpponentAt = (t: number): number => {
    const casts = trig.oncePerTurn ? Math.min(1, series[t] ?? 0) : (series[t] ?? 0);
    return trig.perCastEachOpponent * casts;
  };
  // FIXED 2..MAX_TURN window, never the horizon: `perTurn` sizes the access
  // pool, and a horizon-dependent mean would change a Commander list's T1-T12
  // access between H12 and H20 (section 10.8 item 4).
  let sum = 0;
  for (let t = 2; t <= MAX_TURN; t++) sum += outputAt(t);
  const perTurn = sum / (MAX_TURN - 1);
  if (perTurn <= 0) return null;
  return {
    kind: 'cast_trigger',
    perTurn,
    upkeepMana: 0,
    manaForgone: 0,
    turns: Infinity,
    // The trigger needs the permanent on the battlefield before the spell is
    // cast, so nothing fires on the turn it resolves.
    deployDelay: 1,
    outputAt,
    eachOpponentAt,
    makesTokens: trig.makesTokens,
    shareKey: SPELL_SHARE_KEY,
    upkeepAt: (t: number) => sched.manaSpent[t] ?? 0,
    trace: trig.trace,
  };
}

// ── storm and X-spell burst ───────────────────────────────────────────────

const RE_STORM = /\bstorm\b \(|\bstorm\b$/im;
const RE_BURST_DAMAGE =
  /deals? (five times X|X) damage to (each of up to (\d+|X) targets|each opponent|each player|any target|target player|target opponent)|deals? X damage divided/i;
const RE_BURST_DRAIN = /each opponent loses X life/i;
const RE_STORM_PAYOFF = /deals? (\d+) damage to (?:any target|target player|target opponent)|target player loses (\d+) life|each opponent loses (\d+) life/i;

export interface BurstPayoff {
  name: string;
  cmc: number;
  quantity: number;
  guaranteed: boolean;
  kind: 'storm' | 'x_spell';
  /** Table damage this copy deals with `mana` available on turn `t`. */
  damageWith: (mana: number, casts: number) => number;
  /** Section 10.8 item 1: the same damage as an ALLOCATION - what every
   * opponent takes at once, plus the single-target instances that have to be
   * aimed one opponent at a time. */
  allocationWith: (mana: number, casts: number) => { eachOpponent: number; units: DamageUnit[] };
  trace: string;
}

/** `{X}{X}{X}{R}{R}` -> `{ a: 3, b: 2 }`: cost `a·X + b`. */
function xCost(manaCost: string): { a: number; b: number } {
  let a = 0; let b = 0;
  for (const m of manaCost.matchAll(/\{([^}]+)\}/g)) {
    const sym = m[1];
    if (sym === 'X') { a += 1; continue; }
    const n = Number(sym);
    b += Number.isFinite(n) ? n : 1;
  }
  return { a, b };
}

/** A storm copy or an X finisher, with the table damage it actually proves. */
export function burstPayoffOf(
  f: CardFeature, quantity: number, guaranteed: boolean, opponents: number,
): BurstPayoff | null {
  const text = f.card.oracle_text || '';
  const base = { name: f.card.name, cmc: f.c, quantity, guaranteed };

  if (RE_STORM.test(text)) {
    const m = RE_STORM_PAYOFF.exec(text);
    const per = Number(m?.[1] ?? m?.[2] ?? m?.[3] ?? 0);
    if (!(per > 0)) return null;
    // "each opponent loses N" hits the whole table per copy; a single-target
    // copy can be re-aimed, so its copies still add to one damage total.
    const hits = m?.[3] != null ? opponents : 1;
    return {
      ...base, kind: 'storm',
      // Storm counts the spells cast BEFORE it this turn, so the copy total is
      // `casts + 1` — the original plus one copy per earlier spell.
      damageWith: (_mana, casts) => per * hits * (casts + 1) * f.s,
      allocationWith: (_mana, casts) => (hits > 1
        // "each opponent loses N" on every copy: N to all of them, per copy.
        ? { eachOpponent: per * (casts + 1) * f.s, units: [] }
        // A re-aimable copy is one instance of `per` damage, aimed separately.
        : { eachOpponent: 0, units: [{ power: per * f.s, count: casts + 1 }] }),
      trace: `${f.card.name}: storm, ${per}${hits > 1 ? ` x ${hits} opponents` : ''} per copy`,
    };
  }

  const drain = RE_BURST_DRAIN.test(text);
  const dmg = RE_BURST_DAMAGE.exec(text);
  if (!drain && !dmg) return null;
  const { a, b } = xCost(f.card.mana_cost || '');
  if (a <= 0) return null;
  const multiplier = dmg && /five times X/i.test(dmg[1] ?? '') ? 5 : 1;
  const targetWord = dmg?.[2] ?? '';
  const upTo = dmg?.[3];
  const xAt = (mana: number): number => Math.floor((mana - b) / a);
  const xHits = (X: number): { table: boolean; instances: number } => {
    if (drain || /each opponent|each player/i.test(targetWord)) return { table: true, instances: opponents };
    if (upTo != null) return { table: false, instances: Math.min(opponents, upTo === 'X' ? X : Number(upTo)) };
    return { table: false, instances: 1 };
  };
  return {
    ...base, kind: 'x_spell',
    damageWith: (mana) => {
      const X = xAt(mana);
      if (X <= 0) return 0;
      return multiplier * X * xHits(X).instances * f.s;
    },
    allocationWith: (mana) => {
      const X = xAt(mana);
      if (X <= 0) return { eachOpponent: 0, units: [] };
      const each = multiplier * X * f.s;
      const hit = xHits(X);
      return hit.table
        ? { eachOpponent: each, units: [] }
        : { eachOpponent: 0, units: [{ power: each, count: hit.instances }] };
    },
    trace: `${f.card.name}: {X} finisher, cost ${a}X+${b}`
      + `, ${multiplier > 1 ? `${multiplier}x ` : ''}X ${drain ? 'life from each opponent' : `damage to ${targetWord || 'the table'}`}`,
  };
}

export interface BurstFinish {
  /** First turn a single payoff proves the whole-table predicate, or null. */
  tStar: number | null;
  payoffs: BurstPayoff[];
  /** Best table damage any payoff proves by MAX_TURN — explains a null `tStar`. */
  ceiling: number;
  best: BurstPayoff | null;
  usesBurstMana: boolean;
  trace: string;
}

/**
 * §10.6.3's shape, applied to a one-shot: `t* = first t <= 12` at which the
 * turn's mana (lands, ramp and typed rituals) makes one payoff reach the finish
 * predicate. No default turn; a payoff that never reaches it prints its
 * shortfall and supplies no line.
 */
export function burstFinish(
  format: ScoreFormat, sched: SpellSchedule, payoffs: BurstPayoff[], manaAt: (t: number) => number,
  perOpponent: number, opponents: number,
): BurstFinish {
  let tStar: number | null = null;
  let ceiling = 0;
  let best: BurstPayoff | null = null;
  let usesBurstMana = false;
  const target = perOpponent * opponents;
  const horizon = horizonFor(format);
  for (let t = 1; t <= horizon; t++) {
    const lands = manaAt(t);
    const mana = lands + (sched.burstMana[t] ?? 0);
    const casts = sched.noncreature[t] ?? 0;
    for (const p of payoffs) {
      if (p.cmc > mana) continue;
      const dealt = p.damageWith(mana, casts);
      if (dealt > ceiling) { ceiling = dealt; best = p; usesBurstMana = dealt > p.damageWith(lands, casts); }
      // Section 10.8 item 1: the aggregate is not the predicate. Every opponent
      // has to reach 0 under a feasible allocation of the same instances.
      const remaining = new Array(opponents).fill(perOpponent);
      const alloc = p.allocationWith(mana, casts);
      allocateDamage(remaining, alloc.eachOpponent, alloc.units);
      if (tStar === null && remaining.every((r) => r <= 1e-9)) {
        tStar = t;
        best = p;
        const landOnly = new Array(opponents).fill(perOpponent);
        const landAlloc = p.allocationWith(lands, casts);
        allocateDamage(landOnly, landAlloc.eachOpponent, landAlloc.units);
        usesBurstMana = !landOnly.every((r) => r <= 1e-9);
      }
    }
    if (tStar !== null) break;
  }
  return {
    tStar, payoffs, ceiling, best, usesBurstMana,
    trace: best
      ? `${best.trace}; ${ceiling.toFixed(1)} of ${target} table damage`
        + `${tStar !== null ? ` reached T${tStar}` : ` by T${horizon}`}`
        + `${usesBurstMana ? ' (typed rituals included)' : ''}`
      : 'no typed storm or {X} payoff',
  };
}
