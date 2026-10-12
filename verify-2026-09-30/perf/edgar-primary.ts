// Primary category (what the tribal-floor ramp band counts) for Edgar's pre-floor ramp-ish picks.
import { getDb } from '../../src/lib/db';
import { classifyCard, getPrimaryCategory } from '../../src/lib/card-classifier';
const names = ['Arcane Signet','Mind Stone','Talisman of Hierarchy','Orzhov Signet','Talisman of Indulgence','Rakdos Signet','Master of Dark Rites','Sol Ring','Solemn Simulacrum','Thought Vessel','Pawn of Ulamog','Combat Celebrant','Aggravated Assault'];
const cmd = getDb().prepare("SELECT oracle_text FROM cards WHERE name = 'Edgar Markov'").get() as any;
for (const n of names) {
  const c = getDb().prepare('SELECT * FROM cards WHERE name = ?').get(n) as any;
  const cats = classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0, cmd.oracle_text);
  console.log(`${n}: primary ${getPrimaryCategory(cats)} [${cats.join(',')}]`);
}
