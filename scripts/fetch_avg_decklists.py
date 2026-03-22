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
EDHREC_HTML_BASE = "https://edhrec.com/average-decks"
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
    """Fetch average decklist from EDHREC. Tries JSON API first, falls back to HTML __NEXT_DATA__."""
    slug = commander_to_slug(commander_name)

    # Try JSON API first
    url = f"{EDHREC_JSON_BASE}/{slug}.json"
    time.sleep(RATE_LIMIT)
    try:
        resp = session.get(url, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data:
                return data
    except (requests.RequestException, json.JSONDecodeError):
        pass

    # Fallback: HTML page with __NEXT_DATA__ (EDHREC locked down JSON API)
    html_url = f"{EDHREC_HTML_BASE}/{slug}"
    time.sleep(RATE_LIMIT)
    try:
        resp = session.get(html_url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html",
        })
        if resp.status_code == 404:
            print(f"  [WARN] No average deck for {commander_name} (404)")
            return None
        if resp.status_code != 200:
            print(f"  [WARN] HTTP {resp.status_code} for {commander_name}")
            return None

        # Extract __NEXT_DATA__ JSON from HTML
        match = re.search(r'__NEXT_DATA__[^>]*>(.*?)</script>', resp.text)
        if not match:
            print(f"  [WARN] No __NEXT_DATA__ found for {commander_name}")
            return None

        next_data = json.loads(match.group(1))
        page_data = next_data.get("props", {}).get("pageProps", {}).get("data", {})
        container = page_data.get("container", {}).get("json_dict", {})
        cardlists = container.get("cardlists", [])

        if not cardlists:
            print(f"  [WARN] No cardlists in __NEXT_DATA__ for {commander_name}")
            return None

        # Repackage into the format store_decklist() expects
        return {"cardlists": cardlists}

    except requests.RequestException as e:
        print(f"  [WARN] Failed to fetch HTML for {commander_name}: {e}")
        return None
    except (json.JSONDecodeError, KeyError) as e:
        print(f"  [WARN] Failed to parse __NEXT_DATA__ for {commander_name}: {e}")
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

    # Try "cardlists" at top level or nested under container.json_dict
    if not cards:
        cardlists = data.get("cardlists", [])
        # EDHREC moved cardlists under container.json_dict (2026 format change)
        if not cardlists:
            container = data.get("container", {})
            if isinstance(container, dict):
                json_dict = container.get("json_dict", {})
                if isinstance(json_dict, dict):
                    cardlists = json_dict.get("cardlists", [])
        if isinstance(cardlists, list):
            for group in cardlists:
                if not isinstance(group, dict):
                    continue
                tag = group.get("tag", "")
                for card in group.get("cardviews", []):
                    if isinstance(card, dict):
                        name = card.get("name", "")
                        # Basics have label like "4 Forests" — extract just the card name
                        if not name and card.get("label"):
                            label_match = re.match(r"^\d+\s+(.+)$", card["label"])
                            name = label_match.group(1) if label_match else card["label"]
                        cards.append({
                            "name": name,
                            "card_type": card.get("type", tag.rstrip("s")),
                            "category": tag,
                        })

    # Try "deck" array (EDHREC 2026 format: list of "1 Card Name" strings)
    if not cards:
        deck_lines = data.get("deck", [])
        if isinstance(deck_lines, list) and deck_lines:
            for line in deck_lines:
                if isinstance(line, str):
                    match = re.match(r"^(\d+)\s+(.+)$", line.strip())
                    if match:
                        cards.append({
                            "name": match.group(2),
                            "card_type": "",
                            "category": "",
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
