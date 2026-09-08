#!/usr/bin/env bash
# Pull full commander_card_stats rows from the VPS for every owned card × the paper-deck commanders
# into data/corpus-stats.json, for scripts/deck-edit-plan.ts. Run from the repo root in Git Bash.
set -euo pipefail
cd "$(dirname "$0")/.."
python - <<'PY'
import json, re, subprocess, sqlite3, os
names=set()
for f in ['decks/paper/collection.txt','decks/paper/open-cards.txt']+[os.path.join('decks/paper/decks',x) for x in os.listdir('decks/paper/decks')]+[os.path.join('decks/paper/proposals',x) for x in os.listdir('decks/paper/proposals') if x.endswith('.txt')]:
    for l in open(f,encoding='utf-8'):
        m=re.match(r'^\d+ (.+)$',l.strip())
        if m: names.add(m.group(1))
db=sqlite3.connect(os.path.join(os.environ['APPDATA'],'the-black-grimoire','data','mtg-deck-builder.db'))
full=set(names)
for n in list(names):
    r=db.execute("select name from cards where name like ? and layout not in ('art_series','token') order by length(name) limit 1",(n+' // %',)).fetchone()
    if r: full.add(r[0])
commanders=['Meren of Clan Nel Toth','Imotekh the Stormlord','Tazri, Beacon of Unity','Ramos, Dragon Engine','Marchesa, Dealer of Death','Riku of Many Paths']
q=lambda s:"'"+s.replace("'","''")+"'"
sql="select commander_name, card_name, inclusion_rate, coalesce(lift::text,'') from commander_card_stats where commander_name in (%s) and card_name in (%s);" % (",".join(map(q,commanders)),",".join(map(q,sorted(full))))
out=subprocess.run(['ssh','-i',os.path.expanduser('~/.ssh/id_ed25519_geo_vps'),'root@187.77.110.100','docker exec -i grimoire-cf-api-postgres-1 psql -U grimoire -d grimoire_cf -At -F"|"'],input=sql,capture_output=True,text=True,check=True).stdout
data={c:{} for c in commanders}
for line in out.splitlines():
    if not line: continue
    c,n,inc,lift=line.split('|')
    data[c][n]=[float(inc), float(lift) if lift else None]
json.dump(data,open('data/corpus-stats.json','w',encoding='utf-8'))
print('names queried',len(full),'| rows:',{c:len(v) for c,v in data.items()})
PY
