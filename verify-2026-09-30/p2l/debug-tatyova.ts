export {};
process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/p2l-db';
async function main() {
  const { autoBuildDeck } = await import('../../src/lib/deck-builder-ai');
  const r: any = await autoBuildDeck({ colors: [], format: 'brawl', commanderName: 'Tatyova, Benthic Druid', useCollection: true, userId: 1, collectionSource: 'arena', captureComponents: true });
  const main = r.cards.filter((e: any) => e.board === 'main');
  const isLand = (t: string) => /\bLand\b/.test((t || '').split('//')[0]);
  console.log('size', main.reduce((s: number, e: any) => s + e.quantity, 0), 'lands', main.filter((e: any) => isLand(e.card.type_line)).reduce((s: number, e: any) => s + e.quantity, 0));
  for (const e of main) if ((e.card.type_line || '').includes('//') && /Land/.test(e.card.type_line)) console.log('DFC', e.card.name, '|', e.card.layout, '|', e.card.type_line);
  for (const x of r.reasoning) if (/refill|mdfc-cap/.test(x.role)) console.log(x.role, x.cardName, x.reason);
  console.log('health', JSON.stringify(r.health?.landCount ?? r.health?.lands ?? Object.keys(r.health || {})));
}
main();
