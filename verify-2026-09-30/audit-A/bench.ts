// Recompute the owned-lands bench for each built deck (commander CI from the cards table;
// build.ts read it from r.cards, which does not carry the commander).
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/audit-A-db';
const OUT = path.resolve(__dirname);
const db = new Database(`${DB_DIR}/mtg-deck-builder.db`, { readonly: true });

for (const key of ['tam', 'tatyova', 'aeve', 'meren', 'jhoira']) {
  const file = path.join(OUT, `${key}.json`);
  if (!fs.existsSync(file)) continue;
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cmdr = db.prepare('select color_identity, oracle_text, mana_cost, type_line from cards where name = ? limit 1').get(j.summary.commander) as any;
  const ci: string[] = JSON.parse(cmdr.color_identity || '[]');
  const inDeck = new Set(j.cards.map((c: any) => c.name));
  const owned = db.prepare(
    `select c.name, c.type_line, c.oracle_text, c.color_identity, c.produced_mana, c.edhrec_rank, c.price_usd, sum(col.quantity) qty,
            lc.land_category, lc.produces_colors, lc.enters_untapped, lc.enters_untapped_condition, lc.tier
     from collection col join cards c on c.id = col.card_id
     left join land_classifications lc on lc.card_name = c.name
     where col.user_id = 1 and col.source = ? and c.type_line like '%Land%' group by c.name`,
  ).all(j.summary.source) as any[];
  const bench = owned
    .filter((l) => {
      const lci: string[] = JSON.parse(l.color_identity || '[]');
      return lci.every((c) => ci.includes(c)) && !/^Basic Land/.test(l.type_line) && !inDeck.has(l.name);
    })
    .map((l) => ({ name: l.name, ci: JSON.parse(l.color_identity || '[]').join(''), rank: l.edhrec_rank, qty: l.qty, cat: l.land_category, prod: l.produces_colors, untap: l.enters_untapped, cond: l.enters_untapped_condition, tier: l.tier, oracle: (l.oracle_text || '').slice(0, 200) }))
    .sort((a, b) => (a.rank ?? 99999) - (b.rank ?? 99999));
  j.summary.ci = ci;
  j.summary.commanderOracle = cmdr.oracle_text;
  j.summary.commanderCost = cmdr.mana_cost;
  j.benchLands = bench;
  fs.writeFileSync(file, JSON.stringify(j, null, 1));
  const lines = bench.map((l) => `${l.name} | ${l.ci} | r${l.rank} | ${l.cat} t${l.tier} untap=${l.untap}${l.cond ? ' (' + l.cond + ')' : ''}`);
  fs.writeFileSync(path.join(OUT, `${key}.bench.txt`), `${key} ci=${ci.join('')} bench=${bench.length}\n${lines.join('\n')}\n`);
  console.log(`${key}: ci=${ci.join('')} bench=${bench.length} coloured=${bench.filter((l) => l.ci).length}`);
}
db.close();
