/**
 * Card classification engine for deck analysis.
 * Categorizes MTG cards by function: ramp, draw, removal, board wipe, protection, synergy.
 * Uses oracle text pattern matching with weighted confidence scores.
 */

export type CardCategory =
  | 'land'
  | 'ramp'
  | 'draw'
  | 'removal'
  | 'board_wipe'
  | 'protection'
  | 'synergy'
  | 'win_condition'
  | 'utility';

export interface ClassifiedCard {
  name: string;
  cardId: string;
  categories: CardCategory[];
  primaryCategory: CardCategory;
  cmc: number;
  typeLine: string;
  oracleText: string;
  mlScore?: number;
  metaInclusionRate?: number;
  synergyScore?: number;
}

export interface DeckRatioTarget {
  min: number;
  max: number;
  target: number;
}

export interface FormatRatios {
  deckSize: number;
  targets: Record<string, DeckRatioTarget>;
  avgCMC: { min: number; max: number; target: number };
}

export interface RatioHealth {
  category: string;
  label: string;
  current: number;
  target: DeckRatioTarget;
  status: 'low' | 'ok' | 'high';
  color: string;
}

export interface DeckAnalysis {
  deckId: number;
  deckName: string;
  format: string;
  commander?: string;
  totalCards: number;
  avgCMC: number;
  categories: Record<CardCategory, ClassifiedCard[]>;
  ratioHealth: RatioHealth[];
  overallScore: number;
  manaCurve: Record<number, number>;
  suggestions: string[];
}

// ── Format ratio targets ──────────────────────────────────────────────────

const BRAWL_100_RATIOS: FormatRatios = {
  deckSize: 100,
  targets: {
    land: { min: 35, max: 40, target: 38 },
    ramp: { min: 8, max: 12, target: 10 },
    draw: { min: 8, max: 12, target: 10 },
    removal: { min: 8, max: 12, target: 10 },
    board_wipe: { min: 2, max: 4, target: 3 },
    protection: { min: 3, max: 6, target: 4 },
    synergy: { min: 5, max: 10, target: 8 },
    win_condition: { min: 5, max: 10, target: 7 },
  },
  avgCMC: { min: 2.8, max: 3.5, target: 3.1 },
};

const BRAWL_60_RATIOS: FormatRatios = {
  deckSize: 60,
  targets: {
    land: { min: 24, max: 26, target: 25 },
    ramp: { min: 5, max: 8, target: 6 },
    draw: { min: 5, max: 8, target: 6 },
    removal: { min: 5, max: 8, target: 6 },
    board_wipe: { min: 1, max: 3, target: 2 },
    protection: { min: 2, max: 4, target: 3 },
    synergy: { min: 3, max: 6, target: 4 },
    win_condition: { min: 3, max: 6, target: 4 },
  },
  avgCMC: { min: 2.5, max: 3.2, target: 2.8 },
};

const COMMANDER_RATIOS: FormatRatios = {
  deckSize: 100,
  targets: {
    land: { min: 35, max: 38, target: 37 },
    ramp: { min: 10, max: 12, target: 11 },
    draw: { min: 10, max: 12, target: 11 },
    removal: { min: 10, max: 12, target: 11 },
    board_wipe: { min: 3, max: 4, target: 3 },
    protection: { min: 3, max: 6, target: 4 },
    synergy: { min: 8, max: 12, target: 10 },
    win_condition: { min: 4, max: 6, target: 5 },
  },
  avgCMC: { min: 2.8, max: 3.2, target: 3.0 },
};

const GENERIC_60_RATIOS: FormatRatios = {
  deckSize: 60,
  targets: {
    land: { min: 22, max: 26, target: 24 },
    ramp: { min: 4, max: 8, target: 6 },
    draw: { min: 4, max: 8, target: 6 },
    removal: { min: 6, max: 10, target: 8 },
    board_wipe: { min: 1, max: 3, target: 2 },
    protection: { min: 2, max: 4, target: 3 },
    synergy: { min: 0, max: 10, target: 0 },
    win_condition: { min: 4, max: 8, target: 6 },
  },
  avgCMC: { min: 2.3, max: 3.2, target: 2.7 },
};

