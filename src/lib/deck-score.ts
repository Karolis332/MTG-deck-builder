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
  weightsFor, normsFor, qualityCap, profileOf, SCORE_VERSION,
  QUALITY_CAP_INTERCEPT, QUALITY_CAP_SLOPE, COVERAGE_EVIDENCE_THRESHOLD,
  HARD_CAP_INVALID, type ScoreFormat, type ComponentKey, type ScoreTuning,
} from './deck-score-norms';
import { selectPlan, evaluateClosing, betterPlan, isManlandFinisher, type PlanKey } from './deck-score-plans';
import { producerUtilisation } from './deck-score-producers';
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
  /** v1.2 (§8): the point estimate is shown, but "calibrated" status is
   * withheld — typed coverage is at or below 80%, or a selected recipe's
   * critical prerequisite is unknown. Additive field; components unchanged. */
  provisional: boolean;
}

const COMPONENT_ORDER: ComponentKey[] = ['mana', 'curve', 'interaction', 'advantage', 'win', 'synergy', 'meta', 'structure'];

function invalidResult(gates: ScoreGate[], weights: Record<ComponentKey, number>): DeckScoreResult {
  return {
    score: 0,
    components: COMPONENT_ORDER.map((key) => ({ key, score: 0, weight: weights[key], reason: 'invalid or empty deck input.' })),
    gates,
    provisional: true,
  };
}

/**
 * The §8 engine recipes carry their own keys; the curve/interaction/advantage
 * norms are indexed by the existing `Archetype` union. Map, do not widen —
 * those multipliers were calibrated on the template archetypes, and inventing
 * a `lifegain` entry for them would be an unmeasured constant.
 */
function archetypeOfPlan(key: PlanKey): Archetype {
  if (key === 'spells') return 'spellslinger';
  if (key === 'lifegain') return 'midrange';
  if (key === 'typal') return 'tribal';
  // Food/Treasure conversion and go-wide both build a board of tokens, which
  // is the one calibrated `Archetype` that describes them. Counters has no
  // calibrated curve/E-star profile of its own, so it takes the neutral one.
  if (key === 'conversion' || key === 'tokens') return 'tokens';
  if (key === 'counters') return 'midrange';
  // Graveyard recursion has no calibrated curve/E-star profile of its own;
  // midrange is the neutral one, not an invented constant.
  if (key === 'recursion') return 'midrange';
  return key;
}

/**
 * §8: "`inferArchetype([])='midrange'` must cease choosing every Standard
 * profile. Infer plans from the whole deck, including commanders as available
 * resources."
 *
 * The commander's own typed profile still wins when it exists — that IS a
 * read of the whole deck's available resources, and it drives the engine
 * templates the curve and E-star/D-star multipliers were calibrated on. When there is no
 * commander (Standard) or the commander parses to nothing, the archetype now
 * comes from the deck's own plan evaluation (§1's essential-support ordering)
 * instead of the midrange constant.
 */
