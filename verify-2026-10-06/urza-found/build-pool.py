"""Free mono-blue/colourless paper pool for the Urza rebuild, 2026-10-06 -> pool.md (found cards first, then the 10-02 draft, then the rest).
Cards the operator could not locate are left out (UNAVAILABLE)."""
import json, os, re, sqlite3, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
HOT_SWAP = {'Urza, Lord High Artificer'}
FOUND = {l.split(' ', 1)[1].strip() for f in ('found-1-2.txt', 'found-3.txt') for l in (HERE / f).read_text(encoding='utf-8').splitlines() if l.strip()}
UNAVAILABLE = {'Entrancing Melody', 'Perplexing Test', 'Cityscape Leveler', 'Emeritus of Ideation', 'Sol Ring'}


def parse(p):
    out = collections.Counter()
    for line in p.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', line.strip())
        if m:
            out[m.group(2).strip()] += int(m.group(1))
    return out


owned = parse(ROOT / 'decks/paper/collection.txt')
used = collections.Counter()
for f in (ROOT / 'decks/paper/decks').glob('*.txt'):
    used.update(parse(f))
box = {l.split(' ', 1)[1].strip() for l in (ROOT / 'verify-2026-10-02/urza/final.txt').read_text(encoding='utf-8').splitlines() if l.strip()}
listed = FOUND

rows = []
for name, n in sorted(owned.items()):
    if name in UNAVAILABLE or (n - used[name] <= 0 and name not in HOT_SWAP):
        continue
    r = db.execute(
        "select name, mana_cost, type_line, oracle_text, color_identity, legalities from cards where name = ? or name like ? "
        "order by (layout not in ('art_series','token')) desc limit 1", (name, name + ' // %')).fetchone()
    if not r or 'Basic Land' in (r[2] or ''):
        continue
    if not set(json.loads(r[4] or '[]')) <= {'U'} or json.loads(r[5] or '{}').get('commander') != 'legal':
        continue
    tag = ' [IN 10-02 DRAFT]' if name in box else ''
    tag += ' [FOUND]' if name in listed else ''
    tag += ' [HOT-SWAP from Inspirit]' if name in HOT_SWAP else ''
    rows.append((name not in listed, name not in box, name, f"### {name}{tag} | {r[1] or ''} | {r[2]}\n{r[3] or ''}\n"))

rows.sort()
(HERE / 'pool.md').write_text(
    f"# Free mono-blue/colourless paper pool for the Urza deck ({len(rows)} cards, found cards first, then the 10-02 draft; unavailable: ' + ', '.join(sorted(UNAVAILABLE)) + ')\n\n"
    + '\n'.join(r[3] for r in rows), encoding='utf-8')
print(f'{len(rows)} cards -> pool.md ({sum(not r[0] for r in rows)} found, {sum(not r[1] for r in rows)} in the 10-02 draft)')
