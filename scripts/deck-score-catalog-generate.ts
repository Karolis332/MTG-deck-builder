/**
 * Deck Score v1.2 — compile the generated catalogue shard.
 * docs/DECK_SCORE_SPEC.md §1 "generate simple cases from oracle text and
 * types".
 *
 *   MTG_DB_DIR=... npx tsx scripts/deck-score-catalog-generate.ts [--stats]
 *
 * `generateEntry` needs mana value, type line and printed power, none of
 * which reach the loader (`catalogFacts(name, oracleText)`), so the shard is
 * compiled offline over the card universe of the reference corpora and
 * emitted as plain data to `src/lib/deck-score-catalog/entries/generated.ts`.
 * Re-run it whenever card data or the parser changes; entries whose live
 * oracle text drifts are reported as stale by `deck-score-coverage.ts`.
 *
 * `--stats` prints the untyped-sentence histogram instead of writing, which
 * is how the atom table was extended.
 */
import fs from 'fs';
import path from 'path';
import { generateEntry, type GeneratableCard } from '../src/lib/deck-score-catalog/generate';
import type { CatalogEntry } from '../src/lib/deck-score-catalog/schema';
import { ROOT, loadDataset } from './deck-score-fixtures';

const ENTRY_DIR = path.join(ROOT, 'src', 'lib', 'deck-score-catalog', 'entries');
const KNOWN_FILE = path.join(ENTRY_DIR, 'generated.json');
const PARTIAL_FILE = path.join(ENTRY_DIR, 'generated-partial.json');

/** Every distinct card in the reference corpora INCLUDING the random piles:
 * an uncovered card earns no on-plan credit, so leaving the pile pool untyped
 * lets the pile target be met through ignorance rather than incoherence. */
function universe(): GeneratableCard[] {
  const data = loadDataset(200);
  const byName = new Map<string, GeneratableCard>();
  const add = (card: GeneratableCard): void => { if (!byName.has(card.name)) byName.set(card.name, card); };
  for (const fixture of data.fixtures) {
    for (const e of fixture.input.main) add(e.card);
    for (const c of fixture.input.commander) add(c);
  }
  for (const input of data.cedh) {
    for (const e of input.main) add(e.card);
    for (const c of input.commander) add(c);
  }
  for (const row of [...data.standardPositive, ...data.standardNegative]) {
    for (const e of row.input.main) add(e.card);
  }
  for (const input of data.piles) {
    for (const e of input.main) add(e.card);
    for (const c of input.commander) add(c);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * `known` and `partial` go to separate files. Only `known` can ever count as
 * coverage, so it is the only shard the loader (and therefore the app bundle)
 * needs; `partial` exists for the coverage tool's provenance split and its
 * `--queue` output, and it carries the verbatim untyped sentences, which is
 * most of the bytes.
 */
function write(file: string, entries: CatalogEntry[]): void {
  fs.writeFileSync(file, JSON.stringify(entries), 'utf-8');
  console.log(`wrote ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${entries.length} entries)`);
}

function stats(entries: CatalogEntry[]): void {
  const heads = new Map<string, { count: number; sample: string }>();
  for (const entry of entries) {
    for (const sentence of entry.untyped ?? []) {
      const head = sentence.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
      const row = heads.get(head) ?? { count: 0, sample: sentence };
      row.count += 1;
      heads.set(head, row);
    }
  }
  const ranked = [...heads.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 45);
  for (const [head, row] of ranked) console.log(String(row.count).padStart(4), head, '::', row.sample.slice(0, 110));
}

function main(): void {
  const cards = universe();
  const entries = cards.map((card) => generateEntry(card));
  const known = entries.filter((e) => e.knowledge === 'known').length;
  console.log(`cards ${cards.length} · known ${known} (${((known / cards.length) * 100).toFixed(1)}%) · partial ${entries.length - known}`);

  if (process.argv.includes('--stats')) { stats(entries); return; }

  write(KNOWN_FILE, entries.filter((e) => e.knowledge === 'known'));
  write(PARTIAL_FILE, entries.filter((e) => e.knowledge !== 'known'));
}

main();
