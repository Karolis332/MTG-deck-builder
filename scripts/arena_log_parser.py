#!/usr/bin/env python3
"""
Parse MTG Arena Player.log for match data.

Reads the MTGA Player.log file (Windows/Mac default locations) and
extracts match events: deck submissions, match results, card plays.

Writes parsed matches to: data/mtg-deck-builder.db (arena_parsed_matches table)

Usage:
  python scripts/arena_log_parser.py                  # Parse default log location
  python scripts/arena_log_parser.py /path/to/Player.log  # Parse specific log file
  python scripts/arena_log_parser.py --sample         # Parse sample log for testing
"""

import json
import os
import re
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = PROJECT_ROOT / "data" / "mtg-deck-builder.db"


def get_default_log_path() -> str:
    """Get the default Arena Player.log path based on OS."""
    if sys.platform == "win32":
        appdata = os.getenv("APPDATA", "")
        return os.path.join(appdata, "..", "LocalLow",
                            "Wizards Of The Coast", "MTGA", "Player.log")
    elif sys.platform == "darwin":
        return os.path.expanduser(
            "~/Library/Logs/Wizards Of The Coast/MTGA/Player.log"
        )
    else:
        # Linux (if running via Proton/Wine)
        home = os.path.expanduser("~")
        wine_prefix = os.path.join(home, ".wine", "drive_c", "users",
                                   os.getenv("USER", "user"), "AppData",
                                   "LocalLow", "Wizards Of The Coast",
                                   "MTGA", "Player.log")
        return wine_prefix


def ensure_table(conn: sqlite3.Connection):
    """Create the arena_parsed_matches table if it doesn't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS arena_parsed_matches (
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
            parsed_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_arena_match_id
        ON arena_parsed_matches(match_id)
    """)
    conn.commit()


# ── JSON block extraction from Arena logs ─────────────────────────────────────

def extract_json_blocks(log_text: str) -> list[tuple[str, dict]]:
    """
    Extract tagged JSON blocks from the Arena log.
    Arena logs have lines like:
      [UnityCrossThreadLogger]...<json>
      or standalone JSON objects preceded by a method label.
    """
    blocks = []

    # Pattern: lines containing a JSON object after a method/label
    # Arena logs use patterns like:
    #   ==> MethodName(requestId): {json}
    #   <== MethodName(requestId): {json}
    json_line_pattern = re.compile(
        r'(?:==>|<==)\s+(\w+(?:\.\w+)*)\s*\([^)]*\)\s*:\s*(\{.*)',
        re.DOTALL
    )

    # Also look for standalone JSON after log headers
    standalone_json = re.compile(
        r'\[UnityCrossThreadLogger\]\s*(\{.*)',
        re.DOTALL
    )

    lines = log_text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]

        # Try method call pattern
        m = json_line_pattern.search(line)
        if m:
            method = m.group(1)
            json_str = m.group(2)
            # JSON might span multiple lines — collect until balanced
            json_str = collect_json(json_str, lines, i + 1)
            try:
                data = json.loads(json_str)
                blocks.append((method, data))
            except json.JSONDecodeError:
                pass
            i += 1
            continue

        # Try standalone JSON
        m = standalone_json.search(line)
        if m:
            json_str = collect_json(m.group(1), lines, i + 1)
            try:
                data = json.loads(json_str)
                blocks.append(("standalone", data))
            except json.JSONDecodeError:
                pass
            i += 1
            continue

        i += 1

    return blocks


def collect_json(start: str, lines: list[str], next_idx: int) -> str:
    """Collect a potentially multi-line JSON string until braces balance."""
    result = start
    depth = result.count('{') - result.count('}')

    idx = next_idx
    while depth > 0 and idx < len(lines):
        line = lines[idx]
        result += '\n' + line
        depth += line.count('{') - line.count('}')
        idx += 1
        if idx - next_idx > 200:  # safety limit
            break

    return result


