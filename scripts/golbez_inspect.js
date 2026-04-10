// Inspect current Golbez deck and collection availability for upgrade candidates
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(process.env.APPDATA, 'the-black-grimoire', 'data', 'mtg-deck-builder.db');
const db = new Database(DB_PATH, { readonly: true });

// Find Golbez deck
const decks = db.prepare(`
  SELECT d.id, d.name, d.format, d.user_id, u.username
  FROM decks d JOIN users u ON d.user_id = u.id
  WHERE d.name LIKE '%Golbez%'
  ORDER BY d.id DESC
`).all();
console.log('GOLBEZ DECKS:');
console.log(decks);

if (decks.length === 0) process.exit(0);

const deckId = decks[0].id;
const userId = decks[0].user_id;

const cards = db.prepare(`
  SELECT dc.id as dcid, dc.quantity, dc.board, c.name, c.mana_cost, c.cmc, c.type_line
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = ?
  ORDER BY dc.board, c.name
`).all(deckId);

console.log(`\nDECK ${deckId} cards: ${cards.length} rows, ${cards.reduce((s,c) => s + c.quantity, 0)} total`);

// Count by board
const byBoard = {};
for (const c of cards) {
  byBoard[c.board] = (byBoard[c.board] || 0) + c.quantity;
}
console.log('by board:', byBoard);

// Check staples in collection
const staples = [
  'Sol Ring', 'Arcane Signet', 'Dimir Signet', 'Talisman of Dominance',
  'Fellwar Stone', 'Thought Vessel', 'Mind Stone', 'Prismatic Lens',
  'Polluted Delta', 'Watery Grave', 'Drowned Catacomb', 'Underground River',
  'Morphic Pool', 'Darkslick Shores', 'River of Tears', "Creeping Tar Pit",
  'Unctus, Grand Metatect', 'Foundry Inspector', 'Jhoira\'s Familiar',
  'Inspiring Statuary', 'Myr Battlesphere', 'Emry, Lurker of the Loch',
  'Hangarback Walker', 'Solemn Simulacrum', 'Thought Monitor',
  'Reanimate', 'Animate Dead', 'Necromancy', 'Victimize', 'Exhume',
  'Counterspell', 'Fierce Guardianship', 'Swan Song', 'Negate', 'Dispel',
  'Cyclonic Rift', 'Rhystic Study', 'Mystic Remora', 'Brainstorm', 'Ponder',
  'Preordain', 'Frantic Search', 'Night\'s Whisper', 'Sign in Blood',
  'Damn', 'Toxic Deluge', 'Feed the Swarm', 'Infernal Grasp',
  'Go for the Throat', 'Fatal Push', 'Hero\'s Downfall',
  'Baleful Strix', 'Ledger Shredder', 'Phyrexian Arena',
  'Dockside Extortionist', 'Tezzeret, Artifice Master',
  'Tezzeret the Seeker', 'Trading Post', 'Thopter Foundry',
  'Sword of the Animist', 'Padeem, Consul of Innovation',
  'Lodestone Golem', 'Steel Overseer', 'Metallic Mimic',
  'Sai, Master Thopterist', 'Breya\'s Apprentice', 'Ornithopter',
  'Voltaic Key', 'Unwinding Clock', 'Paradox Engine',
];

console.log('\nSTAPLES IN COLLECTION:');
const findStmt = db.prepare(`
  SELECT c.name, c.type_line, c.mana_cost, c.colors, c.color_identity, COALESCE(SUM(col.quantity), 0) as qty
  FROM cards c LEFT JOIN collection col ON col.card_id = c.id AND col.user_id = ?
  WHERE c.name = ?
  GROUP BY c.id
  ORDER BY qty DESC
  LIMIT 1
`);
for (const name of staples) {
  const r = findStmt.get(userId, name);
  if (r && r.qty > 0) {
    console.log(`  [${r.qty}] ${r.name} | CI=${r.color_identity} | ${r.type_line}`);
  }
}

// Check high-value artifact payoffs
console.log('\nARTIFACT PAYOFFS IN COLLECTION (UB legal):');
const payoffs = db.prepare(`
  SELECT c.name, c.type_line, c.mana_cost, c.color_identity, SUM(col.quantity) as qty
  FROM cards c JOIN collection col ON col.card_id = c.id
  WHERE col.user_id = ?
    AND c.type_line IS NOT NULL
    AND (c.oracle_text LIKE '%artifact%' OR c.type_line LIKE '%Artifact%')
    AND (c.color_identity = '[]' OR c.color_identity LIKE '%U%' OR c.color_identity LIKE '%B%')
    AND c.color_identity NOT LIKE '%W%'
    AND c.color_identity NOT LIKE '%R%'
    AND c.color_identity NOT LIKE '%G%'
    AND c.cmc <= 5
    AND (c.type_line LIKE '%Creature%' OR c.type_line LIKE '%Planeswalker%')
  GROUP BY c.id
  ORDER BY c.cmc, c.name
  LIMIT 40
`).all(userId);
for (const r of payoffs) {
  console.log(`  [${r.qty}] ${r.name} | ${r.mana_cost || ''} | ${r.type_line}`);
}

db.close();
