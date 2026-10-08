"""Model's Jet list -> operator list: revert role-window filler, add the owned go-wide payoffs, rebuild the mana base."""
import pathlib, sys

SRC = pathlib.Path("verify-2026-10-08/best-deck/arena-3/top-1-jet-freedom-fighter.txt")
DST = pathlib.Path("verify-2026-10-08/best-deck/jet/jet-arena.txt")

SWAPS = {
    # spells: filler out -> go-wide payoff in
    "Environmental Sciences": "Purphoros, God of the Forge",
    "Way of the Pyromancer": "Impact Tremors",
    "Tibalt's Trickery": "Witty Roastmaster",
    "Price of Freedom": "Slash, Reptile Rampager",
    "Bender's Waterskin": "Intangible Virtue",
    "Chromatic Lantern": "Heroic Reinforcements",
    "White Lotus Tile": "Leonin Warleader",
    "Archaeomancer's Spade": "Resolute Reinforcements",
    "Curious Farm Animals": "Goblin Instigator",
    "Path to Redemption": "Honored Knight-Captain",
    "Lithobraking": "Imodane's Recruiter",
    "Jet's Brainwashing": "Ogre Battledriver",
    "Dawn's Truce": "Cloudshift",
    "Compassionate Healer": "Mighty Mutanimals",
    "Cunning Maneuver": "Crusader of Odric",
    "Glider Staff": "Lightning Helix",
    "Solemn Simulacrum": "Dalkovan Packbeasts",
    "Swiftfoot Boots": "Outlaws' Merriment",
    "Yip Yip!": "Teleportation Circle",
    "Longshot, Rebel Bowman": "Chandra, Acolyte of Flame",
    "Deserter's Disciple": "Dauntless Veteran",
    "Water Tribe Captain": "Zurgo's Vanguard",
    "Glider Kids": "Shock Brigade",
    "Team Avatar": "Inspiring Overseer",
    # second pass: 4-drops 15 -> 11, draw 7 -> 10, lands 33 -> 34
    "Bumi Bash": "Belladonna Took",
    "Avatar's Wrath": "Reckoner Bankbuster",
    "Wandering Musicians": "Plains",
    # lands: colourless / filter / fetch filler out -> coloured owned lands in (36 -> 35 lands)
    "Rogue's Passage": "Arena of Glory",
    "Secret Tunnel": "Legion Leadership",
    "Reliquary Tower": "Razorgrass Ambush",
    "Unclaimed Territory": "Plains",
    "White Lotus Hideout": "Plains",
    "Rumble Arena": "Plains",
    "Evolving Wilds": "Plains",
    "Terramorphic Expanse": "Mountain",
    "Secluded Steppe": "Three Blind Mice",
}
# Arena import wants the front face only
FRONT_FACE = {
    "Glassworks // Shattered Yard": "Glassworks",
    "Witch Enchanter // Witch-Blessed Meadow": "Witch Enchanter",
    "Grand Entryway // Elegant Rotunda": "Grand Entryway",
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
        name = FRONT_FACE.get(name, name)
        counts[name] = counts.get(name, 0) + qty
        out.append((qty, name))
    else:
        out.append(line)

missing = set(SWAPS) - seen
if missing:
    sys.exit(f"not found in the model list: {sorted(missing)}")

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
total = sum(counts.values())
dupes = [n for n, q in counts.items() if q > 1 and n not in ("Plains", "Mountain")]
print(f"{DST}: {total} cards, {len(counts)} lines, {len(SWAPS)} swaps; non-basic duplicates: {dupes or 'none'}")
if total != 100 or dupes:
    sys.exit(1)
