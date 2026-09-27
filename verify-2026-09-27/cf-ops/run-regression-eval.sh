#!/bin/bash
# Grimoire CF API — weekly regression eval (fixed partitions, comparable night-to-night)
# Replaces: the monthly run-full-eval.sh cron entry (guard always saw the sleeping daemon's
# api-run-* container and SKIPped every month) and the dead nightly eval in run-pipeline.sh
# (only ran after exit 0, which the daemon -- an infinite sleep loop -- never returns).
# See F2/F4, verify-2026-09-27/cf-model/review.md.
#
# Guard: skip only while the daemon is mid-cycle (scraping/training), not merely "a container
# exists" -- a sleeping daemon keeps its api-run-* container alive for its whole 6h sleep, so
# an existence guard always skips. Phase is read from the daemon's own start/complete log
# markers, across the live log AND the most recent logrotate copytruncate rotation (weekly
# rotation empties the live file, so markers from a cycle that started before rotation would
# otherwise be invisible).
#
# Cron (Wed 03:00-04:59 UTC, retried every 15m so the margin check gets a weekly hit instead
# of only ~45-50% of weeks): */15 3-4 * * 3 /opt/grimoire-cf-api/ops/run-regression-eval.sh
# A stamp file (STAMP below) makes every slot after the first successful one in an ISO week
# a no-op.

LOG=/var/log/grimoire-eval.log
COMPOSE_DIR=/opt/grimoire-cf-api
PIPELOG=/var/log/grimoire-pipeline.log
EVAL_CTR=grimoire-cf-api-api-run-regeval
EVAL_TIMEOUT=5400          # 90m
EVAL_MARGIN_SEC=900        # 15m, mirrors force-svd-retrain.sh's 2h45m-of-6h margin logic
PIPELINE_INTERVAL_HOURS=6  # app/workers/nightly_pipeline.py:36 PIPELINE_INTERVAL_HOURS
MIN_MEM_AVAILABLE_KB=$((5 * 1024 * 1024))  # 5G, host has 15G total
STAMP_DIR=/var/lib/grimoire
STAMP="$STAMP_DIR/regeval-$(date -u +%G-W%V).done"
set -a; source "$COMPOSE_DIR/.env" 2>/dev/null; set +a

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [EVAL] $1" >> "$LOG"; }
notify() {
  [ -z "$TELEGRAM_BOT_TOKEN" ] && return 0
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"$1\",\"parse_mode\":\"HTML\"}" >/dev/null 2>&1
}

cd "$COMPOSE_DIR" || { log "ERROR: cannot cd to $COMPOSE_DIR"; exit 1; }

# Stamp: this ISO week already got a successful eval (written only on rc 0 below) -- every
# later cron slot in the retry window is a no-op.
if [ -f "$STAMP" ]; then
  log "SKIP: already ran successfully this week ($STAMP exists)"
  exit 0
fi

# last_start/last_complete: most recent marker of each kind, across the rotated (.1) log and
# the live log, OLDEST FIRST so 'tail -1' returns the truly latest marker regardless of which
# file it landed in. (Reading live-then-rotated would return a stale .1 marker whenever .1
# has one and the live file doesn't -- the rotated file may only fill a gap, never supersede
# a newer live marker.) Same "cut -d',' -f1" timestamp extraction as force-svd-retrain.sh.
last_start=$(cat "$PIPELOG".1 "$PIPELOG" 2>/dev/null | grep -F '=== Nightly Pipeline Starting ===' | tail -1 | cut -d',' -f1)
last_complete=$(cat "$PIPELOG".1 "$PIPELOG" 2>/dev/null | grep -F '=== Pipeline complete in' | tail -1 | cut -d',' -f1)

