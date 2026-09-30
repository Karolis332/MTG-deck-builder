import fs from 'fs';
import path from 'path';
import { getDb, getDataDir, getCedhStaples, getMetaCardStatsMap, getMetaRankedCardNames, getFormatStaples, getCommunityRecommendations, getCommanderCardStats } from './db';
import type { DbCard, AISuggestion } from './types';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE, getLegalityKey, COMMANDER_FORMATS, isCompetitiveBrawlBannedCommander } from './constants';
import { getCardGlobalScore, getMetaAdjustedScore } from './global-learner';
import { getEdhrecRecommendations, getEdhrecThemeCards } from './edhrec';
import type { EdhrecRecommendation } from './edhrec';
import { getTemplate, getScaledCurve, mergeWithCommanderProfile } from './deck-templates';
import type { Archetype, ArchetypeTemplate } from './deck-templates';
import { analyzeCommander, mergeProfiles, detectTribalPayoff } from './commander-synergy';
import type { CommanderSynergyProfile } from './commander-synergy';
import { buildOptimalLandBase, isFetchLandRelevant, ownedNameJoin } from './land-intelligence';
import { buildOwnedQtyMap, ownedNamesSubqueryInline, normalizedNameExpr, stripArenaPrefix } from './collection-ownership';
import type { OwnershipFilter } from './collection-ownership';
import { getCFRecommendations, resolveCFToDbCards } from './cf-api-client';
import {
  getPayoffNamesForProfile,
  getRoleQuotas,
  roleCapsFor,
  pickByRole,
  buildReasoningSummary,
  CardNameSet,
  formatMaxCopies,
  ANY_NUMBER_RE,
} from './deck-builder-constraints';
import { analyzeCommanderForBuild } from './commander-analysis';
import type { ArsenalCard } from './commander-analysis';
import { classifyCard, getPrimaryCategory, isDrawEngine, isBoardWipe } from './card-classifier';
import type { ClassifyOpts } from './card-classifier';
import { isTribeCreature, narrowTutorTarget, countTargets, colorlessPipCount, isColorlessSource, isMonoColourDeadFixer } from './card-relevance';
import type { RelevanceCard } from './card-relevance';
import { parseBuildHints } from './build-hints';
import type { ParsedBuildHints } from './build-hints';
import { auditDeck } from './deck-auditor';
import type { DeckHealth } from './deck-auditor';
import { classifyBracket, bracketOffenseCategory, bracketPoolExclusions } from './bracket';
import type { BracketCard } from './bracket';
import { countColorSources, countPipDemand } from './mana-sources';

// ── Mana-sink payoffs for multicolor-matters commanders (Ramos et al.) ───────
// Cards that convert a big mana burst (from Ramos's counter-dump) into a win or
// huge swing. Named explicitly because the oracle text doesn't pattern-match.
const MANA_SINK_PAYOFFS = new Set<string>([
  'door to nothingness', 'progenitus', 'maelstrom archangel', 'bring to light',
  'jodah, the unifier', 'chromanticore', 'timeless lotus', 'omnath, locus of all',
  'torment of hailfire', 'crackle with power', 'genesis ultimatum',
  'villainous wealth', 'maelstrom nexus', 'fist of suns',
]);

// ── Learned scoring weights ──────────────────────────────────────────────────
// Optional per-component multipliers fitted offline against the scraped-deck
// corpus (scripts/fit_scoring_weights.py → <data-dir>/scoring-weights.json).
// Missing file or component key → identity weight (hand-tuned behaviour).
let cachedScoringWeights: Record<string, number> | null | undefined;
export function getScoringWeights(): Record<string, number> | null {
  if (cachedScoringWeights !== undefined) return cachedScoringWeights;
  try {
    const weightsPath = path.join(getDataDir(), 'scoring-weights.json');
    if (fs.existsSync(weightsPath)) {
      const parsed = JSON.parse(fs.readFileSync(weightsPath, 'utf8')) as { weights?: Record<string, number> };
      cachedScoringWeights = parsed.weights && typeof parsed.weights === 'object' ? parsed.weights : null;
    } else {
      cachedScoringWeights = null;
    }
  } catch {
    cachedScoringWeights = null;
  }
  return cachedScoringWeights;
}

// MDFC spell//land budget — shared intuition with land-intelligence's
// MAX_MDFC_LANDS: a deck wants at most ~4 modal land-back cards total.
const MAX_MDFC_IN_SPELLS = 4;
/** A-D1: quality floor = this share of the score of the pool's nonLandTarget-th best pickable nonland. */
const QUALITY_FLOOR_RATIO = 0.6;
function isLandBackDfc(card: DbCard): boolean {
  const tl = card.type_line || '';
  return tl.includes('//') && !tl.split('//')[0].includes('Land') && tl.includes('Land');
}

// ── Dead land-fetch guard ────────────────────────────────────────────────────
// Spells that search for specific basic land TYPES are dead when none of those
// types can exist in the deck's colors (e.g. Farseek — "Plains, Island, Swamp,
// or Mountain" — in mono-green cannot find anything). Generic "basic land" or
// "land card" fetches are always fine.
const BASIC_TYPE_COLOR: Record<string, string> = {
  plains: 'W', island: 'U', swamp: 'B', mountain: 'R', forest: 'G',
};

export function isDeadLandFetch(oracleText: string | null | undefined, deckColors: string[]): boolean {
  if (!oracleText) return false;
  const m = oracleText.match(/search your library for (?:up to \w+ )?(?:an? )?([^.\n]*?) cards?\b/i);
  if (!m) return false;
  const clause = m[1].toLowerCase();
  if (clause.includes('basic land') || /(^|[^a-z])land($|[^a-z])/.test(clause)) return false;
  const types = Object.keys(BASIC_TYPE_COLOR).filter((t) => clause.includes(t));
  if (types.length === 0) return false;
  return !types.some((t) => deckColors.includes(BASIC_TYPE_COLOR[t]));
}

// ── Commander synergy text patterns for card scoring ────────────────────────
// Maps synergy categories from commander-synergy.ts to oracle text substrings

export const SYNERGY_REQUIREMENTS_MAP = {
  planeswalker: ['proliferate', 'loyalty counter', 'loyalty abilit', 'planeswalkers you control', 'search your library for a planeswalker'],
  exile_cast: ['exile the top', 'you may play', 'you may cast', 'from exile'],
  exile_enter: ['exile', 'return', 'to the battlefield', 'flicker', 'blink'],
  spell_cast: ['instant', 'sorcery', 'magecraft', 'prowess'],
  storm: ['draw a card', 'add {', 'search your library for a', 'create a treasure', 'untap', 'mana dork'],
  creature_dies: ['whenever', 'dies', 'sacrifice', 'death'],
  creature_etb: ['enters the battlefield', 'enters'],
  attack_trigger: ['haste', 'extra combat', 'additional combat', 'menace', 'trample', 'can\'t be blocked'],
  artifact_synergy: ['artifact', 'treasure', 'affinity'],
  enchantment_synergy: ['enchantment', 'aura', 'constellation'],
  lifegain: ['lifelink', 'gain life', 'whenever you gain life'],
  counters: ['+1/+1 counter', 'proliferate', 'put a counter'],
  graveyard: ['from your graveyard', 'mill', 'reanimate', 'return from'],
  token_generation: ['create a', 'create two', 'token', 'populate'],
  land_matters: ['landfall', 'whenever a land enters', 'play a land', 'sacrifice a land', 'search your library for a'],
  tribal_lands: ['choose a creature type', 'creature of the chosen type', 'creatures you control'],
  dungeon_venture: ['venture into the dungeon', 'initiative', 'dungeon', 'undercity'],
} as const;

// ── Synergy keyword groups ──────────────────────────────────────────────────
// Cards sharing keywords within a group have natural synergy

export const SYNERGY_GROUPS: Record<string, string[]> = {
  counters: ['+1/+1 counter', 'proliferate', 'counter on', 'modify', 'adapt', 'evolve', 'bolster'],
  tokens: ['create a', 'create two', 'token', 'populate', 'convoke', 'go wide'],
  graveyard: ['mill', 'return from your graveyard', 'flashback', 'unearth', 'dredge', 'self-mill', 'into your graveyard'],
  sacrifice: ['sacrifice a', 'when .* dies', 'death trigger', 'blood artist', 'aristocrat'],
  artifacts: ['artifact', 'affinity', 'metalcraft', 'improvise', 'fabricate'],
  enchantments: ['enchantment', 'constellation', 'aura', 'enchanted creature'],
  spellslinger: ['instant or sorcery', 'whenever you cast a', 'magecraft', 'prowess', 'storm'],
  lifegain: ['gain life', 'lifelink', 'whenever you gain life', 'soul warden'],
  aggro: ['haste', 'first strike', 'double strike', 'menace', 'trample'],
  control: ['counter target', 'destroy target', 'exile target', 'board wipe', 'wrath'],
  ramp: ['add {', 'search your library for a .* land', 'mana dork', 'treasure token'],
  flying: ['flying', 'reach', 'has flying'],
  tribal: ['all .* get', 'other .* you control', 'lord', 'creature type'],
  draw: ['draw a card', 'draw two', 'draw cards', 'scry'],
  equipment: ['equip', 'equipped creature', 'attach'],
  energy: ['energy counter', '{E}'],
};

// ── Map EDHREC theme labels to local synergy group keys ─────────────────────

const EDHREC_THEME_MAP: Record<string, string> = {
  'tribal': 'tribal',
  'tokens': 'tokens',
  '+1/+1 counters': 'counters',
  'counters': 'counters',
  'sacrifice': 'sacrifice',
  'aristocrats': 'sacrifice',
  'artifacts': 'artifacts',
  'enchantments': 'enchantments',
  'spellslinger': 'spellslinger',
  'spell copy': 'spellslinger',
  'storm': 'spellslinger',
  'lifegain': 'lifegain',
  'life gain': 'lifegain',
  'voltron': 'equipment',
  'equipment': 'equipment',
  'auras': 'enchantments',
  'graveyard': 'graveyard',
  'reanimator': 'graveyard',
  'mill': 'graveyard',
  'self-mill': 'graveyard',
  'energy': 'energy',
  'superfriends': 'control',
  'planeswalkers': 'control',
  'aggro': 'aggro',
  'control': 'control',
  'ramp': 'ramp',
  'landfall': 'ramp',
  'lands matter': 'ramp',
  'flying': 'flying',
  'flyers': 'flying',
  'draw': 'draw',
  'wheels': 'draw',
  'card draw': 'draw',
  'go wide': 'tokens',
  'blink': 'control',
  'flicker': 'control',
  'clones': 'control',
  'infect': 'counters',
  'proliferate': 'counters',
  'treasure': 'artifacts',
  'food': 'artifacts',
  'vehicles': 'artifacts',
  'sagas': 'enchantments',
  'topdeck': 'draw',
};

export function detectDeckThemes(cards: DbCard[]): string[] {
  const themeScores: Record<string, number> = {};

  for (const card of cards) {
    const text = (card.oracle_text || '').toLowerCase();
    const keywords = (card.keywords || '').toLowerCase();

    for (const [theme, patterns] of Object.entries(SYNERGY_GROUPS)) {
      for (const pattern of patterns) {
        if (text.includes(pattern) || keywords.includes(pattern)) {
          themeScores[theme] = (themeScores[theme] || 0) + 1;
          break; // one match per theme per card
        }
      }
    }
  }

  // Return themes that appear in >= 3 cards, sorted by frequency
  return Object.entries(themeScores)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);
}

function buildSynergyQuery(themes: string[]): string {
  if (themes.length === 0) return '';

  const conditions: string[] = [];
  for (const theme of themes.slice(0, 3)) {
    const patterns = SYNERGY_GROUPS[theme];
    if (!patterns) continue;
    const likeConditions = patterns
      .slice(0, 4) // limit per theme to keep query sane
      .map((p) => `c.oracle_text LIKE '%${p.replace(/'/g, "''")}%'`)
      .join(' OR ');
    conditions.push(`(${likeConditions})`);
  }

  return conditions.length > 0 ? `AND (${conditions.join(' OR ')})` : '';
}

// ── Tribal detection ────────────────────────────────────────────────────────
// Detects if a commander is tribal and returns the creature type to build
// around. Scoring lives in commander-synergy's detectTribalPayoff (shared
// with archetype inference — a single tribe regex library, not two).

export function detectTribalTheme(
  db: ReturnType<typeof getDb>,
  commanderName: string
): string | null {
  const cmd = db.prepare(
    'SELECT type_line, oracle_text, subtypes FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1'
  ).get(commanderName) as { type_line: string; oracle_text: string | null; subtypes: string | null } | undefined;

  if (!cmd) return null;

  const oracleText = (cmd.oracle_text || '').toLowerCase();
  const typeLine = cmd.type_line.toLowerCase();

  // Parse subtypes from the enriched column or from the type_line
  let subtypes: string[] = [];
  if (cmd.subtypes) {
    try {
      subtypes = JSON.parse(cmd.subtypes).map((s: string) => s.toLowerCase());
    } catch {}
  }
  if (subtypes.length === 0) {
    // Fallback: parse from type_line after the em dash
    const dashIdx = typeLine.indexOf('—');
    if (dashIdx !== -1) {
      subtypes = typeLine.slice(dashIdx + 1).trim().split(/\s+/);
    }
  }

  return detectTribalPayoff(oracleText, subtypes);
}

export function fetchTribalCards(
  db: ReturnType<typeof getDb>,
  tribe: string,
  colorExcludeFilter: string,
  legalityFilter: string,
  commanderExclude: string,
  ownedNames: Set<string> = new Set(),
  limit: number = 80,
  changelingLimit: number = 0
): DbCard[] {
  const tribeLike = `%${tribe}%`;
  // Cards that name the tribe directly (type, subtype or oracle text).
  const tribeMatch = `(
    c.type_line LIKE ? COLLATE NOCASE
    OR c.subtypes LIKE ? COLLATE NOCASE
    OR c.oracle_text LIKE ? COLLATE NOCASE
  )`;
  // Changelings (every creature type — tribal for every tribe by definition,
  // incl. Kindred artifact changelings) and "choose a creature type" support.
  // Kept as a SEPARATE query with its own limit: sharing one LIMIT with the
  // tribe-name match let a flood of changelings (which rank well but aren't
  // Goblins/Vampires) crowd real tribe members out of a narrow tribe's pool.
  const changelingMatch = `(
    c.oracle_text LIKE '%changeling%' COLLATE NOCASE
    OR c.oracle_text LIKE '%is every creature type%' COLLATE NOCASE
    OR c.oracle_text LIKE '%are every creature type%' COLLATE NOCASE
    OR c.oracle_text LIKE '%choose a creature type%' COLLATE NOCASE
  )`;
  const filters = `
    ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
    ${legalityFilter}
    ${commanderExclude}
  `;

  const primary = db.prepare(`
    SELECT DISTINCT c.* FROM cards c
    WHERE ${tribeMatch}
    ${filters}
    ORDER BY c.edhrec_rank ASC NULLS LAST
    LIMIT ?
  `).all(tribeLike, tribeLike, tribeLike, limit) as DbCard[];

  const seen = new Set(primary.map((c) => c.name));
  const changelings = (db.prepare(`
    SELECT DISTINCT c.* FROM cards c
    WHERE ${changelingMatch}
    ${filters}
    ORDER BY c.edhrec_rank ASC NULLS LAST
    LIMIT ?
  `).all(changelingLimit) as DbCard[]).filter((c) => !seen.has(c.name));
  for (const c of changelings) seen.add(c.name);

  const ranked = [...primary, ...changelings];

  if (ownedNames.size === 0) return ranked;

  // Owned tribe-relevant cards must not be dropped for having no EDHREC rank
  // (new/Alchemy cards) or falling outside either ranked LIMIT — fetch them
  // unbounded and prepend so they always reach the pool.
  const missingOwned = [...ownedNames].filter((n) => !seen.has(n));
  if (missingOwned.length === 0) return ranked;

  const placeholders = missingOwned.map(() => '?').join(',');
  const ownedExtra = db.prepare(`
    SELECT DISTINCT c.* FROM cards c
    WHERE c.name IN (${placeholders})
    AND (${tribeMatch} OR ${changelingMatch})
    ${filters}
  `).all(...missingOwned, tribeLike, tribeLike, tribeLike) as DbCard[];

  return [...ownedExtra, ...ranked];
}

// ── Resolve EDHREC card names to DbCard rows ────────────────────────────────

function resolveEdhrecCards(
  db: ReturnType<typeof getDb>,
  edhrecCards: EdhrecRecommendation[],
  colorExcludeFilter: string,
  legalityFilter: string,
  commanderExclude: string
): Array<{ card: DbCard; edhrecSynergy: number; edhrecInclusion: number }> {
  const resolved: Array<{ card: DbCard; edhrecSynergy: number; edhrecInclusion: number }> = [];
  const seen = new Set<string>();

  for (const rec of edhrecCards) {
    if (seen.has(rec.name)) continue;
    seen.add(rec.name);

    // Look up the card by exact name in our local DB (lands included for land-intelligence)
    const row = db.prepare(
      `SELECT c.* FROM cards c
       WHERE c.name = ? COLLATE NOCASE
       ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
       ${legalityFilter}
       ${commanderExclude}
       LIMIT 1`
    ).get(rec.name) as DbCard | undefined;

    if (row) {
      resolved.push({
        card: row,
        edhrecSynergy: rec.synergy,
        edhrecInclusion: rec.inclusion,
      });
    }
  }

  return resolved;
}

// ── Commander legality / Arena-rebalance ("A-") variant resolution ─────────

/** Read a card's legality status, checking each key in `legalityKeys` in order. */
export function readLegalityStatus(
  card: Pick<DbCard, 'legalities'>,
  legalityKeys: string[]
): string | undefined {
  try {
    if (!card.legalities) return undefined;
    const parsed = JSON.parse(card.legalities) as Record<string, string>;
    for (const key of legalityKeys) {
      const s = parsed[key];
      if (s === 'legal' || s === 'restricted') return s;
    }
    return parsed[legalityKeys[0]];
  } catch { return undefined; }
}

/**
 * Pick whichever variant of a commander — the resolved card or its Arena
 * "A-" rebalance counterpart (either direction: paper→A- or A-→paper) — is
 * actually legal/restricted in the target format. Pure and DB-free so the
 * swap logic is unit-testable without a live SQLite instance.
 */
export function resolveLegalCommanderVariant<T extends Pick<DbCard, 'name' | 'legalities'>>(
  card: T,
  otherVariant: T | undefined,
  legalityKeys: string[]
): { card: T; status: string } | null {
  const status = readLegalityStatus(card, legalityKeys);
  if (status === 'legal' || status === 'restricted') return { card, status };
  const otherStatus = otherVariant ? readLegalityStatus(otherVariant, legalityKeys) : undefined;
  if (otherVariant && (otherStatus === 'legal' || otherStatus === 'restricted')) {
    return { card: otherVariant, status: otherStatus };
  }
  return null;
}

// ── Main deck builder ───────────────────────────────────────────────────────

export interface BuildOptions {
  format: string;
  colors: string[]; // e.g. ['W', 'U']
  strategy?: string; // optional archetype hint: 'aggro', 'control', 'midrange', 'combo'
  useCollection?: boolean; // prefer cards from user's collection
  commanderName?: string; // for commander format
  partnerName?: string; // second commander for partner pairs (Thrasios + Tymna)
  powerLevel?: 'casual' | 'optimized' | 'cedh';
  userId?: number; // for commander-arsenal collection substitutes
  /** Restrict card rarity: pauper = commons only, peasant = commons + uncommons */
  rarityFilter?: 'pauper' | 'peasant';
  /** Free-text fine-tune prompt, parsed deterministically (no LLM) */
  buildHints?: string;
  /** Capture per-card score-component breakdown (training/diagnostics only) */
  captureComponents?: boolean;
  /** USD price ceiling per card; commander/owned/hinted-exempt cards over this leave the pool */
  maxCardPrice?: number;
  /** USD price ceiling for the whole built main deck; triggers post-build swaps */
  maxDeckPrice?: number;
  /** Target WotC Commander bracket (1-5); ignored for 60-card formats */
  bracket?: 1 | 2 | 3 | 4 | 5;
  /**
   * Restrict ownership to one collection source (e.g. 'arena', 'paper').
   * Undefined = every source the user owns. Never defaulted inside the
   * engine — build-api seeds its temp collection under source 'web-build',
   * so an engine-side default would empty every web collection build.
   */
  collectionSource?: string;
}

/** `BuildResult.price` — always present, no-op values when no cap was requested. */
export interface BuildPriceReport {
  currency: 'USD';
  total: number;
  unpricedCount: number;
  maxCardPrice: number | null;
  maxDeckPrice: number | null;
  excludedByCardCap: number;
  replacedForBudget: Array<{ out: string; in: string; saved: number }>;
  /** true when maxDeckPrice was requested and the built total still exceeds it. */
  overBudget: boolean;
}

/** `BuildResult.bracket` — always present for Commander-family formats; `target: null` for others. */
export interface BuildBracketReport {
  target: 1 | 2 | 3 | 4 | 5 | null;
  result: 1 | 2 | 3 | 4 | 5;
  reasons: string[];
  swapped: Array<{ out: string; in: string; category: string }>;
}

