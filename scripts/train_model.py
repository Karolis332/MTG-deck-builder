#!/usr/bin/env python3
"""
PR8: Train a card recommendation model using scikit-learn.

Uses card features (CMC, type, synergy, personal win rate, EDHREC data)
plus user's match history to train a Ridge regression or Gradient Boosting
model that predicts card performance scores.

The trained model is serialized to data/card_model.joblib.

Usage:
    python scripts/train_model.py [--db data/mtg-deck-builder.db] [--model gbm|ridge]
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


def build_feature_matrix(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Build a feature matrix from cards that have appeared in decks with match history.

    Features per card:
    - cmc: converted mana cost
    - is_creature, is_instant, is_sorcery, is_artifact, is_enchantment, is_land
    - color_count: number of colors in color_identity
    - has_W, has_U, has_B, has_R, has_G: binary color flags
    - edhrec_rank_norm: normalized edhrec rank (lower = better, 0-1)
    - synergy_score: from commander_synergies if available
    - inclusion_rate: from commander_synergies if available
    - games_played: from card_performance
    - personal_win_rate: from card_performance
    - rating: ELO from card_performance

    Target: win rate when played (from card_performance, or from match_logs)
    """
    # Get card_performance data as the training signal
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
        print("No card performance data with >= 2 games.", file=sys.stderr)
        return pd.DataFrame()

    # Get card features
    try:
        cards_df = pd.read_sql_query("""
            SELECT name, cmc, type_line, color_identity, edhrec_rank, oracle_text
            FROM cards
        """, conn)
    except Exception as e:
        print(f"Failed to read cards: {e}", file=sys.stderr)
        return pd.DataFrame()

    # Get synergy data if available
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

    # Merge performance with card features
    merged = perf_df.merge(cards_df, left_on="card_name", right_on="name", how="inner")

    if merged.empty:
        print("No matching cards between performance and card database.", file=sys.stderr)
        return pd.DataFrame()

    # Merge synergy data
    if not synergy_df.empty:
        merged = merged.merge(synergy_df, left_on="card_name", right_on="card_name", how="left")
        merged["avg_synergy"] = merged["avg_synergy"].fillna(0)
        merged["avg_inclusion"] = merged["avg_inclusion"].fillna(0)
    else:
        merged["avg_synergy"] = 0.0
        merged["avg_inclusion"] = 0.0

    # Feature engineering
    merged["is_creature"] = merged["type_line"].str.contains("Creature", na=False).astype(int)
    merged["is_instant"] = merged["type_line"].str.contains("Instant", na=False).astype(int)
    merged["is_sorcery"] = merged["type_line"].str.contains("Sorcery", na=False).astype(int)
    merged["is_artifact"] = merged["type_line"].str.contains("Artifact", na=False).astype(int)
    merged["is_enchantment"] = merged["type_line"].str.contains("Enchantment", na=False).astype(int)
    merged["is_land"] = merged["type_line"].str.contains("Land", na=False).astype(int)

    def count_colors(ci):
        if not ci or ci == "[]":
            return 0
        return sum(1 for c in ["W", "U", "B", "R", "G"] if c in str(ci))

    merged["color_count"] = merged["color_identity"].apply(count_colors)
    for c in ["W", "U", "B", "R", "G"]:
        merged[f"has_{c}"] = merged["color_identity"].apply(
            lambda ci, col=c: 1 if col in str(ci or "") else 0
        )

    # Normalize edhrec_rank: lower rank is better, scale to 0-1
    max_rank = merged["edhrec_rank"].max()
    if pd.notna(max_rank) and max_rank > 0:
        merged["edhrec_rank_norm"] = 1 - (merged["edhrec_rank"].fillna(max_rank) / max_rank)
    else:
        merged["edhrec_rank_norm"] = 0.5

    # Oracle text length as a rough complexity proxy
    merged["text_length"] = merged["oracle_text"].fillna("").str.len() / 500.0

    return merged


FEATURE_COLS = [
    "cmc", "is_creature", "is_instant", "is_sorcery", "is_artifact",
    "is_enchantment", "is_land", "color_count", "has_W", "has_U",
    "has_B", "has_R", "has_G", "edhrec_rank_norm", "avg_synergy",
    "avg_inclusion", "games_played", "rating", "text_length",
]

TARGET_COL = "win_rate"


def train(conn: sqlite3.Connection, model_type: str, model_path: str):
    print("Building feature matrix...")
    df = build_feature_matrix(conn)

    if df.empty or len(df) < 10:
        print(f"Not enough training data ({len(df)} rows). Need at least 10.", file=sys.stderr)
        sys.exit(1)

    print(f"Training on {len(df)} card-performance rows")

    X = df[FEATURE_COLS].fillna(0).values
    y = df[TARGET_COL].values

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

    # Cross-validate
    cv_scores = cross_val_score(model, X_scaled, y, cv=min(5, len(df)), scoring="r2")
    print(f"Cross-validation R² scores: {cv_scores}")
    print(f"Mean R²: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    # Train on full data
    model.fit(X_scaled, y)

    # Save model + scaler + feature names
    artifact = {
        "model": model,
        "scaler": scaler,
        "feature_cols": FEATURE_COLS,
        "model_type": model_type,
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
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = get_conn(db_path)
    train(conn, args.model, os.path.abspath(args.output))
    conn.close()


if __name__ == "__main__":
    main()
