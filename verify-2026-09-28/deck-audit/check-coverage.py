"""Safety net: every pool card with EDHREC rank <= 3000, price >= $4 or the game-changer flag must be
named in that deck's report. Also: proposed list = 100 cards, every ADD is in the pool, every OUT was in
the deck, no card added to two decks.
Run: PYTHONIOENCODING=utf-8 py verify-2026-09-28/deck-audit/check-coverage.py
"""
import collections, glob, json, os, re

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


# lost by the operator: never recommended, so no verdict needed
LOST = {"Innkeeper's Talent", 'Konstrari Annex', 'Boros Charm'}
FRA = os.path.join(D, 'fra-todo.json')
fra_todo = json.load(open(FRA, encoding='utf-8')) if os.path.exists(FRA) else {}
adds = collections.defaultdict(list)
for report in sorted(glob.glob(os.path.join(D, '*-report.md'))):
    slug = os.path.basename(report)[:-len('-report.md')]
    pool = entries(os.path.join(D, f'{slug}-pool.md'))
    deck = entries(os.path.join(D, f'{slug}-deck.md'))
    text = norm(open(report, encoding='utf-8').read())
    need = [n for n, (q, r, p, gc) in pool.items() if (r is not None and r <= 3000) or (p is not None and p >= 4) or gc]
    # new-set cards have no rank/price yet: fra-todo.json lists the open Reality Fracture cards per deck
    need += [n for n in fra_todo.get(slug, []) if n not in need]
    need = [n for n in need if n not in LOST]
    missing = [n for n in need if norm(n.split(' // ')[0]) not in text]
    print(f'== {slug}: {len(need)} criterion cards, {len(missing)} missing from the report')
    for n in missing:
        print('   MISSING', n, pool[n][1:] if n in pool else 'fra-todo')
    # unregistered Reality Fracture cards: every one needs a line in <slug>-fra-verdicts.md
    assumed_path = os.path.join(D, f'{slug}-fra-assumed.md')
    if os.path.exists(assumed_path):
        assumed = re.findall(r'^- \[[A-Z-]+\] \*\*(.+?)\*\*', open(assumed_path, encoding='utf-8').read(), re.M)
        verdicts_path = os.path.join(D, f'{slug}-fra-verdicts.md')
        vtext = norm(open(verdicts_path, encoding='utf-8').read()) if os.path.exists(verdicts_path) else ''
        vmiss = [n for n in assumed if norm(n) not in vtext]
        print(f'   unregistered FRA: {len(assumed)} cards, {len(vmiss)} without a verdict')
        for n in vmiss:
            print('   NO VERDICT', n)
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
