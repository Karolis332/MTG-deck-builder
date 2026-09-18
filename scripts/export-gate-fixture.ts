/**
 * Export the real card rows referenced by the deck-gate test fixtures so the
 * unit tests can run against an in-memory DB instead of the 35K-card live one.
 *
 *   MTG_DB_DIR=%APPDATA%/the-black-grimoire/data npx tsx scripts/export-gate-fixture.ts
 *
 * Reads every `*.txt` list in src/lib/__tests__/fixtures/deck-gate/, resolves
 * each name the same way deck-gate does, and writes cards.json next to them.
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';

const DIR = path.join(process.cwd(), 'src/lib/__tests__/fixtures/deck-gate');

const names = new Set<string>();
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.txt'))) {
  for (const raw of fs.readFileSync(path.join(DIR, f), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^(commander|deck|sideboard|companion|about)s?:?$/i.test(line)) continue;
    if (/^name /i.test(line)) continue;
    const m = line.match(/^(\d+)x?\s+(.+)$/);
    names.add((m ? m[2] : line).trim());
  }
}

const db = getDb();
const COLS = 'id, name, mana_cost, cmc, type_line, oracle_text, colors, color_identity, legalities, layout, set_code, produced_mana, rarity, edhrec_rank';
const EXCLUDED = "layout NOT IN ('art_series','token','double_faced_token','emblem')";
const byName = db.prepare(
  `SELECT ${COLS} FROM cards WHERE name = ? COLLATE NOCASE AND ${EXCLUDED}
   ORDER BY CASE WHEN legalities LIKE '%"legal"%' THEN 0 ELSE 1 END, length(name) LIMIT 1`
);
const byFront = db.prepare(
  `SELECT ${COLS} FROM cards WHERE (name = ? OR name LIKE ? || ' // %') COLLATE NOCASE AND ${EXCLUDED}
   ORDER BY CASE WHEN legalities LIKE '%"legal"%' THEN 0 ELSE 1 END, length(name) LIMIT 1`
);

const rows = new Map<string, unknown>();
const missing: string[] = [];
for (const n of [...names].sort()) {
  const plain = n.replace(/^A-/, '');
  const front = plain.split(' // ')[0];
  // Export every row deck-gate's resolver might consider, so the fixture DB can
  // reproduce the Alchemy rule (the A- row and the paper row are both candidates).
  const candidates = [
    n !== plain ? byName.get(n) : undefined,
    byName.get(plain),
    byFront.get(front, front),
  ].filter(Boolean) as Array<{ id: string }>;
  if (candidates.length) for (const row of candidates) rows.set(row.id, row);
  else missing.push(n);
}

fs.writeFileSync(path.join(DIR, 'cards.json'), JSON.stringify([...rows.values()], null, 1) + '\n');
console.log(`names ${names.size} | exported ${rows.size} | missing ${missing.length}`);
if (missing.length) console.log('MISSING: ' + missing.join(', '));
