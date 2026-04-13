#!/usr/bin/env python3
"""
Sync per-commander card statistics from VPS CF API into local SQLite.

Pulls data from the CF API's /commander-stats endpoint (PostgreSQL-backed,
506K+ community decks) and writes it into the local commander_card_stats
table for offline deck building.

Uses atomic staging table swap to prevent data loss on crash (Pitfall 1).
Handles PostgreSQL array serialization by normalizing to JSON (Pitfall 2).

Usage:
    py scripts/sync_commander_stats.py --db data/mtg-deck-builder.db
    py scripts/sync_commander_stats.py --db data/mtg-deck-builder.db --min-decks 20
    py scripts/sync_commander_stats.py --db data/mtg-deck-builder.db --commander "Atraxa, Praetors' Voice"
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
from datetime import datetime

try:
    import httpx
except ImportError:
    print("httpx not installed. Run: pip install httpx", file=sys.stderr)
    sys.exit(1)

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
DB_DEFAULT = os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")

CF_API_BASE = os.environ.get(
    "CF_API_URL", "http://187.77.110.100/cf-api"
).rstrip("/")

# Retry config
MAX_RETRIES = 3
RETRY_BACKOFF = [5, 15, 30]
REQUEST_TIMEOUT = 30.0


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA cache_size=-64000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_table(conn: sqlite3.Connection):
    """Create commander_card_stats if it doesn't exist (idempotent)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS commander_card_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commander_name TEXT NOT NULL,
            card_name TEXT NOT NULL,
            inclusion_rate REAL NOT NULL DEFAULT 0,
            avg_copies REAL NOT NULL DEFAULT 1,
            synergy_score REAL NOT NULL DEFAULT 0,
            deck_count INTEGER NOT NULL DEFAULT 0,
            total_commander_decks INTEGER NOT NULL DEFAULT 0,
            color_identity TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(commander_name, card_name)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ccs_commander ON commander_card_stats(commander_name)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ccs_card ON commander_card_stats(card_name)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ccs_incl ON commander_card_stats(commander_name, inclusion_rate DESC)")
    conn.commit()


