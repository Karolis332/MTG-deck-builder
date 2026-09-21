/**
 * Deck Score — S discriminant study (2026-09-21). MEASUREMENT ONLY.
 *
 * Round 1 left S a step function: the matched controls' max-recipe Q p95 rose
 * to .683 (Commander) / .733 (Brawl) while `Q_SATURATION` stayed spec-frozen
 * at .70, so 85.5 % of real Commander lists read S = 0. The diagnosis was
 * "role-supply counting no longer separates a deck from a pile". This script
 * grades CANDIDATE separating statistics against the same cohorts, so the next
 * stage picks a formula from numbers rather than from a hunch.
 *
 * It changes no scorer, no norm, no catalogue entry and no test. Every deck is
 * read through the live predicates (`scoreDeckSafely` for the product numbers,
 * un-lifted `covered` everywhere else) — never `--raw`.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-discriminant.ts cohorts [--profile commander|brawl] [--n 1000]
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-discriminant.ts fixtures
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-discriminant.ts summary
 *
 * Output: verify-2026-09-19/deck-score/discriminant/{stats-commander.csv,
 * stats-brawl.csv, fixtures.csv, summary.txt}.
 */
import fs from 'fs';
import path from 'path';
import { ROOT, FIXTURES, loadCedhCohort, type LoadedDeck } from './deck-score-fixtures';
import {
  loadStudyControls, cedhCoverageMedian, strideOrder, readSample, cardsByName,
  type SampleProfile, type MatchedPile,
} from './deck-score-piles';
import { scoreDeck, type DeckScoreInput } from '../src/lib/deck-score';
import { scoreDeckSafely } from '../src/lib/deck-score-input';
import { deriveCardFeature, type CardFeature } from '../src/lib/deck-score-features';
import {
  evaluatePlan, evaluateTypal, selectPlan, recipesFor, recipeFor,
  type PlanEvaluation, type PlanRole,
} from '../src/lib/deck-score-plans';
import { producerUtilisation } from '../src/lib/deck-score-producers';
import { catalogFacts, catalogEntry } from '../src/lib/deck-score-catalog';
import { profileOf, qualityCap, type ScoreProfile, type ScoreFormat } from '../src/lib/deck-score-norms';
import type { DeckEntry } from '../src/lib/deck-score-mana';
import type { DbCard } from '../src/lib/types';

const OUT_DIR = path.join(ROOT, 'verify-2026-09-19', 'deck-score', 'discriminant');
const CARD_DATA_VERSION = 'deck-score-report-2026-09-19';

/**
 * Seeds DISJOINT from every existing cohort. `COHORT_SEED` is
 * 0x5eed0000/0xc0ffee00 and `PROFILE_SEED` xors 0x000b2a71 for Brawl, so the
 * four live bases are 0x5eed0000/0x5ee62a71/0xc0ffee00/0xc0f4c471. The §5
 * validation piles use `loadMatchedPiles`' own callers' bases. Nothing below
 * collides with any of them.
 */
// (`SEED_HIGH`/`SEED_MATCH` and both constructions now live in
// `deck-score-piles.ts` so `bands real` draws the IDENTICAL control sets.)


function pct(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[i];
}

