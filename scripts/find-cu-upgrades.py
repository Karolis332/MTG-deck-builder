"""Find Common/Uncommon Brawl-tier cards in the user's collection that would upgrade a Ramos deck."""
import csv

COLLECTION = r"C:\Users\QuLeR\Downloads\collection.csv"

# Candidate C/U upgrades — names to look for
candidates = [
    # === Premium removal ===
    "Cut Down", "Go for the Throat", "Anoint with Affliction",
    "Sheoldred's Edict", "Lay Down Arms", "Get Lost",
    "Stern Scolding", "Make Disappear", "Three Steps Ahead",
    "Slip Out the Back", "Hopeful Vigil",
    # === Ramp ===
    "Cultivate", "Kodama's Reach", "Migration Path", "Three Visits",
    "Wayfarer's Bauble", "Manaweft Sliver", "Druid of the Anima",
    "Sylvan Caryatid", "Birds of Paradise",
    "Talisman of Hierarchy", "Talisman of Conviction", "Talisman of Dominance",
    "Talisman of Impulse", "Talisman of Unity",
    # === Draw / value ===
    "Plumb the Forbidden", "Consider", "Opt", "Otherworldly Gaze",
    "Big Score", "Behold the Multiverse",
    # === Multi-color charm-likes (uncommon) ===
    "Jund Charm", "Naya Charm", "Bant Charm", "Esper Charm", "Grixis Charm",
    "Pacification Array", "Sylvan Awakening",
    # === Protection ===
    "Defiant Strike", "Snakeskin Veil", "Tamiyo's Safekeeping",
    # === Other Ramos-aware uncommons ===
    "Maestros Diabolist", "Riveteers Initiate", "Brokers Initiate",
    "Vivien on the Hunt",
    # === Counter-related (Hardened Scales synergy) ===
    "Pollenbright Druid", "Conclave Mentor",
    # === Cantrips ===
    "Frantic Inventory", "Big Score",
]

owned_map = {}  # lowercase_name -> (max_count, rarity)
with open(COLLECTION, encoding="utf-8") as f:
    r = csv.DictReader(f)
    for row in r:
        nm = row["Name"].strip()
        key = nm.lower()
        cnt = int(row["Count"])
        prev = owned_map.get(key)
        if prev is None or cnt > prev[0]:
            owned_map[key] = (cnt, row["Rarity"], nm)

print(f"{'CARD':<35} {'RARITY':<10} {'OWNED':>5}  STATUS")
print("-" * 75)
own_zero_uc = []
own_zero_c = []
for c in candidates:
    key = c.lower()
    if key in owned_map:
        cnt, rarity, real_name = owned_map[key]
        status = "OWNED" if cnt >= 1 else f"CRAFT ({rarity})"
        if cnt == 0:
            if rarity.lower() == "uncommon":
                own_zero_uc.append(real_name)
            elif rarity.lower() == "common":
                own_zero_c.append(real_name)
        print(f"{real_name:<35} {rarity:<10} {cnt:>5}  {status}")
    else:
        print(f"{c:<35} {'NOT ON ARENA':<10} {'-':>5}  skip")

print(f"\n=== OWN ZERO COPIES (can craft cheap) ===")
print(f"Uncommons ({len(own_zero_uc)}): {', '.join(own_zero_uc)}")
print(f"Commons ({len(own_zero_c)}): {', '.join(own_zero_c)}")
