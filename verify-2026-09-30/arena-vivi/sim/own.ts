import { getDb } from '../../../src/lib/db';
const db = getDb();
const names = ["A-Vivi Ornitier","Vivi Ornitier","Hapatra, the Desert Frost","Choco-Comet","Traumatic Critique","Ajani's Anguish","Aggravated Assault","Birgi, God of Storytelling // Harnfel, Horn of Bounty","Harmonic Prodigy","Tomik, Izzet Sparkmage","Training Grounds"];
for (const n of names) {
  const rows = db.prepare(`SELECT c.name, c.arena_id, col.quantity, col.source, col.user_id FROM collection col JOIN cards c ON c.id = col.card_id WHERE col.user_id = 1 AND c.name = ?`).all(n);
  console.log(n, '=>', JSON.stringify(rows));
}
console.log('cards rows named like Vivi:', JSON.stringify(db.prepare(`SELECT id, name, arena_id, set_code FROM cards WHERE name LIKE '%Vivi Ornitier%'`).all()));
