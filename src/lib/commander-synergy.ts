/**
 * Commander Synergy Analyzer — parses commander oracle text to detect
 * trigger/payoff patterns and infer deck-building requirements.
 *
 * The problem: the deck builder treats the commander as just another card.
 * It fetches EDHREC data, but never reads the commander's oracle text to
 * understand what it actually does. This module fixes that by detecting
 * what triggers/payoffs a commander has and mapping those to concrete
 * deck-building requirements (minimum card counts, search patterns, score bonuses).
 */

import type { Archetype, ArchetypeTemplate } from './deck-templates';

// ── Types ────────────────────────────────────────────────────────────────────

export type SynergyCategory =
  | 'exile_cast'
  | 'exile_enter'
  | 'spell_cast'
  | 'creature_dies'
  | 'creature_etb'
  | 'attack_trigger'
  | 'artifact_synergy'
  | 'enchantment_synergy'
  | 'lifegain'
  | 'counters'
  | 'graveyard'
  | 'token_generation';

export interface CommanderSynergyProfile {
  /** Override generic CMC-based archetype detection */
  detectedArchetype: Archetype | null;
  /** What makes the commander tick */
  triggerCategories: SynergyCategory[];
  /** What happens when triggered (human-readable) */
  payoffType: string;
  /** Min card counts per synergy category */
  synergyMinimums: Record<string, number>;
  /** SQL LIKE patterns for finding synergy cards */
  cardPoolPatterns: string[];
  /** Extra score for cards matching each synergy category */
  scoreBonuses: Record<string, number>;
  /** Card name patterns to never cut */
  protectedPatterns: string[];
  /** Human-readable strategy description for AI prompts */
  strategyDescription: string;
  /** Reduction to external draw requirement (commander generates draw) */
  drawReduction: number;
  /** Reduction to external removal requirement (commander is removal) */
  removalReduction: number;
}

// ── Trigger Pattern Library ──────────────────────────────────────────────────

export const TRIGGER_PATTERNS: Record<SynergyCategory, RegExp[]> = {
  exile_cast: [
    /(?:whenever you )?cast (?:a |an )?(?:spell|card) from exile/i,
    /play (?:cards?|spells?) from exile/i,
    /you may (?:play|cast) (?:cards?|spells?) (?:from exile|exiled)/i,
    /whenever you play a (?:card|land) from exile/i,
  ],
  exile_enter: [
    /enters (?:the battlefield )?from exile/i,
    /return (?:it|them|that (?:card|creature)) from exile to the battlefield/i,
    /exile .* then return/i,
  ],
  spell_cast: [
    /whenever you cast an? (?:instant|sorcery|instant or sorcery|noncreature)/i,
    /magecraft/i,
    /prowess/i,
    /whenever you cast (?:a |your )?\w+ spell/i,
  ],
  creature_dies: [
    /whenever (?:a |another )?(?:nontoken )?creature (?:you control )?dies/i,
    /whenever you sacrifice/i,
    /whenever (?:a |another )?creature (?:is put|you control is put) into (?:a |your )?graveyard/i,
  ],
  creature_etb: [
    /whenever (?:a |another )?creature enters the battlefield/i,
    /whenever (?:a |another )?(?:nontoken )?creature enters/i,
  ],
  attack_trigger: [
    /whenever .+ attacks/i,
    /whenever .+ deals combat damage/i,
    /whenever you attack/i,
    /at the beginning of combat/i,
  ],
  artifact_synergy: [
    /whenever (?:a |an )?artifact enters the battlefield/i,
    /artifacts? you control/i,
    /affinity for artifacts/i,
    /whenever you cast an artifact/i,
  ],
  enchantment_synergy: [
    /whenever (?:a |an )?enchantment enters the battlefield/i,
    /enchantments? you control/i,
    /constellation/i,
    /whenever you cast an enchantment/i,
  ],
  lifegain: [
    /whenever you gain life/i,
    /whenever (?:a |one or more )?(?:player|you) gains? life/i,
    /pay .* life.*:/i,
  ],
  counters: [
    /\+1\/\+1 counter/i,
    /proliferate/i,
    /whenever (?:a |one or more )?counters? (?:are|is) (?:put|placed)/i,
    /modify/i,
  ],
  graveyard: [
    /(?:return|cast) .* from your graveyard/i,
    /whenever .* (?:is put|put) into your graveyard/i,
    /mill/i,
    /dredge/i,
    /(?:cards in|from) your graveyard/i,
  ],
  token_generation: [
    /create (?:a |an |two |three )?\d*\/?\.* ?(?:\w+ )*(?:creature )?tokens?/i,
    /whenever .* create (?:a |an )?token/i,
    /tokens? you control/i,
  ],
};

