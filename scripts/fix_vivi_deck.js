const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

const DECK_ID = 13;
const USER_ID = db.prepare('SELECT user_id FROM decks WHERE id = ?').get(DECK_ID).user_id;

// Get current deck cards
const deckCards = db.prepare(`
  SELECT dc.id, dc.card_id, c.name, c.cmc, c.type_line, c.oracle_text, dc.board
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = ?
`).all(DECK_ID);
const deckNames = new Set(deckCards.filter(c => c.board === 'main').map(c => c.name));

// Get user's collection
const collection = db.prepare(`
  SELECT c.id, c.name, c.cmc, c.type_line, c.oracle_text, c.color_identity, c.legalities, col.quantity
  FROM collection col JOIN cards c ON col.card_id = c.id
  WHERE col.user_id = ?
`).all(USER_ID);
const ownedNames = new Set(collection.map(c => c.name));
console.log('Collection size:', collection.length);

// Helper: find card ID by name (prefer owned, then any)
function findCardId(name) {
  const owned = collection.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (owned) return owned.id;
  const any = db.prepare('SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1').get(name);
  return any ? any.id : null;
}

// Check if card is UR legal in historic brawl
function isURBrawlLegal(card) {
  try {
    const leg = JSON.parse(card.legalities || '{}');
    // Historic Brawl uses 'brawl' key in Scryfall OR 'historic' as fallback
    if (leg.brawl === 'legal' || leg.brawl === 'restricted') return true;
    if (leg.historic === 'legal' || leg.historic === 'restricted') return true;
    return false;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════════════════
// CUTS — cards that don't belong in a UR spellslinger Vivi deck
// ═══════════════════════════════════════════════════════════════
const CUTS = [
  // Off-color lands (can't produce U or R)
  'Breeding Pool',         // GU — off-color
  'Godless Shrine',        // WB — completely off-color
  'Misty Rainforest',      // fetches G/U — no UR duals to find
  'Flooded Strand',        // fetches W/U — no UR duals to find

  // Weak creatures (Vivi wants noncreature spells)
  'Banner of Kinship',     // no tribal synergy
  'Strixhaven Stadium',    // needs 10 unblocked attacks
  'Merry Bards',           // 3 CMC vanilla-ish creature
  'Camera Launcher',       // 3 CMC mediocre artifact creature
  'Pinnacle Emissary',     // 3 CMC robot, no spell synergy
  'Splashy Spellcaster',   // 4 CMC, just cost reduction
  'Murmuring Mystic',      // 4 CMC, slow token maker
  'Ovika, Enigma Goliath', // 7 CMC, too expensive
  'Mm\'menon, Uthros Exile', // 3 CMC jellyfish, weak
  'Chronicle of Victory',  // 6 CMC artifact, too slow
  'Queen Brahne',          // 3 CMC, opponent-dependent
  'Brineborn Cutthroat',   // just a creature, no spell trigger value
  'Geralf, the Fleshwright', // zombie tokens, wrong strategy

  // Underperformers
  'Terramorphic Expanse',  // strictly worse than real lands
  'Evolving Wilds',        // slow, replace with actual dual
  'Rogue\'s Passage',      // colorless, not needed
];

// ═══════════════════════════════════════════════════════════════
// ADDS — what UR spellslinger Vivi needs
// ═══════════════════════════════════════════════════════════════
const ADDS = [
  // LANDS (need ~36 total, currently 20 — adding 16 via cuts+adds)
  'Island',                // basics needed badly
  'Mountain',
  'Sulfur Falls',          // UR check land
  'Shivan Reef',           // UR pain land
  'Swiftwater Cliffs',     // UR tapland
  'Temple of Epiphany',    // UR scry land
  'Riverglide Pathway',    // UR pathway
  'Prismari Campus',       // UR, card selection
  'Volatile Fjord',        // UR snow dual
  'Izzet Boilerworks',     // UR bounce land

  // COUNTERSPELLS (need 6+ total)
  'Counterspell',          // the gold standard
  'Negate',                // hits all noncreature — triggers Vivi
  'Spell Pierce',          // cheap protection for Vivi
  'An Offer You Can\'t Refuse', // 1 mana counter

  // REMOVAL (cheap interaction)
  'Lightning Bolt',        // 1 mana, kills most commanders early
  'Abrade',                // flexible instant

  // UNTAP EFFECTS (Vivi's secret engine)
  'Vizier of Tumbling Sands', // untap Vivi for more mana
  'Clever Concealment',    // free untap + protection (noncreature!)

  // KEY SPELLSLINGER PIECES
  'Brainstorm',            // best cantrip, triggers Vivi
  'Ponder',                // 1 mana cantrip, triggers Vivi
  'Opt',                   // 1 mana instant cantrip
];

// ═══════════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════════

// Validate cuts exist in deck
const validCuts = [];
for (const name of CUTS) {
  if (deckNames.has(name)) {
    validCuts.push(name);
  } else {
    console.log('SKIP CUT (not in deck): ' + name);
  }
}

// Validate adds are available and not already in deck
const validAdds = [];
for (const name of ADDS) {
  if (deckNames.has(name) && name !== 'Island' && name !== 'Mountain') {
    console.log('SKIP ADD (already in deck): ' + name);
    continue;
  }
  const cardId = findCardId(name);
  if (!cardId) {
    console.log('SKIP ADD (not found in DB): ' + name);
    continue;
  }
  validAdds.push({ name, cardId });
}

console.log('\n=== Applying ' + validCuts.length + ' cuts, ' + validAdds.length + ' adds ===\n');

// Create version snapshot first
const maxVer = db.prepare('SELECT COALESCE(MAX(version_number), 0) as mv FROM deck_versions WHERE deck_id = ?').get(DECK_ID).mv;
db.prepare(`
  INSERT INTO deck_versions (deck_id, version_number, cards_snapshot, created_at, source)
  VALUES (?, ?, ?, datetime('now'), 'commander_training_fix')
`).run(DECK_ID, maxVer + 1, JSON.stringify(deckCards.map(c => ({
  card_id: c.card_id, name: c.name, board: c.board
}))));
console.log('Created deck version snapshot v' + (maxVer + 1));

// Execute cuts
const deleteStmt = db.prepare('DELETE FROM deck_cards WHERE deck_id = ? AND card_id = (SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1)');
for (const name of validCuts) {
  const result = deleteStmt.run(DECK_ID, name);
  console.log('CUT: ' + name + (result.changes > 0 ? ' ✓' : ' (not found)'));
}

// For Island and Mountain — check if already exists, if so increase quantity or add
const upsertStmt = db.prepare(`
  INSERT INTO deck_cards (deck_id, card_id, quantity, board)
  VALUES (?, ?, 1, 'main')
  ON CONFLICT(deck_id, card_id, board) DO UPDATE SET quantity = quantity + 1
`);
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO deck_cards (deck_id, card_id, quantity, board)
  VALUES (?, ?, 1, 'main')
`);

for (const { name, cardId } of validAdds) {
  if (name === 'Island' || name === 'Mountain') {
    // Add additional copies
    upsertStmt.run(DECK_ID, cardId);
    console.log('ADD: ' + name + ' (+1 copy) ✓');
  } else {
    insertStmt.run(DECK_ID, cardId);
    console.log('ADD: ' + name + ' ✓');
  }
}

// Update deck timestamp
db.prepare('UPDATE decks SET updated_at = datetime(\'now\') WHERE id = ?').run(DECK_ID);

// Verify final count
const finalCount = db.prepare(`
  SELECT SUM(quantity) as total FROM deck_cards WHERE deck_id = ? AND board = 'main'
`).get(DECK_ID);
const cmdrCount = db.prepare(`
  SELECT COUNT(*) as total FROM deck_cards WHERE deck_id = ? AND board = 'commander'
`).get(DECK_ID);
console.log('\nFinal deck: ' + finalCount.total + ' main + ' + cmdrCount.total + ' commander = ' + (finalCount.total + cmdrCount.total) + ' total');

// New composition
const newCards = db.prepare(`
  SELECT c.type_line FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = ? AND dc.board = 'main'
`).all(DECK_ID);
const lands = newCards.filter(c => c.type_line.includes('Land')).length;
const creatures = newCards.filter(c => c.type_line.includes('Creature')).length;
const instants = newCards.filter(c => c.type_line.includes('Instant')).length;
const sorceries = newCards.filter(c => c.type_line.includes('Sorcery')).length;
console.log('Lands: ' + lands + ' | Creatures: ' + creatures + ' | Instants: ' + instants + ' | Sorceries: ' + sorceries);
