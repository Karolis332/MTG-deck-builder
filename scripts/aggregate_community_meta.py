#!/usr/bin/env python3
"""
Aggregate community deck data into per-card meta statistics
and archetype-level win/loss records.

Reads community_decks + community_deck_cards and computes:

  Card-level (meta_card_stats):
  - meta_inclusion_rate: % of top decks containing this card
  - placement_weighted_score: inclusion weighted by tournament placement + win rate
  - archetype_core_rate: max consistency across archetypes (staple detection)
  - avg_copies: mean quantity when included
  - archetype_win_rate: weighted avg win rate of archetypes containing this card

  Archetype-level (archetype_win_stats):
  - total_wins, total_losses, total_draws
  - avg_placement, best_placement
  - league_5_0_count, tournament_top8_count

Usage:
    py scripts/aggregate_community_meta.py --db data/mtg-deck-builder.db
"""

import argparse
import math
import os
import sqlite3
import sys
from datetime import datetime

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("pandas and numpy required: pip install pandas numpy", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(conn: sqlite3.Connection):
    """Create tables if they don't exist (for standalone usage)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS meta_card_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_name TEXT NOT NULL,
            format TEXT NOT NULL,
            meta_inclusion_rate REAL NOT NULL DEFAULT 0,
            placement_weighted_score REAL NOT NULL DEFAULT 0,
            archetype_core_rate REAL NOT NULL DEFAULT 0,
            avg_copies REAL NOT NULL DEFAULT 0,
            num_decks_in INTEGER NOT NULL DEFAULT 0,
            total_decks_sampled INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(card_name, format)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS archetype_win_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            archetype TEXT NOT NULL,
            format TEXT NOT NULL,
            total_wins INTEGER NOT NULL DEFAULT 0,
            total_losses INTEGER NOT NULL DEFAULT 0,
            total_draws INTEGER NOT NULL DEFAULT 0,
            total_entries INTEGER NOT NULL DEFAULT 0,
            avg_placement REAL,
            best_placement INTEGER,
            league_5_0_count INTEGER NOT NULL DEFAULT 0,
            tournament_top8_count INTEGER NOT NULL DEFAULT 0,
            sample_size INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(archetype, format)
        )
    """)
    # Ensure archetype_win_rate column exists on meta_card_stats
    existing = set()
    for row in conn.execute("PRAGMA table_info(meta_card_stats)"):
        existing.add(row[1])
    if "archetype_win_rate" not in existing:
        try:
            conn.execute("ALTER TABLE meta_card_stats ADD COLUMN archetype_win_rate REAL")
        except sqlite3.OperationalError:
            pass
    conn.commit()


def compute_placement_weight(placement: int | None, wins: int | None = None,
                             losses: int | None = None) -> float:
    """
    Convert tournament placement/record to a weight.

    If W-L data is available, use actual win rate as the weight.
    Otherwise fall back to placement-based weighting.
    """
    # Use actual win rate when available
    if wins is not None and losses is not None:
        total = wins + losses
        if total > 0:
            return wins / total

    # Placement-based fallback
    if placement is None or placement <= 0:
        return 0.3
    if placement == 1:
        return 1.0
    if placement == 2:
        return 0.9
    if placement <= 4:
        return 0.8
    if placement <= 8:
        return 0.65
    if placement <= 16:
        return 0.5
    return 0.3