export function getFormatRatios(format: string): FormatRatios {
  switch (format) {
    case 'brawl':
      return BRAWL_100_RATIOS;
    case 'standardbrawl':
      return BRAWL_60_RATIOS;
    case 'commander':
      return COMMANDER_RATIOS;
    default:
      return GENERIC_60_RATIOS;
  }
}

// ── Oracle text pattern matchers ──────────────────────────────────────────

const RAMP_PATTERNS = [
  /add \{[WUBRGC1-9]\}/i,
  /add one mana of any/i,
  /add (?:one|two|three) mana/i,
  /search your library for (?:a|up to \w+) (?:basic )?land/i,
  /put (?:a|that|it) (?:land )?(?:card )?onto the battlefield/i,
  /land card (?:from|and) .* onto the battlefield/i,
  /you may play an additional land/i,
  /\{T\}: Add/i,
];

const RAMP_NAMES = new Set([
  'sol ring', 'arcane signet', 'mind stone', 'thought vessel', 'commander\'s sphere',
  'fellwar stone', 'mana crypt', 'mox amber', 'mox opal', 'chrome mox',
  'wayfarer\'s bauble', 'cultivate', 'kodama\'s reach', 'farseek', 'rampant growth',
  'nature\'s lore', 'three visits', 'skyshroud claim', 'sakura-tribe elder',
  'llanowar elves', 'elvish mystic', 'birds of paradise', 'noble hierarch',
  'bloom tender', 'fyndhorn elves', 'elves of deep shadow', 'avacyn\'s pilgrim',
  'explore', 'utopia sprawl', 'wild growth', 'carpet of flowers',
  'burnished hart', 'solemn simulacrum', 'ornithopter of paradise',
  'burgeoning', 'nissa, who shakes the world', 'crop rotation',
  'tireless provisioner',
]);

const DRAW_PATTERNS = [
  /draw (?:a |two |three |four |\d+ )?card/i,
  /draws? (?:a |two |three |\d+ )?card/i,
  /look at the top .* card/i,
  /reveal the top .* put .* into your hand/i,
  /search your library for a (?!land)(?!basic)/i,
  /scry \d/i,
];

const DRAW_NAMES = new Set([
  'rhystic study', 'mystic remora', 'sylvan library', 'necropotence',
  'phyrexian arena', 'dark confidant', 'brainstorm', 'ponder', 'preordain',
  'harmonize', 'rishkar\'s expertise', 'beast whisperer', 'guardian project',
  'the great henge', 'return of the wildspeaker', 'garruk\'s uprising',
  'up the beanstalk', 'season of growth', 'inspiring call', 'genesis wave',
  'many partings', 'worldly tutor', 'bonders\' enclave',
  'leaves from the vine', 'cache grab',
]);

const REMOVAL_PATTERNS = [
  /destroy target (?!all)(?!each)/i,
  /exile target/i,
  /deals? \d+ damage to (?:target|any target)/i,
  /target creature gets? [+-]\d+\/[+-]\d+/i,
  /return target .* to (?:its|their) owner/i,
  /target player sacrifices/i,
  /fights? target/i,
  /target .* fights?/i,
  /destroy .* target/i,
];

const REMOVAL_NAMES = new Set([
  'swords to plowshares', 'path to exile', 'beast within', 'chaos warp',
  'generous gift', 'assassin\'s trophy', 'anguished unmaking', 'vindicate',
  'abrupt decay', 'fateful absence', 'lightning bolt', 'prismatic ending',
  'kenrith\'s transformation', 'reclamation sage', 'rabid bite',
  'rocky rebuke', 'bushwhack', 'broken bond', 'horrific assault',
  'soul-guide lantern', 'scavenging ooze',
]);

