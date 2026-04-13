#!/usr/bin/env python3
"""
PR9: Full data pipeline orchestrator.

Runs the complete refresh cycle:
  1. MTGJSON fetch (subtypes + arena IDs)
  2. EDHREC commander synergy enrichment
  3. EDHREC article scraping
  4. MTGGoldfish article scraping
  5. MTGGoldfish metagame scraping
  6. MTGTop8 tournament scraping
  7. Arena log parsing
  8. Match aggregation
  9. Community meta aggregation
  10. Meta analysis (pandas)
  11. Model training (scikit-learn, 26 features)
  12. Personalized suggestions generation

Each step is optional and can be skipped via flags. Steps that fail
are logged but don't block subsequent steps.

Usage:
    python scripts/pipeline.py                  # run all steps
    python scripts/pipeline.py --skip-mtgjson   # skip MTGJSON fetch
    python scripts/pipeline.py --skip-scrape    # skip both metagame scrapers
    python scripts/pipeline.py --skip-articles  # skip article scrapers
    python scripts/pipeline.py --only train     # run only model training
    python scripts/pipeline.py --dry-run        # show what would run
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
DB_PATH = os.path.join(PROJECT_DIR, "data", "mtg-deck-builder.db")
MODEL_PATH = os.path.join(PROJECT_DIR, "data", "card_model.joblib")

# Per-attempt retry config: up to MAX_RETRIES attempts, with RETRY_BACKOFF seconds between
MAX_RETRIES = 3
RETRY_BACKOFF = [15, 30]  # wait 15s after 1st fail, 30s after 2nd — then give up

# Steps where scraper failures are non-critical (data just won't be fresh)
OPTIONAL_STEPS = {"goldfish", "mtgtop8", "edhrec_articles", "goldfish_articles",
                  "spellbook", "topdeck", "mtga_cards", "mtgjson", "edhrec",
                  "edhrec_avg", "cf_sync"}


STEPS = [
    {
        "name": "mtga_cards",
        "label": "MTGA Local Card Data Import (grpId resolution)",
        "script": "import_mtga_cards.py",
        "args": [],
    },
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
        "name": "edhrec_articles",
        "label": "EDHREC Article Scraping",
        "script": "scrape_edhrec_articles.py",
        "args": ["--max-articles", "100"],
    },
    {
        "name": "spellbook",
        "label": "Commander Spellbook Combo Scraping",
        "script": "scrape_commander_spellbook.py",
        "args": [],
    },
    {
        "name": "goldfish_articles",
        "label": "MTGGoldfish Article Scraping",
        "script": "scrape_mtggoldfish_articles.py",
        "args": ["--max-pages", "5", "--max-articles", "100"],
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
        "name": "topdeck",
        "label": "TopDeck.gg Tournament Scraping",
        "script": "scrape_topdeck.py",
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
        "name": "commander_stats",
        "label": "Per-Commander Card Stats Aggregation",
        "script": "aggregate_commander_stats.py",
        "args": [],
    },
    {
        "name": "edhrec_avg",
        "label": "EDHREC Average Decklists Fetch",
        "script": "fetch_avg_decklists.py",
        "args": ["--from-cf-stats", "--min-decks", "20"],
    },
    {
        "name": "cf_sync",
        "label": "CF API Commander Stats Sync (VPS -> Local)",
        "script": "sync_commander_stats.py",
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
        "label": "Model Training (scikit-learn, 26 features)",
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


def _attempt_step(step: dict, db_path: str) -> tuple[bool, str]:
    """Single attempt at running a step. Returns (success, error_summary)."""
    script_path = os.path.join(SCRIPTS_DIR, step["script"])
    if not os.path.exists(script_path):
        return False, f"{step['script']} not found"

    cmd = [sys.executable, script_path, "--db", db_path] + step["args"]
    step_timeout = 900 if step["name"] in (
        "goldfish", "mtgtop8", "edhrec_articles", "goldfish_articles", "spellbook", "topdeck",
        "commander_stats", "edhrec_avg", "cf_sync"
    ) else 300

    start = time.time()
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=step_timeout, cwd=PROJECT_DIR
        )
        elapsed = time.time() - start
        if result.returncode == 0:
            output_lines = result.stdout.strip().split("\n")
            for line in output_lines[-3:]:
                print(f"    {line}")
            print(f"  OK ({elapsed:.1f}s)")
            return True, ""
        else:
            err_lines = result.stderr.strip().split("\n")[-5:] if result.stderr else []
            err_summary = " | ".join(err_lines)
            print(f"  FAILED (exit {result.returncode}, {elapsed:.1f}s)")
            for line in err_lines:
                print(f"    ERR: {line}")
            return False, err_summary
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT (exceeded {step_timeout}s)")
        return False, f"timeout after {step_timeout}s"
    except Exception as e:
        print(f"  ERROR: {e}")
        return False, str(e)


def run_step(step: dict, db_path: str, dry_run: bool = False) -> bool:
    """Run a step with up to MAX_RETRIES attempts and exponential backoff."""
    if not os.path.exists(os.path.join(SCRIPTS_DIR, step["script"])):
        print(f"  SKIP: {step['script']} not found")
        return False

    if dry_run:
        cmd = [sys.executable, os.path.join(SCRIPTS_DIR, step["script"]), "--db", db_path] + step["args"]
        print(f"  DRY RUN: {' '.join(cmd)}")
        return True

    for attempt in range(1, MAX_RETRIES + 1):
        if attempt > 1:
            wait = RETRY_BACKOFF[min(attempt - 2, len(RETRY_BACKOFF) - 1)]
            print(f"  Retry {attempt}/{MAX_RETRIES} in {wait}s...")
            time.sleep(wait)
        print(f"  Running: {step['script']} {' '.join(step['args'])}"
              + (f" [attempt {attempt}/{MAX_RETRIES}]" if attempt > 1 else ""))
        success, _ = _attempt_step(step, db_path)
        if success:
            return True

    print(f"  All {MAX_RETRIES} attempts failed for '{step['name']}'")
    return False


def _get_telegram_creds() -> tuple[str, str]:
    """Read Telegram credentials from env vars, falling back to app_state DB."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if token and chat_id:
        return token, chat_id
    try:
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        row_t = conn.execute("SELECT value FROM app_state WHERE key = 'telegram_bot_token'").fetchone()
        row_c = conn.execute("SELECT value FROM app_state WHERE key = 'telegram_chat_id'").fetchone()
        conn.close()
        return (row_t[0] if row_t else "", row_c[0] if row_c else "")
    except Exception:
        return "", ""


