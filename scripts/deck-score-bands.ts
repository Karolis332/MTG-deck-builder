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
import { loadMatchedPiles, readCommanderSample, cardsByName } from './deck-score-piles';
import { scoreDeck } from '../src/lib/deck-score';
import type { DbCard } from '../src/lib/types';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import { typalTheme, typalRecipe, evaluatePlan, evaluateTypal, evaluateClosing, isManlandFinisher, recipesFor, selectPlan, CLOSING_SUPPORT_BAND } from '../src/lib/deck-score-plans';
import { PLAN_RECIPES, recipeFor, qBaselineFor, betterPlan, COMMANDER_BAND_REFERENCE, type PlanKey, type PlanRecipe } from '../src/lib/deck-score-plans';
import { producerUtilisation } from '../src/lib/deck-score-producers';
import { Q_BASELINE_GENERIC_COMMANDER, Q_SATURATION, normsFor, type ScoreProfile } from '../src/lib/deck-score-norms';
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
function evaluatedSupply(nonLand: DeckEntry[], N: number, recipe: PlanRecipe, raw: boolean): Map<string, number> {
  // `raw` lifts ONLY the typed-coverage gate, so the evaluated bands describe
  // the same card population the v1.2 raw bands did. Corpus coverage is a
  // property of the catalogue's size, not of the decks: gating here would
  // freeze floors of p25 = 0 that every pile clears.
  const entries = raw
    ? nonLand.map((e) => ({ ...e, feature: { ...e.feature, covered: true } }))
    : nonLand;
  const evaluation = evaluatePlan(recipe, N, entries, [], undefined, 'commander');
  return new Map(evaluation.roles.map((r) => [r.role.key, r.supply]));
}

function commanderBands(raw: boolean, evaluated = false): void {
  const byName = cardsByName();
  const decks = readCommanderSample();
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

  const lines = [`commander sample: ${decks.length} decks, ${resolvedDecks} resolved, ${unresolved} unresolved card rows`];
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
        .map((nonLand) => ({ nonLand, supply: evaluatedSupply(nonLand, deckSize.get(nonLand) ?? COMMANDER_BAND_REFERENCE, recipe, raw) }))
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
      lines.push(`| ${role.key} | ${f(pct(supplies, 10))} | ${f(pct(supplies, 25))} | ${f(pct(supplies, 50))} | ${f(pct(supplies, 75))} | ${f(pct(supplies, 90))} | ${role.cmd ? `${role.cmd.min}/${role.cmd.max}` : `${role.min}/${role.max} (60-card)`} |`);
    }
  }
  console.log(lines.join('\n'));
}

/** p25/p90 of the dynamic typal recipe's roles, over the sample decks that
 * actually name a countable theme. */