const BOARD_WIPE_PATTERNS = [
  /destroy all (?:creatures|permanents|nonland|artifacts|enchantments)/i,
  /exile all (?:creatures|permanents|nonland)/i,
  /each (?:creature|player|opponent) .* deals? .* damage/i,
  /deals? \d+ damage to each creature/i,
  /all creatures get [+-]\d+\/[+-]\d+ until/i,
  /return all .* to (?:their|its) owner/i,
];

const BOARD_WIPE_NAMES = new Set([
  'wrath of god', 'damnation', 'cyclonic rift', 'supreme verdict',
  'toxic deluge', 'blasphemous act', 'farewell', 'vanquish the horde',
  'meathook massacre', 'massacre wurm', 'living death', 'austere command',
  'hour of revelation', 'in garruk\'s wake', 'chain reaction',
  'night of the sweets\' revenge',
]);

const PROTECTION_PATTERNS = [
  /(?:target|a) (?:creature|permanent) .* (?:hexproof|indestructible|shroud)/i,
  /gains? (?:hexproof|indestructible|shroud|protection)/i,
  /can't be (?:the target|destroyed|countered)/i,
  /counter target (?:spell|ability)/i,
  /(?:hexproof|indestructible|shroud) until end of turn/i,
];

const PROTECTION_NAMES = new Set([
  'heroic intervention', 'teferi\'s protection', 'flawless maneuver',
  'boros charm', 'counterspell', 'swan song', 'dovin\'s veto', 'negate',
  'fierce guardianship', 'force of will', 'force of negation', 'pact of negation',
  'deflecting swat', 'lightning greaves', 'swiftfoot boots',
  'snakeskin veil', 'blossoming defense', 'overprotect',
]);

// ── Classification logic ──────────────────────────────────────────────────

function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

function isLand(typeLine: string): boolean {
  return /\bLand\b/.test(typeLine);
}

function isBasicLand(typeLine: string, name: string): boolean {
  return /\bBasic\b/.test(typeLine) || /^(Plains|Island|Swamp|Mountain|Forest|Wastes)$/.test(name);
}

function isRamp(name: string, oracleText: string, typeLine: string): boolean {
  if (isLand(typeLine)) return false;
  if (RAMP_NAMES.has(name.toLowerCase())) return true;
  return matchesPatterns(oracleText, RAMP_PATTERNS);
}

function isDraw(name: string, oracleText: string, typeLine: string): boolean {
  if (isLand(typeLine)) return false;
  if (DRAW_NAMES.has(name.toLowerCase())) return true;
  return matchesPatterns(oracleText, DRAW_PATTERNS);
}

function isRemoval(name: string, oracleText: string, typeLine: string): boolean {
  if (isLand(typeLine)) return false;
  if (REMOVAL_NAMES.has(name.toLowerCase())) return true;
  // Check it's targeted, not board wipe
  if (matchesPatterns(oracleText, BOARD_WIPE_PATTERNS)) return false;
  return matchesPatterns(oracleText, REMOVAL_PATTERNS);
}

function isBoardWipe(name: string, oracleText: string): boolean {
  if (BOARD_WIPE_NAMES.has(name.toLowerCase())) return true;
  return matchesPatterns(oracleText, BOARD_WIPE_PATTERNS);
}

function isProtection(name: string, oracleText: string, typeLine: string): boolean {
  if (isLand(typeLine)) return false;
  if (PROTECTION_NAMES.has(name.toLowerCase())) return true;
  return matchesPatterns(oracleText, PROTECTION_PATTERNS);
}

/**
 * Check if a card has synergy with a commander based on shared mechanics.
 * Looks for keyword overlap between the commander's oracle text and the card.
 */
