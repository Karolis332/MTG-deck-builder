#!/usr/bin/env python3
"""
PR7: Meta analysis via pandas.

Reads match_logs, card_performance, and arena_parsed_matches from the shared
SQLite database and produces statistical summaries that the TypeScript analytics
dashboard can consume.

Outputs are written to an `analytics_snapshots` table so the Next.js API can
serve them without running Python at request time.

Usage:
    python scripts/analyze_meta.py [--db data/mtg-deck-builder.db]
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime

try:
    import pandas as pd
except ImportError:
    print("pandas is required: pip install pandas", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analytics_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_type TEXT NOT NULL,
            format TEXT NOT NULL DEFAULT '',
            data TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(snapshot_type, format)
        )
    """)
    conn.commit()


def upsert_snapshot(conn: sqlite3.Connection, snapshot_type: str, fmt: str, data: dict):
    conn.execute("""
        INSERT INTO analytics_snapshots (snapshot_type, format, data, created_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(snapshot_type, format) DO UPDATE SET
            data = excluded.data,
            created_at = excluded.created_at
    """, (snapshot_type, fmt, json.dumps(data)))
    conn.commit()


def analyze_win_rates(conn: sqlite3.Connection):
    """Overall win/loss/draw breakdown per format from match_logs."""
    try:
        df = pd.read_sql_query("SELECT * FROM match_logs", conn)
    except Exception:
        return {}

    if df.empty:
        return {}

    results = {}
    for fmt, group in df.groupby("game_format"):
        fmt_str = str(fmt) if fmt else "unknown"
        total = len(group)
        wins = len(group[group["result"] == "win"])
        losses = len(group[group["result"] == "loss"])
        draws = len(group[group["result"] == "draw"])
        results[fmt_str] = {
            "total_games": total,
            "wins": wins,
            "losses": losses,
            "draws": draws,
            "win_rate": round(wins / total * 100, 1) if total > 0 else 0,
        }
    return results


def analyze_deck_performance(conn: sqlite3.Connection):
    """Per-deck win rates from match_logs."""
    try:
        df = pd.read_sql_query("""
            SELECT ml.*, d.name as deck_name, d.format as deck_format
            FROM match_logs ml
            LEFT JOIN decks d ON ml.deck_id = d.id
        """, conn)
    except Exception:
        return []

    if df.empty:
        return []

    rows = []
    for deck_id, group in df.groupby("deck_id"):
        if pd.isna(deck_id):
            continue
        total = len(group)
        wins = len(group[group["result"] == "win"])
        name = group["deck_name"].iloc[0] or f"Deck {int(deck_id)}"
        fmt = group["deck_format"].iloc[0] or "unknown"
        rows.append({
            "deck_id": int(deck_id),
            "deck_name": str(name),
            "format": str(fmt),
            "total_games": total,
            "wins": wins,
            "win_rate": round(wins / total * 100, 1) if total > 0 else 0,
        })

    rows.sort(key=lambda x: x["win_rate"], reverse=True)
    return rows


def analyze_card_performance(conn: sqlite3.Connection):
    """Top and bottom performing cards from card_performance table."""
    try:
        df = pd.read_sql_query("""
            SELECT card_name, format, games_played, wins_when_played, rating
            FROM card_performance
            WHERE games_played >= 3
            ORDER BY rating DESC
        """, conn)
    except Exception:
        return {"top": [], "bottom": []}

    if df.empty:
        return {"top": [], "bottom": []}

    df["win_rate"] = (df["wins_when_played"] / df["games_played"] * 100).round(1)

    top = df.head(20).to_dict(orient="records")
    bottom = df.tail(20).to_dict(orient="records")

    return {"top": top, "bottom": bottom}


def analyze_mana_curve(conn: sqlite3.Connection):
    """Average mana curve distribution across all decks."""
    try:
        df = pd.read_sql_query("""
            SELECT d.id as deck_id, d.name as deck_name, c.cmc, dc.quantity
            FROM deck_cards dc
            JOIN cards c ON dc.card_id = c.id
            JOIN decks d ON dc.deck_id = d.id
            WHERE dc.board = 'main'
            AND c.type_line NOT LIKE '%Land%'
        """, conn)
    except Exception:
        return {}

    if df.empty:
        return {}

    # Bucket CMC: 0, 1, 2, 3, 4, 5, 6, 7+
    df["cmc_bucket"] = df["cmc"].clip(upper=7).astype(int)
    curve = df.groupby("cmc_bucket")["quantity"].sum().to_dict()

    # Normalize keys to strings for JSON
    return {str(k): int(v) for k, v in curve.items()}


