// One-off: re-import user 1's Arena collection from today's Player.log into the live DB.
// Run: MTG_DB_DIR="C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data" npx tsx verify-2026-09-18/reimport-arena-collection.ts
import fs from 'fs';
import { parseArenaLogFile } from '../src/lib/arena-log-reader';
import { getDb, resolveArenaIds, upsertCollectionCard } from '../src/lib/db';

const USER_ID = 1;
const LOG_PATH = 'C:/Users/QuLeR/AppData/Local/../LocalLow/Wizards Of The Coast/MTGA/Player.log';
const PREV_LOG_PATH = 'C:/Users/QuLeR/AppData/Local/../LocalLow/Wizards Of The Coast/MTGA/Player-prev.log';

function countBefore() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT COUNT(*) as rows, COALESCE(SUM(quantity),0) as qty, MAX(imported_at) as newest FROM collection WHERE user_id = ? AND (source='arena' OR source='arena_csv')"
    )
    .get(USER_ID) as { rows: number; qty: number; newest: string | null };
  const distinctNames = db
    .prepare(
      "SELECT COUNT(DISTINCT c.name) as n FROM collection col JOIN cards c ON c.id = col.card_id WHERE col.user_id = ? AND (col.source='arena' OR col.source='arena_csv')"
    )
    .get(USER_ID) as { n: number };
  return { ...rows, distinctNames: distinctNames.n };
}

async function main() {
  const before = countBefore();
  console.log('BEFORE', JSON.stringify(before));

  const prevText = fs.existsSync(PREV_LOG_PATH) ? fs.readFileSync(PREV_LOG_PATH, 'utf-8') : '';
  const mainText = fs.readFileSync(LOG_PATH, 'utf-8');
  // Prev log first so the main log's later collection snapshot (if any) wins via "last occurrence" semantics.
  const fullText = prevText + '\n' + mainText;

  const result = parseArenaLogFile(fullText);
  if (!result.collection) {
    console.log('NO_COLLECTION_FOUND');
    process.exit(1);
  }

  const arenaIds = Object.keys(result.collection);
  console.log('PARSED_ARENA_IDS', arenaIds.length);

  const cardMap = resolveArenaIds(arenaIds);
  let imported = 0;
  const failed: string[] = [];
  for (const [arenaId, quantity] of Object.entries(result.collection)) {
    const card = cardMap.get(arenaId);
    if (card && card.id) {
      upsertCollectionCard(card.id as string, quantity, false, USER_ID, 'arena');
      imported++;
    } else {
      failed.push(arenaId);
    }
  }

  const after = countBefore();
  console.log('AFTER', JSON.stringify(after));
  console.log('IMPORTED', imported, 'UNRESOLVED', failed.length);

  const db = getDb();
  const checkNames = [
    'Aggravated Assault',
    'Full Throttle',
    "Kozilek's Command",
    'Chandra, Acolyte of Flame',
    'Conduit Pylons',
  ];
  const bonusNames = [
    'Traumatize',
    "Cut Your Losses",
    "Pirate's Pillage",
    "Mizzix's Mastery",
    'Fateful Showdown',
    'Channeled Force',
    'Rewind',
    'Chemister\'s Insight',
    'Drawn from Dreams',
    'Ral, Storm Conduit',
    'Sulfur Falls',
    'Shivan Reef',
  ];
  const presentStmt = db.prepare(
    "SELECT 1 FROM collection col JOIN cards c ON c.id = col.card_id WHERE col.user_id = ? AND (col.source='arena' OR col.source='arena_csv') AND c.name = ? LIMIT 1"
  );
  for (const name of [...checkNames, ...bonusNames]) {
    const present = !!presentStmt.get(USER_ID, name);
    console.log('NAME_CHECK', name, present ? 'PRESENT' : 'ABSENT');
  }
}

main().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});
