# Row-set equality: tip normalized join vs IN (cname, 'A-'||cname) join.
import importlib.util, sys
sys.argv = ['x', '__none__']
spec = importlib.util.spec_from_file_location('lp', 'verify-2026-09-30/perf/land-plan.py')
src = open('verify-2026-09-30/perf/land-plan.py').read().split('for k in sys.argv')[0]
ns = {}; exec(src, ns)
a = [r[0] for r in ns['db'].execute(ns['variants']['tip'])]
b = [r[0] for r in ns['db'].execute(ns['variants']['tip-semi'])]
print('tip', len(a), 'tip-semi', len(b), 'same ordered ids', a == b, 'same set', set(a) == set(b))
