export {};
process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/p2l-db';
const OPTS: Record<string, any> = {
  atraxa: { format: 'commander', commanderName: "Atraxa, Praetors' Voice" },
  tymna: { format: 'commander', commanderName: 'Tymna the Weaver', partnerName: 'Thrasios, Triton Hero' },
  ygra: { format: 'brawl', commanderName: 'Ygra, Eater of All' },
  aeve: { format: 'brawl', commanderName: 'Aeve, Progenitor Ooze', useCollection: true, userId: 1, collectionSource: 'arena' },
  niv: { format: 'commander', commanderName: 'Niv-Mizzet Reborn', maxDeckPrice: 150, bracket: 2 },
};
async function main() {
  const { autoBuildDeck } = await import('../../src/lib/deck-builder-ai');
  const r: any = await autoBuildDeck({ colors: [], ...OPTS[process.argv[2]], captureComponents: true });
  const main = r.cards.filter((e: any) => e.board === 'main');
  const isLand = (t: string) => /\bLand\b/.test((t || '').split('//')[0]);
  console.log('size', main.reduce((s: number, e: any) => s + e.quantity, 0), 'lands', main.filter((e: any) => isLand(e.card.type_line)).reduce((s: number, e: any) => s + e.quantity, 0), 'entries', main.length);
  for (const x of r.reasoning) if (/refill|mdfc-cap|repair/.test(x.role)) console.log(x.role, '|', x.cardName, '|', x.reason);
  for (const e of main) if (/Hostel|Westvale|Zanarkand|Growing Rites/.test(e.card.name)) console.log('CARD', e.card.name, '|', e.card.layout, '|', e.card.type_line, '| pool score', (r.scoredPool||[]).find((p: any) => p.name === e.card.name)?.score);
  console.log('dead', JSON.stringify(r.deadCardsReplaced ?? r.replacedAsDead ?? null));
  console.log('budget', JSON.stringify(r.price?.replaced ?? r.replacedForBudget ?? null));
  console.log('bracket', JSON.stringify(r.bracket ?? null).slice(0, 300));
}
main();
