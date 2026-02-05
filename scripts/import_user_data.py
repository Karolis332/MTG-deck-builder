#!/usr/bin/env python3
"""
Import user-exported JSON data into the local SQLite database.
Merges match logs, card performance, and collection data.

Usage:
    py scripts/import_user_data.py export-file.json [--db data/mtg-deck-builder.db]
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime


def get_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def import_arena_matches(conn: sqlite3.Connection, matches: list) -> int:
    """Import arena parsed matches, skip duplicates by match_id."""
    imported = 0
    for m in matches:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO arena_parsed_matches
                   (match_id, player_name, opponent_name, result, format,
                    turns, deck_cards, cards_played, opponent_cards_seen, parsed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (m.get("match_id"), m.get("player_name"), m.get("opponent_name"),
                 m.get("result"), m.get("format"), m.get("turns"),
                 m.get("deck_cards"), m.get("cards_played"),
                 m.get("opponent_cards_seen"), m.get("parsed_at"))
            )
            if conn.execute("SELECT changes()").fetchone()[0] > 0:
                imported += 1
        except sqlite3.Error as e:
            print(f"  [WARN] Skip match {m.get('match_id', '?')}: {e}")
    conn.commit()
    return imported


def import_match_logs(conn: sqlite3.Connection, logs: list) -> int:
    """Import manual match logs."""
    imported = 0
    for m in logs:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO match_logs
                   (deck_id, result, play_draw, opponent_name,
                    opponent_deck_colors, opponent_deck_archetype,
                    turns, my_life_end, opponent_life_end,
                    my_cards_seen, opponent_cards_seen,
                    game_format, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (m.get("deck_id"), m.get("result"), m.get("play_draw"),
                 m.get("opponent_name"), m.get("opponent_deck_colors"),
                 m.get("opponent_deck_archetype"), m.get("turns"),
                 m.get("my_life_end"), m.get("opponent_life_end"),
                 m.get("my_cards_seen"), m.get("opponent_cards_seen"),
                 m.get("game_format"), m.get("created_at"))
            )
            if conn.execute("SELECT changes()").fetchone()[0] > 0:
                imported += 1
        except sqlite3.Error as e:
            print(f"  [WARN] Skip match log: {e}")
    conn.commit()
    return imported


def merge_card_performance(conn: sqlite3.Connection, rows: list) -> int:
    """Merge card performance data — add stats together."""
    merged = 0
    for r in rows:
        name = r.get("card_name")
        fmt = r.get("format", "")
        opp = r.get("opponent_colors", "")

        existing = conn.execute(
            """SELECT games_played, games_in_deck, wins_when_played,
                      wins_when_in_deck, total_drawn
               FROM card_performance
               WHERE card_name = ? AND format = ? AND opponent_colors = ?""",
            (name, fmt, opp)
        ).fetchone()

        if existing:
            # Merge: add counts together
            conn.execute(
                """UPDATE card_performance SET
                   games_played = games_played + ?,
                   games_in_deck = games_in_deck + ?,
                   wins_when_played = wins_when_played + ?,
                   wins_when_in_deck = wins_when_in_deck + ?,
                   total_drawn = total_drawn + ?,
                   updated_at = datetime('now')
                   WHERE card_name = ? AND format = ? AND opponent_colors = ?""",
                (r.get("games_played", 0), r.get("games_in_deck", 0),
                 r.get("wins_when_played", 0), r.get("wins_when_in_deck", 0),
                 r.get("total_drawn", 0), name, fmt, opp)
            )
        else:
            conn.execute(
                """INSERT INTO card_performance
                   (card_name, format, opponent_colors, games_played,
                    games_in_deck, wins_when_played, wins_when_in_deck,
                    total_drawn, rating)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (name, fmt, opp, r.get("games_played", 0),
                 r.get("games_in_deck", 0), r.get("wins_when_played", 0),
                 r.get("wins_when_in_deck", 0), r.get("total_drawn", 0),
                 r.get("rating", 1500.0))
            )
        merged += 1

    conn.commit()
    return merged


def main():
    parser = argparse.ArgumentParser(description="Import user data export into SQLite")
    parser.add_argument("file", help="Path to exported JSON file")
    parser.add_argument("--db", default="data/mtg-deck-builder.db",
                        help="Path to SQLite database")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Export file not found: {args.file}")
        sys.exit(1)
    if not os.path.exists(args.db):
        print(f"Database not found: {args.db}")
        sys.exit(1)

    with open(args.file, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Importing data from: {args.file}")
    print(f"  Exported at: {data.get('exportedAt', 'unknown')}")
    print(f"  Version: {data.get('version', 'unknown')}")
    stats = data.get("stats", {})
    print(f"  Contains: {stats.get('arenaMatches', 0)} arena matches, "
          f"{stats.get('matchLogs', 0)} match logs, "
          f"{stats.get('cardPerformanceEntries', 0)} card perf entries")

    conn = get_db(args.db)

    # Import arena matches
    arena = data.get("arenaMatches", [])
    if arena:
        count = import_arena_matches(conn, arena)
        print(f"  Imported {count}/{len(arena)} arena matches (skipped duplicates)")

    # Import match logs
    logs = data.get("matchLogs", [])
    if logs:
        count = import_match_logs(conn, logs)
        print(f"  Imported {count}/{len(logs)} match logs")

    # Merge card performance
    perf = data.get("cardPerformance", [])
    if perf:
        count = merge_card_performance(conn, perf)
        print(f"  Merged {count} card performance entries")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
