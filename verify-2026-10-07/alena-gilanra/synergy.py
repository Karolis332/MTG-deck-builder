"""Synergy density: for each nonland card, how many other nonland cards in the list it directly interacts with
(each pair counted once per card; a pair links if either card's payoff rule accepts the other).
Run: py verify-2026-10-07/alena-gilanra/synergy.py <list.txt> [...]"""
import json, os, re, sqlite3, statistics, sys

db = sqlite3.connect(os.path.join(os.environ['APPDATA'], 'the-black-grimoire', 'data', 'mtg-deck-builder.db'))

def load(path):
    cards = {}
    for line in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', line.strip())
        if not m: continue
        r = db.execute("select name, cmc, type_line, power, toughness from cards where name = ? or name like ? limit 1",
                       (m.group(2), m.group(2) + ' // %')).fetchone()
        name, mv, tl, p, t = r
        front = tl.split(' // ')[0]
        if 'Land' in front and 'Creature' not in front: continue
        pw = None if p is None else (6 if not str(p).lstrip('-').isdigit() else int(p))
        tg = None if t is None else (6 if not str(t).lstrip('-').isdigit() else int(t))
        cards[m.group(2)] = dict(mv=mv, creature='Creature' in front, legend='Legendary' in front, p=pw, t=tg)
    return cards

def pw(c, n): return c['creature'] and (c['p'] or 0) >= n
ANY = lambda c: c['creature']
PAYOFF = {  # payoff card -> which other cards it rewards
    'Gilanra, Caller of Wirewood': lambda c: c['mv'] >= 6,
    'Alena, Kessig Trapper': lambda c: pw(c, 5),
    'Selvala, Heart of the Wilds': lambda c: pw(c, 4), 'The Legend of Kyoshi': lambda c: pw(c, 5),
    'Traverse the Outlands': lambda c: pw(c, 5), 'Ghalta, Primal Hunger': ANY, 'Shriekwood Devourer': lambda c: pw(c, 5),
    "Garruk's Packleader": lambda c: pw(c, 3), 'Outcaster Trailblazer': lambda c: pw(c, 4),
    'Slinza, the Spiked Stampede': lambda c: pw(c, 4), 'Ruby, Daring Tracker': lambda c: pw(c, 4),
    "Master's Guidance": lambda c: pw(c, 4) or (c['creature'] and c['legend']), 'Ilysian Caryatid': lambda c: pw(c, 4),
    'Paleoloth': lambda c: pw(c, 5), 'Monstrous Vortex': lambda c: pw(c, 5), 'Spearbreaker Behemoth': lambda c: pw(c, 5),
    'Fling': lambda c: pw(c, 5), 'Ulvenwald Observer': lambda c: c['creature'] and (c['t'] or 0) >= 4,
    'Soul of the Harvest': ANY, 'Primordial Sage': ANY, 'Warstorm Surge': ANY, 'Terror of the Peaks': ANY,
    'Gruul Ragebeast': ANY, 'Garruk, Caller of Beasts': ANY, 'Cyclops of Eternal Fury': ANY, 'Surrak, the Hunt Caller': ANY,
    'Thunderfoot Baloth': ANY, 'Pyrewood Gearhulk': ANY, 'Avatar of Slaughter': ANY, 'Vastlands Scavenger': ANY,
    'Sweet-Gum Recluse': ANY, 'Conclave Sledge-Captain': ANY, 'Emergent Woodwurm': ANY,
    'Calamity, Galloping Inferno': lambda c: c['creature'] and not c['legend'],
}
NAMED = [  # explicit pairs: cascade, monarch, fight, landfall, power boosters for Alena
    ({'Aurora Phoenix'}, {'Boarding Party', 'Sweet-Gum Recluse'}),
    ({'Regal Behemoth'}, {'Dawnglade Regent'}),
    ({'Foe-Razer Regent'}, {'Gruul Ragebeast', 'Slinza, the Spiked Stampede', 'Nessian Wilds Ravager'}),
    ({'Rampaging Baloths'}, {"Nature's Lore", 'Farseek', 'Planar Engineering', 'Traverse the Outlands', 'Ulvenwald Hydra', 'Oblivion Sower'}),
    ({'Alena, Kessig Trapper'}, {'Sweet-Gum Recluse', 'Conclave Sledge-Captain', 'Emergent Woodwurm', 'Pyrewood Gearhulk', 'Thunderfoot Baloth'}),
]

def links(cards):
    out = {n: set() for n in cards}
    for a, f in PAYOFF.items():
        if a not in cards: continue
        for b, c in cards.items():
            if b != a and f(c): out[a].add(b); out[b].add(a)
    for xs, ys in NAMED:
        for a in xs & cards.keys():
            for b in ys & cards.keys(): out[a].add(b); out[b].add(a)
    return out

for path in sys.argv[1:]:
    cards = load(path); lk = links(cards)
    body = {n: len(v) for n, v in lk.items() if n not in ('Gilanra, Caller of Wirewood', 'Alena, Kessig Trapper')}
    low = sorted(body.items(), key=lambda kv: kv[1])[:5]
    print(f"{os.path.basename(path)}: {len(body)} nonland cards, links min {min(body.values())} median {statistics.median(body.values())}"
          f" | Gilanra {len(lk['Gilanra, Caller of Wirewood'])}, Alena {len(lk['Alena, Kessig Trapper'])}")
    print('  5 lowest:', ', '.join(f'{n} {k}' for n, k in low))
    if len(sys.argv) > 2 and path == sys.argv[-1]:
        new = [n for n in body if n not in load(sys.argv[1])]
        print('  new cards:', ', '.join(f'{n} {body[n]}' for n in new))
