#!/usr/bin/env python3
"""
Scrape official MTGO decklists (mtgo.com/decklists): daily League 5-0 lists
and Challenge/Prelim results, with per-player win/loss and final standings.

The page embeds a JSON blob (`window.MTGO.decklists.data = {...}`), so no HTML
parsing is needed and there is no Cloudflare challenge in front of it
(unlike MTGGoldfish deck pages, 2026-09-08).

Writes to the shared community_decks / community_deck_cards tables:
  source        = 'mtgo'
  source_id     = '<event site_name>:<player>'
  archetype     = colour-combination label ("Orzhov", "Mono-Red", "Jeskai"...)
                  derived from the list — MTGO does not label archetypes
  tournament_type = 'league' | 'challenge' | 'prelim' | 'other'
  wins/losses   = from the league record or the challenge winloss table
  placement     = final_rank (top 8) or standings rank for challenges

Usage:
    py scripts/scrape_mtgo.py --db data/mtg-deck-builder.db
    py scripts/scrape_mtgo.py --db ... --formats standard pioneer --max-events 40
    py scripts/scrape_mtgo.py --db ... --formats standard --months 2026-08 2026-07   # backfill
    py scripts/scrape_mtgo.py --db ... --workers 4
"""
import argparse
import json
import os
import re
import sqlite3
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

try:
    import requests
except ImportError:
    print("requests required: pip install requests", file=sys.stderr)
    sys.exit(1)

DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")
BASE_URL = "https://www.mtgo.com"
SOURCE = "mtgo"
FORMATS = ["standard", "pioneer", "modern", "legacy", "vintage", "pauper"]
RATE_LIMIT_SEC = 1.0
MAX_RETRIES = 3
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 TheBlackGrimoire/1.0",
    "Accept": "text/html,application/xhtml+xml",
}
DATA_RE = re.compile(r"window\.MTGO\.decklists\.data\s*=\s*(\{.*)", re.S)
EVENT_LINK_RE = re.compile(r'href="(/decklist/([a-z0-9-]+))"')
SLUG_DATE_RE = re.compile(r"-(\d{4}-\d{2}-\d{2})")

COLOR_MAP = {"COLOR_WHITE": "W", "COLOR_BLUE": "U", "COLOR_BLACK": "B", "COLOR_RED": "R", "COLOR_GREEN": "G"}
GUILDS = {
    "": "Colorless", "W": "Mono-White", "U": "Mono-Blue", "B": "Mono-Black", "R": "Mono-Red", "G": "Mono-Green",
    "WU": "Azorius", "UB": "Dimir", "BR": "Rakdos", "RG": "Gruul", "WG": "Selesnya",
    "WB": "Orzhov", "UR": "Izzet", "BG": "Golgari", "WR": "Boros", "UG": "Simic",
    "WUB": "Esper", "UBR": "Grixis", "BRG": "Jund", "WRG": "Naya", "WUG": "Bant",
    "WBG": "Abzan", "WUR": "Jeskai", "UBG": "Sultai", "WBR": "Mardu", "URG": "Temur",
    "WUBR": "Four-Color (no G)", "WUBG": "Four-Color (no R)", "WURG": "Four-Color (no B)",
    "WBRG": "Four-Color (no U)", "UBRG": "Four-Color (no W)", "WUBRG": "Five-Color",
}
WUBRG = "WUBRG"


def get_conn(db_path: str) -> sqlite3.Connection:
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(db_path, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(conn: sqlite3.Connection) -> None:
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
    existing = {row[1] for row in conn.execute("PRAGMA table_info(community_decks)")}
    for col, dtype in {"wins": "INTEGER", "losses": "INTEGER", "draws": "INTEGER", "record": "TEXT",
                       "tournament_type": "TEXT", "player_name": "TEXT"}.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE community_decks ADD COLUMN {col} {dtype}")
    conn.commit()


# ── HTTP ────────────────────────────────────────────────────────────────────

def fetch(url: str) -> str | None:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 200:
                return resp.text
            if resp.status_code == 404:
                return None
            print(f"  HTTP {resp.status_code} for {url} (attempt {attempt})", file=sys.stderr)
        except requests.RequestException as exc:
            print(f"  request error for {url}: {exc} (attempt {attempt})", file=sys.stderr)
        time.sleep(RATE_LIMIT_SEC * (2 ** attempt))
    return None


def extract_data(html: str) -> dict | None:
    """Pull the balanced JSON object that follows `window.MTGO.decklists.data =`."""
    match = DATA_RE.search(html)
    if not match:
        return None
    text = match.group(1)
    depth = 0
    in_str = False
    escape = False
    for i, ch in enumerate(text):
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[: i + 1])
                except json.JSONDecodeError as exc:
                    print(f"  JSON decode failed: {exc}", file=sys.stderr)
                    return None
    return None


