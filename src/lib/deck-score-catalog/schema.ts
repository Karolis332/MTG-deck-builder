/**
 * Deck Score v1.2 — typed-effect catalogue schema. docs/DECK_SCORE_SPEC.md §8
 * "Minimum typed-effect catalogue".
 *
 * An entry describes MECHANICS ONLY: never a desired score, a deck name, a
 * power tier, a staple list or an inclusion rate (§8). It is versioned with
 * the score version; a change here is a score-version bump.
 *
 * A copy counts as mechanically covered only when `knowledge === 'known'`
 * AND the live oracle text still hashes to the reviewed text — matching one
 * regex or category is explicitly insufficient (§8).
 */

/** §8: "explicit known/partial/unknown mechanics". */
export type MechanicKnowledge = 'known' | 'partial' | 'unknown';

/** §8 families: mana / advantage / answer / engine / closing-tutor. */
export type EffectFamily = 'mana' | 'advantage' | 'answer' | 'engine' | 'closing' | 'tutor';

/** How the effect is obtained. */
export type EffectMode = 'cast' | 'etb' | 'activated' | 'triggered' | 'static' | 'alternate_cost';

export type Controller = 'self' | 'opponent' | 'any';
export type Zone = 'battlefield' | 'hand' | 'graveyard' | 'library' | 'exile' | 'stack' | 'command';

/** §1 answer axes, reused so catalogued answers feed Interaction directly. */
export type AnswerAxis = 'creature' | 'permanent' | 'stack' | 'graveyard_or_protection';

export interface EffectCost {
  /** Total mana actually spent for THIS mode (printed cast cost, or the
   * activation cost for an activated mode). */
  mana: number;
  /** Coloured pips this mode demands, e.g. `['B','B']`. */
  colored?: readonly string[];
  /** §8 "additional costs": discard, sacrifice, exile, life. */
  additional?: readonly string[];
}

export interface EffectTiming {
  /** Earliest turn the mode can be used assuming one land drop per turn. */
  earliestTurn: number;
  oncePerTurn?: boolean;
  summoningSickness?: boolean;
  /** Turns between repeats; 1 = every turn. */
  interval?: number;
  instantSpeed?: boolean;
}

export interface RequiredSupply {
  /** Resource kind consumed, e.g. 'creature', 'food', 'token', 'artifact'. */
  resource: string;
  /** Copies of compatible supply the mode needs for s=1. */
  copies: number;
}

export interface TypedEffect {
  family: EffectFamily;
  mode: EffectMode;
  /** Whose permanents/actions the effect keys off (§1 "our own spells do not
   * satisfy an opponent's trigger"). */
  controller?: Controller;
  zones?: readonly Zone[];
  /** Legal targets/filters; `[]` means untargeted. */
  targetFilters?: readonly string[];
  answerAxes?: readonly AnswerAxis[];
  /** Conditions that must hold; unknown prerequisites make the entry partial. */
  prerequisites?: readonly string[];
  requiredSupply?: readonly RequiredSupply[];
  cost: EffectCost;
  timing: EffectTiming;
  consumes?: readonly string[];
  produces?: readonly string[];
  /** Lower/upper bound of the mode's output in `unit` (§1 "pools use bounded
   * cost/output bins: outputs lower-bound them"). */
  outputBounds?: { min: number; max: number | null; unit: string };
  /** Modes sharing a budget key may only be counted once per copy (§1
   * "modal alternatives share one unit budget within a component"). */
  sharedModeBudget?: string;
  /** §1: opponent-dependent triggers use a fixed .5 availability prior. */
  availabilityPrior?: number;
}

export interface CatalogEntry {
  /** Canonical oracle identity — the full card name as Scryfall prints it. */
  canonicalName: string;
  /** Face names for transform/MDFC/adventure/split layouts (§8 "face/Arena variant"). */
  faces?: readonly string[];
  /** Arena rebalanced identity, e.g. 'A-Vivi Ornitier'; null = same card. */
  arenaVariant?: string | null;
  /** Oracle text as reviewed. `oracleHash()` over this is the drift check.
   * Generated entries store `oracleHash` instead and leave this empty — the
   * shard holds ~1.2k cards and the texts would be ~20x its size. */
  oracleText: string;
  /** Reviewed-text hash, when the text itself is not stored. Exactly one of
   * `oracleText` / `oracleHash` is authoritative; `entryHash()` picks it. */
  oracleHash?: string;
  provenance: { source: string; reviewedBy: string; reviewedAt: string };
  knowledge: MechanicKnowledge;
  /** Every score-relevant effect. A partially typed card is `partial`. */
  effects: readonly TypedEffect[];
  /** Verbatim sentences the parser could not type. Non-empty => `partial`
   * (§8 "never type a card you cannot ground in its oracle text"). */
  untyped?: readonly string[];
}

/** The reviewed-text hash of an entry, whichever way it stores it. */
export function entryHash(entry: Pick<CatalogEntry, 'oracleText' | 'oracleHash'>): string {
  return entry.oracleHash ?? oracleHash(entry.oracleText);
}

/** FNV-1a, 32-bit, hex. Pure and dependency-free: this module is imported by
 * the browser bundle as well as the build-api service, so no `node:crypto`. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Whitespace-normalised hash of an oracle text (reminder text included). */
export function oracleHash(text: string | null | undefined): string {
  return fnv1a((text || '').replace(/\s+/g, ' ').trim().toLowerCase());
}
