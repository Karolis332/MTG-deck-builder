// Complete owned Arena pool for a mono-G Brawl commander, joined with VPS commander_card_stats. No filtering beyond legality + identity.
const fs = require('fs');
const D = require('better-sqlite3');
const db = new D(process.env.APPDATA + '/the-black-grimoire/data/mtg-deck-builder.db', { readonly: true });
const CI = new Set(['G']);
const ccs = new Map();
for (const l of fs.readFileSync('verify-2026-09-18/cabbage-ccs-vps.txt', 'utf8').split(/\r?\n/)) {
  if (!l) continue; const [n, inc, lift, dc, tot] = l.split('|');
  const rec = { inc: +inc, lift: lift ? +lift : null, dc: +dc, tot: +tot };
  ccs.set(n, rec); ccs.set(n.split(' // ')[0], rec);
}
const best = db.prepare(`select name, mana_cost, cmc, type_line, rarity, oracle_text, color_identity, legalities from cards
  where (name = ? or name like ?) and type_line not like 'Card // Card' order by json_extract(legalities,'$.brawl')='legal' desc, length(name) limit 1`);
const allCi = db.prepare(`select color_identity from cards where (name = ? or name like ?) and type_line not like 'Card // Card'`);
const owned = db.prepare(`select c.name, sum(col.quantity) q from collection col join cards c on c.id=col.card_id where col.user_id=1 and col.source='arena' group by c.name`).all();
const dbNames = new Set(owned.flatMap(o => [o.name, o.name.split(' // ')[0]]));
for (const l of fs.readFileSync('verify-2026-09-10/arena-collection-0911.txt', 'utf8').split(/\r?\n/)) {
  const m = l.trim().match(/^(\d+) (.+)$/); if (!m) continue;
  if (!dbNames.has(m[2]) && !dbNames.has(m[2].split(' // ')[0])) owned.push({ name: m[2], q: +m[1], snap: true });
}
const deckNames = new Set(fs.readFileSync('decks/brawl/cabbage-merchant-current.txt', 'utf8').split(String.fromCharCode(10)).map(l => l.trim().replace(/^\d+ /, '')).filter(Boolean).flatMap(n => [n, n.split(' // ')[0]]));
for (const n of deckNames) if (!owned.some(o => o.name === n || o.name.split(' // ')[0] === n)) owned.push({ name: n, q: 1, deck: true });
const sideNames = new Set(fs.readFileSync('decks/brawl/cabbage-merchant-sidedeck.txt', 'utf8').split(String.fromCharCode(10)).map(l => l.trim().replace(/^\d+ /, '')).filter(Boolean).flatMap(n => [n, n.split(' // ')[0]]));
for (const n of sideNames) if (!owned.some(o => o.name === n || o.name.split(' // ')[0] === n)) owned.push({ name: n, q: 1, side: true });
const ownedNotLegal = true;
const seen = new Map();
for (const o of owned) {
  const front = o.name.split(' // ')[0];
  const c = best.get(front, front + ' // %') || best.get(o.name, o.name);
  if (!c) continue;
  let leg; try { leg = JSON.parse(c.legalities).brawl; } catch { leg = '?'; }
  const inDeck = deckNames.has(c.name) || deckNames.has(front);
  if (leg !== 'legal' && !inDeck) { if (!ownedNotLegal) continue; }
  const inSide = sideNames.has(c.name) || sideNames.has(front);
  const legFlag = inDeck ? 'deck' : inSide ? (leg === 'legal' ? 'side' : 'side/db:' + leg) : (leg === 'legal' ? 'legal' : 'db:' + leg);
  const ci = JSON.parse(c.color_identity || '[]');
  if (!ci.every(x => CI.has(x))) continue;
  if (allCi.all(front, front + ' // %').some(r => !JSON.parse(r.color_identity || '[]').every(x => CI.has(x)))) continue; // any printing outside identity (e.g. Pick Your Poison) -> drop
  const prev = seen.get(c.name); const q = (prev ? prev.q : 0) + o.q;
  seen.set(c.name, { ...c, q, legFlag, s: ccs.get(c.name) || ccs.get(front) || null });
}
const rows = [...seen.values()].sort((a, b) => ((b.s?.inc || 0) - (a.s?.inc || 0)) || (a.cmc - b.cmc) || a.name.localeCompare(b.name));
const out = ['# Owned Arena pool for The Cabbage Merchant (mono-G identity, brawl-legal). Collection = DB export 2026-07-02 UNION snapshot verify-2026-09-10/arena-collection-0911.txt (2026-09-11) UNION the current deck decks/brawl/cabbage-merchant-current.txt (2026-09-18). Corpus = ' + (rows.find(r => r.s)?.s.tot) + ' Cabbage Merchant decks (VPS, 2026-09-14).',
  '# inc% = share of those decks running the card | lift = corpus lift vs baseline (higher = more commander-specific) | q = copies owned',
  '# legality: legal = Brawl-legal per card DB | deck = in the current Arena Brawl deck (proven playable; DB may say otherwise) | side = in the current Arena sideboard pile (proven owned) | db:not_legal = owned but the card DB says not Brawl-legal (often stale for Arena-only additions; use only if you KNOW it is on Arena Brawl and flag it)',
  '# inc% | lift | q | legality | name | cost | cmc | type | rarity | oracle', ''];