# ── Listing ─────────────────────────────────────────────────────────────────

def list_events(fmt: str, month: str | None = None) -> list[dict]:
    """Event slugs for a format; `month` = 'YYYY-MM' for the archive."""
    if month:
        year, mon = month.split("-")
        url = f"{BASE_URL}/decklists/{fmt}?year={year}&month={int(mon)}"
    else:
        url = f"{BASE_URL}/decklists/{fmt}"
    html = fetch(url)
    if not html:
        return []
    seen: set[str] = set()
    events = []
    for _href, slug in EVENT_LINK_RE.findall(html):
        if not slug.startswith(f"{fmt}-") or slug in seen:
            continue
        seen.add(slug)
        date_match = SLUG_DATE_RE.search(slug)
        events.append({"slug": slug, "date": date_match.group(1) if date_match else None})
    return events


def classify_event(slug: str, data: dict) -> str:
    name = (data.get("description") or data.get("name") or slug).lower()
    if "league" in name:
        return "league"
    if "challenge" in name:
        return "challenge"
    if "prelim" in name:
        return "prelim"
    if "showcase" in name or "qualifier" in name:
        return "showcase"
    return "other"


# ── Deck parsing ────────────────────────────────────────────────────────────

def cards_of(entries: list[dict]) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    for e in entries or []:
        attrs = e.get("card_attributes") or {}
        name = (attrs.get("card_name") or "").strip()
        try:
            qty = int(e.get("qty") or 0)
        except ValueError:
            qty = 0
        if name and qty > 0:
            out.append((qty, name))
    return out


def color_label(entries: list[dict]) -> str:
    """Guild/shard name from the non-land cards' colours (basic-land colours ignored)."""
    seen: set[str] = set()
    for e in entries or []:
        attrs = e.get("card_attributes") or {}
        if "LAND" in (attrs.get("card_type") or "").upper():
            continue
        for c in attrs.get("colors") or []:
            letter = COLOR_MAP.get(c)
            if letter:
                seen.add(letter)
    key = "".join(c for c in WUBRG if c in seen)
    return GUILDS.get(key, key or "Colorless")


def parse_event(slug: str, data: dict) -> list[dict]:
    event_type = classify_event(slug, data)
    event_name = data.get("description") or data.get("name") or slug
    date = (data.get("publish_date") or (data.get("starttime") or "")[:10] or None)
    if not date:
        m = SLUG_DATE_RE.search(slug)
        date = m.group(1) if m else None

    winloss = {str(r.get("loginid")): r for r in (data.get("winloss") or [])}
    final_rank = {str(r.get("loginid")): r for r in (data.get("final_rank") or [])}
    standings = {str(r.get("loginid")): r for r in (data.get("standings") or [])}

    decks = []
    for d in data.get("decklists") or []:
        player = (d.get("player") or "").strip()
        login = str(d.get("loginid") or "")
        main = cards_of(d.get("main_deck"))
        side = cards_of(d.get("sideboard_deck"))
        if not main or not player:
            continue
        wins = losses = None
        rec = d.get("wins") if isinstance(d.get("wins"), dict) else winloss.get(login)
        if rec:
            try:
                wins, losses = int(rec.get("wins")), int(rec.get("losses"))
            except (TypeError, ValueError):
                wins = losses = None
        placement = None
        rank_row = final_rank.get(login) or standings.get(login)
        if rank_row:
            try:
                placement = int(rank_row.get("rank"))
            except (TypeError, ValueError):
                placement = None
        decks.append({
            "source_id": f"{slug}:{player}",
            "archetype": color_label(d.get("main_deck")),
            "deck_name": f"{player} — {event_name}",
            "player": player,
            "event_name": event_name,
            "event_date": date,
            "tournament_type": event_type,
            "placement": placement,
            "wins": wins,
            "losses": losses,
            "record": f"{wins}-{losses}" if wins is not None else None,
            "main": main,
            "side": side,
        })
    return decks


# ── Persistence ─────────────────────────────────────────────────────────────

