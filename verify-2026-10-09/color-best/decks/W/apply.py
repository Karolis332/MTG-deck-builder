# usage: py apply.py base.txt swaps.txt out.txt  -> applies `Out => In` lines, merges counts
import sys, re, collections
base, swaps, out = sys.argv[1:4]
txt = open(base, encoding='utf-8').read()
head, deck = txt.split('\nDeck\n', 1)
cnt = collections.OrderedDict()
for l in deck.splitlines():
    m = re.match(r'^(\d+) (.+)$', l.strip())
    if m: cnt[m[2]] = cnt.get(m[2], 0) + int(m[1])
for l in open(swaps, encoding='utf-8'):
    l = l.strip()
    if not l or l.startswith('#'): continue
    o, i = [x.strip() for x in l.split('=>')]
    assert cnt.get(o), f'not in list: {o}'
    cnt[o] -= 1
    if not cnt[o]: del cnt[o]
    cnt[i] = cnt.get(i, 0) + 1
assert sum(cnt.values()) == 99, sum(cnt.values())
body = '\n'.join(f'{n} {k}' for k, n in sorted(cnt.items(), key=lambda kv: kv[0].lower()))
open(out, 'w', encoding='utf-8').write(head + '\nDeck\n' + body + '\n')
