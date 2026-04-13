/**
 * Collection Coverage Module — "how much of the optimal deck do you own?"
 *
 * Pure function module. Reads two SQLite tables synchronously
 * (commander_card_stats + collection) and returns plain objects.
 * No writes, no network — trivially testable with injected mock data.
 *
 * Two coverage metrics (Pitfall 6 — avoid misleading single number):
 *   1. Overall coverage: % of top N recommended cards you own
 *   2. Key-card coverage: % of high-inclusion (40%+) "must-have" cards you own
 *
 * Upgrade suggestions: ranked add/cut pairs. "Cut your lowest-scoring card
 * in this role bucket, add the highest-scoring missing card."
 */

import { getDb, getCommanderCardStats, getEdhrecAvgDeck } from './db';
import { classifyCard, type CardCategory } from './card-classifier';

// ── Types ────────────────────────────────────────────────────────────────

export interface CoverageCard {
  cardName: string;
  inclusionRate: number;
  synergyScore: number;
  owned: boolean;
  ownedQty: number;
  role: CardCategory | 'utility';
}

export interface UpgradePair {
  add: {
    cardName: string;
    inclusionRate: number;
    synergyScore: number;
    role: CardCategory | 'utility';
  };
  cut: {
    cardName: string;
    role: CardCategory | 'utility';
    reason: string;
  } | null; // null if the deck has open slots
  impactEstimate: number; // 0-100, higher = bigger improvement
}

export interface CoverageResult {
  /** Overall coverage: fraction of top recommended cards owned (0-1) */
  overallPct: number;
  /** Key-card coverage: fraction of must-haves (40%+ inclusion) owned (0-1) */
  keyCardPct: number;
  /** Total recommended cards analyzed */
  totalRecommended: number;
  /** How many of those the user owns */
  totalOwned: number;
  /** Key cards (40%+ inclusion rate) */
  keyCardTotal: number;
  keyCardOwned: number;
  /** Detailed card list */
  cards: CoverageCard[];
  /** Top cards the user is missing (sorted by impact) */
  missing: CoverageCard[];
  /** Cards the user owns that are in the recommended pool */
  owned: CoverageCard[];
  /** Ranked upgrade suggestions: add/cut pairs */
  upgrades: UpgradePair[];
}

// ── Main function ────────────────────────────────────────────────────────

/**
 * Compute collection coverage for a commander deck.
 *
 * @param commanderName — exact commander name
 * @param userId — for collection lookup
 * @param deckCardNames — current deck card names (for cut suggestions)
 * @param topN — how many recommended cards to analyze (default 80)
 */
export function computeCollectionCoverage(
  commanderName: string,
  userId: number,
  deckCardNames: string[] = [],
  topN: number = 80,
): CoverageResult | null {
  const db = getDb();

  // ── 1. Get community recommended cards ──────────────────────────────
  const cmdrStats = getCommanderCardStats(commanderName, topN);
  if (cmdrStats.length === 0) return null;

  // Build EDHREC set for secondary signal
  const edhrecSet = new Set<string>();
  try {
    const edhrecAvg = getEdhrecAvgDeck(commanderName);
    for (const e of edhrecAvg) edhrecSet.add(e.cardName.toLowerCase());
  } catch {
    // Table may not exist
  }

  // ── 2. Batch-lookup collection ownership ────────────────────────────
  // Single IN query — avoids N+1 (Anti-Pattern 3)
  const cardNames = cmdrStats.map(s => s.cardName);
  const placeholders = cardNames.map(() => '?').join(',');

  let ownedMap: Map<string, number>;
  try {
    const rows = db.prepare(`
      SELECT c.name, COALESCE(SUM(col.quantity), 0) as qty
      FROM cards c
      LEFT JOIN collection col ON col.card_id = c.id AND col.user_id = ?
      WHERE c.name IN (${placeholders})
      GROUP BY c.name
    `).all(userId, ...cardNames) as Array<{ name: string; qty: number }>;

    ownedMap = new Map(rows.map(r => [r.name.toLowerCase(), r.qty]));
  } catch {
    ownedMap = new Map();
  }

  // ── 3. Classify and build coverage cards ────────────────────────────
  // Look up oracle text for role classification
  let cardMetaMap: Map<string, { oracle_text: string; type_line: string; cmc: number }>;
  try {
    const metaRows = db.prepare(`
      SELECT name, oracle_text, type_line, cmc
      FROM cards
      WHERE name IN (${placeholders})
    `).all(...cardNames) as Array<{
      name: string;
      oracle_text: string;
      type_line: string;
      cmc: number;
    }>;
    cardMetaMap = new Map(metaRows.map(r => [r.name.toLowerCase(), r]));
  } catch {
    cardMetaMap = new Map();
  }

  const cards: CoverageCard[] = [];
  let totalOwned = 0;
  let keyCardTotal = 0;
  let keyCardOwned = 0;

  // Filter out basic lands — they don't count for coverage
  const basicLands = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);

  for (const stat of cmdrStats) {
    if (basicLands.has(stat.cardName.toLowerCase())) continue;

    const qty = ownedMap.get(stat.cardName.toLowerCase()) ?? 0;
    const isOwned = qty > 0;

    // Classify the card's role
    const meta = cardMetaMap.get(stat.cardName.toLowerCase());
    let role: CardCategory | 'utility' = 'utility';
    if (meta) {
      const cats = classifyCard(
        stat.cardName, meta.oracle_text || '', meta.type_line || '', meta.cmc || 0,
      );
      if (cats.length > 0) role = cats[0];
    }

    const card: CoverageCard = {
      cardName: stat.cardName,
      inclusionRate: stat.inclusionRate,
      synergyScore: stat.synergyScore,
      owned: isOwned,
      ownedQty: qty,
      role,
    };
    cards.push(card);

    if (isOwned) totalOwned++;

    // Key cards: 40%+ inclusion rate
    if (stat.inclusionRate >= 0.4) {
      keyCardTotal++;
      if (isOwned) keyCardOwned++;
    }
  }

  const totalRecommended = cards.length;
  const overallPct = totalRecommended > 0 ? totalOwned / totalRecommended : 0;
  const keyCardPct = keyCardTotal > 0 ? keyCardOwned / keyCardTotal : 0;

  const missing = cards.filter(c => !c.owned)
    .sort((a, b) => b.inclusionRate - a.inclusionRate);
  const owned = cards.filter(c => c.owned)
    .sort((a, b) => b.inclusionRate - a.inclusionRate);

  // ── 4. Generate upgrade suggestions ─────────────────────────────────
  const upgrades = generateUpgrades(missing, deckCardNames, cards, cmdrStats);

  return {
    overallPct,
    keyCardPct,
    totalRecommended,
    totalOwned,
    keyCardTotal,
    keyCardOwned,
    cards,
    missing,
    owned,
    upgrades,
  };
}

