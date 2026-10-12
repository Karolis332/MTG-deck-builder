"""Table of var/<name>.o.out (open goldfish) + .c.out (one chump per combat), deltas vs a reference run. py summ.py [ref] [names...]"""
import glob, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
PAT = re.compile(r'keep7 ([\d.]+) \| 4th land T4 ([\d.]+) \| Bumi T5 ([\d.]+).*screw ([\d.]+) \| flood ([\d.]+) \| spells T1-8 ([\d.]+)'
                 r' \| clock median T(\d+) \(P<=T6 ([\d.]+), <=T7 ([\d.]+), <=T8 ([\d.]+), mean ([\d.]+)\)')
KEYS = ['k7', 'l4', 'b5', 'scr', 'fl', 'sp', 'med', 't6', 't7', 't8', 'mean']

def parse(path):
    try: m = PAT.search(open(path, encoding='utf-8').read())
    except FileNotFoundError: return None
    return dict(zip(KEYS, map(float, m.groups()))) if m else None

def row(n):
    return parse(os.path.join(here, 'var', n + '.o.out')), parse(os.path.join(here, 'var', n + '.c.out'))

ref = sys.argv[1] if len(sys.argv) > 1 else 'base'
names = sys.argv[2:] or sorted(os.path.basename(p)[:-6] for p in glob.glob(os.path.join(here, 'var', '*.o.out')))
r0, c0 = row(ref)
print(f"{'list':8s} keep7  4thT4  BumiT5 screw  flood spells | open med P<=T6 P<=T7 mean | chump med P<=T7 P<=T8 mean | d(open T6, mean; chump T7, mean)")
for n in names:
    o, c = row(n)
    if not o or not c: print(n, 'pending'); continue
    d = f"{o['t6'] - r0['t6']:+.3f} {o['mean'] - r0['mean']:+.2f}; {c['t7'] - c0['t7']:+.3f} {c['mean'] - c0['mean']:+.2f}"
    print(f"{n:8s} {o['k7']:.3f} {o['l4']:.3f} {o['b5']:.3f} {o['scr']:.3f} {o['fl']:.3f} {o['sp']:5.2f} | T{o['med']:.0f} {o['t6']:.3f} {o['t7']:.3f} {o['mean']:.2f}"
          f" | T{c['med']:.0f} {c['t7']:.3f} {c['t8']:.3f} {c['mean']:.2f} | {d}")
