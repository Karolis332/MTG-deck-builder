/**
 * Deck Score v1.3 — producer utilisation. docs/DECK_SCORE_SPEC.md §9 decision 3
 * ("retire the payoff mean; charge unsupported production where it originates").
 *
 * v1.2 multiplied S by `B`, a copy-weighted MEAN of how well the selected
 * plan's dependent payoffs were fed. §9.3 proves no such functional can be
 * non-increasing under deletion and still equal 1 on the empty set: deleting
 * the worst-fed members always raises a mean, so blanking a payoff's rules
 * text RAISED the precon's S. B is gone.
 *
 * In its place, each PRODUCER copy `p` earns
 *
 *     u_p = clip(servedOutput_p / fixedUsefulOutput_p)
 *
 * and its Q and R credit is multiplied by `u_p`. Output must reach a verified
 * plan use either DIRECTLY — pressure, mana, cards or answers, which every
 * recipe consumes — or through present, supported consumers. The denominator
 * comes from the producer's own typed mode, never from the surviving payoff
 * count, so deleting a consumer can only shrink the numerator: utilisation is
 * monotone under deletion by construction, which is exactly what B could not be.
 *
 * Kuja's creature tokens (combat) and Treasure (mana) are direct uses and keep
 * full credit with no payoff present. Life gained, Food, creature deaths and
 * graveyard fill are NOT directly useful: each needs its actual trigger,
 * payment or recursion route. A resource we cannot type at all is an evidence
 * gap — it earns no credit and fabricates no penalty (u stays 1), per §8's
 * "unknown predicate supplies no verified integer K ... or fabricated on-plan
 * link".
 */
import { clip } from './deck-score-math';
import type { CardFeature } from './deck-score-features';
import type { DeckEntry } from './deck-score-mana';
import { catalogFacts, type CatalogMode } from './deck-score-catalog';

/** Charged resources: a link that is worthless unless its other end exists. */
export type ChargedResource = 'life' | 'food' | 'token' | 'creature death' | 'graveyard cards';

const CHARGED: readonly ChargedResource[] = ['life', 'food', 'token', 'creature death', 'graveyard cards'];

/**
 * Output a plan consumes without any converter: §9.3's "pressure / mana /
 * cards / answers". A copy producing any of these is fully utilised.
 * Treasure is mana; a CREATURE token is a body, so it is pressure. Food and
 * Clue are deliberately absent — Food is life and a Clue is a card only once
 * its {2} is paid, and both are typed separately by the generator.
 */
const DIRECT_OUTPUT: ReadonlySet<string> = new Set([
  'mana', 'treasure', 'land', 'extra land drop', 'cards', 'card', 'selection', 'free cast',
  'recursion', 'clue', 'pressure', 'creature token', 'tokens', '+1/+1 counters', 'anthem',
  'pump', 'damage multiplier', 'opponent life loss', 'copy', 'blink', 'alternate win',
  'hand disruption', 'protection', 'information',
]);
// MEASURED, NOT ADOPTED (stage 1, attempt 2 at the pile target): removing
// `selection`, `recursion` and `information` from this set — defensible on §8's
// "selection is not net draw" — moved NO pile (156/200 and 146/200 both before
// and after) while it moved real decks: Cabbage S 56.3 -> 75.0, cEDH median
// 83 -> 82, Vivi 89.3 -> 85.7. Piles do not leak Q through selection; they
// leak it through ordinary threats/answers/value at Q ~ .43, which is the
// b = .30 baseline §9.2 replaces in stage 2. Reverted.

/**
 * Consumer copies a producer needs for full utilisation. FROZEN at 2 on the
 * same reasoning as v1.2's `REGEX_ENABLER_SUPPLY`: one converter is a card,
 * not a route. Deliberately NOT scaled by library size — a 99-card deck does
 * not need more Blood Artists before its life gain starts mattering.
 *
 * // ponytail: consumer PRESENCE, not a per-turn event schedule. The exact
 * // form §9.3 asks for is a bounded event capacity per consumer mode; that
 * // needs the catalogue to type trigger frequency, which stage 1 does not.
 * // Presence is monotone under deletion and bounded, which is the property
 * // the deletion test actually checks. Upgrade path: capacity = Σ consumer
 * // modes' events per turn × the closing schedule's turn count.
 */
export const CONSUMERS_FOR_FULL_USE = 2;

/**
 * Supply copies a CONSUMER needs before its conversion is real. Same frozen
 * 2 and the same reason, mirrored: v1.2 charged this through `B`, a mean over
 * the payoff set, which §9.3 retired because deleting its worst members
 * raised it. Charged per copy it is monotone in both directions — deleting a
 * producer lowers the consumer's credit, deleting the consumer removes it.
 */
export const SUPPLY_FOR_FULL_USE = 2;

/** Expendable bodies a death link needs to be real output
 * (§9.3 "deaths require expendable bodies AND a death source"). */
export const BODIES_FOR_FULL_USE = 2;