def compute_archetype_win_stats(conn: sqlite3.Connection, fmt: str) -> dict[str, dict]:
    """
    Aggregate W-L records by archetype into archetype_win_stats table.

    Returns a dict of {archetype: {win_rate, ...}} for downstream use.
    """
    decks_df = pd.read_sql_query("""
        SELECT archetype, placement, wins, losses, draws, tournament_type
        FROM community_decks
        WHERE format = ? AND archetype IS NOT NULL
    """, conn, params=(fmt,))

    if decks_df.empty:
        return {}

    archetype_stats = {}

    for archetype, group in decks_df.groupby("archetype"):
        if pd.isna(archetype):
            continue

        total_entries = len(group)

        # Sum W-L-D where available
        has_wl = group["wins"].notna()
        total_wins = int(group.loc[has_wl, "wins"].sum()) if has_wl.any() else 0
        total_losses = int(group.loc[has_wl, "losses"].sum()) if has_wl.any() else 0
        total_draws = int(group["draws"].fillna(0).sum())

        # Placement stats
        has_placement = group["placement"].notna()
        if has_placement.any():
            placements = group.loc[has_placement, "placement"]
            avg_placement = float(placements.mean())
            best_placement = int(placements.min())
        else:
            avg_placement = None
            best_placement = None

        # League 5-0 count
        league_5_0 = len(group[
            (group["wins"] == 5) & (group["losses"] == 0)
        ]) if has_wl.any() else 0

        # Tournament top 8
        top8 = len(group[
            has_placement & (group["placement"] <= 8)
        ]) if has_placement.any() else 0

        # Compute win rate
        total_games = total_wins + total_losses
        win_rate = total_wins / total_games if total_games > 0 else None

        archetype_stats[archetype] = {
            "total_wins": total_wins,
            "total_losses": total_losses,
            "total_draws": total_draws,
            "total_entries": total_entries,
            "avg_placement": avg_placement,
            "best_placement": best_placement,
            "league_5_0_count": league_5_0,
            "tournament_top8_count": top8,
            "sample_size": int(has_wl.sum()),
            "win_rate": win_rate,
        }

        # Upsert into archetype_win_stats
        conn.execute("""
            INSERT INTO archetype_win_stats
                (archetype, format, total_wins, total_losses, total_draws,
                 total_entries, avg_placement, best_placement,
                 league_5_0_count, tournament_top8_count, sample_size, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(archetype, format) DO UPDATE SET
                total_wins = excluded.total_wins,
                total_losses = excluded.total_losses,
                total_draws = excluded.total_draws,
                total_entries = excluded.total_entries,
                avg_placement = excluded.avg_placement,
                best_placement = excluded.best_placement,
                league_5_0_count = excluded.league_5_0_count,
                tournament_top8_count = excluded.tournament_top8_count,
                sample_size = excluded.sample_size,
                updated_at = datetime('now')
        """, (archetype, fmt, total_wins, total_losses, total_draws,
              total_entries, avg_placement, best_placement,
              league_5_0, top8, int(has_wl.sum())))

    conn.commit()

    # Summary
    with_wr = [s for s in archetype_stats.values() if s["win_rate"] is not None]
    print(f"  Computed win stats for {len(archetype_stats)} archetypes "
          f"({len(with_wr)} with W-L data)")
    if with_wr:
        best = max(archetype_stats.items(), key=lambda x: (x[1]["win_rate"] or 0))
        print(f"  Best archetype: {best[0]} "
              f"({best[1]['total_wins']}-{best[1]['total_losses']}, "
              f"{best[1]['win_rate']:.1%} WR)")

    return archetype_stats


