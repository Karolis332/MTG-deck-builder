import os, re, sqlite3, sys
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
NOT_TOKEN = "layout not in ('art_series','token','double_faced_token','emblem')"
coll = open('../../decks/paper/collection.txt', encoding='utf-8').read()
for f in sys.argv[1:]:
    print('##', f)
    for line in open(f, encoding='utf-8'):
        m = re.match(r'^(\d+)\s+(.+)$', line.strip())
        if not m: continue
        n = m.group(2)
        r = c.execute(f"select mana_cost, type_line, edhrec_rank from cards where (name=? or name like ? || ' // %') and {NOT_TOKEN} order by (edhrec_rank is null), edhrec_rank limit 1", (n, n)).fetchone()
        own = 'OWNED' if re.search(r'^\d+\s+' + re.escape(n) + r'\s*$', coll, re.M) else ''
        print(f'{n} | {r[0] if r else "?"} | {(r[1] if r else "?")[:40]} | #{r[2] if r else "?"} {own}')
