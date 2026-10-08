import sys,os,re
sys.path.insert(0,os.path.dirname(__file__))
from src import load,coll,decks,where
fin=load('verify-2026-10-09/tazri/tazri-final.txt')
T=decks['tazri-beacon-of-unity']
n=0
for l in open(os.path.join(os.path.dirname(__file__),'pool.txt'),encoding='utf-8').readlines()[2:]:
    m=re.match(r'\s*([\d.]+)\s+([+-][\d.]+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(?:\d+x\s+)?(.*?) \| (.*?) \| (.*)',l)
    if not m: continue
    name=m.group(6).strip()
    if name in fin: continue
    if 'Land' == m.group(7).strip(): continue
    used=sum(d.get(name,0) for k,d in decks.items() if k!='tazri-beacon-of-unity')
    free=coll.get(name,0)-used
    tag='SLEEVED' if name in T else ('free' if free>0 else 'RAID:'+','.join(where(name)))
    print(f"{m.group(1):>5} {m.group(3)} {tag:28.28s} {name} | {m.group(7)} | {m.group(8)[:90]}")
    n+=1
    if n>=int(sys.argv[1]): break
