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
  'pauper',
  'historic',
  'alchemy',
  'explorer',
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
  pauper: 'Pauper',
  historic: 'Historic',
  alchemy: 'Alchemy',
  explorer: 'Explorer',
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
  commander: 37,
  standardbrawl: 24,
  brawl: 37,
  pauper: 23,
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
  pauper: 60,
  default: 60,
};

// Formats that use a commander/companion zone
export const COMMANDER_FORMATS = ['commander', 'brawl', 'standardbrawl'] as const;

export const SCRYFALL_API_BASE = 'https://api.scryfall.com';
export const SCRYFALL_RATE_LIMIT_MS = 100;
