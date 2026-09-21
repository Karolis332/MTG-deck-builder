#!/usr/bin/env bash
# v1.4 stage 1d — one measurement sweep. $1 = tag (pin | ritual | deploy | cantrip | h20).
# Usage: bash verify-2026-09-19/deck-score/s1d-measure.sh <tag> [quick]
set -u
TAG="${1:?tag}"
QUICK="${2:-}"
OUT="/tmp/s1d/$TAG"
mkdir -p "$OUT"
cd "$(dirname "$0")/../.." || exit 1
export MTG_DB_DIR="C:/Users/QuLeR/MTG-deck-builder/data"
H="${S1D_HORIZON:-}"
HF=""
[ -n "$H" ] && HF="--horizon $H"

{ npx tsx scripts/deck-score-bands.ts real --profile commander $HF; } > "$OUT/real-commander.txt" 2>&1
{ npx tsx scripts/deck-score-bands.ts real --profile brawl $HF; } > "$OUT/real-brawl.txt" 2>&1
{ npx tsx scripts/deck-score-bands.ts real --profile commander --wzero $HF; } > "$OUT/wzero-commander.txt" 2>&1
{ npx tsx scripts/deck-score-bands.ts real --profile brawl --wzero $HF; } > "$OUT/wzero-brawl.txt" 2>&1
{ npx tsx scripts/deck-score-bands.ts cedh; } > "$OUT/cedh.txt" 2>&1
{ npx tsx scripts/deck-score-report.ts; } > "$OUT/anchors.txt" 2>&1
if [ "$QUICK" != "quick" ]; then
  { npx tsx scripts/deck-score-bands.ts controls --stride --profile commander $HF; } > "$OUT/controls-stride-commander.txt" 2>&1
  { npx tsx scripts/deck-score-bands.ts controls --stride --profile brawl $HF; } > "$OUT/controls-stride-brawl.txt" 2>&1
fi
echo "DONE $TAG"
