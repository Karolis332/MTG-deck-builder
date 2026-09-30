// U9b — score one decklist .txt through Deck Score, printing the payload as
// JSON. Run at two revisions (b82d099 and the hotfix tip) on the same DB
// copy and diff stdout — the default (no-opts) analyzeCommander path must be
// identical, so the payload must be byte-identical.
import fs from 'node:fs';
import path from 'node:path';
import { makeCardResolver } from '../../services/build-api/resolve';
import { scoreDeckSafely } from '../../src/lib/deck-score-input';

const file = process.argv[2];
if (!file) { console.error('usage: tsx score-list.ts <path.txt>'); process.exit(1); }
const raw = fs.readFileSync(path.resolve(file), 'utf8');

interface Line { name: string; quantity: number; board: string }
const lines: Line[] = [];
let board = 'main';
for (const rawLine of raw.split('\n')) {
  const line = rawLine.trim();
  if (!line) continue;
  if (/^commander$/i.test(line)) { board = 'commander'; continue; }
  if (/^deck$/i.test(line)) { board = 'main'; continue; }
  const m = line.match(/^(\d+)\s+(.+)$/);
  if (!m) continue;
  lines.push({ name: m[2].trim(), quantity: Number(m[1]), board });
}
// Paper decks (no Commander/Deck headers) list the commander as line 1.
if (!lines.some((l) => l.board === 'commander') && lines.length) {
  lines[0].board = 'commander';
}

const findCard = makeCardResolver();
const unresolved: string[] = [];
const commander: ReturnType<typeof findCard>[] = [];
const main: { card: NonNullable<ReturnType<typeof findCard>>; quantity: number }[] = [];
for (const l of lines) {
  const card = findCard(l.name);
  if (!card) { unresolved.push(l.name); continue; }
  if (l.board === 'commander') commander.push(card);
  else main.push({ card, quantity: l.quantity });
}

const payload = scoreDeckSafely({
  format: 'commander',
  main,
  commander: commander.filter((c): c is NonNullable<typeof c> => !!c),
  unresolved: unresolved.map((name) => ({ name, quantity: 1, board: 'main' })),
});

console.log(JSON.stringify({ file: path.basename(file), unresolved, payload }, null, 2));
