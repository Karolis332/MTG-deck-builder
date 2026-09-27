---
name: project-ccs-refresh-2026-07-02
description: "commander_card_stats refresh procedure at 3M+ deck scale — populate_ccs.py loop is broken, use set-based refresh_ccs.sql instead"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7fbf5f4b-340f-47ab-8962-4cc85bb2a503
---

# commander_card_stats refresh at 3M+ deck scale (2026-07-02)

**VPS `commander_card_stats` goes stale silently** — SVD retrains nightly, but the per-commander
aggregation has NO cron. Found it 80 days stale (Apr 13) while corpus grew 1.6M → 3.17M decks.

- `populate_ccs.py` (per-commander loop) is **unusable at this scale**: planner picks a parallel
  seq scan over 266M-row `deck_cards` for EVERY commander → days of runtime. Its single
  transaction also holds row locks on upserted rows for 100-commander batches → blocks any
  concurrent upsert to the same commander (hit this live; had to `pg_terminate_backend`).
- **Use `/opt/grimoire-cf-api/refresh_ccs.sql`** (created this session): ONE set-based pass,
  `COUNT(*)` instead of `COUNT(DISTINCT deck_id)` (equivalent — pkey guarantees one row per
  deck/card/board). Run:
  `docker cp ... && nohup docker exec <pg> psql -U grimoire -d grimoire_cf -f /tmp/refresh_ccs.sql > /var/log/grimoire-refresh-ccs.log 2>&1 &`
- Surgical per-commander variant: plpgsql `FOREACH` loop over target commanders (~2 min/commander),
  used to refresh the 12 harness commanders fast. Same upsert, idempotent with the full pass.
- Local sync after VPS refresh: `py scripts/sync_commander_stats.py --db "$APPDATA/the-black-grimoire/data/mtg-deck-builder.db" --commander "<name>"` per commander (safe merge mode; full mode does an atomic table swap). API caps at top-300 cards/commander.
- TODO: add refresh_ccs.sql to the nightly pipeline or weekly cron — [[project-vps-setup]].
- VPS was upgraded: 16GB RAM, 193GB disk (101GB free as of 2026-07-02).
