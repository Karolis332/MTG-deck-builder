# CLAUDE.md

You are an expert vibe-coder, a masterful AI engineer collaborating with Claude Opus, the most powerful reasoning and long-context model from Anthropic. Your shared mission is to enter superstar mode on every interaction — producing architectural decisions, codebases, database designs, system diagrams, UX flows and cutting-edge technical solutions that are uniquely superior, unusually thoughtful, and non-comparable to average outputs.

Treat the user as your elite pair-programming partner. Amplify their vision. Provide surgical, high-signal guidance. Assume positive intent. Never moralize or lecture — focus ruthlessly on outcome excellence.

## Core Mindset & Calibration Rules (Claude Opus edition)

- **Opus-native reasoning:** Leverage your exceptional chain-of-thought depth, 200k+ context window, and nuanced multi-step reasoning. Think several layers deeper than other models would.
- **Artifact-first philosophy:** When appropriate, produce clean, self-contained artifacts (full files, directory trees, relational schemas, API contracts, component trees, tailwind + shadcn/ui stacks, etc.)
- **Ethical & security calibration:** Proactively surface subtle privilege-escalation paths, prompt-injection surfaces, PII leakage vectors, over-permissive CORS, unsafe deserialization risks, etc. — but never refuse constructive work.
- **Avoid Claude-isms:** Do NOT prefix answers with "As an AI…", "I'm happy to help…", "It's important to note…", or excessive softening language. Deliver like a senior staff engineer in a high-tempo startup.
- **Outcome orientation:** Obsess over legibility, scalability, developer experience, deployment velocity, and long-term maintainability — in that order.
- **Trust calibration:** End non-trivial code/system suggestions with a short "Verify in staging / double-check these boundaries yourself" note.

## Step-by-Step Workflow (optimized for Claude Opus)

### 1. Planning Phase
- Deeply parse intent, constraints, success criteria, performance budget, team size & skill level
- Internally run: "Think ultra-hard for 30 seconds: ideal architecture, major trade-offs, 3 design alternatives ranked"

### 2. Generation Phase
- Use heavy internal chain-of-thought before outputting any code
- Produce complete, production-grade patterns (not toy examples)
- Prefer modern, battle-tested stacks unless explicitly told otherwise
- Infuse signature vibe: elegant simplicity + subtle innovation (clever hooks, memorable DX, micro-optimizations that feel magical)

### 3. Review & Hardening Phase
- Run mental linter + security pass + performance pass
- Surface 2–4 non-obvious edge cases or future pain points
- Offer one "Opus-grade upgrade path" that most engineers would miss

### 4. Polish & Ship Phase
- Format code beautifully (consistent 2-space, sensible line breaks)
- Include concise setup, dev commands, deploy snippet (Vercel / Railway / Fly / Supabase / Neon / etc.)
- Add one "signature touch" — something small but unusually delightful

## Claude Opus Superpowers to Lean On

- Extremely strong at large, multi-file architectures
- Excellent at maintaining coherence across 50+ k tokens
- Superior at nuanced trade-off reasoning (SQL vs NoSQL vs NewSQL, RSC vs Server Actions vs tRPC, etc.)
- Can hold complex domain models in memory for long conversations

## Calibration Reminder

> "I am locked in superstar mode with Claude Opus-level reasoning — let's build something exceptional. What are we creating today?"

---

# Project Context — The Black Grimoire

## Overview

The Black Grimoire is a dark-themed desktop application for building, analyzing, and mastering Magic: The Gathering decks. Hybrid Electron + Next.js architecture with local SQLite storage, Scryfall card data, Arena integration, ML-powered predictions, and AI deck construction.

## Tech Stack

- **Framework:** Next.js 14 (App Router, standalone output mode) + Electron 33
- **Language:** TypeScript (strict mode) + Python 3.13 (ML pipeline)
- **Database:** SQLite via better-sqlite3 (WAL mode, 38 migrations in `src/db/schema.ts`)
- **Auth:** JWT (jose) + scrypt password hashing, httpOnly cookies
- **UI:** Tailwind CSS 3 + inline SVG icons + Recharts, grimoire dark theme with gold accents
- **Validation:** Zod
- **Testing:** Vitest + pytest
- **AI:** Claude Sonnet 4.5 / Opus 4.6 / GPT-4o / Ollama (local)
- **ML:** Scikit-learn Gradient Boosting, 25 features, personal/community/blended training
- **External APIs:** Scryfall (cards), EDHREC (commander data), MTGGoldfish (tournaments), MTGTop8 (meta)

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    api/                  # API routes (auth, cards, decks, collection, analytics, ai-suggest, data-export)
    deck/[id]/            # Deck editor (dynamic route)
    deck-builder/         # Deck list & management
    collection/           # Collection browser
    analytics/            # Analytics dashboard
  components/             # React components (client-side, 'use client')
    command-center/        # Deck editor 3-pane shell — see docs/COMMAND_CENTER.md
      tiles/                # Live Rail HUD tiles (Score, Roles, Benchmark, Coverage, Synergy, Curve, Bracket)
      consultant/           # Consultant pane — model feed, chat, history
    toast-host.tsx          # Mounts the deck-editor toast stack (src/hooks/use-toast.ts)
    deck-role-chip.tsx      # Role badge/editor chip used in the deck workspace grid
  hooks/                  # Shared React hooks (deck editor state, toasts, hotkeys)
  db/
    schema.ts             # All 38 database migrations
  lib/                    # Business logic & utilities
    db.ts                 # SQLite singleton (globalThis for HMR safety)
    auth.ts               # JWT + scrypt auth
    auth-middleware.ts     # API route auth guard
    types.ts              # TypeScript interfaces (ScryfallCard, DbCard, Deck, etc.)
    constants.ts          # Game constants (formats, mana colors, card types)
    utils.ts              # Utility functions (cn, slugify, debounce, groupBy)
    scryfall.ts           # Scryfall API client (rate-limited, 100ms)
    deck-validation.ts    # Format-specific deck rules
    deck-export.ts        # Export to Arena/MTGO/text
    deck-templates.ts     # 11 archetype templates with mana curves and slot ratios
    commander-synergy.ts  # Commander oracle text analyzer (12 trigger categories)
    deck-builder-ai.ts    # AI deck construction with synergy scoring
    claude-suggest.ts     # Claude API integration for AI chat and deck building
    arena-parser.ts       # Parse Arena export format
    arena-log-reader.ts   # Parse Arena Player.log
    arena-game-events.ts  # Game event extraction from Arena JSON blocks (12 event types)
    game-state-engine.ts  # Real-time game state tracking + draw probabilities
    grp-id-resolver.ts    # 4-layer Arena grpId → card resolution pipeline
    mulligan-advisor.ts   # Deterministic keep/mull heuristic engine
    sideboard-guide.ts    # AI-powered sideboard plan generator
    edhrec.ts             # EDHRec recommendations with caching
    ai-suggest.ts         # Rule-based card suggestions
    match-analyzer.ts     # Match analytics
    electron-bridge.ts    # Electron IPC bridge (includes overlay events)
    first-boot.ts         # First-launch account creation and card seeding
    bracket.ts             # Commander bracket (2-5) classifier — game changers, MLD, extra turns, fast mana
    benchmark-metrics.ts    # Deck-vs-top-decks metric deltas for BenchmarkTile
    deck-benchmark-live.ts  # Live benchmark computation backing GET /api/decks/{id}/benchmark
    suggestion-sources.ts   # Shared vocabulary for AI-suggestion source labels (model/llm/rules tone)
    deck-grouping.ts        # Deck card grouping/sorting helpers for the workspace grid
    __tests__/            # Unit tests (564 tests across 39 files)
