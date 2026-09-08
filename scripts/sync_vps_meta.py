#!/usr/bin/env python3
"""
Pull the VPS scrapers' 60-card meta export into the local desktop database.

The VPS pipeline (`/opt/grimoire-scrapers`, systemd `grimoire-scrapers`) runs
scrape_mtgo.py + scrape_mtgtop8.py + scrape_mtggoldfish.py every cycle, then
aggregate_community_meta.py, then export_standard_meta.py which writes
`/opt/grimoire-scrapers/data/export-standard.db` (and applies it to the
build-api DB). This script copies that file here and applies it to the app DB
the desktop client and `npm run dev` share.

Usage:
    py -3.13 scripts/sync_vps_meta.py                # fetch + apply
    py -3.13 scripts/sync_vps_meta.py --dry-run      # fetch, print counts, do not apply
    py -3.13 scripts/sync_vps_meta.py --db path.db   # apply to another DB
"""
import argparse
import os
import sqlite3
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from export_standard_meta import apply  # noqa: E402

VPS = "root@187.77.110.100"
SSH_KEY = os.path.expanduser("~/.ssh/id_ed25519_geo_vps")
REMOTE_EXPORT = "/opt/grimoire-scrapers/data/export-standard.db"
LOCAL_EXPORT = os.path.join(os.path.dirname(__file__), "..", "data", "export-standard.db")


def default_db() -> str:
    appdata = os.environ.get("APPDATA")
    if appdata:
        candidate = os.path.join(appdata, "the-black-grimoire", "data", "mtg-deck-builder.db")
        if os.path.exists(candidate):
            return candidate
    return os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")


def fetch_export() -> str:
    cmd = ["scp", "-q", "-i", SSH_KEY, f"{VPS}:{REMOTE_EXPORT}", LOCAL_EXPORT]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(f"scp failed: {result.stderr.strip() or result.stdout.strip()}")
    return LOCAL_EXPORT


def describe(export_path: str) -> None:
    conn = sqlite3.connect(export_path)
    meta = dict(conn.execute("SELECT key, value FROM export_meta").fetchall())
    decks = conn.execute("SELECT format, source, COUNT(*) FROM community_decks GROUP BY format, source").fetchall()
    stats = conn.execute("SELECT format, COUNT(*), MAX(updated_at) FROM meta_card_stats GROUP BY format").fetchall()
    conn.close()
    print(f"export {meta.get('formats')} from {meta.get('exported_at')}")
    for fmt, source, n in decks:
        print(f"  decks {fmt:<10} {source:<12} {n}")
    for fmt, n, updated in stats:
        print(f"  meta  {fmt:<10} {n} cards, updated {updated}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync the VPS 60-card meta export into the local DB")
    parser.add_argument("--db", default=default_db())
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--local-export", help="Apply an already-downloaded export instead of fetching")
    args = parser.parse_args()

    export_path = args.local_export or fetch_export()
    describe(export_path)
    if args.dry_run:
        return
    counts = apply(export_path, args.db)
    print(f"applied to {args.db}: {counts}")


if __name__ == "__main__":
    main()
