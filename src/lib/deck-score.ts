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
  weightsFor, normsFor, qualityCap, profileOf, SCORE_VERSION, referenceLibrarySize,
  QUALITY_CAP_INTERCEPT, QUALITY_CAP_SLOPE, COVERAGE_EVIDENCE_THRESHOLD,
  HARD_CAP_INVALID, type ScoreFormat, type ComponentKey, type ScoreTuning,
} from './deck-score-norms';
import { selectPlan, evaluateClosing, betterPlan, isManlandFinisher, type PlanKey, type PlanSlots } from './deck-score-plans';
import { producerUtilisation } from './deck-score-producers';
import { computeStructure, type ScoreGate } from './deck-score-gates';
import { computeMana, computeCurve, type DeckEntry } from './deck-score-mana';
import { computeInteraction, computeAdvantage } from './deck-score-interaction';
import { computeWin } from './deck-score-win';
import { computeSynergy } from './deck-score-synergy';
import { computeMeta, type ScoreCorpusSnapshot, type CorpusCard } from './deck-score-meta';
import { blankFeature, deriveCardFeature, type CardFeature } from './deck-score-features';
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
  /** §10.9 item 1: the composed absolute total BEFORE display rounding —
   * clamped to 0..100, caps and quality cap already applied. `score` stays
   * the rounded absolute (the deployed surfaces read it); the rank layer
   * ranks this one, because ranking a rounded value is forbidden. */
  absoluteTotal: number;
  components: { key: ComponentKey; score: number; weight: number; reason: string }[];
  gates: ScoreGate[];
  /** §10.7 "publish ... selected recipe, U/D": the S diagnostics the
   * calibration scripts read. NOT part of `DeckScorePayload` — the wire shape
   * is unchanged — and never an input to any other component. */
  detail: {
    plan: PlanKey;
    /** §10.2 useful nonland-copy credit, library slots and their ratio. */
    U: number;
    D: number;
    Qslot: number;
    /** Legacy diagnostic (§10.3), not a factor of S. */
    R: number;
    typedCoverage: number;
  };
  /** v1.2 (§8): the point estimate is shown, but "calibrated" status is
   * withheld — typed coverage is at or below 80%, or a selected recipe's
   * critical prerequisite is unknown. Additive field; components unchanged. */
  provisional: boolean;
}

/** §10.9 item 5's pessimistic MV floor for an unresolved slot: the top curve
 * bin, and the value used outright when the deck has no identified nonland. */
const BLANK_SLOT_FALLBACK_MV = 7;

const COMPONENT_ORDER: ComponentKey[] = ['mana', 'curve', 'interaction', 'advantage', 'win', 'synergy', 'meta', 'structure'];

