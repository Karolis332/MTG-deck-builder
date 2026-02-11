/**
 * Mulligan Advisor — deterministic heuristic engine for keep/mulligan decisions.
 *
 * Sub-10ms, zero API calls. Pure math + MTG heuristics.
 * Evaluates opening hands based on land count, color coverage, curve presence,
 * role coverage, commander synergy, and mulligan depth.
 */

import type { ResolvedCard } from './game-state-engine';
import type { Archetype } from './deck-templates';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MulliganAdvice {
  recommendation: 'keep' | 'mulligan';
  confidence: number; // 0-1
  score: number; // raw score 0-100
  reasoning: string[];
  handAnalysis: HandAnalysis;
}

export interface HandAnalysis {
  landCount: number;
  nonlandCount: number;
  colors: string[];
  cmcDistribution: Record<number, number>;
  avgCmc: number;
  hasPlayOnTurn1: boolean;
  hasPlayOnTurn2: boolean;
  hasPlayOnTurn3: boolean;
  hasRamp: boolean;
  hasDraw: boolean;
  hasRemoval: boolean;
  commanderSynergyCards: number;
}

export interface DeckInfo {
  totalCards: number;
  landCount: number;
  avgCmc: number;
  colors: string[];
  commanderGrpIds?: number[];
  commanderOracleText?: string;
}

