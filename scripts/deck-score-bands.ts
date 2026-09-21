/**
 * Deck Score v1.2 — seed the generic 60-card plan bands from the repository's
 * own Standard corpus. docs/DECK_SCORE_SPEC.md §8 ("seed 60-card bands from
 * reviewed same-format lists, then freeze them").
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts
 *
 * Reviewed same-format lists = the dated positive cohort in
 * `data/export-standard.db` `community_decks` (placement 1 or a 5-0 league
 * run). Decks are assigned to an aggro / midrange / control cohort by MEASURED
 * shape, not by the corpus's colour-based `archetype` label, then each
 * cohort's role supply is measured with that recipe's own predicates.
 *
 * Output is a table of percentiles; the numbers frozen in
 * `src/lib/deck-score-plans.ts` are p25 (min band) and p90 (max band),
 * rounded. Re-running this cannot change the frozen constants — that needs a
 * score-version bump.
 */
import { loadStandardCohorts, loadStandardDbFixture, loadCedhCohort, loadDataset, standardEventFamilies, OUT_DIR } from './deck-score-fixtures';
import { loadMatchedPiles, loadCohortPiles, loadStudyControls, strideOrder, readSample, cardsByName, cohortSeed, HOLDOUT_EVERY, type SampleCohort, type SampleProfile } from './deck-score-piles';
import { readManifest, verifyCohortHashes, sha256 } from './deck-score-cohorts';
import {
  REFERENCE_VERSION, buildReferenceKnots, meanReferenceRank, referenceFor,
  type DeckScoreReference,
} from '../src/lib/deck-score-reference';
import { scoreDeck } from '../src/lib/deck-score';
import type { DbCard } from '../src/lib/types';
import { deriveCardFeature, type CardFeature } from '../src/lib/deck-score-features';
import { typalTheme, typalRecipe, evaluatePlan, evaluateTypal, evaluateClosing, isManlandFinisher, recipesFor, selectPlan, planFit, CLOSING_SUPPORT_BAND } from '../src/lib/deck-score-plans';
import { PLAN_RECIPES, recipeFor, qBaselineFor, betterPlan, COMMANDER_BAND_REFERENCE, type PlanKey, type PlanRecipe } from '../src/lib/deck-score-plans';
import { producerUtilisation } from '../src/lib/deck-score-producers';
import { Q_BASELINE, Q_BASELINE_JOINT_COMMANDER, Q_BASELINE_JOINT_BRAWL, Q_BASELINE_CLOSING,
  Q_BASELINE_CLOSING_BRAWL, qSaturationFor, qSlotSaturationFor, Q_SLOT_SATURATION, normsFor,
  type ScoreProfile, type ScoreFormat } from '../src/lib/deck-score-norms';
import { scoreDeckSafely, explainScoreUnavailable } from '../src/lib/deck-score-input';
import fs from 'fs';
import path from 'path';
import { CATALOG_SIZE, CATALOG_VERSION, catalogEntries } from '../src/lib/deck-score-catalog';
import {
  TYPED_COMBOS, COMBO_TUTORS, MANA_OUTLETS, ETB_OUTLETS, LIBRARY_WIN_CARDS,
  LIBRARY_DRAW_SINKS, UNBOUNDED_DRAW_SINKS, GRAVEYARD_ROUTES,
} from '../src/lib/deck-score-catalog/combos';
import { WIN_FAMILIES, W_SCHEDULER_VERSION } from '../src/lib/deck-score-win';
import { setHorizonOverride } from '../src/lib/deck-score-finishers';
import { SCORE_VERSION } from '../src/lib/deck-score';
import { clip } from '../src/lib/deck-score-math';
import { computeInteraction, computeAdvantage } from '../src/lib/deck-score-interaction';
import { computeWin, winAudit, winDiagnostic, type WinAuditNote } from '../src/lib/deck-score-win';
import type { DeckEntry } from '../src/lib/deck-score-mana';

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[i];
}

/**
 * Cohort assignment is BAND-FREE on purpose: a hand-made "avg MV <= 2.3 is
 * aggro" rule put combo and control lists in the aggro bucket and produced a
 * p25 pressure band of 2. Assign each list to the recipe that claims the most
 * verified on-plan copies, which is the same ordering `selectPlan` uses once
 * the bands exist, without reading the bands being measured.
 */
function shapeCohort(nonLand: DeckEntry[], recipes: readonly PlanRecipe[] = PLAN_RECIPES): PlanKey {
  let best: { key: PlanKey; onPlan: number } = { key: 'midrange', onPlan: -1 };
  for (const recipe of recipes) {
    const onPlan = nonLand
      .filter((e) => e.feature.s >= 1 && recipe.roles.some((r) => r.essential && r.fills(e.feature)))
      .reduce((s, e) => s + e.quantity, 0);
    if (onPlan > best.onPlan) best = { key: recipe.key, onPlan };
  }
  return best.key;
}

/** `--probe <community_decks.id>` dumps one list's per-card role assignment —
 * the only way to tell a real band from a classifier gap. */
function probe(deckId: number): void {
  const deck = loadStandardDbFixture(deckId);
  const nonLand: DeckEntry[] = deck.input.main
    .map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }))
    .filter((e) => !e.feature.isLand);
  const cohort = shapeCohort(nonLand);
  const recipe = recipeFor(cohort);
  const lines = [`deck ${deckId} -> cohort ${cohort}`, '| qty | card | c | power | s | categories | role |', '|---:|---|---:|---:|---:|---|---|'];
  for (const e of nonLand) {
    const role = e.feature.s >= 1 ? recipe.roles.find((r) => r.fills(e.feature))?.key ?? '-' : 'unknown (s<1)';
    lines.push(`| ${e.quantity} | ${e.feature.card.name} | ${e.feature.c} | ${e.feature.power ?? ''} | ${e.feature.s} | ${e.feature.categories.join('/')} | ${role} |`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}


// ── Commander bands ───────────────────────────────────────────────────────
//
// §8 froze the generic bands on 60-card Standard lists and `evaluatePlan`
// scaled them by N/60. A 99-card Commander pile carries ~1.7x the nonland
// copies, so the scaling cancelled and every role floor landed inside the
// pile's own spread. These are measured on real Commander decks instead:
// `verify-2026-09-20/commander-sample.csv` (deck_id, commander, card_name,
// board, quantity), a stratified pull from the VPS corpus, read by
// `deck-score-piles.ts`.

/**
 * §9.1 "Remeasure the p25/p90 bands using this SAME evaluator". `raw` supply
 * is the bare `fills` match; `evaluated` supply is what `evaluatePlan` hands
 * to R — deployment cutoff, producer utilisation and `servedBy` bounds
 * applied. The v1.2 Commander bands were frozen from raw supply, so the flag
 * defaults to that; the v1.3 engine recipes are frozen from the evaluated
 * measurement, because a role with a deadline is otherwise given a floor that
 * counts copies the scorer then refuses to cast.
 */
function evaluatedSupply(
  nonLand: DeckEntry[], N: number, recipe: PlanRecipe, raw: boolean, profile: SampleProfile = 'commander',
): Map<string, number> {
  // `raw` lifts ONLY the typed-coverage gate, so the evaluated bands describe
  // the same card population the v1.2 raw bands did. Corpus coverage is a
  // property of the catalogue's size, not of the decks: gating here would
  // freeze floors of p25 = 0 that every pile clears.
  const entries = raw
    ? nonLand.map((e) => ({ ...e, feature: { ...e.feature, covered: true } }))
    : nonLand;
  const evaluation = evaluatePlan(recipe, N, entries, [], undefined, profile);
  return new Map(evaluation.roles.map((r) => [r.role.key, r.supply]));
}

/**
 * Stage 4a: bands are measured on the TRAINING cohort only — every list of the
 * 100 holdout commanders is excluded, so no band is fitted to a commander the
 * acceptance controls are drawn from. The order is `strideOrder`'s round-robin
 * over commanders, so a truncated run is still commander-balanced.
 */
function cohortSample(cohort: SampleCohort | 'all', profile: SampleProfile = 'commander'): SampleDeckWithIndex[] {
  const sample = readSample(profile);
  if (cohort === 'all') return sample.map((deck, i) => ({ deck, i }));
  return strideOrder(cohort, sample).map((i) => ({ deck: sample[i], i }));
}
type SampleDeckWithIndex = { deck: ReturnType<typeof readSample>[number]; i: number };

/** One measured band cell: the statistic `bands verify` re-derives and grades
 * the frozen `role.cmd` / `role.brawl` against. `inherited` marks the ten
 * stage-4b roles deliberately left on the Commander band, which `verify`
 * reports but does not fail on. */
export interface BandRow {
  plan: PlanKey; role: string; n: number; p25: number; p90: number;
  frozen: { min: number; max: number } | null; inherited: boolean;
}

function commanderBands(
  raw: boolean, evaluated = false, cohort: SampleCohort | 'all' = 'training',
  profile: SampleProfile = 'commander', quiet = false,
): BandRow[] {
  const measured: BandRow[] = [];
  const byName = cardsByName();
  const decks = cohortSample(cohort, profile).map((r) => r.deck);
  const buckets = Object.fromEntries(PLAN_RECIPES.map((r) => [r.key, [] as DeckEntry[][]])) as Record<PlanKey, DeckEntry[][]>;
  const deckSize = new Map<DeckEntry[], number>();
  let unresolved = 0;
  let resolvedDecks = 0;

  for (const deck of decks) {
    const entries: DeckEntry[] = [];
    let missing = 0;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing++; continue; }
      entries.push({ feature: deriveCardFeature(card), quantity: line.quantity });
    }
    unresolved += missing;
    const nonLand = entries.filter((e) => !e.feature.isLand);
    // A list that lost more than a tenth of itself is not a measurement.
    if (nonLand.length === 0 || missing > deck.cards.length * 0.1) continue;
    resolvedDecks++;
    buckets[shapeCohort(nonLand)].push(nonLand);
    deckSize.set(nonLand, entries.reduce((a, e) => a + e.quantity, 0));
  }

  const lines = [`${profile} sample (${cohort} cohort): ${decks.length} decks, ${resolvedDecks} resolved, ${unresolved} unresolved card rows, ${new Set(decks.map((d) => d.commander.toLowerCase())).size} distinct commanders`];
  for (const recipe of PLAN_RECIPES) {
    const cohort = buckets[recipe.key];
    lines.push('', `## ${recipe.key} (n=${cohort.length}) — ${recipe.label}`);
    lines.push('| role | p10 | p25 | median | p75 | p90 | frozen min/max |');
    lines.push('|---|---:|---:|---:|---:|---:|---|');
    const sizes = cohort.map((d) => d.reduce((a, e) => a + e.quantity, 0)).sort((a, b) => a - b);
    lines.push(`| (nonland copies) | ${pct(sizes, 10)} | ${pct(sizes, 25)} | ${pct(sizes, 50)} | ${pct(sizes, 75)} | ${pct(sizes, 90)} | - |`);
    // In `--evaluated` mode a deck only enters the cohort if it holds at least
    // one copy of EVERY essential role. §1 seeds a band from reviewed lists
    // OF THAT PLAN, and `shapeCohort` counts raw-material roles too, so a deck
    // with twenty ordinary bodies, no +1/+1 payoff and no counter source was
    // landing in the counters cohort and dragging its payoff p25 to 1 — a
    // floor every pile clears. 10 of the 14 stride-holdout leaks were exactly
    // that recipe.
    const evaluatedRows = evaluated
      ? cohort
        .map((nonLand) => ({ nonLand, supply: evaluatedSupply(nonLand, deckSize.get(nonLand) ?? COMMANDER_BAND_REFERENCE, recipe, raw, profile) }))
        .filter(({ supply }) => recipe.roles.every((r) => !r.essential || (supply.get(r.key) ?? 0) > 0))
        .map(({ supply }) => supply)
      : [];
    if (evaluated) lines[lines.length - 4] = `## ${recipe.key} (n=${evaluatedRows.length} of ${cohort.length} with every essential present) — ${recipe.label}`;
    for (const role of recipe.roles) {
      const supplies = (evaluated
        ? evaluatedRows.map((m) => m.get(role.key) ?? 0)
        : cohort.map((nonLand) => nonLand
          .filter((e) => e.feature.s >= 1 && (raw || e.feature.covered) && recipe.roles.find((r) => r.fills(e.feature))?.key === role.key)
          .reduce((a, e) => a + e.quantity, 0))
      ).sort((a, b) => a - b);
      const f = (x: number) => (Number.isFinite(x) ? (evaluated ? x.toFixed(1) : String(x)) : '-');
      const frozen = profile === 'brawl' ? role.brawl ?? role.cmd : role.cmd;
      const label = profile === 'brawl' && !role.brawl ? ' (cmd)' : '';
      measured.push({
        plan: recipe.key, role: role.key, n: supplies.length,
        p25: pct(supplies, 25), p90: pct(supplies, 90),
        frozen: frozen ? { min: frozen.min, max: frozen.max } : null,
        inherited: profile === 'brawl' && !role.brawl,
      });
      lines.push(`| ${role.key} | ${f(pct(supplies, 10))} | ${f(pct(supplies, 25))} | ${f(pct(supplies, 50))} | ${f(pct(supplies, 75))} | ${f(pct(supplies, 90))} | ${frozen ? `${frozen.min}/${frozen.max}${label}` : `${role.min}/${role.max} (60-card)`} |`);
    }
  }
  if (!quiet) console.log(lines.join('\n'));
  return measured;
}

/** p25/p90 of the dynamic typal recipe's roles, over the sample decks that
 * actually name a countable theme. */
