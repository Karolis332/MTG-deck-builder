# usage: py src.py list.txt  -> for each card: owned, used-in-decks (excluding none), status FREE/RAID(donors)/SHORT
import sys, re, glob, os
R = 'C:/Users/QuLeR/MTG-deck-builder/decks/paper/'
def parse(p):
    out = {}
    for l in open(p, encoding='utf-8'):
        m = re.match(r'^(\d+)\s+(.+?)\s*$', l)
        if m: out[m.group(2)] = out.get(m.group(2), 0) + int(m.group(1))
    return out
own = parse(R + 'collection.txt')
decks = {os.path.basename(f)[:-4]: parse(f) for f in glob.glob(R + 'decks/*.txt')}
BASICS = {'Swamp', 'Plains', 'Island', 'Mountain', 'Forest', 'Wastes'}
names = parse(sys.argv[1]) if os.path.exists(sys.argv[1]) else {n: 1 for n in sys.argv[1:]}
for n, q in names.items():
    if n in BASICS: continue
    used = {d: c[n] for d, c in decks.items() if n in c}
    free = own.get(n, 0) - sum(used.values())
    st = 'FREE' if free >= q else ('RAID ' + ','.join(used) if own.get(n, 0) >= q else 'NOT OWNED')
    if len(sys.argv) > 2 or st != 'FREE' or os.path.exists(sys.argv[1]) and '--all' in sys.argv:
        print(f'{n} | own {own.get(n,0)} | free {free} | {st}')
