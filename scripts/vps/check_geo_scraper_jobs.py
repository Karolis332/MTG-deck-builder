#!/usr/bin/env python3
"""
Geo-scraper job triage (daily 08:00 UTC).

Reads geo-scraper.db for failed/stuck/long jobs over the last 7 days,
clusters by error pattern, asks the LLM to suggest filter rules or fixes.
"""
from __future__ import annotations

import json
import sqlite3
import sys

sys.path.insert(0, "/opt/grimoire-routines")
from routines_lib import call_llm, have_llm, send_telegram, sh

DB = "/var/lib/geo-scraper/geo-scraper.db"

SYSTEM = """You are reviewing geo-scraper job outcomes from a Lithuanian web-crawler
(Crawlee + Cheerio) that scans websites for GEO/SEO/AI-discoverability files
(/.well-known/*, llms.txt, ai.txt, etc.) and produces audit reports.

Inputs:
- Job counts by status over the last 7 days.
- Failed jobs: domain, error message snippet.
- Stuck jobs (in 'running' or 'pending' for >30 min).
- Recent error log tail from /var/log/geo-scraper-error.log.

Cluster failures by root cause and suggest concrete fixes (URL filters,
content-type filters, retry policy, robots.txt handling). Don't explain what
the scraper is — owner already knows.

Output (Telegram HTML, max 14 lines):
- Line 1: "<b>✅ GEO-SCRAPER CLEAN</b>" / "<b>⚠️ ISSUES DETECTED</b>".
- Bullets per failure cluster (• prefix), e.g. "• 14 failures: .doc files served as application/msword".
- Final line(s): suggested fixes as <code>...</code> or short imperatives.
- No preamble, no markdown."""


def query_db() -> dict:
    out: dict = {}
    try:
        con = sqlite3.connect(DB)
        cur = con.cursor()
        cur.execute(
            "SELECT status, COUNT(*) FROM jobs "
            "WHERE created_at > datetime('now','-7 days') GROUP BY status"
        )
        out["jobs_by_status_7d"] = dict(cur.fetchall())

        cur.execute(
            "SELECT domain, error FROM jobs "
            "WHERE status='failed' AND created_at > datetime('now','-7 days') "
            "ORDER BY created_at DESC LIMIT 30"
        )
        out["recent_failures"] = [
            {"domain": d, "error": (e or "")[:300]} for d, e in cur.fetchall()
        ]

        cur.execute(
            "SELECT id, domain, status, created_at FROM jobs "
            "WHERE status IN ('running','pending') "
            "AND created_at < datetime('now','-30 minutes') "
            "ORDER BY created_at DESC LIMIT 10"
        )
        out["stuck_jobs"] = [
            {"id": i, "domain": d, "status": s, "created_at": c}
            for i, d, s, c in cur.fetchall()
        ]

        cur.execute(
            "SELECT domain, COUNT(*) FROM jobs "
            "WHERE status='failed' AND created_at > datetime('now','-7 days') "
            "GROUP BY domain ORDER BY 2 DESC LIMIT 10"
        )
        out["top_failing_domains"] = [
            {"domain": d, "fails": n} for d, n in cur.fetchall()
        ]
        con.close()
    except Exception as e:
        out["db_error"] = str(e)
    return out


def main() -> None:
    if not have_llm():
        print("no LLM provider — skipping")
        return

    signals = query_db()
    signals["error_log_tail"] = sh(
        "tail -n 80 /var/log/geo-scraper-error.log 2>/dev/null", timeout=5
    )

    payload = json.dumps(signals, indent=2, default=str)[:18000]
    verdict, in_tok, out_tok = call_llm(
        SYSTEM, f"Geo-scraper signals (7d):\n\n{payload}", max_tokens=700
    )
    print(verdict)
    send_telegram("🕷️ Geo-Scraper Triage", verdict, in_tok, out_tok)


if __name__ == "__main__":
    main()
