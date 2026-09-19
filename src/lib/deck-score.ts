/**
 * Deck Score v1 — the single pure entry point. docs/DECK_SCORE_SPEC.md.
 *
 * Seven scored components + one zero-weight legality/structure component,
 * gated arithmetic composition (§2), hard caps at 0/19/39/69. No HTTP, DB,
 * LLM, random sampling, wall clock, price, likes, views, collection
 * ownership, or requested power-level label enters scoring (§1).
 */
import type { DbCard } from './types';
import type { ResolvedCard } from '../../services/build-api/analysis-core';
import { analyzeCommander, mergeProfiles } from './commander-synergy';
import type { Archetype } from './deck-templates';
import {
  weightsFor, normsFor, qualityCap, SCORE_VERSION,
  QUALITY_CAP_INTERCEPT, QUALITY_CAP_SLOPE,
  HARD_CAP_INVALID, type ScoreFormat, type ComponentKey, type ScoreTuning,
} from './deck-score-norms';
import { computeStructure, type ScoreGate } from './deck-score-gates';
import { computeMana, computeCurve, type DeckEntry } from './deck-score-mana';
import { computeInteraction, computeAdvantage } from './deck-score-interaction';
import { computeWin } from './deck-score-win';
import { computeSynergy } from './deck-score-synergy';
import { computeMeta, type ScoreCorpusSnapshot, type CorpusCard } from './deck-score-meta';
import { deriveCardFeature, type CardFeature } from './deck-score-features';
import { round1 } from './deck-score-math';

export type { ScoreFormat, ComponentKey, ScoreTuning } from './deck-score-norms';
export type { ScoreCorpusSnapshot, CorpusCard } from './deck-score-meta';
export { SCORE_VERSION };

/** §1 W "> 20% of nonland copies have unsupported relevant mechanics" cap. */
const HARD_CAP_COVERAGE = 69;
const COVERAGE_UNSUPPORTED_THRESHOLD = 0.20;

export interface DeckScoreInput {
  format: ScoreFormat;
  main: readonly ResolvedCard[];
  /** [] Standard; one Brawl; one or a valid pair Commander. */
  commander: readonly DbCard[];
  sideboard: readonly ResolvedCard[];
  /** Separate from sideboard input; counts toward its limit/copy checks. */
  companion?: DbCard;
  unresolved: readonly { name: string; quantity: number; board: string }[];
  /** One frozen oracle/legality/effect dataset, including Arena availability. */
  cardDataVersion: string;
  corpus: ScoreCorpusSnapshot | null;
}

export interface DeckScoreResult {
  score: number;
  components: { key: ComponentKey; score: number; weight: number; reason: string }[];
  gates: ScoreGate[];
}

const COMPONENT_ORDER: ComponentKey[] = ['mana', 'curve', 'interaction', 'advantage', 'win', 'synergy', 'meta', 'structure'];

function invalidResult(gates: ScoreGate[], weights: Record<ComponentKey, number>): DeckScoreResult {
  return {
    score: 0,
    components: COMPONENT_ORDER.map((key) => ({ key, score: 0, weight: weights[key], reason: 'invalid or empty deck input.' })),
    gates,
  };
}

