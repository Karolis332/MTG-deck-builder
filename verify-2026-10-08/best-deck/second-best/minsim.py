"""Minthara goldfish for win-line validation: 3 opponents at 40, no blockers, no interaction, greedy casting, colours
ignored. Tracks experience counters (one per turn when a permanent left: a sac outlet, a decayed Zombie, a flicker,
a Treasure), the anthem alpha, Syr Konrad / Vraan drain, and the reanimation package.
  py verify-2026-10-08/best-deck/second-best/minsim.py <list.txt> [games]
ponytail: coarse — it ranks lines and lists, it does not predict a table."""
import random
import re
import statistics
import sys

LIST = sys.argv[1]
GAMES = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
# name -> (mv, kind, power)
C = {
    "Talisman of Hierarchy": (2, "rock", 1), "Charcoal Diamond": (2, "rock", 1), "Commander's Sphere": (3, "rock", 1), "Decanter of Endless Water": (3, "rock", 1),
    "Thran Dynamo": (4, "rock", 3), "Noble's Purse": (2, "purse", 0), "Sword of the Animist": (2, "rock", 0), "Ornithopter of Paradise": (2, "dork", 0),
    "Burnished Hart": (3, "hart", 2), "Solemn Simulacrum": (4, "solemn", 2), "Foundry Inspector": (3, "body", 3), "Academy Manufactor": (3, "body", 1),
    "Jadar, Ghoulcaller of Nephalia": (2, "jadar", 1), "Carrion Feeder": (1, "outlet", 1), "Woe Strider": (3, "strider", 3), "Umbral Collar Zealot": (2, "outlet", 3),
    "Shadowheart, Dark Justiciar": (4, "shadowheart", 3), "Baron Bertram Graywater": (4, "baron", 3), "Zhentarim Bandit": (2, "bandit", 2),
    "Syr Konrad, the Grim": (5, "konrad", 5), "Vraan, Executioner Thane": (2, "vraan", 2), "Elegy Acolyte": (4, "elegy", 4),
    "Accursed Marauder": (2, "edict", 2), "Plaguecrafter": (3, "edict", 3), "Ravenous Chupacabra": (4, "body", 2), "Ruthless Lawbringer": (3, "body", 3),
    "Squad Commander": (4, "squad", 3), "Shadrix Silverquill": (5, "shadrix", 2), "Nadaar, Selfless Paladin": (3, "body", 3), "Grand Abolisher": (2, "body", 2),
    "Selfless Spirit": (2, "body", 2), "Teyo, Lightshield Expert": (2, "body", 1), "Patrolling Peacemaker": (3, "peacemaker", 2), "Boggart Trawler // Boggart Bog": (3, "body", 0),
    "Threefold Thunderhulk": (7, "hulk", 3), "Panharmonicon": (4, "pan", 0), "Dreadhorde Invasion": (2, "horde", 0), "Airbender Ascension": (2, "flicker_e", 0),
    "Contagion Clasp": (2, "clasp", 0), "Cloudshift": (1, "flicker", 0), "Gift of Immortality": (3, "ench", 0), "Ghostly Prison": (3, "ench", 0),
    "Buried Alive": (3, "buried", 0), "Reanimate": (1, "reanimate", 0), "Animate Dead": (2, "reanimate", 0), "Victimize": (3, "victimize", 0),
    "Night's Whisper": (2, "draw2", 0), "Sign in Blood": (2, "draw2", 0), "Corrupted Conviction": (1, "sacdraw", 0), "Eviscerator's Insight": (2, "sacdraw", 0),
    "Plumb the Forbidden": (2, "sacdraw", 0), "Basilisk Collar": (1, "ench", 0),
}
LANDS = {"Plains", "Swamp", "Arcane Lighthouse", "Desolate Mire", "Fetid Heath", "Forlorn Flats", "Forum of Amity", "Isolated Chapel", "Riveteers Overlook",
         "Secluded Steppe", "Shineshadow Snarl", "Silverquill Campus", "Study Hall", "Sunlit Marsh", "Temple of Silence", "Umbral Expanse", "Vault of the Archangel",
         "Buried Ruin", "Reliquary Tower", "Talon Gates of Madara", "Temple of the False God", "Karn's Bastion", "Boggart Bog",
         "Ancient Den", "Ash Barrens", "Bleachbone Verge", "Bloodstained Mire", "Caves of Koilos", "Concealed Courtyard", "Eclipsed Steppe", "Escape Tunnel",
         "Inventors' Fair", "Mana Confluence", "Mortuary Mire", "Path of Ancestry", "Rogue's Passage", "Spire of Industry", "Turbulent Moor", "Windswept Heath", "Wooded Foothills"}
