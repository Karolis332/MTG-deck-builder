#!/usr/bin/env python3
"""
Daily VPS + Grimoire data health check.

Gathers system + service signals, asks the LLM to flag anomalies,
posts a concise judgment to Telegram. Runs at 09:00 UTC via cron.
"""
from __future__ import annotations

import datetime as dt
import json
import sqlite3
import sys

sys.path.insert(0, "/opt/grimoire-routines")
from routines_lib import call_llm, have_llm, http, send_telegram, sh

SYSTEM = """You are a senior SRE reviewing daily health signals from a single-VPS production stack.

Stack: 8GB Hostinger VPS (Ubuntu 24.04) hosting:
- geo-scraper (PM2 Node.js web crawler, port 3000)
- telegram-bot (PM2)
- mebyface-monitor (PM2)
- grimoire-cf-api (Docker: api+postgres+redis, MTG recommendation engine, ~1M decks, port 8000)
- n8n (Docker, via nginx /n8n/), gotenberg (Docker)
- Netdata + Uptime Kuma (newly installed)
- Nightly pipeline cron at 00:00/04:00 UTC retrains the CF model
- cf-resource-scheduler.sh adjusts container memory limits hourly

OUTPUT RULES (strict):
- Max 12 lines total.
- Line 1: one of "<b>✅ ALL CLEAR</b>" / "<b>⚠️ WATCH</b>" / "<b>🚨 ALERT</b>".
- Lines 2-N: bullets prefixed with "• ", each <90 chars.
- For ALERT/WATCH: last line = one concrete suggested fix command in <code>...</code>.
- Telegram-safe HTML only (<b>, <i>, <code>). No markdown, no code fences."""


def collect_signals() -> dict:
    s: dict = {"timestamp_utc": dt.datetime.now(dt.UTC).isoformat(timespec="seconds")}
    s["uptime"] = sh("uptime")
    s["mem"] = sh("free -h | head -2")
    s["disk"] = sh("df -h / | tail -1")

    pm2_raw = sh("pm2 jlist")
    try:
        pm2_data = json.loads(pm2_raw)
        s["pm2"] = [
            {
                "name": p.get("name"),
                "status": p.get("pm2_env", {}).get("status"),
                "restarts": p.get("pm2_env", {}).get("restart_time"),
                "mem_mb": round(p.get("monit", {}).get("memory", 0) / 1024 / 1024, 1),
            }
            for p in pm2_data
        ]
    except Exception as e:
        s["pm2"] = f"ERR parsing pm2 jlist: {e}"

    s["docker_ps"] = sh("docker ps --format '{{.Names}} {{.Status}}'")
    s["docker_restarts"] = sh(
        "for c in $(docker ps --format '{{.Names}}'); do "
        "echo \"$c restarts=$(docker inspect $c --format '{{.RestartCount}}') "
        "oom=$(docker inspect $c --format '{{.State.OOMKilled}}')\"; done"
    )
    s["cf_api_health"] = http("http://127.0.0.1:8000/health")
    s["cf_api_stats"] = http("http://127.0.0.1:8000/stats")
    s["pipeline_log_tail"] = sh("tail -n 60 /var/log/grimoire-pipeline.log 2>/dev/null")
    s["pipeline_last_success"] = sh(
        "grep 'completed successfully' /var/log/grimoire-pipeline.log | tail -1"
    )
    s["oom_kills_24h"] = sh(
        "journalctl --since '24h ago' -k 2>/dev/null | grep -ic 'out of memory' || echo 0"
    )
    netdata_alarms = http("http://127.0.0.1:19999/api/v1/alarms?active=true")
    try:
        s["netdata_active_alarms"] = json.loads(netdata_alarms).get("alarms", {})
    except Exception:
        s["netdata_active_alarms"] = netdata_alarms[:500]

    try:
        con = sqlite3.connect("/var/lib/geo-scraper/geo-scraper.db")
        cur = con.cursor()
        cur.execute(
            "SELECT status, COUNT(*) FROM jobs "
            "WHERE created_at > datetime('now','-1 day') GROUP BY status"
        )
        s["geo_scraper_jobs_24h"] = dict(cur.fetchall())
        cur.execute("SELECT COUNT(*) FROM schedules WHERE enabled=1")
        s["geo_scraper_active_schedules"] = cur.fetchone()[0]
        cur.execute(
            "SELECT COUNT(*) FROM schedules "
            "WHERE enabled=1 AND next_run_at < datetime('now')"
        )
        s["geo_scraper_overdue_schedules"] = cur.fetchone()[0]
        con.close()
    except Exception as e:
        s["geo_scraper_jobs_24h"] = f"ERR: {e}"

    return s


def main() -> None:
    if not have_llm():
        print("no LLM provider — skipping")
        return

    signals = collect_signals()
    payload = json.dumps(signals, indent=2, default=str)[:25000]
    verdict, in_tok, out_tok = call_llm(
        SYSTEM, f"Signals at {signals['timestamp_utc']} UTC:\n\n{payload}"
    )
    print(verdict)
    send_telegram("📊 Daily Health Check", verdict, in_tok, out_tok)


if __name__ == "__main__":
    main()
