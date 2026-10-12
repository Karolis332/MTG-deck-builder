// Unit C acceptance harness — builds the nine decks in the brief against the C-db copy
// with WHICHEVER engine tree is the cwd (baseline mtg-audit-wt @6791d3e or this worktree).
//   cd <engine tree> && MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/C-db \
//     npx tsx C:/Users/QuLeR/mtg-wt-classify/verify-2026-09-30/unit-C/build.ts <label> [slug]
// Counts use THIS worktree's strict classifier on both trees' decks so they are comparable.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/C-db';
process.env.MTG_DB_DIR = DB_DIR;
const ROOT = process.cwd().replace(/\\/g, '/');
const CLASSIFIER = 'C:/Users/QuLeR/mtg-wt-classify/src/lib/card-classifier.ts';
const label = process.argv[2];
const only = process.argv[3];
if (!label) { console.error('usage: build.ts <label> [slug]'); process.exit(2); }
const OUT = path.join(__dirname, 'builds', label);
fs.mkdirSync(OUT, { recursive: true });

const BUILDS: Array<{ slug: string; opts: Record<string, unknown> }> = [
  { slug: 'kess', opts: { format: 'commander', commanderName: 'Kess, Dissident Mage' } },
  { slug: 'ygra', opts: { format: 'brawl', commanderName: 'Ygra, Eater of All' } },
  { slug: 'tymna-thrasios', opts: { format: 'commander', commanderName: 'Tymna the Weaver', partnerName: 'Thrasios, Triton Hero' } },
  { slug: 'tam-arena', opts: { format: 'brawl', commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' } },
  { slug: 'tam', opts: { format: 'brawl', commanderName: 'Tam, the Possibility' } },
  { slug: 'jhoira-arena', opts: { format: 'brawl', commanderName: 'Jhoira, Weatherlight Captain', useCollection: true, userId: 1, collectionSource: 'arena' } },
  { slug: 'meren-paper', opts: { format: 'commander', commanderName: 'Meren of Clan Nel Toth', useCollection: true, userId: 1, collectionSource: 'paper' } },
  { slug: 'atraxa', opts: { format: 'commander', commanderName: "Atraxa, Praetors' Voice" } },
  { slug: 'edgar', opts: { format: 'commander', commanderName: 'Edgar Markov' } },
  { slug: 'krenko', opts: { format: 'brawl', commanderName: 'Krenko, Mob Boss' } },
];

const CATS = ['ramp', 'draw', 'tutor', 'removal', 'board_wipe', 'protection', 'win_condition'] as const;

async function main() {
  const { autoBuildDeck } = await import(pathToFileURL(`${ROOT}/src/lib/deck-builder-ai.ts`).href);
  const { classifyCard } = await import(pathToFileURL(CLASSIFIER).href);
  console.log(`engine ${ROOT}  label ${label}`);

  for (const b of BUILDS) {
    if (only && b.slug !== only) continue;
    const t0 = Date.now();
    let r: any;
    try {
      r = await autoBuildDeck({ colors: [], ...b.opts });
    } catch (e: any) {
      console.log(`=== ${b.slug} ERROR: ${e.message}`);
      fs.writeFileSync(path.join(OUT, `${b.slug}.error.txt`), String(e.stack || e.message));
      continue;
    }
    const ms = Date.now() - t0;
    const main = r.cards.filter((e: any) => e.board === 'main');
    const roleOf = new Map<string, { role: string; reason: string }>();
    for (const x of r.reasoning || []) if (!roleOf.has(x.cardName)) roleOf.set(x.cardName, x);
    const cmdOracle = r.cards.find((e: any) => e.board === 'commander')?.card?.oracle_text || undefined;

    const rows = main.map((e: any) => {
      const c = e.card;
      const isLand = (c.type_line || '').split('//')[0].includes('Land');
      const strict = isLand ? ['land'] : classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0, cmdOracle, { strict: true });
      const lenient = isLand ? ['land'] : classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0, cmdOracle);
      return {
        name: c.name, qty: e.quantity, cmc: c.cmc, type_line: c.type_line, mana_cost: c.mana_cost,
        edhrec_rank: c.edhrec_rank, role: roleOf.get(c.name)?.role || '', reason: roleOf.get(c.name)?.reason || '',
        strict, lenient, oracle: (c.oracle_text || '').replace(/\n/g, ' / '),
      };
    });
    const count = (key: 'strict' | 'lenient') => Object.fromEntries(CATS.map((cat) => [cat, rows.filter((x: any) => x[key].includes(cat)).reduce((s: number, x: any) => s + x.qty, 0)]));
    const roleCounts: Record<string, number> = {};
    for (const x of rows) roleCounts[x.role || '(none)'] = (roleCounts[x.role || '(none)'] || 0) + x.qty;
    const lands = rows.filter((x: any) => x.strict[0] === 'land').reduce((s: number, x: any) => s + x.qty, 0);
    const size = rows.reduce((s: number, x: any) => s + x.qty, 0);
    const summary = {
      slug: b.slug, opts: b.opts, ms, size, lands,
      strategy: r.strategy, themes: r.themes, tribalType: r.tribalType,
      profile: r.commanderSynergy ? { archetype: r.commanderSynergy.archetype ?? r.commanderSynergy.detectedArchetype, categories: (r.commanderSynergy.categories ?? r.commanderSynergy.triggerCategories ?? []).map((c: any) => c.category ?? c) } : null,
      strictCounts: count('strict'), lenientCounts: count('lenient'), roleCounts,
      health: r.health, deadCardsReplaced: r.deadCardsReplaced, buildReport: r.buildReport,
    };
    fs.writeFileSync(path.join(OUT, `${b.slug}.json`), JSON.stringify({ summary, cards: rows }, null, 1));
    console.log(`=== ${b.slug}: ${size} cards, ${lands} lands, ${ms} ms, strategy ${r.strategy}, profile ${JSON.stringify(summary.profile)}`);
    console.log(`    strict ${JSON.stringify(summary.strictCounts)}`);
    console.log(`    lenient ${JSON.stringify(summary.lenientCounts)}`);
    console.log(`    roles ${JSON.stringify(roleCounts)}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
