#!/usr/bin/env python3
"""
Parse MTG Arena Player.log for match data.

Reads the MTGA Player.log file (Windows/Mac default locations) and
extracts match events: deck submissions, match results, card plays.

Writes parsed matches to: data/mtg-deck-builder.db (arena_parsed_matches table)

Usage:
  python scripts/arena_log_parser.py                  # Parse default log location
  python scripts/arena_log_parser.py /path/to/Player.log  # Parse specific log file
  python scripts/arena_log_parser.py --all            # Parse both current + prev log
  python scripts/arena_log_parser.py --sample         # Parse sample log for testing
"""

import json
import os
import re
import sqlite3
import sys
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
        home = os.path.expanduser("~")
        wine_prefix = os.path.join(home, ".wine", "drive_c", "users",
                                   os.getenv("USER", "user"), "AppData",
                                   "LocalLow", "Wizards Of The Coast",
                                   "MTGA", "Player.log")
        return wine_prefix


def get_prev_log_path(current_path: str) -> str | None:
    """Get the Player-prev.log path alongside the current log."""
    directory = os.path.dirname(current_path)
    prev_path = os.path.join(directory, "Player-prev.log")
    return prev_path if os.path.exists(prev_path) else None


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

def collect_json(start: str, lines: list[str], next_idx: int) -> str:
    """Collect a potentially multi-line JSON string until braces balance."""
    result = start
    depth = result.count('{') - result.count('}')
    depth += result.count('[') - result.count(']')

    idx = next_idx
    while depth > 0 and idx < len(lines):
        line = lines[idx]
        result += '\n' + line
        depth += line.count('{') - line.count('}')
        depth += line.count('[') - line.count(']')
        idx += 1
        if idx - next_idx > 500:  # safety limit
            break

    return result


def extract_json_blocks(log_text: str) -> list[tuple[str, dict]]:
    """
    Extract tagged JSON blocks from the Arena log.

    Current Arena log format (2025-2026):
      - ==> MethodName {"id":"...","request":"{escaped json}"} on a single line
      - <== MethodName(id)  followed by JSON on the NEXT line
      - [UnityCrossThreadLogger]timestamp: Match to CLIENT: EventType
        followed by JSON on the NEXT line starting with {
      - Standalone JSON lines starting with { (most match data)
    """
    blocks = []
    lines = log_text.split('\n')

    # Pattern: ==> MethodName {json}
    arrow_out_pattern = re.compile(
        r'\[UnityCrossThreadLogger\]==> (\w+)\s+(\{.*)'
    )

    # Pattern: [UnityCrossThreadLogger]timestamp: Match to CLIENT: EventType
    match_event_pattern = re.compile(
        r'\[UnityCrossThreadLogger\][\d/: APM]+:\s+Match to \S+:\s+(\w+)'
    )

    # Pattern: <== MethodName(id)
    arrow_in_pattern = re.compile(
        r'<== (\w+)\('
    )

    i = 0
    while i < len(lines):
        line = lines[i]

        # 1. ==> outgoing method calls (deck submissions, event joins)
        m = arrow_out_pattern.search(line)
        if m:
            method = m.group(1)
            json_str = collect_json(m.group(2), lines, i + 1)
            try:
                data = json.loads(json_str)
                # The 'request' field often contains escaped JSON
                if "request" in data and isinstance(data["request"], str):
                    try:
                        data["_parsed_request"] = json.loads(data["request"])
                    except json.JSONDecodeError:
                        pass
                blocks.append((method, data))
            except json.JSONDecodeError:
                pass
            i += 1
            continue

        # 2. Match event lines — JSON follows on the next line
        m = match_event_pattern.search(line)
        if m:
            event_type = m.group(1)
            # Look for JSON on the next line
            if i + 1 < len(lines) and lines[i + 1].strip().startswith('{'):
                json_str = collect_json(lines[i + 1].strip(), lines, i + 2)
                try:
                    data = json.loads(json_str)
                    blocks.append((event_type, data))
                except json.JSONDecodeError:
                    pass
            i += 1
            continue

        # 3. <== response lines — JSON follows on the next line
        m = arrow_in_pattern.search(line)
        if m and not line.strip().startswith('[UnityCrossThreadLogger]==>'):
            method = m.group(1)
            if i + 1 < len(lines) and lines[i + 1].strip().startswith('{'):
                json_str = collect_json(lines[i + 1].strip(), lines, i + 2)
                try:
                    data = json.loads(json_str)
                    blocks.append((method, data))
                except json.JSONDecodeError:
                    pass
            i += 1
            continue

        # 4. Standalone JSON on [UnityCrossThreadLogger] lines
        if line.startswith('[UnityCrossThreadLogger]'):
            after = line[len('[UnityCrossThreadLogger]'):]
            if after.strip().startswith('{'):
                json_str = collect_json(after.strip(), lines, i + 1)
                try:
                    data = json.loads(json_str)
                    blocks.append(("standalone", data))
                except json.JSONDecodeError:
                    pass
                i += 1
                continue

        # 5. Bare JSON lines (most match event data comes this way)
        stripped = line.strip()
        if stripped.startswith('{') and len(stripped) > 10:
            json_str = collect_json(stripped, lines, i + 1)
            try:
                data = json.loads(json_str)
                # Tag with preceding log line for context
                label = lines[i - 1].strip() if i > 0 else ""
                tag = "standalone"
                if "greToClientEvent" in data:
                    tag = "GreToClientEvent"
                elif "matchGameRoomStateChangedEvent" in data:
                    tag = "MatchGameRoomStateChangedEvent"
                elif "authenticateResponse" in data:
                    tag = "AuthenticateResponse"
                blocks.append((tag, data))
            except json.JSONDecodeError:
                pass

        i += 1

    return blocks


