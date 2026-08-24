/**
 * Win plan derivation — one primary route (+ optional secondary) per
 * commander, from trigger categories, tribal detection, and curated named
 * lists (combo pairs, alt-win cards). docs/SYNERGY_ENGINE_DESIGN.md §3.
 *
 * Every deck card gets tagged with its relationship to the plan
 * ({enabler|payoff|protection|tutor_for_plan|off_plan}) — this is also the
 * backbone of the future Deck Doctor report (MONETIZATION_NOTES.md).
 *
 * Pure functions only — no DB access.
 */

import { classifyCard } from './card-classifier';
import type { CommanderSynergyProfile } from './commander-synergy';
import { tagCard } from './synergy-graph';
import type { CardLike } from './synergy-graph';

// ── Route table (§3) ────────────────────────────────────────────────────────

export type WinRoute =
  | 'combat_wide'
  | 'combat_tall'
  | 'drain'
  | 'combo'
  | 'spell_burn'
  | 'mill'
  | 'alt_win'
  | 'value_grind';

const ROUTE_DESCRIPTIONS: Record<WinRoute, string> = {
  combat_wide: 'Go wide with tokens/tribal, close with anthems and combat damage.',
  combat_tall: 'Suit up the commander (or a threat) with equipment/auras and swing for commander damage.',
  drain: 'Aristocrats value engine — creatures die, opponents lose life or you gain resources.',
  combo: 'A known 2-card combo is present — assemble it for an immediate or near-immediate win.',
  spell_burn: 'Chain cheap spells into damage/value payoffs (spellslinger/storm).',
  mill: 'Empty the opponents\' (or your own) library as the win condition.',
  alt_win: 'A named alternate win condition is in the 99 — build toward triggering it.',
  value_grind: 'No sharp win condition detected — grind card/board advantage until a generic threat closes it out.',
};

// ── Curated named lists (§3 — "seed ~15, mark exported for growth") ────────

/** Well-known 2-card infinite/near-infinite combos. Proper-cased (compared
 * case-insensitively — see lowerName()) so near-miss suggestions display
 * nicely without a DB lookup. Exported so the list can grow without touching
 * detection logic. Not exhaustive — Commander Spellbook API integration is
 * v2 (§1 "statistical... becomes a second edge source in v2"). */
export const COMBO_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Thassa's Oracle", 'Demonic Consultation'],
  ["Thassa's Oracle", 'Tainted Pact'],
  ['Exquisite Blood', 'Sanguine Bond'],
  ['Exquisite Blood', 'Vito, Thorn of the Dusk Rose'],
  ['Kiki-Jiki, Mirror Breaker', 'Zealous Conscripts'],
  ['Kiki-Jiki, Mirror Breaker', 'Restoration Angel'],
  ['Heliod, Sun-Crowned', 'Walking Ballista'],
  ['Godo, Bandit Warlord', 'Helm of the Host'],
  ['Dramatic Reversal', 'Isochron Scepter'],
  ['Splinter Twin', 'Deceiver Exarch'],
  ['Basalt Monolith', 'Rings of Brighthearth'],
  ['Palinchron', 'Deadeye Navigator'],
  ['Devoted Druid', 'Vizier of Remedies'],
  ['Pili-Pala', 'Grand Architect'],
  ['Mikaeus, the Unhallowed', 'Triskelion'],
];

/** Cards that ARE the win condition by name (alternate win conditions).
 * Compared case-insensitively — see lowerName(). */
export const ALT_WIN_NAMES: ReadonlySet<string> = new Set([
  "maze's end", 'approach of the second sun', 'coalition victory',
  'barren glory', 'felidar sovereign', 'revel in riches', 'battle of wits',
  'mechanized production', 'test of endurance', "thassa's oracle",
]);

// ── Types ────────────────────────────────────────────────────────────────

export type CardPlanRole = 'enabler' | 'payoff' | 'protection' | 'tutor_for_plan' | 'off_plan';

export interface WinPlanKeyCards {
  enablers: string[];
  payoffs: string[];
  protection: string[];
  tutors: string[];
}

