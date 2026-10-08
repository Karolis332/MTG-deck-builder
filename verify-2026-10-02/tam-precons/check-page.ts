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
type DeckSpec = { slug: string; base?: () => string; now?: string; guide?: string; arena?: string; meta?: string; extra?: { label: string; names: string[] } }; // arena = Arena deck name -> copy block emits the About/Name/Commander/Deck import format
const read = (rel: string) => () => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SPECS: DeckSpec[] = [
  // Arena Historic Brawl Jet (model's #1): baseline = the model's own list, so OUT = its filler swaps and the colourless/fetch lands
  {
    slug: 'jet-freedom-fighter-arena', arena: 'Jet Boros v1', base: read('verify-2026-10-08/best-deck/arena-3/top-1-jet-freedom-fighter.txt'), now: 'verify-2026-10-08/best-deck/jet/jet-arena.txt',
    guide: '.claude/skills/deck-building/reference/decks/jet-freedom-fighter-arena.md',
  },
  // Arena Historic Brawl Neriv (model's #2): baseline = the model's own list, so OUT = its filler swaps and the tapped/colourless lands
  {
    slug: 'neriv-heart-of-the-storm-arena', arena: 'Neriv Mardu v1', base: read('verify-2026-10-08/best-deck/arena-3/top-2-neriv-heart-of-the-storm.txt'), now: 'verify-2026-10-08/best-deck/neriv/neriv-arena.txt',
    guide: '.claude/skills/deck-building/reference/decks/neriv-heart-of-the-storm-arena.md',
  },
  // Arena Historic Brawl Krenko: baseline = the model's own list, so OUT = its filler swaps and the colourless lands
  {
    slug: 'krenko-mob-boss-arena', arena: 'Krenko Goblins v1', base: read('verify-2026-10-08/best-deck/krenko-model.txt'), now: 'verify-2026-10-08/best-deck/krenko-arena.txt',
    guide: '.claude/skills/deck-building/reference/decks/krenko-mob-boss-arena.md',
  },
  // Arena Historic Brawl Esika (the deck Arena calls "Tam Superfriends v2"): baseline = the operator's in-Arena v5, so OUT = the 9 double-pip walkers + Sheoldred/Arena, NEW = the ramp + 2 lands
  {
    slug: 'esika-god-of-the-tree-arena', arena: 'Esika Superfriends v6', base: read('verify-2026-10-08/best-deck/esika/esika-v5.base.txt'), now: 'verify-2026-10-08/best-deck/esika/esika-v6.txt',
    guide: '.claude/skills/deck-building/reference/decks/esika-god-of-the-tree-arena.md',
  },
  // Beledros replaces Meren: baseline = the sleeved Meren list, so OUT = Meren cards that stay in the box, NEW = everything else
  {
    slug: 'beledros-witherbloom', base: read('verify-2026-10-08/best-deck/meren-sleeved-2026-10-08.txt'), now: 'verify-2026-10-08/best-deck/beledros-recommended.txt',
    meta: 'verify-2026-10-08/best-deck/beledros-backups.json', // per card: source deck, donor backfill, 3 model-scored backups (beledros-backups.ts)
    guide: '.claude/skills/deck-building/reference/decks/beledros-witherbloom.md',
    extra: {
      label: 'Pulled from other decks: Cabbage (Pest Infestation, Idol, Ribtruss, Kodama’s Reach), Imotekh (Altar, Skorpekh, Arena, Mischief), Gilanra (Baloth). Backfills in guide §3',
      names: ['Pest Infestation', 'Idol of Oblivion', 'Ribtruss Roaster', "Kodama's Reach", "Ashnod's Altar", 'Skorpekh Lord', 'Phyrexian Arena', "Imp's Mischief", 'Thunderfoot Baloth'],
    },
  },
  // the operator's paper Bumi deck (registered 2026-10-07; 3 landscapes are off-colour)
  // sleeved list vs the standalone fix: 3 off-colour landscapes replaced + optional upgrades from free cards only
  { // Killian Orzhov Auras 2026-10-08: the Silverquill Influence precon rebuilt around Killian (base = stock precon list; NEW = loose cards in, OUT = precon cards cut)
    slug: 'killian-decisive-mentor', base: read('verify-2026-10-08/killian/precon-base.txt'), now: 'verify-2026-10-08/killian/killian-final.txt',
    meta: 'verify-2026-10-08/killian/killian-final.meta.json', guide: '.claude/skills/deck-building/reference/decks/killian-decisive-mentor.md',
  },
  { // second-strongest paper commander 2026-10-08: the model's Minthara list with raids (objective 89.9; free pool alone 80.1 = Tron lands + filler). Badges = which sleeved deck holds the card
    slug: 'minthara-merciless-soul', now: 'verify-2026-10-08/best-deck/second-best/minthara-raids.txt', base: () => fs.readFileSync(path.join(ROOT, 'verify-2026-10-08/best-deck/second-best/minthara-raids.txt'), 'utf8'),
    meta: 'verify-2026-10-08/best-deck/second-best/minthara-raids.meta.json',
  },
  { slug: 'bumi-unleashed', base: read('decks/paper/decks/bumi-unleashed.txt'), now: 'verify-2026-10-07/bumi-standalone/final.txt' },
  // partners: Gilanra is the first line, Alena the second (paper-sync keeps one commander)
  {
    // sleeved list vs the engine-first rebuild (41 spells at 6+, engine pieces locked; near-ties live in the primer)
    slug: 'gilanra-alena-partners', base: read('decks/paper/decks/gilanra-alena-partners.txt'), now: 'verify-2026-10-08/gilanra-stompy/final.txt',
    guide: '.claude/skills/deck-building/reference/decks/gilanra-alena-partners.md',
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
// 'Turn' tables become a timeline diagram, 'Piece' tables an engine card grid; anything else stays a table
// diagram cells: drop the ' / ' and ', ' separators between adjacent chips (the chips are the separators)
const cell = (c: string) => inline((c ?? '').replace(/\]\]\s*(\/|,|or)\s*\[\[/g, ']] [['));
const renderTable = (rows: string[][]) => {
  const [head, ...body] = rows;
  if (head[0] === 'Turn')
    return `<div class="timeline">${body.map((r) => `<div class="tnode"><div class="tnum">T${esc(r[0])}</div><small>${esc(head[1] ?? '')}</small><div class="tdo">${cell(r[1])}</div>${r[2] ? `<small>${esc(head[2] ?? '')}</small><div class="twhy">${cell(r[2])}</div>` : ''}</div>`).join('<div class="arr">→</div>')}</div>`;
  if (head[0] === 'Piece')
    return `<div class="pieces">${body.map((r) => `<div class="piece"><div class="pname">${cell(r[0])}</div><div class="pwhat">${cell(r[1])}</div>${r[2] ? `<div class="poracle">${inline(r[2])}</div>` : ''}</div>`).join('')}</div>`;
  return `<table><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</table>`;
};
const md = (src: string) => {
  const out: string[] = [];
  let list = false;
  let tbl: string[][] | null = null;
  const close = () => { if (list) out.push('</ul>'); if (tbl) out.push(renderTable(tbl)); list = false; tbl = null; };
  for (const line of src.split(/\r?\n/)) {
    if (line.startsWith('=> ')) {
      close();
      out.push(flow(line.slice(3).split(' → ')));
      continue;
    }
    const cells = line.startsWith('|') ? line.slice(1, -1).split('|').map((c) => c.trim()) : null;
    if (cells && cells.every((c) => /^-+$/.test(c))) continue;
    if (cells) {
      if (!tbl) { close(); tbl = []; }
      tbl.push(cells);
    } else if (line.startsWith('- ')) {
      if (!list) { close(); list = true; out.push('<ul>'); }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else {
      close();
      const h = line.match(/^(#+)\s+(.*)$/);
      if (h) out.push(`<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`);
      else if (/^\*\*[^*]+\*\*$/.test(line.trim())) out.push(`<h4 class="line">${inline(line.trim().slice(2, -2))}</h4>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out.join('');
};
// badge: 'NEW' for a card not in the baseline, '+N' when a card already there gains copies (basics)
type Backup = { name: string; delta: number; from: string; type: string };
type Info = { from: string; backfill?: string; roles: string[]; candidates: number; backups: Backup[] };
const shortFrom = (f: string) => f.replace(/^The /, '').split(/[ (+]/)[0].toUpperCase() + (/UNCONFIRMED/.test(f) ? ' ?' : ''); // ? = registered from a decklist, never seen
const tile = (c: Card, qty: number, key: string, cls = '', badge = '', info?: Info) =>
  `<div class="card ${cls}${info ? ' meta' : ''}" data-key="${esc(key)}" data-name="${esc((c.name + ' ' + c.type).toLowerCase())}"${info ? ` data-info="${esc(JSON.stringify({ name: c.name, ...info }))}"` : ''}>${c.img ? `<img loading="lazy" src="${esc(c.img)}" alt="${esc(c.name)}">` : `<div class="ph">${esc(c.name)}</div>`}` +
  `${qty > 1 ? `<span class="qty">×${qty}</span>` : ''}${badge ? `<span class="badge">${badge}</span>` : ''}${info ? `<span class="from${info.backfill ? ' donor' : ''}">${esc(shortFrom(info.from))}</span>` : ''}<span class="tick">✓</span></div>`;

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

const IMG: Record<string, string> = {}; // backup card -> image, for the info panel
const sections = DECKS.map((d, i) => {
  const now = parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8'));
  const meta: Record<string, Info> = d.meta && fs.existsSync(path.join(ROOT, d.meta)) ? JSON.parse(fs.readFileSync(path.join(ROOT, d.meta), 'utf8')).cards : {};
  const infoOf = (n: string): Info | undefined => meta[n] ?? Object.entries(meta).find(([k]) => k.split(' // ')[0] === n)?.[1];
  for (const m of Object.values(meta)) for (const b of m.backups) { const img = card(b.name).img; if (img) IMG[b.name] = img; }
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
    byGroup.get(idx === 0 ? 'Commander' : groupOf(k.type))!.push(tile(k, c.qty, `${d.slug}|${c.name}`, badge ? 'new' : '', badge, idx ? infoOf(c.name) : undefined));
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
  const front = (n: string) => n.split(' // ')[0]; // Arena import takes front faces only
  const listText = d.arena
    ? `About\nName ${d.arena}\n\nCommander\n${now[0].qty} ${front(now[0].name)}\n\nDeck\n${now.slice(1).map((c) => `${c.qty} ${front(c.name)}`).join('\n')}`
    : now.map((c) => `${c.qty} ${c.name}`).join('\n');
  const copySummary = d.arena ? `Copy for Arena import (${total} cards · About / Name / Commander / Deck)` : `Copy decklist (${total} cards, commander first)`;
  const copyHtml = `<details class="copybox"><summary>${copySummary}</summary><textarea readonly rows="12">${esc(listText)}</textarea><button class="copy">Copy</button></details>`;
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
:root{--cyan:#19f0ff;--mag:#ff2bd6;--vio:#8a5cff;--sun:#ffb347;--ink:#e9e4ff;--dim:#8f86b8;--panel:rgba(20,8,48,.78);--line:rgba(25,240,255,.35);--line2:rgba(138,92,255,.45)}
body{margin:0;background:#06031a;color:var(--ink);font:15px/1.4 "Segoe UI",system-ui,sans-serif;position:relative}
body::before{content:"";position:fixed;inset:0;z-index:-3;background:radial-gradient(ellipse 120% 70% at 50% -10%,#3a0b6e 0%,#15063a 45%,#06031a 75%)}
.vsun{position:fixed;left:50%;top:-140px;width:520px;height:520px;margin-left:-260px;border-radius:50%;z-index:-2;background:linear-gradient(180deg,var(--sun) 0%,var(--mag) 55%,var(--vio) 100%);-webkit-mask:repeating-linear-gradient(180deg,#000 0 26px,transparent 26px 34px);mask:repeating-linear-gradient(180deg,#000 0 26px,transparent 26px 34px);opacity:.45}
.vfloor{position:fixed;left:-50%;right:-50%;bottom:-10vh;height:55vh;z-index:-1;pointer-events:none;background-image:linear-gradient(rgba(255,43,214,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(25,240,255,.4) 1px,transparent 1px);background-size:64px 64px;transform:perspective(520px) rotateX(62deg);transform-origin:50% 0;-webkit-mask:linear-gradient(180deg,transparent 0%,#000 25%,#000 100%);mask:linear-gradient(180deg,transparent 0%,#000 25%,#000 100%);animation:vscroll 9s linear infinite}
@keyframes vscroll{from{background-position:0 0,0 0}to{background-position:0 64px,0 0}}
.vscan{position:fixed;inset:0;z-index:8;pointer-events:none;opacity:.25;background:repeating-linear-gradient(180deg,rgba(0,0,0,.28) 0 2px,transparent 2px 4px)}
header{position:sticky;top:0;z-index:4;background:rgba(8,3,28,.88);backdrop-filter:blur(6px);padding:10px;border-bottom:1px solid var(--line);box-shadow:0 0 18px rgba(25,240,255,.18)}
.tab{background:var(--panel);color:var(--ink);border:1px solid var(--line);padding:6px 12px;margin-right:6px;cursor:pointer;border-radius:4px;letter-spacing:.04em}.tab.on{background:var(--cyan);color:#06031a;font-weight:700;box-shadow:0 0 12px var(--cyan)}
#q{background:rgba(10,4,30,.85);color:var(--ink);border:1px solid var(--line);padding:6px 10px;border-radius:4px;width:220px;box-shadow:0 0 10px rgba(25,240,255,.25)}.card.f,.grid.f,h3.f{display:none}
.bar{padding:10px 14px;font-size:17px}.bar b{color:#fff;text-shadow:0 0 10px var(--cyan),0 0 22px var(--cyan);letter-spacing:.06em}.reset{margin-left:10px;background:none;color:var(--cyan);border:1px solid var(--line);cursor:pointer;border-radius:3px}
section{padding:0 14px 40px;position:relative;z-index:1}.hidden{display:none}h3{color:var(--cyan);text-shadow:0 0 8px var(--cyan);margin:18px 0 8px;font-size:14px;letter-spacing:.26em;text-transform:uppercase}h3 small{color:var(--dim);letter-spacing:0}.outh{color:var(--mag);text-shadow:0 0 8px var(--mag)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.card{position:relative;cursor:pointer;border-radius:9px;overflow:hidden;border:3px solid rgba(25,240,255,.18);background:var(--panel);transition:transform .15s ease,box-shadow .15s ease}.card:hover{transform:translateY(-4px);box-shadow:0 0 16px rgba(255,43,214,.5),0 0 32px rgba(25,240,255,.3);z-index:2}.card img{width:100%;display:block}
.card.new{border-color:var(--cyan);box-shadow:0 0 10px rgba(25,240,255,.45)}.card.out{border-color:var(--mag);opacity:.72}.card.cand{border-color:var(--sun)}.candh{color:var(--sun);text-shadow:0 0 8px var(--sun)}.ph{aspect-ratio:63/88;display:flex;align-items:center;justify-content:center;text-align:center;background:var(--panel);padding:8px}
.badge,.qty{position:absolute;top:6px;font:bold 12px sans-serif;padding:2px 7px;border-radius:10px}.badge{left:6px;background:var(--cyan);color:#06031a;box-shadow:0 0 10px var(--cyan)}.qty{right:6px;background:var(--mag);color:#fff;box-shadow:0 0 10px var(--mag)}
.tick{display:none;position:absolute;inset:0;background:rgba(25,240,255,.38);color:#fff;font:bold 64px sans-serif;align-items:center;justify-content:center;text-shadow:0 0 12px #000}
.card.done .tick{display:flex}.card.out.done .tick{background:rgba(255,43,214,.42)}
.swt{color:var(--ink);margin:22px 0 4px;border-bottom:1px solid var(--line);font-size:20px}.card.out.swap .badge{background:var(--mag);color:#fff;box-shadow:0 0 10px var(--mag)}
details{margin:8px 0;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px 12px}summary{cursor:pointer;color:var(--cyan);font-size:15px;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 0 8px var(--cyan)}
.copybox textarea{width:100%;box-sizing:border-box;background:#06031a;color:var(--ink);border:1px solid var(--line);font:13px Consolas,monospace;margin:8px 0}.copy{background:var(--cyan);color:#06031a;border:0;padding:6px 14px;border-radius:4px;cursor:pointer;font-weight:700;box-shadow:0 0 12px var(--cyan)}
.chip{display:inline-flex;align-items:center;gap:4px;background:rgba(20,8,48,.9);border:1px solid var(--line);border-radius:5px;padding:1px 5px 1px 1px;margin:1px 2px;white-space:nowrap}.chip .ci{height:34px;border-radius:3px}
.flow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0;padding:10px;background:rgba(6,3,26,.7);border:1px dashed var(--line2);border-radius:6px}.flow .step{background:var(--panel);border:1px solid var(--line2);border-radius:6px;padding:6px 8px;max-width:230px;font-size:14px;text-align:center}
.flow .chip{display:flex;flex-direction:column;white-space:normal;border:0;background:none;padding:0}.flow .chip .ci{height:auto;width:110px}.arr{color:var(--mag);font-size:26px;text-shadow:0 0 8px var(--mag)}
.guide table{border-collapse:collapse;margin:6px 0 12px;width:100%}.guide th,.guide td{border:1px solid var(--line2);padding:5px 7px;vertical-align:top;text-align:left}.guide th{color:var(--cyan)}.guide h3,.guide h4{color:var(--cyan);margin:14px 0 6px}.guide h3{font-size:16px;letter-spacing:.1em;text-transform:none}.guide code{color:var(--sun)}.guide li{margin:3px 0}
.guide{font-size:17px;line-height:1.55}.guide p{margin:8px 0}.guide p .chip .ci,.guide li .chip .ci,.guide td .chip .ci,.guide .tnode .chip .ci,.guide .pwhat .chip .ci{height:58px}.guide .chip b{font-size:15px}.guide table{font-size:15px}.guide th,.guide td{padding:8px 10px}.guide h3{font-size:22px}.guide h4.line{font-size:20px;color:var(--sun);margin:20px 0 4px;text-shadow:0 0 8px rgba(255,200,80,.5)}
.guide .flow{gap:12px;padding:14px}.guide .flow .step{max-width:320px;font-size:16px;padding:10px 12px;line-height:1.35}.guide .flow .chip .ci{width:150px}.guide .flow .chip b{font-size:15px}.guide .arr{font-size:42px}
.timeline{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin:10px 0}.tnode{flex:1 1 230px;max-width:360px;background:var(--panel);border:1px solid var(--line2);border-radius:8px;padding:10px 12px;font-size:15px}.tdo,.pname{line-height:1.5}.tnode .chip,.pname .chip{margin:3px 4px 3px 0;vertical-align:middle}.tnum{font-size:28px;font-weight:700;color:var(--cyan);text-shadow:0 0 10px var(--cyan)}.tnode small{display:block;color:var(--mag);letter-spacing:.1em;text-transform:uppercase;font-size:11px;margin-top:6px}.twhy{opacity:.85}.timeline .arr{align-self:center}
.pieces{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:10px;margin:10px 0}.piece{background:var(--panel);border:1px solid var(--line2);border-radius:8px;padding:10px 12px;font-size:15px}.pname{margin-bottom:6px}.pname .chip .ci{height:84px}.pwhat{color:#fff}.poracle{margin-top:6px;font-size:13px;opacity:.75;font-style:italic}
.from{position:absolute;bottom:6px;left:6px;font:bold 10px sans-serif;letter-spacing:.08em;padding:2px 7px;border-radius:10px;background:rgba(6,3,26,.88);color:var(--sun);border:1px solid var(--sun)}.from.donor{color:var(--mag);border-color:var(--mag)}.card.meta{cursor:help}
#info{position:fixed;inset:0;z-index:20;display:none;background:rgba(6,3,26,.72);backdrop-filter:blur(4px)}#info.on{display:flex;align-items:center;justify-content:center}.ibox{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 22px;max-width:960px;width:92vw;max-height:92vh;overflow:auto;box-shadow:0 0 30px rgba(25,240,255,.35)}
.ibox h2{margin:0 0 4px;color:#fff;font-size:24px;text-shadow:0 0 10px var(--cyan)}.ibox .src{color:var(--sun);font-size:16px;margin:4px 0}.ibox .src b{color:#fff}.ibox .roles{color:var(--dim);font-size:13px;letter-spacing:.1em;text-transform:uppercase}.ibox h4{color:var(--cyan);margin:14px 0 6px;letter-spacing:.2em;text-transform:uppercase;font-size:13px}
.bk{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.bk .b{text-align:center;background:rgba(6,3,26,.6);border:1px solid var(--line2);border-radius:8px;padding:8px}.bk img{width:100%;border-radius:7px}.bk b{display:block;margin-top:6px;color:#fff}.bk .d{font:bold 15px sans-serif;color:var(--cyan)}.bk .d.neg{color:var(--mag)}.bk small{display:block;color:var(--dim);margin-top:2px}
.ibtn{margin:14px 8px 0 0;border:0;padding:8px 16px;border-radius:4px;font-weight:700;cursor:pointer}.ibtn.found{background:var(--cyan);color:#06031a;box-shadow:0 0 12px var(--cyan)}.ibtn.close{background:none;color:var(--dim);border:1px solid var(--line2)}
#zoom{position:fixed;z-index:9;display:none;pointer-events:none;width:min(440px,46vw);border-radius:18px;box-shadow:0 0 30px rgba(255,43,214,.7),0 0 60px rgba(25,240,255,.4)}
.primer{padding:10px 16px}.primer h2{margin:0 0 6px;font-size:28px;letter-spacing:.12em;text-transform:uppercase;color:#fff;text-shadow:0 0 10px var(--cyan),0 0 26px var(--cyan),3px 0 0 rgba(255,43,214,.75),-3px 0 0 rgba(25,240,255,.75)}.primer h4{color:var(--cyan);margin:12px 0 4px;letter-spacing:.08em}
.psec{margin:18px 0 0;padding-top:10px;border-top:1px solid var(--line2)}.psec>h3{font-size:13px;letter-spacing:.3em;margin:0 0 10px;display:flex;align-items:center;gap:12px}.psec>h3::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--cyan),transparent);opacity:.6}
.pc{border-radius:5%;display:block;cursor:zoom-in;aspect-ratio:63/88;flex-shrink:0;background:var(--panel)}.pc.big{width:200px;box-shadow:0 0 24px rgba(255,43,214,.55)}.pc.md{width:130px}.pc.sm{width:84px}.pc.o{outline:3px solid var(--mag);opacity:.85}.pc.i{outline:3px solid var(--cyan)}.pc.none{aspect-ratio:63/88;background:var(--panel);display:flex;align-items:center;justify-content:center;color:var(--dim)}
.phead{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}.cmdrs{display:flex;gap:10px}.pmeta{flex:1;min-width:300px}.sum{font-size:16px;line-height:1.5}
.pill{display:inline-block;font:11px sans-serif;text-transform:uppercase;letter-spacing:.14em;border:1px solid var(--line);border-radius:10px;padding:2px 9px;margin:0 4px 4px 0;color:var(--cyan)}.pill.proposed,.pill.v-optional{border-color:rgba(255,43,214,.6);color:var(--mag)}.pill.sleeved,.pill.v-recommended{border-color:rgba(92,242,160,.6);color:#5cf2a0}.pill.v-operator{border-color:var(--sun);color:var(--sun)}
.curve{display:flex;gap:10px;align-items:flex-end;height:120px;margin:12px 0 2px;padding:0 4px;border-bottom:1px solid var(--line)}.cc{display:flex;gap:2px;align-items:flex-end;position:relative;padding-bottom:18px}.cl{position:absolute;bottom:0;left:0;right:0;text-align:center;color:var(--dim);font-size:12px}
.cb{width:16px;position:relative;border-radius:2px 2px 0 0}.cb span{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font:11px sans-serif;color:var(--ink)}.cb.s0,.lg.s0{background:#4a3a8a}.cb.s1,.lg.s1{background:var(--cyan);box-shadow:0 0 8px var(--cyan)}.lgd{font-size:13px;color:var(--dim)}.lg{display:inline-block;width:10px;height:10px;margin-right:4px}
.phases{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.phase{background:var(--panel);border:1px solid var(--line2);border-left:4px solid var(--cyan);border-radius:6px;padding:8px 12px}.turns{font:bold 13px sans-serif;color:var(--cyan);letter-spacing:.2em;text-transform:uppercase}
.mini{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.wins{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:12px}.win{background:linear-gradient(180deg,rgba(58,11,110,.55),rgba(6,3,26,.8));border:1px solid rgba(255,43,214,.5);border-radius:8px;padding:10px 14px;box-shadow:0 0 14px rgba(255,43,214,.2)}.wt{font-size:18px;display:flex;align-items:center;gap:8px;color:#fff}.wn{background:var(--mag);color:#fff;border-radius:50%;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font:bold 14px sans-serif;box-shadow:0 0 10px var(--mag)}.dmg{color:var(--sun);margin:4px 0}.wturn{font-size:13px;font-style:italic;color:var(--dim);margin:2px 0 6px 34px}.win .flow{flex-direction:column;align-items:stretch}.win .flow .step{max-width:none}.win .flow .arr{transform:rotate(90deg);align-self:center;line-height:1}
.ptab{border-collapse:collapse;width:auto;min-width:50%}.ptab th,.ptab td{border:1px solid var(--line2);padding:5px 10px;text-align:left}.ptab th{color:var(--cyan);background:rgba(20,8,48,.9)}.ptab td:not(:first-child){text-align:right;font-variant-numeric:tabular-nums}
.sw{display:flex;gap:14px;align-items:flex-start;padding:12px;margin:0 0 10px;background:var(--panel);border:1px solid var(--line2);border-radius:8px}.sw.v-optional{border-style:dashed}.pair{display:flex;align-items:center;gap:6px;flex-shrink:0}.why{flex:1}.why p{margin:6px 0;line-height:1.45}.swt2{font-size:16px}.red{color:var(--mag)}.gold{color:var(--cyan)}
blockquote{margin:6px 0;padding:4px 10px;font-size:13px;font-style:italic;color:#cfc8f0;background:rgba(6,3,26,.7)}blockquote.qo{border-left:3px solid var(--mag)}blockquote.qi{border-left:3px solid var(--cyan)}.ev{font:12px sans-serif;color:var(--dim)}.note{font-size:13px;color:var(--dim)}
.keep{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px}.kp,.tie{display:flex;gap:10px;align-items:flex-start}.kp p,.tie p{margin:2px 0;font-size:14px}.tie{margin-bottom:8px}.tie .arr{align-self:center}
.mull{display:grid;grid-template-columns:1fr 1fr;gap:16px}.mull ul{margin:4px 0;padding-left:18px}.primer ol li{margin:4px 0;line-height:1.4}
</style></head><body><div class="vsun"></div><div class="vfloor"></div><div class="vscan"></div><header>${tabs}<input id="q" type="search" placeholder="filter: name or type…" autofocus><span style="display:block;margin-top:4px;font-size:12px;color:#8f86b8;letter-spacing:.06em">tap a card when you find it in the box · cyan = new today · magenta = should be out (tap once removed) · Beledros: click a card for its source deck and 3 scored backups (shift-click = found)</span></header>${sections.join('')}<div id="info"><div class="ibox"></div></div>
<script>
const S=JSON.parse(localStorage.getItem('deckcheck')||'{}');const save=()=>localStorage.setItem('deckcheck',JSON.stringify(S));
const count=s=>{const all=s.querySelectorAll('.card:not(.out):not(.cand):not(.swap)');const d=[...all].filter(c=>c.classList.contains('done')).length;s.querySelector('.count').textContent=d+' / '+all.length};
const IMG=${JSON.stringify(IMG)};const info=document.getElementById('info'),ibox=info.querySelector('.ibox');let icard=null;
const toggle=c=>{c.classList.toggle('done');S[c.dataset.key]=c.classList.contains('done');save();count(c.closest('section'))};
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const openInfo=c=>{const m=JSON.parse(c.dataset.info);icard=c;const bk=m.backups.map(b=>'<div class="b">'+(IMG[b.name]?'<img loading="lazy" src="'+esc(IMG[b.name])+'" alt="">':'')+'<b>'+esc(b.name)+'</b><span class="d'+(b.delta<0?' neg':'')+'">'+(b.delta>=0?'+':'')+b.delta.toFixed(2)+'</span><small>'+esc(b.from)+' · '+esc(b.type)+(b.incl!=null?' · '+Math.round(b.incl*100)+'% of Beledros decks':'')+'</small></div>').join('');
ibox.innerHTML='<h2>'+esc(m.name)+'</h2><div class="src">Pull from: <b>'+esc(m.from)+'</b>'+(m.backfill?' · that deck gets <b>'+esc(m.backfill)+'</b> back':'')+'</div><div class="roles">'+(m.roles.length?'role: '+m.roles.join(', '):'no classifier role')+' · '+m.candidates+' owned candidates scored</div><h4>If it is missing: 3 backups (model Δ vs the 99; ties within 0.25 broken by Beledros inclusion)</h4><div class="bk">'+(bk||'<i>none</i>')+'</div><button class="ibtn found">'+(c.classList.contains('done')?'✓ Found (undo)':'✓ Found')+'</button><button class="ibtn close">Close</button>';
ibox.querySelector('.found').onclick=()=>{toggle(c);info.classList.remove('on')};ibox.querySelector('.close').onclick=()=>info.classList.remove('on');info.classList.add('on')};
info.onclick=e=>{if(e.target===info)info.classList.remove('on')};document.addEventListener('keydown',e=>{if(e.key==='Escape')info.classList.remove('on')});
document.querySelectorAll('.card').forEach(c=>{if(S[c.dataset.key])c.classList.add('done');c.onclick=e=>{if(c.dataset.info&&!e.shiftKey)openInfo(c);else toggle(c)}});
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
