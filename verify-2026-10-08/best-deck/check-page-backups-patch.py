"""check-page.ts: per-card source deck + 3 scored backups (DeckSpec.meta -> beledros-backups.json).
A card with meta opens an info panel on click (source deck, backfill for the donor, 3 backups with images and the
model delta, a Found toggle); shift-click still ticks directly. Idempotent: every anchor is asserted unique."""
import pathlib, sys

P = pathlib.Path("verify-2026-10-02/tam-precons/check-page.ts")
s = P.read_text(encoding="utf-8")
if "meta?: string" in s:
    sys.exit("already patched")


def rep(old: str, new: str) -> None:
    global s
    n = s.count(old)
    if n != 1:
        sys.exit(f"anchor found {n}x: {old[:70]!r}")
    s = s.replace(old, new)


# 1. DeckSpec.meta + the Beledros spec
rep("arena?: string; extra?: { label: string; names: string[] } };",
    "arena?: string; meta?: string; extra?: { label: string; names: string[] } };")
rep("    slug: 'beledros-witherbloom', base: read('decks/paper/decks/meren-of-clan-nel-toth.txt'), now: 'verify-2026-10-08/best-deck/beledros-recommended.txt',",
    "    slug: 'beledros-witherbloom', base: read('decks/paper/decks/meren-of-clan-nel-toth.txt'), now: 'verify-2026-10-08/best-deck/beledros-recommended.txt',\n"
    "    meta: 'verify-2026-10-08/best-deck/beledros-backups.json', // per card: source deck, donor backfill, 3 model-scored backups (beledros-backups.ts)")

# 2. tile(): optional info -> source badge + data-info JSON
rep("const tile = (c: Card, qty: number, key: string, cls = '', badge = '') =>\n"
    "  `<div class=\"card ${cls}\" data-key=\"${esc(key)}\" data-name=\"${esc((c.name + ' ' + c.type).toLowerCase())}\">",
    "type Backup = { name: string; delta: number; from: string; type: string };\n"
    "type Info = { from: string; backfill?: string; roles: string[]; candidates: number; backups: Backup[] };\n"
    "const shortFrom = (f: string) => f.replace(/^The /, '').split(/[ (+]/)[0].toUpperCase();\n"
    "const tile = (c: Card, qty: number, key: string, cls = '', badge = '', info?: Info) =>\n"
    "  `<div class=\"card ${cls}${info ? ' meta' : ''}\" data-key=\"${esc(key)}\" data-name=\"${esc((c.name + ' ' + c.type).toLowerCase())}\"${info ? ` data-info=\"${esc(JSON.stringify({ name: c.name, ...info }))}\"` : ''}>")
rep("${qty > 1 ? `<span class=\"qty\">×${qty}</span>` : ''}${badge ? `<span class=\"badge\">${badge}</span>` : ''}<span class=\"tick\">✓</span></div>`;",
    "${qty > 1 ? `<span class=\"qty\">×${qty}</span>` : ''}${badge ? `<span class=\"badge\">${badge}</span>` : ''}${info ? `<span class=\"from${info.backfill ? ' donor' : ''}\">${esc(shortFrom(info.from))}</span>` : ''}<span class=\"tick\">✓</span></div>`;")

# 3. sections: load meta, pass info per card, collect backup images
rep("const sections = DECKS.map((d, i) => {\n  const now = parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8'));",
    "const IMG: Record<string, string> = {}; // backup card -> image, for the info panel\n"
    "const sections = DECKS.map((d, i) => {\n  const now = parse(fs.readFileSync(path.join(ROOT, d.file), 'utf8'));\n"
    "  const meta: Record<string, Info> = d.meta && fs.existsSync(path.join(ROOT, d.meta)) ? JSON.parse(fs.readFileSync(path.join(ROOT, d.meta), 'utf8')).cards : {};\n"
    "  const infoOf = (n: string): Info | undefined => meta[n] ?? Object.entries(meta).find(([k]) => k.split(' // ')[0] === n)?.[1];\n"
    "  for (const m of Object.values(meta)) for (const b of m.backups) { const img = card(b.name).img; if (img) IMG[b.name] = img; }")
rep("    byGroup.get(idx === 0 ? 'Commander' : groupOf(k.type))!.push(tile(k, c.qty, `${d.slug}|${c.name}`, badge ? 'new' : '', badge));",
    "    byGroup.get(idx === 0 ? 'Commander' : groupOf(k.type))!.push(tile(k, c.qty, `${d.slug}|${c.name}`, badge ? 'new' : '', badge, idx ? infoOf(c.name) : undefined));")