export interface BuildResult {
  cards: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>;
  themes: string[];
  strategy: string;
  tribalType?: string;
  commanderSynergy?: CommanderSynergyProfile;
  /** Per-card reasoning trail from the role-based picker */
  reasoning?: Array<{ cardName: string; role: string; reason: string }>;
  /** Debug summary of role fills */
  buildReport?: string;
  /** Post-build (and post-repair) deck health audit — mana, draw, lands */
  health?: DeckHealth;
  /** Scored candidate pool with per-card score components (captureComponents only) */
  scoredPool?: Array<{ name: string; score: number; components: Record<string, number> }>;
  /** What the free-text buildHints prompt was understood to mean (build-hints.ts) */
  hints?: { parsed: ParsedBuildHints; boostedCards: number };
  /**
   * Cards the scored pool ranked ahead of the deck's actual picks but the user
   * doesn't own — a "needed to craft" / buy list. Populated only when
   * useCollection is true. Capped at 15, ordered by score descending.
   */
  craftList?: CraftListEntry[];
  /**
   * Price cap / deck-budget accounting. Always populated by autoBuildDeck
   * (optional in the type only so existing partial BuildResult literals in
   * other test files don't need updating for this additive field).
   */
  price?: BuildPriceReport;
  /** Bracket target accounting. Always populated by autoBuildDeck — see `price`. */
  bracket?: BuildBracketReport;
  /** Dead-card pass: narrow tutors, uncastable {C} costs, mono dead fixers swapped out. Always populated. */
  deadCardsReplaced?: Array<{ out: string; in: string; reason: string }>;
}

/** One `BuildResult.craftList` entry — see `computeCraftList` below. */
export interface CraftListEntry {
  name: string;
  role: string;
  rarity: string;
  priceUsd: number | null;
  onArena: boolean;
  score: number;
  /** The lowest-scored owned pick in the same role, if any exists. */
  wouldReplace?: string;
  reason: string;
  /** Always false — craftList is by construction the unowned candidates (see the ownedQty filter below). Present for shape parity with /build's cards[]. */
  owned: boolean;
}

export interface ScoredCandidatePoolResult {
  pool: Array<{ card: DbCard; score: number; synergy?: boolean }>;
  hints: ParsedBuildHints;
  /** Candidates whose score included a non-zero emphasize-term bonus */
  boostedCards: number;
  themes: string[];
  resolvedStrategy: string;
  tribalType: string | null;
  tribalNames: Set<string>;
  commanderProfile: CommanderSynergyProfile | null;
  commanderCard: DbCard | null;
  format: string;
  landTarget: number;
  nonLandTarget: number;
  isCommander: boolean;
  maxCopies: number;
  colors: string[];
  ownedQty: Map<string, number>;
  useCollection: boolean;
  colorExcludeFilter: string;
  legalityFilter: string;
  commanderExclude: string;
  collectionJoin: string;
  collectionOrder: string;
  metaStatsMap: Map<string, { inclusionRate: number; placementScore: number; coreRate: number; winRate: number }>;
  commanderStatsMap: Map<string, { inclusionRate: number; synergyScore: number }>;
  /** Per-card additive score breakdown; populated only when options.captureComponents */
  componentsByName?: Map<string, Record<string, number>>;
  /** Count of candidates removed from the pool by options.maxCardPrice (rule 2) */
  priceCapExcluded: number;
}

/**
 * Owned-only positional prefix of a candidate pool. `pool` (and
 * `ScoredCandidatePoolResult.pool`) carries owned+unowned candidates so the
 * craft list can score unowned cards too — but callers that read a positional
 * prefix of it (CF recommendation seed, theme-detection sample) must see
 * exactly the owned subsequence, in the same relative order, on a collection
 * build. Otherwise those downstream network/prompt inputs — and therefore
 * scores and final picks — drift from build to build as unowned cards shift
 * in and out of the top N by score/rank.
 */
export function ownedPoolPrefix<T>(
  pool: T[], getName: (item: T) => string, ownedQty: Map<string, number>, useCollection: boolean, n: number
): T[] {
  return (useCollection ? pool.filter((item) => (ownedQty.get(getName(item)) || 0) > 0) : pool).slice(0, n);
}

/**
 * Build a scored candidate pool of nonland cards for deck construction.
 * Reusable by both autoBuildDeck() and Claude-powered deck building.
 */
