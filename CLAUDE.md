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

### 2026-09-19 — First public desktop release (v1.0.0-beta.1), web /download, Arena collection from CSV
- **Did:** Arena collection replaced from the operator's Untapped.gg CSV (`verify-2026-09-19/import-arena-csv.ts`: grpId → name+set → name → front-face resolution, printings summed per card, replace in one transaction, refuses when > 2 % unresolved): 4,739 cards / 13,425 copies dated 2026-09-19 (was 3,957 / 9,041 from 2026-07-02); the five Emperor "unowned" cards are all present. Desktop: `package.json` 1.0.0-beta.1 (d20ddcb), `npm run dist:win`, smoke `verify-2026-09-19/electron-smoke.mjs` (window in 10 s, fresh profile), GitHub Release `v1.0.0-beta.1` (prerelease: NSIS, portable, zip, blockmap, `latest.yml`), `auto-improve` pushed for the first time. **Auto-update bug fixed:** GitHub stores spaced upload names with dots while electron-updater 6.8.3 requests `url.replace(/ /g,'-')` → 404; beta.1 assets renamed to the hyphen form, every `artifactName` template now `${name}` (8be3873). Web: `/download` (GitHub `/releases?per_page=5`, first non-draft — `releases/latest` ignores prereleases; ISR 1 h; fallback to the releases page), header Download button (icon-only < sm, `aria-label`), hero CTA, matches-page link, sitemap = black-grimoire-web `239c283`, deployed ~11:30 UTC; live: 200, v1.0.0-beta.1, 3 `releases/download/` links, dashboard still 307. Sonnet builder + Opus refuter (PASS 15/15, one MEDIUM a11y fixed); brief `~/.claude/harness/briefs/web-download-2026-09-19.md`, reports `~/.claude/harness/runs/web-download-2026-09-19/`. `docs/LAUNCH_PLAN.md` P0 version bump + P1 release/CTA ticked; memory `reference_desktop_release_github.md`.
- **Why:** operator: "download button on the web" + "MTG Arena app version" = the desktop client published publicly (confirmed by question; Overwolf deferred). The app's own `import-csv` route was not used: it matches by `%name%` LIKE, overwrites instead of summing printings and never clears stale rows — product defect, not fixed here. Match sync desktop → web does NOT exist (desktop writes matches only to local SQLite; web has no matches endpoint); operator chose it as the next unit.
- **Backfill (same day):** `scripts/backfill_mtgtop8_dates.py` (f04c56b, +fceba34 fallback for compilation pages that carry one bare DD/MM/YY and no player count — 20 % of event pages) uploaded to `/opt/grimoire-scrapers/scripts/` and run with the venv: one fetch per undated event (`"N players - DD/MM/YY"` on the event page), 16 rows per event, 0 errors. Pass 1 at 11:50 UTC: Standard 5,473 / 6,284 dated (from 352), Commander running; pass 2 (the 114 no-date events) chained to start when pass 1 exits (`data/backfill-events{,-pass2}-2026-09-19.log`). The pipeline's next `export_standard_meta.py --apply-to` carries the dates to the build-api DB — verify with `GET /ingest/status` → `corpus.mtgtop8.withDate` on port 8100, or `ssh … "sqlite3 …"` counts.
- **Open:** VPS mtgtop8 dating: remaining after pass 2 = events whose page has no date at all (check both logs' final summaries; re-run the script any time — it is idempotent). Incident: the web builder ran `taskkill /IM node.exe /T` — killed every local Node process (MCP servers, any dev server on 3000–3010); restart yours. Next unit: match sync (web per-user token → desktop Settings → `POST /api/matches` → `/dashboard/matches`). Unsigned installer → SmartScreen; clean-VM test (P0) still not done.

### 2026-09-19 — Match sync desktop → web shipped (v1.0.0-beta.2); corpus dates landed; scrapers restarted
- **Did:** desktop side of the match-sync contract (`~/.claude/harness/briefs/match-sync-contract-2026-09-19.md`) in 2eceb95: migration 45 (`arena_parsed_matches.web_synced_at/web_sync_error`), `src/lib/web-sync.ts` (batches of 200, 10 s timeout, rows with no match id / no valid date marked locally and never sent, 200 marks accepted+duplicates, 422 marks the batch — retriable with force), `POST|GET /api/web-sync` (`sync` cookie-less for the Electron startup call, `save`/`test` JWT-gated, MIME-essence `application/json` + Origin/`sec-fetch-site` guard), fire-and-forget after `/api/arena-matches`, `triggerStartupWebSync()` in `electron/main.ts`, Settings → Web Sync; 32 new tests (816 total). Release **v1.0.0-beta.2** (hyphen-safe assets + `latest.yml`, all URLs 200; notes `verify-2026-09-19/release-notes-beta.2.md`; smoke 10.2 s). Web side black-grimoire-web 341197b deployed; live probe from the VPS (`verify-2026-09-19/web-sync-probe.cjs`; the site listens on 127.0.0.1:3100): accepted 2 → duplicates 2, ping 200, bad token 401, cleanup 0. Corpus: mtgtop8 backfill pass 2 done (Standard 6,260/6,284 dated, Commander 8,570/8,570); manual `export_standard_meta.py --apply-to` → build-api 20,086/20,160 dated; `grimoire-scrapers` restarted (stopped since 05:00 UTC).
- **Why:** the Opus refuter failed round 1 twice: a `text/plain` cross-origin POST (CORS simple request, no preflight) repointed the sync destination, and the first fix was a substring check bypassed with `text/plain; charset=application/json` — loopback binding is not a CSRF defence, so every mutating local route needs MIME-essence JSON + Origin guard + cookie; `playedAt` was string-patched, and the web validates all-or-nothing, so one corrupt row would 422 a 200-row batch. The scrapers watchdog logs "scraper active" while the unit is inactive, so it never restarted the service.
- **Open:** operator: let beta.1 auto-update (or install beta.2), create a token at Dashboard → Matches, paste it in Settings → Web Sync, Sync now — first real end-to-end run; fix `/opt/grimoire-scraper-watchdog.sh` (false "active"); 24 mtgtop8 Standard pages carry no date at all; code signing / clean-VM / MS Store, `TOPDECK_API_KEY`, build-api `/ingest/*` on the VPS (no scripts, no bs4) still operator-gated. In flight: cEDH review of the web-built Cabbage list; web builder ignoring the free-text request, build logging + duplicate-output flag, deck-view colours/display modes.

### 2026-09-19 — Builder fixes: archetype misread, hints honoured, cEDH staples for Commander/Brawl, tokens template; VPS card data refreshed
- **Did:** `commander-synergy.ts` — attack/combat-damage triggers no longer match damage dealt TO the controller ("attacks you", "deals combat damage to you" …), so The Cabbage Merchant reads token_generation/midrange instead of voltron; `build-hints.ts` — "go wide"/"go-wide"/"wide board"/"swarm" → tokens, theme words food/clue/blood/powerstone/map/incubate, `lowCurve` + `consistentMana` flags; `deck-builder-ai.ts` — lowCurve penalty (cEDH staples + win_condition exempt), consistentMana raises lands to the template band max only in commander-family formats (`resolveConsistentManaLandTarget`), `BuildResult.hints { parsed, boostedCards }`; `deck-templates.ts` — real `tokens` template (strategy `tokens` used to silently build as midrange); migration 46 = 303 `format='commander'` cEDH staples, `getCedhStaples` joins `cards` for identity + legality in one query (brawl/standardbrawl draw from commander + historic_brawl rows) — the old table was 120 historic_brawl rows so `powerLevel: 'cedh'` did nothing outside Arena Brawl; `services/build-api` `/build` returns `hints`. Repro (`verify-2026-09-19/repro-cabbage-build.ts`): strategy voltron → tokens, avg MV 3.28 → 2.68, cmc≥5 12 → 7, 79 cards boosted by "food". 853 vitest. VPS: build-api card table refreshed with `scripts/update-card-data.ts` (copied to `/opt/grimoire-build-api/app/scripts/`, backup `db/mtg-deck-builder.db.bak-2026-09-19`): +776 cards, 34,796 updated — The Hobbit set was missing, so "The Great Goblin" was "Commander not found" on the site. Review of the operator's web-built Cabbage list: `verify-2026-09-19/cabbage-cedh-review.md`.
- **Why:** operator: "it seems it doesn't react to the comments … fix the builder". Reproducing the request on the live engine showed the corpus layer fine; the pasted Arena collection plus the Voltron template quotas produced the colourless padding. Refuter rounds: web HIGHs (untimed Neon call, cross-user hint leak) and engine CRITICAL (Commander land bands applied to 60-card formats, consistentMana lowering land counts) were caught before deploy.
- **Open:** deploy this to the VPS build-api (DEPLOY.md §5) and re-check `/build` for Cabbage + hints → `strategy: tokens`; deck-view colour/display-mode pass running via `run-task.sh` (`~/.claude/harness/runs/*-deck-view-design/`); Azula Brawl list from the side task (`decks/brawl/fire-lord-azula-competitive.txt`) written to web deck 4 — uncommitted; `/opt/grimoire-scraper-watchdog.sh` false "active"; the engine builder applied migration 46 to the live APPDATA DB during a repro (additive, harmless) — agents must always set `MTG_DB_DIR`.
### 2026-09-19 — Deck view + craft list shipped and deployed; deck-score spec; two builders running
- **Did:** web `30cfd0b` (deck result view: `<ManaCost>` pips, colour-identity dots, per-role accents, By role / Gallery / By type / Curve modes in `src/components/builder/deck-view/*`, `localStorage` `bg:deck-view`, 11 card-groups tests) deployed ~15:30 UTC; engine `bf01ddd` (craft list: pool no longer pre-filters ownership, pick-time `getMaxQty` gate unchanged, `ownedPoolPrefix` keeps the CF seed owned-only, `/build` returns `craftList` + `craftSummary`; 860 tests) deployed to build-api per DEPLOY §5. Live check via `POST theblackgrimoire.com/api/build` with the 73-line Cabbage paper list as `ownedCards`: `strategy: tokens`, hints parsed, 15 craft items ($49.76 paper), build log id 10. `docs/DECK_SCORE_SPEC.md` = Codex gpt-6-astra design (7 components + structure gate, gated composition with quality cap `20+.8*min(M,W,S)`, 16 repo test vectors, 5 operator questions) from three research reports in `~/.claude/harness/runs/deck-score-2026-09-19/`.
- **Why:** both refuters failed round 1 (curve overflow 431 px at 390, gallery 5 not 7 columns because Tailwind v4 emits `min-[1440px]:` before `lg:`, pip contrast ~1:1; CF seed leaked unowned names after the pool reorder) — fixed and re-verified before commit. Web `/api/build` 422s a collection build with < ~60 recognised non-basic owned cards (still logged as a build_requests row).
- **Open:** running: `deck-score-core-builder` (brief `deck-score-core-2026-09-19.md`: pure `src/lib/deck-score*.ts`, `scripts/deck-score-report.ts`, ≥25 tests, no tuning) and `ai-helper-web-builder` (brief `ai-helper-web-2026-09-19.md`: OpenAI two-tier `OPENAI_REASONING_MODEL`/`OPENAI_CHAT_MODEL`, intent router, bounded astra tool loop, `POST /api/consult`, `craft-list.tsx`, `ai_usage` metering) — each needs an Opus refuter, then commit/deploy; the operator must set the two model env names on the VPS and answer the spec's 5 questions; web `deck-intelligence.tsx` ISS meter assumes a 0–10 ceiling while the engine emits 0–100 (research-internal finding, unfixed).
### 2026-09-19 — Deck Score v1 module committed (not wired); Win component still starved
- **Did:** `46c39d8` + `0fe36f1` + this: `src/lib/deck-score{,-norms,-math,-features,-mana,-interaction,-win,-synergy,-meta,-snapshot,-gates}.ts` (pure `scoreDeck(input) → {score, components[8], gates[]}` per `docs/DECK_SCORE_SPEC.md`, hypergeometric `H` + disjoint-pool `J_l` polynomial, caps 0/19/39, quality cap `20+.8*min(M,W,S)`), `scripts/deck-score-report.ts` → `verify-2026-09-19/deck-score/report.md` (16 §5 fixtures + 50 seeded random piles), 35 tests (895 total). Opus debugger pass: fixtures reached the scorer with `power` unselected (`deck-gate-parse.ts` `CARD_COLS` — now selects `power, toughness`; two test fixtures' `cards` tables updated), W used one opponent's life and average-power output vs cheapest-member cost, commanders were not pool members. Random piles 20/55/69 → **20/20/21** (< 25 target); anchors in band 2/16 → **4/16**; the "legality" failures on rule-valid lists were the stale repo card DB — refreshed from Scryfall (`update-card-data.ts`, backup `data/mtg-deck-builder.db.bak-2026-09-19`).
- **Why:** committed as a library only — every fair deck scores W < 15 under the 120-damage whole-board finish predicate, so the quality cap pins 9/16 fixtures at 20–30 (cEDH top-16 = 54, precon = 21); showing that number would mislead. Not weight tuning: two of seven §1 W families (control inevitability, Food conversion) are unbuilt and pressure/drain need a cumulative-damage schedule.
- **Open:** W v1.1 unit running on `deck-score-debugger` (brief in its inbox: expected-cumulative-damage pressure, drain vs 40 not 120, control inevitability with Tfast 6, Food/token conversion, coherent pool cost/output bound); then §4 calibration needs the operator's anchor answers; `buildCorpusSnapshot` is a stub (Fmeta = 50); wiring into build-api `/analyze|/build|/optimize`, desktop tiles and the web page waits for ≥ 12/16 anchors.
### 2026-09-19 — Deck Score: Win v1.1 + §7 norms + §4 calibration run → honest FAIL (2/6), library stays unwired
- **Did:** `a548bdf` Win v1.1 (cumulative-damage pressure schedule, drain/control/token-Food/Voltron families, coherent pool bound); this commit: spec §7 (Opus-measured norm revision — Codex astra hit its ChatGPT usage limit mid-consult and the harness did NOT fall back, rc=75), `deck-score-norms.ts` frozen **1.1.0** (`scoreDeck(input, tuning?)` additive; commander pWin .15/h 5/Tfast 7/poolSizeCap 10, brawl ×.85/.25/4/6/4, standard .60/2/6/4), `scripts/deck-score-calibrate.ts` + `deck-score-fixtures.ts` (§4 grid: 187,011 candidates in 119 s over dated Standard W/L cohorts split chronologically, 30 cEDH Top-16 lists, precon, 5 curated lists, 200 piles), `verify-2026-09-19/deck-score/{calibration.md,calibration-constants.json,report.md}`; 905 tests, `scoreDeck` median 4.9 ms. Price/EDHREC permutation 8/8 bit-identical; quota-gaming check passes.
- **Why FAIL, measured:** anchors 7/16 (need 12); piles < 25 only 90 % (need 95); Standard winners median 42 (need 85) because S median 65 caps the total at 72 and the weighted base tops out at 69.9 even with W = 100; cEDH median 69 because 26/30 lists exceed the 20 % unsupported-effect coverage cap (oracle-regex catalogue cannot read Ad Nauseam / Rhystic / Breach …); piles that score are the T11–T12 closers, the same bucket as Meren and the precon, so no Win constant separates them. These are design gaps in S and the effect catalogue, not tuning.
- **Open:** run the astra review when its quota returns (~21:49 local): `bash ~/.claude/harness/run-task.sh ~/.claude/harness/briefs/deck-score-review-astra-2026-09-19.md --dir <repo> --exec codex < /dev/null` → spec §8 (S for generic plans, typed catalogue for the 303 cEDH staples + Standard staples, pile separator, corrected §5 bands) → Opus builder → recalibrate; harness fallback-on-quota bug (`run-task.sh` rc 75 with no Claude fallback); operator's five spec questions still unanswered; nothing wired into build-api/desktop/web.
### 2026-09-20 — Deck Score v1.2: S coherence, typed catalogue, pile separation, closing/typal recipes → anchors 12/16; calibration 1/5; wiring started
- **Did:** e137747 slice A (S = 100·clip((Q−.30)/.40)·R·B, meta weight 0 with renormalised weights, evidence gate `provisional` replaces the 69 cap, catalogue schema/loader, pile-generator fix); 3695e41 pile separation (threat output bins, keyword evasion, deployment deadlines); c93c576 typed-effect catalogue (`src/lib/deck-score-catalog/`: 4,079 generated + 3,083 partial + 57 curated, cEDH 30/30 lists > 80 % typed); 401ecfb closing/tutor recipe + Commander p25/p90 bands from 2,777 VPS lists (`verify-2026-09-20/commander-bands.txt`); 0f6d1b4 creature-token/Food split, typal/party recipe, control gate; 3bf25a0 calibration artefacts. Reports `~/.claude/harness/runs/deck-score-2026-09-19/v12-*.md`. Same day: web visual pass ee002f6 + 6f8d26a + ISS-meter fix 71afb25 deployed (meter divided by 10, engine emits 0–100); VPS `/opt/grimoire-scraper-watchdog.sh` fixed (`\!` never negated, awk unquoted; backup `.bak-2026-09-20`); Standard corpus 20,233 decks synced to the repo DB; CF SVD retrained 09-19, VW bandit 09-20; backlog b955e70.
- **Why:** astra §8 chose S (not W) as the pile separator and a typed catalogue over regex; plan selection uses continuous `planFit` (deviation from §1's step ordering — Meren read midrange otherwise); Commander bands measured, not scaled ×1.65. Norms stay 1.1.0 — the §8 search winner equals the §7 centre within noise. Two astra consults hit the ChatGPT quota (rc 75); Opus agents took over.
- **Open:** calibration on 0f6d1b4: anchors 12/16 ✅; cEDH held-out median 76.5 (≥ 85 ❌); Standard positives 41.5 vs negatives 39 (≥ 75 ❌, W-limited); piles 86 % < 25 (≥ 95 % ❌, S floor — three rounds stopped there); quota-gaming 1/3 ❌ (Meren S 93.8 → 99.6 when links break: S design defect). Running: round-4 debugger (gaming + Standard W), engine wiring (`deckScore` on build-api `/analyze|/build|/optimize` + desktop tile), web card (number for Commander-family, "calibrating" for Standard) — each needs an Opus refuter, then commit + deploy. Still: `cabbage-cedh-input` control read (`CONTROL_TURN = 8` → output schedule), typal fixtures < 67 % typed (`deck-score-coverage.ts --queue 30`), `OPENAI_*_MODEL` env on the VPS, spec's 5 questions.

### 2026-09-20 — Deck Score wired and LIVE (build-api + desktop tile + web card); round 4; spec §9 = v1.3 plan
- **Did:** d6e0e2d `src/lib/deck-score-input.ts` (`scoreDeckSafely` → `DeckScorePayload {version, score, provisional, components, gates}` or null, never 500); additive `deckScore` on build-api `/analyze` (optional `format`, default commander), `/build`, `/optimize`, desktop `GET /api/deck-analysis`; Score tile shows the v1.2 number (beta/provisional) for Commander-family formats, old number + "calibrating" for Standard; 18 wiring tests (1062). Deployed to the VPS build-api (DEPLOY §5), verified live through the site: Emperor Brawl list `format: brawl` → 34 (legality pass), `commander` → 19 (A-Thran Portal cap). Web 6b91227 deployed: `src/components/deck-score/*` on builder result / deck page / optimizer, labels Unfocused <40 Casual <60 Tuned <75 Competitive <90 Optimised, calibrating frame for 60-card formats, `/api/analyze` forwards `format` only for commander/brawl/standardbrawl, light `--primary` 28→22 % (5.2:1), ISS grid gated on a score. 499f8ec round 4: text-mismatched catalogue entries no longer count as covered (Meren gaming closed, 2/3), deadline mean-cutoff defect documented + pinned (median variant regressed piles 176→165, reverted); Standard is S-limited (S median 36), not W. 782439a spec §9 (astra, 12 min): probability-weighted Standard deployment, negative-cohort Commander Q prior (b≈.46), producer utilisation replaces B, executable control finisher schedule with continuous access, closing-package support credit; four-stage build order with acceptance numbers.
- **Why:** wired at anchors 12/16 (the gate set 2026-09-19) as additive fields with `provisional`; Standard hidden in the UI because its held-out median is 41.5. Both Opus refuters failed round 1 (format hardcode → false legality cap on Brawl; ISS grid off-centre without a score; primary contrast 4.04:1; other 60-card formats would show a number) — fixed in round 2. **Incident:** the engine refuter's worktree + node_modules junction was removed with `--force` and emptied this repo's node_modules (my instruction); reinstalled; memory `feedback_worktree_junction_wipes_node_modules.md`.
- **Open:** v1.3 stage 1 (§9.3 producer utilisation + mode-resolved catalogue requirements, coverage for precon/Tazri×2/Imotekh) starting; then stage 2 (Standard deployment + pile prior — needs ≥ 1,000 matched Commander control piles), 3 (cEDH closing support), 4 (control schedule). `/build` wiring test asserts nothing when `deckScore` is null. Precon quota-gaming still FAIL; `cabbage-cedh-input` 73. Operator: `OPENAI_*_MODEL` env on the VPS, spec's 5 questions.

### 2026-09-21 — Deck Score v1.4: stages 0–2 committed (new S live in the library, not deployed); §10.8; stage 1d running
- **Did:** c5948b4 stage 1 — mode-resolved catalogue requirements (one mode per copy), producer utilisation `u_p = clip(served/fixedUseful)` multiplies Q and R, B retired (legacy field = 1), life/Food/token/death/graveyard routes typed, Imotekh artifact-recursion recipe (`src/lib/deck-score-producers.ts`); quota gaming 3/3, anchors 13/16, all 16 fixtures > 80 % typed (4,453 generated + 79 curated entries). 485dff6 stage 2 — Standard deployment credit weighted by casting probability (hypergeometric, §9.1 essentials/deadlines, bands re-measured on 1,648 training lists), generic Commander/Brawl plans `S = 100·clip((Q−b)/(.70−b))·R` with **b = .542** frozen at p95 of max-generic Q over 1,000 coverage-matched control piles (`scripts/deck-score-piles.ts`, `verify-2026-09-19/deck-score/negative-prior.txt`); Standard held-out S median 36 → 84.7, validation piles 196/193 of 200, `SCORE_VERSION 1.3.0-rc1`, 1097 tests. 2e1c28f `/build` wiring test asserts a present payload. Reports `~/.claude/harness/runs/deck-score-2026-09-19/v13-stage{1,2}-report.md`.
- **Why:** b measured at .542 vs the §9 forecast .46 and frozen at the measurement — fitting it to the Cabbage anchor would violate §4. Cabbage paper 59 → 49 (OUT) because its Food engine has no recipe; tazri-upgraded entered its band. Standard total median 55 is now limited by the weighted base (interaction ≈ 45), not S. Build-api stays on d6e0e2d until fresh controls pass.
- **Open:** 17697ce coverage round 1 (catalogue 4,453 → 14,830 known; real-list coverage p50 76 %/75 %; refuter R1–R3 closed; floors re-frozen .683/.733 → S window .017, real lists S = 0 85 %, anchors 11/16). 10fc8b2 discriminant study: the floor is the whole defect (R zeroes none); linkage/commander (even typed-only, AUC .55)/shape/synergy/W carry no pile signal; supply-family ceiling AUC .88; candidate A keeps cEDH 88 + piles 96 % but median real deck still 20; every on-plan-share S is gamed by deleting typed off-plan cards; the 'hard cap' is legality (Wash Away/Force of Will/Mana Drain/Subtlety `banned` under Scryfall `brawl` today; Commander sample carries Arena-only cards) — 4 unresolved names total. **Spec §10 (astra, this commit):** S = coherence with a mechanical zero floor, `Q_slot = U/D` (D = max(N0, N)), p80 saturation ex ante, R retired from the multiplier, gaming probes k=1/5/10 with 0 S gain, unresolved identity → provisional (no cap), rule-invalid lists out of norm estimation only, W repairs BEFORE the S freeze, build order 0→4 with acceptance through `scoreDeckSafely` on real strides (S = 0 ≤ 10 %, total p50 ≥ 50, cEDH ≥ 85, 14/16 anchors); **numeric pile separation (≥ 95 % < 25 on both constructions) stays an OPEN release blocker with no known card-level solution — operator decision needed** (keep blocking, or accept that a colour-identity draw of typed staples scores like a casual deck and rely on the gaming probes + evidence gate). Committed (HEAD~0): stage 0 — cohort manifest `cohorts-v14.json` (5,169 rows, exclusion reasons, 0 overlaps, hashed by `bands verify`), unresolved identity → provisional evidence (39 cap gone), `bands real` baseline, `scripts/deck-score-probes.ts` (registered baseline: deleting 5 typed off-plan cards → +100 S; lands/metadata 0); stage 1a — typed combo table (`deck-score-catalog/combos.ts`: 15 families, 21 tutors with destinations, 8 outlets), both cEDH lists 20 → 90, cEDH p50 90 / holdout 91, 30/30 traced lines, piles byte-identical; 1240 tests. Known: 10 stride lists carry Kuja under the `A // B` name (drop at the stage-2 re-measure); build-api never passes `unresolved` to `scoreDeckSafely` (wiring fix at deploy); `bands verify` red on `Q_SATURATION_BRAWL` .758 → .759 until stage 2; 336/1,146 Brawl corpus lists are capped by cards `banned` under Scryfall's `brawl` key today (Wash Away 197) — cohort exclusion handles it, operator may re-pull with a date filter. 7b02efa stage 1b — W-zero audit by class, four W families (Hulk package, Entomb/reanimate, blink-ETB, infinite mana → alt-win via library sinks), §9.4 control schedule (`deck-score-finishers.ts`: searched t* ≤ 12 on typed walker/manland/burn/draw-damage output, joint access once, 0 default-T8), domain frozen; cEDH 90/91, piles 0/200 closing, 1267 tests. **Honest result:** Commander W = 0 rose 16.3 → 26.4 % because the flat T8 clock is gone and 350 lists (19 %) read `combat_wide.schedule_short` on Guttersnipe/Grapeshot/Mana Geyser/Torment of Hailfire — the spellslinger/storm damage family is unmodelled, not absent; Vivi 76 → 67 for the same reason; anchors 10/16. Joint tutor access term deferred (needs a new access polynomial). 2121485 stage 1c — spellslinger/storm/X-spell family (`deck-score-spells.ts`), classifier corrected (`known_absent` 0, residual = `predicate_short`: built schedules short of 120 by T12, 170 lists at 8–9/10), loyalty column, bands dispatch fix; cEDH 89.5/91, piles unchanged, 1299 tests. **Commander W = 0 stays 24.9 % full / 24.1 % eligible** (full-stride ≤ 5 % unreachable: `bad_input` alone 5.4 %); Vivi 67 → 90 OUT high (its printed cast trigger closes T6 vs 25 life); two inherited conventions inflate clocks (ritual paid every turn, free creature deployment). 6da2caa spec §10.8 (astra): Commander horizon T12 → T20 with the existing decay, finish = 3 × 40 with per-opponent allocation, rituals paid once + deployment from the shared mana ledger BEFORE extending, eligible-stride W target ≤ 5 %, cEDH horizon-invariant, Vivi 70–85 pending a per-turn witness, stage-2 S norms provisional until the corrected W domain. Stage 2 (HEAD~0): `Q_slot = U/D`, mechanical zero, p80 per profile (commander .4343), R retired, Kuja held-out fix (stride 1,798/919), `bands verify` 0 mismatches — real Commander lists S = 0 83 % → 0 %, total p50 20 → 54/57, Brawl 72/79, probes max ΔS 0 at k = 1/5/10, anchors 12/16 (four OUT high, W-limited); **pile gate fails as predicted** (ctrl93 < 25: 99.5 % → 19.7 %; the null diagnostic shows real decks carry only .02–.07 more useful mass per slot than a legal pile at equal coverage). `vitest.config.ts` now pins `MTG_DB_DIR` to the repo DB for every worker (a bare run read the operator's live 913 MB Electron DB and failed 13 tests). Running: stage 1d (`deck-score-v14-stage1d-2026-09-21.md`: pin → rituals → deployment → cantrip audit + Vivi witness → H20 with per-opponent finish → W domain freeze), then stage 2b re-freeze (`bands freeze`), 3 (adversarial: Δtotal residue = rule repairs + density components on submitted N), 4 (holdouts) → refuter → deploy + services `unresolved` seam → app-sync → desktop beta.4. Build-api stays on d6e0e2d (v1.2). Operator: pile-gate decision (now concrete: piles score like casual decks under the honest S), tazri band, signing path.
### 2026-09-20 — v1.0.0-beta.3 (login by email), tainted-build incident, download SmartScreen walkthrough, deck-score stage 3
- **Did:** feb2935 desktop login accepts username OR email (route matched `username` only; the operator's local account is `QuLeR`) + page copy "local account, separate from the web sign-in"; a4002f5 login route tests; 232d6a7 **v1.0.0-beta.3** released (assets rebuilt clean in `C:\Users\QuLeR\MTG-deck-builder-release` at 232d6a7 after `npm ci`, sha512 in `latest.yml` verified, packaged email-login probe 401; notes `verify-2026-09-20/release-notes-beta.3.md`). Web 9421137 deployed: `/download` illustrated two-step SmartScreen walkthrough (dialog replicas, "More info" → "Run anyway") under the buttons + per-file SHA-256 from the GitHub asset digest + certutil verify block. Deck-score stage 3 committed (previous entry). 8900487 launch-plan: builder fills tutor/reanimation slots with no payoff (Azula web build scored 26, synergy 8, 57 % typed).
- **Why / incident:** the first beta.3 build ran `dist:win` on the shared working tree while the stage-3 agent had 13-failing-test WIP in `src/lib/deck-score-*.ts` → the installer bundled it; the builder also stashed the other agent's files and tagged the remote tip (unpushed commits). Response: `gh release edit --draft` (removes it from the updater feed and `/download` at once), push, retarget tag, clean rebuild, `--clobber`, undraft. Rule: memory `feedback_release_from_clean_checkout.md`. SmartScreen itself needs signing: Azure Artifact Signing is EU-**organisation**-only (individuals US/CA), MS Store removes it for store installs, OV cert on token otherwise — operator decision pending.
- **Open:** operator to choose signing path; SSO desktop↔web does not exist (only match-sync tokens); clean-VM install test still undone; `C:\Users\QuLeR\mtg-score-tmp` = throwaway worktree at 232d6a7 with Node-ABI sqlite for ad-hoc list scoring (remove when done: `git worktree remove --force`); web-built lists sit at ~57 % typed coverage → provisional scores.
