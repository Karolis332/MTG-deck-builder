import sys,os
sys.path.insert(0,os.path.dirname(__file__))
from src import load,coll,decks
from collections import Counter
L=load(sys.argv[1]); T=decks['tazri-beacon-of-unity']; cnt=Counter(); bad=[]
for n,k in L.items():
    others={d:v[n] for d,v in decks.items() if d!='tazri-beacon-of-unity' and n in v}
    free=coll.get(n,0)-sum(others.values())
    if coll.get(n,0)<k: bad.append(n)
    if free<k:
        need=k-max(free,0)
        cnt[','.join(sorted(others))]+=need
        print(f"RAID {need} {n} from {list(others)} (coll {coll.get(n,0)})")
print(dict(cnt)); print('NOT OWNED',bad)