export async function buildScoredCandidatePool(options: BuildOptions): Promise<ScoredCandidatePoolResult> {
  const db = getDb();
  const { format, strategy, commanderName } = options;
  // Bracket target overrides powerLevel when both are given: 1-2 -> casual,
  // 3-4 -> optimized, 5 -> cedh (cEDH staples on). powerLevel alone is unchanged.
  const powerLevel: BuildOptions['powerLevel'] = options.bracket == null
    ? options.powerLevel
    : options.bracket <= 2 ? 'casual' : options.bracket === 5 ? 'cedh' : 'optimized';
  let useCollection = options.useCollection ?? false;

  // If commander format, derive colors from commander's color identity
  let colors = options.colors;
  let commanderCard: DbCard | null = null;
  if (commanderName) {
    // Prefer the "real" card over Art Series / token duplicates:
    // Order by mana_cost IS NOT NULL DESC so entries with actual cost come first,
    // then by type_line NOT LIKE '%Card%' to deprioritize Art Series (type "Card // Card")
    const cmdCard = db.prepare(`
      SELECT * FROM cards WHERE name = ? COLLATE NOCASE
      ORDER BY
        CASE WHEN mana_cost IS NOT NULL AND mana_cost != '' THEN 0 ELSE 1 END,
        CASE WHEN type_line LIKE '%Card //%' OR type_line = 'Card' THEN 1 ELSE 0 END,
        updated_at DESC
      LIMIT 1
    `).get(commanderName) as DbCard | undefined;
    if (cmdCard) {
      commanderCard = cmdCard;
      if (cmdCard.color_identity) {
        try {
          colors = JSON.parse(cmdCard.color_identity);
        } catch {}
      }
      // Competitive Brawl has its own 10-commander ban list (magic.wizards.com,
      // "Introducing Ranked Brawl", 2026-06-23) that applies regardless of
      // Historic Brawl legality — check it first, name and A- form both banned.
      if (format === 'competitivebrawl' && isCompetitiveBrawlBannedCommander(cmdCard.name)) {
        throw new Error(`${cmdCard.name} is banned as a commander in Competitive Brawl`);
      }

      // Refuse to build around a commander that isn't legal in the target
      // format (e.g. Warhammer 40K commanders don't exist on Arena at all).
      // Arena-rebalanced cards: when one variant (paper or "A-" rebalanced)
      // is not_legal but the other is legal, Arena plays whichever variant
      // is actually legal under the same name — swap to it so oracle
      // analysis matches what's actually played. Symmetric: works whether
      // the resolved row is the paper or the "A-" card.
      if (format && format !== '1v1') {
        // Competitive Brawl has no Scryfall legality key of its own; a
        // commander is Arena-available if it's legal/restricted in either
        // Historic Brawl or Historic (the article calls the 99 "nearly
        // unrestricted" with no published banlist — conservative fallback).
        const legalityKeys = format === 'competitivebrawl' ? ['brawl', 'historic'] : [getLegalityKey(format)];
        const otherVariantName = cmdCard.name.startsWith('A-') ? cmdCard.name.slice(2) : `A-${cmdCard.name}`;
        const otherVariant = db.prepare(
          'SELECT * FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1'
        ).get(otherVariantName) as DbCard | undefined;
        const resolved = resolveLegalCommanderVariant(cmdCard, otherVariant, legalityKeys);
        if (!resolved) {
          const status = readLegalityStatus(cmdCard, legalityKeys);
          throw new Error(
            `${cmdCard.name} is not legal as a commander in ${format} (status: ${status ?? 'unknown'})`
          );
        }
        commanderCard = resolved.card;
      }
    }
    // Commander name was given but no card matched (e.g. wrong apostrophe/typo).
    // Fail loud instead of silently building a broken, colorless 72-card deck.
    if (!commanderCard) {
      throw new Error(`Commander not found: "${commanderName}" — check the exact card name`);
    }
  }

  // Partner support: union the partner's color identity and exclude it from
  // the candidate pool. Synergy profiles are merged later in autoBuildDeck.
  let partnerCard: DbCard | null = null;
  if (options.partnerName && commanderCard) {
    const pCard = db.prepare(`
      SELECT * FROM cards WHERE name = ? COLLATE NOCASE
      ORDER BY
        CASE WHEN mana_cost IS NOT NULL AND mana_cost != '' THEN 0 ELSE 1 END,
        CASE WHEN type_line LIKE '%Card //%' OR type_line = 'Card' THEN 1 ELSE 0 END,
        updated_at DESC
      LIMIT 1
    `).get(options.partnerName) as DbCard | undefined;
    if (pCard) {
      partnerCard = pCard;
      try {
        const pColors = JSON.parse(pCard.color_identity || '[]') as string[];
        colors = Array.from(new Set([...colors, ...pColors]));
      } catch { /* keep primary colors */ }
    }
  }

  const targetSize = DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default;
  const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;
  const isCommander = format === 'commander' || format === 'brawl' || format === 'standardbrawl' || format === 'competitivebrawl';
  const nonLandTarget = targetSize - targetLands
    - (isCommander && commanderName ? 1 : 0)
    - (isCommander && partnerCard ? 1 : 0);
  const maxCopies = isCommander ? 1 : 4;

  // Build color identity exclusion — cards must fit within the deck's colors
  const excludeColors = ['W', 'U', 'B', 'R', 'G'].filter((c) => !colors.includes(c));
  const colorExcludeFilter = excludeColors
    .map((c) => `c.color_identity NOT LIKE '%${c}%'`)
    .join(' AND ');

  // Only include cards that are legal in the format (skip for 1v1 — no Scryfall legality data)
  const baseLegalityFilter = format && format !== '1v1'
    ? `AND json_extract(c.legalities, '$.${getLegalityKey(format)}') IN ('legal', 'restricted')`
    : '';

  // Rarity restriction (Pauper Commander etc.). Folded into legalityFilter so
  // every pool/land/backfill query inherits it automatically.
  const rarityCondition = options.rarityFilter === 'pauper'
    ? `AND c.rarity = 'common'`
    : options.rarityFilter === 'peasant'
      ? `AND c.rarity IN ('common', 'uncommon')`
      : '';
  const legalityFilter = `${baseLegalityFilter} ${rarityCondition}`.trim();

  // Free-text fine-tune hints → deterministic knobs (no LLM)
  const hints = parseBuildHints(options.buildHints);
  const resolvedStrategyHint = options.strategy || hints.strategy;

  // Exclude commander (and partner, and Alchemy-rebalanced twin) from the 99
  const commanderExclude = [
    commanderName ? `AND c.name != '${commanderName.replace(/'/g, "''")}'` : '',
    commanderName ? `AND c.name != 'A-${commanderName.replace(/'/g, "''")}'` : '',
    partnerCard ? `AND c.name != '${partnerCard.name.replace(/'/g, "''")}'` : '',
  ].join(' ');

  // ── Collection quantity map (name-based to handle different printings) ────
  // Ownership no longer gates pool MEMBERSHIP (see poolQuery note below) — it's
  // enforced later at pick time via getMaxQty(), so only quantities are needed.
  // ROOT-CAUSE FIX (2026-09-26): this query had no `WHERE user_id = ?` clause
  // — it summed every user's collection rows together, so a collection build
  // for user 1 treated cards owned only by a DIFFERENT user (e.g. a friend's
  // imported ManaBox collection) as owned. Without a userId, no user-specific
  // collection can be identified, so treat it as empty rather than leaking
  // every user's cards into the pool.
  const ownershipFilter: OwnershipFilter = { userId: options.userId, source: options.collectionSource };
  let ownedQty = new Map<string, number>();
  if (useCollection) {
    ownedQty = buildOwnedQtyMap(db, ownershipFilter);
    if (ownedQty.size === 0) {
      // No collection imported yet (for this user/source): the UI defaults
      // "prefer my collection" on, and honoring it here yields commander +
      // 99 basics. Fall back to the full pool.
      useCollection = false;
    }
    // Basic lands are always available (Arena gives unlimited)
    for (const basic of ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']) {
      ownedQty.set(basic, 99);
    }
  }

  // Name-based collection filter: an "owned" subquery of A--stripped names
  // (basics always included), scoped to the building user and, if given,
  // one collection source, matched A--stripped (a semi-join, see ownedNameJoin) so an
  // Arena-rebalanced "A-X" and its paper name "X" count as one card.
  const ownedNamesSql = ownedNamesSubqueryInline(ownershipFilter);
  const collectionJoin = useCollection
    ? ownedNameJoin(ownershipFilter)
    : '';
  const collectionOrder = useCollection
    ? `CASE WHEN ${normalizedNameExpr('c.name')} IN (SELECT cname FROM (${ownedNamesSql})) THEN 0 ELSE 1 END,`
    : '';

  // ── EDHREC Integration: fetch commander-specific data ─────────────────────
  // Check local commander_synergies table first (populated by Python scripts),
  // then fall back to live EDHREC fetch

  let edhrecSynergyMap = new Map<string, { synergy: number; inclusion: number }>();
  let edhrecThemes: string[] = [];
  let edhrecResolvedCards: DbCard[] = [];

  if (isCommander && commanderName) {
    // Check if we have pre-enriched synergies from the Python pipeline
    try {
      const localSynergies = db.prepare(
        `SELECT card_name, synergy_score, inclusion_rate FROM commander_synergies
         WHERE commander_name = ? COLLATE NOCASE
         ORDER BY synergy_score DESC`
      ).all(commanderName) as Array<{ card_name: string; synergy_score: number; inclusion_rate: number }>;

      if (localSynergies.length > 0) {
        for (const row of localSynergies) {
          edhrecSynergyMap.set(row.card_name, {
            synergy: row.synergy_score,
            inclusion: row.inclusion_rate,
          });
        }
        // Resolve local synergy card names to DB rows
        const localRecs = localSynergies.map((r) => ({
          name: r.card_name,
          synergy: r.synergy_score,
          inclusion: r.inclusion_rate,
        }));
        const resolved = resolveEdhrecCards(
          db, localRecs, colorExcludeFilter, legalityFilter, commanderExclude
        );
        edhrecResolvedCards = resolved.map((r) => r.card);
      }
    } catch {
      // Table may not exist yet — that's fine, the live EDHREC fetch handles it
    }

    // Always try the live EDHREC fetch for themes + any cards not in local DB
    const edhrecData = await getEdhrecRecommendations(commanderName);

    if (edhrecData) {
      edhrecThemes = edhrecData.themes;

      // Build synergy lookup from EDHREC's commander-specific data
      for (const rec of edhrecData.topCards) {
        edhrecSynergyMap.set(rec.name, { synergy: rec.synergy, inclusion: rec.inclusion });
      }

      // Resolve EDHREC cards to DB rows
      const resolved = resolveEdhrecCards(
        db, edhrecData.topCards, colorExcludeFilter, legalityFilter, commanderExclude
      );
      edhrecResolvedCards = resolved.map((r) => r.card);

      // Fetch theme-specific cards for the top 2 EDHREC themes
      const themePromises = edhrecData.themes.slice(0, 2).map((theme) =>
        getEdhrecThemeCards(commanderName, theme)
      );
      const themeResults = await Promise.all(themePromises);

      for (const themeData of themeResults) {
        if (!themeData) continue;
        for (const rec of themeData.cards) {
          // Don't overwrite higher synergy scores from the main list
          if (!edhrecSynergyMap.has(rec.name) || rec.synergy > (edhrecSynergyMap.get(rec.name)?.synergy || 0)) {
            edhrecSynergyMap.set(rec.name, { synergy: rec.synergy, inclusion: rec.inclusion });
          }
        }
        // Resolve theme cards too
        const themeResolved = resolveEdhrecCards(
          db, themeData.cards, colorExcludeFilter, legalityFilter, commanderExclude
        );
        for (const r of themeResolved) {
          if (!edhrecResolvedCards.some((c) => c.name === r.card.name)) {
            edhrecResolvedCards.push(r.card);
          }
        }
      }
    }
  }

  // ── Tribal detection ───────────────────────────────────────────────────────
  // If the commander is a tribal leader, fetch matching creature type cards

  let tribalType: string | null = null;
  let tribalCards: DbCard[] = [];
  const tribalNames = new Set<string>();

  if (isCommander && commanderName) {
    tribalType = detectTribalTheme(db, commanderName);
    if (tribalType) {
      const ownedNames = useCollection ? new Set(ownedQty.keys()) : new Set<string>();
      tribalCards = fetchTribalCards(db, tribalType, colorExcludeFilter, legalityFilter, commanderExclude, ownedNames);
      for (const c of tribalCards) tribalNames.add(c.name);

      // Ensure 'tribal' is in the themes
      if (!edhrecThemes.some((t) => t.toLowerCase().includes('tribal'))) {
        edhrecThemes.push('Tribal');
      }
    }
  }

  // ── Commander Synergy Analysis ─────────────────────────────────────────────
  // Parse the commander's oracle text to detect triggers/payoffs and infer
  // concrete deck-building requirements (synergy minimums, score bonuses, etc.)

  let commanderProfile: CommanderSynergyProfile | null = null;

  if (isCommander && commanderName) {
    const cmdRow = db.prepare(
      'SELECT oracle_text, type_line, color_identity, layout FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1'
    ).get(commanderName) as { oracle_text: string | null; type_line: string; color_identity: string | null; layout: string } | undefined;

    if (cmdRow) {
      // For MDFC/double-faced commanders, concatenate both faces' oracle text
      let fullOracleText = cmdRow.oracle_text || '';
      if (cmdRow.layout === 'modal_dfc' || cmdRow.layout === 'transform') {
        // Check if there's a back face in the card_faces data
        const facesRow = db.prepare(
          "SELECT oracle_text FROM cards WHERE name LIKE ? AND name != ? COLLATE NOCASE LIMIT 1"
        ).get(`${commanderName} //%`, commanderName) as { oracle_text: string | null } | undefined;
        if (facesRow?.oracle_text) {
          fullOracleText += '\n' + facesRow.oracle_text;
        }
      }

      let ci: string[] = [];
      try { ci = cmdRow.color_identity ? JSON.parse(cmdRow.color_identity) : []; } catch {}

      commanderProfile = analyzeCommander(
        fullOracleText, cmdRow.type_line, ci, commanderCard?.mana_cost || undefined,
        { superfriends: true, tribalPayoff: true },
      );

      // Partner pair: analyze the second commander and merge both profiles
      // so the deck serves BOTH halves (e.g. Thrasios ramp/draw + Tymna
      // lifelink/draw) instead of silently building mono-primary.
      if (partnerCard) {
        const partnerProfile = analyzeCommander(
          partnerCard.oracle_text || '',
          partnerCard.type_line || '',
          colors,
          partnerCard.mana_cost || undefined,
          { superfriends: true, tribalPayoff: true },
        );
        if (commanderProfile && partnerProfile) {
          commanderProfile = mergeProfiles(commanderProfile, partnerProfile);
        } else if (partnerProfile) {
          commanderProfile = partnerProfile;
        }
      }
    }
  }

  // ── Step 1: Build card pool ─────────────────────────────────────────────
  // For commander: start with EDHREC-recommended cards + tribal cards,
  // then synergy-targeted cards, then generic
  // For non-commander: use global edhrec_rank as before

  // NOTE: no collectionJoin here — the pool must include unowned cards too
  // (craft list needs to score them), sorted owned-first via collectionOrder.
  // Ownership is enforced later at pick time via getMaxQty().
  const poolQuery = `
    SELECT DISTINCT c.* FROM cards c
    WHERE (c.type_line NOT LIKE '%Land%' OR c.type_line LIKE '%//%')
    AND c.type_line != 'Card' AND c.type_line NOT LIKE 'Card //%'
    ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
    ${legalityFilter}
    ${commanderExclude}
    ORDER BY ${collectionOrder} c.edhrec_rank ASC NULLS LAST
    LIMIT 5000
  `;

  const dbPool = db.prepare(poolQuery).all() as DbCard[];

  // Merge: EDHREC cards first, then tribal cards, then DB pool
  const seenNames = new Set<string>();
  const pool: DbCard[] = [];

  // Format-legality guard for injected candidates. The base SQL pool filters
  // via legalityFilter, but EDHREC/tribal/CF injection paths resolved cards
  // by name with no legality check — which is how 40K cards (Tervigon,
  // Broodlord) leaked into Brawl decks.
  const poolLegalityKey = format && format !== '1v1' ? getLegalityKey(format) : null;
  const cardLegalInFormat = (card: DbCard): boolean => {
    if (!poolLegalityKey) return true;
    if (!card.legalities) return false;
    try {
      const status = (JSON.parse(card.legalities) as Record<string, string>)[poolLegalityKey];
      return status === 'legal' || status === 'restricted';
    } catch {
      return false;
    }
  };
  // The candidate pool is for NONLAND selection — lands have their own
  // pipeline (land-intelligence). EDHREC/tribal/CF injections include
  // utility lands, which used to leak in and consume spell slots.
  const validForPool = (card: DbCard): boolean => {
    if (!cardLegalInFormat(card)) return false;
    if ((card.type_line || '').split('//')[0].includes('Land')) return false;
    // Dead in these colors (e.g. Farseek in mono-G fetches nothing)
    if (isDeadLandFetch(card.oracle_text, colors)) return false;
    // Rarity ceiling (Pauper/Peasant) applies to injected candidates too —
    // the EDHREC/tribal paths otherwise leak rares into commons-only builds.
    if (options.rarityFilter === 'pauper' && card.rarity !== 'common') return false;
    if (options.rarityFilter === 'peasant' && card.rarity !== 'common' && card.rarity !== 'uncommon') return false;
    return true;
  };

  // EDHREC cards go first — these are specifically recommended for this
  // commander. Unowned cards stay in the pool (and get scored) so the craft
  // list can surface them; ownership is enforced later at pick time.
  for (const card of edhrecResolvedCards) {
    if (!seenNames.has(card.name)) {
      if (!validForPool(card)) continue;
      seenNames.add(card.name);
      pool.push(card);
    }
  }

  // Tribal cards next — creatures and synergy cards of the detected type
  for (const card of tribalCards) {
    if (!seenNames.has(card.name)) {
      if (!validForPool(card)) continue;
      seenNames.add(card.name);
      pool.push(card);
    }
  }

  // Commander synergy-targeted cards — fetch cards matching synergy patterns
  if (commanderProfile && commanderProfile.cardPoolPatterns.length > 0) {
    const synergyConditions = commanderProfile.cardPoolPatterns
      .map((p) => `c.oracle_text LIKE '${p.replace(/'/g, "''")}'`)
      .join(' OR ');

    const synergyPoolQuery = `
      SELECT DISTINCT c.* FROM cards c
      WHERE (c.type_line NOT LIKE '%Land%' OR c.type_line LIKE '%//%')
      AND c.type_line != 'Card' AND c.type_line NOT LIKE 'Card //%'
      AND (${synergyConditions})
      ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
      ${legalityFilter}
      ${commanderExclude}
      ORDER BY ${collectionOrder} c.edhrec_rank ASC NULLS LAST
      LIMIT 1000
    `;

    try {
      const synergyCards = db.prepare(synergyPoolQuery).all() as DbCard[];
      for (const card of synergyCards) {
        if (!seenNames.has(card.name)) {
          seenNames.add(card.name);
          pool.push(card);
        }
      }
    } catch {
      // Query may fail if patterns are malformed — not critical
    }
  }

  // Fill remaining pool slots from the generic DB query
  for (const card of dbPool) {
    if (!seenNames.has(card.name)) {
      seenNames.add(card.name);
      pool.push(card);
    }
  }

  // ── Inject format staples that may have been missed ────────────────────
  // Cards with high inclusion rates in scraped community decks (e.g. Arcane Signet,
  // Lightning Greaves) must always be in the candidate pool regardless of EDHREC/DB limits
  if (isCommander) {
    const formatStaples = getFormatStaples(format, colors, 30);
    for (const staple of formatStaples) {
      if (staple.inclusionRate < 0.10) continue; // Only inject meaningful staples
      if (seenNames.has(staple.cardName)) continue;

      const stapleCard = db.prepare(
        `SELECT c.* FROM cards c WHERE c.name = ? COLLATE NOCASE
         ${legalityFilter}
         ${commanderExclude}
         LIMIT 1`
      ).get(staple.cardName) as DbCard | undefined;

      if (stapleCard && validForPool(stapleCard)) {
        seenNames.add(stapleCard.name);
        pool.push(stapleCard);
      }
    }
  }

  // ── Price cap: candidates over maxCardPrice leave the pool up front ──────
  // Exempt: the commander (never in this nonland pool anyway), and cards the
  // user already owns (free to them). Unknown price (null) is excluded too —
  // unpriced is not free — unless owned. A deck budget alone (no per-card
  // cap) still needs this: an unowned unpriced card must not enter a
  // "$X deck" pool and get counted as $0 — cap at +Infinity so only the
  // null-price check fires, not a per-card ceiling.
  let priceCapExcluded = 0;
  if ((options.maxCardPrice != null && options.maxCardPrice > 0) || (options.maxDeckPrice != null && options.maxDeckPrice > 0)) {
    const cap = options.maxCardPrice != null && options.maxCardPrice > 0 ? options.maxCardPrice : Infinity;
    for (let i = pool.length - 1; i >= 0; i--) {
      const card = pool[i];
      if (useCollection && (ownedQty.get(card.name) || 0) > 0) continue;
      if (passesCardPriceCap(card.price_usd, cap)) continue;
      pool.splice(i, 1);
      priceCapExcluded++;
    }
  }

  // ── Bracket target: strike offending categories from the pool up front ──
  // (Commander-family formats only — bracket is a Commander Brackets concept.)
  if (isCommander && options.bracket != null) {
    const excluded = bracketPoolExclusions(options.bracket);
    if (excluded.size > 0) {
      for (let i = pool.length - 1; i >= 0; i--) {
        const cat = bracketOffenseCategory(pool[i] as BracketCard);
        if (cat && excluded.has(cat)) pool.splice(i, 1);
      }
    }
  }

  const poolPrefix = (n: number): DbCard[] => ownedPoolPrefix(pool, (c) => c.name, ownedQty, useCollection, n);

  // ── Step 2: Determine themes ────────────────────────────────────────────
  // For commander: use EDHREC themes mapped to synergy groups, supplemented
  // by keyword detection from the EDHREC cards themselves
  // For non-commander: detect from pool as before

  let themes: string[];

  if (isCommander && edhrecThemes.length > 0) {
    // Map EDHREC theme labels to our synergy group keys
    const mappedThemes = new Set<string>();
    for (const edhTheme of edhrecThemes) {
      const key = edhTheme.toLowerCase();
      const mapped = EDHREC_THEME_MAP[key];
      if (mapped) {
        mappedThemes.add(mapped);
      }
    }

    // Also detect themes from the EDHREC-recommended cards themselves
    const edhrecDetected = detectDeckThemes(edhrecResolvedCards);
    for (const t of edhrecDetected) {
      mappedThemes.add(t);
    }

    themes = Array.from(mappedThemes).slice(0, 5);

    // If we still have no themes, fall back to pool detection
    if (themes.length === 0) {
      themes = detectDeckThemes(poolPrefix(40));
    }
  } else {
    themes = detectDeckThemes(poolPrefix(40));
  }

  // Commander synergy archetype overrides generic CMC-based detection.
  // Explicit strategy > hint-derived > [tribe over a GENERIC profile arch] >
  // commander profile > themes. A detected tribe outranks the weak voltron/
  // midrange fallbacks (Tovolar = Werewolf tribal, not voltron) but never a
  // specific archetype like aristocrats/spellslinger/combo.
  const profileArch = commanderProfile?.detectedArchetype;
  const genericArch = !profileArch || profileArch === 'voltron' || profileArch === 'midrange';
  const resolvedStrategy = resolvedStrategyHint
    || (tribalType && genericArch ? 'tribal' : profileArch)
    || (themes.includes('aggro') ? 'aggro' : themes.includes('control') ? 'control' : 'midrange');
  // Opt-in: a planeswalker never counts as 'draw' on this path (card-classifier
  // ClassifyOpts) — kept opt-in so every other archetype's classification is
  // byte-identical to before.
  const isSuperfriends = resolvedStrategy === 'superfriends';
  const classifyOpts = isSuperfriends ? { superfriends: true } : undefined;

  // ── ML personalization: load predictions from personalized_suggestions ──
  const mlScoreMap = new Map<string, number>();
  if (isCommander && commanderName) {
    try {
      // Check for deck-specific or commander-specific ML suggestions
      const mlRows = db.prepare(
        `SELECT card_name, predicted_score FROM personalized_suggestions
         WHERE (commander_name = ? COLLATE NOCASE OR deck_id = 0)
         ORDER BY predicted_score DESC
         LIMIT 500`
      ).all(commanderName) as Array<{ card_name: string; predicted_score: number }>;
      for (const row of mlRows) {
        mlScoreMap.set(row.card_name, row.predicted_score);
      }
    } catch {
      // Table may not exist yet
    }
  }

  // ── cEDH staples lookup ────────────────────────────────────────────────
  const cedhStapleMap = new Map<string, { category: string; power_tier: string }>();
  if (powerLevel === 'cedh' || powerLevel === 'optimized') {
    const staples = getCedhStaples(colors, format);
    for (const s of staples) {
      cedhStapleMap.set(s.card_name, { category: s.category, power_tier: s.power_tier });
    }
  }

  // ── Meta card stats lookup ────────────────────────────────────────────
  const poolNames = pool.map(c => c.name);
  const metaStatsMap = getMetaCardStatsMap(poolNames, format);

  // ── Collaborative Filtering recommendations ─────────────────────────
  const cfScoreMap = new Map<string, number>();
  if (isCommander && commanderName) {
    try {
      const deckCardNames = poolPrefix(30).map(c => c.name);
      const cfRecs = await getCFRecommendations(deckCardNames, commanderName, 50, { logImpressions: false });
      for (const rec of cfRecs) {
        cfScoreMap.set(rec.card_name, rec.cf_score);
      }
      // Inject CF-recommended cards into pool if not already present.
      // Unowned recs stay in the pool (scored, craft-list candidates); the
      // final deck still enforces ownership at pick time via getMaxQty().
      if (cfRecs.length > 0) {
        const existingIds = new Set(pool.map(c => c.id));
        const cfCards = resolveCFToDbCards(cfRecs, existingIds);
        for (const { card } of cfCards) {
          if (!seenNames.has(card.name)) {
            if (!validForPool(card)) continue;
            seenNames.add(card.name);
            pool.push(card);
          }
        }
      }
    } catch {
      // CF API unreachable — non-blocking
    }
  }

  // ── Per-commander card stats (from 506K+ community decks) ──────────────
  // Provides per-commander inclusion rates: "72% of Ur-Dragon decks run Sol Ring"
  const commanderStatsMap = new Map<string, { inclusionRate: number; synergyScore: number }>();
  if (isCommander && commanderName) {
    const cmdrStats = getCommanderCardStats(commanderName, 300);
    for (const s of cmdrStats) {
      commanderStatsMap.set(s.cardName, {
        inclusionRate: s.inclusionRate,
        synergyScore: s.synergyScore,
      });
    }
    // Inject high-inclusion commander cards into pool if not already present
    // Cards that 25%+ of this commander's decks run should be candidates
    const highIncCards = cmdrStats.filter(s => s.inclusionRate >= 0.25 && !seenNames.has(s.cardName));
    if (highIncCards.length > 0) {
      const namePlaceholders = highIncCards.map(() => '?').join(',');
      try {
        // NOTE: alias `c` is required — colorExcludeFilter/legalityFilter
        // reference c.*; without it this query threw and the catch silently
        // disabled stat injection for every build.
        const injected = db.prepare(`
          SELECT c.* FROM cards c
          WHERE c.name IN (${namePlaceholders})
          ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
          ${legalityFilter}
          LIMIT 100
        `).all(...highIncCards.map(s => s.cardName)) as DbCard[];
        for (const card of injected) {
          if (!seenNames.has(card.name)) {
            // Community stats include LANDS (Command Tower, basics, fetches)
            // at high inclusion — they belong to the land pipeline, not here.
            if (!validForPool(card)) continue;
            seenNames.add(card.name);
            pool.push(card);
          }
        }
      } catch {
        // cards table query failed — non-blocking
      }
    }
  }

  // ── Step 3: Score cards ─────────────────────────────────────────────────
  // Key change: EDHREC per-commander synergy score is now the dominant signal
  // for commander format decks, replacing the generic edhrec_rank

  // Color-share estimate: what fraction of all decks can play this color combo?
  // Used to adjust global inclusion rates into color-specific rates
  const colorShareEstimate = colors.length <= 1 ? 0.45
    : colors.length === 2 ? 0.25
    : colors.length === 3 ? 0.15
    : colors.length === 4 ? 0.10
    : 0.05;

  // Per-card additive score breakdown, captured only when training/diagnosing.
  const componentsByName = new Map<string, Record<string, number>>();

  // Candidates whose score got a non-zero emphasize-term bonus (item 4:
  // "what the builder understood from the hints" for the API response).
  let boostedCards = 0;

  const scored = pool.map((card) => {
    let score = 0;
    const comp: Record<string, number> = {};
    let snapAt = 0;
    const snap = (key: string): void => {
      const delta = score - snapAt;
      if (delta !== 0) comp[key] = (comp[key] || 0) + delta;
      snapAt = score;
    };

    // ── ML personalization bonus (from trained scikit-learn model) ──
    const mlScore = mlScoreMap.get(card.name);
    if (mlScore !== undefined) {
      // ML predicted win rate (0-1) scaled to 0-25 bonus
      score += Math.max(0, (mlScore - 0.4) * 40);
    }

    snap('ml');
    // ── Collaborative Filtering bonus (from similar decks in CF engine) ──
    const cfScore = cfScoreMap.get(card.name);
    if (cfScore !== undefined) {
      // CF score (0-1) scaled to 0-20 bonus
      score += cfScore * 20;
    }

    snap('cf');
    // ── Per-commander community data (from 506K+ decks) ──
    // "72% of Ur-Dragon decks run this card" — strongest signal for commander decks
    const cmdrStats = commanderStatsMap.get(card.name);
    if (cmdrStats) {
      // Inclusion rate: 0-1 scaled to 0-70 bonus (highest-weight signal)
      if (cmdrStats.inclusionRate >= 0.6) {
        score += 70; // Commander staple — in 60%+ of this commander's decks
      } else if (cmdrStats.inclusionRate >= 0.4) {
        score += 50; // Near-staple for this commander
      } else if (cmdrStats.inclusionRate >= 0.25) {
        score += 35; // Common pick
      } else if (cmdrStats.inclusionRate >= 0.15) {
        score += 20; // Frequent include
      } else if (cmdrStats.inclusionRate >= 0.08) {
        score += 10; // Occasional include
      }
      // Synergy bonus: cards that appear MORE in this commander's decks than globally.
      // NOTE (2026-07-03): a lift-ratio variant (inclusion/global tiers 8x/4x/2x) was
      // tried and REVERTED — fitness 897→885 against the EDHREC-consensus references.
      // Revisit lift when references are predominantly human winning lists (see
      // docs/RECOMMENDER_METHODS_AUDIT.md #10).
      if (cmdrStats.synergyScore > 0.3) {
        score += 25; // Very high commander-specific synergy
      } else if (cmdrStats.synergyScore > 0.15) {
        score += 15;
      } else if (cmdrStats.synergyScore > 0.05) {
        score += 8;
      }
    }

    snap('cmdrStats');
    // ── EDHREC commander-specific synergy (primary signal for commander) ──
    const edhrecEntry = edhrecSynergyMap.get(card.name);
    if (edhrecEntry) {
      // Synergy score from EDHREC ranges roughly -1 to +1
      // Scale to 0-50 with a strong positive bias for high-synergy cards
      score += Math.max(0, (edhrecEntry.synergy + 0.2) * 50);

      // Inclusion rate bonus: cards in >50% of decks are proven staples
      if (edhrecEntry.inclusion > 0.5) {
        score += 15;
      } else if (edhrecEntry.inclusion > 0.3) {
        score += 8;
      }
    }

    snap('edhrec');
    // ── Global learned rating (secondary signal when data exists) ──
    const globalRating = getCardGlobalScore(card.name, format);
    if (globalRating.confidence > 0.3) {
      const eloScore = Math.max(0, Math.min(100, (globalRating.elo - 1200) / 6));
      const winRateScore = globalRating.playedWinRate * 100;
      score += globalRating.confidence * (eloScore * 0.4 + winRateScore * 0.3);
      score += getMetaAdjustedScore(card.name, format);
    } else if (!edhrecEntry) {
      // Cold start AND no EDHREC data: fall back to global edhrec_rank
      if (card.edhrec_rank !== null) {
        score += Math.max(0, 50 - card.edhrec_rank / 400);
      }
    }

    snap('globalRank');
    // ── Tribal bonus ──
    // Cards that match the tribal type get a massive score boost
    if (tribalType && tribalNames.has(card.name)) {
      score += 30;
      // Extra bonus for actual creatures of the type (not just cards that mention it)
      const tl = card.type_line.toLowerCase();
      if (tl.includes('creature') && tl.includes(tribalType)) {
        score += 15; // creature of the tribe type
      }
    }

    snap('tribal');
    // ── Theme synergy bonus ──
    const text = (card.oracle_text || '').toLowerCase();
    const keywords = (card.keywords || '').toLowerCase();
    for (const theme of themes) {
      const patterns = SYNERGY_GROUPS[theme];
      if (!patterns) continue;
      for (const pattern of patterns) {
        if (text.includes(pattern) || keywords.includes(pattern)) {
          score += 15;
          break;
        }
      }
    }

    snap('theme');
    // ── Commander synergy bonus ──
    // Cards matching commander's trigger categories get bonus score
    if (commanderProfile) {
      for (const [category, bonus] of Object.entries(commanderProfile.scoreBonuses)) {
        const catPatterns = SYNERGY_REQUIREMENTS_MAP[category as keyof typeof SYNERGY_REQUIREMENTS_MAP];
        if (!catPatterns) continue;
        for (const p of catPatterns) {
          if (text.includes(p.toLowerCase())) {
            score += bonus;
            break;
          }
        }
      }
    }

    snap('profileSynergy');

    // ── Free-text hint adjustments (deterministic fine-tune, no LLM) ──
    if (hints.excludeNames.length && hints.excludeNames.some((n) => card.name.toLowerCase() === n)) {
      score -= 9999;
    }
    if (hints.budgetPerCard !== undefined) {
      const price = parseFloat(card.price_usd || '0');
      if (price > hints.budgetPerCard) score -= 9999;
    }
    if (hints.emphasize.length || hints.avoid.length) {
      const nameLC = card.name.toLowerCase();
      const frontNameLC = nameLC.split(' // ')[0];
      const hintText = `${nameLC} ${card.type_line || ''} ${card.oracle_text || ''}`.toLowerCase();
      let hintBonus = 0;
      for (const term of hints.emphasize) {
        if (hintText.includes(term)) hintBonus += 18;
      }
      if (hintBonus > 0) boostedCards += 1;
      score += Math.min(36, hintBonus);
      for (const term of hints.avoid) {
        // A multi-word avoid term that matches the card's NAME ("no massacre
        // wurm") is a deliberate cut, not a theme — hard-exclude it. Theme
        // avoids ("no counterspells") stay a soft penalty.
        if (term.length >= 5 && (nameLC === term || frontNameLC === term)) {
          score -= 9999;
        } else if (hintText.includes(term)) {
          score -= 40;
        }
      }
    }
    snap('hints');

    // ── Repeatable draw-engine bonus ──
    // Decks "go stale" when their card advantage is one-shot cantrips/charms.
    // Reward sticky engines (Phyrexian Arena, The Great Henge, Sylvan Library)
    // so they win draw slots over redundant one-shots. Aggro wants fewer.
    if (isDrawEngine(card.name, card.oracle_text || '', card.type_line || '')) {
      score += resolvedStrategy === 'aggro' ? 12 : 28;
    }
    snap('drawEngine');

    // ── Archetype discouraged types penalty ──
    const template = getTemplate(resolvedStrategy);
    if (template.discouragedTypes?.length) {
      const tl = card.type_line?.toLowerCase() ?? '';
      if (template.discouragedTypes.some(d => tl.includes(d.toLowerCase()))) {
        score -= 60;
      }
    }

    snap('typePenalty');
    // ── Storm CMC bonus ──
    // Storm commanders need maximum cheap spells to build storm count.
    // This overrides normal CMC preferences — heavily reward CMC 0-2.
    // Gated on the RESOLVED strategy, not the trigger: Aeve has Storm but
    // builds as Ooze tribal, and the -20 on every MV >= 5 card made the
    // tribe's finishers (Craterhoof, Overrun, Overlord) unreachable (A-D9).
    if (commanderProfile?.triggerCategories.includes('storm') && resolvedStrategy === 'spellslinger') {
      if (card.cmc <= 1) score += 25;
      else if (card.cmc <= 2) score += 18;
      else if (card.cmc <= 3) score += 8;
      else if (card.cmc >= 5) score -= 20;
      else if (card.cmc >= 7) score -= 40;
      // Cantrips are gold for storm — spells that draw + cost little
      if (card.cmc <= 2 && text.includes('draw a card')) score += 15;
      // Mana producers fuel more casts per turn
      if (text.includes('add {') || text.includes('add one mana')) score += 12;
      if (text.includes('create a treasure') || text.includes('create two treasure')) score += 10;
    }

    snap('stormFit');
    // ── Commander-mechanic bonuses needing card fields, not oracle regexes ──
    if (commanderProfile?.triggerCategories.includes('x_spells')) {
      // X-cost spells are the whole point of Vivi / Magus Lucea Kane / Zaxara
      if ((card.mana_cost || '').includes('{X}')) score += 30;
      if (text.includes('{x}') || text.includes('x in its mana cost') || text.includes('x in their mana cost')) score += 15;
    }
    if (commanderProfile?.triggerCategories.includes('five_colors')) {
      // Multicolor-matters (Ramos, Jodah, Najeela): CAST multicolored spells to
      // load counters / fuel the mana ability. Reward the spell's ACTUAL cast
      // colors — and reward CHEAP gold (charms) far more than expensive gold
      // legends, which curve out too slowly. The winning Ramos deck is a low-curve
      // charm engine, not a Niv-Mizzet / Ur-Dragon goodstuff pile.
      const tlc = (card.type_line || '').toLowerCase();
      const isLand = tlc.includes('land');
      const isPayoff = MANA_SINK_PAYOFFS.has(card.name.toLowerCase());
      let castColors = 0;
      try { castColors = (JSON.parse(card.colors || '[]') as string[]).length; } catch { /* skip */ }
      if (!isLand && castColors >= 2) {
        const cheap = (card.cmc || 0) <= 3;
        score += castColors * (cheap ? 16 : 9);      // 2c charm +32 / 3c +48; 5c bomb +45
        if (tlc.includes('instant') || tlc.includes('sorcery')) score += cheap ? 12 : 4; // charms/commands
        if ((card.cmc || 0) >= 6 && !isPayoff) score -= 24; // slow gold goodstuff tax
      } else if (!isLand && !isPayoff && castColors < 2) {
        // ponytail: mono/colorless nonlands crowd the charm engine; discount them so
        // gold spells win each slot. Rainbow-fix artifacts still net positive (+24 above).
        score -= 25;
      }
      // Cheap dual/rainbow fixing rocks (talisman cycle, signets, Chromatic Lantern,
      // Arcane Signet) are the multicolor-matters ramp backbone — bias ramp to them.
      if (!isLand && tlc.includes('artifact') && (card.cmc || 0) <= 2 &&
          /add \{[wubrg]\} or \{[wubrg]\}|pay 1 life: add|add \{[wubrg]\}\{[wubrg]\}|add one mana of any|mana of any (?:one )?color|add two mana/i.test(card.oracle_text || '')) {
        score += 24;
      }
      // Rainbow fixing to actually cast all those gold spells.
      if (/converge|sunburst|one mana of each color|mana of any color|add one mana of any|each color of mana spent|five colors?/.test(text)) score += 18;
      // Mana-sink payoffs that consume Ramos's burst.
      if (isPayoff) score += 45;
    }

    snap('mechanicFit');
    // ── Strategy fit ──
    if (resolvedStrategy === 'aggro') {
      if (card.cmc <= 2) score += 10;
      if (card.cmc <= 3 && card.type_line.includes('Creature')) score += 8;
      if (text.includes('haste') || text.includes('first strike')) score += 5;
      if (card.cmc >= 5) score -= 10;
    } else if (resolvedStrategy === 'control') {
      if (text.includes('counter target') || text.includes('destroy') || text.includes('exile target')) score += 10;
      if (text.includes('draw')) score += 5;
      if (card.type_line.includes('Creature') && card.cmc <= 2) score -= 5;
    } else {
      // midrange — balanced
      if (card.cmc >= 2 && card.cmc <= 4) score += 5;
      if (text.includes('draw') || text.includes('destroy') || text.includes('create')) score += 3;
    }

    snap('strategyFit');
    // ── cEDH power level scoring ──
    if (powerLevel === 'cedh') {
      const staple = cedhStapleMap.get(card.name);
      if (staple) {
        const tierBonus = staple.power_tier === 'cedh' ? 80
          : staple.power_tier === 'high' ? 50 : 25;
        score += tierBonus;
      }
      // Penalize high-CMC non-staples in cEDH
      if (card.cmc >= 5 && !cedhStapleMap.has(card.name)) {
        score -= 40;
      }
      // Reward cheap instants/sorceries
      if (card.cmc <= 1) {
        const tl = (card.type_line || '').toLowerCase();
        if (tl.includes('instant') || tl.includes('sorcery')) {
          score += 15;
        }
      }
    } else if (powerLevel === 'optimized') {
      const staple = cedhStapleMap.get(card.name);
      if (staple) {
        const tierBonus = staple.power_tier === 'cedh' ? 40
          : staple.power_tier === 'high' ? 25 : 10;
        score += tierBonus;
      }
    }

    snap('powerTier');
    // ── Free-text hint: "low/consistent curve" ──
    // Leans the top end of the curve down. cEDH staples and the picker's
    // actual finishers (win_condition role) are exempt — they need to be
    // expensive to do their job (Craterhoof, Approach of the Second Sun).
    if (hints.lowCurve && !(card.type_line || '').split('//')[0].includes('Land')) {
      const exempt = cedhStapleMap.has(card.name)
        || classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc || 0, undefined, classifyOpts).includes('win_condition');
      if (!exempt) {
        if (card.cmc >= 6) score -= 60;
        else if (card.cmc >= 5) score -= 30;
      }
    }

    snap('lowCurve');
    // ── Meta card stats scoring (from 506K+ scraped decks) ──
    // Inclusion rates are global — adjust for color identity to properly weight
    // color-specific staples (e.g., Ponder at 5.8% global ≈ 20% in blue decks)
    //
    // Staple saturation guard (Pitfall 4): if a card has high commander-specific
    // inclusion (cmdrStats), it's already rewarded above — cap the meta bonus
    // to prevent Sol Ring/Arcane Signet from crowding out commander synergy cards.
    const metaStats = metaStatsMap.get(card.name);
    if (metaStats) {
      const colorAdjustedRate = metaStats.inclusionRate / colorShareEstimate;
      // Reduce meta bonus for cards already scoring from per-commander data
      // to prevent double-dipping (commander staples already get +70 above)
      const metaDampener = cmdrStats ? 0.5 : 1.0;
      let metaBonus = 0;
      if (colorAdjustedRate >= 0.6 || metaStats.inclusionRate >= 0.6) {
        metaBonus = 80;
      } else if (colorAdjustedRate >= 0.4 || metaStats.inclusionRate >= 0.4) {
        metaBonus = 60;
      } else if (colorAdjustedRate >= 0.25 || metaStats.inclusionRate >= 0.25) {
        metaBonus = 40;
      } else if (colorAdjustedRate >= 0.15 || metaStats.inclusionRate >= 0.15) {
        metaBonus = 25;
      } else if (colorAdjustedRate >= 0.08 || metaStats.inclusionRate >= 0.1) {
        metaBonus = 12;
      }
      score += Math.round(metaBonus * metaDampener);
      // Archetype core rate (appears in >50% of ONE archetype)
      if (metaStats.coreRate > 0.5) {
        score += 15;
      }
      // Placement weighted score (0-15 scaled)
      score += Math.min(15, Math.round(metaStats.placementScore * 15));
      // High archetype win rate
      if (metaStats.winRate > 0.55) {
        score += 10;
      }
    }

    snap('metaStats');
    // ── Collection bonus (soft — quality dominates) ──
    // Old behaviour was +30/-40 which meant a mediocre owned card (Sokka's
    // Haiku) would outscore an unowned staple by 70 points. That is the
    // single biggest reason the auto-builder produced filler-heavy decks.
    // New behaviour: small nudge for ownership, no penalty for missing.
    // Collection enforcement still happens at pick-time via getMaxQty().
    if (useCollection && powerLevel !== 'cedh') {
      const owned = ownedQty.get(card.name) || 0;
      if (owned > 0) {
        score += 8;
      }
    }

    snap('collection');
    // ── Quality floor penalty ──
    // If a card has NO signal data at all (no commander stat, no meta stat,
    // no EDHREC rank, no CF, no ML) and isn't on any curated payoff list,
    // it's almost certainly filler. Penalize hard so staples win.
    const hasCmdrData = commanderStatsMap.has(card.name);
    const hasMetaData = metaStatsMap.has(card.name);
    const hasEdhrecData = edhrecSynergyMap.has(card.name);
    const hasCfData = cfScoreMap.has(card.name);
    const hasMlData = mlScoreMap.has(card.name);
    const edhrecRank = card.edhrec_rank ?? 999999;
    const hasAnySignal = hasCmdrData || hasMetaData || hasEdhrecData || hasCfData || hasMlData;
    // A superfriends build's deck-wide loyalty engine IS the curated payoff
    // list — a new set's Ways (edhrec_rank ~20,000, no stats yet) are the
    // plan, not filler (U12 fix 1; opt-in path only).
    // A rank beyond 18,000 is "unknown" (a new set has no popularity yet),
    // not "bad": an owned card in a collection build is never filler by
    // that measure (A-D10 — Tam's FRA walkers/Ways scored -35 each). The
    // card DB carries no set release date, so the < 90-day exemption for
    // no-collection builds cannot be applied here.
    const ownedInBuild = useCollection && (ownedQty.get(card.name) || 0) > 0;
    if (!hasAnySignal && edhrecRank > 18000 && !ownedInBuild && !(isSuperfriends && isWalkerEngineCard(card))) {
      score -= 35;
    }

    snap('qualityFloor');
    if (options.captureComponents) componentsByName.set(card.name, comp);

    // Learned calibration: reweight the additive components with multipliers
    // fitted against the scraped-deck corpus. Identity when no weights file.
    const learned = getScoringWeights();
    if (learned) {
      let reweighted = 0;
      for (const [k, v] of Object.entries(comp)) reweighted += (learned[k] ?? 1) * v;
      score = reweighted;
    }

    // A positive tribal / commander-profile component admits the card to
    // Pass B regardless of its total (A-D1: the plan's pieces are never filler).
    const synergy = (comp.tribal || 0) > 0 || (comp.profileSynergy || 0) > 0;
    return { card, score, synergy };
  });

  scored.sort((a, b) => b.score - a.score);

  // ── Strict JS color identity post-filter ─────────────────────────────────
  // The SQL filter uses c.color_identity NOT LIKE '%X%' which can miss
  // edge cases (JSON parsing, MDFCs with off-color spell sides). Apply a
  // bulletproof JS check: parse each card's color_identity as JSON and
  // require every color to be present in the deck's allowed colors.
  const allowedColors = new Set(colors);
  // A-D6: the pool never holds both "X" and its Arena "A-X" — every later
  // candidate list (walker/tribal/synergy backfills) is filtered from it up
  // front, so a pair here became two picks. Score order keeps the better one.
  const seenPoolKeys = new Set<string>();
  const colorFilteredScored = scored.filter(({ card }) => {
    const key = stripArenaPrefix(card.name);
    if (seenPoolKeys.has(key)) return false;
    seenPoolKeys.add(key);
    if (!card.color_identity) return true;
    try {
      const ci: string[] = JSON.parse(card.color_identity);
      for (const c of ci) {
        if (!allowedColors.has(c)) return false;
      }
      return true;
    } catch {
      return true;
    }
  });

  return {
    pool: colorFilteredScored,
    hints,
    boostedCards,
    priceCapExcluded,
    componentsByName: options.captureComponents ? componentsByName : undefined,
    themes,
    resolvedStrategy,
    tribalType,
    tribalNames,
    commanderProfile,
    commanderCard,
    format,
    landTarget: targetLands,
    nonLandTarget,
    isCommander,
    maxCopies,
    colors,
    ownedQty,
    useCollection,
    colorExcludeFilter,
    legalityFilter,
    commanderExclude,
    collectionJoin,
    collectionOrder,
    metaStatsMap,
    commanderStatsMap,
  };
}