def analyze_color_distribution(conn: sqlite3.Connection):
    """Color identity distribution across all decks."""
    try:
        df = pd.read_sql_query("""
            SELECT c.color_identity, dc.quantity
            FROM deck_cards dc
            JOIN cards c ON dc.card_id = c.id
            WHERE dc.board IN ('main', 'commander')
        """, conn)
    except Exception:
        return {}

    if df.empty:
        return {}

    color_counts = {"W": 0, "U": 0, "B": 0, "R": 0, "G": 0, "C": 0}
    for _, row in df.iterrows():
        ci = row["color_identity"] or ""
        qty = row["quantity"]
        if not ci or ci == "[]":
            color_counts["C"] += qty
        else:
            for color in ["W", "U", "B", "R", "G"]:
                if color in ci:
                    color_counts[color] += qty

    return color_counts


def analyze_type_distribution(conn: sqlite3.Connection):
    """Card type distribution across all decks."""
    try:
        df = pd.read_sql_query("""
            SELECT c.type_line, dc.quantity
            FROM deck_cards dc
            JOIN cards c ON dc.card_id = c.id
            WHERE dc.board = 'main'
        """, conn)
    except Exception:
        return {}

    if df.empty:
        return {}

    type_counts = {
        "Creature": 0, "Instant": 0, "Sorcery": 0,
        "Artifact": 0, "Enchantment": 0, "Planeswalker": 0,
        "Land": 0, "Other": 0,
    }

    for _, row in df.iterrows():
        tl = str(row["type_line"])
        qty = row["quantity"]
        matched = False
        for t in ["Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Land"]:
            if t in tl:
                type_counts[t] += qty
                matched = True
                break
        if not matched:
            type_counts["Other"] += qty

    return type_counts


def analyze_games_over_time(conn: sqlite3.Connection):
    """Games played per day for the last 30 days."""
    try:
        df = pd.read_sql_query("""
            SELECT date(created_at) as game_date, result
            FROM match_logs
            WHERE created_at >= date('now', '-30 days')
            ORDER BY game_date
        """, conn)
    except Exception:
        return []

    if df.empty:
        return []

    daily = []
    for date_str, group in df.groupby("game_date"):
        total = len(group)
        wins = len(group[group["result"] == "win"])
        daily.append({
            "date": str(date_str),
            "games": total,
            "wins": wins,
            "win_rate": round(wins / total * 100, 1) if total > 0 else 0,
        })

    return daily


def main():
    parser = argparse.ArgumentParser(description="MTG meta analysis")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_table(conn)

    print("Analyzing win rates...")
    win_rates = analyze_win_rates(conn)
    upsert_snapshot(conn, "win_rates", "", win_rates)

    print("Analyzing deck performance...")
    deck_perf = analyze_deck_performance(conn)
    upsert_snapshot(conn, "deck_performance", "", {"decks": deck_perf})

    print("Analyzing card performance...")
    card_perf = analyze_card_performance(conn)
    upsert_snapshot(conn, "card_performance", "", card_perf)

    print("Analyzing mana curve...")
    mana_curve = analyze_mana_curve(conn)
    upsert_snapshot(conn, "mana_curve", "", mana_curve)

    print("Analyzing color distribution...")
    colors = analyze_color_distribution(conn)
    upsert_snapshot(conn, "color_distribution", "", colors)

    print("Analyzing type distribution...")
    types = analyze_type_distribution(conn)
    upsert_snapshot(conn, "type_distribution", "", types)

    print("Analyzing games over time...")
    games_time = analyze_games_over_time(conn)
    upsert_snapshot(conn, "games_over_time", "", {"days": games_time})

    conn.close()
    print(f"Done. Analytics snapshots written to {db_path}")


if __name__ == "__main__":
    main()
