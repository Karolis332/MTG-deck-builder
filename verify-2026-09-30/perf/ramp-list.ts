// Ramp census: per build, main-board nonland cards that classifyCard tags 'ramp',
// with the builder's reasoning role for each; plus the reasoning-role==='ramp' count
// (what the U9a acceptance printed). Usage: MTG_DB_DIR=... WT=<tree> npx tsx ramp-list.ts
import path from 'path';
import { pathToFileURL } from 'url';

const WT = process.env.WT!;
const imp = (p: string) => import(pathToFileURL(path.join(WT, p)).href);

const BUILDS: Array<[string, Record<string, unknown>]> = [
  ['Tatyova coll', { format: 'brawl', colors: [], commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['Tam coll', { format: 'brawl', colors: [], commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' }],
  ['Edgar', { format: 'commander', colors: [], commanderName: 'Edgar Markov' }],
];

async function main() {
  const { autoBuildDeck } = await imp('src/lib/deck-builder-ai.ts');
  const { classifyCard } = await imp('src/lib/card-classifier.ts');
  const only = process.argv[2];
  for (const [label, opts] of BUILDS) {
    if (only && !label.startsWith(only)) continue;
    const t0 = Date.now();
    const r = await autoBuildDeck(opts);
    const main = r.cards.filter((e: any) => e.board === 'main' && !(e.card.type_line || '').includes('Land'));
    const roleOf = new Map<string, string>();
    for (const x of r.reasoning || []) if (!roleOf.has(x.cardName)) roleOf.set(x.cardName, x.role);
    const cmdOracle = r.cards.find((e: any) => e.board === 'commander')?.card.oracle_text || undefined;
    const ramp = main.filter((e: any) => classifyCard(e.card.name, e.card.oracle_text || '', e.card.type_line || '', e.card.cmc || 0, cmdOracle).includes('ramp'));
    const roleRamp = main.filter((e: any) => (r.reasoning || []).some((x: any) => x.cardName === e.card.name && x.role === 'ramp'));
    console.log(`\n=== ${label} (${((Date.now() - t0) / 1000).toFixed(0)}s) nonland ${main.length} | classifyCard ramp ${ramp.length} | reasoning role==='ramp' ${roleRamp.length}`);
    console.log(ramp.map((e: any) => `${e.card.name} [${roleOf.get(e.card.name) ?? '-'}]`).join('; '));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
