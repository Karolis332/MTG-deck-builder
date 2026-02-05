#!/usr/bin/env python3
"""
Fetch EDHREC average decklists for popular commanders and store in SQLite.

Usage:
    py scripts/fetch_avg_decklists.py [--db data/mtg-deck-builder.db] [--commanders "Atraxa, Praetors' Voice" "Muldrotha, the Gravetide"]

If no commanders specified, fetches for all commanders found in your decks table.
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time

try:
    import requests
except ImportError:
    print("Missing dependency. Install with: pip install requests")
    sys.exit(1)

EDHREC_JSON_BASE = "https://json.edhrec.com/pages/average-decks"
RATE_LIMIT = 2.0


def get_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def ensure_tables(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS edhrec_avg_decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commander_name TEXT NOT NULL,
            card_name TEXT NOT NULL,
            card_type TEXT,
            category_tag TEXT,
            fetched_at TEXT DEFAULT (datetime('now')),
            UNIQUE(commander_name, card_name)
        );
        CREATE INDEX IF NOT EXISTS idx_edhrec_avg_commander ON edhrec_avg_decks(commander_name);
    """)
    conn.commit()


def commander_to_slug(name: str) -> str:
    """Convert commander name to EDHREC URL slug."""
    slug = name.lower()
    slug = re.sub(r"[',.]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    return slug


def fetch_average_decklist(session: requests.Session, commander_name: str) -> dict | None:
    """Fetch average decklist from EDHREC JSON API."""
    slug = commander_to_slug(commander_name)
    url = f"{EDHREC_JSON_BASE}/{slug}.json"

    time.sleep(RATE_LIMIT)
    try:
        resp = session.get(url, timeout=15)
        if resp.status_code == 404:
            print(f"  [WARN] No average deck for {commander_name} (404)")
            return None
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"  [WARN] Failed to fetch {url}: {e}")
        return None
    except json.JSONDecodeError:
        print(f"  [WARN] Invalid JSON for {commander_name}")
        return None


def store_decklist(conn: sqlite3.Connection, commander_name: str, data: dict) -> int:
    """Parse EDHREC average deck JSON and store card entries."""
    # EDHREC JSON structure varies; try common layouts
    cards = []

    # Try "average" key first
    avg = data.get("average", {})
    if isinstance(avg, dict):
        for section_key in ["creatures", "instants", "sorceries", "artifacts",
                           "enchantments", "planeswalkers", "lands", "other"]:
            section = avg.get(section_key, [])
            if isinstance(section, list):
                for card in section:
                    if isinstance(card, dict):
                        cards.append({
                            "name": card.get("name", ""),
                            "card_type": section_key.rstrip("s"),
                            "category": card.get("tag", ""),
                        })
                    elif isinstance(card, str):
                        cards.append({
                            "name": card,
                            "card_type": section_key.rstrip("s"),
                            "category": "",
                        })

    # Try "cardlists" key
    if not cards:
        cardlists = data.get("cardlists", [])
        if isinstance(cardlists, list):
            for group in cardlists:
                if not isinstance(group, dict):
                    continue
                tag = group.get("tag", "")
                for card in group.get("cardviews", []):
                    if isinstance(card, dict):
                        cards.append({
                            "name": card.get("name", ""),
                            "card_type": card.get("type", ""),
                            "category": tag,
                        })

    # Try flat "cards" list
    if not cards:
        flat = data.get("cards", [])
        if isinstance(flat, list):
            for card in flat:
                if isinstance(card, dict):
                    cards.append({
                        "name": card.get("name", ""),
                        "card_type": card.get("type", ""),
                        "category": card.get("tag", ""),
                    })

    if not cards:
        print(f"  [WARN] Could not parse cards from response (keys: {list(data.keys())})")
        return 0

    # Clear old entries for this commander
    conn.execute("DELETE FROM edhrec_avg_decks WHERE commander_name = ?", (commander_name,))

    inserted = 0
    for card in cards:
        name = card["name"].strip()
        if not name:
            continue
        conn.execute(
            """INSERT OR REPLACE INTO edhrec_avg_decks
               (commander_name, card_name, card_type, category_tag)
               VALUES (?, ?, ?, ?)""",
            (commander_name, name, card["card_type"], card["category"])
        )
        inserted += 1

    conn.commit()
    return inserted


def get_deck_commanders(conn: sqlite3.Connection) -> list[str]:
    """Get commander names from existing decks."""
    rows = conn.execute("""
        SELECT DISTINCT c.name FROM decks d
        JOIN cards c ON d.commander_id = c.id
        WHERE d.commander_id IS NOT NULL
    """).fetchall()
    return [r[0] for r in rows]


def main():
    parser = argparse.ArgumentParser(description="Fetch EDHREC average decklists")
    parser.add_argument("--db", type=str, default="data/mtg-deck-builder.db")
    parser.add_argument("--commanders", nargs="*",
                        help="Specific commander names to fetch")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"Database not found at {args.db}")
        sys.exit(1)

    conn = get_db(args.db)
    ensure_tables(conn)

    session = requests.Session()
    session.headers.update({
        "User-Agent": "MTG-Deck-Builder/1.0 (educational project, rate-limited)"
    })

    if args.commanders:
        commanders = args.commanders
    else:
        commanders = get_deck_commanders(conn)
        if not commanders:
            print("No commanders found in decks table. Use --commanders to specify.")
            sys.exit(0)

    print(f"Fetching average decklists for {len(commanders)} commander(s)...")

    total_cards = 0
    for i, cmd in enumerate(commanders):
        print(f"  [{i+1}/{len(commanders)}] {cmd}")
        data = fetch_average_decklist(session, cmd)
        if not data:
            continue
        count = store_decklist(conn, cmd, data)
        total_cards += count
        print(f"    Stored {count} cards")

    conn.close()
    print(f"\nDone! Stored {total_cards} total card entries.")


if __name__ == "__main__":
    main()
