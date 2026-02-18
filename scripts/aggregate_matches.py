#!/usr/bin/env python3
"""
Aggregate parsed Arena matches and update card performance data.

Reads from: arena_parsed_matches table
Updates: card_performance table (existing global learner schema)

Usage:
  python scripts/aggregate_matches.py
"""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Missing 'pandas' package. Run: pip install -r scripts/requirements.txt")
    sys.exit(1)

DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")


def get_card_name_map(conn: sqlite3.Connection) -> dict:
    """Build a map of grpId -> card_name for resolving Arena IDs.

    Uses arena_grp_id_map (Scryfall-resolved) as primary source,
    falls back to cards.arena_id for any remaining IDs.
    """
    result = {}

    # Primary: grp_id_map table (Scryfall-resolved, most accurate)
    try:
        rows = conn.execute(
            "SELECT grp_id, card_name FROM arena_grp_id_map"
        ).fetchall()
        for row in rows:
            result[str(row[0])] = row[1]
    except Exception:
        pass  # Table may not exist yet

    # Fallback: cards.arena_id (MTGJSON-sourced, lower coverage)
    rows = conn.execute(
        "SELECT arena_id, name FROM cards WHERE arena_id IS NOT NULL"
    ).fetchall()
    for row in rows:
        key = str(row[0])
        if key not in result:
            result[key] = row[1]

    return result


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

        # Parse cards actually played (seen in game objects)
        played_ids = set()
        if row["cards_played"]:
            try:
                played_ids = set()
                for v in json.loads(row["cards_played"]):
                    played_ids.add(str(v))
            except (json.JSONDecodeError, TypeError):
                pass

        # If no deck_cards available, treat cards_played as deck proxy
        # (these are cards that appeared in game objects, meaning they were
        # drawn/played — a reasonable proxy for deck composition)
        if not deck_card_ids and played_ids:
            deck_card_ids = played_ids

        # Resolve Arena IDs to names and accumulate stats
        for card_id in deck_card_ids:
            # Handle card names directly (some entries are names, not IDs)
            try:
                int(card_id)
                card_name = arena_to_name.get(card_id)
            except ValueError:
                card_name = card_id  # Already a card name

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
    parser = argparse.ArgumentParser(description="Aggregate match data into card performance stats")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    print("=== Match Data Aggregation ===\n")

    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(db_path, timeout=10)
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
