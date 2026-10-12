import re,sys
base,sw,out=sys.argv[1:4]
txt=open(base,encoding='utf-8').read()
head,deck=txt.split('\nDeck\n',1)
rows=[l for l in deck.splitlines() if l.strip()]
for l in open(sw,encoding='utf-8'):
    l=l.strip()
    if not l or l.startswith('#'): continue
    o,i=[x.strip() for x in l.split('=>')]
    idx=[k for k,r in enumerate(rows) if r=='1 '+o]
    assert idx, o
    rows[idx[0]]='1 '+i
rows.sort(key=lambda r: re.sub(r'^\d+ ','',r))
open(out,'w',encoding='utf-8').write(head+'\nDeck\n'+'\n'.join(rows)+'\n')
n=sum(int(r.split()[0]) for r in rows); print('main',n)
