// Seed list for the Arena Jace build: the merged engine (62ccf14) on a DB copy, user 1 Arena collection.
process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/jace-db';
import fs from 'fs';
async function main() {
  const { autoBuildDeck } = await import('../../src/lib/deck-builder-ai');
  const t = Date.now();
  const r = await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Jace, Multiverse Architect', useCollection: true, userId: 1, collectionSource: 'arena' } as never);
  const main = r.cards.filter((c) => c.board === 'main');
  const lines = ['Commander', '1 Jace, Multiverse Architect', '', 'Deck', ...main.map((c) => `${c.quantity} ${c.card.name.split(' // ')[0]}`)];
  fs.writeFileSync('C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-30/arena-jace/current.txt', lines.join('\n') + '\n');
  console.log('strategy', r.strategy, 'cards', main.reduce((s, c) => s + c.quantity, 0) + 1, 'ms', Date.now() - t);
}
main().catch((e) => { console.error(e); process.exit(1); });
