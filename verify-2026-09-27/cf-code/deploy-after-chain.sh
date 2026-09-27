#!/bin/bash
# One-shot 2026-09-27: deploy CF API $SHA once today's retrain chain has finished.
# Tags a rollback image, builds, restarts api, smokes fresh + cache-hit /recommend,
# rolls back automatically on any failure. Never starts after 21:30 UTC (22:00 daemon spawn).
set -uo pipefail
cd /opt/grimoire-cf-api || exit 1
SHA=9e927eb
L=/var/log/grimoire-pipeline-manual.log
DEADLINE=$(date -u -d "$(date -u +%F) 21:30" +%s)
note() { echo "$(date -u '+%F %T UTC') [deploy $SHA] $*" >> "$L"; }
notify() {
  ( set -a; . ./.env; set +a
    curl -s --max-time 20 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"$1\"}" \
      >/dev/null 2>&1 ) || true
}
skip() { note "skipped: $1"; notify "CF deploy $SHA skipped: $1"; exit "${2:-0}"; }
healthy() { [[ "$(curl -s -m 5 localhost/cf-api/health)" == *'"status":"ok"'* ]]; }
chain_done() {
  ! pgrep -f retrain-then-eval.sh >/dev/null &&
    grep -qE "^$(date -u +%F) .*\[chain\] (eval rc=|retrain rc=|retrain SUCCESS but past|retrain exited 0 without)" "$L"
}

until chain_done; do
  [ "$(date -u +%s)" -ge "$DEADLINE" ] && skip "retrain chain not finished by 21:30 UTC"
  sleep 120
done
[ "$(date -u +%s)" -ge "$DEADLINE" ] && skip "past 21:30 UTC"
[ "$(git rev-parse --short=7 HEAD)" = "$SHA" ] || skip "HEAD is $(git rev-parse --short=7 HEAD), expected $SHA" 1
git diff --quiet HEAD || skip "tracked files modified in the working tree" 1
[ "$(docker ps --filter name=grimoire-cf-api-api-run- -q | wc -l)" -eq 0 ] || skip "an api-run container is still up"
healthy || skip "API unhealthy after the chain, not touching it" 1
n=$(docker exec grimoire-cf-api-postgres-1 psql -U grimoire -d grimoire_cf -tAc \
  "SELECT count(*) FROM model_artifacts WHERE artifact_type='full_model'" 2>/dev/null | tr -d '[:space:]')
[ "${n:-0}" -gt 0 ] 2>/dev/null || skip "no full_model artifact in the DB, a restart would come up without a model" 1

note "chain finished, deploying"
docker tag grimoire-cf-api-api:latest "grimoire-cf-api-api:pre-$SHA" || skip "docker tag failed" 1
if ! docker compose -f docker-compose.prod.yml build api > "/tmp/cf-build-$SHA.log" 2>&1; then
  note "build FAILED, nothing changed (see /tmp/cf-build-$SHA.log)"; notify "CF deploy $SHA: build FAILED, live API untouched"; exit 1
fi
docker compose -f docker-compose.prod.yml up -d --no-deps api

smoke() {
  local i body code out
  for i in $(seq 1 100); do healthy && break; sleep 3; done
  healthy || return 1
  body=/tmp/cf-smoke-body.json
  printf '{"commander":"Atraxa, Praetors%s Voice","cards":["Sol Ring","Arcane Signet","Smoke %s"],"limit":20,"log_impressions":false}' "'" "$(date +%s)" > "$body"
  for i in fresh cache; do
    code=$( set -a; . ./.env; set +a
      curl -s -m 60 -o /tmp/cf-smoke.json -w "%{http_code}" -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" --data @"$body" localhost/cf-api/recommend )
    out=$(python3 -c "import json;d=json.load(open('/tmp/cf-smoke.json'));print(len(d.get('recommendations',[])),d.get('color_identity'))" 2>/dev/null || echo "0 none")
    note "smoke $i: http=$code recs/color_identity=$out"
    [ "$code" = 200 ] && [ "${out%% *}" -ge 10 ] || return 1
    if [ "$i" = cache ] && [ "${out#* }" != cached ]; then return 1; fi
  done
}

if smoke; then
  note "deployed OK"; notify "CF API $SHA deployed after the retrain chain, smoke OK (fresh + cache)"
else
  docker tag "grimoire-cf-api-api:pre-$SHA" grimoire-cf-api-api:latest
  docker compose -f docker-compose.prod.yml up -d --no-deps --no-build --force-recreate api
  note "smoke FAILED, rolled back to pre-$SHA"; notify "CF API $SHA smoke FAILED, rolled back to the previous image"; exit 1
fi
