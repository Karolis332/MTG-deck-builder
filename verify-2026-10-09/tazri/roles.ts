/** Print classifier roles per card for one or more lists. MTG_DB_DIR=… npx tsx verify-2026-10-09/tazri/roles.ts a.txt b.txt */
import fs from 'fs';
import { parseList, resolveCard } from '../../scripts/best-deck-lib';
import { classifyCard } from '../../src/lib/card-classifier';
for (const f of process.argv.slice(2)) {
  console.log('==', f);
  const text = fs.readFileSync(f, 'utf8').replace(/^Commander[\s\S]*?\n\n/, '');
  for (const n of parseList(text)) {
    const c = resolveCard(n);
    if (!c) { console.log('  ?', n); continue; }
    const roles = classifyCard(c.name, c.oracle_text ?? '', c.type_line ?? '', c.cmc ?? 0).filter((r) => r !== 'land');
    if (roles.length) console.log(`  ${roles.join('+').padEnd(22)} ${n}`);
  }
}
