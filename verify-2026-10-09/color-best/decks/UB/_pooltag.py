import re,glob,os,sys
exec(open('verify-2026-10-09/color-best/decks/UB/_free.py').read().split("sleeved={}")[0])
coll={k.lower():v for k,v in names('decks/paper/collection.txt').items()}
use={};where={}
for f in glob.glob('decks/paper/decks/*.txt'):
    for n,c in names(f).items():
        use[n.lower()]=use.get(n.lower(),0)+c; where.setdefault(n.lower(),[]).append(os.path.basename(f)[:-4].split('-')[0])
inlist={n.lower() for n in names('verify-2026-10-09/color-best/lists/UB-uldaros-theorix.txt')}
for l in open('verify-2026-10-09/color-best/decks/UB/pool.txt',encoding='utf-8').read().splitlines()[2:]:
    parts=l.split(' | ')
    if len(parts)<3: continue
    head=parts[0]; typ=parts[1]
    m=re.search(r'(?:\d+x )?([^\s].*)$', head[33:]) 
    nm=head[33:].strip(); nm=re.sub(r'^\d+x ','',nm)
    k=nm.lower(); f=k.split(' // ')[0]
    own=coll.get(k,coll.get(f,0)); u=use.get(k,use.get(f,0))
    tag='FREE' if own-u>0 else 'RAID:'+','.join(where.get(k,where.get(f,[])))
    if 'Land' in typ and sys.argv[1]!='land': continue
    if 'Land' not in typ and sys.argv[1]=='land': continue
    print(('*' if k in inlist else ' '), tag[:22].ljust(22), nm[:40].ljust(40), typ[:10], '|', parts[2][:150] if len(parts)>2 else '')
