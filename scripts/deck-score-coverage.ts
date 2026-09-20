/**
 * Deck Score v1.2 — typed-effect catalogue coverage. docs/DECK_SCORE_SPEC.md §8
 * "Minimum typed-effect catalogue": the minimum is coverage-defined, not
 * "303 flags" — cover >80% of nonland copies in EACH legal cEDH and
 * tournament-Standard reference list, and 100% of every selected closing
 * recipe's critical mechanics.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-coverage.ts
 *
 * Writes `verify-2026-09-19/deck-score/coverage.md`: copy-weighted typed
 * coverage per reference list, and the uncovered cards in descending
 * copy-weighted frequency. That ranked list IS slice B's work queue — entries
 * are added in descending uncovered copy mass until the >80% condition holds.
 *
 * Coverage here is TYPED coverage (`CardFeature.covered`): a `known`
 * catalogue entry whose reviewed oracle text still hashes to the printing
 * being scored. It is deliberately NOT derived from `s < 1` (§8).
 */
import fs from 'fs';
import path from 'path';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import { CATALOG_SIZE, CATALOG_VERSION } from '../src/lib/deck-score-catalog';
import type { DeckScoreInput } from '../src/lib/deck-score';
import { OUT_DIR, loadDataset } from './deck-score-fixtures';

const OUT_FILE = path.join(OUT_DIR, 'coverage.md');
const STANDARD_COHORT_CAP = 200;

interface Coverage { copies: number; covered: number; share: number }

const uncovered = new Map<string, { copies: number; lists: number; type: string }>();

function coverageOf(input: DeckScoreInput, track: boolean): Coverage {
  let copies = 0;
  let covered = 0;
  const seen = new Set<string>();
  for (const entry of input.main) {
    const feature = deriveCardFeature(entry.card);
    if (feature.isLand) continue;
    copies += entry.quantity;
    if (feature.covered) {
      covered += entry.quantity;
      continue;
    }
    if (!track) continue;
    const row = uncovered.get(entry.card.name) ?? { copies: 0, lists: 0, type: entry.card.type_line || '' };
    row.copies += entry.quantity;
    if (!seen.has(entry.card.name)) {
      row.lists += 1;
      seen.add(entry.card.name);
    }
    uncovered.set(entry.card.name, row);
  }
  return { copies, covered, share: copies > 0 ? covered / copies : 1 };
}

function summarise(label: string, covs: Coverage[]): string {
  if (covs.length === 0) return `| ${label} | 0 | - | - | - |`;
  const shares = covs.map((c) => c.share).sort((a, b) => a - b);
  const median = shares[Math.floor(shares.length / 2)];
  const over80 = shares.filter((s) => s > 0.80).length;
  return `| ${label} | ${covs.length} | ${(shares[0] * 100).toFixed(1)}% | ${(median * 100).toFixed(1)}% | ${over80}/${shares.length} |`;
}

function main(): void {
  const data = loadDataset(200);
  const standard = data.standardPositive.slice(0, STANDARD_COHORT_CAP);

  const fixtureRows = data.fixtures.map((f) => ({ name: f.name, cov: coverageOf(f.input, true) }));
  const cedh = data.cedh.map((input) => coverageOf(input, true));
  const std = standard.map((r) => coverageOf(r.input, true));
  const piles = data.piles.map((input) => coverageOf(input, false));

  const ranked = [...uncovered.entries()]
    .sort((a, b) => b[1].copies - a[1].copies || a[0].localeCompare(b[0]))
    .slice(0, 60);

  const md = [
    '# Deck Score v1.2 — typed-effect catalogue coverage',
    '',
    `Generated ${new Date().toISOString()}. Catalogue ${CATALOG_SIZE} entries, version \`${CATALOG_VERSION}\`.`,
    'Copy-weighted share of NONLAND main-deck copies carrying a `known` catalogue entry whose reviewed oracle text still hashes to the printing being scored.',
    'Lands and textless vanillas are covered by definition — they make no mechanical claim (§1 "no requirements means 1").',
    '',
    '| reference set | lists | worst | median | >80% |',
    '|---|---:|---:|---:|---:|',
    summarise('cEDH Top-16', cedh),
    summarise(`Standard positive cohort (first ${STANDARD_COHORT_CAP})`, std),
    summarise('§5 fixtures', fixtureRows.map((f) => f.cov)),
    summarise('constrained random piles', piles),
    '',
    '## Per fixture',
    '',
    '| fixture | nonland copies | typed | coverage |',
    '|---|---:|---:|---:|',
    ...fixtureRows.map((f) => `| ${f.name} | ${f.cov.copies} | ${f.cov.covered} | ${(f.cov.share * 100).toFixed(1)}% |`),
    '',
    '## Work queue — uncovered cards by copy-weighted frequency (top 60)',
    '',
    'Slice B adds entries from the top of this list, stratified by archetype, until every reference list is above 80%.',
    '',
    '| # | card | copies | lists | type |',
    '|---:|---|---:|---:|---|',
    ...ranked.map((r, i) => `| ${i + 1} | ${r[0]} | ${r[1].copies} | ${r[1].lists} | ${r[1].type.replace(/\|/g, '/')} |`),
    '',
  ].join('\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, md, 'utf-8');
  console.log(`wrote ${OUT_FILE}`);
  console.log(md.split('\n').slice(0, 24).join('\n'));
}

main();
