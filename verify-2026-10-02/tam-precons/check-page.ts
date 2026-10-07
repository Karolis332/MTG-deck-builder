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
import { parsePrimer, type Primer } from '../../src/lib/deck-primer';

const ROOT = path.resolve(__dirname, '../..');
const OUT = [
  path.join(ROOT, 'decks/paper/deck-check.html'),
  'C:/Users/QuLeR/Desktop/MTG collection/MTG decks/deck-check.html',
];
// baseline = what was sleeved before today's changes; `now` = a proposed list instead of the sleeved one;
// `extra` = a labelled row of cards still under review; `guide` = a pilot-guide markdown file shown above the list
type DeckSpec = { slug: string; base?: () => string; now?: string; guide?: string; extra?: { label: string; names: string[] } };
const read = (rel: string) => () => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SPECS: DeckSpec[] = [
  // Beledros replaces Meren: baseline = the sleeved Meren list, so OUT = Meren cards that stay in the box, NEW = everything else
  {
    slug: 'beledros-witherbloom', base: read('decks/paper/decks/meren-of-clan-nel-toth.txt'), now: 'verify-2026-10-08/best-deck/beledros-recommended.txt',
    guide: '.claude/skills/deck-building/reference/decks/beledros-witherbloom.md',
    extra: {
      label: 'Pulled from other decks: Cabbage (Pest Infestation, Idol, Ribtruss, Kodama’s Reach), Imotekh (Altar, Skorpekh, Arena, Mischief), Gilanra (Baloth). Backfills in guide §3',
      names: ['Pest Infestation', 'Idol of Oblivion', 'Ribtruss Roaster', "Kodama's Reach", "Ashnod's Altar", 'Skorpekh Lord', 'Phyrexian Arena', "Imp's Mischief", 'Thunderfoot Baloth'],
    },
  },
  // the operator's paper Bumi deck (registered 2026-10-07; 3 landscapes are off-colour)
  // sleeved list vs the standalone fix: 3 off-colour landscapes replaced + optional upgrades from free cards only
  { slug: 'bumi-unleashed', base: read('decks/paper/decks/bumi-unleashed.txt'), now: 'verify-2026-10-07/bumi-standalone/final.txt' },
  // partners: Gilanra is the first line, Alena the second (paper-sync keeps one commander)
  {
    // sleeved list vs the engine-first rebuild (41 spells at 6+, engine pieces locked; near-ties live in the primer)
    slug: 'gilanra-alena-partners', base: read('decks/paper/decks/gilanra-alena-partners.txt'), now: 'verify-2026-10-07/gilanra-engine/final.txt',
  },
  // Urza box (no commander yet) vs the converged draft; Urza himself hot-swaps from the Inspirit box
  {
    slug: 'urza-lord-high-artificer', now: 'verify-2026-10-06/urza-found/final-3.txt', base: read('verify-2026-10-02/urza/urza-box.txt'),
    guide: '.claude/skills/deck-building/reference/decks/urza-lord-high-artificer.md',
    extra: {
      label: 'Found-card alternatives (near-ties, the proven card stays): Finale for Pull, Countersculpt for Villains’ Lair, Lord of the Eagles for Hangarback; Steel Hellkite for Soul; Emeritus when found',
      names: ['Finale of Revelation', 'Countersculpt', 'The Lord of the Eagles', 'Steel Hellkite', 'Emeritus of Ideation'],
    },
  },
  {
    // sleeved list vs the Urza hot-swap: Emry takes Urza's slot
    slug: 'inspirit-flagship-vessel', now: 'verify-2026-10-06/urza-found/inspirit-hotswap.txt',
    base: read('decks/paper/decks/inspirit-flagship-vessel.txt'),
    guide: '.claude/skills/deck-building/reference/decks/inspirit-flagship-vessel.md',
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
  "select name, image_uri_normal as img, type_line as type, cmc from cards where name = ? or name like ? order by (layout not in ('art_series','token')) desc, (image_uri_normal is not null) desc, length(name) limit 1",
);
type Card = { name: string; img: string | null; type: string; cmc: number };
const card = (n: string): Card => (cardQ.get(n, n + ' // %') as Card | undefined) ?? { name: n, img: null, type: '?', cmc: 0 };

const parse = (txt: string) =>
  txt.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^(commander|deck|sideboard|companion)$/i.test(l)).map((l) => {
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
// ponytail: just the markdown the pilot guides use (headings, tables, bullets, bold, code); a real parser if guides grow.
// Extras: [[Card Name]] = card icon chip (hover zooms); a line "=> step → step → step" = flow diagram.
const chip = (n: string) => {
  const c = card(n);
  return `<span class="chip">${c.img ? `<img class="ci" loading="lazy" src="${esc(c.img)}" alt="">` : ''}<b>${esc(n)}</b></span>`;
};
const inline = (s: string) =>
  esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\[\[(.+?)\]\]/g, (_, n: string) => chip(n.replace(/&amp;/g, '&')));
const flow = (steps: string[]) => `<div class="flow">${steps.map((s) => `<div class="step">${inline(s)}</div>`).join('<div class="arr">→</div>')}</div>`;
const md = (src: string) => {
  const out: string[] = [];
  let list = false, table = false;
  const close = () => { if (list) out.push('</ul>'); if (table) out.push('</table>'); list = table = false; };
  for (const line of src.split(/\r?\n/)) {
    if (line.startsWith('=> ')) {
      close();
      out.push(flow(line.slice(3).split(' → ')));
      continue;
    }
    const cells = line.startsWith('|') ? line.slice(1, -1).split('|').map((c) => c.trim()) : null;
    if (cells && cells.every((c) => /^-+$/.test(c))) continue;
    if (cells) {
      if (!table) { close(); table = true; out.push(`<table><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`); }
      else out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
    } else if (line.startsWith('- ')) {
      if (!list) { close(); list = true; out.push('<ul>'); }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else {
      close();
      const h = line.match(/^(#+)\s+(.*)$/);
      if (h) out.push(`<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out.join('');
};
// badge: 'NEW' for a card not in the baseline, '+N' when a card already there gains copies (basics)
const tile = (c: Card, qty: number, key: string, cls = '', badge = '') =>
  `<div class="card ${cls}" data-key="${esc(key)}" data-name="${esc((c.name + ' ' + c.type).toLowerCase())}">${c.img ? `<img loading="lazy" src="${esc(c.img)}" alt="${esc(c.name)}">` : `<div class="ph">${esc(c.name)}</div>`}` +
  `${qty > 1 ? `<span class="qty">×${qty}</span>` : ''}${badge ? `<span class="badge">${badge}</span>` : ''}<span class="tick">✓</span></div>`;

// ---- primer (decks/paper/primers/<slug>.json, schema in src/lib/deck-primer.ts) ----
const pimg = (n: string, cls = '') => {
  const c = card(n);
  return c.img ? `<img class="pc ${cls}" loading="lazy" src="${esc(c.img)}" alt="${esc(n)}" title="${esc(n)}">` : `<div class="pc ph ${cls}">${esc(n)}</div>`;
};
type Entry = { name: string; qty: number };
// mana curve of the non-land, non-commander cards: the sleeved list (grey) next to this list (gold)
const curve = (lists: { label: string; cards: Entry[] }[], cmdrs: string[]) => {
  const buckets = (cards: Entry[]) => cards.reduce((b, c) => {
    const k = card(c.name);
    if (cmdrs.includes(c.name) || /Land/.test(k.type.split('//')[0])) return b;
    b[Math.min(7, Math.floor(k.cmc))] += c.qty;
    return b;
  }, [0, 0, 0, 0, 0, 0, 0, 0]);
  const rows = lists.map((l) => ({ ...l, b: buckets(l.cards) }));
  const max = Math.max(...rows.flatMap((r) => r.b));
  const cols = [0, 1, 2, 3, 4, 5, 6, 7].map((mv) => `<div class="cc">${rows.map((r, i) => `<div class="cb s${i}" style="height:${(r.b[mv] / max) * 90}px"><span>${r.b[mv]}</span></div>`).join('')}<div class="cl">${mv === 7 ? '7+' : mv}</div></div>`).join('');
  const big = (r: (typeof rows)[number]) => r.b[6] + r.b[7];
  const legend = rows.map((r, i) => `<span class="lg s${i}"></span>${esc(r.label)}: <b>${big(r)}</b> spells at 6+`).join(' · ');
  return `<div class="curve">${cols}</div><div class="lgd">${legend}</div>`;
};
const primerHtml = (p: Primer, curveHtml: string) => {
  const sec = (title: string, body: string) => (body ? `<div class="psec"><h3>${title}</h3>${body}</div>` : '');
  const pill = (t: string, cls = '') => `<span class="pill ${cls}">${esc(t)}</span>`;
  const head = `<div class="phead"><div class="cmdrs">${p.deck.commanders.map((n) => pimg(n, 'big')).join('')}</div><div class="pmeta"><h2>${esc(p.deck.name)}</h2>` +
    `<div>${pill(p.deck.colours)}${pill(p.deck.format)}${pill(p.deck.status, p.deck.status)}</div><p class="sum">${inline(p.summary)}</p>${curveHtml}</div></div>`;
  const phases = `<div class="phases">${p.phases.map((ph) => `<div class="phase"><div class="turns">${esc(ph.turns)}</div><p>${inline(ph.goal)}</p><div class="mini">${ph.cards.map((n) => pimg(n, 'sm')).join('')}</div></div>`).join('')}</div>`;
  const engine = p.engine.map((e) => `<h4>${inline(e.title)}</h4>${flow(e.flow)}${e.note ? `<p class="note">${inline(e.note)}</p>` : ''}`).join('');
  const wins = `<div class="wins">${p.winConditions.map((w, i) => `<div class="win"><div class="wt"><span class="wn">${i + 1}</span><b>${inline(w.name)}</b></div>${w.turn ? `<div class="wturn">Turn: ${inline(w.turn)}</div>` : ''}` +
    `<div class="mini">${w.pieces.map((n) => pimg(n, 'md')).join('')}</div>${flow(w.flow)}<p class="dmg">${inline(w.damage)}</p></div>`).join('')}</div>`;
  const m = p.metrics;
  const metrics = m ? `<table class="ptab"><tr>${m.columns.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>${m.rows.map((r) => `<tr><td>${inline(r.label)}</td>${r.values.map((v) => `<td>${inline(v)}</td>`).join('')}</tr>`).join('')}</table>${m.note ? `<p class="note">${inline(m.note)}</p>` : ''}` : '';
  const none = '<div class="pc md none">—</div>';
  const swaps = p.swaps.map((s) => `<div class="sw v-${s.verdict}"><div class="pair">${s.out ? pimg(s.out, 'md o') : none}<span class="arr">→</span>${s.in ? pimg(s.in, 'md i') : none}</div>` +
    `<div class="why"><div class="swt2"><b class="red">${esc(s.out ?? '—')}</b> → <b class="gold">${esc(s.in ?? '—')}</b> ${pill(s.role)}${pill(s.verdict, 'v-' + s.verdict)}</div><p>${inline(s.reason)}</p>` +
    `${s.quoteOut ? `<blockquote class="qo">${inline(s.quoteOut)}</blockquote>` : ''}${s.quoteIn ? `<blockquote class="qi">${inline(s.quoteIn)}</blockquote>` : ''}${s.evidence ? `<p class="ev">${inline(s.evidence)}</p>` : ''}</div></div>`).join('');
  const keepers = p.keepers.length ? `<div class="keep">${p.keepers.map((k) => `<div class="kp">${pimg(k.card, 'sm')}<div><b>${esc(k.card)}</b><p>${inline(k.why)}</p></div></div>`).join('')}</div>` : '';
  const ties = p.nearTies.map((t) => `<div class="tie">${pimg(t.kept, 'sm')}<span class="arr">↔</span>${pimg(t.alt, 'sm')}<p><b>${esc(t.kept)}</b> kept over <b>${esc(t.alt)}</b>: ${inline(t.note)}</p></div>`).join('');
  const mull = `<div class="mull"><div><h4>✅ Keep</h4><ul>${p.mulligan.keep.map((x) => `<li>${inline(x)}</li>`).join('')}</ul></div><div><h4>❌ Mulligan</h4><ul>${p.mulligan.mulligan.map((x) => `<li>${inline(x)}</li>`).join('')}</ul></div></div>`;
  const rules = p.pilotRules.length ? `<ol>${p.pilotRules.map((r) => `<li>${inline(r)}</li>`).join('')}</ol>` : '';
  const src = p.sources.length ? `<p class="ev">Sources: ${p.sources.map(inline).join(' · ')}</p>` : '';
  return `<details class="primer" open><summary>Primer: plan, win conditions, every change explained</summary>${head}${sec('Game plan', phases)}${sec('Engine', engine)}${sec('Win conditions', wins)}` +
    `${sec('Numbers', metrics)}${sec(`Changes <small>${p.swaps.length}</small>`, swaps)}${sec('Cards that stay (and why)', keepers)}${sec('Near-ties', ties)}${sec('Mulligan', mull)}${sec('Pilot rules', rules)}${src}</details>`;
};
const primerFile = (slug: string) => path.join(ROOT, 'decks/paper/primers', `${slug}.json`);

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
  const listText = now.map((c) => `${c.qty} ${c.name}`).join('\n');
  const copyHtml = `<details class="copybox"><summary>Copy decklist (${total} cards, commander first)</summary><textarea readonly rows="12">${esc(listText)}</textarea><button class="copy">Copy</button></details>`;
  // a primer replaces the markdown pilot guide; a bad primer fails the build with the zod path
  const primer = fs.existsSync(primerFile(d.slug)) ? parsePrimer(JSON.parse(fs.readFileSync(primerFile(d.slug), 'utf8'))) : null;
  const lists = [{ label: d.now ? 'Sleeved' : 'Before', cards: parse(d.base()) }, { label: d.now ? 'Proposed' : 'Now', cards: now }];
  const guideHtml = primer
    ? primerHtml(primer, curve(lists, primer.deck.commanders))
    : d.guide && fs.existsSync(path.join(ROOT, d.guide)) ? `<details class="guide" open><summary>Game plan, win lines, copy targets</summary>${md(fs.readFileSync(path.join(ROOT, d.guide), 'utf8'))}</details>` : '';
  return `<section id="${d.slug}" class="${i ? 'hidden' : ''}" data-total="${now.length}"><div class="bar"><b>${esc(now[0].name)}</b> · ${total} cards · <span class="count"></span> found <button class="reset">reset</button></div>${copyHtml}${guideHtml}${swapsHtml}${body}${outHtml}${extraHtml}</section>`;
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
details{margin:8px 0;background:#1f1912;border:1px solid #6b5326;border-radius:6px;padding:6px 12px}summary{cursor:pointer;color:#c9a55a;font-size:16px}
.copybox textarea{width:100%;box-sizing:border-box;background:#15110d;color:#e8dcc4;border:1px solid #6b5326;font:13px monospace;margin:8px 0}.copy{background:#8a6a2e;color:#000;border:0;padding:6px 14px;border-radius:4px;cursor:pointer}
.chip{display:inline-flex;align-items:center;gap:4px;background:#2b2218;border:1px solid #6b5326;border-radius:5px;padding:1px 5px 1px 1px;margin:1px 2px;white-space:nowrap}.chip .ci{height:34px;border-radius:3px}
.flow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0;padding:10px;background:#15110d;border:1px dashed #6b5326;border-radius:6px}.flow .step{background:#2b2218;border:1px solid #8a6a2e;border-radius:6px;padding:6px 8px;max-width:230px;font-size:14px;text-align:center}
.flow .chip{display:flex;flex-direction:column;white-space:normal;border:0;background:none;padding:0}.flow .chip .ci{height:auto;width:110px}.arr{color:#d4af37;font-size:26px}
.guide table{border-collapse:collapse;margin:6px 0 12px;width:100%}.guide th,.guide td{border:1px solid #6b5326;padding:5px 7px;vertical-align:top;text-align:left}.guide th{color:#c9a55a}.guide h3,.guide h4{color:#c9a55a;margin:14px 0 6px}.guide code{color:#c9a55a}.guide li{margin:3px 0}
#zoom{position:fixed;z-index:9;display:none;pointer-events:none;width:min(440px,46vw);border-radius:18px;box-shadow:0 10px 50px #000}
.primer{padding:10px 16px}.primer h2{font-family:Georgia,serif;color:#e8c872;margin:0 0 6px;font-size:26px;letter-spacing:.5px}.primer h4{color:#c9a55a;margin:12px 0 4px}
.psec{margin:18px 0 0;padding-top:10px;border-top:1px solid #3d3020}.psec>h3{font-variant:small-caps;letter-spacing:1px;font-size:19px;margin:0 0 10px}
.pc{border-radius:5%;display:block;cursor:zoom-in;aspect-ratio:63/88;flex-shrink:0;background:#2b2218}.pc.big{width:200px;box-shadow:0 4px 24px #000}.pc.md{width:130px}.pc.sm{width:84px}.pc.o{outline:3px solid #d0605a;opacity:.85}.pc.i{outline:3px solid #d4af37}.pc.none{aspect-ratio:63/88;background:#2b2218;display:flex;align-items:center;justify-content:center;color:#8d7a5a}
.phead{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}.cmdrs{display:flex;gap:10px}.pmeta{flex:1;min-width:300px}.sum{font-size:16px;line-height:1.5}
.pill{display:inline-block;font:12px sans-serif;text-transform:uppercase;letter-spacing:.5px;border:1px solid #6b5326;border-radius:10px;padding:2px 9px;margin:0 4px 4px 0;color:#c9a55a}.pill.proposed,.pill.v-optional{border-color:#4a8fd0;color:#7fb2e6}.pill.sleeved,.pill.v-recommended{border-color:#4f9a5a;color:#7cc488}.pill.v-operator{border-color:#d4af37;color:#d4af37}
.curve{display:flex;gap:10px;align-items:flex-end;height:120px;margin:12px 0 2px;padding:0 4px;border-bottom:1px solid #6b5326}.cc{display:flex;gap:2px;align-items:flex-end;position:relative;padding-bottom:18px}.cl{position:absolute;bottom:0;left:0;right:0;text-align:center;color:#8d7a5a;font-size:12px}
.cb{width:16px;position:relative;border-radius:2px 2px 0 0}.cb span{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font:11px sans-serif;color:#c9a55a}.cb.s0,.lg.s0{background:#5a4a35}.cb.s1,.lg.s1{background:#d4af37}.lgd{font-size:13px;color:#b8a888}.lg{display:inline-block;width:10px;height:10px;margin-right:4px}
.phases{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.phase{background:#1a150f;border:1px solid #3d3020;border-left:4px solid #d4af37;border-radius:6px;padding:8px 12px}.turns{font:bold 13px sans-serif;color:#d4af37;letter-spacing:1px}
.mini{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.wins{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:12px}.win{background:linear-gradient(180deg,#241c12,#16110c);border:1px solid #8a6a2e;border-radius:8px;padding:10px 14px}.wt{font-size:18px;display:flex;align-items:center;gap:8px}.wn{background:#d4af37;color:#000;border-radius:50%;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font:bold 14px sans-serif}.dmg{color:#e8c872;margin:4px 0}.wturn{font-size:13px;font-style:italic;color:#c9a55a;margin:2px 0 6px 34px}.win .flow{flex-direction:column;align-items:stretch}.win .flow .step{max-width:none}.win .flow .arr{transform:rotate(90deg);align-self:center;line-height:1}
.ptab{border-collapse:collapse;width:auto;min-width:50%}.ptab th,.ptab td{border:1px solid #3d3020;padding:5px 10px;text-align:left}.ptab th{color:#c9a55a;background:#1f1912}.ptab td:not(:first-child){text-align:right;font-variant-numeric:tabular-nums}
.sw{display:flex;gap:14px;align-items:flex-start;padding:12px;margin:0 0 10px;background:#1a150f;border:1px solid #3d3020;border-radius:8px}.sw.v-optional{border-style:dashed}.pair{display:flex;align-items:center;gap:6px;flex-shrink:0}.why{flex:1}.why p{margin:6px 0;line-height:1.45}.swt2{font-size:16px}.red{color:#e07a72}.gold{color:#e8c872}
blockquote{margin:6px 0;padding:4px 10px;font-size:13px;font-style:italic;color:#cfc2a6;background:#15110d}blockquote.qo{border-left:3px solid #d0605a}blockquote.qi{border-left:3px solid #d4af37}.ev{font:12px sans-serif;color:#9a8a6a}.note{font-size:13px;color:#b8a888}
.keep{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px}.kp,.tie{display:flex;gap:10px;align-items:flex-start}.kp p,.tie p{margin:2px 0;font-size:14px}.tie{margin-bottom:8px}.tie .arr{align-self:center}
.mull{display:grid;grid-template-columns:1fr 1fr;gap:16px}.mull ul{margin:4px 0;padding-left:18px}.primer ol li{margin:4px 0;line-height:1.4}
</style></head><body><header>${tabs}<input id="q" type="search" placeholder="filter: name or type…" autofocus><span style="display:block;margin-top:4px;font-size:12px;color:#8d7a5a">tap a card when you find it in the box · gold = new today · red = should be out (tap once removed)</span></header>${sections.join('')}
<script>
const S=JSON.parse(localStorage.getItem('deckcheck')||'{}');const save=()=>localStorage.setItem('deckcheck',JSON.stringify(S));
const count=s=>{const all=s.querySelectorAll('.card:not(.out):not(.cand):not(.swap)');const d=[...all].filter(c=>c.classList.contains('done')).length;s.querySelector('.count').textContent=d+' / '+all.length};
document.querySelectorAll('.card').forEach(c=>{if(S[c.dataset.key])c.classList.add('done');c.onclick=()=>{c.classList.toggle('done');S[c.dataset.key]=c.classList.contains('done');save();count(c.closest('section'))}});
document.querySelectorAll('section').forEach(count);
const q=document.getElementById('q');q.oninput=()=>{const v=q.value.trim().toLowerCase();document.querySelectorAll('.card').forEach(c=>c.classList.toggle('f',!!v&&!c.dataset.name.includes(v)));document.querySelectorAll('.grid').forEach(g=>{const e=!g.querySelector('.card:not(.f)');g.classList.toggle('f',e);g.previousElementSibling.classList.toggle('f',e)})};
document.querySelectorAll('.reset').forEach(b=>b.onclick=()=>{const s=b.closest('section');s.querySelectorAll('.card').forEach(c=>{c.classList.remove('done');delete S[c.dataset.key]});save();count(s)});
document.querySelectorAll('.copy').forEach(b=>b.onclick=()=>{const t=b.previousElementSibling;t.select();(navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).catch(()=>document.execCommand('copy'));b.textContent='Copied ✓'});
const z=document.createElement('img');z.id='zoom';document.body.append(z);
document.addEventListener('mouseover',e=>{const t=e.target,i=t.closest&&(t.matches('img.pc')?t:t.closest('.card')?.querySelector('img')||t.closest('.chip')?.querySelector('img'));if(!i){z.style.display='none';return}z.src=i.src.replace('/normal/','/large/');z.style.display='block'});
document.addEventListener('mousemove',e=>{if(z.style.display!=='block')return;const w=z.offsetWidth,h=z.offsetHeight||w*1.4;let x=e.clientX+24;if(x+w>innerWidth)x=e.clientX-w-24;z.style.left=Math.max(8,x)+'px';z.style.top=Math.min(Math.max(8,e.clientY-h/2),innerHeight-h-8)+'px'});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));document.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s.id!==t.dataset.target))});
</script></body></html>`;

for (const o of OUT) {
  fs.mkdirSync(path.dirname(o), { recursive: true });
  fs.writeFileSync(o, html);
}
const missing = DECKS.flatMap((d) => parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8')).filter((c) => !card(c.name).img).map((c) => `${d.slug}: ${c.name}`));
console.log(`wrote ${OUT.join(' + ')}; cards without image: ${missing.length ? missing.join(', ') : 'none'}`);
