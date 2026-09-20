/**
 * Deck Score v1 — the "deterministic feature contract" (§1). One entry per
 * unique card: support coefficient `s`, effective cost `c`, usable-unit `e`
 * (per printed copy — callers multiply by quantity), plus the typed
 * producer/consumer/answer-axis flags the other component modules key off.
 *
 * // ponytail: this is the v1 simplification the brief explicitly allows in
 * // place of §1's full "versioned local effect/plan catalogue" (effective
 * // costs, exact tutor predicates, per-requirement producer/consumer
 * // bitsets): a fixed oracle-regex catalogue + `classifyCard` roles. Upgrade
 * // path is a curated named-card catalogue keyed by canonical identity, not
 * // more regexes.
 */
import type { DbCard } from './types';
import { classifyCard, ownAbilities, isBoardWipe, isDrawEngine, type CardCategory } from './card-classifier';
import { ALT_WIN_NAMES } from './win-conditions';
import { catalogFacts } from './deck-score-catalog';

export type AnswerAxis = 'creature' | 'permanent' | 'stack' | 'graveyard_or_protection';

export interface CardFeature {
  card: DbCard;
  isLand: boolean;
  categories: CardCategory[];
  /** Support coefficient s_i in {0, 0.5, 1} — §1 "impossible predicates give
   * 0; unsupported predicates give 0.5 plus an uncertainty warning." v1 has
   * no impossible-predicate detection, so this module only emits 0.5 or 1. */
  s: number;
  /** Whether this card matched a regex-identified mechanic (feeds `s`). */
  supported: boolean;
  /** v1.2 (§8): TYPED coverage — a `known` catalogue entry whose reviewed
   * oracle text still hashes to this printing's. "Matching one regex/category
   * is insufficient", and coverage is NOT derived from `s < 1`. Only this
   * flag feeds the evidence gate and `scripts/deck-score-coverage.ts`. */
  covered: boolean;
  /** Effective cast cost c_i — v1 uses printed cmc (no activation-cost or
   * X-mode refinement; see module doc). */
  c: number;
  /** e_i per COPY: s_i * min(1, 2/max(1,c_i)). Multiply by quantity for deck totals. */
  e: number;
  power: number | null;
  isRamp: boolean;
  isDraw: boolean;
  isDrawEngine: boolean;
  /** Mass removal: the typed stabilisation section 8 asks a control line to prove. */
  isSweeper: boolean;
  isTutor: boolean;
  isRemoval: boolean;
  isWipe: boolean;
  isCounterspell: boolean;
  isProtection: boolean;
  isWinConditionRole: boolean;
  answerAxes: AnswerAxis[];
  isFoodProducer: boolean;
  isFoodPayoff: boolean;
  isTreasureProducer: boolean;
  isTokenProducer: boolean;
  /** v1.2 (§8 output bins): produces a token that can attack — a printed
   * P/T or an explicit creature token. `isTokenProducer` is deliberately
   * left alone: Treasure/Food/Clue makers are token producers for W and the
   * meta component, but they are NOT threats for a plan's output bin. */
  isCreatureTokenProducer: boolean;
  isTokenPayoff: boolean;
  isSacOutlet: boolean;
  isDrainPayoff: boolean;
  hasDiesTrigger: boolean;
  isEquipmentOrAura: boolean;
  hasEvasion: boolean;
  /** v1.2 (§8): evasion as a PRINTED keyword of this card, from the oracle
   * `keywords` column. `hasEvasion` regexes the whole oracle text, so
   * "destroy target creature with flying" counts as evasion there. */
  hasKeywordEvasion: boolean;
  isAnthemOrOverrun: boolean;
  isAltWin: boolean;
  isComboPiece: boolean;
  /** v1.2 plan roles (deck-score-plans.ts): threat and reach bins. */
  isPlaneswalker: boolean;
  isDirectDamage: boolean;
  /** v1.2 §8 engine families. `spell` = "artifact/tribal/spell conditions and
   * conversions"; `lifegain`/`counter` = "lifegain/life-payment/counters". */
  isSpellPayoff: boolean;
  isLifegainSource: boolean;
  isLifegainPayoff: boolean;
  isCounterPayoff: boolean;
}

