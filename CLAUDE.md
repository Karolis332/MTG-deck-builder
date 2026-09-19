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

Newest last, **last 10 entries only** — this file loads into context every session, so an
unbounded log would eat the smart zone it exists to protect. Promote anything still valuable
past that into the body above, or into `brain/`. No secrets or customer PII: this is committed.

### 2026-09-11 — Meta + ingest APIs on build-api; corpus date bug root-caused
- **Did:** `src/lib/meta-queries.ts` (+16 tests) and `src/lib/deck-ingest.ts` (+19 tests) hold all corpus correctness; `services/build-api` gained `GET /meta/{freshness,archetypes,consensus,cards,decks,deck/:id}` and key-gated `GET /ingest/status` + `POST /ingest/{mtgo,mtgtop8,topdeck}` (run log, one-run-per-source lock, argv-array spawn, env-gated schedule `INGEST_SCHEDULE_HOURS`); migration 44 = `ingest_runs` + `(format,event_date,source)` index. **`scrape_mtgtop8.py` had three stacked bugs, all fixed:** the date lives in a sibling `<td class="S12">` of the row, not `link.parent`; it was parsed `%m/%d/%y` for a `DD/MM/YY` site (dropped days >12, silently transposed days <=12); and `ON CONFLICT` never refreshed `event_date`, so re-scrapes could not heal. Corpus 9,176 -> 11,658 Standard decks; mtgo 750 -> 3,165 (100% dated + W/L, back to 2026-06-22); dated share 26.7% -> 48.6%. Research: `docs/RESEARCH_DECK_SOURCES.md`, `docs/RESEARCH_STANDARD_DECKBUILDING.md`, `docs/RESEARCH_STANDARD_CORPUS.md`, `verify-2026-09-10/corpus-stats.json`.
- **Why:** 89% of the corpus carried no `event_date`, so every "recent meta" query silently answered with pre-ban lists — measured: **32.3% of the top-10-by-deck-count corpus is currently illegal**, and Izzet Prowess (n=1,305, the largest archetype) is 99.9% Stormchaser's Talent. `meta-queries` therefore excludes undated decks whenever a window is requested, collapses duplicate `(deck,card)` rows in one place, and merges archetype spelling variants ("Mono Green Landfall"/"Mono-green Landfall"/"Monogreen Landfall" were 3 rows; merged it moves 4th -> 2nd at 834 decks) — so no caller can reproduce those bugs. **Corrected standing fact:** the `cards` table has **2,240** corrupt doubled-name rows (`Front // Front`, `type_line='Card // Card'`), not ~12 as previously assumed; ~203 front faces have no usable alternative row, so legality reads must always prefer a `standard='legal'` printing. Both delivered Arena decks re-checked against that list: clean. melee.gg / mtgdecks.net / aetherhub.com skipped: robots.txt or ToS disallow automated access.
- **Open:** the builder still has no banned-card gate (research rules 15-16) — highest-value next change; mtgtop8 backfill mid-run (53 of 5,998 dated), re-run to date the rest; topdeck ingest needs `TOPDECK_API_KEY`; nothing deployed to the VPS, nothing committed.

