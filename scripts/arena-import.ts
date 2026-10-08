/**
 * Arena import text with a deck name and an iteration number.
 *
 *   npx tsx scripts/arena-import.ts <list.txt> --name "Tam Superfriends" [--note "why"] [--commander-first] [--no-clip]
 *
 * Writes decks/arena/<slug>-v<N>.txt as:
 *   About / Name <name> v<N> / Commander / Companion / Deck / Sideboard
 * so Arena's clipboard import lands as "<name> v<N>" instead of "Imported Deck (N)".
 * The version comes from decks/arena/iterations.json (one entry per import, with the card diff
 * vs the previous version). An unchanged card list re-emits the last version instead of bumping.
 * Card lines keep their set/collector suffix so Arena picks the same printing.
 * The text is copied to the clipboard (PowerShell Set-Clipboard, Unicode-safe) unless --no-clip.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { frontName, parseDecklist } from '../src/lib/deck-gate-parse';

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'decks', 'arena');
const LEDGER = path.join(OUT_DIR, 'iterations.json');
const SECTIONS = ['Commander', 'Companion', 'Deck', 'Sideboard'] as const;
type Section = (typeof SECTIONS)[number];
const ARENA_NAME_SOFT_LIMIT = 40;

interface Iteration {
  v: number;
  date: string;
  file: string;
  note: string;
  added: string[];
  removed: string[];
}
type Ledger = Record<string, Iteration[]>;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

/** Split a list into Arena sections, keeping each card line as typed. */
export function splitSections(text: string, commanderFirst: boolean): Record<Section, string[]> {
  const out: Record<Section, string[]> = { Commander: [], Companion: [], Deck: [], Sideboard: [] };
  let current: Section = 'Deck';
  let sawHeader = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    const header = line.match(/^(about|commander|companion|deck|sideboard)s?:?$/i);
    if (header) {
      sawHeader = true;
      const h = header[1].toLowerCase();
      current = h === 'about' ? 'Deck' : ((h[0].toUpperCase() + h.slice(1)) as Section);
      continue;
    }
    if (/^name\s/i.test(line)) continue; // old About/Name block
    out[current].push(/^\d+x?\s/.test(line) ? line.replace(/^(\d+)x\s/, '$1 ') : `1 ${line}`);
  }
  if (!sawHeader && commanderFirst && out.Deck.length) out.Commander.push(out.Deck.shift()!);
  if (!sawHeader && !commanderFirst) console.warn('warning: no section headers — every card goes to Deck; pass --commander-first for a commander list');
  return out;
}

/** Front-face name → total quantity, set codes stripped, for diffing iterations. */
function cardCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const l of parseDecklist(text)) {
    const name = frontName(l.name);
    counts.set(name, (counts.get(name) ?? 0) + l.quantity);
  }
  return counts;
}

/** Order-free fingerprint of the card lines, printings included (a printing swap is a new version). */
function fingerprint(sections: Record<Section, string[]>): string {
  return SECTIONS.map((s) => `${s}:${[...sections[s]].sort().join('|')}`).join('\n');
}

function diff(prev: Map<string, number>, next: Map<string, number>): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  for (const [name, n] of next) if (n > (prev.get(name) ?? 0)) added.push(`${n - (prev.get(name) ?? 0)} ${name}`);
  for (const [name, n] of prev) if (n > (next.get(name) ?? 0)) removed.push(`${n - (next.get(name) ?? 0)} ${name}`);
  return { added, removed };
}

function render(arenaName: string, sections: Record<Section, string[]>): string {
  const blocks = [`About\nName ${arenaName}`];
  for (const s of SECTIONS) if (sections[s].length) blocks.push(`${s}\n${sections[s].join('\n')}`);
  return blocks.join('\n\n') + '\n';
}

function copyToClipboard(file: string): void {
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Get-Content -Raw -Encoding UTF8 -LiteralPath '${file.replace(/'/g, "''")}' | Set-Clipboard`,
  ]);
}

export function readLedger(): Ledger {
  return fs.existsSync(LEDGER) ? (JSON.parse(fs.readFileSync(LEDGER, 'utf8')) as Ledger) : {};
}

