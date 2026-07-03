"""
CF API wrapper that fixes 3 model deficiencies for Arena Brawl + Kaheera:
  1. Filters non-Arena-legal cards (arena_id IS NOT NULL)
  2. Filters non-Historic-Brawl cards (legalities.brawl == 'legal')
  3. Filters Kaheera-illegal creatures (not Cat/Elemental/Dragon/Beast/Nightmare/Changeling)
  4. Filters cards already in deck

Asks CF API for a wide net (limit=100) then post-processes locally.
"""
import json
import os
import sqlite3
import urllib.request

API_URL = "http://187.77.110.100/cf-api"
API_KEY = "97c1d0df913335761afde8d86ac568a061416fa96fdb467e6597e6d9cd9436c1"
DB_PATH = os.path.join(os.environ["APPDATA"], "the-black-grimoire", "data", "mtg-deck-builder.db")

KAHEERA_TYPES = {"Cat", "Elemental", "Dragon", "Beast", "Nightmare"}

CURRENT_DECK = [
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


def fetch_recs(commander: str, cards: list[str], limit: int = 100) -> list[dict]:
    payload = {"commander": commander, "cards": cards, "limit": limit}
    req = urllib.request.Request(
        f"{API_URL}/recommend",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-api-key": API_KEY},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["recommendations"]


def is_kaheera_legal(type_line: str) -> bool:
    """Non-creatures pass. Creatures must be Cat/Elemental/Dragon/Beast/Nightmare or Changeling."""
    if "Creature" not in type_line:
        return True
    for t in KAHEERA_TYPES:
        if t in type_line:
            return True
    return False


def card_meta(cur, name: str) -> dict | None:
    base_name = name.split(" // ")[0]
    cur.execute(
        "SELECT type_line, legalities, arena_id, oracle_text, rarity, edhrec_rank "
        "FROM cards WHERE name = ? OR name LIKE ? LIMIT 1",
        (base_name, base_name + " //%"),
    )
    row = cur.fetchone()
    if not row:
        return None
    legal = json.loads(row[1]) if row[1] else {}
    return {
        "type_line": row[0] or "",
        "brawl_legal": legal.get("brawl") == "legal",
        "arena_id": row[2],
        "has_changeling": "changeling" in (row[3] or "").lower(),
        "rarity": row[4],
        "edhrec_rank": row[5],
    }


def filter_recs(recs: list[dict], deck: set[str]) -> tuple[list[dict], list[dict]]:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    kept, dropped = [], []
    for r in recs:
        name = r["card_name"]
        if name in deck or name.split(" // ")[0] in deck:
            dropped.append({**r, "reason_dropped": "already in deck"})
            continue
        meta = card_meta(cur, name)
        if meta is None:
            dropped.append({**r, "reason_dropped": "not in card DB"})
            continue
        if meta["arena_id"] is None:
            dropped.append({**r, "reason_dropped": "not on Arena"})
            continue
        if not meta["brawl_legal"]:
            dropped.append({**r, "reason_dropped": "not Brawl-legal"})
            continue
        kaheera_ok = is_kaheera_legal(meta["type_line"]) or meta["has_changeling"]
        if not kaheera_ok:
            dropped.append({**r, "reason_dropped": f"breaks Kaheera ({meta['type_line']})"})
            continue
        kept.append({**r, "type_line": meta["type_line"], "rarity": meta["rarity"], "edhrec_rank": meta["edhrec_rank"]})
    conn.close()
    return kept, dropped


def main() -> None:
    print("Querying CF API (limit=100)...")
    recs = fetch_recs("Ashling, the Limitless", CURRENT_DECK, 100)
    print(f"  Got {len(recs)} raw recommendations")

    deck = set(CURRENT_DECK)
    kept, dropped = filter_recs(recs, deck)

    print(f"\n=== FILTERED (Arena-legal + Brawl-legal + Kaheera-compatible) ===")
    print(f"Kept: {len(kept)}  |  Dropped: {len(dropped)}\n")

    print("TOP 20 KEPT:")
    print(f"{'#':>3}  {'score':>6}  {'sim':>4}  {'rarity':>8}  {'edhrec':>6}  card  /  type")
    for i, k in enumerate(kept[:20], 1):
        print(
            f"{i:>3}  {k['cf_score']:>6.3f}  {k['similar_deck_count']:>4}  "
            f"{(k['rarity'] or '?'):>8}  {(k['edhrec_rank'] or 0):>6}  "
            f"{k['card_name']}  ({k['type_line']})"
        )

    print("\nTOP 15 DROPPED (with reason):")
    for d in dropped[:15]:
        print(f"  {d['cf_score']:.3f}  {d['card_name']:<45}  → {d['reason_dropped']}")

    print("\n=== SUMMARY ===")
    arena_rate = len(kept) / len(recs) * 100 if recs else 0
    print(f"Arena+Brawl+Kaheera pass rate: {arena_rate:.1f}% ({len(kept)}/{len(recs)})")


if __name__ == "__main__":
    main()
