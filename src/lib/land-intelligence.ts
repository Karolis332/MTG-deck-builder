/**
 * Land Intelligence — scores and selects lands for deck building.
 *
 * Replaces the naive "grab non-basic lands ordered by EDHREC rank" approach
 * with tier-aware, color-demand-weighted, tribal-sensitive land selection.
 *
 * Requires the `land_classifications` table (migration v19) to be populated
 * by running `scripts/classify_lands.py`.
 */

import { getDb } from '@/lib/db';
import { getLegalityKey } from '@/lib/constants';
import type { DbCard } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LandScore {
  card: DbCard;
  score: number;
  tier: number;
  category: string;
  producesColors: string[];
  entersUntapped: boolean;
  reasons: string[];
}

export interface ManaDemand {
  /** Map of color → total pips in all non-land cards */
  colorDemand: Record<string, number>;
  /** The color with the most pips */
  heaviestColor: string;
  /** Ratio of pips per color (0-1) */
  colorIntensity: Record<string, number>;
  /** Total pips across all colors */
  totalPips: number;
}

export interface LandBaseResult {
  lands: Array<{ card: DbCard; quantity: number }>;
  basicDistribution: Record<string, number>;
  totalNonBasic: number;
}

// ── Mana Demand Analysis ────────────────────────────────────────────────────

const PIP_REGEX = /\{([WUBRG])\}/g;

/**
 * Analyze mana demands from non-land cards to determine color intensity.
 */
export function analyzeManaDemands(
  nonLandCards: Array<{ mana_cost: string | null; quantity: number }>
): ManaDemand {
  const colorDemand: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  for (const card of nonLandCards) {
    if (!card.mana_cost) continue;
    let match;
    const regex = new RegExp(PIP_REGEX.source, PIP_REGEX.flags);
    while ((match = regex.exec(card.mana_cost)) !== null) {
      colorDemand[match[1]] += card.quantity;
    }
  }

  const totalPips = Object.values(colorDemand).reduce((s, v) => s + v, 0);
  const colorIntensity: Record<string, number> = {};
  let heaviestColor = 'W';
  let maxPips = 0;

  for (const [color, pips] of Object.entries(colorDemand)) {
    colorIntensity[color] = totalPips > 0 ? pips / totalPips : 0;
    if (pips > maxPips) {
      maxPips = pips;
      heaviestColor = color;
    }
  }

  return { colorDemand, heaviestColor, colorIntensity, totalPips };
}

// ── Land Scoring ─────────────────────────────────────────────────────────────

interface ScoreOptions {
  colors: string[];
  format: string;
  strategy?: string;
  tribalTypes?: string[];
  commanderName?: string;
  userId?: number;
  manaDemand?: ManaDemand;
}

/**
 * Score all available lands for a given deck configuration.
 * Returns scored lands sorted by score descending.
 */
