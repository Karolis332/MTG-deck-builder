"""Swap screen on sim6: py screen.py <base.txt> --games N  "OUT => IN" ...  (OUT '-' = open slot, IN '-' = leave empty).
Each variant runs in its own process with the same seed; prints the metric rows and deltas vs the base."""
import os, re, statistics, sys, random, tempfile
from collections import Counter
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sim6

KEYS = ['k7', 'drop4', 'gil3', 'alena5', 'screw', 'flood', 'spells', 'big', 'gild', 'chain']
def measure(args):
    label, lines, games = args
    path = os.path.join(tempfile.gettempdir(), 'gscr_%d.txt' % (abs(hash(label)) % 10**9))
    open(path, 'w', encoding='utf-8').write('\n'.join(lines))
    cmd, names = sim6.load(path)
    S = {n: sim6.spec(n) for n in set(names) | set(cmd) | {'Tangled Vale', 'Forest', 'Mountain', 'Sheltered Thicket'}}
    for n in cmd: S[n]['tag'] = sim6.TAG.get(n, '')
    rng = random.Random(7); agg = Counter(); kills = []
    for _ in range(games):
        o = sim6.play(cmd, names, S, rng)
        for k, v in o.items():
            if k != 'kill': agg[k] += v
        kills.append(o['kill'])
    r = {k: agg[k] / games for k in KEYS}
    r['clock'] = statistics.mean(kills); r['med'] = statistics.median(kills); r['by7'] = sum(k <= 7 for k in kills) / games; r['by8'] = sum(k <= 8 for k in kills) / games
    r['n'] = len(names) + len(cmd)
    return label, r

def variant(base, swap):
    out, inn = [s.strip() for s in swap.split('=>')]
    lines = list(base)
    if out != '-':
        i = next(i for i, l in enumerate(lines) if re.sub(r'^\d+\s+', '', l) == out)
        m = re.match(r'^(\d+)\s+(.+)$', lines[i])
        if int(m.group(1)) > 1: lines[i] = f'{int(m.group(1)) - 1} {m.group(2)}'
        else: del lines[i]
    if inn != '-':
        j = next((i for i, l in enumerate(lines) if re.sub(r'^\d+\s+', '', l) == inn), None)
        if j is not None and inn in ('Forest', 'Mountain'):
            m = re.match(r'^(\d+)\s+(.+)$', lines[j]); lines[j] = f'{int(m.group(1)) + 1} {inn}'
        else: lines.append(f'1 {inn}')
    return lines

def fmt(r): return (f"k7 {r['k7']:.3f} T4 {r['drop4']:.3f} gil3 {r['gil3']:.3f} al5 {r['alena5']:.3f} scr {r['screw']:.3f} fl {r['flood']:.3f} "
                    f"sp {r['spells']:.2f} 6+ {r['big']:.2f} GD {r['gild']:.2f} AC {r['chain']:.2f} clk {r['clock']:.2f} by7 {r['by7']:.3f} n{r['n']}")
if __name__ == '__main__':
    a = sys.argv[1:]; games = 6000
    if '--games' in a: i = a.index('--games'); games = int(a[i + 1]); del a[i:i + 2]
    base = [l.strip() for l in open(a[0], encoding='utf-8') if l.strip()]
    jobs = [('BASE', base, games)] + [(s, variant(base, s), games) for s in a[1:]]
    with Pool(min(len(jobs), max(1, os.cpu_count() - 1))) as p: res = dict(p.map(measure, jobs))
    b = res['BASE']; print('BASE', fmt(b))
    for s, _, _ in jobs[1:]:
        r = res[s]; d = {k: r[k] - b[k] for k in b}
        print(f"{s[:58]:58s} k7 {d['k7']:+.3f} T4 {d['drop4']:+.3f} gil3 {d['gil3']:+.3f} scr {d['screw']:+.3f} sp {d['spells']:+.2f} 6+ {d['big']:+.2f} GD {d['gild']:+.2f} AC {d['chain']:+.2f} clk {d['clock']:+.2f} by7 {d['by7']:+.3f} n{r['n']}")
