#!/usr/bin/env python3
"""
Fetch MTGJSON AtomicCards data and enrich the local SQLite database
with creature subtypes and Arena IDs.

Reads from: https://mtgjson.com/api/v5/AtomicCards.json.gz
Writes to:  data/mtg-deck-builder.db (cards.subtypes, cards.arena_id)

Usage:
  pip install -r requirements.txt
  python scripts/fetch_mtgjson.py
"""

import gzip
import json
import os
import sqlite3
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing 'requests' package. Run: pip install -r scripts/requirements.txt")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "mtg-deck-builder.db"
CACHE_PATH = DATA_DIR / "AtomicCards.json.gz"

ATOMIC_URL = "https://mtgjson.com/api/v5/AtomicCards.json.gz"
CACHE_MAX_AGE_HOURS = 24


# ── Download / Cache ──────────────────────────────────────────────────────────

def should_download() -> bool:
    if not CACHE_PATH.exists():
        return True
    age_hours = (time.time() - CACHE_PATH.stat().st_mtime) / 3600
    return age_hours > CACHE_MAX_AGE_HOURS


def download_atomic_cards():
    print(f"Downloading {ATOMIC_URL} ...")
    resp = requests.get(ATOMIC_URL, stream=True, timeout=120)
    resp.raise_for_status()

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    total = int(resp.headers.get("content-length", 0))
    downloaded = 0

    with open(CACHE_PATH, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1024 * 64):
            f.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded * 100 // total
                print(f"\r  {downloaded // (1024*1024)}MB / {total // (1024*1024)}MB ({pct}%)", end="", flush=True)

    print(f"\n  Saved to {CACHE_PATH}")


def load_atomic_cards() -> dict:
    print(f"Loading {CACHE_PATH} ...")
    with gzip.open(CACHE_PATH, "rt", encoding="utf-8") as f:
        data = json.load(f)
    # AtomicCards wraps everything in {"meta": {...}, "data": {...}}
    return data.get("data", data)


# ── Parse subtypes and Arena IDs ──────────────────────────────────────────────

def extract_card_data(atomic_data: dict) -> dict:
    """
    Returns a dict: card_name -> {subtypes: list[str], arena_id: int|None}

    MTGJSON AtomicCards groups printings by card name.
    Each name maps to a list of printing objects.
    We extract subtypes from the first printing (they're the same across printings)
    and arena_id from whichever printing has one.
    """
    result = {}

    for card_name, printings in atomic_data.items():
        if not printings:
            continue

        # Use first printing for subtypes
        first = printings[0]
        subtypes = first.get("subtypes", [])

        # Find arena_id from any printing
        arena_id = None
        for p in printings:
            ids = p.get("identifiers", {})
            aid = ids.get("mtgArenaId")
            if aid:
                try:
                    arena_id = int(aid)
                except (ValueError, TypeError):
                    pass
                break

        result[card_name] = {
            "subtypes": subtypes,
            "arena_id": arena_id,
        }

    return result


# ── Write to SQLite ───────────────────────────────────────────────────────────

def update_database(card_data: dict):
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("Run the app first to create and seed the database.")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")

    # Check if columns exist (migration may not have run yet)
    cursor = conn.execute("PRAGMA table_info(cards)")
    columns = {row[1] for row in cursor.fetchall()}

    if "subtypes" not in columns or "arena_id" not in columns:
        print("Adding subtypes and arena_id columns to cards table...")
        if "subtypes" not in columns:
            conn.execute("ALTER TABLE cards ADD COLUMN subtypes TEXT")
        if "arena_id" not in columns:
            conn.execute("ALTER TABLE cards ADD COLUMN arena_id INTEGER")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cards_arena_id ON cards(arena_id)")
        conn.commit()

    # Get all distinct card names from our DB
    db_names = conn.execute("SELECT DISTINCT name FROM cards").fetchall()
    db_name_set = {row[0] for row in db_names}

    print(f"Database has {len(db_name_set)} unique card names")
    print(f"MTGJSON has {len(card_data)} card entries")

    # Update cards with subtypes and arena_id
    updated = 0
    batch_size = 500
    updates = []

    for card_name, data in card_data.items():
        # MTGJSON uses the same name format as Scryfall for single-faced cards
        # For DFCs, try both the full name and front face
        names_to_try = [card_name]
        if " // " in card_name:
            names_to_try.append(card_name.split(" // ")[0])

        for name in names_to_try:
            if name in db_name_set:
                subtypes_json = json.dumps(data["subtypes"]) if data["subtypes"] else None
                updates.append((subtypes_json, data["arena_id"], name))
                updated += 1
                break

        if len(updates) >= batch_size:
            conn.executemany(
                "UPDATE cards SET subtypes = ?, arena_id = ? WHERE name = ?",
                updates
            )
            conn.commit()
            print(f"\r  Updated {updated} cards ...", end="", flush=True)
            updates = []

    # Flush remaining
    if updates:
        conn.executemany(
            "UPDATE cards SET subtypes = ?, arena_id = ? WHERE name = ?",
            updates
        )
        conn.commit()

    print(f"\n  Total: {updated} cards enriched with subtypes/arena_id")

    # Verify
    count_subtypes = conn.execute(
        "SELECT COUNT(*) FROM cards WHERE subtypes IS NOT NULL"
    ).fetchone()[0]
    count_arena = conn.execute(
        "SELECT COUNT(*) FROM cards WHERE arena_id IS NOT NULL"
    ).fetchone()[0]
    print(f"  Cards with subtypes: {count_subtypes}")
    print(f"  Cards with arena_id: {count_arena}")

    # Sample check
    sample = conn.execute(
        "SELECT name, subtypes FROM cards WHERE subtypes IS NOT NULL AND subtypes != '[]' LIMIT 5"
    ).fetchall()
    if sample:
        print("\n  Sample enriched cards:")
        for name, subtypes in sample:
            print(f"    {name}: {subtypes}")

    conn.close()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=== MTGJSON Card Data Enrichment ===\n")

    if should_download():
        download_atomic_cards()
    else:
        age_hours = (time.time() - CACHE_PATH.stat().st_mtime) / 3600
        print(f"Using cached AtomicCards.json.gz ({age_hours:.1f}h old, max {CACHE_MAX_AGE_HOURS}h)")

    atomic_data = load_atomic_cards()
    card_data = extract_card_data(atomic_data)
    print(f"Parsed {len(card_data)} cards from MTGJSON\n")

    update_database(card_data)
    print("\nDone!")


if __name__ == "__main__":
    main()
