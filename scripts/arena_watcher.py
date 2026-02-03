#!/usr/bin/env python3
"""
Continuously watch the MTG Arena Player.log for new match data.

Tails the log file and parses new content as it arrives,
storing matches in the database in real-time.

Usage:
  python scripts/arena_watcher.py                     # Watch default log location
  python scripts/arena_watcher.py /path/to/Player.log  # Watch specific file
  python scripts/arena_watcher.py --poll-interval 0.5   # Custom poll interval (seconds)
"""

import os
import sys
import time
from pathlib import Path

# Add scripts dir to path for imports
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from arena_log_parser import (
    extract_json_blocks,
    extract_matches,
    store_matches,
    ensure_table,
    get_default_log_path,
    DB_PATH,
)
import sqlite3


def tail_file(path: str, poll_interval: float = 0.5):
    """
    Generator that yields new content appended to a file.
    Handles log rotation (file truncation/replacement).
    """
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            # Seek to end
            f.seek(0, 2)
            last_pos = f.tell()
            last_inode = os.stat(path).st_ino

            print(f"Watching {path} (position: {last_pos})")
            print("Waiting for new match data...\n")

            while True:
                # Check if file was rotated/replaced
                try:
                    current_inode = os.stat(path).st_ino
                    if current_inode != last_inode:
                        print("Log file rotated, reopening...")
                        f.close()
                        return  # Caller should reopen
                except FileNotFoundError:
                    time.sleep(poll_interval)
                    continue

                # Check if file was truncated
                current_size = os.path.getsize(path)
                if current_size < last_pos:
                    print("Log file truncated, resetting position...")
                    f.seek(0)
                    last_pos = 0

                # Read new content
                f.seek(last_pos)
                new_content = f.read()
                last_pos = f.tell()

                if new_content:
                    yield new_content

                time.sleep(poll_interval)

    except KeyboardInterrupt:
        raise
    except Exception as e:
        print(f"Error reading file: {e}")


def process_new_content(conn: sqlite3.Connection, content: str, buffer: list) -> int:
    """Process new log content and extract any completed matches."""
    buffer.append(content)

    # Periodically try to parse the accumulated buffer
    full_text = "".join(buffer)

    blocks = extract_json_blocks(full_text)
    if not blocks:
        return 0

    matches = extract_matches(blocks)
    if not matches:
        return 0

    new_count = store_matches(conn, matches)

    if new_count > 0:
        # Clear buffer since we successfully parsed
        buffer.clear()
        for match in matches:
            status = "WIN" if match["result"] == "win" else "LOSS" if match["result"] == "loss" else "DRAW"
            turns = match.get("turns", "?")
            print(f"  [{status}] Match {match['match_id'][:16]}... ({turns} turns)")

    return new_count


def main():
    print("=== MTG Arena Log Watcher ===\n")

    # Parse arguments
    log_path = None
    poll_interval = 0.5

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--poll-interval" and i + 1 < len(args):
            poll_interval = float(args[i + 1])
            i += 2
        elif not args[i].startswith("--"):
            log_path = args[i]
            i += 1
        else:
            i += 1

    if not log_path:
        log_path = get_default_log_path()

    if not os.path.exists(log_path):
        print(f"Arena log not found: {log_path}")
        print("Specify the path: python scripts/arena_watcher.py /path/to/Player.log")
        sys.exit(1)

    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("Run the app first to create the database.")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    ensure_table(conn)

    total_matches = 0
    buffer = []

    print(f"Poll interval: {poll_interval}s")
    print("Press Ctrl+C to stop\n")

    try:
        while True:
            for content in tail_file(log_path, poll_interval):
                new = process_new_content(conn, content, buffer)
                total_matches += new
                if new > 0:
                    total = conn.execute(
                        "SELECT COUNT(*) FROM arena_parsed_matches"
                    ).fetchone()[0]
                    print(f"  Total matches in DB: {total}\n")
    except KeyboardInterrupt:
        print(f"\n\nStopped. Processed {total_matches} new matches this session.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
