import re,os,sqlite3,difflib,json,sys
db=sqlite3.connect(os.path.expandvars(r"%APPDATA%\the-black-grimoire\data\mtg-deck-builder.db"))
rows=db.execute("select name,color_identity,legalities from cards where type_line not like 'Card // Card' and layout not in ('art_series','token')").fetchall()
def norm(s): return re.sub(r"[^a-z0-9 ]","",s.lower().replace("&","and").replace("-"," "))
nm={}
for n,ci,leg in rows:
    for k in {n,n.split(' // ')[0]}: nm.setdefault(norm(k),(n,ci,leg))
keys=list(nm)
side='decks/brawl/cabbage-merchant-sidedeck.txt'
have=set(l.strip()[2:] for l in open(side,encoding='utf-8') if l.strip())
deck=set(l.strip().split(' ',1)[1] for l in open('decks/brawl/cabbage-merchant-current.txt',encoding='utf-8') if l.strip())
add=[]
for l in open(sys.argv[1],encoding='utf-8'):
    k=norm(l.strip())
    if not k: continue
    hit=nm.get(k); how='exact'
    if not hit:
        c=difflib.get_close_matches(k,keys,n=3,cutoff=0.7); hit=nm[c[0]] if c else None; how=f'fuzzy {c}'
    if not hit: print("UNRESOLVED",l.strip()); continue
    n,ci,leg=hit; b=json.loads(leg).get('brawl')
    note='ALREADY IN DECK' if n in deck else ('already in side' if n in have else '')
    print(f"{n} | {how} | ci={ci} brawl={b} {note}")
    if n not in have and n not in deck: add.append(n); have.add(n)
with open(side,'a',encoding='utf-8') as f:
    for n in add: f.write(f"1 {n}\n")
print("appended",len(add),"| sidedeck now",len(have))
