#!/usr/bin/env python3
"""
Merge CF API PostgreSQL decks into SQLite community_decks/community_deck_cards.

Maps PG decks (65K+ Moxfield/Archidekt/EDHREC commander decks) into the
same community tables used by the ML pipeline, alongside MTGGoldfish/MTGTop8 data.

Usage:
    python scripts/sync_pg_to_sqlite.py --sqlite data/mtg-deck-builder.db
    python scripts/sync_pg_to_sqlite.py --sqlite data/mtg-deck-builder.db --pg-host localhost --pg-port 5433
"""

import argparse
import os
import sqlite3
import sys
import time
from datetime import datetime

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("psycopg2 required: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


BATCH_SIZE = 2000
PG_DEFAULTS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "grimoire_cf",
    "user": "grimoire",
    "password": "grimoire",
}


def get_pg_conn(args) -> "psycopg2.connection":
    return psycopg2.connect(
        host=args.pg_host,
        port=args.pg_port,
        dbname=args.pg_db,
        user=args.pg_user,
        password=args.pg_password,
    )


def get_sqlite_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def sync_decks(pg_conn, sqlite_conn) -> dict:
    """Pull all PG decks into SQLite community_decks + community_deck_cards."""
    stats = {"decks_inserted": 0, "decks_skipped": 0, "cards_inserted": 0, "errors": 0}

    pg_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Get total count
    pg_cur.execute("SELECT COUNT(*) FROM decks")
    total = pg_cur.fetchone()[0]
    print(f"  PG decks to sync: {total:,}")

    # Get existing source_ids in SQLite to skip duplicates efficiently
    existing = set()
    for row in sqlite_conn.execute(
        "SELECT source, source_id FROM community_decks WHERE source IN ('moxfield','archidekt','edhrec')"
    ):
        existing.add((row[0], row[1]))
    print(f"  Already in SQLite: {len(existing):,}")

    # Stream PG decks in batches
    pg_cur.execute("""
        SELECT id, source, source_id, commander_name, color_identity,
               deck_name, author, views, likes, card_count, scraped_at
        FROM decks ORDER BY id
    """)

    batch = []
    deck_id_map = {}  # pg_id -> sqlite_id

    while True:
        rows = pg_cur.fetchmany(BATCH_SIZE)
        if not rows:
            break

        for row in rows:
            pg_id = row["id"]
            source = row["source"]
            source_id = row["source_id"]

            if (source, source_id) in existing:
                stats["decks_skipped"] += 1
                # Still need to map for potential card updates
                res = sqlite_conn.execute(
                    "SELECT id FROM community_decks WHERE source=? AND source_id=?",
                    (source, source_id),
                ).fetchone()
                if res:
                    deck_id_map[pg_id] = res[0]
                continue

            commander = row["commander_name"] or ""
            deck_name = row["deck_name"] or commander
            scraped = row["scraped_at"].isoformat() if row["scraped_at"] else datetime.now().isoformat()

            batch.append((
                source, source_id, "commander", commander, deck_name, scraped, pg_id
            ))

        # Flush insert batch
        if batch:
            for item in batch:
                source, source_id, fmt, archetype, deck_name, scraped, pg_id = item
                try:
                    sqlite_conn.execute(
                        """INSERT OR IGNORE INTO community_decks
                           (source, source_id, format, archetype, deck_name, scraped_at)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (source, source_id, fmt, archetype, deck_name, scraped),
                    )
                    # Get the inserted row ID
                    res = sqlite_conn.execute(
                        "SELECT id FROM community_decks WHERE source=? AND source_id=?",
                        (source, source_id),
                    ).fetchone()
                    if res:
                        deck_id_map[pg_id] = res[0]
                        stats["decks_inserted"] += 1
                except Exception as e:
                    stats["errors"] += 1
                    if stats["errors"] <= 5:
                        print(f"  [ERR] deck {source}/{source_id}: {e}")

            sqlite_conn.commit()
            batch.clear()

        processed = stats["decks_inserted"] + stats["decks_skipped"]
        if processed % 10000 < BATCH_SIZE:
            print(f"  Progress: {processed:,}/{total:,} decks ({stats['decks_inserted']:,} new)")

    sqlite_conn.commit()
    print(f"  Decks done: {stats['decks_inserted']:,} inserted, {stats['decks_skipped']:,} existing")

    # Now sync deck_cards
    if not deck_id_map:
        print("  No new decks to sync cards for.")
        return stats

    # Only sync cards for newly inserted decks
    new_pg_ids = [pg_id for pg_id, sqlite_id in deck_id_map.items()
                  if pg_id not in existing]  # existing tracks (source, source_id), not pg_ids

    print(f"  Syncing cards for {len(deck_id_map):,} decks...")

    # Process cards in chunks of PG deck IDs
    pg_id_list = list(deck_id_map.keys())
    card_batch = []

    for chunk_start in range(0, len(pg_id_list), BATCH_SIZE):
        chunk = pg_id_list[chunk_start:chunk_start + BATCH_SIZE]
        placeholders = ",".join(["%s"] * len(chunk))

        pg_cur.execute(
            f"SELECT deck_id, card_name, board, quantity FROM deck_cards WHERE deck_id IN ({placeholders})",
            chunk,
        )

        for card_row in pg_cur:
            pg_deck_id = card_row[0]
            sqlite_deck_id = deck_id_map.get(pg_deck_id)
            if not sqlite_deck_id:
                continue

            card_batch.append((
                sqlite_deck_id, card_row[1], card_row[3] or 1, card_row[2] or "main"
            ))

        # Flush card batch
        if len(card_batch) >= BATCH_SIZE * 10:
            sqlite_conn.executemany(
                """INSERT OR IGNORE INTO community_deck_cards
                   (community_deck_id, card_name, quantity, board)
                   VALUES (?, ?, ?, ?)""",
                card_batch,
            )
            stats["cards_inserted"] += len(card_batch)
            sqlite_conn.commit()
            card_batch.clear()

            if stats["cards_inserted"] % 100000 < BATCH_SIZE * 10:
                print(f"  Cards progress: {stats['cards_inserted']:,}")

    # Final flush
    if card_batch:
        sqlite_conn.executemany(
            """INSERT OR IGNORE INTO community_deck_cards
               (community_deck_id, card_name, quantity, board)
               VALUES (?, ?, ?, ?)""",
            card_batch,
        )
        stats["cards_inserted"] += len(card_batch)
        sqlite_conn.commit()

    print(f"  Cards done: {stats['cards_inserted']:,} inserted")
    return stats


def main():
    parser = argparse.ArgumentParser(description="Merge CF API PostgreSQL decks into SQLite")
    parser.add_argument("--sqlite", default="/opt/grimoire-scrapers/data/mtg-deck-builder.db",
                        help="Path to SQLite database")
    parser.add_argument("--pg-host", default=PG_DEFAULTS["host"])
    parser.add_argument("--pg-port", type=int, default=PG_DEFAULTS["port"])
    parser.add_argument("--pg-db", default=PG_DEFAULTS["dbname"])
    parser.add_argument("--pg-user", default=PG_DEFAULTS["user"])
    parser.add_argument("--pg-password", default=PG_DEFAULTS["password"])
    args = parser.parse_args()

    sqlite_path = os.path.abspath(args.sqlite)
    if not os.path.exists(sqlite_path):
        print(f"SQLite DB not found: {sqlite_path}", file=sys.stderr)
        sys.exit(1)

    print("=" * 60)
    print("PG -> SQLite Deck Merge")
    print(f"PostgreSQL: {args.pg_user}@{args.pg_host}:{args.pg_port}/{args.pg_db}")
    print(f"SQLite:     {sqlite_path}")
    print(f"Started:    {datetime.now().isoformat()}")
    print("=" * 60)

    start = time.time()

    pg_conn = get_pg_conn(args)
    sqlite_conn = get_sqlite_conn(sqlite_path)

    try:
        stats = sync_decks(pg_conn, sqlite_conn)
    finally:
        pg_conn.close()
        sqlite_conn.close()

    elapsed = time.time() - start

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Decks inserted:  {stats['decks_inserted']:,}")
    print(f"  Decks skipped:   {stats['decks_skipped']:,}")
    print(f"  Cards inserted:  {stats['cards_inserted']:,}")
    print(f"  Errors:          {stats['errors']}")
    print(f"  Elapsed:         {elapsed:.1f}s")
    print(f"Finished: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
