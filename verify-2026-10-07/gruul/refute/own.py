import re, sys, glob, os, collections
def names(p):
    out = collections.Counter()
    for l in open(p, encoding='utf-8'):
        m = re.match(r'^\s*(\d+)\s+(.+?)\s*$', l)
        if m and not m.group(2).startswith('#'): out[m.group(2).split(' // ')[0]] += int(m.group(1))
    return out
coll = names('decks/paper/collection.txt')
BASIC = {'Forest', 'Mountain'}
others = {}
for p in glob.glob('decks/paper/decks/*.txt'):
    b = os.path.basename(p)
    if b.startswith(('bumi-unleashed', 'gilanra-alena')): continue
    others[b] = names(p)
others['urza-draft'] = names('verify-2026-10-06/urza-found/final-3.txt')
for L in sys.argv[1:]:
    lst = names(L); bad = []
    for n, k in lst.items():
        if n in BASIC: continue
        used = {d: c[n] for d, c in others.items() if c.get(n)}
        have = coll.get(n, 0)
        if k + sum(used.values()) > have: bad.append((n, k, have, used))
    print(L, 'conflicts:', bad if bad else 'none')
    print('  basics', {b: lst[b] for b in BASIC}, 'owned', {b: coll.get(b, 0) for b in BASIC}, 'in other decks', {b: sum(c.get(b, 0) for c in others.values()) for b in BASIC})
