"""Write a variant list: py mk.py <base.txt> <out.txt> "Out=>In" ... (Out or In may be empty; counts kept for basics)."""
import re, sys
base, out, swaps = sys.argv[1], sys.argv[2], sys.argv[3:]
cards = []
for l in open(base, encoding='utf-8').read().splitlines():
    m = re.match(r'^(\d+)\s+(.+)$', l.strip())
    if m: cards += [m.group(2).strip()] * int(m.group(1))
for s in swaps:
    o, i = s.split('=>')
    if o: cards.remove(o.strip())
    if i: cards.append(i.strip())
seen, lines = {}, []
for c in cards: seen[c] = seen.get(c, 0) + 1
open(out, 'w', encoding='utf-8').write(''.join(f'{n} {c}\n' for c, n in seen.items()))
print(out, len(cards))
