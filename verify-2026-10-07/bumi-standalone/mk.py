"""Write variant lists: sleeved list + swaps. py mk.py -> var/<name>.txt. Basics move by count ('Forest' adds one)."""
import os, re, sys
from collections import Counter
here = os.path.dirname(os.path.abspath(__file__))
FIX = [('Sheltering Landscape', None), ('Tranquil Landscape', None), ('Twisted Landscape', None)]

def read(path):
    c, order = Counter(), []
    for l in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^(\d+)\s+(.+)$', l.strip())
        if m: c[m.group(2)] += int(m.group(1)); order.append(m.group(2))
    return c, order

def write(name, base, swaps):
    c, order = read(os.path.join(here, base))
    for out, inn in swaps:
        if out:
            assert c[out] > 0, (name, out); c[out] -= 1
        if inn:
            assert inn in ('Forest', 'Mountain') or c[inn] == 0, (name, inn); c[inn] += 1
            if inn not in order: order.append(inn)
    assert sum(c.values()) == 100, (name, sum(c.values()))
    with open(os.path.join(here, 'var', name + '.txt'), 'w', encoding='utf-8') as f:
        for n in order:
            if c[n]: f.write(f'{c[n]} {n}\n')

def land(a, b, d):
    return [('Sheltering Landscape', a), ('Tranquil Landscape', b), ('Twisted Landscape', d)]

VARIANTS = {
    # land fixes on the sleeved list
    'L1': land('Terramorphic Expanse', 'Riveteers Overlook', 'Lair of the Hydra'),
    'L2': land('Terramorphic Expanse', 'Riveteers Overlook', 'Forest'),
    'L3': land('Terramorphic Expanse', 'Forest', 'Mountain'),
    'L4': land('Forest', 'Forest', 'Mountain'),
    'L5': land('Sheltered Thicket', 'Fabled Passage', 'Evolving Wilds'),
    'L6': land('Terramorphic Expanse', 'Riveteers Overlook', 'Yavimaya, Cradle of Growth'),
    'L7': land('Forest', 'Mountain', 'Lair of the Hydra'),
}
if __name__ == '__main__':
    os.makedirs(os.path.join(here, 'var'), exist_ok=True)
    base = sys.argv[1] if len(sys.argv) > 1 else 'sleeved.txt'
    extra = {}
    if len(sys.argv) > 2:  # py mk.py <base> name:out>in;out>in ...
        for spec in sys.argv[2:]:
            nm, sw = spec.split(':', 1)
            extra[nm] = [tuple((x or None) for x in p.split('>')) for p in sw.split(';')]
    for nm, sw in (extra or VARIANTS).items(): write(nm, base, sw)
    print('wrote', ', '.join(extra or VARIANTS))
