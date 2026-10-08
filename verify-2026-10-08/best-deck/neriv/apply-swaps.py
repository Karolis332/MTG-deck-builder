"""Model's Neriv list -> operator list: revert role-window filler, rebuild the mana base from owned Arena duals."""
import pathlib, sys

SRC = pathlib.Path("verify-2026-10-08/best-deck/arena-3/top-2-neriv-heart-of-the-storm.txt")
DST = pathlib.Path("verify-2026-10-08/best-deck/neriv/neriv-arena.txt")

SWAPS = {
    # spells: filler out -> Neriv payoff in
    "Perilous Vault": "Purphoros, God of the Forge",
    "Mardu Banner": "Aggravated Assault",
    "Wayfarer's Bauble": "Gut, True Soul Zealot",
    "Reprieve": "Raphael, the Nightwatcher",
    "Untimely Malfunction": "Leonin Warleader",
    "Dawn's Truce": "Raph & Leo, Sibling Rivals",
    "Faithless Looting": "War Effort",
    "Thrill of Possibility": "Zariel, Archduke of Avernus",
    "Camera Launcher": "General Kreat, the Boltbringer",
    "News Helicopter": "Chandra, Acolyte of Flame",
    "Glassworks // Shattered Yard": "Great Train Heist",
    # lands: colourless / tapped filler out -> untapped owned duals in
    "Bojuka Bog": "Mount Doom",
    "Rogue's Passage": "Sokenzan, Crucible of Defiance",
    "Evolving Wilds": "Dark Fortress",
    "Terramorphic Expanse": "Concealed Courtyard",
    "Shattered Landscape": "Legion Leadership // Legion Stronghold",
    "Urborg, Tomb of Yawgmoth": "Eiganjo, Seat of the Empire",
    "Bloodfell Caves": "Mountain",
    "Wind-Scarred Crag": "Plains",
}

lines = SRC.read_text(encoding="utf-8").splitlines()
out, seen = [], set()
counts: dict[str, int] = {}
for line in lines:
    parts = line.split(" ", 1)
    if len(parts) == 2 and parts[0].isdigit():
        qty, name = int(parts[0]), parts[1]
        if name in SWAPS:
            seen.add(name)
            name = SWAPS[name]
        counts[name] = counts.get(name, 0) + qty
        out.append((qty, name))
    else:
        out.append(line)

missing = set(SWAPS) - seen
if missing:
    sys.exit(f"not found in the model list: {sorted(missing)}")

# merge duplicate basic lines
merged, done = [], set()
for item in out:
    if isinstance(item, tuple):
        qty, name = item
        if name in done:
            continue
        done.add(name)
        merged.append(f"{counts[name]} {name}")
    else:
        merged.append(item)
DST.write_text("\n".join(merged) + "\n", encoding="utf-8")
total = sum(q for q in counts.values())
print(f"wrote {DST} ({total} cards incl. commander; {len(SWAPS)} swaps)")
