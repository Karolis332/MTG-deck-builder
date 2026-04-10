const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

// Get Vivi deck info
const deck = db.prepare('SELECT * FROM decks WHERE id = 13').get();
console.log('Deck:', deck.name, '| Format:', deck.format);

// Get commander card
const cmdr = db.prepare(`
  SELECT c.name, c.oracle_text, c.color_identity, c.type_line
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'commander'
`).all();
console.log('Commander:', cmdr.map(c => c.name).join(', '));
if (cmdr[0]) {
  console.log('  Colors:', cmdr[0].color_identity);
  console.log('  Text:', cmdr[0].oracle_text);
}

// Get match history
const matches = db.prepare(`
  SELECT id, result, opponent_name, opponent_deck_colors, opponent_deck_archetype,
         turns, my_life_end, opponent_life_end, game_format, notes, created_at
  FROM match_logs WHERE deck_id = 13
  ORDER BY created_at DESC
`).all();
console.log('\n=== Match History (' + matches.length + ' games) ===');
let wins = 0, losses = 0;
for (const m of matches) {
  const r = m.result === 'win' ? 'WIN ' : m.result === 'loss' ? 'LOSS' : m.result;
  if (m.result === 'win') wins++;
  if (m.result === 'loss') losses++;
  console.log('  ' + (r || '?').padEnd(5) + ' vs ' + (m.opponent_name || 'unknown').padEnd(20)
    + ' colors=' + (m.opponent_deck_colors || '?').padEnd(8)
    + ' turns=' + (m.turns || '?')
    + ' life=' + (m.my_life_end || '?') + ' vs ' + (m.opponent_life_end || '?')
    + '  ' + (m.created_at || ''));
}
const total = wins + losses;
console.log('Record: ' + wins + '-' + losses + (total > 0 ? ' (' + (wins / total * 100).toFixed(0) + '% WR)' : ''));

// Get arena parsed matches
const apm = db.prepare(`
  SELECT id, result, opponent_name, format, cards_played, draw_order, match_id, opening_hand, mulligan_count, on_play
  FROM arena_parsed_matches WHERE deck_id = 13
  ORDER BY id DESC
`).all();
console.log('\n=== Arena Parsed Matches (' + apm.length + ') ===');
for (const m of apm) {
  const played = m.cards_played ? JSON.parse(m.cards_played) : [];
  const drawn = m.draw_order ? JSON.parse(m.draw_order) : [];
  const hand = m.opening_hand ? JSON.parse(m.opening_hand) : [];
  console.log('  ' + (m.result || '?').padEnd(5) + ' vs ' + (m.opponent_name || '?').padEnd(20)
    + ' played=' + played.length + ' drawn=' + drawn.length
    + ' mull=' + (m.mulligan_count || 0) + ' ' + (m.on_play ? 'play' : 'draw'));
  if (hand.length) console.log('    opening: ' + hand.join(', '));
}

// Get card performance for this deck
const perf = db.prepare(`
  SELECT cp.card_name, cp.times_played, cp.times_in_winning_deck, cp.times_in_losing_deck,
         cp.times_drawn, cp.times_in_opening_hand
  FROM card_performance cp
  WHERE cp.deck_id = 13
  ORDER BY cp.times_played DESC
  LIMIT 20
`).all();
console.log('\n=== Card Performance (top 20) ===');
if (perf.length === 0) {
  console.log('  No card performance data yet');
} else {
  console.log('  Card'.padEnd(35) + 'Played  Win   Loss  Drawn');
  for (const p of perf) {
    console.log('  ' + p.card_name.padEnd(33)
      + String(p.times_played).padStart(4) + '  '
      + String(p.times_in_winning_deck).padStart(4) + '  '
      + String(p.times_in_losing_deck).padStart(4) + '  '
      + String(p.times_drawn || 0).padStart(4));
  }
}

// Get current decklist
const cards = db.prepare(`
  SELECT c.name, c.cmc, c.type_line, dc.quantity, dc.board
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13
  ORDER BY dc.board, c.cmc, c.name
`).all();
console.log('\n=== Current Decklist (' + cards.length + ' unique cards) ===');
const byBoard = {};
for (const c of cards) {
  if (!byBoard[c.board]) byBoard[c.board] = [];
  byBoard[c.board].push(c);
}
for (const [board, list] of Object.entries(byBoard)) {
  console.log('\n[' + board.toUpperCase() + '] (' + list.reduce((s, c) => s + c.quantity, 0) + ' cards)');
  for (const c of list) {
    console.log('  ' + String(c.quantity) + 'x ' + c.name.padEnd(35) + 'CMC ' + c.cmc + '  ' + c.type_line);
  }
}
