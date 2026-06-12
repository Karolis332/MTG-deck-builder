#!/usr/bin/env python3
"""Fit scoring-component weights against scraped-deck community consensus.

Reads data/training/deck-eval-*.jsonl produced by generate-training-data.ts
(rows with inPool=1 carry the engine's additive score-component breakdown),
fits a logistic regression P(community plays card | components), and emits
calibrated per-component multipliers for the engine.

Leakage note: the `cmdrStats` component is derived from the same
commander_card_stats table as the label, so it is EXCLUDED from the fit and
pinned at weight 1.0. The fit calibrates the *content-based* signals
(edhrec, theme, profileSynergy, mechanicFit, ...) — exactly the ones that
carry cold-start commanders with thin scraped data.

Usage:
    py scripts/fit_scoring_weights.py            # fit + report only
    py scripts/fit_scoring_weights.py --apply    # also install weights to the
                                                 # production data dir
"""

from __future__ import annotations

import argparse
import glob
import json
import os
from collections import defaultdict
from datetime import date

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupShuffleSplit

TRAIN_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "training")

# All components the engine snapshots; cmdrStats is label-adjacent → pinned.
COMPONENTS = [
    "ml", "cf", "edhrec", "globalRank", "tribal", "theme", "profileSynergy",
    "typePenalty", "stormFit", "mechanicFit", "strategyFit", "powerTier",
    "metaStats", "collection", "qualityFloor",
]
PINNED = {"cmdrStats": 1.0}
LABEL_THRESHOLD = 0.10  # community "plays it" = inclusion >= 10%
CLAMP_LO, CLAMP_HI = 0.25, 2.5
REFERENCE = "edhrec"  # trusted signal anchored at weight 1.0


def load_rows() -> list[dict]:
    rows: list[dict] = []
    for path in sorted(glob.glob(os.path.join(TRAIN_DIR, "deck-eval-*.jsonl"))):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                if row.get("inPool") == 1 and row.get("comp") is not None and row.get("category") != "land":
                    rows.append(row)
    return rows


def front_face(name: str) -> str:
    return name.split(" // ")[0].strip().lower()


def load_vps_labels() -> dict[tuple[str, str], float]:
    """Full-distribution inclusion rates from the VPS scraped-deck corpus.

    Replaces the local commander_card_stats label, which is censored at the
    top-300 cards per commander and punishes signals that surface legitimate
    picks outside that window.
    """
    import csv as csv_mod

    path = os.path.join(TRAIN_DIR, "vps-inclusion.csv")
    labels: dict[tuple[str, str], float] = {}
    if not os.path.exists(path):
        return labels
    with open(path, encoding="utf-8") as fh:
        for rec in csv_mod.DictReader(fh):
            key = (rec["commander_name"].strip().lower(), front_face(rec["card_name"]))
            labels[key] = max(labels.get(key, 0.0), float(rec["inclusion"]))
    return labels