function typalBands(): void {
  const byName = cardsByName();
  const rows: Record<string, number[]> = { payoff: [], enabler: [] };
  let decks = 0;
  for (const deck of readCommanderSample()) {
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
  console.log(`typal cohort: ${decks} decks`);
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
// Freezes `Q_BASELINE_GENERIC_COMMANDER` at the 95th percentile of
// `max(Q_aggro, Q_midrange, Q_control)` over land/curve/colour-matched
// Commander controls whose commanders and seeds are held out from the 200
// validation piles and from every §5 fixture. `b >= .70` rejects the statistic
// (§9.2) — at that point the generic recipes cannot separate anything and the
// answer is a recipe change, not a prior.

const GENERIC: PlanKey[] = ['aggro', 'midrange', 'control'];

function genericQ(input: Parameters<typeof scoreDeck>[0]): { q: number; key: PlanKey; coverage: number } {
  const entries: DeckEntry[] = input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
  const nonLand = entries.filter((e) => !e.feature.isLand);
  const commanders: DeckEntry[] = input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
  const N = entries.reduce((a, e) => a + e.quantity, 0);
  const util = producerUtilisation(nonLand, commanders);
  let best = { q: 0, key: GENERIC[0] };
  for (const key of GENERIC) {
    const evaluation = evaluatePlan(recipeFor(key), N, nonLand, commanders, util, 'commander');
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
function engineFloors(n: number, offset: number, seed: number): void {
  const positives = loadCedhCohort().map((d) => genericQ(d.input).coverage).sort((a, b) => a - b);
  const target = pct(positives, 50);
  const piles = loadMatchedPiles(n, offset, seed, target);
  const generic = new Set<PlanKey>(['aggro', 'midrange', 'control']);
  const families = PLAN_RECIPES.filter((r) => !generic.has(r.key));
  const perFamily = new Map<string, number[]>(families.map((r) => [r.key, []]));
  perFamily.set('typal', []);
  const maxEngine: number[] = [];

  for (const pile of piles) {
    const entries: DeckEntry[] = pile.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const nonLand = entries.filter((e) => !e.feature.isLand);
    const cmd: DeckEntry[] = pile.input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
    const N = entries.reduce((a, e) => a + e.quantity, 0);
    const util = producerUtilisation(nonLand, cmd);
    let best = 0;
    const record = (key: string, e: ReturnType<typeof evaluatePlan>): void => {
      if (e.hasEmptyEssential) return;
      perFamily.get(key)?.push(e.Q);
      if (e.Q > best) best = e.Q;
    };
    for (const recipe of families) record(recipe.key, evaluatePlan(recipe, N, nonLand, cmd, util, 'commander'));
    const typal = evaluateTypal(N, nonLand, cmd, util, 'commander');
    if (typal) record('typal', typal);
    maxEngine.push(best);
  }

  const lines = [
    `matched Commander negative controls: n=${piles.length}, offset ${offset}, seed 0x${seed.toString(16)}, coverage target ${target.toFixed(3)}`,
    '',
    '| family | selectable n | Q p50 | Q p90 | Q p95 (= floor) | Q p99 | Q max | frozen |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const [key, values] of perFamily) {
    const v = [...values].sort((a, b) => a - b);
    const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : '-');
    lines.push(`| ${key} | ${v.length} | ${fmt(pct(v, 50))} | ${fmt(pct(v, 90))} | ${fmt(pct(v, 95))} | ${fmt(pct(v, 99))} | ${fmt(v[v.length - 1])} | ${qBaselineFor('commander', key as PlanKey).toFixed(3)} |`);
  }
  const me = [...maxEngine].sort((a, b) => a - b);
  lines.push(`| ALL ENGINE (max per pile) | ${me.length} | ${pct(me, 50).toFixed(3)} | ${pct(me, 90).toFixed(3)} | ${pct(me, 95).toFixed(3)} | ${pct(me, 99).toFixed(3)} | ${me[me.length - 1].toFixed(3)} | - |`);
  // The generic trio's statistic on the SAME draw, so a stage that moves the
  // control sample can see whether b = .542 still sits at this cohort's p95.
  const genericQs = piles.map((p) => genericQ(p.input).q);
  const mg = [...genericQs].sort((a, b) => a - b);
  lines.push(`| GENERIC (max per pile) | ${mg.length} | ${pct(mg, 50).toFixed(3)} | ${pct(mg, 90).toFixed(3)} | ${pct(mg, 95).toFixed(3)} | ${pct(mg, 99).toFixed(3)} | ${mg[mg.length - 1].toFixed(3)} | ${Q_BASELINE_GENERIC_COMMANDER.toFixed(3)} |`);
  // TWO floors at p95 bound two families at 5% EACH, not their union at 5%.
  // This row is the number that would bound it: the p95 of the maximum over
  // every recipe a pile can read, generic and engine together.
  const mj = maxEngine.map((q, i) => Math.max(q, genericQs[i])).sort((a, b) => a - b);
  lines.push(`| JOINT (max over all recipes) | ${mj.length} | ${pct(mj, 50).toFixed(3)} | ${pct(mj, 90).toFixed(3)} | ${pct(mj, 95).toFixed(3)} | ${pct(mj, 99).toFixed(3)} | ${mj[mj.length - 1].toFixed(3)} | - |`);
  console.log(lines.join('\n'));
}

function negativePrior(n: number): void {
  // §9.2 "match typed coverage to positives so unknown cards are not the
  // discriminator": the Commander reference cohort is the 30 cEDH Top-16
  // lists, and its MEDIAN typed coverage is what the controls are drawn to.
  const positives = loadCedhCohort().map((d) => genericQ(d.input).coverage).sort((a, b2) => a - b2);
  const target = pct(positives, 50);

  const piles = loadMatchedPiles(n, 0, 0x5eed0000, target);
  const rows = piles.map((p) => ({ ...genericQ(p.input), commander: p.commander, lands: p.lands }));
  const qs = rows.map((r) => r.q).sort((a, b2) => a - b2);
  const b = pct(qs, 95);
  const pileCoverage = rows.map((r) => r.coverage).sort((a, b2) => a - b2);
  const landsSorted = rows.map((r) => r.lands).sort((a, b2) => a - b2);
  const byKey = GENERIC.map((k) => `${k} ${rows.filter((r) => r.key === k).length}`).join(', ');

  console.log([
    `matched Commander negative controls: n=${rows.length}, ${new Set(rows.map((r) => r.commander)).size} distinct commanders`,
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
    `frozen Q_BASELINE_GENERIC_COMMANDER = ${Q_BASELINE_GENERIC_COMMANDER}` +
      ` (measured ${b.toFixed(3)}; ${b >= Q_SATURATION ? 'REJECTED: b >= .70' : 'accepted'})`,
    `S <= 5 needs Q <= b + .05*(.70-b) = ${(b + 0.05 * (Q_SATURATION - b)).toFixed(3)} at R = 1.`,
  ].join('\n'));
}

/**
 * `controls` — the §9.2 acceptance run on FRESH matched negative controls:
 * sample lists and seeds disjoint from both the b-training set (offset 0) and
 * the 200 §5 validation piles. Prints the same two counts acceptance asks for.
 */
function freshControls(n: number, stride: boolean, training = false): void {
  // MEASURED CONFOUND. `commander-sample.csv` holds TEN lists per commander in
  // file order, so the contiguous slice at offset 2000 is 200 piles drawn from
  // 22 commanders — 22 clusters, not 200 draws. A floor frozen at the p95 of a
  // 100-commander cohort cannot be expected to hold 95% of a 22-commander one,
  // and the measurement bears that out: this slice's own max-generic Q p95 is
  // .574 against the training cohort's .542
  // (`verify-2026-09-19/deck-score/engine-floor-fresh.txt`).
  // `--stride` keeps the same held-out region but takes one pile per commander
  // block, so the holdout has the training cohort's commander diversity.
  // `--training` re-runs the acceptance counts on the SAME cohort the floors
  // were frozen from, which is the only way to tell "the floor is too low" from
  // "the floor is a p95 of a different population".
  const piles = training
    ? loadMatchedPiles(n, 0, 0x5eed0000, 0.93)
    : stride
      ? loadMatchedPiles(1700, 1000, 0xc0ffee00, 0.93).filter((_, i) => i % 8 === 0).slice(0, n)
      : loadMatchedPiles(n, 2000, 0xf00d0000, 0.93);
  const scored = piles.map((p) => {
    const r = scoreDeck(p.input);
    const entries: DeckEntry[] = p.input.main.map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }));
    const nonLand = entries.filter((e) => !e.feature.isLand);
    const cmd: DeckEntry[] = p.input.commander.map((c) => ({ feature: deriveCardFeature(c), quantity: 1 }));
    const N = entries.reduce((a, e) => a + e.quantity, 0);
    const plan = selectPlan(Math.max(1, N), nonLand, cmd, undefined, 'commander');
    return {
      total: r.score, S: r.components.find((c) => c.key === 'synergy')?.score ?? 0,
      commander: p.commander, key: plan.recipe.key, Q: plan.Q, R: plan.R,
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
    return `${k} ${v} (b=${qBaselineFor('commander', k as PlanKey).toFixed(3)}, Q med ${pct(qs, 50).toFixed(3)})`;
  });
  console.log([
    `fresh matched controls: n=${scored.length}, ${new Set(scored.map((r) => r.commander)).size} distinct commanders`,
    `total   min=${totals[0]} median=${pct(totals, 50)} p95=${pct(totals, 95)} max=${totals[totals.length - 1]}  <25: ${totals.filter((v) => v < 25).length}/${totals.length}`,
    `S       min=${syn[0].toFixed(1)} median=${pct(syn, 50).toFixed(1)} p95=${pct(syn, 95).toFixed(1)} max=${syn[syn.length - 1].toFixed(1)}  <=5: ${syn.filter((v) => v <= 5).length}/${syn.length}`,
    `S > 5 by selected recipe: ${byKey.join(', ') || 'none'}`,
    `S > 5 Q/R median: ${pct(leaking.map((r) => r.Q).sort((a, b) => a - b), 50).toFixed(3)} / ${pct(leaking.map((r) => r.R).sort((a, b) => a - b), 50).toFixed(3)}`,
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

function main(): void {
  if (process.argv.includes('typal')) { typalBands(); return; }
  if (process.argv.includes('closing')) { closingBands(); return; }
  if (process.argv.includes('cedh')) { cedhSplit(); return; }
  if (process.argv.includes('commander')) {
    commanderBands(process.argv.includes('--raw'), process.argv.includes('--evaluated'));
    return;
  }
  if (process.argv.includes('controls')) {
    const cArg = process.argv.indexOf('--n');
    freshControls(cArg > 0 ? Number(process.argv[cArg + 1]) : 200,
      process.argv.includes('--stride'), process.argv.includes('--training'));
    return;
  }
  if (process.argv.includes('negative')) {
    const nArg = process.argv.indexOf('--n');
    const n = nArg > 0 ? Number(process.argv[nArg + 1]) : 1000;
    if (process.argv.includes('--engine')) {
      const oArg = process.argv.indexOf('--offset');
      const sArg = process.argv.indexOf('--seed');
      engineFloors(n, oArg > 0 ? Number(process.argv[oArg + 1]) : 0,
        sArg > 0 ? Number(process.argv[sArg + 1]) : 0x5eed0000);
      return;
    }
    negativePrior(n);
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
