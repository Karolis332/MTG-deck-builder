import fs from 'fs';
import { getDb } from '../../src/lib/db';
const db = getDb();
const q = db.prepare("select name, legalities, color_identity from cards where (name = ? or name like ?) and layout not in ('art_series','token') order by (arena_id is null), length(name) limit 1");
for (const f of fs.readdirSync('decks/paper/decks')) {
  const lines = fs.readFileSync('decks/paper/decks/' + f, 'utf8').split(/\r?\n/).map(l => /^(\d+)\s+(.+?)(?:\s*\([A-Za-z0-9]{2,6}\)\s*\S+)?$/.exec(l.trim())).filter(Boolean) as RegExpExecArray[];
  const total = lines.reduce((s, m) => s + +m[1], 0);
  const bad = lines.filter(m => { const c = q.get(m[2], m[2] + ' // %') as any; return !c || JSON.parse(c.legalities).commander !== 'legal'; }).map(m => m[2]);
  console.log(f, 'lines', lines.length, 'cards', total, 'bad', bad.join('; '));
}
