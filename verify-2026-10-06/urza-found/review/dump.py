import os, sqlite3, sys, re
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
for line in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'(\d+)\s+(.+)', line.strip())
    if not m or m.group(2) == 'Island': continue
    name = m.group(2)
    r = c.execute("select name, mana_cost, cmc, type_line, power, toughness, loyalty, oracle_text from cards where name = ? or name like ? limit 1", (name, name + ' // %')).fetchone()
    if not r: print('MISSING', name); continue
    print(f"### {r[0]} | {r[1]} | mv {r[2]} | {r[3]} | {r[4]}/{r[5]} L{r[6]}\n{r[7]}\n")
