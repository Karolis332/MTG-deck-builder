#!/usr/bin/env python3
"""
PR8: Train a card recommendation model using scikit-learn.

Uses card features (CMC, type, synergy, personal win rate, EDHREC data)
plus user's match history to train a Ridge regression or Gradient Boosting
model that predicts card performance scores.

Supports three training targets:
  - personal: train on Arena match win rates (requires card_performance data)
  - community: train on archetype win rates from tournament data
  - blended: combines both (default, 60% personal + 40% community weight)

The trained model is serialized to data/card_model.joblib.

Usage:
    py scripts/train_model.py [--db data/mtg-deck-builder.db] [--model gbm|ridge]
    py scripts/train_model.py --target community
    py scripts/train_model.py --target blended
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
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.linear_model import Ridge
    from sklearn.model_selection import cross_val_score
    from sklearn.preprocessing import StandardScaler
    import joblib
except ImportError:
    print("scikit-learn and joblib are required: pip install scikit-learn joblib", file=sys.stderr)
    sys.exit(1)


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "mtg-deck-builder.db")
MODEL_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "card_model.joblib")


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    return conn


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
    # Combo synergy (from Commander Spellbook data)
    "combo_score",
    # Match ML features (from Arena per-game analysis)
    "avg_cmc_played", "curve_efficiency", "first_play_turn",
    "cards_drawn_per_turn", "unique_cards_played", "deck_penetration",
    "commander_cast_count", "commander_first_cast_turn",
    "removal_played_count", "counterspell_count",
]

TARGET_COL = "win_rate"


def _add_card_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived card features (type flags, color flags, text length)."""
    df["is_creature"] = df["type_line"].str.contains("Creature", na=False).astype(int)
    df["is_instant"] = df["type_line"].str.contains("Instant", na=False).astype(int)
    df["is_sorcery"] = df["type_line"].str.contains("Sorcery", na=False).astype(int)
    df["is_artifact"] = df["type_line"].str.contains("Artifact", na=False).astype(int)
    df["is_enchantment"] = df["type_line"].str.contains("Enchantment", na=False).astype(int)
    df["is_land"] = df["type_line"].str.contains("Land", na=False).astype(int)

    def count_colors(ci):
        if not ci or ci == "[]":
            return 0
        return sum(1 for c in ["W", "U", "B", "R", "G"] if c in str(ci))

    df["color_count"] = df["color_identity"].apply(count_colors)
    for c in ["W", "U", "B", "R", "G"]:
        df[f"has_{c}"] = df["color_identity"].apply(
            lambda ci, col=c: 1 if col in str(ci or "") else 0
        )

    max_rank = df["edhrec_rank"].max()
    if pd.notna(max_rank) and max_rank > 0:
        df["edhrec_rank_norm"] = 1 - (df["edhrec_rank"].fillna(max_rank) / max_rank)
    else:
        df["edhrec_rank_norm"] = 0.5

    df["text_length"] = df["oracle_text"].fillna("").str.len() / 500.0

    return df


def _add_meta_features(df: pd.DataFrame, conn: sqlite3.Connection) -> pd.DataFrame:
    """Merge community meta stats onto a DataFrame with card_name column."""
    meta_df = pd.DataFrame()
    try:
        meta_df = pd.read_sql_query("""
            SELECT card_name, meta_inclusion_rate, placement_weighted_score,
                   archetype_core_rate, avg_copies, num_decks_in, archetype_win_rate
            FROM meta_card_stats
        """, conn)
    except Exception:
        pass

    if not meta_df.empty:
        df = df.merge(meta_df, on="card_name", how="left")
        df["meta_inclusion_rate"] = df["meta_inclusion_rate"].fillna(0)
        df["placement_weighted_score"] = df["placement_weighted_score"].fillna(0)
        df["archetype_core_rate"] = df["archetype_core_rate"].fillna(0)
        df["avg_copies_norm"] = df["avg_copies"].fillna(0) / 4.0
        df["meta_popularity"] = df["num_decks_in"].fillna(0).apply(lambda x: np.log1p(x))
        df["archetype_win_rate"] = df["archetype_win_rate"].fillna(0)
    else:
        df["meta_inclusion_rate"] = 0.0
        df["placement_weighted_score"] = 0.0
        df["archetype_core_rate"] = 0.0
        df["avg_copies_norm"] = 0.0
        df["meta_popularity"] = 0.0
        df["archetype_win_rate"] = 0.0

    return df