function typalBands(profile: SampleProfile = 'commander'): void {
  const byName = cardsByName();
  const rows: Record<string, number[]> = { payoff: [], enabler: [] };
  let decks = 0;
  for (const { deck } of cohortSample('training', profile)) {
    const entries: DeckEntry[] = [];
    let missing = 0;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing++; continue; }
      entries.push({ feature: deriveCardFeature(card), quantity: line.quantity });
    }
    const nonLand = entries.filter((e) => !e.feature.isLand);
    if (nonLand.length === 0 || missing > deck.cards.length * 0.1) continue;
    const theme = typalTheme(nonLand.map((e) => e.feature));
    if (theme.tribes.length === 0 && !theme.artifacts && !theme.party) continue;
    decks++;
    const recipe = typalRecipe(theme);
    for (const role of recipe.roles) {
      if (!(role.key in rows)) continue;
      rows[role.key].push(nonLand
        .filter((e) => e.feature.s >= 1 && recipe.roles.find((r) => r.fills(e.feature))?.key === role.key)
        .reduce((a, e) => a + e.quantity, 0));
    }
  }
  console.log(`typal cohort (${profile}): ${decks} decks`);
  console.log('| role | p10 | p25 | median | p75 | p90 |');
  for (const [k, v] of Object.entries(rows)) {
    v.sort((a, b) => a - b);
    console.log(`| ${k} | ${pct(v, 10)} | ${pct(v, 25)} | ${pct(v, 50)} | ${pct(v, 75)} | ${pct(v, 90)} |`);
  }
}

// ── §9.2 negative-control prior ───────────────────────────────────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts negative [--n 1000]
//
// Freezes `Q_BASELINE_JOINT_COMMANDER` at the 95th percentile of
// `max(Q_aggro, Q_midrange, Q_control)` over land/curve/colour-matched
// Commander controls whose commanders and seeds are held out from the 200
// validation piles and from every §5 fixture. `b >= .70` rejects the statistic
// (§9.2) — at that point the generic recipes cannot separate anything and the
// answer is a recipe change, not a prior.

const GENERIC: PlanKey[] = ['aggro', 'midrange', 'control'];

function genericQ(
  input: Parameters<typeof scoreDeck>[0], profile: SampleProfile = 'commander',
): { q: number; key: PlanKey; coverage: number } {
  const entries: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
  const nonLand = entries.filter((e) => !e.feature.isLand);
  const commanders: DeckEntry[] = input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
  const N = entries.reduce((a, e) => a + e.quantity, 0);
  const util = producerUtilisation(nonLand, commanders);
  let best = { q: 0, key: GENERIC[0] };
  for (const key of GENERIC) {
    const evaluation = evaluatePlan(recipeFor(key), N, nonLand, commanders, util, profile);
    if (evaluation.Q > best.q) best = { q: evaluation.Q, key };
  }
  const F = nonLand.reduce((a, e) => a + e.quantity, 0);
  const covered = nonLand.filter((e) => e.feature.covered).reduce((a, e) => a + e.quantity, 0);
  return { ...best, coverage: F > 0 ? covered / F : 1 };
}

/**
 * §9.6 step 3 — the ENGINE floor, measured the same way §9.2 measured the
 * generic one. For every non-generic recipe, the Q it reads on a matched
 * control, restricted to the controls where that recipe could actually be
 * SELECTED (no empty essential): a plan the pile holds no piece of never
 * reaches `betterPlan`, so including those Q values would measure a
 * population the floor never grades.
 *
 * `typal` is derived per deck and `combo` from the assembled closing line, so
 * both are evaluated through their own constructors rather than PLAN_RECIPES.
 */
function engineFloors(n: number, profile: SampleProfile = 'commander', quiet = false): { joint95: number; n: number } {
  // The coverage target is the Commander reference cohort's median in BOTH
  // profiles: it is a property of the catalogue, not of the format, and no
  // reviewed Brawl cohort exists to measure a separate one from.
  const positives = loadCedhCohort().map((d) => genericQ(d.input).coverage).sort((a, b) => a - b);
  const target = pct(positives, 50);
  const piles = loadCohortPiles('training', n, target, profile);
  const generic = new Set<PlanKey>(['aggro', 'midrange', 'control']);
  const families = PLAN_RECIPES.filter((r) => !generic.has(r.key));
  const perFamily = new Map<string, number[]>(families.map((r) => [r.key, []]));
  perFamily.set('typal', []);
  // One row per pile: every recipe it could be READ as, with the Q and the R
  // the scorer would use. The floor-choice table below re-derives `planFit`
  // from these, so a candidate floor is graded on selection as well as on the
  // leak rate — a higher floor can also change WHICH recipe wins.
  type Read = { key: string; Q: number; R: number; selectable: boolean; group: 'generic' | 'engine' };
  const perPile: Read[][] = [];

  for (const pile of piles) {
    const entries: DeckEntry[] = pile.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const nonLand = entries.filter((e) => !e.feature.isLand);
    const cmd: DeckEntry[] = pile.input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
    const N = entries.reduce((a, e) => a + e.quantity, 0);
    const util = producerUtilisation(nonLand, cmd);
    const reads: Read[] = [];
    const record = (key: string, e: ReturnType<typeof evaluatePlan>, group: 'generic' | 'engine'): void => {
      reads.push({ key, Q: e.Q, R: e.R, selectable: !e.hasEmptyEssential, group });
      if (group === 'engine' && !e.hasEmptyEssential) perFamily.get(key)?.push(e.Q);
    };
    for (const recipe of families) record(recipe.key, evaluatePlan(recipe, N, nonLand, cmd, util, profile), 'engine');
    const typal = evaluateTypal(N, nonLand, cmd, util, profile);
    if (typal) record('typal', typal, 'engine');
    for (const key of GENERIC) record(key, evaluatePlan(recipeFor(key), N, nonLand, cmd, util, profile), 'generic');
    perPile.push(reads);
  }

  // A family's floor grades only the piles where that family is SELECTABLE —
  // a plan the pile holds no piece of never reaches `betterPlan`.
  const maxOf = (group: 'generic' | 'engine' | 'all') => perPile
    .map((reads) => reads
      .filter((r) => r.selectable && (group === 'all' || r.group === group))
      .reduce((m, r) => Math.max(m, r.Q), 0))
    .sort((a, b) => a - b);
  const maxEngine = maxOf('engine');
  const maxGeneric = maxOf('generic');
  const maxJoint = maxOf('all');

  const lines = [
    `matched ${profile} negative controls: n=${piles.length}, cohort training (commander-disjoint stride, ` +
      `${new Set(piles.map((p) => p.commander)).size} distinct commanders), seed base 0x${cohortSeed('training', profile).toString(16)}, ` +
      `coverage target ${target.toFixed(3)}`,
    '',
    '| family | selectable n | Q p50 | Q p90 | Q p95 (= floor) | Q p99 | Q max | frozen |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const [key, values] of perFamily) {
    const v = [...values].sort((a, b) => a - b);
    const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : '-');
    lines.push(`| ${key} | ${v.length} | ${fmt(pct(v, 50))} | ${fmt(pct(v, 90))} | ${fmt(pct(v, 95))} | ${fmt(pct(v, 99))} | ${fmt(v[v.length - 1])} | ${qBaselineFor(profile, key as PlanKey).toFixed(3)} |`);
  }
  const row = (label: string, v: number[], frozen: string): void => {
    lines.push(`| ${label} | ${v.length} | ${pct(v, 50).toFixed(3)} | ${pct(v, 90).toFixed(3)} | ${pct(v, 95).toFixed(3)} | ${pct(v, 99).toFixed(3)} | ${v[v.length - 1].toFixed(3)} | ${frozen} |`);
  };
  // THREE candidate statistics. Two p95s bound two groups at 5% EACH, not
  // their union at 5%: a pile leaks through whichever of eleven recipes fits
  // it. The JOINT row is the only one that bounds the union.
  row('ALL ENGINE (max per pile)', maxEngine, '-');
  row('GENERIC (max per pile)', maxGeneric, '-');
  const frozenJoint = profile === 'brawl' ? Q_BASELINE_JOINT_BRAWL : Q_BASELINE_JOINT_COMMANDER;
  row('JOINT (max over all recipes)', maxJoint, frozenJoint.toFixed(3));

  // In-sample leak rate under each candidate, reproducing `planFit` + the
  // selectable-first rule of `betterPlan` from the Q/R already measured.
  const sUnder = (bGeneric: number, bEngine: number): number[] => perPile.map((reads) => {
    const fit = (r: Read): number => {
      const b = r.group === 'generic' ? bGeneric : bEngine;
      return clip((r.Q - b) / (qSaturationFor(profile) - b)) * r.R;
    };
    const pool = reads.some((r) => r.selectable) ? reads.filter((r) => r.selectable) : reads;
    return 100 * pool.reduce((m, r) => Math.max(m, fit(r)), 0);
  });
  lines.push('', '| floor choice | generic b | engine b | in-sample S <= 5 | S median | S p95 |', '|---|---:|---:|---:|---:|---:|');
  const choice = (label: string, bg: number, be: number): void => {
    const S = sUnder(bg, be).sort((a, b) => a - b);
    lines.push(`| ${label} | ${bg.toFixed(3)} | ${be.toFixed(3)} | ${S.filter((v) => v <= 5).length}/${S.length} | ${pct(S, 50).toFixed(1)} | ${pct(S, 95).toFixed(1)} |`);
  };
  choice('frozen', frozenJoint, frozenJoint);
  choice('two floors (per-group p95)', pct(maxGeneric, 95), pct(maxEngine, 95));
  choice('one shared floor (joint p95)', pct(maxJoint, 95), pct(maxJoint, 95));
  if (!quiet) console.log(lines.join('\n'));
  return { joint95: pct(maxJoint, 95), n: piles.length };
}

function negativePrior(n: number, profile: SampleProfile = 'commander'): void {
  // §9.2 "match typed coverage to positives so unknown cards are not the
  // discriminator": the Commander reference cohort is the 30 cEDH Top-16
  // lists, and its MEDIAN typed coverage is what the controls are drawn to.
  const positives = loadCedhCohort().map((d) => genericQ(d.input).coverage).sort((a, b2) => a - b2);
  const target = pct(positives, 50);

  const piles = loadCohortPiles('training', n, target, profile);
  const rows = piles.map((p) => ({ ...genericQ(p.input, profile), commander: p.commander, lands: p.lands }));
  const qs = rows.map((r) => r.q).sort((a, b2) => a - b2);
  const b = pct(qs, 95);
  const pileCoverage = rows.map((r) => r.coverage).sort((a, b2) => a - b2);
  const landsSorted = rows.map((r) => r.lands).sort((a, b2) => a - b2);
  const byKey = GENERIC.map((k) => `${k} ${rows.filter((r) => r.key === k).length}`).join(', ');

  console.log([
    `matched ${profile} negative controls: n=${rows.length}, ${new Set(rows.map((r) => r.commander)).size} distinct commanders`,
    `land count p25/median/p90: ${pct(landsSorted, 25)}/${pct(landsSorted, 50)}/${pct(landsSorted, 90)}`,
    `winning generic recipe: ${byKey}`,
    '',
    '| statistic | value |',
    '|---|---:|',
    `| max-generic Q p50 | ${pct(qs, 50).toFixed(3)} |`,
    `| max-generic Q p90 | ${pct(qs, 90).toFixed(3)} |`,
    `| max-generic Q p95 (= b) | ${b.toFixed(3)} |`,
    `| max-generic Q p99 | ${pct(qs, 99).toFixed(3)} |`,
    `| max-generic Q max | ${qs[qs.length - 1].toFixed(3)} |`,
    `| cEDH positive typed coverage median (draw target) | ${target.toFixed(3)} |`,
    `| control typed coverage p25/median/p90 | ${pct(pileCoverage, 25).toFixed(3)}/${pct(pileCoverage, 50).toFixed(3)}/${pct(pileCoverage, 90).toFixed(3)} |`,
    '',
    `frozen ${profile === 'brawl' ? 'Q_BASELINE_JOINT_BRAWL' : 'Q_BASELINE_JOINT_COMMANDER'} = ${profile === 'brawl' ? Q_BASELINE_JOINT_BRAWL : Q_BASELINE_JOINT_COMMANDER}` +
      ` (measured ${b.toFixed(3)}; ${b >= qSaturationFor(profile) ? 'REJECTED: b >= saturation' : 'accepted'})`,
    `S <= 5 needs Q <= b + .05*(Qsat-b) = ${(b + 0.05 * (qSaturationFor(profile) - b)).toFixed(3)} at R = 1 (Qsat ${qSaturationFor(profile).toFixed(3)}).`,
  ].join('\n'));
}

/**
 * `controls` — the §9.2 acceptance run on FRESH matched negative controls:
 * sample lists and seeds disjoint from both the b-training set (offset 0) and
 * the 200 §5 validation piles. Prints the same two counts acceptance asks for.
 */
