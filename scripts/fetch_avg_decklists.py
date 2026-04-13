#!/usr/bin/env python3
"""
Fetch EDHREC average decklists for commanders and store in SQLite.

Hardened version (Phase 2):
- httpx with retry/backoff (replaces requests)
- Canary check (Atraxa) before batch runs
- Minimum-cards guard: refuses to DELETE if new data has < 30 cards
- Staleness: skips commanders fetched within --stale-days (default 7)
- Jitter on rate-limit delay to avoid thundering herd
- Registered as pipeline step 'edhrec_avg'

Usage:
    py scripts/fetch_avg_decklists.py --db data/mtg-deck-builder.db
    py scripts/fetch_avg_decklists.py --db data/mtg-deck-builder.db --commanders "Atraxa, Praetors' Voice"
    py scripts/fetch_avg_decklists.py --db data/mtg-deck-builder.db --from-cf-stats --min-decks 20
"""

import argparse
import json
import os
import random
import re
import sqlite3
import sys
import time
from datetime import datetime, timedelta

try:
    import httpx
except ImportError:
    print("httpx not installed. Run: pip install httpx", file=sys.stderr)
    sys.exit(1)

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
DB_DEFAULT = os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")

EDHREC_JSON_BASE = "https://json.edhrec.com/pages/average-decks"
EDHREC_HTML_BASE = "https://edhrec.com/average-decks"

# Rate limit: 2s base + 0-1s jitter
RATE_LIMIT_BASE = 2.0
RATE_LIMIT_JITTER = 1.0

# Retry config
MAX_RETRIES = 3
RETRY_BACKOFF = [5, 15, 30]
REQUEST_TIMEOUT = 20.0

# Minimum cards to accept before replacing old data (Pitfall 4 guard)
MIN_CARDS_GUARD = 30

# Canary commander — must return data or something is wrong with EDHREC
CANARY_COMMANDER = "Atraxa, Praetors' Voice"
CANARY_MIN_CARDS = 50


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(conn: sqlite3.Connection):
    """Create edhrec_avg_decks with fetched_at for staleness tracking."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS edhrec_avg_decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commander_name TEXT NOT NULL,
            card_name TEXT NOT NULL,
            card_type TEXT,
            category_tag TEXT,
            fetched_at TEXT DEFAULT (datetime('now')),
            UNIQUE(commander_name, card_name)
        );
        CREATE INDEX IF NOT EXISTS idx_edhrec_avg_commander
            ON edhrec_avg_decks(commander_name);
    """)
    conn.commit()


def rate_limit_sleep():
    """Sleep with jitter to avoid thundering herd."""
    delay = RATE_LIMIT_BASE + random.uniform(0, RATE_LIMIT_JITTER)
    time.sleep(delay)


