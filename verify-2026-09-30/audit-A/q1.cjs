const Database = require('better-sqlite3');
const db = new Database('C:/Users/QuLeR/AppData/Local/Temp/audit-A-db/mtg-deck-builder.db', { readonly: true });
const own = db.prepare(`select c.name, sum(col.quantity) q, max(c.arena_id) arena, max(json_extract(c.legalities,'$.brawl')) brawl, max(json_extract(c.legalities,'$.historicbrawl')) hb
  from collection col join cards c on c.id=col.card_id where col.user_id=1 and col.source=? and c.name=? group by c.name`);
for (const n of ['Slime Against Humanity', 'Mox Opal', "Mishra's Bauble", 'Ornithopter', 'Springleaf Drum', 'Grapeshot', 'Brain Freeze', 'Underworld Breach', 'Dramatic Reversal', "Jeska's Will", 'Thran Portal', 'Karn, the Great Creator', 'Minsc & Boo, Timeless Heroes', 'A-Minsc & Boo, Timeless Heroes', 'Persistent Petitioners', 'Hare Apparent', 'Mox Amber', 'Urza, Lord High Artificer'])
  console.log(n, JSON.stringify(own.get('arena', n)));
console.log('--- land classification rows');
const lc = db.prepare('select land_category cat, produces_colors p, enters_untapped u, enters_untapped_condition c, synergy_tags s, tier t from land_classifications where card_name=?');
for (const n of ["Inventors' Fair", 'High Market', "Karn's Bastion", 'Interplanar Beacon', 'Buried Ruin', 'Seat of the Synod', 'Great Furnace', 'Otawara, Soaring City', 'Sokenzan, Crucible of Defiance', 'Riverpyre Verge', 'Bountiful Landscape', 'Cabaretti Courtyard', 'Brokers Hideout', 'Starting Town', 'Northampton Farm', 'Hall of Echoes', 'Secret Tunnel', 'Soulstone Sanctuary', 'Ba Sing Se', 'Grim Backwoods', 'Vineglimmer Snarl', 'Hinterland Harbor', 'Woodland Cemetery', 'Deserted Beach', 'Mistrise Village', 'Arena of Glory', 'Archway of Innovation'])
  console.log(n, JSON.stringify(lc.get(n)));
console.log('--- Slime collection rows', JSON.stringify(db.prepare('select col.card_id, col.quantity, c.set_code from collection col join cards c on c.id=col.card_id where col.user_id=1 and col.source=? and c.name=?').all('arena', 'Slime Against Humanity')));
console.log('--- oracle', db.prepare('select name, oracle_text from cards where name in (?,?,?,?,?,?,?)').all('Northampton Farm', 'Secret Tunnel', 'Night of the Sweets\' Revenge', 'Chronicle of Victory', 'Mizzix\'s Mastery', 'Cool but Rude', 'Transmutation Font').map((r) => `${r.name}: ${(r.oracle_text || '').replace(/\n/g, ' / ').slice(0, 260)}`).join('\n'));
db.close();
