// Integrate-3 — Deck Score identity: score one decklist through deckScore
// (scoreDeckSafely) and the /analyze core (analyzeResolved), print JSON.
// Run at 6791d3e and at the merged tip on the same I3-db copy, diff the outputs.
//   cd <engineRoot> && MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/I3-db npx tsx <this> <engineRoot> <list.txt> <format>
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/I3-db';
const ENGINE_ROOT = path.resolve(process.argv[2]);
const file = path.resolve(process.argv[3]);
const format = process.argv[4] || 'commander';
const imp = (rel: string) => import(pathToFileURL(path.join(ENGINE_ROOT, rel)).href);

interface Line { name: string; quantity: number; board: string }
const lines: Line[] = [];
let board = 'main';
for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
  const line = rawLine.trim();
  if (!line) continue;
  if (/^commander$/i.test(line)) { board = 'commander'; continue; }
  if (/^(deck|main ?deck)$/i.test(line)) { board = 'main'; continue; }
  const m = line.match(/^(\d+)\s+(.+)$/);
  if (!m) continue;
  lines.push({ name: m[2].trim(), quantity: Number(m[1]), board });
}
if (!lines.some((l) => l.board === 'commander') && lines.length) lines[0].board = 'commander';

async function main() {
  const { makeCardResolver, resolveDeckLines } = await imp('services/build-api/resolve.ts');
  const { analyzeResolved } = await imp('services/build-api/analysis-core.ts');
  const { scoreDeckSafely } = await imp('src/lib/deck-score-input.ts');

  const findCard = makeCardResolver();
  const commanderName = lines.find((l) => l.board === 'commander')!.name;
  const commanderRow = findCard(commanderName);
  const { resolved, unresolved } = resolveDeckLines(lines.filter((l) => l.board !== 'commander'), findCard);
  const { payload: analyze } = analyzeResolved(commanderRow, resolved);
  const deckScore = scoreDeckSafely({
    format,
    main: resolved.filter((r: any) => r.board === 'main'),
    commander: [commanderRow],
    sideboard: resolved.filter((r: any) => r.board === 'sideboard'),
    unresolved: unresolved.slice(0, 30).map((name: string) => ({ name, quantity: 1, board: 'main' })),
  });
  console.log(JSON.stringify({ file: path.basename(file), format, unresolved, deckScore, analyze }, null, 1));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
