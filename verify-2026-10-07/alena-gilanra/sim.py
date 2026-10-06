"""Goldfish sim for Gilanra + Alena land/ramp counts (4-pod: draw on turn 1). Colour ignored.
Run: py verify-2026-10-07/alena-gilanra/sim.py
Card kinds: L untapped land, T tapped land, R1 Sol Ring (1 -> +2 now), ROCK 2-MV rock or hasty dork (+1 now),
D1 Llanowar (+1 next turn), D2 2-MV dork (+1 next turn; CAR = +2 once power>=4 is out),
LU Nature's Lore/Three Visits (2, untapped land now), LT Farseek/Rampant Growth (2, tapped land),
SEL Selvala (3; {G},T: X = greatest power), OUT Outcaster Trailblazer (3, +1 now),
PE Planar Engineering (4: net +2 tapped lands), CYC fatty with landcycling {2}, M<n> mid spell MV n, F<n> fatty MV n.
Commanders: Gilanra (3, +1 next turn), Alena (5, +6 after a 6+ power creature enters that turn).
"""
import random

def deck(cfg):
    out = []
    for k, n in cfg.items():
        out += [k] * n
    assert len(out) == 98, (len(out), cfg)
    return out

def is_land(c): return c in ('L', 'T')

def keep(hand):
    lands = sum(is_land(c) for c in hand)
    ramp = sum(c in ('R1', 'ROCK', 'D1', 'D2', 'CAR', 'LU', 'LT') for c in hand)
    return 2 <= lands <= 5 and lands + ramp >= 3

def game(lib, rng, turns=8):
    rng.shuffle(lib)
    hand, lib = lib[:7], lib[7:]
    if not keep(hand):  # free first mulligan, then London to 6
        rng.shuffle(lib := hand + lib)
        hand, lib = lib[:7], lib[7:]
        if not keep(hand):
            rng.shuffle(lib := hand + lib)
            hand, lib = lib[:7], lib[7:]
            spells = sorted([c for c in hand if not is_land(c)], key=lambda c: -int(c[1:]) if c[0] in 'FM' else 0)
            lib.append(spells[0] if spells else hand[0]); hand.remove(lib[-1])
    lands = tapped_next = 0; perm = 0; gil = alena = False; maxpow = 0
    first6 = None; n6 = 0; alena_turn = None; n7 = 0
    for t in range(1, turns + 1):
        hand.append(lib.pop(0))
        lands += tapped_next; tapped_next = 0
        drop = next((c for c in hand if c == 'L'), None) or next((c for c in hand if c == 'T'), None)
        mana = lands + perm
        if drop:
            hand.remove(drop)
            if drop == 'L': lands += 1; mana += 1
            else: tapped_next += 1
        elif any(c == 'CYC' for c in hand) and mana >= 2 and t <= 6:
            hand.remove('CYC'); mana -= 2; hand.append('L')  # cycled into a basic; played next turn
        mana += (1 if gil and gil < t else 0)
        def spend(m):
            nonlocal lands, tapped_next, perm, gil, alena, maxpow, first6, n6, alena_turn
            entered = 0
            costs = {'R1': 1, 'LU': 2, 'ROCK': 2, 'D1': 1, 'D2': 2, 'CAR': 2, 'LT': 2, 'SEL': 3, 'OUT': 3, 'PE': 4}
            while True:
                # priority: Sol Ring > Alena > biggest fatty > Gilanra > cheap ramp > mid spell > Alena's mana
                if 'R1' in hand and m >= 1:
                    hand.remove('R1'); m += 1; perm += 2; continue
                if not alena and m >= 5:
                    alena = alena_turn = t; m -= 5; maxpow = max(maxpow, 4); continue
                big = [c for c in hand if (c[0] == 'F' or c == 'CYC') and (6 if c == 'CYC' else int(c[1:])) <= m]
                if big:
                    c = max(big, key=lambda c: 6 if c == 'CYC' else int(c[1:]))
                    hand.remove(c); m -= 6 if c == 'CYC' else int(c[1:]); n6 += 1; maxpow = max(maxpow, 6)
                    first6 = first6 or t; entered = 6; continue
                if not gil and m >= 3:
                    gil = t; m -= 3; continue
                ramp = [c for c in hand if c in costs and costs[c] <= m and not (c == 'PE' and lands < 2) and not (t > 5 and c in ('LT', 'PE'))]
                if ramp:
                    c = min(ramp, key=lambda c: costs[c]); hand.remove(c); m -= costs[c]
                    if c == 'ROCK': m += 1; perm += 1
                    elif c == 'LU': lands += 1; m += 1
                    elif c == 'LT': tapped_next += 1
                    elif c == 'D1' or c == 'D2': pending.append(1)
                    elif c in ('CAR', 'SEL'): pending.append(c)
                    elif c == 'OUT': m += 1; maxpow = max(maxpow, 4)
                    elif c == 'PE': lands -= 2; tapped_next += 4
                    continue
                mid = [c for c in hand if c[0] == 'M' and int(c[1:]) <= m]
                if mid:
                    c = max(mid, key=lambda c: int(c[1:])); hand.remove(c); m -= int(c[1:]); maxpow = max(maxpow, 4); continue
                if alena and alena < t and entered and not used_alena[0]:
                    used_alena[0] = True; m += entered; continue
                break
            return m
        used_alena = [False]
        m = mana + sum(2 if p == 'CAR' and maxpow >= 4 else (max(maxpow, 2) - 1 if p == 'SEL' else 1) for p in ready)
        spend(m)
        ready.extend(pending); pending.clear()
        if t == 7: n7 = n6
    return first6, n6, alena_turn, n7

def run(name, cfg, games=25000, seed=1):
    rng = random.Random(seed); lib0 = deck(cfg)
    f4 = f5 = f6 = 0; tot6 = 0; a5 = 0; lo = hi = 0
    global pending, ready
    for _ in range(games):
        pending, ready = [], []
        first6, n6, at, n7 = game(lib0[:], rng)
        lo += n7 <= 1; hi += n7 >= 4
        f4 += bool(first6 and first6 <= 4); f5 += bool(first6 and first6 <= 5); f6 += bool(first6 and first6 <= 6)
        tot6 += n6; a5 += bool(at and at <= 5)
    print(f"{name:34s} 6-drop by T4 {f4/games:.2f}  T5 {f5/games:.2f}  T6 {f6/games:.2f} | 6-drops cast by T8 {tot6/games:.2f} | Alena by T5 {a5/games:.2f} | by T7: <=1 fatty {lo/games:.2f}, >=4 {hi/games:.2f}")

if __name__ == '__main__':
    def cfg(**k):
        k['F6'] = 98 - sum(k.values()); return k
    base = dict(R1=1, ROCK=3, D1=1, OUT=1, PE=1, CYC=1, M4=2)
    run('current: 36 lands (35 untapped)', cfg(L=35, T=1, M2=1, M5=6, **base))
    run('proposed: 36 lands (34 untapped)', cfg(L=34, T=2, LU=1, LT=1, SEL=1, M3=3, M5=5, **base))
    run('proposed + 1 land (37)', cfg(L=35, T=2, LU=1, LT=1, SEL=1, M3=3, M5=5, **base))
    run('proposed + 2 lands (38)', cfg(L=36, T=2, LU=1, LT=1, SEL=1, M3=3, M5=5, **base))
    run('current + 2 lands (38)', cfg(L=37, T=1, M2=1, M5=6, **base))
    run('current + 4 lands (40)', cfg(L=39, T=1, M2=1, M5=6, **base))