/**
 * Land-count adjustment for the "consistent manabase" build hint.
 *
 * `hintTemplate` must already be gated to commander-family formats by the
 * caller (null for 60-card formats) — this function only decides HOW MUCH
 * to raise lands, not WHETHER the archetype band applies. Round 3 refuter
 * CRITICAL-1/HIGH-1: the archetype land bands are Commander-scale (33-40 out
 * of 99/100 cards); applying them to a 60-card format, or letting a band
 * whose max sits below the format's flat base LOWER the land count, both
 * shipped as bugs. This function can only raise lands, never lower them.
 */
export function resolveConsistentManaLandTarget(
  baseLandTarget: number,
  consistentMana: boolean,
  hintTemplate: ArchetypeTemplate | null,
): number {
  if (hintTemplate) return Math.max(baseLandTarget, hintTemplate.lands[1]);
  if (consistentMana) return Math.min(26, baseLandTarget + 1);
  return baseLandTarget;
}

const SUPERFRIENDS_DRAW_CAP_RE = /draw (?:a|two|three|four|x|that many|cards|\d) cards?|draws? (?:a|two|three|\d|x) cards?|whenever you draw/i;

// A cycling land's reminder text ("{2}, {T}, Discard this card: Draw a card")
// matched the draw-cap regex, so the superfriends draw cap was cutting lands
// out of their nonbasic quota (Tam's Landscapes). Lands are never draw spells.
// U11 fix 2, second half: a "Way of the ___" (walker support enchantment)
// empowers a Jace token whose printed abilities — including "[−3]: Draw a
// card." — are reminder text in parens describing what the TOKEN does, not
// a draw ability the Way itself grants. Without stripping reminder text
// first, the draw cap counted every Way as a draw card and cut Step 4b's
// walker-support backfill right back out to make room under the band.
export function isSuperfriendsDrawCard(card: Pick<DbCard, 'type_line' | 'oracle_text'>): boolean {
  if (/\bPlaneswalker\b/.test(card.type_line || '')) return false;
  if (/\bLand\b/.test(card.type_line || '')) return false;
  const text = (card.oracle_text || '').replace(/\([^)]*\)/g, '');
  return SUPERFRIENDS_DRAW_CAP_RE.test(text);
}

// A non-walker card whose text refers to planeswalkers, loyalty abilities or
// loyalty counters — "search your library for a planeswalker" is legacy
// shorthand kept for tutors. Deliberately narrower than
// SYNERGY_REQUIREMENTS_MAP.planeswalker (which also matches bare
// 'proliferate'): a +1/+1-counter card like Evolution Sage or Thrummingbird
// proliferates but says nothing about planeswalkers, and matching on
// 'proliferate' alone let generic counters cards satisfy Tam's walker-support
// minimum before any Way of the ___ (whose own reminder text for the Jace
// token — "Put five loyalty counters..." — is the only thing that matches
// the broader list) was ever considered (U11 fix 2). A planeswalker
// permanent itself is never its own support — it already counts toward the
// walker floor above.
const WALKER_SUPPORT_PATTERNS = [
  'loyalty counter', 'loyalty abilit', 'planeswalkers you control',
  'search your library for a planeswalker',
];

export function isWalkerSupportCard(card: Pick<DbCard, 'type_line' | 'oracle_text'>): boolean {
  if (/\bPlaneswalker\b/.test(card.type_line || '')) return false;
  const text = (card.oracle_text || '').toLowerCase();
  return WALKER_SUPPORT_PATTERNS.some((p) => text.includes(p));
}

// A deck-wide, repeatable loyalty engine — the subset of walker support a
// superfriends build is actually built around (U12 fix 1). One pattern per
// reason, tested on reminder-stripped text (a Way's Jace-token reminder
// must not qualify on its own). Repeatable means a permanent: an instant
// (Repeated Reverberation) or a Saga chapter (Urza Assembles the Titans)
// fires once. A granted ability must be activatable off a fresh walker
// (cost ≤ 5): "[−8]"/"[−10]" grants (Kiora of Salt and Sand, Avatar of
// Burgeoning Echoes) are ultimates. A single-subtype trigger ("...of a
// Chandra planeswalker") is not deck-wide; a one-shot loyalty add (Elspeth
// Conquers Death) is support, not an engine — those stay in
// isWalkerSupportCard only.
const WALKER_ENGINE_PATTERNS: RegExp[] = [
  /planeswalkers you control have "\[(?:\+\d+|0|[−-][1-5])\]/,   // grants a usable ability to every walker (Ways, Ichormoon Gauntlet)
  /loyalty counter on each planeswalker/,                        // loyalty for the whole team per trigger (Mentor, Brokers Ascendancy)
  /whenever you activate a loyalty ability(?! of an? \w+ planeswalker)/, // pays off every activation (Paradox, Mind Sculptor)
  /whenever you put one or more loyalty counters/,               // pays off every loyalty gain (Inspired Tethermage)
  /loyalty abilit(?:y|ies)[^.]*(?:twice|additional time)/,       // extra activations (Oath of Teferi)
  /for each planeswalker you control/,                           // per-walker activation/scaling (The Chain Veil)
];

export function isWalkerEngineCard(card: Pick<DbCard, 'type_line' | 'oracle_text'>): boolean {
  if (/\bPlaneswalker\b|\bInstant\b|\bSorcery\b|\bSaga\b/.test(card.type_line || '')) return false;
  const text = (card.oracle_text || '').replace(/\([^)]*\)/g, '').toLowerCase();
  return WALKER_ENGINE_PATTERNS.some((re) => re.test(text));
}

// Two engines per three walkers: the operator's Tam list runs 20 walkers
// with 10 Ways plus Oath of Teferi / The Chain Veil on its order list. The
// floor is scaled off the walker floor (already sized to the commander's
// payoff and the deck's nonland count) and capped by what the pool holds.
export const WALKER_ENGINE_RATIO = 2 / 3;

export function walkerEngineFloor(walkerFloor: number): number {
  return Math.round(walkerFloor * WALKER_ENGINE_RATIO);
}

export interface Step4bDisplaceableCtx {
  /** Synergy category currently being backfilled (e.g. 'planeswalker'). */
  category: string;
  /** Lowercased card names from the template's protectedPatterns. */
  protectedNames: Set<string>;
  /** Tribal payoff creatures (exact-case names) that never get displaced. */
  tribalNames: Set<string>;
  commanderOracleText?: string;
  classifyOpts?: ClassifyOpts;
  /** Current main-board ramp (primary category) quantity. */
  rampCount: number;
  /** Template's ramp.totalMin — ramp stops being displaceable at/below this. */
  rampFloor: number;
  /** Superfriends builds manage planeswalker permanents via a dedicated
   *  floor (above Step 4b) — they're never fair game for ANY synergy
   *  category's backfill, not just the 'planeswalker' category's own. */
  isSuperfriends?: boolean;
}

// Step 4b (synergy-minimum backfill) never displaces removal/wipes, and only
// displaces ramp while the deck stays at or above its template ramp floor —
// a21f2ff protected ramp unconditionally, which starved superfriends decks
// of ramp-adjacent slots but also silently dropped needed synergy cards
// wherever ramp was the only displaceable pick left. Mirrors the tribal
// minimum backfill's rampCount/rampFloor shape (~line 2070 below).
export function isStep4bDisplaceable(
  p: { card: DbCard; quantity: number; board: 'main' | 'sideboard' },
  ctx: Step4bDisplaceableCtx
): boolean {
  if (p.board !== 'main') return false;
  if (ctx.protectedNames.has(p.card.name.toLowerCase()) || ctx.tribalNames.has(p.card.name)) return false;

  // A superfriends build's walker permanents are governed by their own
  // dedicated floor (run before Step 4b) — protected from EVERY category's
  // backfill, not just 'planeswalker's, and checked BEFORE the ramp-floor
  // branch below: Quintorius Kand's ultimate ("Add {R} for each card exiled")
  // classifies as primary 'ramp', so checking this after that branch let its
  // early `return` skip the walker guard entirely (24 -> 17 walkers on a real
  // Tam build — the ramp-floor return fired first and never reached here).
  // Outside superfriends the pre-U11 guard still holds: the 'planeswalker'
  // category's own backfill never cuts a planeswalker (U12 fix 3).
  if ((ctx.isSuperfriends || ctx.category === 'planeswalker') && /\bPlaneswalker\b/.test(p.card.type_line || '')) return false;
  // Same rule for the engine floor's picks (U12 fix 1): they are the
  // lowest-scored cards in the deck (no popularity data) and would be the
  // first thing every later category's backfill cut.
  if (ctx.isSuperfriends && isWalkerEngineCard(p.card)) return false;

  const primary = getPrimaryCategory(classifyCard(
    p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0,
    ctx.commanderOracleText, ctx.classifyOpts
  ));
  if (primary === 'removal' || primary === 'board_wipe') return false;
  if (primary === 'ramp') return ctx.rampCount - p.quantity >= ctx.rampFloor;

  // Pre-existing text heuristic (unrelated to a21f2ff): a mana rock/land
  // tutor that classifyCard didn't already tag 'ramp' is still never
  // displaceable — this predates the floor and stays untouched.
  const text = (p.card.oracle_text || '').toLowerCase();
  const type = (p.card.type_line || '').toLowerCase();
  const isRampText = (type.includes('artifact') && text.includes('add') && text.includes('mana'))
    || (text.includes('search your library for a') && text.includes('land'));
  if (isRampText) return false;

  return true;
}

