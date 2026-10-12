import re,glob,os,sys
def names(f):
    out={}
    for l in open(f,encoding='utf-8'):
        m=re.match(r'^\s*(\d+)x?\s+(.+?)\s*$',l)
        if m: out[m.group(2)]=out.get(m.group(2),0)+int(m.group(1))
    return out
coll=names('decks/paper/collection.txt')
decks={os.path.basename(f)[:-4]:names(f) for f in glob.glob('decks/paper/decks/*.txt')}
def where(n):
    used={d:c[n] for d,c in decks.items() if n in c}
    return used
for l in open('verify-2026-10-09/color-best/decks/WG/pool.txt',encoding='utf-8').readlines()[2:]:
    parts=l.split('|')
    head=parts[0].split()
    nm=re.sub(r'^\d+x ','',' '.join(head[5:]) if head[4]!='-' else ' '.join(head[5:]))
    # name is everything after the price column
    m=re.match(r'^\s*\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(?:(\d+)x\s+)?(.+?)\s*$',parts[0])
    q=int(m.group(1) or 1); nm=m.group(2)
    used=where(nm); tot=sum(used.values())
    tag='FREE' if tot<q else 'RAID:'+','.join(used)
    print(tag[:40].ljust(40),'|'.join(p.strip() for p in [nm]+parts[1:])[:150].rstrip())