def _add_match_ml_features(df: pd.DataFrame, conn: sqlite3.Connection) -> pd.DataFrame:
    """Merge match ML features (curve efficiency, deck penetration, etc.) into personal data."""
    try:
        ml_df = pd.read_sql_query("""
            SELECT
                m.deck_id,
                AVG(f.avg_cmc_played) as avg_cmc_played,
                AVG(f.curve_efficiency) as curve_efficiency,
                AVG(f.first_play_turn) as first_play_turn,
                AVG(f.cards_drawn_per_turn) as cards_drawn_per_turn,
                AVG(f.unique_cards_played) as unique_cards_played,
                AVG(f.deck_penetration) as deck_penetration,
                AVG(f.commander_cast_count) as commander_cast_count,
                AVG(f.commander_first_cast_turn) as commander_first_cast_turn,
                AVG(f.removal_played_count) as removal_played_count,
                AVG(f.counterspell_count) as counterspell_count
            FROM match_ml_features f
            JOIN arena_parsed_matches m ON m.id = f.match_id
            WHERE m.deck_id IS NOT NULL
            GROUP BY m.deck_id
        """, conn)
    except Exception:
        ml_df = pd.DataFrame()

    if not ml_df.empty and "deck_id" in df.columns:
        df = df.merge(ml_df, on="deck_id", how="left")

    # Ensure all ML feature columns exist
    ml_cols = [
        "avg_cmc_played", "curve_efficiency", "first_play_turn",
        "cards_drawn_per_turn", "unique_cards_played", "deck_penetration",
        "commander_cast_count", "commander_first_cast_turn",
        "removal_played_count", "counterspell_count",
    ]
    for col in ml_cols:
        if col not in df.columns:
            df[col] = 0.0
        else:
            df[col] = df[col].fillna(0)

    return df


