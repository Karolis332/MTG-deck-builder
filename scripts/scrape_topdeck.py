#!/usr/bin/env python3
"""
Scrape TopDeck.gg tournament data via their API.

Fetches recent tournament results, standings, decklists, and round pairings.
Also bridges data into community_decks + community_deck_cards tables for
automatic pickup by aggregate_community_meta.py.

API: POST https://topdeck.gg/api/v2/tournaments (requires API key)
API key read from app_state table (key: 'topdeck_api_key') or --api-key arg.

Usage:
    py scripts/scrape_topdeck.py --db data/mtg-deck-builder.db
    py scripts/scrape_topdeck.py --db data/mtg-deck-builder.db --api-key YOUR_KEY
    py scripts/scrape_topdeck.py --db data/mtg-deck-builder.db --formats EDH Modern --days 14
    py scripts/scrape_topdeck.py --db data/mtg-deck-builder.db --max-tournaments 10
"""

import argparse
import json
import os
import sqlite3
import sys
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("requests required: pip install requests", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")

API_URL = "https://topdeck.gg/api/v2/tournaments"
RATE_LIMIT_SEC = 0.3  # 300ms between requests (API limit: 200/min)

# TopDeck format names → our normalized format names
FORMAT_MAP = {
    "EDH": "commander",
    "Modern": "modern",
    "Pioneer": "pioneer",
    "Standard": "standard",
    "Legacy": "legacy",
    "Vintage": "vintage",
    "Pauper": "pauper",
}

DEFAULT_FORMATS = ["EDH", "Modern", "Pioneer", "Standard"]


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(conn: sqlite3.Connection):
    """Create TopDeck-specific tables if they don't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS topdeck_tournaments (
            tid TEXT PRIMARY KEY,
            name TEXT,
            format TEXT,
            start_date TEXT,
            swiss_rounds INTEGER,
            top_cut INTEGER,
            participant_count INTEGER,
            city TEXT,
            state_region TEXT,
            location TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS topdeck_standings (
            tid TEXT NOT NULL,
            player_id TEXT,
            player_name TEXT NOT NULL,
            standing INTEGER,
            wins INTEGER,
            losses INTEGER,
            draws INTEGER,
            win_rate REAL,
            opponent_win_rate REAL,
            wins_swiss INTEGER,
            wins_bracket INTEGER,
            byes INTEGER,
            decklist_url TEXT,
            commander TEXT,
            UNIQUE(tid, player_name)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS topdeck_deck_cards (
            tid TEXT NOT NULL,
            player_id TEXT,
            section TEXT NOT NULL,
            card_name TEXT NOT NULL,
            count INTEGER DEFAULT 1,
            UNIQUE(tid, player_id, section, card_name)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS topdeck_rounds (
            tid TEXT NOT NULL,
            round_number INTEGER,
            table_number INTEGER,
            player_names TEXT,
            winner TEXT,
            status TEXT
        )
    """)
    # Also ensure community_decks/community_deck_cards exist for bridge
    conn.execute("""
        CREATE TABLE IF NOT EXISTS community_decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            source_id TEXT,
            format TEXT NOT NULL,
            archetype TEXT,
            deck_name TEXT,
            placement INTEGER,
            meta_share REAL,
            event_name TEXT,
            event_date TEXT,
            scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(source, source_id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS community_deck_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            community_deck_id INTEGER NOT NULL,
            card_name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            board TEXT NOT NULL DEFAULT 'main',
            FOREIGN KEY (community_deck_id) REFERENCES community_decks(id) ON DELETE CASCADE
        )
    """)
    # Ensure v18 columns on community_decks
    existing = set()
    for row in conn.execute("PRAGMA table_info(community_decks)"):
        existing.add(row[1])
    new_cols = {
        "wins": "INTEGER",
        "losses": "INTEGER",
        "draws": "INTEGER",
        "record": "TEXT",
        "tournament_type": "TEXT",
        "player_name": "TEXT",
    }
    for col, dtype in new_cols.items():
        if col not in existing:
            try:
                conn.execute(f"ALTER TABLE community_decks ADD COLUMN {col} {dtype}")
            except sqlite3.OperationalError:
                pass
    conn.commit()


def get_api_key(conn: sqlite3.Connection, cli_key: str | None) -> str | None:
    """Get API key from CLI arg or app_state table."""
    if cli_key:
        return cli_key
    try:
        row = conn.execute(
            "SELECT value FROM app_state WHERE key = 'topdeck_api_key'"
        ).fetchone()
        if row and row[0]:
            return row[0]
    except sqlite3.OperationalError:
        pass
    return None


