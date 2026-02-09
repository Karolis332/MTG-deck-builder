#!/usr/bin/env python3
"""
PR8: Generate personalized card suggestions using the trained model.

Loads the model from data/card_model.joblib, scores candidate cards for
a given commander/format, and writes the top suggestions to the
personalized_suggestions table.

Usage:
    python scripts/predict_suggestions.py [--db data/mtg-deck-builder.db] [--commander "Krenko, Mob Boss"]
    python scripts/predict_suggestions.py --all-decks
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("pandas and numpy are required: pip install pandas numpy", file=sys.stderr)
    sys.exit(1)

try:
    import joblib
except ImportError:
    print("joblib is required: pip install joblib", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")
MODEL_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "card_model.joblib")

FEATURE_COLS = [
    "cmc", "is_creature", "is_instant", "is_sorcery", "is_artifact",
    "is_enchantment", "is_land", "color_count", "has_W", "has_U",
    "has_B", "has_R", "has_G", "edhrec_rank_norm", "avg_synergy",
    "avg_inclusion", "games_played", "rating", "text_length",
    # Community meta features (from scraped tournament/metagame data)
    "meta_inclusion_rate", "placement_weighted_score",
    "archetype_core_rate", "avg_copies_norm", "meta_popularity",
    # Archetype win rate (from aggregated tournament W-L data)
    "archetype_win_rate",
]


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


def ensure_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS personalized_suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_id INTEGER,
            commander_name TEXT,
            format TEXT NOT NULL DEFAULT '',
            card_name TEXT NOT NULL,
            predicted_score REAL NOT NULL,
            card_id TEXT,
            reason TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(deck_id, card_name)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_pers_sugg_deck
        ON personalized_suggestions(deck_id)
    """)
    conn.commit()


def load_model(model_path: str):
    if not os.path.exists(model_path):
        print(f"Model not found: {model_path}. Run train_model.py first.", file=sys.stderr)
        sys.exit(1)
    return joblib.load(model_path)


def build_candidate_features(conn: sqlite3.Connection, commander_name: str | None,
                             colors: list[str], fmt: str) -> pd.DataFrame:
    """Build feature matrix for all candidate cards matching the color identity."""
    color_filter_parts = []
    for c in ["W", "U", "B", "R", "G"]:
        if c not in colors:
            color_filter_parts.append(f"c.color_identity NOT LIKE '%{c}%'")

    color_filter = " AND ".join(color_filter_parts) if color_filter_parts else "1=1"

    legality_filter = ""
    if fmt:
        legality_filter = f"AND c.legalities LIKE '%\"{fmt}\":\"legal\"%'"

    commander_exclude = ""
    if commander_name:
        safe_name = commander_name.replace("'", "''")
        commander_exclude = f"AND c.name != '{safe_name}'"

    cards_df = pd.read_sql_query(f"""
        SELECT c.id, c.name, c.cmc, c.type_line, c.color_identity,
               c.edhrec_rank, c.oracle_text
        FROM cards c
        WHERE {color_filter}
        {legality_filter}
        {commander_exclude}
        AND c.type_line NOT LIKE '%Basic Land%'
        ORDER BY c.edhrec_rank ASC NULLS LAST
        LIMIT 2000
    """, conn)

    if cards_df.empty:
        return pd.DataFrame()

    # Synergy data
    synergy_df = pd.DataFrame()
    if commander_name:
        try:
            synergy_df = pd.read_sql_query("""
                SELECT card_name, synergy_score as avg_synergy,
                       inclusion_rate as avg_inclusion
                FROM commander_synergies
                WHERE commander_name = ? COLLATE NOCASE
            """, conn, params=(commander_name,))
        except Exception:
            pass

    if not synergy_df.empty:
        cards_df = cards_df.merge(synergy_df, left_on="name", right_on="card_name", how="left")
        cards_df["avg_synergy"] = cards_df["avg_synergy"].fillna(0)
        cards_df["avg_inclusion"] = cards_df["avg_inclusion"].fillna(0)
    else:
        cards_df["avg_synergy"] = 0.0
        cards_df["avg_inclusion"] = 0.0

    # Card performance data
    perf_df = pd.DataFrame()
    try:
        perf_df = pd.read_sql_query("""
            SELECT card_name, games_played, rating
            FROM card_performance
            WHERE format = ?
        """, conn, params=(fmt or "commander",))
    except Exception:
        pass

    if not perf_df.empty:
        cards_df = cards_df.merge(perf_df, left_on="name", right_on="card_name",
                                  how="left", suffixes=("", "_perf"))
        cards_df["games_played"] = cards_df["games_played"].fillna(0)
        cards_df["rating"] = cards_df["rating"].fillna(1500)
    else:
        cards_df["games_played"] = 0
        cards_df["rating"] = 1500.0

    # Feature engineering (same as training)
    cards_df["is_creature"] = cards_df["type_line"].str.contains("Creature", na=False).astype(int)
    cards_df["is_instant"] = cards_df["type_line"].str.contains("Instant", na=False).astype(int)
    cards_df["is_sorcery"] = cards_df["type_line"].str.contains("Sorcery", na=False).astype(int)
    cards_df["is_artifact"] = cards_df["type_line"].str.contains("Artifact", na=False).astype(int)
    cards_df["is_enchantment"] = cards_df["type_line"].str.contains("Enchantment", na=False).astype(int)
    cards_df["is_land"] = cards_df["type_line"].str.contains("Land", na=False).astype(int)

    def count_colors(ci):
        if not ci or ci == "[]":
            return 0
        return sum(1 for c in ["W", "U", "B", "R", "G"] if c in str(ci))

    cards_df["color_count"] = cards_df["color_identity"].apply(count_colors)
    for c in ["W", "U", "B", "R", "G"]:
        cards_df[f"has_{c}"] = cards_df["color_identity"].apply(
            lambda ci, col=c: 1 if col in str(ci or "") else 0
        )

    max_rank = cards_df["edhrec_rank"].max()
    if pd.notna(max_rank) and max_rank > 0:
        cards_df["edhrec_rank_norm"] = 1 - (cards_df["edhrec_rank"].fillna(max_rank) / max_rank)
    else:
        cards_df["edhrec_rank_norm"] = 0.5

    cards_df["text_length"] = cards_df["oracle_text"].fillna("").str.len() / 500.0

    # Community meta stats
    meta_df = pd.DataFrame()
    try:
        meta_df = pd.read_sql_query("""
            SELECT card_name, meta_inclusion_rate, placement_weighted_score,
                   archetype_core_rate, avg_copies, num_decks_in, archetype_win_rate
            FROM meta_card_stats
            WHERE format = ?
        """, conn, params=(fmt or "standard",))
    except Exception:
        pass

    if not meta_df.empty:
        cards_df = cards_df.merge(meta_df, left_on="name", right_on="card_name",
                                  how="left", suffixes=("", "_meta"))
        cards_df["meta_inclusion_rate"] = cards_df["meta_inclusion_rate"].fillna(0)
        cards_df["placement_weighted_score"] = cards_df["placement_weighted_score"].fillna(0)
        cards_df["archetype_core_rate"] = cards_df["archetype_core_rate"].fillna(0)
        cards_df["avg_copies_norm"] = cards_df["avg_copies"].fillna(0) / 4.0
        cards_df["meta_popularity"] = cards_df["num_decks_in"].fillna(0).apply(
            lambda x: np.log1p(x))
        cards_df["archetype_win_rate"] = cards_df["archetype_win_rate"].fillna(0)
    else:
        cards_df["meta_inclusion_rate"] = 0.0
        cards_df["placement_weighted_score"] = 0.0
        cards_df["archetype_core_rate"] = 0.0
        cards_df["avg_copies_norm"] = 0.0
        cards_df["meta_popularity"] = 0.0
        cards_df["archetype_win_rate"] = 0.0

    return cards_df