export function scoreLandsForDeck(options: ScoreOptions): LandScore[] {
  const { colors, format, tribalTypes, commanderName, manaDemand } = options;
  const db = getDb();

  // Build legality filter
  const legalityKey = getLegalityKey(format);
  const legalityFilter = `AND json_extract(c.legalities, '$.${legalityKey}') IN ('legal', 'restricted')`;

  // Fetch all non-basic lands with classifications
  const lands = db.prepare(`
    SELECT c.*, lc.land_category, lc.produces_colors, lc.enters_untapped,
           lc.enters_untapped_condition, lc.tribal_types, lc.synergy_tags, lc.tier
    FROM cards c
    LEFT JOIN land_classifications lc ON lc.card_id = c.id
    WHERE c.type_line LIKE '%Land%'
    AND c.type_line NOT LIKE '%Basic%'
    ${legalityFilter}
    ORDER BY lc.tier ASC NULLS LAST, c.edhrec_rank ASC NULLS LAST
    LIMIT 200
  `).all() as Array<DbCard & {
    land_category: string | null;
    produces_colors: string | null;
    enters_untapped: number | null;
    enters_untapped_condition: string | null;
    tribal_types: string | null;
    synergy_tags: string | null;
    tier: number | null;
  }>;

  // Get EDHREC land recommendations for this commander
  const edhrecLands = new Set<string>();
  if (commanderName) {
    const rows = db.prepare(`
      SELECT card_name FROM edhrec_avg_decks
      WHERE commander_name = ? AND card_type = 'land'
    `).all(commanderName) as Array<{ card_name: string }>;
    for (const r of rows) edhrecLands.add(r.card_name.toLowerCase());
  }

  // Get tournament land presence
  const metaLands = new Map<string, number>();
  try {
    const metaRows = db.prepare(`
      SELECT card_name, meta_inclusion_rate FROM meta_card_stats
      WHERE format = ? AND meta_inclusion_rate > 0
    `).all(format) as Array<{ card_name: string; meta_inclusion_rate: number }>;
    for (const r of metaRows) metaLands.set(r.card_name.toLowerCase(), r.meta_inclusion_rate);
  } catch { /* table might not exist */ }

  const scored: LandScore[] = [];

  for (const land of lands) {
    let producesColors: string[] = [];
    try { producesColors = JSON.parse(land.produces_colors || '[]'); } catch { /* empty */ }

    let tribalTypesArr: string[] = [];
    try { tribalTypesArr = JSON.parse(land.tribal_types || '[]'); } catch { /* empty */ }

    const tier = land.tier || 3;
    const entersUntapped = (land.enters_untapped ?? 0) === 1;
    const category = land.land_category || 'utility';
    const reasons: string[] = [];

    // ── Base score from tier ──────────────────────────────────────
    const tierBase = { 1: 100, 2: 70, 3: 40, 4: 15 }[tier] ?? 30;
    let score = tierBase;

    // ── Untapped bonus ───────────────────────────────────────────
    if (entersUntapped) {
      score += 40;
      reasons.push('enters untapped');
    }

    // ── Color match bonus ────────────────────────────────────────
    const matchingColors = producesColors.filter(c => colors.includes(c));
    if (matchingColors.length > 0) {
      score += 30 * matchingColors.length;
      reasons.push(`produces ${matchingColors.join('')}`);

      // Bonus for matching heaviest color
      if (manaDemand && matchingColors.includes(manaDemand.heaviestColor)) {
        const intensity = manaDemand.colorIntensity[manaDemand.heaviestColor] || 0;
        score += Math.round(20 * intensity);
        reasons.push(`matches heavy color (${manaDemand.heaviestColor})`);
      }
    } else if (producesColors.length === 0 || producesColors.every(c => c === 'C')) {
      // Colorless lands are fine but not great
      score += 5;
    } else {
      // Produces ONLY off-colors — hard exclude (e.g. Urborg in UR deck)
      continue;
    }

    // ── Tribal match bonus ───────────────────────────────────────
    if (tribalTypes && tribalTypes.length > 0 && tribalTypesArr.length > 0) {
      const tribalMatch = tribalTypesArr.some(t =>
        tribalTypes.some(dt => dt.toLowerCase() === t.toLowerCase())
      );
      if (tribalMatch) {
        score += 50;
        reasons.push('tribal synergy');
      }
    }

    // Special tribal lands by category
    if (category === 'tribal' && tribalTypes && tribalTypes.length > 0) {
      score += 30;
      reasons.push('tribal land');
    }

    // ── EDHREC recommendation bonus ──────────────────────────────
    if (edhrecLands.has(land.name.toLowerCase())) {
      score += 20;
      reasons.push('EDHREC recommended');
    }

    // ── Tournament presence bonus ────────────────────────────────
    const metaRate = metaLands.get(land.name.toLowerCase());
    if (metaRate && metaRate > 0.05) {
      score += Math.round(15 * Math.min(metaRate / 0.3, 1));
      reasons.push(`meta ${Math.round(metaRate * 100)}%`);
    }

    // ── EDHREC rank as tiebreaker ────────────────────────────────
    if (land.edhrec_rank && land.edhrec_rank < 5000) {
      score += Math.round(10 * (1 - land.edhrec_rank / 5000));
    }

    scored.push({
      card: land,
      score,
      tier,
      category,
      producesColors,
      entersUntapped,
      reasons,
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ── Optimal Land Base Builder ────────────────────────────────────────────────

const BASIC_LAND_MAP: Record<string, string> = {
  W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
};

interface BuildOptions {
  colors: string[];
  format: string;
  strategy?: string;
  targetLandCount: number;
  tribalTypes?: string[];
  commanderName?: string;
  existingNonLandCards?: Array<{ mana_cost: string | null; quantity: number }>;
  userId?: number;
  collectionOnly?: boolean;
  isCommander?: boolean;
}

/**
 * Build an optimal land base for a deck.
 * Returns selected non-basic lands and basic land distribution
 * based on color demands.
 */
export function buildOptimalLandBase(options: BuildOptions): LandBaseResult {
  const {
    colors, format, strategy, targetLandCount, tribalTypes,
    commanderName, existingNonLandCards, userId, isCommander,
  } = options;

  // Analyze mana demands if we have the non-land cards
  const manaDemand = existingNonLandCards
    ? analyzeManaDemands(existingNonLandCards)
    : undefined;

  // Score all available lands
  const scored = scoreLandsForDeck({
    colors, format, strategy, tribalTypes, commanderName, userId, manaDemand,
  });

  // Determine non-basic target based on color count
  const numColors = colors.length;
  const nonBasicTarget = numColors <= 1
    ? Math.min(4, targetLandCount)
    : numColors === 2
      ? Math.min(14, targetLandCount - 8)
      : numColors === 3
        ? Math.min(22, targetLandCount - 5)
        : Math.min(28, targetLandCount - 3);

  // Select non-basic lands
  const selectedLands: Array<{ card: DbCard; quantity: number }> = [];
  const selectedNames = new Set<string>();
  let nonBasicCount = 0;

  for (const scored_land of scored) {
    if (nonBasicCount >= nonBasicTarget) break;
    if (selectedNames.has(scored_land.card.name)) continue;
    if (scored_land.score < 20) continue; // Skip very low scoring lands

    const qty = isCommander ? 1 : Math.min(4, nonBasicTarget - nonBasicCount);
    selectedLands.push({ card: scored_land.card, quantity: qty });
    selectedNames.add(scored_land.card.name);
    nonBasicCount += qty;
  }

  // Calculate basic land distribution based on color demands
  const basicDistribution: Record<string, number> = {};
  const remainingSlots = targetLandCount - nonBasicCount;

  if (colors.length > 0 && remainingSlots > 0) {
    if (manaDemand && manaDemand.totalPips > 0) {
      // Distribute proportionally to color intensity
      let distributed = 0;
      const sortedColors = [...colors].sort((a, b) =>
        (manaDemand.colorIntensity[b] || 0) - (manaDemand.colorIntensity[a] || 0)
      );

      for (let i = 0; i < sortedColors.length; i++) {
        const color = sortedColors[i];
        const basicName = BASIC_LAND_MAP[color];
        if (!basicName) continue;

        if (i === sortedColors.length - 1) {
          // Last color gets remainder to avoid rounding issues
          basicDistribution[basicName] = remainingSlots - distributed;
        } else {
          const share = Math.round(remainingSlots * (manaDemand.colorIntensity[color] || 0));
          const qty = Math.max(1, Math.min(share, remainingSlots - distributed - (sortedColors.length - i - 1)));
          basicDistribution[basicName] = qty;
          distributed += qty;
        }
      }
    } else {
      // Even distribution
      const perColor = Math.floor(remainingSlots / colors.length);
      const extra = remainingSlots - perColor * colors.length;

      for (let i = 0; i < colors.length; i++) {
        const basicName = BASIC_LAND_MAP[colors[i]];
        if (basicName) {
          basicDistribution[basicName] = perColor + (i === 0 ? extra : 0);
        }
      }
    }
  }

  return {
    lands: selectedLands,
    basicDistribution,
    totalNonBasic: nonBasicCount,
  };
}
