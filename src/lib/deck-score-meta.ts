/**
 * Deck Score v1 — Meta fit (Fmeta). docs/DECK_SCORE_SPEC.md §1.
 *
 * The snapshot is plain data (§3: "no DB handles or callbacks") — building
 * one lives in deck-score-snapshot.ts, which is a stub in this unit (no
 * `community_decks` rows exist for the app's own DB yet). This module only
 * consumes whatever `ScoreCorpusSnapshot | null` it is handed.
 */
import type { MetaCardStat, ArchetypeStat } from './meta-queries';
import { clip } from './deck-score-math';
import type { ScoreFormat } from './deck-score-norms';
import type { DeckEntry, ComponentOutput } from './deck-score-mana';
import type { CardFeature } from './deck-score-features';
import type { Archetype } from './deck-templates';

export type CorpusCard = MetaCardStat & {
  baselineInclusion: number;
  distinctLists: number;
  effectiveIncluded: number;
  effectiveCohortLists: number;
  effectiveWins: number;
  effectiveLosses: number;
  archetypeBaselineWinRate: number | null;
  cfPercentile: number | null;
};

export interface ScoreCorpusSnapshot {
  id: string;
  asOf: string;
  format: ScoreFormat;
  /** Context = format + commander identities / inferred archetype; values already windowed. */
  cardsByContext: Readonly<Record<string, Readonly<Record<string, CorpusCard>>>>;
  archetypes: readonly ArchetypeStat[];
}

function onPlanForMeta(feature: CardFeature): boolean {
  // Same "targeted or generic-infrastructure-within-band" gate Synergy uses,
  // without the band scaling — Fmeta only needs a binary in/off plan split.
  return feature.categories.some((c) => c !== 'utility' && c !== 'land') ||
    feature.isFoodProducer || feature.isFoodPayoff || feature.isTreasureProducer ||
    feature.isTokenProducer || feature.isTokenPayoff;
}

function contextKey(format: ScoreFormat, archetype: Archetype): string {
  return `${format}:${archetype}`;
}

/** `Fmeta`, §1. `corpus === null` -> 50 + an evidence-gate warning, per spec. */
export function computeMeta(
  format: ScoreFormat,
  archetype: Archetype,
  mainEntries: DeckEntry[],
  corpus: ScoreCorpusSnapshot | null,
): ComponentOutput & { evidenceWarn: boolean } {
  const nonLand = mainEntries.filter((e) => !e.feature.isLand);
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  if (!corpus || F === 0) {
    return {
      score: 50,
      evidenceWarn: true,
      reason: `no context: 0 dated lists, 0% coverage; insufficient data; snapshot none.`,
    };
  }

  const key = contextKey(format, archetype);
  const cards = corpus.cardsByContext[key] ?? {};
  const isStandard = format === 'standard';

  let total = 0;
  let covered = 0;
  let sampleLists = 0;
  for (const e of nonLand) {
    const onPlan = onPlanForMeta(e.feature) ? 1 : 0;
    const stat = cards[e.feature.card.name];
    let m: number;
    if (!stat) {
      m = 0.5 * onPlan;
    } else {
      covered += e.quantity;
      sampleLists = Math.max(sampleLists, stat.effectiveCohortLists);
      const rho = stat.distinctLists < 30 ? 0 : stat.effectiveCohortLists / (stat.effectiveCohortLists + 200);
      const p0 = stat.baselineInclusion;
      const p = (stat.effectiveIncluded + 20 * p0) / (stat.effectiveCohortLists + 20);
      const zLift = p0 > 0 && p > 0 ? Math.max(-1, Math.min(1, Math.log2(p / p0) / 3)) : 0;
      const zCF = stat.cfPercentile != null ? 2 * stat.cfPercentile - 1 : 0;
      if (isStandard) {
        const b = stat.archetypeBaselineWinRate ?? 0.5;
        const wins = stat.effectiveWins;
        const losses = stat.effectiveLosses;
        const enoughSample = stat.distinctLists >= 30 && wins + losses >= 100;
        const r = (wins + 50 * b) / (wins + losses + 50);
        const zWL = enoughSample ? Math.max(-1, Math.min(1, (r - b) / 0.10)) : 0;
        m = onPlan * (0.5 + 0.5 * e.feature.s * rho * (0.7 * zWL + 0.3 * zLift));
      } else {
        m = onPlan * (0.5 + e.feature.s * rho * (0.4 * zLift + 0.1 * zCF));
      }
    }
    total += e.quantity * m;
  }

  const score = clip(total / F) * 100;
  const coveragePct = F > 0 ? Math.round((covered / F) * 100) : 0;
  const evidence = sampleLists >= 100 ? 'outcome evidence' : covered > 0 ? 'inclusion-only' : 'insufficient data';
  return {
    score,
    evidenceWarn: false,
    reason: `${key}: ${Math.round(sampleLists)} dated lists, ${coveragePct}% coverage; ${evidence}; snapshot ${corpus.id}.`,
  };
}
