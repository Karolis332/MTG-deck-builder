/**
 * Deck quality benchmark — compares each harness build in
 * decks/test-builds/results.json against best-regarded published lists
 * (decks/test-builds/refs/<slug>/<set>.json, produced by fetch-benchmark-refs.ts)
 * on card overlap, composition (ramp/draw/removal/etc counts + curve), and
 * WotC Commander Bracket.
 *
 * No results data exists for casual (non-tournament) Commander, so casual-
 * bracket builds are scored against the best-regarded public lists we can
 * fetch (Moxfield top-liked, EDHREC average, etc) instead of win-rate data.
 *
 * Usage: npx tsx scripts/deck-benchmark.ts [--only <slug>] [--date YYYY-MM-DD]
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { classifyBracket, type BracketCard, type BracketResult } from '../src/lib/bracket';
import {
  compositionOf,
  compareToSet,
  qualityIndex,
  compositionDistanceOf,
  nonlandNames,
  COUNT_METRICS,
  type CompositionWithNames,
  type CardLite,
} from '../src/lib/benchmark-metrics';

const ROOT = path.join(process.cwd(), 'decks', 'test-builds');
const RESULTS_PATH = path.join(ROOT, 'results.json');
const REFS_DIR = path.join(ROOT, 'refs');
const OUT_JSON = path.join(ROOT, 'benchmark.json');

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const onlySlug = onlyIdx >= 0 ? args[onlyIdx + 1] : undefined;
const dateIdx = args.indexOf('--date');
const dateArg = dateIdx >= 0 ? args[dateIdx + 1] : new Date().toISOString().slice(0, 10);
const OUT_MD = path.join(process.cwd(), 'docs', `DECK_BENCHMARK_${dateArg}.md`);

interface RefDeck {
  id: string;
  source: string;
  url?: string;
  likes?: number;
  views?: number;
  wins?: number;
  losses?: number;
  placement?: number;
  event?: string;
  cards: string[];
  /** name -> quantity, when the fetcher captured it. Falls back to 1-per-name if absent. */
  counts?: Record<string, number>;
}
interface RefFile {
  set: string;
  commander: string;
  partner?: string;
  fetchedAt: string;
  decks: RefDeck[];
}

interface BuildCard {
  name: string;
  quantity: number;
  board: string;
  type_line?: string;
  cmc?: number;
}
interface Build {
  scenario: string;
  commander: string;
  partner?: string;
  format: string;
  ok: boolean;
  targetBracket?: number;
  bracket?: BracketResult;
  landCount?: number;
  cards: BuildCard[];
}

// ── Card metadata lookup (batched, NOCASE) ─────────────────────────────────

interface CardRow {
  name: string;
  oracle_text: string | null;
  type_line: string | null;
  cmc: number | null;
  game_changer: number | null;
}

