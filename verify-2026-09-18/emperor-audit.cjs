// Audit a pasted Arena Brawl list against the live card DB: resolution, Brawl legality,
// colour identity, singleton, size, land count, curve, and the commander's oracle text.
// usage: node verify-2026-09-18/emperor-audit.cjs verify-2026-09-18/emperor-brawl.txt
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.env.APPDATA, 'the-black-grimoire', 'data', 'mtg-deck-builder.db');
const db = new Database(dbPath, { readonly: true });
const lines = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);

let board = 'main';
const entries = [];
for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  if (/^(commander|deck|sideboard|about)$/i.test(line)) { board = line.toLowerCase(); continue; }
  if (/^name /i.test(line)) continue;
  const m = line.match(/^(\d+)x?\s+(.+?)(\s+\([A-Za-z0-9]{2,6}\)\s+\S+)?$/);
  if (!m) { console.log('UNPARSED', line); continue; }
  entries.push({ qty: Number(m[1]), name: m[2], board });
}

const byName = db.prepare(`
  SELECT name, type_line, cmc, mana_cost, color_identity, layout, legalities, oracle_text, set_code
  FROM cards WHERE name = ? COLLATE NOCASE AND layout NOT IN ('art_series','token','double_faced_token','emblem')
  ORDER BY CASE WHEN json_extract(legalities,'$.brawl')='legal' THEN 0 ELSE 1 END LIMIT 1`);
const byFront = db.prepare(`
  SELECT name, type_line, cmc, mana_cost, color_identity, layout, legalities, oracle_text, set_code
  FROM cards WHERE (name LIKE ? || ' // %' OR name = ?) COLLATE NOCASE AND layout NOT IN ('art_series','token','double_faced_token','emblem')
  ORDER BY CASE WHEN json_extract(legalities,'$.brawl')='legal' THEN 0 ELSE 1 END LIMIT 1`);

function resolve(name) {
  const plain = name.replace(/^A-/, '');
  const front = plain.split(' // ')[0];
  return byName.get(plain) || byFront.get(front, front) || byName.get(front);
}

const seen = new Map();
let total = 0, lands = 0, mdfcLandBack = 0;
const curve = {};
const problems = [];
const cards = [];
for (const e of entries) {
  total += e.qty;
  seen.set(e.name, (seen.get(e.name) || 0) + e.qty);
  const c = resolve(e.name);
  if (!c) { problems.push(`UNRESOLVED ${e.name}`); continue; }
  let leg = {};
  try { leg = JSON.parse(c.legalities || '{}'); } catch {}
  const ci = (c.color_identity || '').replace(/[\[\]",\s]/g, '');
  const isLand = /^Land|— Land|Land —/.test(c.type_line) || /^Land/.test(c.type_line);
  if (isLand) lands += e.qty;
  if (!isLand && / \/\/ /.test(c.type_line) && /Land/.test(c.type_line.split(' // ')[1] || '')) mdfcLandBack += e.qty;
  if (!isLand) { const k = Math.min(7, Math.round(c.cmc)); curve[k] = (curve[k] || 0) + e.qty; }
  if (leg.brawl && leg.brawl !== 'legal') problems.push(`BRAWL ${leg.brawl}: ${e.name}`);
  if (!leg.brawl) problems.push(`BRAWL unknown legality: ${e.name}`);
  const bad = [...ci].filter((ch) => !'UR'.includes(ch));
  if (bad.length) problems.push(`COLOUR IDENTITY ${ci}: ${e.name}`);
  cards.push({ ...e, type_line: c.type_line, cmc: c.cmc, ci, layout: c.layout, set: c.set_code, oracle: c.oracle_text || '' });
}
for (const [n, q] of seen) if (q > 1 && !/^(Mountain|Island|Plains|Swamp|Forest)$/.test(n)) problems.push(`DUPLICATE x${q}: ${n}`);

const cmd = cards.find((c) => c.board === 'commander');
console.log('=== COMMANDER ===');
if (cmd) console.log(cmd.name, '|', cmd.type_line, '|', cmd.ci, '| layout', cmd.layout, '| set', cmd.set, '\n' + cmd.oracle);
console.log('\n=== TOTALS === cards', total, '| lands', lands, '| MDFC land backs', mdfcLandBack, '| nonland curve', JSON.stringify(curve));
console.log('\n=== PROBLEMS ===');
problems.forEach((p) => console.log(p));
if (!problems.length) console.log('(none)');

console.log('\n=== NONLAND CARDS (cmc | type | name) ===');
cards.filter((c) => !/^Land/.test(c.type_line) && c.board !== 'commander')
  .sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name))
  .forEach((c) => console.log(`${c.cmc} | ${c.type_line.slice(0, 34).padEnd(34)} | ${c.name}`));

console.log('\n=== ORACLE (selected) ===');
const want = ['Mesmeric Orb', 'Full Throttle', 'Aggravated Assault', 'Coastal Piracy', 'Dungeon Map', 'Cool but Rude', 'Chakra Meditation', 'Resonating Lute', 'Ring of the Lucii', 'Scour for Scrap', 'Repurposing Bay', 'Sanar, Unfinished Genius // Wild Idea', 'Lindblum, Industrial Regency // Mage Siege', 'Shantotto, Tactician Magician', 'Prompto Argentum', 'Gandalf\'s Sanction', 'Illuminate History', 'Rile', 'Slip Out the Back', 'Experimental Overload', 'Arena of Glory', 'Rumble Arena', 'Baldur\'s Gate', 'Multiversal Passage', 'Conduit Pylons'];
for (const w of want) {
  const c = cards.find((x) => x.name === w);
  if (c) console.log(`\n# ${c.name} (${c.cmc}) ${c.type_line}\n${c.oracle.slice(0, 420)}`);
}
