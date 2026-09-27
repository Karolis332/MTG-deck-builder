---
name: VPS OOM pipeline fix (2026-05-04)
description: Pipeline was crashing exit 137 due to api container memory cap too tight. Bumped caps in cf-resource-scheduler.sh and docker-compose.prod.yml.
type: project
originSessionId: b1adb513-96b4-491a-a685-834c91d4d2bd
---
**Problem:** Nightly pipeline on VPS crashed with exit 137 (OOM) at the matrix-build step (80K decks × 33K cards). 9 OOM kills, 19 container restarts. Daily Telegram health check was alerting, but root cause unaddressed for ~5+ days.

**Why:** `cf-resource-scheduler.sh` was capping `grimoire-cf-api-api-1` at 1.5GB RAM during work hours. Model artifacts alone are 825MB, so request handling + model + retrain all competing for ~700MB → OOM under load. Compose file `memory: 512M` was also too low for `docker compose run` retrain spawns.

**Fix applied 2026-05-04:**
- `cf-resource-scheduler.sh` work-hours: api 1500m → **2000m**, postgres 384m → 512m. Backup at `.bak.20260504`
- `docker-compose.prod.yml` api `memory: 512M → 2G`. Backup at `.bak.20260504`
- Live `docker update` applied to running containers
- Manual pipeline re-triggered, ran successfully past previous OOM point (matrix build)

**How to apply:**
- If pipeline crashes exit 137 again, check `docker stats --no-stream` for the api container — if at >90% of cap, bump cap further in scheduler script and live-apply with `docker update --memory=Xm grimoire-cf-api-api-1`.
- VPS has 7.8GB RAM, 2GB swap. Plenty of headroom — current usage ~3.4GB. Off-hours cap can go higher than 3GB if needed for ML training.
- Deeper concern: api-1 itself sits at ~98% of cap even idle. Suggests memory leak or oversized in-process caches. Restart api container after each model retrain to clear.
