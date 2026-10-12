#!/bin/bash
# score.sh list.txt... -> alt/<name>.model.json + one-line summary each
cd C:/Users/QuLeR/MTG-deck-builder
for f in "$@"; do
  out="${f%.txt}.model.json"
  MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx verify-2026-10-06/rg-ways/run-model.ts "$f" > "$out" 2>"${f%.txt}.err"
  node verify-2026-10-06/rg-ways/sum.cjs "$out"
done