# No markers in either log: every daemon spawn writes a start marker at least daily, so this
# means the log itself cannot tell us the phase -- fall back to container existence rather
# than proceeding blind (a live daemon mid-cycle with a log we can't read would otherwise
# collide with the eval).
if [ -z "$last_start" ] && [ -z "$last_complete" ]; then
  runs=$(docker ps --filter 'name=grimoire-cf-api-api-run-' -q | wc -l)
  if [ "$runs" -gt 0 ]; then
    log "SKIP: no log markers but $runs api-run-* container(s) present — daemon phase unknown"
    notify "⚠️ Grimoire regression eval skipped: no pipeline log markers but a daemon container is running (phase unknown)."
    exit 0
  fi
  log "no log markers and no daemon container — proceeding (daemon never ran)"
fi

# Mid-cycle iff there IS a start marker and it is newer than (or there is no) complete marker.
if [ -n "$last_start" ] && { [ -z "$last_complete" ] || [[ "$last_start" > "$last_complete" ]]; }; then
  log "SKIP: daemon mid-cycle (last_start=$last_start last_complete=$last_complete) — not starting regression eval"
  exit 0
fi

# Margin: don't start if the eval (worst case EVAL_TIMEOUT + EVAL_MARGIN_SEC) would still be
# running when the next sleep cycle is due to start (last_complete + PIPELINE_INTERVAL_HOURS).
# No last_complete at all (daemon never ran / no history) => nothing to collide with, proceed.
if [ -n "$last_complete" ]; then
  complete_ts=$(date -u -d "$last_complete" +%s 2>/dev/null || echo 0)
  now_ts=$(date -u +%s)
  next_cycle_ts=$((complete_ts + PIPELINE_INTERVAL_HOURS * 3600))
  finish_by_ts=$((now_ts + EVAL_TIMEOUT + EVAL_MARGIN_SEC))
  if [ "$complete_ts" -gt 0 ] && [ "$finish_by_ts" -gt "$next_cycle_ts" ]; then
    log "SKIP: eval would still be running at the next cycle (finish_by=$(date -u -d @$finish_by_ts '+%F %T') next_cycle=$(date -u -d @$next_cycle_ts '+%F %T'))"
    exit 0
  fi
fi

# Memory: leave headroom for the sleeping daemon's api-1 + postgres containers.
mem_avail_kb=$(awk '/MemAvailable:/{print $2}' /proc/meminfo 2>/dev/null || echo 0)
if [ "$mem_avail_kb" -lt "$MIN_MEM_AVAILABLE_KB" ]; then
  log "SKIP: MemAvailable ${mem_avail_kb}kB < ${MIN_MEM_AVAILABLE_KB}kB — not starting regression eval"
  exit 0
fi

log "Starting regression eval (WBRG,UBRG,WUBR,WUBG, seed 42)..."
START=$(date +%s)
docker rm -f "$EVAL_CTR" >/dev/null 2>&1 || true  # clear any orphan from a prior killed run
if timeout -k 60 "$EVAL_TIMEOUT" docker compose -f docker-compose.prod.yml run --rm --no-deps --name "$EVAL_CTR" api \
     python scripts/evaluate.py --partition WBRG,UBRG,WUBR,WUBG --k 10,20,30 --seed 42 --save >> "$LOG" 2>&1; then
  DUR=$(( ($(date +%s) - START) / 60 ))
  log "Regression eval complete in ${DUR}m — saved to evaluation_results"
  mkdir -p "$STAMP_DIR" && touch "$STAMP"
  notify "📊 <b>Grimoire regression eval complete</b> (${DUR}m)
🕐 $(date '+%Y-%m-%d %H:%M UTC')"
else
  log "ERROR: regression eval failed or timed out"
  notify "🚨 <b>Grimoire regression eval FAILED</b> — check /var/log/grimoire-eval.log"
  docker rm -f "$EVAL_CTR" >/dev/null 2>&1 || true  # timeout kills the compose client, not always the container
  exit 1
fi
docker rm -f "$EVAL_CTR" >/dev/null 2>&1 || true