export async function autoBuildDeck(options: BuildOptions): Promise<BuildResult> {
  const db = getDb();
  const poolResult = await buildScoredCandidatePool(options);
  const {
    pool: scored, hints, boostedCards, themes, resolvedStrategy, tribalType, tribalNames,
    commanderProfile, commanderCard, landTarget: baseLandTarget, nonLandTarget: baseNonLandTarget,
    isCommander, maxCopies, colors, ownedQty, useCollection,
    colorExcludeFilter, legalityFilter, commanderExclude: _commanderExclude,
    collectionJoin, collectionOrder, metaStatsMap, commanderStatsMap,
  } = poolResult;
  // See buildScoredCandidatePool — same opt-in, recomputed in this function's
  // own scope since poolResult only carries the string, not the flag.
  const isSuperfriends = resolvedStrategy === 'superfriends';
  const classifyOpts = isSuperfriends ? { superfriends: true } : undefined;

  // Free-text hint: "consistent manabase" biases toward the generous end of
  // the archetype's land band (and shrinks the nonland budget to match, so
  // the deck still totals the right size) plus the ramp rock/dork ceiling
  // below, instead of the computed default/midpoint.
  //
  // The archetype land bands are Commander-scale (33-40 out of 99/100 cards)
  // — they must never be applied to a 60-card format (Standard aggro's flat
  // 24-land base would otherwise jump to a Commander band's 35+, or get cut
  // if the band's max is below the format's own base). Commander-family
  // formats (commander/brawl/standardbrawl/competitivebrawl) use the band,
  // and only ever move lands UP from the flat base. 60-card formats get a
  // flat +1, capped at 26 since no format-specific max band exists.
  const hintTemplate = hints.consistentMana && isCommander
    ? getTemplate((resolvedStrategy as Archetype) || 'midrange')
    : null;
  const targetLands = resolveConsistentManaLandTarget(baseLandTarget, hints.consistentMana, hintTemplate);
  const nonLandTarget = baseNonLandTarget - (targetLands - baseLandTarget);

  // ── Step 4: Role-based picking (constraint-driven) ──────────────────────
  // Old approach: fill by curve bucket, then by score. This produced decks
  // with 10 filler creatures at 3 CMC and no ramp/draw/removal.
  //
  // New approach:
  //   (a) Build a commander arsenal: deep oracle analysis + community top
  //       cards + curated staples, strictly color-filtered. This is the
  //       "what a human deck builder would reach for" list.
  //   (b) Pre-fill the arsenal's high-priority owned cards into the picks.
  //   (c) Run pickByRole() on the remaining pool to hit hard role quotas
  //       (ramp / draw / removal / wipes / protection / payoffs / wincons).
  //   (d) Pass B of pickByRole fills any remaining slots by score.

  const picked: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }> = [];
  // A-D6: keyed on the A--stripped name, so "X" and "A-X" can never both be picked.
  const pickedNames = new CardNameSet();
  let totalPicked = 0;
  const reasoning: Array<{ cardName: string; role: string; reason: string }> = [];

  function getMaxQty(card: DbCard): number {
    const formatMax = formatMaxCopies(card.oracle_text, isCommander, maxCopies);
    if (!useCollection) return formatMax;
    const owned = ownedQty.get(card.name) || 0;
    // Block unowned cards entirely when building from collection. An
    // any-number card ships at its owned quantity (A-D5: Slime x4).
    if (owned <= 0) return 0;
    return ANY_NUMBER_RE.test(card.oracle_text || '') ? owned : Math.min(formatMax, owned);
  }

  // ── Pool quality floor (A-D1) ──────────────────────────────────────────
  // The pool's own bar: 60 % of the score of the card that would be the LAST
  // pick if the nonland slots were filled purely by score (pickable, nonland).
  // Every arsenal pre-fill, collection substitute and role-quota pick must
  // clear it, so a 13-point name-list card can't be seated while a 130-point
  // owned staple sits on the bench. Score-ordered `scored` is what makes the
  // anchor the nonLandTarget-th entry.
  const poolByName = new Map<string, (typeof scored)[number]>();
  for (const s of scored) poolByName.set(s.card.name, s);
  const pickableScores = scored
    .filter((s) => !(s.card.type_line || '').split('//')[0].includes('Land') && getMaxQty(s.card) > 0)
    .map((s) => s.score);
  const floorAnchor = pickableScores[Math.min(nonLandTarget, pickableScores.length) - 1];
  const qualityFloor = floorAnchor === undefined ? -Infinity : floorAnchor > 0 ? floorAnchor * QUALITY_FLOOR_RATIO : floorAnchor;

  // ── (a) Build commander arsenal ────────────────────────────────────────
  let arsenal: ArsenalCard[] = [];
  const analyzeOpts = {
    strategy: resolvedStrategy,
    scoreOf: (name: string) => poolByName.get(name)?.score ?? -Infinity,
    scoreFloor: qualityFloor,
  };
  if (isCommander && options.commanderName && options.userId !== undefined) {
    try {
      const analysis = analyzeCommanderForBuild(
        options.commanderName,
        options.userId,
        options.format,
        150,
        options.collectionSource,
        analyzeOpts,
      );
      if (analysis) {
        arsenal = analysis.arsenal;
      }
      // Partner pair: merge the partner's arsenal so both halves of the
      // pairing contribute curated payoffs.
      if (options.partnerName) {
        const partnerAnalysis = analyzeCommanderForBuild(
          options.partnerName,
          options.userId,
          options.format,
          150,
          options.collectionSource,
          analyzeOpts,
        );
        if (partnerAnalysis) {
          const seen = new Set(arsenal.map((a) => a.card.name));
          for (const a of partnerAnalysis.arsenal) {
            if (!seen.has(a.card.name)) {
              seen.add(a.card.name);
              arsenal.push(a);
            }
          }
          arsenal.sort((a, b) => b.priority - a.priority);
        }
      }
    } catch {
      // analysis failure is non-fatal — fall through to pool-only picking
    }
  }

  // ── (b) Pre-fill from arsenal (highest-priority items first) ──────────
  // Only pick items that are in the scored pool (ensures legality, color,
  // and that the card exists with proper DB metadata).

  // Role quotas are computed BEFORE the pre-fill so its caps exist while the
  // arsenal runs (review 2026-08-23 C1: uncapped pre-fill shipped ramp 22-29
  // vs quota 9 and starved draw/removal — caps could only refuse, not retract).
  const baseQuotas = getRoleQuotas(
    (resolvedStrategy as Archetype) || 'midrange',
    nonLandTarget,
    commanderProfile,
    options.powerLevel,
  );
  // "Consistent manabase" also means enough rocks/dorks to hit those land
  // drops — raise the ramp quota to the template's ramp-band ceiling
  // (totalMax; rocks[1]+dorks[1] alone is at or below the computed midpoint
  // for most archetypes — surveyed across all 12 templates — so it would be
  // a near no-op instead of a real bump).
  const quotas = hintTemplate
    ? { ...baseQuotas, ramp: Math.max(baseQuotas.ramp, hintTemplate.ramp.totalMax) }
    : baseQuotas;
  const roleCaps = roleCapsFor(quotas);
  const preFillRoleFills: Record<string, number> = {};
  const cappedRolesFor = (card: DbCard): string[] =>
    classifyCard(
      card.name,
      card.oracle_text || '',
      card.type_line || '',
      card.cmc || 0,
      commanderCard?.oracle_text || undefined,
      classifyOpts,
    ).filter((cat) => roleCaps[cat] !== undefined);

  // Arsenal budget: bounded by both the old 75% share and the total quota
  // mass — the pre-fill exists to seed proven cards, not to fill the deck.
  const quotaSum = Object.values(quotas).reduce((s, v) => s + (v || 0), 0);
  const arsenalSlotBudget = Math.min(Math.floor(nonLandTarget * 0.75), quotaSum);
  let arsenalUsed = 0;

  // Seat the strongest first (A-D1): the arsenal is priority-ordered, and with
  // role caps a 105-point Lightning Bolt at the same priority tier took the
  // last removal slot ahead of a 209-point Terminate. The priority still
  // decides which cards are in the arsenal at all; the pool score decides who
  // gets a capped slot.
  const arsenalByScore = [...arsenal].sort((a, b) =>
    (poolByName.get(b.card.name)?.score ?? -Infinity) - (poolByName.get(a.card.name)?.score ?? -Infinity)
    || b.priority - a.priority);
  for (const a of arsenalByScore) {
    if (arsenalUsed >= arsenalSlotBudget) break;
    if (pickedNames.has(a.card.name)) continue;
    // Only pre-fill priority >= 55 (staples and above)
    if (a.priority < 55) continue;
    // Must exist in the scored pool (legal, in-color, properly loaded)
    const poolEntry = poolByName.get(a.card.name);
    if (!poolEntry) continue;
    // A name-list entry is seated only above the pool's quality floor (A-D1;
    // replaces the C3 bottom-decile check, which let 13-80-point substitutes
    // in while 100-170-point owned staples stayed benched). Below it the card
    // still competes on score in Pass B like everything else.
    if (poolEntry.score < qualityFloor) continue;
    // Lands are picked by the land pipeline — charging them to the nonland
    // budget burned 13-18 spell slots per build (C1 aggravator).
    if ((a.card.type_line || '').includes('Land')) continue;
    // Cap gate: skip when EVERY role this card fills is already at cap.
    // Roleless cards (payoffs, synergy pieces) always pass — caps stop role
    // flooding, not commander-specific tech.
    const cardRoles = cappedRolesFor(a.card);
    if (cardRoles.length > 0 && cardRoles.every((r) => (preFillRoleFills[r] ?? 0) >= roleCaps[r])) continue;
    const cardMax = getMaxQty(a.card);
    if (cardMax <= 0) continue;
    const qty = Math.min(cardMax, nonLandTarget - totalPicked);
    if (qty <= 0) continue;
    picked.push({ card: a.card, quantity: qty, board: 'main' });
    pickedNames.add(a.card.name);
    reasoning.push({
      cardName: a.card.name,
      role: `arsenal:${a.reason}`,
      reason: a.detail,
    });
    totalPicked += qty;
    arsenalUsed += qty;
    for (const r of cardRoles) preFillRoleFills[r] = (preFillRoleFills[r] ?? 0) + qty;
  }

  // ── (b2) Guarantee a cheap fixing-rock floor for 3+ color decks ────────
  // Rainbow decks need cheap dual/any-color rocks (talisman cycle, signets) to
  // cast their gold spells on curve. These rarely win a ramp slot on raw score,
  // so force-include the best-scored available before the role picker runs.
  // Remembered so the same-role upgrade pass (Step 4c) never trades them
  // for a higher-scored treasure-maker — they were seated for fixing, not score.
  const fixingFloorNames = new Set<string>();
  // Repeatable DUAL/rainbow rocks only (talisman + signet cycles, plus the
  // classic 2-mana fixers). Excludes one-shot fast mana (Moxen, Lotus Petal)
  // and treasure-makers so the floor reproduces the talisman/signet backbone.
  const FIXING_ROCK_ALLOW = /^(arcane signet|chromatic lantern|fellwar stone|coalition relic|prismatic lens|mind stone|fractured powerstone|cryptic spires)$/i;
  const isFixingRock = (c: DbCard): boolean => {
    const name = (c.name || '').toLowerCase();
    const tl = (c.type_line || '').toLowerCase();
    if (!tl.includes('artifact') || tl.includes('creature')) return false;
    if ((c.cmc || 0) > 2) return false;
    return /^talisman of /.test(name) || / signet$/.test(name) || FIXING_ROCK_ALLOW.test(name);
  };
  if (colors.length >= 3) {
    const fixingFloor = Math.min(8, colors.length * 2);
    let fixingAdded = 0;
    for (const s of scored) {
      if (fixingAdded >= fixingFloor || totalPicked >= nonLandTarget) break;
      // The floor shares the ramp counter with the arsenal pre-fill (C1):
      // it may top ramp UP to cap for fixing, never stack on top of it.
      if ((preFillRoleFills.ramp ?? 0) >= roleCaps.ramp) break;
      if (pickedNames.has(s.card.name)) continue;
      if (!isFixingRock(s.card)) continue;
      if (getMaxQty(s.card) <= 0) continue;
      picked.push({ card: s.card, quantity: 1, board: 'main' });
      pickedNames.add(s.card.name);
      reasoning.push({ cardName: s.card.name, role: 'fixing-floor', reason: 'cheap rainbow fixing for multicolor deck' });
      fixingFloorNames.add(s.card.name);
      totalPicked += 1;
      fixingAdded += 1;
      preFillRoleFills.ramp = (preFillRoleFills.ramp ?? 0) + 1;
    }
  }

  // ── (c) Role-based picker on remaining pool ────────────────────────────
  // (quotas were computed above, before the arsenal pre-fill — C1)
  const remainingPool = scored.filter(s => !pickedNames.has(s.card.name));
  const payoffNames = getPayoffNamesForProfile(commanderProfile);

  // Pass B allowlist: any card that appears in the commander arsenal OR
  // in the per-commander stats (commanderStatsMap) is considered a
  // legitimate archetype pick and can fill remaining slots even if
  // classifyCard() returns only 'utility'. Everything else without a
  // role is rejected as filler.
  const passBAllowed = new Set<string>();
  for (const a of arsenal) passBAllowed.add(a.card.name);
  for (const [name] of commanderStatsMap) passBAllowed.add(name);

  // Seed pickByRole with the cards we already placed so it does not
  // double-count role quotas (arsenal already contributed ramp/draw/etc.).
  const preFilled = picked.map(p => p.card);

  // A-D1: Pass B admits by score — at least the weakest pre-filled pick (or
  // the pool floor when nothing was pre-filled) — or by plan synergy.
  const preFilledScores = preFilled.map((c) => poolByName.get(c.name)?.score).filter((s): s is number => s !== undefined);
  const passBScoreFloor = preFilledScores.length > 0 ? Math.min(...preFilledScores) : qualityFloor;
  const synergyNames = new Set(scored.filter((s) => s.synergy).map((s) => s.card.name));

  const pickResult = pickByRole({
    pool: remainingPool,
    nonLandTarget,
    quotas,
    payoffNames,
    commanderOracle: commanderCard?.oracle_text || undefined,
    getMaxQty,
    isCommanderFormat: isCommander,
    preFilled,
    passBAllowed,
    superfriends: isSuperfriends,
    scoreFloor: qualityFloor,
    passBScoreFloor,
    synergyNames,
  });

  for (const p of pickResult.picks) {
    if (pickedNames.has(p.card.name)) continue;
    if (totalPicked >= nonLandTarget) break;
    const qty = Math.min(p.quantity, nonLandTarget - totalPicked);
    if (qty <= 0) continue;
    picked.push({ card: p.card, quantity: qty, board: 'main' });
    pickedNames.add(p.card.name);
    reasoning.push({ cardName: p.card.name, role: p.role, reason: p.reason });
    totalPicked += qty;
  }

  // ── Board wipe backfill ─────────────────────────────────────────────────
  // If pickByRole couldn't fill the board_wipe quota from the scored pool
  // (common in Voltron/aggro builds where wipes score low), inject them
  // directly from the DB so every deck ships with at least 2 board wipes.
  const wipeFilled = pickResult.roleFills.board_wipe || 0;
  const wipeNeed = Math.max(0, (quotas.board_wipe || 2) - wipeFilled);
  // The deck is normally FULL here (A-D1 fills every slot by score, and Pass A
  // no longer seats a sub-floor "wipe" just to meet the quota), so the
  // backfill makes its own room: the lowest-scored utility/synergy picks
  // step aside for real wipes (Krenko 3 -> 1 wipes otherwise).
  if (wipeNeed > 0) {
    const wipePool = db.prepare(`
      SELECT c.* FROM cards c
      ${collectionJoin}
      WHERE c.type_line NOT LIKE '%Land%'
      AND (c.oracle_text LIKE '%destroy all creatures%'
        OR c.oracle_text LIKE '%destroy all nonland%'
        OR c.oracle_text LIKE '%destroy all permanents%'
        OR c.oracle_text LIKE '%exile all creatures%'
        OR c.oracle_text LIKE '%exile all nonland%'
        OR c.oracle_text LIKE '%all creatures get -%'
        OR c.oracle_text LIKE '%deals % damage to each creature%')
      ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
      ${legalityFilter}
      ORDER BY ${collectionOrder} c.edhrec_rank ASC NULLS LAST
      LIMIT 20
    `).all() as DbCard[];

    // Picks that may make way, weakest first (pool score, then EDHREC rank).
    const removable = picked
      .filter(p => p.board === 'main' && !['commander'].includes(p.board))
      .filter(p => {
        const cats = classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0, undefined, classifyOpts);
        const primary = cats[0] || 'utility';
        return primary === 'utility' || primary === 'synergy';
      })
      .sort((a, b) =>
        (poolByName.get(a.card.name)?.score ?? -Infinity) - (poolByName.get(b.card.name)?.score ?? -Infinity)
        || (b.card.edhrec_rank || 99999) - (a.card.edhrec_rank || 99999));
    const room = Math.max(0, nonLandTarget - totalPicked) + removable.length;

    let wipesAdded = 0;
    for (const wipe of wipePool) {
      if (wipesAdded >= Math.min(wipeNeed, room)) break;
      if (pickedNames.has(wipe.name)) continue;
      // Validate against the same classifier the quota accountant uses (C2)
      // — the SQL LIKE clauses above are a broad net, not the source of truth.
      if (!isBoardWipe(wipe.name, wipe.oracle_text || '')) continue;
      const qty = getMaxQty(wipe);
      if (qty <= 0) continue;
      picked.push({ card: wipe, quantity: 1, board: 'main' });
      pickedNames.add(wipe.name);
      reasoning.push({ cardName: wipe.name, role: 'board_wipe', reason: `board wipe backfill: ${wipe.name}` });
      totalPicked += 1;
      wipesAdded += 1;
    }
    // Trim only the overshoot back to target (the weakest removable picks).
    for (const r of removable) {
      if (totalPicked <= nonLandTarget) break;
      const idx = picked.indexOf(r);
      if (idx !== -1) {
        picked.splice(idx, 1);
        pickedNames.delete(r.card.name);
        totalPicked -= r.quantity;
      }
    }
  }

  // ── Tribal minimum backfill ──────────────────────────────────────────────
  // A tribal commander should ship a solid tribe presence — 34 is the target
  // where the pool supports it (roughly a third of the nonland slots), but
  // ONLY when the commander's own text actually pays off the tribe by
  // counting/scaling with it (count, lord, "whenever you cast a <Type>").
  // "Makes N tokens of type X" alone (Jinnie Fay's Cats/Dogs, Darien's
  // Soldiers) is not a tribal payoff — forcing a floor there just displaces
  // real cards for token-type flavor matches. Candidates must also clear a
  // quality bar (no vanilla creatures — Ayula's thin Bear tribe otherwise
  // pulls in the entire vanilla-bear cycle), and removal/board wipes are
  // never displaceable, so the floor can't cannibalize the deck's answers.
  const commanderPaysOffTribe = (oracleText: string, tribe: string): boolean => {
    const text = oracleText.toLowerCase();
    return [
      `other ${tribe}`, `${tribe}s you control`, `${tribe} you control`,
      `whenever a ${tribe}`, `whenever another ${tribe}`, `each ${tribe}`,
      `all ${tribe}s`, `number of ${tribe}`,
      `whenever you cast a ${tribe}`, `whenever you cast another ${tribe}`,
    ].some((p) => text.includes(p));
  };
  const isVanillaCreature = (card: DbCard): boolean =>
    (card.oracle_text || '').replace(/\([^)]*\)/g, '').trim().length === 0;

  const TRIBAL_MIN_PERMANENTS = 34;
  if (tribalType && tribalNames.size > 0 && commanderPaysOffTribe(commanderCard?.oracle_text || '', tribalType)) {
    let tribalCount = 0;
    for (const p of picked) {
      if (p.board === 'main' && isTribeCreature(p.card, tribalType)) tribalCount += p.quantity;
    }
    const tribalDeficit = TRIBAL_MIN_PERMANENTS - tribalCount;
    if (tribalDeficit > 0) {
      // Tribal candidates already live in the scored pool (fetchTribalCards
      // feeds it) — reuse their scores rather than re-fetching from the DB.
      // Only actual tribe/changeling creatures count toward the floor, so
      // only they get pulled in here; non-creature tribal support (choosers,
      // payoff spells) still gets its normal scoring bonus in the main pick.
      const candidates = scored
        .filter((s) => tribalNames.has(s.card.name) && isTribeCreature(s.card, tribalType) && !pickedNames.has(s.card.name) && getMaxQty(s.card) > 0 && !isVanillaCreature(s.card))
        .sort((a, b) => b.score - a.score)
        .map((s) => s.card);
      // Ramp gets the same protection as removal/wipes once the deck is at
      // or below its template's ramp floor — otherwise the tribal floor cuts
      // into the deck's mana base to make room for tribe creatures (Edgar
      // lost 2 Signets + 2 Talismans, ramp 10 -> 7).
      const rampFloor = getTemplate(resolvedStrategy).ramp.totalMin;
      const isRampPick = (p: { card: DbCard }): boolean =>
        getPrimaryCategory(classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0, commanderCard?.oracle_text || undefined, classifyOpts)) === 'ramp';
      let rampCount = 0;
      for (const p of picked) {
        if (p.board === 'main' && isRampPick(p)) rampCount += p.quantity;
      }
      const displaceable = [...picked]
        .filter((p) => {
          if (p.board !== 'main' || tribalNames.has(p.card.name)) return false;
          const primary = getPrimaryCategory(classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0, commanderCard?.oracle_text || undefined, classifyOpts));
          if (primary === 'removal' || primary === 'board_wipe') return false;
          return true;
        })
        .sort((a, b) => {
          const aScore = scored.find((s) => s.card.name === a.card.name)?.score || 0;
          const bScore = scored.find((s) => s.card.name === b.card.name)?.score || 0;
          return aScore - bScore; // lowest score first
        });
      let filled = 0;
      for (const candidate of candidates) {
        if (filled >= tribalDeficit || displaceable.length === 0) break;
        const at = displaceable.findIndex((p) => !(isRampPick(p) && rampCount - p.quantity < rampFloor));
        if (at === -1) break;
        const [displaced] = displaceable.splice(at, 1);
        if (isRampPick(displaced)) rampCount -= displaced.quantity;
        const idx = picked.indexOf(displaced);
        if (idx !== -1) {
          picked.splice(idx, 1);
          pickedNames.delete(displaced.card.name);
          totalPicked -= displaced.quantity;
        }
        const qty = Math.min(getMaxQty(candidate), tribalDeficit - filled);
        if (qty > 0) {
          picked.push({ card: candidate, quantity: qty, board: 'main' });
          pickedNames.add(candidate.name);
          totalPicked += qty;
          filled += qty;
        }
      }
    }
  }
  // ── Superfriends walker minimum backfill ────────────────────────────────
  // Mirrors the tribal minimum backfill above. Step 4b below fills the
  // template's `synergyMinimums.planeswalker` count too, but that reads
  // SYNERGY_REQUIREMENTS_MAP.planeswalker (proliferate/loyalty-doubler TEXT)
  // — it never counts actual planeswalker permanents, whose ability costs
  // print as "+1:" / "-2:", not the literal words "loyalty ability". Without
  // this block a superfriends commander ships whatever walkers happened to
  // score well generically (Tam: 3), not a real walker count. 12 of 99/100
  // scales down for smaller commander-format shells (e.g. standardbrawl's
  // 60-card, ~35-nonland deck).
  // Floor scales with how hard the commander's own text pays off walkers.
  // "planeswalker types among planeswalkers you control" / "planeswalker
  // spells you cast cost" / "for each planeswalker you control" / "whenever
  // you activate a loyalty ability" are commander-level payoffs (Tam) — a
  // deck built around that wants more walkers than one detected only by
  // proliferate mentions or the 99-shape supplement (walkerCount >= 12 in
  // the pool, or a Planeswalker-typed commander with no textual payoff,
  // e.g. Atraxa reached via the shape supplement, not her own text).
  const STRONG_WALKER_PAYOFF_TEXTS = [
    'planeswalker types among planeswalkers you control',
    'planeswalker spells you cast cost',
    'for each planeswalker you control',
    'whenever you activate a loyalty ability',
  ];
  const hasStrongWalkerPayoff = STRONG_WALKER_PAYOFF_TEXTS.some((p) =>
    (commanderCard?.oracle_text || '').toLowerCase().includes(p)
  );
  const WALKER_FLOOR_BASE = hasStrongWalkerPayoff ? 18 : 12;
  const WALKER_FLOOR_REFERENCE_NONLAND = 61; // 99/100-card commander baseline
  if (isSuperfriends) {
    const isWalker = (card: DbCard) => /\bPlaneswalker\b/.test(card.type_line || '');
    const walkerTypeOf = (card: DbCard): string => {
      const m = (card.type_line || '').match(/Planeswalker\s*—\s*(.+?)(?:\s*\/\/|$)/);
      return m ? m[1].trim() : '';
    };
    const walkerFloor = Math.max(1, Math.round(WALKER_FLOOR_BASE * nonLandTarget / WALKER_FLOOR_REFERENCE_NONLAND));
    let walkerCount = 0;
    for (const p of picked) {
      if (p.board === 'main' && isWalker(p.card)) walkerCount += p.quantity;
    }
    const walkerDeficit = walkerFloor - walkerCount;
    const isSupport = isWalkerSupportCard;
    const primaryOf = (p: { card: DbCard }) => getPrimaryCategory(classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0, commanderCard?.oracle_text || undefined, classifyOpts));
    const scoreOfPick = (p: { card: DbCard }) => scored.find((s) => s.card.name === p.card.name)?.score || 0;
    // Displaces the lowest-scored picks that are neither walkers, walker
    // support, removal nor wipes; ramp only while the deck stays above
    // `rampFloor` (Step 4b's rule, U11 fix 1). The walker fill passes
    // Infinity (its pre-existing unconditional ramp guard); the engine fill
    // passes the template floor — the arsenal pre-fill ships 16+ staple ramp
    // and only a later backfill ever trimmed it back into the 10-14 band.
    const backfill = (candidates: DbCard[], deficit: number, rampFloor: number, onAdd?: (card: DbCard) => void) => {
      let rampCount = 0;
      for (const p of picked) {
        if (p.board === 'main' && primaryOf(p) === 'ramp') rampCount += p.quantity;
      }
      const displaceable = [...picked]
        .filter((p) => {
          if (p.board !== 'main' || isWalker(p.card) || isSupport(p.card)) return false;
          const primary = primaryOf(p);
          return primary !== 'removal' && primary !== 'board_wipe';
        })
        .sort((a, b) => scoreOfPick(a) - scoreOfPick(b));
      let filled = 0;
      for (const candidate of candidates) {
        if (filled >= deficit) break;
        const at = displaceable.findIndex((p) => primaryOf(p) !== 'ramp' || rampCount - p.quantity >= rampFloor);
        if (at === -1) break;
        const [displaced] = displaceable.splice(at, 1);
        if (primaryOf(displaced) === 'ramp') rampCount -= displaced.quantity;
        const idx = picked.indexOf(displaced);
        if (idx !== -1) {
          picked.splice(idx, 1);
          pickedNames.delete(displaced.card.name);
          totalPicked -= displaced.quantity;
        }
        const qty = Math.min(getMaxQty(candidate), deficit - filled);
        if (qty > 0) {
          picked.push({ card: candidate, quantity: qty, board: 'main' });
          pickedNames.add(candidate.name);
          totalPicked += qty;
          filled += qty;
          onAdd?.(candidate);
        }
      }
    };
    if (walkerDeficit > 0) {
      const pickedWalkerTypes = new Set(
        picked.filter((p) => p.board === 'main' && isWalker(p.card)).map((p) => walkerTypeOf(p.card))
      );
      // Prefer walkers with a planeswalker type not already in the deck as a
      // tie-break (Tam's X counts distinct planeswalker types).
      const candidates = scored
        .filter((s) => isWalker(s.card) && !pickedNames.has(s.card.name) && getMaxQty(s.card) > 0)
        .sort((a, b) => {
          const aNew = pickedWalkerTypes.has(walkerTypeOf(a.card)) ? 0 : 1;
          const bNew = pickedWalkerTypes.has(walkerTypeOf(b.card)) ? 0 : 1;
          if (aNew !== bNew) return bNew - aNew;
          return b.score - a.score;
        })
        .map((s) => s.card);
      backfill(candidates, walkerDeficit, Infinity, (card) => pickedWalkerTypes.add(walkerTypeOf(card)));
    }

    // ── Engine floor (U12 fix 1) ──
    // The deck-wide loyalty engines a superfriends build is built around
    // (Ways of ___, Oath of Teferi, The Chain Veil) carry no popularity
    // signal in a new set, so the score-ranked passes above never reach
    // them: Tam's no-collection build shipped 0 of 10 Ways while the walker-
    // support minimum was met by cards that merely mention planeswalkers
    // (Mox Amber, pillow-fort). Filled by score among engines only, capped by
    // what the pool holds; picks are protected from Step 4b (see
    // isStep4bDisplaceable) and count toward the support minimum.
    let engineCount = 0;
    for (const p of picked) {
      if (p.board === 'main' && isWalkerEngineCard(p.card)) engineCount += p.quantity;
    }
    const engineDeficit = walkerEngineFloor(walkerFloor) - engineCount;
    if (engineDeficit > 0) {
      const candidates = scored
        .filter((s) => isWalkerEngineCard(s.card) && !pickedNames.has(s.card.name) && getMaxQty(s.card) > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.card);
      backfill(candidates, engineDeficit, getTemplate(resolvedStrategy).ramp.totalMin);
    }
  }


  const buildReport = buildReasoningSummary(
    (resolvedStrategy as Archetype) || 'midrange',
    quotas,
    pickResult,
    nonLandTarget,
  );

  // ── Step 4b: Fill commander synergy minimums ────────────────────────────
  // After main card picking, check if each synergy category meets its minimum.
  // If not, swap in synergy cards for the lowest-scored current picks — but
  // never displace ramp/draw/removal below their baseline.
  if (commanderProfile && Object.keys(commanderProfile.synergyMinimums).length > 0) {
    const template = getTemplate(resolvedStrategy);
    const merged = mergeWithCommanderProfile(template, commanderProfile);

    for (const [category, minCount] of Object.entries(merged.synergyMinimums)) {
      const catPatterns = SYNERGY_REQUIREMENTS_MAP[category as keyof typeof SYNERGY_REQUIREMENTS_MAP];
      if (!catPatterns) continue;

      // 'planeswalker' uses the narrower walker-support matcher (U11 fix 2)
      // — SYNERGY_REQUIREMENTS_MAP.planeswalker's bare 'proliferate' pattern
      // matches any +1/+1-counter card and walker permanents' own loyalty
      // text, so the generic matcher closed this deficit with cards like
      // Evolution Sage and the walkers already counted by the floor above,
      // never leaving room to backfill actual walker support (Ways of ___).
      const matchesCat = (card: DbCard): boolean =>
        category === 'planeswalker'
          ? isWalkerSupportCard(card)
          : catPatterns.some((pat) => (card.oracle_text || '').toLowerCase().includes(pat.toLowerCase()));

      // Count how many picked cards satisfy this category
      let currentCount = 0;
      for (const p of picked) {
        const cardType = (p.card.type_line || '').toLowerCase();
        // For spell_cast, also count instants/sorceries by type
        const isSpellType = category === 'spell_cast' && (cardType.includes('instant') || cardType.includes('sorcery'));
        if (matchesCat(p.card) || isSpellType) {
          currentCount += p.quantity;
        }
      }

      const deficit = minCount - currentCount;
      if (deficit <= 0) continue;

      // Find synergy cards from the pool that weren't picked.
      // MDFC spell//land cards are capped deck-wide: they live in the
      // NONLAND pool, so without a budget the spell_cast minimum swaps in
      // 10+ Instant//Land cards and the deck ends up with ~50 land slots.
      const mdfcLandBacksPicked = picked.filter(
        (p) => isLandBackDfc(p.card)
      ).length;
      const synergyCandidates = scored.filter(({ card }) => {
        if (pickedNames.has(card.name)) return false;
        // The pool holds unowned cards in collection mode (craft list); an
        // unpickable candidate would still displace a pick below.
        if (getMaxQty(card) <= 0) return false;
        // Plain lands never belong in spell slots; modal land-backs are budgeted.
        if ((card.type_line || '').split('//')[0].includes('Land')) return false;
        if (isLandBackDfc(card) && mdfcLandBacksPicked >= MAX_MDFC_IN_SPELLS) return false;
        const cardType = (card.type_line || '').toLowerCase();
        const isSpellType = category === 'spell_cast' && (cardType.includes('instant') || cardType.includes('sorcery'));
        return matchesCat(card) || isSpellType;
      })
        // Rank by the build's own synergy score (tribal/theme bonuses baked
        // in) so a tribal commander's cheap slots go to cheap tribe/counter
        // pieces before generic 1-drops that merely match the category text.
        .sort((a, b) => b.score - a.score);

      // Find the lowest-scored current picks that aren't protected
      const protectedSet = new Set(merged.protectedPatterns.map((p) => p.toLowerCase()));

      // Ramp stays displaceable down to the template's floor (U11 fix 1) —
      // a21f2ff protected it unconditionally, which pushed Tam's Arena build
      // to 22 ramp (superfriends band 10-14) at the cost of Evolution Sage,
      // Thrummingbird and The One Ring. rampFloor/rampCount mirror the
      // tribal backfill above (~line 2070); the static filter build passes
      // rampFloor -Infinity so ramp cards aren't pre-excluded, then the fill
      // loop below re-checks with the live floor as picks get displaced.
      const rampFloor = getTemplate(resolvedStrategy).ramp.totalMin;
      let rampCount = 0;
      for (const p of picked) {
        const primary = getPrimaryCategory(classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0, commanderCard?.oracle_text || undefined, classifyOpts));
        if (p.board === 'main' && primary === 'ramp') rampCount += p.quantity;
      }

      // Identify non-essential picks (lowest score, non-protected)
      const displaceable = [...picked]
        .filter((p) => isStep4bDisplaceable(p, {
          category, protectedNames: protectedSet, tribalNames,
          commanderOracleText: commanderCard?.oracle_text || undefined, classifyOpts, isSuperfriends,
          rampCount, rampFloor: -Infinity,
        }))
        .sort((a, b) => {
          const aScore = scored.find((s) => s.card.name === a.card.name)?.score || 0;
          const bScore = scored.find((s) => s.card.name === b.card.name)?.score || 0;
          return aScore - bScore; // lowest score first
        });


      let filled = 0;
      for (const candidate of synergyCandidates) {
        if (filled >= deficit) break;
        if (displaceable.length === 0) break;

        const at = displaceable.findIndex((p) => isStep4bDisplaceable(p, {
          category, protectedNames: protectedSet, tribalNames,
          commanderOracleText: commanderCard?.oracle_text || undefined, classifyOpts, isSuperfriends,
          rampCount, rampFloor,
        }));
        if (at === -1) break;
        const [displaced] = displaceable.splice(at, 1);
        const displacedPrimary = getPrimaryCategory(classifyCard(displaced.card.name, displaced.card.oracle_text || '', displaced.card.type_line || '', displaced.card.cmc || 0, commanderCard?.oracle_text || undefined, classifyOpts));
        if (displacedPrimary === 'ramp') rampCount -= displaced.quantity;
        // Remove displaced card
        const idx = picked.indexOf(displaced);
        if (idx !== -1) {
          picked.splice(idx, 1);
          pickedNames.delete(displaced.card.name);
          totalPicked -= displaced.quantity;
        }

        // Add synergy card
        const qty = Math.min(getMaxQty(candidate.card), deficit - filled);
        if (qty > 0) {
          picked.push({ card: candidate.card, quantity: qty, board: 'main' });
          pickedNames.add(candidate.card.name);
          totalPicked += qty;
          filled += qty;
        }
      }
    }
  }


  // ── Step 4c: same-role upgrades until the deck converges (A-D1) ─────────
  // Every pass above seats cards by priority, quota, cap or floor, so a
  // capped role can end up holding the arsenal's best while a stronger pool
  // card of the same role sits benched (Tam: Terminate 209 out, Abrade 126
  // in). This pass asks the question a human asks last — "does a benched
  // card do this card's job better?" — and swaps same role for same role
  // until no such pair is left. Quotas and caps hold because the role count
  // never changes; plan picks (payoffs, tribe, walkers, walker engines and
  // support) are seated by design and never swapped out. Bounded so a
  // pathological pool can't loop.
  {
    const primaryOf = (card: DbCard): string =>
      getPrimaryCategory(classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc || 0, commanderCard?.oracle_text || undefined, classifyOpts));
    // In 3+ colours every cheap fixing rock is plan, wherever it was seated:
    // the classifier files treasure-makers under 'ramp' too, and by score
    // they took all five of Tam's Signets.
    const isPlanPick = (card: DbCard): boolean =>
      payoffNames.has(card.name.toLowerCase()) || tribalNames.has(card.name) || fixingFloorNames.has(card.name)
      || (colors.length >= 3 && isFixingRock(card))
      || (isSuperfriends && (/\bPlaneswalker\b/.test(card.type_line || '') || isWalkerEngineCard(card) || isWalkerSupportCard(card)));
    const isSpellSlot = (card: DbCard): boolean =>
      !(card.type_line || '').split('//')[0].includes('Land') && !isLandBackDfc(card);
    const scoreOfName = (name: string): number => poolByName.get(name)?.score ?? -Infinity;
    const MAX_UPGRADES = 30;
    const UPGRADE_MIN_GAIN = 2; // no churn on ties or sub-rounding gaps
    for (let n = 0; n < MAX_UPGRADES; n++) {
      const worstByRole = new Map<string, (typeof picked)[number]>();
      for (const p of picked) {
        if (p.board !== 'main' || p.quantity !== 1 || !isSpellSlot(p.card) || isPlanPick(p.card)) continue;
        const role = primaryOf(p.card);
        const w = worstByRole.get(role);
        if (!w || scoreOfName(p.card.name) < scoreOfName(w.card.name)) worstByRole.set(role, p);
      }
      if (worstByRole.size === 0) break;
      const floor = Math.min(...Array.from(worstByRole.values(), (p) => scoreOfName(p.card.name)));
      let swapped = false;
      for (const s of scored) { // score-descending: the first hit is the best available upgrade
        if (s.score <= floor) break;
        if (pickedNames.has(s.card.name) || !isSpellSlot(s.card) || getMaxQty(s.card) <= 0) continue;
        const victim = worstByRole.get(primaryOf(s.card));
        if (!victim || s.score < scoreOfName(victim.card.name) + UPGRADE_MIN_GAIN) continue;
        const idx = picked.indexOf(victim);
        if (idx === -1) continue;
        picked.splice(idx, 1);
        pickedNames.delete(victim.card.name);
        picked.push({ card: s.card, quantity: 1, board: 'main' });
        pickedNames.add(s.card.name);
        reasoning.push({ cardName: s.card.name, role: 'upgrade', reason: `same-role upgrade: +${s.card.name} (${Math.round(s.score)}) for ${victim.card.name} (${Math.round(scoreOfName(victim.card.name))})` });
        swapped = true;
        break;
      }
      if (!swapped) break;
    }
  }

  // ── Step 5: Add lands (via land intelligence) ───────────────────────────
  // MDFC spell//land cards already in the nonland picks are tapped-land
  // equivalents — every one of them reduces how many dedicated land slots
  // the deck needs, otherwise total land-capable cards balloon to 45-52.
  const mdfcLandBackCount = picked.filter((p) => isLandBackDfc(p.card)).length;
  // Floor at 30 for 100-card formats, but never above the format's own target
  // (standardbrawl runs 24 lands in a 60-card deck — the flat 30 floor shipped 65-card decks).
  const targetLandsEffective = Math.max(Math.min(30, targetLands), targetLands - Math.min(6, mdfcLandBackCount));

  const basicLandMap: Record<string, string> = {
    W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
  };
  // Basics that top the deck up to size. A colourless commander (Karn, Kozilek)
  // has no colours to map, so every fill below skipped it and shipped 71 cards.
  const fillBasicNames = colors.length > 0
    ? colors.map((c) => basicLandMap[c]).filter((n): n is string => !!n)
    : ['Wastes'];

  // Detect tribal types from picked creatures for tribal land matching
  const detectedTribalTypes: string[] = [];
  for (const p of picked) {
    const subtypes = p.card.subtypes;
    if (subtypes && p.card.type_line?.includes('Creature')) {
      try {
        const parsed = JSON.parse(subtypes);
        if (Array.isArray(parsed)) {
          for (const st of parsed) {
            if (typeof st === 'string') detectedTribalTypes.push(st);
          }
        }
      } catch { /* skip */ }
    }
  }
  // Find the most common tribal type
  const tribalCounts = new Map<string, number>();
  for (const t of detectedTribalTypes) {
    tribalCounts.set(t, (tribalCounts.get(t) || 0) + 1);
  }
  const topTribalTypes = Array.from(tribalCounts.entries())
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);

  // Only pass tribal types to land builder if deck is genuinely tribal
  // (commander has tribal synergy or strategy is tribal). Prevents
  // Secluded Courtyard / Unclaimed Territory in non-tribal decks.
  const isTrulyTribal = (
    commanderProfile?.triggerCategories?.includes('tribal_lands') ||
    resolvedStrategy === 'tribal' ||
    tribalType !== null
  );
  const tribalTypesForLands = isTrulyTribal ? topTribalTypes : [];

  // Build non-land card list for mana demand analysis. The commander's own
  // casting cost and activated-ability costs feed the land builder too —
  // Tam's {W}{U}{B}{R}{G} proliferate activation is real demand for a card
  // that's on the battlefield every game, not just what got "picked".
  const commanderPipDemand: Array<{ mana_cost: string | null; quantity: number }> = [];
  if (commanderCard) {
    if (commanderCard.mana_cost) commanderPipDemand.push({ mana_cost: commanderCard.mana_cost, quantity: 1 });
    for (const line of (commanderCard.oracle_text || '').split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const costPart = line.slice(0, colonIdx);
      if (/\{[WUBRG]\}/.test(costPart)) commanderPipDemand.push({ mana_cost: costPart, quantity: 1 });
    }
  }
  const nonLandCards = [
    ...picked.map(p => ({
      mana_cost: p.card.mana_cost,
      quantity: p.quantity,
    })),
    ...commanderPipDemand,
  ];

  // Try land intelligence system (requires land_classifications table)
  let landsAdded = 0;
  try {
    // A--stripped: cards already picked as spells (e.g. an MDFC taken for its
    // spell side) must not also eat a land-base slot — and, unlike a plain
    // post-hoc skip, the land builder needs to know about them BEFORE it
    // picks, so it can fill that slot from the next-best land instead of
    // silently losing it to Step 7 basics.
    const excludeNames = new Set(Array.from(pickedNames, (n) => stripArenaPrefix(n)));
    const landBase = buildOptimalLandBase({
      colors,
      format: options.format,
      strategy: resolvedStrategy,
      targetLandCount: targetLandsEffective,
      tribalTypes: tribalTypesForLands.length > 0 ? tribalTypesForLands : undefined,
      commanderName: commanderCard?.name,
      existingNonLandCards: nonLandCards,
      collectionOnly: useCollection,
      rarityFilter: options.rarityFilter,
      isCommander,
      maxCardPrice: options.maxCardPrice,
      userId: options.userId,
      collectionSource: options.collectionSource,
      excludeNames,
    });

    // Add non-basic lands. A--stripped: a land already picked (e.g. as an
    // MDFC spell) under its paper name blocks its Arena "A-" name too, and
    // vice versa — they're the same card.
    for (const { card, quantity } of landBase.lands) {
      const cardKey = stripArenaPrefix(card.name);
      if (pickedNames.has(card.name) || pickedNames.has(cardKey) || pickedNames.has(`A-${cardKey}`)) continue;
      const maxQty = getMaxQty(card);
      const qty = isCommander ? Math.min(1, maxQty) : Math.min(maxQty, quantity);
      if (qty <= 0) continue;
      picked.push({ card, quantity: qty, board: 'main' });
      pickedNames.add(card.name);
      landsAdded += qty;
    }

    // Add basics per distribution
    for (const [basicName, qty] of Object.entries(landBase.basicDistribution)) {
      if (qty <= 0) continue;
      const basic = db.prepare(
        'SELECT * FROM cards WHERE name = ? AND set_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
      ).get(basicName) as DbCard | undefined;
      if (basic) {
        const actualQty = Math.min(qty, targetLandsEffective - landsAdded);
        if (actualQty > 0) {
          picked.push({ card: basic, quantity: actualQty, board: 'main' });
          landsAdded += actualQty;
        }
      }
    }
  } catch {
    // Fallback: land_classifications table may not exist yet
    const numColors = colors.length;
    const nonBasicTarget = numColors <= 1
      ? Math.min(10, targetLandsEffective - 25)
      : numColors === 2
        ? Math.min(18, targetLandsEffective - 8)
        : Math.min(24, targetLandsEffective - 5);

    const landPool = db.prepare(`
      SELECT c.* FROM cards c
      ${collectionJoin}
      WHERE c.type_line LIKE '%Land%'
      AND c.type_line NOT LIKE '%Basic%'
      ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
      ${legalityFilter}
      ORDER BY
        ${collectionOrder}
        CASE WHEN c.oracle_text LIKE '%enters the battlefield tapped%' OR c.oracle_text LIKE '%enters tapped%' THEN 1 ELSE 0 END,
        c.edhrec_rank ASC NULLS LAST
      LIMIT 500
    `).all() as DbCard[];

    let fallbackMdfcCount = 0;
    for (const land of landPool) {
      if (landsAdded >= nonBasicTarget) break;
      if (pickedNames.has(land.name)) continue;

      // Front face must be a playable Land — transform/meld backs don't count.
      // Modal DFC spell//land cards are allowed but capped at 4.
      const frontIsLand = (land.type_line || '').split('//')[0].includes('Land');
      if (!frontIsLand) {
        if (land.layout !== 'modal_dfc' || fallbackMdfcCount >= 4) continue;
        fallbackMdfcCount++;
      }

      // Skip fetch lands that can't fetch on-color basics (e.g. Flooded Strand in RG)
      if (!isFetchLandRelevant(land.oracle_text || '', colors)) continue;

      const oracleText = (land.oracle_text || '').toLowerCase();
      if (numColors <= 1) {
        const entersTapped = oracleText.includes('enters the battlefield tapped')
          || oracleText.includes('enters tapped');
        if (entersTapped) continue;
      }

      const cardMax = getMaxQty(land);
      const qty = isCommander ? 1 : Math.min(cardMax, targetLandsEffective - landsAdded);
      if (qty <= 0) continue;

      picked.push({ card: land, quantity: qty, board: 'main' });
      pickedNames.add(land.name);
      landsAdded += qty;
    }

    // Fill remaining with basics
    if (landsAdded < targetLandsEffective) {
      const remaining = targetLandsEffective - landsAdded;
      const perColor = Math.floor(remaining / fillBasicNames.length);
      const extraForFirst = remaining - perColor * fillBasicNames.length;

      for (let i = 0; i < fillBasicNames.length; i++) {
        const basicName = fillBasicNames[i];

        const basic = db.prepare(
          'SELECT * FROM cards WHERE name = ? AND set_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
        ).get(basicName) as DbCard | undefined;

        if (basic) {
          const qty = Math.min(perColor + (i === 0 ? extraForFirst : 0), targetLandsEffective - landsAdded);
          if (qty > 0) {
            picked.push({ card: basic, quantity: qty, board: 'main' });
            landsAdded += qty;
          }
        }
      }
    }
  }

  // Step 6: Build sideboard (non-commander)
  if (!isCommander) {
    let sideCount = 0;
    for (const { card } of scored) {
      if (sideCount >= 15) break;
      if (pickedNames.has(card.name)) continue;

      const text = (card.oracle_text || '').toLowerCase();
      const isInteraction = text.includes('counter target') || text.includes('destroy')
        || text.includes('exile') || text.includes('discard')
        || text.includes('protection') || text.includes('hexproof');

      if (isInteraction || sideCount < 10) {
        const cardMax = getMaxQty(card);
        const qty = Math.min(cardMax, 2);
        if (qty <= 0) continue;
        picked.push({ card, quantity: qty, board: 'sideboard' });
        pickedNames.add(card.name);
        sideCount += qty;
      }
    }
  }

  // ── Step 7: Fill shortfall with basic lands ─────────────────────────────
  // When collection enforcement blocks unowned cards, the deck may be short.
  // Basic lands are always available — top off to reach the target size.
  const targetSize = DEFAULT_DECK_SIZE[options.format] || DEFAULT_DECK_SIZE.default;
  const currentTotal = picked.reduce((sum, p) => sum + p.quantity, 0)
    + (isCommander && options.commanderName ? 1 : 0); // Commander counts toward 100

  if (currentTotal < targetSize) {
    const deficit = targetSize - currentTotal;
    const perColor = Math.floor(deficit / fillBasicNames.length);
    const extra = deficit - perColor * fillBasicNames.length;

    for (let i = 0; i < fillBasicNames.length; i++) {
      const basicName = fillBasicNames[i];

      const addQty = perColor + (i === 0 ? extra : 0);
      if (addQty <= 0) continue;

      // Find or merge with existing basic land entry
      const existingBasic = picked.find(
        (p) => p.card.name === basicName && p.board === 'main'
      );
      if (existingBasic) {
        existingBasic.quantity += addQty;
      } else {
        const basic = db.prepare(
          'SELECT * FROM cards WHERE name = ? AND set_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
        ).get(basicName) as DbCard | undefined;
        if (basic) {
          picked.push({ card: basic, quantity: addQty, board: 'main' });
        }
      }
    }
  }


  // ── Superfriends draw cap ────────────────────────────────────────────────
  // Walkers are card advantage in their own right (excluded from "draw" by
  // the walker floor above and by the auditor's DRAW_RE below) — but nothing
  // capped the GENUINE draw spells/engines, so a superfriends build stacked
  // every high-value draw staple the pool scored well (Rhystic Study,
  // Smothering Tithe, The One Ring, Mystic Remora, ...) well past the
  // template's own draw band (6-9 of 99). Mirrors the walker floor's
  // displacement shape, in reverse: trim the weakest-scored draw picks down
  // to the band max, backfilled by the best unpicked non-draw candidate.
  if (isSuperfriends) {
    const drawTemplate = getTemplate('superfriends').draw;
    const drawCapMax = Math.max(
      drawTemplate?.totalMin ?? 6,
      Math.round((drawTemplate?.totalMax ?? 9) * nonLandTarget / WALKER_FLOOR_REFERENCE_NONLAND)
    );
    const isDrawCard = isSuperfriendsDrawCard;
    const drawPicks = picked.filter((p) => p.board === 'main' && isDrawCard(p.card));
    const drawCount = drawPicks.reduce((s, p) => s + p.quantity, 0);
    const overflow = drawCount - drawCapMax;
    if (overflow > 0) {
      const protectedSet = new Set(
        (getTemplate('superfriends').protectedPatterns || []).map((p) => p.toLowerCase())
      );
      // A walker engine / support card that also reads as draw (Way of the
      // Mind Sculptor) is the plan, not draw surplus — same guard as the
      // draw-engine repair below (U11 fix 2), which this cap lacked.
      const cuttable = drawPicks
        .filter((p) => !protectedSet.has(p.card.name.toLowerCase()) && !isWalkerEngineCard(p.card) && !isWalkerSupportCard(p.card))
        .sort((a, b) => {
          const aScore = scored.find((s) => s.card.name === a.card.name)?.score || 0;
          const bScore = scored.find((s) => s.card.name === b.card.name)?.score || 0;
          return aScore - bScore; // lowest score first
        });
      const replacements = scored
        .filter((s) => !pickedNames.has(s.card.name) && !isDrawCard(s.card) && getMaxQty(s.card) > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.card);
      let cut = 0;
      let replaceAt = 0;
      for (const victim of cuttable) {
        if (cut >= overflow) break;
        const idx = picked.indexOf(victim);
        if (idx === -1) continue;
        picked.splice(idx, 1);
        pickedNames.delete(victim.card.name);
        totalPicked -= victim.quantity;
        cut += victim.quantity;
        const replacement = replacements[replaceAt++];
        if (replacement) {
          const qty = Math.min(getMaxQty(replacement), victim.quantity);
          if (qty > 0) {
            picked.push({ card: replacement, quantity: qty, board: 'main' });
            pickedNames.add(replacement.name);
            totalPicked += qty;
          }
        }
        reasoning.push({
          cardName: victim.card.name,
          role: 'repair',
          reason: replacement
            ? `superfriends draw cap: -${victim.card.name} (draw ${drawCount} > band ${drawCapMax}) for ${replacement.name}`
            : `superfriends draw cap: -${victim.card.name} (draw ${drawCount} > band ${drawCapMax})`,
        });
      }
    }
  }


  // ── Step 8: Self-audit + auto-repair ───────────────────────────────────
  // The engine grades its own output and fixes mana/draw deficiencies before
  // shipping, so functionally-broken decks (under-sourced colors, thin draw)
  // can't reach the user. Repairs are size-preserving swaps; bounded to avoid
  // thrash. This is the safety net that replaces hand-patching the builder.
  const DRAW_RE = /draw (?:a|two|three|four|x|that many|cards|\d) cards?|draws? (?:a|two|three|\d|x) cards?/i;
  const auditOpts = { colors, format: options.format, targetLands, isCommander, strategy: resolvedStrategy };
  let health = auditDeck(picked, auditOpts);

  if (health.deficiencies.length > 0) {
    const basicByColor: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
    const scoreOf = (name: string): number => poolResult.pool.find((p) => p.card.name === name)?.score ?? 0;
    let repairs = 0;
    const MAX_REPAIRS = 8;

    // (a) Color-source shortfalls → rebalance basics from genuinely surplus
    // colors into the short color. Can't make another color worse because we
    // only donate from colors at least 3 sources above their own target.
    for (const def of health.deficiencies.filter((d) => d.kind === 'color_sources')) {
      if (repairs >= MAX_REPAIRS) break;
      const recipientName = basicByColor[def.color!];
      if (!recipientName) continue;
      let need = def.want - def.have;
      while (need > 0 && repairs < MAX_REPAIRS) {
        // donor = a basic whose color is most over its own want
        const donor = picked
          .filter((p) => p.board === 'main' && Object.values(basicByColor).includes(p.card.name) && p.card.name !== recipientName && p.quantity > 0)
          .map((p) => {
            const col = Object.entries(basicByColor).find(([, n]) => n === p.card.name)?.[0] || '';
            const want = Math.min(18, Math.max(7, Math.round((health.pipsByColor[col] || 0) * 0.5) + 4));
            return { p, surplus: (health.sourcesByColor[col] || 0) - want };
          })
          .filter((d) => d.surplus >= 3)
          .sort((a, b) => b.surplus - a.surplus)[0];
        if (!donor) break;
        donor.p.quantity -= 1;
        if (donor.p.quantity === 0) {
          const i = picked.indexOf(donor.p);
          if (i >= 0) picked.splice(i, 1);
        }
        const rec = picked.find((p) => p.card.name === recipientName && p.board === 'main');
        if (rec) {
          rec.quantity += 1;
        } else {
          const basic = db.prepare("SELECT * FROM cards WHERE name = ? AND set_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1").get(recipientName) as DbCard | undefined;
          if (basic) picked.push({ card: basic, quantity: 1, board: 'main' });
        }
        reasoning.push({ cardName: recipientName, role: 'repair', reason: `mana fix: +${recipientName} for ${def.color} shortfall` });
        need -= 1;
        repairs += 1;
        health = auditDeck(picked, auditOpts); // refresh surplus/source counts
      }
    }

    // (b) Card-draw / draw-engine shortfall → swap weakest utility/synergy
    // picks for the best unused draw. When the deficiency is specifically a
    // lack of repeatable ENGINES (deck goes stale), require candidates to be
    // engines; otherwise any draw counts. Collection-respecting.
    // Engines first (more impactful), then raw count. Each iteration re-audits
    // so we stop the moment the deck is healthy.
    let drawGuard = 0;
    while (repairs < MAX_REPAIRS && drawGuard++ < 12) {
      const drawDef = health.deficiencies.find((d) => d.kind === 'draw_engines')
        ?? health.deficiencies.find((d) => d.kind === 'card_draw');
      if (!drawDef) break;
      const needEngine = drawDef.kind === 'draw_engines';
      const cand = poolResult.pool
        .filter((p) => !pickedNames.has(p.card.name)
          && !(p.card.type_line || '').includes('Land')
          && (needEngine
            ? isDrawEngine(p.card.name, p.card.oracle_text || '', p.card.type_line || '')
            : DRAW_RE.test(p.card.oracle_text || ''))
          && (!useCollection || (ownedQty.get(p.card.name) || 0) > 0))
        .sort((a, b) => b.score - a.score)[0];
      if (!cand) break; // no candidate available (e.g., collection lacks engines)
      const out = picked
        .filter((p) => p.board === 'main' && !(p.card.type_line || '').includes('Land'))
        .filter((p) => {
          // Pass the commander oracle so the 'synergy' category actually fires
          // (was a 4-arg call → 'synergy' never matched → dead branch).
          const cats = classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0, commanderCard?.oracle_text || undefined, classifyOpts);
          const primary = cats[0] || 'utility';
          return primary === 'utility' // synergy cards are no longer displaceable
            && !DRAW_RE.test(p.card.oracle_text || '')
            && !isDrawEngine(p.card.name, p.card.oracle_text || '', p.card.type_line || '')
            // Never cut a commander payoff (Blood Artist in a sac deck) or a
            // tribal card — protect both regardless of commanderProfile presence.
            && !payoffNames.has(p.card.name.toLowerCase())
            && !tribalNames.has(p.card.name)
            // U11 fix 2: Step 4b's synergy-minimum backfill classifies a Way
            // of the ___ as 'utility' too (it's an enchantment, no ramp/draw/
            // removal text of its own), so without this guard the draw-engine
            // repair pass immediately cut the walker support Step 4b just
            // added back out to make room for its own draw fixes. Superfriends
            // opt-in only — isSuperfriends is false everywhere else.
            && !(isSuperfriends && isWalkerSupportCard(p.card));
        })
        .sort((a, b) => scoreOf(a.card.name) - scoreOf(b.card.name))[0];
      if (!out) break; // nothing safe to displace
      const i = picked.indexOf(out);
      if (i < 0) break;
      picked.splice(i, 1);
      pickedNames.delete(out.card.name);
      picked.push({ card: cand.card, quantity: 1, board: 'main' });
      pickedNames.add(cand.card.name);
      reasoning.push({ cardName: cand.card.name, role: 'repair', reason: `${needEngine ? 'engine' : 'draw'} fix: +${cand.card.name} for ${out.card.name}` });
      repairs += 1;
      health = auditDeck(picked, auditOpts);
    }
  }

  // ── Price cap / deck budget / bracket target: post-build accounting ────
  // (See BuildPriceReport / BuildBracketReport — always present, no-op
  // values when the corresponding option wasn't requested.)
  const commanderNames = [commanderCard?.name, options.partnerName].filter((n): n is string => !!n);


  let finalCards = picked;

  // Dead-card pass: cut anything that can't do its job in THIS deck — a
  // narrow tutor with too few targets, a {C}-pip card the manabase can't
  // feed, a mono-colour fixer with nothing to fix. Runs BEFORE budget/bracket
  // so those two see the actual final list (previously ran last, so a swap
  // here could change the deck's bracket/price without either report being
  // re-checked — bracket target 3 could report 3 while the built deck was
  // really 4).
  const deadPass = applyDeadCardPass(
    finalCards, poolResult.pool, colors, commanderCard?.oracle_text || undefined,
    (card) => getMaxQty(card) > 0,
  );
  finalCards = deadPass.cards;
  const deadCardsReplaced = deadPass.replacedAsDead;

  let replacedForBudget: Array<{ out: string; in: string; saved: number }> = [];
  if (options.maxDeckPrice != null && options.maxDeckPrice > 0) {
    const budget = applyDeckBudget(
      finalCards, poolResult.pool, options.maxDeckPrice, ownedQty, useCollection, commanderCard?.oracle_text || undefined
    );
    finalCards = budget.cards;
    replacedForBudget = budget.replacedForBudget;
  }

  let bracketReport: BuildBracketReport;
  if (isCommander && options.bracket != null) {
    const bt = applyBracketTarget(
      finalCards, poolResult.pool, options.bracket, commanderCard?.oracle_text || undefined, commanderNames,
      (card) => getMaxQty(card) > 0,
    );
    finalCards = bt.cards;
    bracketReport = bt.result;
  } else {
    const classified = classifyBracket(
      finalCards.filter((c) => c.board === 'main').map((c) => c.card),
      { commanderNames }
    );
    bracketReport = { target: null, result: classified.bracket, reasons: classified.reasons, swapped: [] };
  }

  let priceTotal = 0;
  let unpricedCount = 0;
  for (const c of finalCards) {
    if (c.board !== 'main') continue;
    if (useCollection && (ownedQty.get(c.card.name) || 0) > 0) continue; // owned = free to the user
    const p = c.card.price_usd != null ? parseFloat(c.card.price_usd) : NaN;
    if (Number.isNaN(p)) { unpricedCount += 1; continue; }
    priceTotal += p * c.quantity;
  }
  const priceReport: BuildPriceReport = {
    currency: 'USD',
    total: Math.round(priceTotal * 100) / 100,
    unpricedCount,
    maxCardPrice: options.maxCardPrice ?? null,
    maxDeckPrice: options.maxDeckPrice ?? null,
    excludedByCardCap: poolResult.priceCapExcluded,
    replacedForBudget,
    overBudget: options.maxDeckPrice != null && priceTotal > options.maxDeckPrice,
  };

  const finalPickedNames = new Set(finalCards.map((c) => c.card.name));
  const craftList = computeCraftList(
    poolResult.pool, finalCards, finalPickedNames, ownedQty, reasoning, commanderCard?.oracle_text || undefined, useCollection
  );

  // `health` was last refreshed before the dead-card, budget and bracket
  // passes (each of which can swap cards), so the reported color sources
  // went stale relative to the deck actually returned. Re-audit the final
  // list so the health report matches finalCards exactly.
  health = auditDeck(finalCards, auditOpts);

  return {
    cards: finalCards,
    themes,
    strategy: resolvedStrategy,
    tribalType: tribalType || undefined,
    commanderSynergy: commanderProfile || undefined,
    reasoning,
    buildReport,
    health,
    scoredPool: options.captureComponents
      ? poolResult.pool.map(({ card, score }) => ({
          name: card.name,
          score,
          components: poolResult.componentsByName?.get(card.name) ?? {},
        }))
      : undefined,
    hints: { parsed: hints, boostedCards },
    craftList,
    price: priceReport,
    bracket: bracketReport,
    deadCardsReplaced,
  };
}

