import { autoBuildDeck } from '../src/lib/deck-builder-ai';

async function run() {
  const niv = await autoBuildDeck({
    format: 'commander',
    colors: ['U', 'B', 'R'],
    commanderName: 'Niv-Mizzet Reborn',
    useCollection: false,
    maxDeckPrice: 150,
    bracket: 2,
  });
  console.log('--- Niv-Mizzet Reborn, no collection, maxDeckPrice 150, bracket 2 ---');
  console.log('price:', JSON.stringify(niv.price));
  console.log('bracket:', JSON.stringify(niv.bracket));
  console.log('lands:', niv.cards.filter((c) => c.board === 'main' && (c.card.type_line || '').includes('Land'))
    .map((c) => `${c.quantity}x ${c.card.name}`).join(', '));

  const rakdos = await autoBuildDeck({
    format: 'commander',
    colors: ['B', 'R'],
    commanderName: 'Rakdos, Lord of Riots',
    useCollection: false,
    maxDeckPrice: 150,
  });
  console.log('\n--- Rakdos, Lord of Riots, no collection, maxDeckPrice 150 ---');
  console.log('price:', JSON.stringify(rakdos.price));
  console.log('lands:', rakdos.cards.filter((c) => c.board === 'main' && (c.card.type_line || '').includes('Land'))
    .map((c) => `${c.quantity}x ${c.card.name}`).join(', '));
}

run().catch((e) => { console.error(e); process.exit(1); });
