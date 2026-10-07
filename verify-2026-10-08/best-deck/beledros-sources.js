const fs = require('fs'), path = require('path');
const parse = (t) => { const o = []; for (const l of t.split(/\r?\n/)) { const m = l.match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]{3,5}\).*)?$/); if (m) for (let i = 0; i < +m[1]; i++) o.push(m[2].trim()); } return o; };
const count = (arr) => { const m = new Map(); arr.forEach((n) => m.set(n, (m.get(n) ?? 0) + 1)); return m; };
const BASIC = new Set(['Swamp', 'Forest', 'Plains', 'Island', 'Mountain', 'Wastes']);
const bel = count(parse(fs.readFileSync('verify-2026-10-07/best-deck/FINAL-beledros-witherbloom.txt', 'utf8')).filter((n) => !BASIC.has(n)));
const coll = count(parse(fs.readFileSync('decks/paper/collection.txt', 'utf8')));
const dir = 'decks/paper/decks';
const decks = Object.fromEntries(fs.readdirSync(dir).map((f) => [f.replace('.txt', ''), count(parse(fs.readFileSync(path.join(dir, f), 'utf8')))]));
const MEREN = 'meren-of-clan-nel-toth';
const rows = [];
for (const [name, need] of bel) {
  const used = Object.entries(decks).map(([d, m]) => [d, m.get(name) ?? 0]).filter(([, q]) => q > 0);
  const usedTotal = used.reduce((s, [, q]) => s + q, 0);
  const owned = Math.max(coll.get(name) ?? 0, usedTotal);
  const usedElsewhere = used.filter(([d]) => d !== MEREN).reduce((s, [, q]) => s + q, 0);
  const free = owned - usedElsewhere; // Meren is dismantled, so its copies count as free
  const inMeren = (decks[MEREN].get(name) ?? 0) > 0;
  const src = free >= need ? (inMeren ? 'Meren' : 'loose') : `CONFLICT: only ${free} free, in ${used.filter(([d]) => d !== MEREN).map(([d, q]) => `${d}×${q}`).join(', ')}`;
  rows.push({ name, need, owned, usedElsewhere, free, inMeren, src });
}
const by = (k) => rows.filter((r) => r.src === k).map((r) => r.name);
console.log('FROM MEREN (' + by('Meren').length + '):', by('Meren').join(', '));
console.log('\nLOOSE (' + by('loose').length + '):', by('loose').join(', '));
const conf = rows.filter((r) => r.src.startsWith('CONFLICT'));
console.log('\nCONFLICTS (' + conf.length + '):'); conf.forEach((r) => console.log('  ' + r.name + ' — owned ' + r.owned + ', ' + r.src));
