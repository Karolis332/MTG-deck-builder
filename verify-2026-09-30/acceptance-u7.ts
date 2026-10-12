// U7 step 3 — acceptance log for hotfix/builder-plan-2026-09-26 (integrated
// optimizer + superfriends branches, all U7 step-2 follow-ups included).
//
// Runs against a FRESH DB COPY (never the live APPDATA DB, never the repo
// data/ pin) so this can be re-run by the refuter without touching anything
// live. Copies the live Electron DB + its WAL (if any), runs this branch's
// scripts/classify_lands.py against the copy, then builds every deck the
// brief asks for and prints size/lands/walkers/strategy/draw/price/bracket.
//
// Usage: MTG_DB_DIR is set by this script itself (must run before any
// @/lib/db import) — do not set it in the shell first.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const LIVE_DIR = path.join(process.env.APPDATA || '', 'the-black-grimoire', 'data');
const LIVE_DB = path.join(LIVE_DIR, 'mtg-deck-builder.db');
const FRESH_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/u7-db';
const FRESH_DB = path.join(FRESH_DIR, 'mtg-deck-builder.db');

function setUpFreshDb(): void {
  if (!fs.existsSync(LIVE_DB)) throw new Error(`live DB not found at ${LIVE_DB}`);
  fs.rmSync(FRESH_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRESH_DIR, { recursive: true });
  fs.copyFileSync(LIVE_DB, FRESH_DB);
  for (const suffix of ['-wal', '-shm']) {
    const src = LIVE_DB + suffix;
    if (fs.existsSync(src) && fs.statSync(src).size > 0) {
      fs.copyFileSync(src, FRESH_DB + suffix);
    }
  }
  console.log(`fresh DB copy: ${FRESH_DB} (${(fs.statSync(FRESH_DB).size / 1e6).toFixed(1)} MB, wal copied: ${fs.existsSync(FRESH_DB + '-wal')})`);
}

function classifyLands(): void {
  const out = execFileSync('py', ['scripts/classify_lands.py', '--db', FRESH_DB], { encoding: 'utf8', cwd: process.cwd() });
  console.log('--- classify_lands.py ---');
  console.log(out.trim());
}

setUpFreshDb();
classifyLands();
process.env.MTG_DB_DIR = FRESH_DIR.replace(/\\/g, '/');

