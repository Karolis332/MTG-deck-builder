// Re-run each build with captureComponents and dump the scored pool so a miss can be
// traced to the score that ranked it below the pick.
import fs from 'fs';
import path from 'path';

const DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/audit-A-db';
process.env.MTG_DB_DIR = DB_DIR;
const OUT = path.resolve(__dirname);
const BUILDS: Record<string, any> = {
  tam: { format: 'brawl', commanderName: 'Tam, the Possibility', collectionSource: 'arena' },
  tatyova: { format: 'brawl', commanderName: 'Tatyova, Benthic Druid', collectionSource: 'arena' },
  aeve: { format: 'brawl', commanderName: 'Aeve, Progenitor Ooze', collectionSource: 'arena' },
  meren: { format: 'commander', commanderName: 'Meren of Clan Nel Toth', collectionSource: 'paper' },
  jhoira: { format: 'brawl', commanderName: 'Jhoira, Weatherlight Captain', collectionSource: 'arena' },
};

async function main() {
  const { autoBuildDeck } = await import('../../src/lib/deck-builder-ai');
  for (const key of process.argv.slice(2)) {
    const b = BUILDS[key];
    const r = await autoBuildDeck({ format: b.format, colors: [], commanderName: b.commanderName, useCollection: true, userId: 1, collectionSource: b.collectionSource, captureComponents: true });
    const picked = new Set(r.cards.map((c) => c.card.name));
    const pool = (r.scoredPool || []).map((p) => ({ ...p, picked: picked.has(p.name) }));
    pool.sort((a, b2) => b2.score - a.score);
    fs.writeFileSync(path.join(OUT, `${key}.pool.json`), JSON.stringify({ reasoning: r.reasoning, buildReport: r.buildReport, pool }, null, 1));
    const sameAsBuild = JSON.stringify([...picked].sort()) === JSON.stringify(JSON.parse(fs.readFileSync(path.join(OUT, `${key}.json`), 'utf8')).cards.map((c: any) => c.name).sort());
    console.log(`${key}: pool ${pool.length}, picked ${picked.size}, deterministic vs first build: ${sameAsBuild}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