# ── Match event extraction ────────────────────────────────────────────────────

def extract_matches(blocks: list[tuple[str, dict]]) -> list[dict]:
    """Extract match data from the parsed JSON blocks."""
    matches = []
    current_deck = None
    current_match_id = None
    current_events = []
    player_name = None
    player_team_id = None
    opponent_name = None
    event_format = None

    for method, data in blocks:
        # Detect player name from authentication
        auth = data.get("authenticateResponse", {})
        if auth.get("screenName"):
            player_name = auth["screenName"]

        # Deck submission via EventSetDeckV2 ==> line
        if method == "EventSetDeckV2":
            req = data.get("_parsed_request", {})
            deck_data = req.get("Deck", {})
            main_deck = deck_data.get("MainDeck", deck_data.get("mainDeck", []))
            current_deck = []
            for card_entry in main_deck:
                if isinstance(card_entry, dict):
                    card_id = card_entry.get("cardId", card_entry.get("Id", ""))
                    qty = card_entry.get("quantity", card_entry.get("Quantity", 1))
                    current_deck.append({"id": str(card_id), "qty": qty})
                elif isinstance(card_entry, int):
                    current_deck.append({"id": str(card_entry), "qty": 1})
            # Also capture commander
            cmd_zone = deck_data.get("CommandZone", deck_data.get("commandZone", []))
            for card_entry in cmd_zone:
                if isinstance(card_entry, dict):
                    card_id = card_entry.get("cardId", "")
                    current_deck.append({"id": str(card_id), "qty": 1, "zone": "commander"})
            # Capture format from event name
            event_name = req.get("EventName", "")
            if event_name:
                event_format = event_name

        # EventJoin — also has format info
        if method == "EventJoin":
            req = data.get("_parsed_request", {})
            event_name = req.get("EventName", "")
            if event_name:
                event_format = event_name

        # Match room state changes — start and end of matches
        mgr = data.get("matchGameRoomStateChangedEvent", {})
        if mgr:
            gri = mgr.get("gameRoomInfo", {})
            grc = gri.get("gameRoomConfig", {})
            reserved = grc.get("reservedPlayers", [])

            # Extract player/opponent from reservedPlayers
            if reserved:
                match_id_from_config = grc.get("matchId", "")
                if match_id_from_config and match_id_from_config != current_match_id:
                    # Save previous match
                    if current_match_id and current_events:
                        match = build_match(
                            current_match_id, current_events, current_deck,
                            player_name, opponent_name, player_team_id, event_format
                        )
                        if match:
                            matches.append(match)
                    current_match_id = match_id_from_config
                    current_events = []
                    opponent_name = None
                    player_team_id = None

                for p in reserved:
                    p_name = p.get("playerName", "")
                    p_team = p.get("teamId")
                    p_event = p.get("eventId", "")
                    if p_name == player_name:
                        player_team_id = p_team
                    else:
                        opponent_name = p_name
                    if p_event and not event_format:
                        event_format = p_event

            # Check for final match result
            fmr = gri.get("finalMatchResult")
            if fmr and current_match_id:
                current_events.append({"_finalMatchResult": fmr})

        # Collect GRE events (game state, cards, turns)
        gte = data.get("greToClientEvent", {})
        if gte:
            msgs = gte.get("greToClientMessages", [])
            current_events.extend(msgs)

        # Match ID from log line: "Connecting to matchId XXX"
        if method == "standalone" and "matchId" in str(data)[:100]:
            mid = data.get("matchId")
            if mid and mid != current_match_id:
                if current_match_id and current_events:
                    match = build_match(
                        current_match_id, current_events, current_deck,
                        player_name, opponent_name, player_team_id, event_format
                    )
                    if match:
                        matches.append(match)
                current_match_id = mid
                current_events = []

    # Handle last match
    if current_match_id and current_events:
        match = build_match(
            current_match_id, current_events, current_deck,
            player_name, opponent_name, player_team_id, event_format
        )
        if match:
            matches.append(match)

    return matches


