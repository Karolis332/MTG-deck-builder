/**
 * Offline pre-rank formula comparison against the full 265-commander screen in
 * verify-2026-10-07/best-deck/paper-2 (same owned pool: loadOwned('paper'), no climb — passes:0).
 * Writes prerank-eval.md next to this file.
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../../src/lib/db';
import { loadOwned } from '../../scripts/best-deck-lib';
import { isCommander } from '../../src/lib/best-deck';

const FORMAT = 'commander';
const DIR = 'verify-2026-10-07/best-deck/paper-2';

interface ScreenRow { commander: string; seedObjective: number }
const screen = new Map<string, number>();
for (const f of fs.readdirSync(DIR).filter((x) => /^results-\d+\.jsonl$/.test(x))) {
  for (const line of fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(line) as ScreenRow;
    screen.set(r.commander, r.seedObjective);
  }
}
console.log(`full screen: ${screen.size} commanders`);

const owned = loadOwned('paper');
const ownedNames = new Set(owned.cards.map((c) => c.name));
const candidates = owned.cards.filter((c) => isCommander(c, FORMAT)).map((c) => c.name);
console.log(`candidates (owned, isCommander): ${candidates.length}, overlap with screen: ${candidates.filter((n) => screen.has(n)).length}`);

const db = getDb();
const statsStmt = db.prepare('select card_name, inclusion_rate from commander_card_stats where commander_name = ? order by inclusion_rate desc limit 120');
const rowsByCommander = new Map<string, { card_name: string; inclusion_rate: number }[]>();
for (const name of candidates) rowsByCommander.set(name, statsStmt.all(name) as { card_name: string; inclusion_rate: number }[]);

function score(rows: { card_name: string; inclusion_rate: number }[], topN: number, mode: 'raw' | 'coverage'): number {
  const slice = rows.slice(0, topN);
  const ownedSum = slice.reduce((s, r) => s + (ownedNames.has(r.card_name) ? r.inclusion_rate : 0), 0);
  if (mode === 'raw') return ownedSum;
  const totalSum = slice.reduce((s, r) => s + r.inclusion_rate, 0);
  return totalSum > 0 ? ownedSum / totalSum : 0;
}

const formulas: { name: string; fn: (name: string) => number }[] = [
  { name: '(1) raw sum, top120', fn: (n) => score(rowsByCommander.get(n) ?? [], 120, 'raw') },
  { name: '(2) coverage ratio, top120', fn: (n) => score(rowsByCommander.get(n) ?? [], 120, 'coverage') },
  { name: '(3) coverage ratio, top60', fn: (n) => score(rowsByCommander.get(n) ?? [], 60, 'coverage') },
  { name: '(4) blend: raw sum top120 * coverage top60', fn: (n) => score(rowsByCommander.get(n) ?? [], 120, 'raw') * score(rowsByCommander.get(n) ?? [], 60, 'coverage') },
  { name: '(5) raw sum, top60', fn: (n) => score(rowsByCommander.get(n) ?? [], 60, 'raw') },
  { name: '(6) blend: raw sum top120 + 0.25*coverage top60', fn: (n) => score(rowsByCommander.get(n) ?? [], 120, 'raw') + 0.25 * score(rowsByCommander.get(n) ?? [], 60, 'coverage') },
  { name: '(7) raw sum of inclusion^2, top120', fn: (n) => (rowsByCommander.get(n) ?? []).slice(0, 120).reduce((s, r) => s + (ownedNames.has(r.card_name) ? r.inclusion_rate ** 2 : 0), 0) },
];

const fullRanked = [...screen.entries()].sort((a, b) => b[1] - a[1]);
const top5 = new Set(fullRanked.slice(0, 5).map(([n]) => n));
const top10 = new Set(fullRanked.slice(0, 10).map(([n]) => n));

function spearman(xs: number[], ys: number[]): number {
  const rank = (vals: number[]): number[] => {
    const idx = vals.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array(vals.length).fill(0);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) { cov += (rx[i] - mx) * (ry[i] - my); vx += (rx[i] - mx) ** 2; vy += (ry[i] - my) ** 2; }
  return cov / Math.sqrt(vx * vy);
}

const rows: string[] = [];
for (const { name, fn } of formulas) {
  const ranked = candidates.filter((n) => screen.has(n)).map((n) => ({ n, s: fn(n) })).sort((a, b) => b.s - a.s || a.n.localeCompare(b.n));
  const top24 = new Set(ranked.slice(0, 24).map((r) => r.n));
  const recall5 = [...top5].filter((n) => top24.has(n)).length / top5.size;
  const recall10 = [...top10].filter((n) => top24.has(n)).length / top10.size;
  const common = candidates.filter((n) => screen.has(n));
  const rho = spearman(common.map(fn), common.map((n) => screen.get(n)!));
  rows.push(`| ${name} | ${(recall5 * 100).toFixed(0)}% (${[...top5].filter((n) => top24.has(n)).length}/5) | ${(recall10 * 100).toFixed(0)}% (${[...top10].filter((n) => top24.has(n)).length}/10) | ${rho.toFixed(3)} |`);
}

const md = `# Pre-rank formula comparison

Full screen: \`${DIR}\` (${screen.size} commanders, passes:0, same owned pool \`loadOwned('paper')\`).
Candidates (owned, isCommander, commander format): ${candidates.length}; overlap with the full screen: ${candidates.filter((n) => screen.has(n)).length}.
True top 5: ${[...top5].join(', ')}
True top 10: ${[...top10].join(', ')}

| formula | recall@24 (top5) | recall@24 (top10) | Spearman rho vs seedObjective |
|---|---|---|---|
${rows.join('\n')}
`;
fs.writeFileSync(path.join(__dirname, 'prerank-eval.md'), md);
console.log(md);

// Round 3: exact pre-rank positions of the two full-screen top-5 misses, under formula (1).
const rankedF1 = candidates.filter((n) => screen.has(n)).map((n) => ({ n, s: formulas[0].fn(n) })).sort((a, b) => b.s - a.s || a.n.localeCompare(b.n));
for (const name of ['Mikaeus, the Unhallowed', 'Illuminor Szeras']) {
  const pos = rankedF1.findIndex((r) => r.n === name) + 1;
  console.log(`${name}: rank ${pos} of ${rankedF1.length} (score ${rankedF1[pos - 1]?.s.toFixed(3)})`);
}
