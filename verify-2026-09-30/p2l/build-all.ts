// P2-L acceptance harness — builds the 8 land-audit decks with the engine at <engineRoot> against the
// p2l DB copy and writes one JSON per build. Land metrics always use the P2-L tip's rulers.
//   cd <engineRoot> && npx tsx <this> <engineRoot> <outDir> [only]
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { pathToFileURL } from 'url';

const DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/p2l-db';
process.env.MTG_DB_DIR = DB_DIR;
const ENGINE_ROOT = path.resolve(process.argv[2] || '.');
const OUT_DIR = path.resolve(process.argv[3] || 'verify-2026-09-30/p2l/out');
const ONLY = process.argv[4];
const TIP_ROOT = 'C:/Users/QuLeR/mtg-wt-p2l';
fs.mkdirSync(OUT_DIR, { recursive: true });

const BUILDS: Array<[string, string, string | undefined, Record<string, unknown>]> = [
  ['ygra', 'Ygra, Eater of All', undefined, { format: 'brawl', commanderName: 'Ygra, Eater of All' }],
  ['krenko', 'Krenko, Mob Boss', undefined, { format: 'brawl', commanderName: 'Krenko, Mob Boss' }],
  ['tymna-thrasios', 'Tymna the Weaver', 'Thrasios, Triton Hero', { format: 'commander', commanderName: 'Tymna the Weaver', partnerName: 'Thrasios, Triton Hero' }],
  ['tam-arena', 'Tam, the Possibility', undefined, { format: 'brawl', commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['atraxa', "Atraxa, Praetors' Voice", undefined, { format: 'commander', commanderName: "Atraxa, Praetors' Voice" }],
  ['aeve-arena', 'Aeve, Progenitor Ooze', undefined, { format: 'brawl', commanderName: 'Aeve, Progenitor Ooze', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['tatyova-arena', 'Tatyova, Benthic Druid', undefined, { format: 'brawl', commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['niv', 'Niv-Mizzet Reborn', undefined, { format: 'commander', commanderName: 'Niv-Mizzet Reborn', maxDeckPrice: 150, bracket: 2 }],
];

const imp = (root: string, rel: string) => import(pathToFileURL(path.join(root, rel)).href);
const isLand = (t: string) => /\bLand\b/.test((t || '').split('//')[0]);
const BASIC = /^(?:Snow-Covered )?(?:Plains|Island|Swamp|Mountain|Forest|Wastes)$/;

async function main() {
  const { autoBuildDeck } = await imp(ENGINE_ROOT, 'src/lib/deck-builder-ai.ts');
  const { parseTappedCondition } = await imp(TIP_ROOT, 'src/lib/land-intelligence.ts');
  const { countColorSources, buildManaSourceContext } = await imp(TIP_ROOT, 'src/lib/mana-sources.ts');
  const { isHonestRamp } = await imp(TIP_ROOT, 'src/lib/card-classifier.ts');
  const db = new Database(`${DB_DIR}/mtg-deck-builder.db`, { readonly: true });
  const colorsOf = db.prepare('SELECT color_identity FROM cards WHERE name = ? LIMIT 1');

  for (const [label, commander, partner, opts] of BUILDS) {
    if (ONLY && label !== ONLY) continue;
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
    const colors = new Set<string>();
    for (const n of [commander, partner]) if (n) for (const c of JSON.parse((colorsOf.get(n) as any)?.color_identity || '[]')) colors.add(c);
    const deckColors = [...colors];

    const main = r.cards.filter((e: any) => e.board === 'main');
    const size = main.reduce((s: number, e: any) => s + e.quantity, 0);
    const landEntries = main.filter((e: any) => isLand(e.card.type_line || '') || e.card.layout === 'modal_dfc' && /Land/.test(e.card.type_line || ''));
    const realLands = main.filter((e: any) => isLand(e.card.type_line || ''));
    const lands = realLands.reduce((s: number, e: any) => s + e.quantity, 0);
    const mdfcSpells = landEntries.length - realLands.length;
    const basics = main.filter((e: any) => BASIC.test(e.card.name)).reduce((s: number, e: any) => s + e.quantity, 0);
    const spells = main.filter((e: any) => !isLand(e.card.type_line || ''));
    const spellQty = spells.reduce((s: number, e: any) => s + e.quantity, 0);
    const honestRamp = spells.reduce((s: number, e: any) => s + (isHonestRamp(e.card.name, e.card.oracle_text || '', e.card.type_line || '') ? e.quantity : 0), 0);
    const avgMv = spellQty ? spells.reduce((s: number, e: any) => s + (e.card.cmc || 0) * e.quantity, 0) / spellQty : 0;
    // Untapped share over real lands: a fetch that deposits untapped, or an ETB clause that isn't unconditional "tapped".
    let untapped = 0;
    for (const e of realLands) {
      const o = (e.card.oracle_text || '').toLowerCase();
      const fetch = /search your library for/.test(o) && /onto the battlefield/.test(o);
      const ok = fetch ? !/enters(?: the battlefield)? tapped|onto the battlefield tapped/.test(o) : parseTappedCondition(e.card.oracle_text).kind !== 'tapped';
      if (ok) untapped += e.quantity;
    }
    const ctx = buildManaSourceContext(deckColors, realLands.map((e: any) => ({ card: e.card, quantity: e.quantity })));
    const sources = countColorSources(realLands.map((e: any) => ({ card: e.card, quantity: e.quantity })), ctx);
    const sourcesInColors = Object.fromEntries(deckColors.map((c) => [c, sources[c]]));
    const roleOf = new Map<string, string>();
    for (const x of r.reasoning || []) if (!roleOf.has(x.cardName)) roleOf.set(x.cardName, x.role);
    const scoreOf = new Map<string, number>((r.scoredPool || []).map((p: any) => [p.name, p.score]));

    const landList = landEntries.map((e: any) => ({ q: e.quantity, name: e.card.name, type: (e.card.type_line || '').slice(0, 40), score: Math.round(scoreOf.get(e.card.name) ?? -9999) }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    const spellList = spells.map((e: any) => ({ q: e.quantity, name: e.card.name, cmc: e.card.cmc, role: roleOf.get(e.card.name) || '', score: Math.round(scoreOf.get(e.card.name) ?? -9999) }))
      .sort((a: any, b: any) => (a.cmc || 0) - (b.cmc || 0) || a.name.localeCompare(b.name));
    const metrics = {
      label, strategy: r.strategy, size, lands, mdfcSpells, basics, untapped, untappedShare: lands ? +(untapped / lands).toFixed(2) : 0,
      sources: sourcesInColors, healthSources: r.health?.sourcesByColor ?? null, honestRamp, avgMv: +avgMv.toFixed(2), ms,
      price: r.price ? { total: r.price.total, overBudget: r.price.overBudget } : null,
      bracket: r.bracket ? { target: r.bracket.target, result: r.bracket.result } : null,
    };
    console.log(JSON.stringify(metrics));
    fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify({ metrics, lands: landList, spells: spellList }, null, 1));
  }
  db.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