export interface WinPlan {
  route: WinRoute;
  secondaryRoute?: WinRoute;
  description: string;
  keyCards: WinPlanKeyCards;
  /** Combo/alt-win pieces the deck is one card away from — a near-miss
   * suggestion list, not a hard requirement. */
  missingPieces: string[];
  /** Every input card's relationship to the plan, keyed by name. */
  cardRoles: Map<string, CardPlanRole>;
}

export interface WinPlanCard extends CardLike {
  cmc: number;
}

export interface WinPlanInput {
  commander: CardLike;
  synergyProfile: CommanderSynergyProfile | null;
  tribalType?: string | null;
  /** Nonland deck cards (main board). */
  cards: WinPlanCard[];
}

// ── Route detection ─────────────────────────────────────────────────────

const ANTHEM_PATTERN = /(?:creatures|tokens) you control get \+\d\/\+\d|other creatures you control get \+/i;
const MILL_PATTERN = /\bmill(?:s|ed|ing)?\b/i;
const CHEAP_SPELL_PATTERN = /instant|sorcery/i;
const EQUIPMENT_AURA_PATTERN = /\bEquipment\b|\bAura\b/i;

function lowerName(name: string): string {
  return (name || '').toLowerCase();
}

function findComboPresent(names: Set<string>): readonly [string, string] | null {
  for (const pair of COMBO_PAIRS) {
    if (names.has(lowerName(pair[0])) && names.has(lowerName(pair[1]))) return pair;
  }
  return null;
}

function findComboNearMisses(names: Set<string>): string[] {
  const missing: string[] = [];
  for (const [a, b] of COMBO_PAIRS) {
    const hasA = names.has(lowerName(a));
    const hasB = names.has(lowerName(b));
    if (hasA && !hasB) missing.push(b);
    else if (hasB && !hasA) missing.push(a);
  }
  return missing;
}

/**
 * Detect the primary win route. Named/explicit signals (combo, alt_win) take
 * priority over inferred archetype signals — a real "Thassa's Oracle +
 * Demonic Consultation" package is a stronger, more certain claim than a
 * trigger-category inference, so it wins ties. See §3 for the descriptive
 * table this priority cascade is built from.
 */
function detectRoute(input: WinPlanInput, allNames: Set<string>): { route: WinRoute; combo: readonly [string, string] | null } {
  const combo = findComboPresent(allNames);
  if (combo) return { route: 'combo', combo };

  const hasAltWin = input.cards.some((c) => ALT_WIN_NAMES.has(lowerName(c.name)));
  if (hasAltWin) return { route: 'alt_win', combo: null };

  const triggers = input.synergyProfile?.triggerCategories ?? [];
  const has = (cat: string) => triggers.includes(cat as never);

  // Prefer the SynergyCategory signal, but also check the commander's own
  // oracle text directly via tagCard() — commander-synergy.ts's
  // TRIGGER_PATTERNS.token_generation regex misses some real phrasing (e.g.
  // Krenko, Mob Boss's "Create X 1/1 red Goblin creature tokens" — the `X`
  // and power/toughness notation break its pattern). Fixing that pattern
  // belongs to commander-synergy.ts, which feeds live card selection and is
  // off-limits this round; tagCard() is this round's own, already-verified,
  // selection-inert signal, so it's the safe place for this fallback.
  const commanderProducesTokens = tagCard(input.commander).produces.has('tokens');
  if (has('token_generation') || commanderProducesTokens || !!input.tribalType) {
    return { route: 'combat_wide', combo: null };
  }

  const isCreatureCommander = /\bCreature\b/.test(input.commander.typeLine || '');
  const equipmentAuraCount = input.cards.filter((c) => EQUIPMENT_AURA_PATTERN.test(c.typeLine || '')).length;
  if (isCreatureCommander && equipmentAuraCount >= 6) return { route: 'combat_tall', combo: null };

  if (has('creature_dies')) return { route: 'drain', combo: null };

  if (has('spell_cast') || has('storm') || has('x_spells')) return { route: 'spell_burn', combo: null };

  const millCount = input.cards.filter((c) => MILL_PATTERN.test(c.oracleText || '')).length;
  if (millCount >= 6) return { route: 'mill', combo: null };

  return { route: 'value_grind', combo: null };
}

// ── Key card derivation (reuses the synergy-graph resource taxonomy so the
// win-plan and the ISS graph agree on what "produces tokens" etc. means) ──

