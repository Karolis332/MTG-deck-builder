"""Tam wincon numbers (2026-10-03). Run from this dir: py calc-tam.py"""
import random, sys
sys.path.insert(0, '../../.claude/skills/deck-building/reference')
from calcs import p_at_least, sim_commander_on_curve, karsten_lands

def seen(t, extra=0):  # 4-pod: everyone draws on T1
    return 7 + t + extra

def lock_ready(spec, t, extra, games=100_000, seed=7):
    """JRS reachable (JRS, walker tutor or any tutor) + engine (Mentor/Paradox, Pia, or a spare any-tutor)
    + one more empower card (other Way/empower or the second engine piece)."""
    rng = random.Random(seed)
    deck = [k for k, n in spec.items() for _ in range(n)]
    deck += ['x'] * (99 - len(deck))
    ok = 0
    for _ in range(games):
        rng.shuffle(deck)
        h = deck[:seen(t, extra)]
        anyt = h.count('anytutor')
        if 'JRS' not in h and h.count('walkertutor') == 0:
            if anyt == 0: continue
            anyt -= 1
        eng = h.count('engine')
        if eng == 0 and 'Pia' not in h:
            if anyt == 0: continue
            anyt -= 1; eng = 1
        if eng + h.count('empower') + ('Pia' in h) >= 2: ok += 1
    return ok / games

BEFORE = {'JRS': 1, 'walkertutor': 1, 'anytutor': 0, 'engine': 2, 'Pia': 1, 'empower': 6}   # Entrust; 5 Ways + Avatar
AFTER = {'JRS': 1, 'walkertutor': 2, 'anytutor': 2, 'engine': 2, 'Pia': 1, 'empower': 8}    # +Loyal, Diabolic, Mastermind's; +Fatehold, Rewrite
if __name__ == '__main__':
    print('Karsten regression lands (avgMV 3.25, 9 cheap):', round(karsten_lands(3.25, 9), 1))
    print('Tam (MV3) on T3/T4, 34 lands, 7 two-mana-or-less accel (Sol Ring, Signet, 3 Talismans, Bloom Tender, Great Divide Guide):',
          sim_commander_on_curve(3, 34, 7, 'pod', games=100_000))
    print('P(Mentor/Paradox/Pia/any-tutor by T4): before 3 cards %.2f | after 5 cards %.2f' % (p_at_least(1, 3, seen(4)), p_at_least(1, 5, seen(4))))
    for t in (7, 9):
        for extra in (0, t - 3):
            print(f'T{t} +{extra} extra draws: JRS access before {p_at_least(1, 2, seen(t, extra)):.2f} after {p_at_least(1, 5, seen(t, extra)):.2f}'
                  f' | Vraska access before {p_at_least(1, 2, seen(t, extra)):.2f} after {p_at_least(1, 5, seen(t, extra)):.2f}'
                  f' | lock-ready before {lock_ready(BEFORE, t, extra):.2f} after {lock_ready(AFTER, t, extra):.2f}')
