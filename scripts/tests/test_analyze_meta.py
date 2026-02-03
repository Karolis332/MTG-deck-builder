"""Tests for analyze_meta.py — pandas-based analytics."""

import json
import os
import sqlite3
import sys
import pytest

# Add scripts dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from analyze_meta import (
    ensure_table,
    upsert_snapshot,
    analyze_win_rates,
    analyze_deck_performance,
    analyze_mana_curve,
    analyze_color_distribution,
    analyze_type_distribution,
    analyze_games_over_time,
)


@pytest.fixture
def db():
    """Create an in-memory SQLite database with test data."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row

    # Create tables
    conn.executescript("""
        CREATE TABLE match_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_id INTEGER,
            result TEXT NOT NULL,
            game_format TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            format TEXT
        );

        CREATE TABLE cards (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            cmc REAL DEFAULT 0,
            type_line TEXT DEFAULT '',
            color_identity TEXT DEFAULT '[]',
            oracle_text TEXT DEFAULT '',
            edhrec_rank INTEGER
        );

        CREATE TABLE deck_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_id INTEGER,
            card_id TEXT,
            quantity INTEGER DEFAULT 1,
            board TEXT DEFAULT 'main'
        );

        CREATE TABLE card_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_name TEXT,
            format TEXT,
            games_played INTEGER DEFAULT 0,
            wins_when_played INTEGER DEFAULT 0,
            rating REAL DEFAULT 1500
        );
    """)

    # Insert test decks
    conn.execute("INSERT INTO decks (id, name, format) VALUES (1, 'Goblin Rush', 'commander')")
    conn.execute("INSERT INTO decks (id, name, format) VALUES (2, 'Control', 'standard')")

    # Insert test cards
    conn.execute("""INSERT INTO cards (id, name, cmc, type_line, color_identity) VALUES
        ('c1', 'Lightning Bolt', 1, 'Instant', '["R"]')""")
    conn.execute("""INSERT INTO cards (id, name, cmc, type_line, color_identity) VALUES
        ('c2', 'Counterspell', 2, 'Instant', '["U"]')""")
    conn.execute("""INSERT INTO cards (id, name, cmc, type_line, color_identity) VALUES
        ('c3', 'Llanowar Elves', 1, 'Creature — Elf Druid', '["G"]')""")
    conn.execute("""INSERT INTO cards (id, name, cmc, type_line, color_identity) VALUES
        ('c4', 'Wrath of God', 4, 'Sorcery', '["W"]')""")
    conn.execute("""INSERT INTO cards (id, name, cmc, type_line, color_identity) VALUES
        ('c5', 'Sol Ring', 0, 'Artifact', '[]')""")
    conn.execute("""INSERT INTO cards (id, name, cmc, type_line, color_identity) VALUES
        ('c6', 'Forest', 0, 'Basic Land — Forest', '[]')""")

    # Deck cards
    conn.execute("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'c1', 4, 'main')")
    conn.execute("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'c3', 4, 'main')")
    conn.execute("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'c5', 1, 'main')")
    conn.execute("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (1, 'c6', 10, 'main')")
    conn.execute("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (2, 'c2', 4, 'main')")
    conn.execute("INSERT INTO deck_cards (deck_id, card_id, quantity, board) VALUES (2, 'c4', 3, 'main')")

    # Match logs
    conn.execute("INSERT INTO match_logs (deck_id, result, game_format, created_at) VALUES (1, 'win', 'commander', datetime('now'))")
    conn.execute("INSERT INTO match_logs (deck_id, result, game_format, created_at) VALUES (1, 'win', 'commander', datetime('now'))")
    conn.execute("INSERT INTO match_logs (deck_id, result, game_format, created_at) VALUES (1, 'loss', 'commander', datetime('now'))")
    conn.execute("INSERT INTO match_logs (deck_id, result, game_format, created_at) VALUES (2, 'win', 'standard', datetime('now'))")
    conn.execute("INSERT INTO match_logs (deck_id, result, game_format, created_at) VALUES (2, 'loss', 'standard', datetime('now'))")
    conn.execute("INSERT INTO match_logs (deck_id, result, game_format, created_at) VALUES (2, 'loss', 'standard', datetime('now'))")

    # Card performance
    conn.execute("INSERT INTO card_performance (card_name, format, games_played, wins_when_played, rating) VALUES ('Lightning Bolt', 'commander', 10, 7, 1600)")
    conn.execute("INSERT INTO card_performance (card_name, format, games_played, wins_when_played, rating) VALUES ('Counterspell', 'standard', 8, 3, 1400)")
    conn.execute("INSERT INTO card_performance (card_name, format, games_played, wins_when_played, rating) VALUES ('Sol Ring', 'commander', 20, 14, 1700)")

    conn.commit()
    yield conn
    conn.close()


class TestEnsureTable:
    def test_creates_analytics_snapshots_table(self, db):
        ensure_table(db)
        row = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='analytics_snapshots'"
        ).fetchone()
        assert row is not None

    def test_idempotent(self, db):
        ensure_table(db)
        ensure_table(db)  # should not raise


class TestUpsertSnapshot:
    def test_inserts_snapshot(self, db):
        ensure_table(db)
        upsert_snapshot(db, "test_type", "standard", {"key": "value"})
        row = db.execute(
            "SELECT data FROM analytics_snapshots WHERE snapshot_type = 'test_type'"
        ).fetchone()
        assert row is not None
        assert json.loads(row["data"]) == {"key": "value"}

    def test_upsert_replaces(self, db):
        ensure_table(db)
        upsert_snapshot(db, "test_type", "", {"v": 1})
        upsert_snapshot(db, "test_type", "", {"v": 2})
        rows = db.execute(
            "SELECT data FROM analytics_snapshots WHERE snapshot_type = 'test_type'"
        ).fetchall()
        assert len(rows) == 1
        assert json.loads(rows[0]["data"]) == {"v": 2}


class TestAnalyzeWinRates:
    def test_returns_per_format_stats(self, db):
        result = analyze_win_rates(db)
        assert "commander" in result
        assert result["commander"]["total_games"] == 3
        assert result["commander"]["wins"] == 2
        assert result["commander"]["losses"] == 1
        assert result["standard"]["total_games"] == 3

    def test_empty_db(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.execute("CREATE TABLE match_logs (id INTEGER, result TEXT, game_format TEXT, created_at TEXT)")
        result = analyze_win_rates(conn)
        assert result == {}
        conn.close()


class TestAnalyzeDeckPerformance:
    def test_returns_deck_stats(self, db):
        result = analyze_deck_performance(db)
        assert len(result) == 2
        # Goblin Rush: 2 wins / 3 games = 66.7%
        goblin = next(d for d in result if d["deck_name"] == "Goblin Rush")
        assert goblin["wins"] == 2
        assert goblin["total_games"] == 3
        assert goblin["win_rate"] == 66.7


class TestAnalyzeManaCurve:
    def test_returns_cmc_distribution(self, db):
        result = analyze_mana_curve(db)
        # c5 Sol Ring CMC=0 (qty 1), c1 Lightning Bolt CMC=1 (qty 4),
        # c3 Llanowar Elves CMC=1 (qty 4), c2 Counterspell CMC=2 (qty 4),
        # c4 Wrath of God CMC=4 (qty 3)
        # Lands excluded, so no c6
        assert "0" in result  # Sol Ring
        assert "1" in result  # Bolt + Elves
        assert result["1"] == 8  # 4 + 4
        assert result["4"] == 3  # Wrath


class TestAnalyzeColorDistribution:
    def test_returns_color_counts(self, db):
        result = analyze_color_distribution(db)
        assert result["R"] == 4   # Lightning Bolt qty 4
        assert result["G"] == 4   # Llanowar Elves qty 4
        assert result["U"] == 4   # Counterspell qty 4
        assert result["W"] == 3   # Wrath of God qty 3
        assert result["C"] == 11  # Sol Ring (1) + Forest (10) — colorless identity


class TestAnalyzeTypeDistribution:
    def test_returns_type_counts(self, db):
        result = analyze_type_distribution(db)
        assert result["Instant"] == 8   # Bolt 4 + Counterspell 4
        assert result["Creature"] == 4  # Llanowar Elves 4
        assert result["Sorcery"] == 3   # Wrath 3
        assert result["Artifact"] == 1  # Sol Ring 1
        assert result["Land"] == 10     # Forest 10


class TestAnalyzeGamesOverTime:
    def test_returns_daily_data(self, db):
        result = analyze_games_over_time(db)
        assert len(result) >= 1
        day = result[0]
        assert "date" in day
        assert "games" in day
        assert "wins" in day
        assert day["games"] == 6  # all 6 matches today
        assert day["wins"] == 3   # 3 wins total