TAPPED = {"Forum of Amity", "Silverquill Campus", "Sunlit Marsh", "Temple of Silence", "Umbral Expanse", "Secluded Steppe", "Forlorn Flats", "Riveteers Overlook"}
ORDER = ["rock", "dork", "hart", "purse", "jadar", "vraan", "outlet", "bandit", "strider", "elegy", "konrad", "baron", "shadowheart", "pan", "buried", "reanimate",
         "victimize", "squad", "shadrix", "hulk", "edict", "solemn", "body", "peacemaker", "horde", "flicker_e", "clasp", "draw2", "sacdraw", "flicker", "ench"]
OUTLETS = {"outlet", "strider", "shadowheart", "baron", "bandit", "jadar", "purse"}


def parse(p):
    out = []
    for line in open(p, encoding="utf-8"):
        m = re.match(r"^(\d+)\s+(.+?)\s*$", line.strip())
        if m and m.group(2) != "Minthara, Merciless Soul":
            out += [m.group(2)] * int(m.group(1))
    return out


DECK = parse(LIST)
assert len(DECK) == 99, len(DECK)
UNKNOWN = sorted({c for c in DECK if c not in C and c not in LANDS})


def kind(n):
    return "land" if n in LANDS else C.get(n, (0, "other", 0))[1]


