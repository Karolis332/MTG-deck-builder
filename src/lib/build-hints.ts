/**
 * Deterministic build-hint parsing — the no-LLM fine-tune path.
 *
 * Turns a free-text prompt ("goblin tokens aggro, budget under $2 a card,
 * no infinite combos, avoid counterspells") into concrete engine knobs.
 * Used by the pure-model Quick Build; the Claude build path receives the
 * raw text instead.
 */

export interface ParsedBuildHints {
  /** archetype override when the text names one */
  strategy?: string;
  /** per-card USD price ceiling */
  budgetPerCard?: number;
  /** oracle/type keywords to reward (+18 each on match) */
  emphasize: string[];
  /** oracle/type keywords to punish (-40 each on match) */
  avoid: string[];
  /** exact card names to exclude */
  excludeNames: string[];
  /** "low/tight/consistent curve" — bias the top end of the curve down */
  lowCurve: boolean;
  /** "consistent manabase" — bias lands/fixing toward the generous end */
  consistentMana: boolean;
}

const STRATEGY_WORDS: Record<string, string> = {
  aggro: 'aggro', aggressive: 'aggro', burn: 'aggro',
  control: 'control', controlling: 'control',
  combo: 'combo',
  midrange: 'midrange', value: 'midrange',
  voltron: 'voltron',
  aristocrats: 'aristocrats', sacrifice: 'aristocrats',
  spellslinger: 'spellslinger', spells: 'spellslinger',
  tribal: 'tribal',
  stax: 'stax',
  tokens: 'tokens',
  reanimator: 'reanimator', graveyard: 'reanimator',
};

// Multi-word/compound strategy phrases — checked BEFORE the single-word
// STRATEGY_WORDS table, since "go wide" contains no standalone archetype
// word and would otherwise fall through to whatever unrelated word matches.
const STRATEGY_PHRASES: Array<{ pattern: RegExp; keyword: string; strategy: string }> = [
  { pattern: /\bgo[- ]wide\b/, keyword: 'wide', strategy: 'tokens' },
  { pattern: /\bwide board\b/, keyword: 'wide', strategy: 'tokens' },
  { pattern: /\bswarm\b/, keyword: 'swarm', strategy: 'tokens' },
];

// Theme nouns worth rewarding directly in oracle/type text.
const THEME_WORDS = new Set([
  'token', 'tokens', 'treasure', 'treasures', 'lifegain', 'life', 'counters',
  'proliferate', 'artifacts', 'artifact', 'enchantments', 'enchantment',
  'graveyard', 'mill', 'draw', 'ramp', 'landfall', 'lands', 'flying',
  'sacrifice', 'blink', 'flicker', 'equipment', 'auras', 'vehicles',
  'dragons', 'dragon', 'goblins', 'goblin', 'elves', 'elf', 'zombies', 'zombie',
  'vampires', 'vampire', 'angels', 'angel', 'demons', 'demon', 'wizards', 'wizard',
  'humans', 'human', 'soldiers', 'soldier', 'spirits', 'spirit', 'slivers', 'sliver',
  'dinosaurs', 'dinosaur', 'hydras', 'hydra', 'eldrazi', 'merfolk', 'rats', 'rat',
  'cats', 'cat', 'dogs', 'dog', 'birds', 'bird', 'snakes', 'snake', 'squirrels', 'squirrel',
  'food', 'foods', 'clue', 'clues', 'blood', 'powerstone', 'powerstones', 'map', 'maps', 'incubate',
]);

// "consistent curve"/"low curve" or a bare "curve" mention at all.
const LOW_CURVE_RE = /\b(low|lower|tight|consistent|smooth)\b[^.,;]{0,20}\bcurve\b|\bcurve\b/;
// "manabase"/"mana base", or a consistency qualifier near "mana"/"lands".
const CONSISTENT_MANA_RE = /\bmana ?base\b|\b(consistent|stable|reliable|smooth)\b[^.,;]{0,20}\b(mana|lands)\b/;

const singular = (w: string): string => (w.endsWith('s') ? w.slice(0, -1) : w);

export function parseBuildHints(text: string | undefined | null): ParsedBuildHints {
  const out: ParsedBuildHints = { emphasize: [], avoid: [], excludeNames: [], lowCurve: false, consistentMana: false };
  if (!text || !text.trim()) return out;
  const lower = text.toLowerCase().slice(0, 500);

  // Budget: "budget", "$5 per card", "under $3", "cheap"
  const priceMatch = lower.match(/(?:under|below|max|less than)?\s*\$\s*(\d+(?:\.\d+)?)/);
  if (priceMatch) {
    out.budgetPerCard = parseFloat(priceMatch[1]);
  } else if (/\b(budget|cheap|affordable)\b/.test(lower)) {
    out.budgetPerCard = 3;
  }

  // Avoid-phrases: "no X", "avoid X", "without X", "don't want X"
  const avoidMatches = lower.matchAll(/\b(?:no|avoid|without|don'?t want|skip)\s+([a-z][a-z' -]{2,30}?)(?=[,.;]|\band\b|\bor\b|$)/g);
  for (const m of avoidMatches) {
    const phrase = m[1].trim();
    if (phrase) out.avoid.push(singular(phrase));
  }

  // Strategy: multi-word phrases first ("go wide" has no single archetype
  // word), then the first single archetype word that is NOT in an avoid phrase.
  const avoidJoined = out.avoid.join(' ');
  for (const { pattern, keyword, strategy } of STRATEGY_PHRASES) {
    if (pattern.test(lower) && !avoidJoined.includes(keyword)) {
      out.strategy = strategy;
      break;
    }
  }
  if (!out.strategy) {
    for (const [word, strat] of Object.entries(STRATEGY_WORDS)) {
      if (new RegExp(`\\b${word}\\b`).test(lower) && !avoidJoined.includes(singular(word))) {
        out.strategy = strat;
        break;
      }
    }
  }

  // Emphasis: theme nouns present and not avoided
  for (const word of lower.split(/[^a-z']+/)) {
    if (THEME_WORDS.has(word) && !avoidJoined.includes(singular(word))) {
      const s = singular(word);
      if (!out.emphasize.includes(s)) out.emphasize.push(s);
    }
  }

  out.lowCurve = LOW_CURVE_RE.test(lower);
  out.consistentMana = CONSISTENT_MANA_RE.test(lower);

  return out;
}
