import re,glob,sys,os
def load(p):
    d={}
    for l in open(p,encoding='utf-8'):
        m=re.match(r'^(\d+)x? (.+?)\s*$',l)
        if m: d[m.group(2)]=d.get(m.group(2),0)+int(m.group(1))
    return d
coll=load('decks/paper/collection.txt')
decks={os.path.basename(f)[:-4]:load(f) for f in glob.glob('decks/paper/decks/*.txt')}
def status(c):
    owned=coll.get(c,0); used=[k for k,v in decks.items() if c in v]
    free=owned-sum(decks[k][c] for k in used)
    return owned,free,used
for c in sys.stdin.read().splitlines():
    c=c.strip()
    if not c: continue
    o,f,u=status(c)
    print(f"{c}\towned={o}\tfree={f}\t{','.join(u)}")
