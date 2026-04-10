const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

// Deck info
const deck = db.prepare('SELECT * FROM decks WHERE id = 13').get();
console.log('Deck:', deck.name, '| Format:', deck.format);

const cmdr = db.prepare(`
  SELECT c.name, c.oracle_text, c.color_identity
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'commander'
`).get();
console.log('Commander:', cmdr.name);
console.log('  Colors:', cmdr.color_identity);
console.log('  Text:', cmdr.oracle_text);

// Match history
const matches = db.prepare(`
  SELECT id, result, opponent_name, opponent_deck_colors, turns, my_life_end, opponent_life_end, created_at
  FROM match_logs WHERE deck_id = 13 ORDER BY created_at DESC
`).all();
console.log('\n=== Match History (' + matches.length + ' games) ===');
let wins = 0, losses = 0;
for (const m of matches) {
  const r = m.result === 'win' ? 'WIN ' : 'LOSS';
  if (m.result === 'win') wins++; else losses++;
  console.log('  ' + r + ' vs ' + (m.opponent_name || '?').padEnd(20)
    + ' t=' + (m.turns || '?') + ' life=' + (m.my_life_end || '?') + 'v' + (m.opponent_life_end || '?'));
}
console.log('Record: ' + wins + '-' + losses);

// Current decklist
const cards = db.prepare(`
  SELECT c.name, c.cmc, c.type_line, c.oracle_text, dc.quantity, dc.board
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13
  ORDER BY dc.board, c.cmc, c.name
`).all();

// Per-commander stats for Vivi
const cmdrStats = db.prepare(`
  SELECT card_name, inclusion_rate, synergy_score, deck_count, total_commander_decks
  FROM commander_card_stats
  WHERE commander_name = 'A-Vivi Ornitier' OR commander_name = 'Vivi Ornitier'
  ORDER BY inclusion_rate DESC LIMIT 5
`).all();
console.log('\n=== Per-Commander Data (Vivi) ===');
if (cmdrStats.length === 0) {
  console.log('  No per-commander data for Vivi — checking similar commanders...');
  // Vivi is a UR spellslinger, check similar UR commanders
  const similar = db.prepare(`
    SELECT commander_name, total_commander_decks
    FROM commander_card_stats
    WHERE color_identity LIKE '%R%' AND color_identity LIKE '%U%'
    AND color_identity NOT LIKE '%W%' AND color_identity NOT LIKE '%B%' AND color_identity NOT LIKE '%G%'
    GROUP BY commander_name
    ORDER BY total_commander_decks DESC LIMIT 10
  `).all();
  console.log('  Top UR commanders in data:');
  for (const s of similar) {
    console.log('    ' + s.commander_name.padEnd(40) + s.total_commander_decks + ' decks');
  }
} else {
  console.log('  ' + cmdrStats[0].total_commander_decks + ' Vivi decks in data');
}

// Get top cards across UR commanders (aggregate)
const urTopCards = db.prepare(`
  SELECT card_name,
         AVG(inclusion_rate) as avg_rate,
         COUNT(*) as num_commanders,
         SUM(deck_count) as total_decks
  FROM commander_card_stats
  WHERE color_identity = '["R","U"]' OR color_identity = '["U","R"]'
  GROUP BY card_name
  HAVING AVG(inclusion_rate) >= 0.3
  ORDER BY avg_rate DESC
  LIMIT 50
`).all();

// Get current deck card names
const deckCardNames = new Set(cards.map(c => c.name));

console.log('\n=== Top UR Commander Cards NOT in your deck ===');
const missing = urTopCards.filter(c => !deckCardNames.has(c.card_name));
for (const c of missing.slice(0, 25)) {
  console.log('  ' + c.card_name.padEnd(35) + (c.avg_rate * 100).toFixed(0) + '% avg incl'
    + '  (' + c.num_commanders + ' cmdrs, ' + c.total_decks + ' decks)');
}

console.log('\n=== Top UR Commander Cards IN your deck ===');
const present = urTopCards.filter(c => deckCardNames.has(c.card_name));
for (const c of present.slice(0, 25)) {
  console.log('  ' + c.card_name.padEnd(35) + (c.avg_rate * 100).toFixed(0) + '% avg incl');
}

// Deck composition analysis
const mainCards = cards.filter(c => c.board === 'main');
const lands = mainCards.filter(c => c.type_line.includes('Land'));
const creatures = mainCards.filter(c => c.type_line.includes('Creature'));
const instants = mainCards.filter(c => c.type_line.includes('Instant'));
const sorceries = mainCards.filter(c => c.type_line.includes('Sorcery'));
const artifacts = mainCards.filter(c => c.type_line.includes('Artifact') && !c.type_line.includes('Creature'));
const enchantments = mainCards.filter(c => c.type_line.includes('Enchantment') && !c.type_line.includes('Creature'));

console.log('\n=== Deck Composition ===');
console.log('  Lands:        ' + lands.length);
console.log('  Creatures:    ' + creatures.length);
console.log('  Instants:     ' + instants.length);
console.log('  Sorceries:    ' + sorceries.length);
console.log('  Artifacts:    ' + artifacts.length);
console.log('  Enchantments: ' + enchantments.length);

// CMC distribution (non-land)
const nonLand = mainCards.filter(c => !c.type_line.includes('Land'));
const cmcBuckets = {};
for (const c of nonLand) { const b = Math.min(Math.floor(c.cmc), 7); cmcBuckets[b] = (cmcBuckets[b] || 0) + 1; }
console.log('\n  CMC curve:');
for (let i = 0; i <= 7; i++) {
  const count = cmcBuckets[i] || 0;
  console.log('    ' + (i === 7 ? '7+' : i + ' ') + ': ' + '#'.repeat(count) + ' (' + count + ')');
}

// Find removal, counterspells, card draw, untap effects
const removal = mainCards.filter(c => {
  const t = (c.oracle_text || '').toLowerCase();
  return t.includes('destroy target') || t.includes('exile target') || t.includes('deal') && t.includes('damage to');
});
const counters = mainCards.filter(c => (c.oracle_text || '').toLowerCase().includes('counter target'));
const draw = mainCards.filter(c => (c.oracle_text || '').toLowerCase().includes('draw'));
const untap = mainCards.filter(c => (c.oracle_text || '').toLowerCase().includes('untap'));

console.log('\n=== Key Categories ===');
console.log('  Removal (' + removal.length + '): ' + removal.map(c => c.name).join(', '));
console.log('  Counters (' + counters.length + '): ' + counters.map(c => c.name).join(', '));
console.log('  Draw (' + draw.length + '): ' + draw.map(c => c.name).join(', '));
console.log('  Untap (' + untap.length + '): ' + untap.map(c => c.name).join(', '));

// Full decklist for reference
console.log('\n=== Full Decklist ===');
for (const c of mainCards) {
  console.log('  ' + c.name.padEnd(35) + 'CMC=' + c.cmc + '  ' + c.type_line.substring(0, 40));
}
