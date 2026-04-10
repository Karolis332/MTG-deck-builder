const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

const DECK_ID = 13;

// The actual Arena decklist
const COMMANDER = ['A-Vivi Ornitier'];

const MAIN_DECK = [
  { qty: 1, name: 'Cavern of Souls' },
  { qty: 1, name: 'Command Tower' },
  { qty: 1, name: 'Evolving Wilds' },
  { qty: 1, name: 'Flooded Strand' },
  { qty: 1, name: 'Gemstone Caverns' },
  { qty: 10, name: 'Island' },
  { qty: 1, name: 'Misty Rainforest' },
  { qty: 11, name: 'Mountain' },
  { qty: 1, name: 'Mystic Sanctuary' },
  { qty: 1, name: 'Reliquary Tower' },
  { qty: 1, name: "Rogue's Passage" },
  { qty: 1, name: 'Scalding Tarn' },
  { qty: 1, name: 'Spirebluff Canal' },
  { qty: 1, name: 'Steam Vents' },
  { qty: 1, name: 'Stormcarved Coast' },
  { qty: 1, name: 'Terramorphic Expanse' },
  { qty: 1, name: "An Offer You Can't Refuse" },
  { qty: 1, name: 'Brainstorm' },
  { qty: 1, name: 'Consider' },
  { qty: 1, name: 'Curiosity' },
  { qty: 1, name: 'Faithless Looting' },
  { qty: 1, name: 'Lightning Bolt' },
  { qty: 1, name: 'Mystical Tutor' },
  { qty: 1, name: 'Opt' },
  { qty: 1, name: 'Ponder' },
  { qty: 1, name: 'Preordain' },
  { qty: 1, name: 'Magic Damper' },
  { qty: 1, name: 'Rapid Hybridization' },
  { qty: 1, name: "Stormchaser's Talent" },
  { qty: 1, name: 'Three Steps Ahead' },
  { qty: 1, name: 'Abrade' },
  { qty: 1, name: "Agatha's Soul Cauldron" },
  { qty: 1, name: 'Arcane Signet' },
  { qty: 1, name: "Artist's Talent" },
  { qty: 1, name: 'Balmor, Battlemage Captain' },
  { qty: 1, name: 'Brineborn Cutthroat' },
  { qty: 1, name: 'Coldsteel Heart' },
  { qty: 1, name: 'Counterspell' },
  { qty: 1, name: 'Electrostatic Infantry' },
  { qty: 1, name: 'Experimental Augury' },
  { qty: 1, name: 'Expressive Iteration' },
  { qty: 1, name: 'Fling' },
  { qty: 1, name: 'Goblin Electromancer' },
  { qty: 1, name: 'Harmonic Prodigy' },
  { qty: 1, name: 'Izzet Charm' },
  { qty: 1, name: 'Izzet Signet' },
  { qty: 1, name: 'Lightning Greaves' },
  { qty: 1, name: 'Mind Stone' },
  { qty: 1, name: 'Mischievous Mystic' },
  { qty: 1, name: 'Negate' },
  { qty: 1, name: "Proft's Eidetic Memory" },
  { qty: 1, name: 'Ral, Monsoon Mage' },
  { qty: 1, name: 'Resculpt' },
  { qty: 1, name: 'Stormcatch Mentor' },
  { qty: 1, name: 'Swiftfoot Boots' },
  { qty: 1, name: 'Talisman of Creativity' },
  { qty: 1, name: 'The Emperor of Palamecia' },
  { qty: 1, name: 'Third Path Iconoclast' },
  { qty: 1, name: 'Thrill of Possibility' },
  { qty: 1, name: 'Underworld Breach' },
  { qty: 1, name: 'Young Pyromancer' },
  { qty: 1, name: "Brass's Tunnel-Grinder" },
  { qty: 1, name: 'Chromatic Lantern' },
  { qty: 1, name: 'Fiery Inscription' },
  { qty: 1, name: 'Frantic Search' },
  { qty: 1, name: 'Guttersnipe' },
  { qty: 1, name: 'Kiora, the Rising Tide' },
  { qty: 1, name: 'Narset, Parter of Veils' },
  { qty: 1, name: 'Ashling, Flame Dancer' },
  { qty: 1, name: 'Big Score' },
  { qty: 1, name: 'Ojer Pakpatiq, Deepest Epoch' },
  { qty: 1, name: 'Ral, Crackling Wit' },
  { qty: 1, name: 'Solemn Simulacrum' },
  { qty: 1, name: 'Storm-Kiln Artist' },
  { qty: 1, name: 'Goldspan Dragon' },
  { qty: 1, name: 'Intrude on the Mind' },
  { qty: 1, name: 'Mulldrifter' },
  { qty: 1, name: 'Edgar, King of Figaro' },
  { qty: 1, name: 'Shark Typhoon' },
  { qty: 1, name: 'Ovika, Enigma Goliath' },
];