function freshControls(n: number, stride: boolean, training = false, profile: SampleProfile = 'commander'): void {
  // MEASURED CONFOUND. `commander-sample.csv` holds TEN lists per commander in
  // file order, so the contiguous slice at offset 2000 is 200 piles drawn from
  // 22 commanders — 22 clusters, not 200 draws. A floor frozen at the p95 of a
  // 100-commander cohort cannot be expected to hold 95% of a 22-commander one,
  // and the measurement bears that out: this slice's own max-generic Q p95 is
  // .574 against the training cohort's .542
  // (`verify-2026-09-19/deck-score/engine-floor-fresh.txt`).
  // Stage 4a replaces the index split with a COMMANDER split (`strideOrder`):
  // `--stride` is the holdout cohort — 100 commanders that appear in no floor
  // and in no band — drawn round-robin so any prefix is commander-balanced.
  // `--training` re-runs the acceptance counts on the SAME cohort the floors
  // were frozen from, which is the only way to tell "the floor is too low" from
  // "the floor is a p95 of a different population". The contiguous default is
  // KEPT and reported for information only: it is the stage-3 instrument.
  const piles = training
    ? loadCohortPiles('training', n, 0.93, profile)
    : stride
      ? loadCohortPiles('holdout', n, 0.93, profile)
      : loadMatchedPiles(n, 2000, 0xf00d0000, 0.93, undefined, profile);
  const scored = piles.map((p) => {
    const r = scoreDeck(p.input);
    const entries: DeckEntry[] = p.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const nonLand = entries.filter((e) => !e.feature.isLand);
    const cmd: DeckEntry[] = p.input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
    const N = entries.reduce((a, e) => a + e.quantity, 0);
    const plan = selectPlan(Math.max(1, N), nonLand, cmd, undefined, profile);
    // The closing plan is folded in INSIDE `scoreDeck` (after W names a line),
    // so the only place its selection shows is the synergy reason line. A pile
    // must never read as `combo` — §9.5 prices it by completing its own line.
    const reason = r.components.find((c) => c.key === 'synergy')?.reason ?? '';
    return {
      total: r.score, S: r.components.find((c) => c.key === 'synergy')?.score ?? 0,
      W: r.components.find((c) => c.key === 'win')?.score ?? 0,
      commander: p.commander, key: plan.recipe.key, Q: plan.Q, R: plan.R,
      scored: /supports ([\w-]+);/.exec(reason)?.[1] ?? '?',
    };
  });
  const totals = scored.map((r) => r.total).sort((a, b) => a - b);
  const syn = scored.map((r) => r.S).sort((a, b) => a - b);
  const leaking = scored.filter((r) => r.S > 5);
  const tally = new Map<string, number>();
  for (const r of leaking) tally.set(r.key, (tally.get(r.key) ?? 0) + 1);
  // Each leak row carries the floor its recipe actually answered to, so a
  // recipe-family tally can never again be read as "engine plans" when half of
  // it is the generic trio at the measured prior (the stage-2 misreading).
  const byKey = [...tally].sort((a, b) => b[1] - a[1]).map(([k, v]) => {
    const rows = leaking.filter((r) => r.key === k);
    const qs = rows.map((r) => r.Q).sort((a, b) => a - b);
    return `${k} ${v} (b=${qBaselineFor(profile, k as PlanKey).toFixed(3)}, Q med ${pct(qs, 50).toFixed(3)})`;
  });
  console.log([
    `fresh matched ${profile} controls: n=${scored.length}, ${new Set(scored.map((r) => r.commander)).size} distinct commanders`,
    `total   min=${totals[0]} median=${pct(totals, 50)} p95=${pct(totals, 95)} max=${totals[totals.length - 1]}  <25: ${totals.filter((v) => v < 25).length}/${totals.length}`,
    `S       min=${syn[0].toFixed(1)} median=${pct(syn, 50).toFixed(1)} p95=${pct(syn, 95).toFixed(1)} max=${syn[syn.length - 1].toFixed(1)}  <=5: ${syn.filter((v) => v <= 5).length}/${syn.length}`,
    // §10.8 item 4: pile W quantiles, for the ordering gate against eligible real W.
    `W       p10/p50/p90 = ${[10, 50, 90].map((p) => pct(scored.map((r) => r.W).sort((a, b) => a - b), p).toFixed(1)).join(' / ')}`,
    `S > 5 by selected recipe: ${byKey.join(', ') || 'none'}`,
    `S > 5 Q/R median: ${pct(leaking.map((r) => r.Q).sort((a, b) => a - b), 50).toFixed(3)} / ${pct(leaking.map((r) => r.R).sort((a, b) => a - b), 50).toFixed(3)}`,
    `closing (combo) reads: ${scored.filter((r) => r.scored === 'combo').length}/${scored.length}` +
      `${scored.filter((r) => r.scored === 'combo').map((r) => ` [${r.commander} S ${r.S.toFixed(1)} total ${r.total}]`).join('')}`,
    `S > 5 by commander: ${[...leaking.reduce((m, r) => m.set(r.commander, (m.get(r.commander) ?? 0) + 1), new Map<string, number>())]
      .sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`,
  ].join('\n'));
}

// ── §9.5 closing support bands ────────────────────────────────────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts closing
//
// Upper bands for the closing plan's SUPPORT roles, measured on the TRAINING
// split of the 30 reviewed cEDH Top-16 lists (the first 20 in file order); the
// last 10 are the holdout the acceptance run reports separately, and never
// enter a band. `pieces` is excluded on purpose: a line needs its own pieces,
// whatever a cohort of other decks holds.

function closingBands(): void {
  const decks = loadCedhCohort();
  const training = decks.slice(0, 20);
  const holdout = decks.slice(20);
  const rows = new Map<string, number[]>();
  let withLine = 0;
  const collect = (list: typeof decks, into: Map<string, number[]> | null): number => {
    let n = 0;
    for (const deck of list) {
      const entries: DeckEntry[] = deck.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
      const nonLand = entries.filter((e) => !e.feature.isLand);
      const cmd: DeckEntry[] = deck.input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
      const N = entries.reduce((a, e) => a + e.quantity, 0);
      const norms = normsFor('commander');
      const util = producerUtilisation(nonLand, cmd);
      const interaction = computeInteraction('commander', norms, 'combo', N, entries);
      const advantage = computeAdvantage('commander', norms, 'combo', N, entries);
      const win = computeWin('commander', norms, 'combo', N, entries, cmd.map((e) => e.feature), {
        E: interaction.E, Estar: interaction.Estar,
        D: advantage.D, Dstar: advantage.Dstar, hasDrawEngine: advantage.hasDrawEngine,
      });
      if (!win.closing) continue;
      n++;
      const evaluation = evaluateClosing(win.closing, Math.max(1, N), nonLand, cmd, util, 'commander',
        win.closingLines.filter((l) => l.id !== win.closing?.id));
      if (!into) continue;
      for (const role of evaluation.roles) {
        if (role.role.key === 'pieces') continue;
        if (!into.has(role.role.key)) into.set(role.role.key, []);
        into.get(role.role.key)?.push(role.supply);
      }
    }
    return n;
  };
  withLine = collect(training, rows);
  const holdoutWithLine = collect(holdout, null);

  const lines = [
    `cEDH closing support bands: ${withLine}/${training.length} training lists assemble a line ` +
    `(holdout ${holdoutWithLine}/${holdout.length}, not measured)`,
    '',
    '| support role | p10 | p25 | median | p75 | p90 (= upper band) | frozen min/max |',
    '|---|---:|---:|---:|---:|---:|---|',
  ];
  for (const [key, values] of rows) {
    const v = [...values].sort((a, b) => a - b);
    const band = (CLOSING_SUPPORT_BAND as Record<string, { min?: number; max: number }>)[key];
    lines.push(`| ${key} | ${pct(v, 10).toFixed(1)} | ${pct(v, 25).toFixed(1)} | ${pct(v, 50).toFixed(1)} | ${pct(v, 75).toFixed(1)} | ${pct(v, 90).toFixed(1)} | ${band ? `${band.min ?? '-'}/${band.max}` : '-'} |`);
  }
  console.log(lines.join('\n'));
}

/**
 * §9.5 acceptance: the 30 reviewed cEDH lists split the same way the support
 * bands were — first 20 training, last 10 holdout, which never entered a band.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts cedh
 */
function cedhSplit(): void {
  const decks = loadCedhCohort();
  const rows = decks.map((deck) => {
    const result = scoreDeck(deck.input);
    const entries: DeckEntry[] = deck.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const nonLand = entries.filter((e) => !e.feature.isLand);
    const cmd: DeckEntry[] = deck.input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
    const N = entries.reduce((a, e) => a + e.quantity, 0);
    // The FINAL plan, the way `scoreDeck` builds it: the closing package joins
    // §1's ordering after W has named the line, so a cEDH list that reads its
    // combo only reads it here.
    const norms = normsFor('commander');
    const util = producerUtilisation(nonLand, cmd);
    const interaction = computeInteraction('commander', norms, 'combo', N, entries);
    const advantage = computeAdvantage('commander', norms, 'combo', N, entries);
    const win = computeWin('commander', norms, 'combo', N, entries, cmd.map((e) => e.feature), {
      E: interaction.E, Estar: interaction.Estar,
      D: advantage.D, Dstar: advantage.Dstar, hasDrawEngine: advantage.hasDrawEngine,
    });
    const base = selectPlan(Math.max(1, N), nonLand, cmd, util, 'commander');
    const plan = win.closing
      ? betterPlan(base, evaluateClosing(win.closing, Math.max(1, N), nonLand, cmd, util, 'commander',
        win.closingLines.filter((l) => l.id !== win.closing?.id)), 'commander')
      : base;
    return {
      total: result.score,
      S: result.components.find((c) => c.key === 'synergy')?.score ?? 0,
      key: plan.recipe.key,
      Q: plan.Q,
    };
  });
  const med = (v: number[]) => pct([...v].sort((a, b) => a - b), 50);
  const block = (label: string, part: typeof rows): string => {
    const combo = part.filter((r) => r.key === 'combo');
    return `| ${label} | ${part.length} | ${med(part.map((r) => r.total))} | ${med(part.map((r) => r.S)).toFixed(1)} | ` +
      `${combo.length} | ${combo.length ? med(combo.map((r) => r.Q)).toFixed(3) : '-'} |`;
  };
  console.log([
    '| cohort | n | total median | S median | combo-plan reads | combo Q median |',
    '|---|---:|---:|---:|---:|---:|',
    block('training (first 20)', rows.slice(0, 20)),
    block('holdout (last 10)', rows.slice(20)),
    block('all 30', rows),
  ].join('\n'));
}

// ── §9.1 Standard bands ───────────────────────────────────────────────────

/** The same supply the scorer sees: probability-weighted by the role deadline,
 * discounted by producer utilisation, with manland finishers supplying R. */
function standardSupply(input: Parameters<typeof scoreDeck>[0], recipe: PlanRecipe): Map<string, number> {
  const entries: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
  const nonLand = entries.filter((e) => !e.feature.isLand);
  const supply = entries.filter((e) => isManlandFinisher(e.feature));
  const N = entries.reduce((a, e) => a + e.quantity, 0);
  const evaluation = evaluatePlan(recipe, N, nonLand, supply, undefined, 'standard');
  return new Map(evaluation.roles.map((r) => [r.role.key, r.supply]));
}

function standardBands(): void {
  const { positive } = loadStandardCohorts(3000);
  // §9.1 "Re-measure the Standard p25/p90 bands on the TRAINING lists" — the
  // same chronological split deck-score-calibrate.ts validates on, so the
  // bands are never fitted to the held-out cohort they are graded against.
  const sorted = [...positive].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const training = sorted.slice(0, Math.floor(sorted.length * 0.6));
  const recipes = recipesFor('standard');
  const buckets = Object.fromEntries(recipes.map((r) => [r.key, [] as typeof training])) as Record<PlanKey, typeof training>;

  for (const deck of training) {
    const nonLand: DeckEntry[] = deck.input.main
      .map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }))
      .filter((e) => !e.feature.isLand);
    if (nonLand.length === 0) continue;
    buckets[shapeCohort(nonLand, recipes)].push(deck);
  }

  const lines = [`dated Standard positives: ${positive.length} total, ${training.length} in the training split (oldest 60% by event_date)`];
  for (const recipe of recipes) {
    const decks = buckets[recipe.key];
    lines.push('', `## ${recipe.key} (n=${decks.length}) — ${recipe.label}`);
    lines.push('| role | p10 | p25 | median | p75 | p90 | frozen min/max |');
    lines.push('|---|---:|---:|---:|---:|---:|---|');
    const supplies = decks.map((d) => standardSupply(d.input, recipe));
    for (const role of recipe.roles) {
      const v = supplies.map((m) => m.get(role.key) ?? 0).sort((a, b) => a - b);
      const f = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-');
      lines.push(`| ${role.key} | ${f(pct(v, 10))} | ${f(pct(v, 25))} | ${f(pct(v, 50))} | ${f(pct(v, 75))} | ${f(pct(v, 90))} | ${role.min}/${role.max} |`);
    }
  }
  console.log(lines.join('\n'));
}


// ── stage 4b: the closing/`combo` floor ───────────────────────────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts closingfloor [--n 1000]
//
// Every other recipe moved to a measured negative-control floor in stage 4a;
// `combo` kept `Q_BASELINE` (.30) because §9.5's essential-completion check
// was taken to be its own floor. It is not: one alternate-win card in a
// 99-card control gives a single-member pool that is complete BY
// CONSTRUCTION, so the closing plan reads at a fit of ~.02 while ten priced
// recipes sit pinned at 0 — and wins. That is the stage-4a 1/200.
//
// This prints the SAME joint statistic for `combo` that stage 4a printed for
// the rest: the distribution of the closing plan's Q over matched controls
// that assemble any line at all, the resulting p95, and what each candidate
// rule costs the reviewed cEDH positives (Ballooncon above all, which must
// stay 80-95 on its real line).

interface ClosingRead {
  label: string;
  lineId: string;
  pieces: number;
  required: number;
  Q: number;
  R: number;
  fit: number;
  /** Would the closing plan WIN §1's ordering against the deck's own best
   * generic/engine reading? That is the acceptance-relevant event. */
  wins: boolean;
  total: number;
}

function closingReadOf(
  input: Parameters<typeof scoreDeck>[0], label: string, profile: ScoreProfile,
): ClosingRead | null {
  const entries: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
  const nonLand = entries.filter((e) => !e.feature.isLand);
  const cmd: DeckEntry[] = input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
  const N = entries.reduce((a, e) => a + e.quantity, 0);
  const norms = normsFor(input.format);
  const util = producerUtilisation(nonLand, cmd);
  const interaction = computeInteraction(input.format, norms, 'midrange', N, entries);
  const advantage = computeAdvantage(input.format, norms, 'midrange', N, entries);
  const win = computeWin(input.format, norms, 'midrange', N, entries, cmd.map((e) => e.feature), {
    E: interaction.E, Estar: interaction.Estar,
    D: advantage.D, Dstar: advantage.Dstar, hasDrawEngine: advantage.hasDrawEngine,
  });
  if (!win.closing) return null;
  const closing = evaluateClosing(win.closing, Math.max(1, N), nonLand, cmd, util, profile,
    win.closingLines.filter((l) => l.id !== win.closing?.id));
  const base = selectPlan(Math.max(1, N), nonLand, cmd, util, profile);
  const scored = scoreDeck(input);
  return {
    label, lineId: win.closing.id, pieces: win.closing.pieces.length, required: win.closing.required,
    Q: closing.Q, R: closing.R, fit: planFit(closing, profile),
    wins: betterPlan(base, closing, profile) === closing,
    total: scored.score,
  };
}

