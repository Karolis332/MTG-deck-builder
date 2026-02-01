import { getDb } from './db';
import type { DbCard, AISuggestion } from './types';
import { DEFAULT_LAND_COUNT, DEFAULT_DECK_SIZE } from './constants';

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

// ── Main deck builder ───────────────────────────────────────────────────────

interface BuildOptions {
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
}

export function autoBuildDeck(options: BuildOptions): BuildResult {
  const db = getDb();
  const { format, colors, strategy, useCollection = false } = options;

  const targetSize = DEFAULT_DECK_SIZE[format] || DEFAULT_DECK_SIZE.default;
  const targetLands = DEFAULT_LAND_COUNT[format] || DEFAULT_LAND_COUNT.default;
  const nonLandTarget = targetSize - targetLands;
  const isCommander = format === 'commander' || format === 'brawl';
  const maxCopies = isCommander ? 1 : 4;

  // Build color filter
  const colorFilter = colors.length > 0
    ? colors.map((c) => `c.color_identity LIKE '%${c}%'`).join(' OR ')
    : '1=1';

  // Only include cards that are legal in the format
  const legalityFilter = format
    ? `AND c.legalities LIKE '%"${format}":"legal"%'`
    : '';

  // Collection join (prefer owned cards)
  const collectionJoin = useCollection
    ? `LEFT JOIN collection col ON c.id = col.card_id`
    : '';
  const collectionOrder = useCollection
    ? `CASE WHEN col.id IS NOT NULL THEN 0 ELSE 1 END,`
    : '';

  // Step 1: Get a pool of strong non-land cards in these colors
  const poolQuery = `
    SELECT DISTINCT c.* FROM cards c
    ${collectionJoin}
    WHERE c.type_line NOT LIKE '%Land%'
    AND (${colorFilter})
    AND c.color_identity NOT LIKE '%${colors.includes('W') ? '' : 'W'}%'
    ${colors.includes('W') ? '' : "AND c.color_identity NOT LIKE '%W%'"}
    ${colors.includes('U') ? '' : "AND c.color_identity NOT LIKE '%U%'"}
    ${colors.includes('B') ? '' : "AND c.color_identity NOT LIKE '%B%'"}
    ${colors.includes('R') ? '' : "AND c.color_identity NOT LIKE '%R%'"}
    ${colors.includes('G') ? '' : "AND c.color_identity NOT LIKE '%G%'"}
    ${legalityFilter}
    ORDER BY ${collectionOrder} c.edhrec_rank ASC NULLS LAST
    LIMIT 200
  `;

  const pool = db.prepare(poolQuery).all() as DbCard[];

  // Step 2: Detect themes from the initial pool's top cards
  const themes = detectDeckThemes(pool.slice(0, 40));
  const resolvedStrategy = strategy || (themes.includes('aggro') ? 'aggro' : themes.includes('control') ? 'control' : 'midrange');

  // Step 3: Score cards by synergy with detected themes + strategy fit
  const scored = pool.map((card) => {
    let score = 0;

    // EDHREC rank score (lower rank = better)
    if (card.edhrec_rank !== null) {
      score += Math.max(0, 100 - card.edhrec_rank / 200);
    }

    // Theme synergy bonus
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

    // Strategy fit
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

    // Collection bonus
    if (useCollection) {
      const inCollection = db
        .prepare('SELECT 1 FROM collection WHERE card_id = ? LIMIT 1')
        .get(card.id);
      if (inCollection) score += 25;
    }

    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Step 4: Pick cards respecting mana curve
  const idealCurve: Record<number, number> = resolvedStrategy === 'aggro'
    ? { 1: 8, 2: 10, 3: 8, 4: 5, 5: 2, 6: 1 }
    : resolvedStrategy === 'control'
      ? { 1: 3, 2: 6, 3: 7, 4: 6, 5: 4, 6: 3, 7: 2 }
      : { 1: 5, 2: 8, 3: 8, 4: 6, 5: 4, 6: 2, 7: 1 };

  const curveCounts: Record<number, number> = {};
  const picked: Array<{ card: DbCard; quantity: number; board: 'main' | 'sideboard' }> = [];
  const pickedNames = new Set<string>();
  let totalPicked = 0;

  // First pass: fill curve slots
  for (const { card } of scored) {
    if (totalPicked >= nonLandTarget) break;
    if (pickedNames.has(card.name)) continue;

    const bucket = Math.min(Math.floor(card.cmc), 7);
    const idealForBucket = idealCurve[bucket] || 1;
    const currentForBucket = curveCounts[bucket] || 0;

    if (currentForBucket >= idealForBucket) continue;

    const qty = isCommander ? 1 : Math.min(maxCopies, idealForBucket - currentForBucket, nonLandTarget - totalPicked);
    picked.push({ card, quantity: qty, board: 'main' });
    pickedNames.add(card.name);
    curveCounts[bucket] = currentForBucket + qty;
    totalPicked += qty;
  }

  // Second pass: fill remaining slots with best available
  for (const { card } of scored) {
    if (totalPicked >= nonLandTarget) break;
    if (pickedNames.has(card.name)) continue;

    const qty = isCommander ? 1 : Math.min(maxCopies, nonLandTarget - totalPicked);
    picked.push({ card, quantity: qty, board: 'main' });
    pickedNames.add(card.name);
    totalPicked += qty;
  }

  // Step 5: Add lands
  const landPool = db.prepare(`
    SELECT c.* FROM cards c
    ${collectionJoin}
    WHERE c.type_line LIKE '%Land%'
    AND c.type_line NOT LIKE '%Basic%'
    AND (${colorFilter})
    ${legalityFilter}
    ORDER BY ${collectionOrder} c.edhrec_rank ASC NULLS LAST
    LIMIT 50
  `).all() as DbCard[];

  let landsAdded = 0;
  for (const land of landPool) {
    if (landsAdded >= targetLands - (colors.length > 0 ? 6 : targetLands)) break;
    if (pickedNames.has(land.name)) continue;

    const qty = isCommander ? 1 : Math.min(4, targetLands - landsAdded);
    picked.push({ card: land, quantity: qty, board: 'main' });
    pickedNames.add(land.name);
    landsAdded += qty;
  }

  // Fill remaining land slots with basics
  const basicLandMap: Record<string, string> = {
    W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
  };

  if (colors.length > 0 && landsAdded < targetLands) {
    const remaining = targetLands - landsAdded;
    const perColor = Math.ceil(remaining / colors.length);

    for (const color of colors) {
      const basicName = basicLandMap[color];
      if (!basicName) continue;

      const basic = db.prepare(
        'SELECT * FROM cards WHERE name = ? AND set_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
      ).get(basicName) as DbCard | undefined;

      if (basic) {
        const qty = Math.min(perColor, targetLands - landsAdded);
        if (qty > 0) {
          picked.push({ card: basic, quantity: qty, board: 'main' });
          landsAdded += qty;
        }
      }
    }
  }

  // Step 6: Build sideboard (non-commander, top-scored cards not in main)
  if (!isCommander) {
    let sideCount = 0;
    for (const { card } of scored) {
      if (sideCount >= 15) break;
      if (pickedNames.has(card.name)) continue;

      // Prefer interaction for sideboard
      const text = (card.oracle_text || '').toLowerCase();
      const isInteraction = text.includes('counter target') || text.includes('destroy')
        || text.includes('exile') || text.includes('discard')
        || text.includes('protection') || text.includes('hexproof');

      if (isInteraction || sideCount < 10) {
        picked.push({ card, quantity: isCommander ? 1 : 2, board: 'sideboard' });
        pickedNames.add(card.name);
        sideCount += 2;
      }
    }
  }

  return {
    cards: picked,
    themes,
    strategy: resolvedStrategy,
  };
}

// ── Enhanced suggestions using synergy detection ────────────────────────────

export function getSynergySuggestions(
  deckCards: Array<{ quantity: number; board: string } & DbCard>,
  format: string
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

  const synergyFilter = buildSynergyQuery(themes);
  const idPlaceholders = Array.from(existingIds).map(() => '?').join(',') || "''";

  const query = `
    SELECT c.* FROM cards c
    WHERE c.type_line NOT LIKE '%Land%'
    AND (${colorFilter})
    ${excludeFilter ? `AND ${excludeFilter}` : ''}
    ${legalityFilter}
    ${synergyFilter}
    AND c.id NOT IN (${idPlaceholders})
    ORDER BY c.edhrec_rank ASC NULLS LAST
    LIMIT 30
  `;

  const candidates = db.prepare(query).all(...Array.from(existingIds)) as DbCard[];

  const suggestions: AISuggestion[] = [];
  for (const card of candidates) {
    if (existingNames.has(card.name)) continue;

    // Determine why this card is suggested
    const text = (card.oracle_text || '').toLowerCase();
    const matchedThemes: string[] = [];

    for (const theme of themes) {
      const patterns = SYNERGY_GROUPS[theme];
      if (!patterns) continue;
      if (patterns.some((p) => text.includes(p))) {
        matchedThemes.push(theme);
      }
    }

    const reason = matchedThemes.length > 0
      ? `Synergizes with your ${matchedThemes.join(' + ')} theme${matchedThemes.length > 1 ? 's' : ''}`
      : card.edhrec_rank !== null && card.edhrec_rank < 1000
        ? 'Top-ranked staple in this color combination'
        : 'Strong card for this archetype';

    suggestions.push({
      card,
      reason,
      score: 80 + matchedThemes.length * 5,
    });
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}