const RE_DRAW_N = /draw (?:a|two|three|four|x|that many) cards?/i;
const RE_EACH_OPP_LOSES = /each opponent loses/i;
const RE_DESTROY_TARGET = /destroy target/i;
const RE_COUNTER_TARGET = /counter target (?:spell|activated|triggered)/i;
const RE_PROTECTION_KW = /hexproof|indestructible|regenerate[s]?\b|phases? out/i;
const RE_SAC_CREATURE = /sacrifice (?:a|another) creature/i;
const RE_DIES_TRIGGER = /whenever [^.]* dies/i;
const RE_FOOD = /\bfood\b/i;
const RE_FOOD_SAC = /sacrifice (?:a|another|that) food/i;
const RE_TREASURE = /create[^.]*treasure/i;
const RE_TOKEN_PRODUCER = /create[^.]*token/i;
/** A token with a printed body: "create a 1/1 ... creature token", "create a
 * token that's a copy of ...". Treasure/Food/Clue/Blood/Map/Powerstone token
 * lines carry neither a P/T nor the word "creature" after `create`. */
const RE_CREATURE_TOKEN = /\bcreates?\b[^.]*?(?:\d+\/\d+|creature)[^.]*?token|\bcreates?\b[^.]*?token[^.]*?copy of/i;
const RE_TOKEN_PAYOFF = /for each[^.]*token|whenever[^.]*token[^.]*enters|sacrifice[^.]*token/i;
const RE_ANTHEM = /creatures you control get \+\d\/\+\d|other creatures you control get \+/i;
const RE_EVASION = /flying|menace|trample|unblockable|can't be blocked/i;
const RE_DESTROY_PERMANENT = /destroy target (?:artifact|enchantment|permanent|nonland permanent)|exile target (?:artifact|enchantment|permanent|nonland permanent)/i;
// §8 answer family: 'damage, exile, edicts, bounce, counters/taxes, discard,
// graveyard hate, protection, wipes'. v1 only typed destroy/exile/-X/-X, so a
// Standard list whose removal is burn or bounce had NO answer axis at all and
// failed its own plan's answers requirement with a full removal suite.
const RE_DESTROY_CREATURE = /destroy target creature|exile target creature|deals? \d+ damage to target creature|target creature gets [-−]\d+\/[-−]\d+|-\d\/-\d[^.]*target creature|return target creature[^.]*(?:owner|hand)|(?:each opponent|target opponent|each player) sacrifices? a creature|fight(?:s)? target creature|target creature an opponent controls/i;
const RE_DIRECT_DAMAGE = /deals? \d+ damage to (?:target player|target opponent|any target|each opponent)/i;
// §8 engine families — a TRIGGER on the resource, never the resource's name.
const RE_SPELL_PAYOFF = /whenever you cast (?:an?|your first|another) (?:instant|sorcery|noncreature|spell)|\bmagecraft\b|\bprowess\b|for each (?:instant|sorcery) (?:card|spell)/i;
const RE_LIFEGAIN_SOURCE = /you gain \d+ life|gain (?:that much|X) life|\blifelink\b|gains? life equal to/i;
const RE_LIFEGAIN_PAYOFF = /whenever you gain(?: or lose)? life|if you gained life|for each \d+ life you gained/i;
const RE_COUNTER_PAYOFF = /whenever (?:one or more )?\+1\/\+1 counters? (?:is|are) put|for each \+1\/\+1 counter/i;

const EVASION_KEYWORDS = new Set(['flying', 'menace', 'trample', 'shadow', 'horsemanship', 'fear', 'intimidate', 'skulk']);

function keywordSet(card: DbCard): Set<string> {
  let kws: unknown;
  try { kws = card.keywords ? JSON.parse(card.keywords) : []; } catch { kws = []; }
  return new Set(Array.isArray(kws) ? kws.map((k) => String(k).toLowerCase()) : []);
}

function printedEvasion(card: DbCard): boolean {
  const list = keywordSet(card);
  for (const k of EVASION_KEYWORDS) if (list.has(k)) return true;
  return /can't be blocked/i.test(ownAbilities(card.oracle_text || ''));
}

function hasNonTrivialText(oracleText: string | null): boolean {
  const stripped = (oracleText || '').replace(/\([^)]*\)/g, '').trim();
  return stripped.length >= 20;
}

