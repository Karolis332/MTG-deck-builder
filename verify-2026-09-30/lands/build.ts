// Unit L acceptance harness — builds the ten audit decks with a chosen engine tree
// against the L-db copy and dumps the land-base facts the brief asks for.
// Run with cwd = the engine root so tsx picks that tree's tsconfig `@/*` alias:
//   cd <engine> && npx tsx C:/Users/QuLeR/mtg-wt-lands/verify-2026-09-30/lands/build.ts --engine <engine> --out <dir> [key...]
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/L-db';
const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ENGINE = opt('--engine', 'C:/Users/QuLeR/mtg-wt-lands');
const OUT = opt('--out', path.join(__dirname, 'out-tip'));
const only = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
fs.mkdirSync(OUT, { recursive: true });

const BUILDS: Array<{ key: string; opts: Record<string, unknown> }> = [
  { key: 'tam', opts: { format: 'brawl', commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' } },
  { key: 'tatyova', opts: { format: 'brawl', commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' } },
  { key: 'aeve', opts: { format: 'brawl', commanderName: 'Aeve, Progenitor Ooze', useCollection: true, userId: 1, collectionSource: 'arena' } },
  { key: 'meren', opts: { format: 'commander', commanderName: 'Meren of Clan Nel Toth', useCollection: true, userId: 1, collectionSource: 'paper' } },
  { key: 'jhoira', opts: { format: 'brawl', commanderName: 'Jhoira, Weatherlight Captain', useCollection: true, userId: 1, collectionSource: 'arena' } },
  { key: 'atraxa', opts: { format: 'commander', commanderName: "Atraxa, Praetors' Voice" } },
  { key: 'niv', opts: { format: 'commander', commanderName: 'Niv-Mizzet Reborn', maxDeckPrice: 150, bracket: 2 } },
  { key: 'krenko', opts: { format: 'brawl', commanderName: 'Krenko, Mob Boss' } },
  { key: 'tymna-thrasios', opts: { format: 'commander', commanderName: 'Tymna the Weaver', partnerName: 'Thrasios, Triton Hero' } },
  { key: 'ygra', opts: { format: 'brawl', commanderName: 'Ygra, Eater of All' } },
];

// Karsten-style 90 % source targets (display only; the engine has its own copy).
const K99: Record<number, number[]> = { 1: [0, 19, 17, 15, 14, 13, 12, 11], 2: [0, 0, 26, 24, 22, 21, 19, 18], 3: [0, 0, 0, 33, 30, 28, 26, 24] };
const BASIC: Record<string, string> = { plains: 'W', island: 'U', swamp: 'B', mountain: 'R', forest: 'G' };

function untappedT1to3(oracle: string, colors: string[], tribal: string[], format: string, isFetch: boolean): boolean {
  const o = (oracle || '').toLowerCase();
  if (isFetch) return !/enters(?: the battlefield)? tapped/.test(o) && !/onto the battlefield tapped/.test(o);
  const m = o.match(/enters(?: the battlefield)? tapped(?: unless ([^.]+))?\./);
  if (!m) return true;
  const cond = m[1];
  if (!cond) {
    // "If you don't, it enters tapped." → the preceding sentence is the condition
    const prev = o.match(/([^.]*)\. if you don.t, (?:it|this land) enters tapped/);
    if (!prev) return false;
    const p = prev[1];
    if (/pay \d+ life/.test(p)) return true;
    const rev = p.match(/reveal an? ([a-z]+)(?: or an? ([a-z]+))? card/);
    if (rev) return [rev[1], rev[2]].filter(Boolean).some((t) => tribal.map((x) => x.toLowerCase()).includes(t!));
    return false;
  }
  if (/first, second, or third turn/.test(cond)) return true;
  if (/two or more opponents/.test(cond)) return format === 'commander';
  if (/revealed a ([a-z]+) card/.test(cond)) { const t = cond.match(/revealed a ([a-z]+) card/)![1]; return tribal.map((x) => x.toLowerCase()).includes(t); }
  const named = Object.keys(BASIC).filter((b) => cond.includes(b));
  if (named.length) return named.some((b) => colors.includes(BASIC[b]));
  return true; // slow/fast/basic-land/legendary… assumed satisfiable
}

async function main() {
  const { autoBuildDeck } = await import(pathToFileURL(`${ENGINE}/src/lib/deck-builder-ai.ts`).href);
  const { realManaSources, buildManaSourceContext, countColorSources, fetchLandColors } = await import(pathToFileURL(`${ENGINE}/src/lib/mana-sources.ts`).href);
  const Database = (await import('better-sqlite3')).default;
  const db = new Database('C:/Users/QuLeR/AppData/Local/Temp/L-db/mtg-deck-builder.db', { readonly: true });
  const classOf = db.prepare('select land_category cat, tier, enters_untapped untap, enters_untapped_condition cond, synergy_tags tags from land_classifications where card_name = ?');
  const summaryLines: string[] = [];

  for (const b of BUILDS) {
    if (only.length && !only.includes(b.key)) continue;
    const t0 = Date.now();
    let r: any;
    try {
      r = await autoBuildDeck({ colors: [], ...b.opts });
    } catch (e: any) {
      console.log(`=== ${b.key} ERROR: ${e.message}`);
      fs.writeFileSync(path.join(OUT, `${b.key}.error.txt`), String(e.stack || e.message));
      continue;
    }
    const ms = Date.now() - t0;
    const cmdrRows = [b.opts.commanderName, b.opts.partnerName].filter(Boolean)
      .map((n) => db.prepare('select name, mana_cost, oracle_text, color_identity from cards where name = ? limit 1').get(n as string) as any);
    const ci = [...new Set(cmdrRows.flatMap((c) => JSON.parse(c.color_identity || '[]') as string[]))];
    const format = b.opts.format as string;
    const main = r.cards.filter((e: any) => e.board === 'main');
    const isLandType = (e: any) => (e.card.type_line || '').includes('Land');
    const frontLand = (e: any) => (e.card.type_line || '').split('//')[0].includes('Land');
    const lands = main.filter(isLandType);
    const realLands = lands.filter(frontLand);
    const nonLands = main.filter((e: any) => !isLandType(e));
    const landCount = lands.reduce((s: number, e: any) => s + e.quantity, 0);
    const realCount = realLands.reduce((s: number, e: any) => s + e.quantity, 0);
    const basicCount = lands.filter((e: any) => /Basic Land/.test(e.card.type_line || '')).reduce((s: number, e: any) => s + e.quantity, 0);
    const ctx = buildManaSourceContext(ci, lands.map((e: any) => ({ card: e.card, quantity: e.quantity })));
    const sourceLands = lands.filter((e: any) => realManaSources(e.card, ctx).reliable);
    const landSources = countColorSources(sourceLands.map((e: any) => ({ card: e.card, quantity: e.quantity })), ctx);
    const allSources = countColorSources(main.filter((e: any) => realManaSources(e.card, ctx).reliable).map((e: any) => ({ card: e.card, quantity: e.quantity })), ctx);

    // pip demand + Karsten target per colour (nonland picks + commander cost + commander activation pips)
    const costs: Array<{ cost: string; qty: number }> = nonLands.map((e: any) => ({ cost: e.card.mana_cost || '', qty: e.quantity }));
    for (const c of cmdrRows) {
      if (c.mana_cost) costs.push({ cost: c.mana_cost, qty: 1 });
      for (const line of (c.oracle_text || '').split('\n')) { const i = line.indexOf(':'); if (i > 0 && /\{[WUBRG]\}/.test(line.slice(0, i))) costs.push({ cost: line.slice(0, i), qty: 1 }); }
    }
    const pips: Record<string, number> = {}; const target: Record<string, number> = {}; const worst: Record<string, string> = {};
    for (const { cost, qty } of costs) {
      const syms = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
      const mv = syms.reduce((s, x) => s + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
      const per: Record<string, number> = {};
      for (const x of syms) for (const c of x.split('/')) if ('WUBRG'.includes(c) && c.length === 1) { per[c] = (per[c] || 0) + 1; break; }
      for (const [c, n] of Object.entries(per)) {
        pips[c] = (pips[c] || 0) + n * qty;
        const t = K99[Math.min(3, n)][Math.min(7, Math.max(n, mv))];
        if (t > (target[c] || 0)) { target[c] = t; worst[c] = `${cost}`; }
      }
    }

    const tribal: string[] = r.tribalType ? [r.tribalType] : [];
    const roleOf = new Map<string, string>();
    for (const x of r.reasoning || []) if (!roleOf.has(x.cardName)) roleOf.set(x.cardName, x.reason || x.role);
    const landRows = lands.map((e: any) => {
      const cls = classOf.get(e.card.name) as any;
      const isFetch = fetchLandColors(e.card) !== null;
      const untapped = untappedT1to3(e.card.oracle_text, ci, tribal, format, isFetch);
      const prof = realManaSources(e.card, ctx);
      return { qty: e.quantity, name: e.card.name, front: frontLand(e), colors: prof.reliable ? prof.colors.join('') : `(${(JSON.parse(e.card.produced_mana || '[]') as string[]).join('')})`, untapped, cat: cls?.cat, tier: cls?.tier, price: e.card.price_usd, rank: e.card.edhrec_rank, note: roleOf.get(e.card.name) || '' };
    }).sort((a: any, b2: any) => (a.front === b2.front ? (a.rank ?? 99999) - (b2.rank ?? 99999) : a.front ? -1 : 1));
    const untappedCount = landRows.filter((l: any) => l.untapped && l.front).reduce((s: number, l: any) => s + l.qty, 0);

    // owned premium lands left on the bench (collection builds)
    let bench: any[] = [];
    if (b.opts.useCollection) {
      const inDeck = new Set(main.map((e: any) => e.card.name.replace(/^A-/, '')));
      bench = (db.prepare(`select c.name, c.oracle_text, c.color_identity, c.produced_mana, c.edhrec_rank, c.type_line, sum(col.quantity) qty
        from collection col join cards c on c.id = col.card_id where col.user_id = 1 and col.source = ? and c.type_line like '%Land%' and c.type_line not like 'Basic Land%' group by c.name`).all(b.opts.collectionSource as string) as any[])
        .filter((l) => (JSON.parse(l.color_identity || '[]') as string[]).every((c) => ci.includes(c)) && !inDeck.has(l.name.replace(/^A-/, '')))
        .map((l) => { const cls = classOf.get(l.name) as any; return { name: l.name, rank: l.edhrec_rank, cat: cls?.cat, tier: cls?.tier, untapped: untappedT1to3(l.oracle_text, ci, tribal, format, fetchLandColors(l) !== null), produced: (JSON.parse(l.produced_mana || '[]') as string[]).join('') }; })
        .sort((a, b2) => (a.rank ?? 99999) - (b2.rank ?? 99999));
    }

    const colorLine = ci.map((c) => `${c} ${landSources[c] ?? 0}(+${(allSources[c] ?? 0) - (landSources[c] ?? 0)} rocks)/${target[c] ?? 0} pips ${pips[c] ?? 0} worst ${worst[c] ?? '-'}`).join(' | ');
    const head = [
      `# ${b.key} — ${JSON.stringify(b.opts)} (${ms} ms) engine ${ENGINE}`,
      `strategy ${r.strategy} tribal ${r.tribalType ?? '-'} size ${main.reduce((s: number, e: any) => s + e.quantity, 0)}`,
      `lands ${landCount} (real ${realCount}, mdfc-spell ${landCount - realCount}, basics ${basicCount}, nonbasic ${realCount - basicCount}) untapped-T1-3 ${untappedCount}/${realCount} = ${(100 * untappedCount / Math.max(1, realCount)).toFixed(0)} %`,
      `sources(land)/target: ${colorLine}`,
      `health ${JSON.stringify({ ...(r.health || {}), sourcesByColor: undefined })} price ${r.price ? `$${r.price.total.toFixed(2)}` : '-'} bracket ${r.bracket ? `${r.bracket.target}->${r.bracket.result}` : '-'}`,
    ];
    const body = landRows.map((l: any) => `${l.qty} ${l.name.padEnd(44)} | ${l.colors.padEnd(6)} | ${(l.cat || '?').padEnd(20)} t${l.tier ?? '?'} | ${l.untapped ? 'untapped' : 'TAPPED  '} | ${l.front ? '' : 'mdfc-spell '}${l.note}`);
    const benchLines = bench.length ? ['', `--- owned ${b.opts.collectionSource} nonbasic CI-legal lands benched: ${bench.length}`, ...bench.slice(0, 60).map((l) => `${l.name.padEnd(44)} | ${l.produced.padEnd(6)} | ${(l.cat || '?').padEnd(20)} t${l.tier ?? '?'} | ${l.untapped ? 'untapped' : 'TAPPED  '} | r${l.rank}`)] : [];
    fs.writeFileSync(path.join(OUT, `${b.key}.txt`), [...head, '', ...body, ...benchLines, ''].join('\n'));
    fs.writeFileSync(path.join(OUT, `${b.key}.json`), JSON.stringify({ key: b.key, opts: b.opts, ms, ci, strategy: r.strategy, tribal: r.tribalType, landCount, realCount, basicCount, untappedCount, landSources, allSources, target, pips, worst, lands: landRows, bench, health: r.health, price: r.price, bracket: r.bracket, nonlands: nonLands.map((e: any) => e.card.name) }, null, 1));
    const line = `${b.key.padEnd(15)} lands ${String(landCount).padStart(2)} real ${String(realCount).padStart(2)} basics ${String(basicCount).padStart(2)} untapped ${String(untappedCount).padStart(2)}/${realCount} | ${ci.map((c) => `${c}${landSources[c] ?? 0}/${target[c] ?? 0}`).join(' ')} | ${ms} ms`;
    summaryLines.push(line);
    console.log(line);
  }
  fs.writeFileSync(path.join(OUT, 'summary.txt'), summaryLines.join('\n') + '\n');
  db.close();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
