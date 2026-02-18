"""
Import card aliases (Universes Beyond <-> Universe Within) into the database.

Usage:
  py scripts/import_card_aliases.py              # Import from data/card_aliases.json
  py scripts/import_card_aliases.py --scrape     # Scrape Scryfall for fresh aliases first
  py scripts/import_card_aliases.py --list       # List all current aliases in DB
"""

import sqlite3
import json
import os
import sys
import argparse
import time

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'mtg-deck-builder.db')
ALIASES_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'card_aliases.json')

# Crossover sets to scrape for aliases
CROSSOVER_SETS = ['mar', 'spm', 'msh', 'msc', 'spe']


def scrape_aliases():
    """Scrape Scryfall for all Universes Beyond <-> Universe Within card name mappings."""
    import requests

    all_cards = []
    for set_code in CROSSOVER_SETS:
        page = 1
        while True:
            url = f"https://api.scryfall.com/cards/search?q=set:{set_code}&page={page}"
            r = requests.get(url, headers={"User-Agent": "MTGDeckBuilder/1.0"})
            if r.status_code != 200:
                break
            data = r.json()
            all_cards.extend(data["data"])
            if not data.get("has_more"):
                break
            page += 1
            time.sleep(0.12)
        count = len([c for c in all_cards if c['set'] == set_code])
        print(f"  Set {set_code}: {count} cards")
        time.sleep(0.12)

    print(f"Total crossover cards: {len(all_cards)}")

    # For each unique oracle_id, find all print names
    aliases = []
    seen_oracle_ids = set()

    for card in all_cards:
        oid = card.get("oracle_id")
        if not oid or oid in seen_oracle_ids:
            continue
        seen_oracle_ids.add(oid)

        time.sleep(0.12)
        r = requests.get(
            f"https://api.scryfall.com/cards/search?q=oracleid:{oid}&unique=cards",
            headers={"User-Agent": "MTGDeckBuilder/1.0"}
        )
        if r.status_code != 200:
            continue

        prints = r.json()["data"]
        names = set()
        for p in prints:
            names.add(p["name"])

        if len(names) > 1:
            crossover_name = card["name"]
            alt_names = [n for n in names if n != crossover_name]
            for alt in alt_names:
                # Both directions: crossover -> canonical AND canonical -> crossover
                aliases.append({
                    "alias_name": alt,
                    "canonical_name": crossover_name,
                    "oracle_id": oid
                })
                aliases.append({
                    "alias_name": crossover_name,
                    "canonical_name": alt,
                    "oracle_id": oid
                })
                print(f"  {crossover_name} <-> {alt}")

    print(f"\nTotal alias pairs: {len(aliases)}")

    with open(ALIASES_PATH, 'w', encoding='utf-8') as f:
        json.dump(aliases, f, indent=2, ensure_ascii=False)
    print(f"Saved to {ALIASES_PATH}")
    return aliases


def import_aliases(aliases=None):
    """Import aliases from JSON file or provided list into SQLite."""
    if aliases is None:
        if not os.path.exists(ALIASES_PATH):
            print(f"No aliases file found at {ALIASES_PATH}")
            print("Run with --scrape to generate it first.")
            return

        with open(ALIASES_PATH, 'r', encoding='utf-8') as f:
            aliases = json.load(f)

    conn = sqlite3.connect(DB_PATH)

    # Ensure table exists
    conn.execute("""
        CREATE TABLE IF NOT EXISTS card_aliases (
            alias_name TEXT NOT NULL PRIMARY KEY,
            canonical_name TEXT NOT NULL,
            oracle_id TEXT,
            source TEXT DEFAULT 'scryfall',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_card_aliases_canonical ON card_aliases(canonical_name)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_card_aliases_oracle_id ON card_aliases(oracle_id)")

    inserted = 0
    for alias in aliases:
        try:
            conn.execute(
                """INSERT INTO card_aliases (alias_name, canonical_name, oracle_id, source)
                   VALUES (?, ?, ?, 'scryfall')
                   ON CONFLICT(alias_name) DO UPDATE SET
                     canonical_name = excluded.canonical_name,
                     oracle_id = excluded.oracle_id""",
                (alias['alias_name'], alias['canonical_name'], alias.get('oracle_id'))
            )
            inserted += 1
        except Exception as e:
            print(f"  Error inserting {alias['alias_name']}: {e}")

    conn.commit()
    print(f"Imported {inserted} aliases into database")

    # Show count
    row = conn.execute("SELECT COUNT(*) FROM card_aliases").fetchone()
    print(f"Total aliases in DB: {row[0]}")
    conn.close()


def list_aliases():
    """List all aliases currently in the database."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT alias_name, canonical_name, oracle_id FROM card_aliases ORDER BY alias_name"
    ).fetchall()
    if not rows:
        print("No aliases in database.")
        return
    print(f"{'Alias Name':<45} {'Canonical Name':<45} Oracle ID")
    print("-" * 120)
    for r in rows:
        print(f"{r[0]:<45} {r[1]:<45} {(r[2] or '')[:36]}")
    print(f"\nTotal: {len(rows)} aliases")
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Import card aliases for Universes Beyond/Within")
    parser.add_argument('--scrape', action='store_true', help='Scrape Scryfall for fresh aliases')
    parser.add_argument('--list', action='store_true', help='List all current aliases')
    args = parser.parse_args()

    if args.list:
        list_aliases()
        return

    if args.scrape:
        print("Scraping Scryfall for crossover card aliases...")
        aliases = scrape_aliases()
        print("\nImporting into database...")
        import_aliases(aliases)
    else:
        print("Importing aliases from JSON file...")
        import_aliases()


if __name__ == '__main__':
    main()
