/**
 * Deck Score v1.4 stage 1b — typed finisher output. docs/DECK_SCORE_SPEC.md
 * §9.4 / §10.6.3.
 *
 * W's output schedule used to see exactly one kind of damage: a creature's
 * printed power. Everything else a real deck kills with — a planeswalker's
 * minus ability, an animated land, a repeatable pinger, a draw trigger that
 * drains the table — contributed ZERO, and the control family skipped the
 * schedule altogether with a hard-coded turn 8. Measured on the 1,824-list
 * Commander training stride, 224 of the 298 W = 0 rows reach 50-90 % of the
 * 120-damage finish predicate on creatures alone; the missing output is these
 * four families.
 *
 * §9.4 fixes each rule, and this module implements exactly those rules:
 *
 *   planeswalker  printed starting loyalty, ONE legal activation per own turn,
 *                 loyalty debited, only player-facing damage or attacking
 *                 tokens count. A draw-only walker supplies zero.
 *   manland       animation paid EVERY attack, the land is removed from mana
 *                 production that turn, and it cannot attack the turn it lands.
 *   burn          printed repeatable activation, only as many activations as
 *                 the turn's mana affords.
 *   draw-damage   actual scheduled draw EVENTS (the ordinary draw step plus
 *                 typed repeatable draw), honouring "once each turn".
 *
 * // ponytail: printed-text parsing, as §9.4 words it ("printed repeatable
 * // output", "printed loyalty"), weighted by the feature's support
 * // coefficient `s` exactly as the creature schedule already is. Upgrade path
 * // is moving these four readings into the catalogue's `outputBounds`, not
 * // more regexes here.
 */
import type { CardFeature } from './deck-score-features';

export type FinisherKind = 'walker' | 'manland' | 'burn' | 'draw_damage' | 'anthem' | 'cast_trigger';

/** Last turn any W schedule runs to (§1 W "within 12 turns"). */
export const MAX_TURN = 12;

/** One typed, non-creature damage source and everything the schedule must
 * debit for it. */
export interface FinisherOutput {
  kind: FinisherKind;
  /**
   * Damage dealt to the table per own turn, once online — EXCEPT for `anthem`,
   * where it is the damage added per attacking body. The stage-4 scope calls
   * this "bounded token/pump output": a pump effect has no output of its own,
   * it multiplies the board the schedule already tracks.
   */
  perTurn: number;
  /** Mana this source spends EVERY turn it produces (animation, activation). */
  upkeepMana: number;
  /** Mana it would otherwise have produced and no longer does (a land that
   * animates and attacks is tapped for combat, not for mana). */
  manaForgone: number;
  /** Turns of output a finite budget supports; `Infinity` when repeatable. */
  turns: number;
  /** First own turn it can produce, counted from the turn it resolves. */
  deployDelay: number;
  /**
   * Output on turn `t` when it is not constant — a cast trigger produces what
   * the deck casts that turn (deck-score-spells.ts). `perTurn` stays the mean
   * over the scheduled turns, which is what sizes the access pool.
   */
  outputAt?: (t: number) => number;
  /** A cast trigger whose accumulating output is CREATURE TOKENS: the token
   * family must not also credit the card as a flat per-turn producer. */
  makesTokens?: boolean;
  /** Sources sharing this key pay `upkeepAt` ONCE per turn between them. */
  shareKey?: string;
  /** Turn-varying shared expenditure, charged once per `shareKey` per turn. */
  upkeepAt?: (t: number) => number;
  trace: string;
}

/** `[+1]: ...` / `[-3]: ...` / `[0]: ...` — one printed loyalty ability. */
const RE_LOYALTY_ABILITY = /(?:^|\n)\s*\[?([+−–-]?\d+)\]?\s*:\s*([^\n]+)/g;
/** Damage aimed at the TABLE. "target creature" is removal, not a finish. */
const RE_PLAYER_DAMAGE = /deals? (\d+) damage to (each opponent|any target|target player|target opponent|each player)/i;
/** A token that can attack: a printed P/T plus the word creature. */
const RE_ATTACKING_TOKEN = /creates? [^.]*?(\d+)\/\d+ [^.]*?creature token/i;
/** A repeatable activated damage ability: `{2}, {T}: ... deals 2 damage ...`. */
const RE_ACTIVATED_DAMAGE =
  /(?:^|\n)((?:\{[^}]+\}|,|\s)*?):\s*[^\n:]*?deals? (\d+) damage to (each opponent|any target|target player|target opponent|each player)/gi;
/** The animation clause of a manland, with the size it animates to. */
const RE_ANIMATE =
  /((?:\{[^}]+\}|,|\s)*?):\s*[^\n:]*?becomes? an?[^.\n]*?\b(\d+)\/\d+[^.\n]*?creature|((?:\{[^}]+\}|,|\s)*?):\s*[^\n:]*?becomes? a creature[^.\n]*?\b(\d+)\/\d+/i;
/** Damage or life loss keyed on OUR draw step. */
const RE_DRAW_DAMAGE =
  /whenever you draw a card[^.]*?(?:each opponent loses (\d+) life|deals? (\d+) damage to (?:each opponent|any target|target player|target opponent))/i;
