export const MANA_COLORS = ['W', 'U', 'B', 'R', 'G'] as const;

export const MANA_COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};

export const MANA_COLOR_HEX: Record<string, string> = {
  W: '#F9FAF4',
  U: '#0E68AB',
  B: '#150B00',
  R: '#D3202A',
  G: '#00733E',
  C: '#CAC5C0',
};

export const MANA_COLOR_BG: Record<string, string> = {
  W: 'bg-amber-50 text-amber-900',
  U: 'bg-blue-600 text-white',
  B: 'bg-zinc-800 text-zinc-100',
  R: 'bg-red-600 text-white',
  G: 'bg-green-700 text-white',
  C: 'bg-zinc-400 text-zinc-900',
};

export const CARD_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Planeswalker',
  'Land',
  'Battle',
] as const;

export const FORMATS = [
  'standard',
  'pioneer',
  'modern',
  'legacy',
  'vintage',
  'commander',
  'standardbrawl',
  'brawl',
  'competitivebrawl',
  'pauper',
  'historic',
  'alchemy',
  'explorer',
  '1v1',
] as const;

export const FORMAT_LABELS: Record<string, string> = {
  standard: 'Standard',
  pioneer: 'Pioneer',
  modern: 'Modern',
  legacy: 'Legacy',
  vintage: 'Vintage',
  commander: 'Commander / EDH',
  standardbrawl: 'Standard Brawl',
  brawl: 'Brawl (Historic)',
  competitivebrawl: 'Competitive Brawl',
  pauper: 'Pauper',
  historic: 'Historic',
  alchemy: 'Alchemy',
  explorer: 'Explorer',
  '1v1': '1v1 (All Cards)',
};

export const RARITIES = ['common', 'uncommon', 'rare', 'mythic'] as const;

export const RARITY_COLORS: Record<string, string> = {
  common: 'text-zinc-400',
  uncommon: 'text-zinc-300',
  rare: 'text-yellow-500',
  mythic: 'text-orange-500',
};

export const DEFAULT_LAND_COUNT: Record<string, number> = {
  standard: 24,
  pioneer: 24,
  modern: 23,
  legacy: 20,
  vintage: 16,
  commander: 38,
  standardbrawl: 24,
  brawl: 38,
  competitivebrawl: 38,
  pauper: 23,
  '1v1': 24,
  default: 24,
};

export const DEFAULT_DECK_SIZE: Record<string, number> = {
  standard: 60,
  pioneer: 60,
  modern: 60,
  legacy: 60,
  vintage: 60,
  commander: 100,
  standardbrawl: 60,
  brawl: 100,
  competitivebrawl: 100,
  pauper: 60,
  '1v1': 60,
  default: 60,
};

// Formats that use a commander/companion zone
export const COMMANDER_FORMATS = ['commander', 'brawl', 'standardbrawl', 'competitivebrawl'] as const;

/**
 * Map app format names to Scryfall legality JSON keys.
 * Scryfall uses "brawl" for Historic Brawl and "standardbrawl" for Standard Brawl,
 * which matches our internal format names — identity mapping, EXCEPT
 * "competitivebrawl" (MTG Arena's Ranked/Competitive Brawl, launched 2026-06-23),
 * which Scryfall has no legality key for. We conservatively reuse Historic
 * Brawl's "brawl" legality for the 99 — see "Introducing Ranked Brawl" on
 * magic.wizards.com: the article gives no official 99-card banlist, only a
 * 10-card commander ban list (see COMPETITIVE_BRAWL_COMMANDER_BANS below).
 * This is a known conservative choice — it may exclude cards Arena actually
 * allows, and will need revisiting if Wizards publishes a real Competitive
 * Brawl banlist.
 */
export function getLegalityKey(format: string): string {
  if (format === 'competitivebrawl') return 'brawl';
  return format;
}

/**
 * Competitive Brawl (Ranked Brawl) commander ban list — 10 commanders banned
 * outright regardless of their Historic Brawl legality.
 * Source: "Introducing Ranked Brawl", magic.wizards.com, 2026-06-23.
 */
export const COMPETITIVE_BRAWL_COMMANDER_BANS = [
  'Ajani, Nacatl Pariah',
  'Nadu, Winged Wisdom',
  'Lutri, the Spellchaser',
  'Oko, Thief of Crowns',
  'Old Stickfingers',
  'Ragavan, Nimble Pilferer',
  'Rusko, Clockmaker',
  'Tamiyo, Inquisitive Student',
  'Wrenn and Six',
  "Tajic, Legion's Valor",
] as const;

/**
 * True if `cardName` is banned as a Competitive Brawl commander. Matches on
 * the front face of transforming/MDFC cards (stored as "Front // Back") and
 * strips an Arena-rebalanced "A-" prefix, case-insensitive.
 */
export function isCompetitiveBrawlBannedCommander(cardName: string): boolean {
  const frontFace = cardName.split(' // ')[0].replace(/^A-/, '').toLowerCase();
  return COMPETITIVE_BRAWL_COMMANDER_BANS.some((banned) => banned.toLowerCase() === frontFace);
}

export const SCRYFALL_API_BASE = 'https://api.scryfall.com';
export const SCRYFALL_RATE_LIMIT_MS = 100;

export const CF_API_DEFAULT_URL = 'http://187.77.110.100/cf-api';