def fetch_tournaments(api_key: str, fmt: str, days: int) -> list[dict]:
    """Fetch tournament list for a format from TopDeck API."""
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json",
    }
    body = {
        "game": "Magic: The Gathering",
        "format": fmt,
        "last": days,
        "columns": [
            "name", "decklist", "wins", "losses", "draws", "winRate",
            "opponentWinRate", "winsSwiss", "winsBracket", "byes",
            "standing", "commander",
        ],
        "rounds": True,
    }
    try:
        resp = requests.post(API_URL, json=body, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"  Request failed for {fmt}: {e}", file=sys.stderr)
        return []


def save_tournament(conn: sqlite3.Connection, tournament: dict, td_format: str) -> int:
    """Save a tournament and its standings/decklists/rounds. Returns players saved."""
    tid = str(tournament.get("TID", ""))
    if not tid:
        return 0

    our_format = FORMAT_MAP.get(td_format, td_format.lower())
    start_date = tournament.get("startDate", "")
    if isinstance(start_date, (int, float)):
        start_date = datetime.fromtimestamp(start_date / 1000).isoformat()

    # Tournament metadata
    conn.execute("""
        INSERT INTO topdeck_tournaments
            (tid, name, format, start_date, swiss_rounds, top_cut,
             participant_count, city, state_region, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tid) DO UPDATE SET
            name = excluded.name,
            format = excluded.format,
            start_date = excluded.start_date,
            swiss_rounds = excluded.swiss_rounds,
            top_cut = excluded.top_cut,
            participant_count = excluded.participant_count
    """, (
        tid,
        tournament.get("name", ""),
        our_format,
        start_date,
        tournament.get("swissRounds"),
        tournament.get("topCut"),
        tournament.get("players", 0) if isinstance(tournament.get("players"), int)
            else len(tournament.get("standings", [])),
        tournament.get("city"),
        tournament.get("stateRegion"),
        tournament.get("location"),
    ))

    # Standings
    standings = tournament.get("standings", [])
    players_saved = 0

    for i, player in enumerate(standings):
        player_name = player.get("name", f"Player_{i}")
        player_id = player.get("id", "")
        wins = player.get("wins")
        losses = player.get("losses")
        draws = player.get("draws")
        win_rate = player.get("winRate")
        standing = player.get("standing", i + 1)
        commander = player.get("commander")
        if isinstance(commander, list):
            commander = " / ".join(commander) if commander else None

        conn.execute("""
            INSERT INTO topdeck_standings
                (tid, player_id, player_name, standing, wins, losses, draws,
                 win_rate, opponent_win_rate, wins_swiss, wins_bracket, byes,
                 decklist_url, commander)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tid, player_name) DO UPDATE SET
                standing = excluded.standing,
                wins = excluded.wins,
                losses = excluded.losses,
                draws = excluded.draws,
                win_rate = excluded.win_rate,
                commander = excluded.commander
        """, (
            tid, player_id, player_name, standing, wins, losses, draws,
            win_rate, player.get("opponentWinRate"),
            player.get("winsSwiss"), player.get("winsBracket"),
            player.get("byes"), player.get("decklistUrl"),
            commander,
        ))

        # Save decklist if available
        deck_obj = player.get("decklist") or player.get("deckObj")
        if isinstance(deck_obj, dict):
            card_count = 0
            for section, cards in deck_obj.items():
                if isinstance(cards, dict):
                    for card_name, count in cards.items():
                        conn.execute("""
                            INSERT INTO topdeck_deck_cards
                                (tid, player_id, section, card_name, count)
                            VALUES (?, ?, ?, ?, ?)
                            ON CONFLICT(tid, player_id, section, card_name) DO UPDATE SET
                                count = excluded.count
                        """, (tid, player_id, section, card_name, count))
                        card_count += 1
                elif isinstance(cards, list):
                    for card_name in cards:
                        conn.execute("""
                            INSERT INTO topdeck_deck_cards
                                (tid, player_id, section, card_name, count)
                            VALUES (?, ?, ?, ?, 1)
                            ON CONFLICT(tid, player_id, section, card_name) DO UPDATE SET
                                count = excluded.count
                        """, (tid, player_id, section, card_name))
                        card_count += 1

            # Bridge to community_decks for aggregate pipeline
            if card_count > 0:
                source_id = f"topdeck-{tid}-{player_id or player_name}"
                record_str = f"{wins or 0}-{losses or 0}" + (f"-{draws}" if draws else "")
                deck_name = commander or player_name

                conn.execute("""
                    INSERT INTO community_decks
                        (source, source_id, format, archetype, deck_name, placement,
                         event_name, event_date, wins, losses, draws, record,
                         tournament_type, player_name, scraped_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(source, source_id) DO UPDATE SET
                        placement = excluded.placement,
                        wins = excluded.wins,
                        losses = excluded.losses,
                        draws = excluded.draws,
                        record = excluded.record,
                        scraped_at = datetime('now')
                """, (
                    "topdeck", source_id, our_format,
                    commander,  # archetype = commander for EDH
                    deck_name, standing,
                    tournament.get("name", ""), start_date,
                    wins, losses, draws, record_str,
                    "tournament", player_name,
                ))

                # Get community_deck_id for card bridge
                row = conn.execute(
                    "SELECT id FROM community_decks WHERE source = 'topdeck' AND source_id = ?",
                    (source_id,)
                ).fetchone()
                if row:
                    cd_id = row[0]
                    # Clear old cards and re-insert
                    conn.execute("DELETE FROM community_deck_cards WHERE community_deck_id = ?", (cd_id,))
                    for section, cards in deck_obj.items():
                        board = "sideboard" if section.lower() in ("sideboard", "side") else "main"
                        if isinstance(cards, dict):
                            for card_name, count in cards.items():
                                conn.execute("""
                                    INSERT INTO community_deck_cards
                                        (community_deck_id, card_name, quantity, board)
                                    VALUES (?, ?, ?, ?)
                                """, (cd_id, card_name, count, board))
                        elif isinstance(cards, list):
                            for card_name in cards:
                                conn.execute("""
                                    INSERT INTO community_deck_cards
                                        (community_deck_id, card_name, quantity, board)
                                    VALUES (?, ?, 1, ?)
                                """, (cd_id, card_name, board))

        players_saved += 1

    # Save rounds
    rounds = tournament.get("rounds", [])
    if isinstance(rounds, list):
        for rnd in rounds:
            round_num = rnd.get("round") or rnd.get("roundNumber")
            tables = rnd.get("tables", []) if isinstance(rnd.get("tables"), list) else []
            for table in tables:
                player_names = table.get("players", [])
                if isinstance(player_names, list):
                    player_names = json.dumps(player_names)
                conn.execute("""
                    INSERT INTO topdeck_rounds
                        (tid, round_number, table_number, player_names, winner, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    tid, round_num, table.get("table") or table.get("tableNumber"),
                    player_names, table.get("winner"), table.get("status"),
                ))

    return players_saved


def main():
    parser = argparse.ArgumentParser(description="Scrape TopDeck.gg tournament data")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--api-key", default=None, help="TopDeck.gg API key")
    parser.add_argument("--formats", nargs="+", default=DEFAULT_FORMATS,
                        help="TopDeck format names (default: EDH Modern Pioneer Standard)")
    parser.add_argument("--days", type=int, default=30, help="Lookback period in days (default: 30)")
    parser.add_argument("--max-tournaments", type=int, default=50,
                        help="Max tournaments per format (default: 50)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_tables(conn)

    api_key = get_api_key(conn, args.api_key)
    if not api_key:
        print("No TopDeck.gg API key found. Set it in Settings or pass --api-key.")
        print("Skipping TopDeck scraping.")
        conn.close()
        sys.exit(0)  # Exit cleanly, not an error

    print("=" * 60)
    print("TopDeck.gg Tournament Scraping")
    print(f"Database: {db_path}")
    print(f"Formats: {', '.join(args.formats)}")
    print(f"Lookback: {args.days} days")
    print(f"Max tournaments/format: {args.max_tournaments}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    total_tournaments = 0
    total_players = 0

    for fmt in args.formats:
        print(f"\n[{fmt}]")
        tournaments = fetch_tournaments(api_key, fmt, args.days)

        if not tournaments:
            print(f"  No tournaments found for {fmt}")
            continue

        print(f"  Found {len(tournaments)} tournaments")
        count = 0

        for tournament in tournaments:
            if count >= args.max_tournaments:
                break

            tid = tournament.get("TID", "unknown")
            name = tournament.get("name", "Unnamed")
            players_saved = save_tournament(conn, tournament, fmt)
            conn.commit()

            standing_count = len(tournament.get("standings", []))
            print(f"    {name[:50]:50s} ({standing_count} players, {players_saved} with data)")

            total_tournaments += 1
            total_players += players_saved
            count += 1
            time.sleep(RATE_LIMIT_SEC)

    # Summary
    td_count = conn.execute("SELECT COUNT(*) FROM topdeck_tournaments").fetchone()[0]
    bridge_count = conn.execute(
        "SELECT COUNT(*) FROM community_decks WHERE source = 'topdeck'"
    ).fetchone()[0]

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Tournaments scraped: {total_tournaments}")
    print(f"  Players/decklists:   {total_players}")
    print(f"  Total in DB:         {td_count} tournaments")
    print(f"  Bridged to pipeline: {bridge_count} community decks")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
