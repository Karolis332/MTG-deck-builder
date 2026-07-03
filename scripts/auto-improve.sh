#!/usr/bin/env bash
# Autonomous deck-engine improver ("hermes" loop).
#
# Each round: let a headless `claude` make ONE small edit to the scorer, re-run
# the deck-build harness, and KEEP the edit only if the fitness gate says it is a
# strict improvement with no new correctness regression. Otherwise revert it.
#
# The harness IS the reviewer. The fitness gate (scripts/deck-fitness.mjs) is the
# only thing standing between this loop and a regressed engine — do not weaken it.
#
# Usage:  bash scripts/auto-improve.sh [ROUNDS]        # default 10 rounds
# Stop:   touch data/auto-improve.stop                 # graceful stop after current round
# Watch:  tail -f data/auto-improve.log
#
# ponytail: bounded loop, branch-only commits, restricted claude toolset, stop-file.
# Not a daemon and not on main — deliberately. Raise ROUNDS or cron-wrap it if you
# want it running longer.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

ROUNDS="${1:-10}"
BRANCH="${IMPROVE_BRANCH:-auto-improve}"
MODEL="sonnet"                    # cheap edits; Opus-grade review is the harness, not the editor
STOP="data/auto-improve.stop"
LOG="data/auto-improve.log"
mkdir -p data
log() { echo "[$(node -e 'process.stdout.write(new Date().toISOString())')] $*" | tee -a "$LOG"; }

# Never edit main directly. Work on a dedicated branch.
git rev-parse --verify "$BRANCH" >/dev/null 2>&1 || git branch "$BRANCH"
git checkout "$BRANCH" >/dev/null 2>&1 || { log "cannot checkout $BRANCH"; exit 1; }
rm -f "$STOP"

# Data-loss guard: the per-round revert is `git checkout -- src/`, which would also
# wipe any PRE-EXISTING uncommitted tracked changes. Snapshot them first so revert
# only ever undoes the round's edit, never your work-in-progress.
if ! git diff --quiet; then
  git commit -aqm "wip: baseline snapshot before auto-improve"
  log "snapshotted uncommitted tracked changes as baseline commit on '$BRANCH' (recover via: git log $BRANCH)"
fi

log "=== auto-improve start: $ROUNDS rounds on branch '$BRANCH' (model=$MODEL) ==="

# Baseline. basefit is the source of truth for the baseline across rounds —
# results.json may be left stale by a reverted round, so we never re-derive
# baseline from the file, only from this variable.
npx tsx scripts/test-deck-builds.ts >/dev/null 2>&1 || { log "baseline harness failed — aborting"; exit 1; }
basefit="$(node scripts/deck-fitness.mjs)"
log "baseline fitness: $basefit"

PROMPT='You are improving an MTG deck-building engine so its generated decks match human WINNING references better.

Signals (higher referenceOverlapPct = closer to the winning build): decks/test-builds/results.json
Gates + targets you must satisfy: docs/DECK_ENGINE_TESTING_PROTOCOL.md

Make ONE small, safe improvement THIS round.
ONLY edit files under src/lib/ — the scorer (src/lib/deck-builder-ai.ts), archetype/synergy detection (src/lib/commander-synergy.ts), or the classifier (src/lib/card-classifier.ts).
DO NOT edit scripts/, tests, any *--winning-reference.txt, or the harness.
DO NOT weaken a gate and DO NOT hardcode specific card names to inflate overlap — improve the general scoring logic.
Apply the change directly with the Edit tool, keep the diff small, then output one line: what you changed and why.'

for i in $(seq 1 "$ROUNDS"); do
  [ -f "$STOP" ] && { log "stop file present — halting"; break; }
  log "--- round $i/$ROUNDS ---"

  # One targeted edit. Restricted toolset (no Bash) caps blast radius; acceptEdits
  # lets it write unattended. CLAUDECODE unset so the nested CLI runs standalone.
  # 12-min hard timeout so a slow/stuck edit can't wedge the whole loop (a round-2
  # edit once ran 17+ min with no output). Timeout → treated as a failed round.
  timeout 720 env -u CLAUDECODE -u CLAUDE_CODE_SSE_PORT -u CLAUDE_CODE_ENTRYPOINT \
    claude -p "$PROMPT" --model "$MODEL" \
      --permission-mode acceptEdits \
      --allowedTools "Read,Edit,Grep,Glob" >>"$LOG" 2>&1 \
    || { log "round $i: claude edit failed/timed out — skipping"; git checkout -- src/ 2>/dev/null; continue; }

  # Re-test on a fresh results.json. A bad edit that won't compile makes the
  # harness exit non-zero → revert without even scoring.
  rm -f decks/test-builds/results.json
  if ! npx tsx scripts/test-deck-builds.ts >>"$LOG" 2>&1; then
    log "round $i: harness broke — revert"
    git checkout -- src/ 2>/dev/null
    continue
  fi

  newfit="$(node scripts/deck-fitness.mjs)"
  if node scripts/deck-fitness.mjs --accept "$basefit" "$newfit"; then
    git add src/
    git commit -q -m "auto: deck-engine round $i ($basefit -> $newfit)"
    log "round $i: KEPT $basefit -> $newfit"
    basefit="$newfit"
  else
    log "round $i: REJECTED $basefit -> $newfit — revert"
    git checkout -- src/ 2>/dev/null
  fi
done

log "=== auto-improve done. final baseline: $basefit. branch '$BRANCH'. Review: git log $BRANCH ==="