def aggregate_format(conn: sqlite3.Connection, fmt: str,
                     archetype_stats: dict[str, dict]) -> dict:
    """Compute meta stats for all cards in a given format.

    Uses SQL-side aggregation via a temp table to avoid loading millions
    of community_deck_cards rows into Python/pandas.
    """
    stats = {"cards_computed": 0, "total_decks": 0}

    total_decks = conn.execute(
        "SELECT COUNT(*) FROM community_decks WHERE format = ?", (fmt,)
    ).fetchone()[0]

    if total_decks == 0:
        print(f"  No community decks for format '{fmt}'")
        return stats

    stats["total_decks"] = total_decks
    print(f"  {total_decks} community decks for '{fmt}'")

    # ── Step 1: Build temp table with one row per (card, deck) pair ──
    # The expensive JOIN happens once; all subsequent queries hit the temp table.
    print(f"  Building card-deck join (SQL)...")
    conn.execute("DROP TABLE IF EXISTS temp.card_deck")
    conn.execute("""
        CREATE TEMP TABLE card_deck AS
        SELECT
            cdc.card_name,
            cdc.community_deck_id,
            MAX(cdc.quantity) AS quantity,
            cd.archetype,
            cd.placement,
            cd.meta_share,
            cd.wins,
            cd.losses
        FROM community_deck_cards cdc
        JOIN community_decks cd ON cdc.community_deck_id = cd.id
        WHERE cd.format = ? AND cdc.board = 'main'
        GROUP BY cdc.card_name, cdc.community_deck_id
    """, (fmt,))

    temp_count = conn.execute("SELECT COUNT(*) FROM temp.card_deck").fetchone()[0]
    print(f"  {temp_count:,} card-deck pairs")

    if temp_count == 0:
        print(f"  No card entries found")
        conn.execute("DROP TABLE IF EXISTS temp.card_deck")
        return stats

    # ── Step 2: Per-card basic stats via SQL GROUP BY ────────────────
    print(f"  Aggregating per-card stats...")
    card_rows = conn.execute("""
        SELECT
            card_name,
            COUNT(*)                 AS num_decks_in,
            AVG(quantity)            AS avg_copies,
            AVG(
                CASE
                    WHEN wins IS NOT NULL AND losses IS NOT NULL
                         AND (wins + losses) > 0
                        THEN CAST(wins AS REAL) / (wins + losses)
                    WHEN placement = 1  THEN 1.0
                    WHEN placement = 2  THEN 0.9
                    WHEN placement <= 4 THEN 0.8
                    WHEN placement <= 8 THEN 0.65
                    WHEN placement <= 16 THEN 0.5
                    ELSE 0.3
                END
                * (1.0 + COALESCE(meta_share, 0) / 100.0)
            ) AS placement_weighted_score
        FROM temp.card_deck
        GROUP BY card_name
    """).fetchall()

    card_stats_map: dict[str, tuple] = {}
    for row in card_rows:
        # row: (card_name, num_decks_in, avg_copies, placement_weighted_score)
        card_stats_map[row[0]] = (row[1], row[2], row[3])

    # ── Step 3: Archetype core rate ─────────────────────────────────
    print(f"  Computing archetype core rates...")
    arch_totals: dict[str, int] = {}
    for row in conn.execute("""
        SELECT archetype, COUNT(*) FROM community_decks
        WHERE format = ? AND archetype IS NOT NULL
        GROUP BY archetype
    """, (fmt,)):
        arch_totals[row[0]] = row[1]

    arch_core_rates: dict[str, float] = {}
    card_arch_map: dict[str, list[str]] = {}

    for row in conn.execute("""
        SELECT card_name, archetype, COUNT(*) AS card_in_arch
        FROM temp.card_deck
        WHERE archetype IS NOT NULL
        GROUP BY card_name, archetype
    """):
        card_name, archetype, card_in_arch = row[0], row[1], row[2]
        arch_total = arch_totals.get(archetype, 1)
        rate = card_in_arch / arch_total

        if card_name not in arch_core_rates or rate > arch_core_rates[card_name]:
            arch_core_rates[card_name] = rate

        if card_name not in card_arch_map:
            card_arch_map[card_name] = []
        card_arch_map[card_name].append(archetype)

    # ── Step 4: Archetype win rate per card ─────────────────────────
    arch_win_rates: dict[str, float] = {}
    for card_name, archs in card_arch_map.items():
        wr_sum = 0.0
        wr_weight = 0
        for arch in archs:
            if arch in archetype_stats and archetype_stats[arch]["win_rate"] is not None:
                info = archetype_stats[arch]
                w = info["sample_size"]
                wr_sum += info["win_rate"] * w
                wr_weight += w
        if wr_weight > 0:
            arch_win_rates[card_name] = wr_sum / wr_weight

    # ── Step 5: Build result tuples and batch upsert ────────────────
    results = []
    for card_name, (num_decks_in, avg_copies, pws) in card_stats_map.items():
        inclusion_rate = num_decks_in / total_decks
        core_rate = arch_core_rates.get(card_name, inclusion_rate)
        win_rate = arch_win_rates.get(card_name)

        results.append((
            card_name, fmt,
            round(inclusion_rate, 6),
            round(pws, 6),
            round(core_rate, 6),
            round(avg_copies, 4),
            int(num_decks_in),
            int(total_decks),
            round(win_rate, 6) if win_rate is not None else None,
        ))

    print(f"  Upserting {len(results):,} card stats...")
    conn.executemany("""
        INSERT INTO meta_card_stats
            (card_name, format, meta_inclusion_rate, placement_weighted_score,
             archetype_core_rate, avg_copies, num_decks_in, total_decks_sampled,
             archetype_win_rate, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(card_name, format) DO UPDATE SET
            meta_inclusion_rate   = excluded.meta_inclusion_rate,
            placement_weighted_score = excluded.placement_weighted_score,
            archetype_core_rate   = excluded.archetype_core_rate,
            avg_copies            = excluded.avg_copies,
            num_decks_in          = excluded.num_decks_in,
            total_decks_sampled   = excluded.total_decks_sampled,
            archetype_win_rate    = excluded.archetype_win_rate,
            updated_at            = datetime('now')
    """, results)

    conn.commit()
    conn.execute("DROP TABLE IF EXISTS temp.card_deck")

    stats["cards_computed"] = len(results)

    if results:
        sorted_results = sorted(results, key=lambda x: x[2], reverse=True)
        print(f"  Computed stats for {len(results):,} unique cards")
        print(f"  Top 5 by inclusion rate:")
        for r in sorted_results[:5]:
            cn, _, incl, _, _, avg_c, n_in, total, wr = r
            wr_str = f", WR={wr:.1%}" if wr is not None else ""
            print(f"    {cn:30s} {incl:.1%} "
                  f"(in {n_in}/{total} decks, avg {avg_c:.1f} copies{wr_str})")

    return stats


