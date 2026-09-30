// Diff two acceptance-p1 output dirs: per build, cards out/in (role, score), role-count deltas, margins.
//   npx tsx verify-2026-09-30/p1/diff-p1.ts <dirA> <dirB> [label]
import fs from 'fs';
import path from 'path';

const [A, B, ONLY] = process.argv.slice(2);
type Card = { q: number; name: string; role: string; score: number };
type Margin = { picked: string; pickedScore: number; bench: string; benchScore: number; margin: number };
type Out = { metrics: Record<string, any>; margins: Record<string, Margin>; planMargins?: Record<string, Margin>; cards: Card[] };

for (const file of fs.readdirSync(B).filter((f) => f.endsWith('.json')).sort()) {
  const label = file.replace(/\.json$/, '');
  if (ONLY && label !== ONLY) continue;
  const b: Out = JSON.parse(fs.readFileSync(path.join(B, file), 'utf8'));
  const aPath = path.join(A, file);
  if (!fs.existsSync(aPath)) { console.log(`\n## ${label}: no baseline`); continue; }
  const a: Out = JSON.parse(fs.readFileSync(aPath, 'utf8'));
  const key = (c: Card) => `${c.name}`;
  const aMap = new Map(a.cards.map((c) => [key(c), c]));
  const bMap = new Map(b.cards.map((c) => [key(c), c]));
  const out = a.cards.filter((c) => !bMap.has(key(c)) || bMap.get(key(c))!.q < c.q);
  const inn = b.cards.filter((c) => !aMap.has(key(c)) || aMap.get(key(c))!.q < c.q);
  const roles = new Set([...Object.keys(a.metrics.roleCounts), ...Object.keys(b.metrics.roleCounts)]);
  const roleDelta = [...roles].map((r) => `${r} ${a.metrics.roleCounts[r] ?? 0}->${b.metrics.roleCounts[r] ?? 0}`).join(', ');
  console.log(`\n## ${label} (${b.metrics.strategy}) size ${a.metrics.size}->${b.metrics.size} lands ${a.metrics.lands}->${b.metrics.lands} ms ${a.metrics.ms}->${b.metrics.ms} maxMargin ${a.metrics.maxMargin}->${b.metrics.maxMargin} planMargin ${a.metrics.planMargin}->${b.metrics.planMargin} sources ${JSON.stringify(b.metrics.sources)} dupes ${JSON.stringify(b.metrics.arenaDupes)} ways ${a.metrics.ways}->${b.metrics.ways} slime ${a.metrics.slime}->${b.metrics.slime}`);
  console.log(`roles: ${roleDelta}`);
  console.log(`OUT (${out.length}): ${out.map((c) => `${c.q > 1 ? c.q + 'x ' : ''}${c.name} [${c.role} ${c.score}]`).join(' · ')}`);
  console.log(`IN  (${inn.length}): ${inn.map((c) => `${c.q > 1 ? c.q + 'x ' : ''}${c.name} [${c.role} ${c.score}]`).join(' · ')}`);
  const worst = Object.entries(b.planMargins ?? b.margins).sort((x, y) => y[1].margin - x[1].margin).slice(0, 4)
    .map(([r, m]) => `${r}: bench ${m.bench} ${m.benchScore} vs picked ${m.picked} ${m.pickedScore} (+${m.margin})`).join(' | ');
  console.log(`margins: ${worst}`);
}
