import re, glob, os, sys
root = 'C:/Users/QuLeR/MTG-deck-builder/decks/paper'
def parse(p):
    d = {}
    for line in open(p, encoding='utf-8'):
        m = re.match(r'\s*(\d+)\s+(.+?)\s*$', line)
        if m: d[m.group(2)] = d.get(m.group(2), 0) + int(m.group(1))
    return d
own = parse(f'{root}/collection.txt')
used = {}
for f in glob.glob(f'{root}/decks/*.txt'):
    if 'inspirit' in f: continue
    tag = os.path.basename(f)[:3]
    for n, q in parse(f).items():
        used.setdefault(n, []).append(f'{tag}{q}')
cur = parse('C:/Users/QuLeR/MTG-deck-builder/verify-2026-10-02/inspirit/inspirit-current.txt')
names = [re.match(r'- \*\*(.+?)\*\*', l).group(1) for l in open('C:/Users/QuLeR/MTG-deck-builder/verify-2026-10-02/inspirit/pool.md', encoding='utf-8') if l.startswith('- **')]
names += [n for n in sys.argv[1:]]
for n in names:
    u = used.get(n, [])
    nu = sum(int(re.sub(r'\D', '', x)) for x in u)
    o = own.get(n, 0)
    ins = cur.get(n, 0)
    print(f'{n} | own {o} | other {",".join(u) or "-"} | ins {ins} | free {o - nu - ins}')
