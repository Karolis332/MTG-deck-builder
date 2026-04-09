#!/usr/bin/env python3
"""
Import community decks from VPS PostgreSQL (grimoire_cf) into local SQLite.

Steps:
  1. SSH into VPS, export decks + deck_cards as CSVs via pg COPY
  2. SCP the CSVs locally
  3. Bulk-insert into community_decks / community_deck_cards (skip existing)

Usage:
    py scripts/import_vps_decks.py                # full import
    py scripts/import_vps_decks.py --dry-run      # show counts only
    py scripts/import_vps_decks.py --export-only   # just download CSVs
    py scripts/import_vps_decks.py --import-only   # just import existing CSVs
"""

import argparse
import csv
import os
import sqlite3
import subprocess
import sys
import time

SSH_KEY = os.path.expanduser("~/.ssh/id_ed25519_geo_vps")
VPS_HOST = "root@187.77.110.100"
DOCKER_CONTAINER = "grimoire-cf-api-postgres-1"
PG_USER = "grimoire"
PG_DB = "grimoire_cf"

LOCAL_DB = os.path.join("data", "mtg-deck-builder.db")
EXPORT_DIR = os.path.join("data", "vps_export")

DECKS_CSV = os.path.join(EXPORT_DIR, "vps_decks.csv")
CARDS_CSV = os.path.join(EXPORT_DIR, "vps_deck_cards.csv")

BATCH_SIZE = 5000


