#!/bin/bash
# Pre-fix (b0ce949 copies) vs fixed tree: timing + card lists for collection builds, then no-collection timing.
cd C:/Users/QuLeR/mtg-opt-wt
export MTG_DB_DIR=C:/Users/QuLeR/AppData/Local/Temp/perf-db WT=C:/Users/QuLeR/mtg-opt-wt
P=verify-2026-09-30/perf
TAT='{"format":"brawl","colors":[],"commanderName":"Tatyova, Benthic Druid","useCollection":true,"userId":1,"collectionSource":"arena"}'
TAM='{"format":"brawl","colors":[],"commanderName":"Tam, the Possibility","useCollection":true,"userId":1,"collectionSource":"arena"}'
TATNC='{"format":"brawl","colors":[],"commanderName":"Tatyova, Benthic Druid"}'
for b in TAT TAM; do
  MOD=src/lib/__prefix_dba.ts OUT=$P/$b-prefix.txt npx tsx $P/time-build.ts prefix-$b "${!b}" 2>&1 | grep -E "^== |^fetch|^  [0-9]"
  OUT=$P/$b-fixed.txt npx tsx $P/time-build.ts fixed-$b "${!b}" 2>&1 | grep -E "^== |^fetch|^  [0-9]"
  if cmp -s $P/$b-prefix.txt $P/$b-fixed.txt; then echo "$b lists IDENTICAL"; else echo "$b lists DIFFER"; diff $P/$b-prefix.txt $P/$b-fixed.txt | head; fi
done
npx tsx $P/time-build.ts fixed-TATNC "$TATNC" 2>&1 | grep -E "^== |^fetch|^  [0-9]"
WT=C:/Users/QuLeR/perf-base-wt npx tsx $P/time-build.ts base-TATNC "$TATNC" 2>&1 | grep -E "^== |^fetch|^  [0-9]"
WT=C:/Users/QuLeR/perf-base-wt npx tsx $P/time-build.ts base-TAM "$TAM" 2>&1 | grep -E "^== |^fetch|^  [0-9]"