// Validate total
const totalCards = MAIN_DECK.reduce((s, c) => s + c.qty, 0);
console.log('Arena list: ' + totalCards + ' main + 1 commander = ' + (totalCards + 1));

// Clear existing deck cards
db.prepare('DELETE FROM deck_cards WHERE deck_id = ?').run(DECK_ID);
console.log('Cleared existing deck cards');

// Find card by name (try exact, then LIKE for split cards)
function findCard(name) {
  let card = db.prepare('SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1').get(name);
  if (card) return card.id;
  // Try split card match
  card = db.prepare("SELECT id FROM cards WHERE name LIKE ? COLLATE NOCASE LIMIT 1").get(name + ' //%');
  if (card) return card.id;
  // Try without A- prefix (Arena alchemy naming)
  if (name.startsWith('A-')) {
    card = db.prepare('SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1').get(name.substring(2));
    if (card) return card.id;
  }
  return null;
}

// Insert commander
let notFound = [];
for (const name of COMMANDER) {
  const cardId = findCard(name);
  if (!cardId) { notFound.push(name); continue; }
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (?, ?, 1, 'commander')").run(DECK_ID, cardId);
  console.log('Commander: ' + name);
}

// Insert main deck
for (const { qty, name } of MAIN_DECK) {
  const cardId = findCard(name);
  if (!cardId) { notFound.push(name); continue; }
  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (?, ?, ?, 'main')").run(DECK_ID, cardId, qty);
}

if (notFound.length > 0) {
  console.log('\nNOT FOUND (' + notFound.length + '):');
  for (const n of notFound) console.log('  ' + n);
}

db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = ?").run(DECK_ID);

// Verify
const final = db.prepare("SELECT SUM(quantity) as t FROM deck_cards WHERE deck_id = ? AND board = 'main'").get(DECK_ID);
const cmdr = db.prepare("SELECT COUNT(*) as t FROM deck_cards WHERE deck_id = ? AND board = 'commander'").get(DECK_ID);
console.log('\nSynced: ' + final.t + ' main + ' + cmdr.t + ' commander = ' + (final.t + cmdr.t));

// Now analyze what the per-commander data suggests we should change
console.log('\n=== Per-Commander Analysis for improvements ===');
const deckNames = new Set(MAIN_DECK.map(c => c.name));
deckNames.add(COMMANDER[0]);

// Vivi-specific top cards NOT in deck
const viviTop = db.prepare(`
  SELECT card_name, inclusion_rate, synergy_score
  FROM commander_card_stats
  WHERE commander_name LIKE '%Vivi Ornitier%'
  ORDER BY inclusion_rate DESC
  LIMIT 60
`).all();

const missing = viviTop.filter(c => !deckNames.has(c.card_name));
const present = viviTop.filter(c => deckNames.has(c.card_name));

console.log('\nTop Vivi cards you HAVE (' + present.length + '):');
for (const c of present.slice(0, 15)) {
  console.log('  ' + c.card_name.padEnd(35) + (c.inclusion_rate * 100).toFixed(0) + '% of Vivi decks');
}

console.log('\nTop Vivi cards you\'re MISSING (' + missing.length + '):');
for (const c of missing.slice(0, 15)) {
  console.log('  ' + c.card_name.padEnd(35) + (c.inclusion_rate * 100).toFixed(0) + '% of Vivi decks (syn ' + (c.synergy_score > 0 ? '+' : '') + (c.synergy_score * 100).toFixed(0) + '%)');
}
