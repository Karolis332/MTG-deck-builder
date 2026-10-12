// Integrate-2 — per-deck metrics table + cards in/out between two build-all.ts output dirs.
//   node verify-2026-09-30/i2/diff.cjs <baseDir> <tipDir>
const fs = require('fs');
const path = require('path');
const [baseDir, tipDir] = process.argv.slice(2).map((p) => path.resolve(p));
const labels = fs.readdirSync(baseDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
const fmt = (m) => `${m.strategy}${m.tribal ? '/' + m.tribal : ''} | ${m.size}/${m.lands}/${m.basics} | ramp ${m.honestRamp} draw ${m.draw} | rem ${m.removal} wipe ${m.wipes} prot ${m.protection} win ${m.wincons} tut ${m.tutors} | pw ${m.walkers} ways ${m.ways} | edh ${m.fromEdhrec} | ${m.ms} ms`;
const row = (c) => `${c.q > 1 ? c.q + 'x ' : ''}${c.name} [${c.primary}${c.role ? '/' + c.role : ''} s${c.score}${c.edhrec ? ' E' : ''}]`;
console.log('| deck | 6791d3e | merged tip |');
console.log('|---|---|---|');
const details = [];
for (const label of labels) {
  const b = JSON.parse(fs.readFileSync(path.join(baseDir, `${label}.json`), 'utf8'));
  const tf = path.join(tipDir, `${label}.json`);
  if (!fs.existsSync(tf)) { console.log(`| ${label} | ${fmt(b.metrics)} | MISSING |`); continue; }
  const t = JSON.parse(fs.readFileSync(tf, 'utf8'));
  console.log(`| ${label} | ${fmt(b.metrics)} | ${fmt(t.metrics)} |`);
  const bn = new Map(b.cards.map((c) => [c.name, c]));
  const tn = new Map(t.cards.map((c) => [c.name, c]));
  const out = b.cards.filter((c) => !tn.has(c.name) || tn.get(c.name).q < c.q);
  const inn = t.cards.filter((c) => !bn.has(c.name) || bn.get(c.name).q < c.q);
  details.push(`\n### ${label} — ${b.metrics.strategy} → ${t.metrics.strategy}; sources ${JSON.stringify(b.metrics.sources)} → ${JSON.stringify(t.metrics.sources)}; edhrec ${JSON.stringify(b.metrics.edhrec)} → ${JSON.stringify(t.metrics.edhrec)}`);
  details.push(`OUT (${out.length}): ${out.map(row).join(' · ')}`);
  details.push(`IN (${inn.length}): ${inn.map(row).join(' · ')}`);
}
console.log(details.join('\n'));
