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
import { loadStandardCohorts, loadStandardDbFixture, loadCedhCohort } from './deck-score-fixtures';
import { loadMatchedPiles, loadCohortPiles, strideOrder, readSample, cardsByName, cohortSeed, HOLDOUT_EVERY, type SampleCohort, type SampleProfile } from './deck-score-piles';
import { scoreDeck } from '../src/lib/deck-score';
import type { DbCard } from '../src/lib/types';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import { typalTheme, typalRecipe, evaluatePlan, evaluateTypal, evaluateClosing, isManlandFinisher, recipesFor, selectPlan, planFit, CLOSING_SUPPORT_BAND } from '../src/lib/deck-score-plans';
import { PLAN_RECIPES, recipeFor, qBaselineFor, betterPlan, COMMANDER_BAND_REFERENCE, type PlanKey, type PlanRecipe } from '../src/lib/deck-score-plans';
import { producerUtilisation } from '../src/lib/deck-score-producers';
import { Q_BASELINE, Q_BASELINE_JOINT_COMMANDER, Q_BASELINE_JOINT_BRAWL, Q_SATURATION, normsFor, type ScoreProfile } from '../src/lib/deck-score-norms';
import { clip } from '../src/lib/deck-score-math';
import { computeInteraction, computeAdvantage } from '../src/lib/deck-score-interaction';
import { computeWin } from '../src/lib/deck-score-win';
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

function commanderBands(
  raw: boolean, evaluated = false, cohort: SampleCohort | 'all' = 'training',
  profile: SampleProfile = 'commander',
): void {
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
      lines.push(`| ${role.key} | ${f(pct(supplies, 10))} | ${f(pct(supplies, 25))} | ${f(pct(supplies, 50))} | ${f(pct(supplies, 75))} | ${f(pct(supplies, 90))} | ${frozen ? `${frozen.min}/${frozen.max}${label}` : `${role.min}/${role.max} (60-card)`} |`);
    }
  }
  console.log(lines.join('\n'));
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
function engineFloors(n: number, profile: SampleProfile = 'commander'): void {
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
      return clip((r.Q - b) / (Q_SATURATION - b)) * r.R;
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
  console.log(lines.join('\n'));
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
      ` (measured ${b.toFixed(3)}; ${b >= Q_SATURATION ? 'REJECTED: b >= .70' : 'accepted'})`,
    `S <= 5 needs Q <= b + .05*(.70-b) = ${(b + 0.05 * (Q_SATURATION - b)).toFixed(3)} at R = 1.`,
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
      const evaluation = evaluateClosing(win.closing, nonLand, cmd, util, 'commander',
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
      ? betterPlan(base, evaluateClosing(win.closing, nonLand, cmd, util, 'commander',
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
  const closing = evaluateClosing(win.closing, nonLand, cmd, util, profile,
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

function closingFloor(n: number, profile: SampleProfile = 'commander', cohort: SampleCohort = 'training'): void {
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
    controls.filter((r) => r.wins && clip((r.Q - b) / (Q_SATURATION - b)) * r.R > 0);
  lines.push(`| frozen today (b = ${Q_BASELINE.toFixed(3)}) | ${winners.length} | ` +
    `${positives.filter((r) => r.wins).length} | the stage-4a 1/200 |`);
  lines.push(`| A: b = control p95 = ${floorA.toFixed(3)} | ${underFloor(floorA).length} | ` +
    `${positives.filter((r) => r.wins && clip((r.Q - floorA) / (Q_SATURATION - floorA)) * r.R > 0).length} | ` +
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
  console.log(lines.join('\n'));
}

function main(): void {
  // `--profile brawl` swaps the corpus, the draw legality and the scored
  // format everywhere below; the default is the Commander corpus, so every
  // stage-1..4a command line keeps its meaning.
  const pArg = process.argv.indexOf('--profile');
  const profile: SampleProfile = pArg > 0 && process.argv[pArg + 1] === 'brawl' ? 'brawl' : 'commander';
  if (process.argv.includes('typal')) { typalBands(profile); return; }
  if (process.argv.includes('closingfloor')) {
    const fArg = process.argv.indexOf('--n');
    closingFloor(fArg > 0 ? Number(process.argv[fArg + 1]) : 1000, profile,
      process.argv.includes('--stride') ? 'holdout' : 'training');
    return;
  }
  if (process.argv.includes('closing')) { closingBands(); return; }
  if (process.argv.includes('cedh')) { cedhSplit(); return; }
  if (process.argv.includes('commander')) {
    const cohort: SampleCohort | 'all' = process.argv.includes('--all')
      ? 'all' : process.argv.includes('--holdout') ? 'holdout' : 'training';
    commanderBands(process.argv.includes('--raw'), process.argv.includes('--evaluated'), cohort, profile);
    return;
  }
  if (process.argv.includes('controls')) {
    const cArg = process.argv.indexOf('--n');
    freshControls(cArg > 0 ? Number(process.argv[cArg + 1]) : 200,
      process.argv.includes('--stride'), process.argv.includes('--training'), profile);
    return;
  }
  if (process.argv.includes('negative')) {
    const nArg = process.argv.indexOf('--n');
    const n = nArg > 0 ? Number(process.argv[nArg + 1]) : 1000;
    if (process.argv.includes('--engine') || process.argv.includes('--joint')) {
      engineFloors(n, profile);
      return;
    }
    negativePrior(n, profile);
    return;
  }
  const probeArg = process.argv.indexOf('--probe');
  if (probeArg > 0) {
    probe(Number(process.argv[probeArg + 1]));
    return;
  }
  standardBands();
}

main();
