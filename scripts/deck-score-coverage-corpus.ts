/**
 * Deck Score — size the typed-coverage gap on REAL corpus lists (measurement
 * only, brief `deck-score-coverage-sizing-2026-09-21.md`). `scripts/deck-score-coverage.ts`
 * measures the 16 fixtures + cEDH Top-16 + Standard cohort + synthetic piles;
 * this measures the two large real-list CSV samples it does not touch
 * (`verify-2026-09-20/commander-sample.csv`, 2,777 lists; `brawl-sample.csv`,
 * 1,746 lists), which is what the product actually scores.
 *
 * Per-list coverage share uses `deriveCardFeature(card).covered` — the exact
 * boolean the scorer's S component gates on (src/lib/deck-score-features.ts).
 * Catalogue status per distinct card (known/partial/unknown) mirrors the
 * `bucketOf` classification in `deck-score-coverage.ts` (duplicated here, not
 * imported, since that script is out of scope to edit).
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-coverage-corpus.ts
 *
 * Writes `verify-2026-09-19/deck-score/coverage-queue-corpus.csv` (top 5,000
 * uncovered cards by copy-weighted frequency) and prints the report tables.
 */
import fs from 'fs';
import path from 'path';
import { deriveCardFeature } from '../src/lib/deck-score-features';
import { catalogEntry, entryHash, isGenerated, oracleHash } from '../src/lib/deck-score-catalog';
import { resolveLines, type DeckLine, type Board } from '../src/lib/deck-gate-parse';
import type { DbCard } from '../src/lib/types';
import PARTIAL_JSON from '../src/lib/deck-score-catalog/entries/generated-partial.json';
import type { CatalogEntry } from '../src/lib/deck-score-catalog/schema';

const PARTIAL = new Map<string, CatalogEntry>(
  (PARTIAL_JSON as unknown as CatalogEntry[]).map((e) => [e.canonicalName.toLowerCase(), e]),
);

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'verify-2026-09-19', 'deck-score');
const OUT_CSV = path.join(OUT_DIR, 'coverage-queue-corpus.csv');

type Status = 'known' | 'partial' | 'unknown';

function statusOf(card: DbCard): Status {
  const entry = catalogEntry(card.name);
  if (!entry) return PARTIAL.has(card.name.toLowerCase()) ? 'partial' : 'unknown';
  if (oracleHash(card.oracle_text) !== entryHash(entry)) return 'unknown';
  return entry.knowledge === 'known' ? 'known' : 'partial';
}

