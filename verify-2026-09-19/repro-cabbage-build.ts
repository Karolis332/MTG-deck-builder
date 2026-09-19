// Reproduction check for builder-fixes-engine-2026-09-19.md step 5.
// MUST be run with MTG_DB_DIR explicitly set to the repo's data/ dir — with
// it unset, resolveDbDir() prefers %APPDATA%/the-black-grimoire (the live,
// off-limits DB). Confirmed the hard way in Round 1 of this brief.
import { autoBuildDeck } from '../src/lib/deck-builder-ai';

async function main() {
  const result = await autoBuildDeck({
    format: 'commander',
    colors: [],
    commanderName: 'The Cabbage Merchant',
    powerLevel: 'cedh',
    buildHints: 'food synergy, go wide, consistent manabase and curve',
  });

  const mainCards = result.cards.filter((e) => e.board === 'main');
  const lands = mainCards.filter((e) => (e.card.type_line || '').split('//')[0].includes('Land'));
  const nonlands = mainCards.filter((e) => !(e.card.type_line || '').split('//')[0].includes('Land'));
  const totalNonlandQty = nonlands.reduce((sum, e) => sum + e.quantity, 0);
  const weightedMV = nonlands.reduce((sum, e) => sum + (e.card.cmc || 0) * e.quantity, 0);
  const avgMV = totalNonlandQty > 0 ? weightedMV / totalNonlandQty : 0;
  const cmc5plus = nonlands.filter((e) => (e.card.cmc || 0) >= 5).reduce((sum, e) => sum + e.quantity, 0);
  const landQty = lands.reduce((sum, e) => sum + e.quantity, 0);

  console.log(JSON.stringify({
    strategy: result.strategy,
    detectedArchetype: result.commanderSynergy?.detectedArchetype ?? null,
    hints: result.hints,
    landCount: landQty,
    avgMV: Number(avgMV.toFixed(3)),
    cmc5PlusCount: cmc5plus,
    totalCards: mainCards.reduce((sum, e) => sum + e.quantity, 0),
    first25Names: mainCards.slice(0, 25).map((e) => e.card.name),
  }, null, 2));
}

main().catch((err) => {
  console.error('REPRO_ERROR', err);
  process.exit(1);
});