# ── Match event extraction ────────────────────────────────────────────────────

def extract_matches(blocks: list[tuple[str, dict]]) -> list[dict]:
    """Extract match data from the parsed JSON blocks."""
    matches = []
    current_deck = None
    current_match_id = None
    current_events = []
    player_name = None

    for method, data in blocks:
        # Detect player name from authentication
        if "screenName" in data:
            player_name = data.get("screenName")
        elif "playerName" in data:
            player_name = data.get("playerName")

        # Deck submission — store the deck list
        if method in ("Event.DeckSubmitV3", "DeckSubmit", "DeckSubmitV3"):
            deck_data = data.get("CourseDeck", data)
            main_deck = deck_data.get("mainDeck", deck_data.get("MainDeck", []))
            current_deck = []
            for card_entry in main_deck:
                if isinstance(card_entry, dict):
                    card_id = card_entry.get("cardId", card_entry.get("Id", ""))
                    qty = card_entry.get("quantity", card_entry.get("Quantity", 1))
                    current_deck.append({"id": str(card_id), "qty": qty})
                elif isinstance(card_entry, int):
                    current_deck.append({"id": str(card_entry), "qty": 1})

        # Match start
        if "matchId" in data and current_match_id != data.get("matchId"):
            # Save previous match if exists
            if current_match_id and current_events:
                match = build_match(current_match_id, current_events, current_deck, player_name)
                if match:
                    matches.append(match)
            current_match_id = data.get("matchId")
            current_events = []

        # Collect game events
        if "greToClientEvent" in data:
            events = data["greToClientEvent"].get("greToClientMessages", [])
            current_events.extend(events)
        elif "gameStateMessage" in data:
            current_events.append(data)

        # Match complete
        if method in ("MatchComplete", "Event.MatchComplete") or data.get("matchComplete"):
            result_data = data.get("matchComplete", data)
            if current_match_id:
                # Add the completion event
                current_events.append({"_matchComplete": result_data})
                match = build_match(current_match_id, current_events, current_deck, player_name)
                if match:
                    matches.append(match)
                current_match_id = None
                current_events = []

    # Handle last match
    if current_match_id and current_events:
        match = build_match(current_match_id, current_events, current_deck, player_name)
        if match:
            matches.append(match)

    return matches


def build_match(match_id: str, events: list, deck: list | None, player_name: str | None) -> dict | None:
    """Build a structured match record from events."""
    result = None
    opponent_name = None
    turns = 0
    cards_played = []
    opponent_cards = []

    for event in events:
        # Extract result from match complete
        if "_matchComplete" in event:
            mc = event["_matchComplete"]
            result_str = mc.get("result", mc.get("matchResult", ""))
            if isinstance(result_str, str):
                if "Win" in result_str or result_str == "ResultType_Win":
                    result = "win"
                elif "Loss" in result_str or result_str == "ResultType_Loss":
                    result = "loss"
                elif "Draw" in result_str:
                    result = "draw"

        # Extract game state info
        if "gameStateMessage" in event:
            gsm = event["gameStateMessage"]
            t = gsm.get("turnInfo", {}).get("turnNumber", 0)
            if t > turns:
                turns = t

        # Extract zone changes (cards played)
        if "type" in event and event["type"] == "GREMessageType_GameStateMessage":
            gsm = event.get("gameStateMessage", {})
            for go in gsm.get("gameObjects", []):
                if go.get("ownerSeatId") == 1:  # typically the player
                    grp_id = go.get("grpId")
                    if grp_id:
                        cards_played.append(str(grp_id))
                elif go.get("ownerSeatId") == 2:
                    grp_id = go.get("grpId")
                    if grp_id:
                        opponent_cards.append(str(grp_id))

    if not result:
        return None

    return {
        "match_id": match_id,
        "player_name": player_name,
        "opponent_name": opponent_name,
        "result": result,
        "format": None,  # TODO: extract from event data
        "turns": turns,
        "deck_cards": json.dumps(deck) if deck else None,
        "cards_played": json.dumps(list(set(cards_played))),
        "opponent_cards_seen": json.dumps(list(set(opponent_cards))),
        "raw_events": json.dumps(events[:50]),  # limit stored raw events
    }


