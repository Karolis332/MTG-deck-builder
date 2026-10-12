import re,glob,sys,os
def parse(p):
    d={}
    for l in open(p,encoding='utf-8'):
        m=re.match(r'^(\d+)\s+(.+?)\s*$',l)
        if m: d[m.group(2)]=d.get(m.group(2),0)+int(m.group(1))
    return d
own=parse('decks/paper/collection.txt')
use={}
for f in glob.glob('decks/paper/decks/*.txt'):
    s=os.path.basename(f)[:-4]
    for n,c in parse(f).items(): use.setdefault(n,[]).append((s,c))
def status(n):
    o=own.get(n,0); u=sum(c for _,c in use.get(n,[]))
    if o==0: return 'UNOWNED'
    if o>u: return 'FREE(%d/%d)'%(o-u,o)
    return 'RAID:'+','.join(s for s,_ in use[n])
if __name__=='__main__':
    for l in open(sys.argv[1],encoding='utf-8'):
        m=re.match(r'^(\d+)\s+(.+?)\s*$',l)
        if m: print(status(m.group(2)),'|',m.group(2))
