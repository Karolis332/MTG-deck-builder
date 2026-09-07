/**
 * Deck Doctor core — the scoring half of /analyze, shared with /optimize.
 * Input is already-resolved card rows; no HTTP, no DB access.
 */
import { classifyCard, getPrimaryCategory } from '../../src/lib/card-classifier';
import { analyzeCommander } from '../../src/lib/commander-synergy';
import { computeSynergyGraph } from '../../src/lib/synergy-graph';
import type { CardLike, SynergyPair } from '../../src/lib/synergy-graph';
import { deriveWinPlan } from '../../src/lib/win-conditions';
import type { WinPlan } from '../../src/lib/win-conditions';
import { computeCurveScore } from '../../src/lib/curve-score';
import type { CurveScoreResult } from '../../src/lib/curve-score';
import { deriveKeepCriteria } from '../../src/lib/mulligan-advisor';
import type { Archetype } from '../../src/lib/deck-templates';
import { detectTribalType } from '../../src/lib/tribal-detect';
import type { DbCard } from '../../src/lib/types';

export interface ResolvedCard {
  card: DbCard;
  quantity: number;
}

/** Wire shape of /analyze (minus `unresolved`, which the handler appends). */
export interface AnalysisPayload {
  commander: string;
  archetype: Archetype;
  tribalType: string | null;
  iss: number;
  topSynergyPairs: SynergyPair[];
  curveScore: CurveScoreResult;
  winPlan: Omit<WinPlan, 'cardRoles'> & { cardRoles: Record<string, unknown> };
  mulliganCriteria: string[];
  gameChangers: { count: number; names: string[] };
  categories: Record<string, number>;
  stats: { totalCards: number; landCount: number; avgCmc: number };
}

export interface AnalysisCore {
  payload: AnalysisPayload;
  /** Raw per-card ISS keyed by card name — the optimizer's cut signal. */
  cardISS: Map<string, number>;
  winPlan: WinPlan;
  archetype: Archetype;
  colorIdentity: string[];
}

function isLandType(typeLine: string | null | undefined): boolean {
  return (typeLine || '').includes('Land');
}


export function analyzeResolved(commanderRow: DbCard, resolved: ResolvedCard[]): AnalysisCore {
  let colorIdentity: string[] = [];
  try {
    colorIdentity = commanderRow.color_identity ? JSON.parse(commanderRow.color_identity) : [];
  } catch {
    colorIdentity = [];
  }
  const commanderOracle = commanderRow.oracle_text || '';
  const synergyProfile = analyzeCommander(commanderOracle, commanderRow.type_line || '', colorIdentity);
  const archetype = (synergyProfile?.detectedArchetype ?? 'midrange') as Archetype;

  const nonLand = resolved.filter((r) => !isLandType(r.card.type_line));
  const nonLandCardLikes: CardLike[] = nonLand.map((r) => ({
    name: r.card.name,
    oracleText: r.card.oracle_text,
    typeLine: r.card.type_line || '',
  }));
  const commanderLike: CardLike = {
    name: commanderRow.name,
    oracleText: commanderOracle,
    typeLine: commanderRow.type_line || '',
  };

  const tribalType = detectTribalType(
    commanderRow,
    resolved.map((r) => ({ type_line: r.card.type_line, quantity: r.quantity })),
  );
  const graph = computeSynergyGraph(nonLandCardLikes, { ...commanderLike, synergyProfile, directNeeds: null, tribalType });
  const winPlan = deriveWinPlan({
    commander: commanderLike,
    synergyProfile,
    cards: nonLand.map((r) => ({
      name: r.card.name,
      oracleText: r.card.oracle_text,
      typeLine: r.card.type_line || '',
      cmc: r.card.cmc ?? 0,
    })),
  });

  const nonLandCopies = nonLand.flatMap((r) =>
    Array.from({ length: r.quantity }, () => ({ cmc: r.card.cmc ?? 0 }))
  );
  const curveScore = computeCurveScore(archetype, commanderRow.cmc ?? 0, nonLandCopies);

  const totalCards = resolved.reduce((s, r) => s + r.quantity, 0);
  const landCount = resolved
    .filter((r) => isLandType(r.card.type_line))
    .reduce((s, r) => s + r.quantity, 0);
  const avgCmc = nonLandCopies.length
    ? nonLandCopies.reduce((s, c) => s + c.cmc, 0) / nonLandCopies.length
    : 0;
  const mulliganCriteria = deriveKeepCriteria(
    { totalCards, landCount, avgCmc, colors: colorIdentity },
    archetype,
    winPlan,
    commanderRow.cmc ?? 0,
  );

  const gameChangers = resolved
    .filter((r) => (r.card as DbCard & { game_changer?: number }).game_changer === 1)
    .map((r) => r.card.name);

  const categories: Record<string, number> = {};
  for (const r of resolved) {
    const cat = getPrimaryCategory(
      classifyCard(r.card.name, r.card.oracle_text || '', r.card.type_line || '', r.card.cmc ?? 0)
    );
    categories[cat] = (categories[cat] || 0) + r.quantity;
  }

  // WinPlan.cardRoles is a Map — swap for a plain object on the wire
  const winPlanOut = {
    ...winPlan,
    cardRoles: winPlan.cardRoles instanceof Map ? Object.fromEntries(winPlan.cardRoles) : winPlan.cardRoles,
  } as AnalysisPayload['winPlan'];

  return {
    payload: {
      commander: commanderRow.name,
      archetype,
      tribalType,
      iss: graph.deckISS,
      topSynergyPairs: graph.topSynergyPairs,
      curveScore,
      winPlan: winPlanOut,
      mulliganCriteria,
      gameChangers: { count: gameChangers.length, names: gameChangers },
      categories,
      stats: { totalCards, landCount, avgCmc: Math.round(avgCmc * 100) / 100 },
    },
    cardISS: graph.cardISS,
    winPlan,
    archetype,
    colorIdentity,
  };
}