def ensure_card_deck_index(conn: sqlite3.Connection):
    """Create card_deck_index if it doesn't exist (migration 35 equivalent)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS card_deck_index (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_name TEXT NOT NULL,
            commander_name TEXT NOT NULL,
            inclusion_rate REAL NOT NULL DEFAULT 0,
            UNIQUE(card_name, commander_name)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cdi_card ON card_deck_index(card_name)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cdi_commander ON card_deck_index(commander_name)")
    conn.commit()


def normalize_color_identity(val) -> str | None:
    """Normalize color_identity to valid JSON array string.

    PostgreSQL arrays come back as Python lists via psycopg which may
    serialize as repr strings like "['W', 'U']" instead of valid JSON.
    This ensures we always store proper JSON (Pitfall 2).
    """
    if val is None:
        return None
    if isinstance(val, (list, tuple)):
        return json.dumps(list(val))
    s = str(val).strip()
    # Already valid JSON array?
    if s.startswith("[") and s.endswith("]"):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return json.dumps(parsed)
        except json.JSONDecodeError:
            pass
    # Python repr format: "['W', 'U']" — parse via regex
    colors = re.findall(r"[WUBRG]", s.upper())
    return json.dumps(colors) if colors else None


def api_get(client: httpx.Client, path: str, params: dict | None = None) -> dict:
    """GET with retry and backoff."""
    url = f"{CF_API_BASE}{path}"
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = client.get(url, params=params, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                print(f"    Retry {attempt + 1}/{MAX_RETRIES} after {wait}s: {e}")
                time.sleep(wait)
    raise RuntimeError(f"API call failed after {MAX_RETRIES} attempts: {last_error}")


def fetch_commander_list(client: httpx.Client, min_decks: int) -> list[dict]:
    """Fetch all commanders from the CF API, paginated."""
    commanders = []
    offset = 0
    page_size = 500
    while True:
        data = api_get(client, "/commander-list", {
            "min_decks": min_decks,
            "offset": offset,
            "limit": page_size,
        })
        batch = data.get("commanders", [])
        commanders.extend(batch)
        total = data.get("total", 0)
        offset += len(batch)
        if offset >= total or len(batch) < page_size:
            break
    return commanders


def fetch_commander_stats(client: httpx.Client, commander: str, limit: int = 300) -> dict:
    """Fetch card stats for a single commander."""
    return api_get(client, "/commander-stats", {
        "commander": commander,
        "limit": limit,
    })


def sync_all(conn: sqlite3.Connection, client: httpx.Client,
             min_decks: int, single_commander: str | None = None) -> dict:
    """Sync commander stats from CF API into local SQLite.

    Uses staging table for atomic swap (Pitfall 1 fix).
    """
    stats = {"commanders_synced": 0, "total_stats": 0, "errors": 0}

    if single_commander:
        commanders = [{"commander_name": single_commander, "deck_count": 0}]
        print(f"  Single commander mode: {single_commander}")
    else:
        print("  Fetching commander list from CF API...")
        commanders = fetch_commander_list(client, min_decks)
        print(f"  Found {len(commanders)} commanders with {min_decks}+ decks")

    if not commanders:
        print("  No commanders found. Aborting.")
        return stats

    # Create staging table
    conn.execute("DROP TABLE IF EXISTS commander_card_stats_staging")
    conn.execute("""
        CREATE TABLE commander_card_stats_staging (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commander_name TEXT NOT NULL,
            card_name TEXT NOT NULL,
            inclusion_rate REAL NOT NULL DEFAULT 0,
            avg_copies REAL NOT NULL DEFAULT 1,
            synergy_score REAL NOT NULL DEFAULT 0,
            deck_count INTEGER NOT NULL DEFAULT 0,
            total_commander_decks INTEGER NOT NULL DEFAULT 0,
            color_identity TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(commander_name, card_name)
        )
    """)
    # Also staging for card_deck_index
    conn.execute("DROP TABLE IF EXISTS card_deck_index_staging")
    conn.execute("""
        CREATE TABLE card_deck_index_staging (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_name TEXT NOT NULL,
            commander_name TEXT NOT NULL,
            inclusion_rate REAL NOT NULL DEFAULT 0,
            UNIQUE(card_name, commander_name)
        )
    """)
    conn.commit()

    batch_stats: list[tuple] = []
    batch_index: list[tuple] = []
    batch_size = 5000
    total_inserted = 0

    for i, cmdr in enumerate(commanders):
        cmdr_name = cmdr["commander_name"]
        try:
            data = fetch_commander_stats(client, cmdr_name)
        except RuntimeError as e:
            print(f"    SKIP {cmdr_name}: {e}")
            stats["errors"] += 1
            continue

        total_decks = data.get("total_decks", 0)
        color_identity = normalize_color_identity(data.get("color_identity"))
        cards = data.get("cards", [])

        for card in cards:
            card_name = card["card_name"]
            inclusion_rate = card["inclusion_rate"]
            avg_copies = card["avg_copies"]
            synergy_score = card["synergy_score"]
            deck_count = card["deck_count"]

            batch_stats.append((
                cmdr_name, card_name,
                round(inclusion_rate, 6),
                round(avg_copies, 4),
                round(synergy_score, 6),
                int(deck_count),
                int(total_decks),
                color_identity,
            ))

            # Inverted index entry (only for cards with meaningful inclusion)
            if inclusion_rate >= 0.05:
                batch_index.append((
                    card_name, cmdr_name, round(inclusion_rate, 6),
                ))

        if len(batch_stats) >= batch_size:
            conn.executemany("""
                INSERT OR REPLACE INTO commander_card_stats_staging
                    (commander_name, card_name, inclusion_rate, avg_copies,
                     synergy_score, deck_count, total_commander_decks,
                     color_identity, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, batch_stats)
            total_inserted += len(batch_stats)
            batch_stats.clear()
            conn.commit()

        if len(batch_index) >= batch_size:
            conn.executemany("""
                INSERT OR IGNORE INTO card_deck_index_staging
                    (card_name, commander_name, inclusion_rate)
                VALUES (?, ?, ?)
            """, batch_index)
            batch_index.clear()
            conn.commit()

        stats["commanders_synced"] += 1

        if (i + 1) % 50 == 0 or i == len(commanders) - 1:
            print(f"  Synced {i + 1}/{len(commanders)} commanders "
                  f"({total_inserted + len(batch_stats):,} card stats)")

        # Rate limit: 100ms between requests to avoid hammering the API
        time.sleep(0.1)

    # Flush remaining batches
    if batch_stats:
        conn.executemany("""
            INSERT INTO commander_card_stats_staging
                (commander_name, card_name, inclusion_rate, avg_copies,
                 synergy_score, deck_count, total_commander_decks,
                 color_identity, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, batch_stats)
        total_inserted += len(batch_stats)
    if batch_index:
        conn.executemany("""
            INSERT OR IGNORE INTO card_deck_index_staging
                (card_name, commander_name, inclusion_rate)
            VALUES (?, ?, ?)
        """, batch_index)
    conn.commit()

    stats["total_stats"] = total_inserted

    # Validate staging before swap
    staging_count = conn.execute(
        "SELECT COUNT(*) FROM commander_card_stats_staging"
    ).fetchone()[0]

    if single_commander:
        # Single commander mode: merge into existing table instead of swap.
        # Delete old data for this commander, then insert from staging.
        conn.execute(
            "DELETE FROM commander_card_stats WHERE commander_name = ?",
            (single_commander,),
        )
        conn.execute("""
            INSERT INTO commander_card_stats
                (commander_name, card_name, inclusion_rate, avg_copies,
                 synergy_score, deck_count, total_commander_decks,
                 color_identity, updated_at)
            SELECT commander_name, card_name, inclusion_rate, avg_copies,
                   synergy_score, deck_count, total_commander_decks,
                   color_identity, updated_at
            FROM commander_card_stats_staging
        """)
        conn.execute("DROP TABLE commander_card_stats_staging")
        conn.execute("DROP TABLE IF EXISTS card_deck_index_staging")
        conn.commit()
        print(f"  Merged {staging_count} rows for {single_commander}")
    elif staging_count < 1000 and len(commanders) > 10:
        print(f"  ABORT: staging has only {staging_count} rows for "
              f"{len(commanders)} commanders — refusing to replace data")
        conn.execute("DROP TABLE commander_card_stats_staging")
        conn.execute("DROP TABLE IF EXISTS card_deck_index_staging")
        conn.commit()
        stats["total_stats"] = 0
        return stats
    else:
        # Atomic swap
        conn.execute("DROP TABLE IF EXISTS commander_card_stats")
        conn.execute("ALTER TABLE commander_card_stats_staging RENAME TO commander_card_stats")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ccs_commander ON commander_card_stats(commander_name)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ccs_card ON commander_card_stats(card_name)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ccs_incl ON commander_card_stats(commander_name, inclusion_rate DESC)")

        conn.execute("DROP TABLE IF EXISTS card_deck_index")
        conn.execute("ALTER TABLE card_deck_index_staging RENAME TO card_deck_index")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cdi_card ON card_deck_index(card_name)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cdi_commander ON card_deck_index(commander_name)")
        conn.commit()
        print(f"  Atomic swap complete: {staging_count:,} commander_card_stats rows")

        index_count = conn.execute("SELECT COUNT(*) FROM card_deck_index").fetchone()[0]
        print(f"  card_deck_index: {index_count:,} rows")

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Sync commander card stats from CF API into local SQLite"
    )
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--min-decks", type=int, default=10,
                        help="Minimum decks per commander (default: 10)")
    parser.add_argument("--commander", type=str, default=None,
                        help="Sync a single commander only (merge mode)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_table(conn)
    ensure_card_deck_index(conn)

    print("=" * 60)
    print("Commander Stats Sync (CF API -> Local SQLite)")
    print(f"Database: {db_path}")
    print(f"CF API:   {CF_API_BASE}")
    print(f"Min decks: {args.min_decks}")
    if args.commander:
        print(f"Commander: {args.commander}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    client = httpx.Client(
        headers={"User-Agent": "BlackGrimoire/1.0 (sync)"},
        follow_redirects=True,
    )

    try:
        stats = sync_all(conn, client, args.min_decks, args.commander)
    finally:
        client.close()
        conn.close()

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Commanders synced: {stats['commanders_synced']}")
    print(f"  Total card stats:  {stats['total_stats']:,}")
    print(f"  Errors:            {stats['errors']}")
    print(f"Finished: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
