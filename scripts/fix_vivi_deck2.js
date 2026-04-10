const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

const CUTS = [
  'Scrounging Skyray',
  'Spectral Sailor',
  'Sokka, Bold Boomeranger',
  'Archmage of Runes',
  'Clive, Ifrit\'s Dominant // Ifrit, Warden of Inferno',
  'Pinnacle Monk // Mystic Peak',
  'Kraum, Violent Cacophony',
  'Wan Shi Tong, Librarian',
  'The Legend of Kuruk // Avatar Kuruk',
  'Blacksmith\'s Talent',
  'Firebender Ascension',
  'Waterbender Ascension',
  'Proft\'s Eidetic Memory',
];

const ADDS = [
  'Cascade Bluffs',
  'Fiery Islet',
  'Frostboil Snarls',
  'Training Center',
  'Mana Confluence',
  'City of Brass',
  'Exotic Orchard',
  'Wandering Fumarole',
];

// Cut
for (const name of CUTS) {
  const r = db.prepare(
    'DELETE FROM deck_cards WHERE deck_id = 13 AND card_id = (SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1)'
  ).run(name);
  console.log((r.changes > 0 ? 'CUT' : 'SKIP') + ': ' + name);
}

// Add lands
for (const name of ADDS) {
  const card = db.prepare('SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1').get(name);
  if (!card) { console.log('NOT FOUND: ' + name); continue; }
  db.prepare(
    "INSERT OR IGNORE INTO deck_cards (deck_id, card_id, quantity, board) VALUES (13, ?, 1, 'main')"
  ).run(card.id);
  console.log('ADD: ' + name);
}

// Add more basics (5 more of each to reach ~35 lands)
const islandId = db.prepare("SELECT id FROM cards WHERE name = 'Island' AND type_line = 'Basic Land — Island' LIMIT 1").get().id;
const mountainId = db.prepare("SELECT id FROM cards WHERE name = 'Mountain' AND type_line = 'Basic Land — Mountain' LIMIT 1").get().id;
db.prepare("UPDATE deck_cards SET quantity = quantity + 5 WHERE deck_id = 13 AND card_id = ? AND board = 'main'").run(islandId);
db.prepare("UPDATE deck_cards SET quantity = quantity + 5 WHERE deck_id = 13 AND card_id = ? AND board = 'main'").run(mountainId);
console.log('ADD: 5x Island, 5x Mountain');

db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = 13").run();

// Final stats
const total = db.prepare("SELECT SUM(quantity) as t FROM deck_cards WHERE deck_id = 13 AND board = 'main'").get();
const landCount = db.prepare(`
  SELECT SUM(dc.quantity) as t
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'main' AND c.type_line LIKE '%Land%'
`).get();
const creatureCount = db.prepare(`
  SELECT COUNT(*) as t
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'main' AND c.type_line LIKE '%Creature%'
`).get();
const instantCount = db.prepare(`
  SELECT COUNT(*) as t
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'main' AND c.type_line LIKE '%Instant%'
`).get();

console.log('\nFinal: ' + total.t + ' main cards');
console.log('Lands: ' + landCount.t + ' | Creatures: ' + creatureCount.t + ' | Instants: ' + instantCount.t);
