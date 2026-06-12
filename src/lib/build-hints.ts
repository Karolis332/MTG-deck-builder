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
]);

const singular = (w: string): string => (w.endsWith('s') ? w.slice(0, -1) : w);

export function parseBuildHints(text: string | undefined | null): ParsedBuildHints {
  const out: ParsedBuildHints = { emphasize: [], avoid: [], excludeNames: [] };
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

  // Strategy: first archetype word that is NOT in an avoid phrase
  const avoidJoined = out.avoid.join(' ');
  for (const [word, strat] of Object.entries(STRATEGY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower) && !avoidJoined.includes(singular(word))) {
      out.strategy = strat;
      break;
    }
  }

  // Emphasis: theme nouns present and not avoided
  for (const word of lower.split(/[^a-z']+/)) {
    if (THEME_WORDS.has(word) && !avoidJoined.includes(singular(word))) {
      const s = singular(word);
      if (!out.emphasize.includes(s)) out.emphasize.push(s);
    }
  }

  return out;
}
