"""Reproducible numbers quoted in principles.md / lines-and-mulligans.md (own calculations).
Run: py verify-2026-10-02/deck-research/calcs.py
Exact hypergeometric where possible; Monte Carlo (200k games, seed 1) for curve questions.
"""
import random
from math import comb

DECK = 99  # library at game start (commander in command zone)


def p_at_least(k, succ, seen, N=DECK):
    """P(>= k successes among `seen` cards drawn from N with `succ` successes)."""
    return sum(comb(succ, i) * comb(N - succ, seen - i) for i in range(k, min(succ, seen) + 1)) / comb(N, seen)


def seen_by_turn(t, fmt):
    # 4-pod Commander: every player draws on turn 1 (CR 800.7). Brawl 1v1 on the play: no turn-1 draw.
    return 7 + t if fmt == "pod" else 7 + t - 1


def opening_lands_table():
    print("== Opening 7: P(2-4 lands) / P(>=3 lands); with free mulligan = 1-(1-p)^2 ==")
    for L in (34, 36, 37, 38, 40):
        p24 = sum(comb(L, i) * comb(DECK - L, 7 - i) for i in (2, 3, 4)) / comb(DECK, 7)
        p3 = p_at_least(3, L, 7)
        print(f"L={L}: P(2-4)={p24:.3f} two looks={1-(1-p24)**2:.3f} | P(>=3)={p3:.3f} two looks={1-(1-p3)**2:.3f}")


def find_effect_table():
    print("== P(see >=1 of n copies of an effect by turn T) ==")
    for fmt in ("pod", "brawl_play"):
        for n in (1, 3, 5, 8, 10, 12):
            row = " ".join(f"T{t}={p_at_least(1, n, seen_by_turn(t, fmt)):.2f}" for t in (1, 2, 3, 4, 6))
            print(f"{fmt:10s} n={n:2d}: {row}")


def sim_commander_on_curve(cmv, lands, rocks, fmt, games=200_000, seed=1):
    """P(commander cast by turn cmv) and by cmv+1. Rocks = 2-mana rocks that tap for 1 (Signet-like).
    Mulligan: 7-card hand kept if 3-5 lands, or 2 lands + rock; free mulligan first (pod and Brawl both),
    then London: keep any 6/5 with 2-4 lands (bottom spells first)."""
    rng = random.Random(seed)
    deck = ["L"] * lands + ["R"] * rocks + ["S"] * (DECK - lands - rocks)
    hit, hit1 = 0, 0
    for _ in range(games):
        for mull in range(3):
            rng.shuffle(deck)
            hand, lib = deck[:7], deck[7:]
            nl, nr = hand.count("L"), hand.count("R")
            bottom = max(0, mull - 1)  # first mulligan free
            if mull == 2 or 3 <= nl <= 5 or (nl == 2 and nr >= 1) or (bottom and 2 <= nl <= 4):
                for _b in range(bottom):  # bottom a spell if possible, else a land
                    hand.remove("S" if "S" in hand else ("L" if hand.count("L") > 3 else hand[-1]))
                break
        mana_rocks, lands_in_play, cast_turn = 0, 0, None
        for t in range(1, cmv + 2):
            if t > 1 or fmt == "pod":
                hand.append(lib.pop(0))
            if "L" in hand:
                hand.remove("L"); lands_in_play += 1
            avail = lands_in_play + mana_rocks
            if avail >= cmv:
                cast_turn = t; break
            if avail >= 2 and "R" in hand:
                hand.remove("R"); mana_rocks += 1
        if cast_turn is not None and cast_turn <= cmv:
            hit += 1
        if cast_turn is not None and cast_turn <= cmv + 1:
            hit1 += 1
    return hit / games, hit1 / games


def karsten_lands(avg_mv, cheap):
    return 31.42 + 3.13 * avg_mv - 0.28 * cheap


if __name__ == "__main__":
    opening_lands_table()
    find_effect_table()
    print("== Commander on curve (MC) ==")
    for fmt in ("pod", "brawl_play"):
        for cmv, L, R in ((3, 37, 6), (4, 37, 8), (4, 35, 10), (5, 37, 10), (5, 34, 10)):
            a, b = sim_commander_on_curve(cmv, L, R, fmt)
            print(f"{fmt:10s} MV{cmv} lands={L} rocks={R}: on curve={a:.3f} by +1 turn={b:.3f}")
    print("== Karsten 99-card formula examples ==")
    for mv, c in ((3.0, 0), (3.0, 8), (3.3, 7), (2.6, 12)):
        print(f"avgMV={mv} cheap={c}: {karsten_lands(mv, c):.1f} lands")
