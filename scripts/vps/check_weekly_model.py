#!/usr/bin/env python3
"""
Weekly CF model review (Sunday 10:00 UTC).

Pulls model state from CF API + recent training artifacts + deck count trend,
asks the LLM whether the model is healthy, drifting, or needs intervention.
"""
from __future__ import annotations

import json
import sys

sys.path.insert(0, "/opt/grimoire-routines")
from routines_lib import call_llm, have_llm, http, send_telegram, sh

SYSTEM = """You are an ML engineer reviewing a weekly health snapshot of a
collaborative-filtering MTG recommendation model in production.

Inputs you'll receive:
- /health and /stats from the CF API (deck count, model_version, last_retrained, vw_model timestamps).
- Recent pipeline log lines.
- Deck count growth over the past week (if available).
- Container memory + restart counts.

Judge: is the model healthy, drifting, or needs intervention?

Output (Telegram HTML, max 12 lines):
- Line 1: "<b>✅ MODEL HEALTHY</b>" / "<b>⚠️ DRIFT WATCH</b>" / "<b>🚨 ACTION NEEDED</b>".
- 4-7 bullets (• prefix, <90 chars each). Cover: deck growth rate, retrain freshness, VW activity, mem stability.
- Final line: one concrete next-action suggestion. <code>...</code> for any commands.
- No preamble, no markdown."""


def main() -> None:
    if not have_llm():
        print("no LLM provider — skipping")
        return

    signals = {
        "cf_health": http("http://127.0.0.1:8000/health"),
        "cf_stats": http("http://127.0.0.1:8000/stats"),
        "pipeline_recent_outcomes": sh(
            "grep -E 'completed successfully|CRITICAL|exit code' "
            "/var/log/grimoire-pipeline.log | tail -20"
        ),
        "container_status": sh(
            "for c in $(docker ps --format '{{.Names}}' | grep grimoire-cf-api); do "
            "echo \"$c restarts=$(docker inspect $c --format '{{.RestartCount}}') "
            "oom=$(docker inspect $c --format '{{.State.OOMKilled}}') \"; done"
        ),
        "container_mem": sh(
            "docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.MemPerc}}' "
            "| grep grimoire-cf-api"
        ),
        "uptime": sh("uptime"),
    }

    payload = json.dumps(signals, indent=2, default=str)[:18000]
    verdict, in_tok, out_tok = call_llm(
        SYSTEM, f"Weekly model snapshot:\n\n{payload}", max_tokens=600
    )
    print(verdict)
    send_telegram("📈 Weekly Model Review", verdict, in_tok, out_tok)


if __name__ == "__main__":
    main()