function inferArchetype(commanders: CardFeature[], deckPlan: Archetype): Archetype {
  if (commanders.length === 0) return deckPlan;
  const profiles = commanders
    .map((f) => {
      let identity: string[] = [];
      try { identity = f.card.color_identity ? JSON.parse(f.card.color_identity) : []; } catch { identity = []; }
      return analyzeCommander(f.card.oracle_text || '', f.card.type_line || '', identity);
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
  if (profiles.length === 0) return deckPlan;
  const merged = profiles.length === 2 ? mergeProfiles(profiles[0], profiles[1]) : profiles[0];
  return (merged.detectedArchetype ?? deckPlan) as Archetype;
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
  const nonLandEntries = mainEntries.filter((e) => !e.feature.isLand);
  const N = mainEntries.reduce((s, e) => s + e.quantity, 0);
  const F = nonLandEntries.reduce((s, e) => s + e.quantity, 0);
  // §8: plans are inferred from the whole deck, including commanders as
  // available resources, and the SAME selection feeds S and the archetype.
  const commanderEntries = commanderFeatures.map((f) => ({ feature: f, quantity: 1 }));
  const profile = profileOf(format);
  // §9.1: "typed manland finishers may supply R without entering nonland Q".
  // They ride the same supply-only channel as the command zone, so they move R
  // and never Q. Standard only — no other profile's recipes were measured with
  // land-borne threats in them.
  const planSupply = profile === 'standard'
    ? [...commanderEntries, ...mainEntries.filter((e) => isManlandFinisher(e.feature))]
    : commanderEntries;
  // §9.3: one utilisation table per deck, shared by every recipe, so all
  // candidate plans are ranked against the SAME feasible assignment.
  const utilisation = producerUtilisation(nonLandEntries, commanderEntries);
  const plan = selectPlan(Math.max(1, N), nonLandEntries, planSupply, utilisation, profile);
  const archetype = inferArchetype(commanderFeatures, archetypeOfPlan(plan.recipe.key));
  const commanderCmc = commanderFeatures.reduce((max, f) => Math.max(max, f.c), 0);

  const mana = computeMana(format, norms, N, mainEntries, commanderFeatures);
  const curve = computeCurve(format, norms, archetype, N, mainEntries, commanderCmc);
  const interaction = computeInteraction(format, norms, archetype, N, mainEntries);
  const advantage = computeAdvantage(format, norms, archetype, N, mainEntries);
  const win = computeWin(format, norms, archetype, N, mainEntries, commanderFeatures, {
    E: interaction.E, Estar: interaction.Estar,
    D: advantage.D, Dstar: advantage.Dstar, hasDrawEngine: advantage.hasDrawEngine,
  });
  // §8 closing/tutor family: when W's best line is one the deck ASSEMBLES
  // (compact combo or alternate win), that line is the deck's plan and S must
  // be able to read it. It joins §1's ordering rather than replacing the
  // inferred plan, so it only wins where the deck actually executes it.
  // The archetype stays on the pre-W plan: the curve/interaction multipliers
  // were calibrated against it, and re-deriving it here would make W's input
  // depend on W's output.
  const finalPlan = win.closing
    ? betterPlan(
      plan,
      evaluateClosing(
        win.closing, nonLandEntries, planSupply, utilisation, profile,
        // §9.5: complete compatible backups joining the root line's package.
        win.closingLines.filter((l) => l.id !== win.closing?.id),
      ),
      profile,
    )
    : plan;
  const synergy = computeSynergy(finalPlan, N, mainEntries, profile);
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

  // §8 "Evidence, not popularity-based support": coverage is TYPED coverage
  // (`feature.covered`), never derived from `s < 1` as v1 did — a known
  // impossible predicate or a modelled opponent trigger is fully covered.
  const typedCoverage = F > 0
    ? nonLandEntries.filter((e) => e.feature.covered).reduce((s, e) => s + e.quantity, 0) / F
    : 1;
  const coverageTriggered = typedCoverage <= COVERAGE_EVIDENCE_THRESHOLD || synergy.unknownPrerequisite !== null;

  const hardCaps = structure.hardCaps;
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
      key: 'coverage', kind: 'evidence',
      status: coverageTriggered ? 'warn' : 'pass',
      cap: null,
      reason: `${Math.round(typedCoverage * 100)}% of nonland copies are typed in the effect catalogue` +
        `${synergy.unknownPrerequisite ? `; unknown prerequisite "${synergy.unknownPrerequisite}"` : ''}` +
        `${coverageTriggered ? ' — provisional: effect coverage, not calibrated' : ''}.`,
    },
    ...(metaResult.evidenceWarn
      ? [{ key: 'meta_evidence', kind: 'evidence' as const, status: 'warn' as const, cap: null, reason: 'no corpus snapshot supplied — meta fit defaulted to 50.' }]
      : []),
  ];

  return {
    score,
    components: COMPONENT_ORDER.map((key) => ({ key, score: scores[key], weight: weights[key], reason: reasons[key] })),
    gates,
    provisional: coverageTriggered,
  };
}