def _tg_api(method: str, payload: dict) -> dict:
    """Call a Telegram Bot API method. Returns parsed JSON response."""
    token, _ = _get_telegram_creds()
    if not token:
        return {}
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/{method}",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
    except Exception as e:
        print(f"  [telegram] {method} failed: {e}")
        return {}


def send_telegram(message: str, buttons: list | None = None) -> int | None:
    """Send a Telegram message with optional inline keyboard. Returns message_id."""
    _, chat_id = _get_telegram_creds()
    if not chat_id:
        return None
    payload: dict = {"chat_id": chat_id, "text": message, "parse_mode": "HTML"}
    if buttons:
        payload["reply_markup"] = {"inline_keyboard": buttons}
    result = _tg_api("sendMessage", payload)
    return result.get("result", {}).get("message_id")


def edit_telegram(message_id: int, text: str, buttons: list | None = None):
    """Edit an existing Telegram message."""
    _, chat_id = _get_telegram_creds()
    if not chat_id or not message_id:
        return
    payload: dict = {"chat_id": chat_id, "message_id": message_id,
                     "text": text, "parse_mode": "HTML"}
    if buttons:
        payload["reply_markup"] = {"inline_keyboard": buttons}
    _tg_api("editMessageText", payload)


class TelegramReporter:
    """Live-updating Telegram message for pipeline progress."""

    ICON = {"success": "+", "failed": "X", "skipped": "-", "running": "~", "pending": "."}

    def __init__(self, steps: list[dict], notify: bool = True):
        self.steps = steps
        self.notify = notify
        self.results: dict[str, str] = {}  # step_name -> status
        self.msg_id: int | None = None
        self.start_time = time.time()
        # Track active step names (ones that will actually run)
        self._active: list[str] = []

    def set_active_steps(self, names: list[str]):
        self._active = names
        for n in names:
            self.results[n] = "pending"

    def start(self):
        if not self.notify:
            return
        self.msg_id = send_telegram(self._build_text("running"))

    def step_started(self, name: str):
        self.results[name] = "running"
        if self.notify and self.msg_id:
            edit_telegram(self.msg_id, self._build_text("running"))

    def step_done(self, name: str, status: str):
        self.results[name] = status
        if self.notify and self.msg_id:
            edit_telegram(self.msg_id, self._build_text("running"))

    def finish(self):
        if not self.notify:
            return
        elapsed = time.time() - self.start_time
        failed = [n for n, s in self.results.items() if s == "failed"]
        ok = [n for n, s in self.results.items() if s == "success"]

        buttons = [
            [{"text": "DB Stats", "callback_data": "pipe_stats"},
             {"text": "Failures", "callback_data": "pipe_failures"}],
            [{"text": "View Decks", "callback_data": "pipe_decks"},
             {"text": "Re-run Pipeline", "callback_data": "pipe_rerun"}],
        ]
        if failed:
            buttons.append([{"text": "Reset Degraded Steps", "callback_data": "pipe_reset"}])

        header = "PIPELINE FAILED" if failed else "PIPELINE OK"
        summary = f"<b>{header}</b> | {len(ok)}/{len(self.results)} passed | {elapsed:.0f}s"
        text = summary + "\n\n" + self._step_list()

        if self.msg_id:
            edit_telegram(self.msg_id, text, buttons)
        else:
            send_telegram(text, buttons)

    def _build_text(self, phase: str) -> str:
        elapsed = time.time() - self.start_time
        header = f"<b>Pipeline running...</b> ({elapsed:.0f}s)"
        return header + "\n\n" + self._step_list()

    def _step_list(self) -> str:
        lines = []
        for name in self._active:
            status = self.results.get(name, "pending")
            icon = self.ICON.get(status, "?")
            label = name
            for s in self.steps:
                if s["name"] == name:
                    label = s["label"]
                    break
            lines.append(f"[{icon}] {label}")
        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="MTG Deck Builder data pipeline")
    parser.add_argument("--db", default=DB_PATH, help="Path to SQLite database")
    parser.add_argument("--dry-run", action="store_true", help="Show commands without running")
    parser.add_argument("--skip-mtgjson", action="store_true", help="Skip MTGJSON fetch")
    parser.add_argument("--skip-edhrec", action="store_true", help="Skip EDHREC enrichment")
    parser.add_argument("--skip-scrape", action="store_true", help="Skip MTGGoldfish + MTGTop8 scraping")
    parser.add_argument("--skip-tournaments", action="store_true",
                        help="Pass --no-tournaments to MTGGoldfish scraper")
    parser.add_argument("--skip-articles", action="store_true",
                        help="Skip EDHREC + MTGGoldfish article scraping")
    parser.add_argument("--skip-spellbook", action="store_true", help="Skip Commander Spellbook scraping")
    parser.add_argument("--skip-topdeck", action="store_true", help="Skip TopDeck.gg scraping")
    parser.add_argument("--skip-arena", action="store_true", help="Skip Arena log parsing")
    parser.add_argument("--skip-train", action="store_true", help="Skip model training")
    parser.add_argument("--only", choices=[s["name"] for s in STEPS],
                        help="Run only this step")
    parser.add_argument("--no-notify", action="store_true",
                        help="Suppress Telegram notifications")
    parser.add_argument("--force-degraded", action="store_true",
                        help="Run steps even if they are in degraded/skip mode")
    parser.add_argument("--reset-step", metavar="STEP",
                        help="Clear degraded state for a step and exit")
    args = parser.parse_args()

    # Import state tracker (optional — won't crash if file missing)
    try:
        sys.path.insert(0, SCRIPTS_DIR)
        from pipeline_state import PipelineState
        state = PipelineState()
    except Exception as e:
        print(f"[warn] pipeline_state not available: {e}")
        state = None

    # Handle --reset-step
    if args.reset_step:
        if state:
            state.reset_step(args.reset_step)
            print(f"Reset complete. '{args.reset_step}' will run normally next cycle.")
        else:
            print("State tracker unavailable.")
        return

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
    if args.skip_articles:
        skip_set.add("edhrec_articles")
        skip_set.add("goldfish_articles")
    if args.skip_spellbook:
        skip_set.add("spellbook")
    if args.skip_topdeck:
        skip_set.add("topdeck")
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
    if state:
        summary = state.summary()
        if summary["degraded"]:
            print(f"DEGRADED (will skip): {', '.join(summary['degraded'])}")
        if summary["at_risk"]:
            print(f"AT RISK (2+ failures): {', '.join(summary['at_risk'])}")
    print("=" * 60)

    # Determine which steps will run
    active_steps = []
    for step in STEPS:
        name = step["name"]
        if args.only and name != args.only:
            continue
        active_steps.append(name)

    notify = not args.no_notify and not args.dry_run
    reporter = TelegramReporter(STEPS, notify=notify)
    reporter.set_active_steps(active_steps)
    reporter.start()

    results = {}
    total_start = time.time()

    for step in STEPS:
        name = step["name"]

        if args.only and name != args.only:
            continue

        if name in skip_set:
            print(f"\n[SKIP] {step['label']}")
            results[name] = "skipped"
            reporter.step_done(name, "skipped")
            continue

        # Degraded-mode check: skip optional steps that keep failing
        if state and not args.force_degraded and name in OPTIONAL_STEPS:
            if state.is_degraded(name):
                results[name] = "skipped"
                reporter.step_done(name, "skipped")
                continue

        # Skip predict if train failed or was skipped
        if name == "predict" and results.get("train") != "success":
            model_path = os.path.join(os.path.dirname(db_path), "card_model.joblib")
            if not os.path.exists(model_path) and not os.path.exists(MODEL_PATH):
                print(f"\n[SKIP] {step['label']} (no trained model)")
                results[name] = "skipped"
                reporter.step_done(name, "skipped")
                continue

        print(f"\n[{name.upper()}] {step['label']}")
        reporter.step_started(name)
        success = run_step(step, db_path, args.dry_run)
        status = "success" if success else "failed"
        results[name] = status
        reporter.step_done(name, status)

        # Update persistent failure state
        if state and not args.dry_run:
            if success:
                state.record_success(name)
            else:
                state.record_failure(name)

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

    # Final Telegram summary with buttons
    reporter.finish()

    # Exit with error if any critical step failed
    failed_steps = [n for n, v in results.items() if v == "failed"]
    if failed_steps:
        sys.exit(1)


if __name__ == "__main__":
    main()
