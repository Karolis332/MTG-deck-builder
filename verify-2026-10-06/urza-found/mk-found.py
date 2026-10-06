"""All cards the operator found on 2026-10-06 -> found-all.md with DB text and where each sits."""
import os, re, sqlite3, pathlib, collections
HERE = pathlib.Path(__file__).resolve().parent; ROOT = HERE.parents[1]
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
names = []
for f in ('found-1-2.txt', 'found-3.txt'):
    for l in (HERE / f).read_text(encoding='utf-8').splitlines():
        n = l.split(' ', 1)[1].strip()
        if n not in names: names.append(n)
draft = {l.split(' ', 1)[1].strip() for l in (ROOT / 'verify-2026-10-02/urza/final.txt').read_text(encoding='utf-8').splitlines() if l.strip()}
decks = collections.defaultdict(list)
for f in (ROOT / 'decks/paper/decks').glob('*.txt'):
    for l in f.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^\d+\s+(.+)$', l.strip())
        if m: decks[m.group(1).strip()].append(f.stem)
out = [f'# Found cards, 2026-10-06 ({len(names)} unique; all owned, paper)\n']
for n in names:
    r = db.execute("select name, mana_cost, type_line, power, toughness, loyalty, oracle_text from cards where name = ? or name like ? || ' // %' limit 1", (n, n)).fetchone()
    where = ['IN URZA DRAFT'] if n in draft else []
    where += [f'sleeved in {d}' for d in decks.get(n, [])]
    pt = f' {r[3]}/{r[4]}' if r and r[3] else (f' loyalty {r[5]}' if r and r[5] else '')
    out.append(f"### {n} | {r[1] if r else '?'} | {r[2] if r else '?'}{pt} | {', '.join(where) or 'free'}\n{(r[6] or '').strip() if r else 'NOT IN DB'}\n")
(HERE / 'found-all.md').write_text('\n'.join(out), encoding='utf-8')
print(len(names), 'cards;', sum('NOT IN DB' in o for o in out), 'missing;', sum('IN URZA DRAFT' in o for o in out), 'in draft;', sum('sleeved in' in o for o in out), 'sleeved elsewhere')
