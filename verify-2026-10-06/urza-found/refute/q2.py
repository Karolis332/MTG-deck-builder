import os, sqlite3, sys
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
for name in sys.argv[1].split(';'):
    name = name.strip()
    r = c.execute("select name, mana_cost, cmc, type_line, power, toughness, oracle_text, edhrec_rank from cards where name = ? or name like ? limit 1", (name, name + ' //%')).fetchone()
    if not r: print('MISSING', name); continue
    print(f"### {r[0]} | {r[1]} | mv {r[2]} | {r[3]} | {r[4]}/{r[5]} | edh {r[7]}\n{r[6]}\n")