for (const r of rows) out.push([r.s ? (r.s.inc * 100).toFixed(1) : '0.0', r.s?.lift != null ? r.s.lift.toFixed(2) : '-', r.q, r.legFlag, r.name, r.mana_cost || '', r.cmc, r.type_line, r.rarity, (r.oracle_text || '').replace(/\s+/g, ' ')].join(' | '));
fs.writeFileSync('verify-2026-09-18/cabbage-pool-FULL.txt', out.join('\n'));
console.log('pool size', rows.length, '| with corpus stats', rows.filter(r => r.s).length, '| legal', rows.filter(r => r.legFlag === 'legal').length, '| deck', rows.filter(r => r.legFlag === 'deck').length, '| side', rows.filter(r => r.legFlag.startsWith('side')).length, '| db:not_legal', rows.filter(r => r.legFlag.startsWith('db:')).length);
console.log('by type: creatures', rows.filter(r => /Creature/.test(r.type_line)).length, 'lands', rows.filter(r => /^Land|— Land|Land —/.test(r.type_line) || /\bLand\b/.test(r.type_line.split(' // ')[0])).length);
// top corpus cards NOT owned
const ownedNames = new Set([...seen.keys()].flatMap(n => [n, n.split(' // ')[0]]));
const missing = [];
for (const l of fs.readFileSync('verify-2026-09-18/cabbage-ccs-vps.txt', 'utf8').split(/\r?\n/)) { if (!l) continue; const [n, inc, lift] = l.split('|'); if (!ownedNames.has(n) && !ownedNames.has(n.split(' // ')[0])) missing.push([n, +inc, lift]); }
const arenaRow = db.prepare(`select arena_id, legalities from cards where (name = ? or name like ?) and type_line not like 'Card // Card' order by arena_id is null limit 1`);
const miss = missing.slice(0, 80).map(([n, inc, lift]) => { const r = arenaRow.get(n, n + ' // %'); let b = '?'; try { b = r ? JSON.parse(r.legalities).brawl : 'not_in_db'; } catch {} return `${(inc * 100).toFixed(1)} | ${lift ? (+lift).toFixed(2) : '-'} | ${n} | arena_id=${r?.arena_id ?? 'null'} brawl=${b}`; });
fs.writeFileSync('verify-2026-09-18/cabbage-corpus-not-owned.txt', '# Top corpus cards NOT in the July Arena export (inc% | lift | name | arena_id/brawl legality)\n' + miss.join('\n'));
console.log('not-owned list written', missing.length);
