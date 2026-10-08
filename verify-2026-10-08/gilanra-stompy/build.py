"""Gilanra + Alena, 'fun, big and stompy' rebuild 2026-10-08 (operator brief: Hexhaven Invigorator + more Reality Fracture cards;
Beledros took Thunderfoot Baloth / Horizon of Progress / Evolving Wilds; Three Visits was never found -> deregistered).
Base = the 2026-10-07 engine-first build (verify-2026-10-07/gilanra-engine/final.txt, 39 lands, goldfish-verified), patched:
  py verify-2026-10-08/gilanra-stompy/build.py   -> final.txt (Commander header with both partners + Deck), prints the swap table."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
BASE = ROOT / "verify-2026-10-07/gilanra-engine/final.txt"
SLEEVED = ROOT / "decks/paper/decks/gilanra-alena-partners.txt"
BASICS = {"Forest", "Mountain", "Plains", "Island", "Swamp"}
SWAPS = [  # (out, in, why)
    ("Three Visits", "Simulacrum Shaper", "Three Visits not found (deregistered 2026-10-08) -> FRA 3-MV basic fetch with a body; draws when it dies"),
    ("Thunderfoot Baloth", "Hexhaven Invigorator", "Baloth is in Beledros -> the operator's must-have: 6/6 vigilance for GGGG; every point of damage it takes fetches a land (Gruul Ragebeast fights it on entry)"),
    ("Horizon of Progress", "Forest", "Horizon is in Beledros -> basic (Invigorator wants GGGG)"),
    ("Evolving Wilds", "Gruul Turf", "Wilds is in Beledros -> R/G bounce land (a land that draws a land)"),
    ("Rorix Bladewing", "Loot, the Nexus", "vanilla 6/5 for RRR -> FRA mana engine: one mana per different power among your creatures (3-5 in this deck), draws off Gilanra when it pays for a 6-drop"),
    ("Ulvenwald Observer", "Violent Echoes", "slow 6-MV draw -> FRA instant: 6 damage to a creature or planeswalker; the deck's second instant answer"),
    ("Shamanic Revelation", "Konstrari Charm", "5-MV sorcery draw (Kyoshi I covers it) -> FRA 2-MV instant: 6 to a flyer / +2 counters + trample on Ghalta or Invigorator / CCC"),
    ("Aurora Phoenix", "Identity Echo", "5/3 cascade flyer -> FRA repeatable polymorph: {3}{R} turns a dork, Frog or Caryatid into the next creature in the library (36 of 39 creatures are 5+ power)"),
    ("Hideous Taskmaster", "Moraug, Fury of Akoum", "7/2 for 7 dies to a ping -> extra combat on every main-phase landfall (Traverse, Passage, Overlook, Turf): the stompiest card in the pool"),
    ("Planetarium of Wan Shi Tong", "Earthshaker Dreadmaw", "6-MV scry engine the Urza draft needs -> 6/6 trample at MV 6 (Gilanra draws) that draws per other Dinosaur (Ghalta, Etali, Burning Sun's Avatar, Carnosaur, Regal Behemoth); goldfish 1,500 games: +0.6 six-plus casts by T8 and +0.08 Gilanra draws over Gigantosaurus (metrics.log)"),
]


def parse(p: pathlib.Path) -> list[str]:
    out: list[str] = []
    for line in p.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^(\d+)\s+(.+?)\s*$", line.strip())
        if m:
            out += [m.group(2)] * int(m.group(1))
    return out


def owned_free() -> dict[str, int]:
    col: dict[str, int] = {}
    for n in parse(ROOT / "decks/paper/collection.txt"):
        col[n] = col.get(n, 0) + 1
    for p in (ROOT / "decks/paper/decks").glob("*.txt"):
        if p == SLEEVED:
            continue
        for n in parse(p):
            col[n] = col.get(n, 0) - 1
    return col


def main() -> None:
    cards = parse(BASE)
    for out, inn, _ in SWAPS:
        assert out in cards, f"not in base: {out}"
        cards[cards.index(out)] = inn
    assert len(cards) == 100, len(cards)
    cmdrs = [c for c in cards if c in ("Gilanra, Caller of Wirewood", "Alena, Kessig Trapper")]
    assert len(cmdrs) == 2, cmdrs
    deck = sorted((c for c in cards if c not in cmdrs), key=str.lower)
    dup = {c for c in deck if deck.count(c) > 1 and c not in BASICS}
    assert not dup, f"duplicates: {dup}"
    free = owned_free()
    short = [c for c in set(deck) if c not in BASICS and free.get(c, 0) < deck.count(c)]
    assert not short, f"not owned/free: {short}"
    body = "\n".join(f"{deck.count(c)} {c}" for c in sorted(set(deck), key=str.lower))
    (HERE / "final.txt").write_text("Commander\n1 Gilanra, Caller of Wirewood\n1 Alena, Kessig Trapper\n\nDeck\n" + body + "\n", encoding="utf-8")
    sleeved = parse(SLEEVED)
    lands = sum(1 for c in deck if c in BASICS) + sum(1 for c in deck if c in ("Command Tower", "Fabled Passage", "Gruul Turf", "Konstrari Annex", "Riveteers Overlook", "Sheltered Thicket", "Spinerock Knoll"))
    print(f"final.txt: 100 cards, {lands} lands ({deck.count('Forest')} Forest / {deck.count('Mountain')} Mountain); vs sleeved: +{len(set(deck) - set(sleeved))} / -{len(set(sleeved) - set(deck) - set(cmdrs))}")
    print("| Out (engine build) | In | Why |\n|---|---|---|")
    for out, inn, why in SWAPS:
        print(f"| {out} | {inn} | {why} |")


if __name__ == "__main__":
    main()
