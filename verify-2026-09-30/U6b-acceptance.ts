// U6b acceptance: run against the DB copy at %TEMP%/sf-db, MTG_DB_DIR set by
// the shell before this script is invoked (see run command). Prints a per-
// build table: walkers (count + distinct types), archetype, draw count,
// support pieces named, and a raw card count for controls.
import { autoBuildDeck } from '../src/lib/deck-builder-ai';
import { classifyCard } from '../src/lib/card-classifier';

async function run(label: string, opts: Parameters<typeof autoBuildDeck>[0]) {
  const r = await autoBuildDeck(opts);
  const main = r.cards.filter((e) => e.board === 'main');
  const walkers = main.filter((e) => (e.card.type_line || '').includes('Planeswalker'));
  const walkerTypes = new Set(walkers.map((e) => e.card.name));
  const draw = main.filter((e) =>
    classifyCard(e.card.name, e.card.oracle_text || '', e.card.type_line || '', e.card.cmc || 0).includes('draw')
  );
  const supportPatterns = ['proliferate', 'loyalty counter', 'loyalty abilit', 'planeswalkers you control', 'search your library for a planeswalker'];
  const support = main.filter((e) => {
    const t = (e.card.oracle_text || '').toLowerCase();
    return supportPatterns.some((p) => t.includes(p));
  });
  console.log(`\n== ${label} ==`);
  console.log(`strategy: ${r.strategy}`);
  console.log(`walkers: ${walkers.reduce((s, e) => s + e.quantity, 0)} (distinct types: ${walkerTypes.size})`);
  console.log(`draw (opt-in classifier): ${draw.reduce((s, e) => s + e.quantity, 0)}`);
  console.log(`support pieces named: ${support.map((e) => e.card.name).slice(0, 12).join(', ') || '(none)'}`);
  console.log(`main deck size: ${main.reduce((s, e) => s + e.quantity, 0)}`);
  return { r, walkerCount: walkers.reduce((s, e) => s + e.quantity, 0) };
}

async function main() {
  await run('Tam brawl, no collection', { format: 'brawl', colors: [], commanderName: 'Tam, the Possibility' }).catch((e) => console.log('Tam no-collection ERROR:', e.message));
  await run('Tam brawl, useCollection userId 1 arena', {
    format: 'brawl', colors: [], commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena',
  }).catch((e) => console.log('Tam collection ERROR:', e.message));
  await run('Atraxa commander', { format: 'commander', colors: [], commanderName: "Atraxa, Praetors' Voice" }).catch((e) => console.log('Atraxa ERROR:', e.message));
  await run('Krenko brawl (control)', { format: 'brawl', colors: [], commanderName: 'Krenko, Mob Boss' }).catch((e) => console.log('Krenko ERROR:', e.message));
  await run('Edgar Markov commander (control)', { format: 'commander', colors: [], commanderName: 'Edgar Markov' }).catch((e) => console.log('Edgar ERROR:', e.message));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
