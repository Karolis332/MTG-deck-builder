// Auditor A harness — builds the five collection decks against the audit-A DB copy
// and dumps everything an expert critique needs. Read-only on the engine.
import fs from 'fs';
import path from 'path';

const DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/audit-A-db';
process.env.MTG_DB_DIR = DB_DIR;
const OUT = path.resolve(__dirname);

const BUILDS = [
  { key: 'tam', format: 'brawl', commanderName: 'Tam, the Possibility', collectionSource: 'arena' },
  { key: 'tatyova', format: 'brawl', commanderName: 'Tatyova, Benthic Druid', collectionSource: 'arena' },
  { key: 'aeve', format: 'brawl', commanderName: 'Aeve, Progenitor Ooze', collectionSource: 'arena' },
  { key: 'meren', format: 'commander', commanderName: 'Meren of Clan Nel Toth', collectionSource: 'paper' },
  { key: 'jhoira', format: 'brawl', commanderName: 'Jhoira, Weatherlight Captain', collectionSource: 'arena' },
];
const ONLY = process.argv[2];

async function main() {
  const { autoBuildDeck } = await import('../../src/lib/deck-builder-ai');
  const { realManaSources, buildManaSourceContext, countColorSources } = await import('../../src/lib/mana-sources');
  const Database = (await import('better-sqlite3')).default;
  const db = new Database(`${DB_DIR}/mtg-deck-builder.db`, { readonly: true });
  const landTables = db.prepare("select name from sqlite_master where type='table' and name like '%land%'").all() as Array<{ name: string }>;
  console.log('land tables:', landTables.map((t) => t.name).join(','));
  const landClassTable = landTables.find((t) => /class/.test(t.name))?.name;
  const landClassCols = landClassTable
    ? (db.prepare(`pragma table_info(${landClassTable})`).all() as Array<{ name: string }>).map((c) => c.name)
    : [];
  console.log('land class table:', landClassTable, landClassCols.join(','));

  for (const b of BUILDS) {
    if (ONLY && b.key !== ONLY) continue;
    const t0 = Date.now();
    let r;
    try {
      r = await autoBuildDeck({
        format: b.format, colors: [], commanderName: b.commanderName,
        useCollection: true, userId: 1, collectionSource: b.collectionSource,
      });
    } catch (e: any) {
      console.log(`\n=== ${b.key} ERROR: ${e.message}\n${e.stack}`);
      continue;
    }
    const elapsed = Date.now() - t0;
    const cmdr = r.cards.find((e) => e.card.name === b.commanderName) ?? r.cards.find((e) => (e.card.name || '').startsWith(b.commanderName.split(' //')[0]));
    const ci: string[] = cmdr ? JSON.parse(cmdr.card.color_identity || '[]') : [];
    const main = r.cards.filter((e) => e.board === 'main');
    const lands = main.filter((e) => (e.card.type_line || '').includes('Land'));
    const nonLands = main.filter((e) => !(e.card.type_line || '').includes('Land'));
    const landCount = lands.reduce((s, e) => s + e.quantity, 0);
    const basicCount = lands.filter((e) => /^(Plains|Island|Swamp|Mountain|Forest|Wastes)$|Snow-Covered/.test(e.card.name)).reduce((s, e) => s + e.quantity, 0);
    const ctx = buildManaSourceContext(ci, lands.map((e) => ({ card: e.card, quantity: e.quantity, board: e.board })));
    const sourceCards = main.filter((e) => realManaSources(e.card, ctx).reliable);
    const sources = countColorSources(sourceCards.map((e) => ({ card: e.card, quantity: e.quantity, board: e.board })), ctx);
    const roleOf = new Map((r.reasoning || []).map((x) => [x.cardName, x]));

    // pip demand (nonland, main, excluding commander)
    const pips: Record<string, number> = {};
    const pipCards: Record<string, number> = {};
    for (const e of nonLands) {
      const cost = e.card.mana_cost || '';
      const seen = new Set<string>();
      for (const m of cost.matchAll(/\{([WUBRG])(?:\/[WUBRGP])?\}|\{[WUBRG]\/([WUBRG])\}/g)) {
        const c = m[1] || m[2];
        pips[c] = (pips[c] || 0) + e.quantity;
        seen.add(c);
      }
      for (const c of seen) pipCards[c] = (pipCards[c] || 0) + e.quantity;
    }

    // curve
    const curve: Record<string, number> = {};
    for (const e of nonLands) {
      if (e === cmdr) continue;
      const k = String(Math.min(7, Math.floor(e.card.cmc || 0)));
      curve[k] = (curve[k] || 0) + e.quantity;
    }

    // owned lands on the bench (user 1, same source, CI subset, nonbasic)
    const owned = db.prepare(
      `select c.name, c.type_line, c.oracle_text, c.color_identity, c.produced_mana, c.edhrec_rank, c.price_usd, sum(col.quantity) qty
       from collection col join cards c on c.id = col.card_id
       where col.user_id = 1 and col.source = ? and c.type_line like '%Land%' group by c.name`,
    ).all(b.collectionSource) as Array<any>;
    const inDeck = new Set(main.map((e) => e.card.name));
    const classOf = (name: string) => {
      if (!landClassTable) return null;
      const nameCol = landClassCols.includes('card_name') ? 'card_name' : landClassCols.includes('name') ? 'name' : null;
      if (!nameCol) return null;
      return db.prepare(`select * from ${landClassTable} where ${nameCol} = ?`).get(name);
    };
    const benchLands = owned
      .filter((l) => {
        const lci: string[] = JSON.parse(l.color_identity || '[]');
        return lci.every((c) => ci.includes(c)) && !/^Basic Land/.test(l.type_line) && !inDeck.has(l.name);
      })
      .map((l) => ({ name: l.name, ci: JSON.parse(l.color_identity || '[]'), produced: l.produced_mana, rank: l.edhrec_rank, price: l.price_usd, qty: l.qty, cls: classOf(l.name), oracle: (l.oracle_text || '').slice(0, 220) }))
      .sort((a, b2) => (a.rank ?? 99999) - (b2.rank ?? 99999));

    const rows = main.map((e) => ({
      qty: e.quantity, name: e.card.name, cmc: e.card.cmc, cost: e.card.mana_cost, type: e.card.type_line,
      ci: JSON.parse(e.card.color_identity || '[]'), rank: e.card.edhrec_rank, price: e.card.price_usd,
      role: roleOf.get(e.card.name)?.role, reason: roleOf.get(e.card.name)?.reason,
      cls: (e.card.type_line || '').includes('Land') ? classOf(e.card.name) : undefined,
      oracle: e.card.oracle_text,
    }));
    const roleCounts: Record<string, number> = {};
    for (const x of rows) roleCounts[x.role || '(none)'] = (roleCounts[x.role || '(none)'] || 0) + x.qty;

    const summary = {
      key: b.key, commander: b.commanderName, format: b.format, source: b.collectionSource, elapsedMs: elapsed,
      ci, strategy: r.strategy, themes: r.themes, tribalType: r.tribalType,
      size: main.reduce((s, e) => s + e.quantity, 0), landCount, basicCount, nonbasicCount: landCount - basicCount,
      sourcesByColor: sources, auditorSources: r.health?.sourcesByColor, pips, pipCards, curve, roleCounts,
      health: r.health, price: r.price, bracket: r.bracket, deadCardsReplaced: r.deadCardsReplaced,
      buildReport: r.buildReport, synergy: r.commanderSynergy,
    };
    fs.writeFileSync(path.join(OUT, `${b.key}.json`), JSON.stringify({ summary, cards: rows, benchLands }, null, 1));

    // compact stdout
    console.log(`\n=== ${b.key}: ${b.commanderName} (${b.format}/${b.collectionSource}) ${elapsed}ms ===`);
    console.log(`strategy ${r.strategy} themes ${JSON.stringify(r.themes)} tribal ${r.tribalType}`);
    console.log(`size ${summary.size} lands ${landCount} (basic ${basicCount}) sources ${JSON.stringify(sources)} auditor ${JSON.stringify(r.health?.sourcesByColor)}`);
    console.log(`pips ${JSON.stringify(pips)} pipCards ${JSON.stringify(pipCards)} curve ${JSON.stringify(curve)}`);
    console.log(`roles ${JSON.stringify(roleCounts)}`);
    console.log(`health: ${JSON.stringify({ ...r.health, sourcesByColor: undefined })}`);
    console.log(`dead: ${JSON.stringify(r.deadCardsReplaced)}`);
    console.log(`bracket: ${JSON.stringify(r.bracket)}`);
    console.log('--- LANDS');
    for (const x of rows.filter((x) => (x.type || '').includes('Land')).sort((a, b2) => (a.rank ?? 99999) - (b2.rank ?? 99999))) console.log(`${x.qty} ${x.name} | ${x.ci.join('')} | ${x.role || ''}`);
    console.log('--- NONLANDS (by cmc)');
    for (const x of rows.filter((x) => !(x.type || '').includes('Land')).sort((a, b2) => (a.cmc || 0) - (b2.cmc || 0))) console.log(`${x.qty} ${x.name} | ${x.cost} | ${(x.type || '').replace('Legendary ', 'L.').slice(0, 28)} | ${x.role || ''}`);
    console.log(`--- BENCH LANDS (owned ${b.collectionSource}, CI-legal, nonbasic, not in deck): ${benchLands.length}`);
    for (const l of benchLands.slice(0, 80)) console.log(`${l.name} | ${l.ci.join('')} | rank ${l.rank} | ${l.cls ? JSON.stringify(l.cls) : ''}`);
  }
  db.close();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