/** Mann-Whitney AUC: P(positive > negative) + .5 P(tie). .5 = no separation. */
function auc(positives: readonly number[], negatives: readonly number[]): number {
  if (positives.length === 0 || negatives.length === 0) return NaN;
  const all = [...positives.map((v) => ({ v, pos: true })), ...negatives.map((v) => ({ v, pos: false }))]
    .sort((a, b) => a.v - b.v);
  // Average ranks over ties.
  let rankSum = 0;
  for (let i = 0; i < all.length;) {
    let j = i;
    while (j + 1 < all.length && all[j + 1].v === all[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) if (all[k].pos) rankSum += avgRank;
    i = j + 1;
  }
  const n1 = positives.length;
  const n2 = negatives.length;
  return (rankSum - (n1 * (n1 + 1)) / 2) / (n1 * n2);
}

/** Normalised Shannon entropy of a nonnegative vector; 0 = one atom, 1 = flat. */
function normEntropy(values: readonly number[]): number {
  const positive = values.filter((v) => v > 0);
  const total = positive.reduce((s, v) => s + v, 0);
  if (total <= 0 || positive.length < 2) return 0;
  const h = -positive.reduce((s, v) => { const p = v / total; return s + p * Math.log(p); }, 0);
  return h / Math.log(positive.length);
}

function cosineDistance(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 1;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Singularise a catalogue resource key so the producer and consumer
 * vocabularies meet ("creature deaths" -> "creature death", "cards" -> "card"). */
function normResource(resource: string): string {
  const r = resource.trim().toLowerCase();
  return r.endsWith('s') && !r.endsWith('ss') ? r.slice(0, -1) : r;
}

/** The frozen band a role answers to in this profile, for vector normalisation. */
function bandMax(role: PlanRole, profile: ScoreProfile, N: number): number {
  if (profile === 'brawl' && role.brawl) return Math.max(1, role.brawl.max);
  if ((profile === 'commander' || profile === 'brawl') && role.cmd) return Math.max(1, role.cmd.max);
  return Math.max(1, (role.max * N) / 60);
}

// ── the per-deck statistics ───────────────────────────────────────────────

export interface StatRow {
  cohort: string;
  id: string;
  commander: string;
  F: number;
  coverage: number;
  plan: string;
  /** 1. baseline: the max-recipe Q the floors take the p95 of. */
  q_live: number;
  /** The selected plan's R — every candidate S keeps `... * R`. */
  R: number;
  /** 2. coverage-normalised supply share. */
  q_typed: number;
  /** The Q of the plan the LIVE scorer finally used, parsed from the synergy
   * reason. `selectPlan` above is the PRE-closing plan: it is the live plan for
   * every pile (0/200 assemble a closing line) and for ~95% of real lists, but
   * a combo deck's live plan comes from `evaluateClosing`, which needs W. */
  q_final: number;
  q_typed_final: number;
  plan_live: string;
  /** 3. plan concentration. */
  conc_gap: number;
  conc_share: number;
  conc_ent: number;
  role_conc: number;
  /** 4. producer-consumer linkage. */
  link_cons: number;
  link_u: number;
  link_typed: number;
  link_plan: number;
  /** 5. commander linkage. */
  cmd_link: number;
  cmd_econ: number;
  cmd_typed: number;
  cmd_member: number;
  /** 6. role-vector shape (filled in pass 2). */
  shape_d: number;
  /** 7. the live S and total. */
  s_live: number;
  total: number;
  /** Enough of the live composition to recompute the total under a CANDIDATE
   * S offline: `total(S') = clip(min(base - w*S/100 + w*S'/100,
   * 20 + .8*min(M, W, S'), cap_hard))`. Verified against the live totals by
   * `anchors --stat s_live --identity`. */
  win_w: number;
  base: number;
  w_syn: number;
  cap_hard: number;
  /** 8. cheap coherence controls. */
  mana_m: number;
  mv_fit: number;
  /** 9. combinations. */
  comb_qc: number;
  comb_ql: number;
  vec: number[];
  vecKey: string;
}

const CSV_COLUMNS: readonly (keyof StatRow)[] = [
  'cohort', 'id', 'commander', 'F', 'coverage', 'plan', 'plan_live', 'R',
  'q_live', 'q_typed', 'q_final', 'q_typed_final', 'conc_gap', 'conc_share', 'conc_ent', 'role_conc',
  'link_cons', 'link_u', 'link_typed', 'link_plan', 'cmd_link', 'cmd_econ', 'cmd_typed', 'cmd_member',
  'shape_d', 's_live', 'total', 'win_w', 'base', 'w_syn', 'cap_hard', 'mana_m', 'mv_fit', 'comb_qc', 'comb_ql',
];

/** Every statistic whose distribution the report grades, in report order. */
export const STATISTICS: readonly (keyof StatRow)[] = [
  'q_live', 'q_typed', 'q_final', 'q_typed_final', 'conc_gap', 'conc_share', 'conc_ent', 'role_conc',
  'link_cons', 'link_u', 'link_typed', 'link_plan', 'cmd_link', 'cmd_econ', 'cmd_typed', 'cmd_member',
  'shape_d', 's_live', 'mana_m', 'mv_fit', 'comb_qc', 'comb_ql',
];

interface DeckShape {
  main: { card: DbCard; quantity: number }[];
  commander: DbCard[];
  format: ScoreFormat;
}

/**
 * Every candidate statistic for one deck, through the live predicates. The
 * typed-coverage gate is NEVER lifted: `evaluatePlan` sees the features
 * `deriveCardFeature` actually produces, which is what the shipped scorer sees.
 */
function analyse(deck: DeckShape, cohort: string, id: string): StatRow | null {
  const profile = profileOf(deck.format);
  const entries: DeckEntry[] = deck.main.map((e) => ({ feature: deriveCardFeature(e.card), quantity: e.quantity }));
  const nonLand = entries.filter((e) => !e.feature.isLand);
  const commanderFeatures: CardFeature[] = deck.commander.map((c) => deriveCardFeature(c));
  const commanderEntries: DeckEntry[] = commanderFeatures.map((f) => ({ feature: f, quantity: 1 }));
  const F = nonLand.reduce((s, e) => s + e.quantity, 0);
  if (F === 0) return null;
  const N = entries.reduce((s, e) => s + e.quantity, 0) + commanderEntries.length;
  const typedCopies = nonLand.filter((e) => e.feature.covered).reduce((s, e) => s + e.quantity, 0);
  const coverage = typedCopies / F;

  const util = producerUtilisation(nonLand, commanderEntries);

  // Every recipe this profile offers, evaluated once, exactly as `selectPlan`
  // does — so `q_live` is the same quantity `bands saturation` reports.
  const reads: { key: string; Q: number; R: number; selectable: boolean }[] = [];
  for (const recipe of recipesFor(profile)) {
    const e = evaluatePlan(recipe, N, nonLand, commanderEntries, util, profile);
    reads.push({ key: recipe.key, Q: e.Q, R: e.R, selectable: !e.hasEmptyEssential });
  }
  const typal = evaluateTypal(N, nonLand, commanderEntries, util, profile);
  if (typal) reads.push({ key: 'typal', Q: typal.Q, R: typal.R, selectable: !typal.hasEmptyEssential });
  const pool = reads.some((r) => r.selectable) ? reads.filter((r) => r.selectable) : reads;
  const qs = pool.map((r) => r.Q).sort((a, b) => b - a);
  const q_live = qs[0] ?? 0;
  const q2 = qs[1] ?? 0;

  const selected: PlanEvaluation = selectPlan(Math.max(1, N), nonLand, commanderEntries, util, profile);

  // 3. concentration. `conc_ent` is 1 - normalised entropy of the Q vector:
  // high = this deck reads as ONE plan, low = it reads as all of them equally.
  const conc_gap = q_live - q2;
  const conc_share = q_live + q2 > 0 ? q_live / (q_live + q2) : 0;
  const conc_ent = 1 - normEntropy(pool.map((r) => r.Q));
  const role_conc = 1 - normEntropy(selected.roles.map((r) => r.credited));

  // 6. role-supply vector in the selected recipe's own band-normalised space.
  const vec = selected.roles.map((r) => r.supply / bandMax(r.role, profile, N));
  const vecKey = `${profile}:${selected.recipe.key}`;

  // 4. producer-consumer linkage. `util.rows` is every copy whose output or
  // whose payoff is CHARGED — a link that is worthless unless its other end is
  // present. A pile holds both ends by accident at most.
  const rowsAll = util.rows;
  const consRows = rowsAll.filter((r) => r.side === 'consumes');
  const chargedQty = rowsAll.reduce((s, r) => s + r.quantity, 0);
  const consQty = consRows.reduce((s, r) => s + r.quantity, 0);
  const link_cons = consQty > 0 ? consRows.reduce((s, r) => s + r.quantity * r.u, 0) / consQty : 1;
  const link_u = chargedQty > 0 ? rowsAll.reduce((s, r) => s + r.quantity * r.u, 0) / chargedQty : 1;
  const link_typed = typedCopies > 0 ? rowsAll.reduce((s, r) => s + r.quantity * r.u, 0) / typedCopies : 0;
  // Restricted to the selected plan: copies the plan would actually use.
  const onPlan = new Set(
    nonLand
      .filter((e) => e.feature.covered && e.feature.s >= 1 && selected.recipe.roles.some((r) => r.fills(e.feature)))
      .map((e) => e.feature.card.name),
  );
  const planRows = rowsAll.filter((r) => onPlan.has(r.name));
  const planQty = planRows.reduce((s, r) => s + r.quantity, 0);
  const link_plan = planQty > 0 ? planRows.reduce((s, r) => s + r.quantity * r.u, 0) / planQty : 1;

  // 5. commander linkage — typed copies whose modes meet the commander's.
  // The produce/consume vocabularies are not symmetric ("creature deaths" on
  // Meren against "creature death" on her fodder), so both sides are
  // singularised before intersecting; `deck-score-producers.ts` does the same
  // job with a regex. Without this every commander reads as unlinked.
  const cmdProduces = new Set<string>();
  const cmdConsumes = new Set<string>();
  let cmdTyped = 0;
  for (const f of commanderFeatures) {
    const facts = catalogFacts(f.card.name, f.card.oracle_text);
    if (!facts || !facts.textMatches) continue;
    cmdTyped = 1;
    for (const r of facts.produces) cmdProduces.add(normResource(r));
    for (const r of facts.consumes) cmdConsumes.add(normResource(r));
  }
  const cmdEconomy = new Set<string>([...cmdProduces, ...cmdConsumes]);
  let linked = 0;
  let economy = 0;
  for (const e of nonLand) {
    if (!e.feature.covered) continue;
    const facts = catalogFacts(e.feature.card.name, e.feature.card.oracle_text);
    if (!facts || !facts.textMatches) continue;
    const produces = [...facts.produces].map(normResource);
    const consumes = [...facts.consumes].map(normResource);
    // Directional: the copy eats what the commander makes, or feeds what it eats.
    if (consumes.some((r) => cmdProduces.has(r)) || produces.some((r) => cmdConsumes.has(r))) {
      linked += e.quantity;
    }
    // Undirected: the copy trades in ANY resource the commander trades in.
    if ([...produces, ...consumes].some((r) => cmdEconomy.has(r))) economy += e.quantity;
  }
  const cmd_link = typedCopies > 0 ? linked / typedCopies : 0;
  const cmd_econ = typedCopies > 0 ? economy / typedCopies : 0;
  const cmd_member = commanderFeatures.some(
    (f) => f.s >= 1 && selected.recipe.roles.some((r) => r.fills(f)),
  ) ? 1 : 0;

  // 8. cheap coherence controls. `mv_fit` is the share of nonland copies the
  // selected plan's latest essential deadline can actually cast — the controls
  // copy the real list's MV histogram, so this SHOULD NOT separate.
  const deadlines = selected.recipe.roles.filter((r) => r.essential && r.deadline).map((r) => r.deadline as number);
  const cutoff = deadlines.length ? Math.max(...deadlines) : 6;
  const mv_fit = nonLand.filter((e) => e.feature.c <= cutoff).reduce((s, e) => s + e.quantity, 0) / F;

  // 7. the product numbers, through the shipped entry point.
  const payload = scoreDeckSafely({ format: deck.format, main: deck.main, commander: deck.commander });
  const synergyReason = payload?.components.find((c) => c.key === 'synergy')?.reason ?? '';
  const parsed = synergyReason.match(/^(\d+)% supports (\S+?);/);
  const q_final = parsed ? Number(parsed[1]) / 100 : 0;
  const plan_live = parsed ? parsed[2] : '';
  const s_live = payload?.components.find((c) => c.key === 'synergy')?.score ?? 0;
  const mana_m = payload?.components.find((c) => c.key === 'mana')?.score ?? 0;
  const win_w = payload?.components.find((c) => c.key === 'win')?.score ?? 0;
  const total = payload?.score ?? 0;
  const base = (payload?.components ?? []).reduce((acc, c) => acc + (c.weight / 100) * c.score, 0);
  const w_syn = payload?.components.find((c) => c.key === 'synergy')?.weight ?? 0;
  const caps = (payload?.gates ?? []).filter((g) => g.kind !== 'quality' && g.cap !== null).map((g) => g.cap as number);
  const cap_hard = caps.length ? Math.min(...caps) : 100;

  const q_typed = Math.min(1, coverage > 0 ? q_live / coverage : 0);
  return {
    cohort, id, commander: deck.commander[0]?.name ?? '', F, coverage, plan: selected.recipe.key,
    R: selected.R, q_live, q_typed, q_final,
    q_typed_final: Math.min(1, coverage > 0 ? q_final / coverage : 0), plan_live, conc_gap, conc_share, conc_ent, role_conc,
    link_cons, link_u, link_typed, link_plan, cmd_link, cmd_econ, cmd_typed: cmdTyped, cmd_member,
    shape_d: 0, s_live, total, win_w, base, w_syn, cap_hard, mana_m, mv_fit,
    // 9. combinations, chosen after reading 1-8 (see the report).
    comb_qc: q_typed * conc_share,
    comb_ql: q_typed * link_plan,
    vec, vecKey,
  };
}

/**
 * Pass 2 for statistic 6: cosine distance to the PILE centroid minus the
 * distance to the REAL centroid, so a higher value is more deck-like.
 *
 * Centroids come from the EVEN-indexed half of each cohort and the study grades
 * the odd half (`shapeGraded`), so the number is not measured on the lists that
 * defined it. A recipe with fewer than 30 even-half members in either cohort
 * falls back to the profile's midrange space, which every deck can be read in.
 */
function fillShape(rows: StatRow[], profile: ScoreProfile): void {
  const centroid = (subset: StatRow[], dim: number): number[] => {
    const out = new Array(dim).fill(0) as number[];
    if (subset.length === 0) return out;
    for (const r of subset) for (let i = 0; i < dim; i++) out[i] += (r.vec[i] ?? 0) / subset.length;
    return out;
  };
  const even = rows.filter((_, i) => i % 2 === 0);
  const keys = new Set(rows.map((r) => r.vecKey));
  const midKey = `${profile}:midrange`;
  const midDim = recipeFor('midrange').roles.length;
  const realMid = centroid(even.filter((r) => r.cohort === 'real'), midDim);
  const pileMid = centroid(even.filter((r) => r.cohort !== 'real'), midDim);

  const perKey = new Map<string, { real: number[]; pile: number[]; dim: number }>();
  for (const key of keys) {
    const mine = even.filter((r) => r.vecKey === key);
    const real = mine.filter((r) => r.cohort === 'real');
    const pile = mine.filter((r) => r.cohort !== 'real');
    if (real.length < 30 || pile.length < 30) continue;
    const dim = mine[0].vec.length;
    perKey.set(key, { real: centroid(real, dim), pile: centroid(pile, dim), dim });
  }

  const defining = new Set(even);
  rows.forEach((r) => {
    // A row that DEFINED a centroid cannot also be graded against it: those are
    // NaN, and the summary drops them, so every reported shape number is
    // held out from the centroids it is measured against.
    if (defining.has(r)) { r.shape_d = NaN; return; }
    const own = perKey.get(r.vecKey);
    if (own) {
      r.shape_d = cosineDistance(r.vec, own.pile) - cosineDistance(r.vec, own.real);
      return;
    }
    // Fallback space: read the deck as midrange. A deck whose selected recipe
    // is neither midrange nor a 30+-member cohort has NO comparable vector —
    // NaN, not 0, or the distribution grows a spike of ties at the decision
    // boundary and the AUC is measured on an artefact.
    const v = r.vecKey === midKey && r.vec.length === midDim ? r.vec : null;
    r.shape_d = v ? cosineDistance(v, pileMid) - cosineDistance(v, realMid) : NaN;
  });
}

// ── cohorts ───────────────────────────────────────────────────────────────

/** A real TRAINING-stride corpus list, resolved exactly as `bands real` does. */
function realDecks(profile: SampleProfile): { shape: DeckShape; id: string; missingNames: string[] }[] {
  const byName = cardsByName();
  const sample = readSample(profile);
  const out: { shape: DeckShape; id: string; missingNames: string[] }[] = [];
  for (const i of strideOrder('training', sample)) {
    const deck = sample[i];
    if (!deck) continue;
    const main: { card: DbCard; quantity: number }[] = [];
    const commander: DbCard[] = [];
    const commanderName = deck.commander.toLowerCase();
    let missing = 0;
    let took = false;
    const missingNames: string[] = [];
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { missing += line.quantity; missingNames.push(line.name); continue; }
      if (!took && line.name.toLowerCase() === commanderName) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    if (main.length === 0 || missing > deck.cards.length * 0.1) continue;
    out.push({ shape: { main, commander, format: profile as ScoreFormat }, id: deck.id, missingNames });
  }
  return out;
}

function pileShape(pile: MatchedPile): DeckShape {
  return {
    main: pile.input.main.map((rc) => ({ card: rc.card, quantity: rc.quantity })),
    commander: [...pile.input.commander],
    format: pile.input.format,
  };
}

/**
 * CONFOUND (i). The live controls are drawn to typed coverage .930 — the cEDH
 * reference median — while real lists sit at p50 .757. A supply-SHARE statistic
 * rewards the piles' extra typed copies, so some of the missing window may be
 * an artefact of the draw rather than of the deck.
 *
 * Both constructions moved to `deck-score-piles.ts` (v1.4 stage 0) so
 * `bands real` reproduces the §10 baseline from the IDENTICAL piles; the
 * seeds and the binning are unchanged.
 */

function writeCsv(file: string, rows: readonly StatRow[]): void {
  const head = CSV_COLUMNS.join(',');
  const body = rows.map((r) => CSV_COLUMNS.map((c) => {
    const v = r[c];
    if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(6) : '';
    return `"${String(v).replace(/"/g, '""')}"`;
  }).join(',')).join('\n');
  fs.writeFileSync(file, `${head}\n${body}\n`);
}

function cohorts(profile: SampleProfile, n: number): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const t0 = Date.now();
  const rows: StatRow[] = [];

  const real = realDecks(profile);
  for (const r of real) {
    const row = analyse(r.shape, 'real', r.id);
    if (row) rows.push(row);
  }
  const realCoverage = rows.map((r) => r.coverage);
  process.stderr.write(`${profile}: ${rows.length} real lists in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  // Control set A: the CURRENT construction — one fixed .930 target — on fresh
  // seeds. The cEDH median is re-measured rather than hardcoded.
  const highTarget = cedhCoverageMedian();
  const high = loadStudyControls(profile, 'ctrl93', n);
  for (const p of high) {
    const row = analyse(pileShape(p), 'ctrl93', p.sampleId);
    if (row) rows.push(row);
  }
  process.stderr.write(`${profile}: ${high.length} ctrl93 piles (target ${highTarget.toFixed(3)})\n`);

  // Control set B: coverage-matched to the real lists.
  const matched = loadStudyControls(profile, 'ctrlmatch', n, realCoverage);
  for (const p of matched) {
    const row = analyse(pileShape(p), 'ctrlmatch', p.sampleId);
    if (row) rows.push(row);
  }
  process.stderr.write(`${profile}: ${matched.length} ctrlmatch piles\n`);

  fillShape(rows, profile as ScoreProfile);
  writeCsv(path.join(OUT_DIR, `stats-${profile}.csv`), rows);
  process.stderr.write(`${profile}: wrote ${rows.length} rows in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
}

// ── fixtures + cEDH ───────────────────────────────────────────────────────

function fixtureRows(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows: StatRow[] = [];
  const bands: string[] = [];
  for (const spec of FIXTURES) {
    const deck: LoadedDeck = spec.load();
    const shape: DeckShape = {
      main: deck.input.main.map((rc) => ({ card: rc.card, quantity: rc.quantity })),
      commander: [...deck.input.commander],
      format: spec.format,
    };
    const row = analyse(shape, 'fixture', spec.name);
    if (process.env.DISC_DEBUG) process.stderr.write(`${spec.name}: main=${shape.main.length} cmd=${shape.commander.length} row=${row ? 'ok' : 'NULL'}
`);
    if (!row) continue;
    rows.push(row);
    bands.push(spec.band);
  }
  const cedh = loadCedhCohort();
  cedh.forEach((d, i) => {
    const shape: DeckShape = {
      main: d.input.main.map((rc) => ({ card: rc.card, quantity: rc.quantity })),
      commander: [...d.input.commander],
      format: 'commander',
    };
    const row = analyse(shape, 'cedh', `cedh-${i}`);
    if (row) { rows.push(row); bands.push('80-95'); }
  });
  // `band` rides in the commander column for fixtures: one extra CSV column
  // would break the shared writer for no gain.
  const withBand = rows.map((r, i) => ({ ...r, commander: `${r.commander}|band=${bands[i]}` }));
  writeCsv(path.join(OUT_DIR, 'fixtures.csv'), withBand);
  process.stderr.write(`fixtures: ${withBand.length} rows\n`);
}

// ── anchors under a candidate S ───────────────────────────────────────────

/**
 * Re-run the 16 fixtures with S REPLACED by a candidate, offline: the weighted
 * base swaps its synergy term and the quality cap `20+.8*min(M,W,S)` is
 * re-evaluated. Hard caps (rules/identity/size/unresolved) are read off the
 * live gates and still bind. Nothing in the scorer is touched.
 */
function anchorsUnder(candidate: (r: StatRow) => number): string[] {
  const lines = ['| fixture | band | live | S live | S cand | total cand | verdict |', '|---|---|---:|---:|---:|---:|---|'];
  let inBandCount = 0;
  for (const spec of FIXTURES) {
    const deck = spec.load();
    const shape: DeckShape = {
      main: deck.input.main.map((rc) => ({ card: rc.card, quantity: rc.quantity })),
      commander: [...deck.input.commander],
      format: spec.format,
    };
    const row = analyse(shape, 'fixture', spec.name);
    const result = scoreDeck({
      format: spec.format, main: shape.main, commander: shape.commander, sideboard: [],
      unresolved: deck.input.unresolved, cardDataVersion: CARD_DATA_VERSION, corpus: null,
    } as DeckScoreInput);
    const get = (k: string) => result.components.find((c) => c.key === k)?.score ?? 0;
    const sCand = row ? Math.max(0, Math.min(100, candidate(row))) : get('synergy');
    const base = result.components.reduce((s, c) => s + (c.weight / 100) * (c.key === 'synergy' ? sCand : c.score), 0);
    const cap = qualityCap(get('mana'), get('win'), sCand);
    const hard = result.gates.filter((g) => g.kind !== 'quality' && g.cap !== null).map((g) => g.cap as number);
    const total = Math.round(Math.max(0, Math.min(100, Math.min(base, cap, ...(hard.length ? hard : [Infinity])))));
    const m = spec.band.match(/(\d+)\D+(\d+)/);
    const ok = m ? total >= Number(m[1]) && total <= Number(m[2]) : true;
    if (ok) inBandCount++;
    lines.push(`| ${spec.name} | ${spec.band} | ${result.score} | ${get('synergy').toFixed(1)} | ${sCand.toFixed(1)} | ${total} | ${ok ? 'IN' : 'OUT'} |`);
  }
  lines.push(`| **anchors in band** | | | | | **${inBandCount}/${FIXTURES.length}** | |`);
  return lines;
}

// ── summary ───────────────────────────────────────────────────────────────

function readCsv(file: string): Record<string, string>[] {
  const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}

/**
 * Candidate S bases, evaluated from the stored columns so a new formula costs
 * a `summary` re-run rather than a cohort re-run. `q_typed` is the coverage-
 * normalised supply share; the rest test whether concentration, R or the
 * producer links add anything on top of it.
 */
const COMBOS: Record<string, (r: Record<string, string>) => number> = {
  'q_typed': (r) => Number(r.q_typed),
  'q_typed*R': (r) => Number(r.q_typed) * Number(r.R),
  'q_typed*conc_share': (r) => Number(r.q_typed) * Number(r.conc_share),
  'q_typed*(1+conc_gap)': (r) => Number(r.q_typed) * (1 + Number(r.conc_gap)),
  'q_typed+conc_gap': (r) => Number(r.q_typed) + Number(r.conc_gap),
  'q_typed*(1+cmd_econ)': (r) => Number(r.q_typed) * (1 + Number(r.cmd_econ)),
  'q_typed*role_conc': (r) => Number(r.q_typed) * Number(r.role_conc),
  'sqrt(q_typed*conc_share)': (r) => Math.sqrt(Math.max(0, Number(r.q_typed) * Number(r.conc_share))),
  'q_live (baseline)': (r) => Number(r.q_live),
  's_live (shipped)': (r) => Number(r.s_live),
};

function gradeTable(
  real: Record<string, string>[],
  ctrl: Record<string, string>[],
  values: (r: Record<string, string>) => number,
): string {
  const rv = real.map(values).filter(Number.isFinite).sort((a, b) => a - b);
  const cv = ctrl.map(values).filter(Number.isFinite).sort((a, b) => a - b);
  if (rv.length === 0 || cv.length === 0) return '| - | - | - | - | - | - | - | - |';
  const c95 = pct(cv, 95);
  const above = rv.filter((v) => v > c95).length;
  return `${pct(cv, 50).toFixed(3)} | ${c95.toFixed(3)} | ${pct(rv, 10).toFixed(3)} | ` +
    `${pct(rv, 50).toFixed(3)} | ${pct(rv, 90).toFixed(3)} | ${(pct(rv, 50) - c95).toFixed(3)} | ` +
    `${auc(rv, cv).toFixed(3)} | ${((100 * above) / rv.length).toFixed(1)}%`;
}

/**
 * The end-to-end consequence of a candidate S. `scoreDeck`'s composition is
 * linear in S apart from the quality cap, so the total under a candidate is
 *
 *   total(S') = clip(min(base - w*S/100 + w*S'/100, 20 + .8*min(M,W,S'), hardCap))
 *
 * and every input is stored per row. `anchors --stat s_live --identity`
 * verifies that this reproduces the live totals exactly on all 16 fixtures.
 */
function totalUnder(r: Record<string, string>, S: number): number {
  const w = Number(r.w_syn);
  const base = Number(r.base) - (w / 100) * Number(r.s_live) + (w / 100) * S;
  const cap = 20 + 0.8 * Math.min(Number(r.mana_m), Number(r.win_w), S);
  return Math.round(Math.max(0, Math.min(100, base, cap, Number(r.cap_hard))));
}

const GENERIC_PLANS: ReadonlySet<string> = new Set(['aggro', 'midrange', 'control']);

/**
 * `b(coverage)` — the pile baseline as a FUNCTION of the deck's own typed
 * coverage: weighted least squares over the per-coverage-bin p95 of the
 * controls. The live floor is ONE constant, so it grades a .75-coverage real
 * list against what a .94-coverage pile achieves.
 */
function conditionalFloor(controls: Record<string, string>[], stat: string): { a: number; m: number } {
  const bins = new Map<number, number[]>();
  for (const r of controls) {
    const k = Math.round(Number(r.coverage) * 20) / 20;
    const list = bins.get(k);
    if (list) list.push(Number(r[stat])); else bins.set(k, [Number(r[stat])]);
  }
  const pts = [...bins.entries()]
    .filter(([, v]) => v.length >= 30)
    .map(([k, v]) => ({ x: k, y: pct(v.slice().sort((a, b) => a - b), 95), n: v.length }));
  if (pts.length < 2) return { a: 0, m: 0 };
  const sw = pts.reduce((s, q) => s + q.n, 0);
  const mx = pts.reduce((s, q) => s + q.x * q.n, 0) / sw;
  const my = pts.reduce((s, q) => s + q.y * q.n, 0) / sw;
  const m = pts.reduce((s, q) => s + q.n * (q.x - mx) * (q.y - my), 0)
    / pts.reduce((s, q) => s + q.n * (q.x - mx) ** 2, 0);
  return { a: my - m * mx, m };
}

interface Candidate {
  label: string;
  /** The per-deck statistic the floor and saturation are read off. */
  value: (r: Record<string, string>) => number;
  /** Which controls the floor is the p95 of. */
  controls: 'ctrl93' | 'ctrlmatch' | 'both';
  /** Saturation percentile of the real distribution; 0 = keep the live S. */
  satPct: number;
  /** Apply only where the live plan is generic (§9.2's own scope). */
  genericOnly?: boolean;
  /** Leave the closing (`combo`) plan on its own measured floor. It is the one
   * plan family that already separates — 0/2,000 controls assemble a line —
   * and 28/30 cEDH Top-16 lists read it, so replacing its floor is what makes
   * the cEDH cohort collapse under every whole-deck candidate. */
  closingExempt?: boolean;
  /** Keep the `* R` multiplier. */
  withR?: boolean;
}

function candidateSection(
  real: Record<string, string>[], c93: Record<string, string>[], cm: Record<string, string>[],
  cedh: Record<string, string>[], anchors: Record<string, string>[],
): string[] {
  const cf = conditionalFloor([...c93, ...cm], 'q_final');
  const margin = (r: Record<string, string>) => Number(r.q_final) - (cf.a + cf.m * Number(r.coverage));
  const list: Candidate[] = [
    { label: 'live (shipped)', value: (r) => Number(r.s_live), controls: 'ctrl93', satPct: 0 },
    { label: 'q_final, floor on coverage-matched controls', value: (r) => Number(r.q_final), controls: 'ctrlmatch', satPct: 90 },
    { label: 'q_typed_final, floor on ctrl93', value: (r) => Number(r.q_typed_final), controls: 'ctrl93', satPct: 90 },
    { label: 'q_typed_final, floor on ctrl93, sat p75', value: (r) => Number(r.q_typed_final), controls: 'ctrl93', satPct: 75 },
    { label: 'q_typed_final x R, floor on ctrl93', value: (r) => Number(r.q_typed_final), controls: 'ctrl93', satPct: 90, withR: true },
    { label: 'q_typed_final, generic plans only', value: (r) => Number(r.q_typed_final), controls: 'ctrl93', satPct: 90, genericOnly: true },
    { label: 'conditional floor b(cov), sat p75', value: margin, controls: 'both', satPct: 75 },
    { label: 'conditional floor b(cov), sat p90', value: margin, controls: 'both', satPct: 90 },
    { label: 'conditional floor b(cov), generic plans only', value: margin, controls: 'both', satPct: 90, genericOnly: true },
    { label: 'conditional floor b(cov), closing exempt, sat p60', value: margin, controls: 'both', satPct: 60, closingExempt: true },
    { label: 'conditional floor b(cov), closing exempt, sat p75', value: margin, controls: 'both', satPct: 75, closingExempt: true },
    { label: 'conditional floor b(cov), closing exempt, sat p90', value: margin, controls: 'both', satPct: 90, closingExempt: true },
  ];
  const out = [
    `conditional floor fitted on ${c93.length + cm.length} controls: b(cov) = ${cf.a.toFixed(3)} + ${cf.m.toFixed(3)} * coverage`,
    '',
    '| candidate | b | sat | S p50 | S=0 | real total p50 | real <25 | ctrl93 <25 | ctrlmatch <25 | cEDH total p50 | anchors |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const c of list) {
    const ctrl = c.controls === 'ctrl93' ? c93 : c.controls === 'ctrlmatch' ? cm : [...c93, ...cm];
    // The floor and the saturation are measured on the population the rule
    // actually grades, never on the exempt one.
    const scope = (rs: Record<string, string>[]) => {
      if (c.genericOnly) return rs.filter((r) => GENERIC_PLANS.has(r.plan_live));
      if (c.closingExempt) return rs.filter((r) => r.plan_live !== 'combo');
      return rs;
    };
    const b = c.satPct === 0 ? NaN : pct(scope(ctrl).map(c.value).sort((x, y) => x - y), 95);
    const sat = c.satPct === 0 ? NaN : pct(scope(real).map(c.value).sort((x, y) => x - y), c.satPct);
    const S = (r: Record<string, string>): number => {
      if (c.satPct === 0) return Number(r.s_live);
      if (c.genericOnly && !GENERIC_PLANS.has(r.plan_live)) return Number(r.s_live);
      if (c.closingExempt && r.plan_live === 'combo') return Number(r.s_live);
      const v = 100 * Math.max(0, Math.min(1, (c.value(r) - b) / (sat - b)));
      return c.withR ? v * Number(r.R) : v;
    };
    const sr = real.map(S).sort((x, y) => x - y);
    const share = (rs: Record<string, string>[]) =>
      `${((100 * rs.filter((r) => totalUnder(r, S(r)) < 25).length) / Math.max(1, rs.length)).toFixed(1)}%`;
    const tr = real.map((r) => totalUnder(r, S(r))).sort((x, y) => x - y);
    const cedhTotal = cedh.length ? pct(cedh.map((r) => totalUnder(r, S(r))).sort((x, y) => x - y), 50).toFixed(0) : '-';
    // `ramos-dragon-engine` is a 3-card list: it has no statistics row, and its
    // hard cap of 0 keeps it inside its 0-19 band under every candidate, so it
    // is counted IN without being re-scored here.
    let inBand = anchors.length ? 1 : 0;
    for (const r of anchors) {
      const m = (r.commander.split('|band=')[1] ?? '').match(/(\d+)\D+(\d+)/);
      if (!m) continue;
      const t = totalUnder(r, S(r));
      if (t >= Number(m[1]) && t <= Number(m[2])) inBand++;
    }
    out.push(`| ${c.label} | ${Number.isFinite(b) ? b.toFixed(3) : '-'} | ${Number.isFinite(sat) ? sat.toFixed(3) : '-'} | ` +
      `${pct(sr, 50).toFixed(1)} | ${((100 * sr.filter((x) => x < 0.05).length) / sr.length).toFixed(1)}% | ` +
      `${pct(tr, 50).toFixed(0)} | ${share(real)} | ${share(c93)} | ${share(cm)} | ${cedhTotal} | ` +
      `${anchors.length ? `${inBand}/16` : '-'} |`);
  }
  return out;
}

function summary(): void {
  const out: string[] = [];
  for (const profile of ['commander', 'brawl'] as const) {
    const file = path.join(OUT_DIR, `stats-${profile}.csv`);
    if (!fs.existsSync(file)) continue;
    const rows = readCsv(file);
    const by = (c: string) => rows.filter((r) => r.cohort === c);
    const real = by('real');
    const sets: [string, Record<string, string>[]][] = [['ctrl93', by('ctrl93')], ['ctrlmatch', by('ctrlmatch')]];
    out.push(`## ${profile}  (real n=${real.length}, ctrl93 n=${sets[0][1].length}, ctrlmatch n=${sets[1][1].length})`);
    const cov = (rs: Record<string, string>[]) => pct(rs.map((r) => Number(r.coverage)).sort((a, b) => a - b), 50);
    out.push(`typed coverage p50 — real ${cov(real).toFixed(3)}, ctrl93 ${cov(sets[0][1]).toFixed(3)}, ctrlmatch ${cov(sets[1][1]).toFixed(3)}`);
    const shareOf = (rs: Record<string, string>[], f: (r: Record<string, string>) => boolean) =>
      `${((100 * rs.filter(f).length) / Math.max(1, rs.length)).toFixed(1)}%`;
    out.push(`commander itself typed — real ${shareOf(real, (r) => r.cmd_typed === '1.000000')}, ` +
      `ctrl93 ${shareOf(sets[0][1], (r) => r.cmd_typed === '1.000000')}`);
    out.push(`shape_d defined (held out + comparable space) — real ${shareOf(real, (r) => r.shape_d !== '')}, ` +
      `ctrl93 ${shareOf(sets[0][1], (r) => r.shape_d !== '')}, ctrlmatch ${shareOf(sets[1][1], (r) => r.shape_d !== '')}`);
    for (const [label, ctrl] of sets) {
      out.push('', `### vs ${label}`);
      out.push('| statistic | ctrl p50 | ctrl p95 | real p10 | real p50 | real p90 | window | AUC | real>ctrl p95 |');
      out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
      for (const stat of STATISTICS) {
        out.push(`| ${stat} | ${gradeTable(real, ctrl, (r) => Number(r[stat as string]))} |`);
      }
      out.push('', `### combinations vs ${label}`);
      out.push('| candidate | ctrl p50 | ctrl p95 | real p10 | real p50 | real p90 | window | AUC | real>ctrl p95 |');
      out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
      for (const [name, f] of Object.entries(COMBOS)) {
        out.push(`| ${name} | ${gradeTable(real, ctrl, f)} |`);
      }
    }
    const fixFile2 = path.join(OUT_DIR, 'fixtures.csv');
    const fixRows = fs.existsSync(fixFile2) ? readCsv(fixFile2) : [];
    out.push('', `### candidate S, end to end (${profile})`);
    out.push(...candidateSection(
      real, sets[0][1], sets[1][1],
      profile === 'commander' ? fixRows.filter((r) => r.cohort === 'cedh') : [],
      profile === 'commander' ? fixRows.filter((r) => r.cohort === 'fixture') : [],
    ));
    // Why a deck reads S = 0: below the floor, or a missing essential role (R).
    const zeroSplit = (rs: Record<string, string>[], b: number): string => {
      const z = rs.filter((r) => Number(r.s_live) < 0.05);
      if (z.length === 0) return 'none';
      const floorZ = z.filter((r) => Number(r.q_final) <= b).length;
      const rZ = z.filter((r) => Number(r.R) <= 0.001).length;
      return `${z.length}/${rs.length} at S=0; of those ${((100 * floorZ) / z.length).toFixed(1)}% sit below the floor and ` +
        `${((100 * rZ) / z.length).toFixed(1)}% have R=0`;
    };
    const frozenB = profile === 'commander' ? 0.683 : 0.733;
    out.push('', `S=0 cause (frozen floor ${frozenB}) — real: ${zeroSplit(real, frozenB)}`);
    out.push(`generic-plan share — real ${((100 * real.filter((r) => GENERIC_PLANS.has(r.plan_live)).length) / real.length).toFixed(1)}%, ` +
      `ctrl93 ${((100 * sets[0][1].filter((r) => GENERIC_PLANS.has(r.plan_live)).length) / sets[0][1].length).toFixed(1)}%, ` +
      `ctrlmatch ${((100 * sets[1][1].filter((r) => GENERIC_PLANS.has(r.plan_live)).length) / sets[1][1].length).toFixed(1)}%`);
    const rp = (rs: Record<string, string>[]) => pct(rs.map((r) => Number(r.R)).sort((a, b) => a - b), 50).toFixed(2);
    out.push(`R p50 — real ${rp(real)}, ctrl93 ${rp(sets[0][1])}, ctrlmatch ${rp(sets[1][1])}`);
    out.push('');
  }
  const fixFile = path.join(OUT_DIR, 'fixtures.csv');
  if (fs.existsSync(fixFile)) {
    const rows = readCsv(fixFile);
    out.push('## fixtures + cEDH');
    out.push(`| deck | band | plan | ${STATISTICS.join(' | ')} |`);
    out.push(`|---|---|---|${STATISTICS.map(() => '---:').join('|')}|`);
    for (const r of rows.filter((x) => x.cohort === 'fixture')) {
      const band = (r.commander.split('|band=')[1] ?? '').trim();
      out.push(`| ${r.id} | ${band} | ${r.plan} | ${STATISTICS.map((s) => Number(r[s as string]).toFixed(3)).join(' | ')} |`);
    }
    const cedh = rows.filter((x) => x.cohort === 'cedh');
    if (cedh.length) {
      const med = (s: string) => pct(cedh.map((r) => Number(r[s])).sort((a, b) => a - b), 50).toFixed(3);
      out.push(`| **cEDH p50 (n=${cedh.length})** | 80-95 | - | ${STATISTICS.map((s) => med(s as string)).join(' | ')} |`);
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'summary.txt'), `${out.join('\n')}\n`);
  process.stdout.write(`${out.join('\n')}\n`);
}

/**
 * Follow-up (team lead, 2026-09-21). Two splits the cohort CSVs cannot answer
 * on their own:
 *   1. commander linkage restricted to lists whose commander IS typed, plus the
 *      untyped commanders ranked by how many lists they carry — does typing the
 *      top commanders unlock a signal, or is there none to unlock?
 *   2. which gate actually fires on the hard-capped ~30 % of the real strides,
 *      and the unresolved names behind it — is that a parser fix or real data?
 */
function followup(): void {
  const out: string[] = [];
  const byName = cardsByName();

  for (const profile of ['commander', 'brawl'] as const) {
    const file = path.join(OUT_DIR, `stats-${profile}.csv`);
    if (!fs.existsSync(file)) continue;
    const rows = readCsv(file);
    const cohortOf = (c: string) => rows.filter((r) => r.cohort === c);
    const typed = (rs: Record<string, string>[]) => rs.filter((r) => Number(r.cmd_typed) === 1);
    const real = cohortOf('real');
    const c93 = cohortOf('ctrl93');
    const cm = cohortOf('ctrlmatch');
    out.push(`## 1. commander linkage — ${profile}`);
    out.push(`typed-commander lists: real ${typed(real).length}/${real.length}, ctrl93 ${typed(c93).length}/${c93.length}, ctrlmatch ${typed(cm).length}/${cm.length}`);
    out.push('| statistic | cohort pair | AUC, typed commanders only | AUC, zero-filled (all lists) |');
    out.push('|---|---|---:|---:|');
    for (const stat of ['cmd_link', 'cmd_econ', 'cmd_member'] as const) {
      for (const [label, ctrl] of [['vs ctrl93', c93], ['vs ctrlmatch', cm]] as const) {
        const v = (rs: Record<string, string>[]) => rs.map((r) => Number(r[stat])).filter(Number.isFinite).sort((a, b) => a - b);
        out.push(`| ${stat} | ${label} | ${auc(v(typed(real)), v(typed(ctrl as Record<string, string>[]))).toFixed(3)} | ` +
          `${auc(v(real), v(ctrl as Record<string, string>[])).toFixed(3)} |`);
      }
    }

    // Untyped commanders by list count, over the WHOLE sample (not the stride).
    const perCommander = new Map<string, number>();
    for (const deck of readSample(profile)) {
      perCommander.set(deck.commander, (perCommander.get(deck.commander) ?? 0) + 1);
    }
    const untyped: Array<{ name: string; lists: number; state: string }> = [];
    for (const [name, lists] of perCommander) {
      const card = byName.get(name.toLowerCase());
      const facts = card ? catalogFacts(card.name, card.oracle_text) : null;
      // `analyse` calls a commander typed when an entry exists AND its reviewed
      // oracle text still matches the printing, whatever its knowledge level.
      if (facts && facts.textMatches) continue;
      const entry = card ? catalogEntry(card.name) : undefined;
      untyped.push({
        name,
        lists,
        state: !card ? 'card row missing' : !entry ? 'no catalogue entry' : facts ? `${facts.knowledge}, oracle-hash stale` : 'entry, no facts',
      });
    }
    untyped.sort((a, b) => b.lists - a.lists);
    out.push('', `untyped commanders, top 25 of ${untyped.length} (of ${perCommander.size} distinct in the sample):`);
    out.push('| commander | lists | state |', '|---|---:|---|');
    for (const u of untyped.slice(0, 25)) out.push(`| ${u.name} | ${u.lists} | ${u.state} |`);
    out.push('');
  }

  for (const profile of ['commander', 'brawl'] as const) {
    out.push(`## 2. gates on the real ${profile} training stride`);
    const decks = realDecks(profile);
    const gateCount = new Map<string, number>();
    const bindingCount = new Map<string, number>();
    const unresolved = new Map<string, number>();
    const illegal = new Map<string, number>();
    let capped = 0;
    let sizes = 0;
    for (const d of decks) {
      for (const n of d.missingNames) unresolved.set(n, (unresolved.get(n) ?? 0) + 1);
      const payload = scoreDeckSafely({ format: d.shape.format, main: d.shape.main, commander: d.shape.commander });
      if (!payload) continue;
      const size = d.shape.main.reduce((a, e) => a + e.quantity, 0) + d.shape.commander.length;
      if (size !== 100) sizes++;
      // Which CARDS trip the legality gate — re-derived from the legality JSON
      // rather than parsed out of the gate's prose, so it is exact.
      for (const e of [...d.shape.main, ...d.shape.commander.map((c) => ({ card: c, quantity: 1 }))]) {
        let legal = 'legal';
        try { legal = (JSON.parse(e.card.legalities || '{}') as Record<string, string>)[profile] ?? 'missing'; } catch { legal = 'unparseable'; }
        if (legal !== 'legal') illegal.set(`${e.card.name} [${legal}]`, (illegal.get(`${e.card.name} [${legal}]`) ?? 0) + 1);
      }
      const caps = payload.gates.filter((g) => g.kind !== 'quality' && g.cap !== null);
      const binding = caps.length ? Math.min(...caps.map((g) => g.cap as number)) : Infinity;
      if (binding < 25) capped++;
      for (const g of payload.gates) {
        if (g.status === 'pass') continue;
        const key = `${g.key} (${g.kind}/${g.status})`;
        gateCount.set(key, (gateCount.get(key) ?? 0) + 1);
        if (g.cap !== null && g.cap === binding && binding < 25) bindingCount.set(key, (bindingCount.get(key) ?? 0) + 1);
      }
    }
    out.push(`${decks.length} lists; ${capped} (${((100 * capped) / decks.length).toFixed(1)} %) carry a hard cap < 25; ` +
      `${sizes} (${((100 * sizes) / decks.length).toFixed(1)} %) reach the scorer with a card count != 100`);
    out.push('| gate (kind/status) | lists | binding cap |', '|---|---:|---:|');
    for (const [k, v] of [...gateCount.entries()].sort((a, b) => b[1] - a[1])) {
      out.push(`| ${k} | ${v} | ${bindingCount.get(k) ?? 0} |`);
    }
    const topIllegal = [...illegal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    out.push('', `cards not legal in \`${profile}\` at this card-DB snapshot: ${illegal.size} distinct. Top 15 by list count:`);
    out.push('| card [status] | lists |', '|---|---:|');
    for (const [name, n] of topIllegal) out.push(`| ${name} | ${n} |`);
    const top = [...unresolved.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    const totalMissing = [...unresolved.values()].reduce((a, b) => a + b, 0);
    out.push('', `unresolved card names: ${unresolved.size} distinct, ${totalMissing} line occurrences. Top 30:`);
    out.push('| name | lists | shape |', '|---|---:|---|');
    for (const [name, n] of top) {
      const shape = / \/\/ /.test(name) ? 'DFC, full "A // B" form'
        : /^A-/.test(name) ? 'Alchemy A- prefix'
          : /[^\x20-\x7E]/.test(name) ? 'non-ASCII (diacritic / typographic punctuation)'
            : /\(|\)/.test(name) ? 'set/collector suffix'
              : byName.has(name.toLowerCase().split(' // ')[0]) ? 'front face resolves — full-name lookup only'
                : 'plain ASCII, no row in `cards`';
      out.push(`| ${name} | ${n} | ${shape} |`);
    }
    out.push('');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'followup.txt'), `${out.join('\n')}\n`);
  process.stdout.write(`${out.join('\n')}\n`);
}

function main(): void {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? 'summary';
  const arg = (flag: string, fallback: string): string => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  if (cmd === 'cohorts') {
    cohorts(arg('--profile', 'commander') as SampleProfile, Number(arg('--n', '1000')));
  } else if (cmd === 'followup') {
    followup();
  } else if (cmd === 'fixtures') {
    fixtureRows();
  } else if (cmd === 'anchors') {
    // `q_typed`-family candidates, evaluated offline against the 16 bands.
    const floor = Number(arg('--b', '0.80'));
    const sat = Number(arg('--sat', '0.95'));
    const which = arg('--stat', 'q_typed') as keyof StatRow;
    // `--identity` feeds the statistic through unchanged; with `--stat s_live`
    // that must reproduce the live totals exactly, which is the check that this
    // offline recomputation of base / quality cap / hard caps is faithful.
    const identity = argv.includes('--identity');
    const rows = anchorsUnder((r) => {
      const x = Number(r[which]);
      if (identity) return x;
      return 100 * Math.max(0, Math.min(1, (x - floor) / (sat - floor))) * r.R;
    });
    process.stdout.write(`candidate ${String(which)}${identity ? ' (identity)' : `, b=${floor}, sat=${sat}`}\n${rows.join('\n')}\n`);
  } else {
    summary();
  }
}

main();
