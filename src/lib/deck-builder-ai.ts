import { getDb, getCedhStaples, getMetaCardStatsMap, getMetaRankedCardNames, getFormatStaples, getCommunityRecommendations, getCommanderCardStats } from './db';
import type { DbCard, AISuggestion } from './types';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE, getLegalityKey, COMMANDER_FORMATS } from './constants';
import { getCardGlobalScore, getMetaAdjustedScore } from './global-learner';
import { getEdhrecRecommendations, getEdhrecThemeCards } from './edhrec';
import type { EdhrecRecommendation } from './edhrec';
import { getTemplate, getScaledCurve, mergeWithCommanderProfile } from './deck-templates';
import type { Archetype } from './deck-templates';
import { analyzeCommander } from './commander-synergy';
import type { CommanderSynergyProfile } from './commander-synergy';
import { buildOptimalLandBase, isFetchLandRelevant } from './land-intelligence';
import { getCFRecommendations, resolveCFToDbCards } from './cf-api-client';
import {
  getPayoffNamesForProfile,
  getRoleQuotas,
  pickByRole,
  buildReasoningSummary,
} from './deck-builder-constraints';
import { analyzeCommanderForBuild } from './commander-analysis';
import type { ArsenalCard } from './commander-analysis';
import { classifyCard } from './card-classifier';

// ── Commander synergy text patterns for card scoring ────────────────────────
// Maps synergy categories from commander-synergy.ts to oracle text substrings

