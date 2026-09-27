---
name: deck-score-corpus-samples
description: "Where the Deck Score calibration cohorts come from — VPS CF Postgres read-only stratified samples for Commander (2,777 lists) and Historic Brawl (1,746 lists, 100-card), the SQL files, the CSV locations, and the contiguous-storage confound"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0c6f5709-7ab2-42f9-8d4a-0eba683ab9d6
  modified: 2026-09-20T16:24:04.842Z
---

Deck Score bands and negative floors are measured on stratified samples pulled read-only from the CF corpus Postgres on the VPS (container `grimoire-cf-api-postgres-1`; run `psql -f` inside it, `\copy` to `/tmp`, `docker cp` out, `scp` home). SQL lives in the repo: `scripts/commander-sample.sql` (format `commander`, 300 commanders × 10 most recent 99–100-card lists → 2,777 decks, 2026-09-20) and `scripts/brawl-sample.sql` (format `historicBrawl`, same stratification, card_count 99–101 → 1,746 decks, ~287 commanders, 2026-09-20). CSVs are untracked at `verify-2026-09-20/commander-sample.csv` and `verify-2026-09-20/brawl-sample.csv` (columns deck_id, commander, card_name, board, quantity); `scripts/deck-score-piles.ts` reads them.

**Why:** the corpus has no 60-card Brawl at all — all 11,281 `historicBrawl` decks are 100-card Arena Brawl, which is exactly the profile of the `brawl` / `competitivebrawl` fixtures (Vivi, Kuja, Tazri, Azula), so Brawl bands must come from this cohort, not from Commander bands scaled. `standardbrawl` (60-card) has no cohort. Joining `deck_cards` over all 11k Brawl decks in one query timed out at 90 s — sample deck ids first, then join.

**How to apply:** ten lists per commander are stored contiguously, so any contiguous slice is ~20 commander clusters, not N independent draws; always split cohorts with `strideOrder` / `commanderBlocks` (training / holdout disjoint by commander, fixture commanders excluded). Re-sample only with the SQL files above; note the date in the report. Related: [[fable-orchestrator-only-routing]], [[vps-ssh-and-neon-probe]].