def predict_for_deck(conn: sqlite3.Connection, artifact: dict, deck_id: int,
                     commander_name: str | None, colors: list[str], fmt: str,
                     existing_cards: set[str]):
    """Score candidates and write top suggestions to DB."""
    model = artifact["model"]
    scaler = artifact["scaler"]

    # Backward compat: use feature cols from the trained model if available
    model_features = artifact.get("feature_cols", FEATURE_COLS)

    candidates = build_candidate_features(conn, commander_name, colors, fmt)
    if candidates.empty:
        print(f"  No candidates for deck {deck_id}")
        return

    # Exclude cards already in the deck
    candidates = candidates[~candidates["name"].isin(existing_cards)]
    if candidates.empty:
        print(f"  All candidates already in deck {deck_id}")
        return

    # Use model's feature columns — add missing ones as 0
    for col in model_features:
        if col not in candidates.columns:
            candidates[col] = 0.0

    X = candidates[model_features].fillna(0).values
    X_scaled = scaler.transform(X)
    predictions = model.predict(X_scaled)

    candidates = candidates.copy()
    candidates["predicted_score"] = predictions

    # Top 50 suggestions
    top = candidates.nlargest(50, "predicted_score")

    # Clear old suggestions for this deck
    conn.execute("DELETE FROM personalized_suggestions WHERE deck_id = ?", (deck_id,))

    for _, row in top.iterrows():
        reason = generate_reason(row)
        conn.execute("""
            INSERT INTO personalized_suggestions
                (deck_id, commander_name, format, card_name, predicted_score, card_id, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(deck_id, card_name) DO UPDATE SET
                predicted_score = excluded.predicted_score,
                reason = excluded.reason,
                created_at = datetime('now')
        """, (deck_id, commander_name or "", fmt, row["name"],
              float(row["predicted_score"]), row.get("id", ""), reason))

    conn.commit()
    print(f"  Wrote {len(top)} suggestions for deck {deck_id} ({commander_name or 'no commander'})")


