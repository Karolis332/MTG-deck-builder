/**
 * One-off: turn verify-2026-09-28/deck-audit/final-swaps.json into one self-contained HTML page
 * showing every proposed swap across the five paper decks, with card images and reasons.
 *
 *   MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx verify-2026-09-28/deck-audit/upgrade-page.ts [--data <path>]
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '../..');
const DATA_ARG_IDX = process.argv.indexOf('--data');
const DATA_PATH = DATA_ARG_IDX >= 0 ? path.resolve(process.argv[DATA_ARG_IDX + 1]) : path.join(__dirname, 'final-swaps.json');
const OUT = [
  path.join(ROOT, 'decks/paper/deck-upgrades.html'),
  'C:/Users/QuLeR/Desktop/MTG collection/MTG decks/deck-upgrades.html',
];

const dbDir = process.env.MTG_DB_DIR || path.join(process.env.APPDATA!, 'the-black-grimoire', 'data');
const db = new Database(path.join(dbDir, 'mtg-deck-builder.db'), { readonly: true });
const cardQ = db.prepare(
  "select name, image_uri_normal as img from cards where name = ? or name like ? order by (layout not in ('art_series','token')) desc, (image_uri_normal is not null) desc, length(name) limit 1",
);
type Card = { name: string; img: string | null };
const unresolved: string[] = [];
const cardCache = new Map<string, Card | null>();
const card = (n: string): Card | null => {
  if (cardCache.has(n)) return cardCache.get(n)!;
  const c = (cardQ.get(n, n + ' // %') as Card | undefined) ?? null;
  if (!c) unresolved.push(n);
  cardCache.set(n, c);
  return c;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Swap {
  in: string | null;
  out: string | null;
  round: 1 | 2;
  verdict: 'KEEP' | 'REJECT';
  rank: number;
  tier: 'registered' | 'ASSUMED' | 'IF-OWNED';
  why_in: string;
  why_out: string;
  verdict_reason: string;
  note?: string;
}
interface DeckSwaps {
  slug: string;
  commander: string;
  swaps: Swap[];
}
interface FinalSwaps {
  generated: string;
  decks: DeckSwaps[];
}

const data: FinalSwaps = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const listCount = (slug: string): number => {
  const file = path.join(ROOT, 'decks/paper/decks', `${slug}.txt`);
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  return lines.reduce((s, l) => s + (+/^(\d+) /.exec(l)![1]), 0);
};

// KEEP swaps that reverse an earlier operator decision carry a note starting with HELD: shown, never counted or pulled
const isHeld = (s: Swap) => /^HELD/.test(s.note ?? '');
const applied = (d: DeckSwaps) => d.swaps.filter((s) => s.verdict === 'KEEP' && !isHeld(s));

const tierBadge = (t: Swap['tier']) => {
  const label = t === 'registered' ? 'registered' : t === 'ASSUMED' ? 'ASSUMED — confirm you own it' : 'IF-OWNED — only if you own it';
  return `<span class="tier t-${t}">${esc(label)}</span>`;
};

// ponytail: shared image-or-placeholder markup instead of two near-duplicate tile builders
const cardBox = (n: string | null, kind: 'in' | 'out', big: boolean) => {
  const w = big ? 160 : 110;
  if (!n) return `<div class="placeholder" style="width:${w}px">(no card — fixes the count)</div>`;
  const c = card(n);
  const img = c?.img
    ? `<img loading="lazy" src="${esc(c.img)}" alt="${esc(n)}" style="width:${w}px">`
    : `<div class="noimg" style="width:${w}px">${esc(n)}</div>`;
  return `<div class="cardbox ${kind}">${img}<span class="lbl lbl-${kind}">${kind.toUpperCase()}</span><small>${esc(n)}</small></div>`;
};

const swapRow = (s: Swap, big: boolean) => `
<div class="swaprow ${big ? '' : 'small'}">
  ${cardBox(s.out, 'out', big)}
  <span class="arrow">&rarr;</span>
  ${cardBox(s.in, 'in', big)}
  <div class="swapinfo">
    <div class="badges">${tierBadge(s.tier)}<span class="round">round ${s.round}</span><span class="rank">rank ${s.rank}</span></div>
    ${s.why_in ? `<p><b>Why in:</b> ${esc(s.why_in)}</p>` : ''}
    ${s.why_out ? `<p><b>Why out:</b> ${esc(s.why_out)}</p>` : ''}
    <p><b>Verdict:</b> ${esc(s.verdict_reason)}</p>
    ${s.note ? `<p class="muted">${esc(s.note)}</p>` : ''}
  </div>
</div>`;

const deckSection = (d: DeckSwaps) => {
  const keep = applied(d).sort((a, b) => a.rank - b.rank);
  const held = d.swaps.filter(isHeld).sort((a, b) => a.rank - b.rank);
  const reject = d.swaps.filter((s) => s.verdict === 'REJECT').sort((a, b) => a.rank - b.rank);
  const cmd = card(d.commander);
  return `
<h2 id="${esc(d.slug)}">${esc(d.commander)}</h2>
<div class="deckhead">${cmd?.img ? `<img class="cmdimg" src="${esc(cmd.img)}" alt="${esc(d.commander)}">` : ''}</div>
<div class="keeps">${keep.map((s) => swapRow(s, true)).join('')}</div>
${held.length ? `<h3 class="heldh">Needs your yes (${held.length}) — reverses an earlier decision, not counted below</h3><div class="keeps held">${held.map((s) => swapRow(s, true)).join('')}</div>` : ''}
<details><summary>Considered and rejected (${reject.length})</summary>
<div class="rejects">${reject.map((s) => swapRow(s, false)).join('')}</div>
</details>`;
};

const summaryRow = (d: DeckSwaps) => {
  const keep = applied(d);
  const flagged = keep.filter((s) => s.tier !== 'registered' && s.in).length;
  const delta = keep.reduce((n, s) => n + (s.in ? 1 : 0) - (s.out ? 1 : 0), 0);
  const count = listCount(d.slug) + delta;
  return `<tr><td><a href="#${esc(d.slug)}">${esc(d.commander)}</a></td><td>${keep.length}</td><td>${flagged}</td><td>${d.swaps.filter(isHeld).length}</td><td>${count}</td></tr>`;
};

const pullList = (d: DeckSwaps) => {
  const keep = applied(d);
  const outs = keep.filter((s) => s.out).map((s) => `<label><input type="checkbox" data-n="pull:${esc(d.slug)}:out:${esc(s.out!)}"> ${esc(s.out!)}</label>`);
  const ins = keep
    .filter((s) => s.in)
    .map((s) => `<label><input type="checkbox" data-n="pull:${esc(d.slug)}:in:${esc(s.in!)}"> ${esc(s.in!)} ${s.tier !== 'registered' ? tierBadge(s.tier) : ''}</label>`);
  return `<div class="pulldeck"><h3>${esc(d.commander)}</h3>
<div class="pullcols"><div><b>Take out</b>${outs.join('') || '<p class="muted">none</p>'}</div><div><b>Put in</b>${ins.join('') || '<p class="muted">none</p>'}</div></div></div>`;
};

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paper deck upgrades — 2026-09-28</title><style>
body{margin:0;background:#15110d;color:#e8dcc4;font:15px/1.45 Georgia,serif}
header{position:sticky;top:0;background:#1d1711;border-bottom:1px solid #6b5220;padding:10px 18px;display:flex;gap:18px;align-items:center;z-index:3;flex-wrap:wrap}
h1{font-size:19px;margin:0;color:#d4af37;letter-spacing:.04em}
h2{scroll-margin-top:60px;font-size:17px;color:#d4af37;margin:26px 18px 8px;border-bottom:1px solid #3a2d17;padding-bottom:4px}
h3{color:#d4af37;margin:16px 0 6px}.heldh{margin:14px 18px 0;font-size:14px}.held .swaprow{border-style:dashed}
nav a{color:#b5a27b;font-size:13px;margin-right:12px;text-decoration:none}nav a:hover{color:#d4af37}
table{border-collapse:collapse;margin:0 18px;width:calc(100% - 36px)}td,th{border-bottom:1px solid #3a2d17;padding:8px 8px;vertical-align:top;text-align:left;font-size:14px}th{color:#d4af37;font-weight:normal;font-size:13px}
.deckhead{padding:0 18px}.cmdimg{width:200px;border-radius:10px}
.keeps,.rejects{display:flex;flex-direction:column;gap:10px;padding:0 18px;margin:10px 0}
.swaprow{display:flex;align-items:flex-start;gap:14px;background:#1d1711;border:1px solid #3a2d17;border-radius:8px;padding:12px}
.swaprow.small{padding:8px}.swaprow.small p{font-size:12px}
.cardbox{position:relative;text-align:center;flex-shrink:0}.cardbox img{border-radius:6px;display:block}
.cardbox .lbl{position:absolute;top:4px;left:4px;font:11px monospace;padding:1px 6px;border-radius:4px}
.cardbox.out img{opacity:.5;filter:grayscale(.6)}.lbl-out{background:#7a2020;color:#fff}
.cardbox.in img{border:2px solid #d4af37}.lbl-in{background:#8b6914;color:#fff}
.cardbox small{display:block;color:#b5a27b;font-size:11px;max-width:160px}
.placeholder{border:1px dashed #3a2d17;border-radius:6px;color:#7d6c4d;font-size:12px;padding:20px 8px;text-align:center;align-self:center}
.noimg{border:1px solid #3a2d17;border-radius:6px;color:#e8dcc4;font-size:12px;padding:20px 8px;text-align:center}
.arrow{align-self:center;color:#d4af37;font-size:20px}
.swapinfo{flex:1}.swapinfo p{margin:3px 0}.swapinfo b{color:#d4af37}
.badges{display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap}
.tier{border-radius:10px;padding:1px 9px;font:11px monospace}
.t-registered{background:#3a2d17;color:#b5a27b}.t-ASSUMED{background:#6b5220;color:#fff}.t-IF-OWNED{background:#7a2020;color:#fff}
.round,.rank{font:11px monospace;color:#7d6c4d}
.muted{color:#b5a27b;font-size:13px}
details{margin:0 18px 10px}summary{cursor:pointer;color:#d4af37;padding:6px 0}
.pulldeck{margin:0 18px 20px;background:#1d1711;border:1px solid #3a2d17;border-radius:8px;padding:12px 16px}
.pullcols{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pullcols label{display:block;padding:2px 0;font-size:13px}
.pullcols label:has(input:checked){opacity:.4;text-decoration:line-through}
footer{margin:30px 18px;color:#7d6c4d;font-size:12px}
</style></head><body>
<header><h1>Paper deck upgrades — 2026-09-28</h1>
<nav style="margin-left:auto">${data.decks.map((d) => `<a href="#${esc(d.slug)}">${esc(d.commander)}</a>`).join('')}<a href="#pull">Pull list</a></nav></header>

<h2 id="summary">Summary</h2>
<table><tr><th>Deck</th><th>KEEP swaps</th><th>ASSUMED / IF-OWNED ins</th><th>Held for your yes</th><th>Card count after</th></tr>
${data.decks.map(summaryRow).join('')}</table>

${data.decks.map(deckSection).join('\n')}

<h2 id="pull">Pull list</h2>
${data.decks.map(pullList).join('')}

<footer>Source: verify-2026-09-28/deck-audit/final-swaps.json (generated ${esc(data.generated)}) · generated ${new Date().toISOString().slice(0, 10)} by verify-2026-09-28/deck-audit/upgrade-page.ts · card images (c) Wizards of the Coast via Scryfall.</footer>
<script>
const KEY='pull:deck-upgrades';const boxes=[...document.querySelectorAll('input[data-n]')];
let s={};try{s=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){s={}}
boxes.forEach(b=>{b.checked=!!s[b.dataset.n];b.addEventListener('change',()=>{s[b.dataset.n]=b.checked;localStorage.setItem(KEY,JSON.stringify(s))})});
</script></body></html>`;

if (unresolved.length) {
  console.error('unresolved cards:', unresolved.join(', '));
  process.exit(1);
}

for (const f of OUT) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
  console.log('wrote', f, (html.length / 1024).toFixed(0) + ' KB');
}
