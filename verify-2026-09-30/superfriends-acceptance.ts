// U6 acceptance script: autoBuildDeck for a planeswalker commander (Tam, Brawl)
// and a proliferate-only commander (Atraxa, Commander), against a scratch DB
// copy of the live APPDATA DB. Reports walker count, archetype, draw count,
// top synergy picks. Run with MTG_DB_DIR pointed at the scratch copy.
import { autoBuildDeck } from '../src/lib/deck-builder-ai';
import { classifyCard } from '../src/lib/card-classifier';

async function report(label: string, commanderName: string, format: string, colors: string[]) {
  const result = await autoBuildDeck({ format, colors, commanderName, useCollection: false });
  const walkers = result.cards.filter((c) => /\bPlaneswalker\b/.test(c.card.type_line || ''));
  const drawCards = result.cards.filter((c) =>
    classifyCard(c.card.name, c.card.oracle_text || '', c.card.type_line || '', c.card.cmc ?? 0, undefined, { superfriends: true })
      .includes('draw'));
  const synergyPicks = (result.reasoning || [])
    .filter((r) => r.role === 'synergy' || /planeswalker|proliferate|loyalty/i.test(r.reason))
    .slice(0, 10);

  console.log(`\n=== ${label} (${commanderName}) ===`);
  console.log('archetype:', result.strategy, '| detectedArchetype:', result.commanderSynergy?.detectedArchetype);
  console.log('triggerCategories:', result.commanderSynergy?.triggerCategories);
  console.log('walker count:', walkers.length, '->', walkers.map((c) => c.card.name).join(', '));
  console.log('draw count (superfriends-aware):', drawCards.reduce((s, c) => s + c.quantity, 0));
  console.log('top synergy/planeswalker picks:', synergyPicks.map((r) => `${r.cardName} (${r.role})`));
}

async function main() {
  await report('Tam Brawl', 'Tam, the Possibility', 'brawl', ['G', 'U']);
  await report('Atraxa Commander', "Atraxa, Praetors' Voice", 'commander', ['W', 'U', 'B', 'G']);
}

main().catch((e) => { console.error(e); process.exit(1); });
