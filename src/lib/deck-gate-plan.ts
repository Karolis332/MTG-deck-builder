/**
 * Plan check — does a card actually interact with the commander's text?
 *
 * The 2026-09-18 Brawl failure: a chat-built list for "The Emperor of Palamecia"
 * (triggers on a noncreature spell when at least four mana was spent) was full of
 * 1-2 mana spells that could never turn the commander on. Nobody measured it.
 *
 * This module turns the commander's oracle text into a machine-checkable
 * condition and scores every nonland card against it.
 */
import { analyzeCommander } from './commander-synergy';

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function toNumber(word: string): number | null {
  const n = NUMBER_WORDS[word.toLowerCase()];
  if (n !== undefined) return n;
  const parsed = Number(word);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Spell types a commander trigger can demand of the spell you cast. */
export type SpellRequirement = 'noncreature' | 'instant_sorcery' | 'creature' | 'artifact' | 'enchantment';

export interface PlanCondition {
  /** Minimum mana value / mana spent the trigger demands, if any. */
  threshold: number | null;
  /** Spell type the trigger demands, if any. */
  requires: SpellRequirement | null;
  /** Distinctive phrases from the commander's text; a card naming one interacts. */
  nouns: string[];
  /** Human-readable summary for the verdict table. */
  description: string;
}

const COST_RULES: Array<[RegExp, 'threshold']> = [
  [/if at least (\w+) mana was spent/i, 'threshold'],
  [/with mana value (\w+) or greater/i, 'threshold'],
  [/mana value (\w+) or greater/i, 'threshold'],
];

const TYPE_RULES: Array<[RegExp, SpellRequirement]> = [
  [/noncreature spell/i, 'noncreature'],
  [/instant or sorcery spell/i, 'instant_sorcery'],
  [/creature spell/i, 'creature'],
  [/artifact spell/i, 'artifact'],
  [/enchantment spell/i, 'enchantment'],
];

/** Phrases worth checking a card's own text against, per detected trigger category. */
const CATEGORY_NOUNS: Record<string, string[]> = {
  spell_cast: ['whenever you cast', 'copy that spell', 'copy target', 'spells you cast cost'],
  storm: ['whenever you cast', 'copy that spell'],
  counters: ['+1/+1 counter'],
  creature_dies: ['creature you control dies', 'sacrifice a creature'],
  creature_etb: ['enters the battlefield'],
  attack_trigger: ['additional combat phase', 'extra combat', 'untap all creatures you control'],
  artifact_synergy: ['artifacts you control', 'artifact you control'],
  enchantment_synergy: ['enchantments you control'],
  token_generation: ['create a', 'tokens you control'],
  graveyard: ['in your graveyard', 'from your graveyard'],
  land_matters: ['landfall', 'land enters'],
  lifegain: ['whenever you gain life'],
  x_spells: ['{x}'],
  exile_cast: ['exile the top'],
  exile_enter: ['exile the top'],
  dungeon_venture: ['venture into the dungeon'],
  tribal_lands: ['basic land type'],
  five_colors: ['mana of any color'],
};

/**
 * Derive what the commander needs from the rest of the deck.
 * Only the front face's trigger sets the cost/type condition — the back face
 * (and any other clause) contributes nouns.
 */
export function deriveCondition(
  oracleText: string,
  typeLine: string,
  colorIdentity: string[],
  manaCost?: string | null
): PlanCondition {
  const text = oracleText || '';
  const front = text.split('\n//\n')[0] || text;

  let threshold: number | null = null;
  for (const [re] of COST_RULES) {
    const m = front.match(re);
    if (m) {
      threshold = toNumber(m[1]);
      if (threshold !== null) break;
    }
  }

  let requires: SpellRequirement | null = null;
  for (const [re, kind] of TYPE_RULES) {
    if (re.test(front)) {
      requires = kind;
      break;
    }
  }

  const profile = analyzeCommander(text, typeLine, colorIdentity, manaCost ?? undefined);
  const nouns = new Set<string>();
  for (const cat of profile?.triggerCategories ?? []) {
    for (const n of CATEGORY_NOUNS[cat] ?? []) nouns.add(n);
  }
  if (requires === 'noncreature') nouns.add('noncreature');
  if (/transform/i.test(text)) nouns.add('transform');

  const parts: string[] = [];
  if (requires) parts.push(requires.replace('_', '/') + ' spell');
  if (threshold !== null) parts.push(`mana value ${threshold}+`);
  const description = parts.length
    ? `commander wants: ${parts.join(', ')}`
    : profile?.payoffType
      ? `commander wants: ${profile.payoffType}`
      : 'commander sets no measurable condition';

  return { threshold, requires, nouns: [...nouns], description };
}

export interface PlanCard {
  name: string;
  cmc: number;
  typeLine: string;
  oracleText: string;
  quantity: number;
}

export interface PlanReport {
  condition: PlanCondition;
  nonland: number;
  /** Cards that satisfy the condition OR name one of the commander's trigger nouns. */
  interacting: number;
  ratio: number;
  /**
   * Cards that can actually turn the commander on (they satisfy the cost/type
   * condition). This is the strict number: "spells matter" cards name the
   * trigger without ever meeting it, and a deck of those is the 2026-09-18 bug.
   */
  enablers: number;
  enablerRatio: number;
  /** Cards that never touch the commander's text at all, cheapest first. */
  nonInteracting: Array<{ name: string; cmc: number }>;
}

function matchesType(typeLine: string, requires: SpellRequirement): boolean {
  const front = typeLine.split(' // ')[0];
  switch (requires) {
    case 'noncreature':
      return !/\bCreature\b/.test(front);
    case 'instant_sorcery':
      return /\bInstant\b|\bSorcery\b/.test(front);
    case 'creature':
      return /\bCreature\b/.test(front);
    case 'artifact':
      return /\bArtifact\b/.test(front);
    case 'enchantment':
      return /\bEnchantment\b/.test(front);
  }
}

/** True when casting this card can satisfy the commander's trigger condition. */
export function satisfiesCondition(card: PlanCard, condition: PlanCondition): boolean {
  const { threshold, requires } = condition;
  if (!requires && threshold === null) return false;
  const typeOk = requires ? matchesType(card.typeLine, requires) : true;
  const costOk = threshold === null ? true : card.cmc >= threshold;
  return typeOk && costOk;
}

/** True when the card can turn the commander on, or its own text names the trigger. */
export function interacts(card: PlanCard, condition: PlanCondition): boolean {
  if (satisfiesCondition(card, condition)) return true;
  const text = (card.oracleText || '').toLowerCase();
  return condition.nouns.some((n) => text.includes(n));
}

export function planReport(cards: PlanCard[], condition: PlanCondition): PlanReport {
  let nonland = 0;
  let interacting = 0;
  let enablers = 0;
  const nonInteracting: Array<{ name: string; cmc: number }> = [];
  for (const card of cards) {
    if (/\bLand\b/.test(card.typeLine.split(' // ')[0])) continue;
    nonland += card.quantity;
    if (satisfiesCondition(card, condition)) enablers += card.quantity;
    if (interacts(card, condition)) interacting += card.quantity;
    else nonInteracting.push({ name: card.name, cmc: card.cmc });
  }
  nonInteracting.sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));
  return {
    condition,
    nonland,
    interacting,
    ratio: nonland ? interacting / nonland : 1,
    enablers,
    enablerRatio: nonland ? enablers / nonland : 1,
    nonInteracting,
  };
}
