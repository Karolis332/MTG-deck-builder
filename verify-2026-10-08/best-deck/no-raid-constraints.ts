// Ban every card whose physical copies all sit in a sleeved deck other than Meren (Meren is being dismantled).
import fs from 'fs';
import path from 'path';
import { loadOwned } from '../../scripts/best-deck-lib';
const parse = (t: string): string[] => { const o: string[] = []; for (const l of t.split(/\r?\n/)) { const m = l.match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{3,5}\).*)?$/); if (m) for (let i = 0; i < +m[1]; i++) o.push(m[2].trim()); } return o; };
const count = (arr: string[]): Map<string, number> => { const m = new Map<string, number>(); arr.forEach((n) => m.set(n, (m.get(n) ?? 0) + 1)); return m; };
const front = (n: string): string => n.split(' // ')[0];
const coll = count(parse(fs.readFileSync('decks/paper/collection.txt', 'utf8')).map(front));
const dir = 'decks/paper/decks';
const decks = fs.readdirSync(dir).map((f) => [f.replace('.txt', ''), count(parse(fs.readFileSync(path.join(dir, f), 'utf8')).map(front))] as const);
const usedTotal = new Map<string, number>(), usedElsewhere = new Map<string, number>();
for (const [slug, m] of decks) for (const [n, q] of m) { usedTotal.set(n, (usedTotal.get(n) ?? 0) + q); if (slug !== 'meren-of-clan-nel-toth') usedElsewhere.set(n, (usedElsewhere.get(n) ?? 0) + q); }
const banFront = new Set([...usedElsewhere].filter(([n, q]) => Math.max(coll.get(n) ?? 0, usedTotal.get(n) ?? 0) - q <= 0).map(([n]) => n));
const owned = loadOwned('paper');
const ban = [...new Set([...owned.cards.filter((c) => banFront.has(front(c.name))).map((c) => c.name), 'Bane of Progress', 'Culling Ritual'])].sort();
fs.writeFileSync('verify-2026-10-08/best-deck/constraints-no-raid.json', JSON.stringify({ 'Beledros Witherbloom': { ban } }, null, 1));
process.stdout.write(`banned ${ban.length} names (front-face matches ${banFront.size})\n`);