// ── Payoff Detection ─────────────────────────────────────────────────────────

interface PayoffMatch {
  pattern: RegExp;
  description: string;
  isDrawPayoff: boolean;
  isRemovalPayoff: boolean;
}

const PAYOFF_PATTERNS: PayoffMatch[] = [
  { pattern: /draw (?:a |two |\d+ )?cards?/i, description: 'draws cards', isDrawPayoff: true, isRemovalPayoff: false },
  { pattern: /deals? \d+ damage/i, description: 'deals damage', isDrawPayoff: false, isRemovalPayoff: true },
  { pattern: /create (?:a |an |two |three )?\d*\/?\.* ?(?:\w+ )*tokens?/i, description: 'creates tokens', isDrawPayoff: false, isRemovalPayoff: false },
  { pattern: /put (?:a )?(?:\+1\/\+1|\-1\/\-1) counter/i, description: 'distributes counters', isDrawPayoff: false, isRemovalPayoff: false },
  { pattern: /you gain \d+ life/i, description: 'gains life', isDrawPayoff: false, isRemovalPayoff: false },
  { pattern: /destroy target/i, description: 'destroys threats', isDrawPayoff: false, isRemovalPayoff: true },
  { pattern: /exile target/i, description: 'exiles threats', isDrawPayoff: false, isRemovalPayoff: true },
  { pattern: /each opponent loses/i, description: 'drains opponents', isDrawPayoff: false, isRemovalPayoff: false },
  { pattern: /return .* to (?:its |their )?owner/i, description: 'bounces threats', isDrawPayoff: false, isRemovalPayoff: true },
];

// ── Synergy Requirements ─────────────────────────────────────────────────────

const SYNERGY_REQUIREMENTS: Record<SynergyCategory, {
  min: number;
  searchPatterns: string[];
  scoreBonus: number;
}> = {
  exile_cast: {
    min: 10,
    searchPatterns: [
      '%exile the top%',
      '%you may play%until%',
      '%you may cast%from exile%',
      '%exile%you may play%',
      '%exile%you may cast%',
    ],
    scoreBonus: 25,
  },
  exile_enter: {
    min: 5,
    searchPatterns: [
      '%exile%return%to the battlefield%',
      '%flicker%',
      '%blink%',
      '%exile%then return%',
    ],
    scoreBonus: 20,
  },
  spell_cast: {
    min: 25,
    searchPatterns: [], // type_line filter instead
    scoreBonus: 15,
  },
  creature_dies: {
    min: 8,
    searchPatterns: [
      '%whenever%creature%dies%',
      '%sacrifice a creature%',
      '%when this creature dies%',
      '%whenever you sacrifice%',
    ],
    scoreBonus: 20,
  },
  creature_etb: {
    min: 8,
    searchPatterns: [
      '%enters the battlefield%',
      '%when%enters%',
    ],
    scoreBonus: 15,
  },
  attack_trigger: {
    min: 6,
    searchPatterns: [
      '%haste%',
      '%extra combat%',
      '%additional combat%',
      '%can\'t be blocked%',
      '%menace%',
      '%trample%',
    ],
    scoreBonus: 20,
  },
  artifact_synergy: {
    min: 10,
    searchPatterns: [
      '%create%treasure%',
      '%create%artifact%token%',
      '%affinity%',
      '%whenever%artifact%',
    ],
    scoreBonus: 20,
  },
  enchantment_synergy: {
    min: 10,
    searchPatterns: [
      '%enchant%',
      '%aura%',
      '%constellation%',
      '%whenever%enchantment%',
    ],
    scoreBonus: 20,
  },
  lifegain: {
    min: 8,
    searchPatterns: [
      '%lifelink%',
      '%you gain%life%',
      '%whenever you gain life%',
    ],
    scoreBonus: 20,
  },
  counters: {
    min: 8,
    searchPatterns: [
      '%+1/+1 counter%',
      '%proliferate%',
      '%put%counter%on%',
    ],
    scoreBonus: 20,
  },
  graveyard: {
    min: 8,
    searchPatterns: [
      '%from your graveyard%',
      '%mill%',
      '%put into your graveyard%',
      '%reanimate%',
      '%return%from%graveyard%',
    ],
    scoreBonus: 20,
  },
  token_generation: {
    min: 8,
    searchPatterns: [
      '%create%token%',
      '%populate%',
      '%whenever%token%',
      '%tokens you control%',
    ],
    scoreBonus: 15,
  },
};

