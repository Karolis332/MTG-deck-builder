// node mk.cjs base.txt out.txt "-3 Craterclaw Colossus" "+3 Craterhoof Behemoth" ... -> writes a variant list
const fs = require('fs');
const [base, out, ...mods] = process.argv.slice(2);
const m = new Map();
for (const l of fs.readFileSync(base, 'utf8').split(/\r?\n/)) { const r = l.match(/^(\d+)\s+(.+?)(\s+\([A-Z0-9]+\)\s+\d+)?$/); if (r) m.set(r[2], (m.get(r[2]) || 0) + +r[1]); }
for (const md of mods) { const r = md.match(/^([+-]\d+)\s+(.+)$/); const n = (m.get(r[2]) || 0) + +r[1]; if (n < 0) throw new Error('negative ' + md); n ? m.set(r[2], n) : m.delete(r[2]); }
const total = [...m.values()].reduce((a, b) => a + b, 0);
fs.writeFileSync(out, 'Deck\n' + [...m].map(([k, v]) => v + ' ' + k).join('\n') + '\n');
if (total !== 60) console.error('WARN', out, total);
