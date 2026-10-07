import fs from 'fs';
import { getDb } from '../../src/lib/db';
const db = getDb();
const names = new Set<string>();
const files = ['decks/paper/collection.txt', ...fs.readdirSync('decks/paper/decks').map(f => 'decks/paper/decks/' + f)];
for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = /^(\d+)\s+(.+?)(?:\s*\([A-Za-z0-9]{2,6}\)\s*\S+)?$/.exec(l.trim()); if (m) names.add(m[2]); }
const q = db.prepare("select name, type_line, color_identity, legalities from cards where (name = ? or name like ?) and layout not in ('art_series','token') order by length(name) limit 1");
let paper = 0; const cmd: string[] = []; let miss = 0;
for (const n of names) { const c = q.get(n, n + ' // %') as any; if (!c) { miss++; continue; } paper++;
  const leg = /Legendary/.test(c.type_line) && /Creature/.test(c.type_line); const legal = (() => { try { return JSON.parse(c.legalities).commander === 'legal'; } catch { return false; } })();
  if (leg && legal) cmd.push(c.name + ' ' + c.color_identity); }
console.log('paper unique', paper, 'miss', miss, 'commanders', cmd.length);
const ar = db.prepare("select count(distinct c.name) n from collection col join cards c on c.id = col.card_id where col.source='arena' and col.user_id=1").get() as any;
const arc = db.prepare("select count(distinct c.name) n from collection col join cards c on c.id = col.card_id where col.source='arena' and col.user_id=1 and c.type_line like 'Legendary%Creature%'").get() as any;
console.log('arena unique', ar.n, 'arena legendary creatures', arc.n);
