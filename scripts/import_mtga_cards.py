"""
Import Arena grpId → card name mappings from MTGA local data files.

Parses data_cards_*.mtga + data_loc_*.mtga from the Arena installation
to build a complete grpId mapping for ALL Arena cards (including Alchemy/digital-only).

Usage:
  py scripts/import_mtga_cards.py                          # Auto-detect MTGA path
  py scripts/import_mtga_cards.py --mtga-path "D:/Games/MTGA"
  py scripts/import_mtga_cards.py --db data/mtg-deck-builder.db
  py scripts/import_mtga_cards.py --dry-run                # Preview without DB writes
"""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from glob import glob


# Common MTGA installation paths (Windows)
MTGA_SEARCH_PATHS = [
    r"C:\Program Files\Wizards of the Coast\MTGA",
    r"C:\Program Files (x86)\Wizards of the Coast\MTGA",
    r"D:\Program Files\Wizards of the Coast\MTGA",
    r"D:\Games\MTGA",
    r"E:\Games\MTGA",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Wizards of the Coast\MTGA"),
    # Epic Games installs
    r"C:\Program Files\Epic Games\MagicTheGathering",
    r"D:\Epic Games\MagicTheGathering",
    # Steam installs
    r"C:\Program Files (x86)\Steam\steamapps\common\MTGA",
]

DATA_SUBDIR = os.path.join("MTGA_Data", "Downloads", "Data")


def find_mtga_path() -> Path | None:
    """Auto-detect MTGA installation path."""
    for base in MTGA_SEARCH_PATHS:
        data_dir = Path(base) / DATA_SUBDIR
        if data_dir.exists():
            return data_dir
    return None