def game():
    lib = DECK[:]
    random.shuffle(lib)
    hand, lib = lib[:7], lib[7:]
    for _ in range(2):
        nl = sum(kind(c) == "land" for c in hand)
        if 2 <= nl <= 5:
            break
        lib = lib + hand
        random.shuffle(lib)
        hand, lib = lib[:7], lib[7:]
    gy = []
    bf = set()
    bodies = []            # base powers of creatures (tokens included)
    rocks = lands = exp = 0
    cmdr = False
    opp = [40, 40, 40]
    win_t = None
    exp_log, board_log = {}, {}
    konrad_dmg = 0

    def draw(n=1):
        for _ in range(n):
            if lib:
                hand.append(lib.pop(0))

    def die(n=1, nontoken=False):  # a creature dies: Konrad pings, Vraan once a turn, Elegy fuel
        nonlocal konrad_dmg
        for _ in range(n):
            if "konrad" in bf:
                for i in range(3):
                    opp[i] -= 1
                konrad_dmg += 3
        if "vraan" in bf and n:
            bf.add("vraan_used")

    for t in range(1, 16):
        if t > 1:
            draw()
        bf.discard("vraan_used")
        left = False  # a permanent we controlled left the battlefield this turn
        ls = [c for c in hand if kind(c) == "land"]
        tapped_now = 0
        if ls:
            land = sorted(ls, key=lambda c: (c in TAPPED) != (t <= 2))[0]
            hand.remove(land)
            lands += 1
            tapped_now = land in TAPPED
        mana = lands - tapped_now + rocks
        pan = 2 if "pan" in bf else 1
        while True:
            if not cmdr and mana >= 4:
                cmdr, mana = True, mana - 4
                bodies.append(2)
                continue
            cands = sorted([c for c in hand if kind(c) in ORDER and C[c][0] <= mana], key=lambda c: (ORDER.index(kind(c)), C[c][0]))
            cands = [c for c in cands if not (kind(c) in ("reanimate", "victimize") and not [g for g in gy if kind(g) in ("hulk", "konrad", "elegy", "baron", "squad", "body", "edict")])]
            cands = [c for c in cands if not (kind(c) == "victimize" and (not bodies or len([g for g in gy if C.get(g, (0, "", 0))[0] >= 3]) < 2))]
            if not cands:
                break
            c = cands[0]
            k = kind(c)
            hand.remove(c)
            mana -= C[c][0]
            if k == "rock":
                rocks += C[c][2]
            elif k == "dork":
                rocks += 1
                bodies.append(0)
            elif k == "purse":
                bf.add("purse")
            elif k == "hart":
                bf.add("hart")
                bodies.append(2)
            elif k == "solemn":
                lands += pan
                bodies.append(2)
            elif k == "edict":
                bodies.append(C[c][2])
                die(pan)  # opponents' creatures die too: Konrad counts "another creature dies" for any controller
            elif k == "strider":
                bodies += [3] + [0] * pan
                bf.add("outlet")
            elif k == "squad":
                bodies += [3] + [1] * (2 * pan)
            elif k == "hulk":
                bodies += [3] + [1] * (3 * pan)
            elif k == "buried":
                for want in ("Threefold Thunderhulk", "Syr Konrad, the Grim", "Elegy Acolyte"):
                    if want in lib:
                        lib.remove(want)
                        gy.append(want)
            elif k in ("reanimate", "victimize"):
                targets = sorted([g for g in gy if kind(g) in ("hulk", "konrad", "elegy", "baron", "squad", "body", "edict")], key=lambda g: -C[g][0])
                n = 2 if k == "victimize" else 1
                if k == "victimize" and bodies:
                    bodies.pop(bodies.index(min(bodies)))
                    die(1)
                    left = True
                for g in targets[:n]:
                    gy.remove(g)
                    if "konrad" in bf:
                        for i in range(3):
                            opp[i] -= 1
                    kk = kind(g)
                    bf.add(kk) if kk in ("konrad", "elegy", "baron") else None
                    bodies.append(C[g][2])
                    if kk == "hulk":
                        bodies += [1] * (3 * pan)
                    if kk == "squad":
                        bodies += [1] * (2 * pan)
            elif k == "draw2":
                draw(2)
            elif k == "sacdraw":
                if bodies:
                    bodies.pop(bodies.index(min(bodies)))
                    die(1)
                    left = True
                    draw(2)
            elif k in ("flicker", "flicker_e"):
                left = True
                if k == "flicker_e":
                    bf.add("ascension")
            elif k == "clasp":
                bf.add("clasp")
            elif k == "pan":
                bf.add("pan")
            elif k == "horde":
                bf.add("horde")
                bodies.append(0)
            elif k == "ench":
                pass
            else:
                bf.add(k)
                bodies.append(C[c][2])
        if "hart" in bf and mana >= 3 and 2 in bodies:
            bf.discard("hart")
            bodies.remove(2)
            lands += 2
            die(1)
            left = True
            mana -= 3
        if "clasp" in bf and mana >= 4 and exp:
            exp += 1
            mana -= 4
        # tokens each turn
        if "jadar" in bf:
            bodies.append(2)
            bf.add("decayed")
        if "shadrix" in bf and t >= 2:
            bodies.append(2)
        if "horde" in bf and bodies:
            bodies[bodies.index(min(bodies))] += 1
        if "baron" in bf and ("jadar" in bf or "shadrix" in bf or "elegy_token" in bf):
            bodies.append(1)
        # a permanent leaves: decayed Zombie after combat, Treasure, a sac outlet feeding Shadowheart / Zealot, Ascension flicker
        if "decayed" in bf and t >= 3 and 2 in bodies:
            left = True
            bf.discard("decayed")
            bodies.remove(2)
            die(1)
        elif "purse" in bf and t >= 3:
            left = True
        elif "bandit" in bf and t >= 3:
            left = True
        elif any(o in bf for o in ("outlet", "shadowheart", "baron")) and len(bodies) > 3 and t >= 4:
            left = True
            bodies.pop(bodies.index(min(bodies)))
            die(1)
            if "shadowheart" in bf:
                draw(1)
        # combat: everything swings at the healthiest opponent, +exp each
        if t >= 4 and bodies:
            attackers = [p for p in bodies if True]
            dmg = sum(p + exp for p in attackers) + (len(attackers) if "squad" in bf and t >= 5 else 0)
            if "shadrix" in bf:
                dmg += 2 + exp  # double strike on the dragon
            i = opp.index(max(opp))
            opp[i] -= dmg
            if "elegy" in bf:
                draw(1)
        if "vraan" in bf and "vraan_used" in bf:
            opp = [o - 2 for o in opp]
        if left:
            exp += 1
            if "elegy" in bf:
                bodies.append(2)
                bf.add("elegy_token")
        exp_log[t] = exp
        board_log[t] = len(bodies)
        if max(opp) <= 0:
            win_t = t
            break
    return dict(win=win_t, e6=exp_log.get(6, 0), e8=exp_log.get(8, 0), b6=board_log.get(6, 0), b8=board_log.get(8, 0), kd=konrad_dmg)


R = [game() for _ in range(GAMES)]
wins = [r["win"] for r in R if r["win"]]
if UNKNOWN:
    print("not modelled (cast as nothing):", ", ".join(UNKNOWN))
print(f"games {GAMES}: table kill by T7 {sum(w <= 7 for w in wins) / GAMES:.2f}, by T8 {sum(w <= 8 for w in wins) / GAMES:.2f}, "
      f"by T10 {sum(w <= 10 for w in wins) / GAMES:.2f}; median kill turn {statistics.median(wins) if wins else None}")
print(f"experience counters T6 avg {statistics.mean(r['e6'] for r in R):.1f}, T8 avg {statistics.mean(r['e8'] for r in R):.1f}; "
      f"creatures T6 avg {statistics.mean(r['b6'] for r in R):.1f}, T8 avg {statistics.mean(r['b8'] for r in R):.1f}; Konrad damage per game {statistics.mean(r['kd'] for r in R):.1f}")
