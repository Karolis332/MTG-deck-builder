import sys,re
base,swaps,out=sys.argv[1],sys.argv[2],sys.argv[3]
idx=[int(i) for i in sys.argv[4].split(',')] if len(sys.argv)>4 else None
lines=open(base,encoding='utf-8').read().split('\n')
sw=[l.split(' => ') for l in open(swaps,encoding='utf-8').read().strip().split('\n')]
deck={}
start=lines.index('Deck')
for l in lines[start+1:]:
    m=re.match(r'^(\d+) (.+)$',l)
    if m: deck[m.group(2)]=deck.get(m.group(2),0)+int(m.group(1))
for i,(o,n) in enumerate(sw,1):
    if idx and i not in idx: continue
    assert deck.get(o,0)>0,o
    deck[o]-=1
    if not deck[o]: del deck[o]
    deck[n]=deck.get(n,0)+1
body=[f"{v} {k}" for k,v in sorted(deck.items())]
open(out,'w',encoding='utf-8').write('\n'.join(lines[:start+1]+body)+'\n')
print(out,sum(deck.values()))
