#!/usr/bin/env python3
"""
Export the 60-card meta tables (community_decks, community_deck_cards,
meta_card_stats, archetype_win_stats) for the given formats into a small
standalone SQLite file, and optionally apply that export to other databases
(the build-api DB on the VPS, the desktop DB via scripts/sync_vps_meta.py).

Why a file: the scraper DB on the VPS is ~700 MB and Commander-heavy; the
Standard slice is a few MB and can be copied anywhere with ATTACH.

Usage (VPS, after aggregate_community_meta.py):
    python scripts/export_standard_meta.py --db data/mtg-deck-builder.db \
        --out data/export-standard.db --formats standard \
        --apply-to /opt/grimoire-build-api/db/mtg-deck-builder.db

Usage (any machine, apply an export):
    python scripts/export_standard_meta.py --apply /path/export-standard.db --db /path/target.db
"""
import argparse
import os
import sqlite3
import sys
from datetime import datetime, timezone

TABLES = ("community_decks", "community_deck_cards", "meta_card_stats", "archetype_win_stats")
# community_deck ids are re-based on import so they never collide with the target's own rows.
ID_BASE = 900_000_000


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, timeout=60)
    conn.execute("PRAGMA busy_timeout=60000")
    return conn


def table_sql(conn: sqlite3.Connection, name: str) -> str:
    row = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone()
    if not row:
        raise SystemExit(f"source has no table {name}")
    return row[0]


def export(src_path: str, out_path: str, formats: list[str]) -> dict:
    if os.path.exists(out_path):
        os.remove(out_path)
    src = connect(src_path)
    fmt_list = ",".join("?" for _ in formats)
    out = connect(out_path)
    for t in TABLES:
        out.execute(table_sql(src, t))
    out.commit()
    out.close()
    src.execute("ATTACH DATABASE ? AS x", (out_path,))
    src.execute(f"INSERT INTO x.community_decks SELECT * FROM community_decks WHERE format IN ({fmt_list})", formats)
    src.execute(
        f"""INSERT INTO x.community_deck_cards
            SELECT c.* FROM community_deck_cards c
            JOIN community_decks d ON d.id = c.community_deck_id
            WHERE d.format IN ({fmt_list})""",
        formats,
    )
    src.execute(f"INSERT INTO x.meta_card_stats SELECT * FROM meta_card_stats WHERE format IN ({fmt_list})", formats)
    src.execute(f"INSERT INTO x.archetype_win_stats SELECT * FROM archetype_win_stats WHERE format IN ({fmt_list})", formats)
    src.execute("CREATE TABLE x.export_meta (key TEXT PRIMARY KEY, value TEXT)")
    src.execute("INSERT INTO x.export_meta VALUES ('formats', ?)", (",".join(formats),))
    src.execute("INSERT INTO x.export_meta VALUES ('exported_at', ?)", (datetime.now(timezone.utc).isoformat(),))
    src.commit()
    counts = {t: src.execute(f"SELECT COUNT(*) FROM x.{t}").fetchone()[0] for t in TABLES}
    src.execute("DETACH DATABASE x")
    src.close()
    return counts


def ensure_target_tables(target: sqlite3.Connection, export_conn: sqlite3.Connection) -> None:
    for t in TABLES:
        exists = target.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (t,)).fetchone()
        if not exists:
            target.execute(table_sql(export_conn, t))
    # older targets may lack the v18 columns the scrapers add lazily
    have = {r[1] for r in target.execute("PRAGMA table_info(community_decks)")}
    for col, dtype in {"wins": "INTEGER", "losses": "INTEGER", "draws": "INTEGER", "record": "TEXT",
                       "tournament_type": "TEXT", "player_name": "TEXT"}.items():
        if col not in have:
            target.execute(f"ALTER TABLE community_decks ADD COLUMN {col} {dtype}")
    target.commit()


def apply(export_path: str, target_path: str) -> dict:
    """Replace the target's rows for the exported formats with the export's rows."""
    exp = connect(export_path)
    formats = exp.execute("SELECT value FROM export_meta WHERE key='formats'").fetchone()[0].split(",")
    target = connect(target_path)
    ensure_target_tables(target, exp)
    exp.close()
    fmt_list = ",".join("?" for _ in formats)
    target.execute("ATTACH DATABASE ? AS x", (export_path,))
    cols = lambda t: ", ".join(r[1] for r in target.execute(f"PRAGMA x.table_info({t})"))  # noqa: E731
    target.execute("BEGIN")
    target.execute(
        f"""DELETE FROM community_deck_cards WHERE community_deck_id IN
            (SELECT id FROM community_decks WHERE format IN ({fmt_list}))""",
        formats,
    )
    target.execute(f"DELETE FROM community_decks WHERE format IN ({fmt_list})", formats)
    target.execute(f"DELETE FROM meta_card_stats WHERE format IN ({fmt_list})", formats)
    target.execute(f"DELETE FROM archetype_win_stats WHERE format IN ({fmt_list})", formats)
    deck_cols = [r[1] for r in target.execute("PRAGMA x.table_info(community_decks)")]
    deck_select = ", ".join(f"id + {ID_BASE}" if c == "id" else c for c in deck_cols)
    target.execute(f"INSERT INTO community_decks ({', '.join(deck_cols)}) SELECT {deck_select} FROM x.community_decks")
    card_cols = [r[1] for r in target.execute("PRAGMA x.table_info(community_deck_cards)")]
    card_select = ", ".join(
        "NULL" if c == "id" else (f"community_deck_id + {ID_BASE}" if c == "community_deck_id" else c) for c in card_cols
    )
    target.execute(f"INSERT INTO community_deck_cards ({', '.join(card_cols)}) SELECT {card_select} FROM x.community_deck_cards")
    for t in ("meta_card_stats", "archetype_win_stats"):
        tcols = [r[1] for r in target.execute(f"PRAGMA x.table_info({t})")]
        tsel = ", ".join("NULL" if c == "id" else c for c in tcols)
        target.execute(f"INSERT INTO {t} ({', '.join(tcols)}) SELECT {tsel} FROM x.{t}")
    target.commit()
    counts = {t: target.execute(f"SELECT COUNT(*) FROM {t} WHERE format IN ({fmt_list})", formats).fetchone()[0]
              for t in ("community_decks", "meta_card_stats", "archetype_win_stats")}
    counts["community_deck_cards"] = target.execute(
        f"""SELECT COUNT(*) FROM community_deck_cards c JOIN community_decks d ON d.id = c.community_deck_id
            WHERE d.format IN ({fmt_list})""", formats).fetchone()[0]
    target.execute("DETACH DATABASE x")
    target.close()
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Export/apply the 60-card meta slice between SQLite databases")
    parser.add_argument("--db", required=True, help="Source DB to export from, or target DB with --apply")
    parser.add_argument("--out", help="Export file to write")
    parser.add_argument("--formats", nargs="+", default=["standard"])
    parser.add_argument("--apply-to", nargs="*", default=[], help="Target DBs to apply the fresh export to")
    parser.add_argument("--apply", help="Apply an existing export file to --db")
    args = parser.parse_args()

    if args.apply:
        counts = apply(args.apply, args.db)
        print(f"applied {args.apply} -> {args.db}: {counts}")
        return
    if not args.out:
        parser.error("--out is required unless --apply is used")
    counts = export(args.db, args.out, args.formats)
    print(f"exported {args.formats} -> {args.out}: {counts}")
    for target in args.apply_to:
        try:
            print(f"applied -> {target}: {apply(args.out, target)}")
        except Exception as exc:  # keep going for the other targets; the export file is still valid
            print(f"apply to {target} FAILED: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
