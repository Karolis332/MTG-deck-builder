// P2-G acceptance harness — builds the seven P2-G decks with the engine at <engineRoot> against the
// p2g-db copy and writes one JSON per build. Metrics always use THIS worktree's strict classifier.
//   cd <engineRoot> && MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/p2g-db npx tsx <this> <engineRoot> <outDir> [only]
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { pathToFileURL } from 'url';

const DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/p2g-db';
process.env.MTG_DB_DIR = DB_DIR;
const ENGINE_ROOT = path.resolve(process.argv[2] || '.');
const OUT_DIR = path.resolve(process.argv[3] || 'verify-2026-09-30/p2g/out');
const ONLY = process.argv[4];
const TIP_ROOT = 'C:/Users/QuLeR/mtg-wt-p2g';
fs.mkdirSync(OUT_DIR, { recursive: true });

const BUILDS: Array<[string, string | undefined, string | undefined, Record<string, unknown>]> = [
  ['edgar', 'Edgar Markov', undefined, { format: 'commander', commanderName: 'Edgar Markov' }],
  ['tam-arena', 'Tam, the Possibility', undefined, { format: 'brawl', commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['niv', 'Niv-Mizzet Reborn', undefined, { format: 'commander', commanderName: 'Niv-Mizzet Reborn', maxDeckPrice: 150, bracket: 2 }],
  ['rakdos-150', undefined, undefined, { format: 'commander', colors: ['B', 'R'], maxDeckPrice: 150 }],
  ['tymna-thrasios', 'Tymna the Weaver', 'Thrasios, Triton Hero', { format: 'commander', commanderName: 'Tymna the Weaver', partnerName: 'Thrasios, Triton Hero' }],
  ['krenko', 'Krenko, Mob Boss', undefined, { format: 'brawl', commanderName: 'Krenko, Mob Boss' }],
  ['atraxa', "Atraxa, Praetors' Voice", undefined, { format: 'commander', commanderName: "Atraxa, Praetors' Voice" }],
];

const imp = (root: string, rel: string) => import(pathToFileURL(path.join(root, rel)).href);
const isLand = (t: string) => /\bLand\b/.test((t || '').split('//')[0]);
const BASIC = /^(?:Snow-Covered )?(?:Plains|Island|Swamp|Mountain|Forest|Wastes)$/;

async function main() {
  const { autoBuildDeck } = await imp(ENGINE_ROOT, 'src/lib/deck-builder-ai.ts');
  const { getEdhrecRecommendations } = await imp(ENGINE_ROOT, 'src/lib/edhrec.ts');
  const { classifyCard, getPrimaryCategory, isSymmetricCreatureWipe } = await imp(TIP_ROOT, 'src/lib/card-classifier.ts');
  const db = new Database(`${DB_DIR}/mtg-deck-builder.db`, { readonly: true });
  const cmdrByName = db.prepare('SELECT oracle_text FROM cards WHERE name = ? LIMIT 1');
  const ccs = db.prepare('SELECT card_name FROM commander_card_stats WHERE commander_name = ? COLLATE NOCASE ORDER BY inclusion_rate DESC LIMIT 300');
  const avg = db.prepare("SELECT card_name FROM edhrec_avg_decks WHERE commander_name = ? AND card_type = 'land'");

  for (const [label, commander, partner, opts] of BUILDS) {
    if (ONLY && label !== ONLY) continue;
    // Partner signal sets (B-D4): what each source knows about each half, and the pair page.
    const signals: Record<string, Set<string>> = {};
    const edhrec: Record<string, number | string> = {};
    for (const n of [commander, partner].filter((x): x is string => !!x)) {
      signals[`ccs:${n}`] = new Set((ccs.all(n) as Array<{ card_name: string }>).map((r) => r.card_name));
      signals[`avg:${n}`] = new Set((avg.all(n) as Array<{ card_name: string }>).map((r) => r.card_name));
      try { const rec = await getEdhrecRecommendations(n); signals[`edh:${n}`] = new Set((rec?.topCards ?? []).map((c: any) => c.name)); edhrec[n] = rec?.topCards?.length ?? 0; } catch (e: any) { edhrec[n] = e.message; }
    }
    if (commander && partner) {
      for (const pairName of [`${commander} ${partner}`, `${partner} ${commander}`]) {
        try { const rec = await getEdhrecRecommendations(pairName); if (!rec) continue; signals['edh:pair'] = new Set((rec.topCards ?? []).map((c: any) => c.name)); edhrec.pair = `${pairName}: ${rec.topCards?.length ?? 0}`; break; } catch (e: any) { edhrec.pair = e.message; }
      }
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

    const roles: Record<string, number> = {};
    const wipes = { symmetric: [] as string[], oneSided: [] as string[] };
    const protection: string[] = [];
    let creatures = 0, walkers = 0, ways = 0;
    const signalHits: Record<string, number> = {};
    const cards: any[] = [];
    for (const e of main) {
      const c = e.card;
      const land = isLand(c.type_line || '');
      const cats = land ? ['land'] : catsOf(c);
      const primary = land ? 'land' : getPrimaryCategory(cats);
      roles[primary] = (roles[primary] || 0) + e.quantity;
      if (!land) {
        if (cats.includes('board_wipe')) (isSymmetricCreatureWipe(c.name, c.oracle_text || '') ? wipes.symmetric : wipes.oneSided).push(c.name);
        if (cats.includes('protection')) protection.push(c.name);
        if (/\bCreature\b/.test((c.type_line || '').split('//')[0])) creatures += e.quantity;
        if (/\bPlaneswalker\b/.test(c.type_line || '')) walkers += e.quantity;
        if (/^Way of the /.test(c.name) && c.name !== 'Way of the Thief') ways += 1;
      }
      for (const [k, set] of Object.entries(signals)) if (set.has(c.name)) signalHits[k] = (signalHits[k] || 0) + 1;
      cards.push({ q: e.quantity, name: c.name, cmc: c.cmc, type: (c.type_line || '').slice(0, 40), cats, primary, role: roleOf.get(c.name) || '', score: Math.round(scoreOf.get(c.name) ?? -9999), price: c.price_usd, rank: c.edhrec_rank });
    }
    cards.sort((a, b) => (isLand(a.type) ? 1 : 0) - (isLand(b.type) ? 1 : 0) || (a.cmc || 0) - (b.cmc || 0) || a.name.localeCompare(b.name));

    const metrics = {
      label, strategy: r.strategy, tribal: r.tribalType ?? null, size, lands, basics, creatures, walkers, ways, ms,
      roles, protection, wipes, signalHits, edhrec,
      sources: r.health?.sourcesByColor ?? null,
      price: r.price ? { total: r.price.total, overBudget: r.price.overBudget, replaced: r.price.replacedForBudget } : null,
      bracket: r.bracket ? { target: r.bracket.target, result: r.bracket.result } : null,
    };
    console.log(JSON.stringify({ ...metrics, price: metrics.price ? { total: metrics.price.total, swaps: metrics.price.replaced.length } : null }));
    fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify({ metrics, cards }, null, 1));
  }
  db.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
