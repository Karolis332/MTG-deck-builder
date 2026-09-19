// One-off: REPLACE user 1's Arena collection from an Untapped.gg CSV export
// (Id,Name,Set,Color,Rarity,Count,PrintCount — full snapshot, 0-count rows included).
// Run: MTG_DB_DIR="C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data" npx tsx verify-2026-09-19/import-arena-csv.ts <csv>
import fs from 'fs';
import { getDb } from '../src/lib/db';

const USER_ID = 1;
const file = process.argv[2];
if (!file) { console.error('usage: import-arena-csv.ts <csv>'); process.exit(2); }

type Row = { id: number; name: string; set: string; count: number };
const LINE = /^(\d+),"((?:[^"]|"")*)",([^,]*),[^,]*,[^,]*,(\d+),\d+$/;
const rows: Row[] = [];
const badLines: string[] = [];
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).slice(1)) {
  if (!line) continue;
  const m = line.match(LINE);
  if (!m) { badLines.push(line); continue; }
  const count = Number(m[4]);
  if (count > 0) rows.push({ id: Number(m[1]), name: m[2].replace(/""/g, '"'), set: m[3], count });
}

const db = getDb();
const byArena = db.prepare('SELECT id, name FROM cards WHERE arena_id = ?');
const byNameSet = db.prepare('SELECT id FROM cards WHERE name = ? AND lower(set_code) = lower(?) LIMIT 1');
const NOT_TOKEN = "(layout IS NULL OR layout NOT IN ('token','art_series'))";
const byName = db.prepare(`SELECT id FROM cards WHERE name = ? AND ${NOT_TOKEN} LIMIT 1`);
const byFront = db.prepare(`SELECT id FROM cards WHERE name LIKE ? AND ${NOT_TOKEN} LIMIT 1`);

function resolve(r: Row): string | null {
  const a = byArena.get(r.id) as { id: string; name: string } | undefined;
  if (a && (a.name === r.name || a.name.startsWith(r.name + ' //'))) return a.id; // stale arena_id → fall through
  for (const hit of [byNameSet.get(r.name, r.set), byName.get(r.name), byFront.get(r.name + ' // %')]) {
    if (hit) return (hit as { id: string }).id;
  }
  return null;
}

const qty = new Map<string, number>(); // printings of one name may share a card row → sum
const unresolved: string[] = [];
for (const r of rows) {
  const id = resolve(r);
  if (!id) { unresolved.push(`${r.name} [${r.set}] x${r.count}`); continue; }
  qty.set(id, (qty.get(id) ?? 0) + r.count);
}

const stat = () => db.prepare("SELECT COUNT(*) AS rows, COALESCE(SUM(quantity),0) AS qty, MAX(imported_at) AS newest FROM collection WHERE user_id = ? AND source IN ('arena','arena_csv')").get(USER_ID);
console.log('BEFORE', JSON.stringify(stat()));
console.log('CSV owned rows', rows.length, '| card rows', qty.size, '| unresolved', unresolved.length, '| bad lines', badLines.length);
if (unresolved.length > rows.length * 0.02) { // ponytail: refuse to replace a good snapshot with a holey one
  console.error('too many unresolved — nothing written'); console.error(unresolved.slice(0, 20).join('\n')); process.exit(1);
}
const ins = db.prepare("INSERT INTO collection (card_id, quantity, foil, source, user_id) VALUES (?, ?, 0, 'arena', ?)");
db.transaction(() => {
  db.prepare("DELETE FROM collection WHERE user_id = ? AND source IN ('arena','arena_csv')").run(USER_ID);
  for (const [id, q] of qty) ins.run(id, q, USER_ID);
})();
console.log('AFTER', JSON.stringify(stat()));
if (unresolved.length) console.log('UNRESOLVED', unresolved.join(' | '));
const present = db.prepare("SELECT 1 FROM collection col JOIN cards c ON c.id = col.card_id WHERE col.user_id = ? AND col.source = 'arena' AND c.name = ? LIMIT 1");
for (const n of ['Aggravated Assault', 'Full Throttle', "Kozilek's Command", 'Chandra, Acolyte of Flame', 'Conduit Pylons']) {
  console.log('NAME_CHECK', n, present.get(USER_ID, n) ? 'PRESENT' : 'ABSENT');
}