function closingFloor(
  n: number, profile: SampleProfile = 'commander', cohort: SampleCohort = 'training', quiet = false,
): { p95: number; n: number; assembled: number } {
  const piles = loadCohortPiles(cohort, n, 0.93, profile);
  const controls = piles
    .map((p) => closingReadOf(p.input, `${p.commander} (${p.sampleId})`, profile))
    .filter((r): r is ClosingRead => r !== null);
  const positives = loadCedhCohort()
    .map((d, i) => closingReadOf(d.input, `cedh-${i}`, 'commander'))
    .filter((r): r is ClosingRead => r !== null);

  const qs = controls.map((r) => r.Q).sort((a, b) => a - b);
  const winners = controls.filter((r) => r.wins);
  const winnerQs = winners.map((r) => r.Q).sort((a, b) => a - b);
  const posQs = positives.map((r) => r.Q).sort((a, b) => a - b);
  const lines = [
    `closing reads over matched ${profile} ${cohort} controls: ${controls.length}/${piles.length} assemble a line, ` +
      `${winners.length} would WIN §1 ordering; reviewed cEDH positives ${positives.length}/30`,
    '',
    '| population | n | Q p50 | Q p90 | Q p95 | Q p99 | Q max |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  const row = (label: string, v: number[]): void => {
    if (v.length === 0) { lines.push(`| ${label} | 0 | - | - | - | - | - |`); return; }
    lines.push(`| ${label} | ${v.length} | ${pct(v, 50).toFixed(3)} | ${pct(v, 90).toFixed(3)} | ` +
      `${pct(v, 95).toFixed(3)} | ${pct(v, 99).toFixed(3)} | ${v[v.length - 1].toFixed(3)} |`);
  };
  row('controls that assemble a line', qs);
  row('controls whose closing plan WINS', winnerQs);
  row('reviewed cEDH positives', posQs);

  // Candidate A: a floor at the control p95, the stage-4a statistic.
  // Candidate B: refuse a single-card pool as an assembled line (r = 1 with a
  // one-member pool is complete by construction, never by deck-building).
  const floorA = pct(qs, 95);
  lines.push('', '| candidate rule | controls still winning | cEDH positives still reading combo | note |', '|---|---:|---:|---|');
  const underFloor = (b: number): ClosingRead[] =>
    controls.filter((r) => r.wins && clip((r.Q - b) / (qSaturationFor(profile) - b)) * r.R > 0);
  lines.push(`| frozen today (b = ${Q_BASELINE.toFixed(3)}) | ${winners.length} | ` +
    `${positives.filter((r) => r.wins).length} | the stage-4a 1/200 |`);
  lines.push(`| A: b = control p95 = ${floorA.toFixed(3)} | ${underFloor(floorA).length} | ` +
    `${positives.filter((r) => r.wins && clip((r.Q - floorA) / (qSaturationFor('commander') - floorA)) * r.R > 0).length} | ` +
    `positives below the floor lose their closing plan |`);
  const oneCard = controls.filter((r) => r.wins && r.pieces <= 1);
  lines.push(`| B: refuse a one-CARD pool (pieces <= 1) | ${winners.length - oneCard.length} | ` +
    `${positives.filter((r) => r.wins && r.pieces > 1).length} | ` +
    `${positives.filter((r) => r.wins && r.pieces <= 1).length} positive(s) have a one-card pool |`);

  lines.push('', '| winning control | line | pieces | r | Q | R | fit | total |', '|---|---|---:|---:|---:|---:|---:|---:|');
  for (const r of winners.sort((a, b) => b.Q - a.Q).slice(0, 20)) {
    lines.push(`| ${r.label} | ${r.lineId} | ${r.pieces} | ${r.required} | ${r.Q.toFixed(3)} | ` +
      `${r.R.toFixed(3)} | ${r.fit.toFixed(3)} | ${r.total} |`);
  }
  lines.push('', '| cEDH positive | line | pieces | r | Q | R | fit | wins | total |', '|---|---|---:|---:|---:|---:|---:|---|---:|');
  for (const r of positives.sort((a, b) => a.Q - b.Q)) {
    lines.push(`| ${r.label} | ${r.lineId} | ${r.pieces} | ${r.required} | ${r.Q.toFixed(3)} | ` +
      `${r.R.toFixed(3)} | ${r.fit.toFixed(3)} | ${r.wins ? 'yes' : 'no'} | ${r.total} |`);
  }
  if (!quiet) console.log(lines.join('\n'));
  return { p95: floorA, n: piles.length, assembled: controls.length };
}


// ── v1.4 stage 2: the S saturation, on Q_slot ─────────────────────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts saturation [--profile brawl|standard]
//
// §10.2 freezes ONE percentile policy — p80 of `Q_slot = U/D` over the
// profile's ELIGIBLE REAL TRAINING cohort — for every independently calibrated
// profile. There is no p60/p75/p90 search, no anchor-specific value and no
// borrowing of the Commander number for Brawl or Standard.
//
// Differences from the stage-4c statistic this replaces, all of them required:
//  * it is `Q_slot`, not `U/F`, so a nonland-to-land replacement cannot raise it;
//  * it is the number `scoreDeck` ITSELF selects (the closing plan included,
//    the typed-coverage gate DOWN, never `--raw`), so the norm and the score
//    are the same quantity;
//  * the cohort is the manifest's `exclusion: 'none'` rows, so a confirmed
//    rule failure cannot set the norm, while mechanically incomplete lists do;
//  * the quantile is the inverse weighted empirical CDF at equal total weight
//    per commander/event family, and it refuses to report below 30 families.

/** `q_p = inf{x : cumulativeWeight(x) >= p*totalWeight}` (§10.2), with equal
 * TOTAL weight per family — a commander with ten lists counts once, each of
 * its lists at a tenth. Full-precision inputs, deterministic order. */
export function weightedQuantile(
  samples: readonly { value: number; family: string }[], p: number,
): number {
  if (samples.length === 0) return NaN;
  const size = new Map<string, number>();
  for (const s of samples) size.set(s.family, (size.get(s.family) ?? 0) + 1);
  const sorted = [...samples].sort((a, b) => (a.value - b.value) || (a.family < b.family ? -1 : 1));
  const total = size.size;
  let cum = 0;
  for (const s of sorted) {
    cum += 1 / (size.get(s.family) as number);
    if (cum >= p * total - 1e-12) return s.value;
  }
  return sorted[sorted.length - 1].value;
}

interface SlotRow {
  id: string; family: string; value: number; S: number; total: number | null; plan: string;
  /** Typed nonland-copy share, the axis §10.2's diagnostic null bins on. */
  coverage: number;
  /** The alternative grouping reported beside the frozen one (Standard: the
   * event DATE, which is the manifest's split key). */
  altFamily: string;
}

/** Eligible training rows of one profile, scored through `scoreDeckSafely`'s
 * own path, with `Q_slot` read from the scorer's diagnostics. */
