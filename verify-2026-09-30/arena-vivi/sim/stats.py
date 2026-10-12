"""Validate final.txt against pool/deck files and print health stats for current vs final."""
import re, glob, os, sys
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
entries = {}
for f in sorted(glob.glob(os.path.join(D, 'pool-0*.md'))) + [os.path.join(D, 'deck.md')]:
    lines = open(f, encoding='utf-8').read().split('\n')
    for i, l in enumerate(lines):
        m = re.match(r'- \d+x \*\*(.+?)\*\* ?(\{[^—]*\})? ?\(MV (\d+)\) — ([^—]+?) —', l)
        if m:
            name = m.group(1); cost = m.group(2) or ''; mv = int(m.group(3)); types = m.group(4).strip()
            entries[name] = dict(cost=cost, mv=mv, types=types, text=lines[i+1].strip(), src=os.path.basename(f))
            front = name.split(' // ')[0]
            entries.setdefault(front, entries[name])

def parse(path):
    out = []
    for l in open(path, encoding='utf-8'):
        m = re.match(r'(\d+) (.+)', l.strip())
        if m: out += [m.group(2)] * int(m.group(1))
    return out

def is_land(e):
    return e['types'].split(' // ')[0].strip().startswith(('Land', 'Basic Land', 'Legendary Land', 'Artifact Land', 'Legendary Snow Land'))
def has_land_face(e):
    return '// Land' in e['types'] or 'Land //' in e['types']
def is_creature(e):
    return 'Creature' in e['types'].split(' // ')[0]

for label, path in (('current', 'current.txt'), ('final', 'final.txt')):
    cards = parse(os.path.join(D, path))
    missing = [c for c in cards if c not in entries and c != 'A-Vivi Ornitier']
    if missing: print(label, 'NOT IN POOL/DECK:', missing)
    dup = {c for c in cards if cards.count(c) > 1 and c not in ('Island', 'Mountain')}
    if dup: print(label, 'DUPLICATES:', dup)
    n = len(cards)
    es = [entries[c] for c in cards if c in entries]
    lands = [e for e in es if is_land(e)]
    mdfc = [e for e in es if has_land_face(e) and not is_land(e)]
    nonland = [e for e in es if not is_land(e)]
    creatures = [e for e in nonland if is_creature(e)]
    noncre = [e for e in nonland if not is_creature(e)]
    avg = sum(e['mv'] for e in nonland) / len(nonland)
    print(f'{label}: {n} cards (+commander), lands {len(lands)}, land-face MDFC {len(mdfc)}, nonland {len(nonland)}, creatures {len(creatures)}, noncreature spells {len(noncre)}, avg MV nonland {avg:.2f}')
    mvs = {}
    for e in nonland: mvs[e['mv']] = mvs.get(e['mv'], 0) + 1
    print('  MV curve:', dict(sorted(mvs.items())))