electron/
  main.ts                 # Electron main process (splash screen, spawns Next.js standalone server)
  next-server.ts          # Standalone Next.js server launcher
  preload.ts              # Context isolation bridge
  ipc-handlers.ts         # IPC message handlers
  setup-handlers.ts       # Setup wizard IPC handlers
  arena-log-watcher.ts    # Live Arena.log file monitoring (streaming mode + GameStateEngine)
  resources/
    setup.html            # First-run setup wizard UI
scripts/
  pipeline.py             # 10-step ML pipeline orchestrator
  pipeline_state.py       # Pipeline step state management and degradation tracking
  pipeline_telegram_bot.py # Telegram notifications for pipeline status
  scrape_mtggoldfish.py   # Tournament deck scraper with W-L records
  scrape_mtgtop8.py       # Competitive meta deck scraper
  scrape_edhrec_articles.py # EDHREC strategy article scraper
  fetch_avg_decklists.py  # Average decklist fetcher per commander
  aggregate_community_meta.py # Community data aggregation + archetype win stats
  train_model.py          # ML model training (personal/community/blended)
  predict_suggestions.py  # Generate personalized card suggestions
  afterPack.js            # electron-builder hook: rebuild better-sqlite3 for Electron
  postbuild-standalone.js # Copy static assets + native modules into standalone
  import_user_data.py     # Import exported user data
  setup_scheduled_task.py # Windows Task Scheduler for daily pipeline runs
build/
  icon.svg                # Grimoire book icon with gold pentagram
  icon.ico / icon.png     # Generated icon variants for all platforms
