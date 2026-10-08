"""Esika Superfriends v6 = v5 (the operator's in-Arena list) + the lab climb's expensive-walker cuts, filled by judgment with
five-colour ramp the operator owns on Arena (climb-1.ndjson: 17 swaps, objective 61.6 -> 95.4, adds were Monuments / Talents / filler).
  py verify-2026-10-08/best-deck/esika/build-v6.py [--slot "Card"] [--land "Card"] [--out path]
Writes the Arena-format list (About / Name / Commander / Deck) and a bare list for the lab."""
import argparse
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[3]
V5 = ROOT / "decks/arena/esika-superfriends-v5.txt"
CUTS = [  # climb cuts kept: 5-7 MV walkers that need double pips in a five-colour deck, plus the two non-synergy BB cards
    "Vraska, Betrayal's Sting", "Kaya, Intangible Slayer", "Ugin, the Ineffable", "The Eternal Wanderer", "Sarkhan the Masterless",
    "Garruk, Curse Breaker", "Garruk, Veiled Butcher", "Jace, Multiverse Architect", "Jace, Reality Sculptor",
    "Sheoldred, the Apocalypse", "Phyrexian Arena",
]
# climb cuts REVERTED (kept in v6): Sylvan Library, Enlightened Tutor, Path to Exile, Teferi's Protection, Godless Shrine, Shatterskull Smashing
ADDS = [
    "Farseek", "Wood Elves", "Ilysian Caryatid", "Paradise Druid", "Talisman of Curiosity", "Talisman of Unity",
    "Enduring Vitality", "Kiora, Behemoth Beckoner", "Forest",
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slot", default="Rampant Growth", help="the 10th nonland add (lab-decided)")
    ap.add_argument("--land", default="Jetmir's Garden", help="the 2nd land add (lab-decided)")
    ap.add_argument("--out", default=str(ROOT / "verify-2026-10-08/best-deck/esika/esika-v6.txt"))
    a = ap.parse_args()
    lines = [l.strip() for l in V5.read_text(encoding="utf-8").splitlines()]
    cards = [re.sub(r"^1\s+", "", l) for l in lines if re.match(r"^1\s", l)]
    commander = cards[0]
    deck = cards[1:]
    assert commander.startswith("Esika"), commander
    missing = [c for c in CUTS if c not in deck]
    assert not missing, f"cuts not in v5: {missing}"
    deck = [c for c in deck if c not in CUTS] + ADDS + [a.slot, a.land]
    assert len(deck) == 99, len(deck)
    dup = {c for c in deck if deck.count(c) > 1 and c not in ("Forest", "Plains", "Island", "Swamp", "Mountain")}
    assert not dup, f"duplicates: {dup}"
    out = pathlib.Path(a.out)
    body = "\n".join(f"1 {c}" for c in sorted(deck, key=str.lower))
    out.write_text(f"Commander\n1 {commander}\n\nDeck\n{body}\n", encoding="utf-8")  # Commander/Deck headers for the gate + check page; arena-import adds About/Name
    out.with_suffix(".lab.txt").write_text(body + "\n", encoding="utf-8")
    print(f"{out.name}: 99 + commander; cuts {len(CUTS)}, adds {len(ADDS) + 2} (slot {a.slot}, land {a.land})")


if __name__ == "__main__":
    main()
