"""Cross-check ramos-best-of-both deck against MTGA collection CSV."""
import csv
import re
import sys

COLLECTION = r"C:\Users\QuLeR\Downloads\collection.csv"
DECK = r"C:\Users\QuLeR\MTG-deck-builder\decks\ramos-gates-mazes-end.txt"

# Build owned map: name -> total count (across all printings)
owned = {}
rarity_map = {}
with open(COLLECTION, encoding="utf-8") as f:
    r = csv.DictReader(f)
    for row in r:
        name = row["Name"].strip().lower()
        cnt = int(row["Count"])
        owned[name] = owned.get(name, 0) + cnt
        if name not in rarity_map or row["Rarity"] != "":
            rarity_map[name] = row["Rarity"]

# Parse deck file
with open(DECK, encoding="utf-8") as f:
    lines = f.readlines()

# Match lines like: "1 Card Name (SET) NUM"
pattern = re.compile(r"^\d+\s+(.+?)\s+\([A-Za-z0-9]+\)\s+\d+")
deck_cards = []
in_deck = False
for ln in lines:
    s = ln.strip()
    if s == "Deck":
        in_deck = True
        continue
    if not s or s == "Commander":
        continue
    m = pattern.match(s)
    if m:
        name = m.group(1).strip()
        # Strip "A-" Alchemy prefix only if literal prefix
        if name.startswith("A-"):
            name = name[2:]
        deck_cards.append(name)

print(f"Deck has {len(deck_cards)} non-commander cards")
print(f"Collection has {len(owned)} distinct card names\n")

missing = []
own_zero = []
ok = []
for c in deck_cards:
    key = c.lower()
    cnt = owned.get(key, -1)
    rarity = rarity_map.get(key, "?")
    if cnt == -1:
        missing.append((c, rarity))
    elif cnt == 0:
        own_zero.append((c, rarity))
    else:
        ok.append((c, cnt, rarity))

print(f"=== OWNED ({len(ok)}) ===")
for c, cnt, r in sorted(ok):
    print(f"  [{cnt}] {c} ({r})")

print(f"\n=== OWN ZERO COPIES — NEED TO CRAFT ({len(own_zero)}) ===")
for c, r in sorted(own_zero):
    print(f"  {c} ({r})")

print(f"\n=== NOT IN COLLECTION CSV AT ALL ({len(missing)}) ===")
for c, r in sorted(missing):
    print(f"  {c} ({r})")

# Wildcard cost
craft_summary = {"common": 0, "uncommon": 0, "rare": 0, "mythic": 0, "?": 0}
for c, r in own_zero + missing:
    key = r.lower() if r else "?"
    craft_summary[key if key in craft_summary else "?"] += 1
print(f"\n=== WILDCARD COST ===")
for k, v in craft_summary.items():
    if v:
        print(f"  {k}: {v}")
