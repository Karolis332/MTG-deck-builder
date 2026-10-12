import Database from 'better-sqlite3';
import fs from 'fs';
import { classifyCard } from '../../../../src/lib/card-classifier';
const db = new Database('C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data/mtg-deck-builder.db', { readonly: true });
const names = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/).map((l) => l.replace(/^\d+x?\s+/, '').trim()).filter((n) => n && n !== 'Commander' && n !== 'Deck' && n !== 'Island');
for (const n of names) {
  const c: any = db.prepare('select name, oracle_text, type_line, cmc from cards where name = ? or name like ? limit 1').get(n, n + ' // %');
  if (!c) { console.log('?? ' + n); continue; }
  const r = classifyCard(c.name, c.oracle_text || '', c.type_line, c.cmc).filter((x: string) => ['ramp', 'draw', 'removal', 'board_wipe', 'protection'].includes(x));
  if (r.length) console.log(`${r.join(',')}\t${n}`);
}