function keyCardsForRoute(route: WinRoute, input: WinPlanInput, combo: readonly [string, string] | null): { enablers: string[]; payoffs: string[] } {
  const enablers: string[] = [];
  const payoffs: string[] = [];

  if (route === 'combo' && combo) {
    const [nameA, nameB] = combo;
    const cardA = [input.commander, ...input.cards].find((c) => lowerName(c.name) === lowerName(nameA));
    const cardB = [input.commander, ...input.cards].find((c) => lowerName(c.name) === lowerName(nameB));
    if (cardA) enablers.push(cardA.name);
    if (cardB) payoffs.push(cardB.name);
    return { enablers, payoffs };
  }

  if (route === 'alt_win') {
    for (const c of input.cards) {
      if (ALT_WIN_NAMES.has(lowerName(c.name))) payoffs.push(c.name);
    }
    return { enablers, payoffs };
  }

  for (const c of input.cards) {
    const tags = tagCard(c);
    switch (route) {
      case 'combat_wide':
        if (tags.produces.has('tokens') || tags.produces.has('creatures_etb')) enablers.push(c.name);
        if (ANTHEM_PATTERN.test(c.oracleText || '') || tags.consumes.has('tokens')) payoffs.push(c.name);
        break;
      case 'combat_tall':
        if (EQUIPMENT_AURA_PATTERN.test(c.typeLine || '')) enablers.push(c.name);
        break;
      case 'drain':
        if (tags.produces.has('creature_death') || tags.consumes.has('sacrifice_fodder')) enablers.push(c.name);
        if (tags.consumes.has('creature_death') || tags.consumes.has('lifegain')) payoffs.push(c.name);
        break;
      case 'spell_burn':
        if (CHEAP_SPELL_PATTERN.test(c.typeLine || '') && c.cmc <= 2) enablers.push(c.name);
        if (tags.consumes.has('spells_cast')) payoffs.push(c.name);
        break;
      case 'mill':
        if (MILL_PATTERN.test(c.oracleText || '')) enablers.push(c.name);
        break;
      case 'value_grind':
      default:
        if (tags.produces.has('mana_ramp') || tags.produces.has('card_draw')) enablers.push(c.name);
        break;
    }
  }

  return { enablers, payoffs };
}

/**
 * Derive the deck's win plan and tag every card with its relationship to it.
 */
export function deriveWinPlan(input: WinPlanInput): WinPlan {
  const allNames = new Set<string>([lowerName(input.commander.name), ...input.cards.map((c) => lowerName(c.name))]);
  const { route, combo } = detectRoute(input, allNames);
  const { enablers, payoffs } = keyCardsForRoute(route, input, combo);

  const protection: string[] = [];
  const tutors: string[] = [];
  const cardRoles = new Map<string, CardPlanRole>();

  const enablerSet = new Set(enablers.map(lowerName));
  const payoffSet = new Set(payoffs.map(lowerName));

  for (const c of input.cards) {
    const cats = classifyCard(c.name, c.oracleText || '', c.typeLine || '', c.cmc);
    const isProtection = cats.includes('protection');
    const isTutor = cats.includes('tutor');
    if (isProtection) protection.push(c.name);
    if (isTutor) tutors.push(c.name);

    let role: CardPlanRole = 'off_plan';
    const lname = lowerName(c.name);
    if (enablerSet.has(lname)) role = 'enabler';
    else if (payoffSet.has(lname)) role = 'payoff';
    else if (isProtection) role = 'protection';
    else if (isTutor) role = 'tutor_for_plan';
    cardRoles.set(c.name, role);
  }

  // Exclude the combo pair actually assembled (route === 'combo') from its
  // own near-miss list — it's not "missing", it's the plan.
  const assembled = new Set([lowerName(combo?.[0] ?? ''), lowerName(combo?.[1] ?? '')]);
  const missingPieces = findComboNearMisses(allNames)
    .filter((n) => !assembled.has(lowerName(n)));

  return {
    route,
    description: ROUTE_DESCRIPTIONS[route],
    keyCards: { enablers, payoffs, protection, tutors },
    missingPieces,
    cardRoles,
  };
}
