import os,sqlite3,sys,re
sys.path.insert(0,os.path.dirname(__file__))
from src import load
DB=os.path.join(os.environ['APPDATA'],'the-black-grimoire','data','mtg-deck-builder.db')
c=sqlite3.connect(f'file:{DB}?mode=ro',uri=True)
for p in sys.argv[1:]:
    L=load(p); hit=[];cre=0
    for n in L:
        r=c.execute("select type_line,oracle_text from cards where name=? or name like ? limit 1",(n,n+' //%')).fetchone()
        if not r: continue
        t,o=r[0] or '',r[1] or ''
        if 'Creature' in t: cre+=1
        if re.search(r'\b(Cleric|Rogue|Warrior|Wizard|Ally|Shapeshifter)\b',t) and ('Changeling' in o or re.search(r'\b(Cleric|Rogue|Warrior|Wizard|Ally)\b',t.split('—')[-1])) or 'also a Cleric, Rogue, Warrior, and Wizard' in o:
            hit.append(n)
    print(p.split('/')[-1],'creatures',cre,'dig-hits',len(hit))
