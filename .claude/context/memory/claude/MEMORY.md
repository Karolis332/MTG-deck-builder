# MTG Deck Builder - Project Memory

## Quick Reference
- `py` not `python` | SSH: `ssh -i ~/.ssh/id_ed25519_geo_vps root@187.77.110.100`
- 391 tests / 21 files / 36 migrations / 52 API routes | Version 1.0.0-alpha.5
- **SINGLE DB**: `%APPDATA%/the-black-grimoire/data/mtg-deck-builder.db` — used by BOTH Electron app AND dev server
  - `db.ts` resolveDbDir() auto-detects Electron DB when `APPDATA` is set and DB file exists
  - Scripts MUST use this path too — never hardcode `data/mtg-deck-builder.db` for production changes
  - Legacy copies at `./data/` and `%APPDATA%/mtg-deck-builder/data/` — DO NOT USE
- Auth: scrypt hex salt:hash via Node's scryptSync
- Login: QuLeR / grimoire123

## Architecture
- Next.js 14 (App Router, standalone) + Electron 33 + Python 3.13 ML pipeline
- SQLite via better-sqlite3 (WAL), `@/*` → `./src/*`, 2-space indent
- Claude API: raw fetch (not SDK), key in app_state table
- See [cf-engine-details.md](cf-engine-details.md), [project_vps_setup.md](project_vps_setup.md)

## Pipeline (2026-04-09)
- 16 steps (added commander_stats), 3x retry w/backoff, `data/pipeline_failures.json` cross-run tracking
- 3 failures = 24h degraded auto-skip | Flags: `--reset-step`, `--force-degraded`, `--no-notify`
- Fixed: MTGTop8 UTF-8 + retry; meta_aggregate SQL IN batching (500/batch)
- Telegram notifications via app_state credentials

## Telegram Bot (VPS PM2: telegram-bot)
- Source: `geo-scraper-file-generator/src/telegram-bot.ts`
- Deploy: `pushd geo-scraper && npx tsc; popd && scp dist/telegram-bot.js VPS && pm2 restart`
- Features: Status, Services, Logs, Nginx, SSL, Updates, Docker, Grimoire, Cron, Procs
- Voice: Groq Whisper → `/claude` | Anti-flood: `sendStatus()` deletes prev msg
- `/claude` relay: writes `/tmp/claude-queue.json`, local bridge picks up

## Claude Bridge (`scripts/telegram_claude_bridge.py`)
- Polls VPS queue via SSH every 3s | **MUST** run detached + strip `CLAUDECODE` env
- Start: `start //b py scripts/telegram_claude_bridge.py > data/bridge.log 2>&1 &`
- Uses absolute `~/AppData/Roaming/npm/claude.cmd` | Registers `/tmp/claude-bridge-status`

## VPS (187.77.110.100)
- Ubuntu 24.04, Docker, nginx | Key: `~/.ssh/id_ed25519_geo_vps`
- PM2: geo-scraper, telegram-bot | Docker: grimoire-cf-api, n8n, gotenberg
- n8n: `http://187.77.110.100/n8n/` | CF API: `/cf-api/` | Gotenberg: port 3002

## Features Built (2026-04-04)
- **Pipeline fallback**: retry, degraded mode, Telegram notify, state tracking
- **Deck fingerprinting**: Jaccard similarity, AUTO_LINK=0.3, SUGGEST=0.15, IPC wired
- **Post-match stats**: cards drawn/played/not seen, mana curve, removal, MVP, overlay
- **Visual overhaul**: card hover, 8-type bar, collection thumbnails+set icons, sparklines
- **Landing page**: `/landing` — pricing, features, competitor comparison
- **Marketing docs**: GTM research, content strategy, social copy, Overwolf listing
- **Screenshot generator**: `scripts/generate_screenshots.js` — 12 shots via Playwright
- **TS audit**: 43 unused vars fixed, 4 deps removed
- **9 commits pushed** to main (77807f8..d263efa), Windows build packaged (399MB)

