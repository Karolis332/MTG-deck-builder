/**
 * Deck Score v1.4 stage 0 (§10.5, §10.7) — the FROZEN cohort manifest.
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-cohorts.ts            # build + check
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-cohorts.ts legality   # §10.5 audit sample
 *
 * Every source row of every cohort the score is graded on — the two VPS
 * sample CSVs, the 30 cEDH Top-16 lists, the dated Standard cohorts and the
 * 16 §5 fixtures — gets ONE manifest row: which split it belongs to, whether
 * an INPUT gate excludes it (decided before any scoring), and the sha256 of
 * its normalised list text so a later stage can prove the inputs did not move
 * underneath a measurement (`bands verify` re-checks the CSV hashes).
 *
 * Nothing here scores a deck or changes a constant: §10.7 stage 0 is "freeze
 * IDs, split/exclusion reasons and percentile/probe policy BEFORE editing
 * formulas".
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { computeStructure } from '../src/lib/deck-score-gates';
import { profileOf, type ScoreFormat } from '../src/lib/deck-score-norms';
import type { DbCard } from '../src/lib/types';
import { OUT_DIR, ROOT, FIXTURES } from './deck-score-fixtures';
import {
  readSample, cardsByName, strideOrder, HELD_OUT_COMMANDERS,
  type SampleProfile, type SampleDeck,
} from './deck-score-piles';
import { loadDataset } from './deck-score-fixtures';

export const MANIFEST_FILE = path.join(OUT_DIR, 'cohorts-v14.json');

export type CohortSplit = 'training' | 'holdout' | 'fresh' | 'fixture' | 'cedh';
export type CohortExclusion = 'none' | 'unresolved' | 'legality' | 'identity' | 'singleton' | 'size';

export interface CohortRow {
  id: string;
  profile: 'commander' | 'brawl' | 'standard';
  source: string;
  /** Grouping key for the overlap check: the commander (pair) for the
   * commander family, the event date for Standard. */
  commanderFamily: string;
  split: CohortSplit;
  exclusion: CohortExclusion;
  reasonDetail: string;
  /** sha256 of the normalised list text — order/case/whitespace invariant. */
  sha256: string;
}

export interface CohortManifest {
  /** Bump when the ROW SET or a split/exclusion RULE changes, never for a
   * card-DB refresh (that moves hashes and is caught by `bands verify`). */
  manifestVersion: string;
  builtFrom: Record<string, string>;
  rows: CohortRow[];
}

export const MANIFEST_VERSION = 'v14-stage0';

// ── hashing ───────────────────────────────────────────────────────────────

/** Order-, case- and whitespace-invariant text of one list. Two submissions
 * of the same 100 cards hash identically however they were typed. */
export function normalisedListText(
  commanders: readonly string[], lines: readonly { name: string; quantity: number }[],
): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const main = lines
    .map((l) => `${l.quantity} ${norm(l.name)}`)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [`commander:${[...commanders].map(norm).sort().join('|')}`, ...main].join('\n');
}

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** The hash of every list in one sample CSV, keyed by its `deck_id` — the
 * statistic `bands verify` re-computes against the stored manifest. */
export function sampleHashes(profile: SampleProfile): Map<string, string> {
  const out = new Map<string, string>();
  for (const deck of readSample(profile)) {
    out.set(deck.id, sha256(normalisedListText([deck.commander], deck.cards)));
  }
  return out;
}

export function readManifest(): CohortManifest | null {
  if (!fs.existsSync(MANIFEST_FILE)) return null;
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8')) as CohortManifest;
}

// ── input gates, decided BEFORE scoring ───────────────────────────────────

const EXCLUSION_ORDER: readonly CohortExclusion[] = ['size', 'legality', 'identity', 'singleton'];

/**
 * §10.5's "explicit input reasons decided before scoring". Unresolved names
 * come first — an unreadable identity is missing evidence, and a list whose
 * cards the catalogue cannot even name cannot supply a rule verdict either.
 * Confirmed structure failures then keep their existing rule meaning.
 *
 * `structure`/`rules` failures (a broken commander configuration, a rule
 * deck-validation reports under no other id) are folded into `size`: they are
 * the same "this is not a legal library" family, and the free-text detail
 * carries the actual gate id.
 */
