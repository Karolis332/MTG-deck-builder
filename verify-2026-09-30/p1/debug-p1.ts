// P1 debug: reasoning trail for the upgrade pass, Ways, and specific bench/pick pairs.
process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/P1-db';
async function main() {
  const { autoBuildDeck } = await import('../../src/lib/deck-builder-ai');
  const { classifyCard, getPrimaryCategory } = await import('../../src/lib/card-classifier');
  const { getDb } = await import('../../src/lib/db');
  const db = getDb();
  const builds: Array<[string, any, string[]]> = [
    ['tam-arena', { format: 'brawl', commanderName: 'Tam, the Possibility', useCollection: true, userId: 1, collectionSource: 'arena' }, []],
    ['aeve-arena', { format: 'brawl', commanderName: 'Aeve, Progenitor Ooze', useCollection: true, userId: 1, collectionSource: 'arena' }, ['Basking Broodscale', 'Fuel Tank Feaster']],
    ['edgar', { format: 'commander', commanderName: 'Edgar Markov' }, ['Markov Baron', 'Anger']],
  ];
  for (const [label, opts, pairs] of builds) {
    const r = await autoBuildDeck({ colors: [], ...opts, captureComponents: true });
    const cmdr = db.prepare('SELECT oracle_text FROM cards WHERE name = ? LIMIT 1').get(opts.commanderName) as any;
    const cOpts = r.strategy === 'superfriends' ? { superfriends: true } : undefined;
    const ups = (r.reasoning || []).filter((x) => x.role === 'upgrade');
    const reps = (r.reasoning || []).filter((x) => x.role === 'repair');
    console.log(`\n=== ${label}: upgrades ${ups.length}, repairs ${reps.length}, dead ${JSON.stringify(r.deadCardsReplaced || []).slice(0, 300)}`);
    for (const u of ups.slice(0, 12)) console.log('  ' + u.reason);
    for (const x of reps.slice(0, 8)) console.log('  repair: ' + x.reason);
    const ways = r.cards.filter((e) => e.board === 'main' && /^Way of the /.test(e.card.name)).map((e) => e.card.name);
    if (ways.length) console.log('  Ways: ' + ways.join(', '));
    const anger = (r.reasoning || []).find((x) => x.cardName === 'Anger');
    if (anger) console.log('  Anger reasoning: ' + JSON.stringify(anger));
    if (label === 'aeve-arena') {
      const f = r.cards.find((e) => e.card.name === 'Fuel Tank Feaster');
      console.log('  Feaster regex test: ' + new RegExp('\\b' + r.tribalType + '\\b', 'i').test(`${f?.card.type_line || ''} ${f?.card.oracle_text || ''}`) + ' tribalType=' + r.tribalType);
    }
    for (const name of pairs) {
      const row = db.prepare('SELECT name, type_line, oracle_text, cmc FROM cards WHERE name = ? LIMIT 1').get(name) as any;
      const cats = classifyCard(row.name, row.oracle_text || '', row.type_line || '', row.cmc || 0, cmdr?.oracle_text, cOpts);
      const pool = r.scoredPool?.find((p) => p.name === name);
      const inDeck = r.cards.some((e) => e.board === 'main' && e.card.name === name);
      console.log(`  ${name}: primary ${getPrimaryCategory(cats)} cats ${cats.join('/')} score ${pool?.score?.toFixed(0)} inDeck ${inDeck} type ${row.type_line}`);
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
