const db=new (require('better-sqlite3'))(process.env.APPDATA+'/the-black-grimoire/data/mtg-deck-builder.db',{readonly:true});
const rows=db.prepare(`SELECT DISTINCT c.name, c.mana_cost, c.cmc, c.type_line, c.oracle_text o, c.keywords
 FROM collection col JOIN cards c ON c.id=col.card_id
 WHERE col.user_id=1 AND col.source='arena'`).all();
// re-resolve legality by name (any brawl-legal printing), identity subset of G
const leg=db.prepare(`SELECT 1 FROM cards WHERE name=? AND json_extract(legalities,'$.brawl')='legal' AND (color_identity='[]' OR color_identity='["G"]') LIMIT 1`);
const seen=new Set(), out=[];
for(const r of rows){ if(seen.has(r.name)) continue; seen.add(r.name); if(!leg.get(r.name)) continue; out.push(r); }
const tests={
 ooze:r=>/Ooze|Changeling/.test(r.type_line)||/Ooze|changeling|every creature type|all creature types/i.test(r.o||''),
 counters:r=>/\+1\/\+1 counter/.test(r.o||'')&&/(twice|plus one|additional \+1\/\+1|one more|that many plus)/i.test(r.o||''),
 storm:r=>/Storm|copy it for each spell|spells? cast (before it )?this turn|second spell/i.test(r.o||''),
 cheap:r=>!/Land/.test(r.type_line)&&r.cmc<=1,
 costred:r=>/cost \{?\d\}? less|costs? \{1\} less|spells you cast cost/i.test(r.o||''),
};
const which=process.argv[2];
for(const r of out.filter(tests[which])) console.log(`${r.name} ${r.mana_cost||''} | ${r.type_line} | ${(r.o||'').replace(/\n/g,' / ').slice(0,220)}`);
console.error(`owned brawl-legal G/colourless: ${out.length}`);
