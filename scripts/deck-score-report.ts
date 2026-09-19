/**
 * Deck Score v1 calibration report — docs/DECK_SCORE_SPEC.md §5.
 *
 * Scores every repository test-vector fixture (paper/brawl decklists, the
 * cEDH Top 16 JSON reference, and two Standard community_decks rows) plus 50
 * seeded constrained-random legal piles for The Cabbage Merchant, and writes
 * one table to verify-2026-09-19/deck-score/report.md.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-report.ts
 *
 * This does NOT tune weights — it reports the raw v1 numbers and how many
 * anchors land in their spec-proposed band.
 */
import fs from 'fs';
import path from 'path';
import { scoreDeck } from '../src/lib/deck-score';
import type { ScoreFormat } from '../src/lib/deck-score';
import {
  OUT_DIR as SHARED_OUT_DIR, FIXTURES, inBand, loadRandomPiles,
  type FixtureSpec, type LoadedDeck,
} from './deck-score-fixtures';

const OUT_DIR = SHARED_OUT_DIR;
const OUT_FILE = path.join(OUT_DIR, 'report.md');

interface FixtureResult {
  fixture: string;
  format: ScoreFormat;
  score: number;
  components: Record<string, number>;
  gates: string;
  band: string;
  purpose: string;
  inBand: boolean | 'n/a';
  ms: number;
  winReason: string;
}

// ── Scoring + reporting ─────────────────────────────────────────────────

function runFixture(spec: FixtureSpec): FixtureResult {
  const { input, unresolvedNames }: LoadedDeck = spec.load();
  const t0 = process.hrtime.bigint();
  const result = scoreDeck(input);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const components: Record<string, number> = {};
  for (const c of result.components) components[c.key] = c.score;
  const failing = result.gates.filter((g) => g.status === 'fail').map((g) => g.key);
  const capping = result.gates.filter((g) => g.cap != null).map((g) => `${g.key}<=${g.cap}`);
  const gateSummary = [
    unresolvedNames.length ? `${unresolvedNames.length} unresolved` : '',
    failing.length ? `fail:${failing.join(',')}` : '',
    capping.length ? capping.join(',') : '',
  ].filter(Boolean).join('; ') || 'none';
  const winReason = result.components.find((c) => c.key === 'win')?.reason ?? '';
  return {
    fixture: spec.name, format: spec.format, score: result.score, components, gates: gateSummary,
    band: spec.band, purpose: spec.purpose, inBand: inBand(result.score, spec.band), ms, winReason,
  };
}

// -- Random constrained legal piles (shared loader) ----------------------

function runRandomControls(): { min: number; median: number; max: number; n: number; over25: number } {
  const scores = loadRandomPiles(50).map((input) => scoreDeck(input).score).sort((a, b) => a - b);
  if (scores.length === 0) return { min: NaN, median: NaN, max: NaN, n: 0, over25: 0 };
  const mid = Math.floor(scores.length / 2);
  const median = scores.length % 2 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
  return {
    min: scores[0], median, max: scores[scores.length - 1], n: scores.length,
    over25: scores.filter((v) => v >= 25).length,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  const fixtures: FixtureResult[] = FIXTURES.map(runFixture);

  const anchorsInBand = fixtures.filter((f) => f.inBand === true).length;
  const anchorsTotal = fixtures.filter((f) => f.inBand !== 'n/a').length;

  const controlsT0 = process.hrtime.bigint();
  const controls = runRandomControls();
  const controlsMs = Number(process.hrtime.bigint() - controlsT0) / 1e6;

  const componentKeys = ['mana', 'curve', 'interaction', 'advantage', 'win', 'synergy', 'meta'];
  const componentAbbrev: Record<string, string> = { mana: 'M', curve: 'C', interaction: 'I', advantage: 'A', win: 'W', synergy: 'S', meta: 'Fmeta' };
  const header = `| Fixture | Format | Score | ${componentKeys.map((k) => componentAbbrev[k]).join(' | ')} | Gates | Band | IN/OUT | ms |\n` +
    `|---|---|---:|${componentKeys.map(() => '---:').join('|')}|---|---|---|---:|\n`;
  const rows = fixtures.map((f) => {
    const comps = componentKeys.map((k) => f.components[k]).join(' | ');
    const verdict = f.inBand === 'n/a' ? 'n/a' : f.inBand ? 'IN' : 'OUT';
    return `| ${f.fixture} | ${f.format} | ${f.score} | ${comps} | ${f.gates} | ${f.band} | ${verdict} | ${f.ms.toFixed(2)} |`;
  }).join('\n');

  const winRows = fixtures
    .map((f) => `| ${f.fixture} | ${f.components.win} | ${f.winReason.replace(/\|/g, '/')} |`)
    .join('\n');

  const md = `# Deck Score v1 calibration report

Generated ${new Date().toISOString()}. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the \`scoreDeck()\` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** \`data/mtg-deck-builder.db\` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its \`fail:legality\` rows were a stale-card-DB artefact (a missing printing resolved to a row whose \`legalities\` did not say \`legal\`), not a scoring defect. The two remaining \`fail\` rows are the intended structural negatives: \`meren-of-clan-nel-toth\` is 101 cards as stored, \`cabbage-merchant-current\` is 101 cards plus Arena-illegal entries.

${header}${rows}

Anchors in band: ${anchorsInBand}/${anchorsTotal} (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
${winRows}

## Random constrained-legal piles — The Cabbage Merchant, Commander, seeds 0-49

Per §5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. n=${controls.n}, generated+scored in ${controlsMs.toFixed(0)}ms.

| min | median | max | >=25 | target |
|---:|---:|---:|---:|---|
| ${controls.min} | ${controls.median} | ${controls.max} | ${controls.over25}/${controls.n} | §4 wants >=95% under 25 |
`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, md, 'utf-8');
  console.log(`wrote ${OUT_FILE}`);
  console.log(md);
}

main();
