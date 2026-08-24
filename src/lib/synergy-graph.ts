/**
 * Synergy graph — Internal Synergy Score (ISS).
 *
 * Design: docs/SYNERGY_ENGINE_DESIGN.md §1. The deck is a graph: nodes = cards,
 * edges = detected pairwise resource synergies, with the commander as the
 * anchor node. A card earns a base score for synergizing with the commander,
 * plus increments for every OTHER commander-synergizing card it also pairs
 * with (commander-centered triangles — the operator's original spec).
 *
 * Pure functions only — no DB access. Callers (deck-analysis route, harness)
 * pass plain card arrays; this module never queries `cards`/`commander_*`
 * tables itself.
 *
 * v1 does NOT feed the builder's scorer/quotas/arsenal — see §5, "NOT in the
 * builder's scorer yet." This is an analysis/reporting layer only.
 */

import { ownAbilities } from './card-classifier';
import type { CommanderSynergyProfile, SynergyCategory } from './commander-synergy';
import type { CommanderDirectNeeds } from './commander-analysis';

// ── Resource taxonomy (§1, 16 resources) ────────────────────────────────────

export type Resource =
  | 'tokens'
  | 'treasures'
  | 'plus1_counters'
  | 'graveyard_fill'
  | 'sacrifice_fodder'
  | 'card_draw'
  | 'mana_ramp'
  | 'lifegain'
  | 'artifacts_matter'
  | 'enchantments_matter'
  | 'spells_cast'
  | 'creatures_etb'
  | 'creature_death'
  | 'exile_matters'
  | 'lands_extra'
  | 'discard';

export const ALL_RESOURCES: Resource[] = [
  'tokens', 'treasures', 'plus1_counters', 'graveyard_fill', 'sacrifice_fodder',
  'card_draw', 'mana_ramp', 'lifegain', 'artifacts_matter', 'enchantments_matter',
  'spells_cast', 'creatures_etb', 'creature_death', 'exile_matters', 'lands_extra',
  'discard',
];

export interface CardLike {
  name: string;
  oracleText: string | null;
  typeLine: string;
}

export interface CardTags {
  produces: Set<Resource>;
  consumes: Set<Resource>;
}

// ── v1 calibration constants (§1, §6 — "Calibrate in §6", pending research) ─

/** Base ISS awarded to a card that has ANY commander edge. */
export const ISS_BASE = 10;
/** Per-triangle multiplier applied to a shared pairEdge with another
 * commander-synergizing card. */
export const ISS_LAMBDA = 2;
/** Max resource overlaps counted per card pair — stops one card with 6
 * overlapping resource tags from single-handedly dominating the score. */
export const PAIR_EDGE_CAP = 2;
/**
 * deckISS normalization ceiling: an average cardISS of this value maps to
 * deckISS=100. Not yet calibrated against real decklists (§6 is pending
 * rating-scout research) — chosen so a tight ~15-25 card commander-synergy
 * "engine" package (the common case) lands in the 40-80 range with headroom
 * above for very cohesive decks, not so tight that a single hub card
 * saturates the whole deck's score. Revisit once §6 anchors land.
 */
export const ISS_NORMALIZE_CEILING = 30;

// ── Own-ability-scoped resource patterns ────────────────────────────────────
// Matched against ownAbilities(oracleText) — the C2 lesson (2026-08-23):
// strip quoted token/emblem-grant text and parenthetical reminder text before
// pattern-matching, so a card's OWN function is what gets tagged, not text it
// merely quotes or explains.

interface ResourcePatterns {
  produce: RegExp[];
  consume: RegExp[];
  /** Curated name overrides for cards whose oracle text doesn't literally
   * name the resource but functionally produces/consumes it (mirrors the
   * NAME-allowlist precedent used throughout card-classifier.ts — e.g.
   * Skullclamp wants disposable creature bodies but never says "token"). */
  produceNames?: Set<string>;
  consumeNames?: Set<string>;
}