def ssh_cmd(cmd: str, timeout: int = 300) -> str:
    full = ["ssh", "-i", SSH_KEY, "-o", "StrictHostKeyChecking=no", VPS_HOST, cmd]
    result = subprocess.run(full, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        print(f"SSH error: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def scp_download(remote_path: str, local_path: str):
    full = ["scp", "-i", SSH_KEY, "-o", "StrictHostKeyChecking=no",
            f"{VPS_HOST}:{remote_path}", local_path]
    result = subprocess.run(full, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        print(f"SCP error: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)


def export_from_vps():
    """Export decks and deck_cards as CSVs on VPS, then download."""
    os.makedirs(EXPORT_DIR, exist_ok=True)

    print("[1/4] Exporting decks CSV from VPS...")
    ssh_cmd(
        f'docker exec {DOCKER_CONTAINER} psql -U {PG_USER} -d {PG_DB} -c '
        f'"\\COPY decks TO \'/tmp/vps_decks.csv\' WITH (FORMAT csv, HEADER true)"'
    )
    # Copy out of container
    ssh_cmd(f"docker cp {DOCKER_CONTAINER}:/tmp/vps_decks.csv /tmp/vps_decks.csv")

    print("[2/4] Exporting deck_cards CSV from VPS (this may take a minute)...")
    ssh_cmd(
        f'docker exec {DOCKER_CONTAINER} psql -U {PG_USER} -d {PG_DB} -c '
        f'"\\COPY deck_cards TO \'/tmp/vps_deck_cards.csv\' WITH (FORMAT csv, HEADER true)"',
        timeout=600,
    )
    ssh_cmd(f"docker cp {DOCKER_CONTAINER}:/tmp/vps_deck_cards.csv /tmp/vps_deck_cards.csv")

    print("[3/4] Downloading decks CSV...")
    scp_download("/tmp/vps_decks.csv", DECKS_CSV)
    decks_size = os.path.getsize(DECKS_CSV) / 1024 / 1024
    print(f"  -> {decks_size:.1f} MB")

    print("[4/4] Downloading deck_cards CSV...")
    scp_download("/tmp/vps_deck_cards.csv", CARDS_CSV)
    cards_size = os.path.getsize(CARDS_CSV) / 1024 / 1024
    print(f"  -> {cards_size:.1f} MB")

    # Cleanup remote temp files
    ssh_cmd("rm -f /tmp/vps_decks.csv /tmp/vps_deck_cards.csv")
    ssh_cmd(f"docker exec {DOCKER_CONTAINER} rm -f /tmp/vps_decks.csv /tmp/vps_deck_cards.csv")

    print(f"Export complete: {DECKS_CSV}, {CARDS_CSV}")


def import_to_sqlite(dry_run: bool = False):
    """Read CSVs and bulk-insert into local SQLite community tables."""
    if not os.path.exists(DECKS_CSV) or not os.path.exists(CARDS_CSV):
        print(f"CSVs not found. Run with --export-only first or without --import-only.")
        sys.exit(1)

    conn = sqlite3.connect(LOCAL_DB)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-200000")  # 200MB cache
    conn.execute("PRAGMA busy_timeout=10000")

    # Get existing (source, source_id) pairs to skip duplicates
    print("Loading existing community deck keys...")
    existing = set()
    for row in conn.execute("SELECT source, source_id FROM community_decks WHERE source_id IS NOT NULL"):
        existing.add((row[0], row[1]))
    print(f"  {len(existing)} existing decks in local DB")

    # --- Phase 1: Import decks ---
    print("\nImporting decks...")
    # VPS CSV columns: id, source, source_id, commander_name, color_identity, deck_name, author, views, likes, card_count, scraped_at, updated_at
    vps_id_to_local_id: dict[int, int] = {}
    imported_decks = 0
    skipped_decks = 0

    insert_deck = conn.cursor()

    with open(DECKS_CSV, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        batch: list[tuple] = []

        for row in reader:
            source = row["source"]
            source_id = row["source_id"]
            vps_id = int(row["id"])

            if (source, source_id) in existing:
                skipped_decks += 1
                # Still need to map VPS id to local id for deck_cards
                local_row = conn.execute(
                    "SELECT id FROM community_decks WHERE source = ? AND source_id = ?",
                    (source, source_id),
                ).fetchone()
                if local_row:
                    vps_id_to_local_id[vps_id] = local_row[0]
                continue

            # Map VPS fields to local community_decks schema
            deck_name = row.get("deck_name") or row.get("commander_name", "Unknown")
            player_name = row.get("author")
            scraped_at = row.get("scraped_at", "")

            # All VPS decks are commander format
            batch.append((
                source,
                source_id,
                "commander",          # format
                None,                 # archetype
                deck_name,
                None,                 # placement
                None,                 # meta_share
                None,                 # event_name
                None,                 # event_date
                scraped_at,
                None, None, None,     # wins, losses, draws
                None,                 # record
                None,                 # tournament_type
                player_name,
            ))

            if len(batch) >= BATCH_SIZE:
                if not dry_run:
                    _insert_deck_batch(conn, insert_deck, batch, vps_id_to_local_id, vps_id)
                imported_decks += len(batch)
                batch.clear()
                if imported_decks % 50000 == 0:
                    print(f"  {imported_decks} decks imported, {skipped_decks} skipped...")
                    if not dry_run:
                        conn.commit()

        # Remaining batch
        if batch:
            if not dry_run:
                _insert_deck_batch(conn, insert_deck, batch, vps_id_to_local_id, vps_id)
            imported_decks += len(batch)

    if not dry_run:
        conn.commit()

    print(f"  Decks: {imported_decks} imported, {skipped_decks} skipped (already existed)")

    # We need a proper VPS-id-to-local-id mapping. Re-read the CSV and build it.
    if not dry_run:
        print("\nBuilding VPS-to-local ID mapping...")
        # Re-scan: for all VPS decks, look up local ID by (source, source_id)
        vps_id_to_local_id.clear()
        with open(DECKS_CSV, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            batch_keys: list[tuple[int, str, str]] = []
            for row in reader:
                batch_keys.append((int(row["id"]), row["source"], row["source_id"]))

                if len(batch_keys) >= 10000:
                    _resolve_id_batch(conn, batch_keys, vps_id_to_local_id)
                    batch_keys.clear()
            if batch_keys:
                _resolve_id_batch(conn, batch_keys, vps_id_to_local_id)

        print(f"  Mapped {len(vps_id_to_local_id)} VPS deck IDs to local IDs")

    # --- Phase 2: Import deck_cards ---
    print("\nImporting deck_cards (this will take a while)...")
    # VPS CSV columns: deck_id, card_name, board, quantity
    imported_cards = 0
    skipped_cards = 0
    t0 = time.time()

    with open(CARDS_CSV, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        card_batch: list[tuple] = []

        for row in reader:
            vps_deck_id = int(row["deck_id"])
            local_deck_id = vps_id_to_local_id.get(vps_deck_id)

            if local_deck_id is None:
                skipped_cards += 1
                continue

            card_name = row["card_name"]
            quantity = int(row.get("quantity", 1))
            board = row.get("board", "main")

            card_batch.append((local_deck_id, card_name, quantity, board))

            if len(card_batch) >= BATCH_SIZE:
                if not dry_run:
                    conn.executemany(
                        """INSERT OR IGNORE INTO community_deck_cards
                           (community_deck_id, card_name, quantity, board)
                           VALUES (?, ?, ?, ?)""",
                        card_batch,
                    )
                imported_cards += len(card_batch)
                card_batch.clear()

                if imported_cards % 500000 == 0:
                    elapsed = time.time() - t0
                    rate = imported_cards / elapsed if elapsed > 0 else 0
                    print(f"  {imported_cards:,} cards imported ({rate:,.0f}/s), {skipped_cards:,} skipped...")
                    if not dry_run:
                        conn.commit()

        if card_batch:
            if not dry_run:
                conn.executemany(
                    """INSERT OR IGNORE INTO community_deck_cards
                       (community_deck_id, card_name, quantity, board)
                       VALUES (?, ?, ?, ?)""",
                    card_batch,
                )
            imported_cards += len(card_batch)

    if not dry_run:
        conn.commit()

    elapsed = time.time() - t0
    print(f"  Cards: {imported_cards:,} imported, {skipped_cards:,} skipped in {elapsed:.1f}s")

    # Final stats
    total_decks = conn.execute("SELECT COUNT(*) FROM community_decks").fetchone()[0]
    total_cards = conn.execute("SELECT COUNT(*) FROM community_deck_cards").fetchone()[0]
    print(f"\nFinal totals: {total_decks:,} community decks, {total_cards:,} deck cards")

    by_source = conn.execute(
        "SELECT source, COUNT(*) FROM community_decks GROUP BY source ORDER BY COUNT(*) DESC"
    ).fetchall()
    for source, cnt in by_source:
        print(f"  {source}: {cnt:,}")

    conn.close()


def _insert_deck_batch(
    conn: sqlite3.Connection,
    cursor: sqlite3.Cursor,
    batch: list[tuple],
    vps_id_to_local_id: dict[int, int],
    last_vps_id: int,
):
    """Insert a batch of decks and track their local IDs."""
    conn.executemany(
        """INSERT OR IGNORE INTO community_decks
           (source, source_id, format, archetype, deck_name, placement, meta_share,
            event_name, event_date, scraped_at, wins, losses, draws, record,
            tournament_type, player_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        batch,
    )


def _resolve_id_batch(
    conn: sqlite3.Connection,
    batch: list[tuple[int, str, str]],
    mapping: dict[int, int],
):
    """Resolve VPS IDs to local IDs by (source, source_id)."""
    for vps_id, source, source_id in batch:
        row = conn.execute(
            "SELECT id FROM community_decks WHERE source = ? AND source_id = ?",
            (source, source_id),
        ).fetchone()
        if row:
            mapping[vps_id] = row[0]


def main():
    parser = argparse.ArgumentParser(description="Import VPS community decks into local SQLite")
    parser.add_argument("--dry-run", action="store_true", help="Count without writing")
    parser.add_argument("--export-only", action="store_true", help="Only download CSVs from VPS")
    parser.add_argument("--import-only", action="store_true", help="Only import existing CSVs")
    args = parser.parse_args()

    if not args.import_only:
        export_from_vps()

    if not args.export_only:
        import_to_sqlite(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
