process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/audit-B-db';
async function main() {
  const { analyzeCommander, mergeProfiles } = await import('../../src/lib/commander-synergy');
  const { getDb } = await import('../../src/lib/db');
  const db = getDb();
  const get = (n: string) => db.prepare('select name, oracle_text, type_line, color_identity, mana_cost from cards where name=? limit 1').get(n) as any;
  const prof = (n: string, colors?: string[]) => { const c = get(n); return analyzeCommander(c.oracle_text || '', c.type_line, colors || JSON.parse(c.color_identity || '[]'), c.mana_cost, { superfriends: true, tribalPayoff: true }); };
  for (const n of ['Kess, Dissident Mage', 'Ygra, Eater of All', 'Tymna the Weaver', 'Thrasios, Triton Hero', "Atraxa, Praetors' Voice", 'Edgar Markov', 'Niv-Mizzet Reborn', 'Krenko, Mob Boss']) {
    const p = prof(n);
    console.log(n, '=>', p ? JSON.stringify({ arch: p.detectedArchetype, triggers: p.triggerCategories, mins: p.synergyMinimums, drawRed: p.drawReduction, remRed: p.removalReduction }) : 'null');
  }
  const a = prof('Tymna the Weaver', ['W','U','B','G']); const b = prof('Thrasios, Triton Hero', ['W','U','B','G']);
  if (a && b) { const m = mergeProfiles(a, b); console.log('MERGED =>', JSON.stringify({ arch: m.detectedArchetype, triggers: m.triggerCategories, mins: m.synergyMinimums })); }
  console.log('Kess oracle:', get('Kess, Dissident Mage').oracle_text);
  console.log('Ygra oracle:', get('Ygra, Eater of All').oracle_text);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
