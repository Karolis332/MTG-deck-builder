import os,sqlite3,sys
sys.path.insert(0,os.path.dirname(__file__))
from src import load
DB=os.path.join(os.environ['APPDATA'],'the-black-grimoire','data','mtg-deck-builder.db')
c=sqlite3.connect(f'file:{DB}?mode=ro',uri=True)
names=list(load(sys.argv[1])) if sys.argv[1].endswith('.txt') else sys.argv[1:]
lim=int(os.environ.get('LIM','260'))
for n in names:
    r=c.execute("select name,mana_cost,type_line,oracle_text from cards where name=? limit 1",(n,)).fetchone()
    if not r: r=c.execute("select name,mana_cost,type_line,oracle_text from cards where name like ? limit 1",(n+' //%',)).fetchone()
    if not r: print('??',n); continue
    if 'Land' in (r[2] or '') and 'Creature' not in r[2] and os.environ.get('NOLAND'): continue
    print(f"{r[0]} {r[1]} [{r[2]}] {(r[3] or '').replace(chr(10),' / ')[:lim]}")
