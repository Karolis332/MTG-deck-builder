import re,glob,sys,os
R='C:/Users/QuLeR/MTG-deck-builder/decks/paper/'
def parse(p):
    d={}
    for l in open(p,encoding='utf-8'):
        m=re.match(r'^(\d+)\s+(.+?)\s*$',l.strip())
        if m: d[m.group(2)]=d.get(m.group(2),0)+int(m.group(1))
    return d
own=parse(R+'collection.txt')
decks={os.path.basename(p)[:-4]:parse(p) for p in glob.glob(R+'decks/*.txt')}
def status(n):
    o=own.get(n,0); used={k:v[n] for k,v in decks.items() if n in v}
    free=o-sum(used.values())
    return o,free,used
if __name__=='__main__':
    for n in sys.argv[1:] if len(sys.argv)>1 else [l.strip() for l in sys.stdin if l.strip()]:
        o,f,u=status(n); print(f"{n} | owned {o} | free {f} | {u}")
