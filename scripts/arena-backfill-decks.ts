/**
 * One-shot backfill: attribute every unlinked Arena match to a deck — link the best saved deck,
 * else save the match's submitted decklist as a new deck (built_by 'arena') — then run the
 * cards-played pass for matches stored without a decklist.
 *
 *   MTG_DB_DIR=C:/path/to/data npx tsx scripts/arena-backfill-decks.ts [--user N] [--dry-run]
 *
 * Without MTG_DB_DIR db.ts opens the live Electron DB (%APPDATA%/the-black-grimoire/data).
 * --dry-run runs everything inside one transaction and rolls it back.
 */
import { autoLinkArenaMatches, autoLinkByCardsPlayed, defaultArenaUserId, getDb } from '../src/lib/db';

const args = process.argv.slice(2);
const userArg = args.indexOf('--user');
const userId = userArg >= 0 ? Number(args[userArg + 1]) : defaultArenaUserId();
const dryRun = args.includes('--dry-run');
if (userId == null || !Number.isInteger(userId)) throw new Error('no user: pass --user <id>');

const db = getDb();
const counts = () => db.prepare(
  `SELECT COUNT(*) AS matches, SUM(deck_id IS NOT NULL) AS linked,
          (SELECT COUNT(*) FROM decks WHERE user_id = ?) AS decks,
          (SELECT COUNT(*) FROM decks WHERE built_by = 'arena') AS arenaDecks
   FROM arena_parsed_matches`
).get(userId);

console.log('db:', db.name, '| user:', userId, dryRun ? '| DRY RUN' : '');
console.log('before:', counts());
const ROLLBACK = new Error('dry-run rollback');
try {
  db.transaction(() => {
    const byDeckCards = autoLinkArenaMatches(userId);
    const byCardsPlayed = autoLinkByCardsPlayed();
    console.log('byDeckCards:', byDeckCards, '| byCardsPlayed:', byCardsPlayed);
    console.log('after:', counts());
    if (dryRun) throw ROLLBACK;
  })();
} catch (e) {
  if (e !== ROLLBACK) throw e;
  console.log('rolled back');
}
