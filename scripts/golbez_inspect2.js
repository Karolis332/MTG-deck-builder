// Deeper inspection
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(process.env.APPDATA, 'the-black-grimoire', 'data', 'mtg-deck-builder.db');
const db = new Database(DB_PATH, { readonly: true });

const deckId = 78;
const userId = 1;

console.log('=== FULL DECK LIST ===');
const cards = db.prepare(`
  SELECT dc.quantity, dc.board, c.name, c.mana_cost, c.cmc, c.type_line
  FROM deck_cards dc JOIN cards c ON dc.card_id = c.id
  WHERE dc.deck_id = ?
  ORDER BY dc.board, c.cmc, c.name
`).all(deckId);
for (const c of cards) {
  console.log(`  [${c.quantity}] (${c.cmc ?? '?'}) ${c.name} :: ${c.type_line}`);
}

console.log('\n=== KEY STAPLES CHECK ===');
const want = [
  'Sol Ring','Arcane Signet','Dimir Signet','Talisman of Dominance','Fellwar Stone',
  'Thought Vessel','Mind Stone','Mana Vault','Mox Amber','Mox Opal',
  'Polluted Delta','Watery Grave','Underground River','Darkslick Shores',
  'Morphic Pool','River of Tears','Drowned Catacomb','Shipwreck Marsh',
  'Choked Estuary','Sunken Hollow','Creeping Tar Pit','Restless Reef',
  'Unctus, Grand Metatect','Foundry Inspector','Inspiring Statuary',
  'Myr Battlesphere','Hangarback Walker','Solemn Simulacrum','Thought Monitor',
  'Reanimate','Animate Dead','Necromancy','Cyclonic Rift','Rhystic Study',
  'Counterspell','Fierce Guardianship','Swan Song','Brainstorm','Ponder',
  'Preordain','Night\'s Whisper','Sign in Blood','Damn','Toxic Deluge',
  'Feed the Swarm','Infernal Grasp','Go for the Throat','Fatal Push',
  'Hero\'s Downfall','Baleful Strix','Ledger Shredder','Phyrexian Arena',
  'Padeem, Consul of Innovation','Steel Overseer','Metallic Mimic',
  'Sai, Master Thopterist','Voltaic Key','Trading Post','Thopter Foundry',
  'Spine of Ish Sah','The One Ring','Blightsteel Colossus','Wurmcoil Engine',
  'Darksteel Forge','Mystic Forge','Thran Dynamo','Hedron Archive',
  'Commander\'s Sphere','Prismatic Lens','Worn Powerstone','Basalt Monolith',
  'Thorn of Amethyst','Lodestone Golem','Vault Skirge','Ornithopter',
  'Treasure Vault','Mystic Gate',
];
for (const name of want) {
  const r = db.prepare(`
    SELECT c.name, c.color_identity, COALESCE(SUM(col.quantity),0) as qty,
           EXISTS (SELECT 1 FROM deck_cards dc WHERE dc.deck_id = ? AND dc.card_id = c.id) as in_deck
    FROM cards c LEFT JOIN collection col ON col.card_id = c.id AND col.user_id = ?
    WHERE c.name = ?
    GROUP BY c.id
    ORDER BY qty DESC LIMIT 1
  `).get(deckId, userId, name);
  if (r) {
    const mark = r.in_deck ? 'D' : (r.qty > 0 ? '+' : '-');
    console.log(`  ${mark} [${r.qty}] ${r.name} | CI=${r.color_identity}`);
  }
}

db.close();