/** Front-face card counts of a recorded iteration (set codes stripped). */
export function iterationCounts(entry: Iteration): Map<string, number> {
  return cardCounts(fs.readFileSync(path.join(ROOT, entry.file), 'utf8'));
}

export interface RecordResult {
  entry: Iteration;
  /** false = the card lines matched the last version, which is re-emitted */
  bumped: boolean;
  arenaName: string;
  /** absolute path of the iteration file */
  file: string;
  cards: number;
}

/**
 * Record `text` as the next iteration of `name`, or re-emit the last one when nothing changed.
 * `onlyIfCardsChanged`: compare front-face card counts only (printings/sections ignored) — for
 * lists that come back from the Arena log without set codes.
 */
export function recordIteration(
  name: string,
  text: string,
  opts: { note?: string; commanderFirst?: boolean; onlyIfCardsChanged?: boolean } = {},
): RecordResult {
  const sections = splitSections(text, opts.commanderFirst ?? false);
  const cards = SECTIONS.flatMap((s) => sections[s]);
  if (!cards.length) throw new Error(`no card lines for "${name}"`);
  const cardTotal = cards.reduce((n, l) => n + Number(l.split(' ')[0]), 0);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ledger = readLedger();
  const history = ledger[name] ?? [];
  const last = history[history.length - 1];
  const lastText = last ? fs.readFileSync(path.join(ROOT, last.file), 'utf8') : '';
  const { added, removed } = last
    ? diff(cardCounts(lastText), cardCounts(cards.join('\n')))
    : { added: [], removed: [] }; // v1 is the baseline, not a diff

  const unchanged = last && (opts.onlyIfCardsChanged
    ? !added.length && !removed.length
    : fingerprint(splitSections(lastText, false)) === fingerprint(sections));
  if (last && unchanged) {
    return { entry: last, bumped: false, arenaName: `${name} v${last.v}`, file: path.join(ROOT, last.file), cards: cardTotal };
  }

  const v = (last?.v ?? 0) + 1;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = path.posix.join('decks', 'arena', `${slug}-v${v}.txt`);
  const entry: Iteration = { v, date: new Date().toISOString().slice(0, 10), file, note: opts.note ?? '', added, removed };
  fs.writeFileSync(path.join(ROOT, file), render(`${name} v${v}`, sections));
  fs.writeFileSync(LEDGER, JSON.stringify({ ...ledger, [name]: [...history, entry] }, null, 2) + '\n');
  return { entry, bumped: true, arenaName: `${name} v${v}`, file: path.join(ROOT, file), cards: cardTotal };
}

function main(): void {
  const args = process.argv.slice(2);
  const listPath = args[0];
  const name = flag(args, 'name')?.trim();
  if (!listPath || listPath.startsWith('--') || !name) {
    console.error('usage: npx tsx scripts/arena-import.ts <list.txt> --name "<deck name>" [--note "why"] [--commander-first] [--no-clip]');
    process.exit(2);
  }
  const text = fs.readFileSync(listPath, 'utf8');
  const result = recordIteration(name, text, { note: flag(args, 'note'), commanderFirst: args.includes('--commander-first') });
  const { entry, bumped, arenaName } = result;

  if (!bumped) console.log(`unchanged vs v${entry.v} — re-emitting it`);
  else if (entry.v > 1 && !entry.added.length && !entry.removed.length) console.log('same cards, different printings or sections');
  if (arenaName.length > ARENA_NAME_SOFT_LIMIT) console.warn(`warning: "${arenaName}" is ${arenaName.length} chars; Arena may truncate it`);
  console.log(`${arenaName} → ${entry.file} (${result.cards} cards)`);
  if (bumped && entry.v > 1) {
    for (const a of entry.added) console.log(`  + ${a}`);
    for (const r of entry.removed) console.log(`  - ${r}`);
  }
  if (!args.includes('--no-clip')) {
    copyToClipboard(result.file);
    console.log('copied to clipboard — Arena: Decks → Import');
  }
}

if (require.main === module) main();