# 4. CSS + panel markup + JS
rep("#zoom{position:fixed;",
    ".from{position:absolute;bottom:6px;left:6px;font:bold 10px sans-serif;letter-spacing:.08em;padding:2px 7px;border-radius:10px;background:rgba(6,3,26,.88);color:var(--sun);border:1px solid var(--sun)}.from.donor{color:var(--mag);border-color:var(--mag)}.card.meta{cursor:help}\n"
    "#info{position:fixed;inset:0;z-index:20;display:none;background:rgba(6,3,26,.72);backdrop-filter:blur(4px)}#info.on{display:flex;align-items:center;justify-content:center}.ibox{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 22px;max-width:960px;width:92vw;max-height:92vh;overflow:auto;box-shadow:0 0 30px rgba(25,240,255,.35)}\n"
    ".ibox h2{margin:0 0 4px;color:#fff;font-size:24px;text-shadow:0 0 10px var(--cyan)}.ibox .src{color:var(--sun);font-size:16px;margin:4px 0}.ibox .src b{color:#fff}.ibox .roles{color:var(--dim);font-size:13px;letter-spacing:.1em;text-transform:uppercase}.ibox h4{color:var(--cyan);margin:14px 0 6px;letter-spacing:.2em;text-transform:uppercase;font-size:13px}\n"
    ".bk{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.bk .b{text-align:center;background:rgba(6,3,26,.6);border:1px solid var(--line2);border-radius:8px;padding:8px}.bk img{width:100%;border-radius:7px}.bk b{display:block;margin-top:6px;color:#fff}.bk .d{font:bold 15px sans-serif;color:var(--cyan)}.bk .d.neg{color:var(--mag)}.bk small{display:block;color:var(--dim);margin-top:2px}\n"
    ".ibtn{margin:14px 8px 0 0;border:0;padding:8px 16px;border-radius:4px;font-weight:700;cursor:pointer}.ibtn.found{background:var(--cyan);color:#06031a;box-shadow:0 0 12px var(--cyan)}.ibtn.close{background:none;color:var(--dim);border:1px solid var(--line2)}\n"
    "#zoom{position:fixed;")
rep("tap a card when you find it in the box · cyan = new today · magenta = should be out (tap once removed)</span></header>${sections.join('')}",
    "tap a card when you find it in the box · cyan = new today · magenta = should be out (tap once removed) · Beledros: click a card for its source deck and 3 scored backups (shift-click = found)</span></header>${sections.join('')}<div id=\"info\"><div class=\"ibox\"></div></div>")
rep("document.querySelectorAll('.card').forEach(c=>{if(S[c.dataset.key])c.classList.add('done');c.onclick=()=>{c.classList.toggle('done');S[c.dataset.key]=c.classList.contains('done');save();count(c.closest('section'))}});",
    "const IMG=${JSON.stringify(IMG)};const info=document.getElementById('info'),ibox=info.querySelector('.ibox');let icard=null;\n"
    "const toggle=c=>{c.classList.toggle('done');S[c.dataset.key]=c.classList.contains('done');save();count(c.closest('section'))};\n"
    "const esc=s=>String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));\n"
    "const openInfo=c=>{const m=JSON.parse(c.dataset.info);icard=c;const bk=m.backups.map(b=>`<div class=\"b\">${IMG[b.name]?`<img loading=\"lazy\" src=\"${esc(IMG[b.name])}\" alt=\"\">`:''}<b>${esc(b.name)}</b><span class=\"d${b.delta<0?' neg':''}\">${b.delta>=0?'+':''}${b.delta.toFixed(2)}</span><small>${esc(b.from)} · ${esc(b.type)}</small></div>`).join('');\n"
    "ibox.innerHTML=`<h2>${esc(m.name)}</h2><div class=\"src\">Pull from: <b>${esc(m.from)}</b>${m.backfill?` · that deck gets <b>${esc(m.backfill)}</b> back`:''}</div><div class=\"roles\">${m.roles.length?'role: '+m.roles.join(', '):'no classifier role'} · ${m.candidates} owned candidates scored</div><h4>If it is missing: 3 backups by the model (Δ objective vs the 99)</h4><div class=\"bk\">${bk||'<i>none</i>'}</div><button class=\"ibtn found\">${c.classList.contains('done')?'✓ Found (undo)':'✓ Found'}</button><button class=\"ibtn close\">Close</button>`;\n"
    "ibox.querySelector('.found').onclick=()=>{toggle(c);info.classList.remove('on')};ibox.querySelector('.close').onclick=()=>info.classList.remove('on');info.classList.add('on')};\n"
    "info.onclick=e=>{if(e.target===info)info.classList.remove('on')};document.addEventListener('keydown',e=>{if(e.key==='Escape')info.classList.remove('on')});\n"
    "document.querySelectorAll('.card').forEach(c=>{if(S[c.dataset.key])c.classList.add('done');c.onclick=e=>{if(c.dataset.info&&!e.shiftKey)openInfo(c);else toggle(c)}});")

P.write_text(s, encoding="utf-8")
print("check-page.ts patched: meta badges + info panel with backups")
