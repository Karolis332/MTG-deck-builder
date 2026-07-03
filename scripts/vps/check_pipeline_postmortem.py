#!/usr/bin/env python3
"""
Pipeline post-mortem: invoked from run-pipeline.sh after every pipeline run.

Usage: check_pipeline_postmortem.py <exit_code> <attempts>

Reads the most recent pipeline log entries, asks the LLM to explain what
happened (success: was it clean? did anything regress? failure: root cause +
suggested fix), posts to Telegram.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, "/opt/grimoire-routines")
from routines_lib import call_llm, have_llm, send_telegram, sh

LOG = "/var/log/grimoire-pipeline.log"
SYSTEM = """You are an SRE doing a post-mortem of a CF model retrain pipeline run.

Stack: Docker compose pipeline that scrapes Moxfield/Archidekt, aggregates into
postgres, retrains a CF (collaborative filtering) MTG deck recommender.

Output format (Telegram-safe HTML, max 10 lines):
- Line 1: "<b>✅ SUCCESS</b>" or "<b>❌ FAILURE</b>" — depending on exit code given.
- 2-4 bullets summarizing what happened (use • prefix).
- For failures: bullet "<b>Root cause:</b> ..." + final line = one suggested shell command in <code>...</code>.
- For successes: include any noteworthy regressions (slow steps, fewer decks scraped than usual).
- No preamble. No markdown. <b>, <i>, <code> only."""


def main() -> None:
    exit_code = sys.argv[1] if len(sys.argv) > 1 else "?"
    attempts = sys.argv[2] if len(sys.argv) > 2 else "?"

    if not have_llm():
        print("no LLM provider — skipping")
        return

    log_tail = sh(f"tail -n 200 {LOG}", timeout=5)
    last_attempt_block = sh(
        f"grep -n 'Pipeline attempt' {LOG} | tail -3", timeout=5
    )

    user_msg = (
        f"Exit code: {exit_code}\n"
        f"Attempts used: {attempts}\n"
        f"Last attempt markers in log:\n{last_attempt_block}\n\n"
        f"=== last 200 log lines ===\n{log_tail[-15000:]}"
    )

    verdict, in_tok, out_tok = call_llm(SYSTEM, user_msg, max_tokens=500)
    print(verdict)
    title = "🔧 Pipeline Post-Mortem"
    send_telegram(title, verdict, in_tok, out_tok)


if __name__ == "__main__":
    main()
