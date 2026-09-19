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

export type AnswerAxis = 'creature' | 'permanent' | 'stack' | 'graveyard_or_protection';

export interface CardFeature {
  card: DbCard;
  isLand: boolean;
  categories: CardCategory[];
  /** Support coefficient s_i in {0, 0.5, 1} — §1 "impossible predicates give
   * 0; unsupported predicates give 0.5 plus an uncertainty warning." v1 has
   * no impossible-predicate detection, so this module only emits 0.5 or 1. */
  s: number;
  /** Whether this card matched a catalogued mechanic (for the >20% coverage gate). */
  supported: boolean;
  /** Effective cast cost c_i — v1 uses printed cmc (no activation-cost or
   * X-mode refinement; see module doc). */
  c: number;
  /** e_i per COPY: s_i * min(1, 2/max(1,c_i)). Multiply by quantity for deck totals. */
  e: number;
  power: number | null;
  isRamp: boolean;
  isDraw: boolean;
  isDrawEngine: boolean;
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
  isTokenPayoff: boolean;
  isSacOutlet: boolean;
  isDrainPayoff: boolean;
  hasDiesTrigger: boolean;
  isEquipmentOrAura: boolean;
  hasEvasion: boolean;
  isAnthemOrOverrun: boolean;
  isAltWin: boolean;
  isComboPiece: boolean;
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
const RE_TOKEN_PAYOFF = /for each[^.]*token|whenever[^.]*token[^.]*enters|sacrifice[^.]*token/i;
const RE_ANTHEM = /creatures you control get \+\d\/\+\d|other creatures you control get \+/i;
const RE_EVASION = /flying|menace|trample|unblockable|can't be blocked/i;
const RE_DESTROY_PERMANENT = /destroy target (?:artifact|enchantment|permanent)|exile target (?:artifact|enchantment|permanent)/i;
const RE_DESTROY_CREATURE = /destroy target creature|exile target creature|-\d\/-\d[^.]*target creature/i;

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

  // Otherwise a card with no meaningful text (vanilla creature/land/mana
  // rock) makes no claim scoring needs to verify — §1 "no requirements means 1."
  const supported = !powerUnknown && (isLand || matchedCatalogue || !hasNonTrivialText(oracle));
  const s = supported ? 1 : 0.5;
  const e = s * Math.min(1, 2 / Math.max(1, c));

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

  return {
    card, isLand, categories, s, supported: !powerUnknown && (isLand || matchedCatalogue), c, e, power,
    isRamp: categories.includes('ramp'),
    isDraw: categories.includes('draw'),
    isDrawEngine: !isLand && isDrawEngine(card.name, oracle, typeLine),
    isTutor: categories.includes('tutor'),
    isRemoval: categories.includes('removal') || isRemovalCreature || isRemovalPermanent,
    isWipe,
    isCounterspell,
    isProtection: categories.includes('protection'),
    isWinConditionRole: categories.includes('win_condition'),
    answerAxes,
    isFoodProducer: RE_FOOD.test(oracle) && /create[^.]*food/i.test(oracle),
    isFoodPayoff: RE_FOOD_SAC.test(own),
    isTreasureProducer: RE_TREASURE.test(oracle),
    isTokenProducer: RE_TOKEN_PRODUCER.test(oracle),
    isTokenPayoff: RE_TOKEN_PAYOFF.test(own),
    isSacOutlet: RE_SAC_CREATURE.test(own),
    isDrainPayoff: RE_EACH_OPP_LOSES.test(own),
    hasDiesTrigger: RE_DIES_TRIGGER.test(oracle),
    isEquipmentOrAura: /\bEquipment\b|\bAura\b/.test(typeLine),
    hasEvasion: RE_EVASION.test(oracle),
    isAnthemOrOverrun: RE_ANTHEM.test(own),
    isAltWin: ALT_WIN_NAMES.has(card.name.toLowerCase()),
    isComboPiece: false, // set by deck-score-win.ts once the deck's card set is known
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
