/**
 * Pure assembly logic for the live deck benchmark (GET /api/decks/[id]/benchmark).
 * No DB access, no fetch — takes already-loaded deck rows and already-resolved
 * reference decks, returns the comparison. All name resolution (local DB lookups)
 * and CF API calls happen in the route handler.
 */
import { classifyBracket, type BracketCard } from './bracket';
import {
  compositionOf,
  compareToSet,
  qualityIndex,
  compositionDistanceOf,
  nonlandNames,
  type CompositionWithNames,
  type CardLite,
  type CompareResult,
} from './benchmark-metrics';

export interface BenchmarkDeckRow extends CardLite, BracketCard {
  board: string;
}

export interface BenchmarkRefCard extends CardLite, BracketCard {}

export interface BenchmarkRefDeck {
  id: string;
  source: string;
  url: string | null;
  deckName: string | null;
  author: string | null;
  likes: number;
  /** Resolved local card rows (unresolved names are excluded from metadata but still counted for overlap via allNames). */
  cards: BenchmarkRefCard[];
  /** Every card name in the ref decklist, including ones that failed local resolution. */
  allNames: string[];
  commanderNames: string[];
}

export interface AssembledBenchmark {
  refCount: number;
  refsPerBracket: Record<number, number>;
  bracketFilterApplied: boolean;
  buildBracket: number;
  bracketMatch: boolean;
  overlapMeanPct: number;
  overlapBestPct: number;
  staplesMissing: CompareResult['staplesMissing'];
  oddCards: string[];
  deltas: CompareResult['deltas'];
  curveL1: number;
  qualityIndex: number;
}

/** Minimum matching-bracket ref decks required before the bracket filter is applied. */
const MIN_BRACKET_REFS = 5;

export function assembleBenchmark(
  deckRows: BenchmarkDeckRow[],
  refDecks: BenchmarkRefDeck[],
  targetBracket: number,
): AssembledBenchmark {
  const commanderRows = deckRows.filter((r) => r.board === 'commander');
  const commanderNames = commanderRows.map((r) => r.name);
  const commanderOracle = commanderRows.map((r) => r.oracle_text || '').join(' ');

  const buildCards = deckRows.filter((r) => r.board === 'main' || r.board === 'commander');
  const buildComposition: CompositionWithNames = {
    ...compositionOf(buildCards, commanderOracle),
    names: nonlandNames(buildCards),
  };
  const buildBracket = classifyBracket(buildCards, { commanderNames }).bracket;

  const refsAll: Array<CompositionWithNames & { bracket: number }> = refDecks.map((ref) => {
    // Nonland names only, matching the build side (nonlandNames excludes lands
    // by type_line). Unresolved names have no known type — kept as nonland
    // since we can't verify they're lands.
    const resolvedLower = new Set(ref.cards.map((c) => c.name.toLowerCase()));
    const names = nonlandNames(ref.cards);
    for (const n of ref.allNames) {
      const key = n.toLowerCase();
      if (!resolvedLower.has(key) && !names.has(key)) names.set(key, n);
    }
    const bracket = classifyBracket(ref.cards, { commanderNames: ref.commanderNames }).bracket;
    return { ...compositionOf(ref.cards), names, bracket };
  });

  const refsPerBracket: Record<number, number> = {};
  for (const r of refsAll) refsPerBracket[r.bracket] = (refsPerBracket[r.bracket] || 0) + 1;

  const matching = refsAll.filter((r) => r.bracket === targetBracket);
  const bracketFilterApplied = matching.length >= MIN_BRACKET_REFS;
  const refs = bracketFilterApplied ? matching : refsAll;

  const compared = compareToSet(buildComposition, refs);
  const compositionDistance = compositionDistanceOf(compared.deltas);
  const bracketMatch = buildBracket === targetBracket;
  const quality = qualityIndex({
    overlapMeanPct: compared.overlapMeanPct,
    compositionDistance,
    bracketMatch,
  });

  return {
    refCount: refs.length,
    refsPerBracket,
    bracketFilterApplied,
    buildBracket,
    bracketMatch,
    overlapMeanPct: compared.overlapMeanPct,
    overlapBestPct: compared.overlapBestPct,
    staplesMissing: compared.staplesMissing,
    oddCards: compared.oddCards,
    deltas: compared.deltas,
    curveL1: compared.curveL1,
    qualityIndex: quality,
  };
}