## GTM Strategy
- $4.99/mo Pro, $14.99/mo Commander, Free tracker tier
- Overwolf: 70/30 split, ow-electron integrated, MTGA Class ID 21308
- Competitors: Untapped.gg ($7.99), Arena Tutor ($2.99), 17Lands (free)
- Channels: TikTok > Reddit > YouTube mid-tier creators
- Content: 4 pillars, 4 series, 4-phase calendar (see docs/CONTENT_STRATEGY.md)

## Features Built (2026-04-09)
- **Per-commander training**: 2271 commanders, 2.18M card stats from 506K+ decks, synergy vs global baseline
  - `commander_card_stats` table (migration 34), `aggregate_commander_stats.py` pipeline step
  - Scoring: +70 for 60%+ inclusion, +50 for 40%, +35 for 25%, synergy bonus up to +25
  - High-inclusion cards (25%+) injected into candidate pool
- **Color-adjusted staple scoring**: global rates / colorShareEstimate, tiers up to +80
  - Force-include threshold lowered: 20% global OR color-adjusted 8% (was 50%)
- **Drag-and-drop deck editor**: @dnd-kit/core, draggable search/deck cards, drop zones for main/sideboard/remove
- **Inline card prices**: per-card USD in deck rows, section subtotals, top 5 expensive cards in stats
- **Overlay animations**: life pulse (green/red), draw highlights (amber DREW badge), log slide-in, content fade-in

## Root-Cause Deck Builder Fix (2026-04-10) — VERIFIED
- **Problem**: Filler-heavy decks (Sokka's Haiku, Bender's Waterskin in B/U Golbez). Off-color MDFCs leaking.
- **Fix**: 3-module system (constraints + commander-analysis + deck-builder-ai), plus MDFC CI filter in land-intelligence.ts
- **MDFC bug root cause**: `land_classifications` LEFT JOIN → unclassified MDFCs had `produces_colors=null` → fell into "colorless bonus" branch. Fixed with hard `card.color_identity` filter at top of `scoreLandsForDeck()` loop.
- **Verified**: Golbez B/U Brawl rebuild clean — ramp 12/12, draw 12/10, removal 6/6, wipes 3/3, protection 3/3, wincons 6/6, payoffs 11/15. No red/green MDFC leaks. Build passes.
- Commit: `cd3ba1c` on MTG-deck-builder main

