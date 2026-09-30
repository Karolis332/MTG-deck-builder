// U6 acceptance: run the /optimize engine directly against Tam's final.txt
// (the operator's real Arena list) to confirm the superfriends opt-in
// doesn't cut walkers/Ways and proposes at least one nonland add.
import fs from 'fs';
import { optimizeDeck } from '../services/build-api/optimize';

const text = fs.readFileSync(
  'C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-30/arena-tam/final.txt', 'utf8'
);

const result = optimizeDeck({ text, format: 'brawl', commanderName: 'Tam, the Possibility' }) as {
  cuts: Array<{ name: string; type_line?: string }>;
  adds: Array<{ name: string; type_line?: string }>;
};

const isWalkerOrWay = (name: string, type_line?: string) =>
  /\bPlaneswalker\b/.test(type_line || '') || /^Way of /.test(name);

const badCuts = result.cuts.filter((c) => isWalkerOrWay(c.name, c.type_line));
const nonlandAdds = result.adds.filter((a) => !/\bLand\b/.test(a.type_line || ''));

console.log('cuts:', result.cuts.length, '| walkers/Ways among cuts:', badCuts.map((c) => c.name));
console.log('adds:', result.adds.length, '| nonland adds:', nonlandAdds.length, nonlandAdds.slice(0, 5).map((a) => a.name));
console.log(badCuts.length === 0 ? 'PASS: 0 walkers/Ways cut' : 'FAIL: walkers/Ways were cut');
console.log(nonlandAdds.length >= 1 ? 'PASS: >=1 nonland add' : 'FAIL: no nonland add');
