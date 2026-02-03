#!/usr/bin/env python3
"""
Aggregate parsed Arena matches and update card performance data.

Reads from: arena_parsed_matches table
Updates: card_performance table (existing global learner schema)

Usage:
  python scripts/aggregate_matches.py
"""

import json
import sqlite3
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Missing 'pandas' package. Run: pip install -r scripts/requirements.txt")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = PROJECT_ROOT / "data" / "mtg-deck-builder.db"


def get_card_name_map(conn: sqlite3.Connection) -> dict:
    """Build a map of arena_id -> card_name for resolving Arena IDs."""
    rows = conn.execute(
        "SELECT arena_id, name FROM cards WHERE arena_id IS NOT NULL"
    ).fetchall()
    return {str(row[0]): row[1] for row in rows}


def aggregate(conn: sqlite3.Connection):
    """Aggregate match data into card_performance table."""
    # Load all parsed matches
    df = pd.read_sql_query(
        "SELECT match_id, result, format, deck_cards, cards_played, opponent_cards_seen FROM arena_parsed_matches",
        conn
    )

    if df.empty:
        print("No parsed matches to aggregate.")
        return

    print(f"Aggregating {len(df)} matches...")

    arena_to_name = get_card_name_map(conn)

    # Track per-card stats
    card_stats = {}  # card_name -> {format -> {games, wins, played, played_wins}}

    for _, row in df.iterrows():
        result = row["result"]
        fmt = row["format"] or "unknown"
        is_win = result == "win"

        # Parse deck cards (cards in deck this game)
        deck_card_ids = set()
        if row["deck_cards"]:
            try:
                deck = json.loads(row["deck_cards"])
                for entry in deck:
                    if isinstance(entry, dict):
                        deck_card_ids.add(str(entry.get("id", "")))
                    else:
                        deck_card_ids.add(str(entry))
            except (json.JSONDecodeError, TypeError):
                pass

        # Parse cards actually played
        played_ids = set()
        if row["cards_played"]:
            try:
                played_ids = set(json.loads(row["cards_played"]))
            except (json.JSONDecodeError, TypeError):
                pass

        # Resolve Arena IDs to names and accumulate stats
        for card_id in deck_card_ids:
            card_name = arena_to_name.get(card_id)
            if not card_name:
                continue

            if card_name not in card_stats:
                card_stats[card_name] = {}
            if fmt not in card_stats[card_name]:
                card_stats[card_name][fmt] = {
                    "games_in_deck": 0,
                    "wins_in_deck": 0,
                    "games_played": 0,
                    "wins_played": 0,
                }

            stats = card_stats[card_name][fmt]
            stats["games_in_deck"] += 1
            if is_win:
                stats["wins_in_deck"] += 1

            if card_id in played_ids:
                stats["games_played"] += 1
                if is_win:
                    stats["wins_played"] += 1

    # Write aggregated stats to card_performance table
    updated = 0
    for card_name, formats in card_stats.items():
        for fmt, stats in formats.items():
            try:
                conn.execute("""
                    INSERT INTO card_performance
                    (card_name, format, opponent_colors, games_played, games_in_deck,
                     wins_when_played, wins_when_in_deck, total_drawn, rating)
                    VALUES (?, ?, '', ?, ?, ?, ?, 0, 1500.0)
                    ON CONFLICT(card_name, format, opponent_colors) DO UPDATE SET
                        games_played = card_performance.games_played + excluded.games_played,
                        games_in_deck = card_performance.games_in_deck + excluded.games_in_deck,
                        wins_when_played = card_performance.wins_when_played + excluded.wins_when_played,
                        wins_when_in_deck = card_performance.wins_when_in_deck + excluded.wins_when_in_deck,
                        updated_at = datetime('now')
                """, (
                    card_name, fmt,
                    stats["games_played"], stats["games_in_deck"],
                    stats["wins_played"], stats["wins_in_deck"],
                ))
                updated += 1
            except sqlite3.OperationalError:
                pass  # Table may not exist

    conn.commit()
    print(f"Updated performance data for {updated} card/format combinations")


def main():
    print("=== Match Data Aggregation ===\n")

    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")

    aggregate(conn)

    # Summary
    try:
        total_perf = conn.execute("SELECT COUNT(*) FROM card_performance").fetchone()[0]
        print(f"\nTotal card_performance entries: {total_perf}")

        # Top performers
        top = conn.execute("""
            SELECT card_name, format,
                   CAST(wins_when_played AS REAL) / MAX(games_played, 1) as winrate,
                   games_played
            FROM card_performance
            WHERE games_played >= 5
            ORDER BY winrate DESC
            LIMIT 10
        """).fetchall()

        if top:
            print("\nTop 10 cards by win rate (min 5 games played):")
            for name, fmt, wr, games in top:
                print(f"  {name} ({fmt}): {wr:.1%} win rate ({games} games)")
    except sqlite3.OperationalError:
        pass

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
