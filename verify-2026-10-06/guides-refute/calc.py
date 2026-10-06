import os, sqlite3, re
from math import comb
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
def load(p):
    out=[]
    for line in open(p, encoding='utf-8'):
        m=re.match(r'(\d+)\s+(.+)', line.strip())
        if not m: continue
        n=m.group(2); r=c.execute("select name,cmc,type_line from cards where name=? or name like ? limit 1",(n,n+' // %')).fetchone()
        out += [r]*int(m.group(1))
    return out
def hyp(N,K,n,k): return comb(K,k)*comb(N-K,n-k)/comb(N,n)
for p,cmdr in [('verify-2026-10-06/urza-found/final-3.txt','Urza, Lord High Artificer'),('verify-2026-10-06/urza-found/inspirit-hotswap.txt','Inspirit, Flagship Vessel')]:
    d=load(p); print('==',p,len(d))
    lands=[x for x in d if 'Land' in x[2].split('//')[0]]
    print('lands(front)',len(lands))
    nl=[x for x in d if 'Land' not in x[2].split('//')[0]]
    print('avgMV nonland incl cmdr', round(sum(x[1] for x in nl)/len(nl),3), len(nl))
    nl2=[x for x in nl if x[0]!=cmdr]; print('avgMV excl cmdr', round(sum(x[1] for x in nl2)/len(nl2),3))
    print('MV>=6', [x[0] for x in nl2 if x[1]>=6])
# Urza mulligan
N=99; L=36; R=10
P=lambda k: hyp(N,L,7,k)
print('Urza 3-4', P(3)+P(4), '0-1',P(0)+P(1),'5+',sum(P(k) for k in range(5,8)))
p2=P(2); p2rock=p2*(1-comb(63-R,5)/comb(63,5)); print('2+rock',p2rock,'2 norock',p2-p2rock)
print('keep total', P(3)+P(4)+p2rock)
T=8; print('2+ of 8', 1-hyp(99,8,7,0)-hyp(99,8,7,1), '3+', 1-sum(hyp(99,8,7,k) for k in range(3)))
# variant L=35 (Sink not land)
L2=35; print('L=35: 3-4', hyp(N,L2,7,3)+hyp(N,L2,7,4))
# Inspirit
L=38; P=lambda k: hyp(N,L,7,k)
print('Insp 3-5', P(3)+P(4)+P(5), '2', P(2), '0-1',P(0)+P(1),'6+',P(6)+P(7))
print('one of 10', 1-hyp(99,10,7,0))
print('bygone/traxos by T4 play', 1-hyp(99,2,10,0), 'draw', 1-hyp(99,2,11,0))
print('12 bodies T4 play', 1-hyp(99,12,10,0), 'draw', 1-hyp(99,12,11,0))
