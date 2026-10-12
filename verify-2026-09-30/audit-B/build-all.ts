// Auditor B — build the seven no-collection decks at a21f2ff against the audit-B DB copy.
// Usage: MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/audit-B-db npx tsx verify-2026-09-30/audit-B/build-all.ts [slug]
import fs from 'fs';
import path from 'path';

const DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/audit-B-db';
process.env.MTG_DB_DIR = DB_DIR;
const OUT = path.join(__dirname, 'builds');
fs.mkdirSync(OUT, { recursive: true });

const BUILDS: Array<{ slug: string; colors: string[]; opts: Record<string, unknown> }> = [
  { slug: 'atraxa', colors: ['W', 'U', 'B', 'G'], opts: { format: 'commander', commanderName: "Atraxa, Praetors' Voice" } },
  { slug: 'edgar', colors: ['W', 'B', 'R'], opts: { format: 'commander', commanderName: 'Edgar Markov' } },
  { slug: 'niv', colors: ['W', 'U', 'B', 'R', 'G'], opts: { format: 'commander', commanderName: 'Niv-Mizzet Reborn', maxDeckPrice: 150, bracket: 2 } },
  { slug: 'krenko', colors: ['R'], opts: { format: 'brawl', commanderName: 'Krenko, Mob Boss' } },
  { slug: 'kess', colors: ['U', 'B', 'R'], opts: { format: 'commander', commanderName: 'Kess, Dissident Mage' } },
  { slug: 'ygra', colors: ['B', 'G'], opts: { format: 'brawl', commanderName: 'Ygra, Eater of All' } },
  { slug: 'tymna-thrasios', colors: ['W', 'U', 'B', 'G'], opts: { format: 'commander', commanderName: 'Tymna the Weaver', partnerName: 'Thrasios, Triton Hero' } },
];

