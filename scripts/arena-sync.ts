/**
 * Arena deck tracking + sync. Runs after the log archiver (scripts/arena-log-archive.ps1) copied a
 * grown session file, or by hand:
 *
 *   MTG_DB_DIR=C:/Users/<you>/AppData/Roaming/the-black-grimoire/data npx tsx scripts/arena-sync.ts [--no-report] [--desktop <dir>]
 *
 * 1. Rebuilds every per-commander game report (scripts/arena-game-report.ts).
 * 2. Syncs decks: for each deck name the games were played under, the latest submitted list is
 *    compared with decks/arena/iterations.json. A list that differs from the version it claims
 *    ("<base> vN") is recorded as the next version (note "edited in Arena"); a name the ledger
 *    doesn't know starts a new base at v1. The repo therefore always holds what Arena plays.
 * 3. Writes decks/arena/ARENA-STATUS.md (per deck and version: games, W-L, last played) and
 *    copies it plus the reports to the Desktop deck folder.
 *
 * ponytail: the report re-parses every archived log on each run (~30 s for 100 MB); cache per
 * session file if the archive grows past a few hundred MB.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { iterationCounts, readLedger, recordIteration } from './arena-import';

const ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(process.env.APPDATA ?? '', 'the-black-grimoire', 'data', 'arena-logs');
const REPORTS_DIR = path.join(LOGS_DIR, 'reports');
const STATUS_FILE = path.join(ROOT, 'decks', 'arena', 'ARENA-STATUS.md');
const DEFAULT_DESKTOP = 'C:/Users/QuLeR/Desktop/MTG collection/MTG decks';

/** The subset of scripts/arena-game-report.ts's GameRow this script reads from the .jsonl files. */
interface GameRow {
  matchId: string;
  game: number;
  date: string | null;
  queueRaw: string | null;
  deckName: string | null;
  deckList: Array<{ name: string; qty: number }> | null;
  result: 'win' | 'loss' | 'draw' | 'incomplete';
  commanderNames: string[];
  opponentCommander: string | null;
  commanderCastOwnTurns: number[];
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function runReport(): void {
  const tsx = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!fs.existsSync(tsx)) throw new Error(`tsx not found at ${tsx} — npm install first`);
  execFileSync(process.execPath, [tsx, path.join(ROOT, 'scripts', 'arena-game-report.ts')], { cwd: ROOT, stdio: 'inherit' });
}

function readRows(): GameRow[] {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  return fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith('-games.jsonl'))
    .flatMap((f) =>
      fs
        .readFileSync(path.join(REPORTS_DIR, f), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as GameRow),
    );
}

const byDate = (a: GameRow, b: GameRow) => (a.date ?? '').localeCompare(b.date ?? '');

/** "<base> vN" → { base, v }; a plain name → { base: name, v: null }. */
function splitVersion(deckName: string): { base: string; v: number | null } {
  const m = deckName.match(/^(.*) v(\d+)$/);
  return m ? { base: m[1], v: Number(m[2]) } : { base: deckName, v: null };
}

function frontName(name: string): string {
  return name.split(' // ')[0].trim();
}

/** Submitted list → Commander / Deck text the ledger stores (commander lines pulled out of the pile). */
function toListText(row: GameRow): string {
  const commanders = new Set(row.commanderNames.map(frontName));
  const counts = new Map<string, number>();
  for (const { name, qty } of row.deckList ?? []) {
    const n = frontName(name);
    counts.set(n, (counts.get(n) ?? 0) + qty);
  }
  const cmdLines = [...commanders].map((c) => {
    const left = (counts.get(c) ?? 0) - 1;
    if (left > 0) counts.set(c, left);
    else counts.delete(c);
    return `1 ${c}`;
  });
  const deckLines = [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([n, q]) => `${q} ${n}`);
  return `Commander\n${cmdLines.join('\n')}\n\nDeck\n${deckLines.join('\n')}\n`;
}