const RE_ONCE_EACH_TURN = /once each turn|only once each turn/i;
/** A repeatable extra draw the deck schedules on its own turn. */
const RE_EXTRA_DRAW_PER_TURN =
  /at the beginning of (?:your|each) (?:draw step|upkeep|end step)[^.]*draw|draw an additional card|whenever[^.]*(?:attacks|dies|enters)[^.]*draw a card/i;

/** Sum of the `{N}` generic pips plus one per coloured/hybrid pip. */
function manaCostOf(text: string): number {
  let total = 0;
  for (const m of text.matchAll(/\{([^}]+)\}/g)) {
    const sym = m[1];
    if (sym === 'T' || sym === 'Q') continue;
    const n = Number(sym);
    total += Number.isFinite(n) ? n : 1;
  }
  return total;
}

/** `-3`, `−3` and `+1` all parse; a bare `0` is free. */
function loyaltyCost(raw: string): number {
  const sign = /^[+−–-]/.exec(raw)?.[0];
  const n = Number(raw.replace(/^[+−–-]/, ''));
  if (!Number.isFinite(n)) return NaN;
  return sign && sign !== '+' ? -n : n;
}

/**
 * §9.4: "Planeswalkers start at printed loyalty, schedule one legal loyalty
 * activation per own turn, debit loyalty, and count only typed damage,
 * attacking tokens/animation, or a reachable verified ultimate. A draw-only
 * walker supplies zero finishing output."
 *
 * The single best damage ability is scheduled once per own turn. A plus or zero
 * ability is sustainable for ever; a minus ability lasts `floor(start / cost)`
 * activations. Unknown printed loyalty proves nothing and yields no line.
 */
function walkerOutput(f: CardFeature, opponents: number): FinisherOutput | null {
  if (!/\bPlaneswalker\b/.test(f.card.type_line || '')) return null;
  const start = Number(f.card.loyalty);
  // §10.2 "Unsupported effects add no invented useful mass"; an unreadable
  // starting loyalty is unknown output, and unknown output cannot prove a
  // finish. (Stage 1c added `loyalty` to `deck-gate-parse.ts`'s `CARD_COLS`, so
  // fixtures and Standard lists now reach here with the printed value, as the
  // stride lists already did.)
  if (!Number.isFinite(start) || start <= 0) return null;

  const text = f.card.oracle_text || '';
  let best: { perTurn: number; turns: number; why: string } | null = null;
  RE_LOYALTY_ABILITY.lastIndex = 0;
  for (const m of text.matchAll(RE_LOYALTY_ABILITY)) {
    const cost = loyaltyCost(m[1]);
    if (!Number.isFinite(cost)) continue;
    const body = m[2];
    const dmg = RE_PLAYER_DAMAGE.exec(body);
    const token = RE_ATTACKING_TOKEN.exec(body);
    // A token made this turn attacks on the NEXT one, so it is worth its power
    // every turn after it arrives; the walker keeps making them.
    const raw = dmg
      ? Number(dmg[1]) * (/each opponent|each player/i.test(dmg[2]) ? opponents : 1)
      : token ? Number(token[1]) : 0;
    if (raw <= 0) continue;
    // A minus ability is a finite budget: one activation per own turn until the
    // loyalty runs out. A plus/zero ability never runs out.
    const turns = cost >= 0 ? Infinity : Math.floor(start / -cost);
    if (turns < 1) continue;
    const perTurn = raw * f.s;
    if (!best || perTurn * Math.min(turns, 6) > best.perTurn * Math.min(best.turns, 6)) {
      best = { perTurn, turns, why: `[${m[1]}] ${dmg ? `${raw} damage` : `${raw}-power token`}` };
    }
  }
  if (!best) return null;
  return {
    kind: 'walker',
    perTurn: best.perTurn,
    upkeepMana: 0,
    manaForgone: 0,
    turns: best.turns,
    // It resolves on our turn and activates immediately, but the damage lands
    // on the turn it resolves, so there is no extra delay.
    deployDelay: 0,
    trace: `${f.card.name}: loyalty ${start}, ${best.why}, `
      + `${best.turns === Infinity ? 'repeatable' : `${best.turns} activations`}`,
  };
}

/**
 * §9.4: "Manlands come from ALL library entries, including lands: pay animation
 * each attack, respect tapped state/sickness, and remove that land from mana
 * production when it attacks."
 */
function manlandOutput(f: CardFeature): FinisherOutput | null {
  if (!f.isLand) return null;
  const text = f.card.oracle_text || '';
  const m = RE_ANIMATE.exec(text);
  if (!m) return null;
  const power = Number(m[2] ?? m[4]);
  if (!Number.isFinite(power) || power <= 0) return null;
  const cost = manaCostOf(m[1] ?? m[3] ?? '');
  return {
    kind: 'manland',
    perTurn: power * f.s,
    upkeepMana: cost,
    // It attacks instead of tapping for mana.
    manaForgone: 1,
    turns: Infinity,
    // A land played this turn has not been under our control since our upkeep,
    // so its first attack is the turn after it lands.
    deployDelay: 1,
    trace: `${f.card.name}: {${cost}} animates to ${power} power, taps to attack`,
  };
}

