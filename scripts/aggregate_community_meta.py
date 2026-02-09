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
    """Compute meta stats for all cards in a given format."""
    stats = {"cards_computed": 0, "total_decks": 0}

    decks_df = pd.read_sql_query("""
        SELECT cd.id, cd.archetype, cd.placement, cd.meta_share, cd.source,
               cd.wins, cd.losses
        FROM community_decks cd
        WHERE cd.format = ?
    """, conn, params=(fmt,))

    if decks_df.empty:
        print(f"  No community decks for format '{fmt}'")
        return stats

    total_decks = len(decks_df)
    stats["total_decks"] = total_decks
    print(f"  {total_decks} community decks for '{fmt}'")

    deck_ids = decks_df["id"].tolist()
    if not deck_ids:
        return stats

    placeholders = ",".join("?" * len(deck_ids))
    cards_df = pd.read_sql_query(f"""
        SELECT cdc.community_deck_id, cdc.card_name, cdc.quantity, cdc.board
        FROM community_deck_cards cdc
        WHERE cdc.community_deck_id IN ({placeholders})
        AND cdc.board = 'main'
    """, conn, params=deck_ids)

    if cards_df.empty:
        print(f"  No card entries found")
        return stats

    merged = cards_df.merge(decks_df, left_on="community_deck_id", right_on="id", how="left")

    # Compute placement weights using W-L data when available
    merged["placement_weight"] = merged.apply(
        lambda row: compute_placement_weight(
            row.get("placement"), row.get("wins"), row.get("losses")
        ), axis=1
    )

    card_groups = merged.groupby("card_name")

    results = []
    for card_name, group in card_groups:
        num_decks_in = group["community_deck_id"].nunique()

        inclusion_rate = num_decks_in / total_decks

        weights = group.drop_duplicates("community_deck_id")["placement_weight"]
        meta_shares = group.drop_duplicates("community_deck_id")["meta_share"].fillna(0)

        if meta_shares.sum() > 0:
            placement_score = (weights * (1 + meta_shares / 100)).mean()
        else:
            placement_score = weights.mean()

        # archetype_core_rate
        archetype_rates = []
        for archetype, arch_group in group.groupby("archetype"):
            if pd.isna(archetype):
                continue
            arch_deck_count = decks_df[decks_df["archetype"] == archetype]["id"].nunique()
            if arch_deck_count > 0:
                card_in_arch = arch_group["community_deck_id"].nunique()
                archetype_rates.append(card_in_arch / arch_deck_count)

        archetype_core_rate = max(archetype_rates) if archetype_rates else inclusion_rate

        avg_copies = group["quantity"].mean()

        # Compute archetype_win_rate: weighted average of win rates
        # for archetypes that include this card, weighted by # decks in each
        card_archetypes = group.dropna(subset=["archetype"])["archetype"].unique()
        wr_weighted_sum = 0.0
        wr_weight_total = 0
        for arch in card_archetypes:
            if arch in archetype_stats and archetype_stats[arch]["win_rate"] is not None:
                arch_info = archetype_stats[arch]
                # Weight by number of entries (sample confidence)
                weight = arch_info["sample_size"]
                wr_weighted_sum += arch_info["win_rate"] * weight
                wr_weight_total += weight

        archetype_win_rate = wr_weighted_sum / wr_weight_total if wr_weight_total > 0 else None

        results.append({
            "card_name": card_name,
            "format": fmt,
            "meta_inclusion_rate": round(inclusion_rate, 6),
            "placement_weighted_score": round(placement_score, 6),
            "archetype_core_rate": round(archetype_core_rate, 6),
            "avg_copies": round(avg_copies, 4),
            "num_decks_in": int(num_decks_in),
            "total_decks_sampled": int(total_decks),
            "archetype_win_rate": round(archetype_win_rate, 6) if archetype_win_rate is not None else None,
        })

    # Write to meta_card_stats via UPSERT
    for r in results:
        conn.execute("""
            INSERT INTO meta_card_stats
                (card_name, format, meta_inclusion_rate, placement_weighted_score,
                 archetype_core_rate, avg_copies, num_decks_in, total_decks_sampled,
                 archetype_win_rate, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(card_name, format) DO UPDATE SET
                meta_inclusion_rate = excluded.meta_inclusion_rate,
                placement_weighted_score = excluded.placement_weighted_score,
                archetype_core_rate = excluded.archetype_core_rate,
                avg_copies = excluded.avg_copies,
                num_decks_in = excluded.num_decks_in,
                total_decks_sampled = excluded.total_decks_sampled,
                archetype_win_rate = excluded.archetype_win_rate,
                updated_at = datetime('now')
        """, (r["card_name"], r["format"], r["meta_inclusion_rate"],
              r["placement_weighted_score"], r["archetype_core_rate"],
              r["avg_copies"], r["num_decks_in"], r["total_decks_sampled"],
              r["archetype_win_rate"]))

    conn.commit()
    stats["cards_computed"] = len(results)

    if results:
        sorted_results = sorted(results, key=lambda x: x["meta_inclusion_rate"], reverse=True)
        print(f"  Computed stats for {len(results)} unique cards")
        print(f"  Top 5 by inclusion rate:")
        for r in sorted_results[:5]:
            wr_str = f", WR={r['archetype_win_rate']:.1%}" if r['archetype_win_rate'] is not None else ""
            print(f"    {r['card_name']:30s} {r['meta_inclusion_rate']:.1%} "
                  f"(in {r['num_decks_in']}/{r['total_decks_sampled']} decks, "
                  f"avg {r['avg_copies']:.1f} copies{wr_str})")

    return stats


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

    print("\n" + "=" * 60)
    print("Summary")
    print(f"  Total decks processed: {total_decks}")
    print(f"  Total card stats:      {total_cards}")
    print(f"Finished: {datetime.now().isoformat()}")

    conn.close()


if __name__ == "__main__":
    main()
