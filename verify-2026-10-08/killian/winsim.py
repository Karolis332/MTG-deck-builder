"""Killian goldfish for win-line validation: 3 opponents at 40, no interaction, every opponent has a creature to goad
from T3, colours ignored, cost reducers applied, greedy casting. py verify-2026-10-08/killian/winsim.py <list.txt> [games]
ponytail: a coarse model (no blockers, one attacker, no removal) — it ranks lines and lists, it does not predict table results."""
import random
import re
import statistics
import sys

LIST = sys.argv[1]
GAMES = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
# name -> (mv, kind, bonus). aura bonus = power added to the enchanted body
C = {
    "Talisman of Hierarchy": (2, "ramp", 1), "Worn Powerstone": (3, "ramp", 2), "Burnished Hart": (3, "hart", 0), "Sword of the Animist": (2, "ramp", 1), "Bender's Waterskin": (3, "ramp", 1), "Prophetic Prism": (2, "prism", 0),
    "Pearl Medallion": (2, "red_white", 0), "Transcendent Envoy": (2, "red_aura", 0), "Starfield Mystic": (2, "red_ench", 0),
    "Pearl-Ear, Imperial Advisor": (3, "pearl", 0), "Killian, Ink Duelist": (2, "ink", 0), "Sram, Senior Edificer": (2, "draw_aura", 0),
    "Kor Spiritdancer": (2, "kor", 0), "Hateful Eidolon": (1, "body", 0), "Eriette of the Charmed Apple": (3, "eriette", 0),
    "Defiant Bloodlord": (7, "bloodlord", 0), "Ajani's Chosen": (4, "tokens", 0), "Archon of Sun's Grace": (4, "tokens", 0),
    "Doomwake Giant": (5, "body", 0), "Shadrix Silverquill": (5, "shadrix", 0), "Vampire Nighthawk": (3, "flyer", 0),
    "Tomik, Wielder of Law": (3, "flyer", 0), "Herald of Amity": (4, "herald", 0), "Armored Skyhunter": (4, "skyhunter", 0),
    "Scriv, the Obligator": (4, "scriv", 0), "Breena, the Demagogue": (3, "flyer", 0), "Combat Calligrapher": (4, "flyer", 0),
    "Firemane Commando": (4, "flyer", 0), "Nils, Discipline Enforcer": (3, "body", 0), "Minthara, Merciless Soul": (4, "body", 0),
    "Teyo, Lightshield Expert": (2, "body", 0), "Forum Filibuster": (5, "ench", 0), "Ghostly Prison": (3, "ench", 0),
    "Angelic Destiny": (4, "aura", 4), "Eldrazi Conscription": (8, "aura", 10), "Spirit Mantle": (2, "aura", 1), "Shielded by Faith": (3, "aura", 0),
    "Gift of Immortality": (3, "aura", 0), "Sage's Reverie": (4, "aura_rev", 0), "Songbirds' Blessing": (4, "aura", 0), "Sheltered by Ghosts": (2, "aura", 1),
    "Chains of Custody": (3, "aura", 0), "Flickering Ward": (1, "aura", 0), "Raffine's Guidance": (1, "aura", 1), "Sentinel's Eyes": (1, "aura", 1),
    "Eidolon of Countless Battles": (4, "aura", 3), "Darksteel Mutation": (2, "goad", 0), "Animate Dead": (2, "goad", 0), "Changing Loyalty": (2, "goad", 0),
    "Super State": (7, "super", 0), "Coercive Impetus": (3, "goad_draw", 0), "Ghoulish Impetus": (3, "goad", 0), "Martial Impetus": (3, "goad", 0),
    "Parasitic Impetus": (3, "goad_drain", 0), "Redemption Arc": (3, "goad", 0),
    "Night's Whisper": (2, "draw2", 0), "Diabolic Tutor": (4, "tutor", 0), "Mastermind's Acquisition": (4, "tutor", 0), "Secret Rendezvous": (3, "draw3", 0), "Rustler Rampage": (2, "ds", 0),
}
EVASIVE_AURAS = {"Angelic Destiny", "Spirit Mantle", "Eldrazi Conscription"}
AURA_KINDS = {"aura", "aura_rev", "goad", "goad_draw", "goad_drain", "super"}
LANDS = {"Plains", "Swamp", "Arcane Lighthouse", "Desolate Mire", "Fetid Heath", "Forlorn Flats", "Forum of Amity", "Isolated Chapel",
         "Riveteers Overlook", "Secluded Steppe", "Shineshadow Snarl", "Silverquill Campus", "Study Hall", "Sunlit Marsh", "Temple of Silence",
         "Umbral Expanse", "Vault of the Archangel", "Caves of Koilos", "Command Tower", "Godless Shrine", "Concealed Courtyard", "Exotic Orchard"}
TAPPED = {"Forum of Amity", "Silverquill Campus", "Sunlit Marsh", "Temple of Silence", "Umbral Expanse", "Secluded Steppe", "Forlorn Flats", "Riveteers Overlook"}
ORDER = ["ramp", "prism", "hart", "red_white", "red_aura", "red_ench", "pearl", "ink", "draw_aura", "kor", "eriette", "tutor", "draw2", "draw3", "aura", "aura_rev",
         "goad_draw", "goad_drain", "goad", "flyer", "shadrix", "herald", "skyhunter", "scriv", "tokens", "body", "bloodlord", "super", "ench", "ds"]
BODIES = {"flyer", "shadrix", "herald", "skyhunter", "scriv", "tokens", "body", "bloodlord", "kor", "draw_aura", "pearl", "ink", "eriette", "red_aura", "red_ench"}


