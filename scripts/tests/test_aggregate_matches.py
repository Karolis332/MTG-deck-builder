"""Tests for aggregate_matches.py — match aggregation and card win rates."""

import json
import os
import sqlite3
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from aggregate_matches import aggregate


@pytest.fixture
def db():
    """In-memory DB with arena_parsed_matches and card_performance tables."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row

    conn.executescript("""
        CREATE TABLE cards (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            arena_id INTEGER
        );

        CREATE TABLE arena_parsed_matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id TEXT UNIQUE NOT NULL,
            player_name TEXT,
            opponent_name TEXT,
            result TEXT,
            format TEXT,
            turns INTEGER,
            deck_cards TEXT,
            cards_played TEXT,
            opponent_cards_seen TEXT,
            raw_events TEXT,
            parsed_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE card_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_name TEXT NOT NULL,
            format TEXT NOT NULL,
            opponent_colors TEXT NOT NULL DEFAULT '',
            games_played INTEGER NOT NULL DEFAULT 0,
            games_in_deck INTEGER NOT NULL DEFAULT 0,
            wins_when_played INTEGER NOT NULL DEFAULT 0,
            wins_when_in_deck INTEGER NOT NULL DEFAULT 0,
            total_drawn INTEGER NOT NULL DEFAULT 0,
            rating REAL NOT NULL DEFAULT 1500.0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(card_name, format, opponent_colors)
        );
    """)

    # Insert test cards with arena_ids
    conn.execute("INSERT INTO cards (id, name, arena_id) VALUES ('c1', 'Lightning Bolt', 12345)")
    conn.execute("INSERT INTO cards (id, name, arena_id) VALUES ('c2', 'Counterspell', 12346)")

    # Insert parsed matches — deck_cards and cards_played use arena IDs as strings
    conn.execute("""
        INSERT INTO arena_parsed_matches (match_id, result, format, deck_cards, cards_played)
        VALUES ('m1', 'win', 'standard', '["12345","12346"]', '["12345"]')
    """)
    conn.execute("""
        INSERT INTO arena_parsed_matches (match_id, result, format, deck_cards, cards_played)
        VALUES ('m2', 'loss', 'standard', '["12345","12346"]', '["12346"]')
    """)
    conn.execute("""
        INSERT INTO arena_parsed_matches (match_id, result, format, deck_cards, cards_played)
        VALUES ('m3', 'win', 'standard', '["12345"]', '["12345"]')
    """)

    conn.commit()
    yield conn
    conn.close()


class TestAggregate:
    def test_aggregates_card_stats(self, db):
        aggregate(db)

        rows = db.execute(
            "SELECT * FROM card_performance ORDER BY card_name"
        ).fetchall()

        names = [r["card_name"] for r in rows]
        assert "Lightning Bolt" in names
        assert "Counterspell" in names

    def test_bolt_stats(self, db):
        aggregate(db)

        bolt = db.execute(
            "SELECT * FROM card_performance WHERE card_name = 'Lightning Bolt'"
        ).fetchone()
        # Bolt in deck for m1 (win), m2 (loss), m3 (win) = 3 games
        # Bolt played in m1 (win), m3 (win) = 2 played, 2 wins
        assert bolt["games_in_deck"] == 3
        assert bolt["games_played"] == 2
        assert bolt["wins_when_played"] == 2

    def test_counterspell_stats(self, db):
        aggregate(db)

        cs = db.execute(
            "SELECT * FROM card_performance WHERE card_name = 'Counterspell'"
        ).fetchone()
        # CS in deck for m1 (win), m2 (loss) = 2 games
        # CS played in m2 (loss) = 1 played, 0 wins
        assert cs["games_in_deck"] == 2
        assert cs["games_played"] == 1
        assert cs["wins_when_played"] == 0

    def test_empty_matches(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript("""
            CREATE TABLE cards (id TEXT PRIMARY KEY, name TEXT, arena_id INTEGER);
            CREATE TABLE arena_parsed_matches (
                id INTEGER, match_id TEXT, result TEXT, format TEXT,
                deck_cards TEXT, cards_played TEXT, opponent_cards_seen TEXT
            );
            CREATE TABLE card_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_name TEXT, format TEXT, opponent_colors TEXT DEFAULT '',
                games_played INTEGER DEFAULT 0, games_in_deck INTEGER DEFAULT 0,
                wins_when_played INTEGER DEFAULT 0, wins_when_in_deck INTEGER DEFAULT 0,
                total_drawn INTEGER DEFAULT 0, rating REAL DEFAULT 1500,
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(card_name, format, opponent_colors)
            );
        """)
        aggregate(conn)  # should not raise
        rows = conn.execute("SELECT * FROM card_performance").fetchall()
        assert len(rows) == 0
        conn.close()