/** Basic land name -> the one colour it produces. */
const BASIC_LAND_COLOR: Record<string, string> = {
  Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G',
};

/**
 * Whether a card's price clears a cap. Unpriced (null) fails any real cap —
 * unknown price is never treated as free — matching card-alternatives.ts's
 * `passesPriceCap`. No cap given: everything passes.
 */
export function passesCardPriceCap(priceUsd: string | null, cap: number | null | undefined): boolean {
  if (cap == null) return true;
  const price = priceUsd != null ? parseFloat(priceUsd) : NaN;
  if (Number.isNaN(price)) return false;
  return price <= cap;
}

/**
 * Rule 3 (deck budget): while the built main deck's total exceeds the cap,
 * replace the most expensive unowned non-commander card with the
 * best-scoring same-role pool candidate whose price keeps the deck under
 * the cap (falling back to the cheapest same-role candidate), recording
 * every swap. Bounded by deck size so it always terminates. Lands (outside
 * `pool`, which is nonland-only) fall back to an existing basic already in
 * the deck — basics are the floor.
 */
export function applyDeckBudget(
  picked: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>,
  pool: Array<{ card: DbCard; score: number }>,
  maxDeckPrice: number,
  ownedQty: Map<string, number>,
  useCollection: boolean,
  commanderOracle: string | undefined,
): { cards: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>; replacedForBudget: Array<{ out: string; in: string; saved: number }> } {
  const cards = picked.map((p) => ({ ...p }));
  const replacedForBudget: Array<{ out: string; in: string; saved: number }> = [];
  const isOwned = (name: string) => useCollection && (ownedQty.get(name) || 0) > 0;
  const priceOf = (card: DbCard): number => (card.price_usd != null ? parseFloat(card.price_usd) || 0 : 0);
  const effPrice = (card: DbCard): number => (isOwned(card.name) ? 0 : priceOf(card));
  const primaryRole = (card: DbCard): string =>
    getPrimaryCategory(classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc || 0, commanderOracle));
  const isLand = (card: DbCard): boolean => (card.type_line || '').includes('Land');
  const total = (): number =>
    cards.filter((c) => c.board === 'main').reduce((s, c) => s + effPrice(c.card) * c.quantity, 0);

  // A card that already has no cheaper same-role candidate is skipped, not a
  // reason to stop entirely — other, less expensive cards further down the
  // list can still individually add up to real savings (e.g. every card is
  // already under a per-card cap but the deck total is still over budget).
  const stuck = new Set<string>();
  let guard = cards.length + 5;
  while (total() > maxDeckPrice && guard-- > 0) {
    const inDeck = new Set(cards.filter((c) => c.board === 'main').map((c) => c.card.name));
    const swappable = cards.filter((c) =>
      c.board === 'main' && !isOwned(c.card.name) && effPrice(c.card) > 0 && !stuck.has(c.card.name)
    );
    if (swappable.length === 0) break;
    const target = swappable.slice().sort((a, b) => effPrice(b.card) - effPrice(a.card))[0];
    const targetPrice = effPrice(target.card);

    if (isLand(target.card)) {
      const isBasic = (c: DbCard): boolean => /^Basic\b/.test(c.type_line || '');
      const mainLands = cards.filter((c) => c.board === 'main' && c !== target && isLand(c.card));
      const mainNonlands = cards.filter((c) => c.board === 'main' && !isLand(c.card));
      const sources = countColorSources(mainLands.map((c) => ({ card: c.card, quantity: c.quantity })));
      const pips = countPipDemand(mainNonlands.map((c) => ({ card: c.card, quantity: c.quantity })));
      const deficitColor = Object.keys(pips)
        .filter((c) => pips[c] > 0)
        .sort((a, b) => (pips[b] - sources[b]) - (pips[a] - sources[a]))[0];
      const basic = mainLands.find((c) => isBasic(c.card) && BASIC_LAND_COLOR[c.card.name] === deficitColor)
        ?? mainLands.find((c) => isBasic(c.card));
      if (!basic) { stuck.add(target.card.name); continue; } // no basic to absorb the cut — try the next card
      basic.quantity += target.quantity;
      const idx = cards.indexOf(target);
      cards.splice(idx, 1);
      replacedForBudget.push({ out: target.card.name, in: basic.card.name, saved: Math.round(targetPrice * 100) / 100 });
      continue;
    }

    const role = primaryRole(target.card);
    const budgetLeft = maxDeckPrice - (total() - targetPrice);
    // Unpriced is not free: an unowned candidate with no known price is only
    // eligible when the user owns it (isOwned already makes it effPrice 0
    // honestly — an unknown price otherwise can't be judged "savings").
    const candidates = pool.filter((p) =>
      !inDeck.has(p.card.name) && !isLand(p.card) && primaryRole(p.card) === role
      && (isOwned(p.card.name) || p.card.price_usd != null)
    );
    const fitting = candidates.filter((p) => effPrice(p.card) <= budgetLeft).sort((a, b) => b.score - a.score)[0];
    const cheapest = candidates.slice().sort((a, b) => effPrice(a.card) - effPrice(b.card))[0];
    const replacement = fitting || cheapest;
    if (!replacement || effPrice(replacement.card) >= targetPrice) { stuck.add(target.card.name); continue; }

    const idx = cards.indexOf(target);
    cards[idx] = { card: replacement.card, quantity: target.quantity, board: 'main' };
    replacedForBudget.push({
      out: target.card.name,
      in: replacement.card.name,
      saved: Math.round((targetPrice - effPrice(replacement.card)) * 100) / 100,
    });
  }
  return { cards, replacedForBudget };
}