def prod_data_dir() -> str:
    appdata = os.environ.get("APPDATA")
    if appdata:
        d = os.path.join(appdata, "the-black-grimoire", "data")
        if os.path.isdir(d):
            return d
    return os.path.join(os.path.dirname(__file__), "..", "data")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="install weights to production data dir")
    args = parser.parse_args()

    rows = load_rows()
    if len(rows) < 500:
        raise SystemExit(f"Only {len(rows)} usable rows — generate more data first.")

    vps_labels = load_vps_labels()
    if vps_labels:
        print(f"VPS labels: {len(vps_labels)} (commander, card) inclusion rates")

    def label_of(r: dict) -> float:
        if vps_labels:
            return vps_labels.get((r["commander"].strip().lower(), front_face(r["card"])), 0.0)
        return float(r["inclusionRate"])

    X = np.array([[float(r["comp"].get(c, 0.0)) for c in COMPONENTS] for r in rows])
    y = np.array([1 if label_of(r) >= LABEL_THRESHOLD else 0 for r in rows])
    groups = np.array([r["commander"] for r in rows])

    print(f"rows={len(rows)} commanders={len(set(groups))} positives={y.mean():.3f} "
          f"labelSource={'vps' if vps_labels else 'local-top300'}")

    # Group-aware holdout: no commander appears in both train and test.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups))

    model = LogisticRegression(max_iter=2000, class_weight="balanced", C=1.0)
    model.fit(X[train_idx], y[train_idx])

    auc_test = roc_auc_score(y[test_idx], model.predict_proba(X[test_idx])[:, 1])
    auc_train = roc_auc_score(y[train_idx], model.predict_proba(X[train_idx])[:, 1])
    print(f"AUC train={auc_train:.3f} test={auc_test:.3f}")

    coefs = dict(zip(COMPONENTS, model.coef_[0]))

    # Per-component diagnostics: mean value among community-played vs not.
    diag: dict[str, tuple[float, float, float]] = {}
    for i, c in enumerate(COMPONENTS):
        col = X[:, i]
        diag[c] = (float(col[y == 1].mean()), float(col[y == 0].mean()), float((col != 0).mean()))

    ref_coef = coefs.get(REFERENCE, 0.0)
    if ref_coef <= 0:
        # Reference signal must be positively predictive; fall back to the
        # median positive coefficient.
        positives = [v for v in coefs.values() if v > 0]
        ref_coef = float(np.median(positives)) if positives else 1.0

    # Banded mapping: only move weights where the evidence is non-trivial.
    # r = coef relative to the reference positive signal. Near-zero r (noise)
    # and dormant components keep the hand-tuned 1.0.
    weights: dict[str, float] = dict(PINNED)
    for c in COMPONENTS:
        _, _, nonzero_share = diag[c]
        if nonzero_share < 0.01:
            weights[c] = 1.0
            continue
        r = coefs[c] / ref_coef
        if r <= -1.0:
            w = CLAMP_LO
        elif r <= -0.25:
            w = 0.5
        elif r < 0.25:
            w = 1.0
        else:
            w = min(CLAMP_HI, max(1.0, r))
        weights[c] = round(w, 3)

    out = {
        "version": 1,
        "trainedAt": date.today().isoformat(),
        "labelThreshold": LABEL_THRESHOLD,
        "aucTest": round(float(auc_test), 4),
        "rows": len(rows),
        "commanders": len(set(groups)),
        "reference": REFERENCE,
        "weights": weights,
    }

    report_path = os.path.join(TRAIN_DIR, f"fit-report-{date.today().isoformat()}.md")
    with open(report_path, "w", encoding="utf-8") as fh:
        fh.write(f"# Scoring-weight fit — {date.today().isoformat()}\n\n")
        fh.write(f"rows={len(rows)} commanders={len(set(groups))} positives={y.mean():.3f} "
                 f"AUC(test, group-split)={auc_test:.3f}\n\n")
        fh.write("| component | coef (logit/pt) | weight | mean@played | mean@unplayed | nonzero share |\n")
        fh.write("|---|---|---|---|---|---|\n")
        for c in COMPONENTS:
            m1, m0, nz = diag[c]
            fh.write(f"| {c} | {coefs[c]:+.4f} | {weights[c]} | {m1:.1f} | {m0:.1f} | {nz:.2f} |\n")
        fh.write(f"| cmdrStats | (pinned) | 1.0 | — | — | — |\n")

    repo_weights = os.path.join(TRAIN_DIR, "scoring-weights.json")
    with open(repo_weights, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)
    print(f"report: {report_path}")
    print(f"weights: {repo_weights}")

    for c in COMPONENTS:
        print(f"  {c:>15} coef={coefs[c]:+.4f} -> w={weights[c]}")

    if args.apply:
        target = os.path.join(prod_data_dir(), "scoring-weights.json")
        with open(target, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=2)
        print(f"APPLIED -> {target}")


if __name__ == "__main__":
    main()
