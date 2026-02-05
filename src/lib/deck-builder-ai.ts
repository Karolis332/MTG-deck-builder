import { getDb } from './db';
import type { DbCard, AISuggestion } from './types';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE } from './constants';
import { getCardGlobalScore, getMetaAdjustedScore } from './global-learner';
import { getEdhrecRecommendations, getEdhrecThemeCards } from './edhrec';
import type { EdhrecRecommendation } from './edhrec';
import { getTemplate, getScaledCurve, getColorAdjustment, isImpulseDraw, mergeWithCommanderProfile } from './deck-templates';
import { analyzeCommander } from './commander-synergy';
import type { CommanderSynergyProfile } from './commander-synergy';

// ── Commander synergy text patterns for card scoring ────────────────────────
// Maps synergy categories from commander-synergy.ts to oracle text substrings

const SYNERGY_REQUIREMENTS_MAP = {
  exile_cast: ['exile the top', 'you may play', 'you may cast', 'from exile'],
  exile_enter: ['exile', 'return', 'to the battlefield', 'flicker', 'blink'],
  spell_cast: ['instant', 'sorcery', 'magecraft', 'prowess'],
  creature_dies: ['whenever', 'dies', 'sacrifice', 'death'],
  creature_etb: ['enters the battlefield', 'enters'],
  attack_trigger: ['haste', 'extra combat', 'additional combat', 'menace', 'trample', 'can\'t be blocked'],
  artifact_synergy: ['artifact', 'treasure', 'affinity'],
  enchantment_synergy: ['enchantment', 'aura', 'constellation'],
  lifegain: ['lifelink', 'gain life', 'whenever you gain life'],
  counters: ['+1/+1 counter', 'proliferate', 'put a counter'],
  graveyard: ['from your graveyard', 'mill', 'reanimate', 'return from'],
  token_generation: ['create a', 'create two', 'token', 'populate'],
} as const;

// ── Synergy keyword groups ──────────────────────────────────────────────────
// Cards sharing keywords within a group have natural synergy

