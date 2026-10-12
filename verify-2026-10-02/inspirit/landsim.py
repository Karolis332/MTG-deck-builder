# Monte Carlo: T3 Inspirit (U+R+W) and T7 Depthshaker ({5}{R}{R}, Mechanaut -1) by land count. usage: py landsim.py <list> [n]
import random, re, sys
from metrics2 import load, SRC, TAPPED
BASIC = {'Island','Mountain','Plains'}
ART = [False]
ALAND = {'Seat of the Synod','Great Furnace','Ancient Den','Razortide Bridge','Silverbluff Bridge','Rustvale Bridge'}
TYPED = {'Island':'U','Mountain':'R','Plains':'W','Sacred Foundry':'RW','Irrigated Farmland':'WU','Radiant Summit':'RW','Glittering Massif':'RW'}
CHECK = {'Glacial Fortress':'WU','Sulfur Falls':'UR','Clifftop Retreat':'RW'}
# rock: (cost, colour req, output colours, amount, delay turns)
ROCK = {'Sol Ring':(1,'', 'C',2,0),'Arcane Signet':(2,'','URW',1,0),'Everflowing Chalice':(2,'','C',1,0),'Pentad Prism':(2,'','URW',1,0),
 'Fellwar Stone':(2,'','URW',1,0),'Ornithopter of Paradise':(2,'','URW',1,1),'Steelswarm Operator':(2,'U','U',1,1),'Solar Array':(3,'','URW',1,0),
 'All-Fates Scroll':(3,'','URW',1,0),"Bender's Waterskin":(3,'','URW',1,0),'Astral Cornucopia':(3,'','URW',1,0),'Empowered Autogenerator':(4,'','URW',1,1),
 'Crystalline Crawler':(4,'','URW',1,0),'Zookeeper Mechan':(2,'R','R',1,1),'The Eternity Elevator':(5,'','C',3,0),'Cloud Key':(3,'','',0,0),'Urza, Lord High Artificer':(4,'U','U',2,0),'Nyx Lotus':(4,'','URW',2,1)}  # ponytail: Urza = 2 U (tap 2 spare artifacts); real output grows with artifact count
REDUCER = {'Enthusiastic Mechanaut':'UR','Etherium Sculptor':'U'}
def colours(n, bf):
    if n in CHECK:
        ok = any(set(TYPED.get(b, '')) & set(CHECK[n]) for b in bf)
        return CHECK[n], not ok
    if n == 'Radiant Summit': return 'RW', sum(b in BASIC for b in bf) < 2
    if n == 'Fabled Passage': return 'URW', len(bf) < 3
    if n == 'Spire of Industry': return ('URW' if ART[0] else 'C'), False
    if n == 'The Mycosynth Gardens': return 'C', False
    return SRC.get(n, 'C') or 'C', n in TAPPED
def covers(srcs, need):
    # srcs: list of colour strings, one mana each; need: string of pips, distinct sources
    need = list(need)
    def go(i, used):
        if i == len(need): return True
        return any(need[i] in s and j not in used and go(i+1, used | {j}) for j, s in enumerate(srcs))
    return go(0, frozenset())
def game(deck, rng):
    for size in (7, 7, 6, 5):
        rng.shuffle(deck); hand = deck[:size]; lib = deck[size:]
        nl = sum(c[1] == 'L' for c in hand); cheap = sum(c[0] in ROCK and ROCK[c[0]][0] <= 2 for c in hand)
        if 3 <= nl <= 5 or (nl == 2 and cheap) or size == 5: break
    bf_l, bf_r, res = [], [], {}
    red = 0
    for turn in range(1, 8):
        if turn > 1: hand.append(lib.pop(0))
        lands = [c for c in hand if c[1] == 'L']
        ART[0] = bool(bf_r) or any(b in ALAND for b in bf_l)
        if lands:
            names = [b for b in bf_l]
            def key(c):
                col, tap = colours(c[0], names)
                return (0 if (tap and turn != 3) else 1 if not tap else 2, -len(col))
            pick = min(lands, key=key); hand.remove(pick)
            col, tap = colours(pick[0], names); bf_l.append(pick[0]); res.setdefault('t', []).append((col, tap, turn))
        srcs = [col for (col, tap, t) in res.get('t', []) if not (tap and t == turn)]
        srcs += [ROCK[r][2] for (r, t) in bf_r for _ in range(ROCK[r][3]) if t + ROCK[r][4] <= turn]
        if turn == 3: res['insp3'] = covers(srcs, 'URW')
        if turn <= 4 and 'insp4' not in res and covers(srcs, 'URW'): res['insp4'] = True
        if turn == 7: res['dt7'] = len(srcs) >= 7 - red and covers(srcs, 'RR')
        if turn == 5: res['m5'] = len(srcs)
        # cast rocks greedily, cheapest first
        avail = len(srcs)
        for c in sorted([c for c in hand if c[0] in ROCK], key=lambda c: ROCK[c[0]][0]):
            cost = ROCK[c[0]][0]
            if cost <= avail and covers(srcs, ROCK[c[0]][1]):
                avail -= cost; hand.remove(c); bf_r.append((c[0], turn))
        for r, need in REDUCER.items():
            if (r, 'S') in hand and avail >= 2 and covers(srcs, need):
                red += 1; avail -= 2; hand.remove((r, 'S'))
    return res
def run(path, extra_lands=0, n=20000):
    names = load(path)[1:]
    deck = []
    for x in names:
        is_land = x in SRC or x in ("Karn's Bastion", 'Buried Ruin', "Inventors' Fair") or x in CHECK
        deck.append((x, 'L' if is_land else 'S'))
    for _ in range(abs(extra_lands)):
        if extra_lands > 0:
            deck.remove(next(c for c in deck if c[1] == 'S' and c[0] not in ROCK and c[0] not in REDUCER)); deck.append(('Island', 'L'))
        else:
            deck.remove(('Island', 'L')); deck.append(('blank', 'S'))
    rng = random.Random(7); agg = {'insp3': 0, 'insp4': 0, 'dt7': 0, 'm5': 0}
    for _ in range(n):
        r = game(list(deck), rng)
        for k in ('insp3', 'insp4', 'dt7'): agg[k] += bool(r.get(k))
        agg['m5'] += r.get('m5', 0)
    L = sum(c[1] == 'L' for c in deck)
    print(f'{path} lands {L}: T3 Inspirit {agg["insp3"]/n:.3f} | by T4 {agg["insp4"]/n:.3f} | T7 Depthshaker {agg["dt7"]/n:.3f} | avg mana T5 {agg["m5"]/n:.2f}')
if __name__ == '__main__':
    p = sys.argv[1]
    for e in (-1, 0, 1): run(p, e)
