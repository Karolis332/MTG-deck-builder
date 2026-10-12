// U12 acceptance — runs against the fresh DB copy at
// C:/Users/QuLeR/AppData/Local/Temp/u12-db (classify_lands.py already run,
// cf_api_url -> 127.0.0.1:9 so CF calls fail fast). Usage:
//   npx tsx verify-2026-09-30/acceptance-u12.ts <outDir>
// Writes one JSON per build (metrics + card list) into <outDir> so the
// baseline (6791d3e) and tip runs can be diffed card-by-card.
import fs from 'fs';
import path from 'path';

process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/u12-db';
const OUT_DIR = process.argv[2] || 'verify-2026-09-30/u12-out';
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const { autoBuildDeck } = await import('../src/lib/deck-builder-ai');
  const { classifyCard, getPrimaryCategory } = await import('../src/lib/card-classifier');

  type Result = Awaited<ReturnType<typeof autoBuildDeck>>;

  function report(label: string, r: Result, ms: number) {
    const main = r.cards.filter((e) => e.board === 'main');
    const isLand = (t: string) => /\bLand\b/.test((t || '').split('//')[0]);
    const lands = main.filter((e) => isLand(e.card.type_line || ''));
    const landCount = lands.reduce((s, e) => s + e.quantity, 0);
    const walkers = main.filter((e) => /\bPlaneswalker\b/.test(e.card.type_line || '')).reduce((s, e) => s + e.quantity, 0);
    const ways = main.filter((e) => /^Way of the /.test(e.card.name) && e.card.name !== 'Way of the Thief').map((e) => e.card.name);
    const primaryOf = (e: typeof main[number]) =>
      getPrimaryCategory(classifyCard(e.card.name, e.card.oracle_text || '', e.card.type_line || '', e.card.cmc || 0, undefined, r.strategy === 'superfriends' ? { superfriends: true } : undefined));
    const ramp = main.filter((e) => !isLand(e.card.type_line || '') && primaryOf(e) === 'ramp').reduce((s, e) => s + e.quantity, 0);
    const removal = main.filter((e) => { const p = primaryOf(e); return p === 'removal' || p === 'board_wipe'; }).reduce((s, e) => s + e.quantity, 0);
    const size = main.reduce((s, e) => s + e.quantity, 0);
    const metrics = {
      label, strategy: r.strategy, size, lands: landCount, walkers, ways: ways.length, wayNames: ways,
      ramp, realDraw: r.health?.drawCount ?? null, removal, ms,
    };
    console.log(JSON.stringify(metrics));
    const cards = main.map((e) => `${e.quantity} ${e.card.name}`).sort();
    fs.writeFileSync(path.join(OUT_DIR, `${label.replace(/[^a-z0-9]+/gi, '-')}.json`), JSON.stringify({ metrics, cards }, null, 1));
  }

  const builds: Array<[string, Parameters<typeof autoBuildDeck>[0]]> = [
    ['tam-arena', { format: 'brawl', colors: [], commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' }],
    ['tam-nocoll', { format: 'brawl', colors: [], commanderName: 'Tam, the Possibility' }],
    ['atraxa', { format: 'commander', colors: [], commanderName: "Atraxa, Praetors' Voice" }],
    ['edgar', { format: 'commander', colors: [], commanderName: 'Edgar Markov' }],
    ['krenko', { format: 'brawl', colors: [], commanderName: 'Krenko, Mob Boss' }],
    ['tatyova-arena', { format: 'brawl', colors: [], commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' }],
    // superfriends commanders whose colours hold few/no Ways
    ['karn-colorless', { format: 'brawl', colors: [], commanderName: 'Karn, Scion of Urza' }],
    ['garruk-monoG', { format: 'brawl', colors: [], commanderName: 'Garruk, Unleashed' }],
  ];
  for (const [label, opts] of builds) {
    const t0 = Date.now();
    try {
      const r = await autoBuildDeck(opts);
      report(label, r, Date.now() - t0);
    } catch (e) {
      console.log(JSON.stringify({ label, error: (e as Error).message }));
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