def compute_combo_score(conn: sqlite3.Connection):
    """
    Compute combo_score for each card in meta_card_stats.

    For each card, count how many combos it appears in (from spellbook_combo_cards),
    weighted by combo popularity, normalized to 0-1 scale.
    """
    # Check if spellbook tables exist
    tables = set()
    for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'"):
        tables.add(row[0])
    if "spellbook_combo_cards" not in tables or "spellbook_combos" not in tables:
        print("  Spellbook tables not found, skipping combo_score")
        return

    # Check if combo_score column exists
    existing = set()
    for row in conn.execute("PRAGMA table_info(meta_card_stats)"):
        existing.add(row[1])
    if "combo_score" not in existing:
        try:
            conn.execute("ALTER TABLE meta_card_stats ADD COLUMN combo_score REAL")
        except sqlite3.OperationalError:
            pass

    # Get combo counts weighted by popularity
    combo_data = pd.read_sql_query("""
        SELECT scc.card_name,
               COUNT(DISTINCT scc.combo_id) AS combo_count,
               SUM(COALESCE(sc.popularity, 1)) AS weighted_combo_count
        FROM spellbook_combo_cards scc
        LEFT JOIN spellbook_combos sc ON scc.combo_id = sc.id
        GROUP BY scc.card_name
    """, conn)

    if combo_data.empty:
        print("  No combo data found, skipping combo_score")
        return

    # Normalize weighted_combo_count to 0-1 scale
    max_weighted = combo_data["weighted_combo_count"].max()
    if max_weighted > 0:
        combo_data["combo_score"] = combo_data["weighted_combo_count"] / max_weighted
    else:
        combo_data["combo_score"] = 0.0

    # Update meta_card_stats
    updated = 0
    for _, row in combo_data.iterrows():
        result = conn.execute("""
            UPDATE meta_card_stats
            SET combo_score = ?
            WHERE card_name = ?
        """, (round(float(row["combo_score"]), 6), row["card_name"]))
        updated += result.rowcount

    conn.commit()
    print(f"  Updated combo_score for {updated} cards "
          f"(from {len(combo_data)} combo-referenced cards, "
          f"max weighted: {max_weighted})")


def main():
    parser = argparse.ArgumentParser(description="Aggregate community meta card statistics")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--formats", nargs="+", default=["standard", "commander"],
                        help="Formats to aggregate (default: standard commander)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_tables(conn)

    print("=" * 60)
    print("Community Meta Aggregation")
    print(f"Database: {db_path}")
    print(f"Formats: {', '.join(args.formats)}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    total_cards = 0
    total_decks = 0

    for fmt in args.formats:
        print(f"\n[{fmt.upper()}]")

        # First: compute archetype-level win stats
        print(f"  Computing archetype win stats...")
        archetype_stats = compute_archetype_win_stats(conn, fmt)

        # Then: compute per-card stats using archetype data
        stats = aggregate_format(conn, fmt, archetype_stats)
        total_cards += stats["cards_computed"]
        total_decks += stats["total_decks"]

    # Compute combo scores across all formats
    print(f"\n[COMBO SCORES]")
    compute_combo_score(conn)

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Total decks processed: {total_decks}")
    print(f"  Total card stats:      {total_cards}")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