/** §9.4: "Burn uses printed repeatable output and affordable activations." */
function burnOutput(f: CardFeature, opponents: number): FinisherOutput | null {
  const text = f.card.oracle_text || '';
  RE_ACTIVATED_DAMAGE.lastIndex = 0;
  let best: { perTurn: number; cost: number; why: string } | null = null;
  for (const m of text.matchAll(RE_ACTIVATED_DAMAGE)) {
    const cost = manaCostOf(m[1] ?? '');
    const raw = Number(m[2]) * (/each opponent|each player/i.test(m[3]) ? opponents : 1);
    if (!(raw > 0)) continue;
    if (!best || raw / Math.max(1, cost) > best.perTurn / Math.max(1, best.cost)) {
      best = { perTurn: raw * f.s, cost, why: `{${cost}}: ${raw} damage` };
    }
  }
  if (!best) return null;
  return {
    kind: 'burn',
    perTurn: best.perTurn,
    upkeepMana: best.cost,
    manaForgone: 0,
    turns: Infinity,
    // An activated ability on a permanent that just resolved still needs the
    // permanent to be untapped/unsick only if the cost includes {T}; charging
    // one turn for every source is the conservative reading.
    deployDelay: 1,
    trace: `${f.card.name}: ${best.why}, repeatable`,
  };
}

/**
 * §9.4: "draw-damage uses actual scheduled draw EVENTS, including ordinary
 * draws, with per-turn trigger limits."
 */
function drawDamageOutput(f: CardFeature, opponents: number, drawEventsPerTurn: number): FinisherOutput | null {
  const text = f.card.oracle_text || '';
  const m = RE_DRAW_DAMAGE.exec(text);
  if (!m) return null;
  const per = Number(m[1] ?? m[2]);
  if (!Number.isFinite(per) || per <= 0) return null;
  // "each opponent loses N" hits the table; a single-target reading does not.
  const table = m[1] != null || /each opponent/i.test(m[0]) ? opponents : 1;
  const events = RE_ONCE_EACH_TURN.test(text) ? 1 : drawEventsPerTurn;
  return {
    kind: 'draw_damage',
    perTurn: per * table * events * f.s,
    upkeepMana: 0,
    manaForgone: 0,
    turns: Infinity,
    deployDelay: 1,
    trace: `${f.card.name}: ${per} per draw x ${table} opponents x ${events} draw events/turn`,
  };
}

/**
 * Draw EVENTS on our own turn: the draw step, plus one for each typed
 * repeatable draw effect, bounded at 3 so a cantrip pile cannot manufacture a
 * clock. §9.4: "actual scheduled draw EVENTS, including ordinary draws".
 */
export function drawEventsPerTurn(features: readonly { feature: CardFeature; quantity: number }[]): number {
  const engines = features
    .filter((e) => RE_EXTRA_DRAW_PER_TURN.test(e.feature.card.oracle_text || ''))
    .reduce((s, e) => s + e.quantity, 0);
  return 1 + Math.min(2, engines > 0 ? Math.ceil(engines / 4) : 0);
}

/** "Creatures you control get +2/+1" — a static team pump. */
const RE_TEAM_PUMP = /(?:other )?creatures you control get \+(\d+)\/\+\d+/i;
const RE_UNTIL_END_OF_TURN = /until end of turn/i;

/**
 * §9.4 / stage-4 scope item 4, "bounded token/pump output". An anthem deals no
 * damage by itself; it raises every attacking body. A printed "until end of
 * turn" pump is ONE turn of that bonus, a static one is every turn.
 */
function anthemOutput(f: CardFeature): FinisherOutput | null {
  const text = f.card.oracle_text || '';
  const m = RE_TEAM_PUMP.exec(text);
  if (!m) return null;
  const bonus = Number(m[1]);
  if (!Number.isFinite(bonus) || bonus <= 0) return null;
  const oneShot = RE_UNTIL_END_OF_TURN.test(m.input.slice(m.index, m.index + 120));
  return {
    kind: 'anthem',
    perTurn: bonus * f.s,
    upkeepMana: 0,
    manaForgone: 0,
    turns: oneShot ? 1 : Infinity,
    deployDelay: 0,
    trace: `${f.card.name}: +${bonus} power per body${oneShot ? ', one turn' : ', static'}`,
  };
}

const cache = new Map<string, FinisherOutput | null>();

/**
 * The typed non-creature output of ONE card, or null when it has none. Pure and
 * memoised on the printing id — `scoreDeck` runs this over every library entry.
 */
export function finisherOutputOf(
  f: CardFeature, opponents: number, drawEvents: number,
): FinisherOutput | null {
  const key = `${f.card.id}|${opponents}|${drawEvents}|${f.s}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const out = walkerOutput(f, opponents)
    ?? manlandOutput(f)
    ?? burnOutput(f, opponents)
    ?? drawDamageOutput(f, opponents, drawEvents)
    ?? anthemOutput(f);
  cache.set(key, out);
  return out;
}
