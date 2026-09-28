"""Safety net: every pool card with EDHREC rank <= 3000, price >= $4 or the game-changer flag must be
named in that deck's report. Also: proposed list = 100 cards, every ADD is in the pool, every OUT was in
the deck, no card added to two decks.
Run: PYTHONIOENCODING=utf-8 py verify-2026-09-28/deck-audit/check-coverage.py
"""
import collections, glob, os, re

D = os.path.dirname(os.path.abspath(__file__))
ROW = re.compile(r'^- (\d+)x \*\*(.+?)\*\* .*?EDHREC #(\d+|unranked) — \$([\d.]+|\?)( GAME-CHANGER)?')


def entries(path):
    out = {}
    for line in open(path, encoding='utf-8'):
        m = ROW.match(line)
        if m:
            q, name, rank, price, gc = m.groups()
            out[name] = (int(q), None if rank == 'unranked' else int(rank), None if price == '?' else float(price), bool(gc))
    return out


def names(path):
    out = collections.Counter()
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        m = re.match(r'^(\d+)x?\s+(.+)$', line)
        if m:
            out[m.group(2)] += int(m.group(1))
    return out


def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


adds = collections.defaultdict(list)
for report in sorted(glob.glob(os.path.join(D, '*-report.md'))):
    slug = os.path.basename(report)[:-len('-report.md')]
    pool = entries(os.path.join(D, f'{slug}-pool.md'))
    deck = entries(os.path.join(D, f'{slug}-deck.md'))
    text = norm(open(report, encoding='utf-8').read())
    need = [n for n, (q, r, p, gc) in pool.items() if (r is not None and r <= 3000) or (p is not None and p >= 4) or gc]
    missing = [n for n in need if norm(n.split(' // ')[0]) not in text]
    print(f'== {slug}: {len(need)} criterion cards, {len(missing)} missing from the report')
    for n in missing:
        print('   MISSING', n, pool[n][1:])
    prop_path = os.path.join(D, f'{slug}-proposed.txt')
    if not os.path.exists(prop_path):
        print('   no proposed list'); continue
    prop = names(prop_path)
    total = sum(prop.values())
    pool_n = {n.split(' // ')[0]: n for n in pool}
    deck_n = {n.split(' // ')[0] for n in deck}
    added = [n for n in prop if n not in deck_n and n not in deck]
    removed = [n for n in deck_n if n not in prop and n not in {k.split(' // ')[0] for k in prop}]
    bad = [n for n in added if n not in pool and n not in pool_n and n not in {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'}]
    print(f'   proposed total {total}; +{len(added)} -{len(removed)}; adds not in pool: {bad or "none"}')
    for n in added:
        adds[n].append(slug)
dup = {n: s for n, s in adds.items() if len(s) > 1 and n not in {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'}}
print('cross-deck duplicate adds:', dup or 'none')
