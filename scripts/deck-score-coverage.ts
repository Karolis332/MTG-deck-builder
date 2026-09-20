/**
 * Deck Score v1.2 — typed-effect catalogue coverage. docs/DECK_SCORE_SPEC.md §8
 * "Minimum typed-effect catalogue": the minimum is coverage-defined, not
 * "303 flags" — cover >80% of nonland copies in EACH legal cEDH and
 * tournament-Standard reference list, and 100% of every selected closing
 * recipe's critical mechanics.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-coverage.ts [--queue N]
 *
 * Writes `verify-2026-09-19/deck-score/coverage.md`: copy-weighted typed
 * coverage per reference list split by provenance, the stale-hash report, and
 * the uncovered cards in descending copy-weighted frequency. That ranked list
 * IS the work queue — entries are added in descending uncovered copy mass
 * until the >80% condition holds. `--queue N` prints the next N uncovered
 * cards with their live oracle text, ready to hand to a curator.
 *
 * Coverage here is TYPED coverage (`CardFeature.covered`): a `known`
 * catalogue entry whose reviewed oracle text still hashes to the printing
 * being scored. It is deliberately NOT derived from `s < 1` (§8).
 */
import fs from 'fs';
import path from 'path';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import { CATALOG_SIZE, CATALOG_VERSION, catalogEntries, catalogEntry, entryHash, isGenerated, oracleHash } from '../src/lib/deck-score-catalog';
import type { DeckScoreInput } from '../src/lib/deck-score';
import type { DbCard } from '../src/lib/types';
import type { CatalogEntry } from '../src/lib/deck-score-catalog/schema';
// The loader deliberately ships only `known` entries; the partial shard is
// tooling-only, and it is what tells `partial` apart from `unknown` here.
import PARTIAL_JSON from '../src/lib/deck-score-catalog/entries/generated-partial.json';
import { OUT_DIR, loadDataset } from './deck-score-fixtures';

const PARTIAL = new Map<string, CatalogEntry>(
  (PARTIAL_JSON as unknown as CatalogEntry[]).map((e) => [e.canonicalName.toLowerCase(), e]),
);

const OUT_FILE = path.join(OUT_DIR, 'coverage.md');
const STANDARD_COHORT_CAP = 200;

type Bucket = 'generated' | 'curated' | 'partial' | 'unknown' | 'trivial';

interface Coverage {
  copies: number;
  covered: number;
  share: number;
  buckets: Record<Bucket, number>;
}

const uncovered = new Map<string, { copies: number; lists: number; type: string; card: DbCard }>();
/** Entries whose reviewed text no longer hashes to any live printing seen. */
const stale = new Map<string, { live: string; reviewed: string }>();

/** Which provenance bucket a nonland copy falls in. §8 reporting split. */
function bucketOf(card: DbCard, covered: boolean): Bucket {
  const entry = catalogEntry(card.name);
  if (!entry) {
    if (PARTIAL.has(card.name.toLowerCase())) return 'partial';
    return covered ? 'trivial' : 'unknown';
  }
  const liveHash = oracleHash(card.oracle_text);
  if (liveHash !== entryHash(entry)) {
    stale.set(entry.canonicalName, { live: liveHash, reviewed: entryHash(entry) });
    return 'unknown';
  }
  if (entry.knowledge !== 'known') return 'partial';
  return isGenerated(entry) ? 'generated' : 'curated';
}

function emptyBuckets(): Record<Bucket, number> {
  return { generated: 0, curated: 0, partial: 0, unknown: 0, trivial: 0 };
}

function coverageOf(input: DeckScoreInput, track: boolean): Coverage {
  let copies = 0;
  let covered = 0;
  const buckets = emptyBuckets();
  const seen = new Set<string>();
  for (const entry of input.main) {
    const feature = deriveCardFeature(entry.card);
    if (feature.isLand) continue;
    copies += entry.quantity;
    buckets[bucketOf(entry.card, feature.covered)] += entry.quantity;
    if (feature.covered) {
      covered += entry.quantity;
      continue;
    }
    if (!track) continue;
    const row = uncovered.get(entry.card.name)
      ?? { copies: 0, lists: 0, type: entry.card.type_line || '', card: entry.card };
    row.copies += entry.quantity;
    if (!seen.has(entry.card.name)) {
      row.lists += 1;
      seen.add(entry.card.name);
    }
    uncovered.set(entry.card.name, row);
  }
  return { copies, covered, share: copies > 0 ? covered / copies : 1, buckets };
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '-';
}

function summarise(label: string, covs: Coverage[]): string {
  if (covs.length === 0) return `| ${label} | 0 | - | - | - | - | - | - | - |`;
  const shares = covs.map((c) => c.share).sort((a, b) => a - b);
  const median = shares[Math.floor(shares.length / 2)];
  const over80 = shares.filter((s) => s > 0.80).length;
  const totals = emptyBuckets();
  let copies = 0;
  for (const cov of covs) {
    copies += cov.copies;
    for (const key of Object.keys(totals) as Bucket[]) totals[key] += cov.buckets[key];
  }
  return `| ${label} | ${covs.length} | ${pct(shares[0], 1)} | ${pct(median, 1)} | ${over80}/${shares.length} `
    + `| ${pct(totals.generated, copies)} | ${pct(totals.curated, copies)} | ${pct(totals.trivial, copies)} `
    + `| ${pct(totals.partial, copies)} | ${pct(totals.unknown, copies)} |`;
}

