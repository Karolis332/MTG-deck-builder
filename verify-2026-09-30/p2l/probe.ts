export {};
process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/p2l-db';
async function main() {
const { scoreLandsForDeck } = await import('../../src/lib/land-intelligence');
const m = new Map(scoreLandsForDeck({ colors: ['R'], format: 'commander' }).map((r) => [r.card.name, r]));
console.log('mono-R: Rhystic Cave', m.has('Rhystic Cave'), '| Nykthos', m.has('Nykthos, Shrine to Nyx'), '| Barbarian Ring', m.has('Barbarian Ring'), '| Mutavault', m.has('Mutavault'));
const w = new Map(scoreLandsForDeck({ colors: ['W', 'U', 'B', 'G'], format: 'commander' }).map((r) => [r.card.name, r]));
for (const n of ['Glimmervoid', 'Thran Quarry', 'Rhystic Cave', 'Archaeological Dig', 'Undiscovered Paradise', 'Meteor Crater']) console.log('WUBG', n, w.has(n) ? `tier ${w.get(n)!.tier} clears ${w.get(n)!.clearsBar} score ${w.get(n)!.score}` : 'absent');
}
main();
