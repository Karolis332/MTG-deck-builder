"""Colour-identity check against BOTH partners (the gate reads only the first commander). Usage: py identity.py <list.txt>"""
import sqlite3, os, json, sys, re
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
bad, total = [], 0
for l in open(sys.argv[1], encoding='utf-8').read().splitlines():
    m = re.match(r'^(\d+)\s+(.+)$', l.strip())
    if not m: continue
    total += int(m.group(1)); n = m.group(2)
    r = db.execute("select color_identity from cards where name = ? or name like ? limit 1", (n, n + ' // %')).fetchone()
    if not r or not set(json.loads(r[0] or '[]')) <= {'R', 'G'}: bad.append(n)
print(f'{total} cards; outside R/G: {bad or "none"}')