const SYNERGY_REQUIREMENTS_MAP = {
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
// Detects if a commander is tribal and returns the creature type to build around

const MAJOR_TRIBES: string[] = [
  'goblin', 'elf', 'zombie', 'vampire', 'merfolk', 'human', 'angel', 'dragon',
  'sliver', 'soldier', 'wizard', 'elemental', 'spirit', 'beast', 'warrior',
  'knight', 'dinosaur', 'cat', 'rat', 'bird', 'demon', 'faerie', 'pirate',
  'cleric', 'rogue', 'shaman', 'druid', 'sphinx', 'werewolf', 'wolf',
  'insect', 'fungus', 'saproling', 'treefolk', 'minotaur', 'giant', 'dwarf',
  'artifact creature', 'construct', 'golem', 'horror', 'nightmare', 'phyrexian',
  'eldrazi', 'ally', 'snake', 'fish', 'kraken', 'leviathan', 'octopus',
  'squirrel', 'bear', 'ape', 'hydra', 'wurm', 'drake', 'changeling',
  'ooze',
];
const MAJOR_TRIBES_SET = new Set(MAJOR_TRIBES);

function detectTribalTheme(
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

  // Check if oracle text explicitly references a creature type for tribal payoff
  // Patterns like "other Goblins", "Goblins you control", "whenever a Goblin"
  for (const tribe of MAJOR_TRIBES) {  // iterate over array
    const tribalPatterns = [
      `other ${tribe}`,
      `${tribe}s you control`,
      `${tribe} you control`,
      `whenever a ${tribe}`,
      `whenever another ${tribe}`,
      `each ${tribe}`,
      `all ${tribe}s`,
      `${tribe} creature tokens`,
      `number of ${tribe}`,
      `create a .* ${tribe}`,
    ];

    for (const pattern of tribalPatterns) {
      if (oracleText.includes(pattern)) {
        return tribe;
      }
    }
  }

  // Check if the commander IS a notable tribal type and has tribal text
  for (const subtype of subtypes) {
    if (MAJOR_TRIBES_SET.has(subtype)) {
      // Only count it as tribal if oracle text references the type at all
      if (oracleText.includes(subtype)) {
        return subtype;
      }
    }
  }

  return null;
}

function fetchTribalCards(
  db: ReturnType<typeof getDb>,
  tribe: string,
  colorExcludeFilter: string,
  legalityFilter: string,
  commanderExclude: string,
  limit: number = 80
): DbCard[] {
  // Search for creatures of the tribe type AND cards that reference the tribe
  const tribeLike = `%${tribe}%`;
  const query = `
    SELECT DISTINCT c.* FROM cards c
    WHERE (
      c.type_line LIKE ? COLLATE NOCASE
      OR c.subtypes LIKE ? COLLATE NOCASE
      OR c.oracle_text LIKE ? COLLATE NOCASE
    )
    ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
    ${legalityFilter}
    ${commanderExclude}
    ORDER BY c.edhrec_rank ASC NULLS LAST
    LIMIT ?
  `;

  return db.prepare(query).all(tribeLike, tribeLike, tribeLike, limit) as DbCard[];
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

// ── Main deck builder ───────────────────────────────────────────────────────

export interface BuildOptions {
  format: string;
  colors: string[]; // e.g. ['W', 'U']
  strategy?: string; // optional archetype hint: 'aggro', 'control', 'midrange', 'combo'
  useCollection?: boolean; // prefer cards from user's collection
  commanderName?: string; // for commander format
  powerLevel?: 'casual' | 'optimized' | 'cedh';
  userId?: number; // for commander-arsenal collection substitutes
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
}

export interface ScoredCandidatePoolResult {
  pool: Array<{ card: DbCard; score: number }>;
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
}

/**
 * Build a scored candidate pool of nonland cards for deck construction.
 * Reusable by both autoBuildDeck() and Claude-powered deck building.
 */
export async function buildScoredCandidatePool(options: BuildOptions): Promise<ScoredCandidatePoolResult> {
  const db = getDb();
  const { format, strategy, useCollection = false, commanderName, powerLevel } = options;

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
    }
  }

  const targetSize = DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default;
  const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;
  const isCommander = format === 'commander' || format === 'brawl' || format === 'standardbrawl';
  const nonLandTarget = targetSize - targetLands - (isCommander && commanderName ? 1 : 0);
  const maxCopies = isCommander ? 1 : 4;

  // Build color identity exclusion — cards must fit within the deck's colors
  const excludeColors = ['W', 'U', 'B', 'R', 'G'].filter((c) => !colors.includes(c));
  const colorExcludeFilter = excludeColors
    .map((c) => `c.color_identity NOT LIKE '%${c}%'`)
    .join(' AND ');

  // Only include cards that are legal in the format (skip for 1v1 — no Scryfall legality data)
  const legalityFilter = format && format !== '1v1'
    ? `AND c.legalities LIKE '%"${getLegalityKey(format)}":"legal"%'`
    : '';

  // Exclude commander from the 99
  const commanderExclude = commanderName
    ? `AND c.name != '${commanderName.replace(/'/g, "''")}'`
    : '';

  // ── Collection quantity map (name-based to handle different printings) ────
  const ownedQty = new Map<string, number>();
  const ownedNames = new Set<string>();
  if (useCollection) {
    const rows = db.prepare(
      `SELECT c.name, SUM(col.quantity) as total
       FROM collection col JOIN cards c ON col.card_id = c.id
       GROUP BY c.name`
    ).all() as Array<{ name: string; total: number }>;
    for (const row of rows) {
      ownedNames.add(row.name);
      ownedQty.set(row.name, row.total);
    }
    // Basic lands are always available (Arena gives unlimited)
    for (const basic of ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']) {
      ownedNames.add(basic);
      ownedQty.set(basic, 99);
    }
  }

  // Name-based collection filter: use a subquery on card names the user owns
  // UNION with basic lands which are always available (Arena gives unlimited)
  const collectionJoin = useCollection
    ? `INNER JOIN (
        SELECT DISTINCT c2.name AS cname FROM collection col2 JOIN cards c2 ON col2.card_id = c2.id
        UNION SELECT 'Plains' UNION SELECT 'Island' UNION SELECT 'Swamp'
        UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'
      ) owned ON c.name = owned.cname`
    : '';
  const collectionOrder = useCollection
    ? `CASE WHEN c.name IN (
        SELECT c3.name FROM collection col3 JOIN cards c3 ON col3.card_id = c3.id
        UNION SELECT 'Plains' UNION SELECT 'Island' UNION SELECT 'Swamp'
        UNION SELECT 'Mountain' UNION SELECT 'Forest' UNION SELECT 'Wastes'
      ) THEN 0 ELSE 1 END,`
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
      tribalCards = fetchTribalCards(db, tribalType, colorExcludeFilter, legalityFilter, commanderExclude);
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

      commanderProfile = analyzeCommander(fullOracleText, cmdRow.type_line, ci);
    }
  }

  // ── Step 1: Build card pool ─────────────────────────────────────────────
  // For commander: start with EDHREC-recommended cards + tribal cards,
  // then synergy-targeted cards, then generic
  // For non-commander: use global edhrec_rank as before

  const poolQuery = `
    SELECT DISTINCT c.* FROM cards c
    ${collectionJoin}
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

  // EDHREC cards go first — these are specifically recommended for this commander
  // When building from collection, skip cards the user doesn't own
  for (const card of edhrecResolvedCards) {
    if (!seenNames.has(card.name)) {
      if (useCollection && !ownedNames.has(card.name)) continue;
      seenNames.add(card.name);
      pool.push(card);
    }
  }

  // Tribal cards next — creatures and synergy cards of the detected type
  for (const card of tribalCards) {
    if (!seenNames.has(card.name)) {
      if (useCollection && !ownedNames.has(card.name)) continue;
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
      ${collectionJoin}
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

      if (useCollection && !ownedNames.has(staple.cardName)) continue;

      const stapleCard = db.prepare(
        `SELECT c.* FROM cards c WHERE c.name = ? COLLATE NOCASE
         ${legalityFilter}
         ${commanderExclude}
         LIMIT 1`
      ).get(staple.cardName) as DbCard | undefined;

      if (stapleCard) {
        seenNames.add(stapleCard.name);
        pool.push(stapleCard);
      }
    }
  }

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
      themes = detectDeckThemes(pool.slice(0, 40));
    }
  } else {
    themes = detectDeckThemes(pool.slice(0, 40));
  }

  // Commander synergy archetype overrides generic CMC-based detection
  const resolvedStrategy = strategy
    || commanderProfile?.detectedArchetype
    || (themes.includes('aggro') ? 'aggro' : themes.includes('control') ? 'control' : 'midrange');

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
      const deckCardNames = pool.slice(0, 30).map(c => c.name);
      const cfRecs = await getCFRecommendations(deckCardNames, commanderName, 50);
      for (const rec of cfRecs) {
        cfScoreMap.set(rec.card_name, rec.cf_score);
      }
      // Inject CF-recommended cards into pool if not already present
      // When useCollection is on, only inject cards the user owns
      if (cfRecs.length > 0) {
        const existingIds = new Set(pool.map(c => c.id));
        const cfCards = resolveCFToDbCards(cfRecs, existingIds);
        for (const { card } of cfCards) {
          if (!seenNames.has(card.name)) {
            if (useCollection && !ownedNames.has(card.name)) continue;
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
        const injected = db.prepare(`
          SELECT * FROM cards
          WHERE name IN (${namePlaceholders})
          ${colorExcludeFilter}
          ${legalityFilter}
          LIMIT 100
        `).all(...highIncCards.map(s => s.cardName)) as DbCard[];
        for (const card of injected) {
          if (!seenNames.has(card.name)) {
            if (useCollection && !ownedNames.has(card.name)) continue;
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

  const scored = pool.map((card) => {
    let score = 0;

    // ── ML personalization bonus (from trained scikit-learn model) ──
    const mlScore = mlScoreMap.get(card.name);
    if (mlScore !== undefined) {
      // ML predicted win rate (0-1) scaled to 0-25 bonus
      score += Math.max(0, (mlScore - 0.4) * 40);
    }

    // ── Collaborative Filtering bonus (from similar decks in CF engine) ──
    const cfScore = cfScoreMap.get(card.name);
    if (cfScore !== undefined) {
      // CF score (0-1) scaled to 0-20 bonus
      score += cfScore * 20;
    }

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
      // Synergy bonus: cards that appear MORE in this commander's decks than globally
      if (cmdrStats.synergyScore > 0.3) {
        score += 25; // Very high commander-specific synergy
      } else if (cmdrStats.synergyScore > 0.15) {
        score += 15;
      } else if (cmdrStats.synergyScore > 0.05) {
        score += 8;
      }
    }

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

    // ── Archetype discouraged types penalty ──
    const template = getTemplate(resolvedStrategy);
    if (template.discouragedTypes?.length) {
      const tl = card.type_line?.toLowerCase() ?? '';
      if (template.discouragedTypes.some(d => tl.includes(d.toLowerCase()))) {
        score -= 60;
      }
    }

    // ── Storm CMC bonus ──
    // Storm commanders need maximum cheap spells to build storm count.
    // This overrides normal CMC preferences — heavily reward CMC 0-2.
    if (commanderProfile?.triggerCategories.includes('storm')) {
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
    if (!hasAnySignal && edhrecRank > 18000) {
      score -= 35;
    }

    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // ── Strict JS color identity post-filter ─────────────────────────────────
  // The SQL filter uses c.color_identity NOT LIKE '%X%' which can miss
  // edge cases (JSON parsing, MDFCs with off-color spell sides). Apply a
  // bulletproof JS check: parse each card's color_identity as JSON and
  // require every color to be present in the deck's allowed colors.
  const allowedColors = new Set(colors);
  const colorFilteredScored = scored.filter(({ card }) => {
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

export async function autoBuildDeck(options: BuildOptions): Promise<BuildResult> {
  const db = getDb();
  const poolResult = await buildScoredCandidatePool(options);
  const {
    pool: scored, themes, resolvedStrategy, tribalType, tribalNames,
    commanderProfile, commanderCard, landTarget: targetLands, nonLandTarget,
    isCommander, maxCopies, colors, ownedQty, useCollection,
    colorExcludeFilter, legalityFilter, commanderExclude: _commanderExclude,
    collectionJoin, collectionOrder, metaStatsMap, commanderStatsMap,
  } = poolResult;

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
  const pickedNames = new Set<string>();
  let totalPicked = 0;
  const reasoning: Array<{ cardName: string; role: string; reason: string }> = [];

  function getMaxQty(card: DbCard): number {
    const formatMax = isCommander ? 1 : maxCopies;
    if (!useCollection) return formatMax;
    const owned = ownedQty.get(card.name) || 0;
    // Block unowned cards entirely when building from collection
    return owned > 0 ? Math.min(formatMax, owned) : 0;
  }

  // ── (a) Build commander arsenal ────────────────────────────────────────
  let arsenal: ArsenalCard[] = [];
  if (isCommander && options.commanderName && options.userId !== undefined) {
    try {
      const analysis = analyzeCommanderForBuild(
        options.commanderName,
        options.userId,
        options.format,
        150,
      );
      if (analysis) {
        arsenal = analysis.arsenal;
      }
    } catch {
      // analysis failure is non-fatal — fall through to pool-only picking
    }
  }

  // ── (b) Pre-fill from arsenal (highest-priority items first) ──────────
  // Only pick items that are in the scored pool (ensures legality, color,
  // and that the card exists with proper DB metadata).
  const poolByName = new Map<string, (typeof scored)[number]>();
  for (const s of scored) poolByName.set(s.card.name, s);

  // Reserve ~75% of non-land slots for the arsenal. The rest is for the
  // constraint picker to fill with role quotas and high-score extras.
  const arsenalSlotBudget = Math.floor(nonLandTarget * 0.75);
  let arsenalUsed = 0;

  for (const a of arsenal) {
    if (arsenalUsed >= arsenalSlotBudget) break;
    if (pickedNames.has(a.card.name)) continue;
    // Only pre-fill priority >= 55 (staples and above)
    if (a.priority < 55) continue;
    // Must exist in the scored pool (legal, in-color, properly loaded)
    if (!poolByName.has(a.card.name)) continue;
    const cardMax = getMaxQty(a.card);
    if (cardMax <= 0) continue;
    const qty = isCommander ? 1 : Math.min(cardMax, nonLandTarget - totalPicked);
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
  }

  // ── (c) Role-based picker on remaining pool ────────────────────────────
  const remainingPool = scored.filter(s => !pickedNames.has(s.card.name));
  const payoffNames = getPayoffNamesForProfile(commanderProfile);
  const quotas = getRoleQuotas(
    (resolvedStrategy as Archetype) || 'midrange',
    nonLandTarget,
    commanderProfile,
  );

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
  if (wipeNeed > 0 && totalPicked < nonLandTarget) {
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

    let wipesAdded = 0;
    for (const wipe of wipePool) {
      if (wipesAdded >= wipeNeed) break;
      if (totalPicked >= nonLandTarget) break;
      if (pickedNames.has(wipe.name)) continue;
      const qty = getMaxQty(wipe);
      if (qty <= 0) continue;
      picked.push({ card: wipe, quantity: 1, board: 'main' });
      pickedNames.add(wipe.name);
      reasoning.push({ cardName: wipe.name, role: 'board_wipe', reason: `board wipe backfill: ${wipe.name}` });
      totalPicked += 1;
      wipesAdded += 1;
    }
    if (wipesAdded > 0) {
      // Remove the same number of lowest-scored non-essential picks to stay at target
      const removable = picked
        .filter(p => p.board === 'main' && !['commander'].includes(p.board))
        .filter(p => {
          const cats = classifyCard(p.card.name, p.card.oracle_text || '', p.card.type_line || '', p.card.cmc || 0);
          const primary = cats[0] || 'utility';
          return primary === 'utility' || primary === 'synergy';
        })
        .sort((a, b) => (a.card.edhrec_rank || 99999) - (b.card.edhrec_rank || 99999))
        .reverse();

      let removed = 0;
      for (const r of removable) {
        if (removed >= wipesAdded) break;
        // Don't remove the wipes we just added
        if (wipePool.some(w => w.name === r.card.name)) continue;
        const idx = picked.indexOf(r);
        if (idx !== -1) {
          picked.splice(idx, 1);
          pickedNames.delete(r.card.name);
          totalPicked -= r.quantity;
          removed += r.quantity;
        }
      }
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

      // Count how many picked cards satisfy this category
      let currentCount = 0;
      for (const p of picked) {
        const cardText = (p.card.oracle_text || '').toLowerCase();
        const cardType = (p.card.type_line || '').toLowerCase();
        const matchesCat = catPatterns.some((pat) => cardText.includes(pat.toLowerCase()));
        // For spell_cast, also count instants/sorceries by type
        const isSpellType = category === 'spell_cast' && (cardType.includes('instant') || cardType.includes('sorcery'));
        if (matchesCat || isSpellType) {
          currentCount += p.quantity;
        }
      }

      const deficit = minCount - currentCount;
      if (deficit <= 0) continue;

      // Find synergy cards from the pool that weren't picked
      const synergyCandidates = scored.filter(({ card }) => {
        if (pickedNames.has(card.name)) return false;
        const cardText = (card.oracle_text || '').toLowerCase();
        const cardType = (card.type_line || '').toLowerCase();
        const matchesCat = catPatterns.some((pat) => cardText.includes(pat.toLowerCase()));
        const isSpellType = category === 'spell_cast' && (cardType.includes('instant') || cardType.includes('sorcery'));
        return matchesCat || isSpellType;
      });

      // Find the lowest-scored current picks that aren't protected
      const protectedSet = new Set(merged.protectedPatterns.map((p) => p.toLowerCase()));
      const isProtected = (cardName: string) => {
        return protectedSet.has(cardName.toLowerCase())
          || tribalNames.has(cardName);
      };

      // Identify non-essential picks (lowest score, non-protected)
      const displaceable = [...picked]
        .filter((p) => {
          if (p.board !== 'main') return false;
          if (isProtected(p.card.name)) return false;
          // Never displace ramp if below baseline
          const text = (p.card.oracle_text || '').toLowerCase();
          const type = (p.card.type_line || '').toLowerCase();
          const isRamp = (type.includes('artifact') && text.includes('add') && text.includes('mana'))
            || text.includes('search your library for a') && text.includes('land');
          if (isRamp) return false;
          return true;
        })
        .sort((a, b) => {
          const aScore = scored.find((s) => s.card.name === a.card.name)?.score || 0;
          const bScore = scored.find((s) => s.card.name === b.card.name)?.score || 0;
          return aScore - bScore; // lowest score first
        });

      let filled = 0;
      for (const candidate of synergyCandidates) {
        if (filled >= deficit) break;
        if (displaceable.length === 0) break;

        const displaced = displaceable.shift()!;
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

  // ── Step 5: Add lands (via land intelligence) ───────────────────────────
  const basicLandMap: Record<string, string> = {
    W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
  };

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

  // Build non-land card list for mana demand analysis
  const nonLandCards = picked.map(p => ({
    mana_cost: p.card.mana_cost,
    quantity: p.quantity,
  }));

  // Try land intelligence system (requires land_classifications table)
  let landsAdded = 0;
  try {
    const landBase = buildOptimalLandBase({
      colors,
      format: options.format,
      strategy: resolvedStrategy,
      targetLandCount: targetLands,
      tribalTypes: tribalTypesForLands.length > 0 ? tribalTypesForLands : undefined,
      commanderName: commanderCard?.name,
      existingNonLandCards: nonLandCards,
      collectionOnly: useCollection,
      isCommander,
    });

    // Add non-basic lands
    for (const { card, quantity } of landBase.lands) {
      if (pickedNames.has(card.name)) continue;
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
        const actualQty = Math.min(qty, targetLands - landsAdded);
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
      ? Math.min(10, targetLands - 25)
      : numColors === 2
        ? Math.min(18, targetLands - 8)
        : Math.min(24, targetLands - 5);

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

    for (const land of landPool) {
      if (landsAdded >= nonBasicTarget) break;
      if (pickedNames.has(land.name)) continue;

      // Skip fetch lands that can't fetch on-color basics (e.g. Flooded Strand in RG)
      if (!isFetchLandRelevant(land.oracle_text || '', colors)) continue;

      const oracleText = (land.oracle_text || '').toLowerCase();
      if (numColors <= 1) {
        const entersTapped = oracleText.includes('enters the battlefield tapped')
          || oracleText.includes('enters tapped');
        if (entersTapped) continue;
      }

      const cardMax = getMaxQty(land);
      const qty = isCommander ? 1 : Math.min(cardMax, targetLands - landsAdded);
      if (qty <= 0) continue;

      picked.push({ card: land, quantity: qty, board: 'main' });
      pickedNames.add(land.name);
      landsAdded += qty;
    }

    // Fill remaining with basics
    if (colors.length > 0 && landsAdded < targetLands) {
      const remaining = targetLands - landsAdded;
      const perColor = Math.floor(remaining / colors.length);
      const extraForFirst = remaining - perColor * colors.length;

      for (let i = 0; i < colors.length; i++) {
        const basicName = basicLandMap[colors[i]];
        if (!basicName) continue;

        const basic = db.prepare(
          'SELECT * FROM cards WHERE name = ? AND set_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
        ).get(basicName) as DbCard | undefined;

        if (basic) {
          const qty = Math.min(perColor + (i === 0 ? extraForFirst : 0), targetLands - landsAdded);
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

  if (currentTotal < targetSize && colors.length > 0) {
    const deficit = targetSize - currentTotal;
    const perColor = Math.floor(deficit / colors.length);
    const extra = deficit - perColor * colors.length;

    for (let i = 0; i < colors.length; i++) {
      const basicName = basicLandMap[colors[i]];
      if (!basicName) continue;

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

  return {
    cards: picked,
    themes,
    strategy: resolvedStrategy,
    tribalType: tribalType || undefined,
    commanderSynergy: commanderProfile || undefined,
    reasoning,
    buildReport,
  };
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
    ? `AND c.legalities LIKE '%"${getLegalityKey(format)}":"legal"%'`
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