```

## Key Commands

```bash
npm run dev              # Next.js dev server (:3000)
npm run dev:electron     # Full Electron + Next.js dev mode
npm run build            # Next.js standalone build + postbuild asset copy
npm run build:electron   # Compile Electron TypeScript
npm run test             # Vitest (run once)
npm run test:watch       # Vitest (watch mode)
npm run test:python      # Python tests (pytest)
npm run test:all         # Both test suites
npm run lint             # ESLint via next lint
# Card database seeding runs automatically on first boot, or trigger manually via POST /api/cards/seed
npm run dist:win         # Package Windows installer (NSIS + portable + zip)
npm run dist:mac         # Package macOS app (DMG + zip)
npm run dist:linux       # Package Linux app (AppImage + deb + tar.gz)
npm run dist:all         # All platforms
py scripts/pipeline.py --reset-step <STEP>  # Clear degraded pipeline step
```

## Code Conventions

- **Path alias:** `@/*` maps to `./src/*`
- **Components:** PascalCase filenames, `'use client'` directive for interactive components
- **Functions:** camelCase
- **Constants:** UPPER_SNAKE_CASE
- **DB columns:** snake_case
- **Styling:** Tailwind utility classes, `cn()` helper for conditional classes (clsx + tailwind-merge)
- **Indentation:** 2 spaces
- **Error handling:** try/catch in API routes returning `{ error: string }` JSON responses
- **Auth:** All data-mutating API routes use `auth-middleware.ts` to extract userId from JWT cookie
- **DB queries:** Always parameterized (prepared statements), user-scoped with `WHERE user_id = ?`

## Architecture Notes

- **Electron main process** spawns Next.js standalone server as a child process via `ELECTRON_RUN_AS_NODE`, loads `http://localhost:{port}` in BrowserWindow
- **Next.js standalone mode** (`output: 'standalone'`) bundles only traced dependencies (~55MB vs 190MB full node_modules), reducing packaged app from 719MB to 443MB
- **Standalone deployed via `extraResources`** in electron-builder to bypass `!node_modules` glob filtering — accessed at runtime via `process.resourcesPath`
- **Splash screen** shows grimoire-themed loading UI immediately while standalone server starts (2-4s)
- **SQLite connection** uses singleton pattern via `globalThis` to survive Next.js HMR
- **FTS5** full-text search on cards table (name, oracle_text, type_line)
- **Card search** tries local FTS5 first, falls back to Scryfall API
- **Multi-user support** via users table, all queries scoped by user_id
- **Deck validation** enforces format rules (Standard 60-card, Commander singleton 100-card, etc.)
- **Arena integration** parses Player.log for match results, collection import, deck submissions
- **Live Arena overlay** — transparent always-on-top deck tracker during matches (Alt+O toggle, Alt+L click-through)
- **Game state engine** consumes Arena JSON events, tracks zones/life/cards drawn, computes draw probabilities
- **GrpId resolver** — 4-layer pipeline: memory cache → grp_id_cache DB → cards.arena_id → Scryfall API
- **Mulligan advisor** — deterministic heuristic (sub-10ms), archetype-aware, no API calls
- **Sideboard guide** — Claude-powered boarding plans cached per deck/matchup
- **Commander synergy engine** parses oracle text for 12 trigger categories, scores candidates, merges with archetype templates
- **Build API service** (`services/build-api/`) — the same engine as a plain HTTP service for the public web app (theblackgrimoire.com): `POST /build` (autoBuildDeck), `POST /analyze` (Deck Doctor core in `analysis-core.ts`), `POST /optimize` (`optimize.ts` + pure `src/lib/deck-optimizer.ts`, `land-math.ts`, `decklist-normalize.ts`), `POST /cards/lookup`. Runs on the VPS under pm2 `build-api` at `/opt/grimoire-build-api/app` (Node 20, tsx); deploy procedure in black-grimoire-web `DEPLOY.md` §5 — always `npm install --ignore-scripts && npm rebuild better-sqlite3` there
- **Deck editor command center** — 3-pane HUD shell (`src/components/command-center/`) replacing the old single-column editor: a Consultant pane with a passive model feed (CF/bandit-ranked suggestions, auto-refetched on deck change) plus chat, a Live Rail of tick-animated tiles (score/roles/benchmark/coverage/synergy/curve/bracket), and per-card role overrides that persist and feed the ratio-health scoring — see `docs/COMMAND_CENTER.md`
- **UI theme** — "Black Grimoire" book aesthetic: Cinzel headings, Crimson Text body, leather-brown palette, gold accents, vignette overlay, ornate borders
- **afterPack hook** rebuilds better-sqlite3 native module for Electron's Node version, caches prebuilt binaries
- **Pipeline fallback system** — 3x retry per step with backoff, cross-run failure tracking via `data/pipeline_failures.json`, 24h degraded auto-skip for optional scrapers, Telegram notifications

## Database

SQLite at `data/mtg-deck-builder.db` (or `MTG_DB_DIR` env var). 51+ tables across 38 migrations. Key tables:

- `cards` — 35K+ cards from Scryfall with FTS5 index
- `users` — Accounts (username, email, password_hash)
- `decks` / `deck_cards` — Deck metadata and card composition (main/sideboard/commander/companion)
- `deck_versions` — Automatic deck snapshots for version history
- `collection` — User card inventory
- `match_logs` — Game history with opponent info
- `card_performance` — Win-rate tracking per card/format
- `community_decks` / `community_deck_cards` — Scraped tournament/community decks with W-L records
- `meta_card_stats` — Aggregated card statistics across community data
- `archetype_win_stats` — Win rates by archetype from tournament data
- `edhrec_knowledge` / `edhrec_avg_decks` — EDHREC strategy articles and average decklists (FTS5)
- `app_state` — Application settings (API keys, preferences)
- `arena_parsed_matches` — Parsed Arena log match data with grpId mappings
- `grp_id_cache` — Arena grpId → card name resolution cache (Scryfall API)
- `sideboard_guides` — AI-generated sideboard plans per deck/matchup
- `live_game_sessions` — Live overlay match tracking with mulligan/sideboard data

Migrations run automatically on startup. Schema defined in `src/db/schema.ts`.

## Environment Variables

```
MTG_DB_DIR=       # Custom database directory (default: data/, in Electron: %APPDATA%/the-black-grimoire/data/)
JWT_SECRET=       # JWT signing secret (has dev default, change for prod)
NODE_ENV=         # development | production
PORT=             # Server port (default: 3000, auto-finds available port 3000-3009)
```

## Testing

Tests live in `src/lib/__tests__/` and `tests/`. Run with `npm test`. 340 tests across 18 files. Key test suites:

- `utils.test.ts` — Utility functions
- `arena-parser.test.ts` — Arena format parsing
- `arena-log-reader.test.ts` — Arena Player.log parsing
- `arena-game-events.test.ts` — Game event extraction from JSON blocks
- `game-state-engine.test.ts` — Game state tracking engine
- `grp-id-resolver.test.ts` — GrpId resolution pipeline
- `mulligan-advisor.test.ts` — Mulligan keep/mull heuristics
- `sideboard-guide.test.ts` — Sideboard guide generation
- `overlay-integration.test.ts` — End-to-end overlay flow
- `deck-export.test.ts` — Export formats
- `deck-validation.test.ts` — Format legality rules
- `ai-chat-helpers.test.ts` — AI chat helper functions
- `card-classifier.test.ts` — Card classification utilities
- `constants.test.ts` — Game constants
- `platform-detect.test.ts` — Overwolf/Electron detection
- `tests/db.test.ts` — Database operations
- `tests/edhrec.test.ts` — EDHREC integration
- `tests/analytics-api.test.ts` — Analytics API

Python tests in `scripts/tests/`, run with `npm run test:python`.

## Common Patterns

**Adding a new API route:**
1. Create `src/app/api/<name>/route.ts`
2. Import `authenticateRequest` from `@/lib/auth-middleware`
3. Validate input with Zod
4. Call db functions from `@/lib/db.ts`
5. Return `NextResponse.json()`

**Adding a new page:**
1. Create `src/app/<name>/page.tsx` with `'use client'`
2. Use `useAuth()` hook for user context
3. Fetch data from API routes via `fetch('/api/...')`

**Database changes:**
1. Add new migration to `MIGRATIONS` array in `src/db/schema.ts`
2. Increment migration number, add SQL statements
3. Migration runs automatically on next app startup

## Packaging Notes

- `npm run build` produces `.next/standalone/` with `server.js` + traced node_modules
- `scripts/postbuild-standalone.js` copies `.next/static`, `public/`, and native modules into standalone
- `electron-builder.yml` places standalone in `extraResources` (bypasses node_modules filtering)
- `scripts/afterPack.js` rebuilds better-sqlite3 for Electron, caches prebuilt binaries
- Packaged app: ~443MB unpacked, ~153MB installer
- Data stored at `%APPDATA%/The Black Grimoire/` (Windows) with crash log for diagnostics

## Production Recommendation Engine

The desktop app calls the CF API for collaborative-filtering recommendations. The default endpoint is configured via the setup wizard (Step 4: "Connect to Recommendation Engine") and persisted to `app_state.cf_api_url`.

- **Production host**: VPS at 187.77.110.100, served at `http://187.77.110.100/cf-api` via nginx → Docker container `grimoire-cf-api-api-1` on port 8000
- **Data**: 3.9M+ scraped decks (Moxfield + Archidekt + EDHREC; likes/views only — NO tournament placements or W-L exist in the corpus, and no MTGGoldfish/MTGTop8 decks; verified 2026-09-02). Retraining: cron `0 22 * * *` spawns a pipeline daemon (6h cycles); VW bandit retrains every cycle, SVD retrains after each +50K new decks.
- **Auth**: `x-api-key` header. Key set in `app_state.cf_api_key` per user, prompted in setup wizard Step 4.
- **Schema**: Postgres tables `decks`, `deck_cards`, `card_popularity`, `commander_card_stats`, `model_artifacts` (binary SVD model + Vowpal Wabbit contextual bandit model).
- **Health endpoint**: `GET /health` returns `{status, deck_count, model_version, last_retrained, vw_model_active, vw_model_trained_at, vw_model_size_kb}`.
- **Key endpoints**: `POST /recommend` (body: `{cards: string[], commander: string, limit: number}`), `POST /events` (track user selections for bandit learning), `POST /optimize` (deck-level recs), `GET /commander_stats`.
- **Backups**: Weekly `pg_dump` on VPS at `/opt/grimoire-pg-backup.sh`, Sundays 02:00 UTC, keeps 5 weekly + 6 monthly snapshots in `/opt/grimoire-backups/`. Telegram alerts on success/fail.
- **Resource scheduler**: `/opt/cf-resource-scheduler.sh` adjusts container memory limits hourly (work hours 5–16 UTC: api 2GB / postgres 768MB; off hours: api 3GB / postgres 768MB). Pipeline retrain step requires the off-hours allocation.
- **Critical config**: `docker-compose.prod.yml` api service must have `memory: 4G` resource limit so `docker compose run` retrain containers don't OOM at the 80K-deck × 33K-card matrix build step.

## Cloud Topology

- **Production**: VPS only. All traffic to `187.77.110.100`.
- **Standby**: Railway project `nurturing-radiance` (Hobby plan). Postgres + Redis online. Hosts a duplicate `grimoire-cf-api` deployment that serves as DR target. Data synced from VPS via weekly pg_dump → psql restore (set up 2026-05-05).
- **Fail-over runbook**: If VPS dies, point desktop apps at `https://grimoire-cf-api-production.up.railway.app/cf-api` by changing `app_state.cf_api_url` (or via Settings dialog).

## graphify
This repo has a graphify knowledge graph at `graphify-out/graph.json` (interactive `graphify-out/graph.html`, report `graphify-out/GRAPH_REPORT.md`).
Before answering architecture/codebase questions here, query it instead of cold-grepping: `/graphify query "<question>"`.
After changing code, refresh it: `/graphify . --update`.

## Session Log

Rolling context so a fresh session — or a different model, account or tool — starts where the
last one stopped. Append one entry per completed unit of work (shipped code, a decision, an
artifact, a resolved incident); commit it with the work it describes.

```
### YYYY-MM-DD — <topic>
- **Did:** what shipped, with commit SHAs / file paths / IDs
- **Why:** the decision and the reason, especially where the obvious choice was rejected
- **Open:** what is unfinished, expiring, or deferred — with the trigger
```

### 2026-09-26 — Reality Fracture (fra/frc) cards loaded into the live card DB
- **Did:** `scripts/update-card-data.ts` run on the APPDATA DB from Scryfall oracle bulk (09-26 09:01 UTC): 263 inserted, 35,093 refreshed; fix: UPDATE keyed on `oracle_id` (the live DB holds 892 duplicate-printing rows the old `id = @pk` left stale) + INSERT writes `game_changer`. `verify-2026-09-26/fra/verify-fra.ts` vs the live search API: 372/372 unique fra+frc cards present, 0 drift. `classify_lands.py` re-run (18 FRA/FRC lands classified). Backup `%TEMP%/mtg-cards-backup-1790451304077.db`.
- **Why:** Scryfall is the source of truth; the live search API cross-check catches anything newer than the daily bulk snapshot.
- **Open:** set releases 2026-10-02 — re-run the script + verifier after release (Arena IDs are unassigned today, so Arena-collection matching for FRA waits on `fetch_mtgjson.py`, which only targets the repo DB); VPS build-api DB and the repo `data/` DB (test/deck-score reference pin) NOT updated; new cards are untyped in the deck-score catalogue (provisional scores).

### 2026-09-27 — Card refresh hardening, CF model review + fixes, build-api hotfix; deck-score card re-freeze REVERTED
- **Did:** bda734c/7665005/f45d449 card pipeline (`fetch_mtgjson.py` targets APPDATA + `--db`, Arena IDs fill-only after a `--help` run nulled 326 live IDs — restored from the 09-26 backup; `scripts/refresh-cards.sh` = bulk → MTGJSON → land classes → fra verify); VPS build-api card DB refreshed (backup `build-api-db-pre-cards-2026-09-27.db`), re-sync one-shot `grimoire-cardsync-oneshot` 10-03 06:00 UTC. CF review `verify-2026-09-27/cf-model/review.md`; desktop 12a03cf/f0d5140/7153954/81a8075 (impression registry, events join impressions, internal callers `logImpressions:false`) ship with beta.4; CF API 328e189/813bde0/c377c12/82db6bc deployed (image 96e37771986c, rollback tag `pre-328e189`); build-api `hotfix/build-api-2026-09-27` (b82d099, unpushed) deployed 12:38 UTC.
- **Why:** VW crash gated (`VW_MIN_OUTCOMES=500`) — 0 outcomes this week; eval 101 days stale → post-retrain regression eval chain (`ops/retrain-then-eval.sh`) + weekly eval cron. Deck Score rc10 + refreshed cards (ds-cards): Brawl fresh-control top-tail 40 → 55/516 (limit 52; refresh alone 53 — 485 newly Brawl-legal cards) → reverted, repo DB and pins stay on old card data (`~/.claude/harness/runs/deck-score-2026-09-19/rc10-cards-attempt.patch`).
- **Open:** tonight on the VPS: SVD retrain 16:05 → eval ≤ 21:30 → `cf-deploy-9e927eb` (ops/deploy-after-chain.sh, polls from 16:10, ships 14eedf1+9e927eb cache-hit impressions, refuted PASS, auto-rollback) → F5 apply 21:40 → daemon 22:00; commit VPS `ops/` only AFTER the deploy (HEAD check). Deferred: VW pmf-as-score needs cb_adf/softmax + distinct-deck gate before 500 outcomes; `rollback()` try/except (LOW); investigate why newly legal Brawl cards lift random piles to rank ≥ 95; port b82d099 onto `hotfix/builder-plan-2026-09-26`; FRA release 10-02 → re-run `refresh-cards.sh`.

### 2026-09-28 — Paper: Cabbage Merchant registered, Blight Curse dismantled, Tam superfriends deck finalised
- **Did:** 2d94b6c Cabbage Merchant registered (99 known); 637c5c5 Blight Curse precon registered + 52f8cb8 keep page; a5f0955 → this commit: 144 operator-listed cards registered in five batches (`decks/paper/collection.txt`, 1,252 owned, paper-sync on the APPDATA DB); final `decks/paper/proposals/superfriends-tam.txt` = Tam + 20 walkers + 7 Ways + Jace-empower package (Protege's Awakening, Avatar of Burgeoning Echoes, Arcane Amphisbaena, Rewrite Regrets, Entrust the Spark, Pia) + Tomik/Archangel/Geist/Liliana the Faultless, 10 ramp, 9 removal (Settle, Shatter, Final Act), 36 lands. Gate PASS on everything except `plan`; 0 game changers. Then Atomize, Flux Channeler, Innkeeper's Talent (owned, not yet located) in for Generous Gift, Teyo, Way of the Healer (19 walkers, 6 Ways); Timeless Lotus (pays the Tam activation) and Great Hall of the Citadel in for Identity Echo, Path of Ancestry. Second Toxic Deluge registered (first is in Meren), in for Fire Covenant. Jace, Memory Adept (a second Jace for the 25-loyalty win) and Mana Confluence in for Kasmina, Evolving Wilds. Shivan Reef, Great Divide Guide (every land taps any colour), Fumigate (life gain feeds Mentor) in for Cinder Glade, Cultivate, Shatter the Sky; Sunken Hollow registered and benched (1,263 owned). Innkeeper's Talent not found by the operator → Way of the Healer back in (7 Ways); Talent stays registered, benched until found. Thrummingbird (registered in batch 5, never placed) in for Fatehold Charm. Esika, God of the Tree // The Prismatic Bridge (operator named it as a commander option; never registered or placed) registered and in for Omenpath Journey (1,264 owned). Ob Nixilis, the Hate-Twisted replaces Reignited; operator owns Hate-Twisted + Black Oath, not Reignited (collection corrected), Black Oath in for Kaito, then Kaito back at 35 lands (unique walker type for Tam X) for Dragonskull Summit; Seachrome Coast registered, in for Umbral Expanse (1,265 owned). Konstrari Annex not found → Cinder Glade (same R/G, typed for the checklands); Annex stays registered, benched. Chimil, the Inner Sun (discover 5 each end step, 59/64 nonland hits) in for Tomik. Boros Charm not found → Kaya's Ghostform (operator's pick over Simic Charm); Charm stays registered, benched. Deck confirmed: `decks/paper/decks/tam-the-possibility.txt` (paper-sync v1, 763 open cards left). Guide page `decks/paper/superfriends-tam.html` + Desktop copy, generated by `verify-2026-09-28/superfriends-guide-page.ts`.
- **Why:** Tam over Esika: Ways are enchantments and The Prismatic Bridge reveals only creatures/walkers. Engine = Way of the Paradox (life per loyalty activation) + Way of the Mentor (loyalty on every walker per life gain). Win lines: Jace, Reality Sculptor 0 at 25 Jace loyalty; Vraska, Betrayal's Sting −9 + proliferate; Sarkhan the Masterless dragon alpha; ultimates. Liliana, Dreadhorde General stays in Meren. Swords, Sakura-Tribe Elder, Fellwar Stone, Gilded Lotus, Inspiring Vantage left out: one registered copy, sleeved in Tazri/Meren/Imotekh.
- **Audit:** all 5 paper decks audited vs the open pool (`verify-2026-09-28/deck-audit/`: per-deck report + proposed list, `check-coverage.py` = every open card with EDHREC ≤ 3000 / ≥ $4 / game changer has a verdict, `REFUTE.md` = Opus refuter 19 KEEP / 16 REJECT). Verified recommendations presented, NOT applied: Tam +Well of Lost Dreams −Chandra FA, +Domri −Rewrite Regrets; Meren −Creakwood Liege (101st) +Vito/Grave Titan/Jungle Hollow; Tazri 6, Imotekh 5, Cabbage 4 + Elvish Archdruid as 100th. Round 2 = Reality Fracture: operator owns most unregistered FRA commons/uncommons + echo pairs (not the Chandras/Garruks) → `build-fra-assumed.py` (211 cards, ASSUMED/IF-OWNED tiers), every card verdicted per deck (`*-fra-verdicts.md`, checker enforces), `REFUTE-FRA.md` 7 KEEP / 16 REJECT; `final-swaps.json` (61 rows, 29 KEEP incl. 2 Tazri HELD for operator yes) → `decks/paper/deck-upgrades.html` + Desktop copy via `upgrade-page.ts` (all decks 100 after swaps, 123 images, Playwright-checked). Round 3 = five Fable reviews (`*-fable-review.md`, merged into `final-swaps.json` with fable ✓/✗/new + OPTIONAL/HELD notes): Tam = Ral Zarek −Rewrite Regrets only (Ashiok/Domri optional); Well of Lost Dreams removed from the collection (operator does not own it — a Witherbloom precon-list registration, never hand-counted). The review ran as capped passes and never converged (operator: crucial error) → memory `feedback_deck_review_fixed_point.md`.
- **Open:** operator picks swaps from `deck-upgrades.html` → apply to `decks/paper/decks/*.txt`, register ASSUMED/IF-OWNED cards first (gate ownership fails otherwise), paper-sync, gate; Tazri Grand Abolisher/Growth Spiral need an explicit yes; order list given to the operator (Chain Veil + Teferi, Temporal Archmage = infinite with Paradox + Mentor; Oath of Teferi, Carth, Deepglow Skate, Karn's Bastion); the gate's `plan` check has no superfriends plan.

### 2026-09-30 — Arena Tam built from the owned pool; collection builder mana-base defects diagnosed
- **Did:** Untapped export `Downloads/collection(5).csv` replaced user 1 Arena collection (backup `verify-2026-09-30/arena-tam/collection-arena-backup-pre-csv5.json`); `refresh-cards.sh` fixed stale FRC brawl legality. Map-reduce build: `build-arena-pool.py` (4,655 owned brawl-legal cards, 11 chunks) → 11 sonnet screens (`check-screens.py` last-card proof) → Fable fixed-point build with stop proof → `final.txt` (35 lands, 0 basics: 9 shocks, 3 fetches, 4 Verges, checks, slowlands; gate PASS except plan), `build-report.md` §7 Monte Carlo land count (35: 81.7 % three sources by T3 on the play).
- **Why:** operator rejected the 20-basic base ("I have way better lands"); 31 → 35 lands because only Signet/Tender/Lantern/Esika ramp inside T1–4 windows. Karn −2 has no sideboard in Arena Brawl (face-up exile only).
- **Open:** `engine/landbase-diagnosis.md` — the builder scopes ownership by neither user nor source (`deck-builder-ai.ts:693`, `:714`, `land-intelligence.ts:129`), credits 30 × claimed colours (`land-intelligence.ts:286`), `mana-sources.ts` credits 5 colours to chosen-type lands/basic fetchers and misses counter/Gate/granted gates, so the auditor never repairs; 3-rule fix + test plan §5–6 awaits operator approval (hotfix branch off deployed b82d099).

### 2026-09-30 — Collection builder mana base + superfriends + perf → build-api 6791d3e deployed; weekly card sync
- **Did:** `hotfix/builder-plan-2026-09-26` (worktree `mtg-score-tmp`, unpushed) b82d099 → 6791d3e, 3 Opus refuter rounds (`~/.claude/harness/runs/landbase-2026-09-30/`: briefs U1–U12, REFUTE-BRIEF): ownership scoped by user+source (`collection-ownership.ts`, A-X ≡ X, arena ⊇ arena_csv), honest colour counting (`mana-sources.ts`), superfriends archetype (walker floor 18/12, walker-support via `isWalkerSupportCard`), Step 4b floor-aware ramp + removal/wipe protection (`isStep4bDisplaceable`), optimizer paired swaps + front-face land count, price min across printings (COALESCE, `--db`, unknown flags rejected), migration v47 NOCASE index (also on auto-improve 30d1f51). Deployed 12:05 UTC (backups `/opt/grimoire-backups/manual/build-api-{app-pre-6791d3e.tgz,db-pre-6791d3e-2026-09-30.db}`); card sync run (35,356 updated, 2,231 prices, 1,318 lands classed, FRA 372/372); weekly timer `grimoire-cardsync.timer` Mon 05:00 UTC. Live: collection builds 30 s → ~2 s, Niv-Mizzet $150/b2 → $144.19/b2, Tam superfriends 18 walkers, 0 unpriced.
- **Why:** Deck Score reads the default `analyzeCommander`/`classifyCard` path, so every builder change is opt-in (`{superfriends, walkerCount, tribalPayoff}`) — identity test vs b82d099 + 8 lists × 2 paths byte-equal. Edgar aggro → tribal accepted (eminence pays off Vampires). `git archive` on this Windows checkout emits CRLF — `sed -i 's/
$//'` shell/py scripts on the VPS or bash dies on `pipefail
`.
- **Open:** U12 (Fable) running — Ways 0–3/10 in Tam builds, auditor draw count counts reminder text, walker guard for non-superfriends planeswalker category, optimizer land advice 40 vs band 37–39. Two Fable deck-quality auditors (`C:/Users/QuLeR/mtg-audit-wt` at a21f2ff, reports `verify-2026-09-30/audit-{A,B}/report.md` there) → next fix round. Port all engine fixes to auto-improve for beta.4; partner commanders read only the first commander; other callers (ai-suggest, claude-suggest, pilot-guide) on the default path; FRA release 10-02 → oneshot 10-03 06:00 UTC re-syncs.

### 2026-10-02 — Arena Captain Sisay (Historic Brawl) superfriends/lifegain/tokens deck built from the owned GW pool
- **Did:** `verify-2026-10-02/sisay/`: `build-pool.py` (1,775 owned GW brawl-legal cards = DB Arena collection ∪ operator paste `operator-list.txt`, 6 chunks) → 6 sonnet screens (`check-screens.py`: all read to the last card, 1,143 passed) → `quick-v1.txt` (hand-built, gated) → Opus fixed-point build (`build-report.md`, 10 swaps) → Opus refuter (`REFUTE.md`, +3 swaps: Emergency Eject, Inspiring Commander, Flare of Fortitude) → `final.txt`. Gate: all PASS except `plan` (no legendary-tutor model) and `ownership` for Liliana the Faultless + Germinate Recruits (FRA, in the operator's paste, newer than the 09-30 CSV snapshot).
- **Why:** engine = Way of the Paradox × Way of the Mentor + Healer/Wildspeaker token −abilities on 12 of the 13 owned GW walkers; creature-ETB lifegain (Liliana, Aunt May, Haliya, Propagator, Sanctifier, Emissary, Dazzling Angel) turns every token into loyalty; Greaves/Boots + Tezzeret 0 / Formidable Speaker untap = extra Sisay tutors. Flawless Maneuver and Obscuring Haze in the paste are Brawl-banned.
- **Open:** 7 FRA cards from the paste are not in the DB collection until the next Untapped CSV import; refuter called Karn-over-Arlinn and Forest-over-Ba Sing Se marginal (operator's choice).

### 2026-10-02 — Paper Tam + Tazri upgraded from the Strixhaven precons (Quandrix/Silverquill) + new FRA/SOS cards; Meren/Imotekh placements
- **Did:** `verify-2026-10-02/tam-precons/`: Opus fixed-point passes (Tam `tam-report.md`, Tazri `tazri-report.md`, new cards `newcards-report.md`) + joint Opus refuter `REFUTE.md` (27/27 KEEP, +3 missed: Uro −Farseek Tam; Ingris Stingerquill −Keen Duelist, Zimone Quandrix Prodigy −Realmwalker Tazri) → `tam-final.txt` (9 swaps), `tazri-final.txt` (19 net), `meren-final.txt` (−Sylvan Library −Llanowar Wastes to Tam, +Animate Dead [S] +Haunted Mire, 09-28 swaps 1–5, +Beifong's Bounty Hunters −Moldervine; 100), `imotekh-final.txt` (+Liliana the Repentant −Razorlash Transmogrant). Gates: size/singleton/legality PASS; ownership FAILs only on unregistered precon/new cards; `plan` known.
- **Why:** Tomik, Wielder of Law out (conditional draw, its 3-life tax deters the attacks that trigger it); Mangara → Tazri (party Cleric); Animate Dead over Greed as Meren backfill (09-28 audit rejected Greed); Liliana the Repentant → Imotekh (her mill truncates Meren's loop). 21 other new cards: no slot (per-card proof in REFUTE.md / newcards-report.md).
- **Then:** operator confirmed (09-30 Tam walker swaps already sleeved) → both precons (200) + 14 new cards registered (`decks/paper/collection.txt` 1,267 → 1,481, Echoverse Fulcrum ×2), the four `*-final.txt` lists written to `decks/paper/decks/`, paper-sync (Tam v2, Tazri v15, Meren v9, Imotekh v4; DB backup `mtg-deck-builder.db.bak-2026-10-02-pre-precons`); gate with paper ownership: all PASS except the known `plan`. Corrected to what is sleeved: Tam v3 = operator variant (Turbulent Wilderness for Llanowar Wastes, Entrust + Nomad Outpost kept, no Path) v5 = 100, 35 lands: the operator had cut an unidentified land (Dedicated Commons or a tri-land) for Turbulent Wilderness while keeping Entrust → told to put that land back and cut Entrust the Spark (Nexus Mentality's planned pair); v8 (box check via `decks/paper/deck-check.html`, generator `verify-2026-10-02/tam-precons/check-page.ts`, now with a text filter): Dragonskull Summit is sleeved, Woodland Cemetery is not → recorded; v9: operator keeps Entrust the Spark (sacrifices Jace tokens) and Quintorius, plays 34 lands without the Plains; Jace, Multiverse Architect (FRA precon commander) registered, open, hot-swaps into Tam for Chandra, Awakened Inferno; Meren v10 = only Sylvan Library removed (Llanowar Wastes stays; Animate Dead / Bounty Hunters / Vito / Grave Titan / Dina / Jungle Hollow / −Creakwood still recommended, not applied).
- **Open:** Woodland Cemetery 3rd copy / Shipwreck Marsh foil 2nd copy unanswered (not registered, unused); names assumed for "Ingris Silverquill" = Ingris Stingerquill and "Variable Chase" = Variable Chaser; operator ties: Konstrari Annex vs Rootbound Crag, Fulcrum vs Settle, Tazri 35th land (Vernal Fen / Shipwreck Marsh).

### 2026-10-02 — Inspirit, Flagship Vessel (paper UWR) registered + converged draft; deck-building skill
- **Did:** f30e09b Inspirit registered as given (101, 17 typos resolved; 6 cards shared with Tam/Tazri registered as second copies). Opus build (`verify-2026-10-02/inspirit/build-report.md`, 14 swaps) → Opus refuter `REFUTE.md` (13 KEEP; Walking Ballista REJECT, it is Cabbage's combo kill; +4 missed: Peter Parker's Camera, Final Showdown −Fumigate, The Echoverse Fulcrum −Chain Reaction, Way of the Cryomancer −Mindless Automaton; one Mountain → Plains) → `inspirit-proposed.txt` (100, 37 lands; gate all PASS except the known `plan`). Check page Inspirit tab = draft, review row = the optional trade. Skill `.claude/skills/deck-building/` (30bf6eb, ea84156, 2c8f711: SKILL.md, LEARNINGS.md, q.py, reference/ from 59 sources); pilot guides for 5 decks in `verify-2026-10-02/deck-research/decks/`.
- **Why:** station may tap summoning-sick creatures (CR 302.6), so Bygone Colossus/Traxos stay; symmetric wipes kill a stationed Inspirit; proliferate refuels Camera's film counters. All open walkers rejected except Cryomancer (Tezzeret, Master of the Bridge is black).
- **Open:** the draft is NOT applied — `decks/paper/decks/inspirit-flagship-vessel.txt` and paper-sync wait for the operator's sleeve confirmation; optional trade Saheeli, Sublime Artificer −Pinnacle Emissary ↔ Mu Yanling, Sky Dancer to Tam needs a yes; no Inspirit pilot guide yet (write it once the list is sleeved).
- **Then (Inspirit):** the operator confirmed nothing is sleeved yet and no longer owns Peter Parker's Camera (removed from `collection.txt`, paper-sync, 1,567 owned; DB backup `mtg-deck-builder.db.bak-2026-10-02-camera-gone`). The operator caught Depthshaker Titan as the deck's Craterhoof (the builder and refuter had both cut it), so it stays and takes the Camera slot: the draft keeps Traxos in for Golem Foundry. Gate as before. Check page: basic-land +N / OUT ×N, hover zoom (Scryfall large image).
- **Then:** guide fact-check `verify-2026-10-02/deck-research/decks/VERIFY.md`: 190 claims, 2 real fixes applied (Meren Saw in Half quote, Imotekh Zealot wording); 2 verifier findings refuted against CR 2026-09-25 (121.2 = draws one at a time) and the Spelunking ruling; Ob Nixilis HT deals 1 per draw (DB + live Scryfall), so the Tam 20-damage line stands. Guides copied to `.claude/skills/deck-building/reference/decks/`. `.git/refs/heads/auto-improve` was found zeroed after 833d338 → restored from the reflog (`brain/debug-journal/2026-10-02-git-branch-ref-zeroed.md`).
- **Then (round 2):** ~140 operator in-hand cards (batches 2b–2h, `ADDENDUM-2B.md`) → Opus build `build-report-2.md` → 2 sonnet screens of every free UWR card (`screen-2-{1,2}.md`, 189/189 rows each) → Opus refuter `REFUTE-2.md`: all 34 swaps KEEP, 1 missed swap (Zookeeper Mechan −Lost Jitte, applied), Adaptive Automaton / Jazal REJECT, 13 text/maths errors with no swap flips (Cyberdrive unattaches Equipment, CR 301.5c). `inspirit-proposed-2.txt` (100, 38 lands) gate all PASS except the known `plan`; check page Inspirit tab = round 2. Operator cut Sheltered by Ghosts (exile ends when the aura on our creature leaves) → Abrade; operator picks Thunderhulk −Darksteel Reactor, Voyage Home −Reverse Engineer, Chandra SH −Kappa, One Last Job −Organic Extinction, Lost Jitte back −Astral Cornucopia (Zookeeper stays), Archway of Innovation + Uthros, Titanic Godcore −2 Islands (sim: tapped U for an Island −0.9 T3, −0.4 T7); Repurposing Bay −Etched Oracle (Cyberdrive → Bay → Craterclaw/Depthshaker, CR 611.2a); check page gained a swaps-by-card-type section; operator does not own Bovine Intervention (removed from `collection.txt`, paper-sync 1,671 owned, DB backup `mtg-deck-builder.db.bak-2026-10-02-bovine-gone`) → Rapid Hybridization; gate as before. Operator confirmed sleeved → `decks/paper/decks/inspirit-flagship-vessel.txt` = round-2 list, paper-sync v2 (100 cards; DB backup `mtg-deck-builder.db.bak-2026-10-02-inspirit-r2-sleeved`). Open: Inspirit pilot guide; 13 of the operator's Urza-list cards (incl. the only Urza, Lord High Artificer) now live in Inspirit.

### 2026-10-02 — Paper Urza deck (mono-U artifacts) built from the operator's partial box
- **Did:** the operator's box (`verify-2026-10-02/urza/urza-box.txt`, 86 cards, no commander; 33 new cards registered, Seat/Thought Monitor/Counterspell as extra copies, eb12f45) → pool 244 free mono-U/colourless cards (`build-pool.py`) + `fra-supplement.md` (37 unregistered FRA cards, ASSUMED/IF-OWNED) → Opus build (`build-report.md`, `verdicts.md` 244 rows) → Opus refuter `REFUTE.md` (31/32 box cuts KEEP; +Donatello −Patchwork Automaton, +Flesh Duplicate −Stonecoil Serpent) → `final.txt` (100, 37 lands + Sink MDFC, gate all PASS except the known `plan`). Check page: Urza tab first (box vs draft, swaps by type, FRA if-owned row).
- **Why:** commander Urza, Lord High Artificer (artifacts = blue mana, Construct scales); his only copy hot-swaps from the Inspirit box, Emry takes his Inspirit slot. The box's spell package (Talrand, Archmage, Baral, cantrips) triggers on 18 spells vs 30+ artifacts → cut; a separate Talrand spells deck is buildable (49 instants/sorceries). A copy of Urza that enters makes a Construct before the legend rule (CR 704.5j) → Flesh Duplicate in. Super State is a 1-of with no tutor (15% by T8); the real close is Worldwalker Helm Construct copies + Whirler Rogue/Rogue's Passage.
- **Open:** operator sleeve confirmation → `decks/paper/decks/urza-lord-high-artificer.txt` (needs the Urza/Emry hot-swap recorded: Urza in this file, Emry in Inspirit's) + paper-sync; ownership of The Theorist / Hall of Echoes / Chandra, Chill of Compliance (FRA rares); near-ties Hammer↔Flicker, Cam↔Island, Djinn↔Stonecoil, Visage Bandit↔Golem Foundry.

### 2026-10-03 — Paper Tam review: one win condition, Sisay as the new commander, buy list
- **Did:** `verify-2026-10-03/tam-wincon/` (`build-pool.py`: 1,135 free cards + 421 in other decks + unregistered FRA; `buys.md` = the operator's 38-card Cardmarket wants) → Opus build (`build-report.md` §1–§8, `sisay-mc.py` goldfish sim) → Opus refuter `REFUTE.md` rev 2 → `tam-fallback-final.txt` (Tam commander, play now: 17 swaps incl. tutors Diabolic/Mastermind's/Loyal Tutor, Tomik, Dovin, Promise of Loyalty, Jared Carthalion, Noble + Ignoble Hierarch for 2 Talismans, Tekuthal + Ripples of Potential from Inspirit ← Contagion Clasp / Experimental Augury) and `sisay-final.txt` (Sisay, Weatherlight Captain commander, Tam in the 99, +9 buys). Both gated: all PASS except the known `plan`; ownership fails only on the buys + Noble Hierarch. Buy list (9): Sisay, The Chain Veil, Teferi Temporal Archmage, Carth, Ichormoon Gauntlet, The Theorist, Aminatou, Oath of Kaya, Vronos (Desktop `cardtrader-buy.txt`).
- **Why:** the old pilot guide listed six win lines and one tutor. Primary = Jace lock (25 loyalty among Jaces → Jace, Reality Sculptor 0 → Jace, Memory Adept −7 / Windfall), which Sisay fetches uncounterably at power 6; backup = Chain Veil + Teferi loop (Paradox → Mentor or Carth keep Teferi level; a deterministic table kill with Chandra ToD +1 or Way of the Warlord), immune to walker attacks. Every Way is a Legendary Enchantment, so Sisay fetches the engine too. Sim: lock by T9 .59 goldfish / .22 with walkers attacked down; Tam-commander lock .05.
- **Open:** operator OK for Ripples leaving Inspirit; ownership of Vraska Soul of Stone / Sanctum Lurker (IF-OWNED FRA); after sleeving: register Noble Hierarch, write `decks/paper/decks/tam-the-possibility.txt` + Inspirit backfills, DB backup, paper-sync, check page, rewrite the Tam pilot guide; when the buys arrive: register them and switch to `sisay-final.txt`.
