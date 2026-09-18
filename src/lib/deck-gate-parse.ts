/**
 * Deck gate — decklist parsing, card resolution and the shared vocabulary.
 *
 * Split out of deck-gate.ts so the gate file holds only the orchestration.
 * The DB quirks live here and nowhere else: art-series/token rows, the ~2,240
 * corrupt doubled-name rows, and Arena's `A-` rebalanced printings.
 */
import { getDb } from './db';
import { getLegalityKey } from './constants';
import type { DbCard } from './types';

// ── Types ────────────────────────────────────────────────────────────────────

/** `skip` = the check could not run (no input for it); never blocks the verdict. */
export type GateStatus = 'pass' | 'fail' | 'warn' | 'skip';
export type Board = 'commander' | 'main' | 'sideboard' | 'companion';

export interface DeckLine {
  quantity: number;
  name: string;
  board: Board;
}

export interface GateCheck {
  id: string;
  status: GateStatus;
  detail: string;
  cards?: string[];
}

export interface GateOptions {
  format: string;
  /** user_id whose collection the deck must fit inside (reads the `collection` table). */
  ownerId?: number | null;
  /**
   * Explicit owned card names. Takes priority over `ownerId` — callers with no
   * access to the desktop `collection` table (the build-api service) pass this.
   */
  ownedCards?: string[] | null;
  /** Collection source; defaults to 'arena' for Arena formats, else 'paper'. */
  source?: 'arena' | 'paper';
  /** Extra card names (or "/regex/" strings) that must be present and never cut. */
  locks?: string[];
  /** Names before an edit and after it — anything in `before ∩ locks` must survive. */
  before?: string[];
  after?: string[];
  /** Collection snapshot older than this many days warns. */
  collectionMaxAgeDays?: number;
}

export interface Resolved {
  line: DeckLine;
  card: DbCard;
  /** Front-face name — what an Arena import line must say. */
  front: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Formats whose card pool is MTG Arena's (ownership + Alchemy rules apply). */
export const ARENA_FORMATS = new Set([
  'brawl',
  'standardbrawl',
  'competitivebrawl',
  'historic',
  'alchemy',
  'timeless',
]);

/** Layouts whose printed name legitimately contains " // " in an Arena import. */
export const EXPORT_SAFE_SLASH_LAYOUTS = new Set(['split', 'aftermath']);

export const BASICS = new Set([
  'plains',
  'island',
  'swamp',
  'mountain',
  'forest',
  'wastes',
  'snow-covered plains',
  'snow-covered island',
  'snow-covered swamp',
  'snow-covered mountain',
  'snow-covered forest',
]);

/**
 * Cards the model may never cut. Add a name (or a "/regex/" string) here and it
 * is locked for every deck — see docs/DECK_GATE.md.
 */
export const DEFAULT_LOCKS: string[] = [
  // Fetch lands
  'Flooded Strand',
  'Polluted Delta',
  'Bloodstained Mire',
  'Wooded Foothills',
  'Windswept Heath',
  'Marsh Flats',
  'Scalding Tarn',
  'Verdant Catacombs',
  'Arid Mesa',
  'Misty Rainforest',
  'Prismatic Vista',
  'Fabled Passage',
  // Shock lands
  'Hallowed Fountain',
  'Watery Grave',
  'Steam Vents',
  'Overgrown Tomb',
  'Sacred Foundry',
  'Temple Garden',
  'Godless Shrine',
  'Stomping Ground',
  'Breeding Pool',
  'Blood Crypt',
];

export const DEFAULT_COLLECTION_MAX_AGE_DAYS = 14;
/** Lands within ± this many of the Karsten recommendation are fine. */
export const LAND_BAND = 2;

// ── Parsing ──────────────────────────────────────────────────────────────────

const BOARD_HEADER = /^(commander|deck|sideboard|companion|about)s?:?$/i;

/** Parse an Arena / ManaBox style decklist. Lines keep the name as typed. */
export function parseDecklist(text: string): DeckLine[] {
  const lines: DeckLine[] = [];
  let board: Board = 'main';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('//')) continue; // comment, not a split card
    const header = line.match(BOARD_HEADER);
    if (header) {
      const h = header[1].toLowerCase();
      board = h === 'about' || h === 'deck' ? 'main' : (h as Board);
      continue;
    }
    if (/^name\s/i.test(line)) continue;
    const m = line.match(/^(\d+)x?\s+(.+)$/);
    const name = (m ? m[2] : line).replace(/\s*\([A-Za-z0-9]{2,6}\)(\s+\S+)?\s*$/, '').trim();
    if (!name) continue;
    lines.push({ quantity: m ? Number(m[1]) : 1, name, board });
  }
  return lines;
}

