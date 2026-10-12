// Integrate-2 measurement harness — builds the 14 audit decks with the engine at <engineRoot>
// (6791d3e = mtg-audit-wt, or the merged tip = mtg-score-tmp) against the I2-db copy and writes
// one JSON per build. Metrics ALWAYS use the tip's strict classifier (fixed path below) so the
// baseline and tip decks are read with the same ruler.
//   cd <engineRoot> && MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/I2-db npx tsx <this> <engineRoot> <outDir> [only]
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { pathToFileURL } from 'url';

const DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/p2s-db';
process.env.MTG_DB_DIR = DB_DIR;
const ENGINE_ROOT = path.resolve(process.argv[2] || '.');
const OUT_DIR = path.resolve(process.argv[3] || 'verify-2026-09-30/i2/out');
const ONLY = new Set((process.argv[4] || 'tam-arena,tam-nocoll,meren-paper,atraxa,edgar,krenko,kess,tymna-thrasios').split(','));
const TIP_ROOT = 'C:/Users/QuLeR/mtg-wt-p2s';
fs.mkdirSync(OUT_DIR, { recursive: true });

const BUILDS: Array<[string, string, string | undefined, Record<string, unknown>]> = [
  ['tam-arena', 'Tam, the Possibility', undefined, { format: 'brawl', commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['tam-nocoll', 'Tam, the Possibility', undefined, { format: 'commander', commanderName: 'Tam, the Possibility' }],
  ['tatyova-arena', 'Tatyova, Benthic Druid', undefined, { format: 'brawl', commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['aeve-arena', 'Aeve, Progenitor Ooze', undefined, { format: 'brawl', commanderName: 'Aeve, Progenitor Ooze', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['meren-paper', 'Meren of Clan Nel Toth', undefined, { format: 'commander', commanderName: 'Meren of Clan Nel Toth', useCollection: true, userId: 1, collectionSource: 'paper' }],
  ['jhoira-arena', 'Jhoira, Weatherlight Captain', undefined, { format: 'brawl', commanderName: 'Jhoira, Weatherlight Captain', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['atraxa', "Atraxa, Praetors' Voice", undefined, { format: 'commander', commanderName: "Atraxa, Praetors' Voice" }],
  ['edgar', 'Edgar Markov', undefined, { format: 'commander', commanderName: 'Edgar Markov' }],
  ['krenko', 'Krenko, Mob Boss', undefined, { format: 'brawl', commanderName: 'Krenko, Mob Boss' }],
  ['kess', 'Kess, Dissident Mage', undefined, { format: 'commander', commanderName: 'Kess, Dissident Mage' }],
  ['ygra', 'Ygra, Eater of All', undefined, { format: 'brawl', commanderName: 'Ygra, Eater of All' }],
  ['tymna-thrasios', 'Tymna the Weaver', 'Thrasios, Triton Hero', { format: 'commander', commanderName: 'Tymna the Weaver', partnerName: 'Thrasios, Triton Hero' }],
  ['niv', 'Niv-Mizzet Reborn', undefined, { format: 'commander', commanderName: 'Niv-Mizzet Reborn', maxDeckPrice: 150, bracket: 2 }],
  ['karn-brawl', 'Karn, Legacy Reforged', undefined, { format: 'brawl', commanderName: 'Karn, Legacy Reforged' }],
];

const imp = (root: string, rel: string) => import(pathToFileURL(path.join(root, rel)).href);
const isLand = (t: string) => /\bLand\b/.test((t || '').split('//')[0]);
const BASIC = /^(?:Snow-Covered )?(?:Plains|Island|Swamp|Mountain|Forest|Wastes)$/;

async function main() {
  const { autoBuildDeck } = await imp(ENGINE_ROOT, 'src/lib/deck-builder-ai.ts');
  const { getEdhrecRecommendations, getEdhrecThemeCards } = await imp(ENGINE_ROOT, 'src/lib/edhrec.ts');
  const { classifyCard, getPrimaryCategory, isHonestRamp } = await imp(TIP_ROOT, 'src/lib/card-classifier.ts');
  const db = new Database(`${DB_DIR}/mtg-deck-builder.db`, { readonly: true });
  const cmdrByName = db.prepare('SELECT oracle_text FROM cards WHERE name = ? LIMIT 1');

  for (const [label, commander, partner, opts] of BUILDS) {
    if (!ONLY.has(label)) continue;
    // EDHREC received — the same calls the builder makes; cached, so the build reads it back.
    const tf = Date.now();
    const edhrecNames = new Set<string>();
    let edhrec: Record<string, unknown> = {};
    try {
      const rec = await getEdhrecRecommendations(commander);
      const themes: string[] = rec?.themes ?? [];
      const themeRes = await Promise.all(themes.slice(0, 2).map((t: string) => getEdhrecThemeCards(commander, t)));
      for (const c of rec?.topCards ?? []) edhrecNames.add(c.name);
      for (const t of themeRes) for (const c of t?.cards ?? []) edhrecNames.add(c.name);
      edhrec = { topCards: rec?.topCards?.length ?? 0, themes: themes.slice(0, 2), themeCards: themeRes.map((t: any) => t?.cards?.length ?? 0), unique: edhrecNames.size, fetchMs: Date.now() - tf };
    } catch (e: any) {
      edhrec = { error: e.message, fetchMs: Date.now() - tf };
    }

    const t0 = Date.now();
    let r: any;
    try {
      r = await autoBuildDeck({ colors: [], ...opts, captureComponents: true });
    } catch (e: any) {
      console.log(JSON.stringify({ label, error: e.message }));
      fs.writeFileSync(path.join(OUT_DIR, `${label}.error.txt`), String(e.stack || e.message));
      continue;
    }
    const ms = Date.now() - t0;
    const cmdrOracle = [commander, partner].filter(Boolean).map((n) => (cmdrByName.get(n as string) as any)?.oracle_text || '').join('\n') || undefined;
    const strictOpts = { superfriends: r.strategy === 'superfriends', strict: true };
    const catsOf = (c: any) => classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0, cmdrOracle, strictOpts) as string[];

    const main = r.cards.filter((e: any) => e.board === 'main');
    const nonland = main.filter((e: any) => !isLand(e.card.type_line || ''));
    const size = main.reduce((s: number, e: any) => s + e.quantity, 0);
    const lands = size - nonland.reduce((s: number, e: any) => s + e.quantity, 0);
    const basics = main.filter((e: any) => BASIC.test(e.card.name)).reduce((s: number, e: any) => s + e.quantity, 0);
    const roleOf = new Map<string, string>();
    for (const x of r.reasoning || []) if (!roleOf.has(x.cardName)) roleOf.set(x.cardName, x.role);
    const scoreOf = new Map<string, number>((r.scoredPool || []).map((p: any) => [p.name, p.score]));
    const compOf = new Map<string, any>((r.scoredPool || []).map((p: any) => [p.name, p.components]));

    const counts = { honestRamp: 0, draw: 0, removal: 0, wipes: 0, protection: 0, wincons: 0, tutors: 0 };
    const primaryCounts: Record<string, number> = {};
    let walkers = 0, ways = 0, fromEdhrec = 0;
    const cards: any[] = [];
    for (const e of main) {
      const c = e.card;
      const land = isLand(c.type_line || '');
      const cats = land ? ['land'] : catsOf(c);
      const primary = land ? 'land' : getPrimaryCategory(cats);
      if (!land) {
        primaryCounts[primary] = (primaryCounts[primary] || 0) + e.quantity;
        if (isHonestRamp(c.name, c.oracle_text || '', c.type_line || '')) counts.honestRamp += e.quantity;
        if (cats.includes('draw')) counts.draw += e.quantity;
        if (cats.includes('removal')) counts.removal += e.quantity;
        if (cats.includes('board_wipe')) counts.wipes += e.quantity;
        if (cats.includes('protection')) counts.protection += e.quantity;
        if (cats.includes('win_condition')) counts.wincons += e.quantity;
        if (cats.includes('tutor')) counts.tutors += e.quantity;
        if (/\bPlaneswalker\b/.test(c.type_line || '')) walkers += e.quantity;
        if (/^Way of the /.test(c.name) && c.name !== 'Way of the Thief') ways += 1;
      }
      if (edhrecNames.has(c.name)) fromEdhrec += 1;
      cards.push({ q: e.quantity, name: c.name, cmc: c.cmc, type: (c.type_line || '').slice(0, 40), cats, primary, role: roleOf.get(c.name) || '', score: Math.round(scoreOf.get(c.name) ?? -9999), price: c.price_usd, edhrec: edhrecNames.has(c.name), comp: compOf.get(c.name) });
    }
    cards.sort((a, b) => (isLand(a.type) ? 1 : 0) - (isLand(b.type) ? 1 : 0) || (a.cmc || 0) - (b.cmc || 0) || a.name.localeCompare(b.name));

    const metrics = {
      label, strategy: r.strategy, themes: r.themes, tribal: r.tribalType ?? null, size, lands, basics,
      ...counts, walkers, ways, fromEdhrec, primaryCounts, ms, edhrec,
      sources: r.health?.sourcesByColor ?? null, price: r.price ? { total: r.price.total, overBudget: r.price.overBudget } : null,
      bracket: r.bracket ? { target: r.bracket.target, result: r.bracket.result } : null,
    };
    console.log(JSON.stringify(metrics));
    fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify({ metrics, cards }, null, 1));
  }
  db.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
