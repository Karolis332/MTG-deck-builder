#!/bin/bash
# 2026-09-27 one-off: forced SVD retrain, then the fixed-partition CF regression eval
# (same partitions + seed as the 2026-06-18 baseline and run-pipeline.sh) ONLY if this run
# logged SUCCESS and the eval can end before the 22:00 UTC pipeline cron. Otherwise skip + say why.
set -uo pipefail
cd /opt/grimoire-cf-api || exit 1
LOG=/var/log/grimoire-pipeline-manual.log
EVAL_LOG=/var/log/grimoire-eval.log
# Captured at start so a retrain that slips past midnight never starts an eval.
EVAL_LATEST_START_TS=$(date -u -d "$(date -u +%F) 19:30" +%s)
log() { echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') [chain] $*" | tee -a "$LOG"; }
notify() {
  ( set -a; source /opt/grimoire-cf-api/.env; set +a
    curl -s --max-time 20 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"$1\"}" \
      >/dev/null 2>&1 ) || true
}

start_line=$(wc -l < "$LOG")
bash ops/force-svd-retrain.sh
rc=$?
if [ "$rc" -ne 0 ]; then log "retrain rc=$rc -> eval skipped"; exit "$rc"; fi
if ! tail -n +"$((start_line + 1))" "$LOG" | grep -qF '=== force-svd-retrain.sh complete: SUCCESS ==='; then
  log "retrain exited 0 without SUCCESS (no window / nothing trained / lock busy) -> eval skipped"; exit 0
fi
if [ "$(date -u +%s)" -gt "$EVAL_LATEST_START_TS" ]; then
  log "retrain SUCCESS but past 19:30 UTC -> eval skipped (would overlap the 22:00 cron)"
  notify "CF regression eval skipped: retrain finished after 19:30 UTC"
  exit 0
fi

log "retrain SUCCESS -> CF regression eval (WBRG,UBRG,WUBR,WUBG, seed 42) -> $EVAL_LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') [EVAL] post-retrain regression eval starting" >> "$EVAL_LOG"
start=$(date +%s)
# Named to match the 22:00 cron api-run-* guard; start <= 19:30 + 7200 s => hard stop <= 21:30.
EVAL_CTR=grimoire-cf-api-api-run-posteval
timeout -k 60 7200 docker compose -f docker-compose.prod.yml run --rm --no-deps --name "$EVAL_CTR" api \
  python scripts/evaluate.py --partition WBRG,UBRG,WUBR,WUBG --k 10,20,30 --seed 42 --save >> "$EVAL_LOG" 2>&1
rc=$?
docker rm -f "$EVAL_CTR" >/dev/null 2>&1 || true   # timeout kills the compose client, not always the container
dur=$(( ($(date +%s) - start) / 60 ))
log "eval rc=$rc in ${dur}m"
if [ "$rc" -eq 0 ]; then
  notify "CF regression eval after SVD retrain complete (${dur}m) - saved to evaluation_results"
else
  notify "CF regression eval after SVD retrain FAILED rc=$rc (${dur}m) - check $EVAL_LOG"
fi
exit "$rc"
