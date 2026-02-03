#!/usr/bin/env python3
"""
Enrich the SQLite database with detailed commander synergy data from EDHREC.

Uses pyedhrec to fetch per-commander card recommendations:
- High synergy cards (most unique to this commander)
- Top cards by category (creatures, instants, sorceries, etc.)
- Average decklist data

Writes to: data/mtg-deck-builder.db (commander_synergies table)

Usage:
  pip install pyedhrec
  python scripts/enrich_commander_synergies.py [commander_name ...]

  # Enrich specific commanders:
  python scripts/enrich_commander_synergies.py "Krenko, Mob Boss" "Atraxa, Praetors' Voice"

  # Enrich all commanders found in existing decks:
  python scripts/enrich_commander_synergies.py --from-decks
"""

import json
import sqlite3
import sys
import time
from pathlib import Path

try:
    from pyedhrec import EDHRec
except ImportError:
    print("Missing 'pyedhrec' package. Run: pip install pyedhrec")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = PROJECT_ROOT / "data" / "mtg-deck-builder.db"


def ensure_table(conn: sqlite3.Connection):
    """Create the commander_synergies table if it doesn't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS commander_synergies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commander_name TEXT NOT NULL,
            card_name TEXT NOT NULL,
            synergy_score REAL NOT NULL DEFAULT 0,
            inclusion_rate REAL NOT NULL DEFAULT 0,
            card_type TEXT DEFAULT NULL,
            source TEXT NOT NULL DEFAULT 'edhrec',
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(commander_name, card_name)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_cmd_syn_commander
        ON commander_synergies(commander_name)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_cmd_syn_score
        ON commander_synergies(synergy_score DESC)
    """)
    conn.commit()


def get_commanders_from_decks(conn: sqlite3.Connection) -> list[str]:
    """Get commander names from existing decks in the database."""
    rows = conn.execute("""
        SELECT DISTINCT c.name FROM decks d
        JOIN cards c ON d.commander_id = c.id
        WHERE d.commander_id IS NOT NULL
    """).fetchall()
    return [row[0] for row in rows]


def fetch_synergies(edh: EDHRec, commander_name: str) -> list[dict]:
    """Fetch all synergy data for a commander from EDHREC."""
    all_cards = {}

    # Fetch high synergy cards (most unique to this commander)
    try:
        high_syn = edh.get_high_synergy_cards(commander_name)
        for card in (high_syn or []):
            name = card.get("name", "")
            if name:
                all_cards[name] = {
                    "synergy_score": card.get("synergy_score", 0),
                    "inclusion_rate": card.get("inclusion", 0) / 100 if card.get("inclusion", 0) > 1 else card.get("inclusion", 0),
                    "card_type": "high_synergy",
                }
    except Exception as e:
        print(f"    Warning: get_high_synergy_cards failed: {e}")

    # Fetch top cards by category
    category_methods = [
        ("get_top_creatures", "creature"),
        ("get_top_instants", "instant"),
        ("get_top_sorceries", "sorcery"),
        ("get_top_enchantments", "enchantment"),
        ("get_top_artifacts", "artifact"),
        ("get_top_lands", "land"),
        ("get_top_mana_artifacts", "mana_artifact"),
        ("get_top_planeswalkers", "planeswalker"),
        ("get_top_utility_lands", "utility_land"),
    ]

    for method_name, card_type in category_methods:
        try:
            method = getattr(edh, method_name)
            cards = method(commander_name)
            for card in (cards or []):
                name = card.get("name", "")
                if name and name not in all_cards:
                    all_cards[name] = {
                        "synergy_score": card.get("synergy_score", 0),
                        "inclusion_rate": card.get("inclusion", 0) / 100 if card.get("inclusion", 0) > 1 else card.get("inclusion", 0),
                        "card_type": card_type,
                    }
        except Exception as e:
            print(f"    Warning: {method_name} failed: {e}")

    # Fetch top cards (general)
    try:
        top = edh.get_top_cards(commander_name)
        for card in (top or []):
            name = card.get("name", "")
            if name and name not in all_cards:
                all_cards[name] = {
                    "synergy_score": card.get("synergy_score", 0),
                    "inclusion_rate": card.get("inclusion", 0) / 100 if card.get("inclusion", 0) > 1 else card.get("inclusion", 0),
                    "card_type": "top",
                }
    except Exception as e:
        print(f"    Warning: get_top_cards failed: {e}")

    return [{"card_name": name, **data} for name, data in all_cards.items()]


def store_synergies(conn: sqlite3.Connection, commander_name: str, cards: list[dict]):
    """Store synergy data in the database."""
    for card in cards:
        conn.execute("""
            INSERT INTO commander_synergies (commander_name, card_name, synergy_score, inclusion_rate, card_type, source)
            VALUES (?, ?, ?, ?, ?, 'edhrec')
            ON CONFLICT(commander_name, card_name) DO UPDATE SET
                synergy_score = excluded.synergy_score,
                inclusion_rate = excluded.inclusion_rate,
                card_type = excluded.card_type,
                updated_at = datetime('now')
        """, (commander_name, card["card_name"], card["synergy_score"], card["inclusion_rate"], card["card_type"]))
    conn.commit()


def main():
    print("=== EDHREC Commander Synergy Enrichment ===\n")

    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("Run the app first to create and seed the database.")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    ensure_table(conn)

    # Determine which commanders to enrich
    commanders = []
    if "--from-decks" in sys.argv:
        commanders = get_commanders_from_decks(conn)
        print(f"Found {len(commanders)} commanders from existing decks\n")
    elif len(sys.argv) > 1:
        commanders = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    else:
        print("Usage:")
        print("  python scripts/enrich_commander_synergies.py 'Commander Name' ...")
        print("  python scripts/enrich_commander_synergies.py --from-decks")
        sys.exit(0)

    if not commanders:
        print("No commanders found to enrich.")
        sys.exit(0)

    edh = EDHRec()

    for i, commander in enumerate(commanders, 1):
        print(f"[{i}/{len(commanders)}] Fetching synergies for: {commander}")
        try:
            cards = fetch_synergies(edh, commander)
            if cards:
                store_synergies(conn, commander, cards)
                print(f"  Stored {len(cards)} card synergies")
            else:
                print(f"  No synergy data found")
        except Exception as e:
            print(f"  Error: {e}")

        # Rate limit: be nice to EDHREC servers
        if i < len(commanders):
            time.sleep(2)

    # Summary
    total = conn.execute("SELECT COUNT(*) FROM commander_synergies").fetchone()[0]
    unique_cmds = conn.execute("SELECT COUNT(DISTINCT commander_name) FROM commander_synergies").fetchone()[0]
    print(f"\nTotal synergies in DB: {total} cards across {unique_cmds} commanders")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
