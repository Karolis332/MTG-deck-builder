"""Write <slug>-final.txt per deck = decks/paper/decks/<slug>.txt with every non-HELD KEEP swap of final-swaps.json applied.
Read-only on the deck files. Run: PYTHONIOENCODING=utf-8 py verify-2026-09-28/deck-audit/apply-swaps.py
"""
import collections, json, os, re

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(D, '..', '..'))
data = json.load(open(os.path.join(D, 'final-swaps.json'), encoding='utf-8'))
for deck in data['decks']:
    lines = [l.strip() for l in open(os.path.join(ROOT, 'decks', 'paper', 'decks', f"{deck['slug']}.txt"), encoding='utf-8') if l.strip()]
    cards = collections.OrderedDict((re.sub(r'^\d+\s+', '', l), int(l.split()[0])) for l in lines)
    for s in deck['swaps']:
        if s['verdict'] != 'KEEP' or (s.get('note') or '').startswith(('HELD', 'OPTIONAL')):
            continue
        if s['out']:
            assert cards.get(s['out'], 0) > 0, f"{deck['slug']}: OUT not in deck: {s['out']}"
            cards[s['out']] -= 1
        if s['in']:
            assert s['in'] not in cards or s['in'] in {'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'}, f"{deck['slug']}: IN already in deck: {s['in']}"
            cards[s['in']] = cards.get(s['in'], 0) + 1
    out = [f'{q} {n}' for n, q in cards.items() if q > 0]
    open(os.path.join(D, f"{deck['slug']}-final.txt"), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    total = sum(cards.values())
    assert total == 100, f"{deck['slug']}: {total} cards"
    print(deck['slug'], total)
