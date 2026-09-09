/**
 * Owned-card pool for one commander: every card in the paper collection whose colour identity fits,
 * minus copies already committed to other lists, with the corpus numbers for that commander.
 *
 *   npx tsx scripts/paper-pool.ts "<commander name>" [--reserve list.txt,...] [--mark K=list.txt,...] [--min-inc 0.02]
 *
 * --reserve: lists whose cards are spoken for (one copy each is subtracted from the pool).
 * --mark:    lists to flag membership in (single-letter key), e.g. I=decks/paper/decks/imotekh-the-stormlord.txt
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';

const args = process.argv.slice(2);
const commander = args[0];
if (!commander) { console.error('usage: paper-pool.ts "<commander>" [--reserve a.txt,b.txt] [--mark K=a.txt,...] [--min-inc 0.02]'); process.exit(1); }
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const reserve = (opt('--reserve') || '').split(',').filter(Boolean);
const marks = (opt('--mark') || '').split(',').filter(Boolean).map((m) => { const [k, f] = m.split('='); return { k, names: new Set(readList(f).map((r) => r.name)) }; });
const minInc = Number(opt('--min-inc') || 0);

function readList(file: string): { name: string; qty: number }[] {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^(Commander|Deck|Sideboard)$/i.test(l))
    .map((l) => /^(\d+)\s+(.+?)(?:\s*\([A-Za-z0-9]{2,6}\)\s*\S+)?$/.exec(l)).filter(Boolean).map((m) => ({ name: m![2], qty: +m![1] }));
}
const face = (n: string) => n.split(' // ')[0];
const db = getDb();
const cmdRow = db.prepare("select color_identity from cards where (name = ? or name like ?) and layout not in ('art_series','token') limit 1").get(commander, commander + ' // %') as { color_identity: string } | undefined;
if (!cmdRow) { console.error('commander not found: ' + commander); process.exit(1); }
const identity = new Set<string>(JSON.parse(cmdRow.color_identity || '[]'));
const cardQ = db.prepare(`select name, cmc, mana_cost, type_line, oracle_text, color_identity, edhrec_rank, min(cast(price_usd as real)) as price
  from cards where (name = ? or name like ?) and layout not in ('art_series','token') and price_usd is not null group by name order by length(name) limit 1`);
const cardQ2 = db.prepare("select name, cmc, mana_cost, type_line, oracle_text, color_identity, edhrec_rank, null as price from cards where (name = ? or name like ?) and layout not in ('art_series','token') order by length(name) limit 1");
const statsFile = path.resolve(__dirname, '..', 'data', 'corpus-stats.json');
const stats: Record<string, [number, number | null]> = fs.existsSync(statsFile) ? (JSON.parse(fs.readFileSync(statsFile, 'utf8'))[commander] || {}) : {};

const owned = new Map<string, number>();
for (const r of readList(path.resolve(__dirname, '..', 'decks', 'paper', 'collection.txt'))) owned.set(r.name, (owned.get(r.name) || 0) + r.qty);
const reserved = new Map<string, number>();
for (const f of reserve) for (const r of readList(f)) if (!/^(Plains|Island|Swamp|Mountain|Forest|Wastes)$/.test(r.name)) reserved.set(r.name, (reserved.get(r.name) || 0) + r.qty);

type Row = { name: string; qty: number; cmc: number; mana: string; type: string; oracle: string; inc: number | null; lift: number | null; rank: number | null; price: number | null; marks: string };
const rows: Row[] = [];
for (const [name, qty] of owned) {
  if (/^(Plains|Island|Swamp|Mountain|Forest|Wastes)$/.test(name)) continue;
  const free = qty - (reserved.get(name) || 0);
  if (free <= 0) continue;
  const c = (cardQ.get(name, name + ' // %') || cardQ2.get(name, name + ' // %')) as { name: string; cmc: number; mana_cost: string; type_line: string; oracle_text: string; color_identity: string; edhrec_rank: number | null; price: number | null } | undefined;
  if (!c) { console.error('unresolved: ' + name); continue; }
  const ci: string[] = JSON.parse(c.color_identity || '[]');
  if (!ci.every((x) => identity.has(x))) continue;
  const s = stats[c.name] || stats[face(c.name)];
  if (minInc && (!s || s[0] < minInc)) continue;
  rows.push({ name: c.name, qty: free, cmc: c.cmc, mana: c.mana_cost || '', type: c.type_line.split(' // ')[0].replace(/^Legendary /, 'L.').replace(/Artifact/, 'Art').replace(/Creature/, 'Cr').replace(/Enchantment/, 'Ench').replace(/Instant/, 'Inst').replace(/Sorcery/, 'Sorc'),
    oracle: (c.oracle_text || '').replace(/\s+/g, ' ').slice(0, 110), inc: s ? s[0] : null, lift: s ? s[1] : null, rank: c.edhrec_rank, price: c.price, marks: marks.filter((m) => m.names.has(c.name) || m.names.has(face(c.name))).map((m) => m.k).join('') });
}
rows.sort((a, b) => (b.inc ?? -1) - (a.inc ?? -1) || a.cmc - b.cmc);
const pct = (v: number | null) => (v == null ? '  -  ' : (v * 100).toFixed(1).padStart(5));
console.log(`${commander} — identity ${[...identity].join('') || 'C'} — ${rows.length} candidates (collection ${owned.size} names, reserved ${reserved.size})`);
console.log('inc%  lift  mv  rank   $     mk  name | type | oracle');
for (const r of rows) console.log(`${pct(r.inc)} ${r.lift == null ? '  - ' : (r.lift >= 0 ? '+' : '') + r.lift.toFixed(1).padStart(3)}  ${String(r.cmc).padStart(2)} ${String(r.rank ?? '-').padStart(6)} ${r.price == null ? '   - ' : r.price.toFixed(1).padStart(5)}  ${r.marks.padEnd(3)} ${r.qty > 1 ? r.qty + 'x ' : ''}${r.name} | ${r.type} | ${r.oracle}`);