const RESOURCE_PATTERNS: Record<Resource, ResourcePatterns> = {
  tokens: {
    // Bounded window (not an unbounded nested-quantifier group) — avoids
    // catastrophic backtracking on long oracle text that never reaches
    // "token" (same lesson as card-classifier.ts's C2 fix).
    produce: [
      /create[^.]{0,60}tokens?\b/i,
      /put[^.]{0,40}tokens? onto the battlefield/i,
      /\bpopulate\b/i,
    ],
    consume: [
      /whenever (?:a |one or more )?tokens? (?:you control )?(?:enters?|dies|die)/i,
      /sacrifice (?:a |an )?token/i,
      /tokens? you control get [+-]/i,
      /for each token you control/i,
      /whenever .* creates? a token/i,
    ],
    // Wants a steady supply of cheap/disposable creature bodies — tokens are
    // the canonical supply, even though the card's own text never says
    // "token" (Skullclamp: "Whenever equipped creature dies, draw two
    // cards." — no oracle-text mention of tokens at all).
    consumeNames: new Set(['skullclamp']),
  },
  treasures: {
    produce: [
      /create (?:a |an |one |two |three |x |\d+ )?treasures?\b/i,
    ],
    consume: [
      /sacrifice (?:a |an |x )?treasures?/i,
      /whenever you sacrifice (?:a |an )?treasure/i,
      /rather than pay this spell'?s mana cost.*treasure/i,
    ],
  },
  plus1_counters: {
    produce: [
      /put (?:a |one |two |three |x |\d+ )?\+1\/\+1 counters? on/i,
      /enters? .* with (?:a |one |two |three |x |\d+ )?\+1\/\+1 counters?/i,
    ],
    consume: [
      /if one or more \+1\/\+1 counters? would be put/i,
      /double the number of \+1\/\+1 counters/i,
      /\bproliferate\b/i,
      /remove (?:a |one |x |\d+ )?\+1\/\+1 counters? from/i,
      /for each \+1\/\+1 counter/i,
      /whenever you proliferate/i,
    ],
  },
  graveyard_fill: {
    produce: [
      /\bmill\b/i,
      /put .* cards? from .* library into .* graveyard/i,
      /discard a card/i,
      /put .* into (?:its owner'?s |your )?graveyard from/i,
    ],
    consume: [
      /return .* from your graveyard/i,
      /cast .* from your graveyard/i,
      /\bflashback\b/i,
      /\bescape\b/i,
      /\bdredge\b/i,
      /\bdelve\b/i,
      /(?:cards? in|from) your graveyard/i,
      /exile .* from your graveyard/i,
    ],
  },
  sacrifice_fodder: {
    produce: [
      /create[^.]{0,60}tokens?\b/i,
      /create a copy of/i,
    ],
    consume: [
      /sacrifice (?:a |an |another )?creature/i,
      /sacrifice a permanent/i,
    ],
  },
  card_draw: {
    produce: [
      /draw (?:a |two |three |four |x |\d+ )?cards?/i,
      /draws? (?:a |two |three |\d+ )?cards?/i,
      /look at the top .* (?:put|reveal)[^.]* into your hand/i,
    ],
    consume: [
      /whenever you draw (?:a |your )?(?:card|second card)/i,
      /\bhellbent\b/i,
      /no cards? in (?:your |their )?hand/i,
    ],
  },
  mana_ramp: {
    produce: [
      /add \{[WUBRGC1-9]\}/i,
      /add one mana of any/i,
      /add (?:one|two|three) mana/i,
      /search your library for (?:a|up to \w+) (?:basic )?land/i,
      /\{T\}: Add/i,
    ],
    consume: [
      /spells? with \{?x\}? in (?:its|their) mana costs?/i,
      // NOTE: a bare /where x is/i pattern was here and got removed — "X" is
      // used for creature counts, token counts, damage amounts, etc., not
      // just mana payoffs (Krenko: "X is the number of Goblins you
      // control"; Tazri: "X is the number of colors"). Both got falsely
      // tagged as mana_ramp consumers, which credited every mana rock in
      // their decks with a commander edge and inflated deckISS on ramp
      // VOLUME rather than genuine synergy — found via the Krenko-vs-Tazri
      // spot check (review 2026-08-24). Genuine X-spell commanders still
      // get this resource via the SynergyCategory 'x_spells' mapping in
      // commanderResourceProfile (CATEGORY_TO_CONSUME), which uses
      // commander-synergy.ts's more carefully scoped x_spells patterns.
      /\bconvoke\b/i,
      /\bimprovise\b/i,
      /additional cost of \{/i,
    ],
  },
  lifegain: {
    produce: [
      /\blifelink\b/i,
      /you gain \d+ life/i,
      /gains? \d+ life/i,
    ],
    consume: [
      /whenever you gain life/i,
      /whenever (?:a |one or more )?(?:player|you) gains? life/i,
      /life total (?:is|becomes)/i,
    ],
  },
  artifacts_matter: {
    produce: [
      /create[^.]{0,60}artifacts? tokens?/i,
    ],
    consume: [
      /artifacts? you control/i,
      /whenever (?:a |an )?artifact enters/i,
      /whenever you cast an artifact/i,
      /\baffinity\b/i,
      /\bmetalcraft\b/i,
      /for each artifact/i,
    ],
  },
  enchantments_matter: {
    produce: [
      /create[^.]{0,60}enchantments? tokens?/i,
    ],
    consume: [
      /enchantments? you control/i,
      /whenever (?:an )?enchantment enters/i,
      /whenever you cast an enchantment/i,
      /\bconstellation\b/i,
      /for each enchantment/i,
    ],
  },
  spells_cast: {
    produce: [],
    consume: [
      /whenever you cast an? (?:instant|sorcery|instant or sorcery|noncreature)/i,
      /\bmagecraft\b/i,
      /\bprowess\b/i,
      /whenever you cast (?:a |your )?\w+ spell/i,
    ],
  },
  creatures_etb: {
    produce: [
      /create[^.]{0,60}creature tokens?/i,
      /return[^.]{0,60}to the battlefield/i,
    ],
    consume: [
      /whenever (?:a |another )?creature enters the battlefield/i,
      /whenever (?:a |another )?(?:nontoken )?creature enters/i,
      /\bblink\b|\bflicker\b/i,
    ],
  },
  creature_death: {
    produce: [
      /sacrifice (?:a |an |another )?creature/i,
      /target player sacrifices/i,
      /destroy target creature/i,
    ],
    consume: [
      // Bounded window (not a fixed "(?:a |another )?" prefix) so
      // self-referential phrasing ("this creature or another creature
      // dies" — Blood Artist, Zulaport Cutthroat) still matches.
      /whenever[^.]{0,40}creatures?(?: you control)? dies?\b/i,
      /whenever you sacrifice/i,
      /whenever (?:a |another )?creature (?:is put|you control is put) into (?:a |your )?graveyard/i,
    ],
  },
  exile_matters: {
    produce: [
      /exile the top (?:card|two cards|three cards) of your library/i,
      /exile .* you may (?:play|cast)/i,
    ],
    consume: [
      /(?:whenever you )?cast (?:a |an )?(?:spell|card) from exile/i,
      /play (?:cards?|spells?) from exile/i,
      /you may (?:play|cast) (?:cards?|spells?) (?:from exile|exiled)/i,
      /enters (?:the battlefield )?from exile/i,
    ],
  },
  lands_extra: {
    produce: [
      /you may play an additional land/i,
      /put (?:a|that|it|one|them) (?:basic )?land(?: card)?s? onto the battlefield/i,
    ],
    consume: [
      /\blandfall\b/i,
      /whenever a land enters the battlefield/i,
      /whenever you play a land/i,
    ],
  },
  discard: {
    produce: [
      /(?:each player |you |target player )?discards? (?:a|two|three|\d+|that many) cards?/i,
      /you may discard a card/i,
    ],
    consume: [
      /\bmadness\b/i,
      /whenever you discard/i,
      /cast .* from your (?:hand by discarding|discard)/i,
    ],
  },
};

// ── Own-ability tagging ─────────────────────────────────────────────────────

function isLand(typeLine: string): boolean {
  return /\bLand\b/.test(typeLine || '');
}

/**
 * Tag a single card with the resources it produces and consumes, from its
 * own oracle text (quote/reminder-stripped) plus a small set of structural
 * type-line signals (an instant/sorcery IS a unit of `spells_cast` supply;
 * a creature entering IS a unit of `creatures_etb` supply).
 */
export function tagCard(card: CardLike): CardTags {
  const produces = new Set<Resource>();
  const consumes = new Set<Resource>();

  if (isLand(card.typeLine)) return { produces, consumes };

  const own = ownAbilities(card.oracleText || '');
  const name = (card.name || '').toLowerCase();
  const type = (card.typeLine || '').toLowerCase();

  for (const resource of ALL_RESOURCES) {
    const pat = RESOURCE_PATTERNS[resource];
    if (pat.produceNames?.has(name) || pat.produce.some((p) => p.test(own))) {
      produces.add(resource);
    }
    if (pat.consumeNames?.has(name) || pat.consume.some((p) => p.test(own))) {
      consumes.add(resource);
    }
  }

  // Structural supply: being the type IS the resource, independent of what
  // the card's own ability text says (a vanilla Instant still feeds a
  // "spells cast" payoff; a vanilla creature still feeds an "ETB" payoff).
  if (type.includes('instant') || type.includes('sorcery')) produces.add('spells_cast');
  if (type.includes('creature')) produces.add('creatures_etb');
  if (type.includes('artifact')) produces.add('artifacts_matter');
  if (type.includes('enchantment')) produces.add('enchantments_matter');

  return { produces, consumes };
}

// ── Commander resource profile (§1: SynergyCategory + directNeeds mapping) ─

const CATEGORY_TO_PRODUCE: Partial<Record<SynergyCategory, Resource[]>> = {
  token_generation: ['tokens'],
};

const CATEGORY_TO_CONSUME: Partial<Record<SynergyCategory, Resource[]>> = {
  creature_dies: ['creature_death'],
  graveyard: ['graveyard_fill'],
  artifact_synergy: ['artifacts_matter'],
  enchantment_synergy: ['enchantments_matter'],
  lifegain: ['lifegain'],
  counters: ['plus1_counters'],
  land_matters: ['lands_extra'],
  spell_cast: ['spells_cast'],
  x_spells: ['mana_ramp'],
  storm: ['mana_ramp', 'spells_cast'],
  creature_etb: ['creatures_etb'],
  exile_cast: ['exile_matters'],
  exile_enter: ['exile_matters'],
};

const DIRECT_NEED_TO_CONSUME: Array<[keyof CommanderDirectNeeds, Resource[]]> = [
  ['artifactsMatter', ['artifacts_matter']],
  ['enchantmentsMatter', ['enchantments_matter']],
  ['countersMatter', ['plus1_counters']],
  ['graveyardMatter', ['graveyard_fill']],
  ['tokenMatter', ['tokens']],
  ['landfallMatter', ['lands_extra']],
  ['lifegainMatter', ['lifegain']],
  ['sacFodder', ['sacrifice_fodder']],
  ['etbCreatures', ['creatures_etb']],
  ['cheapSpells', ['spells_cast']],
];

export interface CommanderContext {
  name: string;
  oracleText: string | null;
  typeLine: string;
  synergyProfile?: CommanderSynergyProfile | null;
  directNeeds?: CommanderDirectNeeds | null;
}

/**
 * Resolve the commander's own produces/consumes resource sets: its own
 * oracle text (tagged the same way as any other card) UNIONED with the
 * SynergyCategory triggers + CommanderDirectNeeds signal (a second, more
 * mature source that catches phrasing the generic patterns miss).
 */
export function commanderResourceProfile(ctx: CommanderContext): CardTags {
  const own = tagCard({ name: ctx.name, oracleText: ctx.oracleText, typeLine: ctx.typeLine });
  const produces = new Set(own.produces);
  const consumes = new Set(own.consumes);

  if (ctx.synergyProfile) {
    for (const cat of ctx.synergyProfile.triggerCategories) {
      for (const r of CATEGORY_TO_PRODUCE[cat] || []) produces.add(r);
      for (const r of CATEGORY_TO_CONSUME[cat] || []) consumes.add(r);
    }
  }

  if (ctx.directNeeds) {
    if (ctx.directNeeds.selfTreasure) produces.add('treasures');
    for (const [key, resources] of DIRECT_NEED_TO_CONSUME) {
      if (ctx.directNeeds[key]) {
        for (const r of resources) consumes.add(r);
      }
    }
  }

  return { produces, consumes };
}

// ── Edge functions (§1) ──────────────────────────────────────────────────

/** How many resources card A produces that B consumes, plus vice versa. Capped. */
export function pairEdge(a: CardTags, b: CardTags): number {
  let n = 0;
  for (const r of a.produces) if (b.consumes.has(r)) n++;
  for (const r of b.produces) if (a.consumes.has(r)) n++;
  return Math.min(n, PAIR_EDGE_CAP);
}

/** How many resource edges connect this card to the commander (either
 * direction). >0 means the card is "commander-synergizing". */
export function cmdEdge(card: CardTags, commander: CardTags): number {
  let n = 0;
  for (const r of card.produces) if (commander.consumes.has(r)) n++;
  for (const r of card.consumes) if (commander.produces.has(r)) n++;
  return n;
}

// ── ISS scoring (§1) ─────────────────────────────────────────────────────

export interface SynergyPair {
  a: string;
  b: string;
  weight: number;
  reasons: string[];
}

export interface SynergyGraphResult {
  /** deckISS on a 0-100 scale (v1 normalization — see ISS_NORMALIZE_CEILING). */
  deckISS: number;
  /** Raw per-card ISS, keyed by card name. */
  cardISS: Map<string, number>;
  /** Top pairs by contribution to deckISS, with human-readable reasons. */
  topSynergyPairs: SynergyPair[];
}

/**
 * Human-readable reasons two cards share an edge, e.g.
 * "Skullclamp consumes tokens ← Krenko produces tokens".
 */
export function explainEdges(a: CardLike, b: CardLike): string[] {
  const tagsA = tagCard(a);
  const tagsB = tagCard(b);
  const reasons: string[] = [];
  for (const r of tagsA.consumes) {
    if (tagsB.produces.has(r)) reasons.push(`${a.name} consumes ${r} ← ${b.name} produces ${r}`);
  }
  for (const r of tagsB.consumes) {
    if (tagsA.produces.has(r)) reasons.push(`${b.name} consumes ${r} ← ${a.name} produces ${r}`);
  }
  return reasons;
}

/**
 * Compute the full synergy graph for a deck's nonland cards, anchored on the
 * commander. Cards are deduped by name (a second copy of a 60-card-format
 * card doesn't gain a synergy edge with its own twin, and dedup keeps this
 * O(n^2) over UNIQUE cards rather than raw copies).
 */
export function computeSynergyGraph(cards: CardLike[], commander: CommanderContext): SynergyGraphResult {
  const unique = new Map<string, CardLike>();
  for (const c of cards) {
    if (isLand(c.typeLine)) continue;
    if (!unique.has(c.name)) unique.set(c.name, c);
  }
  const nodes = Array.from(unique.values());
  const tags = new Map<string, CardTags>();
  for (const c of nodes) tags.set(c.name, tagCard(c));

  const commanderTags = commanderResourceProfile(commander);
  const edgeCount = new Map<string, number>();
  for (const c of nodes) edgeCount.set(c.name, cmdEdge(tags.get(c.name)!, commanderTags));

  const cardISS = new Map<string, number>();
  const pairs: SynergyPair[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const c = nodes[i];
    const cTags = tags.get(c.name)!;
    const cHasEdge = (edgeCount.get(c.name) || 0) > 0;
    let score = cHasEdge ? ISS_BASE : 0;

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const o = nodes[j];
      const oTags = tags.get(o.name)!;
      const oHasEdge = (edgeCount.get(o.name) || 0) > 0;
      if (!oHasEdge) continue;
      const pe = pairEdge(cTags, oTags);
      if (pe > 0) score += ISS_LAMBDA * pe;
    }

    cardISS.set(c.name, score);
  }

  // Top pairs: each unordered pair's total contribution to deckISS is
  // λ·pairEdge(A,B)·([cmdEdge(A)>0] + [cmdEdge(B)>0]) — the same terms the
  // cardISS loop above accumulates, just viewed pair-wise instead of
  // per-card, so "top synergy pairs" reflects what's actually driving the
  // score rather than a raw/unweighted overlap count.
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const pe = pairEdge(tags.get(a.name)!, tags.get(b.name)!);
      if (pe <= 0) continue;
      const aEdge = (edgeCount.get(a.name) || 0) > 0;
      const bEdge = (edgeCount.get(b.name) || 0) > 0;
      const sides = (aEdge ? 1 : 0) + (bEdge ? 1 : 0);
      if (sides === 0) continue;
      const weight = ISS_LAMBDA * pe * sides;
      pairs.push({ a: a.name, b: b.name, weight, reasons: explainEdges(a, b) });
    }
  }
  pairs.sort((x, y) => y.weight - x.weight);
  const topSynergyPairs = pairs.slice(0, 8);

  const total = Array.from(cardISS.values()).reduce((s, v) => s + v, 0);
  const avg = nodes.length > 0 ? total / nodes.length : 0;
  const deckISS = Math.max(0, Math.min(100, Math.round((avg / ISS_NORMALIZE_CEILING) * 100)));

  return { deckISS, cardISS, topSynergyPairs };
}