const SYNERGY_GROUPS: Record<string, string[]> = {
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

function detectDeckThemes(cards: DbCard[]): string[] {
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

    // Look up the card by exact name in our local DB
    const row = db.prepare(
      `SELECT c.* FROM cards c
       WHERE c.name = ? COLLATE NOCASE
       AND c.type_line NOT LIKE '%Land%'
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
}

interface BuildResult {
  cards: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }>;
  themes: string[];
  strategy: string;
  tribalType?: string;
  commanderSynergy?: CommanderSynergyProfile;
}

export interface ScoredCandidatePoolResult {
  pool: Array<{ card: DbCard; score: number }>;
  themes: string[];
  resolvedStrategy: string;
  tribalType: string | null;
  tribalNames: Set<string>;
  commanderProfile: CommanderSynergyProfile | null;
  commanderCard: DbCard | null;
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
}

/**
 * Build a scored candidate pool of nonland cards for deck construction.
 * Reusable by both autoBuildDeck() and Claude-powered deck building.
 */
export async function buildScoredCandidatePool(options: BuildOptions): Promise<ScoredCandidatePoolResult> {
  const db = getDb();
  const { format, strategy, useCollection = false, commanderName } = options;

  // If commander format, derive colors from commander's color identity
  let colors = options.colors;
  let commanderCard: DbCard | null = null;
  if (commanderName) {
    const cmdCard = db.prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE').get(commanderName) as DbCard | undefined;
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

  // Only include cards that are legal in the format
  const legalityFilter = format
    ? `AND c.legalities LIKE '%"${format}":"legal"%'`
    : '';

  // Exclude commander from the 99
  const commanderExclude = commanderName
    ? `AND c.name != '${commanderName.replace(/'/g, "''")}'`
    : '';

  // ── Collection quantity map ──────────────────────────────────────────────
  const ownedQty = new Map<string, number>();
  if (useCollection) {
    const rows = db.prepare(
      `SELECT card_id, SUM(quantity) as total FROM collection GROUP BY card_id`
    ).all() as Array<{ card_id: string; total: number }>;
    for (const row of rows) {
      ownedQty.set(row.card_id, row.total);
    }
  }

  const collectionJoin = useCollection
    ? `LEFT JOIN collection col ON c.id = col.card_id`
    : '';
  const collectionOrder = useCollection
    ? `CASE WHEN col.id IS NOT NULL THEN 0 ELSE 1 END,`
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
    WHERE c.type_line NOT LIKE '%Land%'
    ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
    ${legalityFilter}
    ${commanderExclude}
    ORDER BY ${collectionOrder} c.edhrec_rank ASC NULLS LAST
    LIMIT 300
  `;

  const dbPool = db.prepare(poolQuery).all() as DbCard[];

  // Merge: EDHREC cards first, then tribal cards, then DB pool
  const seenNames = new Set<string>();
  const pool: DbCard[] = [];

  // EDHREC cards go first — these are specifically recommended for this commander
  for (const card of edhrecResolvedCards) {
    if (!seenNames.has(card.name)) {
      seenNames.add(card.name);
      pool.push(card);
    }
  }

  // Tribal cards next — creatures and synergy cards of the detected type
  for (const card of tribalCards) {
    if (!seenNames.has(card.name)) {
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
      WHERE c.type_line NOT LIKE '%Land%'
      AND (${synergyConditions})
      ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
      ${legalityFilter}
      ${commanderExclude}
      ORDER BY c.edhrec_rank ASC NULLS LAST
      LIMIT 80
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
         LIMIT 200`
      ).all(commanderName) as Array<{ card_name: string; predicted_score: number }>;
      for (const row of mlRows) {
        mlScoreMap.set(row.card_name, row.predicted_score);
      }
    } catch {
      // Table may not exist yet
    }
  }

  // ── Step 3: Score cards ─────────────────────────────────────────────────
  // Key change: EDHREC per-commander synergy score is now the dominant signal
  // for commander format decks, replacing the generic edhrec_rank

  const scored = pool.map((card) => {
    let score = 0;

    // ── ML personalization bonus (from trained scikit-learn model) ──
    const mlScore = mlScoreMap.get(card.name);
    if (mlScore !== undefined) {
      // ML predicted win rate (0-1) scaled to 0-25 bonus
      score += Math.max(0, (mlScore - 0.4) * 40);
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

    // ── Collection bonus ──
    if (useCollection) {
      const owned = ownedQty.get(card.id) || 0;
      if (owned > 0) {
        score += 30;
      } else {
        score -= 40;
      }
    }

    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    pool: scored,
    themes,
    resolvedStrategy,
    tribalType,
    tribalNames,
    commanderProfile,
    commanderCard,
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
  };
}

export async function autoBuildDeck(options: BuildOptions): Promise<BuildResult> {
  const db = getDb();
  const poolResult = await buildScoredCandidatePool(options);
  const {
    pool: scored, themes, resolvedStrategy, tribalType, tribalNames,
    commanderProfile, landTarget: targetLands, nonLandTarget,
    isCommander, maxCopies, colors, ownedQty, useCollection,
    colorExcludeFilter, legalityFilter, commanderExclude,
    collectionJoin, collectionOrder,
  } = poolResult;

  // Step 4: Pick cards respecting mana curve (from archetype templates)
  const idealCurve = getScaledCurve(resolvedStrategy, nonLandTarget);

  const curveCounts: Record<number, number> = {};
  const picked: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }> = [];
  const pickedNames = new Set<string>();
  let totalPicked = 0;

  function getMaxQty(card: DbCard): number {
    const formatMax = isCommander ? 1 : maxCopies;
    if (!useCollection) return formatMax;
    const owned = ownedQty.get(card.id) || 0;
    return owned > 0 ? Math.min(formatMax, owned) : formatMax;
  }

  // First pass: fill curve slots
  for (const { card } of scored) {
    if (totalPicked >= nonLandTarget) break;
    if (pickedNames.has(card.name)) continue;

    const bucket = Math.min(Math.floor(card.cmc), 7);
    const idealForBucket = idealCurve[bucket] || 1;
    const currentForBucket = curveCounts[bucket] || 0;

    if (currentForBucket >= idealForBucket) continue;

    const cardMax = getMaxQty(card);
    const qty = Math.min(cardMax, idealForBucket - currentForBucket, nonLandTarget - totalPicked);
    if (qty <= 0) continue;

    picked.push({ card, quantity: qty, board: 'main' });
    pickedNames.add(card.name);
    curveCounts[bucket] = currentForBucket + qty;
    totalPicked += qty;
  }

  // Second pass: fill remaining slots with best available
  for (const { card } of scored) {
    if (totalPicked >= nonLandTarget) break;
    if (pickedNames.has(card.name)) continue;

    const cardMax = getMaxQty(card);
    const qty = Math.min(cardMax, nonLandTarget - totalPicked);
    if (qty <= 0) continue;

    picked.push({ card, quantity: qty, board: 'main' });
    pickedNames.add(card.name);
    totalPicked += qty;
  }

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

  // ── Step 5: Add lands ─────────────────────────────────────────────────────
  const basicLandMap: Record<string, string> = {
    W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
  };

  const numColors = colors.length;
  const nonBasicTarget = numColors <= 1
    ? Math.min(4, targetLands)
    : numColors === 2
      ? Math.min(12, targetLands - 8)
      : Math.min(20, targetLands - 5);

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
    LIMIT 60
  `).all() as DbCard[];

  let landsAdded = 0;

  for (const land of landPool) {
    if (landsAdded >= nonBasicTarget) break;
    if (pickedNames.has(land.name)) continue;

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

  // Fill remaining land slots with basics
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

  return {
    cards: picked,
    themes,
    strategy: resolvedStrategy,
    tribalType: tribalType || undefined,
    commanderSynergy: commanderProfile || undefined,
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

  const colorFilter = colors.length > 0
    ? colors.map((c) => `c.color_identity LIKE '%${c}%'`).join(' OR ')
    : '1=1';

  // Color exclusion: don't suggest off-color cards
  const excludeColors = ['W', 'U', 'B', 'R', 'G'].filter((c) => !colors.includes(c));
  const excludeFilter = excludeColors
    .map((c) => `c.color_identity NOT LIKE '%${c}%'`)
    .join(' AND ');

  const legalityFilter = format
    ? `AND c.legalities LIKE '%"${format}":"legal"%'`
    : '';

  // ── Load match insights if we have a deck ID ──────────────────────────
  const insightData = deckId ? loadDeckInsights(db, deckId) : null;

  const synergyFilter = buildSynergyQuery(themes);
  const idPlaceholders = Array.from(existingIds).map(() => '?').join(',') || "''";

  const answerFilter = insightData?.recurringThreats.length
    ? `OR (c.oracle_text LIKE '%destroy%' OR c.oracle_text LIKE '%exile%' OR c.oracle_text LIKE '%counter target%')`
    : '';

  const collectionJoin = collectionOnly
    ? 'INNER JOIN collection col ON c.id = col.card_id'
    : '';

  const query = `
    SELECT c.* FROM cards c
    ${collectionJoin}
    WHERE c.type_line NOT LIKE '%Land%'
    AND (${colorFilter})
    ${excludeFilter ? `AND ${excludeFilter}` : ''}
    ${legalityFilter}
    AND (1=1 ${synergyFilter} ${answerFilter})
    AND c.id NOT IN (${idPlaceholders})
    ORDER BY c.edhrec_rank ASC NULLS LAST
    LIMIT 50
  `;

  const candidates = db.prepare(query).all(...Array.from(existingIds)) as DbCard[];

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
