#!/usr/bin/env python3
"""
Aggregate per-commander card inclusion rates from community deck data.

For each commander with 10+ decks, computes:
  - inclusion_rate: fraction of that commander's decks containing the card
  - avg_copies: mean quantity when included
  - synergy_score: inclusion_rate minus global baseline (how unique to this commander)
  - color_identity: commander's color identity from cards table

Uses SQL-side aggregation to avoid loading 48M+ rows into Python.

Usage:
    py scripts/aggregate_commander_stats.py --db data/mtg-deck-builder.db
    py scripts/aggregate_commander_stats.py --db data/mtg-deck-builder.db --min-decks 20
"""

import argparse
import os
import sqlite3
import sys
from datetime import datetime

DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")
MIN_DECKS_DEFAULT = 10


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA cache_size=-64000")  # 64MB cache for heavy aggregation
    conn.row_factory = sqlite3.Row
    return conn


def ensure_table(conn: sqlite3.Connection):
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


def get_global_baselines(conn: sqlite3.Connection) -> dict[str, float]:
    """Get global inclusion rates from meta_card_stats (commander format)."""
    baselines: dict[str, float] = {}
    try:
        rows = conn.execute("""
            SELECT card_name, meta_inclusion_rate
            FROM meta_card_stats
            WHERE format = 'commander'
        """).fetchall()
        for row in rows:
            baselines[row[0]] = row[1]
    except sqlite3.OperationalError:
        pass
    return baselines


def aggregate_commanders(conn: sqlite3.Connection, min_decks: int) -> dict:
    """Aggregate per-commander card stats using SQL-side computation."""
    stats = {"commanders_processed": 0, "total_stats": 0}

    # Step 1: Find all commanders with enough decks
    print("  Finding commanders with sufficient deck data...")
    commanders = conn.execute("""
        SELECT cdc.card_name AS commander_name, COUNT(DISTINCT cdc.community_deck_id) AS deck_count
        FROM community_deck_cards cdc
        WHERE cdc.board = 'commander'
        GROUP BY cdc.card_name
        HAVING COUNT(DISTINCT cdc.community_deck_id) >= ?
        ORDER BY deck_count DESC
    """, (min_decks,)).fetchall()

    print(f"  Found {len(commanders)} commanders with {min_decks}+ decks")
    if not commanders:
        return stats

    # Step 2: Get global baselines for synergy score computation
    baselines = get_global_baselines(conn)
    print(f"  Loaded {len(baselines)} global baseline rates")

    # Step 3: Look up color identities from cards table
    color_id_map: dict[str, str] = {}
    for row in conn.execute("SELECT name, color_identity FROM cards WHERE color_identity IS NOT NULL"):
        color_id_map[row[0]] = row[1]

    # Step 4: Process each commander via SQL aggregation
    # Clear old data first
    conn.execute("DELETE FROM commander_card_stats")
    conn.commit()

    batch: list[tuple] = []
    batch_size = 5000
    total_inserted = 0

    for i, cmdr_row in enumerate(commanders):
        commander_name = cmdr_row[0]
        total_decks = cmdr_row[1]
        color_identity = color_id_map.get(commander_name)

        # Get all deck IDs for this commander
        # Then aggregate card inclusion across those decks
        card_rows = conn.execute("""
            SELECT
                main_cards.card_name,
                COUNT(DISTINCT main_cards.community_deck_id) AS deck_count,
                AVG(main_cards.quantity) AS avg_copies
            FROM community_deck_cards main_cards
            WHERE main_cards.board = 'main'
            AND main_cards.community_deck_id IN (
                SELECT community_deck_id
                FROM community_deck_cards
                WHERE board = 'commander' AND card_name = ?
            )
            GROUP BY main_cards.card_name
            HAVING COUNT(DISTINCT main_cards.community_deck_id) >= 2
        """, (commander_name,)).fetchall()

        for card_row in card_rows:
            card_name = card_row[0]
            card_deck_count = card_row[1]
            avg_copies = card_row[2]
            inclusion_rate = card_deck_count / total_decks
            global_rate = baselines.get(card_name, 0.0)
            synergy_score = inclusion_rate - global_rate

            batch.append((
                commander_name, card_name,
                round(inclusion_rate, 6),
                round(avg_copies, 4),
                round(synergy_score, 6),
                int(card_deck_count),
                int(total_decks),
                color_identity,
            ))

        if len(batch) >= batch_size:
            conn.executemany("""
                INSERT INTO commander_card_stats
                    (commander_name, card_name, inclusion_rate, avg_copies,
                     synergy_score, deck_count, total_commander_decks,
                     color_identity, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(commander_name, card_name) DO UPDATE SET
                    inclusion_rate = excluded.inclusion_rate,
                    avg_copies = excluded.avg_copies,
                    synergy_score = excluded.synergy_score,
                    deck_count = excluded.deck_count,
                    total_commander_decks = excluded.total_commander_decks,
                    color_identity = excluded.color_identity,
                    updated_at = datetime('now')
            """, batch)
            total_inserted += len(batch)
            batch.clear()
            conn.commit()

        if (i + 1) % 100 == 0 or i == len(commanders) - 1:
            print(f"  Processed {i + 1}/{len(commanders)} commanders "
                  f"({total_inserted + len(batch):,} card stats)")

    # Flush remaining batch
    if batch:
        conn.executemany("""
            INSERT INTO commander_card_stats
                (commander_name, card_name, inclusion_rate, avg_copies,
                 synergy_score, deck_count, total_commander_decks,
                 color_identity, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(commander_name, card_name) DO UPDATE SET
                inclusion_rate = excluded.inclusion_rate,
                avg_copies = excluded.avg_copies,
                synergy_score = excluded.synergy_score,
                deck_count = excluded.deck_count,
                total_commander_decks = excluded.total_commander_decks,
                color_identity = excluded.color_identity,
                updated_at = datetime('now')
        """, batch)
        total_inserted += len(batch)
        conn.commit()

    stats["commanders_processed"] = len(commanders)
    stats["total_stats"] = total_inserted

    # Print top commanders summary
    print(f"\n  Top 10 commanders by deck count:")
    for row in commanders[:10]:
        card_count = conn.execute(
            "SELECT COUNT(*) FROM commander_card_stats WHERE commander_name = ?",
            (row[0],)
        ).fetchone()[0]
        print(f"    {row[0]:40s} {row[1]:5d} decks, {card_count:5d} card stats")

    return stats


def main():
    parser = argparse.ArgumentParser(description="Aggregate per-commander card statistics")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--min-decks", type=int, default=MIN_DECKS_DEFAULT,
                        help=f"Minimum decks per commander (default: {MIN_DECKS_DEFAULT})")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_table(conn)

    print("=" * 60)
    print("Per-Commander Card Stats Aggregation")
    print(f"Database: {db_path}")
    print(f"Min decks per commander: {args.min_decks}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    stats = aggregate_commanders(conn, args.min_decks)

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Commanders processed: {stats['commanders_processed']}")
    print(f"  Total card stats:     {stats['total_stats']:,}")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