interface CardMap {
  get(grpId: number): ResolvedCard | undefined | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const RAMP_PATTERNS = [
  /add.+\{[WUBRGC]\}/i,
  /search.+library.+land/i,
  /put.+land.+onto.+battlefield/i,
  /mana dork/i,
  /\{T\}:\s*Add/i,
  /treasure token/i,
];

const DRAW_PATTERNS = [
  /draw.+card/i,
  /look at the top/i,
  /scry/i,
  /exile the top.+you may (?:play|cast)/i,
];

const REMOVAL_PATTERNS = [
  /destroy target/i,
  /exile target/i,
  /deals? \d+ damage to/i,
  /\-\d+\/\-\d+ until/i,
  /return target.+to.+owner/i,
  /counter target/i,
];

const LAND_TYPE_PATTERNS = [
  /\bland\b/i,
];

// Archetype-specific weight adjustments
const ARCHETYPE_WEIGHTS: Partial<Record<Archetype, {
  t1Weight: number;
  t2Weight: number;
  t3Weight: number;
  rampWeight: number;
  drawWeight: number;
  removalWeight: number;
  landIdeal: [number, number]; // min, max ideal for 7-card hand
}>> = {
  aggro: {
    t1Weight: 15, t2Weight: 12, t3Weight: 8,
    rampWeight: 3, drawWeight: 5, removalWeight: 3,
    landIdeal: [2, 3],
  },
  tempo: {
    t1Weight: 10, t2Weight: 12, t3Weight: 10,
    rampWeight: 5, drawWeight: 8, removalWeight: 8,
    landIdeal: [2, 3],
  },
  midrange: {
    t1Weight: 5, t2Weight: 10, t3Weight: 12,
    rampWeight: 8, drawWeight: 8, removalWeight: 8,
    landIdeal: [2, 4],
  },
  control: {
    t1Weight: 3, t2Weight: 8, t3Weight: 10,
    rampWeight: 5, drawWeight: 12, removalWeight: 12,
    landIdeal: [3, 4],
  },
  combo: {
    t1Weight: 5, t2Weight: 8, t3Weight: 8,
    rampWeight: 10, drawWeight: 12, removalWeight: 5,
    landIdeal: [2, 4],
  },
  voltron: {
    t1Weight: 8, t2Weight: 10, t3Weight: 10,
    rampWeight: 10, drawWeight: 8, removalWeight: 5,
    landIdeal: [2, 4],
  },
  aristocrats: {
    t1Weight: 8, t2Weight: 10, t3Weight: 10,
    rampWeight: 8, drawWeight: 8, removalWeight: 5,
    landIdeal: [2, 4],
  },
  stax: {
    t1Weight: 8, t2Weight: 12, t3Weight: 8,
    rampWeight: 12, drawWeight: 5, removalWeight: 5,
    landIdeal: [2, 4],
  },
};

const DEFAULT_WEIGHTS = {
  t1Weight: 8, t2Weight: 10, t3Weight: 10,
  rampWeight: 8, drawWeight: 8, removalWeight: 8,
  landIdeal: [2, 4] as [number, number],
};

// ── Main Function ────────────────────────────────────────────────────────────

/**
 * Analyze an opening hand and recommend keep or mulligan.
 *
 * @param hand - Array of grpIds in the opening hand
 * @param deckInfo - Deck composition information
 * @param format - Game format (standard, commander, etc.)
 * @param archetype - Deck archetype for weight tuning
 * @param cardMap - Map/object to look up ResolvedCard by grpId
 * @param mulliganCount - Number of mulligans taken so far (0 = first hand)
 */
export function analyzeMulligan(
  hand: number[],
  deckInfo: DeckInfo,
  format: string | null,
  archetype: Archetype | null,
  cardMap: CardMap,
  mulliganCount: number = 0,
): MulliganAdvice {
  const handSize = hand.length;
  const reasoning: string[] = [];
  let score = 50; // Start at neutral

  // Resolve cards
  const resolvedHand = hand.map(grpId => ({
    grpId,
    card: cardMap.get(grpId) ?? null,
  }));

  // Analyze hand composition
  const analysis = analyzeHand(resolvedHand, deckInfo);
  const weights = ARCHETYPE_WEIGHTS[archetype ?? 'midrange'] ?? DEFAULT_WEIGHTS;
  const isCommanderFormat = format ? /commander|brawl|edh/i.test(format) : false;
  const [idealMin, idealMax] = weights.landIdeal;

  // ── Score: Land Count ──────────────────────────────────────────────────
  // Scale ideal range by hand size (from 7-card baseline)
  const scaledMin = Math.max(1, Math.round(idealMin * handSize / 7));
  const scaledMax = Math.round(idealMax * handSize / 7);

  if (analysis.landCount >= scaledMin && analysis.landCount <= scaledMax) {
    const landScore = 20;
    score += landScore;
    reasoning.push(`Good land count (${analysis.landCount}/${handSize})`);
  } else if (analysis.landCount === 0) {
    score -= 40;
    reasoning.push(`No lands — extremely risky`);
  } else if (analysis.landCount === 1 && handSize >= 6) {
    score -= 20;
    reasoning.push(`Only 1 land — likely to miss drops`);
  } else if (analysis.landCount >= handSize - 1) {
    score -= 35;
    reasoning.push(`Almost all lands (${analysis.landCount}/${handSize}) — no action`);
  } else if (analysis.landCount > scaledMax) {
    const excess = analysis.landCount - scaledMax;
    score -= excess * 10;
    reasoning.push(`Too many lands (${analysis.landCount}/${handSize})`);
  } else if (analysis.landCount < scaledMin) {
    const deficit = scaledMin - analysis.landCount;
    score -= deficit * 12;
    reasoning.push(`Too few lands (${analysis.landCount}/${handSize})`);
  }

  // ── Score: Curve Presence ──────────────────────────────────────────────
  if (analysis.hasPlayOnTurn1) {
    score += weights.t1Weight;
    reasoning.push('Has turn 1 play');
  }
  if (analysis.hasPlayOnTurn2) {
    score += weights.t2Weight;
    reasoning.push('Has turn 2 play');
  }
  if (analysis.hasPlayOnTurn3) {
    score += weights.t3Weight;
    reasoning.push('Has turn 3 play');
  }

  if (!analysis.hasPlayOnTurn1 && !analysis.hasPlayOnTurn2 && !analysis.hasPlayOnTurn3) {
    score -= 15;
    reasoning.push('No early plays (turns 1-3)');
  }

  // ── Score: Role Coverage ───────────────────────────────────────────────
  if (analysis.hasRamp) {
    score += weights.rampWeight;
    reasoning.push('Has ramp/acceleration');
  }
  if (analysis.hasDraw) {
    score += weights.drawWeight;
    reasoning.push('Has card draw/selection');
  }
  if (analysis.hasRemoval) {
    score += weights.removalWeight;
    reasoning.push('Has interaction/removal');
  }

  // ── Score: Color Coverage ──────────────────────────────────────────────
  const deckColors = deckInfo.colors.filter(c => c !== 'C');
  if (deckColors.length > 1) {
    const landColors = analysis.colors;
    const coveredColors = deckColors.filter(c => landColors.includes(c));
    const colorCoverage = coveredColors.length / deckColors.length;

    if (colorCoverage >= 1) {
      score += 8;
      reasoning.push('All colors available');
    } else if (colorCoverage >= 0.5) {
      score += 3;
      reasoning.push(`Partial color coverage (${coveredColors.length}/${deckColors.length})`);
    } else if (colorCoverage === 0 && analysis.landCount > 0) {
      score -= 10;
      reasoning.push('Lands don\'t produce needed colors');
    }
  }

  // ── Score: Commander Synergy ───────────────────────────────────────────
  if (isCommanderFormat && analysis.commanderSynergyCards > 0) {
    const synergyBonus = Math.min(analysis.commanderSynergyCards * 4, 12);
    score += synergyBonus;
    reasoning.push(`${analysis.commanderSynergyCards} card(s) synergize with commander`);
  }

  // ── Score: Mulligan Depth Adjustment ───────────────────────────────────
  // Be more lenient on mulligans — lower hands should be kept more aggressively
  if (mulliganCount >= 1) {
    score += mulliganCount * 8;
    reasoning.push(`Mulligan ${mulliganCount} — lower threshold to keep`);
  }

  // At 5 cards, keep with 2+ lands almost always
  if (handSize <= 5 && analysis.landCount >= 2) {
    score += 15;
    reasoning.push(`Small hand with decent lands — should keep`);
  }

  // At 4 cards, keep everything
  if (handSize <= 4) {
    score += 30;
    reasoning.push(`Very small hand — keep regardless`);
  }

  // ── Final Decision ─────────────────────────────────────────────────────
  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Threshold: 45 = keep, below = mulligan
  const threshold = 45;
  const recommendation = score >= threshold ? 'keep' : 'mulligan';
  const confidence = Math.min(1, Math.abs(score - threshold) / 40);

  return {
    recommendation,
    confidence,
    score,
    reasoning,
    handAnalysis: analysis,
  };
}

// ── Hand Analysis ────────────────────────────────────────────────────────────

function analyzeHand(
  hand: Array<{ grpId: number; card: ResolvedCard | null }>,
  deckInfo: DeckInfo,
): HandAnalysis {
  let landCount = 0;
  let nonlandCount = 0;
  const colors = new Set<string>();
  const cmcDistribution: Record<number, number> = {};
  let totalCmc = 0;
  let hasPlayOnTurn1 = false;
  let hasPlayOnTurn2 = false;
  let hasPlayOnTurn3 = false;
  let hasRamp = false;
  let hasDraw = false;
  let hasRemoval = false;
  let commanderSynergyCards = 0;

  for (const { card } of hand) {
    if (!card) {
      nonlandCount++;
      continue;
    }

    const typeLine = card.typeLine ?? '';
    const isLand = LAND_TYPE_PATTERNS.some(p => p.test(typeLine));

    if (isLand) {
      landCount++;
      // Extract colors from land's oracle text
      const oText = card.oracleText ?? '';
      if (/\{W\}/i.test(oText) || /plains/i.test(typeLine)) colors.add('W');
      if (/\{U\}/i.test(oText) || /island/i.test(typeLine)) colors.add('U');
      if (/\{B\}/i.test(oText) || /swamp/i.test(typeLine)) colors.add('B');
      if (/\{R\}/i.test(oText) || /mountain/i.test(typeLine)) colors.add('R');
      if (/\{G\}/i.test(oText) || /forest/i.test(typeLine)) colors.add('G');
      // Basic land check by name
      const name = card.name.toLowerCase();
      if (name.includes('plains')) colors.add('W');
      if (name.includes('island')) colors.add('U');
      if (name.includes('swamp')) colors.add('B');
      if (name.includes('mountain')) colors.add('R');
      if (name.includes('forest')) colors.add('G');
    } else {
      nonlandCount++;
      const cmc = Math.min(card.cmc, 7); // Bucket 7+
      cmcDistribution[cmc] = (cmcDistribution[cmc] || 0) + 1;
      totalCmc += card.cmc;

      // Check curve plays (accounting for land drops)
      if (card.cmc <= 1) hasPlayOnTurn1 = true;
      if (card.cmc <= 2) hasPlayOnTurn2 = true;
      if (card.cmc <= 3) hasPlayOnTurn3 = true;

      // Check roles
      const oText = card.oracleText ?? '';
      if (RAMP_PATTERNS.some(p => p.test(oText))) hasRamp = true;
      if (DRAW_PATTERNS.some(p => p.test(oText))) hasDraw = true;
      if (REMOVAL_PATTERNS.some(p => p.test(oText))) hasRemoval = true;

      // Commander synergy — check if card text references commander keywords
      if (deckInfo.commanderOracleText) {
        const cmdText = deckInfo.commanderOracleText.toLowerCase();
        const cardText = oText.toLowerCase();

        // Simple keyword overlap check
        if (cmdText.includes('dies') && (cardText.includes('sacrifice') || cardText.includes('dies'))) {
          commanderSynergyCards++;
        } else if (cmdText.includes('enters') && (cardText.includes('enters') || cardText.includes('etb'))) {
          commanderSynergyCards++;
        } else if (cmdText.includes('cast') && cardText.includes('whenever')) {
          commanderSynergyCards++;
        } else if (cmdText.includes('token') && cardText.includes('token')) {
          commanderSynergyCards++;
        } else if (cmdText.includes('counter') && cardText.includes('counter')) {
          commanderSynergyCards++;
        }
      }
    }
  }

  const avgCmc = nonlandCount > 0 ? totalCmc / nonlandCount : 0;

  return {
    landCount,
    nonlandCount,
    colors: Array.from(colors),
    cmcDistribution,
    avgCmc,
    hasPlayOnTurn1,
    hasPlayOnTurn2,
    hasPlayOnTurn3,
    hasRamp,
    hasDraw,
    hasRemoval,
    commanderSynergyCards,
  };
}
