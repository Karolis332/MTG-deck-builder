#!/bin/bash
# Unattended, self-verifying, self-rolling-back forced off-hours CF SVD retrain.
# DRY_RUN=1 ./force-svd-retrain.sh   -> runs window check (reported, not waited on) + pre-flight
#                                        + baseline snapshot only; skips backup/train/restart.
set -euo pipefail

cd /opt/grimoire-cf-api
LOG=/var/log/grimoire-pipeline-manual.log
LOCK=/var/lock/cf-svd-force.lock
MANUAL_DIR=/opt/grimoire-backups/manual
COMPOSE="docker compose -f docker-compose.prod.yml"
API_URL=http://127.0.0.1:8000
# Round-2 fix (M1): the .py no longer re-runs the popularity loop (the preceding daemon
# cycle already did), so training is back to ~2h (last real run 1h59) instead of 3-4h.
# The 6h-cadence margin (complete + 6h - 2h45m) is kept as originally sized for that ~2h
# job + restart/verify overhead. HARD_DEADLINE moved out to 2026-09-25 01:00 UTC (lead
# decision) so a late-completing daemon cycle tonight still gets one more chance at a
# window before giving up, instead of hard-stopping at 21:30.
HARD_DEADLINE="2026-09-28 01:00:00"   # UTC, matches server clock (verified UTC)
DRY_RUN="${DRY_RUN:-0}"

exec 9>"$LOCK"
flock -n 9 || exit 0

log() { echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') $*" | tee -a "$LOG"; }

# shellcheck disable=SC1091
set -a; source /opt/grimoire-cf-api/.env; set +a

# H3 fix: JSON content-type (curl -d defaults to form-urlencoded, Telegram then can't
# read chat_id and 400s silently under the swallowed stderr); plain text, not HTML,
# so a stray "->"/"<"/"&" in a status message can't trip parse_mode escaping; --max-time
# so a Telegram outage can't hang the unit.
notify() {
  NOTIFIED=1
  curl -s --max-time 20 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"$1\"}" \
    >/dev/null 2>&1 || true
}

# M3 fix (round 3): NOTIFIED, set by notify() itself, guards the EXIT trap so a path
# that already notified and exited non-zero does not notify a second time. Only an
# unhandled failure (errexit inside a function, a failing $() nothing else caught) that
# never called notify() reaches this.
on_exit() {
  local rc=$?
  if [ "$rc" -ne 0 ] && [ -z "${NOTIFIED:-}" ]; then
    notify "cf-svd-force-retrain FAILED rc=$rc — check $LOG"
  fi
}
trap on_exit EXIT

log "=== force-svd-retrain.sh starting (DRY_RUN=$DRY_RUN) ==="

# ---------- 1. window gate ----------
window_ok() {
  local hour; hour=$(date -u +%H)
  # off-hours: hour >= 16 or hour < 5
  if ! { [ "$hour" -ge 16 ] || [ "$hour" -lt 5 ]; }; then
    echo "off-hours: NO (hour=$hour UTC)"; return 1
  fi

  # 2026-09-27 additive: no pipeline daemon container at all (killed, retries exhausted) ->
  # the next spawn is the 22:00 UTC cron. Start only while >= 2h45m of room remains before it.
  local runs hhmm
  runs=$(docker ps --filter 'name=grimoire-cf-api-api-run-' -q | wc -l)
  if [ "$runs" -eq 0 ]; then
    hhmm=$(date -u +%H%M)
    if [ "$hhmm" -ge 1600 ] && [ "$hhmm" -le 1915 ]; then
      echo "window OK: no pipeline daemon running, hour=$hour UTC, >= 2h45m before the 22:00 cron"; return 0
    fi
    echo "daemon down: NO (outside 16:00-19:15 UTC, next spawn is the 22:00 cron)"; return 1
  fi

  local last_start last_complete
  last_start=$(grep -F '=== Nightly Pipeline Starting ===' /var/log/grimoire-pipeline.log | tail -1 | cut -d',' -f1)
  last_complete=$(grep -F '=== Pipeline complete in' /var/log/grimoire-pipeline.log | tail -1 | cut -d',' -f1)
  if [ -z "$last_complete" ]; then
    echo "daemon idle: NO (no completion marker found)"; return 1
  fi
  local start_ts complete_ts
  start_ts=$(date -u -d "$last_start" +%s 2>/dev/null || echo 0)
  complete_ts=$(date -u -d "$last_complete" +%s 2>/dev/null || echo 0)
  if [ "$complete_ts" -le "$start_ts" ]; then
    echo "daemon idle: NO (last start $last_start has no later complete)"; return 1
  fi

  local now_ts deadline_margin_ts
  now_ts=$(date -u +%s)
  # complete + 6h - 2h45m = complete + 3h15m
  deadline_margin_ts=$((complete_ts + 3*3600 + 15*60))
  if [ "$now_ts" -gt "$deadline_margin_ts" ]; then
    echo "margin: NO (now > last_complete + 6h - 2h45m; next cycle too close)"; return 1
  fi

  echo "window OK: hour=$hour UTC, last_complete=$last_complete, now safely before next cycle"
  return 0
}

hard_deadline_ts=$(date -u -d "$HARD_DEADLINE" +%s)
while true; do
  verdict=$(window_ok) && ok=0 || ok=1
  log "window check: $verdict"
  if [ "$ok" -eq 0 ]; then break; fi
  if [ "$DRY_RUN" = "1" ]; then
    log "DRY_RUN=1: window not open now, reporting verdict without waiting"
    break
  fi
  now_ts=$(date -u +%s)
  if [ "$now_ts" -ge "$hard_deadline_ts" ]; then
    log "hard deadline $HARD_DEADLINE UTC reached, no safe window opened"
    notify "forced SVD retrain skipped: no safe window"
    exit 0
  fi
  sleep 300
done

# ---------- 2. pre-flight ----------
preflight() {
  local run_count
  run_count=$(docker ps --filter 'name=grimoire-cf-api-api-run-' --format '{{.Names}}' | wc -l)
  log "pre-flight: running api-run containers = $run_count"
  # 2026-09-27 additive: 0 = daemon down; window_ok's 0-container branch bounded the start to
  # 16:00-19:15 UTC, so accept it and let the unchanged exactly-1 check below pass.
  if [ "$run_count" -eq 0 ]; then
    log "pre-flight: 0 api-run containers accepted (daemon down, start bounded before the 22:00 cron)"
    run_count=1
  fi
  if [ "$run_count" -ne 1 ]; then
    log "pre-flight FAIL: expected exactly 1 api-run container, found $run_count"
    return 1
  fi

  local pg_mem api_mem pg_pct api_pct
  pg_mem=$(docker stats --no-stream --format '{{.Name}} {{.MemPerc}}' | grep postgres || true)
  api_mem=$(docker stats --no-stream --format '{{.Name}} {{.MemPerc}}' | grep 'grimoire-cf-api-api-1' || true)
  log "pre-flight: mem usage -- postgres: [$pg_mem]  api-1: [$api_mem]"
  pg_pct=$(echo "$pg_mem" | awk '{print $2}' | tr -d '%')
  api_pct=$(echo "$api_mem" | awk '{print $2}' | tr -d '%')
  if [ -z "$pg_pct" ] || [ -z "$api_pct" ]; then
    log "pre-flight FAIL: could not read memory usage"
    return 1
  fi
  if (( $(echo "$pg_pct >= 90" | bc -l) )) || (( $(echo "$api_pct >= 90" | bc -l) )); then
    log "pre-flight FAIL: memory over 90% (postgres=$pg_pct%% api=$api_pct%%)"
    return 1
  fi

  local artifact_bytes artifact_gb free_kb free_gb need_gb
  artifact_bytes=$(docker exec grimoire-cf-api-postgres-1 psql -U grimoire -d grimoire_cf -tAc \
    "SELECT pg_total_relation_size('model_artifacts')")
  if [ -z "$artifact_bytes" ]; then
    log "pre-flight FAIL: could not read model_artifacts size"
    return 1
  fi
  artifact_gb=$(echo "scale=3; $artifact_bytes / 1073741824" | bc)
  free_kb=$(df --output=avail -k /opt | tail -1)
  free_gb=$(echo "scale=3; $free_kb / 1048576" | bc)
  need_gb=$(echo "scale=3; $artifact_gb * 3" | bc)
  if (( $(echo "$need_gb < 3" | bc -l) )); then need_gb=3; fi
  log "pre-flight: model_artifacts=${artifact_gb}GB, need >= ${need_gb}GB free on /opt, have ${free_gb}GB"
  if (( $(echo "$free_gb < $need_gb" | bc -l) )); then
    log "pre-flight FAIL: insufficient free disk on /opt"
    return 1
  fi

  log "pre-flight: PASS"
  return 0
}

if ! preflight; then
  notify "forced SVD retrain FAILED pre-flight — check $LOG"
  exit 1
fi

# ---------- 3. baseline snapshot ----------
TS=$(date -u +%Y%m%dT%H%M%SZ)
COMMANDERS=("Atraxa, Praetors' Voice" "The Ur-Dragon" "Edgar Markov" "Krenko, Mob Boss" "Kaalia of the Vast")

# H1: the baseline snapshot does NOT clear the cache first (informational only — it's a
# "what were users seeing before" record, cache or not). The post-reload smoke gate does
# clear the cache and rejects cached rows explicitly (see step 7) so it actually proves
# the new model is live.
snapshot_recs() {
  local outfile="$1"
  echo "[" > "$outfile"
  local first=1
  for cmd in "${COMMANDERS[@]}"; do
    [ "$first" -eq 1 ] || echo "," >> "$outfile"
    first=0
    local body
    body=$(jq -n --arg c "$cmd" '{cards: ["Sol Ring"], commander: $c, limit: 20}')
    curl -s --max-time 60 -X POST "$API_URL/recommend" -H "Content-Type: application/json" -H "x-api-key: $API_KEY" \
      -d "$body" >> "$outfile" || echo '{"error":"request_failed"}' >> "$outfile"
  done
  echo "]" >> "$outfile"
}

health_before=$(curl -s --max-time 60 "$API_URL/health")
log "baseline /health: $health_before"
recs_before="$MANUAL_DIR/recs-before-$TS.json"
snapshot_recs "$recs_before"
ok_count=$(jq '[.[] | select((.recommendations // []) | length >= 10)] | length' "$recs_before" 2>/dev/null || echo 0)
log "baseline snapshot: $recs_before, commanders with >=10 cards: $ok_count/5"

if [ "$DRY_RUN" = "1" ]; then
  log "DRY_RUN=1: stopping after pre-flight + baseline snapshot (no backup/train/restart)"
  exit 0
fi

# ---------- 4. backup ----------
DUMP_REMOTE="/tmp/cf-pretrain-$TS.dump"
DUMP_LOCAL="$MANUAL_DIR/cf-pretrain-$TS.dump"
if ! docker exec grimoire-cf-api-postgres-1 pg_dump -U grimoire -d grimoire_cf \
     -t model_artifacts -t training_log -Fc -f "$DUMP_REMOTE"; then
  log "backup FAIL: pg_dump failed"
  notify "forced SVD retrain FAILED: backup step (pg_dump) — no training attempted"
  exit 1
fi
docker cp "grimoire-cf-api-postgres-1:$DUMP_REMOTE" "$DUMP_LOCAL"
size=$(stat -c%s "$DUMP_LOCAL" 2>/dev/null || echo 0)
if [ "$size" -lt 1048576 ]; then
  log "backup FAIL: dump file $DUMP_LOCAL is ${size} bytes, expected > 1MB"
  notify "forced SVD retrain FAILED: backup dump too small — no training attempted"
  exit 1
fi
# L1 fix: capture pg_restore -l to a var first instead of piping straight into grep -q
# under pipefail (a SIGPIPE on early grep match would otherwise read as backup FAIL).
restore_listing=$(docker exec grimoire-cf-api-postgres-1 pg_restore -l "$DUMP_REMOTE")
if ! echo "$restore_listing" | grep -q model_artifacts || ! echo "$restore_listing" | grep -q training_log; then
  log "backup FAIL: pg_restore -l does not list both tables"
  notify "forced SVD retrain FAILED: backup verification — no training attempted"
  exit 1
fi
log "backup OK: $DUMP_LOCAL (${size} bytes), verified via pg_restore -l"
# L2 fix: drop the dump copy out of the postgres container's /tmp (~0.8GB) once it's
# safely copied to the host.
docker exec grimoire-cf-api-postgres-1 rm -f "$DUMP_REMOTE"

# H4 fix: pg_restore -t only restores TABLE + TABLE DATA, not the owned sequences/PKs/
# defaults -- a restore under -t leaves model_artifacts.id / training_log.id NOT NULL
# with no default, breaking every later INSERT permanently. The dump already contains
# only these two tables (-t model_artifacts -t training_log at dump time), so restoring
# it with no -t filter at all pulls everything in the dump, sequences included.
# --single-transaction so a failed restore can't leave the schema half-applied.
restore_from_backup() {
  local dump_host="$1"
  local dump_remote="/tmp/restore-$TS.dump"
  docker cp "$dump_host" "grimoire-cf-api-postgres-1:$dump_remote"
  local rc=0
  docker exec grimoire-cf-api-postgres-1 pg_restore -U grimoire -d grimoire_cf \
    --clean --if-exists --single-transaction "$dump_remote" || rc=$?
  docker exec grimoire-cf-api-postgres-1 rm -f "$dump_remote"
  return $rc
}

# M4/L6 fix: reload polling extracted so the rollback path reuses the same 30x10s wait
# instead of a single check after a flat sleep 15. docker restart (not compose restart)
# targets exactly the named long-lived container, removing any doubt about compose
# treating one-off `run` containers as part of the same service (L6, unverified either way).
wait_for_reload() {
  local baseline_retrained="$1"
  local ok=0 i
  for i in $(seq 1 30); do
    sleep 10
    if curl -s --max-time 60 -o /tmp/health_poll.json -w '%{http_code}' "$API_URL/health" | grep -q '^200$'; then
      local retrained; retrained=$(jq -r '.last_retrained' /tmp/health_poll.json)
      if [ "$retrained" != "$baseline_retrained" ] && [ "$retrained" != "null" ]; then
        ok=1
        break
      fi
    fi
  done
  echo "$ok"
}

# ---------- 5. train ----------
train_rc=0
$COMPOSE run -T --rm --no-deps api python - < ops/force_svd_retrain.py >> "$LOG" 2>&1 || train_rc=$?
log "train step exit code: $train_rc"

if [ "$train_rc" -eq 2 ]; then
  log "nothing trained (train_all returned empty)"
  notify "forced SVD retrain: nothing trained (no new data to train on)"
  exit 0
fi

if [ "$train_rc" -ne 0 ]; then
  artifact_count=$(docker exec grimoire-cf-api-postgres-1 psql -U grimoire -d grimoire_cf -tAc \
    "SELECT count(*) FROM model_artifacts WHERE artifact_type='full_model'")
  log "train FAILED (rc=$train_rc), current full_model artifact count=$artifact_count"
  if [ "$artifact_count" -eq 0 ]; then
    log "restoring backup before any restart (live API keeps its in-memory model either way)"
    restore_from_backup "$DUMP_LOCAL" || log "restore_from_backup FAILED — manual intervention needed"
  fi
  notify "forced SVD retrain FAILED (train step) — check $LOG. API not restarted, still serving prior model."
  exit 1
fi

# Parse RESULT line now (needed for the M2 model_version reload check below).
partitions=$(grep -oP 'RESULT partitions=\K[0-9]+' "$LOG" | tail -1)
decks=$(grep -oP 'RESULT partitions=[0-9]+ decks=\K[0-9]+' "$LOG" | tail -1)
duration=$(grep -oP 'duration_s=\K[0-9.]+' "$LOG" | tail -1)
log "trained: partitions=$partitions decks=$decks duration_s=$duration"

# ---------- 6. reload ----------
last_retrained_before=$(echo "$health_before" | jq -r '.last_retrained')
docker restart grimoire-cf-api-api-1
reload_ok=$(wait_for_reload "$last_retrained_before")
health_after_json=$(cat /tmp/health_poll.json 2>/dev/null || echo '{}')
model_version_after=$(echo "$health_after_json" | jq -r '.model_version // ""') || model_version_after=""
expected_model_version="v${partitions}p-loaded"
log "reload check: ok=$reload_ok, last_retrained before=$last_retrained_before after=$(echo "$health_after_json" | jq -r '.last_retrained'), model_version=$model_version_after (expected $expected_model_version)"

# M2 fix: last_retrained alone doesn't prove the new model loaded -- engine.model_version
# is only set to "v<n>p-loaded" inside load_models_from_db() on a successful load; a
# per-partition load failure is swallowed and still serves 200s. Require both.
if [ "$reload_ok" -ne 1 ] || [ "$model_version_after" != "$expected_model_version" ]; then
  reload_ok=0
fi

do_rollback() {
  local reason="$1"
  log "ROLLING BACK: $reason"
  local restore_ok=1
  restore_from_backup "$DUMP_LOCAL" || restore_ok=0
  docker restart grimoire-cf-api-api-1
  local rb_reload_ok; rb_reload_ok=$(wait_for_reload "__force_wait__")
  local rb_code
  rb_code=$(curl -s --max-time 60 -o /tmp/rb_health.json -w '%{http_code}' "$API_URL/health" || echo 000)
  docker exec grimoire-cf-api-postgres-1 psql -U grimoire -d grimoire_cf -qc "DELETE FROM cached_recommendations" || true
  local rb_recs="$MANUAL_DIR/recs-rollback-$TS.json"
  snapshot_recs "$rb_recs"
  local rb_ok_count
  rb_ok_count=$(jq '[.[] | select((.recommendations // []) | length >= 10)] | length' "$rb_recs" 2>/dev/null || echo 0)
  local verified="unverified"
  [ "$rb_code" = "200" ] && [ "$restore_ok" = "1" ] && [ "$rb_ok_count" = "5" ] && verified="verified"
  notify "forced SVD retrain: ROLLED BACK ($reason). Restore $verified. health=$rb_code smoke=$rb_ok_count/5"
}

if [ "$reload_ok" -ne 1 ]; then
  do_rollback "reload check failed (no 200 + newer last_retrained + matching model_version within 5 min)"
  exit 1
fi

# ---------- 7. smoke gate ----------
# H1 fix: clear cached_recommendations before smoke so the gate can't pass on stale
# pre-retrain rows still keyed by the same 5 deck hashes (product decision, per lead:
# whole-table delete is what makes the new model visible to users -- old-model recs
# would otherwise keep serving for up to stale_cache_days=7). Gate also rejects any row
# that still came back marked cached, so a cache race can't silently pass.
docker exec grimoire-cf-api-postgres-1 psql -U grimoire -d grimoire_cf -qc "DELETE FROM cached_recommendations" || true

recs_after="$MANUAL_DIR/recs-after-$TS.json"
snapshot_recs "$recs_after"
after_ok=$(jq '[.[] | select((.color_identity != "cached") and ((.recommendations // []) | length >= 10))] | length' "$recs_after" 2>/dev/null || echo 0)
log "smoke gate: $after_ok/5 commanders returned >=10 cards, not from cache"

if [ "$after_ok" != "5" ]; then
  do_rollback "smoke gate failed ($after_ok/5 passed, non-cached)"
  exit 1
fi

# H2 fix: recommendation items carry card_name, not name -- the old c.get("name", c)
# returned the whole dict (unhashable in a set()), aborting the script under set -e
# after a fully successful retrain+reload+smoke, right before the success notify.
# The whole block is now guarded so it can never abort the script; overlap is
# informational only, never a gate.
overlap=$(python3 - "$recs_before" "$recs_after" <<'PYEOF'
import json, sys
try:
    before = json.load(open(sys.argv[1]))
    after = json.load(open(sys.argv[2]))
    def names(r):
        return set(
            c.get("card_name") or c.get("name")
            for c in (r.get("recommendations") or [])[:20]
            if isinstance(c, dict)
        )
    pcts = []
    for b, a in zip(before, after):
        nb, na = names(b), names(a)
        if not nb:
            continue
        pcts.append(len(nb & na) / len(nb) * 100)
    print(f"{sum(pcts)/len(pcts):.1f}" if pcts else "n/a")
except Exception:
    print("n/a")
PYEOF
) || overlap="n/a"
log "mean top-20 overlap before/after: ${overlap}%"

last_retrained_new=$(echo "$health_after_json" | jq -r '.last_retrained')

notify "forced SVD retrain SUCCESS: ${partitions:-?} partitions, ${decks:-?} decks, ${duration:-?}s. last_retrained: $last_retrained_before -> $last_retrained_new. overlap: ${overlap}%"
log "=== force-svd-retrain.sh complete: SUCCESS ==="
