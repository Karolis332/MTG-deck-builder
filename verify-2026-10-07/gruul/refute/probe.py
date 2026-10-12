import sys, random, collections; sys.argv = ['x']; sys.path.insert(0, 'refute')
import hh
C = collections.Counter()
o_pay = hh.Game.pay
def pay(s, gen, R, G, H, big=False, allow_lcr=True):
    d = len(s.hand); r = o_pay(s, gen, R, G, H, big, allow_lcr)
    if r and big and len(s.hand) > d: C['gil_draw'] += 1
    return r
hh.Game.pay = pay
o_lc = hh.Game.landcycle
def lc(s):
    h = len([c for c in s.hand if c in hh.CYCLERS]); o_lc(s); C['cycled'] += h - len([c for c in s.hand if c in hh.CYCLERS])
hh.Game.landcycle = lc
names, cm = hh.load(sys.argv_list[0] if False else 'gilanra/final.txt')
S = {n: hh.spec(n) for n in set(names) | set(cm) | {'Forest', 'Mountain', 'Sheltered Thicket', 'Tangled Vale'}}
for n in S:
    if not S[n]['land']: S[n]['type'] = hh.DB.execute("select type_line from cards where name = ? or name like ? limit 1", (n, n + ' // %')).fetchone()[0]
rng = random.Random(1); N = 2000; burned = 0; vale = 0; alena_mana = 0
for _ in range(N):
    g = hh.Game(names, cm, S, rng); g.t = 0; g.drops_t = set(); g.armored = None; g.mulligan()
    for t in range(1, 9):
        g.turn(t)
    burned += g.burned; vale += any(p.name == 'Tangled Vale' for p in g.perms)
print({k: v / N for k, v in C.items()}, 'burn/game by T8', burned / N, 'vale', vale / N)
print('tags', {n: S[n]['tag'] for n in ['Tangled Florahedron // Tangled Vale', 'Apex Devastator', 'Selvala, Heart of the Wilds', 'Vastlands Scavenger // Bind to Life']}, 'kw', {n: (S[n]['trample'], S[n]['flying'], S[n]['menace']) for n in ['Pyrewood Gearhulk', 'Drakuseth, Maw of Flames', 'Hideous Taskmaster', 'Apex Devastator']})
