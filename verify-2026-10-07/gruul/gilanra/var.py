"""Make a variant list: py var.py <base.txt> <out.txt> "Out>In" ... (Out/In may be empty for add/remove)."""
import re, sys
base, out, swaps = sys.argv[1], sys.argv[2], sys.argv[3:]
cards = []
for l in open(base, encoding='utf-8').read().splitlines():
    m = re.match(r'^(\d+)\s+(.+)$', l.strip())
    if m: cards += [m.group(2).strip()] * int(m.group(1))
for sw in swaps:
    a, b = sw.split('>')
    if a: cards.remove(a)
    if b: cards.append(b)
from collections import Counter
cmd = [c for c in cards if c in ('Gilanra, Caller of Wirewood', 'Alena, Kessig Trapper', 'Bumi, Unleashed')]
rest = Counter(c for c in cards if c not in cmd)
open(out, 'w', encoding='utf-8').write(''.join(f'1 {c}\n' for c in cmd) + ''.join(f'{n} {c}\n' for c, n in sorted(rest.items())))
print(out, len(cards))
