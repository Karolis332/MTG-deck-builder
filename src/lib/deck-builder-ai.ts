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
  const { format, strategy, useCollection = false, commanderName } = options;

  // If commander format, derive colors from commander's color identity
  let colors = options.colors;
  if (commanderName) {
    const cmdCard = db.prepare('SELECT * FROM cards WHERE name = ? COLLATE NOCASE').get(commanderName) as DbCard | undefined;
    if (cmdCard?.color_identity) {
      try {
        colors = JSON.parse(cmdCard.color_identity);
      } catch {}
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
  // When useCollection is true, build a map of card_id → total owned quantity
  const ownedQty = new Map<string, number>();
  if (useCollection) {
    const rows = db.prepare(
      `SELECT card_id, SUM(quantity) as total FROM collection GROUP BY card_id`
    ).all() as Array<{ card_id: string; total: number }>;
    for (const row of rows) {
      ownedQty.set(row.card_id, row.total);
    }
  }

  // Collection ordering: owned first, then by quantity descending
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
    ${colorExcludeFilter ? `AND ${colorExcludeFilter}` : ''}
    ${legalityFilter}
    ${commanderExclude}
    ORDER BY ${collectionOrder} c.edhrec_rank ASC NULLS LAST
    LIMIT 300
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

    // Collection bonus — owned cards score much higher, unowned much lower
    if (useCollection) {
      const owned = ownedQty.get(card.id) || 0;
      if (owned > 0) {
        score += 30; // strong preference for owned cards
      } else {
        score -= 40; // significant penalty for unowned cards
      }
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

  // Helper: determine max quantity for a card (respects collection if enabled)
  function getMaxQty(card: DbCard): number {
    const formatMax = isCommander ? 1 : maxCopies;
    if (!useCollection) return formatMax;
    const owned = ownedQty.get(card.id) || 0;
    // Allow unowned cards as fallback but cap at 0 if strict collection mode
    // For now, still allow unowned but they scored poorly above
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

  // ── Step 5: Add lands ─────────────────────────────────────────────────────
  // Land strategy depends heavily on number of colors:
  //   1 color  → mostly basics, 2-4 utility lands max
  //   2 colors → ~8-12 non-basics (duals, fastlands, painlands), rest basics
  //   3+ colors → maximize non-basics for fixing

  const basicLandMap: Record<string, string> = {
    W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
  };

  const numColors = colors.length;
  // How many non-basic land slots to target based on color count
  const nonBasicTarget = numColors <= 1
    ? Math.min(4, targetLands)          // mono: at most 4 utility lands
    : numColors === 2
      ? Math.min(12, targetLands - 8)   // 2-color: ~12 duals, keep at least 8 basics
      : Math.min(20, targetLands - 5);  // 3+: heavy on fixing, at least 5 basics

  // Fetch non-basic lands, prioritizing untapped ones
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

  // Add non-basic lands up to the target
  for (const land of landPool) {
    if (landsAdded >= nonBasicTarget) break;
    if (pickedNames.has(land.name)) continue;

    // For mono-color, skip taplands entirely — only untapped utility lands
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

  // Fill remaining land slots with basics — split evenly across colors
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

  // Step 6: Build sideboard (non-commander, top-scored cards not in main)
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