function rankedQueue(): Array<{ name: string; copies: number; lists: number; type: string; card: DbCard }> {
  return [...uncovered.entries()]
    .map(([name, row]) => ({ name, ...row }))
    .sort((a, b) => b.copies - a.copies || a.name.localeCompare(b.name));
}

function staleReport(): string[] {
  if (stale.size === 0) return ['No stale entries: every catalogue hit still hashes to the printing being scored.'];
  return [
    '| entry | reviewed hash | live hash |',
    '|---|---|---|',
    ...[...stale.entries()].sort().map(([name, h]) => `| ${name} | \`${h.reviewed}\` | \`${h.live}\` |`),
  ];
}

function main(): void {
  const data = loadDataset(200);
  const standard = data.standardPositive.slice(0, STANDARD_COHORT_CAP);

  // `--set` narrows which reference set feeds the queue, so a curation batch
  // can be aimed at the list that is furthest from the >80% target.
  const setArg = process.argv[process.argv.indexOf('--set') + 1];
  const want = (name: string): boolean => process.argv.indexOf('--set') < 0 || setArg === name;
  // `--set fixture:<name>` narrows the queue to one deck, which is how a
  // batch gets aimed at the fixtures sitting just under the 80% line.
  const oneFixture = setArg?.startsWith('fixture:') ? setArg.slice('fixture:'.length) : null;
  const fixtureRows = data.fixtures.map((f) => ({
    name: f.name,
    cov: coverageOf(f.input, oneFixture ? f.name === oneFixture : want('fixtures')),
  }));
  const cedh = data.cedh.map((input) => coverageOf(input, want('cedh')));
  const std = standard.map((r) => coverageOf(r.input, want('standard')));
  const piles = data.piles.map((input) => coverageOf(input, false));

  const queueArg = process.argv.indexOf('--queue');
  if (queueArg >= 0) {
    const n = Number(process.argv[queueArg + 1] ?? 30);
    for (const row of rankedQueue().slice(0, n)) {
      const c = row.card;
      console.log(`### ${row.name} | ${c.mana_cost ?? '-'} | cmc ${c.cmc} | ${c.type_line} | P/T ${c.power ?? '-'}/${c.toughness ?? '-'} | ${row.copies} copies in ${row.lists} lists`);
      console.log(c.oracle_text ?? '(no oracle text)');
      const entry = catalogEntry(row.name) ?? PARTIAL.get(row.name.toLowerCase());
      if (entry?.untyped?.length) console.log(`UNTYPED: ${entry.untyped.join(' | ')}`);
      console.log();
    }
    return;
  }

  const ranked = rankedQueue();
  const generatedCount = catalogEntries().filter((e) => isGenerated(e)).length;
  const md = [
    '# Deck Score v1.2 — typed-effect catalogue coverage',
    '',
    `Generated ${new Date().toISOString()}. Catalogue ${CATALOG_SIZE} entries `
      + `(${generatedCount} generated, ${CATALOG_SIZE - generatedCount} curated), version \`${CATALOG_VERSION}\`.`,
    'Copy-weighted share of NONLAND main-deck copies carrying a `known` catalogue entry whose reviewed oracle text still hashes to the printing being scored.',
    'Lands and textless vanillas are covered by definition — they make no mechanical claim (§1 "no requirements means 1"); they are the `trivial` column.',
    '`partial` = a catalogue entry exists but at least one clause is untyped; `unknown` = no entry, or the entry is stale.',
    '',
    '| reference set | lists | worst | median | >80% | generated | curated | trivial | partial | unknown |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    summarise('cEDH Top-16', cedh),
    summarise(`Standard positive cohort (first ${STANDARD_COHORT_CAP})`, std),
    summarise('§5 fixtures', fixtureRows.map((f) => f.cov)),
    summarise('constrained random piles', piles),
    '',
    '## Stale entries (reviewed text no longer matches the live printing)',
    '',
    ...staleReport(),
    '',
    '## Per fixture',
    '',
    '| fixture | nonland copies | typed | coverage |',
    '|---|---:|---:|---:|',
    ...fixtureRows.map((f) => `| ${f.name} | ${f.cov.copies} | ${f.cov.covered} | ${(f.cov.share * 100).toFixed(1)}% |`),
    '',
    '## Work queue — uncovered cards by copy-weighted frequency (top 60)',
    '',
    'Curation adds entries from the top of this list until every reference list is above 80%.',
    '`npx tsx scripts/deck-score-coverage.ts --queue 30` prints the next batch with oracle text.',
    '',
    '| # | card | copies | lists | type |',
    '|---:|---|---:|---:|---|',
    ...ranked.slice(0, 60).map((r, i) => `| ${i + 1} | ${r.name} | ${r.copies} | ${r.lists} | ${r.type.replace(/\|/g, '/')} |`),
    '',
  ].join('\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, md, 'utf-8');
  console.log(`wrote ${OUT_FILE}`);
  console.log(md.split('\n').slice(0, 20).join('\n'));
}

main();
