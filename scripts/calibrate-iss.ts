/**
 * ISS / curve-score calibration — Round 1a (docs/SYNERGY_ENGINE_DESIGN.md §6).
 *
 * For each of the 9 roster commanders, computes deckISS + curveScore for
 * three cohorts:
 *   (a) human   — top ~10 most-liked decks from our own catalogue API
 *   (b) builder — our current harness build (decks/test-builds/results.json)
 *   (c) random  — a random-99 baseline (seeded PRNG, legal in-color nonlands)
 *
 * Reports per-commander + overall distributions, and re-scores every deck
 * already gathered under 2-3 candidate ISS constant sets (no re-fetching —
 * tagging is separated from scoring specifically so this is cheap).
 *
 * PURE OBSERVATION — writes a report, does not touch selection, does not
 * gate the harness. Network calls are the public catalogue API only
 * (no key required); everything else reads the local card DB.
 *
 * Usage: npx tsx scripts/calibrate-iss.ts [--out <file>]
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { analyzeCommander } from '../src/lib/commander-synergy';
import { computeSynergyGraph, type CardLike, type IssConstants } from '../src/lib/synergy-graph';
import { computeCurveScore } from '../src/lib/curve-score';
import type { Archetype } from '../src/lib/deck-templates';

const CATALOG_BASE = 'http://187.77.110.100/cf-api/deck-catalog';
const OUT_DIR = path.join(process.cwd(), 'decks', 'test-builds');
const RESULTS_FILE = path.join(OUT_DIR, 'results.json');
const HUMAN_DECKS_PER_COMMANDER = 10;
const RANDOM_NONLAND_TARGET = 61; // matches the roster's actual 99 - 38 lands
const FETCH_TIMEOUT_MS = 15_000;

// Same 9-commander roster as scripts/test-deck-builds.ts SCENARIOS.
const ROSTER: Array<{ slug: string; commander: string }> = [
  { slug: 'vivi-ornitier', commander: 'Vivi Ornitier' },
  { slug: 'ramos-dragon-engine', commander: 'Ramos, Dragon Engine' },
  { slug: 'magus-lucea-kane', commander: 'Magus Lucea Kane' },
  { slug: 'thrasios-tymna', commander: 'Thrasios, Triton Hero' },
  { slug: 'mono-w-heliod', commander: 'Heliod, Sun-Crowned' },
  { slug: 'mono-u-orvar', commander: 'Orvar, the All-Form' },
  { slug: 'mono-b-sheoldred', commander: 'Sheoldred, the Apocalypse' },
  { slug: 'mono-r-krenko', commander: 'Krenko, Mob Boss' },
  { slug: 'mono-g-ghalta', commander: 'Ghalta, Primal Hunger' },
];

// Candidate ISS constant sets — current v1 default plus two alternatives
// justified in the report.
const CONSTANT_SETS: Record<string, IssConstants> = {
  'current (B10/L2/C30)': { base: 10, lambda: 2, ceiling: 30 },
  'lower-base (B6/L2/C24)': { base: 6, lambda: 2, ceiling: 24 },
  'higher-lambda (B8/L3/C36)': { base: 8, lambda: 3, ceiling: 36 },
};

interface DbCardRow {
  name: string;
  oracle_text: string | null;
  type_line: string;
  cmc: number;
  color_identity: string | null;
  legalities: string | null;
}

interface ResolvedCard {
  name: string;
  oracleText: string | null;
  typeLine: string;
  cmc: number;
}

function legalIn(legalities: string | null, key: string): boolean {
  if (!legalities) return false;
  try {
    const leg = JSON.parse(legalities);
    return leg[key] === 'legal' || leg[key] === 'restricted';
  } catch {
    return false;
  }
}

function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function shuffleSeeded<T>(arr: T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface CatalogDeckSummary {
  id: number;
  deck_name: string;
  likes: number;
  card_count: number;
}
interface CatalogDeckDetail {
  id: number;
  cards: Array<{ card_name: string; board: string; quantity: number }>;
}

async function fetchTopLikedDecks(commanderName: string, limit: number): Promise<CatalogDeckSummary[]> {
  const url = `${CATALOG_BASE}?commander=${encodeURIComponent(commanderName)}&limit=${limit}`;
  const data = await fetchJson<{ decks: CatalogDeckSummary[] }>(url);
  if (!data?.decks) return [];
  // Defensive sort — don't assume the API's ordering.
  return [...data.decks].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, limit);
}

async function fetchDeckCards(deckId: number): Promise<string[]> {
  const data = await fetchJson<CatalogDeckDetail>(`${CATALOG_BASE}/${deckId}`);
  if (!data?.cards) return [];
  return data.cards.filter((c) => c.board === 'main').map((c) => c.card_name);
}

/** Resolve a list of card names against the local DB. Skips unresolvable
 * names and lands. Reports the raw match rate (resolved / requested) so
 * catalogue-vs-local-DB drift is visible, not silently absorbed. */
