// P1 acceptance — builds the audit decks with the engine at <engineRoot> against the P1 DB copy and
// writes one JSON per build (metrics, card list, per-role stop-proof margins) into <outDir>.
//   MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/P1-db npx tsx verify-2026-09-30/p1/acceptance-p1.ts <engineRoot> <outDir> [only]
// Run with cwd = <engineRoot> so tsx resolves that tree's tsconfig paths.
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { pathToFileURL } from 'url';

const DB_DIR = process.env.MTG_DB_DIR || 'C:/Users/QuLeR/AppData/Local/Temp/P1-db';
process.env.MTG_DB_DIR = DB_DIR;
const ENGINE_ROOT = path.resolve(process.argv[2] || '.');
const OUT_DIR = path.resolve(process.argv[3] || 'verify-2026-09-30/p1/out');
const ONLY = process.argv[4];
fs.mkdirSync(OUT_DIR, { recursive: true });

const BUILDS: Array<[string, Record<string, unknown>]> = [
  ['tam-arena', { format: 'brawl', commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['tam-nocoll', { format: 'brawl', commanderName: 'Tam, the Possibility' }],
  ['tatyova-arena', { format: 'brawl', commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['aeve-arena', { format: 'brawl', commanderName: 'Aeve, Progenitor Ooze', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['meren-paper', { format: 'commander', commanderName: 'Meren of Clan Nel Toth', useCollection: true, userId: 1, collectionSource: 'paper' }],
  ['jhoira-arena', { format: 'brawl', commanderName: 'Jhoira, Weatherlight Captain', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['edgar', { format: 'commander', commanderName: 'Edgar Markov' }],
  ['krenko', { format: 'brawl', commanderName: 'Krenko, Mob Boss' }],
  ['atraxa', { format: 'commander', commanderName: "Atraxa, Praetors' Voice" }],
  ['karn-brawl', { format: 'brawl', commanderName: 'Karn, Legacy Reforged' }],
  ['kozilek-commander', { format: 'commander', commanderName: 'Kozilek, the Great Distortion' }],
];

const stripA = (n: string) => (n.startsWith('A-') ? n.slice(2) : n);

async function main() {
  const engine = await import(pathToFileURL(path.join(ENGINE_ROOT, 'src/lib/deck-builder-ai.ts')).href);
  const { autoBuildDeck } = engine;
  // Plan-floor picks (superfriends walker engines / walkers, tribe creatures) are seated by design, not by score.
  const isPlanPick = (strategy: string, tribal: string | null, card: any): boolean =>
    (strategy === 'superfriends' && (/\bPlaneswalker\b/.test(card.type_line || '') || engine.isWalkerEngineCard?.(card) === true))
    || (!!tribal && new RegExp('\\b' + tribal + '\\b', 'i').test(`${card.type_line || ''} ${card.oracle_text || ''}`));
  const { classifyCard, getPrimaryCategory } = await import(pathToFileURL(path.join(ENGINE_ROOT, 'src/lib/card-classifier.ts')).href);
  const { buildOwnedQtyMap } = await import(pathToFileURL(path.join(ENGINE_ROOT, 'src/lib/collection-ownership.ts')).href);
  const db = new Database(`${DB_DIR}/mtg-deck-builder.db`, { readonly: true });
  const cardByName = db.prepare('SELECT name, type_line, oracle_text, cmc, edhrec_rank FROM cards WHERE name = ? ORDER BY updated_at DESC LIMIT 1');
  const cmdrByName = db.prepare('SELECT oracle_text FROM cards WHERE name = ? LIMIT 1');
  const isLand = (t: string) => /\bLand\b/.test((t || '').split('//')[0]);

  for (const [label, opts] of BUILDS) {
    if (ONLY && label !== ONLY) continue;
    const t0 = Date.now();
    let r: any;
    try {
      r = await autoBuildDeck({ colors: [], ...opts, captureComponents: true });
    } catch (e: any) {
      console.log(JSON.stringify({ label, error: e.message }));
      continue;
    }
    const ms = Date.now() - t0;
    const commanderName = opts.commanderName as string;
    const cmdrOracle = (cmdrByName.get(commanderName) as any)?.oracle_text || undefined;
    const classifyOpts = r.strategy === 'superfriends' ? { superfriends: true } : undefined;
    const primaryOf = (c: { name: string; type_line?: string | null; oracle_text?: string | null; cmc?: number | null }) =>
      getPrimaryCategory(classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0, cmdrOracle, classifyOpts));

    const main = r.cards.filter((e: any) => e.board === 'main');
    const nonland = main.filter((e: any) => !isLand(e.card.type_line || ''));
    const size = main.reduce((s: number, e: any) => s + e.quantity, 0);
    const lands = size - nonland.reduce((s: number, e: any) => s + e.quantity, 0);
    const roleCounts: Record<string, number> = {};
    for (const e of nonland) {
      const p = primaryOf(e.card);
      roleCounts[p] = (roleCounts[p] || 0) + e.quantity;
    }
    const ways = main.filter((e: any) => /^Way of the /.test(e.card.name) && e.card.name !== 'Way of the Thief').length;
    const walkers = main.filter((e: any) => /\bPlaneswalker\b/.test(e.card.type_line || '')).reduce((s: number, e: any) => s + e.quantity, 0);
    const slime = main.filter((e: any) => e.card.name === 'Slime Against Humanity').reduce((s: number, e: any) => s + e.quantity, 0);
    const keyCount = new Map<string, number>();
    for (const e of main) keyCount.set(stripA(e.card.name), (keyCount.get(stripA(e.card.name)) || 0) + 1);
    const arenaDupes = [...keyCount.entries()].filter(([, n]) => n > 1).map(([k]) => k);

    // Stop proof: per role, the weakest picked nonland vs the strongest pickable card left on the bench.
    const scoreOf = new Map<string, number>((r.scoredPool || []).map((p: any) => [p.name, p.score]));
    const pickedKeys = new Set(main.map((e: any) => stripA(e.card.name)));
    const owned = opts.useCollection
      ? buildOwnedQtyMap(db, { userId: opts.userId as number, source: opts.collectionSource as string })
      : null;
    const worstPicked: Record<string, { name: string; score: number }> = {};
    const worstPlanPicked: Record<string, { name: string; score: number }> = {};
    for (const e of nonland) {
      const p = primaryOf(e.card);
      const s = scoreOf.get(e.card.name) ?? -Infinity;
      if (!worstPicked[p] || s < worstPicked[p].score) worstPicked[p] = { name: e.card.name, score: s };
      if (isPlanPick(r.strategy, r.tribalType ?? null, e.card)) continue;
      if (!worstPlanPicked[p] || s < worstPlanPicked[p].score) worstPlanPicked[p] = { name: e.card.name, score: s };
    }
    const bestBench: Record<string, { name: string; score: number }> = {};
    for (const p of r.scoredPool || []) {
      if (pickedKeys.has(stripA(p.name))) continue;
      if (owned && !(owned.get(p.name) > 0)) continue;
      const row = cardByName.get(p.name) as any;
      if (!row || isLand(row.type_line)) continue;
      const role = primaryOf(row);
      if (!bestBench[role] || p.score > bestBench[role].score) bestBench[role] = { name: p.name, score: p.score };
    }
    const marginsOf = (worst: Record<string, { name: string; score: number }>) => {
      const margins: Record<string, { picked: string; pickedScore: number; bench: string; benchScore: number; margin: number }> = {};
      let maxMargin = -Infinity;
      for (const role of Object.keys(worst)) {
        if (!bestBench[role]) continue;
        const margin = bestBench[role].score - worst[role].score;
        margins[role] = { picked: worst[role].name, pickedScore: Math.round(worst[role].score), bench: bestBench[role].name, benchScore: Math.round(bestBench[role].score), margin: Math.round(margin) };
        if (margin > maxMargin) maxMargin = margin;
      }
      return { margins, maxMargin };
    };
    const { margins, maxMargin } = marginsOf(worstPicked);
    const plan = marginsOf(worstPlanPicked);

    const metrics = {
      label, strategy: r.strategy, tribal: r.tribalType ?? null, size, lands, nonland: size - lands, roleCounts,
      walkers, ways, slime, arenaDupes, maxMargin: Math.round(maxMargin), planMargin: Math.round(plan.maxMargin),
      sources: r.health?.sourcesByColor ?? null, ms,
    };
    console.log(JSON.stringify(metrics));
    const cards = main.map((e: any) => ({ q: e.quantity, name: e.card.name, role: primaryOf(e.card), score: Math.round(scoreOf.get(e.card.name) ?? -9999) }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify({ metrics, margins, planMargins: plan.margins, cards }, null, 1));
  }
  db.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