def parse(p):
    out = []
    for line in open(p, encoding="utf-8"):
        m = re.match(r"^(\d+)\s+(.+?)\s*$", line.strip())
        if m and m.group(2) != "Killian, Decisive Mentor":
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
    bf, auras, rocks, lands, cmdr = set(), 0, 0, 0, False
    opp = [40, 40, 40]
    eriette_t, killian_draws, voltron, evasive, ds, win_t = None, 0, 0, False, False, None
    aura_log = {}

    def draw(n=1):
        for _ in range(n):
            if lib:
                hand.append(lib.pop(0))

    def cost(n):
        mv, k, _ = C[n]
        c = mv
        if k in AURA_KINDS:
            c -= ("red_aura" in bf) + ("red_ench" in bf) + 2 * ("ink" in bf) + (auras if "pearl" in bf else 0)
            if "red_white" in bf and n not in ("Animate Dead", "Changing Loyalty", "Coercive Impetus", "Ghoulish Impetus", "Parasitic Impetus", "Eldrazi Conscription", "Super State"):
                c -= 1
        elif k in ("ench", "tokens") and "red_ench" in bf:
            c -= 1
        return max(c, 1 if mv > 0 else 0)

    for t in range(1, 16):
        if t > 1:
            draw()
        tapped_now = 0
        ls = [c for c in hand if kind(c) == "land"]
        if ls:
            land = sorted(ls, key=lambda c: (c in TAPPED) != (t <= 2))[0]
            hand.remove(land)
            lands += 1
            tapped_now = land in TAPPED
        mana = lands - tapped_now + rocks
        pending = 0
        while True:
            if not cmdr and mana >= 3:
                cmdr, mana = True, mana - 3
                continue
            has_body = cmdr or any(b in bf for b in BODIES)
            cands = sorted([c for c in hand if kind(c) in ORDER and cost(c) <= mana and (has_body or kind(c) not in AURA_KINDS) and (t >= 3 or not kind(c).startswith("goad"))], key=lambda c: (ORDER.index(kind(c)), cost(c)))
            if not cands:
                break
            c = cands[0]
            k = kind(c)
            hand.remove(c)
            mana -= cost(c)
            if k == "ramp":
                rocks += C[c][2]
            elif k == "hart":
                bf.add("hart")
            elif k == "eriette":
                bf.add("eriette")
                eriette_t = eriette_t or t
            elif k in AURA_KINDS:
                auras += 1
                voltron += C[c][2]
                evasive = evasive or c in EVASIVE_AURAS
                if k == "aura_rev":
                    pending += auras - 1
                if k == "super":
                    bf.add("super")
                    evasive = True
                if k == "goad_drain":
                    bf.add("parasitic")
                if k == "goad_draw":
                    bf.add("coercive")
                pending += ("draw_aura" in bf) + ("kor" in bf) + (1 if "pearl" in bf and auras > 1 and k.startswith("aura") else 0)
            elif k == "tutor":
                for want in ("Eriette of the Charmed Apple", "Eldrazi Conscription", "Super State", "Angelic Destiny"):
                    if want in lib and (want != "Eriette of the Charmed Apple" or "eriette" not in bf):
                        lib.remove(want); hand.append(want); break
            elif k == "prism":
                pending += 1
                rocks += 1
            elif k == "draw2":
                pending += 2
            elif k == "draw3":
                pending += 3
            elif k == "ds":
                ds = True
            else:
                bf.add(k)
                if k in ("flyer", "shadrix", "herald", "skyhunter", "scriv"):
                    evasive = True
                if k == "shadrix":
                    ds = True
                if k == "herald" and random.random() < 0.87:
                    auras += 1
                if k == "scriv":
                    auras += 1
        if "hart" in bf and mana >= 3:
            bf.discard("hart")
            rocks += 2
        draw(pending)
        if auras >= 1 and t >= 3:  # an enchanted creature (ours or a goaded one) attacks: Killian draws, Coercive draws
            killian_draws += 1
            draw(1 + ("coercive" in bf))
        if "parasitic" in bf and t >= 4:
            opp[0] -= 2
        body = 2 + voltron + (2 * auras if "kor" in bf else 0)
        if evasive and voltron >= 4 and t >= 4:
            if "super" in bf:
                opp = [o - 9 * (2 if ds else 1) for o in opp]
            else:
                i = opp.index(max(opp))
                opp[i] -= body * (2 if ds else 1)
        if "eriette" in bf:
            opp = [o - auras for o in opp]
            if "bloodlord" in bf:
                j = opp.index(max(opp))
                opp[j] -= auras
        aura_log[t] = auras
        if max(opp) <= 0:
            win_t = t
            break
    return dict(win=win_t, eriette=eriette_t, a6=aura_log.get(6, 0), a8=aura_log.get(8, 0), kd=killian_draws)


R = [game() for _ in range(GAMES)]
wins = [r["win"] for r in R if r["win"]]
er = [r["eriette"] for r in R if r["eriette"]]
if UNKNOWN:
    print("not modelled (cast as nothing):", ", ".join(UNKNOWN))
print(f"games {GAMES}: table kill by T8 {sum(w <= 8 for w in wins) / GAMES:.2f}, by T10 {sum(w <= 10 for w in wins) / GAMES:.2f}, "
      f"by T12 {sum(w <= 12 for w in wins) / GAMES:.2f}; median kill turn {statistics.median(wins) if wins else None}")
print(f"Eriette cast by T5 {sum(e <= 5 for e in er) / GAMES:.2f}, by T7 {sum(e <= 7 for e in er) / GAMES:.2f}; "
      f"auras on board T6 avg {statistics.mean(r['a6'] for r in R):.1f}, T8 avg {statistics.mean(r['a8'] for r in R):.1f}; "
      f"Killian combat draws per game {statistics.mean(r['kd'] for r in R):.1f}")
