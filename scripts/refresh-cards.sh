#!/usr/bin/env bash
# Full card-data refresh, in the order each step depends on:
#   Scryfall oracle bulk -> MTGJSON subtypes/Arena IDs (fill-only) -> land classes -> fra/frc check.
# Target DB: $MTG_DB_DIR/mtg-deck-builder.db when set, else the live app DB (%APPDATA%).
# Usage: scripts/refresh-cards.sh            (PY=python3 on Linux)
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PY:-py}
db_args=()
if [ -n "${MTG_DB_DIR:-}" ]; then db_args=(--db "$MTG_DB_DIR/mtg-deck-builder.db"); fi

echo "== $(date -u '+%F %T') UTC card refresh"
npx tsx scripts/update-card-data.ts
PYTHONIOENCODING=utf-8 "$PY" scripts/fetch_mtgjson.py "${db_args[@]}"
"$PY" scripts/classify_lands.py "${db_args[@]}"
npx tsx verify-2026-09-26/fra/verify-fra.ts
echo "== done"