function resolveCardNames(names: string[]): { cards: ResolvedCard[]; matchRate: number } {
  const db = getDb();
  const stmt = db.prepare('SELECT name, oracle_text, type_line, cmc FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1');
  const cards: ResolvedCard[] = [];
  let matched = 0;
  for (const name of names) {
    const row = stmt.get(name) as { name: string; oracle_text: string | null; type_line: string; cmc: number } | undefined;
    if (!row) continue;
    matched++;
    if ((row.type_line || '').includes('Land')) continue;
    cards.push({ name: row.name, oracleText: row.oracle_text, typeLine: row.type_line, cmc: row.cmc ?? 0 });
  }
  return { cards, matchRate: names.length > 0 ? matched / names.length : 0 };
}

/** Random-99 baseline: legal-in-commander nonland cards matching the
 * commander's color identity, seeded so re-runs are reproducible. */
function buildRandomBaseline(commanderName: string, colorIdentity: string[], seed: number): ResolvedCard[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT name, oracle_text, type_line, cmc, color_identity, legalities FROM cards
     WHERE type_line NOT LIKE '%Land%' AND name != ? COLLATE NOCASE`
  ).all(commanderName) as DbCardRow[];

  const idSet = new Set(colorIdentity);
  const pool = rows.filter((r) => {
    if (!legalIn(r.legalities, 'commander')) return false;
    let cardColors: string[] = [];
    try {
      cardColors = r.color_identity ? JSON.parse(r.color_identity) : [];
    } catch {
      return false;
    }
    return cardColors.every((c) => idSet.has(c));
  });

  const rand = seededRandom(seed);
  const sample = shuffleSeeded(pool, rand).slice(0, RANDOM_NONLAND_TARGET);
  return sample.map((r) => ({ name: r.name, oracleText: r.oracle_text, typeLine: r.type_line, cmc: r.cmc ?? 0 }));
}

interface DeckMetrics {
  deckISS: number;
  curveScore: number;
  cardCount: number;
}

function scoreDeck(
  cards: ResolvedCard[],
  commanderCtx: { name: string; oracleText: string | null; typeLine: string; synergyProfile: ReturnType<typeof analyzeCommander>; tribalType: string | null },
  archetype: Archetype,
  commanderCmc: number,
  constants?: IssConstants,
): DeckMetrics {
  const cardLikes: CardLike[] = cards.map((c) => ({ name: c.name, oracleText: c.oracleText, typeLine: c.typeLine }));
  const graph = computeSynergyGraph(cardLikes, { ...commanderCtx, directNeeds: null }, constants);
  const curve = computeCurveScore(archetype, commanderCmc, cards.map((c) => ({ cmc: c.cmc })));
  return { deckISS: graph.deckISS, curveScore: curve.score, cardCount: cards.length };
}

function stats(values: number[]): { mean: number; median: number; min: number; max: number; n: number } {
  if (values.length === 0) return { mean: 0, median: 0, min: 0, max: 0, n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { mean: Math.round(mean * 10) / 10, median: Math.round(median * 10) / 10, min: sorted[0], max: sorted[sorted.length - 1], n: values.length };
}

async function main(): Promise<void> {
  const db = getDb();
  const results: Record<string, unknown> = {};
  const overallByCohort: Record<string, number[]> = { human: [], builder: [], random: [] };
  const overallCurveByCohort: Record<string, number[]> = { human: [], builder: [], random: [] };
  const constantSetTotals: Record<string, { human: number[]; builder: number[]; random: number[] }> = {};
  for (const key of Object.keys(CONSTANT_SETS)) constantSetTotals[key] = { human: [], builder: [], random: [] };

  let harnessResults: Array<Record<string, unknown>> = [];
  if (fs.existsSync(RESULTS_FILE)) {
    harnessResults = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } else {
    console.warn(`WARNING: ${RESULTS_FILE} not found — cohort (b) "builder" will be empty. Run scripts/test-deck-builds.ts first.`);
  }

  for (const [idx, entry] of ROSTER.entries()) {
    process.stdout.write(`[${idx + 1}/${ROSTER.length}] ${entry.commander} ... `);
    const cmdRow = db.prepare(
      'SELECT name, oracle_text, type_line, cmc, mana_cost, color_identity FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1'
    ).get(entry.commander) as { name: string; oracle_text: string | null; type_line: string; cmc: number; mana_cost: string | null; color_identity: string | null } | undefined;
    if (!cmdRow) {
      console.log('SKIP (commander not found in local DB)');
      continue;
    }
    let colorIdentity: string[] = [];
    try { colorIdentity = cmdRow.color_identity ? JSON.parse(cmdRow.color_identity) : []; } catch { /* empty */ }
    const synergyProfile = analyzeCommander(cmdRow.oracle_text || '', cmdRow.type_line || '', colorIdentity, cmdRow.mana_cost || undefined);

    // tribalType and archetype: reuse the harness's own detection for this
    // commander so all three cohorts are scored against the SAME target
    // (same tribe context, same archetype curve) rather than each cohort
    // re-deriving it independently.
    const harnessBuild = harnessResults.find((r) => r.scenario === entry.slug && r.format === 'commander');
    const tribalType = (harnessBuild?.tribalType as string | null | undefined) ?? null;
    const archetype = ((harnessBuild?.strategy as Archetype | undefined) ?? synergyProfile?.detectedArchetype ?? 'midrange') as Archetype;

    const commanderCtx = { name: cmdRow.name, oracleText: cmdRow.oracle_text, typeLine: cmdRow.type_line, synergyProfile, tribalType };

    // ── Cohort (a): human top-liked decks ──────────────────────────────
    const humanDecks = await fetchTopLikedDecks(entry.commander, HUMAN_DECKS_PER_COMMANDER);
    const humanMetrics: DeckMetrics[] = [];
    let humanMatchRateSum = 0;
    let humanMatchRateCount = 0;
    for (const d of humanDecks) {
      const names = await fetchDeckCards(d.id);
      if (names.length === 0) continue;
      const { cards, matchRate } = resolveCardNames(names);
      humanMatchRateSum += matchRate;
      humanMatchRateCount++;
      if (cards.length < 10) continue; // too few resolved cards to score meaningfully
      humanMetrics.push(scoreDeck(cards, commanderCtx, archetype, cmdRow.cmc ?? 0));
      for (const [key, constants] of Object.entries(CONSTANT_SETS)) {
        constantSetTotals[key].human.push(scoreDeck(cards, commanderCtx, archetype, cmdRow.cmc ?? 0, constants).deckISS);
      }
    }

    // ── Cohort (b): our harness build ──────────────────────────────────
    const builderMetrics: DeckMetrics[] = [];
    if (harnessBuild?.ok) {
      const buildCards = (harnessBuild.cards as Array<{ name: string; board: string; type_line: string }> | undefined)?.filter(
        (c) => c.board === 'main' && !c.type_line.includes('Land')
      ) ?? [];
      const { cards } = resolveCardNames(buildCards.map((c) => c.name));
      if (cards.length > 0) {
        builderMetrics.push(scoreDeck(cards, commanderCtx, archetype, cmdRow.cmc ?? 0));
        for (const [key, constants] of Object.entries(CONSTANT_SETS)) {
          constantSetTotals[key].builder.push(scoreDeck(cards, commanderCtx, archetype, cmdRow.cmc ?? 0, constants).deckISS);
        }
      }
    }

    // ── Cohort (c): random-99 baseline (3 seeded samples for spread) ───
    const randomMetrics: DeckMetrics[] = [];
    for (let seed = 1; seed <= 3; seed++) {
      const randomCards = buildRandomBaseline(cmdRow.name, colorIdentity, seed * 7919 + idx);
      if (randomCards.length === 0) continue;
      randomMetrics.push(scoreDeck(randomCards, commanderCtx, archetype, cmdRow.cmc ?? 0));
      for (const [key, constants] of Object.entries(CONSTANT_SETS)) {
        constantSetTotals[key].random.push(scoreDeck(randomCards, commanderCtx, archetype, cmdRow.cmc ?? 0, constants).deckISS);
      }
    }

    const humanISS = humanMetrics.map((m) => m.deckISS);
    const builderISS = builderMetrics.map((m) => m.deckISS);
    const randomISS = randomMetrics.map((m) => m.deckISS);
    overallByCohort.human.push(...humanISS);
    overallByCohort.builder.push(...builderISS);
    overallByCohort.random.push(...randomISS);
    overallCurveByCohort.human.push(...humanMetrics.map((m) => m.curveScore));
    overallCurveByCohort.builder.push(...builderMetrics.map((m) => m.curveScore));
    overallCurveByCohort.random.push(...randomMetrics.map((m) => m.curveScore));

    results[entry.slug] = {
      commander: entry.commander,
      archetype,
      tribalType,
      humanDeckCount: humanMetrics.length,
      humanCatalogMatchRate: humanMatchRateCount > 0 ? Math.round((humanMatchRateSum / humanMatchRateCount) * 1000) / 1000 : null,
      iss: { human: stats(humanISS), builder: stats(builderISS), random: stats(randomISS) },
      curveScore: {
        human: stats(humanMetrics.map((m) => m.curveScore)),
        builder: stats(builderMetrics.map((m) => m.curveScore)),
        random: stats(randomMetrics.map((m) => m.curveScore)),
      },
    };
    console.log(`human n=${humanMetrics.length} ISS[${stats(humanISS).median}] | builder ISS[${stats(builderISS).median}] | random ISS[${stats(randomISS).median}]`);
  }

  const overall = {
    iss: {
      human: stats(overallByCohort.human),
      builder: stats(overallByCohort.builder),
      random: stats(overallByCohort.random),
    },
    curveScore: {
      human: stats(overallCurveByCohort.human),
      builder: stats(overallCurveByCohort.builder),
      random: stats(overallCurveByCohort.random),
    },
    constantSets: Object.fromEntries(
      Object.entries(constantSetTotals).map(([key, cohorts]) => [
        key,
        {
          human: stats(cohorts.human),
          builder: stats(cohorts.builder),
          random: stats(cohorts.random),
          // separation = median(human) - median(random): how cleanly this
          // constant set pulls a synergistic human deck away from a random
          // pile. Higher is better (more signal, same 0-100 scale).
          humanVsRandomSeparation: stats(cohorts.human).median - stats(cohorts.random).median,
        },
      ])
    ),
  };

  const outArgIdx = process.argv.indexOf('--out');
  const outFile = outArgIdx > -1 ? process.argv[outArgIdx + 1] : path.join(OUT_DIR, 'iss-calibration.json');
  fs.writeFileSync(outFile, JSON.stringify({ perCommander: results, overall }, null, 2));

  console.log('\n=== OVERALL (median ISS) ===');
  console.log(`human:   ${overall.iss.human.median} (n=${overall.iss.human.n})`);
  console.log(`builder: ${overall.iss.builder.median} (n=${overall.iss.builder.n})`);
  console.log(`random:  ${overall.iss.random.median} (n=${overall.iss.random.n})`);
  console.log('\n=== CONSTANT SET COMPARISON (human-vs-random median separation) ===');
  for (const [key, data] of Object.entries(overall.constantSets)) {
    console.log(`${key}: separation=${data.humanVsRandomSeparation} (human ${data.human.median}, builder ${data.builder.median}, random ${data.random.median})`);
  }
  console.log(`\nWrote ${outFile}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('CALIBRATION FAILED:', err);
  process.exit(1);
});
