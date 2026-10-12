"""Deltas vs the first line of an omo_swaps.py log. Usage: py omo_delta.py <log>"""
import re, sys
rows = []
for l in open(sys.argv[1], encoding='utf-8'):
    sw, rest = l.split(' | ', 1)
    rows.append((sw, [float(x) for x in re.findall(r'(?<![\w(])(\d+\.\d+)', rest)]))
base = rows[0][1]
print('base', ' '.join(f'{k}={v}' for k, v in zip(['k7', 'd4', 'f5', 'f6', 'spl', 'scr', 'fl', 'flm', 'idle', 'xd', 'free', 'n6', 'lo7'], base)))
for sw, n in rows[1:]:
    d = [a - b for a, b in zip(n, base)]
    print(f'{sw[:70]:70s} k7 {d[0]:+.3f} d4 {d[1]:+.3f} f5 {d[2]:+.3f} f6 {d[3]:+.3f} spl {d[4]:+.2f} scr {d[5]:+.3f} fl {d[6]:+.3f} idle {d[8]:+.3f} xd {d[9]:+.2f} n6 {d[11]:+.2f}')
