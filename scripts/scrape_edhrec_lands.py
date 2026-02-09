#!/usr/bin/env python3
"""
Scrape EDHREC land recommendations per commander.

Fetches the JSON API at json.edhrec.com for average decklists and extracts
the land section. Stores results in edhrec_avg_decks with card_type='land'.

Usage:
    py scripts/scrape_edhrec_lands.py [--db data/mtg-deck-builder.db] [--max-commanders 50]
"""

import argparse
import json
import os
import sqlite3
import sys
import time

try:
    import requests
except ImportError:
    print("requests is required: pip install requests", file=sys.stderr)
    sys.exit(1)

DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")

EDHREC_JSON_BASE = "https://json.edhrec.com/pages/average-decks"


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def slugify(name: str) -> str:
    """Convert commander name to EDHREC URL slug."""
    # Handle partner format: "Name1 // Name2" -> just use first
    if " // " in name:
        name = name.split(" // ")[0]
    slug = name.lower()
    slug = slug.replace("'", "").replace(",", "").replace(".", "")
    slug = slug.replace(" ", "-")
    # Remove consecutive hyphens
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def fetch_edhrec_avg_deck(commander_name: str) -> list[dict] | None:
    """Fetch average decklist from EDHREC JSON API. Returns land entries or None."""
    slug = slugify(commander_name)
    url = f"{EDHREC_JSON_BASE}/{slug}.json"

    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "MTGDeckBuilder/1.0 (personal project)"
        })
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
    except (requests.RequestException, json.JSONDecodeError):
        return None

    # Extract land cards from the average deck
    lands = []
    card_lists = data.get("cardlists", [])

    for cardlist in card_lists:
        header = cardlist.get("header", "").lower()
        if "land" not in header:
            continue

        card_views = cardlist.get("cardviews", [])
        for cv in card_views:
            name = cv.get("name", "")
            if name:
                lands.append({
                    "card_name": name,
                    "card_type": "land",
                    "category_tag": header,
                })

    # Also check top-level 'avgdeck' structure if cardlists is empty
    if not lands:
        avg_deck = data.get("avgdeck", {})
        for entry in avg_deck.get("cards", []):
            type_line = entry.get("type_line", "")
            if "Land" in type_line:
                lands.append({
                    "card_name": entry.get("name", ""),
                    "card_type": "land",
                    "category_tag": "land",
                })

    return lands if lands else None


def main():
    parser = argparse.ArgumentParser(description="Scrape EDHREC land recommendations")
    parser.add_argument("--db", default=DB_DEFAULT, help="SQLite database path")
    parser.add_argument("--max-commanders", type=int, default=50, help="Max commanders to scrape")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests (seconds)")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"Database not found: {args.db}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(args.db)

    # Get commanders from existing decks + popular EDHREC commanders
    commanders = conn.execute("""
        SELECT DISTINCT c.name
        FROM deck_cards dc
        JOIN cards c ON dc.card_id = c.id
        WHERE dc.board = 'commander'
        UNION
        SELECT DISTINCT commander_name FROM commander_synergies
        LIMIT ?
    """, (args.max_commanders,)).fetchall()

    if not commanders:
        print("No commanders found in database.", file=sys.stderr)
        sys.exit(0)

    print(f"Scraping EDHREC land data for {len(commanders)} commanders...")

    total_saved = 0
    for i, row in enumerate(commanders):
        name = row["name"]
        print(f"  [{i+1}/{len(commanders)}] {name}...", end=" ", flush=True)

        lands = fetch_edhrec_avg_deck(name)
        if not lands:
            print("no data")
            time.sleep(args.delay)
            continue

        saved = 0
        for land in lands:
            try:
                conn.execute("""
                    INSERT INTO edhrec_avg_decks (commander_name, card_name, card_type, category_tag)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(commander_name, card_name) DO UPDATE SET
                        card_type = excluded.card_type,
                        category_tag = excluded.category_tag,
                        fetched_at = datetime('now')
                """, (name, land["card_name"], land["card_type"], land["category_tag"]))
                saved += 1
            except sqlite3.IntegrityError:
                pass

        conn.commit()
        total_saved += saved
        print(f"{saved} lands saved")
        time.sleep(args.delay)

    conn.close()
    print(f"\nDone. Saved {total_saved} total land recommendations.")


if __name__ == "__main__":
    main()
