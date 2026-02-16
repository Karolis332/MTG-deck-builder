#!/usr/bin/env python3
"""
Find combos in user decks using Commander Spellbook's find-my-combos API.

For each commander/brawl deck, sends the decklist to Commander Spellbook
and caches the response (included, almostIncluded, etc.) in the
spellbook_deck_combos table.

API: POST https://backend.commanderspellbook.com/find-my-combos/ (no auth)

Usage:
    py scripts/find_deck_combos.py --db data/mtg-deck-builder.db --all-decks
    py scripts/find_deck_combos.py --db data/mtg-deck-builder.db --deck-id 1
    py scripts/find_deck_combos.py --db data/mtg-deck-builder.db --all-decks --force
"""

import argparse
import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta

try:
    import requests
except ImportError:
    print("requests required: pip install requests", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")

API_URL = "https://backend.commanderspellbook.com/find-my-combos/"
RATE_LIMIT_SEC = 0.2  # 200ms between requests
CACHE_TTL_DAYS = 7


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(conn: sqlite3.Connection):
    """Create tables if they don't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS spellbook_combos (
            id TEXT PRIMARY KEY,
            identity TEXT,
            description TEXT,
            prerequisites TEXT,
            mana_needed TEXT,
            popularity INTEGER,
            bracket_tag TEXT,
            legal_commander INTEGER DEFAULT 1,
            legal_brawl INTEGER DEFAULT 0,
            price_tcgplayer REAL,
            fetched_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS spellbook_combo_cards (
            combo_id TEXT NOT NULL,
            card_name TEXT NOT NULL,
            card_oracle_id TEXT,
            quantity INTEGER DEFAULT 1,
            zone_locations TEXT,
            must_be_commander INTEGER DEFAULT 0,
            UNIQUE(combo_id, card_name)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS spellbook_combo_results (
            combo_id TEXT NOT NULL,
            feature_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            UNIQUE(combo_id, feature_name)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS spellbook_deck_combos (
            deck_id INTEGER NOT NULL,
            combo_id TEXT NOT NULL,
            category TEXT NOT NULL,
            fetched_at TEXT DEFAULT (datetime('now')),
            UNIQUE(deck_id, combo_id)
        )
    """)
    conn.commit()


def is_recently_checked(conn: sqlite3.Connection, deck_id: int) -> bool:
    """Check if deck was scanned within CACHE_TTL_DAYS."""
    row = conn.execute(
        "SELECT MAX(fetched_at) FROM spellbook_deck_combos WHERE deck_id = ?",
        (deck_id,)
    ).fetchone()
    if not row or not row[0]:
        return False
    last_check = datetime.fromisoformat(row[0])
    return datetime.now() - last_check < timedelta(days=CACHE_TTL_DAYS)


def get_commander_decks(conn: sqlite3.Connection, deck_id: int | None = None) -> list[dict]:
    """Get commander/brawl decks with their cards."""
    where = "WHERE d.format IN ('commander', 'brawl', 'historicbrawl', 'standardbrawl')"
    params: list = []
    if deck_id is not None:
        where += " AND d.id = ?"
        params.append(deck_id)

    decks = conn.execute(f"""
        SELECT d.id, d.name, d.format
        FROM decks d
        {where}
    """, params).fetchall()

    result = []
    for deck in decks:
        cards = conn.execute("""
            SELECT c.name, dc.quantity, dc.board
            FROM deck_cards dc
            JOIN cards c ON dc.card_id = c.id
            WHERE dc.deck_id = ?
        """, (deck["id"],)).fetchall()

        if not cards:
            continue

        result.append({
            "id": deck["id"],
            "name": deck["name"],
            "format": deck["format"],
            "cards": [{"name": c["name"], "quantity": c["quantity"], "board": c["board"]} for c in cards],
        })

    return result


