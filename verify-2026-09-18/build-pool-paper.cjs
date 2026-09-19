// Owned PAPER pool for a mono-G Commander deck: the physical deck + the operator's spare pile + the
// paper register's open cards, joined with VPS commander_card_stats. Complete list, no filtering
// beyond Commander legality and colour identity.
const fs = require('fs');
const D = require('better-sqlite3');
const db = new D(process.env.APPDATA + '/the-black-grimoire/data/mtg-deck-builder.db', { readonly: true });
const CI = new Set(['G']);
const OUT = 'verify-2026-09-18/cabbage-pool-PAPER.txt';
const ccs = new Map();
for (const l of fs.readFileSync('verify-2026-09-18/cabbage-ccs-vps.txt', 'utf8').split(/\r?\n/)) {
  if (!l) continue; const [n, inc, lift, dc, tot] = l.split('|');
  const rec = { inc: +inc, lift: lift ? +lift : null, dc: +dc, tot: +tot };
  ccs.set(n, rec); ccs.set(n.split(' // ')[0], rec);
}
const readList = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  .map(l => { const m = l.match(/^(\d+) (.+)$/); return m ? { name: m[2], q: +m[1] } : { name: l, q: 1 }; });
const sources = [
  ['deck', readList('decks/paper/decks/the-cabbage-merchant.txt')],
  ['side', readList('decks/brawl/cabbage-merchant-sidedeck.txt')],
  ['open', readList('decks/paper/open-cards.txt')],
];
const best = db.prepare(`select name, mana_cost, cmc, type_line, rarity, oracle_text, color_identity, legalities from cards
  where (name = ? or name like ?) and type_line not like 'Card // Card' and layout not in ('art_series','token')
  order by json_extract(legalities,'$.commander')='legal' desc, length(name) limit 1`);
const allCi = db.prepare(`select color_identity from cards where (name = ? or name like ?) and type_line not like 'Card // Card' and layout not in ('art_series','token')`);
const seen = new Map();
for (const [src, list] of sources) {
  for (const o of list) {
    const front = o.name.split(' // ')[0];
    if (['Forest', 'Plains', 'Island', 'Swamp', 'Mountain', 'Wastes'].includes(front)) continue;
    const c = best.get(front, front + ' // %');
    if (!c) { console.error('unresolved', src, o.name); continue; }
    let leg; try { leg = JSON.parse(c.legalities).commander; } catch { leg = '?'; }
    const ci = JSON.parse(c.color_identity || '[]');
    if (!ci.every(x => CI.has(x))) continue;
    if (allCi.all(front, front + ' // %').some(r => !JSON.parse(r.color_identity || '[]').every(x => CI.has(x)))) continue;
    const prev = seen.get(c.name);
    if (prev) { prev.src = prev.src.includes(src) ? prev.src : prev.src + '+' + src; continue; }
    seen.set(c.name, { ...c, q: o.q, src: src + (leg === 'legal' ? '' : '/db:' + leg), s: ccs.get(c.name) || ccs.get(front) || null });
  }
}
const rows = [...seen.values()].sort((a, b) => ((b.s?.inc || 0) - (a.s?.inc || 0)) || (a.cmc - b.cmc) || a.name.localeCompare(b.name));
const tot = rows.find(r => r.s)?.s.tot;
const out = [
  '# Owned PAPER pool for The Cabbage Merchant (mono-G identity, Commander-legal). Format = paper Commander, multiplayer (4-player pod, 40 life).',
  '# Sources: deck = the physical deck decks/paper/decks/the-cabbage-merchant.txt | side = the operator\'s spare pile decks/brawl/cabbage-merchant-sidedeck.txt | open = decks/paper/open-cards.txt (owned paper cards not sleeved in Meren/Imotekh/Tazri/Ramos). Cards sleeved in those four decks are NOT available.',
  '# Corpus = ' + tot + ' real Cabbage Merchant paper Commander decks (VPS, 2026-09-14): inc% = share running the card, lift = commander-specific strength (>2 strong). Multiplayer data, so it applies directly.',
  '# db:not_legal after a source = the card DB doubts Commander legality; check before using. Basic Forest is unlimited and not listed.',
  '# inc% | lift | q | source | name | cost | cmc | type | rarity | oracle', ''];
for (const r of rows) out.push([r.s ? (r.s.inc * 100).toFixed(1) : '0.0', r.s?.lift != null ? r.s.lift.toFixed(2) : '-', r.q, r.src, r.name, r.mana_cost || '', r.cmc, r.type_line, r.rarity, (r.oracle_text || '').replace(/\s+/g, ' ')].join(' | '));
fs.writeFileSync(OUT, out.join('\n'));
console.log('paper pool', rows.length, '| with corpus', rows.filter(r => r.s).length, '| deck', rows.filter(r => r.src.startsWith('deck')).length, '| side', rows.filter(r => r.src.includes('side')).length, '| open-only', rows.filter(r => r.src === 'open').length, '| db-doubt', rows.filter(r => r.src.includes('db:')).length);
// buy list: top corpus cards not owned
const ownedNames = new Set([...seen.keys()].flatMap(n => [n, n.split(' // ')[0]]));
const miss = [];
for (const l of fs.readFileSync('verify-2026-09-18/cabbage-ccs-vps.txt', 'utf8').split(/\r?\n/)) { if (!l) continue; const [n, inc, lift] = l.split('|'); if (!ownedNames.has(n) && !ownedNames.has(n.split(' // ')[0]) && n !== 'Forest') miss.push(`${(+inc * 100).toFixed(1)} | ${lift ? (+lift).toFixed(2) : '-'} | ${n}`); }
fs.writeFileSync('verify-2026-09-18/cabbage-not-owned-PAPER.txt', '# Top corpus cards NOT owned in paper (inc% | lift | name) — buy-list candidates\n' + miss.slice(0, 120).join('\n'));
console.log('not-owned written', miss.length);
