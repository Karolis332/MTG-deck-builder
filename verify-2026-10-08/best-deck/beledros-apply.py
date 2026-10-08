"""Beledros replaces Meren in the paper registry. Dry run by default; `--apply` writes.

  py verify-2026-10-08/best-deck/beledros-apply.py [--apply]

Does, in order:
  1. decks/paper/decks/beledros-witherbloom.txt  <- verify-2026-10-08/best-deck/beledros-recommended.txt (paper format: commander first, no headers)
  2. donor backfills: Cabbage 4, Imotekh 4, Gilanra 1 (guide §3 table), each donor stays at its card count
  3. Meren leftovers stay owned: any leftover missing from collection.txt is appended
  4. Meren's sleeved list is frozen to verify-2026-10-08/best-deck/meren-sleeved-2026-10-08.txt, check-page.ts points at the copy, the Meren deck file is removed
Then (printed, not run): DB backup, paper-sync, gate.
"""
import pathlib
import re
import sys
from collections import OrderedDict

ROOT = pathlib.Path(__file__).resolve().parents[2]
DECKS = ROOT / "decks/paper/decks"
COLLECTION = ROOT / "decks/paper/collection.txt"
MEREN = DECKS / "meren-of-clan-nel-toth.txt"
MEREN_FROZEN = ROOT / "verify-2026-10-08/best-deck/meren-sleeved-2026-10-08.txt"
BELEDROS = DECKS / "beledros-witherbloom.txt"
SRC = ROOT / "verify-2026-10-08/best-deck/beledros-recommended.txt"
CHECK_PAGE = ROOT / "verify-2026-10-02/tam-precons/check-page.ts"
BASICS = {"Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"}
BACKFILLS = {
    "the-cabbage-merchant.txt": {
        "Pest Infestation": "Haywire Mite",
        "Idol of Oblivion": "Ramunap Excavator",  # Cabbage already runs Llanowar Elves (singleton)
        "Ribtruss Roaster": "Basking Broodscale",
        "Kodama's Reach": "Springbloom Druid",
    },
    "imotekh-the-stormlord.txt": {
        "Ashnod's Altar": "Woe Strider",
        "Skorpekh Lord": "Grim Haruspex",  # Imotekh already runs Solemn Simulacrum and Syr Konrad (singleton)
        "Phyrexian Arena": "Rune-Scarred Demon",
        "Imp's Mischief": "Ravenous Chupacabra",
    },
    "gilanra-alena-partners.txt": {"Thunderfoot Baloth": "Domri, Anarch of Bolas"},
}
LINE = re.compile(r"^(\d+)\s+(.+?)\s*$")
HEADER = re.compile(r"^(commander|deck|sideboard|companion)$", re.I)


def parse(path: pathlib.Path) -> tuple[list[str], "OrderedDict[str, int]"]:
    """-> (commander names from a Commander section, ordered name->qty of everything else)."""
    commanders: list[str] = []
    counts: "OrderedDict[str, int]" = OrderedDict()
    section = "deck"
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        if HEADER.match(line):
            section = line.lower()
            continue
        m = LINE.match(line)
        if not m:
            continue
        qty, name = int(m.group(1)), m.group(2)
        if section == "commander":
            commanders.append(name)
        else:
            counts[name] = counts.get(name, 0) + qty
    return commanders, counts


def render(lines: "OrderedDict[str, int]") -> str:
    return "\n".join(f"{q} {n}" for n, q in lines.items()) + "\n"


def total(counts: "OrderedDict[str, int]") -> int:
    return sum(counts.values())


def main(apply: bool) -> None:
    problems: list[str] = []

    # 1. Beledros deck file
    commanders, deck = parse(SRC)
    if commanders != ["Beledros Witherbloom"]:
        problems.append(f"source commander line is {commanders}")
    beledros = OrderedDict([("Beledros Witherbloom", 1)] + list(deck.items()))
    print(f"Beledros: {total(beledros)} cards ({len(beledros)} lines)")

    # 2. donor backfills
    donor_out: dict[pathlib.Path, "OrderedDict[str, int]"] = {}
    for fname, swaps in BACKFILLS.items():
        path = DECKS / fname
        _, counts = parse(path)  # paper files have no headers: commander is the first line
        before = total(counts)
        new = OrderedDict()
        for name, qty in counts.items():
            if name in swaps:
                if qty != 1:
                    problems.append(f"{fname}: {name} x{qty}, expected 1")
                new[swaps[name]] = new.get(swaps[name], 0) + 1
            else:
                new[name] = new.get(name, 0) + qty
        missing = [n for n in swaps if n not in counts]
        if missing:
            problems.append(f"{fname}: raided cards not in the deck: {missing}")
        dup = [b for b in swaps.values() if b in counts]
        if dup:
            problems.append(f"{fname}: backfill already in the deck: {dup}")
        donor_out[path] = new
        print(f"{fname}: {before} -> {total(new)} cards; " + ", ".join(f"{a} -> {b}" for a, b in swaps.items()))

    # 3. Meren leftovers must stay owned
    _, meren = parse(MEREN)
    used_by_beledros = set(beledros)
    backfills_used = {b for s in BACKFILLS.values() for b in s.values()}
    leftovers = [n for n in meren if n not in used_by_beledros and n not in backfills_used and n not in BASICS]
    _, collection = parse(COLLECTION)
    to_add = [n for n in leftovers if n not in collection]
    print(f"Meren: {total(meren)} cards; {len(leftovers)} leftovers go back to the box; {len(to_add)} missing from collection.txt -> appended:")
    for n in to_add:
        print(f"  + {n}")
    loose_backfills = [b for b in backfills_used if b not in meren]
    print(f"backfills not from Meren (must be loose): {loose_backfills}")

    # check-page.ts must stop reading the Meren deck file
    cp_text = CHECK_PAGE.read_text(encoding="utf-8")
    old_ref = "decks/paper/decks/meren-of-clan-nel-toth.txt"
    new_ref = MEREN_FROZEN.relative_to(ROOT).as_posix()
    print(f"check-page.ts: {cp_text.count(old_ref)} reference(s) to the Meren file -> {new_ref}")

    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print("  - " + p)
        sys.exit(1)
    if not apply:
        print("\ndry run — nothing written. Re-run with --apply.")
        return

    MEREN_FROZEN.write_text(MEREN.read_text(encoding="utf-8"), encoding="utf-8")
    BELEDROS.write_text(render(beledros), encoding="utf-8")
    for path, counts in donor_out.items():
        path.write_text(render(counts), encoding="utf-8")
    if to_add:
        with COLLECTION.open("a", encoding="utf-8") as fh:
            fh.write("".join(f"1 {n}\n" for n in to_add))
    CHECK_PAGE.write_text(cp_text.replace(old_ref, new_ref), encoding="utf-8")
    MEREN.unlink()
    print("\napplied. Now run:")
    print('  cp "$APPDATA/the-black-grimoire/data/mtg-deck-builder.db" "$APPDATA/the-black-grimoire/data/mtg-deck-builder.db.bak-2026-10-08-beledros"')
    print("  MTG_DB_DIR=C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data npx tsx scripts/paper-sync.ts --dry   # then without --dry")
    print("  MTG_DB_DIR=... npx tsx scripts/deck-gate.ts verify-2026-10-08/best-deck/beledros-recommended.txt --format commander --owner 1 --source paper")
    print("  npx tsx verify-2026-10-02/tam-precons/check-page.ts")


if __name__ == "__main__":
    main("--apply" in sys.argv)
