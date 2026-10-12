// U9a acceptance — runs against the pre-built fresh DB copy at
// C:/Users/QuLeR/AppData/Local/Temp/u9a-db (classify_lands.py + prices-only
// already run there by the harness). cf_api_url in that copy points at
// 127.0.0.1:1 (dead) so CF calls fail fast, not hang.
import fs from 'fs';
import path from 'path';

const FRESH_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/u9a-db';
process.env.MTG_DB_DIR = FRESH_DIR;

async function main() {
  const { autoBuildDeck } = await import('../src/lib/deck-builder-ai');
  const { realManaSources, buildManaSourceContext, countColorSources } = await import('../src/lib/mana-sources');

  type Result = Awaited<ReturnType<typeof autoBuildDeck>>;

  function report(label: string, r: Result, opts: { colors: string[] }) {
    const main = r.cards.filter((e) => e.board === 'main');
    const lands = main.filter((e) => (e.card.type_line || '').includes('Land'));
    const nonLands = main.filter((e) => !(e.card.type_line || '').includes('Land'));
    const landCount = lands.reduce((s, e) => s + e.quantity, 0);
    const basics = lands.filter((e) => /^(Plains|Island|Swamp|Mountain|Forest|Wastes)$/.test(e.card.name));
    const basicCount = basics.reduce((s, e) => s + e.quantity, 0);
    const nonbasicCount = landCount - basicCount;

    const ctx = buildManaSourceContext(opts.colors, lands.map((e) => ({ card: e.card, quantity: e.quantity, board: e.board })));
    const sourceCards = main.filter((e) => realManaSources(e.card, ctx).reliable);
    const sourcesByColor = countColorSources(sourceCards.map((e) => ({ card: e.card, quantity: e.quantity, board: e.board })), ctx);

    const walkers = main.filter((e) => (e.card.type_line || '').includes('Planeswalker'));
    const walkerCount = walkers.reduce((s, e) => s + e.quantity, 0);

    const ramp = main.filter((e) => (r.reasoning || []).some((x) => x.cardName === e.card.name && x.role === 'ramp'));
    const size = main.reduce((s, e) => s + e.quantity, 0);

    console.log(`\n=== ${label} ===`);
    console.log(`strategy: ${r.strategy}`);
    console.log(`size: ${size}  lands: ${landCount} (basics ${basicCount} / nonbasic ${nonbasicCount})`);
    console.log(`real sourcesByColor: ${JSON.stringify(sourcesByColor)}`);
    console.log(`auditor health.sourcesByColor: ${JSON.stringify(r.health?.sourcesByColor)}`);
    console.log(`sourcesByColor MATCH (finding 2): ${JSON.stringify(sourcesByColor) === JSON.stringify(r.health?.sourcesByColor)}`);
    console.log(`walkers: ${walkerCount}`);
    console.log(`ramp (by reasoning role): ${ramp.length}`);
    if (r.price) console.log(`price: total $${r.price.total.toFixed(2)}  overBudget ${r.price.overBudget}`);
    if (r.bracket) console.log(`bracket: target ${r.bracket.target} -> result ${r.bracket.result}`);
  }

  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Tam, the Possibility' })
    .then((r) => report('Tam, the Possibility — brawl, no collection', r, { colors: ['W', 'U', 'B', 'R', 'G'] }))
    .catch((e) => console.log('\n=== Tam, no collection === ERROR:', e.message));
  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' })
    .then((r) => report('Tam, the Possibility — brawl, useCollection', r, { colors: ['W', 'U', 'B', 'R', 'G'] }))
    .catch((e) => console.log('\n=== Tam, collection === ERROR:', e.message));

  await autoBuildDeck({ format: 'commander', colors: [], commanderName: "Atraxa, Praetors' Voice" })
    .then((r) => report("Atraxa, Praetors' Voice — commander", r, { colors: ['W', 'U', 'B', 'G'] }))
    .catch((e) => console.log('\n=== Atraxa === ERROR:', e.message));

  await autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Niv-Mizzet Reborn', maxDeckPrice: 150, bracket: 2 })
    .then((r) => report('Niv-Mizzet Reborn — commander, maxDeckPrice 150, bracket 2', r, { colors: ['W', 'U', 'B', 'R', 'G'] }))
    .catch((e) => console.log('\n=== Niv-Mizzet === ERROR:', e.message));

  await autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Rakdos, Lord of Riots', maxDeckPrice: 150 })
    .then((r) => report('Rakdos, Lord of Riots — commander, maxDeckPrice 150', r, { colors: ['B', 'R'] }))
    .catch((e) => console.log('\n=== Rakdos === ERROR:', e.message));

  await autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Edgar Markov' })
    .then((r) => report('Edgar Markov — commander', r, { colors: ['W', 'B', 'R'] }))
    .catch((e) => console.log('\n=== Edgar Markov === ERROR:', e.message));

  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Krenko, Mob Boss' })
    .then((r) => report('Krenko, Mob Boss — brawl', r, { colors: ['R'] }))
    .catch((e) => console.log('\n=== Krenko === ERROR:', e.message));

  // Perf (finding 6): Tatyova collection build, timed, fetch calls counted.
  let fetchCount = 0;
  let fetchTotalMs = 0;
  const origFetch = global.fetch;
  global.fetch = (async (...args: Parameters<typeof fetch>) => {
    fetchCount += 1;
    const t0 = Date.now();
    try {
      return await origFetch(...args);
    } finally {
      fetchTotalMs += Date.now() - t0;
    }
  }) as typeof fetch;
  const t0 = Date.now();
  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' })
    .then((r) => report('Tatyova, Benthic Druid — brawl, arena collection (perf run)', r, { colors: ['G', 'U'] }))
    .catch((e) => console.log('\n=== Tatyova === ERROR:', e.message));
  const elapsed = Date.now() - t0;
  global.fetch = origFetch;
  console.log(`\n=== perf: Tatyova build ===`);
  console.log(`elapsed: ${elapsed}ms  fetch calls: ${fetchCount}  fetch time: ${fetchTotalMs}ms (cf_api_url dead-port)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
