"""Every free owned paper card legal in a mono-blue Commander deck, with DB oracle text -> pool.md.

    py verify-2026-10-02/urza/build-pool.py
Free = owned in decks/paper/collection.txt minus copies in other decks/paper/decks/*.txt.
Urza, Lord High Artificer is sleeved in Inspirit but listed: the operator hot-swaps it between the boxes.
"""
import json, os, re, sqlite3, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))
HOT_SWAP = {'Urza, Lord High Artificer'}
URZA_LIST = HERE / 'urza-list.txt'


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
box = {l.split(' ', 1)[1].strip() for l in (HERE / 'urza-box.txt').read_text(encoding='utf-8').splitlines() if l.strip()}
listed = {l.strip() for l in URZA_LIST.read_text(encoding='utf-8').splitlines() if l.strip()}

rows = []
for name, n in sorted(owned.items()):
    if n - used[name] <= 0 and name not in HOT_SWAP:
        continue
    r = db.execute(
        "select name, mana_cost, type_line, oracle_text, color_identity, legalities from cards where name = ? or name like ? "
        "order by (layout not in ('art_series','token')) desc limit 1", (name, name + ' // %')).fetchone()
    if not r or 'Basic Land' in (r[2] or ''):
        continue
    if not set(json.loads(r[4] or '[]')) <= {'U'} or json.loads(r[5] or '{}').get('commander') != 'legal':
        continue
    tag = ' [IN BOX]' if name in box else ''
    tag += ' [URZA LIST]' if name in listed else ''
    tag += ' [HOT-SWAP from Inspirit]' if name in HOT_SWAP else ''
    rows.append((name not in box, name not in listed, name, f"### {name}{tag} | {r[1] or ''} | {r[2]}\n{r[3] or ''}\n"))

rows.sort()
(HERE / 'pool.md').write_text(
    f"# Free mono-blue/colourless paper pool for the Urza deck ({len(rows)} cards, the operator's current box first, then the Urza list)\n\n"
    + '\n'.join(r[3] for r in rows), encoding='utf-8')
print(f'{len(rows)} cards -> pool.md ({sum(not r[0] for r in rows)} in the box, {sum(not r[1] for r in rows)} from the Urza list)')
