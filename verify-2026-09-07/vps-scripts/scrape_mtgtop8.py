#!/usr/bin/env python3
"""
Scrape MTGTop8 tournament events and decklists.

Extracts tournament results with placement info and full decklists
for Standard and Commander formats.

Usage:
    py scripts/scrape_mtgtop8.py --db data/mtg-deck-builder.db
    py scripts/scrape_mtgtop8.py --db data/mtg-deck-builder.db --max-events 3
    py scripts/scrape_mtgtop8.py --db data/mtg-deck-builder.db --formats standard
"""

import argparse
import os
import re
import sqlite3
import sys
import time
from datetime import datetime, timedelta

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("requests and beautifulsoup4 required: pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")

FORMATS = {
    "standard": "ST",
    "commander": "cEDH",
}

BASE_URL = "https://www.mtgtop8.com"
RATE_LIMIT_SEC = 1.0

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(conn: sqlite3.Connection):
    """Create tables if they don't exist (for standalone usage)."""
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
    conn.commit()


def ensure_new_columns(conn: sqlite3.Connection):
    """Add v18 columns if they don't exist yet (backward compat)."""
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


def is_event_recent(conn: sqlite3.Connection, event_id: str, days: int = 7) -> bool:
    """Check if any decks from this event were scraped within N days."""
    row = conn.execute("""
        SELECT MAX(scraped_at) as last_scraped
        FROM community_decks
        WHERE source = 'mtgtop8' AND event_name LIKE ?
    """, (f"%e={event_id}%",)).fetchone()
    if not row or not row["last_scraped"]:
        return False
    last = datetime.fromisoformat(row["last_scraped"])
    return datetime.now() - last < timedelta(days=days)


def fetch_page(url: str) -> str | None:
    """Fetch a page with rate limiting and error handling."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as e:
        print(f"  ERROR fetching {url}: {e}", file=sys.stderr)
        return None


def parse_event_list(html: str, fmt_code: str) -> list[dict]:
    """Parse the format page for recent tournament events."""
    soup = BeautifulSoup(html, "html.parser")
    events = []

    for link in soup.find_all("a", href=re.compile(r"event\?e=\d+")):
        href = link.get("href", "")
        event_match = re.search(r"e=(\d+)", href)
        if not event_match:
            continue

        event_id = event_match.group(1)
        event_name = link.get_text(strip=True)
        if not event_name or len(event_name) < 3:
            continue

        event_date = None
        parent = link.parent
        if parent:
            text = parent.get_text()
            date_match = re.search(r"(\d{2}/\d{2}/\d{2})", text)
            if date_match:
                try:
                    event_date = datetime.strptime(date_match.group(1), "%m/%d/%y").strftime("%Y-%m-%d")
                except ValueError:
                    pass

        events.append({
            "event_id": event_id,
            "name": event_name,
            "date": event_date,
            "fmt_code": fmt_code,
        })

    seen = set()
    unique = []
    for e in events:
        if e["event_id"] not in seen:
            seen.add(e["event_id"])
            unique.append(e)
    return unique


def parse_event_decks(html: str, event_id: str, fmt_code: str) -> list[dict]:
    """
    Parse an event page for individual deck entries with placement.

    Improved approach: scan the page structure sequentially. MTGTop8 event
    pages list decks in placement order. We track placement from headers/markers
    and assign them to subsequent deck entries.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Strategy: find ALL elements in document order, tracking placement markers
    # as we encounter them before deck links.
    #
    # MTGTop8 uses several patterns for placement:
    # 1. "1st" / "2nd" / "3rd" / "4th" etc. in text nodes
    # 2. Numbered headers or table cells
    # 3. Simply ordering decks by appearance (1st deck = 1st place)

    # First: collect all deck links with their d= IDs
    deck_links = soup.find_all("a", href=re.compile(rf"\??e={event_id}&d=\d+"))

    deck_link_map: dict[str, list] = {}
    for link in deck_links:
        href = link.get("href", "")
        if "switch" in href or "mtgo" in href.lower() or "dec?" in href.lower():
            continue
        deck_match = re.search(r"d=(\d+)", href)
        if not deck_match:
            continue
        deck_id = deck_match.group(1)
        deck_link_map.setdefault(deck_id, []).append(link)

    # Build a list of all deck IDs in document order
    ordered_deck_ids = []
    seen_ids = set()
    for link in deck_links:
        href = link.get("href", "")
        if "switch" in href or "mtgo" in href.lower() or "dec?" in href.lower():
            continue
        deck_match = re.search(r"d=(\d+)", href)
        if not deck_match:
            continue
        did = deck_match.group(1)
        if did not in seen_ids:
            seen_ids.add(did)
            ordered_deck_ids.append(did)

    # Try to extract placements from the page text
    # Look for placement indicators near each deck
    page_text = str(soup)
    deck_placements: dict[str, int | None] = {}

    for deck_id in ordered_deck_ids:
        links = deck_link_map.get(deck_id, [])
        placement = None

        for link in links:
            # Search in parent and grandparent for placement text
            for ancestor in [link.parent, link.parent.parent if link.parent else None]:
                if not ancestor:
                    continue

                # Get all text content in this ancestor
                ancestor_text = ancestor.get_text(" ", strip=True)

                # Pattern 1: ordinal placements "1st", "2nd", "3rd", "4th-8th"
                ordinal_match = re.search(r"(\d+)(?:st|nd|rd|th)", ancestor_text)
                if ordinal_match:
                    val = int(ordinal_match.group(1))
                    if 1 <= val <= 256:
                        placement = val
                        break

                # Pattern 2: standalone number in a small text context (e.g., table cell)
                # Only match if the text is short (likely a placement cell)
                cells = ancestor.find_all("td")
                for cell in cells:
                    cell_text = cell.get_text(strip=True)
                    if re.match(r"^\d{1,3}$", cell_text):
                        val = int(cell_text)
                        if 1 <= val <= 256:
                            placement = val
                            break
                if placement:
                    break

            if placement:
                break

        deck_placements[deck_id] = placement

    # If no placements found, assign by document order (common for mtgtop8)
    any_placement = any(v is not None for v in deck_placements.values())
    if not any_placement:
        for i, deck_id in enumerate(ordered_deck_ids):
            deck_placements[deck_id] = i + 1

    # Build final deck entries
    decks = []
    for deck_id in ordered_deck_ids:
        links = deck_link_map.get(deck_id, [])

        deck_name = None
        for link in links:
            text = link.get_text(strip=True)
            if text and len(text) >= 2 and text != "?":
                deck_name = text
                break
        if not deck_name:
            deck_name = f"Deck {deck_id}"

        # Find player name
        player = None
        for link in links:
            parent = link.parent
            for ancestor in [parent, parent.parent if parent else None]:
                if not ancestor:
                    continue
                player_link = ancestor.find("a", href=re.compile(r"search\?player="))
                if player_link:
                    player = player_link.get_text(strip=True)
                    break
            if player:
                break

        decks.append({
            "deck_id": deck_id,
            "deck_name": deck_name,
            "placement": deck_placements.get(deck_id),
            "player": player,
            "url": f"{BASE_URL}/event?e={event_id}&d={deck_id}&f={fmt_code}",
        })

    # Sort by placement (None last)
    decks.sort(key=lambda d: (d["placement"] or 999))
    return decks