export interface ProducerRow {
  name: string;
  quantity: number;
  /** The charged resource that bounds this copy, or null when directly used. */
  resource: ChargedResource | null;
  /** Which end of the link this copy is on. */
  side: 'produces' | 'consumes';
  /** The copy's own typed output for the mode that was selected. */
  fixedUsefulOutput: number;
  servedOutput: number;
  u: number;
  /** What the output reaches: a direct plan use, or the counterparty count. */
  route: string;
}

export interface Utilisation {
  /** u_p for one copy. 1 unless the copy's only output is charged. */
  of: (feature: CardFeature) => number;
  /** Producers whose output is charged, for the diagnostics. */
  rows: readonly ProducerRow[];
  /** Consumer copies present per charged resource. */
  consumers: ReadonlyMap<ChargedResource, number>;
  /** Producer copies present per charged resource. */
  producers: ReadonlyMap<ChargedResource, number>;
}

function isCreature(f: CardFeature): boolean {
  return /\bCreature\b/.test(f.card.type_line || '');
}

/** Typed modes of a copy, or `null` when the card is not typed-covered. */
function modesOf(f: CardFeature): readonly CatalogMode[] | null {
  const facts = catalogFacts(f.card.name, f.card.oracle_text);
  if (!facts || !facts.textMatches || facts.knowledge !== 'known') return null;
  return facts.modes;
}

/**
 * What one copy PRODUCES, mode-resolved. §9.3 "modal budgets remain
 * exclusive": alternative modes sharing a budget key contribute at most once,
 * so a modal card cannot supply two resources from one copy. Falls back to the
 * regex feature flags when the card carries no typed entry.
 */
function producedBy(f: CardFeature): Map<ChargedResource | 'direct', number> {
  const out = new Map<ChargedResource | 'direct', number>();
  const add = (key: ChargedResource | 'direct', amount: number): void => {
    out.set(key, Math.max(out.get(key) ?? 0, amount));
  };
  const modes = modesOf(f);
  if (modes) {
    const spent = new Set<string>();
    for (const mode of modes) {
      if (spent.has(mode.budget)) continue; // modal alternatives share one unit
      spent.add(mode.budget);
      for (const resource of mode.produces) {
        if (DIRECT_OUTPUT.has(resource)) add('direct', 1);
        else if (resource === 'life') add('life', Math.max(1, mode.output));
        else if (resource === 'food') add('food', Math.max(1, mode.output));
        else if (resource === 'graveyard cards') add('graveyard cards', Math.max(1, mode.output));
      }
      // An activated mode paid with a creature is a DEATH SOURCE: it turns a
      // body into a death event. That is production, not consumption.
      if (mode.consumes.has('creature') || (mode.effect.cost.additional ?? []).includes('sacrifice')) {
        add('creature death', 1);
      }
    }
  }
  // Regex fallback / belt-and-braces: these flags already merge both paths.
  if (f.isRamp || f.isTreasureProducer || f.isDraw || f.isDrawEngine || f.isCreatureTokenProducer ||
      f.isRemoval || f.isCounterspell || f.isWipe || f.isProtection || f.isDirectDamage ||
      f.isAnthemOrOverrun || f.isAltWin || f.isPlaneswalker || isCreature(f)) {
    add('direct', 1);
  }
  if (f.isLifegainSource) add('life', 1);
  if (f.isFoodProducer) add('food', 1);
  if (f.isTokenProducer) add('token', 1);
  if (f.isSacOutlet) add('creature death', 1);
  return out;
}

/** Which charged resources one copy CONSUMES — the route side. */
function consumedBy(f: CardFeature): Set<ChargedResource> {
  const out = new Set<ChargedResource>();
  const modes = modesOf(f);
  if (modes) {
    for (const mode of modes) {
      for (const resource of mode.consumes) {
        if (resource === 'life gain event' || resource === 'life payment') out.add('life');
        if (resource === 'food') out.add('food');
        if (resource === 'creature death') out.add('creature death');
        if (resource === 'graveyard cards') out.add('graveyard cards');
      }
      for (const req of mode.requiredSupply) {
        if (/life/.test(req.resource)) out.add('life');
        if (/food/.test(req.resource)) out.add('food');
        if (/death|creature/.test(req.resource)) out.add('creature death');
        if (/graveyard/.test(req.resource)) out.add('graveyard cards');
      }
    }
  }
  // A life-gain payoff reads the EVENT; a +1/+1-counter payoff reads the
  // counter that life gain places. `isDrainPayoff` alone does not consume
  // life — "each opponent loses 1" is an output, not a route.
  if (f.isLifegainPayoff || f.isCounterPayoff) out.add('life');
  if (f.isFoodPayoff) out.add('food');
  if (f.isTokenPayoff) out.add('token');
  if (f.hasDiesTrigger || f.isDrainPayoff) out.add('creature death');
  return out;
}

/**
 * u_p for every copy in the deck. `guaranteed` (command zone) cards count as
 * present consumers and producers — they are available resources — exactly as
 * they do for R.
 */
