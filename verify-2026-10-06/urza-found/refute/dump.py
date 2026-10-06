import os, sqlite3, sys, re
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
names = []
for line in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'(\d+)\s+(.+)', line.strip())
    if m: names.append((int(m.group(1)), m.group(2)))
for n, name in names:
    r = c.execute("select name, mana_cost, cmc, type_line, oracle_text, rarity from cards where name = ? or name like ? limit 1", (name, name + ' // %')).fetchone()
    if not r: print('MISSING', name); continue
    print(f"### {n}x {r[0]} | {r[1]} | mv {r[2]} | {r[3]} | {r[5]}\n{r[4]}\n")
