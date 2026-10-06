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
  // Urza box (no commander yet) vs the converged draft; Urza himself hot-swaps from the Inspirit box
  {
    slug: 'urza-lord-high-artificer', now: 'verify-2026-10-06/urza-found/final-3.txt', base: read('verify-2026-10-02/urza/urza-box.txt'),
    extra: {
      label: 'Found-card alternatives (near-ties, the proven card stays): Finale for Pull, Bane’s or Countersculpt for Villains’ Lair, Lord of the Eagles for Hangarback, Traxos for Golem Foundry; River’s Rebuke for Ember Island Production; Steel Hellkite for Soul; Emeritus when found',
      names: ['Finale of Revelation', "Bane's Contingency", 'Countersculpt', 'The Lord of the Eagles', 'Traxos, Scourge of Kroog', "River's Rebuke", 'Steel Hellkite', 'Emeritus of Ideation'],
    },
  },
  {
    slug: 'inspirit-flagship-vessel',
    base: read('verify-2026-10-02/inspirit/inspirit-current.txt'),
    extra: {
      label: 'Untapped duals you own, sleeved in Tam/Tazri (second copies would replace Islands)',
      names: ['Hallowed Fountain', 'Steam Vents', 'Spirebluff Canal', 'Seachrome Coast', 'Deserted Beach'],
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
// badge: 'NEW' for a card not in the baseline, '+N' when a card already there gains copies (basics)
const tile = (c: Card, qty: number, key: string, cls = '', badge = '') =>
  `<div class="card ${cls}" data-key="${esc(key)}" data-name="${esc((c.name + ' ' + c.type).toLowerCase())}">${c.img ? `<img loading="lazy" src="${esc(c.img)}" alt="${esc(c.name)}">` : `<div class="ph">${esc(c.name)}</div>`}` +
  `${qty > 1 ? `<span class="qty">×${qty}</span>` : ''}${badge ? `<span class="badge">${badge}</span>` : ''}<span class="tick">✓</span></div>`;

const sections = DECKS.map((d, i) => {
  const now = parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8'));
  const base = new Map<string, number>();
  parse(d.base()).forEach((c) => base.set(c.name, (base.get(c.name) ?? 0) + c.qty));
  const cur = new Map(now.map((c) => [c.name, c.qty]));
  const outs = [...base].map(([n, q]) => ({ name: n, qty: q - (cur.get(n) ?? 0) })).filter((o) => o.qty > 0);
  const total = now.reduce((s, c) => s + c.qty, 0);
  const byGroup = new Map<string, string[]>(GROUPS.map((g) => [g, []]));
  now.forEach((c, idx) => {
    const k = card(c.name);
    const had = base.get(c.name) ?? 0;
    const badge = had === 0 ? 'NEW' : c.qty > had ? `+${c.qty - had}` : '';
    byGroup.get(idx === 0 ? 'Commander' : groupOf(k.type))!.push(tile(k, c.qty, `${d.slug}|${c.name}`, badge ? 'new' : '', badge));
  });
  const body = GROUPS.filter((g) => byGroup.get(g)!.length)
    .map((g) => `<h3>${g} <small>${byGroup.get(g)!.length}</small></h3><div class="grid">${byGroup.get(g)!.join('')}</div>`).join('');
  const outQty = outs.reduce((s, o) => s + o.qty, 0);
  const outHtml = outs.length
    ? `<h3 class="outh">Should be OUT <small>${outQty}</small></h3><div class="grid">${outs.map((o) => tile(card(o.name), o.qty, `${d.slug}|OUT|${o.name}`, 'out')).join('')}</div>`
    : '';
  // swaps grouped by card type: red OUT tiles then gold IN tiles (own tick keys, excluded from the found count)
  const ins = now.map((c) => ({ name: c.name, qty: c.qty - (base.get(c.name) ?? 0) })).filter((c) => c.qty > 0);
  const swapHtml = GROUPS.map((g) => {
    const o = outs.map((x) => ({ ...x, k: card(x.name) })).filter((x) => groupOf(x.k.type) === g);
    const n = ins.map((x) => ({ ...x, k: card(x.name) })).filter((x) => groupOf(x.k.type) === g);
    if (!o.length && !n.length) return '';
    const sum = (a: { qty: number }[]) => a.reduce((s, x) => s + x.qty, 0);
    return `<h3 class="swh">${g} <small>−${sum(o)} / +${sum(n)}</small></h3><div class="grid">` +
      o.map((x) => tile(x.k, x.qty, `${d.slug}|SW|OUT|${x.name}`, 'out swap', 'OUT')).join('') +
      n.map((x) => tile(x.k, x.qty, `${d.slug}|SW|IN|${x.name}`, 'new swap', 'IN')).join('') + '</div>';
  }).join('');
  const swapsHtml = swapHtml ? `<h2 class="swt">Swaps by card type</h2>${swapHtml}<h2 class="swt">Full list</h2>` : '';
  const extraHtml = d.extra
    ? `<h3 class="candh">${esc(d.extra.label)} <small>${d.extra.names.length}</small></h3><div class="grid">${d.extra.names.map((n) => tile(card(n), 1, `${d.slug}|CAND|${n}`, 'cand')).join('')}</div>`
    : '';
  return `<section id="${d.slug}" class="${i ? 'hidden' : ''}" data-total="${now.length}"><div class="bar"><b>${esc(now[0].name)}</b> · ${total} cards · <span class="count"></span> found <button class="reset">reset</button></div>${swapsHtml}${body}${outHtml}${extraHtml}</section>`;
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
.swt{color:#e8dcc4;margin:22px 0 4px;border-bottom:1px solid #6b5326;font-size:20px}.card.out.swap .badge{background:#d0605a}
#zoom{position:fixed;z-index:9;display:none;pointer-events:none;width:min(440px,46vw);border-radius:18px;box-shadow:0 10px 50px #000}
</style></head><body><header>${tabs}<input id="q" type="search" placeholder="filter: name or type…" autofocus><span style="float:right;color:#8d7a5a">tap a card when you find it in the box · gold = new today · red = should be out (tap once removed)</span></header>${sections.join('')}
<script>
const S=JSON.parse(localStorage.getItem('deckcheck')||'{}');const save=()=>localStorage.setItem('deckcheck',JSON.stringify(S));
const count=s=>{const all=s.querySelectorAll('.card:not(.out):not(.cand):not(.swap)');const d=[...all].filter(c=>c.classList.contains('done')).length;s.querySelector('.count').textContent=d+' / '+all.length};
document.querySelectorAll('.card').forEach(c=>{if(S[c.dataset.key])c.classList.add('done');c.onclick=()=>{c.classList.toggle('done');S[c.dataset.key]=c.classList.contains('done');save();count(c.closest('section'))}});
document.querySelectorAll('section').forEach(count);
const q=document.getElementById('q');q.oninput=()=>{const v=q.value.trim().toLowerCase();document.querySelectorAll('.card').forEach(c=>c.classList.toggle('f',!!v&&!c.dataset.name.includes(v)));document.querySelectorAll('.grid').forEach(g=>{const e=!g.querySelector('.card:not(.f)');g.classList.toggle('f',e);g.previousElementSibling.classList.toggle('f',e)})};
document.querySelectorAll('.reset').forEach(b=>b.onclick=()=>{const s=b.closest('section');s.querySelectorAll('.card').forEach(c=>{c.classList.remove('done');delete S[c.dataset.key]});save();count(s)});
const z=document.createElement('img');z.id='zoom';document.body.append(z);
document.addEventListener('mouseover',e=>{const i=e.target.closest&&e.target.closest('.card')?.querySelector('img');if(!i){z.style.display='none';return}z.src=i.src.replace('/normal/','/large/');z.style.display='block'});
document.addEventListener('mousemove',e=>{if(z.style.display!=='block')return;const w=z.offsetWidth,h=z.offsetHeight||w*1.4;let x=e.clientX+24;if(x+w>innerWidth)x=e.clientX-w-24;z.style.left=Math.max(8,x)+'px';z.style.top=Math.min(Math.max(8,e.clientY-h/2),innerHeight-h-8)+'px'});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));document.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s.id!==t.dataset.target))});
</script></body></html>`;

for (const o of OUT) {
  fs.mkdirSync(path.dirname(o), { recursive: true });
  fs.writeFileSync(o, html);
}
const missing = DECKS.flatMap((d) => parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8')).filter((c) => !card(c.name).img).map((c) => `${d.slug}: ${c.name}`));
console.log(`wrote ${OUT.join(' + ')}; cards without image: ${missing.length ? missing.join(', ') : 'none'}`);
