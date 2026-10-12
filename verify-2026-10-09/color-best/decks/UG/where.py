import os,sys,re,glob,collections
def names(p):
    out=collections.Counter()
    for l in open(p,encoding='utf-8'):
        l=l.strip()
        m=re.match(r'^(\d+)x?\s+(.+?)(\s+\(.*)?$',l)
        if m: out[m.group(2).strip()]+=int(m.group(1))
    return out
coll=names('decks/paper/collection.txt')
decks={os.path.basename(g)[:-4]:names(g) for g in glob.glob('decks/paper/decks/*.txt')}
def where(n):
    used=sum(d.get(n,0) for d in decks.values())
    return coll.get(n,0),used,[k for k,d in decks.items() if n in d]
if __name__=='__main__':
    src=sys.argv[1]
    for n in (names(src) if src.endswith('.txt') else [src]):
        o,u,ds=where(n)
        tag='FREE' if o>u else ('RAID' if o>0 else 'UNOWNED')
        print(f'{tag:7} own={o} used={u} {n} {ds}')