// ── Card resolution ──────────────────────────────────────────────────────────

const CARD_COLS =
  'id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, legalities, layout, set_code, produced_mana, rarity, edhrec_rank';

/** Never resolve to art-series/token/emblem rows, nor the ~2,240 corrupt doubled-name rows. */
const CLEAN_ROWS =
  "layout NOT IN ('art_series','token','double_faced_token','emblem') AND type_line <> 'Card // Card'";

export function legalityOf(card: Pick<DbCard, 'legalities'>, key: string): string | null {
  if (!card.legalities) return null;
  try {
    return (JSON.parse(card.legalities) as Record<string, string>)[key] ?? null;
  } catch {
    return null;
  }
}

/** Front face of a DB name — what an Arena import line must say. */
export function frontName(name: string): string {
  return name.split(' // ')[0];
}

/** Look the deck's card rows up once, preferring a printing legal in this format. */
export function resolveLines(
  lines: DeckLine[],
  format: string
): { resolved: Resolved[]; unresolved: string[] } {
  const key = getLegalityKey(format);
  if (!/^[a-z0-9]+$/.test(key)) throw new Error(`unsafe format key: ${format}`);
  const db = getDb();
  const order = `ORDER BY CASE WHEN json_extract(legalities,'$.${key}')='legal' THEN 0 ELSE 1 END, length(name)`;
  const exact = db.prepare(
    `SELECT ${CARD_COLS} FROM cards WHERE name = ? COLLATE NOCASE AND ${CLEAN_ROWS} ${order} LIMIT 1`
  );
  const byFront = db.prepare(
    `SELECT ${CARD_COLS} FROM cards WHERE (name = ? OR name LIKE ? || ' // %') COLLATE NOCASE AND ${CLEAN_ROWS} ${order} LIMIT 1`
  );

  const cache = new Map<string, DbCard | null>();
  const lookup = (name: string): DbCard | null => {
    const cached = cache.get(name);
    if (cached !== undefined) return cached;
    const plain = name.replace(/^A-/, '');
    const front = plain.split(' // ')[0];
    // Alchemy: the A- row and the paper row are both candidates; a printing that
    // is legal in this format wins, so a rebalanced card Arena accepts is not
    // rejected because the other row's legality JSON disagrees (A-Thran Portal
    // is brawl-legal, plain Thran Portal is not).
    const candidates = [
      name !== plain ? (exact.get(name) as DbCard | undefined) : undefined,
      exact.get(plain) as DbCard | undefined,
      byFront.get(front, front) as DbCard | undefined,
    ].filter(Boolean) as DbCard[];
    const card = candidates.find((c) => legalityOf(c, key) === 'legal') ?? candidates[0] ?? null;
    cache.set(name, card);
    return card;
  };

  const resolved: Resolved[] = [];
  const unresolved: string[] = [];
  for (const line of lines) {
    const card = lookup(line.name);
    if (!card) unresolved.push(line.name);
    else resolved.push({ line, card, front: frontName(card.name) });
  }
  return { resolved, unresolved };
}

// ── Small helpers ────────────────────────────────────────────────────────────

export const isLand = (typeLine: string): boolean =>
  /\bLand\b/.test((typeLine || '').split(' // ')[0]);

export const isBasic = (card: DbCard): boolean =>
  BASICS.has(frontName(card.name).toLowerCase()) || /Basic Land/.test(card.type_line || '');

export function parseIdentity(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return raw.replace(/[[\]",\s]/g, '').split('');
  }
}

/** A lock entry is a plain card name, or a "/regex/flags" string. */
export function lockMatcher(pattern: string): (name: string) => boolean {
  const m = pattern.match(/^\/(.+)\/([a-z]*)$/);
  if (m) {
    const re = new RegExp(m[1], m[2] || 'i');
    return (name) => re.test(name);
  }
  return (name) => name.toLowerCase() === pattern.toLowerCase();
}

export function worst(statuses: GateStatus[]): GateStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warn')) return 'warn';
  return 'pass';
}