/** Minimal quoted-CSV line parser — good enough for this fixed 5-column export. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { fields.push(cur); cur = ''; continue; }
    cur += ch;
  }
  fields.push(cur);
  return fields;
}

interface CorpusList {
  deckId: string;
  lines: { name: string; qty: number }[];
}

function loadCorpus(file: string): CorpusList[] {
  const text = fs.readFileSync(file, 'utf-8');
  const rows = text.split(/\r?\n/).slice(1).filter(Boolean);
  const byDeck = new Map<string, CorpusList>();
  for (const row of rows) {
    const [deckId, , cardName, board, qtyStr] = parseCsvLine(row);
    if (board !== 'main') continue; // score gates on the nonland MAIN pool only
    let deck = byDeck.get(deckId);
    if (!deck) { deck = { deckId, lines: [] }; byDeck.set(deckId, deck); }
    deck.lines.push({ name: cardName, qty: Number(qtyStr) || 1 });
  }
  return [...byDeck.values()];
}

function resolveAll(lists: CorpusList[], format: string): Map<string, DbCard | null> {
  const cache = new Map<string, DbCard | null>();
  const names = new Set<string>();
  for (const l of lists) for (const line of l.lines) names.add(line.name);
  const probe: DeckLine[] = [...names].map((n) => ({ quantity: 1, name: n, board: 'main' as Board }));
  const { resolved, unresolved } = resolveLines(probe, format);
  for (const r of resolved) cache.set(r.line.name, r.card);
  for (const n of unresolved) cache.set(n, null);
  return cache;
}

interface Profile {
  label: string;
  format: string;
  lists: CorpusList[];
  cards: Map<string, DbCard | null>;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

function perListShares(p: Profile): number[] {
  const shares: number[] = [];
  for (const l of p.lists) {
    let copies = 0;
    let covered = 0;
    for (const line of l.lines) {
      const card = p.cards.get(line.name);
      if (!card) { copies += line.qty; continue; } // unresolved counts as uncovered nonland
      if (deriveCardFeature(card).isLand) continue;
      copies += line.qty;
      if (deriveCardFeature(card).covered) covered += line.qty;
    }
    shares.push(copies > 0 ? covered / copies : 1);
  }
  return shares.sort((a, b) => a - b);
}

interface FreqRow { name: string; copies: number; lists: number; card: DbCard | null; status: Status; oracle: string; }

function frequency(p: Profile): Map<string, FreqRow> {
  const freq = new Map<string, FreqRow>();
  for (const l of p.lists) {
    const seen = new Set<string>();
    for (const line of l.lines) {
      const card = p.cards.get(line.name);
      if (card && deriveCardFeature(card).isLand) continue;
      const key = card ? card.name : line.name;
      let row = freq.get(key);
      if (!row) {
        row = {
          name: key, copies: 0, lists: 0, card,
          status: card ? statusOf(card) : 'unknown',
          oracle: (card?.oracle_text ?? '').slice(0, 80),
        };
        freq.set(key, row);
      }
      row.copies += line.qty;
      if (!seen.has(key)) { row.lists += 1; seen.add(key); }
    }
  }
  return freq;
}

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }

/** Rough oracle-template cluster: leading keyword/verb phrase for the uncovered tail. */
function clusterKey(oracle: string): string {
  const o = oracle.toLowerCase();
  if (!o) return '(no oracle text — vanilla / reprint gap)';
  const patterns: [RegExp, string][] = [
    [/when .* enters/, 'ETB trigger'],
    [/when .* dies/, 'dies trigger'],
    [/whenever .* attacks/, 'attack trigger'],
    [/whenever .* deals combat damage/, 'combat damage trigger'],
    [/^flying|^first strike|^double strike|^trample|^haste|^vigilance|^menace|^deathtouch|^lifelink/, 'keyword-only'],
    [/target creature gets [+-]/, 'pump/anthem'],
    [/create[s]? .* token/, 'token generation'],
    [/draw a card/, 'card draw'],
    [/search your library/, 'tutor'],
    [/destroy target/, 'targeted removal'],
    [/exile target/, 'exile removal'],
    [/counter target spell/, 'counterspell'],
    [/gain [0-9x]+ life/, 'lifegain'],
    [/each opponent loses/, 'drain'],
    [/return .* to (its owner|the battlefield)/, 'bounce/reanimate'],
    [/sacrifice/, 'sacrifice payoff'],
    [/\+1\/\+1 counter/, '+1/+1 counters'],
    [/mana of any (color|colour)|add \{/, 'mana ability'],
  ];
  for (const [re, label] of patterns) if (re.test(o)) return label;
  return o.split(/[.,]/)[0].split(' ').slice(0, 4).join(' ') || '(unclassified)';
}

function whatIf(freq: Map<string, FreqRow>, p: Profile, topN: number[]): Map<number, { p50: number; over80: number }> {
  const uncoveredRanked = [...freq.values()]
    .filter((r) => r.status !== 'known')
    .sort((a, b) => b.copies - a.copies);
  const out = new Map<number, { p50: number; over80: number }>();
  for (const n of topN) {
    const newlyTyped = new Set(uncoveredRanked.slice(0, n).map((r) => r.name));
    const shares: number[] = [];
    for (const l of p.lists) {
      let copies = 0;
      let covered = 0;
      for (const line of l.lines) {
        const card = p.cards.get(line.name);
        if (card && deriveCardFeature(card).isLand) continue;
        copies += line.qty;
        const key = card ? card.name : line.name;
        const alreadyCovered = card ? deriveCardFeature(card).covered : false;
        if (alreadyCovered || newlyTyped.has(key)) covered += line.qty;
      }
      shares.push(copies > 0 ? covered / copies : 1);
    }
    shares.sort((a, b) => a - b);
    out.set(n, { p50: quantile(shares, 0.5), over80: shares.filter((s) => s >= 0.8).length / shares.length });
  }
  return out;
}

function main(): void {
  const t0 = Date.now();
  const commanderLists = loadCorpus(path.join(ROOT, 'verify-2026-09-20', 'commander-sample.csv'));
  const brawlLists = loadCorpus(path.join(ROOT, 'verify-2026-09-20', 'brawl-sample.csv'));
  const profiles: Profile[] = [
    { label: 'Commander', format: 'commander', lists: commanderLists, cards: resolveAll(commanderLists, 'commander') },
    { label: 'Brawl', format: 'brawl', lists: brawlLists, cards: resolveAll(brawlLists, 'brawl') },
  ];

  const N_GRID = [250, 500, 1000, 2000, 3000, 5000];
  const lines: string[] = [];
  lines.push('# Deck Score — corpus coverage sizing');
  lines.push('');
  lines.push('| profile | lists | p10 | p25 | p50 | p75 | p90 | share ≥80% |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');

  const combinedFreq = new Map<string, FreqRow>();
  for (const p of profiles) {
    const shares = perListShares(p);
    const over80 = shares.filter((s) => s >= 0.8).length / shares.length;
    lines.push(`| ${p.label} | ${p.lists.length} | ${pct(quantile(shares, 0.10))} | ${pct(quantile(shares, 0.25))} | `
      + `${pct(quantile(shares, 0.50))} | ${pct(quantile(shares, 0.75))} | ${pct(quantile(shares, 0.90))} | ${pct(over80)} |`);
    const freq = frequency(p);
    for (const [k, row] of freq) {
      const c = combinedFreq.get(k) ?? { ...row, copies: 0, lists: 0 };
      c.copies += row.copies; c.lists += row.lists;
      combinedFreq.set(k, c);
    }
  }

  const rankedCombined = [...combinedFreq.values()].sort((a, b) => b.copies - a.copies);
  const totalCopies = rankedCombined.reduce((s, r) => s + r.copies, 0);
  lines.push('');
  lines.push('## Cumulative copy share by top-N cards (combined, copy-weighted, both profiles)');
  lines.push('');
  lines.push('| N | cumulative copy share | already `known` in top N |');
  lines.push('|---:|---:|---:|');
  let running = 0;
  let ni = 0;
  for (let i = 0; i < rankedCombined.length && ni < N_GRID.length; i++) {
    running += rankedCombined[i].copies;
    if (i + 1 === N_GRID[ni]) {
      const knownInTop = rankedCombined.slice(0, i + 1).filter((r) => r.status === 'known').length;
      lines.push(`| ${N_GRID[ni]} | ${pct(running / totalCopies)} | ${knownInTop}/${N_GRID[ni]} |`);
      ni++;
    }
  }

  lines.push('');
  lines.push('## What-if: per-list coverage if top-N uncovered cards (by frequency) were typed');
  lines.push('');
  lines.push('| profile | N | p50 coverage | share ≥80% |');
  lines.push('|---|---:|---:|---:|');
  for (const p of profiles) {
    const freq = frequency(p);
    const wi = whatIf(freq, p, N_GRID);
    for (const n of N_GRID) {
      const r = wi.get(n)!;
      lines.push(`| ${p.label} | ${n} | ${pct(r.p50)} | ${pct(r.over80)} |`);
    }
  }

  const uncoveredCombined = rankedCombined.filter((r) => r.status !== 'known');
  const top300 = uncoveredCombined.slice(0, 300);
  const clusters = new Map<string, number>();
  for (const r of top300) {
    const key = clusterKey(r.oracle);
    clusters.set(key, (clusters.get(key) ?? 0) + 1);
  }
  const rankedClusters = [...clusters.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  lines.push('');
  lines.push('## Top-300 uncovered cards — oracle-template clusters (15 largest)');
  lines.push('');
  lines.push('| cluster | count |');
  lines.push('|---|---:|');
  for (const [k, v] of rankedClusters) lines.push(`| ${k} | ${v} |`);

  const runtimeMs = Date.now() - t0;
  lines.push('');
  lines.push(`Script: \`scripts/deck-score-coverage-corpus.ts\`. Runtime: ${(runtimeMs / 1000).toFixed(1)}s.`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const csvRows = ['name,copies,lists,status,oracle_first_80'];
  for (const r of uncoveredCombined.slice(0, 5000)) {
    const oracle = r.oracle.replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
    csvRows.push(`"${r.name.replace(/"/g, '""')}",${r.copies},${r.lists},${r.status},"${oracle}"`);
  }
  fs.writeFileSync(OUT_CSV, csvRows.join('\n') + '\n', 'utf-8');

  console.log(lines.join('\n'));
  console.log(`\nwrote ${OUT_CSV} (${uncoveredCombined.slice(0, 5000).length} rows)`);
}

main();