function lookupCards(names: string[]): { found: Map<string, CardRow>; missing: string[] } {
  const db = getDb();
  const found = new Map<string, CardRow>();
  const uniq = [...new Set(names.map((n) => n.toLowerCase()))];
  const CHUNK = 500;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const chunk = uniq.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT name, oracle_text, type_line, cmc, game_changer FROM cards WHERE name COLLATE NOCASE IN (${placeholders})`
      )
      .all(...chunk) as CardRow[];
    for (const r of rows) found.set(r.name.toLowerCase(), r);
  }
  const missing = uniq.filter((n) => !found.has(n));
  return { found, missing };
}

function toCardLite(name: string, row: CardRow | undefined): CardLite {
  if (!row) return { name };
  return { name, oracle_text: row.oracle_text, type_line: row.type_line, cmc: row.cmc };
}

function toBracketCard(name: string, row: CardRow | undefined): BracketCard {
  if (!row) return { name };
  return { name, oracle_text: row.oracle_text, type_line: row.type_line, cmc: row.cmc, game_changer: row.game_changer };
}

function compositionWithNames(cards: CardLite[], commanderOracle?: string): CompositionWithNames {
  return { ...compositionOf(cards, commanderOracle), names: nonlandNames(cards) };
}

// ── Load results + refs ─────────────────────────────────────────────────

function loadResults(): Build[] {
  if (!fs.existsSync(RESULTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8')) as Build[];
}

/**
 * Loads ref files for a slug, format-aware: `<set>--brawl.json` is preferred
 * for brawl builds when it exists. If a brawl variant is missing, falls back
 * to the commander-format file for that set and flags formatMismatch so
 * callers can annotate/exclude it rather than silently mixing formats.
 */
function loadRefFiles(slug: string, format: string): { file: RefFile; formatMismatch: boolean }[] {
  const dir = path.join(REFS_DIR, slug);
  if (!fs.existsSync(dir)) return [];
  const readJson = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as RefFile;

  const groups = new Map<string, { commander?: string; brawl?: string }>();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const isBrawl = f.endsWith('--brawl.json');
    const base = isBrawl ? f.slice(0, -'--brawl.json'.length) : f.slice(0, -'.json'.length);
    const g = groups.get(base) ?? {};
    if (isBrawl) g.brawl = f;
    else g.commander = f;
    groups.set(base, g);
  }

  const out: { file: RefFile; formatMismatch: boolean }[] = [];
  for (const g of groups.values()) {
    if (format === 'brawl') {
      if (g.brawl) out.push({ file: readJson(g.brawl), formatMismatch: false });
      else if (g.commander) out.push({ file: readJson(g.commander), formatMismatch: true });
    } else if (g.commander) {
      out.push({ file: readJson(g.commander), formatMismatch: false });
    }
  }
  return out;
}

function round(n: number): number {
  return Math.round(n);
}
function fmtDelta(n: number): string {
  return n >= 0 ? `+${round(n)}` : `${round(n)}`;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const allResults = loadResults();
  const results = allResults.filter((b) => b.ok && (!onlySlug || b.scenario === onlySlug));
  if (!results.length) {
    console.log('No ok builds found in results.json (or --only matched nothing). Nothing to do.');
    return;
  }

  const allMissing = new Set<string>();
  const benchmarkOut: Record<string, unknown>[] = [];
  const staplesTally = new Map<string, Set<string>>(); // staple name -> fixture keys that missed it

  for (const build of results) {
    const fixtureKey = `${build.scenario}/${build.format}`;
    const buildNames = build.cards.filter((c) => c.board === 'main').map((c) => c.name);
    const { found: buildFound, missing: buildMissing } = lookupCards(buildNames);
    for (const m of buildMissing) allMissing.add(m);
    if (buildMissing.length) {
      console.log(`[${fixtureKey}] build: ${buildMissing.length} unknown name(s): ${buildMissing.slice(0, 5).join(', ')}`);
    }

    // Expand by quantity — a stacked "27x Mountain" row is one array entry
    // with quantity 27; composition counts (lands, ramp, etc) must count each
    // physical copy, not each entry, or basics collapse to 1.
    const buildCardsLite: CardLite[] = build.cards
      .filter((c) => c.board === 'main')
      .flatMap((c) => {
        const lite = toCardLite(c.name, buildFound.get(c.name.toLowerCase()));
        return Array(Math.max(1, c.quantity)).fill(lite);
      });
    const buildComp = compositionWithNames(buildCardsLite);
    if (build.landCount !== undefined && buildComp.lands !== build.landCount) {
      console.log(
        `[${fixtureKey}] land count mismatch: computed ${buildComp.lands}, results.json landCount ${build.landCount} — using computed (quantity-expanded) value`
      );
    }

    const targetBracket = build.targetBracket ?? 3;
    const refFiles = loadRefFiles(build.scenario, build.format);

    const sets: Record<string, unknown> = {};

    for (const { file: refFile, formatMismatch } of refFiles) {
      const allRefDecks: { comp: CompositionWithNames; bracket: number }[] = [];
      const setMissing = new Set<string>();
      const quantitiesAvailable = refFile.decks.length > 0 && refFile.decks.every((d) => !!d.counts);
      for (const deck of refFile.decks) {
        const { found, missing } = lookupCards(deck.cards);
        for (const m of missing) { allMissing.add(m); setMissing.add(m); }
        // Same reasoning as the build side: composition counts (esp. lands)
        // need real per-name quantities, not just presence, or basics collapse to 1.
        const cardsLite: CardLite[] = deck.cards.flatMap((n) => {
          const lite = toCardLite(n, found.get(n.toLowerCase()));
          const qty = deck.counts?.[n] ?? 1;
          return Array(Math.max(1, qty)).fill(lite);
        });
        const bracketCards: BracketCard[] = deck.cards.map((n) => toBracketCard(n, found.get(n.toLowerCase())));
        const bracketResult = classifyBracket(bracketCards, {
          commanderNames: [refFile.commander, refFile.partner].filter(Boolean) as string[],
        });
        allRefDecks.push({ comp: compositionWithNames(cardsLite), bracket: bracketResult.bracket });
      }

      if (setMissing.size) {
        console.log(
          `[${fixtureKey}] ${refFile.set}: ${setMissing.size} unknown name(s): ${[...setMissing].slice(0, 5).join(', ')}`
        );
      }
      if (!quantitiesAvailable && refFile.decks.length) {
        console.log(`[${fixtureKey}] ${refFile.set}: no per-card counts in refs — land/count metrics fall back to quantity 1 per name`);
      }

      let matched = allRefDecks.filter((d) => d.bracket === targetBracket);
      let bracketFilterApplied = true;
      if (matched.length < 5) {
        matched = allRefDecks;
        bracketFilterApplied = false;
      }

      const refsPerBracket: Record<number, number> = {};
      for (const d of allRefDecks) refsPerBracket[d.bracket] = (refsPerBracket[d.bracket] || 0) + 1;

      if (!matched.length) {
        sets[refFile.set] = { refCount: 0, bracketFilterApplied: false, quantitiesAvailable, formatMismatch, refsPerBracket, note: 'no reference decks available' };
        continue;
      }

      const refComps = matched.map((d) => d.comp);
      const cmp = compareToSet(buildComp, refComps);
      const compositionDistance = compositionDistanceOf(cmp.deltas);
      const bracketMatch = (build.bracket?.bracket ?? null) === targetBracket;
      const quality = qualityIndex({ overlapMeanPct: cmp.overlapMeanPct, compositionDistance, bracketMatch });

      sets[refFile.set] = {
        refCount: matched.length,
        bracketFilterApplied,
        quantitiesAvailable,
        formatMismatch,
        refsPerBracket,
        overlapMeanPct: round(cmp.overlapMeanPct),
        overlapBestPct: round(cmp.overlapBestPct),
        compositionDistance: Math.round(compositionDistance * 100) / 100,
        curveL1: round(cmp.curveL1),
        qualityIndex: round(quality),
        bracketMatch,
        deltas: cmp.deltas,
        staplesMissing: cmp.staplesMissing.slice(0, 10),
        oddCards: cmp.oddCards,
      };

      // A formatMismatch set is commander refs standing in for a missing
      // brawl set — don't let its "staples" pollute the cross-fixture tally.
      if (!formatMismatch) {
        for (const s of cmp.staplesMissing.slice(0, 10)) {
          if (!staplesTally.has(s.name)) staplesTally.set(s.name, new Set());
          staplesTally.get(s.name)!.add(fixtureKey);
        }
      }
    }

    benchmarkOut.push({
      scenario: build.scenario,
      format: build.format,
      commander: build.commander,
      targetBracket,
      bracket: build.bracket,
      sets,
    });
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(benchmarkOut, null, 2));

  const md = renderMarkdown(benchmarkOut, staplesTally, allMissing);
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_MD, md);

  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  if (allMissing.size) {
    console.log(`${allMissing.size} card name(s) not found in local DB (treated as unknown):`);
    console.log([...allMissing].slice(0, 20).join(', ') + (allMissing.size > 20 ? ', ...' : ''));
  }
}

function renderMarkdown(
  benchmarkOut: Record<string, unknown>[],
  staplesTally: Map<string, Set<string>>,
  missing: Set<string>
): string {
  const lines: string[] = [];
  lines.push(`# Deck Benchmark — ${dateArg}`);
  lines.push('');
  lines.push(
    'Each "set" below is a fetched batch of best-regarded published decklists for that commander ' +
      '(Moxfield top-liked, EDHREC average, tournament results where they exist, etc — see ' +
      'decks/test-builds/refs/<slug>/<set>.json for provenance per deck). No results/win-rate data ' +
      'exists for casual (non-tournament) Commander, so casual-bracket build quality is measured ' +
      'against these best-regarded lists rather than win rates. Reference decks are filtered to the ' +
      "build's targetBracket when at least 5 match; otherwise all fetched refs for that commander are " +
      'used and bracketFilterApplied is false. qualityIndex (0-100) = 50% card overlap with the ' +
      'reference set + 30% composition-count similarity (ramp/draw/removal/etc) + 20% bracket match. ' +
      `${missing.size} reference card name(s) were not found in the local card DB (mostly recent-set ` +
      'crossover/token cards — the local card data is stale) and were treated as unknown rather than ' +
      'crashing the run; see the appendix. Brawl builds compare against `<set>--brawl.json` refs when ' +
      'available; where no brawl-specific set exists, the commander-format set is used as a fallback ' +
      '(marked "(commander refs)" in the table, formatMismatch: true in benchmark.json) and excluded ' +
      'from the most-missed-staples tally below.'
  );
  lines.push('');

  lines.push('## Portfolio');
  lines.push('');
  lines.push('| Scenario | Format | Bracket (build/target) | Set | Quality | Overlap (mean) | Staples missing |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const b of benchmarkOut) {
    const bracketBuild = (b.bracket as BracketResult | undefined)?.bracket ?? '-';
    const sets = b.sets as Record<string, any>;
    const setNames = Object.keys(sets);
    if (!setNames.length) {
      lines.push(`| ${b.scenario} | ${b.format} | ${bracketBuild}/${b.targetBracket} | - | - | - | - |`);
      continue;
    }
    for (const setName of setNames) {
      const s = sets[setName];
      if (!s.refCount) {
        lines.push(`| ${b.scenario} | ${b.format} | ${bracketBuild}/${b.targetBracket} | ${setName} | - | - | (no refs) |`);
        continue;
      }
      const quality = s.formatMismatch ? `${s.qualityIndex} (commander refs)` : String(s.qualityIndex);
      lines.push(
        `| ${b.scenario} | ${b.format} | ${bracketBuild}/${b.targetBracket} | ${setName} | ${quality} | ${s.overlapMeanPct}% | ${s.staplesMissing.length} |`
      );
    }
  }
  lines.push('');

  for (const b of benchmarkOut) {
    const sets = b.sets as Record<string, any>;
    const setNames = Object.keys(sets).filter((n) => sets[n].refCount);
    if (!setNames.length) continue;
    lines.push(`## ${b.scenario} / ${b.format}`);
    lines.push('');
    for (const setName of setNames) {
      const s = sets[setName];
      lines.push(`### vs ${setName} (${s.refCount} refs, bracketFilterApplied: ${s.bracketFilterApplied})`);
      lines.push('');
      if (!s.quantitiesAvailable) {
        lines.push(
          `_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._`
        );
        lines.push('');
      }
      lines.push('| Metric | Build | Ref median | Delta |');
      lines.push('|---|---|---|---|');
      for (const key of [...COUNT_METRICS, 'avgCmcNonLand']) {
        const d = s.deltas[key];
        lines.push(`| ${key} | ${round(d.build)} | ${round(d.refMedian)} | ${fmtDelta(d.delta)} |`);
      }
      lines.push('');
      if (s.staplesMissing.length) {
        lines.push('**Top staples missing:**');
        for (const stp of s.staplesMissing.slice(0, 10)) {
          lines.push(`- ${stp.name} (in ${Math.round(stp.freq * 100)}% of refs)`);
        }
        lines.push('');
      }
    }
  }

  const tally = [...staplesTally.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 15);
  if (tally.length) {
    lines.push('## Most-missed staples across fixtures');
    lines.push('');
    lines.push('| Card | Fixtures missing it |');
    lines.push('|---|---|');
    for (const [name, fixtures] of tally) {
      lines.push(`| ${name} | ${fixtures.size} |`);
    }
    lines.push('');
  }

  if (missing.size) {
    lines.push('## Appendix: reference card names not found in local DB');
    lines.push('');
    lines.push(`${missing.size} name(s), stale local card data (mostly 2026-set crossover/token cards):`);
    lines.push('');
    for (const name of [...missing].sort()) lines.push(`- ${name}`);
    lines.push('');
  }

  return lines.join('\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
