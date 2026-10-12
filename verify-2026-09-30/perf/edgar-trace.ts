// Edgar: reasoning entries whose card is NOT in the final main board (added, then displaced).
import path from 'path';
import { pathToFileURL } from 'url';
const WT = process.env.WT!;
(async () => {
  const { autoBuildDeck } = await import(pathToFileURL(path.join(WT, 'src/lib/deck-builder-ai.ts')).href);
  const r = await autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Edgar Markov' });
  const inMain = new Set(r.cards.filter((e: any) => e.board === 'main').map((e: any) => e.card.name));
  const gone = (r.reasoning || []).filter((x: any) => !inMain.has(x.cardName));
  console.log(`strategy ${r.strategy}; reasoning ${r.reasoning.length}; dropped after placement ${gone.length}:`);
  console.log(gone.map((x: any) => `${x.cardName} [${x.role}]`).join('; '));
  const tribe = r.cards.filter((e: any) => e.board === 'main' && /Vampire/.test(e.card.type_line || '')).length;
  console.log(`vampires in main: ${tribe}`);
  process.exit(0);
})();