// ── Archetype Inference Rules ────────────────────────────────────────────────

function inferArchetype(triggers: SynergyCategory[], hasAttackTrigger: boolean): Archetype | null {
  const has = (cat: SynergyCategory) => triggers.includes(cat);

  if (has('spell_cast')) return 'spellslinger';
  if (has('creature_dies')) return 'aristocrats';
  if (has('graveyard') && !has('creature_dies')) return 'reanimator';

  if (has('exile_cast') || has('exile_enter')) {
    if (hasAttackTrigger) return 'aggro';
    return 'midrange';
  }

  if (has('attack_trigger') && has('counters')) return 'aggro';
  if (has('attack_trigger') && triggers.length <= 2) return 'voltron';
  if (has('artifact_synergy')) return 'midrange';
  if (has('enchantment_synergy')) return 'midrange';
  if (has('lifegain')) return 'midrange';
  if (has('counters')) return 'midrange';
  if (has('token_generation')) return 'midrange';
  if (has('creature_etb')) return 'midrange';

  return null;
}

// ── Main Analyzer ────────────────────────────────────────────────────────────

/**
 * Analyze a commander's oracle text to detect synergy patterns, infer
 * an archetype, and produce concrete deck-building requirements.
 *
 * For MDFC/double-faced commanders, pass the concatenated oracle text
 * from both faces. For partner commanders, call once per partner and
 * merge with `mergeProfiles()`.
 *
 * Returns null if no meaningful patterns are detected (vanilla commander).
 */