async function main() {
  const { autoBuildDeck } = await import('../src/lib/deck-builder-ai');
  const { realManaSources, buildManaSourceContext, countColorSources } = await import('../src/lib/mana-sources');
  const { optimizeDeck } = await import('../services/build-api/optimize');

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
    const trapLands = lands.filter((e) => !realManaSources(e.card, ctx).reliable);
    const sourceCards = main.filter((e) => realManaSources(e.card, ctx).reliable);
    const sourcesByColor = countColorSources(sourceCards.map((e) => ({ card: e.card, quantity: e.quantity, board: e.board })), ctx);

    const notOnArena = lands.filter((e) => e.card.arena_id == null);

    const walkers = main.filter((e) => (e.card.type_line || '').includes('Planeswalker'));
    const walkerCount = walkers.reduce((s, e) => s + e.quantity, 0);
    const walkerTypes = new Set(walkers.map((e) => e.card.name)).size;

    const size = main.reduce((s, e) => s + e.quantity, 0);

    console.log(`\n=== ${label} ===`);
    console.log(`strategy: ${r.strategy}`);
    console.log(`size: ${size}  lands: ${landCount} (basics ${basicCount} / nonbasic ${nonbasicCount})`);
    console.log(`trap lands (unreliable per realManaSources): ${trapLands.length ? trapLands.map((e) => e.card.name).join(', ') : '(none)'}`);
    console.log(`lands with no Arena printing (arena_id null): ${notOnArena.length ? notOnArena.map((e) => e.card.name).join(', ') : '(none)'}`);
    console.log(`real sources by colour: ${JSON.stringify(sourcesByColor)}`);
    console.log(`auditor sourcesByColor (health): ${JSON.stringify(r.health?.sourcesByColor)}`);
    console.log(`walkers: ${walkerCount} (distinct types: ${walkerTypes})`);
    console.log(`draw (health.drawCount): ${r.health?.drawCount}`);
    if (r.price) {
      const unpriced = nonLands.filter((e) => e.card.price_usd == null).concat(lands.filter((e) => e.card.price_usd == null));
      const unpricedBasics = unpriced.filter((e) => basics.some((b) => b.card.name === e.card.name));
      const unpricedNonBasic = unpriced.filter((e) => !basics.some((b) => b.card.name === e.card.name));
      console.log(`price: total $${r.price.total.toFixed(2)}  unpricedCount ${r.price.unpricedCount}  overBudget ${r.price.overBudget}`);
      console.log(`  unpriced: ${unpriced.length} rows (${unpricedBasics.length} basics, ${unpricedNonBasic.length} non-basic)`);
      if (unpricedNonBasic.length) {
        console.log(`  unpriced non-basic names: ${unpricedNonBasic.map((e) => e.card.name).join(', ')}`);
      }
    }
    if (r.bracket) console.log(`bracket: target ${r.bracket.target} -> result ${r.bracket.result}`);
  }

  // Tam, the Possibility — brawl.
  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Tam, the Possibility' })
    .then((r) => report('Tam, the Possibility — brawl, no collection', r, { colors: ['W', 'U', 'B', 'R', 'G'] }))
    .catch((e) => console.log('\n=== Tam, no collection === ERROR:', e.message));
  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' })
    .then((r) => report('Tam, the Possibility — brawl, useCollection userId 1 arena', r, { colors: ['W', 'U', 'B', 'R', 'G'] }))
    .catch((e) => console.log('\n=== Tam, collection === ERROR:', e.message));

  // Atraxa — commander.
  await autoBuildDeck({ format: 'commander', colors: [], commanderName: "Atraxa, Praetors' Voice" })
    .then((r) => report("Atraxa, Praetors' Voice — commander", r, { colors: ['W', 'U', 'B', 'G'] }))
    .catch((e) => console.log('\n=== Atraxa === ERROR:', e.message));

  // Tatyova — brawl, arena collection.
  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' })
    .then((r) => report('Tatyova, Benthic Druid — brawl, arena collection', r, { colors: ['G', 'U'] }))
    .catch((e) => console.log('\n=== Tatyova === ERROR:', e.message));

  // Fire Lord Azula — brawl, arena collection.
  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Fire Lord Azula', useCollection: true, userId: 1, collectionSource: 'arena' })
    .then((r) => report('Fire Lord Azula — brawl, arena collection', r, { colors: ['R'] }))
    .catch((e) => console.log('\n=== Fire Lord Azula === ERROR:', e.message));

  // Krenko — brawl, no collection.
  await autoBuildDeck({ format: 'brawl', colors: [], commanderName: 'Krenko, Mob Boss' })
    .then((r) => report('Krenko, Mob Boss — brawl, no collection', r, { colors: ['R'] }))
    .catch((e) => console.log('\n=== Krenko === ERROR:', e.message));

  // Edgar Markov — commander, no collection.
  await autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Edgar Markov' })
    .then((r) => report('Edgar Markov — commander, no collection', r, { colors: ['W', 'B', 'R'] }))
    .catch((e) => console.log('\n=== Edgar Markov === ERROR:', e.message));

  // Niv-Mizzet Reborn — commander, no collection, maxDeckPrice 150, bracket 2.
  await autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Niv-Mizzet Reborn', maxDeckPrice: 150, bracket: 2 })
    .then((r) => report('Niv-Mizzet Reborn — commander, no collection, maxDeckPrice 150, bracket 2', r, { colors: ['W', 'U', 'B', 'R', 'G'] }))
    .catch((e) => console.log('\n=== Niv-Mizzet === ERROR:', e.message));

  // Rakdos, Lord of Riots — commander, maxDeckPrice 150.
  await autoBuildDeck({ format: 'commander', colors: [], commanderName: 'Rakdos, Lord of Riots', maxDeckPrice: 150 })
    .then((r) => report('Rakdos, Lord of Riots — commander, maxDeckPrice 150', r, { colors: ['B', 'R'] }))
    .catch((e) => console.log('\n=== Rakdos === ERROR:', e.message));

  // optimizeDeck on the Tam final.txt fixture.
  try {
    const fixture = fs.readFileSync(path.join(__dirname, '..', 'src/lib/__tests__/fixtures/arena-tam-final.txt'), 'utf8');
    const result = optimizeDeck({ format: 'brawl', text: fixture }) as {
      gate: { totals: { cards: number } };
      swaps: Array<{ cut: string; add: string | null; reason: string }>;
      cuts: Array<{ name: string; reason: string }>;
      landTarget: { current: number; effective: number; recommended: number };
    };
    console.log('\n=== optimizeDeck — Tam final.txt fixture ===');
    console.log(`after size: ${result.gate.totals.cards}`);
    console.log(`lands: current ${result.landTarget.current}  effective ${result.landTarget.effective}  recommended ${result.landTarget.recommended}`);
    console.log(`cuts (${result.cuts.length}): ${result.cuts.map((c) => c.name).join(', ')}`);
    console.log(`adds (${result.swaps.length}): ${result.swaps.map((s) => s.add).filter(Boolean).join(', ')}`);
  } catch (e) {
    console.log('\n=== optimizeDeck Tam fixture === ERROR:', (e as Error).message);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