function inputGate(
  format: ScoreFormat, main: { card: DbCard; quantity: number }[], commander: DbCard[],
  unresolvedNames: readonly string[],
): { exclusion: CohortExclusion; reasonDetail: string } {
  if (unresolvedNames.length > 0) {
    const shown = unresolvedNames.slice(0, 3).join(', ');
    return {
      exclusion: 'unresolved',
      reasonDetail: `${unresolvedNames.length} unresolved name(s): ${shown}${unresolvedNames.length > 3 ? ', …' : ''}`,
    };
  }
  const structure = computeStructure({ format, main, commander, sideboard: [], unresolved: [] });
  const fails = structure.gates.filter((g) => g.kind === 'rules' && g.status === 'fail');
  if (fails.length === 0) return { exclusion: 'none', reasonDetail: '' };
  const key = EXCLUSION_ORDER.find((e) => fails.some((f) => f.key === e)) ?? 'size';
  return { exclusion: key, reasonDetail: fails.map((f) => `${f.key}: ${f.reason}`).join(' | ') };
}

// ── the four sources ──────────────────────────────────────────────────────

function sampleRows(profile: SampleProfile): CohortRow[] {
  const byName = cardsByName();
  const sample = readSample(profile);
  const splitOf = new Map<number, CohortSplit>();
  for (const i of strideOrder('training', sample)) splitOf.set(i, 'training');
  for (const i of strideOrder('holdout', sample)) splitOf.set(i, 'holdout');
  const source = path.relative(ROOT, path.join(ROOT, 'verify-2026-09-20', `${profile}-sample.csv`)).replace(/\\/g, '/');

  return sample.map((deck: SampleDeck, i: number) => {
    const family = deck.commander.trim().toLowerCase();
    // A fixture commander's lists belong to no stride: `commanderBlocks`
    // drops them so no band, floor or control is measured on an anchor's own
    // commander (§10.7 "including fixture commanders").
    const split: CohortSplit = HELD_OUT_COMMANDERS.has(family) ? 'fixture' : (splitOf.get(i) ?? 'fresh');
    const main: { card: DbCard; quantity: number }[] = [];
    const commander: DbCard[] = [];
    const unresolvedNames: string[] = [];
    let took = false;
    for (const line of deck.cards) {
      const card = byName.get(line.name.toLowerCase());
      if (!card) { unresolvedNames.push(line.name); continue; }
      if (!took && line.name.toLowerCase() === family) { commander.push(card); took = true; continue; }
      main.push({ card, quantity: line.quantity });
    }
    const gate = commander.length === 0 && unresolvedNames.length === 0
      ? { exclusion: 'identity' as CohortExclusion, reasonDetail: `commander "${deck.commander}" is not a line of the list` }
      : inputGate(profile as ScoreFormat, main, commander, unresolvedNames);
    return {
      id: `${profile}-sample:${deck.id}`,
      profile: profile as 'commander' | 'brawl',
      source,
      commanderFamily: family,
      split,
      ...gate,
      sha256: sha256(normalisedListText([deck.commander], deck.cards)),
    };
  });
}

type DatasetInput = ReturnType<typeof loadDataset>['fixtures'][number]['input'];

function linesOf(input: DatasetInput): { name: string; quantity: number }[] {
  return [
    ...input.main.map((e) => ({ name: e.card.name, quantity: e.quantity })),
    ...input.unresolved.filter((u) => u.board === 'main').map((u) => ({ name: u.name, quantity: u.quantity })),
  ];
}

function datasetRow(
  id: string, source: string, split: CohortSplit, family: string,
  input: DatasetInput, unresolvedNames: readonly string[],
): CohortRow {
  const main = input.main.map((e) => ({ card: e.card, quantity: e.quantity }));
  return {
    id,
    profile: profileOf(input.format) as 'commander' | 'brawl' | 'standard',
    source,
    commanderFamily: family,
    split,
    ...inputGate(input.format, main, [...input.commander], unresolvedNames),
    sha256: sha256(normalisedListText(input.commander.map((c) => c.name), linesOf(input))),
  };
}

