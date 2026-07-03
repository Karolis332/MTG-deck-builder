"""Query CF API for Ashling, the Limitless recommendations."""
import json
import urllib.request

API_URL = "http://187.77.110.100/cf-api"
API_KEY = "97c1d0df913335761afde8d86ac568a061416fa96fdb467e6597e6d9cd9436c1"

# Current Ashling deck (post my-upgrade) — sending the 99 deck cards
current_cards = [
    "Anguished Unmaking", "Arcane Signet", "Arid Mesa", "Ashling, Rekindled",
    "Ashling's Command", "Ashnod's Altar", "Bloodstained Mire", "Boseiju, Who Endures",
    "Breeding Pool", "Cavalier of Dawn", "Cavalier of Night", "Cavalier of Thorns",
    "Cavern of Souls", "Champion of the Path", "Chandra's Embercat", "Chomping Changeling",
    "Command Tower", "Cryptolith Rite", "Cultivate", "Eclipsed Flamekin",
    "Eirdu, Carrier of Dawn", "Ephemerate", "Evendo, Waking Haven", "Explosive Prodigy",
    "Farseek", "Flamebraider", "Flooded Strand", "Forest", "Fury", "Graveshifter",
    "Herd Heirloom", "Indatha Triome", "Island", "Jegantha, the Wellspring",
    "Lightning Greaves", "Lumra, Bellow of the Woods", "Malakir Rebirth",
    "Mana Confluence", "Marsh Flats", "Masked Vandal", "Misty Rainforest",
    "Mountain", "Muldrotha, the Gravetide", "Multiversal Passage", "Mutable Explorer",
    "Mutavault", "Nameless Inversion", "Nulldrifter", "Nyxbloom Ancient",
    "Omnath, Locus of Creation", "Omnath, Locus of the Roil", "Omni-Changeling",
    "Overgrown Tomb", "Phyrexian Tower", "Plains", "Plaza of Heroes",
    "Prismatic Vista", "Realmwalker", "Regal Force", "Rimekin Recluse",
    "Risen Reef", "Scalding Tarn", "Secluded Courtyard", "Secret Tunnel",
    "Shimmercreep", "Shinestriker", "Shroudstomper", "Six", "Solitude",
    "Soulbright Seeker", "Soulstone Sanctuary", "Spara's Headquarters",
    "Spelunking", "Starting Town", "Steam Vents", "Stomping Ground",
    "Summon: Shiva", "Sun-Crowned Hunters", "Sunderflock", "Sunken Citadel",
    "Swords to Plowshares", "Tamiyo, Compleated Sage", "Tangled Florahedron",
    "Tear Asunder", "Temple Garden", "The Cruelty of Gix", "The World Tree",
    "Three Tree City", "Three Visits", "Thryx, the Sudden Storm",
    "Triumphant Reckoning", "Twinflame Travelers", "Unclaimed Territory",
    "Verdant Catacombs", "Wash Away", "Windswept Heath", "Wooded Foothills",
    "Wrenn and Realmbreaker", "Yarok, the Desecrated",
]

payload = {
    "commander": "Ashling, the Limitless",
    "cards": current_cards,
    "limit": 40,
}

req = urllib.request.Request(
    f"{API_URL}/recommend",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json", "x-api-key": API_KEY},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"ERR: {type(e).__name__}: {e}")