// ── Upgrade pair generation ──────────────────────────────────────────────

function generateUpgrades(
  missing: CoverageCard[],
  deckCardNames: string[],
  allCards: CoverageCard[],
  cmdrStats: Array<{ cardName: string; inclusionRate: number; synergyScore: number }>,
): UpgradePair[] {
  if (missing.length === 0 || deckCardNames.length === 0) return [];

  // Build a map of deck cards with their community inclusion rates
  const cmdrStatsMap = new Map(
    cmdrStats.map(s => [s.cardName.toLowerCase(), s])
  );

  // Score each deck card — low community inclusion = good cut candidate
  const deckScored = deckCardNames
    .filter(name => {
      const lower = name.toLowerCase();
      // Don't suggest cutting basic lands or the commander
      return !['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(lower);
    })
    .map(name => {
      const stat = cmdrStatsMap.get(name.toLowerCase());
      const coverage = allCards.find(c => c.cardName.toLowerCase() === name.toLowerCase());
      return {
        cardName: name,
        inclusionRate: stat?.inclusionRate ?? 0,
        synergyScore: stat?.synergyScore ?? 0,
        role: coverage?.role ?? 'utility' as CardCategory | 'utility',
      };
    })
    .sort((a, b) => a.inclusionRate - b.inclusionRate); // worst cards first

  const upgrades: UpgradePair[] = [];
  const usedCuts = new Set<string>();

  for (const addCard of missing.slice(0, 15)) {
    // Find the best cut: lowest-inclusion card in the same role bucket,
    // or the overall lowest-inclusion card if no role match
    let cut = deckScored.find(
      d => d.role === addCard.role && !usedCuts.has(d.cardName.toLowerCase()),
    );
    if (!cut) {
      cut = deckScored.find(d => !usedCuts.has(d.cardName.toLowerCase()));
    }

    const impactEstimate = Math.round(
      (addCard.inclusionRate - (cut?.inclusionRate ?? 0)) * 100
    );

    upgrades.push({
      add: {
        cardName: addCard.cardName,
        inclusionRate: addCard.inclusionRate,
        synergyScore: addCard.synergyScore,
        role: addCard.role,
      },
      cut: cut ? {
        cardName: cut.cardName,
        role: cut.role,
        reason: cut.inclusionRate > 0
          ? `only ${Math.round(cut.inclusionRate * 100)}% community inclusion`
          : 'not found in community decklists',
      } : null,
      impactEstimate: Math.max(0, impactEstimate),
    });

    if (cut) usedCuts.add(cut.cardName.toLowerCase());
  }

  return upgrades.sort((a, b) => b.impactEstimate - a.impactEstimate);
}