def save_combo_from_response(conn: sqlite3.Connection, variant: dict) -> str | None:
    """Save a combo variant from find-my-combos response. Returns combo_id."""
    combo_id = str(variant.get("id", ""))
    if not combo_id:
        return None

    identity_obj = variant.get("identity", "")
    if isinstance(identity_obj, dict):
        identity = identity_obj.get("identity", "")
    elif isinstance(identity_obj, str):
        identity = identity_obj
    else:
        identity = str(identity_obj)

    description = variant.get("description", "")
    prerequisites = variant.get("prerequisites", "")
    mana_needed = variant.get("manaNeeded", "") or variant.get("mana_needed", "")
    popularity = variant.get("popularity")

    conn.execute("""
        INSERT INTO spellbook_combos
            (id, identity, description, prerequisites, mana_needed, popularity, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            description = excluded.description,
            prerequisites = excluded.prerequisites,
            mana_needed = excluded.mana_needed,
            popularity = excluded.popularity,
            fetched_at = datetime('now')
    """, (combo_id, identity, description, prerequisites, mana_needed, popularity))

    # Save cards
    uses = variant.get("uses", [])
    for use in uses:
        card = use.get("card", {})
        card_name = card.get("name", "") if isinstance(card, dict) else str(card)
        if not card_name:
            continue
        card_oracle_id = card.get("oracleId", "") if isinstance(card, dict) else ""
        zone_locations = use.get("zoneLocations", "")
        if isinstance(zone_locations, list):
            zone_locations = ",".join(zone_locations)
        must_be_commander = 1 if use.get("mustBeCommander") else 0

        conn.execute("""
            INSERT INTO spellbook_combo_cards
                (combo_id, card_name, card_oracle_id, quantity, zone_locations, must_be_commander)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(combo_id, card_name) DO UPDATE SET
                card_oracle_id = excluded.card_oracle_id,
                zone_locations = excluded.zone_locations,
                must_be_commander = excluded.must_be_commander
        """, (combo_id, card_name, card_oracle_id, use.get("quantity", 1), zone_locations, must_be_commander))

    # Save results
    produces = variant.get("produces", [])
    for prod in produces:
        feature = prod.get("feature", {})
        feature_name = feature.get("name", "") if isinstance(feature, dict) else str(prod.get("name", prod))
        if not feature_name:
            continue
        conn.execute("""
            INSERT INTO spellbook_combo_results
                (combo_id, feature_name, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(combo_id, feature_name) DO UPDATE SET
                quantity = excluded.quantity
        """, (combo_id, feature_name, prod.get("quantity", 1)))

    return combo_id


def find_combos_for_deck(conn: sqlite3.Connection, deck: dict) -> dict:
    """Call find-my-combos API for a deck and save results."""
    main_cards = [c for c in deck["cards"] if c["board"] in ("main", "companion")]
    commanders = [c for c in deck["cards"] if c["board"] == "commander"]

    body = {
        "main": [{"card": c["name"], "quantity": c["quantity"]} for c in main_cards],
        "commanders": [{"card": c["name"], "quantity": 1} for c in commanders],
    }

    try:
        resp = requests.post(API_URL, json=body, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        print(f"    API error: {e}", file=sys.stderr)
        return {"included": 0, "almostIncluded": 0}

    # Clear old deck combos
    conn.execute("DELETE FROM spellbook_deck_combos WHERE deck_id = ?", (deck["id"],))

    stats = {}
    for category in ("included", "almostIncluded", "almostIncludedByAddingColors",
                      "almostIncludedByAddingCommanders", "almostIncludedByChangingCommanders"):
        variants = data.get("results", {}).get(category, [])
        if not isinstance(variants, list):
            variants = []
        stats[category] = len(variants)

        for variant in variants:
            combo_id = save_combo_from_response(conn, variant)
            if combo_id:
                conn.execute("""
                    INSERT INTO spellbook_deck_combos
                        (deck_id, combo_id, category, fetched_at)
                    VALUES (?, ?, ?, datetime('now'))
                    ON CONFLICT(deck_id, combo_id) DO UPDATE SET
                        category = excluded.category,
                        fetched_at = datetime('now')
                """, (deck["id"], combo_id, category))

    conn.commit()
    return stats


def main():
    parser = argparse.ArgumentParser(description="Find combos in user decks via Commander Spellbook")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--deck-id", type=int, default=None, help="Scan a specific deck ID")
    parser.add_argument("--all-decks", action="store_true", help="Scan all commander/brawl decks")
    parser.add_argument("--force", action="store_true", help="Ignore cache TTL, rescan all")
    args = parser.parse_args()

    if not args.deck_id and not args.all_decks:
        print("Specify --deck-id or --all-decks", file=sys.stderr)
        sys.exit(1)

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_tables(conn)

    decks = get_commander_decks(conn, args.deck_id)

    print("=" * 60)
    print("Commander Spellbook — Find Deck Combos")
    print(f"Database: {db_path}")
    print(f"Decks to scan: {len(decks)}")
    print(f"Force rescan: {args.force}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    total_included = 0
    total_near = 0
    decks_scanned = 0

    for deck in decks:
        if not args.force and is_recently_checked(conn, deck["id"]):
            print(f"\n  [{deck['name']}] Skipped (checked within {CACHE_TTL_DAYS} days)")
            continue

        print(f"\n  [{deck['name']}] ({len(deck['cards'])} cards, {deck['format']})")
        stats = find_combos_for_deck(conn, deck)
        included = stats.get("included", 0)
        almost = stats.get("almostIncluded", 0)
        total_included += included
        total_near += almost
        decks_scanned += 1
        print(f"    Found: {included} included, {almost} near-miss")
        time.sleep(RATE_LIMIT_SEC)

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Decks scanned:     {decks_scanned}")
    print(f"  Total combos:      {total_included}")
    print(f"  Total near-misses: {total_near}")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
