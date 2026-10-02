/**
 * One-off: a click-to-check page with card images for the four paper decks changed on 2026-10-02.
 * Tap a card once you find it in the box; unchecked cards are the missing ones. Today's INs carry a
 * NEW badge; cards that should have left the deck are listed under "Should be OUT".
 *
 *   MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx verify-2026-10-02/tam-precons/check-page.ts
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '../..');
const OUT = [
  path.join(ROOT, 'decks/paper/deck-check.html'),
  'C:/Users/QuLeR/Desktop/MTG collection/MTG decks/deck-check.html',
];
// baseline = what was sleeved before today's changes; `now` = a proposed list instead of the sleeved one;
// `extra` = a labelled row of cards still under review
type DeckSpec = { slug: string; base?: () => string; now?: string; extra?: { label: string; names: string[] } };
const read = (rel: string) => () => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SPECS: DeckSpec[] = [
  {
    slug: 'inspirit-flagship-vessel',
    now: 'verify-2026-10-02/inspirit/inspirit-proposed.txt',
    base: read('verify-2026-10-02/inspirit/inspirit-current.txt'),
    extra: {
      label: 'Under review (refuter pending)',
      names: ['Tezzeret, Master of the Bridge', 'Saheeli, Sublime Artificer', 'Way of the Cryomancer', 'Chandra, Spark Hunter',
        'Dovin, Hand of Control', 'Mu Yanling, Sky Dancer', 'Murmuring Volume', 'Keeper of the Quiet Hour', 'The Echoverse Fulcrum',
        'Mindseeker Oculus', 'Protege\'s Awakening', 'Fatehold Charm', 'Teyo, Lightshield Expert', 'Walking Ballista', 'Stonecoil Serpent'],
    },
  },
  { slug: 'tam-the-possibility', base: read('verify-2026-09-28/deck-audit/tam-the-possibility-final.txt') },
  { slug: 'tazri-beacon-of-unity' },
  { slug: 'meren-of-clan-nel-toth' },
  { slug: 'imotekh-the-stormlord' },
];
const DECKS = SPECS.map((d) => ({
  ...d,
  base: d.base ?? (() => execSync(`git show 16ebd62~1:decks/paper/decks/${d.slug}.txt`, { cwd: ROOT, encoding: 'utf8' })),
  file: d.now ?? `decks/paper/decks/${d.slug}.txt`,
}));

const dbDir = process.env.MTG_DB_DIR || path.join(process.env.APPDATA!, 'the-black-grimoire', 'data');
const db = new Database(path.join(dbDir, 'mtg-deck-builder.db'), { readonly: true });
const cardQ = db.prepare(
  "select name, image_uri_normal as img, type_line as type from cards where name = ? or name like ? order by (layout not in ('art_series','token')) desc, (image_uri_normal is not null) desc, length(name) limit 1",
);
type Card = { name: string; img: string | null; type: string };
const card = (n: string): Card => (cardQ.get(n, n + ' // %') as Card | undefined) ?? { name: n, img: null, type: '?' };

const parse = (txt: string) =>
  txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(\d+)\s+(.+)$/);
    return { qty: m ? Number(m[1]) : 1, name: m ? m[2] : l };
  });
const GROUPS = ['Commander', 'Planeswalker', 'Creature', 'Instant / Sorcery', 'Artifact', 'Enchantment', 'Land'];
const groupOf = (t: string) => {
  const f = t.split('//')[0];
  if (/Planeswalker/.test(f)) return 'Planeswalker';
  if (/Creature/.test(f)) return 'Creature';
  if (/Land/.test(f)) return 'Land';
  if (/Instant|Sorcery/.test(f)) return 'Instant / Sorcery';
  if (/Artifact/.test(f)) return 'Artifact';
  return 'Enchantment';
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tile = (c: Card, qty: number, key: string, cls = '') =>
  `<div class="card ${cls}" data-key="${esc(key)}" data-name="${esc((c.name + ' ' + c.type).toLowerCase())}">${c.img ? `<img loading="lazy" src="${esc(c.img)}" alt="${esc(c.name)}">` : `<div class="ph">${esc(c.name)}</div>`}` +
  `${qty > 1 ? `<span class="qty">×${qty}</span>` : ''}${cls.includes('new') ? '<span class="badge">NEW</span>' : ''}<span class="tick">✓</span></div>`;

const sections = DECKS.map((d, i) => {
  const now = parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8'));
  const base = new Set(parse(d.base()).map((c) => c.name));
  const cur = new Set(now.map((c) => c.name));
  const outs = [...base].filter((n) => !cur.has(n));
  const total = now.reduce((s, c) => s + c.qty, 0);
  const byGroup = new Map<string, string[]>(GROUPS.map((g) => [g, []]));
  now.forEach((c, idx) => {
    const k = card(c.name);
    byGroup.get(idx === 0 ? 'Commander' : groupOf(k.type))!.push(tile(k, c.qty, `${d.slug}|${c.name}`, base.has(c.name) ? '' : 'new'));
  });
  const body = GROUPS.filter((g) => byGroup.get(g)!.length)
    .map((g) => `<h3>${g} <small>${byGroup.get(g)!.length}</small></h3><div class="grid">${byGroup.get(g)!.join('')}</div>`).join('');
  const outHtml = outs.length
    ? `<h3 class="outh">Should be OUT <small>${outs.length}</small></h3><div class="grid">${outs.map((n) => tile(card(n), 1, `${d.slug}|OUT|${n}`, 'out')).join('')}</div>`
    : '';
  const extraHtml = d.extra
    ? `<h3 class="candh">${esc(d.extra.label)} <small>${d.extra.names.length}</small></h3><div class="grid">${d.extra.names.map((n) => tile(card(n), 1, `${d.slug}|CAND|${n}`, 'cand')).join('')}</div>`
    : '';
  return `<section id="${d.slug}" class="${i ? 'hidden' : ''}" data-total="${now.length}"><div class="bar"><b>${esc(now[0].name)}</b> · ${total} cards · <span class="count"></span> found <button class="reset">reset</button></div>${body}${outHtml}${extraHtml}</section>`;
});
const tabs = DECKS.map((d, i) => `<button class="tab${i ? '' : ' on'}" data-target="${d.slug}">${esc(parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8'))[0].name.split(',')[0])}${d.now ? ' (draft)' : ''}</button>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deck check</title><style>
body{margin:0;background:#15110d;color:#e8dcc4;font:15px Georgia,serif}header{position:sticky;top:0;z-index:2;background:#1f1912;padding:10px;border-bottom:1px solid #6b5326}
.tab{background:#2b2218;color:#e8dcc4;border:1px solid #6b5326;padding:6px 12px;margin-right:6px;cursor:pointer;border-radius:4px}.tab.on{background:#8a6a2e;color:#000}
#q{background:#2b2218;color:#e8dcc4;border:1px solid #6b5326;padding:6px 10px;border-radius:4px;width:220px}.card.f,.grid.f,h3.f{display:none}
.bar{padding:10px 14px;font-size:17px}.reset{margin-left:10px;background:none;color:#c9a55a;border:1px solid #6b5326;cursor:pointer}
section{padding:0 14px 40px}.hidden{display:none}h3{color:#c9a55a;margin:18px 0 8px}h3 small{color:#8d7a5a}.outh{color:#d0605a}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.card{position:relative;cursor:pointer;border-radius:8px;overflow:hidden;border:3px solid transparent}.card img{width:100%;display:block}
.card.new{border-color:#d4af37}.card.out{border-color:#d0605a;opacity:.75}.card.cand{border-color:#4a8fd0}.candh{color:#4a8fd0}.ph{aspect-ratio:63/88;display:flex;align-items:center;justify-content:center;text-align:center;background:#2b2218;padding:8px}
.badge,.qty{position:absolute;top:6px;background:#d4af37;color:#000;font:bold 12px sans-serif;padding:2px 6px;border-radius:3px}.badge{left:6px}.qty{right:6px}
.tick{display:none;position:absolute;inset:0;background:rgba(20,90,40,.55);color:#fff;font:bold 64px sans-serif;align-items:center;justify-content:center}
.card.done .tick{display:flex}.card.out.done .tick{background:rgba(140,30,30,.55)}
</style></head><body><header>${tabs}<input id="q" type="search" placeholder="filter: name or type…" autofocus><span style="float:right;color:#8d7a5a">tap a card when you find it in the box · gold = new today · red = should be out (tap once removed)</span></header>${sections.join('')}
<script>
const S=JSON.parse(localStorage.getItem('deckcheck')||'{}');const save=()=>localStorage.setItem('deckcheck',JSON.stringify(S));
const count=s=>{const all=s.querySelectorAll('.card:not(.out)');const d=[...all].filter(c=>c.classList.contains('done')).length;s.querySelector('.count').textContent=d+' / '+all.length};
document.querySelectorAll('.card').forEach(c=>{if(S[c.dataset.key])c.classList.add('done');c.onclick=()=>{c.classList.toggle('done');S[c.dataset.key]=c.classList.contains('done');save();count(c.closest('section'))}});
document.querySelectorAll('section').forEach(count);
const q=document.getElementById('q');q.oninput=()=>{const v=q.value.trim().toLowerCase();document.querySelectorAll('.card').forEach(c=>c.classList.toggle('f',!!v&&!c.dataset.name.includes(v)));document.querySelectorAll('.grid').forEach(g=>{const e=!g.querySelector('.card:not(.f)');g.classList.toggle('f',e);g.previousElementSibling.classList.toggle('f',e)})};
document.querySelectorAll('.reset').forEach(b=>b.onclick=()=>{const s=b.closest('section');s.querySelectorAll('.card').forEach(c=>{c.classList.remove('done');delete S[c.dataset.key]});save();count(s)});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));document.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s.id!==t.dataset.target))});
</script></body></html>`;

for (const o of OUT) {
  fs.mkdirSync(path.dirname(o), { recursive: true });
  fs.writeFileSync(o, html);
}
const missing = DECKS.flatMap((d) => parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8')).filter((c) => !card(c.name).img).map((c) => `${d.slug}: ${c.name}`));
console.log(`wrote ${OUT.join(' + ')}; cards without image: ${missing.length ? missing.join(', ') : 'none'}`);
