"""Query the live CF model with realistic Ramos seed cards from user's pool."""
import json
import urllib.request

API = "http://187.77.110.100/cf-api"
KEY = "97c1d0df913335761afde8d86ac568a061416fa96fdb467e6597e6d9cd9436c1"

# Seed = recognizable Ramos staples from user's collection — gives CF a clear signal
seed = [
    "Izzet Charm", "Boros Charm", "Witherbloom Charm", "Silverquill Charm",
    "Lorehold Charm", "Quandrix Charm", "Prismari Charm",
    "Jeskai Charm", "Abzan Charm", "Temur Charm", "Mardu Charm", "Sultai Charm",
    "Arcane Signet", "Talisman of Progress", "Talisman of Creativity",
    "Talisman of Indulgence", "Talisman of Resilience", "Talisman of Curiosity",
    "Bring to Light", "Path to Exile", "Mystical Tutor",
    "Sacred Foundry", "Steam Vents", "Blood Crypt", "Overgrown Tomb",
    "Hallowed Fountain", "Breeding Pool", "Temple Garden", "Stomping Ground",
    "Godless Shrine",
    "Kenrith, the Returned King", "Progenitus",
]

req = urllib.request.Request(
    f"{API}/recommend",
    data=json.dumps({"cards": seed, "commander": "Ramos, Dragon Engine", "limit": 200}).encode(),
    headers={"x-api-key": KEY, "Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=30) as r:
    data = json.loads(r.read())

recs = data.get("recommendations", [])
print(f"Got {len(recs)} recommendations\n")
print(f"{'CARD':<55} {'SCORE':>7} {'DECKS':>6}")
print("-" * 75)
for i, rec in enumerate(recs[:120]):
    print(f"{rec['card_name'][:54]:<55} {rec['cf_score']:>7.4f} {rec['similar_deck_count']:>6}")

# Save full list for downstream comparison
with open(r"C:\Users\QuLeR\MTG-deck-builder\scripts\ramos-model-recs.json", "w") as f:
    json.dump(data, f, indent=2)
print(f"\nSaved full output to scripts/ramos-model-recs.json")
