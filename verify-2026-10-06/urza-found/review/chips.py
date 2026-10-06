import os, re, sqlite3, sys
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
txt = open(sys.argv[1], encoding='utf-8').read()
names = sorted(set(re.findall(r'\[\[([^\]]+)\]\]', txt)))
listed = {re.match(r'\d+\s+(.+)', l.strip()).group(1) for l in open(sys.argv[2], encoding='utf-8') if l.strip()}
bad = [n for n in names if not c.execute("select 1 from cards where name = ? or name like ?", (n, n + ' // %')).fetchone()]
print('chips', len(names), 'bad', bad)
print('chipped but not in list', [n for n in names if n not in listed])
low = txt.lower()
print('never named', [n for n in sorted(listed) if n.lower() not in low and n != 'Island'])
for l in txt.splitlines():
    if l.startswith('=> '):
        steps = l[3:].split(' → ')
        for s in steps:
            w = len(re.sub(r'\[\[[^\]]+\]\]', 'X', s).split())
            if w > 12 or s.count('[[') > 1: print('STEP', w, s)
        if not 3 <= len(steps) <= 6: print('NSTEPS', len(steps), l[:60])