function inferArchetype(commanders: CardFeature[]): Archetype {
  if (commanders.length === 0) return 'midrange'; // §1: "generic midrange is the fallback" (Standard has no commander)
  const profiles = commanders
    .map((f) => {
      let identity: string[] = [];
      try { identity = f.card.color_identity ? JSON.parse(f.card.color_identity) : []; } catch { identity = []; }
      return analyzeCommander(f.card.oracle_text || '', f.card.type_line || '', identity);
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
  if (profiles.length === 0) return 'midrange';
  const merged = profiles.length === 2 ? mergeProfiles(profiles[0], profiles[1]) : profiles[0];
  return (merged.detectedArchetype ?? 'midrange') as Archetype;
}

/** Pure, deterministic, input-order invariant. No HTTP/DB/LLM/clock access. */
export function scoreDeck(input: Readonly<DeckScoreInput>, tuning?: Readonly<ScoreTuning>): DeckScoreResult {
  const format = input.format;
  const weights = tuning?.weights ? { ...weightsFor(format), ...tuning.weights } : weightsFor(format);
  const norms = tuning?.norms ? { ...normsFor(format), ...tuning.norms } : normsFor(format);
  const capIntercept = tuning?.capIntercept ?? QUALITY_CAP_INTERCEPT;
  const capSlope = tuning?.capSlope ?? QUALITY_CAP_SLOPE;

  const structure = computeStructure({
    format,
    main: input.main,
    commander: input.commander,
    sideboard: input.sideboard,
    companion: input.companion,
    unresolved: input.unresolved,
  });

  if (structure.hardCaps.includes(HARD_CAP_INVALID)) {
    return invalidResult(structure.gates, weights);
  }

  const featureCache = new Map<string, CardFeature>();
  const getFeature = (card: DbCard): CardFeature => {
    const cached = featureCache.get(card.id);
    if (cached) return cached;
    const feature = deriveCardFeature(card);
    featureCache.set(card.id, feature);
    return feature;
  };

  const mainEntries: DeckEntry[] = input.main.map((rc) => ({ feature: getFeature(rc.card), quantity: rc.quantity }));
  const commanderFeatures: CardFeature[] = input.commander.map((c) => getFeature(c));
  const N = mainEntries.reduce((s, e) => s + e.quantity, 0);
  const F = mainEntries.filter((e) => !e.feature.isLand).reduce((s, e) => s + e.quantity, 0);
  const archetype = inferArchetype(commanderFeatures);
  const commanderCmc = commanderFeatures.reduce((max, f) => Math.max(max, f.c), 0);

  const mana = computeMana(format, norms, N, mainEntries, commanderFeatures);
  const curve = computeCurve(format, norms, archetype, N, mainEntries, commanderCmc);
  const interaction = computeInteraction(format, norms, archetype, N, mainEntries);
  const advantage = computeAdvantage(format, norms, archetype, N, mainEntries);
  const win = computeWin(format, norms, archetype, N, mainEntries, commanderFeatures, {
    E: interaction.E, Estar: interaction.Estar,
    D: advantage.D, Dstar: advantage.Dstar, hasDrawEngine: advantage.hasDrawEngine,
  });
  const synergy = computeSynergy(format, norms, archetype, N, mainEntries);
  const metaResult = computeMeta(format, archetype, mainEntries, input.corpus);

  const scores: Record<ComponentKey, number> = {
    mana: round1(mana.score), curve: round1(curve.score), interaction: round1(interaction.score),
    advantage: round1(advantage.score), win: round1(win.score), synergy: round1(synergy.score),
    meta: round1(metaResult.score), structure: structure.structureScore,
  };
  const reasons: Record<ComponentKey, string> = {
    mana: mana.reason, curve: curve.reason, interaction: interaction.reason, advantage: advantage.reason,
    win: win.reason, synergy: synergy.reason, meta: metaResult.reason, structure: structure.gates[0]?.reason ?? '',
  };

  const base = COMPONENT_ORDER.reduce((sum, key) => sum + (weights[key] / 100) * scores[key], 0);
  const qCap = qualityCap(scores.mana, scores.win, scores.synergy, capIntercept, capSlope);

  const unsupportedShare = F > 0
    ? mainEntries.filter((e) => !e.feature.isLand && e.feature.s < 1).reduce((s, e) => s + e.quantity, 0) / F
    : 0;
  const coverageTriggered = unsupportedShare > COVERAGE_UNSUPPORTED_THRESHOLD;

  const hardCaps = [...structure.hardCaps, ...(coverageTriggered ? [HARD_CAP_COVERAGE] : [])];
  const rawScore = Math.min(base, qCap, ...(hardCaps.length ? hardCaps : [Infinity]));
  const score = Number.isFinite(rawScore) ? Math.round(Math.max(0, Math.min(100, rawScore))) : 0;

  const gates: ScoreGate[] = [
    ...structure.gates,
    {
      key: 'quality_cap', kind: 'quality',
      status: qCap < base ? 'warn' : 'pass',
      cap: qCap < 100 ? round1(qCap) : null,
      reason: `quality cap ${capIntercept}+${capSlope}*min(M,W,S)=${qCap.toFixed(1)} from mana=${scores.mana}, win=${scores.win}, synergy=${scores.synergy}.`,
    },
    {
      key: 'coverage', kind: 'quality',
      status: coverageTriggered ? 'warn' : 'pass',
      cap: coverageTriggered ? HARD_CAP_COVERAGE : null,
      reason: `${Math.round(unsupportedShare * 100)}% of nonland copies have unsupported relevant mechanics${coverageTriggered ? ' — provisional: effect coverage' : ''}.`,
    },
    ...(metaResult.evidenceWarn
      ? [{ key: 'meta_evidence', kind: 'evidence' as const, status: 'warn' as const, cap: null, reason: 'no corpus snapshot supplied — meta fit defaulted to 50.' }]
      : []),
  ];

  return {
    score,
    components: COMPONENT_ORDER.map((key) => ({ key, score: scores[key], weight: weights[key], reason: reasons[key] })),
    gates,
  };
}
