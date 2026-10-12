# py poolstat.py [filter-substring-in-type] -> name | type | status for every pool card
import re, sys, subprocess
rows = []
for l in open('pool.txt', encoding='utf-8').readlines()[2:]:
    p = l.split('|')
    if len(p) < 3: continue
    m = re.match(r'^\s*\S+\s+\S+\s+\d+\s+\d+\s+\S+\s+(?:\S\S?\s+)?(?:\d+x\s+)?(.+?)\s*$', p[0])
    if not m: print('??', p[0]); continue
    rows.append((m.group(1), p[1].strip(), p[2].strip()[:90]))
f = sys.argv[1] if len(sys.argv) > 1 else ''
exec(open('src.py').read().split('names =')[0].replace('import sys, re, glob, os', 'import re, glob, os'))
for n, t, o in rows:
    if f and f not in t: continue
    used = {d: c[n] for d, c in decks.items() if n in c}
    free = own.get(n, 0) - sum(used.values())
    st = 'FREE' if free >= 1 else 'RAID ' + ','.join(used)
    print(f'{n} | {t} | {st} | {o}')
