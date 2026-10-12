export {};
process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/p2l-db';
async function main() {
  const { scoreLandsForDeck } = await import('../../src/lib/land-intelligence');
  const m = new Map(scoreLandsForDeck({ colors: ['B', 'G'], format: 'brawl', strategy: 'aristocrats' }).map((r) => [r.card.name, r]));
  for (const n of ['Hostile Hostel // Creeping Inn', 'Westvale Abbey // Ormendahl, Profane Prince', 'Zanarkand, Ancient Metropolis // Lasting Fayth', 'Forsaken City', 'Castle Locthwain', 'Vault of Whispers']) {
    const r = m.get(n); console.log(n, '|', r ? `tier ${r.tier} score ${r.score} clears ${r.clearsBar} untapped ${r.untappedCredit} produces ${r.producesColors.join('')} [${r.reasons.join('; ')}]` : 'absent');
  }
  const j = JSON.parse(require('fs').readFileSync('verify-2026-09-30/p2l/out-tip/ygra.json', 'utf8'));
  console.log('Ygra spells with Pact/Consultation:', j.spells.filter((s: any) => /Tainted Pact|Demonic Consultation/.test(s.name)).map((s: any) => s.name + ' ' + s.role));
}
main();
