---
name: Black Grimoire production topology
description: Where production data and models actually live. Production is on the VPS Docker stack, NOT Railway. Railway is a dormant dev environment.
type: reference
originSessionId: b1adb513-96b4-491a-a685-834c91d4d2bd
---
**Production CF API + data lives on VPS (187.77.110.100), not Railway.**

VPS Docker stack at `/opt/grimoire-cf-api/`:
- `grimoire-cf-api-api-1` — FastAPI on port 8000, serves `/cf-api/...` via nginx reverse proxy
- `grimoire-cf-api-postgres-1` — Production Postgres, **1.18M decks, ~125K card_popularity, ML model artifacts**
- `grimoire-cf-api-redis-1` — Cache
- `uptime-kuma` — Self-hosted monitoring on `127.0.0.1:3001`

Cron jobs (in `crontab -l` on VPS root):
- `00:00, 04:00 UTC daily` → `/opt/grimoire-cf-api/run-pipeline.sh` — nightly retrain
- `*/5 min` → `/opt/grimoire-scraper-watchdog.sh` — auto-restart on failure
- `09:00 UTC daily` → `/opt/grimoire-routines/check_daily_health.py` — LLM-powered health Telegram alert
- `Sunday 10:00 UTC` → `check_weekly_model.py` — model freshness audit
- `Sunday 02:00 UTC` → `/opt/grimoire-pg-backup.sh` — pg_dump → `/opt/grimoire-backups/` (added 2026-05-04)

Resource scheduler at `/opt/cf-resource-scheduler.sh` runs hourly:
- Work hours (5–16 UTC): API capped at 2GB RAM / 0.7 CPU (was 1.5GB — bumped 2026-05-04 to fix OOM)
- Off hours: API gets 3GB RAM / 1.5 CPU for retraining
- n8n + gotenberg stopped during work hours to save ~165MB

Live API auth: `x-api-key` header, key in `C:\Users\QuLeR\grimoire-cf-api\.env` `API_KEY=...`. Endpoint POST `http://187.77.110.100/cf-api/recommend` body `{cards:[], commander:str, limit:int}`.

**Railway environment (`nurturing-radiance` project)** is a dev/staging deployment that's been mostly dormant. Original Postgres has 10.5K test decks (vs prod 1.18M), grimoire-cf-api service offline since Feb 26 (healthcheck failure that's already fixed in current repo code — just needs redeploy). Not load-bearing for production.
