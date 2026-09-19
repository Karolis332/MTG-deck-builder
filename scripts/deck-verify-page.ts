/**
 * Generates a standalone, offline, client-side HTML page for confirming which cards of a
 * proposed Commander list are physically sleeved, card by card, and exporting the confirmed list.
 *
 *   MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-verify-page.ts <list.txt> "<Deck Title>"
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const [, , inputFile, title] = process.argv;
if (!inputFile || !title) {
  console.error('usage: npx tsx scripts/deck-verify-page.ts <list.txt> "<Deck Title>"');
  process.exit(1);
}

const OUT = [
  path.resolve(__dirname, '..', 'decks', 'paper', 'deck-verify.html'),
  'C:/Users/QuLeR/Desktop/MTG collection/MTG decks/deck-verify.html',
];

const dbDir = process.env.MTG_DB_DIR || path.join(process.env.APPDATA!, 'the-black-grimoire', 'data');
const db = new Database(path.join(dbDir, 'mtg-deck-builder.db'), { readonly: true });
const cardQ = db.prepare(
  "select name, cmc, type_line, mana_cost, image_uri_normal from cards where name = ? or name like ? order by (layout not in ('art_series','token')) desc, length(name) limit 1"
);

interface Line { quantity: number; name: string }
const lines: Line[] = fs
  .readFileSync(inputFile, 'utf8')
  .trim()
  .split(/\r?\n/)
  .filter((l) => l.trim() && !l.trim().startsWith('#'))
  .map((l) => {
    const m = /^(\d+) (.+)$/.exec(l.trim());
    return m ? { quantity: +m[1], name: m[2] } : null;
  })
  .filter((l): l is Line => l !== null);

const GROUPS = ['Commander', 'Creatures', 'Instants', 'Sorceries', 'Artifacts', 'Enchantments', 'Planeswalkers & Battles', 'Lands', 'Unresolved'] as const;
type Group = (typeof GROUPS)[number];

interface Tile {
  name: string;
  quantity: number;
  cmc: number;
  manaCost: string;
  img: string | null;
  group: Group;
  resolved: boolean;
}

function classify(typeLine: string | null): Group {
  const front = (typeLine || '').split(' // ')[0];
  if (/Creature/.test(front)) return 'Creatures';
  if (/Instant/.test(front)) return 'Instants';
  if (/Sorcery/.test(front)) return 'Sorceries';
  if (/Artifact/.test(front)) return 'Artifacts';
  if (/Enchantment/.test(front)) return 'Enchantments';
  if (/Planeswalker|Battle/.test(front)) return 'Planeswalkers & Battles';
  if (/Land/.test(front)) return 'Lands';
  return 'Unresolved';
}

const tiles: Tile[] = lines.map((line, i) => {
  const row = cardQ.get(line.name, `${line.name} // %`) as
    | { name: string; cmc: number; type_line: string | null; mana_cost: string | null; image_uri_normal: string | null }
    | undefined;
  const group: Group = i === 0 ? 'Commander' : row ? classify(row.type_line) : 'Unresolved';
  return {
    name: row?.name ?? line.name,
    quantity: line.quantity,
    cmc: row?.cmc ?? 0,
    manaCost: row?.mana_cost ?? '',
    img: row?.image_uri_normal ?? null,
    group,
    resolved: !!row,
  };
});

const unresolved = tiles.filter((t) => !t.resolved).map((t) => t.name);
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const genTime = new Date().toISOString();

const byGroup = new Map<Group, Tile[]>(GROUPS.map((g) => [g, []]));
for (const t of tiles) byGroup.get(t.group)!.push(t);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tileHtml(t: Tile, idx: number): string {
  const isBasic = t.quantity > 1;
  const qtyInput = isBasic
    ? `<label class="qty">in deck: <input type="number" min="0" class="qty-input" data-idx="${idx}" value="${t.quantity}"></label>`
    : '';
  const img = t.img
    ? `<img src="${esc(t.img)}" loading="lazy" alt="${esc(t.name)}">`
    : `<div class="placeholder">${esc(t.name)}</div>`;
  return `<div class="tile" data-idx="${idx}" data-state="unchecked">
    ${img}
    <div class="tile-name">${esc(t.name)}</div>
    <div class="tile-meta">${esc(t.manaCost)} · MV ${t.cmc}</div>
    ${qtyInput}
  </div>`;
}

const groupsHtml = GROUPS.filter((g) => byGroup.get(g)!.length > 0)
  .map((g) => {
    const groupTiles = byGroup.get(g)!;
    const idxOffset = tiles.indexOf(groupTiles[0]);
    return `<section class="group">
    <h2>${g} <span class="group-count" data-group="${g}">(${groupTiles.length})</span></h2>
    <div class="tiles">
      ${groupTiles.map((t) => tileHtml(t, tiles.indexOf(t))).join('\n      ')}
    </div>
  </section>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Deck Verify — ${esc(title)}</title>
<style>
  :root { color-scheme: dark; }
  body { background: #141414; color: #ddd; font-family: system-ui, sans-serif; margin: 0; padding: 1.5rem; }
  header { position: sticky; top: 0; background: #141414; padding-bottom: 1rem; border-bottom: 1px solid #333; margin-bottom: 1rem; z-index: 5; }
  h1 { font-size: 1.3rem; margin: 0 0 0.5rem; }
  .counters { font-size: 1rem; margin-bottom: 0.75rem; }
  .counters span { margin-right: 1.2rem; }
  .ok { color: #6bd66b; } .no { color: #e06b6b; } .unk { color: #d6c06b; } .land { color: #8bb8d6; }
  button { background: #2a2a2a; color: #ddd; border: 1px solid #444; padding: 0.4rem 0.8rem; margin-right: 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
  button:hover { background: #3a3a3a; }
  textarea { width: 100%; max-width: 500px; background: #1e1e1e; color: #ddd; border: 1px solid #444; border-radius: 4px; padding: 0.5rem; font-family: inherit; margin-top: 0.5rem; }
  .group h2 { font-size: 1.05rem; border-bottom: 1px solid #333; padding-bottom: 0.3rem; margin-top: 2rem; }
  .tiles { display: flex; flex-wrap: wrap; gap: 0.6rem; }
  .tile { width: 150px; background: #1e1e1e; border: 2px solid #555; border-radius: 6px; padding: 0.4rem; cursor: pointer; user-select: none; }
  .tile[data-state="checked"] { border-color: #4caf50; }
  .tile[data-state="rejected"] { border-color: #d13c3c; }
  .tile img { width: 100%; border-radius: 4px; display: block; }
  .placeholder { width: 100%; height: 200px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 0.75rem; padding: 0.3rem; }
  .tile-name { font-size: 0.8rem; margin-top: 0.3rem; }
  .tile-meta { font-size: 0.7rem; color: #999; }
  .qty { display: block; font-size: 0.7rem; margin-top: 0.2rem; }
  .qty-input { width: 40px; background: #141414; color: #ddd; border: 1px solid #444; }
  footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #333; font-size: 0.75rem; color: #777; }
</style>
</head>
<body>
<header>
  <h1>Deck Verify — ${esc(title)}</h1>
  <div class="counters">
    <span class="ok">✅ confirmed <span id="c-ok">0</span> / <span id="c-total">${tiles.reduce((s, t) => s + t.quantity, 0)}</span></span>
    <span class="no">❌ not in deck <span id="c-no">0</span></span>
    <span class="unk">❓ unchecked <span id="c-unk">0</span></span>
    <span class="land">lands <span id="c-lands">0</span></span>
  </div>
  <button id="btn-copy-confirmed">Copy confirmed list</button>
  <button id="btn-copy-report">Copy missing/extra report</button>
  <button id="btn-mark-all">Mark all unchecked as ✅</button>
  <button id="btn-reset">Reset</button>
  <div>
    <label for="extras">Extra cards in the sleeves not on this list:</label><br>
    <textarea id="extras" rows="4" placeholder="One name per line"></textarea>
  </div>
</header>
${groupsHtml}
<footer>
  Source: ${esc(path.relative(process.cwd(), inputFile))} · generated ${genTime}
</footer>
<script>
const TILES = ${JSON.stringify(tiles)};
const KEY = 'deck-verify:${slug}';

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
}
function saveState(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

let state = loadState();
if (!state.tiles) state.tiles = {};
if (typeof state.extras !== 'string') state.extras = '';

const extrasEl = document.getElementById('extras');
extrasEl.value = state.extras;
extrasEl.addEventListener('input', () => { state.extras = extrasEl.value; saveState(state); });

const CYCLE = { unchecked: 'checked', checked: 'rejected', rejected: 'unchecked' };
const GLYPH = { unchecked: '❓', checked: '✅', rejected: '❌' };

function getTileState(idx) {
  return (state.tiles[idx] && state.tiles[idx].state) || 'unchecked';
}
function getTileQty(idx, defaultQty) {
  const s = state.tiles[idx];
  return s && typeof s.qty === 'number' ? s.qty : defaultQty;
}
function setTileState(idx, st) {
  state.tiles[idx] = Object.assign({}, state.tiles[idx], { state: st });
  saveState(state);
}
function setTileQty(idx, qty) {
  state.tiles[idx] = Object.assign({}, state.tiles[idx], { qty });
  saveState(state);
}

function isLand(idx) {
  return TILES[idx].group === 'Lands';
}

function recount() {
  let ok = 0, no = 0, unk = 0, lands = 0;
  document.querySelectorAll('.tile').forEach((el) => {
    const idx = +el.dataset.idx;
    const st = getTileState(idx);
    el.dataset.state = st;
    const qty = getTileQty(idx, TILES[idx].quantity);
    const qtyInput = el.querySelector('.qty-input');
    if (qtyInput) qtyInput.value = qty;
    if (st === 'checked') { ok += qty; if (isLand(idx)) lands += qty; }
    else if (st === 'rejected') no += 1;
    else unk += 1;
  });
  document.getElementById('c-ok').textContent = ok;
  document.getElementById('c-no').textContent = no;
  document.getElementById('c-unk').textContent = unk;
  document.getElementById('c-lands').textContent = lands;
}

document.querySelectorAll('.tile').forEach((el) => {
  el.addEventListener('click', (e) => {
    if (e.target.classList.contains('qty-input')) return;
    const idx = +el.dataset.idx;
    setTileState(idx, CYCLE[getTileState(idx)]);
    recount();
  });
});
document.querySelectorAll('.qty-input').forEach((el) => {
  el.addEventListener('click', (e) => e.stopPropagation());
  el.addEventListener('change', () => {
    const idx = +el.dataset.idx;
    setTileQty(idx, Math.max(0, parseInt(el.value, 10) || 0));
    recount();
  });
});

function confirmedLines() {
  const lines = [];
  TILES.forEach((t, idx) => {
    if (getTileState(idx) === 'checked') {
      const qty = getTileQty(idx, t.quantity);
      if (qty > 0) lines.push(qty + ' ' + t.name);
    }
  });
  const extras = state.extras.split(/\\r?\\n/).map((s) => s.trim()).filter(Boolean);
  extras.forEach((name) => lines.push('1 ' + name));
  return lines;
}

document.getElementById('btn-copy-confirmed').addEventListener('click', () => {
  navigator.clipboard.writeText(confirmedLines().join('\\n'));
});
document.getElementById('btn-copy-report').addEventListener('click', () => {
  const missing = [], unchecked = [];
  TILES.forEach((t, idx) => {
    const st = getTileState(idx);
    if (st === 'rejected') missing.push(t.name);
    else if (st === 'unchecked') unchecked.push(t.name);
  });
  const extras = state.extras.split(/\\r?\\n/).map((s) => s.trim()).filter(Boolean);
  const report = [
    'Not in deck (' + missing.length + '):', ...missing.map((n) => '  ' + n),
    '', 'Unchecked (' + unchecked.length + '):', ...unchecked.map((n) => '  ' + n),
    '', 'Extras (' + extras.length + '):', ...extras.map((n) => '  ' + n),
  ];
  navigator.clipboard.writeText(report.join('\\n'));
});
document.getElementById('btn-mark-all').addEventListener('click', () => {
  TILES.forEach((t, idx) => { if (getTileState(idx) === 'unchecked') setTileState(idx, 'checked'); });
  recount();
});
document.getElementById('btn-reset').addEventListener('click', () => {
  state = { tiles: {}, extras: '' };
  saveState(state);
  extrasEl.value = '';
  recount();
});

recount();
</script>
</body>
</html>
`;

for (const out of OUT) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');
}

console.log(`Wrote ${OUT[0]}`);
console.log(`Wrote ${OUT[1]}`);
console.log(`Tiles: ${tiles.length}`);
if (unresolved.length) console.log(`Unresolved: ${unresolved.join(', ')}`);
