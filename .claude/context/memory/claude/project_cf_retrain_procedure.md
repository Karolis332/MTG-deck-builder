---
name: CF API Forced Retrain Procedure
description: How to force-retrain the CF SVD model on VPS, bypass the 50K-deck threshold, and avoid false-positive "stuck container" diagnoses
type: project
originSessionId: 46440798-1138-4e65-a9f0-3d914803e99a
---
# Forced Retrain — Black Grimoire CF API

## When to force-retrain
Nightly pipeline (`/opt/grimoire-cf-api/run-pipeline.sh`, cron 0,4 UTC) skips SVD training unless **≥ 50K new decks** since last train. To bypass, run `train_only` script directly.

## Command
```bash
ssh -i ~/.ssh/id_ed25519_geo_vps root@187.77.110.100
cd /opt/grimoire-cf-api
nohup docker compose -f docker-compose.prod.yml run --rm --name grimoire-retrain-forced api \
  python -m scripts.train_only \
  > /var/log/grimoire-retrain-forced-$(date +%s).log 2>&1 &
```

- `docker compose run` spawns a **fresh container with 4GB memory limit** (compose-defined) — NOT the throttled api-1 (2GB work-hours / 3GB off-hours from resource scheduler).
- Safe to run during work hours (5-16 UTC). Does not contend with api-1 memory.
- Runs SVD only — skips scrape, popularity recompute. VW bandit also re-bootstraps later via normal pipeline tick.

## Duration & resources (1.6M deck baseline, 2026-05-14)
- **56 min** end-to-end (3377s)
- **33 partitions** trained (mono/dual/tri/4-color/5-color/colorless)
- 30K-deck sampling cap per partition for OOM prevention (in `cf_engine.py`)
- Total decks processed: ~766K (after caps)
- Largest artifacts: BRG 37MB, WBG 30MB, WG 27MB
- New `model_artifacts` rows overwrite old `full_model` rows on commit

## Verification
- `curl http://187.77.110.100/cf-api/health` → check `last_retrained` ISO timestamp
- `model_version` string is **static** (`v33p-loaded`) — do NOT use it to confirm retrain; trust `last_retrained` instead
- api-1 hot-loads new artifacts from postgres without restart

## CRITICAL: False-positive "stuck container"
A `grimoire-cf-api-api-run-XXXXX` container showing up for 20-30+ hours is **NOT stuck**. It's the `nightly_pipeline` daemon spawned by cron that sleeps 6h between cycles (`time.sleep(21600)`).

**Why:** `run-pipeline.sh` has a guard that skips spawning a new daemon if any `api-run-*` is already running — so the same container persists across cron ticks.

**How to verify alive vs zombie:**
```bash
docker logs grimoire-cf-api-api-run-XXXXX --tail 5
# Look for "Sleeping 6h until next pipeline run..." → healthy
# Look for traceback / no recent logs → actually stuck
```

Do NOT kill the long-running `api-run-*` container on sight.
