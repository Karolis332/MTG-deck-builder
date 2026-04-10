const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

// Current deck names
const current = db.prepare(`
  SELECT c.name FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13
`).all().map(r => r.name);
const deckNames = new Set(current);
console.log('Current cards: ' + current.length);
console.log('Need: ' + (99 - current.length + 1) + ' more spells\n'); // +1 for commander

// Get top Vivi-specific cards from commander_card_stats
const viviCards = db.prepare(`
  SELECT cs.card_name, cs.inclusion_rate, cs.synergy_score
  FROM commander_card_stats cs
  WHERE cs.commander_name = 'A-Vivi Ornitier'
  AND cs.card_name NOT IN (${current.map(() => '?').join(',')})
  ORDER BY cs.inclusion_rate DESC
  LIMIT 100
`).all(...current);

// Also get top UR commander cards generally
const urCards = db.prepare(`
  SELECT card_name, AVG(inclusion_rate) as avg_rate, COUNT(*) as num_cmdrs
  FROM commander_card_stats
  WHERE (color_identity = '["R","U"]' OR color_identity = '["U","R"]')
  AND card_name NOT IN (${current.map(() => '?').join(',')})
  GROUP BY card_name
  HAVING AVG(inclusion_rate) >= 0.15
  ORDER BY avg_rate DESC
  LIMIT 100
`).all(...current);

// Merge and deduplicate, prioritize Vivi-specific
const candidates = new Map();
for (const c of viviCards) {
  candidates.set(c.card_name, { rate: c.inclusion_rate, synergy: c.synergy_score, source: 'vivi' });
}
for (const c of urCards) {
  if (!candidates.has(c.card_name)) {
    candidates.set(c.card_name, { rate: c.avg_rate, synergy: 0, source: 'ur' });
  }
}

// Filter: must be in DB, UR color identity, noncreature preferred for Vivi
const toAdd = [];
const needed = 99 - (current.length - 1); // subtract commander

for (const [name, info] of candidates) {
  if (toAdd.length >= needed) break;

  const card = db.prepare(`
    SELECT id, name, type_line, cmc, color_identity, oracle_text, legalities
    FROM cards WHERE name = ? COLLATE NOCASE LIMIT 1
  `).get(name);
  if (!card) continue;

  // Check UR color identity
  try {
    const ci = JSON.parse(card.color_identity || '[]');
    if (ci.some(c => c !== 'U' && c !== 'R')) continue;
  } catch { continue; }

  // Check legality (brawl or historic)
  try {
    const leg = JSON.parse(card.legalities || '{}');
    if (leg.brawl !== 'legal' && leg.historic !== 'legal') continue;
  } catch { continue; }

  // Skip basic lands
  if (card.type_line.includes('Basic Land')) continue;
  // Skip non-basic lands (we have enough)
  if (card.type_line.includes('Land') && !card.type_line.includes('//')) continue;

  toAdd.push({ name: card.name, id: card.id, cmc: card.cmc, type: card.type_line, rate: info.rate, source: info.source });
}

console.log('Adding ' + toAdd.length + ' cards:\n');

// Prioritize noncreature spells (Vivi triggers), then creatures
toAdd.sort((a, b) => {
  const aCreature = a.type.includes('Creature') ? 1 : 0;
  const bCreature = b.type.includes('Creature') ? 1 : 0;
  if (aCreature !== bCreature) return aCreature - bCreature;
  return b.rate - a.rate;
});

for (const card of toAdd) {
  db.prepare("INSERT OR IGNORE INTO deck_cards (deck_id, card_id, quantity, board) VALUES (13, ?, 1, 'main')").run(card.id);
  const tag = card.source === 'vivi' ? '[VIVI]' : '[UR]  ';
  console.log(tag + ' ' + card.name.padEnd(40) + 'CMC=' + card.cmc + '  ' + (card.rate * 100).toFixed(0) + '%  ' + card.type.substring(0, 35));
}

db.prepare("UPDATE decks SET updated_at = datetime('now') WHERE id = 13").run();

// Final verification
const total = db.prepare("SELECT SUM(quantity) as t FROM deck_cards WHERE deck_id = 13 AND board = 'main'").get();
const cmdr = db.prepare("SELECT COUNT(*) as t FROM deck_cards WHERE deck_id = 13 AND board = 'commander'").get();
console.log('\n=== FINAL: ' + total.t + ' main + ' + cmdr.t + ' commander = ' + (total.t + cmdr.t) + ' ===');

// Composition
const comp = db.prepare(`
  SELECT
    SUM(CASE WHEN c.type_line LIKE '%Land%' THEN dc.quantity ELSE 0 END) as lands,
    SUM(CASE WHEN c.type_line LIKE '%Creature%' AND c.type_line NOT LIKE '%Land%' THEN 1 ELSE 0 END) as creatures,
    SUM(CASE WHEN c.type_line LIKE '%Instant%' THEN 1 ELSE 0 END) as instants,
    SUM(CASE WHEN c.type_line LIKE '%Sorcery%' THEN 1 ELSE 0 END) as sorceries,
    SUM(CASE WHEN c.type_line LIKE '%Enchantment%' AND c.type_line NOT LIKE '%Creature%' THEN 1 ELSE 0 END) as enchantments,
    SUM(CASE WHEN c.type_line LIKE '%Artifact%' AND c.type_line NOT LIKE '%Creature%' THEN 1 ELSE 0 END) as artifacts
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = 13 AND dc.board = 'main'
`).get();
console.log('Lands: ' + comp.lands + ' | Creatures: ' + comp.creatures + ' | Instants: ' + comp.instants
  + ' | Sorceries: ' + comp.sorceries + ' | Enchantments: ' + comp.enchantments + ' | Artifacts: ' + comp.artifacts);