def parse_decklist(html: str) -> dict[str, list[tuple[int, str]]]:
    """
    Parse a deck page for card list using deck_line class elements.

    MTGTop8 uses <div class="deck_line"> with id prefix "md" (main deck)
    or "sb" (sideboard). Each div contains "N <span>Card Name</span>".
    """
    result = {"main": [], "sideboard": []}
    soup = BeautifulSoup(html, "html.parser")

    for el in soup.find_all(class_="deck_line"):
        el_id = el.get("id", "")

        if el_id.startswith("sb"):
            board = "sideboard"
        else:
            board = "main"

        span = el.find("span")
        if span:
            name = span.get_text(strip=True)
        else:
            name = None

        text = el.get_text(strip=True)
        qty_match = re.match(r"^(\d+)", text)
        qty = int(qty_match.group(1)) if qty_match else 1

        if name and len(name) >= 2 and qty > 0:
            result[board].append((qty, name))

    # Fallback: text-based parsing
    if not result["main"]:
        full_text = soup.get_text("\n")
        board = "main"
        for line in full_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            if "SIDEBOARD" in line.upper():
                board = "sideboard"
                continue
            if re.match(r"^\d+\s+[A-Z]{4,}(\s+and\s+[A-Z]+\.?)?$", line):
                continue
            card_match = re.match(r"^(\d+)\s+([A-Z][a-zA-Z][\w\s,'\-/]+)$", line)
            if card_match:
                qty = int(card_match.group(1))
                name = card_match.group(2).strip()
                if len(name) >= 2 and 0 < qty <= 99:
                    result[board].append((qty, name))

    return result


