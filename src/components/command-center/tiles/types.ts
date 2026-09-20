import type { DbCard } from '@/lib/types';
import type { DeckScorePayload } from '@/lib/deck-score-input';

/** Card row shape used across the live rail — a DeckData entry. */
export interface LiveRailCard extends DbCard {
  entry_id?: number;
  card_id?: string;
  quantity: number;
  board: string;
  sort_order?: number;
  owned_qty?: number;
}

/** Deck shape the live rail needs — a superset-compatible subset of DeckData. */
export interface LiveRailDeck {
  id: number;
  name: string;
  format: string | null;
  target_bracket?: number | null;
  cards: LiveRailCard[];
}

export interface RatioHealthEntry {
  category: string;
  label: string;
  current: number;
  target: { min: number; max: number; target: number };
  status: 'low' | 'ok' | 'high';
  color: string;
}

export interface SynergyPair {
  a: string;
  b: string;
  weight: number;
  reasons: string[];
}

export interface WinPlanKeyCards {
  enablers: string[];
  payoffs: string[];
  protection: string[];
  tutors: string[];
}

export interface WinPlanOut {
  route: string;
  secondaryRoute?: string;
  description: string;
  keyCards: WinPlanKeyCards;
  missingPieces: string[];
}

export interface CurveScoreResult {
  score: number;
  perBucket: Record<string, number>;
  notes: string[];
}

/** Shape of GET /api/deck-analysis — see src/app/api/deck-analysis/route.ts:193-277. */
export interface AnalysisResponse {
  deckId: number;
  deckName: string;
  format: string | null;
  commander: string | null;
  totalCards: number;
  avgCMC: number;
  ratioHealth: RatioHealthEntry[];
  overallScore: number;
  manaCurve: Record<number, number>;
  suggestions: string[];
  iss?: number;
  topSynergyPairs?: SynergyPair[];
  curveScore?: CurveScoreResult;
  winPlan?: WinPlanOut;
  mulliganCriteria?: string[];
  deckScore?: DeckScorePayload | null;
}

export interface LiveRailProps {
  deck: LiveRailDeck;
  analysis?: AnalysisResponse | null;
  onOpenCard: (card: DbCard) => void;
  onAskConsultant: (prompt: string) => void;
  onSetTargetBracket: (n: number) => void;
  /** Bracket and synergy tiles are Commander-only. */
  isCommanderFormat: boolean;
}
