/**
 * Visual decklist page: every card as an image, grouped by what it does in the deck, with the
 * corpus number for the commander, a curve bar and colour-source line, and tick boxes to track
 * sleeving (remembered by the browser).
 *
 *   npx tsx scripts/deck-view.ts decks/paper/proposals/tazri-final.txt "Tazri, Beacon of Unity" [out.html ...]
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { classifyCard, getPrimaryCategory } from '../src/lib/card-classifier';
import { optimizeDeck } from '../services/build-api/optimize';

const [listFile, commanderName, ...outs] = process.argv.slice(2);
if (!listFile || !commanderName) { console.error('usage: deck-view.ts <list.txt> "<commander name>" [out.html ...]'); process.exit(1); }

const db = getDb();
const cardQ = db.prepare("select name, cmc, mana_cost, type_line, oracle_text, image_uri_normal from cards where (name = ? or name like ?) and layout not in ('art_series','token') order by length(name) limit 1");
const statsFile = path.resolve(__dirname, '..', 'data', 'corpus-stats.json');
const stats: Record<string, [number, number | null]> = fs.existsSync(statsFile) ? (JSON.parse(fs.readFileSync(statsFile, 'utf8'))[commanderName] || {}) : {};
const face = (n: string) => n.split(' // ')[0];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const NL = String.fromCharCode(10);

interface Row { name: string; qty: number; cmc: number; mana: string; type: string; oracle: string; img: string; role: string; isLand: boolean; inc: number | null; lift: number | null }
const lines = fs.readFileSync(listFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^(Commander|Deck|Sideboard)$/i.test(l));
const rows: Row[] = [];
for (const l of lines) {
  const m = /^(\d+)\s+(.+?)(?:\s*\([A-Za-z0-9]{2,6}\)\s*\S+)?$/.exec(l); if (!m) continue;
  const c = cardQ.get(m[2], m[2] + ' // %') as { name: string; cmc: number; mana_cost: string; type_line: string; oracle_text: string; image_uri_normal: string } | undefined;
  if (!c) { console.error('unresolved: ' + m[2]); continue; }
  const front = c.type_line.split(' // ')[0];
  const isLand = /Land/.test(front);
  const role = isLand ? 'land' : getPrimaryCategory(classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0));
  const s = stats[c.name] || stats[face(c.name)];
  rows.push({ name: c.name, qty: +m[1], cmc: c.cmc, mana: c.mana_cost || '', type: front, oracle: c.oracle_text || '', img: c.image_uri_normal, role, isLand, inc: s ? s[0] : null, lift: s ? s[1] : null });
}
const commander = rows.find((r) => face(r.name) === face(commanderName)) || rows[0];
const main = rows.filter((r) => r !== commander);
const isCreature = (r: Row) => /Creature/.test(r.type);
const party = (r: Row) => /Cleric|Rogue|Warrior|Wizard|Shapeshifter/.test(r.type) || /changeling/i.test(r.oracle);
const venture = (r: Row) => /venture into the dungeon|take the initiative/i.test(r.oracle);
const tazri = /Tazri/.test(commanderName);
const group = (r: Row): string => {
  if (r.isLand && !isCreature(r)) return '9 Lands';
  if (tazri && venture(r) && party(r)) return '1 Party creatures that venture or take the initiative';
  if (tazri && venture(r)) return '2 Venture without a party type';
  if (tazri && isCreature(r) && party(r)) return '3 Other party creatures';
  if (/Necron/.test(r.type)) return '1 Necrons';
  if (isCreature(r)) return '4 Other creatures';
  if (r.role === 'ramp') return '5 Ramp';
  if (['removal', 'board_wipe', 'protection'].includes(r.role)) return '6 Interaction';
  if (['draw', 'tutor'].includes(r.role)) return '7 Draw and tutors';
  return '8 Other spells';
};
const groups = new Map<string, Row[]>();
for (const r of main) { const g = group(r); if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(r); }

const pct = (v: number | null) => (v == null ? '' : v < 0.01 ? '<1%' : `${Math.round(v * 100)}%`);
const lift = (v: number | null) => (v == null ? '' : ` · lift ${v >= 0 ? '+' : ''}${v.toFixed(1)}`);
const tile = (r: Row) => `<label class="card" data-name="${esc(r.name)}"><input type="checkbox"><img src="${esc(r.img)}" alt="${esc(r.name)}"><div class="meta"><b>${r.qty > 1 ? `${r.qty}× ` : ''}${esc(face(r.name))}</b><small>${r.isLand ? esc(r.type.replace(/^.*— ?/, '') || 'Land') : `${r.cmc} MV · ${esc(r.type.replace(/^.*— ?/, ''))}`}</small>${r.inc != null ? `<small>${pct(r.inc)} of ${esc(commanderName.split(',')[0])} decks${lift(r.lift)}</small>` : ''}</div></label>`;

const total = rows.reduce((t, r) => t + r.qty, 0);
const spells = main.filter((r) => !r.isLand);
const landSlots = main.filter((r) => r.isLand).reduce((t, r) => t + r.qty, 0);
const curve: Record<string, number> = {};
for (const r of spells) { const b = r.cmc >= 6 ? '6+' : String(Math.max(1, Math.round(r.cmc))); curve[b] = (curve[b] || 0) + r.qty; }
const avg = spells.length ? (spells.reduce((t, r) => t + r.cmc * r.qty, 0) / spells.reduce((t, r) => t + r.qty, 0)).toFixed(2) : '0';
const opt = optimizeDeck({ format: 'commander', cards: rows.map((r) => ({ name: face(r.name), quantity: r.qty, board: r === commander ? 'commander' : 'main' })), commanderName: face(commander.name) }) as { mana?: { demand: Record<string, number> }; landTarget?: { recommended: number } };
const pips = opt.mana ? Object.entries(opt.mana.demand).filter(([, v]) => v > 0).map(([c, v]) => `${({ W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green' } as Record<string, string>)[c] || c} ${v}`).join(', ') : '';
const maxBar = Math.max(...Object.values(curve), 1);
const curveHtml = ['1', '2', '3', '4', '5', '6+'].map((b) => `<div class="bar"><span style="height:${Math.round(((curve[b] || 0) / maxBar) * 60)}px"></span><em>${b}</em><i>${curve[b] || 0}</i></div>`).join('');

const sections = [...groups.keys()].sort().map((g) => {
  const items = groups.get(g)!.sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));
  return `<section><h2>${esc(g.slice(2))} <span class="count">${items.reduce((t, r) => t + r.qty, 0)}</span></h2><div class="grid">${items.map(tile).join('')}</div></section>`;
}).join(NL);

const css = [
  'body{margin:0;background:#15110d;color:#e8dcc4;font:15px/1.4 Georgia,serif}header{position:sticky;top:0;background:#1d1711;border-bottom:1px solid #6b5220;padding:10px 18px;display:flex;gap:18px;align-items:center;z-index:2;flex-wrap:wrap}',
  'h1{font-size:19px;margin:0;color:#d4af37;letter-spacing:.04em}h2{font-size:17px;color:#d4af37;margin:22px 18px 8px;border-bottom:1px solid #3a2d17;padding-bottom:4px}.count{font-weight:normal;font-size:13px;color:#b5a27b}',
  '.cmd{display:flex;gap:18px;align-items:flex-start;padding:14px 18px 4px}.cmd img{width:180px;border-radius:8px}.facts{font-size:14px;color:#b5a27b;line-height:1.6}.facts b{color:#e8dcc4}',
  '.curve{display:flex;gap:8px;align-items:flex-end;height:90px;margin-top:6px}.bar{display:flex;flex-direction:column;align-items:center;width:26px}.bar span{display:block;width:22px;background:#8b6914;border-radius:3px 3px 0 0}.bar em{font:11px monospace;color:#b5a27b;margin-top:2px}.bar i{font:10px monospace;color:#e8dcc4}',
  '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:0 18px}',
  '.card{display:block;background:#221b13;border:1px solid #3a2d17;border-radius:8px;padding:6px;cursor:pointer;position:relative}.card:has(input:checked){opacity:.35;filter:grayscale(1)}.card input{position:absolute;top:10px;left:10px;width:20px;height:20px;accent-color:#d4af37;z-index:1}',
  '.card img{width:100%;aspect-ratio:488/680;border-radius:6px;display:block;background:#0e0b08}.meta{padding:6px 2px 0}.meta b{display:block;font-size:13px;line-height:1.2}.meta small{color:#b5a27b;font-size:11px;display:block}',
  '#done{color:#b5a27b;font-size:13px}button{background:#2a2118;color:#e8dcc4;border:1px solid #6b5220;border-radius:6px;padding:4px 10px;cursor:pointer}@media print{header button,.card input{display:none}.card:has(input:checked){display:none}}',
].join(NL);
const js = [
  `const K='deck-view:${esc(face(commander.name))}';const s=new Set(JSON.parse(localStorage.getItem(K)||'[]'));const tiles=[...document.querySelectorAll('.card')];`,
  "const upd=()=>{document.getElementById('done').textContent=tiles.filter(c=>s.has(c.dataset.name)).length+' / '+tiles.length+' sleeved';};",
  "tiles.forEach(c=>{const i=c.querySelector('input');i.checked=s.has(c.dataset.name);i.addEventListener('change',()=>{i.checked?s.add(c.dataset.name):s.delete(c.dataset.name);localStorage.setItem(K,JSON.stringify([...s]));upd();});});",
  "document.getElementById('reset').onclick=()=>{s.clear();localStorage.setItem(K,'[]');tiles.forEach(c=>c.querySelector('input').checked=false);upd();};upd();",
].join(NL);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(face(commander.name))} — decklist</title><style>${css}</style></head><body>`
  + `<header><h1>${esc(face(commander.name))}</h1><span class="count">${total} cards · ${landSlots} land slots · ${spells.reduce((t, r) => t + r.qty, 0)} spells</span><span id="done"></span><button id="reset">Reset ticks</button><span style="margin-left:auto;font-size:12px;color:#b5a27b">Tick cards as you sleeve them; ticks are remembered in this browser. Corpus % = share of ${esc(commanderName.split(',')[0])} decks running the card.</span></header>`
  + `<div class="cmd"><img src="${esc(commander.img)}" alt="${esc(commander.name)}"><div class="facts"><b>${esc(commander.name)}</b><br>Pips: ${esc(pips)}<br>Average mana value of the spells: <b>${avg}</b>${opt.landTarget ? ` · land formula says ${opt.landTarget.recommended}, this list has ${landSlots}` : ''}<div class="curve">${curveHtml}</div></div></div>`
  + sections + `<script>${js}</script></body></html>`;
const targets = outs.length ? outs : [listFile.replace(/\.txt$/, '.html')];
for (const t of targets) fs.writeFileSync(t, html);
console.log(`${face(commander.name)}: ${total} cards, ${groups.size} groups → ${targets.join(' , ')}`);
