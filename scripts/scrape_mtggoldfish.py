#!/usr/bin/env python3
"""
Scrape MTGGoldfish metagame pages and tournament results.

Extracts archetype names, meta percentages, and full decklists from
the metagame overview pages. Also scrapes tournament result pages for
win-loss records and placement data.

Usage:
    py scripts/scrape_mtggoldfish.py --db data/mtg-deck-builder.db
    py scripts/scrape_mtggoldfish.py --db data/mtg-deck-builder.db --max-archetypes 5
    py scripts/scrape_mtggoldfish.py --db data/mtg-deck-builder.db --formats standard commander
    py scripts/scrape_mtggoldfish.py --db data/mtg-deck-builder.db --include-tournaments --max-tournaments 5
"""

import argparse
import os
import re
import sqlite3
import sys
import time
from datetime import datetime, timedelta
from urllib.parse import unquote

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("requests and beautifulsoup4 required: pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")

FORMATS = {
    "standard": "/metagame/standard#paper",
    "commander": "/metagame/commander#paper",
}

TOURNAMENT_PATHS = {
    "standard": "/tournaments/standard#paper",
}

BASE_URL = "https://www.mtggoldfish.com"
RATE_LIMIT_SEC = 2.5

HEADERS = {
    "User-Agent": "MTGDeckBuilder/1.0 (personal deck analysis tool)",
    "Accept": "text/html,application/xhtml+xml",
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
        existing.add(row[1])  # column name

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


def is_recently_scraped(conn: sqlite3.Connection, source_id: str, hours: int = 24) -> bool:
    """Check if this source_id was scraped within the last N hours."""
    row = conn.execute(
        "SELECT scraped_at FROM community_decks WHERE source = 'mtggoldfish' AND source_id = ?",
        (source_id,)
    ).fetchone()
    if not row:
        return False
    scraped_at = datetime.fromisoformat(row["scraped_at"])
    return datetime.now() - scraped_at < timedelta(hours=hours)


def fetch_page(url: str) -> str | None:
    """Fetch a page with rate limiting and error handling."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as e:
        print(f"  ERROR fetching {url}: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Metagame scraping (existing)
# ---------------------------------------------------------------------------

def parse_metagame_page(html: str, fmt: str) -> list[dict]:
    """Parse the metagame overview page for archetype entries."""
    soup = BeautifulSoup(html, "html.parser")
    archetypes = []

    archetype_links = soup.find_all("a", href=re.compile(r"/archetype/"))

    seen_hrefs = set()
    for link in archetype_links:
        href = link.get("href", "")
        if "#" in href:
            href = href.split("#")[0]
        if href in seen_hrefs:
            continue
        seen_hrefs.add(href)

        name = link.get_text(strip=True)
        if not name or len(name) < 2:
            continue

        meta_pct = None
        parent = link.parent
        if parent:
            text = parent.get_text()
            pct_match = re.search(r"(\d+\.?\d*)%", text)
            if pct_match:
                meta_pct = float(pct_match.group(1))

        archetypes.append({
            "name": name,
            "href": href,
            "meta_share": meta_pct,
        })

    unique = {}
    for a in archetypes:
        key = a["href"]
        if key not in unique:
            unique[key] = a
        elif a["meta_share"] is not None and unique[key]["meta_share"] is None:
            unique[key] = a

    return list(unique.values())


def parse_decklist_from_js(html: str) -> dict[str, list[tuple[int, str]]]:
    """Extract decklist from initializeDeckComponents() JS call."""
    result = {"main": [], "sideboard": []}

    match = re.search(r'initializeDeckComponents\([^,]+,\s*[^,]+,\s*"([^"]+)"', html)
    if not match:
        match = re.search(r"initializeDeckComponents\([^,]+,\s*[^,]+,\s*'([^']+)'", html)
    if not match:
        return result

    encoded = match.group(1)
    decoded = unquote(encoded)

    board = "main"
    for line in decoded.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.lower().startswith("sideboard"):
            board = "sideboard"
            continue

        card_match = re.match(r"^(\d+)\s+(.+)$", line)
        if card_match:
            qty = int(card_match.group(1))
            name = card_match.group(2).strip()
            if name and qty > 0:
                result[board].append((qty, name))

    return result


def parse_decklist_from_table(html: str) -> dict[str, list[tuple[int, str]]]:
    """Fallback: parse decklist from rendered HTML table structure."""
    result = {"main": [], "sideboard": []}
    soup = BeautifulSoup(html, "html.parser")

    for section in soup.find_all("div", class_=re.compile(r"deck-list")):
        board = "main"
        header = section.find(["h3", "h4", "div"], class_=re.compile(r"header|title"))
        if header and "sideboard" in header.get_text().lower():
            board = "sideboard"

        for row in section.find_all("tr"):
            qty_el = row.find("td", class_=re.compile(r"qty|quantity|deck-col-qty"))
            name_el = row.find("a")
            if qty_el and name_el:
                try:
                    qty = int(qty_el.get_text(strip=True))
                    name = name_el.get_text(strip=True)
                    if name and qty > 0:
                        result[board].append((qty, name))
                except ValueError:
                    continue

    return result


def scrape_archetype_deck(url: str) -> dict[str, list[tuple[int, str]]]:
    """Fetch an archetype page and extract its decklist."""
    html = fetch_page(url)
    if not html:
        return {"main": [], "sideboard": []}

    deck = parse_decklist_from_js(html)
    if deck["main"]:
        return deck

    deck = parse_decklist_from_table(html)
    return deck


def save_deck(conn: sqlite3.Connection, fmt: str, archetype: dict,
              deck: dict[str, list[tuple[int, str]]]) -> bool:
    """Save a community deck and its cards to the database."""
    source_id = archetype["href"].lstrip("/")

    try:
        cursor = conn.execute("""
            INSERT INTO community_decks (source, source_id, format, archetype, deck_name, meta_share, scraped_at)
            VALUES ('mtggoldfish', ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(source, source_id) DO UPDATE SET
                meta_share = excluded.meta_share,
                scraped_at = datetime('now')
        """, (source_id, fmt, archetype["name"], archetype["name"], archetype.get("meta_share")))

        row = conn.execute(
            "SELECT id FROM community_decks WHERE source = 'mtggoldfish' AND source_id = ?",
            (source_id,)
        ).fetchone()
        deck_id = row["id"]

        conn.execute("DELETE FROM community_deck_cards WHERE community_deck_id = ?", (deck_id,))

        card_count = 0
        for board, cards in deck.items():
            for qty, name in cards:
                conn.execute("""
                    INSERT INTO community_deck_cards (community_deck_id, card_name, quantity, board)
                    VALUES (?, ?, ?, ?)
                """, (deck_id, name, qty, board))
                card_count += qty

        conn.commit()
        return True

    except sqlite3.Error as e:
        print(f"  DB ERROR saving deck: {e}", file=sys.stderr)
        conn.rollback()
        return False


def scrape_format(conn: sqlite3.Connection, fmt: str, path: str,
                  max_archetypes: int = 50) -> dict:
    """Scrape all archetypes for a given format."""
    stats = {"archetypes_found": 0, "decks_saved": 0, "skipped": 0, "errors": 0}

    url = BASE_URL + path
    print(f"\nFetching metagame page: {url}")
    html = fetch_page(url)
    if not html:
        print("  Failed to fetch metagame page", file=sys.stderr)
        return stats

    archetypes = parse_metagame_page(html, fmt)
    stats["archetypes_found"] = len(archetypes)
    print(f"  Found {len(archetypes)} archetypes")

    for i, arch in enumerate(archetypes[:max_archetypes]):
        source_id = arch["href"].lstrip("/")

        if is_recently_scraped(conn, source_id, hours=24):
            print(f"  [{i+1}/{min(len(archetypes), max_archetypes)}] SKIP {arch['name']} (recent)")
            stats["skipped"] += 1
            continue

        print(f"  [{i+1}/{min(len(archetypes), max_archetypes)}] {arch['name']} "
              f"({arch.get('meta_share', '?')}% meta)")

        time.sleep(RATE_LIMIT_SEC)

        deck_url = BASE_URL + arch["href"]
        deck = scrape_archetype_deck(deck_url)

        if not deck["main"]:
            print(f"    No cards found")
            stats["errors"] += 1
            continue

        total_cards = sum(q for q, _ in deck["main"]) + sum(q for q, _ in deck.get("sideboard", []))
        print(f"    {len(deck['main'])} unique cards, {total_cards} total")

        if save_deck(conn, fmt, arch, deck):
            stats["decks_saved"] += 1
        else:
            stats["errors"] += 1

    return stats


# ---------------------------------------------------------------------------
# Tournament scraping (new)
# ---------------------------------------------------------------------------

def parse_record(text: str) -> dict:
    """
    Parse a W-L or W-L-D record string.

    Handles:
      "5-0"       -> {wins: 5, losses: 0, draws: 0}
      "15-2-1"    -> {wins: 15, losses: 2, draws: 1}
      "1st"       -> {placement: 1}
      "Top 8"     -> {placement: 8}
    """
    text = text.strip()

    # W-L-D format: "5-0", "15-2-1"
    wld = re.match(r"^(\d+)-(\d+)(?:-(\d+))?$", text)
    if wld:
        return {
            "wins": int(wld.group(1)),
            "losses": int(wld.group(2)),
            "draws": int(wld.group(3) or 0),
            "record": text,
        }

    # Placement: "1st", "2nd", "3rd", "4th", "Top 8"
    place = re.match(r"^(\d+)(?:st|nd|rd|th)$", text, re.IGNORECASE)
    if place:
        return {"placement": int(place.group(1))}

    top = re.match(r"^Top\s+(\d+)$", text, re.IGNORECASE)
    if top:
        return {"placement": int(top.group(1))}

    return {}


def classify_tournament(name: str, record: dict | None) -> str:
    """Classify tournament type from name and record info."""
    name_lower = name.lower()
    if "league" in name_lower:
        return "league"
    if "challenge 32" in name_lower or "challenge_32" in name_lower:
        return "challenge_32"
    if "challenge" in name_lower:
        return "challenge_64"
    if "premier" in name_lower or "showcase" in name_lower:
        return "premier"
    if "ptq" in name_lower or "pro tour" in name_lower or "regional" in name_lower:
        return "paper"
    # If we have W-L and total games <= 5, it's probably a league
    if record and "wins" in record:
        total = record["wins"] + record["losses"] + record.get("draws", 0)
        if total <= 5:
            return "league"
    return "league"


def parse_tournament_list(html: str) -> list[dict]:
    """Parse the /tournaments/<format> page for recent tournament links."""
    soup = BeautifulSoup(html, "html.parser")
    tournaments = []

    # Tournament links match /tournament/<slug>#paper or /tournament/<id>
    for link in soup.find_all("a", href=re.compile(r"/tournament/")):
        href = link.get("href", "")
        name = link.get_text(strip=True)
        if not name or len(name) < 3:
            continue

        # Strip anchor
        clean_href = href.split("#")[0]

        # Try to find date
        event_date = None
        parent = link.parent
        if parent:
            text = parent.get_text()
            date_match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
            if date_match:
                event_date = date_match.group(1)
            else:
                # Try MM/DD/YYYY
                date_match = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})", text)
                if date_match:
                    try:
                        for fmt in ("%m/%d/%Y", "%m/%d/%y"):
                            try:
                                event_date = datetime.strptime(date_match.group(1), fmt).strftime("%Y-%m-%d")
                                break
                            except ValueError:
                                continue
                    except Exception:
                        pass

        tournaments.append({
            "name": name,
            "href": clean_href,
            "date": event_date,
        })

    # Deduplicate by href
    seen = set()
    unique = []
    for t in tournaments:
        if t["href"] not in seen:
            seen.add(t["href"])
            unique.append(t)
    return unique


def parse_tournament_page(html: str) -> list[dict]:
    """
    Parse a tournament result page for deck entries with records.

    MTGGoldfish tournament pages have a results table with columns:
    Rank/Place, Player, Deck, Record/Points
    """
    soup = BeautifulSoup(html, "html.parser")
    entries = []

    # Look for the results table
    tables = soup.find_all("table")
    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        # Check headers for relevant columns
        header_row = rows[0]
        headers = [th.get_text(strip=True).lower() for th in header_row.find_all(["th", "td"])]
        if not headers:
            continue

        # We need at least a deck link column
        has_deck_col = any("deck" in h or "archetype" in h for h in headers)
        if not has_deck_col:
            # Check if the table has deck links anyway
            deck_links = table.find_all("a", href=re.compile(r"/archetype/|/deck/"))
            if not deck_links:
                continue

        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue

            row_text = row.get_text(" ", strip=True)

            # Find deck link
            deck_link = row.find("a", href=re.compile(r"/archetype/|/deck/"))
            if not deck_link:
                continue

            deck_href = deck_link.get("href", "")
            deck_name = deck_link.get_text(strip=True)
            if not deck_name or len(deck_name) < 2:
                continue

            # Find player name
            player_name = None
            player_link = row.find("a", href=re.compile(r"/player/"))
            if player_link:
                player_name = player_link.get_text(strip=True)

            # Find record or placement
            record_info = {}
            placement = None

            for cell in cells:
                cell_text = cell.get_text(strip=True)
                # Try parsing as record
                parsed = parse_record(cell_text)
                if parsed:
                    record_info.update(parsed)
                    if "placement" in parsed and placement is None:
                        placement = parsed["placement"]
                    continue

                # Check for standalone placement number
                place_match = re.match(r"^#?(\d{1,3})$", cell_text)
                if place_match:
                    val = int(place_match.group(1))
                    if 1 <= val <= 256 and placement is None:
                        placement = val

            # Infer placement from row position if not found
            if placement is None and "wins" not in record_info:
                # Row index as rough placement
                row_idx = rows.index(row)
                if 1 <= row_idx <= 256:
                    placement = row_idx

            entries.append({
                "deck_name": deck_name,
                "deck_href": deck_href.split("#")[0],
                "player_name": player_name,
                "placement": placement or record_info.get("placement"),
                "wins": record_info.get("wins"),
                "losses": record_info.get("losses"),
                "draws": record_info.get("draws", 0),
                "record": record_info.get("record"),
            })

    # Deduplicate by deck_href
    seen = set()
    unique = []
    for e in entries:
        if e["deck_href"] not in seen:
            seen.add(e["deck_href"])
            unique.append(e)
    return unique


def save_tournament_deck(conn: sqlite3.Connection, fmt: str, tournament: dict,
                         entry: dict, deck: dict[str, list[tuple[int, str]]]) -> bool:
    """Save a tournament deck with win-loss data."""
    source_id = f"tourney_{entry['deck_href'].lstrip('/')}"

    tournament_type = classify_tournament(tournament["name"], entry)

    try:
        conn.execute("""
            INSERT INTO community_decks
                (source, source_id, format, archetype, deck_name, placement,
                 wins, losses, draws, record, tournament_type, player_name,
                 event_name, event_date, scraped_at)
            VALUES ('mtggoldfish', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(source, source_id) DO UPDATE SET
                placement = excluded.placement,
                wins = excluded.wins,
                losses = excluded.losses,
                draws = excluded.draws,
                record = excluded.record,
                tournament_type = excluded.tournament_type,
                player_name = excluded.player_name,
                scraped_at = datetime('now')
        """, (source_id, fmt, entry["deck_name"], entry["deck_name"],
              entry.get("placement"), entry.get("wins"), entry.get("losses"),
              entry.get("draws"), entry.get("record"), tournament_type,
              entry.get("player_name"), tournament["name"], tournament.get("date")))

        row = conn.execute(
            "SELECT id FROM community_decks WHERE source = 'mtggoldfish' AND source_id = ?",
            (source_id,)
        ).fetchone()
        deck_id = row["id"]

        conn.execute("DELETE FROM community_deck_cards WHERE community_deck_id = ?", (deck_id,))

        for board, cards in deck.items():
            for qty, name in cards:
                conn.execute("""
                    INSERT INTO community_deck_cards (community_deck_id, card_name, quantity, board)
                    VALUES (?, ?, ?, ?)
                """, (deck_id, name, qty, board))

        conn.commit()
        return True

    except sqlite3.Error as e:
        print(f"  DB ERROR saving tournament deck: {e}", file=sys.stderr)
        conn.rollback()
        return False


def scrape_tournaments(conn: sqlite3.Connection, fmt: str, path: str,
                       max_tournaments: int = 10,
                       max_decks_per_tournament: int = 32) -> dict:
    """Scrape tournament result pages for a format."""
    stats = {"tournaments_found": 0, "decks_saved": 0, "skipped": 0, "errors": 0}

    url = BASE_URL + path
    print(f"\nFetching tournament list: {url}")
    html = fetch_page(url)
    if not html:
        print("  Failed to fetch tournament list page", file=sys.stderr)
        return stats

    tournaments = parse_tournament_list(html)
    stats["tournaments_found"] = len(tournaments)
    print(f"  Found {len(tournaments)} tournaments")

    for i, tournament in enumerate(tournaments[:max_tournaments]):
        source_check = f"tourney_{tournament['href'].lstrip('/')}"
        if is_recently_scraped(conn, source_check, hours=24):
            print(f"  [{i+1}/{min(len(tournaments), max_tournaments)}] SKIP {tournament['name']} (recent)")
            stats["skipped"] += 1
            continue

        print(f"  [{i+1}/{min(len(tournaments), max_tournaments)}] {tournament['name']} "
              f"({tournament.get('date', '?')})")

        time.sleep(RATE_LIMIT_SEC)

        tourney_url = BASE_URL + tournament["href"]
        tourney_html = fetch_page(tourney_url)
        if not tourney_html:
            stats["errors"] += 1
            continue

        entries = parse_tournament_page(tourney_html)
        print(f"    {len(entries)} deck entries found")

        decks_saved = 0
        for j, entry in enumerate(entries[:max_decks_per_tournament]):
            # Fetch the actual decklist from the archetype/deck page
            time.sleep(RATE_LIMIT_SEC)

            deck_url = BASE_URL + entry["deck_href"]
            deck = scrape_archetype_deck(deck_url)

            if not deck["main"]:
                print(f"    [{j+1}] {entry['deck_name']} — no cards parsed")
                stats["errors"] += 1
                continue

            total = sum(q for q, _ in deck["main"]) + sum(q for q, _ in deck.get("sideboard", []))
            record_str = entry.get("record", "")
            place_str = f"#{entry['placement']}" if entry.get("placement") else "?"
            print(f"    [{j+1}] {place_str} {entry['deck_name']} "
                  f"({record_str or '?'}) — {total} cards")

            if save_tournament_deck(conn, fmt, tournament, entry, deck):
                stats["decks_saved"] += 1
                decks_saved += 1
            else:
                stats["errors"] += 1

        print(f"    Saved {decks_saved} decks from this tournament")

    return stats


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Scrape MTGGoldfish metagame + tournament data")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--formats", nargs="+", default=list(FORMATS.keys()),
                        choices=list(FORMATS.keys()), help="Formats to scrape")
    parser.add_argument("--max-archetypes", type=int, default=50,
                        help="Max archetypes per format (default: 50)")
    parser.add_argument("--include-tournaments", action="store_true", default=True,
                        help="Scrape tournament results (default: True)")
    parser.add_argument("--no-tournaments", action="store_true",
                        help="Skip tournament scraping")
    parser.add_argument("--max-tournaments", type=int, default=10,
                        help="Max tournaments per format (default: 10)")
    parser.add_argument("--max-decks-per-tournament", type=int, default=32,
                        help="Max decks per tournament (default: 32)")
    args = parser.parse_args()

    if args.no_tournaments:
        args.include_tournaments = False

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_tables(conn)
    ensure_new_columns(conn)

    print("=" * 60)
    print("MTGGoldfish Metagame + Tournament Scraper")
    print(f"Database: {db_path}")
    print(f"Formats: {', '.join(args.formats)}")
    print(f"Max archetypes per format: {args.max_archetypes}")
    print(f"Tournament scraping: {'ON' if args.include_tournaments else 'OFF'}")
    if args.include_tournaments:
        print(f"Max tournaments per format: {args.max_tournaments}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    total_stats = {"archetypes_found": 0, "decks_saved": 0, "skipped": 0, "errors": 0,
                   "tournaments_found": 0, "tournament_decks_saved": 0}

    for fmt in args.formats:
        if fmt not in FORMATS:
            print(f"Unknown format: {fmt}", file=sys.stderr)
            continue

        # Metagame scraping
        stats = scrape_format(conn, fmt, FORMATS[fmt], args.max_archetypes)
        total_stats["archetypes_found"] += stats["archetypes_found"]
        total_stats["decks_saved"] += stats["decks_saved"]
        total_stats["skipped"] += stats["skipped"]
        total_stats["errors"] += stats["errors"]

        # Tournament scraping
        if args.include_tournaments and fmt in TOURNAMENT_PATHS:
            print(f"\n--- Tournament Results for {fmt.upper()} ---")
            t_stats = scrape_tournaments(conn, fmt, TOURNAMENT_PATHS[fmt],
                                         args.max_tournaments,
                                         args.max_decks_per_tournament)
            total_stats["tournaments_found"] += t_stats["tournaments_found"]
            total_stats["tournament_decks_saved"] += t_stats["decks_saved"]
            total_stats["skipped"] += t_stats["skipped"]
            total_stats["errors"] += t_stats["errors"]

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Archetypes found:        {total_stats['archetypes_found']}")
    print(f"  Metagame decks saved:    {total_stats['decks_saved']}")
    print(f"  Tournaments found:       {total_stats['tournaments_found']}")
    print(f"  Tournament decks saved:  {total_stats['tournament_decks_saved']}")
    print(f"  Skipped (recent):        {total_stats['skipped']}")
    print(f"  Errors:                  {total_stats['errors']}")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
