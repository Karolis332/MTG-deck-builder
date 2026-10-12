"""Monte Carlo for the Arena Vivi list: land count vs early mana, colours and flood.
Arena Brawl: 100 cards, London mulligan, first mulligan free. Bo1 hand smoothing is NOT modelled.
Usage: py mana_sim.py [trials]
"""
import random, sys, os, re
random.seed(20260930)
TRIALS = int(sys.argv[1]) if len(sys.argv) > 1 else 40000
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# colour sources: 'UR' dual, 'U', 'R', 'C' colourless. tapped=True if it enters tapped early.
LANDS = {
    'Steam Vents': ('UR', False), 'Spirebluff Canal': ('UR', False), 'Stormcarved Coast': ('UR', True),
    'Riverpyre Verge': ('UR', False), 'Thran Portal': ('UR', False), 'Multiversal Passage': ('UR', False),
    'Command Tower': ('UR', False), 'Scalding Tarn': ('UR', False), 'Misty Rainforest': ('UR', False),
    'Flooded Strand': ('UR', False), 'Fabled Passage': ('UR', True), 'Otawara, Soaring City': ('U', False),
    'Sokenzan, Crucible of Defiance': ('R', False), 'Mystic Sanctuary': ('U', True),
    'Island': ('U', False), 'Mountain': ('R', False),
}
# Stormcarved untapped with >=2 other lands (so T3+); Fabled tapped before 4 lands; Sanctuary tapped early.
MDFC = {'Sink into Stupor': 'U', 'Spikefield Hazard': 'R', 'Shatterskull Smashing': 'R'}
ROCKS2 = {'Arcane Signet': 'UR', 'Izzet Signet': 'UR', 'Talisman of Creativity': 'UR'}  # 2-mana rocks

def load(path):
    cards = []
    for l in open(path, encoding='utf-8'):
        m = re.match(r'(\d+) (.+)', l.strip())
        if m and m.group(2) != 'A-Vivi Ornitier':
            cards += [m.group(2)] * int(m.group(1))
    return cards

def build(base, delta_basics):
    deck = list(base)
    if delta_basics > 0:
        # add basics, replacing the last non-land spells alphabetically (any spell; stats don't depend on which)
        spells = [c for c in deck if c not in LANDS and c not in MDFC and c not in ROCKS2]
        for i in range(delta_basics):
            deck.remove(spells[-1 - i])
            deck.append('Island' if i % 2 == 0 else 'Mountain')
    elif delta_basics < 0:
        for i in range(-delta_basics):
            deck.remove('Island' if i % 2 == 0 else 'Mountain')
            deck.append('SPELL')
    return deck

def landish(c): return c in LANDS or c in MDFC
def nlands(hand): return sum(1 for c in hand if landish(c))

def mulligan(deck):
    """London mulligan, first one free. Returns (hand, library, mulls)."""
    mulls = 0
    while True:
        random.shuffle(deck)
        hand, lib = deck[:7], deck[7:]
        size = 7 if mulls <= 1 else 7 - (mulls - 1)
        n = nlands(hand)
        ok = 2 <= n <= 5 if size >= 6 else 1 <= n <= 5
        if ok or size <= 5:
            # bottom cards down to size: bottom lands if >4, else spells
            while len(hand) > size:
                pool = [c for c in hand if landish(c)] if nlands(hand) > 4 else [c for c in hand if not landish(c)]
                c = pool[0] if pool else hand[-1]
                hand.remove(c); lib.append(c)
            return hand, lib, mulls
        mulls += 1

def run(deck, on_play):
    hand, lib, mulls = mulligan(list(deck))
    lib = [c for c in lib if c is not None]
    seen = list(hand)
    lands_by = {}
    colours_by = {}
    rocks_seen_by = {}
    for t in range(1, 7):
        if not (t == 1 and on_play):
            seen.append(lib.pop(0))
        ls = [c for c in seen if landish(c)]
        lands_by[t] = min(len(ls), t)
        # colour check: among lands in hand, can we have U and R on board by turn t (with at most t lands played)?
        srcs = [LANDS[c][0] if c in LANDS else MDFC[c] for c in ls]
        u = sum(1 for s in srcs if 'U' in s); r = sum(1 for s in srcs if 'R' in s)
        duals = sum(1 for s in srcs if s == 'UR')
        # need at least one U and one R source among the first min(t, len) lands; assume we sequence optimally
        colours_by[t] = (u >= 1 and r >= 1) and (len(ls) >= 2 or duals >= 1) and len(ls) >= min(2, t)
        rocks_seen_by[t] = sum(1 for c in seen if c in ROCKS2)
    return dict(
        mulls=mulls,
        l2=lands_by[2] >= 2,
        m3=lands_by[3] >= 3 or (lands_by[2] >= 2 and rocks_seen_by[2] >= 1 and lands_by[3] >= 2),
        vivi3=(lands_by[3] >= 3 or (lands_by[2] >= 2 and rocks_seen_by[2] >= 1 and lands_by[3] >= 2)) and colours_by[3],
        l4=lands_by[4] >= 4,
        flood6=sum(1 for c in seen if landish(c)) >= 8,
        screw4=sum(1 for c in seen[:7 + (4 if not on_play else 3)] if landish(c)) <= 2,
    )

def report(name, deck):
    nl = sum(1 for c in deck if landish(c))
    print(f'\n== {name}: {nl} land-capable cards ({sum(1 for c in deck if c in LANDS)} lands + {sum(1 for c in deck if c in MDFC)} MDFC), {sum(1 for c in deck if c in ROCKS2)} two-mana rocks, deck {len(deck)}')
    for on_play in (True, False):
        res = [run(deck, on_play) for _ in range(TRIALS)]
        def p(k): return 100 * sum(r[k] for r in res) / len(res)
        print(f'  {"play" if on_play else "draw"}: P(2 lands T2) {p("l2"):5.1f}%  P(3 mana T3) {p("m3"):5.1f}%  P(Vivi castable T3, U+R) {p("vivi3"):5.1f}%  '
              f'P(4 lands T4) {p("l4"):5.1f}%  flood by T6 (>=8 land cards seen) {p("flood6"):5.1f}%  screw (<=2 lands in first 10/11) {p("screw4"):5.1f}%  '
              f'mull rate {100*sum(1 for r in res if r["mulls"]>0)/len(res):4.1f}%')

if __name__ == '__main__':
    base = load(os.path.join(D, 'final.txt'))
    assert len(base) == 99, len(base)
    for delta, label in ((-2, "30+3"), (-1, "31+3"), (0, "32+3 (final)"), (1, "33+3"), (2, "34+3")):
        report(label, build(base, delta))