def build_feature_matrix(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Build a feature matrix from cards that have appeared in decks with match history.
    Target: personal win rate from card_performance.
    """
    try:
        perf_df = pd.read_sql_query("""
            SELECT cp.card_name, cp.format, cp.games_played, cp.wins_when_played,
                   cp.rating,
                   CASE WHEN cp.games_played > 0
                        THEN CAST(cp.wins_when_played AS REAL) / cp.games_played
                        ELSE 0.5 END as win_rate
            FROM card_performance cp
            WHERE cp.games_played >= 1
        """, conn)
    except Exception as e:
        print(f"No card_performance data: {e}", file=sys.stderr)
        return pd.DataFrame()

    if perf_df.empty:
        print("No card performance data with >= 1 games.", file=sys.stderr)
        return pd.DataFrame()

    try:
        cards_df = pd.read_sql_query("""
            SELECT name, cmc, type_line, color_identity, edhrec_rank, oracle_text
            FROM cards
        """, conn)
    except Exception as e:
        print(f"Failed to read cards: {e}", file=sys.stderr)
        return pd.DataFrame()

    # Synergy data
    synergy_df = pd.DataFrame()
    try:
        synergy_df = pd.read_sql_query("""
            SELECT card_name, AVG(synergy_score) as avg_synergy,
                   AVG(inclusion_rate) as avg_inclusion
            FROM commander_synergies
            GROUP BY card_name
        """, conn)
    except Exception:
        pass

    merged = perf_df.merge(cards_df, left_on="card_name", right_on="name", how="inner")

    if merged.empty:
        print("No matching cards between performance and card database.", file=sys.stderr)
        return pd.DataFrame()

    if not synergy_df.empty:
        merged = merged.merge(synergy_df, on="card_name", how="left")
        merged["avg_synergy"] = merged["avg_synergy"].fillna(0)
        merged["avg_inclusion"] = merged["avg_inclusion"].fillna(0)
    else:
        merged["avg_synergy"] = 0.0
        merged["avg_inclusion"] = 0.0

    merged = _add_meta_features(merged, conn)
    merged = _add_match_ml_features(merged, conn)
    merged = _add_card_features(merged)

    return merged


def build_community_feature_matrix(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Build a feature matrix using community tournament data as the target.

    Target: archetype_win_rate from meta_card_stats (weighted avg win rate
    of archetypes containing each card).
    """
    try:
        meta_df = pd.read_sql_query("""
            SELECT card_name, meta_inclusion_rate, placement_weighted_score,
                   archetype_core_rate, avg_copies, num_decks_in, archetype_win_rate
            FROM meta_card_stats
            WHERE archetype_win_rate IS NOT NULL AND archetype_win_rate > 0
        """, conn)
    except Exception as e:
        print(f"No meta_card_stats data: {e}", file=sys.stderr)
        return pd.DataFrame()

    if meta_df.empty:
        print("No community data with archetype win rates.", file=sys.stderr)
        return pd.DataFrame()

    try:
        cards_df = pd.read_sql_query("""
            SELECT name, cmc, type_line, color_identity, edhrec_rank, oracle_text
            FROM cards
        """, conn)
    except Exception as e:
        print(f"Failed to read cards: {e}", file=sys.stderr)
        return pd.DataFrame()

    merged = meta_df.merge(cards_df, left_on="card_name", right_on="name", how="inner")

    if merged.empty:
        print("No matching cards between meta stats and card database.", file=sys.stderr)
        return pd.DataFrame()

    # Synergy data
    synergy_df = pd.DataFrame()
    try:
        synergy_df = pd.read_sql_query("""
            SELECT card_name, AVG(synergy_score) as avg_synergy,
                   AVG(inclusion_rate) as avg_inclusion
            FROM commander_synergies
            GROUP BY card_name
        """, conn)
    except Exception:
        pass

    if not synergy_df.empty:
        merged = merged.merge(synergy_df, on="card_name", how="left")
        merged["avg_synergy"] = merged["avg_synergy"].fillna(0)
        merged["avg_inclusion"] = merged["avg_inclusion"].fillna(0)
    else:
        merged["avg_synergy"] = 0.0
        merged["avg_inclusion"] = 0.0

    # Card performance (optional for community mode)
    perf_df = pd.DataFrame()
    try:
        perf_df = pd.read_sql_query("""
            SELECT card_name, games_played, rating
            FROM card_performance
        """, conn)
    except Exception:
        pass

    if not perf_df.empty:
        merged = merged.merge(perf_df, on="card_name", how="left")
        merged["games_played"] = merged["games_played"].fillna(0)
        merged["rating"] = merged["rating"].fillna(1500)
    else:
        merged["games_played"] = 0
        merged["rating"] = 1500.0

    # Feature engineering
    merged = _add_card_features(merged)
    merged["avg_copies_norm"] = merged["avg_copies"].fillna(0) / 4.0
    merged["meta_popularity"] = merged["num_decks_in"].fillna(0).apply(lambda x: np.log1p(x))

    # Target: archetype_win_rate
    merged["win_rate"] = merged["archetype_win_rate"]

    return merged


def train(conn: sqlite3.Connection, model_type: str, model_path: str,
          target_mode: str = "blended"):
    print(f"Training mode: {target_mode}")

    personal_df = pd.DataFrame()
    community_df = pd.DataFrame()

    if target_mode in ("personal", "blended"):
        print("Building personal feature matrix...")
        personal_df = build_feature_matrix(conn)
        if not personal_df.empty:
            print(f"  Personal data: {len(personal_df)} rows")
        else:
            print("  No personal data available")

    if target_mode in ("community", "blended"):
        print("Building community feature matrix...")
        community_df = build_community_feature_matrix(conn)
        if not community_df.empty:
            print(f"  Community data: {len(community_df)} rows")
        else:
            print("  No community data available")

    # Combine based on target mode
    if target_mode == "personal":
        df = personal_df
    elif target_mode == "community":
        df = community_df
    elif target_mode == "blended":
        frames = []
        if not personal_df.empty:
            personal_df["_weight"] = 0.6
            frames.append(personal_df)
        if not community_df.empty:
            community_df["_weight"] = 0.4
            frames.append(community_df)
        if frames:
            df = pd.concat(frames, ignore_index=True)
        else:
            df = pd.DataFrame()
    else:
        df = pd.DataFrame()

    if df.empty or len(df) < 10:
        print(f"Not enough training data ({len(df)} rows). Need at least 10.", file=sys.stderr)
        sys.exit(1)

    print(f"Training on {len(df)} total rows")

    # Ensure all feature columns exist
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0

    X = df[FEATURE_COLS].fillna(0).values
    y = df[TARGET_COL].values

    # Sample weights for blended mode
    sample_weight = df["_weight"].values if "_weight" in df.columns else None

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    if model_type == "gbm":
        model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        )
    else:
        model = Ridge(alpha=1.0)

    # Cross-validate (without sample weights for simplicity)
    cv_scores = cross_val_score(model, X_scaled, y, cv=min(5, len(df)), scoring="r2")
    print(f"Cross-validation R² scores: {cv_scores}")
    print(f"Mean R²: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    # Train on full data with sample weights
    model.fit(X_scaled, y, sample_weight=sample_weight)

    # Save model + scaler + feature names
    artifact = {
        "model": model,
        "scaler": scaler,
        "feature_cols": FEATURE_COLS,
        "model_type": model_type,
        "target_mode": target_mode,
        "trained_at": datetime.now().isoformat(),
        "training_rows": len(df),
        "cv_r2_mean": float(cv_scores.mean()),
    }
    joblib.dump(artifact, model_path)
    print(f"Model saved to {model_path}")

    # Feature importance for GBM
    if model_type == "gbm":
        importances = sorted(
            zip(FEATURE_COLS, model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
        print("\nFeature importances:")
        for feat, imp in importances:
            print(f"  {feat:25s} {imp:.4f}")


def main():
    parser = argparse.ArgumentParser(description="Train card recommendation model")
    parser.add_argument("--db", default=DB_DEFAULT, help="Path to SQLite database")
    parser.add_argument("--model", choices=["gbm", "ridge"], default="gbm",
                        help="Model type: gbm (Gradient Boosting) or ridge (Ridge regression)")
    parser.add_argument("--output", default=MODEL_DEFAULT, help="Path to save model")
    parser.add_argument("--target", choices=["personal", "community", "blended"],
                        default="blended",
                        help="Training target: personal (Arena W-L), community (archetype WR), "
                             "blended (both, default)")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    # When --output not explicitly provided, save model alongside the DB
    if args.output == MODEL_DEFAULT:
        db_dir = os.path.dirname(db_path)
        model_path = os.path.join(db_dir, "card_model.joblib")
    else:
        model_path = os.path.abspath(args.output)

    conn = get_conn(db_path)
    train(conn, args.model, model_path, args.target)
    conn.close()


if __name__ == "__main__":
    main()
