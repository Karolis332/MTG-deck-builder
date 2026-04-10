const Database = require('better-sqlite3');
const db = new Database('data/mtg-deck-builder.db');

// Simulate the new color-adjusted scoring for UR (2 colors)
const colorShare = 0.25; // 2-color deck
const stapleThreshold = 0.08 * colorShare / 0.25; // = 0.08

const check = [
  'Sol Ring', 'Command Tower', 'Arcane Signet',
  'Swiftfoot Boots', 'Lightning Greaves', 'Counterspell',
  'Ponder', 'Negate', 'Faithless Looting', 'Frantic Search',
  'Solemn Simulacrum', 'Blasphemous Act', 'Chaos Warp',
];

console.log('=== UR Brawl deck scoring simulation ===');
console.log('Color share estimate: ' + (colorShare * 100) + '%');
console.log('Force-include threshold (global): ' + (stapleThreshold * 100).toFixed(1) + '%');
console.log('Force-include threshold (adjusted): 20%');
console.log('');
console.log('Card                    | Global | Adjusted | Force? | Score Tier');
console.log('------------------------|--------|----------|--------|----------');

for (const name of check) {
  const r = db.prepare(`
    SELECT m.card_name, m.meta_inclusion_rate as rate
    FROM meta_card_stats m
    WHERE m.format = 'commander' AND m.card_name = ?
  `).get(name);

  if (!r) {
    console.log(name.padEnd(24) + '| N/A    | N/A      | NO     | 0');
    continue;
  }

  const globalPct = (r.rate * 100).toFixed(1) + '%';
  const adjustedRate = r.rate / colorShare;
  const adjustedPct = (adjustedRate * 100).toFixed(1) + '%';

  const forced = r.rate >= 0.20 || r.rate >= stapleThreshold ? 'YES' : 'NO ';

  let tier;
  if (adjustedRate >= 0.6 || r.rate >= 0.6) tier = '+80 (universal)';
  else if (adjustedRate >= 0.4 || r.rate >= 0.4) tier = '+60 (near-staple)';
  else if (adjustedRate >= 0.25 || r.rate >= 0.25) tier = '+40 (color staple)';
  else if (adjustedRate >= 0.15 || r.rate >= 0.15) tier = '+25 (common)';
  else if (adjustedRate >= 0.08 || r.rate >= 0.1) tier = '+12 (occasional)';
  else tier = '+0';

  console.log(
    name.padEnd(24) + '| ' +
    globalPct.padEnd(7) + '| ' +
    adjustedPct.padEnd(9) + '| ' +
    forced + '    | ' +
    tier
  );
}
