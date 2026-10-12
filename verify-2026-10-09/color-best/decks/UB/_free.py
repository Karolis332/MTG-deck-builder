import re,glob,sys
def names(path):
    out={}
    for l in open(path,encoding='utf-8'):
        m=re.match(r'^\s*(\d+)x?\s+(.+?)\s*$',l)
        if m: out[m.group(2).split(' (')[0].strip()]=out.get(m.group(2),0)+int(m.group(1))
    return out
sleeved={}
for f in glob.glob('decks/paper/decks/*.txt'):
    for n in names(f): sleeved.setdefault(n.lower(),[]).append(__import__('os').path.basename(f)[:-4])
lst=names(sys.argv[1])
for n in lst:
    k=n.lower(); fr=n.split(' // ')[0].lower()
    d=sleeved.get(k) or sleeved.get(fr)
    if d: print('RAID',n,d)
print('---- count-aware')
coll=names('decks/paper/collection.txt'); collk={k.lower():v for k,v in coll.items()}
use={}
for f in glob.glob('decks/paper/decks/*.txt'):
    for n,c in names(f).items(): use[n.lower()]=use.get(n.lower(),0)+c
for n,c in lst.items():
    k=n.lower()
    own=collk.get(k, collk.get(n.split(' // ')[0].lower(),0)); u=use.get(k,use.get(n.split(' // ')[0].lower(),0))
    if own-u < c: print('NEEDS RAID',n,'own',own,'sleeved',u, sleeved.get(k) or sleeved.get(n.split(' // ')[0].lower()))
