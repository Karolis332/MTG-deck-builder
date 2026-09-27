---
name: project-standard-meta-pipeline
description: "Where Standard (60-card) tournament data comes from since 2026-09-08 — VPS scraper service, mtgo.com source, export/sync commands, and what the desktop engine still lacks"
metadata: 
  node_type: memory
  type: project
  originSessionId: a6cf997f-c648-4ed8-9cce-6aa53cc1c250
  modified: 2026-09-19T00:00:00.000Z
---

Standard/60-card meta data lives in the VPS scraper service `/opt/grimoire-scrapers` (systemd `grimoire-scrapers`,
`scripts/auto_pipeline.py --cycle-gap 15`, venv at `venv/`, SQLite `data/mtg-deck-builder.db` ~700 MB, log
`data/pipeline_monitor.log`). Since 2026-09-08 every cycle scrapes Standard (MTGGoldfish metagame + MTGTop8 + **mtgo.com**),
aggregates, then runs `export_standard_meta.py` → `data/export-standard.db` and applies it to the build-api DB
(`/opt/grimoire-build-api/db/mtg-deck-builder.db`). Desktop pull: `py -3.13 scripts/sync_vps_meta.py` (scp + ATTACH apply,
replaces the format slice, deck ids rebased +900,000,000). The VPS `auto_pipeline.py` is NOT the repo copy — patch it in place
(pulled copy + `verify-2026-09-07/vps-scripts/patch_auto_pipeline.py`), backups `*.bak-2026-09-08`.

**Why:** the desktop had 229 Standard meta cards from April while the VPS already held 8.4K Standard decks it never synced;
the 60-card "Rebuild with model" is commander heuristics with no meta input and produced a 9-card-×4 mana-rock pile.
**How to apply:** mtgo.com (`/decklists/standard`, `?year=&month=` archive) is the only source with per-player W/L and
standings — clean embedded JSON, no Cloudflare; MTGGoldfish deck pages 403 behind a Cloudflare managed challenge (metagame
pages still parse); MTGTop8's `cp=` does not page. Use `py -3.13` locally (only interpreter with bs4/pandas). Backfill
processes are started with `setsid nohup … < /dev/null & disown` over `ssh -n`; a plain `&` hangs the ssh session.
Next engine step is T10 in `orchestration/desktop-overhaul-2026-09/spec.md`: 60-card rebuild → optimizer swaps, then a
meta-archetype builder. Related: [[project-theblackgrimoire-com-launch]].

**2026-09-19 update:** the build-api `/ingest/*` routes (commit `143d76a`) do NOT work on the VPS as deployed — the
git-archive deploy carries no `scripts/` and the app's `python3` has no bs4; the corpus the web reads is produced only by
this scrapers pipeline (each ~1h45m cycle ends with `export_standard_meta.py --apply-to /opt/grimoire-build-api/db/...`).
Scraper fixes therefore go to `/opt/grimoire-scrapers/scripts/<name>.py` (repo copies, byte-identical except
`auto_pipeline.py`) — `scrape_mtgtop8.py` was replaced with the fixed repo version 2026-09-19 (backup `.bak-2026-09-19`)
and a Standard date backfill started (`data/backfill-mtgtop8-2026-09-19.log`; python stdout is block-buffered under nohup,
so check the DB, not the log). Check with `GET /ingest/status` on build-api port 8100 (`x-api-key` = `BUILD_API_KEY` from
the pm2 env): `corpus.mtgtop8.withDate`.