def build_match(
    match_id: str,
    events: list,
    deck: list | None,
    player_name: str | None,
    opponent_name: str | None,
    player_team_id: int | None,
    event_format: str | None,
) -> dict | None:
    """Build a structured match record from events."""
    result = None
    turns = 0
    cards_played = set()
    opponent_cards = set()

    for event in events:
        # Extract result from finalMatchResult
        fmr = event.get("_finalMatchResult")
        if fmr:
            result_list = fmr.get("resultList", [])
            for r in result_list:
                if r.get("scope") == "MatchScope_Match":
                    winning_team = r.get("winningTeamId")
                    result_type = r.get("result", "")
                    if result_type == "ResultType_Draw":
                        result = "draw"
                    elif winning_team is not None and player_team_id is not None:
                        result = "win" if winning_team == player_team_id else "loss"
                    elif "WinLoss" in result_type or "Win" in result_type:
                        # Fallback: if we don't know team, check if player won
                        result = "loss"  # conservative default
                    break

        # Extract turn count from GameStateMessages
        if event.get("type") == "GREMessageType_GameStateMessage":
            gsm = event.get("gameStateMessage", {})
            t = gsm.get("turnInfo", {}).get("turnNumber", 0)
            if t > turns:
                turns = t

            # Extract cards from game objects
            for go in gsm.get("gameObjects", []):
                grp_id = go.get("grpId")
                if not grp_id or grp_id <= 0:
                    continue
                owner_seat = go.get("ownerSeatId")
                if owner_seat == 1:
                    cards_played.add(str(grp_id))
                elif owner_seat == 2:
                    opponent_cards.add(str(grp_id))

    if not result:
        return None

    # Normalize format name
    display_format = _normalize_format(event_format) if event_format else None

    return {
        "match_id": match_id,
        "player_name": player_name,
        "opponent_name": opponent_name,
        "result": result,
        "format": display_format,
        "turns": turns,
        "deck_cards": json.dumps(deck) if deck else None,
        "cards_played": json.dumps(list(cards_played)),
        "opponent_cards_seen": json.dumps(list(opponent_cards)),
        "raw_events": None,  # skip raw events to save space
    }


def _normalize_format(event_id: str) -> str:
    """Convert Arena event IDs to readable format names."""
    event_lower = event_id.lower()
    if "brawl" in event_lower and "historic" in event_lower:
        return "Historic Brawl"
    elif "brawl" in event_lower and "standard" in event_lower:
        return "Standard Brawl"
    elif "brawl" in event_lower:
        return "Brawl"
    elif "ladder" in event_lower or "play_constructed" in event_lower:
        return "Standard"
    elif "historic" in event_lower:
        return "Historic"
    elif "explorer" in event_lower:
        return "Explorer"
    elif "timeless" in event_lower:
        return "Timeless"
    elif "draft" in event_lower:
        return "Draft"
    elif "sealed" in event_lower:
        return "Sealed"
    elif "alchemy" in event_lower:
        return "Alchemy"
    return event_id


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
            pass
    conn.commit()
    return stored


