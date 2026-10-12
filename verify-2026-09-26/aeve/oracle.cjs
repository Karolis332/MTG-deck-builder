const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database(process.env.APPDATA + '/the-black-grimoire/data/mtg-deck-builder.db', { readonly: true });
const names = fs.readFileSync(process.argv[2], 'utf8').split('\n')
  .map(l => l.match(/^\d+\s+(.+?)(\s+\([A-Z0-9]+\)\s+\S+)?\s*$/)).filter(Boolean).map(m => m[1]);
const q = db.prepare("SELECT name, mana_cost, cmc, type_line, oracle_text FROM cards WHERE name = ? OR name LIKE ? || ' // %' LIMIT 1");
for (const n of names) {
  if (n === 'Forest') continue;
  const r = q.get(n, n);
  if (!r) { console.log(`?? ${n}`); continue; }
  console.log(`## ${r.name} ${r.mana_cost || ''} | ${r.type_line}\n${(r.oracle_text || '').replace(/\n/g, ' / ')}`);
}
