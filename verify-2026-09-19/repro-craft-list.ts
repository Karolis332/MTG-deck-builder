// Reproduction + before/after proof for the craft-list feature (needed-to-craft
// list on collection builds). MUST run with MTG_DB_DIR pointed at a scratch
// copy of the DB (e.g. $TEMP/craft-scratch) — never the repo's live data/ dir,
// and never %APPDATA% (see repro-cabbage-build.ts note). Scratch inputs
// (green-collection-names.json, resolve-green-collection.ts) live in
// $TEMP/craft-scratch, not this repo — see CRAFT_SCRATCH_DIR below.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDb } from '../src/lib/db';
import { autoBuildDeck } from '../src/lib/deck-builder-ai';

const TEMP_USER_ID = 999912;
const CRAFT_SCRATCH_DIR = process.env.CRAFT_SCRATCH_DIR || path.join(os.tmpdir(), 'craft-scratch');

async function main() {
  const db = getDb();
  const green = JSON.parse(
    fs.readFileSync(path.join(CRAFT_SCRATCH_DIR, 'green-collection-names.json'), 'utf8')
  ) as string[];
  const ownedNames = green.slice(0, 60);

  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, email, password_hash, subscription_tier, subscription_status)
     VALUES (?, 'craft-list-repro', 'craft-list-repro@test.local', 'unused', 'free', 'active')`
  ).run(TEMP_USER_ID);

  const findExact = db.prepare('SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1');
  const ins = db.prepare(
    "INSERT OR IGNORE INTO collection (user_id, card_id, quantity, source) VALUES (?, ?, 1, 'craft-list-repro')"
  );
  let matched = 0;
  for (const name of ownedNames) {
    const row = findExact.get(name) as { id: string } | undefined;
    if (row) { ins.run(TEMP_USER_ID, row.id); matched++; }
  }
  console.log(`seeded ${matched}/${ownedNames.length} owned names for user ${TEMP_USER_ID}`);

  try {
    const started = Date.now();
    const result = await autoBuildDeck({
      format: 'commander',
      colors: [],
      commanderName: 'The Cabbage Merchant',
      powerLevel: 'casual',
      useCollection: true,
      userId: TEMP_USER_ID,
    });
    const elapsedMs = Date.now() - started;

    const mainCards = result.cards.filter((e) => e.board === 'main');
    fs.writeFileSync(
      path.join(CRAFT_SCRATCH_DIR, 'craft-list-after-cards.json'),
      JSON.stringify(mainCards.map((e) => `${e.quantity} ${e.card.name}`).sort(), null, 2)
    );

    console.log(JSON.stringify({
      elapsedMs,
      totalCards: mainCards.reduce((s, e) => s + e.quantity, 0),
      craftListCount: result.craftList?.length ?? 0,
      craftListFirst10: (result.craftList ?? []).slice(0, 10),
    }, null, 2));
  } finally {
    db.prepare('DELETE FROM collection WHERE user_id = ?').run(TEMP_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEMP_USER_ID);
  }
}

main().catch((err) => {
  console.error('REPRO_ERROR', err);
  process.exit(1);
});