/**
 * Standard's split is chronological (`deck-score-calibrate.ts`: oldest 60 %
 * train, newest 40 % validate). Calibrate cuts the positive and negative
 * cohorts SEPARATELY by index, which puts the same event date on both sides
 * of the split twice over: the index can land inside a date, and the two
 * cohorts' cuts fall on different dates. One cut date over the union, snapped
 * to a date boundary, gives the same 60/40 intent with zero event straddles;
 * `standardCutDate` reports it and the rows that moved are counted.
 */
export function standardCutDate(dates: readonly string[]): string {
  const sorted = [...dates].sort();
  let cut = Math.floor(sorted.length * 0.6);
  while (cut > 0 && cut < sorted.length && sorted[cut] === sorted[cut - 1]) cut++;
  return sorted[Math.min(cut, sorted.length - 1)];
}

// ── manifest ──────────────────────────────────────────────────────────────

export function buildManifest(): { manifest: CohortManifest; notes: string[] } {
  const notes: string[] = [];
  const data = loadDataset(200);
  const rows: CohortRow[] = [
    ...sampleRows('commander'),
    ...sampleRows('brawl'),
  ];

  const cedhFamily = 'thrasios, triton hero|tymna the weaver';
  data.cedh.forEach((input, i) => {
    rows.push(datasetRow(`cedh:${i}`, 'decks/test-builds/refs/thrasios-tymna/cedhtop16.json', 'cedh', cedhFamily, input, []));
  });

  const standardAll = [...data.standardPositive, ...data.standardNegative];
  const cutDate = standardCutDate(standardAll.map((r) => r.eventDate));
  let moved = 0;
  for (const cohort of [data.standardPositive, data.standardNegative]) {
    const byIndex = [...cohort].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const indexCut = Math.floor(byIndex.length * 0.6);
    byIndex.forEach((row, i) => {
      const split: CohortSplit = row.eventDate < cutDate ? 'training' : 'holdout';
      if ((i < indexCut) !== (split === 'training')) moved++;
      rows.push(datasetRow(`standard:${row.id}`, 'data/export-standard.db', split, `event:${row.eventDate}`, row.input, []));
    });
  }
  notes.push(`standard: one cut date ${cutDate} over both cohorts (${standardAll.length} rows); ` +
    `${moved} row(s) differ from calibrate's per-cohort index cut, which straddled 7 event dates.`);

  for (const f of data.fixtures) {
    const family = f.input.commander.length
      ? f.input.commander.map((c) => c.name.trim().toLowerCase()).sort().join('|')
      : `fixture:${f.name}`;
    rows.push(datasetRow(`fixture:${f.name}`, 'scripts/deck-score-fixtures.ts FIXTURES', 'fixture', family, f.input, f.unresolvedNames));
  }

  const manifest: CohortManifest = {
    manifestVersion: MANIFEST_VERSION,
    builtFrom: {
      commanderSample: 'verify-2026-09-20/commander-sample.csv',
      brawlSample: 'verify-2026-09-20/brawl-sample.csv',
      cedh: 'decks/test-builds/refs/thrasios-tymna/cedhtop16.json',
      standard: 'data/export-standard.db',
      fixtures: 'scripts/deck-score-fixtures.ts FIXTURES',
      dataset: 'verify-2026-09-19/deck-score/dataset-200.json',
    },
    rows,
  };
  return { manifest, notes };
}

/** The sample CSVs spell a double-faced commander in full ("A // B") while
 * `HELD_OUT_COMMANDERS` stores the front face, so the two must be compared on
 * the front name or a held-out commander slips into a stride. */
export function familyKey(family: string): string {
  return family.split(' // ')[0];
}

/**
 * Fixture commanders that still appear in a MEASURED stride. Each is a
 * §10.7 "including fixture commanders" violation the stride generator has to
 * drop; listing them is stage 0's job, removing them moves every frozen band
 * and is therefore stage 2's.
 */