# ── Sample log for testing ────────────────────────────────────────────────────

SAMPLE_LOG = """\
[UnityCrossThreadLogger]2/3/2026 5:04:27 PM: Match to TESTCLIENT: AuthenticateResponse
{ "transactionId": "test-auth", "requestId": 1, "timestamp": "123", "authenticateResponse": { "clientId": "TESTCLIENT", "screenName": "TestPlayer", "sessionId": "sess-1" } }
[UnityCrossThreadLogger]==> EventSetDeckV2 {"id":"deck-req-1","request":"{\\"EventName\\":\\"Play_Brawl_Historic\\",\\"Deck\\":{\\"MainDeck\\":[{\\"cardId\\":67890,\\"quantity\\":4},{\\"cardId\\":67891,\\"quantity\\":3}],\\"CommandZone\\":[{\\"cardId\\":12345,\\"quantity\\":1}],\\"Sideboard\\":[],\\"Companions\\":[]}}"}
[UnityCrossThreadLogger]2/3/2026 5:04:28 PM: Match to TESTCLIENT: MatchGameRoomStateChangedEvent
{ "transactionId": "t1", "requestId": 2, "timestamp": "124", "matchGameRoomStateChangedEvent": { "gameRoomInfo": { "gameRoomConfig": { "matchId": "match-001-test", "reservedPlayers": [ { "playerName": "TestPlayer", "systemSeatId": 1, "teamId": 1, "userId": "TESTCLIENT", "eventId": "Play_Brawl_Historic" }, { "playerName": "Opponent1", "systemSeatId": 2, "teamId": 2, "userId": "OPP1", "eventId": "Play_Brawl_Historic" } ] } } } }
[UnityCrossThreadLogger]2/3/2026 5:04:30 PM: Match to TESTCLIENT: GreToClientEvent
{ "transactionId": "t2", "requestId": 3, "timestamp": "125", "greToClientEvent": { "greToClientMessages": [ { "type": "GREMessageType_GameStateMessage", "gameStateMessage": { "turnInfo": { "turnNumber": 7 }, "gameObjects": [ { "grpId": 67890, "ownerSeatId": 1 }, { "grpId": 99999, "ownerSeatId": 2 } ] } } ] } }
[UnityCrossThreadLogger]2/3/2026 5:11:35 PM: Match to TESTCLIENT: MatchGameRoomStateChangedEvent
{ "transactionId": "t3", "requestId": 4, "timestamp": "126", "matchGameRoomStateChangedEvent": { "gameRoomInfo": { "gameRoomConfig": { "matchId": "match-001-test", "reservedPlayers": [ { "playerName": "TestPlayer", "systemSeatId": 1, "teamId": 1, "userId": "TESTCLIENT", "eventId": "Play_Brawl_Historic" }, { "playerName": "Opponent1", "systemSeatId": 2, "teamId": 2, "userId": "OPP1", "eventId": "Play_Brawl_Historic" } ] }, "finalMatchResult": { "matchId": "match-001-test", "matchCompletedReason": "MatchCompletedReasonType_Success", "resultList": [ { "scope": "MatchScope_Game", "result": "ResultType_WinLoss", "winningTeamId": 1, "reason": "ResultReason_Game" }, { "scope": "MatchScope_Match", "result": "ResultType_WinLoss", "winningTeamId": 1, "reason": "ResultReason_Game" } ] } } } }
[UnityCrossThreadLogger]2/3/2026 5:15:00 PM: Match to TESTCLIENT: MatchGameRoomStateChangedEvent
{ "transactionId": "t4", "requestId": 5, "timestamp": "200", "matchGameRoomStateChangedEvent": { "gameRoomInfo": { "gameRoomConfig": { "matchId": "match-002-test", "reservedPlayers": [ { "playerName": "TestPlayer", "systemSeatId": 1, "teamId": 1, "userId": "TESTCLIENT", "eventId": "Ladder" }, { "playerName": "Opponent2", "systemSeatId": 2, "teamId": 2, "userId": "OPP2", "eventId": "Ladder" } ] } } } }
[UnityCrossThreadLogger]2/3/2026 5:20:00 PM: Match to TESTCLIENT: GreToClientEvent
{ "transactionId": "t5", "requestId": 6, "timestamp": "201", "greToClientEvent": { "greToClientMessages": [ { "type": "GREMessageType_GameStateMessage", "gameStateMessage": { "turnInfo": { "turnNumber": 12 }, "gameObjects": [] } } ] } }
[UnityCrossThreadLogger]2/3/2026 5:25:00 PM: Match to TESTCLIENT: MatchGameRoomStateChangedEvent
{ "transactionId": "t6", "requestId": 7, "timestamp": "202", "matchGameRoomStateChangedEvent": { "gameRoomInfo": { "gameRoomConfig": { "matchId": "match-002-test", "reservedPlayers": [ { "playerName": "TestPlayer", "systemSeatId": 1, "teamId": 1, "userId": "TESTCLIENT", "eventId": "Ladder" }, { "playerName": "Opponent2", "systemSeatId": 2, "teamId": 2, "userId": "OPP2", "eventId": "Ladder" } ] }, "finalMatchResult": { "matchId": "match-002-test", "matchCompletedReason": "MatchCompletedReasonType_Success", "resultList": [ { "scope": "MatchScope_Game", "result": "ResultType_WinLoss", "winningTeamId": 2, "reason": "ResultReason_Game" }, { "scope": "MatchScope_Match", "result": "ResultType_WinLoss", "winningTeamId": 2, "reason": "ResultReason_Game" } ] } } } }
"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=== MTG Arena Log Parser ===\n")

    log_texts = []

    if "--sample" in sys.argv:
        log_texts.append(("sample", SAMPLE_LOG))
        print("Using sample log data for testing\n")
    elif len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        log_path = sys.argv[1]
        if not os.path.exists(log_path):
            print(f"Log file not found: {log_path}")
            sys.exit(1)
        print(f"Reading log: {log_path}")
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            log_texts.append((log_path, f.read()))
    else:
        log_path = get_default_log_path()
        if not os.path.exists(log_path):
            print(f"Arena log not found at default location: {log_path}")
            print("Specify the path: python scripts/arena_log_parser.py /path/to/Player.log")
            print("Or test with: python scripts/arena_log_parser.py --sample")
            sys.exit(1)
        print(f"Reading log: {log_path}")
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            log_texts.append((log_path, f.read()))

        # Also parse prev log if --all
        if "--all" in sys.argv:
            prev_path = get_prev_log_path(log_path)
            if prev_path:
                print(f"Reading prev log: {prev_path}")
                with open(prev_path, "r", encoding="utf-8", errors="ignore") as f:
                    log_texts.append((prev_path, f.read()))

    all_matches = []

    for source, log_text in log_texts:
        print(f"\n--- Parsing: {source} ({len(log_text) // 1024}KB) ---")

        blocks = extract_json_blocks(log_text)
        print(f"  Found {len(blocks)} JSON blocks")

        matches = extract_matches(blocks)
        print(f"  Extracted {len(matches)} matches")

        for m in matches:
            print(f"    {m['result']:>4s}  vs {m['opponent_name'] or '?':20s}  "
                  f"format={m['format'] or '?':20s}  turns={m['turns']}")

        all_matches.extend(matches)

    if not all_matches:
        print("\nNo matches found in any log.")
        return

    wins = sum(1 for m in all_matches if m["result"] == "win")
    losses = sum(1 for m in all_matches if m["result"] == "loss")
    draws = sum(1 for m in all_matches if m["result"] == "draw")
    print(f"\nTotal: {len(all_matches)} matches — {wins}W / {losses}L / {draws}D")

    # Store to database
    if "--sample" not in sys.argv:
        if not DB_PATH.exists():
            print(f"\nDatabase not found at {DB_PATH}")
            print("Run the app first to create the database.")
            sys.exit(1)

        conn = sqlite3.connect(str(DB_PATH), timeout=10)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        ensure_table(conn)

        new_count = store_matches(conn, all_matches)
        total = conn.execute("SELECT COUNT(*) FROM arena_parsed_matches").fetchone()[0]
        print(f"\nStored {new_count} new matches ({total} total in DB)")

        conn.close()

    print("\nDone!")


if __name__ == "__main__":
    main()
