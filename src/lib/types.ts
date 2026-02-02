// ── Scryfall API types ─────────────────────────────────────────────────────

export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
    png: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      art_crop: string;
      png: string;
    };
  }>;
  prices: {
    usd?: string;
    usd_foil?: string;
  };
  legalities: Record<string, string>;
  power?: string;
  toughness?: string;
  loyalty?: string;
  produced_mana?: string[];
  edhrec_rank?: number;
  layout: string;
}

export interface ScryfallList<T> {
  object: 'list';
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: T[];
}

export interface ScryfallAutocomplete {
  object: 'catalog';
  total_values: number;
  data: string[];
}

export type CardIdentifier =
  | { name: string }
  | { set: string; collector_number: string }
  | { id: string };

// ── Database / App types ──────────────────────────────────────────────────

export interface DbCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost: string | null;
  cmc: number;
  type_line: string;
  oracle_text: string | null;
  colors: string | null;
  color_identity: string | null;
  keywords: string | null;
  set_code: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  image_uri_small: string | null;
  image_uri_normal: string | null;
  image_uri_large: string | null;
  image_uri_art_crop: string | null;
  price_usd: string | null;
  price_usd_foil: string | null;
  legalities: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  produced_mana: string | null;
  edhrec_rank: number | null;
  layout: string;
  updated_at: string;
}

export interface Deck {
  id: number;
  name: string;
  description: string | null;
  format: string | null;
  commander_id: string | null;
  cover_card_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeckWithCards extends Deck {
  cards: DeckCardEntry[];
  stats: DeckStats;
}

export interface DeckCardEntry {
  id: number;
  deck_id: number;
  card_id: string;
  quantity: number;
  board: 'main' | 'sideboard' | 'commander' | 'companion';
  sort_order: number;
  card: DbCard;
}

export interface DeckStats {
  totalMain: number;
  totalSideboard: number;
  totalCards: number;
  averageCmc: number;
  colorDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  manaCurve: Record<number, number>;
  estimatedPrice: number;
}

export interface CollectionEntry {
  id: number;
  card_id: string;
  quantity: number;
  foil: boolean;
  source: string;
  imported_at: string;
  card: DbCard;
}

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export interface CardFilter {
  query?: string;
  colors?: ManaColor[];
  colorMode?: 'include' | 'exact' | 'at_most';
  types?: string[];
  sets?: string[];
  rarities?: string[];
  cmcMin?: number;
  cmcMax?: number;
  inCollection?: boolean;
}

export interface ArenaImportLine {
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  board: 'main' | 'sideboard' | 'commander' | 'companion';
}

export interface ImportResult {
  imported: number;
  failed: string[];
  total: number;
}

export interface AISuggestion {
  card: DbCard;
  reason: string;
  score: number;
  winRate?: number;
  edhrecRank?: number;
}

export type DeckPatchOp =
  | { op: 'add_card'; card_id: string; quantity: number; board: string }
  | { op: 'remove_card'; card_id: string; board: string }
  | { op: 'set_quantity'; card_id: string; quantity: number; board: string }
  | { op: 'move_card'; card_id: string; from_board: string; to_board: string };
