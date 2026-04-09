#!/usr/bin/env python3
"""
Sync user data between Electron production DB and dev/training DB.

Usage:
    py scripts/sync_user_data.py pull     # prod -> dev (for training/viewing)
    py scripts/sync_user_data.py push     # dev -> prod (push deck modifications)
    py scripts/sync_user_data.py status   # show sync diff without changing anything

Options:
    --prod PATH    Override production DB path
    --dev PATH     Override dev DB path (default: data/mtg-deck-builder.db)
    --user NAME    Only sync specific user (default: all)
    --deck NAME    Only sync specific deck by name
    --dry-run      Show what would change without writing
"""

import argparse
import os
import sqlite3
import sys
from datetime import datetime


def get_default_prod_path() -> str:
    """Find the Electron production DB."""
    appdata = os.environ.get("APPDATA", "")
    candidates = [
        os.path.join(appdata, "the-black-grimoire", "data", "mtg-deck-builder.db"),
        os.path.join(appdata, "The Black Grimoire", "data", "mtg-deck-builder.db"),
        os.path.join(appdata, "mtg-deck-builder", "data", "mtg-deck-builder.db"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[0]


def open_db(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def get_user_map(source: sqlite3.Connection, target: sqlite3.Connection) -> dict[int, int]:
    """Map source user IDs to target user IDs by username."""
    src_users = source.execute("SELECT id, username FROM users").fetchall()
    tgt_users = {r["username"]: r["id"] for r in target.execute("SELECT id, username, email, password_hash FROM users").fetchall()}

    user_map = {}
    for u in src_users:
        if u["username"] in tgt_users:
            user_map[u["id"]] = tgt_users[u["username"]]
        else:
            # Create user in target
            src_full = source.execute(
                "SELECT username, email, password_hash, created_at FROM users WHERE id = ?",
                (u["id"],),
            ).fetchone()
            target.execute(
                "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (src_full["username"], src_full["email"], src_full["password_hash"], src_full["created_at"]),
            )
            user_map[u["id"]] = target.execute("SELECT last_insert_rowid()").fetchone()[0]
            print(f"  Created user '{u['username']}' in target (id={user_map[u['id']]})")

    return user_map


def sync_decks(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
    user_map: dict[int, int],
    deck_filter: str | None = None,
    dry_run: bool = False,
) -> dict[int, int]:
    """Sync decks from source to target. Returns deck ID mapping."""
    deck_map: dict[int, int] = {}

    for src_uid, tgt_uid in user_map.items():
        query = "SELECT * FROM decks WHERE user_id = ?"
        params: list = [src_uid]
        if deck_filter:
            query += " AND name LIKE ?"
            params.append(f"%{deck_filter}%")

        src_decks = source.execute(query, params).fetchall()

        for sd in src_decks:
            # Check if deck exists in target by (user_id, name, format)
            existing = target.execute(
                "SELECT id FROM decks WHERE user_id = ? AND name = ? AND format = ?",
                (tgt_uid, sd["name"], sd["format"]),
            ).fetchone()

            if existing:
                tgt_deck_id = existing["id"]
                if not dry_run:
                    target.execute(
                        """UPDATE decks SET description=?, format=?, commander_id=?,
                           cover_card_id=?, updated_at=? WHERE id=?""",
                        (sd["description"], sd["format"], sd["commander_id"],
                         sd["cover_card_id"], sd["updated_at"], tgt_deck_id),
                    )
                print(f"  Updated deck '{sd['name']}' (src={sd['id']} -> tgt={tgt_deck_id})")
            else:
                if not dry_run:
                    target.execute(
                        """INSERT INTO decks (name, description, format, commander_id,
                           cover_card_id, created_at, updated_at, user_id)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                        (sd["name"], sd["description"], sd["format"], sd["commander_id"],
                         sd["cover_card_id"], sd["created_at"], sd["updated_at"], tgt_uid),
                    )
                    tgt_deck_id = target.execute("SELECT last_insert_rowid()").fetchone()[0]
                else:
                    tgt_deck_id = -1
                print(f"  Created deck '{sd['name']}' (src={sd['id']} -> tgt={tgt_deck_id})")

            deck_map[sd["id"]] = tgt_deck_id

    return deck_map


def sync_deck_cards(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
    deck_map: dict[int, int],
    dry_run: bool = False,
):
    """Sync deck_cards: delete target cards for mapped decks, insert from source."""
    for src_id, tgt_id in deck_map.items():
        if tgt_id < 0:
            continue

        src_cards = source.execute(
            "SELECT card_id, quantity, board, sort_order FROM deck_cards WHERE deck_id = ?",
            (src_id,),
        ).fetchall()

        if not dry_run:
            target.execute("DELETE FROM deck_cards WHERE deck_id = ?", (tgt_id,))
            for c in src_cards:
                target.execute(
                    "INSERT INTO deck_cards (deck_id, card_id, quantity, board, sort_order) VALUES (?, ?, ?, ?, ?)",
                    (tgt_id, c["card_id"], c["quantity"], c["board"], c["sort_order"]),
                )

        total_qty = sum(c["quantity"] for c in src_cards)
        print(f"  Deck {src_id}->{tgt_id}: {len(src_cards)} entries, {total_qty} cards")


def sync_collection(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
    user_map: dict[int, int],
    dry_run: bool = False,
):
    """Sync collection: upsert by (user_id, card_id)."""
    total = 0
    for src_uid, tgt_uid in user_map.items():
        src_rows = source.execute(
            "SELECT card_id, quantity, foil, source, imported_at FROM collection WHERE user_id = ?",
            (src_uid,),
        ).fetchall()

        if not dry_run:
            for r in src_rows:
                # Unique constraint: (card_id, foil, source, COALESCE(user_id, 0))
                existing = target.execute(
                    """SELECT id FROM collection
                       WHERE card_id = ? AND foil = ? AND source = ? AND COALESCE(user_id, 0) = ?""",
                    (r["card_id"], r["foil"], r["source"], tgt_uid or 0),
                ).fetchone()

                if existing:
                    target.execute(
                        "UPDATE collection SET quantity = ?, imported_at = ? WHERE id = ?",
                        (r["quantity"], r["imported_at"], existing["id"]),
                    )
                else:
                    target.execute(
                        """INSERT INTO collection (user_id, card_id, quantity, foil, source, imported_at)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (tgt_uid, r["card_id"], r["quantity"], r["foil"], r["source"], r["imported_at"]),
                    )

        total += len(src_rows)
    print(f"  Collection: {total} entries synced")


def sync_arena_matches(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
    dry_run: bool = False,
):
    """Sync arena_parsed_matches by match_id (insert or ignore)."""
    src_rows = source.execute("SELECT * FROM arena_parsed_matches").fetchall()
    cols = [d[0] for d in source.execute("SELECT * FROM arena_parsed_matches LIMIT 0").description]

    imported = 0
    for r in src_rows:
        row_dict = dict(r)
        placeholders = ", ".join(["?"] * len(cols))
        col_str = ", ".join(cols)
        if not dry_run:
            target.execute(
                f"INSERT OR IGNORE INTO arena_parsed_matches ({col_str}) VALUES ({placeholders})",
                [row_dict[c] for c in cols],
            )
            if target.execute("SELECT changes()").fetchone()[0] > 0:
                imported += 1
        else:
            imported += 1

    print(f"  Arena matches: {imported}/{len(src_rows)} new (rest already existed)")


def sync_match_logs(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
    deck_map: dict[int, int],
    dry_run: bool = False,
):
    """Sync match_logs with deck ID remapping."""
    cols_query = source.execute("PRAGMA table_info(match_logs)")
    cols = [c[1] for c in cols_query.fetchall()]

    src_rows = source.execute("SELECT * FROM match_logs").fetchall()
    imported = 0
    for r in src_rows:
        row_dict = dict(r)
        # Remap deck_id
        if row_dict.get("deck_id") and row_dict["deck_id"] in deck_map:
            row_dict["deck_id"] = deck_map[row_dict["deck_id"]]

        insert_cols = [c for c in cols if c != "id"]
        placeholders = ", ".join(["?"] * len(insert_cols))
        col_str = ", ".join(insert_cols)

        if not dry_run:
            try:
                target.execute(
                    f"INSERT INTO match_logs ({col_str}) VALUES ({placeholders})",
                    [row_dict.get(c) for c in insert_cols],
                )
                imported += 1
            except sqlite3.IntegrityError:
                pass

    print(f"  Match logs: {imported}/{len(src_rows)} synced")


def sync_card_performance(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
    dry_run: bool = False,
):
    """Merge card_performance: add counts together for matching keys."""
    src_rows = source.execute(
        """SELECT card_name, format, opponent_colors, games_played, games_in_deck,
                  wins_when_played, wins_when_in_deck, total_drawn, rating
           FROM card_performance"""
    ).fetchall()

    merged = 0
    for r in src_rows:
        if dry_run:
            merged += 1
            continue

        existing = target.execute(
            """SELECT games_played FROM card_performance
               WHERE card_name = ? AND format = ? AND opponent_colors = ?""",
            (r["card_name"], r["format"], r["opponent_colors"]),
        ).fetchone()

        if existing:
            target.execute(
                """UPDATE card_performance SET
                   games_played = ?, games_in_deck = ?,
                   wins_when_played = ?, wins_when_in_deck = ?,
                   total_drawn = ?, rating = ?, updated_at = datetime('now')
                   WHERE card_name = ? AND format = ? AND opponent_colors = ?""",
                (r["games_played"], r["games_in_deck"],
                 r["wins_when_played"], r["wins_when_in_deck"],
                 r["total_drawn"], r["rating"],
                 r["card_name"], r["format"], r["opponent_colors"]),
            )
        else:
            target.execute(
                """INSERT INTO card_performance
                   (card_name, format, opponent_colors, games_played,
                    games_in_deck, wins_when_played, wins_when_in_deck,
                    total_drawn, rating)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (r["card_name"], r["format"], r["opponent_colors"],
                 r["games_played"], r["games_in_deck"],
                 r["wins_when_played"], r["wins_when_in_deck"],
                 r["total_drawn"], r["rating"]),
            )
        merged += 1

    print(f"  Card performance: {merged} entries merged")


def sync_game_actions(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
    dry_run: bool = False,
):
    """Sync arena_game_actions by unique key."""
    try:
        src_count = source.execute("SELECT COUNT(*) FROM arena_game_actions").fetchone()[0]
        tgt_count = target.execute("SELECT COUNT(*) FROM arena_game_actions").fetchone()[0]

        if src_count <= tgt_count:
            print(f"  Game actions: target already has {tgt_count} >= source {src_count}, skipping")
            return

        if not dry_run:
            cols_info = source.execute("PRAGMA table_info(arena_game_actions)").fetchall()
            cols = [c[1] for c in cols_info if c[1] != "id"]

            src_rows = source.execute(f"SELECT {', '.join(cols)} FROM arena_game_actions").fetchall()
            target.execute("DELETE FROM arena_game_actions")
            for r in src_rows:
                placeholders = ", ".join(["?"] * len(cols))
                target.execute(
                    f"INSERT INTO arena_game_actions ({', '.join(cols)}) VALUES ({placeholders})",
                    [r[i] for i in range(len(cols))],
                )

        print(f"  Game actions: {src_count} entries synced (replaced {tgt_count})")
    except sqlite3.OperationalError as e:
        print(f"  Game actions: skipped ({e})")


def show_status(prod: sqlite3.Connection, dev: sqlite3.Connection):
    """Show sync diff without modifying anything."""
    tables = [
        "users", "decks", "deck_cards", "collection",
        "arena_parsed_matches", "card_performance", "match_logs",
        "arena_game_actions", "deck_versions",
    ]

    print(f"{'Table':<25} {'Prod':>8} {'Dev':>8} {'Delta':>8}")
    print("-" * 55)
    for t in tables:
        try:
            p = prod.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
        except sqlite3.OperationalError:
            p = "N/A"
        try:
            d = dev.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
        except sqlite3.OperationalError:
            d = "N/A"
        delta = ""
        if isinstance(p, int) and isinstance(d, int):
            diff = p - d
            delta = f"+{diff}" if diff > 0 else str(diff) if diff < 0 else "="
        print(f"{t:<25} {str(p):>8} {str(d):>8} {delta:>8}")

    print("\n=== Prod Decks ===")
    decks = prod.execute("SELECT id, name, format, user_id FROM decks ORDER BY id").fetchall()
    for d in decks:
        card_count = prod.execute(
            "SELECT SUM(quantity) FROM deck_cards WHERE deck_id = ?", (d["id"],)
        ).fetchone()[0] or 0
        exists_in_dev = dev.execute(
            "SELECT id FROM decks WHERE name = ?", (d["name"],)
        ).fetchone()
        status = f"-> dev.{exists_in_dev['id']}" if exists_in_dev else "NEW"
        print(f"  [{d['id']}] {d['name']} ({d['format']}, {card_count} cards) {status}")


def main():
    parser = argparse.ArgumentParser(description="Sync user data between prod and dev DBs")
    parser.add_argument("action", choices=["pull", "push", "status"],
                        help="pull=prod->dev, push=dev->prod, status=show diff")
    parser.add_argument("--prod", default=None, help="Production DB path")
    parser.add_argument("--dev", default="data/mtg-deck-builder.db", help="Dev DB path")
    parser.add_argument("--user", default=None, help="Only sync specific user")
    parser.add_argument("--deck", default=None, help="Only sync specific deck name")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    prod_path = args.prod or get_default_prod_path()
    dev_path = args.dev

    if not os.path.exists(prod_path):
        print(f"Production DB not found: {prod_path}")
        sys.exit(1)
    if not os.path.exists(dev_path):
        print(f"Dev DB not found: {dev_path}")
        sys.exit(1)

    print(f"Prod: {prod_path} ({os.path.getsize(prod_path) / 1024 / 1024:.1f} MB)")
    print(f"Dev:  {dev_path} ({os.path.getsize(dev_path) / 1024 / 1024:.1f} MB)")

    prod = open_db(prod_path)
    dev = open_db(dev_path)

    if args.action == "status":
        show_status(prod, dev)
        prod.close()
        dev.close()
        return

    if args.action == "pull":
        source, target = prod, dev
        direction = "prod -> dev"
    else:
        source, target = dev, prod
        direction = "dev -> prod"

    print(f"\n{'DRY RUN: ' if args.dry_run else ''}Syncing {direction}")
    print(f"  Timestamp: {datetime.now().isoformat()}")

    # 1. Sync users
    print("\n[1/6] Users")
    user_map = get_user_map(source, target) if not args.dry_run else {}
    if args.dry_run:
        src_users = source.execute("SELECT id, username FROM users").fetchall()
        for u in src_users:
            print(f"  Would sync user '{u['username']}' (id={u['id']})")
        user_map = {u["id"]: u["id"] for u in src_users}

    if args.user:
        user_map = {k: v for k, v in user_map.items()
                    if source.execute("SELECT username FROM users WHERE id = ?", (k,)).fetchone()["username"] == args.user}

    # 2. Sync decks
    print("\n[2/6] Decks")
    deck_map = sync_decks(source, target, user_map, args.deck, args.dry_run)

    # 3. Sync deck cards
    print("\n[3/6] Deck cards")
    sync_deck_cards(source, target, deck_map, args.dry_run)

    # 4. Sync collection
    print("\n[4/6] Collection")
    sync_collection(source, target, user_map, args.dry_run)

    # 5. Sync matches + performance
    print("\n[5/6] Matches & performance")
    sync_arena_matches(source, target, args.dry_run)
    sync_match_logs(source, target, deck_map, args.dry_run)
    sync_card_performance(source, target, args.dry_run)

    # 6. Sync game actions
    print("\n[6/6] Game actions")
    sync_game_actions(source, target, args.dry_run)

    if not args.dry_run:
        target.commit()
        print(f"\nSync complete. Target DB committed.")
    else:
        print(f"\nDry run complete. No changes written.")

    prod.close()
    dev.close()


if __name__ == "__main__":
    main()
