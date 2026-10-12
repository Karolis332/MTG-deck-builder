import path from 'path';
process.env.MTG_DB_DIR = path.resolve('data');
import { getDb } from '../../src/lib/db';

const db = getDb();
console.log('krenko', db.prepare("select name, color_identity from cards where name = 'Krenko, Mob Boss'").get());
console.log('ccs rows', db.prepare('select count(*) c from commander_card_stats').get());
console.log('red mono', db.prepare("select count(*) c from cards where color_identity = '[\"R\"]' and legalities like '%\"commander\":\"legal\"%'").get());
console.log('krenko ccs', db.prepare("select count(*) c from commander_card_stats where commander_name = 'Krenko, Mob Boss'").get());
console.log('distinct commanders', db.prepare('select count(distinct commander_name) c from commander_card_stats').get());
console.log('krenko price', db.prepare("select price_usd, type_line from cards where name = 'Krenko, Mob Boss'").get());
console.log('sol ring type', db.prepare("select type_line from cards where name = 'Sol Ring'").get());
console.log('beledros', db.prepare("select name from cards where name like 'Beledros%'").all());
console.log('red legendaries', db.prepare(`select name from cards where color_identity = '["R"]' and type_line like '%Legendary%Creature%' and legalities like '%"commander":"legal"%' and layout not in ('art_series','token') order by edhrec_rank asc limit 6`).all());
console.log('karn', db.prepare("select name, type_line, color_identity, price_usd from cards where name = 'Karn, Legacy Reforged'").get());
console.log('pct', db.prepare("select name from cards where name = '%'").get());
console.log('valakut', db.prepare("select name from cards where name like 'Valakut Awakening%'").all());
const dup = db.prepare(`
  select name, count(*) c from cards
  where color_identity = '["R"]'
    and legalities like '%"commander":"legal"%'
    and layout not in ('art_series', 'token')
    and type_line not like '%Legendary%'
  group by name having count(*) > 1
  order by name
  limit 400
`).all();
console.log('dup count sample', dup.length);