export function hasCommanderSynergy(
  cardOracleText: string,
  cardTypeLine: string,
  commanderOracleText: string
): boolean {
  if (!commanderOracleText || isLand(cardTypeLine)) return false;

  const cmdLower = commanderOracleText.toLowerCase();
  const cardLower = cardOracleText.toLowerCase();

  // Extract mechanical keywords from commander
  const mechanics: string[] = [];
  if (/food/i.test(cmdLower)) mechanics.push('food');
  if (/treasure/i.test(cmdLower)) mechanics.push('treasure');
  if (/clue/i.test(cmdLower)) mechanics.push('clue');
  if (/token/i.test(cmdLower)) mechanics.push('token');
  if (/\+1\/\+1 counter/i.test(cmdLower)) mechanics.push('+1/+1 counter');
  if (/sacrifice/i.test(cmdLower)) mechanics.push('sacrifice');
  if (/graveyard/i.test(cmdLower)) mechanics.push('graveyard');
  if (/life/i.test(cmdLower) && /gain/i.test(cmdLower)) mechanics.push('lifegain');
  if (/combat damage/i.test(cmdLower)) mechanics.push('combat damage');
  if (/whenever.*cast/i.test(cmdLower)) mechanics.push('cast trigger');
  if (/noncreature/i.test(cmdLower)) mechanics.push('noncreature');
  if (/artifact/i.test(cmdLower)) mechanics.push('artifact');
  if (/enchantment/i.test(cmdLower)) mechanics.push('enchantment');
  if (/landfall|land enters/i.test(cmdLower)) mechanics.push('landfall');
  if (/enters the battlefield/i.test(cmdLower)) mechanics.push('etb');
  if (/dies|goes to.*graveyard/i.test(cmdLower)) mechanics.push('death trigger');
  if (/mana/i.test(cmdLower)) mechanics.push('mana');

  // Check if card mentions any of the commander's mechanics
  return mechanics.some(m => cardLower.includes(m));
}

function isWinCondition(oracleText: string, typeLine: string, cmc: number): boolean {
  if (isLand(typeLine)) return false;
  const text = oracleText.toLowerCase();
  // High-impact creatures with evasion or big power
  if (/\bCreature\b/.test(typeLine) && cmc >= 5) return true;
  if (/trample|flying|double strike|menace/.test(text) && cmc >= 4) return true;
  if (/each opponent loses/i.test(text)) return true;
  if (/you win the game/i.test(text)) return true;
  if (/deals? .*damage to each opponent/i.test(text)) return true;
  return false;
}

/**
 * Classify a single card into functional categories.
 */
export function classifyCard(
  name: string,
  oracleText: string,
  typeLine: string,
  cmc: number,
  commanderOracleText?: string
): CardCategory[] {
  const categories: CardCategory[] = [];

  if (isLand(typeLine)) {
    categories.push('land');
    return categories;
  }

  if (isRamp(name, oracleText, typeLine)) categories.push('ramp');
  if (isDraw(name, oracleText, typeLine)) categories.push('draw');
  if (isBoardWipe(name, oracleText)) categories.push('board_wipe');
  else if (isRemoval(name, oracleText, typeLine)) categories.push('removal');
  if (isProtection(name, oracleText, typeLine)) categories.push('protection');
  if (commanderOracleText && hasCommanderSynergy(oracleText, typeLine, commanderOracleText)) {
    categories.push('synergy');
  }
  if (isWinCondition(oracleText, typeLine, cmc)) categories.push('win_condition');

  if (categories.length === 0) categories.push('utility');

  return categories;
}

/**
 * Determine the primary category for display purposes.
 * Priority: board_wipe > removal > ramp > draw > protection > synergy > win_condition > utility
 */
export function getPrimaryCategory(categories: CardCategory[]): CardCategory {
  const priority: CardCategory[] = [
    'land', 'board_wipe', 'removal', 'ramp', 'draw',
    'protection', 'synergy', 'win_condition', 'utility',
  ];
  for (const cat of priority) {
    if (categories.includes(cat)) return cat;
  }
  return 'utility';
}

// ── Category display metadata ─────────────────────────────────────────────

export const CATEGORY_LABELS: Record<CardCategory, string> = {
  land: 'Lands',
  ramp: 'Ramp',
  draw: 'Card Draw',
  removal: 'Removal',
  board_wipe: 'Board Wipes',
  protection: 'Protection',
  synergy: 'Commander Synergy',
  win_condition: 'Win Conditions',
  utility: 'Utility',
};

