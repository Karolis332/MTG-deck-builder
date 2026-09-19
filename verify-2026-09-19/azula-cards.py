# Read-only lookup: name | cost | type | colour identity | commander/brawl legality | owned on Arena / paper.
import sqlite3, sys, json
c = sqlite3.connect('file:C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data/mtg-deck-builder.db?mode=ro', uri=True)
def owned(src):
    return {r[0].split(' // ')[0] for r in c.execute(
        "select distinct ca.name from collection co join cards ca on ca.id=co.card_id where co.user_id=1 and co.source=?", (src,))}
arena, paper = owned('arena'), owned('paper')
for n in [a.strip() for a in sys.argv[1:]]:
    r = c.execute("""select name, mana_cost, cmc, type_line, color_identity,
                            json_extract(legalities,'$.commander'), json_extract(legalities,'$.brawl'), oracle_text
                     from cards where name=? or name like ?
                     order by (json_extract(legalities,'$.commander')='legal') desc, (json_extract(legalities,'$.brawl')='legal') desc limit 1""",
                  (n, n + ' // %')).fetchone()
    if not r:
        print(f"?? {n} | NOT IN DB"); continue
    f = r[0].split(' // ')[0]
    print(f"{r[0]} | {r[1]} | {(r[3] or '')[:34]} | ci={''.join(json.loads(r[4] or '[]'))} | cmd={r[5]} brawl={r[6]} | arena={'Y' if f in arena else '-'} paper={'Y' if f in paper else '-'}")
    if len(sys.argv) <= 7:
        print('   ', (r[7] or '')[:300].replace('\n', ' / '))
