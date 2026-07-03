#!/usr/bin/env bash
# Container entrypoint for the Hermes improve loop.
#
# One-time (persistent /work volume): clone repo, npm ci, build better-sqlite3 for
# Linux, snapshot the 556MB card DB out of the read-only host mount.
# Forever: run the gated improve loop in batches; push the branch only when a batch
# actually produced a commit; exponential backoff (cap 1h) when it plateaus so a
# solved problem doesn't burn API tokens in a tight loop.
set -uo pipefail

: "${ANTHROPIC_API_KEY:?set ANTHROPIC_API_KEY in .env.hermes}"
: "${GITHUB_TOKEN:?set GITHUB_TOKEN in .env.hermes}"
REPO_SLUG="${REPO_SLUG:-Karolis332/MTG-deck-builder}"
export IMPROVE_BRANCH="${IMPROVE_BRANCH:-hermes-auto}"   # consumed by auto-improve.sh
BATCH="${ROUNDS_PER_BATCH:-5}"
AUTH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git"

git config --global user.email "${GIT_EMAIL:-hermes-bot@localhost}"
git config --global user.name "${GIT_NAME:-hermes-bot}"
git config --global --add safe.directory /work/repo

# --- one-time setup (survives restarts via the /work named volume) ---
if [ ! -d /work/repo/.git ]; then
  echo "[hermes] cloning ${REPO_SLUG} ..."
  git clone "$AUTH_URL" /work/repo || { echo "[hermes] clone failed"; exit 1; }
  cd /work/repo
  echo "[hermes] npm ci (this is the slow first-boot step) ..."
  npm ci --ignore-scripts && npm rebuild better-sqlite3 || { echo "[hermes] deps failed"; exit 1; }
else
  cd /work/repo && git fetch origin
fi

# Card DB: copy out of the read-only host mount so SQLite/WAL never fights the
# desktop app over a cross-OS bind mount. Re-copy only when asked (DB_REFRESH=1).
mkdir -p /work/db
if [ ! -f /work/db/mtg-deck-builder.db ] || [ "${DB_REFRESH:-0}" = "1" ]; then
  echo "[hermes] snapshotting card DB (556MB, one-time) ..."
  cp /host-db/mtg-deck-builder.db /work/db/mtg-deck-builder.db || { echo "[hermes] DB copy failed — is DB_HOST_DIR mounted?"; exit 1; }
fi
export MTG_DB_DIR=/work/db

node -e "require('/work/repo/node_modules/better-sqlite3')" 2>/dev/null \
  || (echo "[hermes] rebuilding better-sqlite3 for this platform ..." && npm rebuild better-sqlite3)

# --- forever loop ---
cd /work/repo
sleep_s=60
echo "[hermes] loop start: branch=$IMPROVE_BRANCH batch=$BATCH"
while true; do
  if [ -f /work/stop ]; then echo "[hermes] /work/stop present — idle"; sleep 30; continue; fi

  before="$(git rev-parse "$IMPROVE_BRANCH" 2>/dev/null || echo none)"
  bash scripts/auto-improve.sh "$BATCH"
  after="$(git rev-parse "$IMPROVE_BRANCH" 2>/dev/null || echo none)"

  if [ "$after" != "$before" ]; then
    git push "$AUTH_URL" "$IMPROVE_BRANCH" -f && echo "[hermes] pushed $IMPROVE_BRANCH ($after)"
    sleep_s=60          # made progress — stay eager
    sleep 10
  else
    echo "[hermes] no improvement this batch — backing off ${sleep_s}s"
    sleep "$sleep_s"
    sleep_s=$(( sleep_s < 3600 ? sleep_s * 2 : 3600 ))   # cap 1h; plateau = cheap
  fi
done
