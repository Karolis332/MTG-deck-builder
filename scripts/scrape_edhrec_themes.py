#!/usr/bin/env python3
"""
Scrape EDHREC average decklists for ALL commanders + ALL theme variants.

Each commander page lists ~11 theme sub-pages (budget, cedh, tribes, etc.),
each with a unique average decklist. 3000+ commanders x ~11 themes = ~33K decklists.

Stores into community_decks/community_deck_cards for the ML pipeline.

Usage:
    python scrape_edhrec_themes.py --db data/mtg-deck-builder.db
    python scrape_edhrec_themes.py --db data/mtg-deck-builder.db --max-commanders 500
    python scrape_edhrec_themes.py --db data/mtg-deck-builder.db --themes-only
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("requests required: pip install requests", file=sys.stderr)
    sys.exit(1)

EDHREC_BASE = "https://edhrec.com"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
RATE_LIMIT = 2.5  # seconds between requests

COLOR_GROUPS = [
    "mono-white", "mono-blue", "mono-black", "mono-red", "mono-green",
    "azorius", "dimir", "rakdos", "gruul", "selesnya",
    "orzhov", "izzet", "simic", "boros", "golgari",
    "esper", "grixis", "jund", "naya", "bant",
    "abzan", "jeskai", "sultai", "mardu", "temur",
    "five-color", "colorless",
]

DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")


def get_conn(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def extract_next_data(html):
    match = re.search(r"__NEXT_DATA__[^>]*>(.*?)</script>", html)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def fetch_page(session, url):
    time.sleep(RATE_LIMIT)
    try:
        resp = session.get(url, timeout=20)
        if resp.status_code == 200:
            return extract_next_data(resp.text), resp.text
        return None, None
    except requests.RequestException as e:
        print(f"    [ERR] {url}: {e}")
        return None, None


def get_commanders_from_group(session, group):
    """Fetch commander list from a color group page."""
    url = f"{EDHREC_BASE}/commanders/{group}"
    data, _ = fetch_page(session, url)
    if not data:
        return []

    page_data = data.get("props", {}).get("pageProps", {}).get("data", {})
    container = page_data.get("container", {}).get("json_dict", {})
    cardlists = container.get("cardlists", [])

    commanders = []
    for section in cardlists:
        if isinstance(section, dict):
            for card in section.get("cardviews", []):
                name = card.get("name", "")
                slug = card.get("sanitized", "") or card.get("sanitized_wo", "")
                num_decks = card.get("num_decks", 0)
                ci = card.get("color_identity", [])
                if name and slug:
                    commanders.append({
                        "name": name,
                        "slug": slug,
                        "num_decks": num_decks,
                        "color_identity": "".join(sorted(ci)) if isinstance(ci, list) else str(ci),
                    })
    return commanders


def get_themes_for_commander(session, slug):
    """Get theme sub-pages for a commander."""
    url = f"{EDHREC_BASE}/commanders/{slug}"
    _, html = fetch_page(session, url)
    if not html:
        return []

    pattern = '"/commanders/' + re.escape(slug) + '/([^"]+)"'
    themes = sorted(set(re.findall(pattern, html)))
    # Filter out non-theme pages
    skip = {"themes", "tribes", "new", "top-cards", "combos", "salt"}
    return [t for t in themes if t not in skip]


def get_average_deck(session, slug, theme=None):
    """Fetch average decklist cards from EDHREC."""
    if theme:
        url = f"{EDHREC_BASE}/average-decks/{slug}/{theme}"
    else:
        url = f"{EDHREC_BASE}/average-decks/{slug}"

    data, _ = fetch_page(session, url)
    if not data:
        return []

    page_data = data.get("props", {}).get("pageProps", {}).get("data", {})
    container = page_data.get("container", {}).get("json_dict", {})
    cardlists = container.get("cardlists", [])

    cards = []
    for section in cardlists:
        if not isinstance(section, dict):
            continue
        header = section.get("header", "").lower()
        if header in ("maybeboard", "tokens"):
            continue
        for card in section.get("cardviews", []):
            name = card.get("name", "")
            qty = card.get("quantity", 1) or 1
            if not name and card.get("label"):
                m = re.match(r"^\d+\s+(.+)$", card["label"])
                name = m.group(1) if m else card["label"]
            if name:
                cards.append((name, qty))
    return cards


def save_deck(conn, source_id, commander, color_identity, deck_name, cards):
    """Save a deck to community_decks + community_deck_cards. Returns True if new."""
    # Check if already exists
    existing = conn.execute(
        "SELECT id FROM community_decks WHERE source = 'edhrec' AND source_id = ?",
        (source_id,),
    ).fetchone()
    if existing:
        return False

    conn.execute(
        """INSERT OR IGNORE INTO community_decks
           (source, source_id, format, archetype, deck_name, scraped_at)
           VALUES ('edhrec', ?, 'commander', ?, ?, datetime('now'))""",
        (source_id, commander, deck_name),
    )
    deck_row = conn.execute(
        "SELECT id FROM community_decks WHERE source = 'edhrec' AND source_id = ?",
        (source_id,),
    ).fetchone()
    if not deck_row:
        return False

    deck_id = deck_row[0]
    for card_name, qty in cards:
        conn.execute(
            """INSERT OR IGNORE INTO community_deck_cards
               (community_deck_id, card_name, quantity, board)
               VALUES (?, ?, ?, 'main')""",
            (deck_id, card_name, qty),
        )
    conn.commit()
    return True


def main():
    parser = argparse.ArgumentParser(description="Scrape EDHREC theme average decklists")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--max-commanders", type=int, default=0,
                        help="Max commanders to process (0 = all)")
    parser.add_argument("--themes-only", action="store_true",
                        help="Only scrape theme variants, skip base avg decks")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"DB not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    session = requests.Session()
    session.headers.update({"User-Agent": UA, "Accept": "text/html"})

    print("=" * 60)
    print("EDHREC Theme Average Decklist Scraper")
    print(f"Database: {db_path}")
    print(f"Started:  {datetime.now().isoformat()}")
    print("=" * 60)

    # Step 1: Collect all commanders from color groups
    all_commanders = []
    seen = set()
    for group in COLOR_GROUPS:
        print(f"  Fetching {group} commanders...")
        cmds = get_commanders_from_group(session, group)
        for c in cmds:
            if c["slug"] not in seen:
                seen.add(c["slug"])
                all_commanders.append(c)
        print(f"    -> {len(cmds)} found, {len(all_commanders)} unique total")

    # Sort by popularity
    all_commanders.sort(key=lambda x: x.get("num_decks", 0), reverse=True)

    if args.max_commanders > 0:
        all_commanders = all_commanders[:args.max_commanders]

    print(f"\nProcessing {len(all_commanders)} commanders...")

    total_new = 0
    total_themes = 0
    errors = 0

    for i, cmd in enumerate(all_commanders):
        name = cmd["name"]
        slug = cmd["slug"]
        ci = cmd["color_identity"]

        # Base average deck (skip if themes-only)
        if not args.themes_only:
            cards = get_average_deck(session, slug)
            if cards:
                sid = f"avg-{slug}"
                if save_deck(conn, sid, name, ci, f"Average {name} Deck", cards):
                    total_new += 1

        # Get themes
        themes = get_themes_for_commander(session, slug)
        total_themes += len(themes)

        for theme in themes:
            cards = get_average_deck(session, slug, theme)
            if cards:
                sid = f"avg-{slug}-{theme}"
                deck_name = f"Average {name} ({theme.replace('-', ' ').title()})"
                if save_deck(conn, sid, name, ci, deck_name, cards):
                    total_new += 1

        if (i + 1) % 10 == 0:
            print(f"  [{i+1}/{len(all_commanders)}] {name}: {len(themes)} themes | "
                  f"Total new: {total_new}, themes checked: {total_themes}")

    # Summary
    edhrec_total = conn.execute(
        "SELECT COUNT(*) FROM community_decks WHERE source = 'edhrec'"
    ).fetchone()[0]

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Commanders processed: {len(all_commanders)}")
    print(f"  Theme variants found: {total_themes}")
    print(f"  New decks saved:      {total_new}")
    print(f"  Total EDHREC decks:   {edhrec_total}")
    print(f"  Errors:               {errors}")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