function slotRows(profile: ScoreProfile, cohort: SampleCohort = 'training'): SlotRow[] {
  const manifest = readManifest();
  const eligible = new Set(
    (manifest?.rows ?? [])
      .filter((r) => r.profile === profile && r.split === cohort && r.exclusion === 'none')
      .map((r) => r.id),
  );
  const rows: SlotRow[] = [];
  const push = (id: string, family: string, input: Parameters<typeof scoreDeck>[0], altFamily?: string): void => {
    if (!eligible.has(id)) return;
    const r = scoreDeck(input);
    rows.push({
      id, family, altFamily: altFamily ?? family, value: r.detail.Qslot, plan: r.detail.plan,
      coverage: r.detail.typedCoverage,
      S: r.components.find((c) => c.key === 'synergy')?.score ?? 0,
      total: r.score,
    });
  };
  if (profile === 'standard') {
    const data = loadDataset(0);
    // §10.2 weights by EVENT family. The manifest groups Standard rows by DATE
    // for the chronological split (a coarser, safer grouping for disjointness);
    // the quantile uses the tournament itself, which is what an event family
    // is. Both counts are reported — on the training cohort the date grouping
    // gives 27 families (below §10.2's 30) and the event grouping gives more.
    const events = standardEventFamilies();
    for (const row of [...data.standardPositive, ...data.standardNegative]) {
      push(`standard:${row.id}`, events.get(row.id) ?? `event-date:${row.eventDate}`, row.input,
        `event-date:${row.eventDate}`);
    }
    return rows;
  }
  const byName = cardsByName();
  for (const { deck } of cohortSample(cohort, profile as SampleProfile)) {
    const main: { card: DbCard; quantity: number }[] = [];
    const commanders: DbCard[] = [];
    const unresolved: { name: string; quantity: number; board: string }[] = [];
    const commanderName = deck.commander.toLowerCase();
    let took = false;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { unresolved.push({ name: line.name, quantity: line.quantity, board: 'main' }); continue; }
      if (!took && line.name.toLowerCase() === commanderName) { commanders.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    push(`${profile}-sample:${deck.id}`, commanderName, {
      format: profile as ScoreFormat, main, commander: commanders, sideboard: [],
      unresolved, cardDataVersion: `cards-${CATALOG_SIZE}`, corpus: null,
    });
  }
  return rows;
}

const SATURATION_PERCENTILE = 0.80;

function saturationTable(
  profile: ScoreProfile, cohort: SampleCohort = 'training', quiet = false,
): { p80: number; n: number; families: number } {
  const rows = slotRows(profile, cohort);
  const families = new Set(rows.map((r) => r.family)).size;
  const q = (p: number): number => weightedQuantile(rows, p);
  const p80 = q(SATURATION_PERCENTILE);
  const frozen = qSlotSaturationFor(profile);
  const sUnder = (sat: number): number[] => rows.map((r) => 100 * clip(r.value / sat)).sort((a, b) => a - b);

  const lines = [
    `${profile} ${cohort} cohort, ELIGIBLE rows only (cohorts-v14.json exclusion=none): ` +
      `${rows.length} lists, ${families} families, scored through scoreDeck (no --raw)`,
    `frozen Q_sat = ${frozen.toFixed(4)}; measured p80 = ${Number.isFinite(p80) ? p80.toFixed(4) : '-'}` +
      `${families < 30 ? ' — REFUSED: fewer than 30 independent families (§10.2)' : ''}`,
    `sensitivity, alternative family grouping: ${new Set(rows.map((r) => r.altFamily)).size} families, ` +
      `p80 = ${weightedQuantile(rows.map((r) => ({ value: r.value, family: r.altFamily })), SATURATION_PERCENTILE).toFixed(4)}` +
      `; unweighted p80 = ${pct(rows.map((r) => r.value).sort((a, b) => a - b), 80).toFixed(4)}`,
    '',
    '| statistic (Q_slot = U/D, family-weighted) | n | p10 | p25 | p50 | p75 | p80 | p90 | p95 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    `| ${profile} ${cohort} | ${rows.length} | ${q(0.10).toFixed(4)} | ${q(0.25).toFixed(4)} | ` +
      `${q(0.50).toFixed(4)} | ${q(0.75).toFixed(4)} | **${q(0.80).toFixed(4)}** | ` +
      `${q(0.90).toFixed(4)} | ${q(0.95).toFixed(4)} |`,
    '',
    '| saturation | value | S = 100 share | S p10 | S p50 | S p90 |',
    '|---|---:|---:|---:|---:|---:|',
  ];
  for (const [label, sat] of [['frozen', frozen], ['measured p80', p80]] as Array<[string, number]>) {
    if (!(sat > 0)) { lines.push(`| ${label} | ${sat.toFixed(4)} | - | - | - | - |`); continue; }
    const S = sUnder(sat);
    const hundred = S.filter((x) => x >= 99.95).length;
    lines.push(`| ${label} | ${sat.toFixed(4)} | ${hundred}/${S.length} (${((100 * hundred) / S.length).toFixed(1)}%) | ` +
      `${pct(S, 10).toFixed(1)} | ${pct(S, 50).toFixed(1)} | ${pct(S, 90).toFixed(1)} |`);
  }
  if (!quiet) console.log(lines.join('\n'));
  return { p80, n: rows.length, families };
}

// ── round 1: the PRODUCT metric ───────────────────────────────────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts real [--profile brawl] [--n 600]
//
// Refuter R1: every acceptance number so far was taken either on piles or with
// the typed-coverage gate lifted (`--raw`), so a scorer that reads 20 for the
// median REAL deck passed all of them. This measures what the shipped entry
// point returns — `scoreDeckSafely`, the same call build-api and the desktop
// make — over the profile's training stride of real corpus lists. Never --raw.
/**
 * v1.4 stage 0 (§10 baseline table, §10.5 reporting rule) — the ONE product
 * measurement every later stage is graded against.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts real --profile commander
 *
 * Publishes, side by side: the FULL stride (all 1,824 / 1,146 rows, rule caps
 * retained) and the ELIGIBLE subset (`cohorts-v14.json` exclusion = none),
 * with every excluded and unavailable count, plus both pile constructions.
 * "Exclusion must not manufacture a median gain: demonstrate changes on the
 * same IDs, and report every excluded/unavailable count."
 */
interface RealRow {
  id: string;
  S: number | null;
  W: number | null;
  total: number | null;
  /** §10.9 unrounded rank in the profile's frozen reference, null when the
   * profile is uncalibrated or the list left the rank domain. */
  rank: number | null;
  coverage: number;
  hardCapUnder25: boolean;
  provisional: boolean;
  unavailable: string | null;
}

function scoreStride(profile: SampleProfile, cohort: SampleCohort, n: number): RealRow[] {
  const byName = cardsByName();
  const rows: RealRow[] = [];
  for (const { deck } of cohortSample(cohort, profile).slice(0, n)) {
    const main: { card: DbCard; quantity: number }[] = [];
    const commanders: DbCard[] = [];
    const unresolved: { name: string; quantity: number; board: string }[] = [];
    const commanderName = deck.commander.toLowerCase();
    let tookCommander = false;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      // §10.5: an unresolved name is a RESERVED SLOT, not a deleted card.
      if (!card) { unresolved.push({ name: line.name, quantity: line.quantity, board: 'main' }); continue; }
      if (!tookCommander && line.name.toLowerCase() === commanderName) { commanders.push(card); tookCommander = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    const args = { format: profile, main, commander: commanders, unresolved };
    const unavailable = explainScoreUnavailable(args);
    const payload = unavailable ? null : scoreDeckSafely(args);
    const nonLand = main
      .map((e) => ({ feature: deriveCardFeature(e.card), quantity: e.quantity }))
      .filter((e) => !e.feature.isLand);
    const F = nonLand.reduce((a, e) => a + e.quantity, 0);
    const caps = (payload?.gates ?? []).filter((g) => g.kind !== 'quality' && g.cap !== null);
    rows.push({
      id: deck.id,
      S: payload ? payload.components.find((c) => c.key === 'synergy')?.score ?? 0 : null,
      W: payload ? payload.components.find((c) => c.key === 'win')?.score ?? 0 : null,
      total: payload ? payload.score : null,
      rank: payload ? payload.rank : null,
      coverage: F > 0 ? nonLand.filter((e) => e.feature.covered).reduce((a, e) => a + e.quantity, 0) / F : 1,
      hardCapUnder25: caps.some((g) => (g.cap as number) < 25),
      provisional: payload?.provisional ?? false,
      unavailable: unavailable ?? (payload ? null : 'scorer returned null'),
    });
  }
  return rows;
}

/**
 * §10.8 item 4 "Pile W ordering": the control row now carries the pile W
 * quantiles beside the total count, because the registered gate compares
 * pile W p10/p50/p90 against the eligible-real W quantiles of the same run.
 * An unavailable pile counts as W = 0 in the quantile column, as §10.8 item 4
 * words it ("count unavailable W … as 0 in a separate acceptance column").
 */
function pileUnder25(
  profile: SampleProfile, kind: 'ctrl93' | 'ctrlmatch', n: number, realCoverage: number[],
): { under: string; w: string; wq: [number, number, number]; rank: string; top: string } {
  const piles = loadStudyControls(profile, kind, n, realCoverage);
  let under = 0;
  let nulls = 0;
  const W: number[] = [];
  const ranks: number[] = [];
  for (const pile of piles) {
    const payload = scoreDeckSafely({
      format: pile.input.format, main: [...pile.input.main], commander: [...pile.input.commander],
    });
    if (!payload) { nulls++; W.push(0); continue; }
    if (payload.score < 25) under++;
    W.push(payload.components.find((c) => c.key === 'win')?.score ?? 0);
    if (payload.rank !== null) ranks.push(payload.rank);
  }
  ranks.sort((a, b) => a - b);
  W.sort((a, b) => a - b);
  const wq: [number, number, number] = [pct(W, 10), pct(W, 50), pct(W, 90)];
  return {
    under: `${under}/${piles.length} (${((100 * under) / Math.max(1, piles.length)).toFixed(1)}%)` +
      `${nulls ? `, ${nulls} unavailable` : ''}`,
    w: `${wq[0].toFixed(1)} / ${wq[1].toFixed(1)} / ${wq[2].toFixed(1)}`,
    wq,
    // §10.9 item 4: the registered guard is the TOP TAIL, not an origin test.
    rank: ranks.length === 0 ? 'uncalibrated' : `${pct(ranks, 10).toFixed(1)} / ${pct(ranks, 50).toFixed(1)} `
      + `/ ${pct(ranks, 90).toFixed(1)} / ${pct(ranks, 95).toFixed(1)}`,
    top: ranks.length === 0 ? '-' : `${ranks.filter((x) => x >= 95).length}/${piles.length}`,
  };
}

function realLists(n: number, profile: SampleProfile, cohort: SampleCohort = 'training', piles = 1000): void {
  const rows = scoreStride(profile, cohort, n);
  const manifest = readManifest();
  const eligible = new Set(
    (manifest?.rows ?? [])
      .filter((r) => r.profile === profile && r.split === cohort && r.exclusion === 'none')
      .map((r) => r.id.slice(`${profile}-sample:`.length)),
  );
  if (!manifest) console.log('WARNING: cohorts-v14.json missing — eligible subset falls back to "no hard cap".');
  const isEligible = (r: RealRow): boolean => (manifest ? eligible.has(r.id) : !r.hardCapUnder25);

  const column = (set: RealRow[]): string[] => {
    const scored = set.filter((r) => r.total !== null);
    const S = scored.map((r) => r.S as number).sort((a, b) => a - b);
    const W = scored.map((r) => r.W as number).sort((a, b) => a - b);
    const T = scored.map((r) => r.total as number).sort((a, b) => a - b);
    const R = scored.filter((r) => r.rank !== null).map((r) => r.rank as number).sort((a, b) => a - b);
    // §10.5: "for release S-zero coverage count S=0 OR unavailable".
    const zeroS = set.filter((r) => r.total === null || (r.S as number) < 0.05).length;
    const share = (k: number, of: number) => `${k}/${of} (${((100 * k) / Math.max(1, of)).toFixed(1)}%)`;
    return [
      String(set.length),
      String(set.length - scored.length),
      share(zeroS, set.length),
      `${pct(S, 10).toFixed(1)} / ${pct(S, 50).toFixed(1)} / ${pct(S, 90).toFixed(1)}`,
      `${pct(W, 10).toFixed(1)} / ${pct(W, 50).toFixed(1)} / ${pct(W, 90).toFixed(1)}`,
      `${pct(T, 10)} / ${pct(T, 50)} / ${pct(T, 90)}`,
      R.length === 0 ? 'uncalibrated' : `${pct(R, 10).toFixed(1)} / ${pct(R, 50).toFixed(1)} / ${pct(R, 90).toFixed(1)}`,
      share(scored.length - R.length, scored.length),
      share(W.filter((x) => x < 0.05).length, scored.length),
      share(set.filter((r) => r.hardCapUnder25).length, set.length),
      share(set.filter((r) => r.provisional).length, set.length),
    ];
  };

  const full = column(rows);
  const sub = column(rows.filter(isEligible));
  const labels = [
    'rows', 'unavailable (no numeric total)', 'S = 0 or unavailable', 'S p10 / p50 / p90',
    'W p10 / p50 / p90', 'total p10 / p50 / p90', 'rank p10 / p50 / p90', 'no rank (scored)',
    'W = 0 share (scored)',
    'hard cap < 25', 'provisional share',
  ];
  const coverage = rows.map((r) => r.coverage).sort((a, b) => a - b);
  const ref = referenceFor(profile as ScoreFormat);
  console.log([
    `PRODUCT METRIC — ${profile} ${cohort} stride through scoreDeckSafely (no --raw), ` +
      `card data ${CATALOG_SIZE} catalogue entries`,
    ref
      ? `reference ${ref.profile} ${ref.referenceVersion} frozen ${ref.frozenAt}: ${ref.rows} rows, `
        + `${ref.families} families, ${ref.knots.length} knots, ${ref.tiedIntervals} tied intervals, `
        + `largest atom ${(100 * ref.largestAtom).toFixed(2)}% of weight at T_abs `
        + `${ref.knots.reduce((a, b) => (b.mass > a.mass ? b : a)).t}`
      : `reference ${profile}: NONE — this profile is uncalibrated, every rank is null`,
    `typed coverage p10/p50/p90 ${pct(coverage, 10).toFixed(3)} / ${pct(coverage, 50).toFixed(3)} / ${pct(coverage, 90).toFixed(3)}`,
    '',
    '| statistic | full stride | eligible subset |',
    '|---|---:|---:|',
    ...labels.map((l, i) => `| ${l} | ${full[i]} | ${sub[i]} |`),
  ].join('\n'));

  const exclusions = new Map<string, number>();
  for (const r of manifest?.rows ?? []) {
    if (r.profile !== profile || r.split !== cohort) continue;
    exclusions.set(r.exclusion, (exclusions.get(r.exclusion) ?? 0) + 1);
  }
  console.log('');
  console.log(`excluded by input gate (cohorts-v14.json): ${[...exclusions.entries()]
    .filter(([k]) => k !== 'none').sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);

  if (piles > 0) {
    const realCoverage = rows.map((r) => r.coverage);
    const eligibleW = rows.filter((r) => isEligible(r) && r.total !== null)
      .map((r) => r.W as number).sort((a, b) => a - b);
    const realW: [number, number, number] = [pct(eligibleW, 10), pct(eligibleW, 50), pct(eligibleW, 90)];
    console.log('');
    console.log(`| control construction | total < 25 | pile W p10/p50/p90 | gap vs eligible real W `
      + `(${realW.map((x) => x.toFixed(1)).join(' / ')}) | rank p10/p50/p90/p95 | rank >= 95 (limit 20/200) |`);
    console.log('|---|---:|---:|---:|---:|---:|');
    for (const kind of ['ctrl93', 'ctrlmatch'] as const) {
      const r = pileUnder25(profile, kind, piles, realCoverage);
      const gaps = r.wq.map((x, i) => x - realW[i]);
      console.log(`| ${kind} (n=${piles}, study seeds) | ${r.under} | ${r.w} | `
        + `${gaps.map((g) => (g > 0 ? `+${g.toFixed(1)}` : g.toFixed(1))).join(' / ')}`
        + `${gaps.some((g) => g > 0) ? ' POSITIVE' : ' ok'} | ${r.rank} | ${r.top} |`);
    }
  }
}

// ── §10.6.2 W-zero audit ──────────────────────────────────────────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts real --profile commander --wzero
//
// Every row with W = 0 or no numeric total is classified into EXACTLY ONE of
// four classes, in this fixed precedence (first match wins, so the table sums
// to the W-zero count):
//
//   bad_input             the list never reaches a fair evaluation — unresolved
//                         identity, or a confirmed rule failure that hard-caps
//                         it below 25. Repairing W cannot help these.
//   unsupported_family    the list runs a recognisable plan W models no family
//                         for (mill, infect, extra turns, superfriends, stax).
//   known_absent          at least one family IS fully assembled and its own
//                         output schedule still falls short of the finish
//                         predicate by T12. That shortfall is the binding cause
//                         whatever else is also missing, so it is classified
//                         here and not as a repairable prerequisite.
//   missing_prerequisite  no family reached its schedule at all, and a family is
//                         PARTIALLY assembled one named typed gate short
//                         (outlet, route/zone, converter, fodder, finisher).
//
// The class is the BINDING cause. The full rejection histogram below the table
// lists every gate each row failed, which is where the repairable mass shows.

/** Note codes that mean "one named prerequisite away", in report order. */
const PREREQ_CODES = new Set([
  'combo.outlet_missing', 'combo.route_unsatisfied', 'combo.pieces_missing',
  'tokens.no_converter',
  'drain.no_outlet', 'drain.no_payoff', 'drain.no_fodder',
  'control.no_finisher', 'control.no_draw_engine', 'control.stabilisation_short',
]);

/**
 * Plans W has no recipe family for. Each is a DECK-LEVEL count of cards whose
 * printed text carries the mechanic, with the threshold a real list of that
 * archetype clears and an incidental copy does not.
 */
const UNSUPPORTED_FAMILIES: readonly { key: string; min: number; test: (f: ReturnType<typeof deriveCardFeature>) => boolean }[] = [
  {
    key: 'mill',
    min: 6,
    test: (f) => /\bmills? (?:\w+|\d+) cards?|target player mills|each opponent mills/i.test(f.card.oracle_text || ''),
  },
  {
    key: 'infect_toxic',
    min: 4,
    test: (f) => /\binfect\b|\btoxic \d|poison counter/i.test(
      `${f.card.oracle_text || ''} ${f.card.keywords || ''}`),
  },
  {
    key: 'extra_turns',
    min: 3,
    test: (f) => /take an extra turn|takes? an extra turn/i.test(f.card.oracle_text || ''),
  },
  {
    key: 'superfriends',
    min: 6,
    test: (f) => /\bPlaneswalker\b/.test(f.card.type_line || ''),
  },
  {
    key: 'stax_prison',
    min: 8,
    test: (f) => /(?:spells|creatures|abilities) (?:your opponents|opponents) (?:cast|control|activate) cost \{\d|players? can't|can't attack you|skip (?:their|your) (?:draw|untap)|doesn't untap|don't untap/i
      .test(f.card.oracle_text || ''),
  },
];

interface WzeroRow {
  id: string;
  klass: string;
  cause: string;
  names: string[];
  /** EVERY family rejection, not just the classifying one: the first-match
   * class names the repairable cause, this names what actually binds. */
  codes: string[];
}

/** "62.3 of 120 expected damage by T12" -> the fraction of target reached. */
function shortfallRank(detail: string): number {
  const m = /^([\d.]+) of (\d+)/.exec(detail);
  return m ? Number(m[1]) / Math.max(1, Number(m[2])) : 0;
}

/** "62.3 of 120 expected damage by T12" -> the tenth of target it reached. */
function shortfallBin(detail: string): string {
  const m = /^([\d.]+) of (\d+)/.exec(detail);
  if (!m) return '?';
  const ratio = Number(m[1]) / Number(m[2]);
  return `${Math.min(9, Math.floor(ratio * 10))}/10`;
}

function classifyWzero(
  profile: SampleProfile, byName: Map<string, DbCard>, deck: ReturnType<typeof readSample>[number],
): WzeroRow | null {
  const main: { card: DbCard; quantity: number }[] = [];
  const commanders: DbCard[] = [];
  const unresolved: { name: string; quantity: number; board: string }[] = [];
  const commanderName = deck.commander.toLowerCase();
  let tookCommander = false;
  for (const line of deck.cards) {
    const card = byName.get(line.name.toLowerCase());
    if (!card) { unresolved.push({ name: line.name, quantity: line.quantity, board: 'main' }); continue; }
    if (!tookCommander && line.name.toLowerCase() === commanderName) { commanders.push(card); tookCommander = true; continue; }
    main.push({ card, quantity: line.quantity });
  }
  const args = { format: profile, main, commander: commanders, unresolved };
  const unavailable = explainScoreUnavailable(args);
  const payload = unavailable ? null : scoreDeckSafely(args);
  const W = payload ? payload.components.find((c) => c.key === 'win')?.score ?? 0 : null;
  if (W !== null && W >= 0.05) return null;

  const hardCap = (payload?.gates ?? []).some((g) => g.kind !== 'quality' && g.cap !== null && (g.cap as number) < 25);
  const names = main.map((e) => e.card.name);
  if (unavailable || hardCap) {
    return { id: deck.id, klass: 'bad_input', cause: unavailable ?? 'rule cap < 25', names, codes: [] };
  }

  const all: DeckEntry[] = main.map((e) => ({ feature: deriveCardFeature(e.card), quantity: e.quantity }));
  const cmd = commanders.map((c) => deriveCardFeature(c));
  const N = all.reduce((s, e) => s + e.quantity, 0);
  const norms = normsFor(profile);
  const inter = computeInteraction(profile, norms, 'midrange', N, all);
  const adv = computeAdvantage(profile, norms, 'midrange', N, all);
  const totals = { E: inter.E, Estar: inter.Estar, D: adv.D, Dstar: adv.Dstar, hasDrawEngine: adv.hasDrawEngine };
  const { notes } = winAudit(profile, norms, 'midrange', N, all, cmd, totals);

  const codes = notes.map((x: WinAuditNote) => (x.code.endsWith('.schedule_short')
    ? `${x.code}@${shortfallBin(x.detail)}`
    : x.code));

  for (const fam of UNSUPPORTED_FAMILIES) {
    const copies = all.filter((e) => !e.feature.isLand && fam.test(e.feature)).reduce((s, e) => s + e.quantity, 0);
    if (copies >= fam.min) return { id: deck.id, klass: 'unsupported_family', cause: fam.key, names, codes };
  }

  // Stage 1c (§10.6.2): a family that BUILT a schedule and fell short of the
  // finish predicate is not "known absent" — the deck holds a typed route and
  // the model priced it. Only a deck with no typed route at all is absent.
  // Stage 1b reported all 350 of these as absent, which read as a missing
  // mechanic when it is a missing 40-120 damage.
  const shortest = notes
    .filter((n: WinAuditNote) => n.code.endsWith('.schedule_short') || n.code === 'spells.burst_short')
    .sort((a: WinAuditNote, b: WinAuditNote) => shortfallRank(b.detail) - shortfallRank(a.detail))[0];
  if (shortest) return { id: deck.id, klass: 'predicate_short', cause: shortest.code, names, codes };

  const prereq = notes.find((n: WinAuditNote) => PREREQ_CODES.has(n.code));
  if (prereq) return { id: deck.id, klass: 'missing_prerequisite', cause: prereq.code, names, codes };
  return { id: deck.id, klass: 'known_absent', cause: notes[0]?.code ?? 'no family present', names, codes };
}

/** `--dump <card>`: the full W diagnostic of the first W-zero row holding that
 * card. Stage 1c used it to check the spellslinger schedule on real lists
 * rather than on fixtures. */
function wzeroDump(profile: SampleProfile, rows: WzeroRow[], byName: Map<string, DbCard>,
  sample: ReturnType<typeof cohortSample>, card: string): void {
  const hit = rows.find((r) => r.names.some((x) => x.toLowerCase() === card.toLowerCase()));
  if (!hit) { console.log(`no W-zero row holds ${card}`); return; }
  const deck = sample.find(({ deck: d }) => d.id === hit.id)?.deck;
  if (!deck) return;
  const main: DeckEntry[] = [];
  const cmd: CardFeature[] = [];
  let took = false;
  for (const line of deck.cards) {
    const c = byName.get(line.name.toLowerCase());
    if (!c) continue;
    if (!took && line.name.toLowerCase() === deck.commander.toLowerCase()) { cmd.push(deriveCardFeature(c)); took = true; continue; }
    main.push({ feature: deriveCardFeature(c), quantity: line.quantity });
  }
  const N = main.reduce((a, e) => a + e.quantity, 0);
  const norms = normsFor(profile);
  const inter = computeInteraction(profile, norms, 'midrange', N, main);
  const adv = computeAdvantage(profile, norms, 'midrange', N, main);
  console.log('');
  console.log(`### dump ${hit.id} (${deck.commander}) — class ${hit.klass}`);
  console.log(winDiagnostic(profile, norms, 'midrange', N, main, cmd, {
    E: inter.E, Estar: inter.Estar, D: adv.D, Dstar: adv.Dstar, hasDrawEngine: adv.hasDrawEngine,
  }));
}

function wzeroAudit(n: number, profile: SampleProfile, cohort: SampleCohort, dump?: string): void {
  const byName = cardsByName();
  const manifest = readManifest();
  const eligible = new Set(
    (manifest?.rows ?? [])
      .filter((r) => r.profile === profile && r.split === cohort && r.exclusion === 'none')
      .map((r) => r.id.slice(`${profile}-sample:`.length)),
  );
  const sample = cohortSample(cohort, profile).slice(0, n);
  const rows: WzeroRow[] = [];
  for (const { deck } of sample) {
    const row = classifyWzero(profile, byName, deck);
    if (row) rows.push(row);
  }
  const strides: [string, WzeroRow[], number][] = [
    ['full', rows, sample.length],
    ['eligible', rows.filter((r) => eligible.has(r.id)), sample.filter(({ deck }) => eligible.has(deck.id)).length],
  ];

  console.log(`W-ZERO AUDIT — ${profile} ${cohort}, ${sample.length} rows, catalogue ${CATALOG_SIZE}`);
  console.log('');
  console.log('| class | full stride | eligible subset |');
  console.log('|---|---:|---:|');
  const classes = ['bad_input', 'unsupported_family', 'predicate_short', 'known_absent', 'missing_prerequisite'];
  const cell = (set: WzeroRow[], of: number, k: string): string => {
    const c = set.filter((r) => r.klass === k).length;
    return `${c}/${of} (${((100 * c) / Math.max(1, of)).toFixed(1)}%)`;
  };
  for (const k of classes) {
    console.log(`| ${k} | ${cell(strides[0][1], strides[0][2], k)} | ${cell(strides[1][1], strides[1][2], k)} |`);
  }
  console.log(`| **W = 0 or unavailable** | ${strides[0][1].length}/${strides[0][2]} `
    + `(${((100 * strides[0][1].length) / Math.max(1, strides[0][2])).toFixed(1)}%) | ${strides[1][1].length}/${strides[1][2]} `
    + `(${((100 * strides[1][1].length) / Math.max(1, strides[1][2])).toFixed(1)}%) |`);

  const codeHist = new Map<string, number>();
  for (const r of rows) for (const c of new Set(r.codes)) codeHist.set(c, (codeHist.get(c) ?? 0) + 1);
  const controlCost = rows.filter((r) => r.codes.some((c) => c.startsWith('control.schedule_short'))).length;
  console.log('');
  console.log(`of those, ${controlCost} stabilise, hold a repeatable engine and a typed finisher, and fail ONLY `
    + `on the finish predicate — the measured cost of replacing the hard-coded T8 control clock (section 10.6.3).`);
  console.log('');
  console.log(`every family rejection across the ${rows.length} W-zero rows (a row can carry several):`);
  console.log([...codeHist.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${v}`).join(', '));

  for (const k of classes) {
    const set = rows.filter((r) => r.klass === k);
    if (set.length === 0) continue;
    const byCause = new Map<string, number>();
    for (const r of set) byCause.set(r.cause, (byCause.get(r.cause) ?? 0) + 1);
    // Card-level cause = the cards that appear most often in this class, by
    // LIFT over the whole stride: a Sol Ring in every deck explains nothing.
    const inClass = new Map<string, number>();
    for (const r of set) for (const nm of new Set(r.names)) inClass.set(nm, (inClass.get(nm) ?? 0) + 1);
    const overall = new Map<string, number>();
    for (const { deck } of sample) for (const nm of new Set(deck.cards.map((c) => c.name))) {
      overall.set(nm, (overall.get(nm) ?? 0) + 1);
    }
    const top = [...inClass.entries()]
      .filter(([, c]) => c >= Math.max(3, set.length * 0.05))
      .map(([nm, c]) => ({ nm, c, lift: (c / set.length) / ((overall.get(nm) ?? 1) / sample.length) }))
      .sort((a, b) => b.lift - a.lift || b.c - a.c)
      .slice(0, 10);
    console.log('');
    console.log(`### ${k} (${set.length})`);
    console.log(`gate: ${[...byCause.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${v}`).join(', ')}`);
    console.log(`cards: ${top.map((t) => `${t.nm} ${t.c} (x${t.lift.toFixed(1)})`).join(', ') || 'none above threshold'}`);
  }
  if (dump) wzeroDump(profile, rows, byName, sample, dump);
}

// ── §10.7 stage 1b: freeze the recipe/catalogue domain ────────────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts domain [--write]
//
// Stage 2 measures the S norms on THIS domain. If the catalogue, the plan
// recipe set or the typed combo/tutor/outlet tables move underneath it, every
// p80 saturation and band cell it freezes was cut from a different evaluator.
// `bands verify` re-computes these three hashes and fails on any mismatch.

const DOMAIN_FILE = path.join(process.cwd(), 'verify-2026-09-19', 'deck-score', 'domain-v14.json');

interface DomainFreeze {
  frozenAt: string;
  scoreVersion: string;
  catalogVersion: string;
  catalogSize: number;
  catalogSha256: string;
  combosSha256: string;
  planRecipes: string[];
  winFamilies: string[];
  /** Section 10.8 item 6: the mana ledger / predicate / horizon version. */
  scheduler: string;
}

/** Name + knowledge + every effect's family/mode/cost/timing/output, sorted. */
function catalogDigest(): string {
  const rows = catalogEntries()
    .map((e) => `${e.canonicalName}|${e.knowledge}|` + e.effects
      .map((x) => `${x.family}:${x.mode}:${x.cost.mana}:${x.timing.earliestTurn}`
        + `:${x.outputBounds ? `${x.outputBounds.min}/${x.outputBounds.max ?? '-'}/${x.outputBounds.unit}` : '-'}`)
      .join(','))
    .sort();
  return sha256(rows.join('\n'));
}

/** Every typed combo, tutor, outlet, sink and graveyard route, deterministically. */
function combosDigest(): string {
  const combos = TYPED_COMBOS.map((c) =>
    `${c.id}|${c.resource}|${c.extraCost}|${c.hasteIncluded ? 'haste' : '-'}`
    + `|${c.route ? `${c.route.kind}:${c.route.budget ?? '-'}` : '-'}`
    + `|${c.slots.map((sl) => `${sl.any.join('/')}~${sl.types.join('+')}`).join(';')}`).sort();
  // A tutor's cost is a function; two sample points pin its shape.
  const tutors = COMBO_TUTORS.map((t) =>
    `${t.name}|${t.destination}|${t.finds.join('+')}|${t.cost(0)}/${t.cost(3)}`).sort();
  const outlets = [
    ...MANA_OUTLETS.map((o) => `mana:${o.name}:${o.creatureCastable ? 1 : 0}`),
    ...ETB_OUTLETS.map((o) => `etb:${o.name}`),
    ...LIBRARY_WIN_CARDS.map((o) => `altwin:${o.name}:${o.creatureCastable ? 1 : 0}`),
    ...LIBRARY_DRAW_SINKS.map((o) => `libsink:${o.name}`),
    ...UNBOUNDED_DRAW_SINKS.map((o) => `cmdsink:${o.name}`),
    ...GRAVEYARD_ROUTES.map((n) => `gy:${n}`),
  ].sort();
  return sha256([...combos, ...tutors, ...outlets].join('\n'));
}

function domainFreeze(): DomainFreeze {
  return {
    frozenAt: new Date().toISOString().slice(0, 10),
    scoreVersion: SCORE_VERSION,
    catalogVersion: CATALOG_VERSION,
    catalogSize: CATALOG_SIZE,
    catalogSha256: catalogDigest(),
    combosSha256: combosDigest(),
    planRecipes: PLAN_RECIPES.map((r) => r.key).sort(),
    winFamilies: WIN_FAMILIES.slice().sort(),
    scheduler: W_SCHEDULER_VERSION,
  };
}

function readDomain(): DomainFreeze | null {
  if (!fs.existsSync(DOMAIN_FILE)) return null;
  return JSON.parse(fs.readFileSync(DOMAIN_FILE, 'utf-8')) as DomainFreeze;
}

function domainCommand(write: boolean): void {
  const now = domainFreeze();
  const stored = readDomain();
  console.log(JSON.stringify(now, null, 2));
  if (write) {
    fs.writeFileSync(DOMAIN_FILE, `${JSON.stringify(now, null, 2)}\n`);
    console.log(`written ${DOMAIN_FILE}`);
    return;
  }
  if (!stored) { console.log('no stored domain freeze'); return; }
  const diffs = domainMismatches(stored, now);
  console.log(diffs.length === 0 ? 'domain: MATCH' : `domain: ${diffs.length} MISMATCH — ${diffs.join('; ')}`);
}

function domainMismatches(stored: DomainFreeze, now: DomainFreeze): string[] {
  const out: string[] = [];
  const cmp = (k: keyof DomainFreeze): void => {
    // A key the stored freeze predates reads as `absent`, not as a crash.
    const a = JSON.stringify(stored[k]) ?? 'absent';
    const b = JSON.stringify(now[k]) ?? 'absent';
    if (a !== b) out.push(`${k} ${a.slice(0, 24)} vs ${b.slice(0, 24)}`);
  };
  for (const k of ['scoreVersion', 'catalogVersion', 'catalogSize', 'catalogSha256',
    'combosSha256', 'planRecipes', 'winFamilies', 'scheduler'] as const) cmp(k);
  return out;
}


// ── v1.4 stage 2c: the frozen rank reference (§10.9 item 2) ───────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts reference freeze [--write]
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts reference verify
//
// One weighted empirical CDF per admitted profile, measured on its ELIGIBLE
// real TRAINING lists through `scoreDeckSafely` — the shipped entry point, so
// the knots are the same absolute totals the product publishes. Freezing is
// refused when a profile has fewer than 30 independent families or when any
// eligible row has no finite absolute total ("an entirely unevaluable
// essential component blocks this freeze").

const REFERENCE_DIR = path.join(OUT_DIR, '..', '..', 'src', 'lib', 'deck-score-reference');
const REFERENCE_PROFILES: readonly ScoreProfile[] = ['commander', 'brawl', 'standard'];
const MIN_REFERENCE_FAMILIES = 30;

interface ReferenceRow {
  id: string; family: string; altFamily: string; total: number | null; unavailable: string | null;
}

/** The domain a reference answers to: the recipe/catalogue/scheduler freeze
 * WITHOUT its `frozenAt` date, so re-freezing on another day does not claim a
 * different domain. */
function domainHash(): string {
  const d = domainFreeze();
  return sha256(JSON.stringify([d.scoreVersion, d.catalogVersion, d.catalogSize, d.catalogSha256,
    d.combosSha256, d.planRecipes, d.winFamilies, d.scheduler]));
}

/**
 * Every eligible training row of one profile, scored through the product
 * entry point. Exact duplicates (equal normalised-list sha256 in the frozen
 * manifest) collapse to their first id in manifest order.
 */
function referenceRows(profile: ScoreProfile): {
  rows: ReferenceRow[]; excluded: Record<string, number>; duplicates: number; altFamilies: number;
} {
  const manifest = readManifest();
  if (!manifest) throw new Error('cohorts-v14.json missing — cannot freeze a reference');
  const excluded: Record<string, number> = {};
  const eligible = new Map<string, { family: string; sha: string }>();
  const seen = new Set<string>();
  let duplicates = 0;
  for (const r of manifest.rows) {
    if (r.profile !== profile || r.split !== 'training') continue;
    if (r.exclusion !== 'none') { excluded[r.exclusion] = (excluded[r.exclusion] ?? 0) + 1; continue; }
    if (seen.has(r.sha256)) { duplicates += 1; excluded.duplicate = (excluded.duplicate ?? 0) + 1; continue; }
    seen.add(r.sha256);
    eligible.set(r.id, { family: r.commanderFamily, sha: r.sha256 });
  }

  const rows: ReferenceRow[] = [];
  const push = (id: string, altFamily: string, args: Parameters<typeof scoreDeckSafely>[0]): void => {
    const hit = eligible.get(id);
    if (!hit) return;
    const unavailable = explainScoreUnavailable(args);
    const payload = unavailable ? null : scoreDeckSafely(args);
    rows.push({
      id, family: hit.family, altFamily,
      total: payload && Number.isFinite(payload.absoluteTotal) ? payload.absoluteTotal : null,
      unavailable: unavailable ?? (payload ? null : 'scorer returned null'),
    });
  };

  if (profile === 'standard') {
    const data = loadDataset(0);
    const events = standardEventFamilies();
    for (const row of [...data.standardPositive, ...data.standardNegative]) {
      push(`standard:${row.id}`, events.get(row.id) ?? `event-date:${row.eventDate}`, {
        format: 'standard', main: [...row.input.main], commander: [...row.input.commander],
        sideboard: [...row.input.sideboard], unresolved: [...row.input.unresolved],
      });
    }
  } else {
    const byName = cardsByName();
    for (const { deck } of cohortSample('training', profile as SampleProfile)) {
      const main: { card: DbCard; quantity: number }[] = [];
      const commanders: DbCard[] = [];
      const unresolved: { name: string; quantity: number; board: string }[] = [];
      const commanderName = deck.commander.toLowerCase();
      let took = false;
      for (const line of deck.cards) {
        const card = byName.get(line.name.toLowerCase());
        if (!card) { unresolved.push({ name: line.name, quantity: line.quantity, board: 'main' }); continue; }
        if (!took && line.name.toLowerCase() === commanderName) { commanders.push(card); took = true; continue; }
        main.push({ card, quantity: line.quantity });
      }
      push(`${profile}-sample:${deck.id}`, commanderName, {
        format: profile as ScoreFormat, main, commander: commanders, unresolved,
      });
    }
  }
  return { rows, excluded, duplicates, altFamilies: new Set(rows.map((r) => r.altFamily)).size };
}

function referenceFile(profile: ScoreProfile): string {
  return path.join(REFERENCE_DIR, `${profile}.json`);
}

function readStoredReference(profile: ScoreProfile): DeckScoreReference | null {
  const file = referenceFile(profile);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as DeckScoreReference;
}

/** Deterministic text: metadata pretty-printed, one knot per line. */
function referenceText(ref: DeckScoreReference): string {
  const knots = ref.knots;
  const body = JSON.stringify({ ...ref, knots: '@@KNOTS@@' }, null, 2);
  return `${body.replace('"@@KNOTS@@"',
    `[\n${knots.map((k) => `    ${JSON.stringify(k)}`).join(',\n')}\n  ]`)}\n`;
}

function buildReference(profile: ScoreProfile): {
  ref: DeckScoreReference | null; blockers: string[]; lines: string[];
} {
  const { rows, excluded, duplicates, altFamilies } = referenceRows(profile);
  const unavailable = rows.filter((r) => r.total === null);
  const samples = rows.filter((r) => r.total !== null).map((r) => ({ value: r.total as number, family: r.family }));
  const built = buildReferenceKnots(samples);
  const blockers: string[] = [];
  if (unavailable.length > 0) {
    blockers.push(`${unavailable.length} eligible row(s) have no finite absolute total `
      + `(first: ${unavailable.slice(0, 3).map((r) => `${r.id} — ${r.unavailable}`).join('; ')})`);
  }
  if (built.families < MIN_REFERENCE_FAMILIES) {
    blockers.push(`only ${built.families} independent families (<${MIN_REFERENCE_FAMILIES}); `
      + `alternative grouping would give ${altFamilies}`);
  }
  const ref: DeckScoreReference = {
    profile: profile as ScoreFormat,
    referenceVersion: REFERENCE_VERSION,
    scoreVersion: SCORE_VERSION,
    catalogueHash: CATALOG_VERSION,
    domainHash: domainHash(),
    cohortHash: sha256(rows.map((r) => `${r.id}|${r.family}`).sort().join('\n')),
    families: built.families,
    rows: built.rows,
    excluded,
    frozenAt: new Date().toISOString().slice(0, 10),
    largestAtom: built.largestAtom,
    tiedIntervals: built.tiedIntervals,
    knots: built.knots,
  };
  const weightSum = ref.knots.reduce((s, k) => s + k.mass, 0);
  const mean = ref.knots.length ? meanReferenceRank(ref) : NaN;
  const q = (p: number): number => weightedQuantile(samples, p);
  const lines = [
    `| ${profile} | ${built.rows} | ${built.families} | ${altFamilies} | ${duplicates} | ${unavailable.length} | `
      + `${ref.knots.length} | ${built.tiedIntervals} | ${built.largestAtom.toExponential(3)} | `
      + `${weightSum.toFixed(12)} | ${Number.isFinite(mean) ? mean.toFixed(9) : '-'} | `
      + `${q(0.10).toFixed(2)} / ${q(0.50).toFixed(2)} / ${q(0.90).toFixed(2)} | `
      + `${blockers.length === 0 ? 'OK' : 'BLOCKED'} |`,
  ];
  return { ref: blockers.length === 0 ? ref : null, blockers, lines };
}

function referenceCommand(write: boolean): void {
  const header = ['| profile | rows | families | alt families | dups | unavailable | knots | ties | largest atom '
    + '| weight sum | mean rank | T_abs p10/p50/p90 | verdict |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'];
  const notes: string[] = [];
  for (const profile of REFERENCE_PROFILES) {
    const { ref, blockers, lines } = buildReference(profile);
    header.push(...lines);
    for (const b of blockers) notes.push(`${profile}: ${b}`);
    if (!write) continue;
    if (!ref) { notes.push(`${profile}: NOT written — blocked`); continue; }
    fs.writeFileSync(referenceFile(profile), referenceText(ref));
    notes.push(`${profile}: written ${referenceFile(profile)} (${ref.knots.length} knots)`);
  }
  console.log(header.join('\n'));
  if (notes.length) console.log(`\n${notes.join('\n')}`);
  if (!write) console.log('\ndry run — pass --write to freeze');
}

/** Re-scores every training stride and reproduces the stored knots, weights,
 * hashes and the mean. Returns one failure line per drift. */
function referenceMismatches(rows: string[]): string[] {
  const fail: string[] = [];
  for (const profile of REFERENCE_PROFILES) {
    const stored = readStoredReference(profile);
    if (!stored || stored.referenceVersion !== REFERENCE_VERSION) {
      rows.push(`| reference ${profile} | ${stored?.referenceVersion ?? 'absent'} | ${REFERENCE_VERSION} | 0 | `
        + 'UNFROZEN (no calibrated rank for this profile) |');
      continue;
    }
    const { ref } = buildReference(profile);
    if (!ref) { fail.push(`reference ${profile}: re-measure is BLOCKED but a frozen file exists`); continue; }
    const diffs: string[] = [];
    for (const k of ['scoreVersion', 'catalogueHash', 'domainHash', 'cohortHash', 'families', 'rows', 'tiedIntervals'] as const) {
      if (String(stored[k]) !== String(ref[k])) diffs.push(`${k} ${String(stored[k]).slice(0, 16)} vs ${String(ref[k]).slice(0, 16)}`);
    }
    if (stored.knots.length !== ref.knots.length) diffs.push(`knots ${stored.knots.length} vs ${ref.knots.length}`);
    else {
      for (let i = 0; i < ref.knots.length; i++) {
        const a = stored.knots[i];
        const b = ref.knots[i];
        if (a.t !== b.t || a.n !== b.n || Math.abs(a.below - b.below) > 1e-12 || Math.abs(a.mass - b.mass) > 1e-12) {
          diffs.push(`knot ${i} ${a.t}/${a.n} vs ${b.t}/${b.n}`);
          break;
        }
      }
    }
    const mean = meanReferenceRank(stored);
    const weight = stored.knots.reduce((s, k) => s + k.mass, 0);
    if (Math.abs(mean - 50) > 1e-9) diffs.push(`mean rank ${mean.toFixed(12)}`);
    if (Math.abs(weight - 1) > 1e-12) diffs.push(`weight sum ${weight.toFixed(15)}`);
    rows.push(`| reference ${profile} | ${stored.cohortHash.slice(0, 12)} | ${ref.cohortHash.slice(0, 12)} | `
      + `${stored.rows} | ${diffs.length === 0 ? 'MATCH' : 'MISMATCH'} |`);
    for (const d of diffs) fail.push(`reference ${profile}: ${d}`);
  }
  return fail;
}

// ── round 1 (refuter R2): re-measure every frozen constant ────────────────
//
//   MTG_DB_DIR=... npx tsx scripts/deck-score-bands.ts verify
//
// Pins in the test suite are literal copies of the artefacts, so they stay
// green when a catalogue change moves the statistic underneath them — which is
// exactly how two stale Brawl constants survived stage 4c. This re-runs the
// SAME statistic each constant was cut from and exits non-zero on a mismatch.
const VERIFY_EPS = 0.0005;

function verifyFrozen(): void {
  const fail: string[] = [];
  const rows: string[] = ['| constant | frozen | measured | n | verdict |', '|---|---:|---:|---:|---|'];
  const grade = (name: string, frozen: number, measured: number, n: number, eps = VERIFY_EPS): void => {
    // An event that never happens in the cohort cannot supply a percentile.
    // Round 1: ZERO of 1,200 Commander controls assemble a closing line, so
    // `Q_BASELINE_CLOSING` has no statistic this round. That is reported, not
    // graded — failing on it would force a number to be invented.
    if (n === 0 || !Number.isFinite(measured)) {
      rows.push(`| ${name} | ${frozen.toFixed(3)} | - | 0 | UNMEASURABLE (event never occurs in the cohort) |`);
      return;
    }
    const ok = Math.abs(frozen - measured) <= eps;
    if (!ok) fail.push(`${name}: frozen ${frozen.toFixed(3)} vs measured ${measured.toFixed(3)}`);
    rows.push(`| ${name} | ${frozen.toFixed(3)} | ${measured.toFixed(3)} | ${n} | ${ok ? 'MATCH' : 'MISMATCH'} |`);
  };

  // v1.4 stage 2: the ACTIVE S constants are the three `Q_slot` saturations.
  // `Q_BASELINE_JOINT_*`, `Q_BASELINE_CLOSING*`, `Q_BASELINE` and
  // `Q_SATURATION*` are retired from scoring (§10.2 b_S = 0, §10.3 no R
  // multiplier and no floor), so they are no longer graded here — they are
  // diagnostics with their own subcommands (`negative --joint`,
  // `closingfloor`). Grading a retired constant would fail this gate on a
  // number nothing reads.
  for (const profile of ['commander', 'brawl', 'standard'] as const) {
    const sat = saturationTable(profile, 'training', true);
    grade(`Q_SLOT_SATURATION.${profile} (p80, ${sat.families} families)`,
      qSlotSaturationFor(profile), sat.p80, sat.families >= 30 ? sat.n : 0, 1e-6);
  }
  rows.push('| (retired, diagnostics only) | Q_BASELINE_JOINT_*, Q_BASELINE_CLOSING*, Q_SATURATION* | - | - | not graded |');

  let bandCells = 0;
  for (const profile of ['commander', 'brawl'] as const) {
    const bands = commanderBands(true, true, 'training', profile, true);
    for (const row of bands) {
      if (!row.frozen || row.inherited || row.n === 0) continue;
      bandCells += 1;
      const min = Math.round(row.p25);
      const max = Math.round(row.p90);
      if (min === row.frozen.min && max === row.frozen.max) continue;
      fail.push(`band ${profile}/${row.plan}/${row.role}: frozen ${row.frozen.min}/${row.frozen.max} vs measured `
        + `${row.p25.toFixed(1)}/${row.p90.toFixed(1)} -> ${min}/${max} (n=${row.n})`);
      rows.push(`| band ${profile}/${row.plan}/${row.role} | ${row.frozen.min}/${row.frozen.max} | ${min}/${max} | ${row.n} | MISMATCH |`);
    }
  }

  // v1.4 stage 0 (§10.2 "record hashes, cohort membership/exclusions"): the
  // frozen manifest must still describe the CSVs on disk, or every band above
  // was measured on a different population than the one it claims.
  const hashes = verifyCohortHashes();
  rows.push(`| cohort list hashes | ${hashes.checked} | ${hashes.checked - hashes.mismatches.length} | ${hashes.checked} | `
    + `${hashes.mismatches.length === 0 ? 'MATCH' : 'MISMATCH'} |`);
  for (const m of hashes.mismatches.slice(0, 5)) fail.push(`cohort hash ${m}`);

  // v1.4 stage 1b (section 10.7): the recipe/catalogue DOMAIN stage 2 measures
  // its S norms on. A silent catalogue or combo-table move invalidates every
  // band cell above, so it is graded here rather than reported.
  const storedDomain = readDomain();
  if (!storedDomain) {
    rows.push('| recipe/catalogue domain | - | - | 0 | UNFROZEN (run `bands domain --write`) |');
    fail.push('domain: verify-2026-09-19/deck-score/domain-v14.json missing');
  } else {
    const diffs = domainMismatches(storedDomain, domainFreeze());
    rows.push(`| recipe/catalogue domain | ${storedDomain.catalogSha256.slice(0, 12)} | `
      + `${domainFreeze().catalogSha256.slice(0, 12)} | ${storedDomain.catalogSize} | `
      + `${diffs.length === 0 ? 'MATCH' : 'MISMATCH'} |`);
    for (const d of diffs) fail.push(`domain ${d}`);
  }

  // v1.4 stage 2c (§10.9 item 3): one command checks norms + domain +
  // reference. A drifted CDF is as invalidating as a drifted band cell.
  for (const f of referenceMismatches(rows)) fail.push(f);

  console.log(rows.join('\n'));
  console.log('');
  if (fail.length === 0) {
    console.log(`bands verify: OK — every frozen constant reproduces at this catalogue `
      + `(CATALOG_SIZE ${CATALOG_SIZE}; ${bandCells} band cells re-measured, 0 mismatches).`);
    return;
  }
  console.log(`bands verify: ${fail.length} MISMATCH(es) at this catalogue (CATALOG_SIZE ${CATALOG_SIZE}):`);
  for (const f of fail) console.log(`  - ${f}`);
  process.exitCode = 1;
}

/**
 * `--profile commander` used to satisfy `argv.includes('commander')` in `main`
 * and silently run `commanderBands` instead of the named subcommand, so
 * `controls --stride --profile commander` measured the wrong thing. The flag
 * and its value are dropped before any subcommand or flag name is matched.
 */
export function subcommandArgs(argv: readonly string[]): string[] {
  return argv.filter((a, i) => a !== '--profile' && argv[i - 1] !== '--profile'
    && a !== '--horizon' && argv[i - 1] !== '--horizon');
}

/**
 * §10.2's COVERAGE-CONDITIONED DIAGNOSTIC NULL — computed and REPORTED, never
 * scored. In .05-wide typed-coverage bins: the p95 of `Q_slot` over each pile
 * construction (a null for "how much useful mass does a random legal list of
 * this coverage carry") beside the family-weighted p80 of `Q_slot` over the
 * real eligible lists in the same bin. A cell prints a number only when it has
 * >= 100 controls / >= 30 real families, per §10.2.
 *
 * Nothing reads this table: it exists so a later stage can see whether S
 * separates decks from piles at FIXED coverage or merely reads coverage.
 */
function diagnosticNull(profile: SampleProfile, perCell: number): void {
  const real = slotRows(profile as ScoreProfile);
  const bins: { lo: number; hi: number }[] = [];
  for (let lo = 0.5; lo < 0.95; lo += 0.05) bins.push({ lo, hi: lo + 0.05 });
  const out: string[] = [
    `## §10.2 coverage-conditioned diagnostic null — ${profile} (REPORTED, never scored)`,
    '',
    `Piles: ${perCell} per construction per bin, drawn at the bin centre.`,
    'Real: eligible training rows, family-weighted p80 (both through `scoreDeck`).',
    '',
    '| coverage bin | ctrl93 p95 | n | ctrlalt p95 | n | real p80 | n | families |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const { lo, hi } of bins) {
    const centre = (lo + hi) / 2;
    const q = (piles: { input: Parameters<typeof scoreDeck>[0] }[]): { p95: number; n: number } => {
      const values = piles.map((pile) => scoreDeck(pile.input).detail.Qslot).sort((a, b) => a - b);
      return { p95: values.length > 0 ? pct(values, 95) : NaN, n: values.length };
    };
    const ctrl93 = q(loadCohortPiles('training', perCell, centre, profile));
    // Second construction: the contiguous file order with an independent
    // seed, not the stride cohort. (`ctrlmatch` proper matches the REAL
    // coverage distribution, which is meaningless inside a fixed bin.)
    const ctrlmatch = q(loadMatchedPiles(perCell, 0, 0xf00d0000, centre, undefined, profile));
    const cell = real.filter((r) => r.coverage >= lo && r.coverage < hi);
    const families = new Set(cell.map((r) => r.family)).size;
    const realP80 = families >= 30
      ? weightedQuantile(cell.map((r) => ({ value: r.value, family: r.family })), 0.80).toFixed(4)
      : `n/a (${families}f)`;
    const show = (v: { p95: number; n: number }): string => (v.n >= 100 ? v.p95.toFixed(4) : `n/a (${v.n})`);
    out.push(`| ${lo.toFixed(2)}-${hi.toFixed(2)} | ${show(ctrl93)} | ${ctrl93.n} | ${show(ctrlmatch)} | ${ctrlmatch.n} | `
      + `${realP80} | ${cell.length} | ${families} |`);
  }
  const text = out.join(String.fromCharCode(10));
  const line = String.fromCharCode(10);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `null-diagnostic-${profile}.md`), text + line);
  process.stdout.write(text + line);
}

// ── `bands freeze` — one command that re-measures and REWRITES the norms ──

/** Replace the `Q_SLOT_SATURATION` literal in `deck-score-norms.ts`. Pure so
 * the rewrite is testable without writing the file. */
export function rewriteSaturations(src: string, values: Record<ScoreProfile, number>): string {
  const head = 'export const Q_SLOT_SATURATION: Record<ScoreProfile, number> = {';
  const start = src.indexOf(head);
  if (start < 0) throw new Error('Q_SLOT_SATURATION literal not found');
  const end = src.indexOf('};', start);
  if (end < 0) throw new Error('Q_SLOT_SATURATION literal is unterminated');
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const body = (['commander', 'brawl', 'standard'] as const)
    .map((k) => `  ${k}: ${values[k].toFixed(8)},`).join(eol);
  return `${src.slice(0, start)}${head}${eol}${body}${eol}${src.slice(end)}`;
}

/** Replace one role's `cmd:`/`brawl:` band literal in `deck-score-plans.ts`.
 * Every role is one line inside its recipe's `roles: [...]`, so the edit is
 * located by recipe key then role key and never by a bare number. */
export function rewriteBandCell(
  src: string, plan: string, role: string, profile: 'commander' | 'brawl', band: { min: number; max: number },
): string {
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = src.split(eol);
  const at = lines.findIndex((l) => l.includes(`key: '${plan}',`) && !l.includes('{ key:'));
  if (at < 0) throw new Error(`recipe ${plan} not found`);
  const field = profile === 'brawl' ? 'brawl' : 'cmd';
  for (let i = at + 1; i < lines.length; i++) {
    if (lines[i].includes('key: \'') && !lines[i].includes('{ key:')) break;   // next recipe
    if (!lines[i].includes(`{ key: '${role}',`)) continue;
    const re = new RegExp(field + ': \\{ min: \\d+, max: \\d+ \\}');
    if (!re.test(lines[i])) throw new Error(`${plan}/${role} has no ${field} band to rewrite`);
    lines[i] = lines[i].replace(re, `${field}: { min: ${band.min}, max: ${band.max} }`);
    return lines.join(eol);
  }
  throw new Error(`role ${plan}/${role} not found`);
}

/**
 * §10.8: stage 2's S norms are PROVISIONAL until the corrected W domain
 * lands, so the freeze has to be a command rather than a hand edit. `freeze`
 * re-measures the three `Q_slot` saturations and all 45 band cells on the
 * frozen domain and prints what moved; `freeze --write` applies it to
 * `deck-score-norms.ts` and `deck-score-plans.ts`. Run `bands verify`
 * afterwards — it grades the same statistics and must come back clean.
 */
function freezeCommand(write: boolean): void {
  const lib = path.join(OUT_DIR, '..', '..', 'src', 'lib');
  const normsFile = path.join(lib, 'deck-score-norms.ts');
  const plansFile = path.join(lib, 'deck-score-plans.ts');
  const rows: string[] = ['| constant | frozen | measured | n | action |', '|---|---:|---:|---:|---|'];
  let moved = 0;

  const sat = {} as Record<ScoreProfile, number>;
  for (const profile of ['commander', 'brawl', 'standard'] as const) {
    const m = saturationTable(profile, 'training', true);
    const measured = m.families >= 30 ? Number(m.p80.toFixed(8)) : qSlotSaturationFor(profile);
    sat[profile] = measured;
    const same = Math.abs(measured - qSlotSaturationFor(profile)) <= VERIFY_EPS;
    if (!same) moved += 1;
    rows.push(`| Q_SLOT_SATURATION.${profile} | ${qSlotSaturationFor(profile).toFixed(8)} | ${measured.toFixed(8)} `
      + `| ${m.families >= 30 ? m.n : 0} | ${same ? 'unchanged' : 'REFREEZE'} |`);
  }

  const cells: { plan: string; role: string; profile: 'commander' | 'brawl'; min: number; max: number }[] = [];
  for (const profile of ['commander', 'brawl'] as const) {
    for (const row of commanderBands(true, true, 'training', profile, true)) {
      if (!row.frozen || row.inherited || row.n === 0) continue;
      const min = Math.round(row.p25);
      const max = Math.round(row.p90);
      if (min === row.frozen.min && max === row.frozen.max) continue;
      moved += 1;
      cells.push({ plan: row.plan, role: row.role, profile, min, max });
      rows.push(`| band ${profile}/${row.plan}/${row.role} | ${row.frozen.min}/${row.frozen.max} | ${min}/${max} `
        + `| ${row.n} | REFREEZE |`);
    }
  }

  if (write) {
    fs.writeFileSync(normsFile, rewriteSaturations(fs.readFileSync(normsFile, 'utf-8'), sat));
    let plans = fs.readFileSync(plansFile, 'utf-8');
    for (const c of cells) plans = rewriteBandCell(plans, c.plan, c.role, c.profile, c);
    fs.writeFileSync(plansFile, plans);
  }

  console.log(rows.join('\n'));
  console.log(`\nbands freeze: ${moved} constant(s) moved; `
    + `${write ? 'WRITTEN to deck-score-norms.ts / deck-score-plans.ts — re-run `bands verify` and the suite'
      : 'dry run, pass --write to apply'}.`);
  console.log('§10.8: every S norm here is PROVISIONAL until the corrected W domain lands.');
}

function main(): void {
  // `--profile brawl` swaps the corpus, the draw legality and the scored
  // format everywhere below; the default is the Commander corpus, so every
  // stage-1..4a command line keeps its meaning.
  const pArg = process.argv.indexOf('--profile');
  const profile: SampleProfile = pArg > 0 && process.argv[pArg + 1] === 'brawl' ? 'brawl' : 'commander';
  // Section 10.8 item 6: `--horizon 12` runs the SAME corrected evaluator at
  // the old bound, which is how the resource corrections are attributed apart
  // from the horizon extension.
  const hArg = process.argv.indexOf('--horizon');
  if (hArg > 0) setHorizonOverride(Number(process.argv[hArg + 1]));
  const argv = subcommandArgs(process.argv);
  if (argv.includes('saturation')) {
    // §10.2's statistic exists for all three calibrated profiles, so this is
    // the one subcommand that also accepts `--profile standard`. There is no
    // `--raw`: the norm must be the number the scorer itself computes.
    const wide = pArg > 0 && process.argv[pArg + 1] === 'standard' ? 'standard' : profile;
    saturationTable(wide as ScoreProfile, argv.includes('--holdout') ? 'holdout' : 'training');
    return;
  }
  if (argv.includes('null')) {
    const nArg = argv.indexOf('--n');
    diagnosticNull(profile, nArg > 0 ? Number(argv[nArg + 1]) : 120);
    return;
  }
  if (argv.includes('domain')) { domainCommand(argv.includes('--write')); return; }
  if (argv.includes('reference')) {
    if (argv.includes('verify')) { verifyFrozen(); return; }
    referenceCommand(argv.includes('--write'));
    return;
  }
  if (argv.includes('verify')) { verifyFrozen(); return; }
  if (argv.includes('freeze')) { freezeCommand(argv.includes('--write')); return; }
  if (argv.includes('real')) {
    const rArg = argv.indexOf('--n');
    const pArgPiles = argv.indexOf('--piles');
    if (argv.includes('--wzero')) {
      const dArg = argv.indexOf('--dump');
      wzeroAudit(rArg > 0 ? Number(argv[rArg + 1]) : 100000, profile,
        argv.includes('--holdout') ? 'holdout' : 'training',
        dArg > 0 ? argv[dArg + 1] : undefined);
      return;
    }
    realLists(rArg > 0 ? Number(argv[rArg + 1]) : 100000, profile,
      argv.includes('--holdout') ? 'holdout' : 'training',
      pArgPiles > 0 ? Number(argv[pArgPiles + 1]) : 1000);
    return;
  }
  if (argv.includes('typal')) { typalBands(profile); return; }
  if (argv.includes('closingfloor')) {
    const fArg = argv.indexOf('--n');
    closingFloor(fArg > 0 ? Number(argv[fArg + 1]) : 1000, profile,
      argv.includes('--stride') ? 'holdout' : 'training');
    return;
  }
  if (argv.includes('closing')) { closingBands(); return; }
  if (argv.includes('cedh')) { cedhSplit(); return; }
  if (argv.includes('commander')) {
    const cohort: SampleCohort | 'all' = argv.includes('--all')
      ? 'all' : argv.includes('--holdout') ? 'holdout' : 'training';
    commanderBands(argv.includes('--raw'), argv.includes('--evaluated'), cohort, profile);
    return;
  }
  if (argv.includes('controls')) {
    const cArg = argv.indexOf('--n');
    freshControls(cArg > 0 ? Number(argv[cArg + 1]) : 200,
      argv.includes('--stride'), argv.includes('--training'), profile);
    return;
  }
  if (argv.includes('negative')) {
    const nArg = argv.indexOf('--n');
    const n = nArg > 0 ? Number(argv[nArg + 1]) : 1000;
    if (argv.includes('--engine') || argv.includes('--joint')) {
      engineFloors(n, profile);
      return;
    }
    negativePrior(n, profile);
    return;
  }
  const probeArg = argv.indexOf('--probe');
  if (probeArg > 0) {
    probe(Number(argv[probeArg + 1]));
    return;
  }
  standardBands();
}

// Only when this file IS the entry point: `subcommandArgs` is imported by the
// stage-1c tests, and an import must not run a 2,000-deck sweep.
if (/deck-score-bands/.test(process.argv[1] ?? '')) main();
