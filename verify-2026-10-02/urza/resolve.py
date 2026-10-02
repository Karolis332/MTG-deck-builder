"""Resolve the operator's typed Urza box list -> urza-box.txt (canonical) + ownership status per card."""
import difflib, os, re, sqlite3, collections, pathlib
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
rows = db.execute("select distinct name from cards where layout not in ('art_series','token','double_faced_token','emblem')").fetchall()
names = [r[0] for r in rows]
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower().split(' // ')[0]).strip()
index = {}
for n in names:
    index.setdefault(norm(n), n)
keys = list(index)
def parse(p):
    c = collections.Counter()
    for l in p.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if m: c[m.group(2).strip()] += int(m.group(1))
    return c
owned = parse(ROOT / 'decks/paper/collection.txt')
used = collections.defaultdict(list)
for f in (ROOT / 'decks/paper/decks').glob('*.txt'):
    for n, q in parse(f).items(): used[n] += [f.stem.split('-')[0]] * q
out = []
for line in (HERE / 'urza-box-raw.txt').read_text(encoding='utf-8').splitlines():
    m = re.match(r'^\s*(\d+)?\s*(.+?)\s*$', line)
    if not m or not m.group(2): continue
    q, raw = int(m.group(1) or 1), m.group(2)
    k = norm(raw)
    hit = index.get(k) or (difflib.get_close_matches(k, keys, n=1, cutoff=0.75) or [None])[0]
    name = index.get(hit, hit) if hit else None
    if not name:
        print(f'?? UNRESOLVED: {raw}'); continue
    col = next((x for x in owned if x == name or x.split(' // ')[0] == name.split(' // ')[0]), name)
    o, u = owned.get(col, 0), used.get(col, [])
    status = 'basic' if name in ('Island',) else 'NEW' if o == 0 else 'free' if o - len(u) >= q else f'CONFLICT owned {o}, in {",".join(u)}'
    flag = '' if norm(raw) == norm(name) else f'   <- typed "{raw}"'
    print(f'{q} {col} | {status}{flag}')
    out.append(f'{q} {col}')
(HERE / 'urza-box.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('total', sum(int(l.split()[0]) for l in out), 'lines', len(out))