export function analyzeCommander(
  oracleText: string,
  typeLine: string,
  colorIdentity: string[]
): CommanderSynergyProfile | null {
  if (!oracleText || oracleText.trim().length === 0) return null;

  const text = oracleText.toLowerCase();

  // ── Detect trigger categories ──────────────────────────────────────
  const triggerCategories: SynergyCategory[] = [];

  for (const [category, patterns] of Object.entries(TRIGGER_PATTERNS) as [SynergyCategory, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        triggerCategories.push(category);
        break;
      }
    }
  }

  if (triggerCategories.length === 0) return null;

  // ── Detect payoff type ─────────────────────────────────────────────
  const payoffDescriptions: string[] = [];
  let hasDrawPayoff = false;
  let hasRemovalPayoff = false;

  for (const payoff of PAYOFF_PATTERNS) {
    if (payoff.pattern.test(text)) {
      payoffDescriptions.push(payoff.description);
      if (payoff.isDrawPayoff) hasDrawPayoff = true;
      if (payoff.isRemovalPayoff) hasRemovalPayoff = true;
    }
  }

  const payoffType = payoffDescriptions.length > 0
    ? payoffDescriptions.join(', ')
    : 'general value';

  // ── Infer archetype ────────────────────────────────────────────────
  const hasAttack = triggerCategories.includes('attack_trigger');
  const detectedArchetype = inferArchetype(triggerCategories, hasAttack);

  // ── Build synergy minimums + card pool patterns + score bonuses ────
  const synergyMinimums: Record<string, number> = {};
  const cardPoolPatterns: string[] = [];
  const scoreBonuses: Record<string, number> = {};

  for (const category of triggerCategories) {
    const req = SYNERGY_REQUIREMENTS[category];
    synergyMinimums[category] = req.min;
    scoreBonuses[category] = req.scoreBonus;
    for (const pattern of req.searchPatterns) {
      if (!cardPoolPatterns.includes(pattern)) {
        cardPoolPatterns.push(pattern);
      }
    }
  }

  // ── Protected patterns (synergy-critical cards to never cut) ───────
  const protectedPatterns: string[] = [];
  if (triggerCategories.includes('exile_cast') || triggerCategories.includes('exile_enter')) {
    protectedPatterns.push(
      'outpost siege', 'jeska\'s will', 'light up the stage',
      'chaos warp', 'wild-magic sorcerer', 'delayed blast fireball',
    );
  }
  if (triggerCategories.includes('spell_cast')) {
    protectedPatterns.push(
      'young pyromancer', 'storm-kiln artist', 'guttersnipe',
      'talrand, sky summoner', 'archmage emeritus',
    );
  }
  if (triggerCategories.includes('creature_dies')) {
    protectedPatterns.push(
      'blood artist', 'zulaport cutthroat', 'viscera seer',
      'ashnod\'s altar', 'phyrexian altar',
    );
  }
  if (triggerCategories.includes('counters')) {
    protectedPatterns.push(
      'hardened scales', 'branching evolution', 'doubling season',
      'ozolith, the shattered spire',
    );
  }
  if (triggerCategories.includes('graveyard')) {
    protectedPatterns.push(
      'reanimate', 'animate dead', 'entomb', 'buried alive',
    );
  }
  if (triggerCategories.includes('token_generation')) {
    protectedPatterns.push(
      'doubling season', 'anointed procession', 'parallel lives',
      'divine visitation',
    );
  }

  // ── Commander-as-engine adjustments ────────────────────────────────
  // If the commander itself generates draw, need less external draw
  const drawReduction = hasDrawPayoff ? 3 : 0;
  // If the commander is removal, need less external removal
  const removalReduction = hasRemovalPayoff ? 2 : 0;

  // ── Strategy description for AI prompts ────────────────────────────
  const strategyDescription = buildStrategyDescription(
    triggerCategories, payoffType, synergyMinimums,
    drawReduction, removalReduction, detectedArchetype,
  );

  return {
    detectedArchetype,
    triggerCategories,
    payoffType,
    synergyMinimums,
    cardPoolPatterns,
    scoreBonuses,
    protectedPatterns,
    strategyDescription,
    drawReduction,
    removalReduction,
  };
}

// ── Merge Profiles (for partner commanders) ──────────────────────────────────

/**
 * Merge two commander synergy profiles (e.g. for partner commanders).
 * Combines trigger categories, takes the higher of each minimum, and
 * merges all patterns and bonuses.
 */