def generate_reason(row: pd.Series) -> str:
    """Generate a human-readable reason for the suggestion."""
    parts = []

    score = row["predicted_score"]
    if score > 0.6:
        parts.append("High predicted win rate")
    elif score > 0.5:
        parts.append("Above-average predicted performance")

    syn = row.get("avg_synergy", 0)
    if syn > 0.3:
        parts.append("strong commander synergy")
    elif syn > 0.1:
        parts.append("good commander synergy")

    incl = row.get("avg_inclusion", 0)
    if incl > 0.5:
        parts.append(f"in {int(incl * 100)}% of decks")

    meta_rate = row.get("meta_inclusion_rate", 0)
    if meta_rate > 0.3:
        parts.append(f"in {int(meta_rate * 100)}% of competitive decks")
    elif meta_rate > 0.1:
        parts.append(f"used in {int(meta_rate * 100)}% of meta decks")

    core_rate = row.get("archetype_core_rate", 0)
    if core_rate > 0.8:
        parts.append("archetype staple")

    arch_wr = row.get("archetype_win_rate", 0)
    if arch_wr > 0.6:
        parts.append(f"{int(arch_wr * 100)}% archetype win rate")
    elif arch_wr > 0.52:
        parts.append(f"winning archetype ({int(arch_wr * 100)}% WR)")

    gp = row.get("games_played", 0)
    if gp > 5:
        parts.append(f"tested in {int(gp)} games")

    if not parts:
        parts.append("ML model recommends")

    return "; ".join(parts)


def main():
    parser = argparse.ArgumentParser(description="Generate personalized card suggestions")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--model-path", default=MODEL_DEFAULT, help="Path to trained model")
    parser.add_argument("--commander", help="Commander name to generate suggestions for")
    parser.add_argument("--deck-id", type=int, help="Specific deck ID")
    parser.add_argument("--all-decks", action="store_true", help="Generate for all decks")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    ensure_table(conn)

    artifact = load_model(os.path.abspath(args.model_path))
    print(f"Loaded {artifact['model_type']} model (trained {artifact['trained_at']}, "
          f"R²={artifact['cv_r2_mean']:.4f}, {artifact['training_rows']} rows)")

    if args.all_decks:
        # Process all decks
        decks = conn.execute("""
            SELECT d.id, d.format, d.commander_id,
                   c.name as commander_name, c.color_identity
            FROM decks d
            LEFT JOIN cards c ON d.commander_id = c.id
        """).fetchall()

        for deck in decks:
            deck_id = deck["id"]
            fmt = deck["format"] or "commander"
            cmd_name = deck["commander_name"]
            ci = deck["color_identity"] or '["W","U","B","R","G"]'

            try:
                colors = json.loads(ci)
            except (json.JSONDecodeError, TypeError):
                colors = ["W", "U", "B", "R", "G"]

            # Get existing cards in deck
            existing = set()
            rows = conn.execute("""
                SELECT c.name FROM deck_cards dc
                JOIN cards c ON dc.card_id = c.id
                WHERE dc.deck_id = ?
            """, (deck_id,)).fetchall()
            for r in rows:
                existing.add(r["name"])

            print(f"Processing deck {deck_id}: {cmd_name or 'no commander'} ({fmt})")
            predict_for_deck(conn, artifact, deck_id, cmd_name, colors, fmt, existing)

    elif args.deck_id:
        deck = conn.execute("""
            SELECT d.id, d.format, d.commander_id,
                   c.name as commander_name, c.color_identity
            FROM decks d
            LEFT JOIN cards c ON d.commander_id = c.id
            WHERE d.id = ?
        """, (args.deck_id,)).fetchone()

        if not deck:
            print(f"Deck {args.deck_id} not found.", file=sys.stderr)
            sys.exit(1)

        fmt = deck["format"] or "commander"
        cmd_name = deck["commander_name"]
        ci = deck["color_identity"] or '["W","U","B","R","G"]'
        try:
            colors = json.loads(ci)
        except (json.JSONDecodeError, TypeError):
            colors = ["W", "U", "B", "R", "G"]

        existing = set()
        rows = conn.execute("""
            SELECT c.name FROM deck_cards dc
            JOIN cards c ON dc.card_id = c.id
            WHERE dc.deck_id = ?
        """, (args.deck_id,)).fetchall()
        for r in rows:
            existing.add(r["name"])

        predict_for_deck(conn, artifact, args.deck_id, cmd_name, colors, fmt, existing)

    elif args.commander:
        # Standalone commander prediction (no specific deck)
        cmd_card = conn.execute(
            "SELECT name, color_identity FROM cards WHERE name = ? COLLATE NOCASE",
            (args.commander,)
        ).fetchone()

        if not cmd_card:
            print(f"Commander '{args.commander}' not found.", file=sys.stderr)
            sys.exit(1)

        ci = cmd_card["color_identity"] or '["W","U","B","R","G"]'
        try:
            colors = json.loads(ci)
        except (json.JSONDecodeError, TypeError):
            colors = ["W", "U", "B", "R", "G"]

        predict_for_deck(conn, artifact, 0, cmd_card["name"], colors, "commander", set())

    else:
        print("Specify --all-decks, --deck-id, or --commander", file=sys.stderr)
        sys.exit(1)

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