### 2026-09-11 — Match recording made always-on (tray + login item)
- **Did:** `electron/background-recording.ts` (new: tray, close-to-tray, "Start with Windows" login item registered with `--hidden`), `isWatcherRunning()` exported from `ipc-handlers.ts`, wiring in `main.ts` (window `close` hides; `window-all-closed` no longer quits unless the tray Quit set the flag; `--hidden` launch starts the Next server but skips splash+window). Typecheck + `build:electron` clean, 750/750 tests.
- **Why:** operator asked "record all of my games". Diagnosis: nothing was broken — the Arena log watcher lives in the Electron main process and `%APPDATA%/The Black Grimoire/crash.log` plus the whole userData dir stop at 2026-09-08, exactly matching the newest `arena_parsed_matches` row (2026-09-08 08:23). No app running = no recording. Arena detailed logging is on (435 `GreToClientEvent` blocks in today's Player.log).
- **Open:** Sep 8-10 matches are unrecoverable — `Player.log` and `Player-prev.log` both only span 2026-09-11. Dev shell trap: `startNextServer()` is skipped when `!app.isPackaged`, so `process.env.PORT` is never synced and `postToApi` falls back to 3000 (another project's dev server) — launch dev Electron with `PORT=3010`. `better-sqlite3` in the repo is built for NODE_MODULE_VERSION 127, Electron wants 130, so the grpId resolver's DB connect fails in a dev run (caught; card names degrade to `Card #id`). Nothing committed.

### 2026-09-12 — Kuja Brawl deck from the Arena collection; Arena commander ranker
- **Did:** `decks/brawl/kuja-genome-sorcerer.txt` + `-arena.txt` (100-card Arena Brawl, Kuja Genome Sorcerer, 35 lands, avg MV 2.51, 9 Wizards, play guide inline). Built by two Workflow runs (26 agents: 3 designs → 9 judges → synthesis → 3 adversarial verifiers, then repair → judge → final → verify). New tooling: `verify-2026-09-12/check-deck.cjs` (validates a list against the live DB: owned-on-Arena, `legalities.brawl`, colour identity, singleton, size, curve, back-face name collisions) and `scripts/arena-commander-rank.ts` (`--ci UBR --archetype spellslinger`: corpus support × collection coverage × archetype fit × EDHPL power → `verify-2026-09-12/grixis-rank.md`, model-built lists in `verify-2026-09-12/built/`).
- **Why:** Arena's pool is far smaller than paper, so every card is gated on `legalities.brawl === 'legal'` AND presence in the user-1 `source='arena'` collection — `arena_id` is NOT a usable availability signal (it is null on most printings, e.g. Command Tower). Brawl has its own banlist: Seething Song / Memory Lapse / Once Upon a Time / Tibalt's Trickery are historic-banned but Brawl-legal; Sol Ring and Mana Geyser are not on Arena at all. Card data in the live DB is fresh (2026-09-08) and the banlist granularity checks out.
- **Process finding worth keeping:** the first run's card pool was built by regex-tagging into categories, which SILENTLY DROPPED every card matching no tag — including Collective Inferno (44% of the 6,983-deck Kuja corpus, doubles all Wizard damage). Adversarial verification caught it. Never hand a filtered pool to a builder agent; hand the complete list sorted by relevance.
- **Open:** the Arena collection export is from **2026-07-02** — anything acquired since is invisible to both deliverables; re-import from Player.log before trusting the pool. Validator WARNs on "Emeritus of Conflict // Lightning Bolt" beside standalone Lightning Bolt — legal per CR 712.3a (layout is `prepare`, a creature card in every zone), but Arena's importer is unverified on it; swap Lightning Bolt → Shock if the import is rejected. Only ONE true Grixis (UBR) spellslinger legend is owned on Arena: Fire Lord Azula. Nothing committed.

### 2026-09-18 — The Cabbage Merchant (paper Commander) registered + upgrade proposal + verification page
- **Did:** physical deck registered as `decks/paper/decks/the-cabbage-merchant.txt` (v1, 100) and the typed 96-card spare pile + Transmutation Font added to `collection.txt` (1,001 owned / 594 open). Proposal `decks/paper/proposals/cabbage-merchant-upgrade.txt` + `.md` guide (§1–12: roles, win conditions vs a 3-opponent table, engine rules, keep/mull, cuts/adds, land-count decision, operator review trail); final state 100 cards, 33 lands (27 Forest + Ba Sing Se, Mosswort Bridge, Gingerbread Cabin, Ash Barrens, Escape Tunnel, Nesting Grounds) + Tangled Florahedron + 2 MDFC backs, avg MV 2.88, validator 0 errors; two placeholder slots (Explore, Hornet Nest). Arrival plan for five bought cards (Trail of Crumbs, Beast Within, Feasting Hobbit, Feasting Troll King, Quina) in guide §9. New tooling: `scripts/deck-verify-page.ts` → `decks/paper/deck-verify.html` (click-to-confirm tiles, extras textarea, clipboard export, localStorage; Playwright-checked), Cabbage added to `scripts/deck-edit-plan.ts` DECKS + `scripts/corpus-stats-cache.sh`; `verify-2026-09-18/` holds resolve-side.py, build-pool-paper.cjs, check-deck-paper.cjs, cabbage-buy-candidates.txt, design/refuter reports. Process: 2 Opus designers → Opus refuter → merge, then operator review row by row.
- **Why:** an Arena Brawl build was delivered first (removed) because the old `docs/CABBAGE_MERCHANT_BRAWL.md` suggested Arena; operator corrected to paper (memory saved: ask the format first). Lands cut 36→33 because the corpus average is ~30 (18.2 Forest + 11.9 nonbasic) and the operator had no mana problems at 32. **Bug fixed:** `corpus-stats-cache.sh` returned 0 rows for every commander — subprocess used cp1252, one proposal file has an em-dash → psql "invalid byte sequence"; now `encoding='utf-8'`. Operator rejected Sapseep Forest (its Nissa reason was gone), Blighted Woodland, Regrowth (→ Brawn), Lembas, Well of Lost Dreams, Blossoming Bogbeast; kept Spry and Mighty, Ash Barrens, Escape Tunnel, Nesting Grounds; added Ribtruss Roaster (devour eats creatures, not Foods — documented).
- **Open:** operator is clicking through `deck-verify.html` — paste the confirmed list or the missing/extra report to reconcile the register, then copy the proposal over the deck file and run `npx tsx scripts/paper-sync.ts`; name the two placeholder slots; add the five bought cards to `collection.txt` on arrival and apply §9; Llanowar Elves / Eternal Witness are assumed second copies (also sleeved in Meren); `deck-verify-page.ts` is 305 lines (inline template); later idea: Beledros Witherbloom in Meren or a Golgari lifegain deck; nothing of this committed.

### 2026-09-18 — build-api meta/ingest slice committed and deployed; root scratch removed
- **Did:** commit `143d76a` on `auto-improve` = the 2026-09-11 slice (`services/build-api/{meta-routes,ingest-routes}.ts`, `src/lib/meta-queries.ts`, `src/lib/deck-ingest.ts`, migration 44, `scrape_mtgtop8.py` date fixes, 39 tests green, tsc clean) plus the long-pending `.planning/` deletions; root scratch `.tmp-*.cjs`, `.tmp-harness-T4.log`, `builder-verify.png` deleted. Deployed to `/opt/grimoire-build-api/app` per web `DEPLOY.md §5` (`--ignore-scripts` + `npm rebuild better-sqlite3`): health ok, `/cards/lookup` 200, meta + ingest routes answer with the service key (see next line), `INGEST_SCHEDULE_HOURS` unset so nothing is scheduled.
- **Why:** operator: "deploy all and cleanup the repo" (from the web session, which shipped the dashboard/consultant/tome/mobile/SEO unit to theblackgrimoire.com the same morning — see black-grimoire-web `CLAUDE.md`). Committed only the build-api slice: the paper-deck work (`decks/**`, `verify-2026-09-18/**`, `scripts/deck-edit-plan.ts` …) belongs to the parallel session and stays uncommitted for it.
- **Open:** Session Log now exceeds 10 entries — drop the two 2026-09-07 entries when this file is next committed (their durable facts: harness not hermetic because `autoBuildDeck` pulls live CF recs; VPS `npm install` must use `--ignore-scripts` — already in web `DEPLOY.md`). `TOPDECK_API_KEY` still unset on the VPS. Branch `auto-improve` not pushed.

### 2026-09-18 — Web fixes shipped (page turn, light mode, confirms, dashboard home, Arena faces); Emperor Brawl deck audited and rewritten in the operator's web account
- **Did:** black-grimoire-web `a04cbca` deployed ~20:35 UTC (details in that repo's CLAUDE.md log). Here: `verify-2026-09-18/emperor-audit.cjs` (validates a pasted Arena list against the live APPDATA card DB: Brawl legality, colour identity, singleton, lands/MDFC backs, curve, oracle dump), `emperor-brawl.txt` / `emperor-brawl-v2.txt` (the operator's Izzet Emperor of Palamecia list and the 12-swap rewrite toward the 4-mana-spell / self-mill Starfall plan), `deck-probe.cjs` + `deck-update.cjs` (read / atomically replace one web deck in Neon; run ON THE VPS with `NODE_PATH=/opt/black-grimoire-web/node_modules node --env-file=.env.local`, never locally). Live deck 2 rewritten and spot-checked.
- **Why:** Arena rejects `Front // Back` names (the web export wrote them; fixed at the one shared `arenaDeckText()`); the deck's 45 of 66 nonland cards never triggered the commander. The site's own optimizer scored the original 90 with empty cut reasons and cut Aggravated Assault — cut reasons and commander-aware wincon detection are product gaps.
- **Open:** desktop `src/lib/deck-export.ts` writes the same `Front // Back` lines — apply the same front-face collapse. Match recording is desktop-only (Arena `Player.log`); web `/dashboard/matches` should point at the desktop client. Rotated out the 2026-09-08 editor/Standard entry: its durable facts (dev shell = `next dev --port 3010` + `electron .`; `readtest` account id 17 to delete; paper register `scripts/paper-sync.ts`) live in memory and `docs/`.

### 2026-09-19 — Resume: deck-gate unit logged, four units committed, VPS mtgtop8 dating fixed
- **Did:** Logged the 2026-09-18 evening unit that shipped without a log line: `86b00da` deck gate (`src/lib/deck-gate*.ts`, `scripts/deck-gate.ts`, `docs/DECK_GATE.md`, report `verify-2026-09-18/deck-gate-report.md`), `d23f94f` Arena export front-face names, `2e52030` gate + `locks` + non-empty cut reasons on build-api `/build` and `/optimize` (`services/build-api/gate-wiring.ts`); deployed to the VPS 19:05 UTC that night (tree + pm2 restart verified 2026-09-19). Committed the shipped-but-uncommitted work after `tsc`, `build:electron` and 784 tests passed: `0ec5764` Electron always-on recording (09-11 unit), `7e40462` paper decks + Cabbage + deck-verify page + 09-18 reports, `909e03b` Standard/Brawl scripts + research docs + 09-10/09-12 reports. VPS: `/opt/grimoire-scrapers/scripts/scrape_mtgtop8.py` was byte-identical to the pre-fix repo copy, so every mtgtop8 deck on the VPS (6,284 Standard, 8,570 Commander) had no `event_date`; replaced with the fixed script (backup `.bak-2026-09-19`) and started a detached Standard backfill (`data/backfill-mtgtop8-2026-09-19.log`, `--pages 300`). `.gitignore` now covers `dist-electron-next/` and `dist-electron-release/`.
- **Why:** the build-api `/ingest/*` routes cannot run on the VPS as deployed — the git-archive deploy carries no `scripts/` and the app's python has no bs4 — and the corpus the web reads is produced by the separate `grimoire-scrapers` pipeline (memory: project-standard-meta-pipeline; watchdog cron restarts it, cycle ~04:50 UTC), so the date fix belongs there. Arena re-import (`verify-2026-09-18/reimport-arena-collection.ts`) found no collection block in today's Player.log — Arena writes it only at client start — so the live DB still holds the 2026-07-02 snapshot.
- **Open:** start MTG Arena once (detailed logs on) then re-run the re-import; check `GET /ingest/status` → `corpus.mtgtop8.withDate` after the next pipeline export; Commander mtgtop8 not backfilled; `/ingest/*` on the VPS needs scripts + bs4 in the app dir or removal (it writes to the build-api DB, the pipeline writes to its own); operator: Cabbage `deck-verify.html` result, Meren Dark Ritual, `TOPDECK_API_KEY`, push `auto-improve` (never pushed, 172 commits ahead of main).

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
