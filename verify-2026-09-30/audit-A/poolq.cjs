// Why did the expected (owned) card lose to the pick? Print scores + components.
const fs = require('fs');
const path = require('path');
const MISSES = {
  meren: ['Grave Titan', 'Jarad, Golgari Lich Lord', 'Junji, the Midnight Sky', 'Mazirek, Kraul Death Priest', 'Liliana, Dreadhorde General', 'Rune-Scarred Demon', 'Bloodghast', 'Ophiomancer', 'Jadar, Ghoulcaller of Nephalia', 'Braids, Cabal Minion', 'Chthonian Nightmare', 'Golgari Charm', 'Infernal Grasp', 'Long Feng, Grand Secretariat', 'The Gitrog, Ravenous Ride', 'Grim Servant', 'Saw in Half', 'Veil of Summer', 'Noxious Gearhulk', 'Rise of the Dark Realms', 'Walking Ballista', "Nature's Lore", 'Talisman of Resilience', 'Sylvan Library', 'Vito, Thorn of the Dusk Rose', 'Creakwood Liege', 'Springbloom Druid', 'Basking Broodscale', 'Emeritus of Woe'],
  aeve: ['Slime Against Humanity', 'Michelangelo, Weirdness to 11', 'Kami of Whispered Hopes', 'Renata, Called to the Hunt', 'Germination Practicum', 'Terrasymbiosis', 'Ilysian Caryatid', 'Enduring Vitality', 'Nissa, Who Shakes the World', 'Overlord of the Hauntwoods', 'Mox Amber', 'Craterhoof Behemoth', 'Overrun', 'Return of the Wildspeaker', 'Formidable Speaker', 'Silkguard', 'Pick Your Poison', 'Seedship Impact', 'Bite Down', 'Wood Elves', 'Firdoch Core', 'Bushwhack', 'Disciple of Freyalise // Garden of Freyalise', 'Bridgeworks Battle // Tanglespan Bridgeworks'],
  tatyova: ['Nissa, Who Shakes the World', 'Nissa, Resurgent Animist', "Tamiyo's Safekeeping", 'Mulldrifter', 'Return of the Wildspeaker', 'Craterhoof Behemoth', 'Overrun', 'Overlord of the Hauntwoods', 'Kami of Whispered Hopes', 'Sylvan Library', 'Doubling Season', 'Selvala, Heart of the Wilds', 'Enduring Vitality', 'Ilysian Caryatid', 'Wood Elves', 'Springbloom Druid', 'Tireless Provisioner', 'Rampaging Baloths', 'Michelangelo, Weirdness to 11', 'Formidable Speaker', 'The Great Henge', 'Terrasymbiosis', 'Germination Practicum', 'Sakura-Tribe Elder', 'Elvish Archdruid'],
  jhoira: ['Karn, the Great Creator', 'Lightning Bolt', 'Expressive Iteration', 'Third Path Iconoclast', 'Pia, Aether Ascetic', 'Teferi, Time Raveler', 'Narset, Parter of Veils', 'Chandra, Torch of Defiance', 'Ral, Crackling Wit', 'Kaito, Cunning Infiltrator', 'Tezzeret, Cruel Captain', 'Saheeli, Sublime Artificer', 'Chromatic Lantern', 'Coldsteel Heart', 'Talisman of Creativity', 'Mind Stone', 'Hedron Archive', 'Solemn Simulacrum', 'The Theorist, Jace Beleren', 'Ral, Monsoon Mage // Ral, Leyline Prodigy', 'Niv-Mizzet, Supreme', 'Loot, the Pathfinder', 'Urza, Lord High Artificer', 'Jhoira, Weatherlight Captain'],
  tam: ['Doubling Season', 'All Will Be One', 'Evolution Sage', 'Flux Channeler', 'Sheoldred, the Apocalypse', 'Phyrexian Arena', 'Sylvan Library', 'Enlightened Tutor', 'Pia, Aether Ascetic', 'Captain Sisay', "Teferi's Protection", 'Heroic Intervention', 'Counterspell', 'Sunfall', 'Vraska, Soul of Stone', 'Ajani Resolute', 'Narset, Parter of Veils', 'Chandra, Torch of Defiance', 'Garruk, Curse Breaker', 'Karn, the Great Creator', 'Nissa, Who Shakes the World', 'Teyo, the Shieldmage', 'The Wanderer', 'Ajani Unrelenting', 'Timeless Lotus', 'Esika, God of the Tree // The Prismatic Bridge', 'Teferi, Time Raveler', 'Liliana, Dreadhorde General', 'Ugin, the Spirit Dragon', 'Way of the Mentor', 'Tekuthal, Inquiry Dominus', 'Oath of Teferi'],
};
const fmt = (c) => Object.entries(c || {}).map(([k, v]) => `${k}=${Math.round(v)}`).join(' ');
for (const key of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, `${key}.pool.json`), 'utf8'));
  const byName = new Map(j.pool.map((p) => [p.name, p]));
  const roleOf = new Map((j.reasoning || []).map((r) => [r.cardName, r.role]));
  const picked = j.pool.filter((p) => p.picked);
  const rankOf = new Map(j.pool.map((p, i) => [p.name, i + 1]));
  console.log(`\n===== ${key}: pool ${j.pool.length}, picked ${picked.length}, lowest picked score ${Math.round(picked[picked.length - 1].score)} (rank ${rankOf.get(picked[picked.length - 1].name)})`);
  console.log('--- expected cards');
  for (const n of MISSES[key]) {
    const p = byName.get(n);
    if (!p) { console.log(`  ${n}: NOT IN POOL`); continue; }
    console.log(`  ${p.picked ? 'IN ' : 'OUT'} #${rankOf.get(n)} ${Math.round(p.score)} ${n} [${roleOf.get(n) || ''}] ${fmt(p.components)}`);
  }
  console.log('--- 18 weakest picks');
  for (const p of picked.slice(-18)) console.log(`  #${rankOf.get(p.name)} ${Math.round(p.score)} ${p.name} [${roleOf.get(p.name) || ''}] ${fmt(p.components)}`);
  console.log('--- build report');
  console.log((j.buildReport || '').split('\n').slice(0, 14).join('\n'));
}
