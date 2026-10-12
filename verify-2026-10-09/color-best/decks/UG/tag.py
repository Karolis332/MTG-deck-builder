import re,glob,os,sys
def rd(f):
    for l in open(f,encoding='utf-8'):
        m=re.match(r'\s*(\d+)\s+(.+?)\s*$',l)
        if m: yield m.group(2).lower(), int(m.group(1))
owned={}
for n,c in rd('../../../../decks/paper/collection.txt'): owned[n]=owned.get(n,0)+c
used={}; where={}
for f in glob.glob('../../../../decks/paper/decks/*.txt'):
    for n,c in rd(f):
        used[n]=used.get(n,0)+c; where.setdefault(n,[]).append(os.path.basename(f)[:-4])
def status(n):
    n=n.lower(); free=owned.get(n,0)-used.get(n,0)
    return ('FREE' if free>0 else 'RAID:'+','.join(where.get(n,[])) if owned.get(n) else 'UNOWNED')
if __name__=='__main__':
    for f in sys.argv[1:]:
        for n,c in rd(f):
            if n in ('forest','island'): continue
            s=status(n)
            if s!='FREE': print(s,'|',n)
