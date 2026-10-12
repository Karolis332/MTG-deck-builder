"""Print a list with MV / type / power from the DB; count MV>=6 spells, lands, curve."""
import os, re, sqlite3, sys
from collections import Counter
DB = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
rows = []; n = 0
for l in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'^(\d+)\s+(.+)$', l.strip())
    if not m: continue
    k, name = int(m.group(1)), m.group(2).strip(); n += k
    r = DB.execute("select name, cmc, type_line, power, mana_cost from cards where name = ? or name like ? limit 1", (name, name + ' // %')).fetchone()
    if not r: print('MISSING', name); continue
    rows.append((k, r))
land = sum(k for k, r in rows if 'Land' in r[2].split(' // ')[0] and 'Creature' not in r[2].split(' // ')[0])
spells = [(k, r) for k, r in rows if not ('Land' in r[2].split(' // ')[0] and 'Creature' not in r[2].split(' // ')[0])]
big = [r[0] for k, r in spells if r[1] >= 6]
curve = Counter(min(int(r[1]), 7) for k, r in spells)
print(f"{sys.argv[1]}: {n} cards, {land} lands, {len(spells)} spells, MV>=6: {len(big)}, avgMV {sum(r[1] for k,r in spells)/len(spells):.2f}, curve {dict(sorted(curve.items()))}")
if '-v' in sys.argv:
    for k, r in sorted(spells, key=lambda x: (-x[1][1], x[1][0])): print(f"  {int(r[1]):2d} {r[4]:18s} {r[0]} | {r[2]} {r[3] or ''}")
