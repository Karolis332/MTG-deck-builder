// P2-L: metrics table + lands in/out (tip vs live 6791d3e and vs merged 62ccf14).
const fs = require('fs');
const path = require('path');
const D = __dirname;
const load = (dir, label) => { const p = path.join(D, dir, `${label}.json`); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const labels = ['ygra', 'krenko', 'tymna-thrasios', 'tam-arena', 'atraxa', 'aeve-arena', 'tatyova-arena', 'niv'];
const src = (m) => Object.entries(m.sources).map(([c, n]) => `${c}${n}`).join(' ');
const row = (m) => m ? `${m.size}/${m.lands}+${m.mdfcSpells}/${m.basics} | ${src(m)} | ${m.untappedShare} | ${m.honestRamp} @ ${m.avgMv}` : 'n/a';
console.log('| deck | live 6791d3e size/lands+mdfc/basics \\| sources \\| untapped \\| ramp@MV | merged 62ccf14 | tip |');
console.log('|---|---|---|---|');
for (const l of labels) {
  const a = load('out-live', l), b = load('out-merged', l), c = load('out-tip', l);
  console.log(`| ${l} (${c?.metrics.strategy ?? '?'}) | ${row(a?.metrics)} | ${row(b?.metrics)} | ${row(c?.metrics)} |`);
}
const names = (j) => new Map((j?.lands || []).map((x) => [x.name, x]));
for (const l of labels) {
  const a = names(load('out-live', l)), b = names(load('out-merged', l)), c = names(load('out-tip', l));
  const fmt = (m, n) => `${n}${m.get(n).q > 1 ? ' ×' + m.get(n).q : ''}`;
  const inVs = (base) => [...c.keys()].filter((n) => !base.has(n)).map((n) => fmt(c, n));
  const outVs = (base) => [...base.keys()].filter((n) => !c.has(n)).map((n) => fmt(base, n));
  const qtyDelta = (base) => [...c.keys()].filter((n) => base.has(n) && base.get(n).q !== c.get(n).q).map((n) => `${n} ${base.get(n).q}→${c.get(n).q}`);
  console.log(`\n## ${l}`);
  console.log(`vs merged — IN: ${inVs(b).join(', ') || '—'}\n          OUT: ${outVs(b).join(', ') || '—'}\n          qty: ${qtyDelta(b).join(', ') || '—'}`);
  console.log(`vs live   — IN: ${inVs(a).join(', ') || '—'}\n          OUT: ${outVs(a).join(', ') || '—'}\n          qty: ${qtyDelta(a).join(', ') || '—'}`);
}