/**
 * Rule 4 (bracket target): if `classifyBracket` puts the built list above
 * the target, swap each offending card for the next best same-role
 * candidate that doesn't offend, re-classify once, and report the result
 * honestly if it still exceeds the target. At target 3, the game-changer
 * count is capped at 3 (highest-scoring kept) rather than excluded outright.
 */
export function applyBracketTarget(
  picked: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>,
  pool: Array<{ card: DbCard; score: number }>,
  target: 1 | 2 | 3 | 4 | 5,
  commanderOracle: string | undefined,
  commanderNames: string[],
  // Collection builds: the pool holds unowned (craft-list) cards too.
  canPick: (card: DbCard) => boolean = () => true,
): { cards: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>; result: BuildBracketReport } {
  const cards = picked.map((p) => ({ ...p }));
  const swapped: Array<{ out: string; in: string; category: string }> = [];
  const primaryRole = (card: DbCard): string =>
    getPrimaryCategory(classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc || 0, commanderOracle));
  const isLand = (card: DbCard): boolean => (card.type_line || '').includes('Land');
  const mainDeck = (): DbCard[] => cards.filter((c) => c.board === 'main').map((c) => c.card);
  const scoreOf = new Map(pool.map((p) => [p.card.name, p.score]));

  let classified = classifyBracket(mainDeck(), { commanderNames });
  if (classified.bracket > target) {
    const inDeck = new Set(cards.filter((c) => c.board === 'main').map((c) => c.card.name));
    const offenders = cards.filter((c) => c.board === 'main' && bracketOffenseCategory(c.card));

    let toSwap = offenders;
    if (target === 3) {
      // Only cards beyond the top-3 game changers by score need to go; MLD
      // (and anything else offending) is always excluded at this target.
      const gameChangers = offenders.filter((o) => bracketOffenseCategory(o.card) === 'game_changer');
      const keepNames = new Set(
        gameChangers.slice().sort((a, b) => (scoreOf.get(b.card.name) || 0) - (scoreOf.get(a.card.name) || 0))
          .slice(0, 3).map((o) => o.card.name)
      );
      toSwap = offenders.filter((o) => {
        const cat = bracketOffenseCategory(o.card);
        return cat === 'game_changer' ? !keepNames.has(o.card.name) : true;
      });
    }

    for (const off of toSwap) {
      const role = primaryRole(off.card);
      const replacement = pool
        .filter((p) => !inDeck.has(p.card.name) && !isLand(p.card) && !bracketOffenseCategory(p.card) && primaryRole(p.card) === role && canPick(p.card))
        .sort((a, b) => b.score - a.score)[0];
      if (!replacement) continue; // no safe candidate — result reported honestly below
      const idx = cards.indexOf(off);
      cards[idx] = { card: replacement.card, quantity: off.quantity, board: 'main' };
      inDeck.delete(off.card.name);
      inDeck.add(replacement.card.name);
      swapped.push({ out: off.card.name, in: replacement.card.name, category: bracketOffenseCategory(off.card) || 'unknown' });
    }
    classified = classifyBracket(mainDeck(), { commanderNames });
  }

  return { cards, result: { target, result: classified.bracket, reasons: classified.reasons, swapped } };
}

