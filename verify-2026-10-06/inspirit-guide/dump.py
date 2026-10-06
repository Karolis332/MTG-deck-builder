import os, sqlite3, re
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
names = []
for line in open('verify-2026-10-06/urza-found/inspirit-hotswap.txt', encoding='utf-8'):
    m = re.match(r'(\d+)\s+(.+)', line.strip())
    if m: names.append((int(m.group(1)), m.group(2)))
out = open('verify-2026-10-06/inspirit-guide/oracle.txt', 'w', encoding='utf-8')
tot = 0
for n, name in names:
    tot += n
    r = c.execute("select name, mana_cost, type_line, power, toughness, oracle_text from cards where name = ? or name like ? limit 1", (name, name + ' // %')).fetchone()
    if not r: out.write(f'MISSING {name}\n'); continue
    if 'Land' in (r[2] or '') and 'Basic' in (r[2] or ''): continue
    out.write(f"## {r[0]} | {r[1]} | {r[2]} | {r[3]}/{r[4]}\n{r[5]}\n\n")
out.write(f'TOTAL {tot}\n')
