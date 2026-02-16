#!/usr/bin/env python3
"""
Scrape Commander Spellbook combo database via their public API.

Fetches all OK-status commander-legal combos, storing combo variants,
component cards, and produced results/features.

API: https://backend.commanderspellbook.com/variants/
No authentication required.

Usage:
    py scripts/scrape_commander_spellbook.py --db data/mtg-deck-builder.db
    py scripts/scrape_commander_spellbook.py --db data/mtg-deck-builder.db --max-combos 500
    py scripts/scrape_commander_spellbook.py --db data/mtg-deck-builder.db --status ok
"""

import argparse
import os
import sqlite3
import sys
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("requests required: pip install requests", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")

API_BASE = "https://backend.commanderspellbook.com"
RATE_LIMIT_SEC = 0.15  # 150ms between requests
PAGE_SIZE = 100


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(conn: sqlite3.Connection):
    """Create tables if they don't exist (for standalone usage)."""
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
    conn.commit()


def fetch_page(offset: int, status: str = "ok") -> dict | None:
    """Fetch one page of combo variants from the API."""
    url = f"{API_BASE}/variants/"
    params = {
        "limit": PAGE_SIZE,
        "offset": offset,
        "q": f"legal:commander status:{status}",
    }
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"  Request failed (offset={offset}): {e}", file=sys.stderr)
        return None


def save_combo(conn: sqlite3.Connection, variant: dict) -> bool:
    """Save a single combo variant and its cards/results. Returns True on success."""
    combo_id = str(variant.get("id", ""))
    if not combo_id:
        return False

    # Extract identity from the identity object
    identity_obj = variant.get("identity", "")
    if isinstance(identity_obj, dict):
        identity = identity_obj.get("identity", "")
    elif isinstance(identity_obj, str):
        identity = identity_obj
    else:
        identity = str(identity_obj)

    # Extract legalities
    legalities = variant.get("legalities", {})
    legal_commander = 1 if legalities.get("commander") else (1 if not legalities else 0)
    legal_brawl = 1 if legalities.get("brawl") else 0

    # Extract pricing
    prices = variant.get("prices", {})
    price_tcg = prices.get("tcgplayer") if isinstance(prices, dict) else None

    # Bracket tag
    bracket = variant.get("bracket", None)
    if isinstance(bracket, dict):
        bracket = bracket.get("tag", bracket.get("name"))

    description = variant.get("description", "")
    prerequisites = variant.get("prerequisites", "")
    mana_needed = variant.get("manaNeeded", "") or variant.get("mana_needed", "")
    popularity = variant.get("popularity")

    # Upsert combo
    conn.execute("""
        INSERT INTO spellbook_combos
            (id, identity, description, prerequisites, mana_needed, popularity,
             bracket_tag, legal_commander, legal_brawl, price_tcgplayer, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            identity = excluded.identity,
            description = excluded.description,
            prerequisites = excluded.prerequisites,
            mana_needed = excluded.mana_needed,
            popularity = excluded.popularity,
            bracket_tag = excluded.bracket_tag,
            legal_commander = excluded.legal_commander,
            legal_brawl = excluded.legal_brawl,
            price_tcgplayer = excluded.price_tcgplayer,
            fetched_at = datetime('now')
    """, (combo_id, identity, description, prerequisites, mana_needed,
          popularity, bracket, legal_commander, legal_brawl, price_tcg))

    # Save component cards
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
        quantity = use.get("quantity", 1) or 1

        conn.execute("""
            INSERT INTO spellbook_combo_cards
                (combo_id, card_name, card_oracle_id, quantity, zone_locations, must_be_commander)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(combo_id, card_name) DO UPDATE SET
                card_oracle_id = excluded.card_oracle_id,
                quantity = excluded.quantity,
                zone_locations = excluded.zone_locations,
                must_be_commander = excluded.must_be_commander
        """, (combo_id, card_name, card_oracle_id, quantity, zone_locations, must_be_commander))

    # Save results/features
    produces = variant.get("produces", [])
    for prod in produces:
        feature = prod.get("feature", {})
        feature_name = feature.get("name", "") if isinstance(feature, dict) else str(prod.get("name", prod))
        if not feature_name:
            continue
        quantity = prod.get("quantity", 1) or 1

        conn.execute("""
            INSERT INTO spellbook_combo_results
                (combo_id, feature_name, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(combo_id, feature_name) DO UPDATE SET
                quantity = excluded.quantity
        """, (combo_id, feature_name, quantity))

    return True


def main():
    parser = argparse.ArgumentParser(description="Scrape Commander Spellbook combo database")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--max-combos", type=int, default=5000, help="Max combos to fetch (default: 5000)")
    parser.add_argument("--status", default="ok", help="Combo status filter (default: ok)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_tables(conn)

    print("=" * 60)
    print("Commander Spellbook Combo Scraping")
    print(f"Database: {db_path}")
    print(f"Max combos: {args.max_combos}")
    print(f"Status filter: {args.status}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    total_saved = 0
    offset = 0

    while total_saved < args.max_combos:
        print(f"\n  Fetching page at offset={offset}...")
        data = fetch_page(offset, args.status)

        if data is None:
            print("  Failed to fetch page, stopping.")
            break

        results = data.get("results", [])
        if not results:
            print("  No more results.")
            break

        page_saved = 0
        for variant in results:
            if total_saved >= args.max_combos:
                break
            if save_combo(conn, variant):
                total_saved += 1
                page_saved += 1

        conn.commit()
        print(f"  Saved {page_saved} combos (total: {total_saved})")

        # Check if there are more pages
        total_count = data.get("count", 0)
        if offset + PAGE_SIZE >= total_count:
            print(f"  Reached end of results ({total_count} total).")
            break

        offset += PAGE_SIZE
        time.sleep(RATE_LIMIT_SEC)

    # Summary
    combo_count = conn.execute("SELECT COUNT(*) FROM spellbook_combos").fetchone()[0]
    card_count = conn.execute("SELECT COUNT(DISTINCT card_name) FROM spellbook_combo_cards").fetchone()[0]

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Combos saved this run: {total_saved}")
    print(f"  Total combos in DB:    {combo_count}")
    print(f"  Unique combo cards:    {card_count}")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
