const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

// Check all Island/Mountain entries
const basics = db.prepare(`
  SELECT dc.id, dc.card_id, c.name, dc.quantity, dc.board
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND c.name IN ('Island', 'Mountain')
  ORDER BY c.name, dc.id
`).all();
console.log('Current basics:');
for (const b of basics) {
  console.log('  id=' + b.id + ' card_id=' + b.card_id + ' ' + b.name + ' qty=' + b.quantity + ' board=' + b.board);
}

// Consolidate: delete duplicates, keep one entry per basic with correct quantity
// Target: ~36 lands total. Currently 62 lands = too many.
// Need to figure out non-basic land count first
const nonBasicLands = db.prepare(`
  SELECT c.name FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'main'
  AND c.type_line LIKE '%Land%' AND c.type_line NOT LIKE '%Basic%'
`).all();
console.log('\nNon-basic lands (' + nonBasicLands.length + '):');
for (const l of nonBasicLands) console.log('  ' + l.name);

// Target: 36 total lands, nonBasicLands.length non-basics
// Basics needed = 36 - nonBasics
const TARGET_LANDS = 36;
const nonBasicCount = nonBasicLands.length;
const basicsNeeded = TARGET_LANDS - nonBasicCount;
const islandsNeeded = Math.ceil(basicsNeeded * 0.5);  // roughly even split
const mountainsNeeded = basicsNeeded - islandsNeeded;

console.log('\nTarget: ' + TARGET_LANDS + ' lands total');
console.log('Non-basics: ' + nonBasicCount);
console.log('Basics needed: ' + basicsNeeded + ' (' + islandsNeeded + ' Islands, ' + mountainsNeeded + ' Mountains)');

// Delete ALL Island/Mountain entries
for (const b of basics) {
  db.prepare('DELETE FROM deck_cards WHERE id = ?').run(b.id);
}

// Re-add with correct quantities (use first card_id found for each)
const islandId = db.prepare("SELECT id FROM cards WHERE name = 'Island' AND type_line = 'Basic Land — Island' LIMIT 1").get().id;
const mountainId = db.prepare("SELECT id FROM cards WHERE name = 'Mountain' AND type_line = 'Basic Land — Mountain' LIMIT 1").get().id;

db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (13, ?, ?, 'main')").run(islandId, islandsNeeded);
db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (13, ?, ?, 'main')").run(mountainId, mountainsNeeded);

console.log('Set: ' + islandsNeeded + 'x Island, ' + mountainsNeeded + 'x Mountain');

db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = 13").run();

// Final verification
const total = db.prepare("SELECT SUM(quantity) as t FROM deck_cards WHERE deck_id = 13 AND board = 'main'").get();
const cmdr = db.prepare("SELECT COUNT(*) as t FROM deck_cards WHERE deck_id = 13 AND board = 'commander'").get();
const landTotal = db.prepare(`
  SELECT SUM(dc.quantity) as t FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'main' AND c.type_line LIKE '%Land%'
`).get();
const creatures = db.prepare(`
  SELECT COUNT(*) as t FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'main' AND c.type_line LIKE '%Creature%'
`).get();
const instants = db.prepare(`
  SELECT COUNT(*) as t FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'main' AND c.type_line LIKE '%Instant%'
`).get();

console.log('\n=== FINAL DECK STATE ===');
console.log('Total: ' + total.t + ' main + ' + cmdr.t + ' commander = ' + (total.t + cmdr.t));
console.log('Lands: ' + landTotal.t + ' | Creatures: ' + creatures.t + ' | Instants: ' + instants.t);