# ── Store to database ─────────────────────────────────────────────────────────

def store_matches(conn: sqlite3.Connection, matches: list[dict]) -> int:
    """Store parsed matches in the database. Returns count of new matches."""
    stored = 0
    for match in matches:
        try:
            conn.execute("""
                INSERT OR IGNORE INTO arena_parsed_matches
                (match_id, player_name, opponent_name, result, format, turns,
                 deck_cards, cards_played, opponent_cards_seen, raw_events)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                match["match_id"],
                match["player_name"],
                match["opponent_name"],
                match["result"],
                match["format"],
                match["turns"],
                match["deck_cards"],
                match["cards_played"],
                match["opponent_cards_seen"],
                match["raw_events"],
            ))
            if conn.total_changes:
                stored += 1
        except sqlite3.IntegrityError:
            pass  # duplicate match_id
    conn.commit()
    return stored


# ── Sample log for testing ────────────────────────────────────────────────────

SAMPLE_LOG = """
[UnityCrossThreadLogger]==> Event.DeckSubmitV3(12345): {"CourseDeck":{"mainDeck":[{"cardId":67890,"quantity":4},{"cardId":67891,"quantity":3}]}}
[UnityCrossThreadLogger]{"matchId":"match-001-test","gameStateMessage":{"turnInfo":{"turnNumber":1}}}
[UnityCrossThreadLogger]==> MatchComplete(12346): {"matchComplete":{"result":"ResultType_Win"}}
[UnityCrossThreadLogger]{"matchId":"match-002-test","gameStateMessage":{"turnInfo":{"turnNumber":5}}}
[UnityCrossThreadLogger]==> MatchComplete(12347): {"matchComplete":{"result":"ResultType_Loss"}}
"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=== MTG Arena Log Parser ===\n")

    if "--sample" in sys.argv:
        log_text = SAMPLE_LOG
        print("Using sample log data for testing\n")
    elif len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        log_path = sys.argv[1]
        if not os.path.exists(log_path):
            print(f"Log file not found: {log_path}")
            sys.exit(1)
        print(f"Reading log: {log_path}")
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            log_text = f.read()
    else:
        log_path = get_default_log_path()
        if not os.path.exists(log_path):
            print(f"Arena log not found at default location: {log_path}")
            print("Specify the path: python scripts/arena_log_parser.py /path/to/Player.log")
            print("Or test with: python scripts/arena_log_parser.py --sample")
            sys.exit(1)
        print(f"Reading log: {log_path}")
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            log_text = f.read()

    print(f"Log size: {len(log_text) // 1024}KB")

    # Extract JSON blocks
    blocks = extract_json_blocks(log_text)
    print(f"Found {len(blocks)} JSON blocks")

    # Extract matches
    matches = extract_matches(blocks)
    print(f"Extracted {len(matches)} matches")

    if not matches:
        print("\nNo matches found in the log.")
        return

    # Print match summary
    wins = sum(1 for m in matches if m["result"] == "win")
    losses = sum(1 for m in matches if m["result"] == "loss")
    draws = sum(1 for m in matches if m["result"] == "draw")
    print(f"\nResults: {wins}W / {losses}L / {draws}D")

    # Store to database
    if not DB_PATH.exists():
        print(f"\nDatabase not found at {DB_PATH}")
        print("Run the app first to create the database.")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    ensure_table(conn)

    new_count = store_matches(conn, matches)
    total = conn.execute("SELECT COUNT(*) FROM arena_parsed_matches").fetchone()[0]
    print(f"\nStored {new_count} new matches ({total} total in DB)")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