export function mergeProfiles(
  a: CommanderSynergyProfile,
  b: CommanderSynergyProfile
): CommanderSynergyProfile {
  const triggerCategories = Array.from(new Set([...a.triggerCategories, ...b.triggerCategories]));
  const hasAttack = triggerCategories.includes('attack_trigger');
  const detectedArchetype = inferArchetype(triggerCategories, hasAttack) || a.detectedArchetype || b.detectedArchetype;

  const synergyMinimums: Record<string, number> = { ...a.synergyMinimums };
  for (const [k, v] of Object.entries(b.synergyMinimums)) {
    synergyMinimums[k] = Math.max(synergyMinimums[k] || 0, v);
  }

  const scoreBonuses: Record<string, number> = { ...a.scoreBonuses };
  for (const [k, v] of Object.entries(b.scoreBonuses)) {
    scoreBonuses[k] = Math.max(scoreBonuses[k] || 0, v);
  }

  return {
    detectedArchetype,
    triggerCategories,
    payoffType: [a.payoffType, b.payoffType].filter(Boolean).join('; '),
    synergyMinimums,
    cardPoolPatterns: Array.from(new Set([...a.cardPoolPatterns, ...b.cardPoolPatterns])),
    scoreBonuses,
    protectedPatterns: Array.from(new Set([...a.protectedPatterns, ...b.protectedPatterns])),
    strategyDescription: `${a.strategyDescription}\n\n${b.strategyDescription}`,
    drawReduction: Math.max(a.drawReduction, b.drawReduction),
    removalReduction: Math.max(a.removalReduction, b.removalReduction),
  };
}

// ── Strategy Description Builder ─────────────────────────────────────────────

function buildStrategyDescription(
  triggers: SynergyCategory[],
  payoffType: string,
  minimums: Record<string, number>,
  drawReduction: number,
  removalReduction: number,
  archetype: Archetype | null,
): string {
  const lines: string[] = [];

  lines.push(`**Detected Archetype**: ${archetype || 'midrange'}`);
  lines.push(`**Commander Payoff**: ${payoffType}`);
  lines.push('');
  lines.push('**Synergy Requirements** (these fill FLEX slots, not baseline ramp/draw/removal):');

  const categoryLabels: Record<SynergyCategory, string> = {
    exile_cast: 'Impulse draw / cast-from-exile effects',
    exile_enter: 'Blink / flicker / exile-and-return effects',
    spell_cast: 'Instants and sorceries (spell density)',
    creature_dies: 'Death trigger payoffs and sacrifice outlets',
    creature_etb: 'ETB value creatures and blink effects',
    attack_trigger: 'Haste sources, extra combats, evasion',
    artifact_synergy: 'Artifact producers and artifact payoffs',
    enchantment_synergy: 'Enchantments and constellation/aura synergies',
    lifegain: 'Lifegain sources (lifelink, incidental life)',
    counters: 'Counter synergy cards (proliferate, hardened scales effects)',
    graveyard: 'Self-mill, reanimation spells, graveyard recursion',
    token_generation: 'Token producers and token payoffs (anthems, sacrifice)',
  };

  for (const trigger of triggers) {
    const min = minimums[trigger] || 0;
    const label = categoryLabels[trigger];
    lines.push(`- ${label}: **${min}+ cards**`);
  }

  if (drawReduction > 0) {
    lines.push('');
    lines.push(`**Commander generates card advantage** → reduce external draw requirement by ${drawReduction}`);
  }
  if (removalReduction > 0) {
    lines.push(`**Commander is removal** → reduce external removal requirement by ${removalReduction}`);
  }

  lines.push('');
  lines.push('**CRITICAL**: Synergy cards fill FLEX slots. NEVER reduce ramp below 8, draw below 6, or removal below 6 to make room for synergy.');

  return lines.join('\n');
}

// ── AI Prompt Generator ──────────────────────────────────────────────────────

/**
 * Generate a human-readable strategy block for injection into AI prompts
 * (used by claude-suggest.ts).
 */
export function getCommanderStrategyPrompt(profile: CommanderSynergyProfile): string {
  return `# COMMANDER STRATEGY ANALYSIS

${profile.strategyDescription}

**Trigger Categories**: ${profile.triggerCategories.join(', ')}
**Protected Synergy Cards** (NEVER CUT): ${profile.protectedPatterns.join(', ') || 'none'}
`;
}
