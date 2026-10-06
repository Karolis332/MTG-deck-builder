import os, re, sqlite3, pathlib
DB = os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db')
c = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
pool = pathlib.Path('verify-2026-10-06/urza-found/pool.md').read_text(encoding='utf-8')
names = re.findall(r'^### (.+?) (?:\[|\|)', pool, re.M)
texts = {}
for n in names:
    n = n.strip()
    r = c.execute("select name, oracle_text from cards where name=? or name like ? limit 1", (n, n+' //%')).fetchone()
    if r: texts[r[0]] = (r[1] or '')
alltext = '\n'.join(texts.values())
rep = pathlib.Path('verify-2026-10-06/urza-found/build-report.md').read_text(encoding='utf-8')
bad = 0
for ln, line in enumerate(rep.splitlines(), 1):
    for q in re.findall(r'"([^"]+)"', line):
        parts = [p.strip(' .') for p in re.split(r'…|\.\.\.', q) if p.strip(' .')]
        ok = all(p in alltext for p in parts)
        if not ok:
            bad += 1; print(f'L{ln} NOT FOUND: "{q}"')
print('bad', bad)