def event_already_saved(conn: sqlite3.Connection, slug: str) -> bool:
    row = conn.execute(
        "SELECT COUNT(*) FROM community_decks WHERE source = ? AND source_id LIKE ?",
        (SOURCE, f"{slug}:%"),
    ).fetchone()
    return bool(row and row[0] > 0)


def save_decks(conn: sqlite3.Connection, fmt: str, decks: list[dict]) -> int:
    saved = 0
    for d in decks:
        existing = conn.execute(
            "SELECT id FROM community_decks WHERE source = ? AND source_id = ?", (SOURCE, d["source_id"])
        ).fetchone()
        if existing:
            continue
        cur = conn.execute(
            """INSERT INTO community_decks
               (source, source_id, format, archetype, deck_name, placement, event_name, event_date,
                wins, losses, record, tournament_type, player_name, scraped_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
            (SOURCE, d["source_id"], fmt, d["archetype"], d["deck_name"], d["placement"], d["event_name"],
             d["event_date"], d["wins"], d["losses"], d["record"], d["tournament_type"], d["player"]),
        )
        deck_id = cur.lastrowid
        conn.executemany(
            "INSERT INTO community_deck_cards (community_deck_id, card_name, quantity, board) VALUES (?, ?, ?, ?)",
            [(deck_id, name, qty, "main") for qty, name in d["main"]]
            + [(deck_id, name, qty, "sideboard") for qty, name in d["side"]],
        )
        saved += 1
    conn.commit()
    return saved


# ── Orchestration ───────────────────────────────────────────────────────────

def fetch_event(slug: str) -> tuple[str, dict | None]:
    html = fetch(f"{BASE_URL}/decklist/{slug}")
    time.sleep(RATE_LIMIT_SEC)
    return slug, (extract_data(html) if html else None)


def scrape_format(conn: sqlite3.Connection, fmt: str, months: list[str], max_events: int, workers: int) -> dict:
    stats = {"events_found": 0, "events_fetched": 0, "decks_saved": 0, "skipped": 0, "errors": 0}
    events: list[dict] = []
    for month in ([None] + months):
        events.extend(list_events(fmt, month))
        time.sleep(RATE_LIMIT_SEC)
    seen: set[str] = set()
    todo = []
    for e in events:
        if e["slug"] in seen:
            continue
        seen.add(e["slug"])
        if event_already_saved(conn, e["slug"]):
            stats["skipped"] += 1
            continue
        todo.append(e["slug"])
    stats["events_found"] = len(seen)
    todo = todo[:max_events]
    print(f"[{fmt}] {len(seen)} events listed, {stats['skipped']} already saved, fetching {len(todo)} with {workers} worker(s)")

    # ponytail: a small pool is polite to mtgo.com and keeps one cycle under a
    # few minutes; the DB writes stay on the main thread.
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        for slug, data in pool.map(fetch_event, todo):
            if not data:
                stats["errors"] += 1
                print(f"  ! no data for {slug}", file=sys.stderr)
                continue
            stats["events_fetched"] += 1
            decks = parse_event(slug, data)
            n = save_decks(conn, fmt, decks)
            stats["decks_saved"] += n
            print(f"  {slug}: {len(decks)} decks parsed, {n} saved")
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape mtgo.com decklists into community_decks")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--formats", nargs="+", default=["standard"], choices=FORMATS)
    parser.add_argument("--months", nargs="*", default=[], help="Archive months to backfill, e.g. 2026-08 2026-07")
    parser.add_argument("--max-events", type=int, default=40, help="Max new events to fetch per format per run")
    parser.add_argument("--workers", type=int, default=3, help="Parallel event fetches (be polite: 2–4)")
    args = parser.parse_args()

    conn = get_conn(args.db)
    ensure_tables(conn)
    started = datetime.now()
    print(f"Started: {started.isoformat()}")
    totals = {"events_found": 0, "events_fetched": 0, "decks_saved": 0, "skipped": 0, "errors": 0}
    for fmt in args.formats:
        stats = scrape_format(conn, fmt, args.months, args.max_events, args.workers)
        for k in totals:
            totals[k] += stats[k]
    print("\n" + "=" * 60)
    print("Summary")
    for k, v in totals.items():
        print(f"  {k:<16} {v}")
    print(f"Finished: {datetime.now().isoformat()} ({(datetime.now() - started).total_seconds():.0f}s)")
    conn.close()
    sys.exit(1 if totals["events_fetched"] == 0 and totals["skipped"] == 0 else 0)


if __name__ == "__main__":
    main()
