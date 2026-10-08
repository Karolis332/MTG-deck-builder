import re,glob,sys,os
def load(p):
    out={}
    for l in open(p,encoding='utf-8'):
        l=l.strip()
        if not l or l in('Commander','Deck') or l.startswith('#') or l.startswith('//'): continue
        m=re.match(r'^(\d+)x?\s+(.*)$',l)
        n,name=(int(m.group(1)),m.group(2).strip()) if m else (1,l)
        out[name]=out.get(name,0)+n
    return out
coll=load('decks/paper/collection.txt')
decks={os.path.basename(p)[:-4]:load(p) for p in glob.glob('decks/paper/decks/*.txt')}
def where(c): return [d for d,v in decks.items() if c in v and d!='tazri-beacon-of-unity']
if __name__=='__main__':
    if sys.argv[1]=='diff':
        a=load(sys.argv[2]); b=load(sys.argv[3])
        print('totals',sum(a.values()),sum(b.values()))
        print('OUT:',' | '.join(k for k in sorted(a) if a[k]>b.get(k,0)))
        print('IN :',' | '.join(k for k in sorted(b) if b[k]>a.get(k,0)))
    elif sys.argv[1]=='src':
        lst=load(sys.argv[2])
        for c in sorted(lst):
            if c in decks['tazri-beacon-of-unity']: continue
            print(f"{c:40s} coll={coll.get(c,0)} other={where(c)}")
    else:
        for c in sys.argv[2:]:
            print(f"{c:40s} coll={coll.get(c,0)} other={where(c)} inTazri={c in decks['tazri-beacon-of-unity']}")
