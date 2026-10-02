"""Resolve the operator's Sisay list: DB row, colour identity, brawl legality, Arena ownership."""
import os, re, sqlite3, json
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
HERE = os.path.dirname(os.path.abspath(__file__))
NOT_TOKEN = "layout not in ('art_series','token','double_faced_token','emblem')"
owned = {r[0] for r in c.execute("select distinct cards.name from collection col join cards on cards.id=col.card_id "
                                  "where col.user_id=1 and col.source in ('arena','arena_csv') and col.quantity>0")}
age = c.execute("select max(imported_at) from collection where user_id=1 and source in ('arena','arena_csv')").fetchone()
print('collection rows owned names', len(owned), 'latest', age)
for line in open(os.path.join(HERE, 'operator-list.txt'), encoding='utf-8'):
    m = re.match(r'^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+\S+$', line.strip())
    if not m: continue
    q, name, s = m.groups()
    r = c.execute(f"select name, color_identity, json_extract(legalities,'$.brawl'), type_line, mana_cost from cards where (name=? or name like ? || ' // %') and {NOT_TOKEN} order by (edhrec_rank is null), edhrec_rank limit 1", (name, name)).fetchone()
    if not r:
        print(f'UNRESOLVED {name} ({s})'); continue
    ci = ''.join(json.loads(r[1] or '[]'))
    flags = []
    if set(ci) - set('GW'): flags.append(f'OFF-ID[{ci}]')
    if r[2] != 'legal': flags.append(f'brawl={r[2]}')
    if r[0] not in owned and name not in ('Forest','Plains'): flags.append('NOT-IN-DB-COLLECTION')
    if flags: print(f'{name} ({s}) {r[4]} — {" ".join(flags)}')