function sameCounts(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

function countsOf(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const line of text.split('\n')) {
    const hit = line.match(/^(\d+) (.+)$/);
    if (hit) m.set(hit[2], (m.get(hit[2]) ?? 0) + Number(hit[1]));
  }
  return m;
}

interface SyncEvent { deckName: string; action: string; added: string[]; removed: string[] }

/** Arena's own placeholder names and limited-event decks: tracked in the status table, never recorded. */
const GENERIC_NAME = /^(draft deck|sealed deck|imported deck|new deck|deck)( \(\d+\))?$/i;
const LIMITED_QUEUE = /draft|sealed|cube/i;

/** Commander line(s) of a recorded iteration, for the "same name, different commander" guard. */
function iterationCommanders(file: string): string[] {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const block = text.split(/\r?\n\r?\n/).find((b) => /^commander/i.test(b.trim()));
  return (block ?? '').split(/\r?\n/).slice(1).map((l) => frontName(l.replace(/^\d+ /, '').replace(/ \([A-Z0-9]+\) \S+$/, ''))).filter(Boolean).sort();
}

/**
 * Record in-Arena edits and unknown named decks in the ledger. Skips: generic names, limited
 * queues, plays older than the ledger's newest version (the operator may have imported a newer
 * list since), and a name reused for a different commander (Arena keeps the name across edits).
 */
function syncDecks(rows: GameRow[]): SyncEvent[] {
  const events: SyncEvent[] = [];
  const skip = (deckName: string, why: string) => events.push({ deckName, action: `skipped: ${why}`, added: [], removed: [] });
  const latestByName = new Map<string, GameRow>();
  for (const r of [...rows].sort(byDate)) {
    if (!r.deckName || !r.deckList?.length || GENERIC_NAME.test(r.deckName) || LIMITED_QUEUE.test(r.queueRaw ?? '')) continue;
    latestByName.set(r.deckName, r);
  }

  for (const [deckName, row] of latestByName) {
    const { base, v } = splitVersion(deckName);
    const history = readLedger()[base] ?? [];
    const newest = history[history.length - 1];
    const claimed = v != null ? history.find((h) => h.v === v) : newest;
    const played = countsOf(toListText(row));
    const playedOn = row.date?.slice(0, 10) ?? '';
    if (claimed && sameCounts(iterationCounts(claimed), played)) continue; // plays exactly what the ledger says
    if (v != null && !claimed && history.length) {
      skip(deckName, `claims v${v}, ledger has v1..v${newest.v}`);
      continue;
    }
    if (newest && playedOn < newest.date) {
      skip(deckName, `played ${playedOn || '?'}, older than ledger v${newest.v} (${newest.date}) — not recorded`);
      continue;
    }
    const playedCommanders = row.commanderNames.map(frontName).sort();
    if (claimed && iterationCommanders(claimed.file).join('/') !== playedCommanders.join('/')) {
      skip(deckName, `name reused for commander ${playedCommanders.join(' / ') || '?'} (ledger v${claimed.v} is ${iterationCommanders(claimed.file).join(' / ')}) — not recorded`);
      continue;
    }
    const note = claimed ? `edited in Arena (played as "${deckName}" on ${playedOn || '?'})` : `synced from the Arena log (first seen ${playedOn || '?'})`;
    const res = recordIteration(base, toListText(row), { note, onlyIfCardsChanged: true });
    if (res.bumped) events.push({ deckName, action: `recorded ${res.arenaName} → ${res.entry.file}`, added: res.entry.added, removed: res.entry.removed });
  }
  return events;
}

const tally = (games: GameRow[]) => ({
  n: games.length,
  w: games.filter((g) => g.result === 'win').length,
  l: games.filter((g) => g.result === 'loss').length,
  other: games.filter((g) => g.result !== 'win' && g.result !== 'loss').length,
  last: games.map((g) => g.date?.slice(0, 10) ?? '').sort().pop() || '-',
});

