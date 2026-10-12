"""Final metrics: py metrics.py --games N list1 list2 ... (sim6, seed 7, one process per list)."""
import sys, os
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import screen
if __name__ == '__main__':
    a = sys.argv[1:]; i = a.index('--games'); g = int(a[i + 1]); del a[i:i + 2]
    jobs = [(p, [l.strip() for l in open(p, encoding='utf-8') if l.strip()], g) for p in a]
    with Pool(len(jobs)) as pool: res = dict(pool.map(screen.measure, jobs))
    for p in a:
        r = res[p]
        print(f"{os.path.basename(p):28s} n{r['n']} keep7 {r['k7']:.3f} | 4th land T4 {r['drop4']:.3f} | Gil T3 {r['gil3']:.3f} | Alena T5 {r['alena5']:.3f} | "
              f"6+ cast T8 {r['big']:.2f} | Gil draws T8 {r['gild']:.2f} | Alena chains T10 {r['chain']:.2f} | screw {r['screw']:.3f} | flood {r['flood']:.3f} | "
              f"spells T1-8 {r['spells']:.2f} | clock median T{r['med']:.0f} mean {r['clock']:.2f} by T7 {r['by7']:.3f} T8 {r['by8']:.3f}")
