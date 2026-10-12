import { scoreLandsForDeck } from "@/lib/land-intelligence";
import * as old from "./old-land-intelligence";
const WATCH = ["Three Tree City", "Nykthos, Shrine to Nyx", "Ancient Tomb", "Rocky Tar Pit", "Mountain Valley", "Castle Embereth", "Ba Sing Se", "Castle Garenbrig", "Khalni Ambush // Khalni Territory", "Valakut Awakening // Valakut Stoneforge", "Reliquary Tower", "Cavern of Souls", "Gaea\u0027s Cradle", "Bad River", "Flood Plain", "Sokenzan, Crucible of Defiance", "Arena of Glory", "Den of the Bugbear", "Urza\u0027s Saga", "Command Tower", "Rogue\u0027s Passage", "Cabaretti Courtyard"];
const nm = (l: any) => l.card?.name ?? l.name;
for (const [tag, colors, tribes] of [["mono-R goblin", ["R"], ["goblin"]], ["mono-G ooze", ["G"], ["ooze"]], ["mono-U none", ["U"], undefined], ["RWB vampire", ["R", "W", "B"], ["vampire"]], ["UG none", ["U", "G"], undefined]] as const) {
  const o = { colors: [...colors], format: "commander", tribalTypes: tribes ? [...tribes] : undefined } as any;
  const n = scoreLandsForDeck(o).filter((l: any) => l.score >= 20); const p = old.scoreLandsForDeck(o).filter((l: any) => l.score >= 20);
  const ns = new Set(n.map(nm)), ps = new Set(p.map(nm));
  const lost = [...ps].filter((x) => !ns.has(x)), gained = [...ns].filter((x) => !ps.has(x));
  console.log(`## ${tag}: old>=20 ${ps.size} new>=20 ${ns.size}; lost ${lost.length}: ${lost.slice(0, 40).join("; ")}`);
  console.log(`   gained ${gained.length}: ${gained.slice(0, 15).join("; ")}`);
  console.log(`   watch new: ${WATCH.filter((w) => ns.has(w)).join("; ")}`);
  console.log(`   watch old-only: ${WATCH.filter((w) => ps.has(w) && !ns.has(w)).join("; ")}`);
}
process.exit(0);