export function producerUtilisation(
  nonLand: readonly DeckEntry[],
  guaranteed: readonly DeckEntry[] = [],
): Utilisation {
  const all = [...nonLand, ...guaranteed];
  const usable = all.filter((e) => e.feature.s >= 1 && e.feature.covered);

  const consumers = new Map<ChargedResource, number>(CHARGED.map((r) => [r, 0]));
  const producers = new Map<ChargedResource, number>(CHARGED.map((r) => [r, 0]));
  let bodies = 0;
  for (const entry of usable) {
    for (const resource of consumedBy(entry.feature)) {
      consumers.set(resource, (consumers.get(resource) ?? 0) + entry.quantity);
    }
    for (const resource of producedBy(entry.feature).keys()) {
      if (resource !== 'direct') producers.set(resource, (producers.get(resource) ?? 0) + entry.quantity);
    }
    // Expendable bodies: a creature token maker, or a creature cheap enough
    // that feeding it to an outlet is a line rather than a loss.
    if (entry.feature.isCreatureTokenProducer || (isCreature(entry.feature) && entry.feature.c <= 3)) {
      bodies += entry.quantity;
    }
  }

  /** Served fraction of one charged resource: bounded by present consumers. */
  const servedFraction = (resource: ChargedResource): number => {
    const present = consumers.get(resource) ?? 0;
    const route = clip(present / CONSUMERS_FOR_FULL_USE);
    // Food is convertible to life, so a life route also serves Food.
    if (resource === 'food') return Math.max(route, clip((consumers.get('life') ?? 0) / CONSUMERS_FOR_FULL_USE));
    // Deaths need BOTH a payoff that reads them and bodies to feed the outlet.
    if (resource === 'creature death') return Math.min(route, clip(bodies / BODIES_FOR_FULL_USE));
    return route;
  };

  /** Supplied fraction of one charged resource: the mirror, for CONSUMERS. */
  const suppliedFraction = (resource: ChargedResource): number => {
    const present = producers.get(resource) ?? 0;
    // A creature dying in combat is a death source too, so bodies supply
    // deaths alongside sacrifice outlets. Without that, every ordinary
    // dies-trigger deck would read as an unsupported payoff.
    if (resource === 'creature death') return clip((present + bodies) / SUPPLY_FOR_FULL_USE);
    // Food is a token, so a Food maker supplies a token payoff.
    if (resource === 'token') return clip((present + (producers.get('food') ?? 0)) / SUPPLY_FOR_FULL_USE);
    return clip(present / SUPPLY_FOR_FULL_USE);
  };

  const cache = new Map<string, { u: number; row: ProducerRow | null }>();
  const evaluate = (feature: CardFeature, quantity: number): { u: number; row: ProducerRow | null } => {
    const produced = producedBy(feature);
    // Direct output — pressure, mana, cards, answers — is a verified plan use
    // on its own (§9.3). A copy that has one is fully utilised whatever else
    // it also makes: Kuja's token makers and Treasure keep full credit.
    if (produced.has('direct')) return { u: 1, row: null };
    const consumed = consumedBy(feature);
    if (produced.size === 0 && consumed.size === 0) return { u: 1, row: null };

    let best = 0;
    let bestResource: ChargedResource | null = null;
    let bestSide: 'produces' | 'consumes' = 'produces';
    let bestOutput = 1;
    const consider = (
      resource: ChargedResource, side: 'produces' | 'consumes', fraction: number, output: number,
    ): void => {
      if (bestResource !== null && fraction <= best) return;
      best = fraction;
      bestResource = resource;
      bestSide = side;
      bestOutput = output;
    };
    for (const resource of CHARGED) {
      const output = produced.get(resource);
      if (output !== undefined) consider(resource, 'produces', servedFraction(resource), output);
      if (consumed.has(resource)) consider(resource, 'consumes', suppliedFraction(resource), 1);
    }
    if (bestResource === null) return { u: 1, row: null };
    const resource: ChargedResource = bestResource;
    const u = clip(best);
    const counterparty = bestSide === 'produces'
      ? `${consumers.get(resource) ?? 0} ${resource} consumer(s)`
      : `${producers.get(resource) ?? 0} ${resource} producer(s)`;
    return {
      u,
      row: {
        name: feature.card.name,
        quantity,
        resource,
        side: bestSide,
        fixedUsefulOutput: bestOutput,
        servedOutput: bestOutput * u,
        u,
        route: counterparty + (resource === 'creature death' ? `, ${bodies} bodies` : ''),
      },
    };
  };

  const rows: ProducerRow[] = [];
  for (const entry of usable) {
    const key = entry.feature.card.name.toLowerCase();
    if (cache.has(key)) continue;
    const result = evaluate(entry.feature, entry.quantity);
    cache.set(key, result);
    if (result.row) rows.push(result.row);
  }
  rows.sort((a, b) => a.u - b.u || a.name.localeCompare(b.name));

  return {
    of: (feature: CardFeature): number => {
      const key = feature.card.name.toLowerCase();
      const hit = cache.get(key);
      if (hit) return hit.u;
      const fresh = evaluate(feature, 1);
      cache.set(key, fresh);
      return fresh.u;
    },
    rows,
    consumers,
    producers,
  };
}
