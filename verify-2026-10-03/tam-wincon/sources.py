"""Colour sources of a list (lands + mana rocks/dorks). Run: py sources.py LIST"""
import re, sqlite3, sys, os
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
names = []
for line in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'(\d+)\s+(.+)', line.strip())
    if m: names += [m.group(2)] * int(m.group(1))
lands, src, other = 0, dict.fromkeys('WUBRG', 0), []
for n in names:
    row = db.execute("select type_line, oracle_text from cards where (name = ? or name like ? || ' //%') and type_line not like 'Card //%' limit 1", (n, n)).fetchone()
    if not row: print('MISSING', n); continue
    tl, ot = row[0], row[1] or ''
    front = tl.split(' // ')[0]
    basic = {'Island': 'U', 'Mountain': 'R', 'Plains': 'W', 'Swamp': 'B', 'Forest': 'G'}
    cols = set(c for t, c in basic.items() if t in front.split('—')[-1]) if 'Land' in front else set()
    adds = ' '.join(re.findall(r'Add ([^.]*)\.', ot))
    cols |= set(re.findall(r'\{([WUBRG])\}', adds))
    if re.search(r'any (one )?colou?r|mana of any|in any combination of colors|two mana of different colors', adds + ot): cols = set('WUBRG')
    if 'Land' in front:
        lands += 1
        for c in cols: src[c] += 1
    elif cols: other.append(n)
print('lands', lands, 'land sources', src, '| nonland mana sources', len(other), other)