export const CATEGORY_COLORS: Record<CardCategory, string> = {
  land: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  ramp: 'bg-green-900/40 text-green-300 border-green-700/50',
  draw: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  removal: 'bg-red-900/40 text-red-300 border-red-700/50',
  board_wipe: 'bg-orange-900/40 text-orange-300 border-orange-700/50',
  protection: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50',
  synergy: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  win_condition: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
  utility: 'bg-zinc-800/40 text-zinc-400 border-zinc-700/50',
};

export const CATEGORY_BAR_COLORS: Record<CardCategory, string> = {
  land: 'bg-emerald-500',
  ramp: 'bg-green-500',
  draw: 'bg-blue-500',
  removal: 'bg-red-500',
  board_wipe: 'bg-orange-500',
  protection: 'bg-cyan-500',
  synergy: 'bg-purple-500',
  win_condition: 'bg-yellow-500',
  utility: 'bg-zinc-500',
};

// ── Deck analysis computation ─────────────────────────────────────────────

export function computeRatioHealth(
  categories: Record<CardCategory, ClassifiedCard[]>,
  format: string
): RatioHealth[] {
  const ratios = getFormatRatios(format);
  const health: RatioHealth[] = [];

  const categoryOrder: CardCategory[] = [
    'land', 'ramp', 'draw', 'removal', 'board_wipe', 'protection', 'synergy', 'win_condition',
  ];

  for (const cat of categoryOrder) {
    const target = ratios.targets[cat];
    if (!target) continue;
    const current = categories[cat]?.length ?? 0;
    let status: 'low' | 'ok' | 'high' = 'ok';
    let color = 'text-green-400';
    if (current < target.min) {
      status = 'low';
      color = 'text-red-400';
    } else if (current > target.max) {
      status = 'high';
      color = 'text-yellow-400';
    }
    health.push({
      category: cat,
      label: CATEGORY_LABELS[cat],
      current,
      target,
      status,
      color,
    });
  }

  return health;
}

export function computeManaCurve(
  cards: Array<{ cmc: number; typeLine: string }>
): Record<number, number> {
  const curve: Record<number, number> = {};
  for (const card of cards) {
    if (/\bLand\b/.test(card.typeLine)) continue;
    const bucket = Math.min(Math.floor(card.cmc), 7); // 7+ grouped
    curve[bucket] = (curve[bucket] ?? 0) + 1;
  }
  return curve;
}

export function computeOverallScore(health: RatioHealth[]): number {
  let score = 100;
  for (const h of health) {
    if (h.status === 'low') {
      const deficit = h.target.min - h.current;
      score -= Math.min(deficit * 5, 15);
    } else if (h.status === 'high') {
      const excess = h.current - h.target.max;
      score -= Math.min(excess * 3, 10);
    }
  }
  return Math.max(0, Math.min(100, score));
}

export function generateSuggestions(health: RatioHealth[], avgCMC: number, format: string): string[] {
  const suggestions: string[] = [];
  const ratios = getFormatRatios(format);

  for (const h of health) {
    if (h.status === 'low') {
      const deficit = h.target.min - h.current;
      suggestions.push(`Add ${deficit} more ${h.label.toLowerCase()} (currently ${h.current}, minimum ${h.target.min})`);
    } else if (h.status === 'high') {
      const excess = h.current - h.target.max;
      suggestions.push(`Consider cutting ${excess} ${h.label.toLowerCase()} (currently ${h.current}, maximum ${h.target.max})`);
    }
  }

  if (avgCMC > ratios.avgCMC.max) {
    suggestions.push(`Average CMC ${avgCMC.toFixed(2)} is too high (target: ${ratios.avgCMC.target}). Cut expensive cards.`);
  } else if (avgCMC < ratios.avgCMC.min) {
    suggestions.push(`Average CMC ${avgCMC.toFixed(2)} is low (target: ${ratios.avgCMC.target}). Add some higher-impact cards.`);
  }

  return suggestions;
}
