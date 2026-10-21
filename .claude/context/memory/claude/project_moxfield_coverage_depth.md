---
name: project-moxfield-coverage-depth
description: CF corpus misses ≥768k public Moxfield decks for popular commanders — every scraper reads only top pages by views; deep backfill cron started 2026-10-20
metadata:
  node_type: memory
  type: project
  originSessionId: 3be880cd-43f5-4bef-a565-f19c92db8284
  modified: 2026-10-20T21:10:11.839Z
---

Probe 2026-10-20 (`/opt/grimoire-cf-api/ops/coverage_probe.py`, output `/var/log/grimoire-coverage-probe.tsv`): 230 of the top 300 commanders hold 40–60 % of Moxfield's public decks, ≥ 768k decks missing. Moxfield `totalResults` caps at 10,000 (157 pages × 64), so above that the true gap is unknown.

**Why:** `scripts/scrape_all_commanders.py` (container `grimoire-scrape-all`, 16:00–05:00 UTC sweep of 3,743 commanders) reads `PAGES_PER_SOURCE = 5` pages by views per commander and re-reads the same top pages nightly; the pipeline's targeted expansion caps at 15 pages; `targeted_backfill` defaults stop after 5 empty pages. Anti-Venom: one `--empty-pages 200` run took 5,327 → 9,970.

**How to apply:** deep coverage comes from `ops/deep-backfill.sh` (crons 01:10 / 17:10 UTC, queue `data/deep-backfill-queue.txt`, 3 commanders per run). The faster fix — start each commander at our current page depth in scrape_all — needs the `grimoire-scrape-all` container recreated (code baked into an old image); awaiting operator OK. Re-run the probe to measure progress. Related: [[project-cf-retrain-procedure]], [[reference-grimoire-prod-topology]].