## Web App — Black Grimoire Web (2026-04-10)
- **Repo**: `C:\Users\QuLeR\black-grimoire-web\` (separate from Electron app)
- **Stack**: Next.js 16.2.3 + Clerk + Neon Postgres + Drizzle ORM + Stripe + shadcn/ui v2 + Geist
- **Domain target**: blackgrimoire.gg (Vercel deployment)
- **Pricing**: Free (3 decks) / Pro $4.99 (unlimited, AI chat 50/day, overlay, analytics) / Commander $14.99 (everything + commander ML + unlimited AI)
- **Pages**: Landing (hero+features+pricing), sign-in/up (Clerk), dashboard (decks/collection/matches/AI), pricing, deck detail, new deck
- **API routes**: `/api/decks` (GET/POST with plan limits), `/api/stripe/checkout`, `/api/stripe/webhook`
- **Schema**: users (Clerk-synced), decks, deck_cards, collection, match_logs, ai_usage
- **shadcn v2 note**: Uses Base UI `@base-ui/react/button` — NO `asChild` prop. Use `<Link className={buttonVariants(...)}>` for Link+Button composition.
- **Sync plan**: v1 = web standalone, v1.1 = Electron "Connect to Cloud" toggle (Clerk session + Neon push/pull)
- Commit: `a52165e` on black-grimoire-web master

## Remaining Tasks
- [x] Root-cause deck builder fix + MDFC color identity leak
- [x] Web app scaffolding (Next.js 16 + Clerk + Neon + Stripe + shadcn)
- [ ] **Web: Clerk setup** — create Clerk app, get keys, `vercel integration add clerk`
- [ ] **Web: Neon setup** — create Neon project, get DATABASE_URL, run `drizzle-kit push`
- [ ] **Web: Stripe setup** — create products/prices in Stripe dashboard, set env vars
- [ ] **Web: Vercel deploy** — `vercel link`, connect GitHub, set env vars, first deploy
- [ ] **Web: Domain** — purchase blackgrimoire.gg, add to Vercel project
- [ ] **Electron sync bridge** (v1.1) — Clerk session in Electron, push/pull to Neon
- [ ] Overwolf store submission (developer.overwolf.com)
- [ ] Marketing content generation via Shorts Generator
- [ ] TikTok/Reddit account setup + first posts
- [ ] n8n workflow automation (pipeline triggers, notifications)
- [ ] Branding: logo variants, social media banners, app store assets

## Model Audit (2026-06-12)
- Deck-builder overhaul: land sanity, brawl legality, partners, X/5c synergy. Harness: scripts/test-deck-builds.ts + compare-edhrec.ts
- CF API was 502 (1094 crash loops): scheduler capped api at 1200MB on now-16GB VPS; fixed to 3G + docker daemon restart
- classify_lands.py MUST rerun after card-data updates (populates land_classifications in APPDATA DB)
- Card DB refreshed via scripts/update-card-data.ts (+1189 cards, June 2026 sets)

## Topic Files
- [cf-engine-details.md](cf-engine-details.md) — CF API technical details
- [project_vps_setup.md](project_vps_setup.md) — VPS layout and priorities
- [project_deck_picker_overlay.md](project_deck_picker_overlay.md) — Deck picker
- [project_tmnt_arena_legality.md](project_tmnt_arena_legality.md) — TMNT legality
- [grimoire_upgrade_plan.md](grimoire_upgrade_plan.md) — 4-phase upgrade plan
- [feedback_deck_power_level.md](feedback_deck_power_level.md) — Paper-deck power level: mid (bracket 2-3), no cEDH staples
- [reference_paper_decks_location.md](reference_paper_decks_location.md) — Paper decks live in `Desktop/MTG decks/` (with space), not the repo
- [project_active_paper_decks.md](project_active_paper_decks.md) — Active paper builds: Meren (BG grave), Krenko monored goblins, Tazri (5C allies). Card pulls land in `~/Downloads/` as scan files.
- [feedback_infra_liveness_tracking.md](feedback_infra_liveness_tracking.md) — Spot-check dormant cloud infra at session start; never let trial accounts silently expire
- [reference_grimoire_prod_topology.md](reference_grimoire_prod_topology.md) — **PRODUCTION lives on VPS (1.18M decks); Railway is dormant dev (10.5K). Don't confuse them.**
- [project_oom_pipeline_fix.md](project_oom_pipeline_fix.md) — VPS OOM fix 2026-05-04: bumped api container memory caps to 2GB work-hours / 3GB off-hours
- [project_cf_retrain_procedure.md](project_cf_retrain_procedure.md) — Force-retrain via `train_only` script (~56min, bypass 50K threshold). Long-running `api-run-*` containers are the sleeping pipeline daemon, NOT stuck.
- [project_engine_bughunt_2026-06-13.md](project_engine_bughunt_2026-06-13.md) — 18 engine bugs fixed via adversarial review; OPEN: transform commander oracle_text empty in DB
- [project_model_audit_2026-06-12.md](project_model_audit_2026-06-12.md) — Model audit session: harness commands, root causes, post-fix scores, remaining gaps
- [feedback_ramos_deck_prefs.md](feedback_ramos_deck_prefs.md) — Ramos Brawl prefs: no Massacre Wurm, wants untapped mana + draw, model drops Gates package
- [feedback_ramos_brawl_gates_reference.md](feedback_ramos_brawl_gates_reference.md) — **User's WINNING Ramos Brawl list = Gates/Maze's End + charm hybrid w/ Jegantha. Fixture: `ramos-dragon-engine--brawl-winning-reference.txt`; harness now prefers format-specific references.**
- [feedback_meren_no_mana_dorks.md](feedback_meren_no_mana_dorks.md) — Meren decks: skip 1-mana vanilla dorks. She IS the ramp; prefer ETB/death-trigger fodder, rocks, Ashnod's Altar.
- [project_collection_table_unreliable.md](project_collection_table_unreliable.md) — **DB `collection` table = bogus 3645-card bulk import, NOT real ownership. Use ManaBox CSVs at `Desktop/MTG collection/` instead.**
- [project_cf_api_graphify_graph.md](project_cf_api_graphify_graph.md) — grimoire-cf-api has a graphify knowledge graph (`graphify-out/`). Query before grepping CF engine cold; `/graphify . --update` after changes.
- [project_all_repos_graphified.md](project_all_repos_graphified.md) — **ALL 10 projects graphified (2026-06-17), each with `graphify-out/` + `## graphify` CLAUDE.md section. Query before grepping any repo.**
- [project_cf_prod_backup_and_eval.md](project_cf_prod_backup_and_eval.md) — **grimoire-cf-api prod backed up to private GitHub (Karolis332/grimoire-cf-api); VPS /opt is source-of-truth, local was stale. CF eval harness fixed (clean split) + first baseline. Never overwrite prod cf_engine.py from local.**
- [project_ramos_engine_misread_2026-06-20.md](project_ramos_engine_misread_2026-06-20.md) — **RESOLVED 2026-06-21. Multicolor-matters fix: reward cast-colors (+14/color, 2c charms now count), drop counters tag when five_colors, MANA_SINK_PAYOFFS set. Gold density 7→43, counters→0. Harness gates + winning-reference fixture + docs/DECK_ENGINE_TESTING_PROTOCOL.md.**
- [project_deck_sim_optimizer_2026-06-22.md](project_deck_sim_optimizer_2026-06-22.md) — **Monte Carlo goldfish sim + 10k manabase optimizer (scripts/_scratch/). Collection table now REAL (3526 cards from Untapped CSV). Consistency: hand-built 56.9 < collection build 71.6 < optimized ~83. LESSON: optimizer games naive metrics (stacked Cavern, then taplands) — fitness must be legality+tempo-aware. Sim = mana only, NOT power.**
- [project_electron_main_process_imports.md](project_electron_main_process_imports.md) — **Electron MAIN process needs register-aliases shim (@/ resolution) + better-sqlite3 bundled into app/node_modules w/ afterPack ABI sync. Importing src/lib in main.ts trips both. Healthy launch = 5 processes; tail telemetry-debug.log for MAIN: traces.**
- [project_auto_improve_loop.md](project_auto_improve_loop.md) — **Autonomous deck-engine improver ("hermes"): `bash scripts/auto-improve.sh [rounds]` → headless Sonnet edits scorer, harness+`deck-fitness.mjs` gate keeps only strict improvements, commits to `auto-improve` branch. Ramos-only ceiling RESOLVED 2026-07-03: all 9 roster commanders (+Meren/Tazri) have EDHREC-consensus references, baseline score 134→901. Known baseline hardFail: magus-lucea-kane/brawl (commander not Arena-legal).**
- [project_session_state_2026-08-23.md](project_session_state_2026-08-23.md) — **Tier 1 COMPLETE (legality-skip ✅, commander_summary ✅ 25ms, game events ✅, engine badge ✅). Fitness 864. Launch plan in docs/LAUNCH_PLAN.md. Sync footgun fixed; full re-sync verify inside.**
- [project_recommender_methods_audit.md](project_recommender_methods_audit.md) — **recommender.cards video audit → docs/RECOMMENDER_METHODS_AUDIT.md. Bandit outcome wiring FIXED 2026-08-23 (card events + game events both POST /events/track; watch rec_outcomes grow). Lift scoring tried+reverted (897→885 vs consensus refs).**
- [project_ccs_refresh_2026-07-02.md](project_ccs_refresh_2026-07-02.md) — **VPS commander_card_stats has NO cron, goes stale silently (found 80d stale). populate_ccs.py loop = days at 3M decks; use /opt/grimoire-cf-api/refresh_ccs.sql (set-based one pass) instead.**
- [project_collection_builds_2026-07-02.md](project_collection_builds_2026-07-02.md) — Harness `--collection` mode (roster + Meren/Tazri, results-collection.json); Ramos picks counters cards over 479 owned gold spells in collection mode → hand-fixed `--collection-optimal` variant
