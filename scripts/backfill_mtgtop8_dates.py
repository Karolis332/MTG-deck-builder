#!/usr/bin/env python3
"""
Backfill event_date for mtgtop8 community_decks rows scraped while the
date parser was broken (fixed 2026-09-11, see scrape_mtgtop8.py).

Each undated row's source_id encodes the event id (e.g. "e79819_d806655"
-> event 79819). This script fetches each distinct undated event page ONCE
per format, parses the date shown as "<N> players - DD/MM/YY" on the event
page, and updates every deck of that event in one transaction.

Run with `python -u` (or rely on the flush=True prints below) so progress
is visible under nohup.

Usage:
    py -3.13 scripts/backfill_mtgtop8_dates.py --db data/mtg-deck-builder.db
    py -3.13 scripts/backfill_mtgtop8_dates.py --db data/mtg-deck-builder.db --formats standard --limit 3 --dry-run
"""

import argparse
import re
import sqlite3
import sys
import time
from datetime import datetime

sys.path.insert(0, __import__("os").path.dirname(__file__))
# scrape_mtgtop8 unconditionally rewraps sys.stdout/stderr in a new
# TextIOWrapper on Windows import (for UnicodeEncodeError safety). That
# wrapper closes the shared underlying buffer on GC, which kills pytest's
# output capture for the rest of the session once this module is imported.
# Spoof a non-Windows platform for the duration of the import so the wrap
# never happens; this module never needs it.
_real_platform = sys.platform
sys.platform = "linux"
try:
    from scrape_mtgtop8 import BASE_URL, FORMATS, RATE_LIMIT_SEC, fetch_page  # noqa: E402
finally:
    sys.platform = _real_platform

# "<N> players - DD/MM/YY" -- same DD/MM/YY convention as parse_event_list
# in scrape_mtgtop8.py; do not parse as MM/DD/YY (see comment there).
EVENT_DATE_RE = re.compile(r"\d+\s*players\s*-\s*(\d{2}/\d{2}/\d{2})")
BARE_DATE_RE = re.compile(r"(?<!\d)(\d{2}/\d{2}/\d{2})(?!\d)")


def parse_event_date(html: str) -> str | None:
    """Extract the ISO event date from an mtgtop8 event page, or None."""
    match = EVENT_DATE_RE.search(html)
    if match:
        raw = match.group(1)
    else:
        # Compilation pages ("The Decks to Beat - January '26") have no player count,
        # only one bare DD/MM/YY; accept it only when the page holds exactly one date.
        bare = set(BARE_DATE_RE.findall(html))
        if len(bare) != 1:
            return None
        raw = bare.pop()
    try:
        return datetime.strptime(raw, "%d/%m/%y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def undated_event_ids(conn: sqlite3.Connection, fmt: str) -> list[str]:
    rows = conn.execute(
        "SELECT DISTINCT source_id FROM community_decks "
        "WHERE source = 'mtgtop8' AND format = ? AND event_date IS NULL",
        (fmt,),
    ).fetchall()
    ids = set()
    for (source_id,) in rows:
        m = re.match(r"e(\d+)_", source_id or "")
        if m:
            ids.add(m.group(1))
    return sorted(ids, key=int)


def update_event(conn: sqlite3.Connection, event_id: str, iso_date: str) -> int:
    prefix = f"e{event_id}_"
    with conn:
        cur = conn.execute(
            "UPDATE community_decks SET event_date = ? "
            "WHERE source = 'mtgtop8' AND event_date IS NULL "
            "AND substr(source_id, 1, ?) = ?",
            (iso_date, len(prefix), prefix),
        )
        return cur.rowcount


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", required=True)
    ap.add_argument("--formats", nargs="+", choices=list(FORMATS), default=list(FORMATS))
    ap.add_argument("--limit", type=int, default=0, help="max events total, 0 = all")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sleep", type=float, default=RATE_LIMIT_SEC)
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)

    fetched = dated = no_date = errors = rows_updated = 0

    for fmt in args.formats:
        fmt_code = FORMATS[fmt]
        for event_id in undated_event_ids(conn, fmt):
            if args.limit and fetched >= args.limit:
                break

            url = f"{BASE_URL}/event?e={event_id}&f={fmt_code}"
            html = fetch_page(url)
            fetched += 1
            if html is None:
                errors += 1
                print(f"{event_id}\tERROR\t0", flush=True)
                time.sleep(args.sleep)
                continue

            iso_date = parse_event_date(html)
            if iso_date is None:
                no_date += 1
                print(f"{event_id}\tNO_DATE\t0", flush=True)
                time.sleep(args.sleep)
                continue

            dated += 1
            if args.dry_run:
                print(f"{event_id}\t{iso_date}\t(dry-run)", flush=True)
            else:
                n = update_event(conn, event_id, iso_date)
                rows_updated += n
                print(f"{event_id}\t{iso_date}\t{n}", flush=True)

            time.sleep(args.sleep)

    print(
        f"\nevents fetched={fetched} dated={dated} no_date={no_date} "
        f"errors={errors} rows_updated={rows_updated}",
        flush=True,
    )

    if fetched > 0 and fetched == errors:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
