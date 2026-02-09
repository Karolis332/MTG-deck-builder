#!/usr/bin/env python3
"""
PR9: Full data pipeline orchestrator.

Runs the complete refresh cycle:
  1. MTGJSON fetch (subtypes + arena IDs)
  2. EDHREC commander synergy enrichment
  3. MTGGoldfish metagame scraping
  4. MTGTop8 tournament scraping
  5. Arena log parsing
  6. Match aggregation
  7. Community meta aggregation
  8. Meta analysis (pandas)
  9. Model training (scikit-learn, 24 features)
  10. Personalized suggestions generation

Each step is optional and can be skipped via flags. Steps that fail
are logged but don't block subsequent steps.

Usage:
    python scripts/pipeline.py                  # run all steps
    python scripts/pipeline.py --skip-mtgjson   # skip MTGJSON fetch
    python scripts/pipeline.py --skip-scrape    # skip both scrapers
    python scripts/pipeline.py --only train     # run only model training
    python scripts/pipeline.py --dry-run        # show what would run
"""

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
DB_PATH = os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")
MODEL_PATH = os.path.join(PROJECT_DIR, "data", "card_model.joblib")


STEPS = [
    {
        "name": "mtgjson",
        "label": "MTGJSON Fetch (subtypes + arena IDs)",
        "script": "fetch_mtgjson.py",
        "args": [],
    },
    {
        "name": "edhrec",
        "label": "EDHREC Commander Synergy Enrichment",
        "script": "enrich_commander_synergies.py",
        "args": ["--from-decks"],
    },
    {
        "name": "goldfish",
        "label": "MTGGoldfish Metagame + Tournament Scraping",
        "script": "scrape_mtggoldfish.py",
        "args": [],
    },
    {
        "name": "mtgtop8",
        "label": "MTGTop8 Tournament Scraping",
        "script": "scrape_mtgtop8.py",
        "args": [],
    },
    {
        "name": "arena",
        "label": "Arena Log Parsing",
        "script": "arena_log_parser.py",
        "args": [],
    },
    {
        "name": "aggregate",
        "label": "Match Aggregation",
        "script": "aggregate_matches.py",
        "args": [],
    },
    {
        "name": "meta_aggregate",
        "label": "Community Meta Aggregation",
        "script": "aggregate_community_meta.py",
        "args": [],
    },
    {
        "name": "analyze",
        "label": "Pandas Meta Analysis",
        "script": "analyze_meta.py",
        "args": [],
    },
    {
        "name": "train",
        "label": "Model Training (scikit-learn, 25 features)",
        "script": "train_model.py",
        "args": ["--model", "gbm", "--target", "blended"],
    },
    {
        "name": "predict",
        "label": "Personalized Suggestions",
        "script": "predict_suggestions.py",
        "args": ["--all-decks"],
    },
]


def run_step(step: dict, db_path: str, dry_run: bool = False) -> bool:
    """Run a single pipeline step. Returns True on success."""
    script_path = os.path.join(SCRIPTS_DIR, step["script"])

    if not os.path.exists(script_path):
        print(f"  SKIP: {step['script']} not found")
        return False

    cmd = [sys.executable, script_path, "--db", db_path] + step["args"]

    if dry_run:
        print(f"  DRY RUN: {' '.join(cmd)}")
        return True

    print(f"  Running: {step['script']} {' '.join(step['args'])}")
    start = time.time()

    try:
        # Scrapers need longer timeout due to rate-limited HTTP requests
        step_timeout = 900 if step["name"] in ("goldfish", "mtgtop8") else 300

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=step_timeout,
            cwd=PROJECT_DIR,
        )
        elapsed = time.time() - start

        if result.returncode == 0:
            # Show last few lines of stdout
            output_lines = result.stdout.strip().split("\n")
            for line in output_lines[-3:]:
                print(f"    {line}")
            print(f"  OK ({elapsed:.1f}s)")
            return True
        else:
            print(f"  FAILED (exit code {result.returncode}, {elapsed:.1f}s)")
            if result.stderr:
                for line in result.stderr.strip().split("\n")[-5:]:
                    print(f"    ERR: {line}")
            return False

    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT (exceeded 300s)")
        return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="MTG Deck Builder data pipeline")
    parser.add_argument("--db", default=DB_PATH, help="Path to SQLite database")
    parser.add_argument("--dry-run", action="store_true", help="Show commands without running")
    parser.add_argument("--skip-mtgjson", action="store_true", help="Skip MTGJSON fetch")
    parser.add_argument("--skip-edhrec", action="store_true", help="Skip EDHREC enrichment")
    parser.add_argument("--skip-scrape", action="store_true", help="Skip MTGGoldfish + MTGTop8 scraping")
    parser.add_argument("--skip-tournaments", action="store_true",
                        help="Pass --no-tournaments to MTGGoldfish scraper")
    parser.add_argument("--skip-arena", action="store_true", help="Skip Arena log parsing")
    parser.add_argument("--skip-train", action="store_true", help="Skip model training")
    parser.add_argument("--only", choices=[s["name"] for s in STEPS],
                        help="Run only this step")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)

    skip_set = set()
    if args.skip_mtgjson:
        skip_set.add("mtgjson")
    if args.skip_edhrec:
        skip_set.add("edhrec")
    if args.skip_scrape:
        skip_set.add("goldfish")
        skip_set.add("mtgtop8")
        skip_set.add("meta_aggregate")
    if args.skip_arena:
        skip_set.add("arena")
    if args.skip_train:
        skip_set.add("train")
        skip_set.add("predict")

    # Pass --no-tournaments to goldfish scraper if requested
    if args.skip_tournaments:
        for step in STEPS:
            if step["name"] == "goldfish":
                step["args"] = step["args"] + ["--no-tournaments"]

    print("=" * 60)
    print(f"MTG Deck Builder Pipeline")
    print(f"Database: {db_path}")
    print(f"Started:  {datetime.now().isoformat()}")
    if args.dry_run:
        print("MODE: DRY RUN")
    print("=" * 60)

    results = {}
    total_start = time.time()

    for step in STEPS:
        name = step["name"]

        if args.only and name != args.only:
            continue

        if name in skip_set:
            print(f"\n[SKIP] {step['label']}")
            results[name] = "skipped"
            continue

        # Skip predict if train failed or was skipped
        if name == "predict" and results.get("train") != "success":
            if not os.path.exists(MODEL_PATH):
                print(f"\n[SKIP] {step['label']} (no trained model)")
                results[name] = "skipped"
                continue

        print(f"\n[{name.upper()}] {step['label']}")
        success = run_step(step, db_path, args.dry_run)
        results[name] = "success" if success else "failed"

    total_elapsed = time.time() - total_start

    # Summary
    print("\n" + "=" * 60)
    print("Pipeline Summary")
    print("=" * 60)
    for step in STEPS:
        name = step["name"]
        if name not in results:
            continue
        status = results[name]
        icon = {"success": "OK", "failed": "FAIL", "skipped": "SKIP"}[status]
        print(f"  [{icon:4s}] {step['label']}")
    print(f"\nTotal time: {total_elapsed:.1f}s")
    print(f"Finished:   {datetime.now().isoformat()}")

    # Exit with error if any step failed
    if any(v == "failed" for v in results.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()