async function main() {
  const { autoBuildDeck } = await import('../../src/lib/deck-builder-ai');
  const { realManaSources, buildManaSourceContext, countColorSources } = await import('../../src/lib/mana-sources');
  const only = process.argv[2];

  for (const b of BUILDS) {
    if (only && b.slug !== only) continue;
    const t0 = Date.now();
    let r: Awaited<ReturnType<typeof autoBuildDeck>>;
    try {
      r = await autoBuildDeck({ colors: [], ...(b.opts as any) });
    } catch (e: any) {
      console.log(`=== ${b.slug} ERROR: ${e.message}`);
      fs.writeFileSync(path.join(OUT, `${b.slug}.error.txt`), String(e.stack || e.message));
      continue;
    }
    const ms = Date.now() - t0;
    const main = r.cards.filter((e) => e.board === 'main');
    const roleOf = new Map<string, string>();
    for (const x of r.reasoning || []) if (!roleOf.has(x.cardName)) roleOf.set(x.cardName, x.role);
    const reasonOf = new Map<string, string>();
    for (const x of r.reasoning || []) if (!reasonOf.has(x.cardName)) reasonOf.set(x.cardName, x.reason);

    const lands = main.filter((e) => (e.card.type_line || '').includes('Land'));
    const ctx = buildManaSourceContext(b.colors, lands.map((e) => ({ card: e.card, quantity: e.quantity, board: e.board })));
    const sourceCards = main.filter((e) => realManaSources(e.card, ctx).reliable);
    const sourcesByColor = countColorSources(sourceCards.map((e) => ({ card: e.card, quantity: e.quantity, board: e.board })), ctx);

    const rows = main.map((e) => ({
      name: e.card.name,
      qty: e.quantity,
      mana_cost: e.card.mana_cost,
      cmc: e.card.cmc,
      type_line: e.card.type_line,
      ci: e.card.color_identity,
      price: e.card.price_usd,
      edhrec_rank: e.card.edhrec_rank,
      rarity: e.card.rarity,
      role: roleOf.get(e.card.name) || '',
      reason: reasonOf.get(e.card.name) || '',
      oracle: (e.card.oracle_text || '').replace(/\n/g, ' / '),
    }));
    const roleCounts: Record<string, number> = {};
    for (const x of rows) roleCounts[x.role || '(none)'] = (roleCounts[x.role || '(none)'] || 0) + x.qty;
    const size = rows.reduce((s, x) => s + x.qty, 0);
    const landCount = lands.reduce((s, e) => s + e.quantity, 0);
    const nonland = rows.filter((x) => !(x.type_line || '').includes('Land'));
    const avgCmc = nonland.reduce((s, x) => s + (x.cmc || 0) * x.qty, 0) / Math.max(1, nonland.reduce((s, x) => s + x.qty, 0));
    // pip demand per colour over nonland mana costs
    const pips: Record<string, number> = {};
    for (const x of nonland) for (const m of (x.mana_cost || '').matchAll(/\{([WUBRG])(?:\/[WUBRGP])?\}|\{[WUBRG]\/([WUBRG])\}/g)) { const c = m[1] || m[2]; pips[c] = (pips[c] || 0) + x.qty; }
    const summary = {
      slug: b.slug, opts: b.opts, ms, size, landCount, avgCmc: +avgCmc.toFixed(2), pips,
      strategy: r.strategy, themes: r.themes, tribalType: r.tribalType,
      synergy: r.commanderSynergy ? { archetype: (r.commanderSynergy as any).archetype, categories: (r.commanderSynergy as any).categories?.map((c: any) => c.category ?? c), keyMechanics: (r.commanderSynergy as any).keyMechanics } : null,
      realSourcesByColor: sourcesByColor,
      health: r.health, price: r.price, bracket: r.bracket, deadCardsReplaced: r.deadCardsReplaced, roleCounts,
      buildReport: r.buildReport,
    };
    fs.writeFileSync(path.join(OUT, `${b.slug}.json`), JSON.stringify({ summary, cards: rows }, null, 1));
    const txt = [
      `# ${b.slug} — ${JSON.stringify(b.opts)}  (${ms} ms)`,
      `size ${size}  lands ${landCount}  avgCmc(nonland) ${avgCmc.toFixed(2)}  pips ${JSON.stringify(pips)}`,
      `strategy ${r.strategy}  themes ${JSON.stringify(r.themes)}  tribal ${r.tribalType}`,
      `realSources ${JSON.stringify(sourcesByColor)}  health.sources ${JSON.stringify(r.health?.sourcesByColor)}`,
      `roles ${JSON.stringify(roleCounts)}`,
      r.price ? `price total $${r.price.total.toFixed(2)} overBudget ${r.price.overBudget} replaced ${r.price.replacedForBudget.length}` : '',
      r.bracket ? `bracket target ${r.bracket.target} -> ${r.bracket.result} swapped ${r.bracket.swapped.length} reasons ${JSON.stringify(r.bracket.reasons)}` : '',
      r.deadCardsReplaced?.length ? `deadCardsReplaced ${JSON.stringify(r.deadCardsReplaced)}` : '',
      '',
      ...rows
        .sort((a, c) => ((a.type_line || '').includes('Land') ? 1 : 0) - ((c.type_line || '').includes('Land') ? 1 : 0) || (a.cmc || 0) - (c.cmc || 0) || a.name.localeCompare(c.name))
        .map((x) => `${x.qty} ${x.name} | ${x.mana_cost || ''} | ${x.type_line} | $${x.price ?? '?'} | edh ${x.edhrec_rank ?? '?'} | ${x.role} | ${x.oracle.slice(0, 140)}`),
    ].join('\n');
    fs.writeFileSync(path.join(OUT, `${b.slug}.txt`), txt);
    console.log(`=== ${b.slug}: ${size} cards, ${landCount} lands, ${ms} ms, strategy ${r.strategy}, roles ${JSON.stringify(roleCounts)}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
