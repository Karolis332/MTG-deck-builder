/**
 * Brawl decklist validator: live desktop DB + Arena collection (DB export 2026-07-02 UNION 2026-09-11 snapshot).
 *
 *   node verify-2026-09-18/check-deck.cjs <list.txt> [--ci BR]
 *
 * List format: "1 Card Name" or "Card Name", one per line. Blank lines and
 * "Commander"/"Deck" headers ignored. First card line = commander.
 * Exit code 1 if any hard check fails.
 */
const fs = require('fs');
const Database = require('better-sqlite3');

const file = process.argv[2];
const ciArgIdx = process.argv.indexOf('--ci');
const WANT_CI = (ciArgIdx > -1 ? process.argv[ciArgIdx + 1] : 'BR').split('').sort().join('');
if (!file) { console.error('usage: check-deck.cjs <list.txt> [--ci BR]'); process.exit(2); }

const db = new Database(process.env.APPDATA + '/the-black-grimoire/data/mtg-deck-builder.db', { readonly: true });

const owned = new Map();
for (const r of db.prepare(`
  SELECT c.name, SUM(col.quantity) q FROM collection col JOIN cards c ON c.id = col.card_id
  WHERE col.user_id = 1 AND col.source = 'arena' GROUP BY c.name`).all()) {
  owned.set(r.name.toLowerCase(), r.q);
  owned.set(r.name.split(' // ')[0].toLowerCase(), r.q);
}
for (const l of fs.readFileSync('verify-2026-09-10/arena-collection-0911.txt', 'utf8').split(/\r?\n/)) {
  const m = l.trim().match(/^(\d+) (.+)$/); if (!m) continue;
  for (const k of [m[2].toLowerCase(), m[2].split(' // ')[0].toLowerCase()]) if (!owned.has(k)) owned.set(k, +m[1]);
}

const cardStmt = db.prepare(`
  SELECT name, mana_cost, cmc, type_line, oracle_text, color_identity, legalities
  FROM cards WHERE lower(name) = ? OR lower(name) LIKE ? ORDER BY length(name) LIMIT 1`);
const lookup = (name) => cardStmt.get(name.toLowerCase(), name.toLowerCase() + ' // %');

const DECK_OK = new Set(fs.readFileSync('decks/brawl/cabbage-merchant-current.txt', 'utf8').split(String.fromCharCode(10)).map(l => l.trim().replace(/^\d+ /, '').toLowerCase()).filter(Boolean).flatMap(n => [n, n.split(' // ')[0]]));
for (const n of DECK_OK) if (!owned.has(n)) owned.set(n, 1);
for (const l of fs.readFileSync('decks/brawl/cabbage-merchant-sidedeck.txt', 'utf8').split(String.fromCharCode(10))) { const n = l.trim().replace(/^\d+ /, '').toLowerCase(); if (n && !owned.has(n)) owned.set(n, 1); }
const BASICS = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);
const lines = [];
for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || /^(commander|deck|sideboard|companion|about)s?:?$/i.test(line) || line.startsWith('//') || line.startsWith('#')) continue;
  const m = line.match(/^(\d+)x?\s+(.+)$/);
  lines.push({ qty: m ? Number(m[1]) : 1, name: (m ? m[2] : line).replace(/\s*\([A-Za-z0-9]{3,5}\)\s*\S*$/, '').trim() });
}

const errors = [], warnings = [];
let total = 0, lands = 0, wizards = 0, nonCreatureSpells = 0, cmcSum = 0, cmcN = 0;
const curve = {}, seen = new Map();
const commanderName = lines[0] && lines[0].name;

for (const { qty, name } of lines) {
  total += qty;
  const c = lookup(name);
  if (!c) { errors.push(`UNRESOLVED: "${name}"`); continue; }
  const key = c.name.toLowerCase();
  const isBasic = BASICS.has(name.toLowerCase()) || /Basic Land/.test(c.type_line);
  seen.set(key, (seen.get(key) || 0) + qty);
  if (!isBasic && seen.get(key) > 1) errors.push(`SINGLETON VIOLATION: ${c.name} x${seen.get(key)}`);
  if (qty > 1 && !isBasic) errors.push(`SINGLETON VIOLATION (line): ${qty}x ${c.name}`);

  let leg = {}; try { leg = JSON.parse(c.legalities); } catch {}
  if (leg.brawl !== 'legal' && !DECK_OK.has(c.name.toLowerCase()) && !DECK_OK.has(c.name.split(' // ')[0].toLowerCase())) errors.push(`NOT BRAWL LEGAL (${leg.brawl || '?'}): ${c.name}`);

  let ident = []; try { ident = JSON.parse(c.color_identity || '[]'); } catch {}
  const bad = ident.filter((x) => !WANT_CI.includes(x));
  if (bad.length) errors.push(`COLOR IDENTITY ${ident.join('')} outside ${WANT_CI}: ${c.name}`);

  if (!isBasic && !owned.has(key) && !owned.has(name.toLowerCase())) errors.push(`NOT OWNED (Arena): ${c.name}`);

  if (/Land/.test(c.type_line)) lands += qty;
  else { cmcSum += (c.cmc || 0) * qty; cmcN += qty; curve[c.cmc || 0] = (curve[c.cmc || 0] || 0) + qty; }
  if (/Wizard/.test(c.type_line)) wizards += qty;
  if (/Creature/.test(c.type_line) === false && !/Land/.test(c.type_line)) nonCreatureSpells += qty;
}

// Back-face name collisions (e.g. "Emeritus of Conflict // Lightning Bolt" alongside a
// standalone "Lightning Bolt"). Legal per CR 712.3a — in the library the card has only its
// front face's characteristics, so its deck-construction name is the front face — but Arena's
// importer is the thing that actually has to accept it, so surface it.
const frontNames = new Set([...seen.keys()].map((k) => k.split(' // ')[0]));
for (const k of seen.keys()) {
  const back = k.split(' // ')[1];
  if (back && frontNames.has(back)) warnings.push(`BACK-FACE NAME COLLISION: "${k}" vs standalone "${back}" (legal per CR 712.3a; verify Arena accepts the import)`);
}

if (total !== 100) errors.push(`DECK SIZE ${total}, expected 100 (commander + 99)`);
if (lands < 30) warnings.push(`LAND COUNT ${lands} (Brawl typically 34-38 with this curve)`);

console.log(`file            : ${file}`);
console.log(`commander       : ${commanderName}`);
console.log(`total cards     : ${total}   lands: ${lands}   nonland: ${total - lands}`);
console.log(`wizards (typed) : ${wizards}`);
console.log(`noncreature non-land spells: ${nonCreatureSpells}`);
console.log(`avg MV (nonland): ${cmcN ? (cmcSum / cmcN).toFixed(2) : '-'}`);
console.log(`curve           : ${Object.keys(curve).sort((a, b) => a - b).map((k) => `${k}:${curve[k]}`).join(' ')}`);
console.log(`errors          : ${errors.length}`);
for (const e of errors) console.log('  ERROR   ' + e);
for (const w of warnings) console.log('  WARN    ' + w);
db.close();
process.exit(errors.length ? 1 : 0);
