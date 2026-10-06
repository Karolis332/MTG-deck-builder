import os, re, sqlite3
G = open('.claude/skills/deck-building/reference/decks/inspirit-flagship-vessel.md', encoding='utf-8').read()
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
print('lines', len(G.splitlines()))
chips = set(re.findall(r'\[\[(.+?)\]\]', G))
bad = [n for n in chips if not c.execute("select 1 from cards where name=? or name like ?", (n, n + ' // %')).fetchone()]
print('chips', len(chips), 'bad', bad)
for l in G.splitlines():
    if l.startswith('=> '):
        steps = l[3:].split(' → ')
        issues = []
        if not 3 <= len(steps) <= 6: issues.append(f'{len(steps)} steps')
        for s in steps:
            w = len(re.sub(r'\[\[(.+?)\]\]', 'X', s).replace('**', '').split())
            if w > 12: issues.append(f'{w} words: {s[:40]}')
            if s.count('[[') > 1: issues.append('2 chips: ' + s[:40])
        if issues: print('FLOW', issues)
    if l.startswith('|'):
        if l.count('|') not in (5,4): print('TABLE cols?', l[:60])
names = []
for line in open('verify-2026-10-06/urza-found/inspirit-hotswap.txt', encoding='utf-8'):
    m = re.match(r'\d+\s+(.+)', line.strip())
    if m: names.append(m.group(1))
lands = {r[0] for r in c.execute("select name from cards where type_line like '%Land%'")}
missing = [n for n in names if n not in lands and n not in G]
print('nonland not named in full:', missing)
print('lands named:', [n for n in names if n in lands and n in G])