def find_latest_file(data_dir: Path, prefix: str) -> Path | None:
    """Find the most recently modified file matching a prefix."""
    matches = sorted(data_dir.glob(f"{prefix}_*.mtga"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not matches:
        # Also check for .json extension (some versions)
        matches = sorted(data_dir.glob(f"{prefix}_*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def parse_loc_file(loc_path: Path) -> dict[int, str]:
    """Parse localization file to build titleId → text map."""
    print(f"  Parsing localization: {loc_path.name} ({loc_path.stat().st_size / 1024 / 1024:.1f} MB)")
    raw = loc_path.read_text(encoding="utf-8")
    data = json.loads(raw)

    title_map: dict[int, str] = {}

    # Format varies by Arena version — handle both array and dict formats
    if isinstance(data, list):
        for entry in data:
            if isinstance(entry, dict):
                # Format: [{isoCode: "en-US", keys: [{id: 123, text: "Lightning Bolt"}]}]
                for key in entry.get("keys", []):
                    if isinstance(key, dict) and "id" in key and "text" in key:
                        title_map[key["id"]] = key["text"]
    elif isinstance(data, dict):
        # Alternative flat format
        for key_id, text in data.items():
            try:
                title_map[int(key_id)] = str(text)
            except (ValueError, TypeError):
                pass

    print(f"  Found {len(title_map):,} localization entries")
    return title_map


def parse_cards_file(cards_path: Path, title_map: dict[int, str]) -> list[dict]:
    """Parse cards file to extract grpId → card data mappings."""
    print(f"  Parsing cards: {cards_path.name} ({cards_path.stat().st_size / 1024 / 1024:.1f} MB)")
    raw = cards_path.read_text(encoding="utf-8")
    data = json.loads(raw)

    cards = []
    skipped = 0

    items = data if isinstance(data, list) else data.get("cards", data.get("Cards", []))

    for card in items:
        if not isinstance(card, dict):
            continue

        # grpId field name varies: grpid, grpId, GrpId
        grp_id = card.get("grpid") or card.get("grpId") or card.get("GrpId")
        if not grp_id:
            skipped += 1
            continue

        # Get card name from localization
        title_id = card.get("titleId") or card.get("TitleId")
        name = title_map.get(title_id, "") if title_id else ""

        # Fallback: some formats include name directly
        if not name:
            name = card.get("name") or card.get("Name") or ""

        if not name:
            skipped += 1
            continue

        # Extract set code
        set_code = card.get("set") or card.get("Set") or card.get("expansionCode") or ""

        # Extract mana cost (Arena format uses 'o' prefix: "o2oUoU")
        raw_cost = card.get("castingcost") or card.get("CastingCost") or ""
        mana_cost = convert_arena_mana_cost(raw_cost) if raw_cost else None

        # Extract CMC
        cmc = card.get("cmc") or card.get("Cmc") or 0

        # Rarity: 0=token, 1=basic land, 2=common, 3=uncommon, 4=rare, 5=mythic
        rarity = card.get("rarity") or card.get("Rarity") or 0
        rarity_names = {0: "token", 1: "basic", 2: "common", 3: "uncommon", 4: "rare", 5: "mythic"}
        rarity_name = rarity_names.get(rarity, "unknown")

        # Is this a "real" card (not a token/emblem)?
        is_primary = card.get("isPrimaryCard", card.get("IsPrimaryCard", True))
        is_token = card.get("isToken", card.get("IsToken", False))
        is_digital_only = card.get("digitalOnly", card.get("DigitalOnly", False))

        cards.append({
            "grp_id": int(grp_id),
            "card_name": name,
            "set_code": str(set_code).upper(),
            "mana_cost": mana_cost,
            "cmc": float(cmc) if cmc else 0.0,
            "rarity": rarity_name,
            "is_primary": bool(is_primary),
            "is_token": bool(is_token),
            "is_digital_only": bool(is_digital_only),
        })

    print(f"  Found {len(cards):,} cards (skipped {skipped} without name/grpId)")
    return cards


def convert_arena_mana_cost(arena_cost: str) -> str:
    """Convert Arena mana cost format (o2oUoU) to standard ({2}{U}{U})."""
    if not arena_cost:
        return ""
    result = ""
    i = 0
    while i < len(arena_cost):
        if arena_cost[i] == "o" and i + 1 < len(arena_cost):
            symbol = arena_cost[i + 1]
            # Handle multi-char costs like o10, o11, etc.
            j = i + 2
            while j < len(arena_cost) and arena_cost[j].isdigit():
                symbol += arena_cost[j]
                j += 1
            result += "{" + symbol + "}"
            i = j
        else:
            i += 1
    return result


def insert_to_db(db_path: str, cards: list[dict], dry_run: bool = False) -> tuple[int, int]:
    """Insert/update grp_id_cache entries. Returns (inserted, updated) counts."""
    if dry_run:
        print(f"\n  [DRY RUN] Would insert up to {len(cards):,} entries into grp_id_cache")
        return len(cards), 0

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check existing entries
    cursor.execute("SELECT grp_id, card_name, source FROM grp_id_cache")
    existing = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

    inserted = 0
    upgraded = 0

    for card in cards:
        grp_id = card["grp_id"]

        if grp_id in existing:
            old_name, old_source = existing[grp_id]
            # Don't overwrite richer data from Scryfall/arena_id
            if old_source in ("scryfall", "arena_id"):
                continue
            # Upgrade name-only entries from arena_gameobject
            if old_source == "arena_gameobject" and card["mana_cost"]:
                cursor.execute(
                    """UPDATE grp_id_cache
                       SET card_name = ?, mana_cost = ?, cmc = ?, source = 'mtga_data'
                       WHERE grp_id = ?""",
                    (card["card_name"], card["mana_cost"], card["cmc"], grp_id)
                )
                upgraded += 1
        else:
            cursor.execute(
                """INSERT OR IGNORE INTO grp_id_cache
                   (grp_id, card_name, mana_cost, cmc, source)
                   VALUES (?, ?, ?, ?, 'mtga_data')""",
                (grp_id, card["card_name"], card["mana_cost"], card["cmc"])
            )
            inserted += 1

    conn.commit()

    # Report coverage
    cursor.execute("SELECT COUNT(*) FROM grp_id_cache")
    total_cached = cursor.fetchone()[0]
    cursor.execute("SELECT source, COUNT(*) FROM grp_id_cache GROUP BY source")
    by_source = dict(cursor.fetchall())

    conn.close()

    print(f"\n  grp_id_cache stats:")
    print(f"    Total entries: {total_cached:,}")
    for source, count in sorted(by_source.items()):
        print(f"    {source}: {count:,}")

    return inserted, upgraded


def main():
    parser = argparse.ArgumentParser(description="Import MTGA card data for grpId resolution")
    parser.add_argument("--mtga-path", type=str, help="Path to MTGA installation (auto-detected if omitted)")
    parser.add_argument("--db", type=str, default="data/mtg-deck-builder.db", help="Database path")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to DB")
    args = parser.parse_args()

    print("=== MTGA Card Data Importer ===\n")

    # Find MTGA data directory
    if args.mtga_path:
        data_dir = Path(args.mtga_path) / DATA_SUBDIR
        if not data_dir.exists():
            # Maybe they passed the data dir directly
            data_dir = Path(args.mtga_path)
    else:
        data_dir = find_mtga_path()

    if not data_dir or not data_dir.exists():
        print("MTGA not installed — skipping (this is OK)")
        print("  Use --mtga-path to specify your Arena installation path if installed.")
        sys.exit(0)

    print(f"  MTGA data dir: {data_dir}")

    # Find card and localization files
    cards_file = find_latest_file(data_dir, "data_cards")
    loc_file = find_latest_file(data_dir, "data_loc")

    if not cards_file:
        print("ERROR: No data_cards_*.mtga file found in data directory.")
        print(f"  Files in {data_dir}:")
        for f in sorted(data_dir.iterdir()):
            print(f"    {f.name}")
        sys.exit(1)

    if not loc_file:
        print("WARNING: No data_loc_*.mtga file found. Card names may be incomplete.")
        print("  Will use fallback name fields from card data.")

    # Parse files
    print("\nParsing MTGA data files...")
    title_map = parse_loc_file(loc_file) if loc_file else {}
    cards = parse_cards_file(cards_file, title_map)

    # Filter: only primary cards (skip tokens unless they have useful data)
    primary_cards = [c for c in cards if c["is_primary"] and not c["is_token"]]
    token_cards = [c for c in cards if c["is_token"]]
    digital_only = [c for c in cards if c["is_digital_only"]]

    print(f"\n  Summary:")
    print(f"    Primary cards: {len(primary_cards):,}")
    print(f"    Tokens: {len(token_cards):,}")
    print(f"    Digital-only (Alchemy etc): {len(digital_only):,}")

    # Insert primary cards + digital-only (those are the ones Scryfall 404s on!)
    to_insert = [c for c in cards if c["is_primary"]]  # includes digital-only primaries
    print(f"    Inserting: {len(to_insert):,} cards")

    # DB write
    if not args.dry_run and not os.path.exists(args.db):
        print(f"\nERROR: Database not found: {args.db}")
        sys.exit(1)

    inserted, upgraded = insert_to_db(args.db, to_insert, args.dry_run)

    print(f"\n  Result: {inserted:,} new entries, {upgraded:,} upgraded")
    print("\nDone!")


if __name__ == "__main__":
    main()
