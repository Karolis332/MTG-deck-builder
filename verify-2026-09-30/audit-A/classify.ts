// What does classifyCard say about the suspicious role fills?
process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/audit-A-db';
import Database from 'better-sqlite3';
async function main() {
  const { classifyCard, getPrimaryCategory } = await import('../../src/lib/card-classifier');
  const db = new Database(`${process.env.MTG_DB_DIR}/mtg-deck-builder.db`, { readonly: true });
  const names = ["Night of the Sweets' Revenge", 'Toski, Bearer of Secrets', 'Transmutation Font', 'Perilous Vault', 'Aetherize', 'Tatyova, Benthic Druid', 'Chronicle of Victory', 'Mirkwood Bats', 'Idol of Oblivion', 'Firdoch Core', 'Basking Broodscale', 'Cool but Rude', "Mizzix's Mastery", 'Magic Pot', "Zuko's Exile", 'Elvish Archdruid', 'Dungeon Map', 'Starting Column', 'Glacier Godmaw', 'Earthshaker Dreadmaw', 'The Unagi of Kyoshi Island', 'Omnath, Locus of All', 'Rakdos Charm', 'Golgari Charm', "Ashling's Command", 'River\'s Rebuke', 'Ajani Unrelenting', 'Orcrist, Goblin-cleaver', 'Celestial Reunion', 'Kutzil, Malamet Exemplar', 'Michelangelo, Weirdness to 11', 'Ophiomancer', 'Bloodghast', 'Jadar, Ghoulcaller of Nephalia', 'Grave Titan', 'Craterhoof Behemoth', 'Overrun', 'Return of the Wildspeaker', 'Kami of Whispered Hopes', 'Dina, Essence Brewer', 'Deadly Dispute', 'Ruric Thar, Biomagus', 'Orysa, Tide Choreographer', "Sokka's Haiku", 'Heated Argument', "Agatha's Soul Cauldron", 'Dread Presence', 'Force of Vigor', 'Zuko\'s Exile'];
  for (const n of names) {
    const c = db.prepare('select name, oracle_text, type_line, cmc from cards where name = ? limit 1').get(n) as any;
    if (!c) { console.log(`${n}: not found`); continue; }
    const cats = classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0);
    console.log(`${n} [${c.cmc} ${c.type_line.slice(0, 30)}] -> ${cats.join(',')} (primary ${getPrimaryCategory(cats)})`);
  }
  db.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