export function fixtureLeaks(manifest: CohortManifest): Map<string, number> {
  const fixtures = new Set(
    manifest.rows.filter((r) => r.split === 'fixture' && r.id.startsWith('fixture:')).map((r) => familyKey(r.commanderFamily)),
  );
  const leaks = new Map<string, number>();
  for (const r of manifest.rows) {
    if (r.split !== 'training' && r.split !== 'holdout') continue;
    const key = familyKey(r.commanderFamily);
    if (!fixtures.has(key)) continue;
    leaks.set(`${r.profile}/${key}`, (leaks.get(`${r.profile}/${key}`) ?? 0) + 1);
  }
  return leaks;
}

/** §10.7 stage 0's two hard checks: every source row accounted for exactly
 * once, and no commander family on both sides of ONE profile's split. The
 * two corpora are independently calibrated profiles, so a commander that is
 * played in both Commander and Historic Brawl is not an overlap. */
export function checkManifest(manifest: CohortManifest): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const r of manifest.rows) {
    if (seen.has(r.id)) problems.push(`duplicate manifest id ${r.id}`);
    seen.add(r.id);
  }
  const expected =
    readSample('commander').length + readSample('brawl').length +
    manifest.rows.filter((r) => r.id.startsWith('cedh:')).length +
    manifest.rows.filter((r) => r.id.startsWith('standard:')).length +
    FIXTURES.length;
  if (manifest.rows.length !== expected) {
    problems.push(`row count ${manifest.rows.length} != ${expected} source rows`);
  }
  if (manifest.rows.filter((r) => r.id.startsWith('fixture:')).length !== FIXTURES.length) {
    problems.push(`fixture rows != ${FIXTURES.length}`);
  }

  const splitsOf = new Map<string, Set<CohortSplit>>();
  for (const r of manifest.rows) {
    const key = `${r.profile}|${familyKey(r.commanderFamily)}`;
    const set = splitsOf.get(key) ?? new Set<CohortSplit>();
    set.add(r.split);
    splitsOf.set(key, set);
  }
  for (const [key, splits] of splitsOf) {
    if (splits.has('training') && splits.has('holdout')) problems.push(`family "${key}" is in BOTH training and holdout`);
  }
  return problems;
}

/** `bands verify`'s cohort-hash check: manifest rows vs the CSVs on disk. */
export function verifyCohortHashes(): { checked: number; mismatches: string[] } {
  const manifest = readManifest();
  if (!manifest) return { checked: 0, mismatches: ['cohorts-v14.json missing — run scripts/deck-score-cohorts.ts'] };
  const mismatches: string[] = [];
  let checked = 0;
  for (const profile of ['commander', 'brawl'] as const) {
    const live = sampleHashes(profile);
    const stored = manifest.rows.filter((r) => r.id.startsWith(`${profile}-sample:`));
    if (stored.length !== live.size) mismatches.push(`${profile}: manifest has ${stored.length} rows, CSV has ${live.size} lists`);
    for (const row of stored) {
      const id = row.id.slice(`${profile}-sample:`.length);
      const now = live.get(id);
      checked++;
      if (!now) mismatches.push(`${profile}: manifest id ${id} is not in the CSV`);
      else if (now !== row.sha256) mismatches.push(`${profile}: ${id} hash ${row.sha256.slice(0, 12)} != ${now.slice(0, 12)}`);
    }
  }
  return { checked, mismatches };
}

// ── §10.5 legality audit sample ───────────────────────────────────────────

/**
 * "Audit format/date/Arena variants": the cards most often behind the
 * legality cap, with what the snapshot actually stores for them, so the
 * operator can judge whether the snapshot — not the scorer — is wrong.
 */
