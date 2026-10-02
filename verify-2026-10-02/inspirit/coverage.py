"""List every owned card free for Inspirit (UWR, commander-legal) that the round-2 report never names.

    py verify-2026-10-02/inspirit/coverage.py
"""
import json, os, re, sqlite3, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))

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
    if f.stem != 'inspirit-flagship-vessel':  # Inspirit's own cards are available to its rebuild
        used.update(parse(f).keys())

text = (HERE / 'build-report-2.md').read_text(encoding='utf-8') + (HERE / 'inspirit-proposed-2.txt').read_text(encoding='utf-8')
missing = []
for name, n in sorted(owned.items()):
    if n - used[name] <= 0:
        continue
    row = db.execute(
        "select name, color_identity, legalities, type_line, mana_cost from cards where name = ? or name like ? "
        "order by (layout not in ('art_series','token')) desc limit 1", (name, name + ' // %')).fetchone()
    if not row or 'Basic Land' in (row[3] or ''):
        continue
    ci = set(json.loads(row[1] or '[]'))
    legal = json.loads(row[2] or '{}').get('commander') == 'legal'
    if not legal or not ci <= {'U', 'R', 'W'}:
        continue
    front = name.split(' // ')[0]
    if front not in text and name not in text:
        missing.append(f'{front} | {row[4] or ""} | {row[3]}')

print(f'{len(missing)} free UWR cards with no line in build-report-2.md:')
print('\n'.join(missing))