/** A narrow tutor needs at least this many actual targets in the deck to be worth its slot. */
const NARROW_TUTOR_MIN_TARGETS = 3;
// A {C}-pip cost needs real colourless production, not "any color" fixing —
// the more {C} symbols, the more sources it needs to be reliably castable.
// Thresholds target ~70% odds of holding the pips by turn 8 having seen ~15
// cards of a 99-card deck: 1 - (1 - sources/99)^8 — 8 sources -> .73 for one
// {C}, 12 sources -> .71 for two. 4/6 (the original guess) left cards like
// Kozilek's Command castable in well under half of games.
const COLORLESS_SOURCES_FOR_ONE_PIP = 8;
const COLORLESS_SOURCES_FOR_TWO_PIPS = 12;

/**
 * Rule 5 (dead-card pass): cut anything that can't do its job in THIS
 * built deck — a narrow tutor with too few targets, a {C}-pip card the
 * manabase can't feed, a mono-colour fixer with nothing to fix — and swap in
 * the best same-role, non-dead candidate the pool has. Same shape as
 * applyDeckBudget/applyBracketTarget: same-role replacement, owned-only via
 * `canPick`, every swap recorded, deck size unchanged.
 */
export function applyDeadCardPass(
  picked: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>,
  pool: Array<{ card: DbCard; score: number }>,
  colors: string[],
  commanderOracle: string | undefined,
  canPick: (card: DbCard) => boolean = () => true,
): { cards: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>; replacedAsDead: Array<{ out: string; in: string; reason: string }> } {
  const cards = picked.map((p) => ({ ...p }));
  const replacedAsDead: Array<{ out: string; in: string; reason: string }> = [];
  const primaryRole = (card: DbCard): string =>
    getPrimaryCategory(classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc || 0, commanderOracle));
  const isLand = (card: DbCard): boolean => (card.type_line || '').includes('Land');

  const mainCards = (): RelevanceCard[] =>
    cards.filter((c) => c.board === 'main')
      .map((c) => ({ name: c.card.name, type_line: c.card.type_line, oracle_text: c.card.oracle_text, quantity: c.quantity }));

  const colourlessSourceCount = (): number =>
    cards.filter((c) => c.board === 'main' && isColorlessSource(c.card)).reduce((s, c) => s + c.quantity, 0);

  const deadReason = (card: DbCard): string | null => {
    const target = narrowTutorTarget(card);
    if (target) {
      const count = countTargets(target, mainCards());
      if (count < NARROW_TUTOR_MIN_TARGETS) return `narrow tutor: only ${count} ${target.value} in deck`;
    }
    const pips = colorlessPipCount(card.mana_cost);
    if (pips > 0) {
      const needed = pips >= 2 ? COLORLESS_SOURCES_FOR_TWO_PIPS : COLORLESS_SOURCES_FOR_ONE_PIP;
      const have = colourlessSourceCount();
      if (have < needed) return `{C} cost, only ${have} colourless sources`;
    }
    if (isMonoColourDeadFixer(card, colors)) return 'mono-colour dead fixer';
    return null;
  };

  const stuck = new Set<string>();
  let guard = cards.length + 5;
  while (guard-- > 0) {
    const dead = cards.find((c) => c.board === 'main' && !stuck.has(c.card.name) && deadReason(c.card));
    if (!dead) break;
    const reason = deadReason(dead.card)!;
    const inDeck = new Set(cards.filter((c) => c.board === 'main').map((c) => c.card.name));
    const role = primaryRole(dead.card);
    const replacement = pool
      .filter((p) => !inDeck.has(p.card.name)
        && isLand(p.card) === isLand(dead.card)
        && primaryRole(p.card) === role
        && canPick(p.card)
        && !deadReason(p.card))
      .sort((a, b) => b.score - a.score)[0];
    if (!replacement) { stuck.add(dead.card.name); continue; }
    const idx = cards.indexOf(dead);
    cards[idx] = { card: replacement.card, quantity: dead.quantity, board: 'main' };
    replacedAsDead.push({ out: dead.card.name, in: replacement.card.name, reason });
  }
  return { cards, replacedAsDead };
}

const CRAFT_LIST_CAP = 15;

/**
 * "Needed to craft" list: the top-scored candidates from this build's own
 * scored pool that did NOT make the deck and are NOT owned — a wildcard/buy
 * list. Cheap by design: no DB or network calls, just re-groups the pool the
 * build already scored once. Ownership is enforced at pick time via
 * getMaxQty(), so the pool itself (unlike before) already contains unowned
 * candidates scored right alongside owned ones — see the poolQuery note in
 * buildScoredCandidatePool.
 */
export function computeCraftList(
  scoredPool: Array<{ card: DbCard; score: number }>,
  picked: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>,
  pickedNames: Set<string>,
  ownedQty: Map<string, number>,
  reasoning: Array<{ cardName: string; role: string; reason: string }>,
  commanderOracle: string | undefined,
  useCollection: boolean,
): CraftListEntry[] | undefined {
  if (!useCollection) return undefined;

  const primaryRole = (card: DbCard): string =>
    getPrimaryCategory(
      classifyCard(card.name, card.oracle_text || '', card.type_line || '', card.cmc || 0, commanderOracle)
    );

  // A card can be picked, later displaced by a repair swap, and still carry
  // its original reasoning entry (reasoning is append-only) — reuse that
  // text verbatim when a craft candidate matches one.
  const reasonByName = new Map<string, string>();
  for (const r of reasoning) reasonByName.set(r.cardName, r.reason);

  // Lowest-scored currently-owned pick per role: what an unowned candidate
  // in that role would bump if it were craftable.
  const scoreByName = new Map(scoredPool.map((p) => [p.card.name, p.score]));
  const lowestOwnedByRole = new Map<string, { name: string; score: number }>();
  for (const p of picked) {
    if (p.board !== 'main' || (p.card.type_line || '').includes('Land')) continue;
    const role = primaryRole(p.card);
    const score = scoreByName.get(p.card.name) ?? 0;
    const current = lowestOwnedByRole.get(role);
    if (!current || score < current.score) lowestOwnedByRole.set(role, { name: p.card.name, score });
  }

  const entries: CraftListEntry[] = [];
  for (const { card, score } of scoredPool) {
    if (entries.length >= CRAFT_LIST_CAP) break;
    if (pickedNames.has(card.name)) continue;
    if ((card.type_line || '').includes('Land')) continue;
    if ((ownedQty.get(card.name) || 0) > 0) continue;

    const role = primaryRole(card);
    let legalities: Record<string, string> = {};
    try { legalities = card.legalities ? JSON.parse(card.legalities) : {}; } catch { /* leave empty */ }
    const onArena = legalities.brawl === 'legal' || legalities.standardbrawl === 'legal';
    const wouldReplace = lowestOwnedByRole.get(role)?.name;

    entries.push({
      name: card.name,
      role,
      rarity: card.rarity || 'unknown',
      priceUsd: card.price_usd ? parseFloat(card.price_usd) : null,
      onArena,
      score,
      wouldReplace,
      reason: reasonByName.get(card.name) ?? `Highest-scored unowned ${role.replace(/_/g, ' ')} candidate`,
      owned: false,
    });
  }
  return entries;
}

// ── Enhanced suggestions using synergy detection ────────────────────────────

export function getSynergySuggestions(
  deckCards: Array<{ quantity: number; board: string } & DbCard>,
  format: string,
  deckId?: number,
  collectionOnly?: boolean
): AISuggestion[] {
  const db = getDb();
  const mainCards = deckCards.filter((c) => c.board === 'main' || c.board === 'commander');
  const existingIds = new Set(deckCards.map((c) => c.id));
  const existingNames = new Set(deckCards.map((c) => c.name));

  // Detect themes from current deck
  const themes = detectDeckThemes(mainCards);

  // Detect colors
  const colorSet = new Set<string>();
  for (const card of mainCards) {
    const ci: string[] = card.color_identity ? JSON.parse(card.color_identity) : [];
    ci.forEach((c) => colorSet.add(c));
  }
  const colors = Array.from(colorSet);

  // For non-Commander formats, use tournament meta data instead of EDHREC rank
  const isCommanderLike = COMMANDER_FORMATS.includes(format as typeof COMMANDER_FORMATS[number]);
  const metaRankMap = !isCommanderLike ? getMetaRankedCardNames(format) : new Map<string, number>();
  const hasMetaData = metaRankMap.size > 20;

  const colorFilter = colors.length > 0
    ? colors.map((c) => `c.color_identity LIKE '%${c}%'`).join(' OR ')
    : '1=1';

  // Color exclusion: don't suggest off-color cards
  const excludeColors = ['W', 'U', 'B', 'R', 'G'].filter((c) => !colors.includes(c));
  const excludeFilter = excludeColors
    .map((c) => `c.color_identity NOT LIKE '%${c}%'`)
    .join(' AND ');

  const legalityFilter = format && format !== '1v1'
    ? `AND json_extract(c.legalities, '$.${getLegalityKey(format)}') IN ('legal', 'restricted')`
    : '';

  // ── Load match insights if we have a deck ID ──────────────────────────
  const insightData = deckId ? loadDeckInsights(db, deckId) : null;

  const synergyFilter = buildSynergyQuery(themes);
  const idPlaceholders = Array.from(existingIds).map(() => '?').join(',') || "''";

  const answerFilter = insightData?.recurringThreats.length
    ? `OR (c.oracle_text LIKE '%destroy%' OR c.oracle_text LIKE '%exile%' OR c.oracle_text LIKE '%counter target%')`
    : '';

  const collectionJoin = collectionOnly
    ? `INNER JOIN (
        SELECT DISTINCT c2.name AS cname FROM collection col2 JOIN cards c2 ON col2.card_id = c2.id
        UNION SELECT 'Plains' UNION SELECT 'Island' UNION SELECT 'Swamp'
        UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'
      ) owned ON c.name = owned.cname`
    : '';

  const query = `
    SELECT c.* FROM cards c
    ${collectionJoin}
    WHERE (c.type_line NOT LIKE '%Land%' OR c.type_line LIKE '%//%')
    AND c.type_line != 'Card' AND c.type_line NOT LIKE 'Card //%'
    AND (${colorFilter})
    ${excludeFilter ? `AND ${excludeFilter}` : ''}
    ${legalityFilter}
    AND (1=1 ${synergyFilter} ${answerFilter})
    AND c.id NOT IN (${idPlaceholders})
    ORDER BY c.edhrec_rank ASC NULLS LAST
    LIMIT ${hasMetaData ? 400 : 200}
  `;

  let candidates = db.prepare(query).all(...Array.from(existingIds)) as DbCard[];

  // For non-Commander formats with meta data, re-rank candidates by tournament viability
  if (hasMetaData) {
    candidates.sort((a, b) => {
      const aScore = metaRankMap.get(a.name) ?? -1;
      const bScore = metaRankMap.get(b.name) ?? -1;
      // Cards with meta data float to top; within non-meta, keep EDHREC order
      if (aScore >= 0 && bScore >= 0) return bScore - aScore;
      if (aScore >= 0) return -1;
      if (bScore >= 0) return 1;
      return (a.edhrec_rank ?? 99999) - (b.edhrec_rank ?? 99999);
    });
    candidates = candidates.slice(0, 200);
  }

  // ── Community co-occurrence: boost cards that appear in similar decks ──
  const deckCardNames = mainCards.map((c) => c.name);
  const communityRecs = getCommunityRecommendations(deckCardNames, format, 200);
  const communityScoreMap = new Map<string, { score: number; deckCount: number; totalDecks: number }>();
  for (const rec of communityRecs) {
    communityScoreMap.set(rec.cardName.toLowerCase(), {
      score: rec.score,
      deckCount: rec.deckCount,
      totalDecks: rec.totalSimilarDecks,
    });
  }

  const suggestions: AISuggestion[] = [];
  const suggestedNames = new Set<string>();
  for (const card of candidates) {
    if (existingNames.has(card.name)) continue;
    if (suggestedNames.has(card.name)) continue;
    suggestedNames.add(card.name);

    const text = (card.oracle_text || '').toLowerCase();
    const matchedThemes: string[] = [];

    for (const theme of themes) {
      const patterns = SYNERGY_GROUPS[theme];
      if (!patterns) continue;
      if (patterns.some((p) => text.includes(p))) {
        matchedThemes.push(theme);
      }
    }

    const globalScore = getCardGlobalScore(card.name, format);
    let score: number;
    if (globalScore.confidence > 0.3) {
      score = 60 + globalScore.playedWinRate * 40 + matchedThemes.length * 5;
    } else {
      score = 80 + matchedThemes.length * 5;
    }
    const reasons: string[] = [];

    // ── Community co-occurrence boost ─────────────────────────────────
    const coOcc = communityScoreMap.get(card.name.toLowerCase());
    if (coOcc && coOcc.score > 0.05) {
      const pct = Math.round(coOcc.score * 100);
      score += coOcc.score * 30; // up to +30 for cards in 100% of similar decks
      reasons.push(`In ${pct}% of similar decks (${coOcc.deckCount}/${coOcc.totalDecks})`);
    }

    if (globalScore.confidence > 0.3 && globalScore.playedWinRate > 0.55) {
      reasons.push(`${Math.round(globalScore.playedWinRate * 100)}% win rate across ${globalScore.gamesPlayed} games`);
    }

    if (matchedThemes.length > 0) {
      reasons.push(`Synergizes with your ${matchedThemes.join(' + ')} theme${matchedThemes.length > 1 ? 's' : ''}`);
    } else if (globalScore.confidence <= 0.3 && card.edhrec_rank !== null && card.edhrec_rank < 1000) {
      reasons.push('Top-ranked staple in this color combination');
    }

    const metaBoost = getMetaAdjustedScore(card.name, format);
    if (metaBoost > 0) {
      score += metaBoost;
      reasons.push('Strong against popular meta decks');
    }

    // ── Tournament meta boost for non-Commander formats ─────────────
    if (hasMetaData) {
      const metaScore = metaRankMap.get(card.name);
      if (metaScore !== undefined) {
        score += metaScore * 25; // up to +25 for top tournament cards
        if (!reasons.some(r => r.includes('meta') || r.includes('tournament'))) {
          reasons.push('Proven in competitive tournament play');
        }
      }
    }

    // ── Match insight scoring ─────────────────────────────────────────
    if (insightData) {
      if (insightData.recurringThreats.length > 0) {
        const isRemoval = text.includes('destroy') || text.includes('exile target')
          || text.includes('counter target') || text.includes('return target');
        if (isRemoval && card.cmc <= 3) {
          score += 20;
          reasons.push(`Answers recurring threats (${insightData.recurringThreats.slice(0, 2).join(', ')})`);
        }
      }

      if (insightData.dyingFast && card.cmc <= 2) {
        score += 10;
        if (text.includes('lifelink') || text.includes('gain') || text.includes('block')) {
          score += 5;
          reasons.push('Helps stabilize against fast aggro');
        }
      }

      for (const strong of insightData.strongCards) {
        const strongInDeck = mainCards.find((dc) => dc.name === strong.name);
        if (strongInDeck) {
          const strongText = (strongInDeck.oracle_text || '').toLowerCase();
          const sharedKeywords = ['draw', 'create', 'counter', 'destroy', 'exile', 'haste', 'flying', 'trample'];
          const shared = sharedKeywords.filter((kw) => strongText.includes(kw) && text.includes(kw));
          if (shared.length > 0) {
            score += 8;
            reasons.push(`Similar to strong performer ${strong.name}`);
          }
        }
      }

      for (const weak of insightData.weakCards) {
        const weakInDeck = mainCards.find((dc) => dc.name === weak.name);
        if (weakInDeck) {
          if (card.cmc === weakInDeck.cmc && card.type_line.split('—')[0] === weakInDeck.type_line.split('—')[0]) {
            score -= 5;
          }
        }
      }
    }

    const reason = reasons.length > 0
      ? reasons.join('. ')
      : 'Strong card for this archetype';

    suggestions.push({
      card,
      reason,
      score,
      winRate: globalScore.confidence > 0.3 ? Math.round(globalScore.playedWinRate * 100) : undefined,
      edhrecRank: card.edhrec_rank ?? undefined,
    });
  }

  // Also inject top community recommendations not already in candidates
  for (const rec of communityRecs.slice(0, 30)) {
    if (suggestedNames.has(rec.cardName) || existingNames.has(rec.cardName)) continue;
    if (rec.score < 0.1) continue; // at least 10% co-occurrence

    // Look up the card in DB
    const card = db.prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE').get(rec.cardName) as DbCard | undefined;
    if (!card) continue;

    suggestedNames.add(rec.cardName);
    const pct = Math.round(rec.score * 100);
    suggestions.push({
      card,
      reason: `In ${pct}% of similar decks (${rec.deckCount}/${rec.totalSimilarDecks}). Community favorite`,
      score: 75 + rec.score * 25,
      edhrecRank: card.edhrec_rank ?? undefined,
    });
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

// ── Load deck insights from match history ──────────────────────────────────

interface DeckInsightData {
  recurringThreats: string[];
  dyingFast: boolean;
  strongCards: Array<{ name: string; winRate: number }>;
  weakCards: Array<{ name: string; winRate: number }>;
}

function loadDeckInsights(
  db: ReturnType<typeof getDb>,
  deckId: number
): DeckInsightData | null {
  const rows = db.prepare(
    'SELECT insight_type, card_name, data FROM deck_insights WHERE deck_id = ?'
  ).all(deckId) as Array<{ insight_type: string; card_name: string | null; data: string }>;

  if (rows.length === 0) return null;

  const recurringThreats: string[] = [];
  let dyingFast = false;
  const strongCards: Array<{ name: string; winRate: number }> = [];
  const weakCards: Array<{ name: string; winRate: number }> = [];

  for (const row of rows) {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(row.data);
    } catch {}

    switch (row.insight_type) {
      case 'recurring_threats': {
        const cards = data.cards as Array<{ name: string }> | undefined;
        if (cards) {
          for (const c of cards) recurringThreats.push(c.name);
        }
        break;
      }
      case 'dying_fast':
        dyingFast = true;
        break;
      case 'underperformer':
        if (row.card_name) {
          weakCards.push({ name: row.card_name, winRate: (data.winRate as number) || 0 });
        }
        break;
      case 'increase_copies':
        if (row.card_name) {
          strongCards.push({ name: row.card_name, winRate: (data.winRate as number) || 0 });
        }
        break;
    }
  }

  return { recurringThreats, dyingFast, strongCards, weakCards };
}
