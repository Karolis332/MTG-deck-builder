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
import fs from 'fs';
import path from 'path';
import { loadStandardCohorts, loadStandardDbFixture, ROOT } from './deck-score-fixtures';
import { getDb } from '../src/lib/db';
import type { DbCard } from '../src/lib/types';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import { PLAN_RECIPES, recipeFor, type PlanKey } from '../src/lib/deck-score-plans';
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
function shapeCohort(nonLand: DeckEntry[]): PlanKey {
  let best: { key: PlanKey; onPlan: number } = { key: 'midrange', onPlan: -1 };
  for (const recipe of PLAN_RECIPES) {
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
// board, quantity), a stratified pull from the VPS corpus.

const COMMANDER_SAMPLE = path.join(ROOT, 'verify-2026-09-20', 'commander-sample.csv');

/** RFC-4180 enough for this file: quoted fields may contain commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out;
}

interface SampleDeck { commander: string; cards: Array<{ name: string; quantity: number }> }

function readCommanderSample(): SampleDeck[] {
  const text = fs.readFileSync(COMMANDER_SAMPLE, 'utf-8');
  const lines = text.split(/\r?\n/);
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const col = (name: string): number => header.indexOf(name);
  const [iDeck, iCmd, iName, iBoard, iQty] = ['deck_id', 'commander', 'card_name', 'board', 'quantity'].map(col);
  const decks = new Map<string, SampleDeck>();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = splitCsvLine(lines[i]);
    if (iBoard >= 0 && f[iBoard] && f[iBoard] !== 'main' && f[iBoard] !== 'commander') continue;
    let deck = decks.get(f[iDeck]);
    if (!deck) { deck = { commander: f[iCmd], cards: [] }; decks.set(f[iDeck], deck); }
    deck.cards.push({ name: f[iName], quantity: Number(f[iQty]) || 1 });
  }
  return [...decks.values()];
}

/** One pass over `cards` beats 229k parameterised lookups. */
function cardsByName(): Map<string, DbCard> {
  const rows = getDb().prepare(
    `SELECT id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, keywords,
            legalities, power, toughness, loyalty, produced_mana, edhrec_rank, layout, subtypes, game_changer
     FROM cards WHERE type_line <> 'Card // Card'`
  ).all() as DbCard[];
  const map = new Map<string, DbCard>();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    if (!map.has(key)) map.set(key, row);
    const front = key.split(' // ')[0];
    if (!map.has(front)) map.set(front, row);
  }
  return map;
}

function commanderBands(raw: boolean): void {
  const byName = cardsByName();
  const decks = readCommanderSample();
  const buckets = Object.fromEntries(PLAN_RECIPES.map((r) => [r.key, [] as DeckEntry[][]])) as Record<PlanKey, DeckEntry[][]>;
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
  }

  const lines = [`commander sample: ${decks.length} decks, ${resolvedDecks} resolved, ${unresolved} unresolved card rows`];
  for (const recipe of PLAN_RECIPES) {
    const cohort = buckets[recipe.key];
    lines.push('', `## ${recipe.key} (n=${cohort.length}) — ${recipe.label}`);
    lines.push('| role | p10 | p25 | median | p75 | p90 | frozen min/max |');
    lines.push('|---|---:|---:|---:|---:|---:|---|');
    const sizes = cohort.map((d) => d.reduce((a, e) => a + e.quantity, 0)).sort((a, b) => a - b);
    lines.push(`| (nonland copies) | ${pct(sizes, 10)} | ${pct(sizes, 25)} | ${pct(sizes, 50)} | ${pct(sizes, 75)} | ${pct(sizes, 90)} | - |`);
    for (const role of recipe.roles) {
      const supplies = cohort
        .map((nonLand) => nonLand
          .filter((e) => e.feature.s >= 1 && (raw || e.feature.covered) && recipe.roles.find((r) => r.fills(e.feature))?.key === role.key)
          .reduce((a, e) => a + e.quantity, 0))
        .sort((a, b) => a - b);
      lines.push(`| ${role.key} | ${pct(supplies, 10)} | ${pct(supplies, 25)} | ${pct(supplies, 50)} | ${pct(supplies, 75)} | ${pct(supplies, 90)} | ${role.min}/${role.max} |`);
    }
  }
  console.log(lines.join('\n'));
}

function main(): void {
  if (process.argv.includes('commander')) { commanderBands(process.argv.includes('--raw')); return; }
  const probeArg = process.argv.indexOf('--probe');
  if (probeArg > 0) {
    probe(Number(process.argv[probeArg + 1]));
    return;
  }
  const { positive } = loadStandardCohorts(3000);
  const buckets = Object.fromEntries(PLAN_RECIPES.map((r) => [r.key, [] as DeckEntry[][]])) as Record<PlanKey, DeckEntry[][]>;

  for (const deck of positive) {
    const nonLand: DeckEntry[] = deck.input.main
      .map((rc) => ({ feature: deriveCardFeature(rc.card), quantity: rc.quantity }))
      .filter((e) => !e.feature.isLand);
    if (nonLand.length === 0) continue;
    buckets[shapeCohort(nonLand)].push(nonLand);
  }

  const lines: string[] = [];
  lines.push(`positive Standard lists: ${positive.length}`);
  for (const recipe of PLAN_RECIPES) {
    const decks = buckets[recipe.key];
    lines.push('');
    lines.push(`## ${recipe.key} (n=${decks.length}) — ${recipe.label}`);
    lines.push('| role | p10 | p25 | median | p75 | p90 | frozen min/max |');
    lines.push('|---|---:|---:|---:|---:|---:|---|');
    const sizes = decks.map((d) => d.reduce((s, e) => s + e.quantity, 0)).sort((a, b) => a - b);
    const verified = decks.map((d) => d.filter((e) => e.feature.s >= 1).reduce((s, e) => s + e.quantity, 0)).sort((a, b) => a - b);
    lines.push(`| (nonland copies) | ${pct(sizes, 10)} | ${pct(sizes, 25)} | ${pct(sizes, 50)} | ${pct(sizes, 75)} | ${pct(sizes, 90)} | - |`);
    lines.push(`| (verified copies) | ${pct(verified, 10)} | ${pct(verified, 25)} | ${pct(verified, 50)} | ${pct(verified, 75)} | ${pct(verified, 90)} | - |`);
    for (const role of recipeFor(recipe.key).roles) {
      const supplies = decks
        .map((nonLand) => nonLand
          .filter((e) => e.feature.s >= 1 && recipe.roles.find((r) => r.fills(e.feature))?.key === role.key)
          .reduce((s, e) => s + e.quantity, 0))
        .sort((a, b) => a - b);
      lines.push(`| ${role.key} | ${pct(supplies, 10)} | ${pct(supplies, 25)} | ${pct(supplies, 50)} | ${pct(supplies, 75)} | ${pct(supplies, 90)} | ${role.min}/${role.max} |`);
    }
  }
  console.log(lines.join('\n'));
}

main();
