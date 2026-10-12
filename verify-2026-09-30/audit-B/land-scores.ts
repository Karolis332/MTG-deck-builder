// Auditor B — why does the land scorer rank Temple of the Dragon Queen / Three Tree City / Grand Coliseum
// above painlands, triomes, Mana Confluence, Reflecting Pool? Dump the scored list for each built deck.
import fs from 'fs';
import path from 'path';
process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/audit-B-db';

const WATCH = [
  'Temple of the Dragon Queen', 'Three Tree City', 'Grand Coliseum', 'Starting Town', 'Murmuring Bosk', 'Brokers Hideout',
  'Tranquil Landscape', 'Mana Confluence', 'Reflecting Pool', 'Sulfurous Springs', 'Underground River', 'Caves of Koilos',
  'Adarkar Wastes', 'Yavimaya Coast', 'Brushland', 'Llanowar Wastes', "Xander's Lounge", 'Zagoth Triome', 'Indatha Triome',
  'Morphic Pool', 'Vault of Champions', 'Undercity Sewers', 'Raucous Theater', 'Riverglide Pathway // Lavaglide Pathway',
  'Clearwater Pathway // Murkwater Pathway', 'Hengegate Pathway // Mistgate Pathway', 'Path of Ancestry', 'Karn\'s Bastion',
  'Otawara, Soaring City', 'Takenuma, Abandoned Mire', 'Fiery Islet', 'Glacial Fortress', 'Drowned Catacomb', 'Sulfur Falls',
  'Cavern of Souls', 'Ancient Tomb', 'Nomad Outpost', 'Savai Triome', 'Silent Clearing', 'Concealed Courtyard', 'Spectator Seating',
  'Luxury Suite', 'Training Center', 'Thriving Isle', 'Vivid Creek', 'Shivan Reef', 'Castle Embereth', 'Den of the Bugbear',
  'Sokenzan, Crucible of Defiance', 'Undergrowth Stadium', 'Underground Mortuary', 'Boseiju, Who Endures', 'Restless Cottage',
  'Prismatic Vista', 'Fabled Passage', 'Evolving Wilds', 'Multiversal Passage', 'Blooming Marsh', 'Deathcap Glade',
];

async function main() {
  const { scoreLandsForDeck, analyzeManaDemands } = await import('../../src/lib/land-intelligence');
  const dir = path.join(__dirname, 'builds');
  const decks: Array<[string, string[]]> = [
    ['atraxa', ['W', 'U', 'B', 'G']], ['edgar', ['W', 'B', 'R']], ['niv', ['W', 'U', 'B', 'R', 'G']], ['krenko', ['R']],
    ['kess', ['U', 'B', 'R']], ['ygra', ['B', 'G']], ['tymna-thrasios', ['W', 'U', 'B', 'G']],
  ];
  const out: string[] = [];
  for (const [slug, colors] of decks) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, `${slug}.json`), 'utf8'));
    const nonland = j.cards.filter((c: any) => !(c.type_line || '').includes('Land')).map((c: any) => ({ mana_cost: c.mana_cost, quantity: c.qty }));
    const manaDemand = analyzeManaDemands(nonland);
    const format = j.summary.opts.format;
    const scored = scoreLandsForDeck({ colors, format, strategy: j.summary.strategy, commanderName: j.summary.opts.commanderName, manaDemand, tribalTypes: j.summary.tribalType ? [j.summary.tribalType] : undefined });
    out.push(`\n## ${slug} (${colors.join('')}, ${format}) — ${scored.length} scored; heaviest ${manaDemand.heaviestColor}`);
    out.push(`top 45:`);
    scored.slice(0, 45).forEach((s, i) => out.push(`${String(i + 1).padStart(3)} ${String(s.score).padStart(4)} t${s.tier} ${s.category.padEnd(20)} ${s.card.name.padEnd(42)} ${s.entersUntapped ? 'untapped' : 'TAPPED  '} ${s.reasons.join('; ')}`));
    out.push(`watch list:`);
    for (const w of WATCH) {
      const i = scored.findIndex((s) => s.card.name === w);
      if (i === -1) continue; // filtered or off-colour
      const s = scored[i];
      out.push(`  #${String(i + 1).padStart(3)} ${String(s.score).padStart(4)} t${s.tier} ${s.category.padEnd(20)} ${w.padEnd(42)} ${s.entersUntapped ? 'untapped' : 'TAPPED  '} ${s.reasons.join('; ')}`);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'land-scores.txt'), out.join('\n'));
  console.log(out.join('\n'));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