def commander_to_slug(name: str) -> str:
    """Convert commander name to EDHREC URL slug."""
    slug = name.lower()
    slug = re.sub(r"[',.]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    return slug


def fetch_with_retry(client: httpx.Client, url: str,
                     headers: dict | None = None) -> httpx.Response | None:
    """GET with retry and backoff. Returns None on permanent failure."""
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = client.get(url, headers=headers or {}, timeout=REQUEST_TIMEOUT)
            if resp.status_code == 404:
                return resp  # 404 is a valid "not found", not retryable
            if resp.status_code == 429:
                # Rate limited — back off harder
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)] * 2
                print(f"    Rate limited (429), waiting {wait}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                print(f"    Retry {attempt + 1}/{MAX_RETRIES} after {wait}s: {e}")
                time.sleep(wait)
    if last_error:
        print(f"    Failed after {MAX_RETRIES} attempts: {last_error}")
    return None


def fetch_average_decklist(client: httpx.Client, commander_name: str) -> dict | None:
    """Fetch average decklist from EDHREC. Tries JSON API first, falls back to HTML."""
    slug = commander_to_slug(commander_name)

    # Try JSON API first
    rate_limit_sleep()
    url = f"{EDHREC_JSON_BASE}/{slug}.json"
    resp = fetch_with_retry(client, url)
    if resp and resp.status_code == 200:
        try:
            data = resp.json()
            if data:
                return data
        except json.JSONDecodeError:
            pass

    # Fallback: HTML page with __NEXT_DATA__
    rate_limit_sleep()
    html_url = f"{EDHREC_HTML_BASE}/{slug}"
    resp = fetch_with_retry(client, html_url, headers={
        "Accept": "text/html",
    })
    if not resp:
        return None
    if resp.status_code == 404:
        return None
    if resp.status_code != 200:
        print(f"  [WARN] HTTP {resp.status_code} for {commander_name}")
        return None

    try:
        match = re.search(r'__NEXT_DATA__[^>]*>(.*?)</script>', resp.text)
        if not match:
            print(f"  [WARN] No __NEXT_DATA__ found for {commander_name}")
            return None

        next_data = json.loads(match.group(1))
        page_data = next_data.get("props", {}).get("pageProps", {}).get("data", {})
        container = page_data.get("container", {}).get("json_dict", {})
        cardlists = container.get("cardlists", [])

        if not cardlists:
            print(f"  [WARN] No cardlists in __NEXT_DATA__ for {commander_name}")
            return None

        return {"cardlists": cardlists}

    except (json.JSONDecodeError, KeyError) as e:
        print(f"  [WARN] Failed to parse __NEXT_DATA__ for {commander_name}: {e}")
        return None


def parse_cards(data: dict) -> list[dict]:
    """Parse EDHREC response into a flat card list. Handles multiple JSON layouts."""
    cards = []

    # Try "average" key first
    avg = data.get("average", {})
    if isinstance(avg, dict):
        for section_key in ["creatures", "instants", "sorceries", "artifacts",
                           "enchantments", "planeswalkers", "lands", "other"]:
            section = avg.get(section_key, [])
            if isinstance(section, list):
                for card in section:
                    if isinstance(card, dict):
                        cards.append({
                            "name": card.get("name", ""),
                            "card_type": section_key.rstrip("s"),
                            "category": card.get("tag", ""),
                        })
                    elif isinstance(card, str):
                        cards.append({
                            "name": card,
                            "card_type": section_key.rstrip("s"),
                            "category": "",
                        })

    # Try "cardlists" at top level or nested under container.json_dict
    if not cards:
        cardlists = data.get("cardlists", [])
        if not cardlists:
            container = data.get("container", {})
            if isinstance(container, dict):
                json_dict = container.get("json_dict", {})
                if isinstance(json_dict, dict):
                    cardlists = json_dict.get("cardlists", [])
        if isinstance(cardlists, list):
            for group in cardlists:
                if not isinstance(group, dict):
                    continue
                tag = group.get("tag", "")
                for card in group.get("cardviews", []):
                    if isinstance(card, dict):
                        name = card.get("name", "")
                        if not name and card.get("label"):
                            label_match = re.match(r"^\d+\s+(.+)$", card["label"])
                            name = label_match.group(1) if label_match else card["label"]
                        cards.append({
                            "name": name,
                            "card_type": card.get("type", tag.rstrip("s")),
                            "category": tag,
                        })

    # Try "deck" array (list of "1 Card Name" strings)
    if not cards:
        deck_lines = data.get("deck", [])
        if isinstance(deck_lines, list) and deck_lines:
            for line in deck_lines:
                if isinstance(line, str):
                    match = re.match(r"^(\d+)\s+(.+)$", line.strip())
                    if match:
                        cards.append({
                            "name": match.group(2),
                            "card_type": "",
                            "category": "",
                        })

    # Try flat "cards" list
    if not cards:
        flat = data.get("cards", [])
        if isinstance(flat, list):
            for card in flat:
                if isinstance(card, dict):
                    cards.append({
                        "name": card.get("name", ""),
                        "card_type": card.get("type", ""),
                        "category": card.get("tag", ""),
                    })

    return [c for c in cards if c["name"].strip()]


def store_decklist(conn: sqlite3.Connection, commander_name: str,
                   cards: list[dict]) -> int:
    """Store parsed cards into edhrec_avg_decks.

    Pitfall 4 guard: refuses to DELETE old data if new data has fewer
    than MIN_CARDS_GUARD cards (EDHREC structure change would silently
    empty the table otherwise).
    """
    if len(cards) < MIN_CARDS_GUARD:
        existing = conn.execute(
            "SELECT COUNT(*) FROM edhrec_avg_decks WHERE commander_name = ?",
            (commander_name,)
        ).fetchone()[0]
        if existing > 0:
            print(f"    GUARD: only {len(cards)} cards parsed (existing: {existing}). "
                  f"Keeping old data.")
            return 0
        # No existing data — allow storing even partial data
        if len(cards) == 0:
            return 0

    # Safe to replace
    conn.execute("DELETE FROM edhrec_avg_decks WHERE commander_name = ?",
                 (commander_name,))

    inserted = 0
    now = datetime.now().isoformat()
    for card in cards:
        name = card["name"].strip()
        if not name:
            continue
        conn.execute(
            """INSERT OR REPLACE INTO edhrec_avg_decks
               (commander_name, card_name, card_type, category_tag, fetched_at)
               VALUES (?, ?, ?, ?, ?)""",
            (commander_name, name, card["card_type"], card["category"], now)
        )
        inserted += 1

    conn.commit()
    return inserted


def is_stale(conn: sqlite3.Connection, commander_name: str,
             stale_days: int) -> bool:
    """Check if a commander's EDHREC data needs re-fetching."""
    row = conn.execute(
        "SELECT MAX(fetched_at) FROM edhrec_avg_decks WHERE commander_name = ?",
        (commander_name,)
    ).fetchone()
    if not row or not row[0]:
        return True  # No data = definitely stale
    try:
        last = datetime.fromisoformat(row[0])
        return datetime.now() - last > timedelta(days=stale_days)
    except (ValueError, TypeError):
        return True


def run_canary(client: httpx.Client, conn: sqlite3.Connection) -> bool:
    """Canary check: fetch Atraxa and verify we get enough cards.

    If EDHREC is down, has changed structure, or is blocking us,
    we'll catch it here before iterating 2000+ commanders.
    """
    print(f"  Canary check: {CANARY_COMMANDER}...")
    data = fetch_average_decklist(client, CANARY_COMMANDER)
    if not data:
        print(f"  CANARY FAILED: no data returned for {CANARY_COMMANDER}")
        return False

    cards = parse_cards(data)
    if len(cards) < CANARY_MIN_CARDS:
        print(f"  CANARY FAILED: only {len(cards)} cards (need {CANARY_MIN_CARDS}+)")
        return False

    # Store the canary data (don't waste the request)
    count = store_decklist(conn, CANARY_COMMANDER, cards)
    print(f"  Canary OK: {len(cards)} cards parsed, {count} stored")
    return True


def get_commanders_from_cf_stats(conn: sqlite3.Connection,
                                  min_decks: int) -> list[str]:
    """Get commander names from commander_card_stats (Phase 1 data)."""
    rows = conn.execute("""
        SELECT DISTINCT commander_name
        FROM commander_card_stats
        WHERE total_commander_decks >= ?
        ORDER BY total_commander_decks DESC
    """, (min_decks,)).fetchall()
    return [r[0] for r in rows]


def get_commanders_from_decks(conn: sqlite3.Connection) -> list[str]:
    """Get commander names from user's existing decks."""
    rows = conn.execute("""
        SELECT DISTINCT c.name FROM decks d
        JOIN cards c ON d.commander_id = c.id
        WHERE d.commander_id IS NOT NULL
    """).fetchall()
    return [r[0] for r in rows]


def main():
    parser = argparse.ArgumentParser(
        description="Fetch EDHREC average decklists (hardened)"
    )
    parser.add_argument("--db", type=str, default=DB_DEFAULT,
                        help="Path to SQLite database")
    parser.add_argument("--commanders", nargs="*",
                        help="Specific commander names to fetch")
    parser.add_argument("--from-decks", action="store_true",
                        help="Fetch for all commanders in user's decks")
    parser.add_argument("--from-cf-stats", action="store_true",
                        help="Fetch for all commanders in commander_card_stats")
    parser.add_argument("--min-decks", type=int, default=20,
                        help="Min deck count filter for --from-cf-stats (default: 20)")
    parser.add_argument("--stale-days", type=int, default=7,
                        help="Skip commanders fetched within N days (default: 7)")
    parser.add_argument("--no-canary", action="store_true",
                        help="Skip the canary check")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max commanders to process (0 = unlimited)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_tables(conn)

    # Determine commander list
    if args.commanders:
        commanders = args.commanders
    elif args.from_cf_stats:
        commanders = get_commanders_from_cf_stats(conn, args.min_decks)
    elif args.from_decks:
        commanders = get_commanders_from_decks(conn)
    else:
        # Default: use cf_stats if populated, else user decks
        commanders = get_commanders_from_cf_stats(conn, args.min_decks)
        if not commanders:
            commanders = get_commanders_from_decks(conn)

    if not commanders:
        print("No commanders found. Use --commanders, --from-decks, or --from-cf-stats.")
        sys.exit(0)

    print("=" * 60)
    print("EDHREC Average Decklist Fetch (hardened)")
    print(f"Database:    {db_path}")
    print(f"Commanders:  {len(commanders)}")
    print(f"Stale days:  {args.stale_days}")
    print(f"Started:     {datetime.now().isoformat()}")
    print("=" * 60)

    client = httpx.Client(
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        },
        follow_redirects=True,
    )

    try:
        # Canary check (unless explicitly skipped or single-commander mode)
        if not args.no_canary and not args.commanders and len(commanders) > 5:
            if not run_canary(client, conn):
                print("\nABORT: Canary check failed. EDHREC may be down or blocking.")
                sys.exit(1)

        total_cards = 0
        fetched = 0
        skipped_fresh = 0
        errors = 0

        if args.limit > 0:
            commanders = commanders[:args.limit]

        for i, cmd in enumerate(commanders):
            # Staleness check
            if not is_stale(conn, cmd, args.stale_days):
                skipped_fresh += 1
                if (i + 1) % 100 == 0:
                    print(f"  [{i + 1}/{len(commanders)}] {skipped_fresh} skipped (fresh)")
                continue

            print(f"  [{i + 1}/{len(commanders)}] {cmd}")
            data = fetch_average_decklist(client, cmd)
            if not data:
                errors += 1
                continue

            cards = parse_cards(data)
            count = store_decklist(conn, cmd, cards)
            if count > 0:
                total_cards += count
                fetched += 1
                print(f"    {count} cards stored")
            elif len(cards) > 0:
                print(f"    Guarded (kept existing data)")

    finally:
        client.close()
        conn.close()

    print(f"\n{'=' * 60}")
    print("Summary")
    print(f"  Fetched:       {fetched}")
    print(f"  Skipped fresh: {skipped_fresh}")
    print(f"  Errors:        {errors}")
    print(f"  Total cards:   {total_cards}")
    print(f"Finished: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
