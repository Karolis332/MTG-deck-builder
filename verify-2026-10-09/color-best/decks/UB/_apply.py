import sys,re
base,swaps,out=sys.argv[1:4]
lines=open(base,encoding='utf-8').read().split('\n')
i=lines.index('Deck'); head=lines[:i+1]
cards={}
for l in lines[i+1:]:
    m=re.match(r'^(\d+) (.+)$',l.strip())
    if m: cards[m.group(2)]=cards.get(m.group(2),0)+int(m.group(1))
for s in open(swaps,encoding='utf-8'):
    s=s.strip()
    if not s or s.startswith('#'): continue
    o,n=[x.strip() for x in s.split('=>')]
    assert cards.get(o,0)>0, o
    cards[o]-=1
    if not cards[o]: del cards[o]
    cards[n]=cards.get(n,0)+1
assert sum(cards.values())==99, sum(cards.values())
open(out,'w',encoding='utf-8').write('\n'.join(head+[f'{c} {n}' for n,c in sorted(cards.items())])+'\n')
