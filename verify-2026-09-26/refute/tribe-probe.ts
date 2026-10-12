import { detectTribalTheme } from "@/lib/deck-builder-ai";
import { getDb } from "@/lib/db";
const db = getDb();
const names = ["Grist, the Hunger Tide", "Adeline, Resplendent Cathar", "Ghired, Conclave Exile", "Sai, Master Thopterist", "Anim Pakal, Thousandth Moon", "Darien, King of Kjeldor", "Tivadar of Thorn", "Chatterfang, Squirrel General", "Jinnie Fay, Jetmir\u0027s Second", "Rhys the Redeemed", "Kykar, Wind\u0027s Fury", "Talrand, Sky Summoner", "Ezuri, Claw of Progress", "Korvold, Fae-Cursed King", "Prosper, Tome-Bound", "Old Gnawbone", "Esika\u0027s Chariot"];
for (const n of names) console.log(n, "->", detectTribalTheme(db, n));
process.exit(0);
