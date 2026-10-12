const db=new (require('better-sqlite3'))(process.env.APPDATA+'/the-black-grimoire/data/mtg-deck-builder.db',{readonly:true});
const fs=require('fs');
const inDeck=new Set(fs.readFileSync(process.argv[2],'utf8').split('\n').map(l=>l.match(/^\d+\s+(.+?)(\s+\([A-Z0-9]+\)\s+\S+)?\s*$/)).filter(Boolean).map(m=>m[1]));
const lands=process.argv[3]==='lands';
const rows=db.prepare(`SELECT c.name, min(c.edhrec_rank) r, c.mana_cost m, c.type_line t, replace(c.oracle_text,char(10),' / ') o
 FROM collection col JOIN cards c ON c.id=col.card_id
 WHERE col.user_id=1 AND col.source='arena' AND c.edhrec_rank IS NOT NULL
 GROUP BY c.name ORDER BY r`).all();
const leg=db.prepare(`SELECT 1 FROM cards WHERE name=? AND json_extract(legalities,'$.brawl')='legal' AND (color_identity='[]' OR color_identity='["G"]') LIMIT 1`);
let n=0;
for(const r of rows){ if(inDeck.has(r.name)||!leg.get(r.name)) continue;
  const isLand=/^Land|\/\/ Land|Land —/.test(r.t)&&!/Creature|Sorcery|Instant/.test(r.t.split('//')[0]);
  if(lands!==isLand) continue;
  console.log(`${r.r}\t${r.name} ${r.m||''} | ${r.t} | ${(r.o||'').slice(0,lands?140:110)}`);
  if(++n>=(lands?30:110)) break; }
