/**
 * Paper Commander decklist validator for the Cabbage Merchant upgrade.
 *   node verify-2026-09-18/check-deck-paper.cjs <list.txt> [--ci G]
 * Ownership = the physical deck + the spare pile + the paper register's open cards. Legality = Commander.
 * List: first card line = commander, then "1 Name" / "N Forest". '#' lines ignored. Exit 1 on any ERROR.
 */
const fs = require('fs');
const D = require('better-sqlite3');
const file = process.argv[2];
const ciIdx = process.argv.indexOf('--ci');
const WANT = new Set((ciIdx > -1 ? process.argv[ciIdx + 1] : 'G').split(''));
if (!file) { console.error('usage: check-deck-paper.cjs <list.txt> [--ci G]'); process.exit(2); }
const db = new D(process.env.APPDATA + '/the-black-grimoire/data/mtg-deck-builder.db', { readonly: true });
const BASICS = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);
const parse = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !/^(commander|deck|sideboard)s?:?$/i.test(l))
  .map(l => { const m = l.match(/^(\d+)x?\s+(.+)$/); return { qty: m ? +m[1] : 1, name: (m ? m[2] : l).trim() }; });
const owned = new Map();
for (const p of ['decks/paper/decks/the-cabbage-merchant.txt', 'decks/brawl/cabbage-merchant-sidedeck.txt', 'decks/paper/open-cards.txt']) {
  for (const { qty, name } of parse(p)) for (const k of [name.toLowerCase(), name.split(' // ')[0].toLowerCase()]) owned.set(k, Math.max(owned.get(k) || 0, qty));
}
const card = db.prepare(`select name, cmc, type_line, color_identity, legalities from cards where (lower(name) = ? or lower(name) like ?) and type_line not like 'Card // Card' and layout not in ('art_series','token') order by json_extract(legalities,'$.commander')='legal' desc, length(name) limit 1`);
const lines = parse(file);
const errors = [], warns = [];
const counts = new Map();
let total = 0, lands = 0, nonlandMv = [];
for (const { qty, name } of lines) {
  const key = name.toLowerCase();
  total += qty;
  const c = card.get(key, key + ' // %');
  if (!c) { errors.push(`UNKNOWN CARD: ${name}`); continue; }
  const front = c.name.split(' // ')[0].toLowerCase();
  counts.set(front, (counts.get(front) || 0) + qty);
  const isBasic = BASICS.has(front);
  if (!isBasic && counts.get(front) > 1) errors.push(`DUPLICATE: ${c.name}`);
  if (!isBasic && !owned.has(key) && !owned.has(front)) errors.push(`NOT OWNED (paper: deck + pile + open cards): ${c.name}`);
  let leg = {}; try { leg = JSON.parse(c.legalities); } catch {}
  if (leg.commander !== 'legal') errors.push(`NOT COMMANDER LEGAL (${leg.commander || '?'}): ${c.name}`);
  const ci = JSON.parse(c.color_identity || '[]');
  if (!ci.every(x => WANT.has(x))) errors.push(`COLOUR IDENTITY ${ci.join('')} outside ${[...WANT].join('')}: ${c.name}`);
  const t = c.type_line.split(' // ')[0];
  if (/\bLand\b/.test(t)) lands += qty; else nonlandMv.push(...Array(qty).fill(c.cmc));
}
if (total !== 100) errors.push(`DECK SIZE ${total}, expected 100 (commander + 99)`);
if (lands < 34 || lands > 40) warns.push(`LAND COUNT ${lands} (paper Commander typically 35-38 plus ramp)`);
const avg = nonlandMv.length ? (nonlandMv.reduce((a, b) => a + b, 0) / nonlandMv.length) : 0;
const curve = {}; for (const m of nonlandMv) curve[m] = (curve[m] || 0) + 1;
for (const e of errors) console.log('  ERROR  ', e);
for (const w of warns) console.log('  WARN   ', w);
console.log(`total cards     : ${total}   lands: ${lands}   nonland: ${nonlandMv.length}`);
console.log(`avg MV (nonland): ${avg.toFixed(2)}`);
console.log(`curve           : ${Object.keys(curve).sort((a, b) => a - b).map(k => `${k}:${curve[k]}`).join(' ')}`);
console.log(`errors          : ${errors.length}`);
process.exit(errors.length ? 1 : 0);