function invalidResult(gates: ScoreGate[], weights: Record<ComponentKey, number>): DeckScoreResult {
  return {
    score: 0,
    absoluteTotal: 0,
    components: COMPONENT_ORDER.map((key) => ({ key, score: 0, weight: weights[key], reason: 'invalid or empty deck input.' })),
    gates,
    detail: { plan: 'midrange', U: 0, D: 0, Qslot: 0, R: 0, typedCoverage: 0 },
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
  // §10.5/§10.2: unresolved copies are RESERVED SLOTS, not deleted cards — the
  // library really holds them, so every density that divides by N divides by
  // the submitted size. Their type is unknown, so they add nothing to F.
  const N = mainEntries.reduce((s, e) => s + e.quantity, 0) + structure.reservedSlots;
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
  // §10.2 slot accounting, computed ONCE and handed to every recipe:
  //   N0 = the legal reference library (99 / 98 with a verified partner pair /
  //        59 Standard Brawl / 60 Standard) — the frozen reference S's useful
  //        role caps and resource budgets answer to, so added unknown slots
  //        cannot enlarge a quota;
  //   lands = the ACTUAL land copies. Reserved unresolved slots are blank
  //        padding: they enter D and no access predicate treats them as mana.
  // The structure gate has already refused any other commander count, so two
  // resolved commanders here ARE the verified partner pair.
  const slots: PlanSlots = {
    n0: referenceLibrarySize(format) - (input.commander.length === 2 ? 1 : 0),
    lands: mainEntries.filter((e) => e.feature.isLand).reduce((s, e) => s + e.quantity, 0),
  };
  // §10.2: "for undersized inputs every access/feasibility predicate uses D
  // slots with uncredited padding". Every `N` inside `deck-score-win.ts` is an
  // access computation — hypergeometric draws and the disjoint-pool
  // polynomial — so W reads D too. Without it, deleting one off-plan copy from
  // a 99-card list drew the same pieces out of 98 cards and paid +9.4 W
  // (sample `381392623`, §10.4 delete-offplan-typed).
  //
  // v1.4 stage 3 (§10.4/§10.9 item 5, brief item 2(c)): the SAME denominator
  // now feeds the density components (M, curve, A). They divide by the library
  // the deck draws from, and deleting a proved-zero-use copy was raising the
  // land ratio, the turn-2 play density and the velocity access of every other
  // card — a denominator defect, not a mechanical improvement. `D = max(N0, N)`
  // is S's rule (§10.2) and is now the scorer's single slot denominator.
  // Interaction never divided by N (E/E* are absolute counts).
  const accessSlots = Math.max(slots.n0 ?? N, N);
  // §9.3: one utilisation table per deck, shared by every recipe, so all
  // candidate plans are ranked against the SAME feasible assignment.
  const utilisation = producerUtilisation(nonLandEntries, commanderEntries);
  const plan = selectPlan(Math.max(1, N), nonLandEntries, planSupply, utilisation, profile, slots);
  const archetype = inferArchetype(commanderFeatures, archetypeOfPlan(plan.recipe.key));
  const commanderCmc = commanderFeatures.reduce((max, f) => Math.max(max, f.c), 0);

  // v1.4 stage 3b (§10.4 / §10.9 item 5): "Unknown slots never improve evidence
  // status." A reserved unresolved slot already sat in every DENOMINATOR, but
  // the mean/shape estimators — Karsten's avgMv, the colour-adequacy mean, the
  // curve histogram, the casting schedule's mean MV — ran over the IDENTIFIED
  // set only, so blanking a card's name deleted its cost from those means and
  // paid W +5.7 / curve +.9 on sample 381371853. The slot is now imputed
  // PESSIMISTICALLY once, here: a nonland spell at the deck's own maximum
  // identified MV (7 when it has no identified nonland), zero colour adequacy,
  // and, for the curve, the bin that maximises the histogram distance. It earns
  // nothing anywhere, so the imputation can lower a component and never raise
  // one. Interaction, advantage and synergy read absolute counts over D and are
  // already monotone under deletion, so they keep the identified entries.
  // The deck's own maximum identified MV, floored at the top curve bin (7):
  // without the floor, blanking the single most expensive card lowered the mean
  // it is imputed at, and a flooded list gained +1.8 M on its own MDFC
  // (`351214491`, Turntimber Symbiosis).
  const pessimisticMv = Math.max(
    BLANK_SLOT_FALLBACK_MV,
    ...nonLandEntries.map((e) => e.feature.c),
  );
  // Every hypothesis for what the unreadable line was — a spell, a land, or an
  // MDFC's half land — scored, and the WORST kept (§10.9 item 5).
  const estimatorSets: DeckEntry[][] = structure.reservedSlots > 0
    ? (['spell', 'land', 'mdfc'] as const).map((kind) =>
      [...mainEntries, { feature: blankFeature(pessimisticMv, kind), quantity: structure.reservedSlots }])
    : [mainEntries];
  const worst = <T extends { score: number }>(f: (entries: DeckEntry[]) => T): T =>
    estimatorSets.map(f).reduce((a, b) => (b.score < a.score ? b : a));

  const mana = worst((entries) => computeMana(format, norms, accessSlots, entries, commanderFeatures));
  const curve = worst((entries) => computeCurve(format, norms, archetype, accessSlots, entries, commanderCmc));
  const interaction = computeInteraction(format, norms, archetype, N, mainEntries);
  const advantage = computeAdvantage(format, norms, archetype, accessSlots, mainEntries);
  const win = worst((entries) => computeWin(format, norms, archetype, accessSlots, entries, commanderFeatures, {
    E: interaction.E, Estar: interaction.Estar,
    D: advantage.D, Dstar: advantage.Dstar, hasDrawEngine: advantage.hasDrawEngine,
  }));
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
        win.closing, Math.max(1, N), nonLandEntries, planSupply, utilisation, profile,
        // §9.5: complete compatible backups joining the root line's package.
        win.closingLines.filter((l) => l.id !== win.closing?.id),
        slots,
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
  // §10.5: an unresolved name/commander is missing evidence, so the estimate
  // it produces is provisional — the cap it used to impose is gone.
  const evidenceTriggered = coverageTriggered || structure.reservedSlots > 0 || structure.unknownCommander;

  const hardCaps = structure.hardCaps;
  const rawScore = Math.min(base, qCap, ...(hardCaps.length ? hardCaps : [Infinity]));
  const absoluteTotal = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0;
  const score = Math.round(absoluteTotal);

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
    absoluteTotal,
    components: COMPONENT_ORDER.map((key) => ({ key, score: scores[key], weight: weights[key], reason: reasons[key] })),
    gates,
    detail: {
      plan: finalPlan.recipe.key, U: synergy.usefulMass, D: synergy.D,
      Qslot: synergy.Q, R: synergy.R, typedCoverage,
    },
    provisional: evidenceTriggered,
  };
}