function buildStatus(rows: GameRow[], events: SyncEvent[]): string {
  const ledger = readLedger();
  const byName = new Map<string, GameRow[]>();
  for (const r of rows) {
    const key = r.deckName ?? '(no deck name)';
    (byName.get(key) ?? byName.set(key, []).get(key)!).push(r);
  }
  const known = new Set<string>();
  const lines = [
    '# Arena decks — status',
    '',
    `Updated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} from ${rows.length} archived games. ` +
      'Versions come from `iterations.json`; a row marked *edited in Arena* was recorded by the sync from the log.',
    '',
    '| Deck | Version | Commander | Games | W-L | Other | Last played | Note |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const [base, history] of Object.entries(ledger)) {
    const newest = history[history.length - 1];
    known.add(base); // decks the sync pulled from Arena are played under the bare name
    for (const it of [...history].reverse()) {
      const name = `${base} v${it.v}`;
      known.add(name);
      const games = [...(byName.get(name) ?? []), ...(it === newest ? byName.get(base) ?? [] : [])];
      const t = tally(games);
      const cmdr = games[0]?.commanderNames.join(' / ') ?? '';
      lines.push(`| ${base} | v${it.v} (${it.date}) | ${cmdr} | ${t.n} | ${t.w}-${t.l} | ${t.other} | ${t.last} | ${it.note.replace(/\|/g, '/')} |`);
    }
  }
  const unknown = [...byName].filter(([name]) => !known.has(name));
  if (unknown.length) {
    lines.push('', '## Played under names the ledger does not track', '', '| Deck name | Commander | Games | W-L | Last played |', '|---|---|---|---|---|');
    for (const [name, games] of unknown.sort((a, b) => b[1].length - a[1].length)) {
      const t = tally(games);
      lines.push(`| ${name} | ${games[0]?.commanderNames.join(' / ') ?? ''} | ${t.n} | ${t.w}-${t.l} | ${t.last} |`);
    }
  }
  if (events.length) {
    lines.push('', '## This run', '');
    for (const e of events) {
      lines.push(`- ${e.deckName}: ${e.action}`);
      for (const a of e.added) lines.push(`  - + ${a}`);
      for (const r of e.removed) lines.push(`  - − ${r}`);
    }
  }
  const recent = [...rows].sort(byDate).reverse().slice(0, 15);
  lines.push('', '## Last 15 games', '', '| Date | Deck | Result | Cmdr cast | Opponent |', '|---|---|---|---|---|');
  for (const g of recent) {
    lines.push(`| ${g.date?.slice(0, 10) ?? '?'} | ${g.deckName ?? '?'} | ${g.result} | ${g.commanderCastOwnTurns[0] ?? '-'} | ${g.opponentCommander ?? '?'} |`);
  }
  return lines.join('\n') + '\n';
}

function copyToDesktop(desktop: string): void {
  if (!fs.existsSync(desktop)) return;
  fs.copyFileSync(STATUS_FILE, path.join(desktop, 'arena-status.md'));
  const reportsOut = path.join(desktop, 'arena-reports');
  fs.mkdirSync(reportsOut, { recursive: true });
  for (const f of fs.readdirSync(REPORTS_DIR).filter((f) => f.endsWith('.md'))) fs.copyFileSync(path.join(REPORTS_DIR, f), path.join(reportsOut, f));
}

function main(): void {
  if (!process.argv.includes('--no-report')) runReport();
  const rows = readRows();
  const events = syncDecks(rows);
  fs.writeFileSync(STATUS_FILE, buildStatus(rows, events));
  copyToDesktop(flag('desktop') ?? DEFAULT_DESKTOP);
  console.log(`arena-sync: ${rows.length} games, ${events.length} ledger event(s) → ${STATUS_FILE}`);
  for (const e of events) console.log(`  ${e.deckName}: ${e.action}`);
}

if (require.main === module) main();