def save_deck(conn: sqlite3.Connection, fmt: str, event: dict,
              deck_info: dict, cards: dict[str, list[tuple[int, str]]]) -> bool:
    """Save a tournament deck and its cards to the database."""
    source_id = f"e{event['event_id']}_d{deck_info['deck_id']}"

    try:
        conn.execute("""
            INSERT INTO community_decks
                (source, source_id, format, archetype, deck_name, placement,
                 player_name, event_name, event_date, scraped_at)
            VALUES ('mtgtop8', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(source, source_id) DO UPDATE SET
                placement = excluded.placement,
                player_name = excluded.player_name,
                scraped_at = datetime('now')
        """, (source_id, fmt, deck_info["deck_name"], deck_info["deck_name"],
              deck_info.get("placement"), deck_info.get("player"),
              event["name"], event.get("date")))

        row = conn.execute(
            "SELECT id FROM community_decks WHERE source = 'mtgtop8' AND source_id = ?",
            (source_id,)
        ).fetchone()
        deck_id = row["id"]

        conn.execute("DELETE FROM community_deck_cards WHERE community_deck_id = ?", (deck_id,))

        card_count = 0
        for board, card_list in cards.items():
            for qty, name in card_list:
                conn.execute("""
                    INSERT INTO community_deck_cards (community_deck_id, card_name, quantity, board)
                    VALUES (?, ?, ?, ?)
                """, (deck_id, name, qty, board))
                card_count += qty

        conn.commit()
        return True

    except sqlite3.Error as e:
        print(f"  DB ERROR: {e}", file=sys.stderr)
        conn.rollback()
        return False


def scrape_format(conn: sqlite3.Connection, fmt: str, fmt_code: str,
                  max_events: int = 20, max_decks_per_event: int = 16) -> dict:
    """Scrape tournament events for a format."""
    stats = {"events_found": 0, "decks_saved": 0, "skipped": 0, "errors": 0}

    url = f"{BASE_URL}/format?f={fmt_code}"
    print(f"\nFetching format page: {url}")
    html = fetch_page(url)
    if not html:
        print("  Failed to fetch format page", file=sys.stderr)
        return stats

    events = parse_event_list(html, fmt_code)
    stats["events_found"] = len(events)
    print(f"  Found {len(events)} events")

    for i, event in enumerate(events[:max_events]):
        if is_event_recent(conn, event["event_id"], days=7):
            print(f"  [{i+1}/{min(len(events), max_events)}] SKIP {event['name']} (recent)")
            stats["skipped"] += 1
            continue

        print(f"  [{i+1}/{min(len(events), max_events)}] {event['name']} ({event.get('date', '?')})")

        time.sleep(RATE_LIMIT_SEC)

        event_url = f"{BASE_URL}/event?e={event['event_id']}&f={fmt_code}"
        event_html = fetch_page(event_url)
        if not event_html:
            stats["errors"] += 1
            continue

        decks = parse_event_decks(event_html, event["event_id"], fmt_code)
        print(f"    {len(decks)} decks listed")

        for j, deck_info in enumerate(decks[:max_decks_per_event]):
            time.sleep(RATE_LIMIT_SEC)

            deck_html = fetch_page(deck_info["url"])
            if not deck_html:
                stats["errors"] += 1
                continue

            cards = parse_decklist(deck_html)
            if not cards["main"]:
                print(f"    [{j+1}] {deck_info['deck_name']} — no cards parsed")
                stats["errors"] += 1
                continue

            total = sum(q for q, _ in cards["main"]) + sum(q for q, _ in cards.get("sideboard", []))
            print(f"    [{j+1}] #{deck_info.get('placement', '?')} "
                  f"{deck_info['deck_name']} — {total} cards")

            if save_deck(conn, fmt, event, deck_info, cards):
                stats["decks_saved"] += 1
            else:
                stats["errors"] += 1

    return stats


def main():
    parser = argparse.ArgumentParser(description="Scrape MTGTop8 tournament data")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--formats", nargs="+", default=list(FORMATS.keys()),
                        choices=list(FORMATS.keys()), help="Formats to scrape")
    parser.add_argument("--max-events", type=int, default=20,
                        help="Max events per format (default: 20)")
    parser.add_argument("--max-decks-per-event", type=int, default=16,
                        help="Max decks per event (default: 16)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_tables(conn)
    ensure_new_columns(conn)

    print("=" * 60)
    print("MTGTop8 Tournament Scraper")
    print(f"Database: {db_path}")
    print(f"Formats: {', '.join(args.formats)}")
    print(f"Max events per format: {args.max_events}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    total_stats = {"events_found": 0, "decks_saved": 0, "skipped": 0, "errors": 0}

    for fmt in args.formats:
        if fmt not in FORMATS:
            print(f"Unknown format: {fmt}", file=sys.stderr)
            continue

        stats = scrape_format(conn, fmt, FORMATS[fmt], args.max_events, args.max_decks_per_event)
        for k in total_stats:
            total_stats[k] += stats[k]

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Events found:     {total_stats['events_found']}")
    print(f"  Decks saved:      {total_stats['decks_saved']}")
    print(f"  Skipped (recent): {total_stats['skipped']}")
    print(f"  Errors:           {total_stats['errors']}")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