/** Per-card feature derivation. Pure — no DB/HTTP access; `card` is already loaded. */
export function deriveCardFeature(card: DbCard): CardFeature {
  const typeLine = card.type_line || '';
  const oracle = card.oracle_text || '';
  const own = ownAbilities(oracle);
  const isLand = /\bLand\b/.test(typeLine);
  const categories = isLand ? (['land'] as CardCategory[]) : classifyCard(card.name, oracle, typeLine, card.cmc ?? 0);
  const c = Math.max(0, card.cmc ?? 0);

  const matchedCatalogue =
    RE_DRAW_N.test(oracle) || RE_EACH_OPP_LOSES.test(own) || RE_DESTROY_TARGET.test(own) ||
    RE_COUNTER_TARGET.test(own) || RE_PROTECTION_KW.test(oracle) || RE_SAC_CREATURE.test(own) ||
    RE_DIES_TRIGGER.test(oracle) || RE_FOOD.test(oracle) || RE_TREASURE.test(oracle) ||
    RE_TOKEN_PRODUCER.test(oracle) || isBoardWipe(card.name, oracle) ||
    RE_SPELL_PAYOFF.test(own) || RE_ANTHEM.test(own) || RE_LIFEGAIN_SOURCE.test(oracle) ||
    RE_LIFEGAIN_PAYOFF.test(own) || RE_COUNTER_PAYOFF.test(own) ||
    categories.some((cat) => cat !== 'utility' && cat !== 'land');

  const power = card.power != null && card.power !== '' && !Number.isNaN(Number(card.power))
    ? Number(card.power)
    : null;

  // A creature whose printed power did not reach us (column absent from the
  // caller's SELECT, or a characteristic-defining `*`) is an UNKNOWN, not a
  // creature with no body. W's creature-pressure recipe filters on
  // `power != null`, so treating the gap as silence deleted every creature
  // from the closing line and returned W=0 with no diagnostic. Route it
  // through the spec's uncertainty channel instead (§1 "unsupported
  // predicates give 0.5 plus an uncertainty warning"), which raises the >20%
  // effect-coverage gate and makes the data hole visible.
  const powerUnknown = /\bCreature\b/.test(typeLine) && power === null;

  // Resolution order (§8): catalogue entry -> oracle-regex fallback -> unknown.
  // A catalogue hit whose reviewed text still matches this printing is both
  // TYPED coverage and verified support; a stale/partial entry falls through.
  const facts = catalogFacts(card.name, oracle);
  const typed = facts !== null && facts.textMatches && facts.knowledge === 'known';

  // `catalogFacts`: "a mismatch sets textMatches=false and the caller must NOT
  // treat the card as covered". A name the catalogue has REVIEWED whose live
  // printing no longer hashes to the reviewed oracle is a version mismatch
  // (§8 "corpus refreshes cannot silently edit effects"), not a vanilla card:
  // its reviewed effects are known to exist and are unverifiable on this
  // printing. Without this guard the `!hasNonTrivialText` branch below handed
  // full support AND full typed coverage to a reviewed card whose rules text
  // had been removed — §4's quota-gaming operation, where deleting a payoff's
  // text turned it into credited raw material. Measured blast radius on real
  // data: 0 of 26,191 nonland copies across fixtures, cEDH, Standard and piles.
  const staleEntry = facts !== null && !facts.textMatches;

  // Otherwise a card with no meaningful text (vanilla creature/land/mana
  // rock) makes no claim scoring needs to verify — §1 "no requirements means 1."
  const supported = typed || isLand ||
    (!staleEntry && !powerUnknown && (matchedCatalogue || !hasNonTrivialText(oracle)));
  const s = supported ? 1 : 0.5;
  const e = s * Math.min(1, 2 / Math.max(1, c));
  // Lands and textless vanillas make no mechanical claim at all, so they are
  // covered by definition; everything else needs a typed entry (§8).
  const covered = typed || isLand || (!staleEntry && !powerUnknown && !hasNonTrivialText(oracle));

  const answerAxes: AnswerAxis[] = [];
  const isWipe = !isLand && isBoardWipe(card.name, oracle);
  const isRemovalCreature = !isLand && RE_DESTROY_CREATURE.test(own);
  const isRemovalPermanent = !isLand && RE_DESTROY_PERMANENT.test(own);
  const isCounterspell = !isLand && RE_COUNTER_TARGET.test(own);
  const isProtectionAxis = !isLand && categories.includes('protection');
  if (isWipe || isRemovalCreature) answerAxes.push('creature');
  if (isRemovalPermanent) answerAxes.push('permanent');
  if (isCounterspell) answerAxes.push('stack');
  if (isProtectionAxis) answerAxes.push('graveyard_or_protection');

  const cat = typed ? facts : null;
  const produces = (what: string): boolean => cat?.produces.has(what) ?? false;

  return {
    card, isLand, categories, s,
    supported: typed || isLand || (!staleEntry && !powerUnknown && matchedCatalogue),
    covered, c, e, power,
    isRamp: categories.includes('ramp') || (cat?.families.has('mana') ?? false),
    isDraw: categories.includes('draw') || produces('cards'),
    isSweeper: isWipe,
    isDrawEngine: (!isLand && isDrawEngine(card.name, oracle, typeLine)) ||
      (cat?.families.has('advantage') === true && cat.entry.effects.some((x) => (x.timing.interval ?? 0) >= 1)),
    isTutor: categories.includes('tutor') || (cat?.families.has('tutor') ?? false),
    isRemoval: categories.includes('removal') || isRemovalCreature || isRemovalPermanent,
    isWipe,
    isCounterspell,
    isProtection: categories.includes('protection'),
    isWinConditionRole: categories.includes('win_condition') || (cat?.families.has('closing') ?? false),
    answerAxes: [...new Set([...answerAxes, ...(cat?.answerAxes ?? [])])],
    isFoodProducer: (RE_FOOD.test(oracle) && /create[^.]*food/i.test(oracle)) || produces('food'),
    isFoodPayoff: RE_FOOD_SAC.test(own),
    isTreasureProducer: RE_TREASURE.test(oracle) || produces('treasure'),
    isTokenProducer: RE_TOKEN_PRODUCER.test(oracle) || produces('treasure') || produces('food'),
    isCreatureTokenProducer: (RE_TOKEN_PRODUCER.test(oracle) && RE_CREATURE_TOKEN.test(oracle)) || produces('creature token'),
    isTokenPayoff: RE_TOKEN_PAYOFF.test(own),
    isSacOutlet: RE_SAC_CREATURE.test(own) || produces('sacrifice outlet'),
    isDrainPayoff: RE_EACH_OPP_LOSES.test(own) || produces('all-opponent drain') || produces('single-target drain'),
    hasDiesTrigger: RE_DIES_TRIGGER.test(oracle) || (cat?.consumes.has('creature deaths') ?? false),
    isEquipmentOrAura: /\bEquipment\b|\bAura\b/.test(typeLine),
    hasEvasion: RE_EVASION.test(oracle),
    hasKeywordEvasion: printedEvasion(card),
    isAnthemOrOverrun: RE_ANTHEM.test(own),
    isAltWin: ALT_WIN_NAMES.has(card.name.toLowerCase()) || produces('alternate win'),
    isComboPiece: false, // set by deck-score-win.ts once the deck's card set is known
    isPlaneswalker: /\bPlaneswalker\b/.test(typeLine),
    isDirectDamage: !isLand && RE_DIRECT_DAMAGE.test(own),
    isSpellPayoff: !isLand && (RE_SPELL_PAYOFF.test(own) || keywordSet(card).has('prowess') || keywordSet(card).has('magecraft')),
    isLifegainSource: !isLand && (RE_LIFEGAIN_SOURCE.test(oracle) || keywordSet(card).has('lifelink')),
    isLifegainPayoff: !isLand && RE_LIFEGAIN_PAYOFF.test(own),
    isCounterPayoff: !isLand && RE_COUNTER_PAYOFF.test(own),
  };
}

/** Colored-pip demand for one card, `{C}` counted as its own color per §1 M. */
export function pipDemandByColor(card: DbCard): Record<string, number> {
  const mc = card.mana_cost || '';
  const out: Record<string, number> = {};
  for (const m of mc.matchAll(/\{([WUBRGC])\}/g)) {
    out[m[1]] = (out[m[1]] || 0) + 1;
  }
  return out;
}