function legalityAudit(top = 20): string {
  const byName = cardsByName();
  const out: string[] = [];
  for (const profile of ['commander', 'brawl'] as const) {
    const counts = new Map<string, number>();
    const sample = readSample(profile);
    for (const i of strideOrder('training', sample)) {
      const deck = sample[i];
      if (!deck) continue;
      for (const line of deck.cards) {
        const card = byName.get(line.name.toLowerCase());
        if (!card) continue;
        let status = 'missing';
        try { status = (JSON.parse(card.legalities || '{}') as Record<string, string>)[profile] ?? 'missing'; } catch { status = 'unparseable'; }
        if (status !== 'legal') counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
      }
    }
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
    const stmt = getDb().prepare('SELECT set_code, set_name, updated_at, legalities FROM cards WHERE name = ? LIMIT 1');
    out.push(`## legality audit — ${profile} training stride (top ${top} of ${counts.size} distinct)`);
    out.push('| card | lists | commander | brawl | standardbrawl | historic | set | stored at |');
    out.push('|---|---:|---|---|---|---|---|---|');
    for (const [name, lists] of rows) {
      const row = stmt.get(name) as { set_code: string | null; set_name: string | null; updated_at: string | null; legalities: string | null } | undefined;
      let legal: Record<string, string> = {};
      try { legal = JSON.parse(row?.legalities || '{}') as Record<string, string>; } catch { legal = {}; }
      out.push(`| ${name} | ${lists} | ${legal.commander ?? '-'} | ${legal.brawl ?? '-'} | ${legal.standardbrawl ?? '-'} | ${legal.historic ?? '-'} | ` +
        `${row?.set_code ?? '?'} (${row?.set_name ?? '?'}) | ${row?.updated_at ?? '?'} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

// ── CLI ───────────────────────────────────────────────────────────────────

function summarise(manifest: CohortManifest): string {
  const key = (r: CohortRow) => `${r.profile}/${r.split}`;
  const bySplit = new Map<string, Map<CohortExclusion, number>>();
  for (const r of manifest.rows) {
    const inner = bySplit.get(key(r)) ?? new Map<CohortExclusion, number>();
    inner.set(r.exclusion, (inner.get(r.exclusion) ?? 0) + 1);
    bySplit.set(key(r), inner);
  }
  const exclusions: CohortExclusion[] = ['none', 'unresolved', 'legality', 'identity', 'singleton', 'size'];
  const lines = [`| profile/split | rows | ${exclusions.join(' | ')} |`, `|---|---:|${exclusions.map(() => '---:').join('|')}|`];
  for (const [k, inner] of [...bySplit.entries()].sort()) {
    const total = [...inner.values()].reduce((a, b) => a + b, 0);
    lines.push(`| ${k} | ${total} | ${exclusions.map((e) => inner.get(e) ?? 0).join(' | ')} |`);
  }
  lines.push(`| TOTAL | ${manifest.rows.length} | ${exclusions.map((e) => manifest.rows.filter((r) => r.exclusion === e).length).join(' | ')} |`);
  return lines.join('\n');
}

function main(): void {
  if (process.argv.includes('legality')) {
    process.stdout.write(`${legalityAudit()}\n`);
    return;
  }
  if (process.argv.includes('verify')) {
    const { checked, mismatches } = verifyCohortHashes();
    console.log(`cohort hashes: ${checked} checked, ${mismatches.length} mismatch(es)`);
    for (const m of mismatches.slice(0, 20)) console.log(`  - ${m}`);
    if (mismatches.length) process.exitCode = 1;
    return;
  }
  const { manifest, notes } = buildManifest();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 1));
  console.log(`wrote ${MANIFEST_FILE} (${manifest.rows.length} rows, ${MANIFEST_VERSION})`);
  console.log(summarise(manifest));
  for (const n of notes) console.log(`note: ${n}`);
  const crossCorpus = new Set(
    manifest.rows.filter((r) => r.profile === 'commander').map((r) => familyKey(r.commanderFamily)),
  );
  const both = new Set(
    manifest.rows.filter((r) => r.profile === 'brawl' && crossCorpus.has(familyKey(r.commanderFamily)))
      .map((r) => familyKey(r.commanderFamily)),
  );
  console.log(`note: ${both.size} commander(s) appear in BOTH corpora; Commander and Brawl are independently calibrated profiles, so that is not a split overlap.`);
  for (const [key, n] of fixtureLeaks(manifest)) {
    console.log(`LEAK: ${n} ${key} stride list(s) carry a FIXTURE commander — HELD_OUT_COMMANDERS stores the front face, the sample the full "A // B" name.`);
  }
  const problems = checkManifest(manifest);
  if (problems.length === 0) {
    console.log('manifest checks: OK — 100% of source rows accounted, 0 train/holdout family overlaps.');
    return;
  }
  console.log(`manifest checks: ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 20)) console.log(`  - ${p}`);
  process.exitCode = 1;
}

if (require.main === module) main();
