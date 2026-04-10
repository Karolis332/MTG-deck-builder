const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

// Cut cards that don't fit Vivi spellslinger:
// dice-rolling tribal, giant tribal, dragon tribal, vanilla creatures
const CUTS = [
  'Djinni Windseer',         // dice tribal
  'Pixie Guide',             // dice tribal
  'Brazen Dwarf',            // dice tribal
  'Feywild Trickster',       // dice tribal
  'Arcane Investigator',     // dice tribal
  'Junktroller',             // dice tribal golem
  'Dragonspeaker Shaman',    // dragon tribal
  'Dragonlord\'s Servant',   // dragon tribal
  'Earth-Cult Elemental',    // 6 CMC giant vanilla
  'Surtland Elementalist',   // 7 CMC giant tribal
  'Eager Construct',         // vanilla 2/2
  'Crystalline Giant',       // no spell synergy
  'Scion of Stygia',         // dice tribal
  'Dutiful Knowledge Seeker', // weak creature
  'Goblin Morningstar',      // equipment, not spellslinger
  'Giant\'s Grasp',          // giant tribal aura
  'Fire Giant\'s Fury',      // giant tribal
  'Squash',                  // giant tribal removal
  'Spiked Pit Trap',         // dice tribal
  'Invasion of the Giants',  // giant tribal
];

let cutCount = 0;
for (const name of CUTS) {
  const r = db.prepare(
    'DELETE FROM deck_cards WHERE deck_id = 13 AND card_id = (SELECT id FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1)'
  ).run(name);
  if (r.changes > 0) { console.log('CUT: ' + name); cutCount++; }
}
console.log('Cut ' + cutCount + ' cards');

// Add proper Vivi spellslinger cards
const ADDS = [
  'Guttersnipe',              // noncreature spell = 2 damage to opponents
  'Niv-Mizzet, Parun',       // draw = damage, spell = draw
  'Baral, Chief of Compliance', // spell cost reduction + loot
  'Murmuring Mystic',        // actually good - tokens from noncreature spells
  'Talrand, Sky Summoner',   // same - drakes from instants/sorceries
  'Expressive Iteration',    // best UR card draw
  'Preordain',               // top cantrip
  'Serum Visions',           // cantrip
  'Gitaxian Probe',          // free spell = free Vivi trigger
  'Windfall',                // wheel, refills hand
];

let addCount = 0;
for (const name of ADDS) {
  const card = db.prepare('SELECT id, legalities FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1').get(name);
  if (!card) { console.log('NOT FOUND: ' + name); continue; }
  // Check legality
  try {
    const leg = JSON.parse(card.legalities || '{}');
    if (leg.brawl !== 'legal' && leg.historic !== 'legal') {
      console.log('NOT LEGAL: ' + name); continue;
    }
  } catch { continue; }

  const existing = db.prepare("SELECT id FROM deck_cards WHERE deck_id = 13 AND card_id = ?").get(card.id);
  if (existing) { console.log('ALREADY IN DECK: ' + name); continue; }

  db.prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (13, ?, 1, 'main')").run(card.id);
  console.log('ADD: ' + name);
  addCount++;
}

console.log('\nAdded ' + addCount + ' cards');
db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = 13").run();

// Final count
const total = db.prepare("SELECT SUM(quantity) as t FROM deck_cards WHERE deck_id = 13 AND board = 'main'").get();
const cmdr = db.prepare("SELECT COUNT(*) as t FROM deck_cards WHERE deck_id = 13 AND board = 'commander'").get();
console.log('\n=== FINAL: ' + total.t + ' main + ' + cmdr.t + ' commander = ' + (total.t + cmdr.t) + ' ===');

if (total.t !== 99) {
  console.log('NEED ADJUSTMENT: ' + (99 - total.t) + ' cards');
}
