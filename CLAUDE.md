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

### 2026-09-02 — Orchestration + token harness restored (profile, hooks, MCP)
- **Did:** Root cause: sessions run under `CLAUDE_CONFIG_DIR=~/.claude-alt`, a bare profile (no hooks, no statusline, 6 skills) while every harness piece lived in `~/.claude`. Junctioned `.claude-alt/{skills,commands,agents}` → `.claude/*` (226/70/52) and copied the gsd hooks + `universal-stop-gate.sh` + statusline into `.claude-alt/settings.json`. Project `.claude/settings.json` (gitignored): all 16 ruflo hooks were dead — Git Bash rewrites `cmd /c` to `C:\`, so cmd ran the JSON payload as a command — now `node "$CLAUDE_PROJECT_DIR/..."`, timeouts 5000→5 s, shell=bash. Registered ruflo MCP at user scope (`claude-flow`, `cmd /c npx ruflo mcp start`, 257 tools, ✔ Connected). effortLevel xhigh→medium + `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` in both profiles. Proof: nested `claude -p --model haiku` saw GSD=82, graphify/grill-me/harness-audit, and `mcp__claude-flow__*`.
- **Why:** junction over copy so `~/.claude` stays the single source. Dropped the `route` UserPromptSubmit hook: 31 lines of default-routing boilerplate into context per prompt; same routing is on demand via MCP `hooks_route`.
- **Open:** identical dead `cmd /c` hooks in DnD, farm-vision, geo-scraper-file-generator, quler-web-solutions, quler-web (same one-line fix). 257 claude-flow tools in the deferred list — trim via `ruflo mcp toggle` if per-turn cost shows. Backups in `~/.claude/backups/` and `~/.claude-alt/backups/` (`*.20260902-*.bak`).

### 2026-09-02 — Friends web live, research doc, desktop first-run fixed end to end
- **Did:** Web (black-grimoire-web 5d64837, deployed to VPS :8099): accounts-off switch `NEXT_PUBLIC_ACCOUNTS_ENABLED`, `/dashboard` guard, dead mailto removed, DEPLOY.md friends section; htpasswd user `friends` added; Playwright-verified as a friend (Krenko build ~40 s, collection 5/5, catalogue, dashboard notice, 0 console errors). VPS ops: watchdog cron `/usr/local/bin/pm2`→`/usr/bin/pm2` (was dead), `/etc/logrotate.d/grimoire` (2.1 GB unrotated). Retrain SKIPPED on purpose (SVD retrained 01:13 UTC same day, +4,810 decks vs 50K gate). Research: `docs/RESEARCH_DECKBUILDING_2026-09-02.md` (12 ranked findings: EDHREC now uses lift, Karsten 2022 land formula, WotC bracket lookup beats LLM power rating, empirical curves fix curveScore, partner pair = virtual commander, Topdeck/cedhtop16 APIs). Desktop, 7 shipping bugs found by a clean-profile packaged test and fixed (bb26d4d, 7c69819, 99f2ce7, d7e4c2c, 5b61ad1, c7d46d2): first-boot never found `app-config.json` (`ELECTRON_USER_DATA` now set + both dir casings); plaintext wizard password on disk → scrypt hash (`src/lib/password.ts`, dependency-free so Electron main never loads `jose` — importing `auth.ts` crashed the packaged app on boot); **Scryfall dropped `download_uri`, bulk data is gzip JSONL now → every fresh install failed to seed; streamed reader, 37,551 cards in 9 s**; Arena card-db updater path under `process.resourcesPath`; null-engine guard in log backfill; Quick Build with empty collection gave commander + 99 basics (engine now treats empty collection as none); legacy plaintext pending password stripped on load, 409 clears it. Harness after all of it: **hardFails 0, score 967**. 479 tests. Overwolf package built (`dist-overwolf/*alpha.5*`).
- **Why:** Scryfall format change was the silent killer — three fixes stacked behind it, each visible only after the previous. Fresh-profile packaged testing (Playwright `_electron` against `win-unpacked`) is the only test that caught any of them; unit tests were green throughout.
- **Open:** Overwolf overlay live test needs the operator to install `dist-overwolf` and play one match. `scripts/update-card-data.ts` still reads `download_uri` (same Scryfall break). Clerk JS still loads client-side on the friends site (dead weight + dev-key warning). Collection import from Player.log returned 0 rows in the test — unverified whether that log has a collection block. Engine collection query is user-unscoped. Operator's live profile: next launch will hash+clear its legacy pending account automatically. Research quick wins (Karsten lands, bracket estimator) are the next gated rounds.

### 2026-09-03 — Deck quality benchmark vs top-bracket / top-performing decks
- **Did:** Corpus audit: VPS Postgres has NO placement/W-L/bracket — only likes/views (CLAUDE.md corrected); MTGGoldfish publishes no Commander results, MTGTop8 = cEDH only (dropped both). Shipped: WotC bracket classifier `src/lib/bracket.ts` (ac0b744), internal CF-API `/commander-top-decks` (VPS bc8c8aa, local 42ca2e0; api-key, includes Moxfield, partner pairs via indexed commander_name), `scripts/fetch-benchmark-refs.ts` (moxfield-top / cedhtop16 via edhtop16 GraphQL — the REST API is dead / edhrec-avg / topdeck behind `TOPDECK_API_KEY`; `--format brawl` variants), `scripts/deck-benchmark.ts` + `src/lib/benchmark-metrics.ts` (013dac0). Report `docs/DECK_BENCHMARK_2026-09-03.md`: 16 builds × 3 sets, bracket-filtered, format-aware. Harness gate unchanged: hardFails 0, score 963. 496 tests.
- **Why:** observational second number, gate untouched (protocol). Findings: engine has zero bracket awareness — vivi/sheoldred/heliod-brawl land at B4 vs target 3 (4+ game changers), Ramos/Krenko/Ghalta/Magus at B2; Krenko vs top-liked lists: draw +9, removal −4, wipes +3; overlap with best-regarded lists 29–49 % vs 61–77 % with EDHREC average.
- **Open:** first engine round from this: bracket cap in selection (`powerLevel` → max game changers / combo rules) + removal-vs-draw rebalance, gated on harness AND benchmark. 56 reference names unresolved → local card data stale (`scripts/update-card-data.ts` still reads Scryfall `download_uri`, same break as the seed). `TOPDECK_API_KEY` from the operator enables the topdeck set. Local grimoire-cf-api `app/main.py` needs the router registration when its 8 pre-existing uncommitted changes are reconciled with the VPS checkout.

### 2026-09-03 — Competitive Brawl format, data freshness, Arena export name
- **Did:** New format `competitivebrawl` (e716d8e, 2a2d918): 100-card Brawl pool (`getLegalityKey → 'brawl'`, conservative — WotC published no 99 banlist), 10 commander bans (`COMPETITIVE_BRAWL_COMMANDER_BANS`, DFC front-face + `A-` aware), commander accepted if `brawl` or `historic` legal; symmetric A-/paper commander swap fixes "A-Vivi Ornitier is not legal in standardbrawl" (pure `resolveLegalCommanderVariant`, tested); 5 legality reads that bypassed `getLegalityKey` fixed. Data: live card table refreshed via `/api/cards/seed?force=true` (17 s; 2026 sets present), `scripts/update-card-data.ts` fixed for Scryfall JSONL (9db3d19; 35,309 updated, 59 game changers), `classify_lands.py` rerun, Arena grpId map refreshed from Wizards CDN 11392→14056 (26,572 cards; the in-app updater had never succeeded before d7e4c2c). Arena export now emits `About`/`Name` so imports keep their name. 515 tests. Package in `dist-electron-next/` (built while the operator's app locked `dist-electron/`).
- **Why:** operator plays Arena's Ranked/Competitive Brawl queue (launched 2026-06-23); our data had no key for it. Conservative 99-legality chosen over guessing the unpublished unban list.
- **Open:** Competitive Brawl 99 may allow some of the 24 Brawl-banned cards — revisit when WotC publishes the list. Commander autocomplete (`searchCards` FTS5 rank) returns `A-` vs paper rows non-deterministically. Swap `dist-electron-next` → `dist-electron` once the old app is closed. Harness scenario for Vivi/competitivebrawl not added yet.

### 2026-09-04 — Orchestrated overhaul: command center, match history, parser accuracy (paused)
- **Did:** Command-center editor shipped (8e0e036, 14bf030, c321102): 3-pane shell, optimistic undo/redo, live tiles (bracket, benchmark, roles, coverage, synergy, curve), consultant pane with passive trained-model feed + bandit events, editable role view, toasts/hotkeys. Match history HUD + turn timeline (a686a43). Parser accuracy (c81691d): identity by userId (no seat-1 guess), results via team, Bo3, `Player-prev.log`, queue→format enum; live DB reparsed — 9 self-as-opponent rows → 0, 8 results flipped; `docs/MATCH_PARSE_AUDIT.md`. Research `docs/RESEARCH_ARENA_LOGS_2026-09-04.md`; decision `docs/OVERWOLF_DECISION.md` (stay Electron; GEP has no match data). Web: no Clerk when accounts off (black-grimoire-web 16ecaaf, deployed). Spec + status: `orchestration/desktop-overhaul-2026-09/spec.md`.
- **Why:** operator asked for a futuristic dashboard always consulting the trained model, and accurate match logs; recon proved Overwolf adds nothing for match data.
- **Open (paused by operator):** T4 engine round + T5 VPS lift stopped mid-run — uncommitted partials locally (`deck-builder-ai.ts`, `deck-builder-constraints.ts`, `sync-commander-stats.ts`) and on the VPS checkout; verify VPS `lift` column state before resuming. Release build from `c81691d` pending in worktree `../MTG-deck-builder-release` (see spec status table). App restart needed to load the new parser. Harness last 965/0 (before T4).

### 2026-09-06 — T5 lift shipped, T4 parked, theblackgrimoire.com launched
- **Did:** T5 done: VPS `commander_card_stats.lift` populated for all 7.78M rows / 3,613 commanders, VPS commit c03c9d8, api rebuilt (`/commander-stats` returns `lift`), desktop sync dd93e8c. T4 parked on branch `t4-engine-wip` (a2608ec) — harness with it 958/0 vs 965 baseline, not gated in; bracket budget never engaged because `scripts/test-deck-builds.ts` passes no `targetBracket`. Operator bought `theblackgrimoire.com` (Hostinger) and pivoted: black-grimoire-web launched public (99c88a1, b21ef1a, 75aad2f) — Hostinger A record set via Playwright, nginx vhost + Let's Encrypt (renew dry-run OK), canonical redirects, HSTS, answer-first landing, methodology/FAQ/about/contact/support/privacy/terms, JSON-LD, robots (AI crawlers allowed)/sitemap/llms.txt/ai.txt, feedback widget + contact form → Neon `feedback` table → Telegram relay (smoke-tested live), pricing → /support. GEO rounds (our scanner): 68 → 73/100 (B) — llms.txt core facts/AI instructions/FAQ, ai.json permissions, WebPage/HowTo JSON-LD, freshness meta, methodology bracket table (2fba40e, 32862e2). Landing redesign by Codex CLI `-m gpt-6-astra` (needs codex ≥0.153; Windows sandbox blocks reads → ran with `--dangerously-bypass-approvals-and-sandbox`): screenshot-led hero, stat strip, see-it-work callouts, supporters section, gated Sign in (6ff5189). EDHREC-style `/commanders` search + `/commanders/[slug]` pages (top cards by inclusion, lift synergies, public lists, Brawl tab, top-500 sitemap) by a worktree agent (b600d1d, merged e0609d4). Competitive Brawl claims corrected — the web builder has no such option (12f371a, 4d3deb1). Desktop release build from c81691d done: `dist-electron-release/` (unsigned). Visibility: Google Search Console domain property verified (TXT via Hostinger, Playwright) + sitemap submitted; IndexNow accepted 512 URLs; self-hosted Umami analytics on the VPS (`/opt/umami`, nginx `/umami/`, env-gated script) recorded its first visit; `docs/DISTRIBUTION_PLAN.md` in black-grimoire-web (communities with verified rules, backlinks, templates, calendar). Evidence in `verify-2026-09-06/`.
- **Why:** operator strategy 2026-09-06: free for players, ads later, donations now; feedback loops before Magic-group posting. Lift sign-agreement with legacy `synergy_score` is only 69% because the legacy formula subtracts the max cross-pool rate (biased negative) — lift is the more principled number; engine use stays behind a flag.
- **Update 2026-09-07 (operator: "take care of everything you can via Playwright"):** Clerk app claimed into the operator's account via Google sign-in in the Playwright session, production instance `ins_3Iy0VNaH2tD1TQc0jswttCXQh7M` created for theblackgrimoire.com, 5 CNAMEs added at Hostinger, SSL issued, `pk_live`/`sk_live` on the VPS, Google social login disabled (needs custom OAuth creds), `NEXT_PUBLIC_ACCOUNTS_ENABLED=1` deployed; first account created for the operator (email code read from Gmail in the session), dashboard + /api/decks verified. **Regression caught and fixed:** the old Clerk public-route list made /commanders, /methodology etc. redirect to sign-in — middleware now protects only /dashboard (489ff41). Free plan deck cap removed (ed8362b). Telegram relay confirmed from the bot side; release build smoke-tested (window in 10 s; note: it opened the operator's live profile, so migration 42 is now applied to the live desktop DB); awesome-list PRs opened (lheyberger/awesome-edh#9, astrospective/awesome-mtg#11). Bing Webmaster NOT done — its Sign In button does nothing in the automated browser.
- **Open:** `NEXT_PUBLIC_DONATE_URL` unset on the VPS until the operator supplies a payment link (needs payout identity — cannot be done for them). Bing Webmaster: sign in with Google at bing.com/webmasters and "Import from Google Search Console" (1 click). Clerk Google login needs a Google Cloud OAuth client if wanted. AI Chat stays paid-plan gated (`plan.aiChat`) — cost decision for the operator. Bing Webmaster: import the verified GSC property (operator, one click). Umami admin password lives only in `/opt/umami/.admin-credentials`. Ad slots not built (needs an approved live site first). Sign-in needs the operator's Clerk production keys + `NEXT_PUBLIC_ACCOUNTS_ENABLED=1` on the VPS (UI already gated). Site has no analytics yet — pick Umami (VPS Docker) or GoatCounter before the group posts. Competitive Brawl option on the web needs the current engine deployed to the VPS build-api. Release build worktree at c81691d still not built. T4 resume = wire targetBracket through the harness, then isolate mono-rebalance vs MDFC-refill. Token/emblem names (e.g. "Goblin") pollute top-lift rows on the VPS — filter by deck_count/real card names before any engine use.

### 2026-09-07 — Orchestration hand-off, harness drift finding
- **Did:** `orchestration/desktop-overhaul-2026-09/spec.md` gained a 2026-09-07 hand-off section: S1–S7 scorecard (S3 red, S2/S4 amber), operator checklist O1–O5, agent follow-ups. Harness on HEAD: **hardFails 0, score 961** (`verify-2026-09-06/harness-2026-09-07.log`), builds committed with this entry.
- **Why:** 961 vs the 963–968 band with ZERO engine diffs proved the gate is not hermetic — `autoBuildDeck` pulls 50 live CF recs per commander build and the VPS retrain moves them; ±4 across 16 overlap percentages is noise. Recorded rather than chased.
- **Open:** make the harness hermetic (CF rec cache or `CF_API_OFFLINE`) and re-baseline BEFORE resuming T4. Operator: O1 accept match history on ≥ c81691d, O2 resume/drop T4, O3 Overwolf live test, O4 `TOPDECK_API_KEY`, O5 code-signing cert. `.planning/` deletions still uncommitted.

### 2026-09-07 — Deck optimizer (T9) shipped end to end
- **Did:** build-api `POST /optimize` (6c11111): any pasted list (Arena/Moxfield/Archidekt/MTGO/plain via `decklist-normalize.ts`) → legality, role quotas, Karsten lands (`land-math.ts`, 60- and 99-card), colour sources, ranked cuts with reasons + adds (rule engine ∪ commander stats ∪ meta staples) + swaps (`deck-optimizer.ts`, pure, tested), Deck Doctor analysis + bracket for commander formats; `/analyze` refactored onto shared `resolve.ts`/`analysis-core.ts` (now passes a detected tribal type — Krenko ISS 7 → 45). Web `/optimizer` (black-grimoire-web 4b6c84c, 1f026bf): form, score/quota/mana panel, tick-able cuts/adds, Arena text + save to My Decks, nav/sitemap/landing/FAQ/methodology/llms. Both deployed; Playwright + live API verified (`verify-2026-09-07/`). Dropped the two T4 test files that landed in c81691d without their implementation (665 tests green). Spec: T9 row + status.
- **Why:** players paste an existing deck first; the site could only build from scratch. Cuts are heuristic and every reason is shown rather than hidden behind a score. Function cards are never judged on synergy, only on quota.
- **Review (same day, 3 fresh-context Opus reviewers, `verify-2026-09-07/review-*.md`):** 1 CRITICAL + 7 HIGH confirmed and fixed in e39485e / web 01cc4ac (quantity DoS, LIKE-wildcard scan, quadratic regexes, sideboard inference on commander lists, partners, duplicate lines, stale commander, 5xx leak, XFF-first rate-limit key on all five routes, Timeless unsupported); details in the spec's "T9 review round". 675 tests.
- **Open:** incident — VPS `npm install` ran the repo postinstall (`electron-builder install-app-deps`) and rebuilt better-sqlite3 for Electron's ABI → all build-api endpoints 500 for ~10 min; fixed (`npm rebuild better-sqlite3`), procedure in web `DEPLOY.md`. Calibration: ISS taxonomy misses ETB payoffs (Impact Tremors flagged), generic 60-card quotas over-flag aggro draw/removal, source check is a 3-band approximation. VPS `cards` table stale (36,982 vs 38,444). Harness untouched (optimizer never calls `autoBuildDeck`). `land-math.ts` duplicates `karstenLandCount` on `t4-engine-wip` with different MDFC credit — reconcile at merge.

### 2026-09-08 — Desktop editor readability + Standard-deck fixes (operator testing the repartee deck)
- **Did:** command-center type floor raised one step (9→11, 10→12, 11→13, xs→sm px) across consultant/tiles/rail/header/workspace, feed thumbnails 52×72, pane defaults 400/440 (`bg.commandCenter.v2`); **scroll bug fixed** — the 3-pane grid rows were `auto` so panes grew past the viewport (`gridTemplateRows: minmax(0,1fr)` + `min-h-0`), Playwright confirms all three panes scroll; Electron zoom Ctrl+= / Ctrl+- / Ctrl+0 persisted in `ui-zoom.json`, default 1.1; **Standard decks no longer show the Bracket tile, the 2–5 target selector, the Synergy tile or the "Commander Synergy" role row**; "Rebuild with model" for 60-card decks sends the list's colour union (auto-build rejected it with "pick a color"). Imported the operator's Orzhov Repartee list into the live profile (decks 120/121 for QuLeRo/QuLeR, 123 for the `readtest` verification account). Evidence `verify-2026-09-07/editor-*.png`, 22 command-center tests + 675 total green.
- **Why:** the operator could not read the model feed or the rail at 1890 px; brackets are a Commander concept; the packaged app's embedded Next server died (exit 1 at 04:50 UTC, no stderr captured) while port 3000 was also claimed by another project's dev server on this machine — the editor now runs as `next dev --port 3010` + `electron .` (dev shell) until a new release build is cut.
- **Standard data (same day, operator: "start scraping, use the VPS, parallelise"):** the 60-card "Rebuild with model" was reproduced as garbage (9 cards x4, six mana rocks, 4 Ugin) — the engine has no meta/archetype input for 60-card formats and the local Standard meta was 229 cards from April. Findings: the VPS scraper service (`/opt/grimoire-scrapers`, `auto_pipeline.py`, 15-min cycles) already held 8.4K Standard decks from MTGTop8/MTGGoldfish but only scraped Standard on weekends/max mode and never synced it anywhere; MTGGoldfish deck pages are now behind a Cloudflare challenge (metagame pages still parse); **mtgo.com publishes League 5-0 lists and Challenge standings with per-player W/L as embedded JSON, no challenge, monthly archive via `?year=&month=`**. Shipped 74f9f02: `scripts/scrape_mtgo.py` (colour-guild archetype labels, 3 workers), MTGTop8 `--pages` (turns out `cp=` barely pages — the format page lists ~25 events; kept, harmless), `scripts/export_standard_meta.py` (format slice export + ATTACH apply, ids rebased +900M), `scripts/sync_vps_meta.py` (scp + apply to the desktop DB). VPS: pipeline patched (Standard every cycle, mtgo step, export step → `data/export-standard.db` + build-api DB), service restarted; backfills running in parallel (mtgo Jan–Aug 2026, mtgtop8). First sync applied everywhere: 9,176 Standard decks (1,182 mtgo with W/L and rising), 1,386 meta cards, 415 archetype rows — desktop optimizer now ranks against 500+ Standard meta cards instead of 180.
- **Meren paper deck (operator's CardTrader order of 161 cards, 2026-09-08):** scored the order against Meren/Szarekh/Tazri with `commander_card_stats` + the synergy tagger: party/D&D + all multi-colour cards → Tazri; Victimize/Reanimate/Marauder/Carrion Feeder/Chupacabra/Butcher/Jarad/Junji → Meren; the mono-black devotion/drain pile (Gray Merchant, Crypt Ghast, Nyx Lotus, Vito, Sanguine Bond, 26 Swamps…) is NOT a Necron package (0–5 % in Szarekh lists) — it is a separate mono-black build. Operator's full Meren list (99, one name unresolved: "biggart trawler") exported as ManaBox text: `decks/paper/meren-current-manabox.txt` and `meren-optimized-manabox.txt` (7 out: Braids Cabal Minion, Jenova, Return of the Wildspeaker, Arcane Signet, Kodama's Reach, Night's Whisper, Invasion of Ikoria; 8 in: Butcher of Malakir, Ravenous Chupacabra, Murderous Rider, Jarad, Gray Merchant, Reanimate, Lightning Greaves, Golgari Charm). Roles before: lands 34, ramp 13 high, draw 17 high, removal 5 low, wipes 2, protection 1. Addendum (19 more owned cards, VPS `commander_card_stats`): Triarch Stalker/Plasmancer/Lychguard/Ghost Ark/Gilded Lotus/Skorpekh Destroyer/Sautekh Immortal → Szarekh (77–83 % inclusion, lift +2.7…+4.3); Elegy Acolyte → Tazri (Cleric, lift +3.0); Phoenix Fleet Airship + Wishclaw Talisman → Meren fringe (<2 %); Consuming Corruption → the mono-black pile; the rest (Adaptive/Patchwork Automaton, Tablet of Compleation, Prophetic Prism, Firemind Vessel, Bitterthorn, Wreckage Wickerfolk, No One Left Behind) bench.
- **Paper deck register (same day, operator: "make a local mtg database, sync it with the model, keep a record of open cards and decklists and how they change over time"):** reused the desktop DB instead of a new store. `scripts/paper-sync.ts` + `decks/paper/` (`decks/*.txt` = physical decks in ManaBox lines, commander first; `collection.txt` = all paper cards; generated `open-cards.txt` + `HISTORY.md`): fuzzy name resolution (edit budget 1/2/3 by length — short keys collide, e.g. "soul stone" ≠ Sunstone), canonical rewrite, upsert as user-1 decks `built_by='paper'` (ids 126 Imotekh, 127 Meren, 128 Tazri), `deck_versions` snapshot on change, user-1 `source='paper'` collection rebuilt (the old 3,957 paper rows were a byte-identical mirror of the Arena rows — replaced). Sources merged: Desktop `MTG collection/MTG decks/*.txt`, CardTrader order xls (161), 19 cards from chat. Meren v1 = Desktop list, v2 = chat list. ManaBox copies in `Desktop/MTG collection/MTG decks/manabox/`.
- **Open:** cut a release build with these changes (`npm run dist:win`, then `dist-electron-release` swap) — the operator is on the dev shell now; root-cause the standalone server exit (add stderr capture to `next-server.ts` crash log); the `readtest` account (id 17) is a throwaway to delete; port 3000 collisions with `guaranteed-income/code/ecmrcapture` — make the packaged app prefer a free port above 3000 or pin 3010. **T10 A done (1a9a3a3):** 60-card "Optimize with model" = `POST /api/decks/:id/optimize-apply` → new "(Optimized)" deck (verified on the dev shell: Orzhov 8 cuts ↔ 8 adds, 60 cards). **T10 B next:** meta-archetype builder on the fresh Standard data; re-run the VPS aggregator once the mtgo backfill finishes so placement weights use real W/L; the two backfills (`data/backfill-mtgo.log`, `data/backfill-mtgtop8.log` on the VPS) were still running at hand-off. Paper decks are all 99 cards: Meren missing "biggart trawler", Imotekh missing "soul stone", Tazri one unknown — operator to name them. `Desktop/MTG collection/MTG App/` holds `claude key.txt`, `git token.txt`, `openai key.txt` in plaintext (not read) — operator should move them to a password manager.

### 2026-09-09 — EDHPowerLevel port, model edit plans, Astra second opinion, reference sites
- **Did:** `scripts/deck-edit-plan.ts` → `decks/paper/edit-plan.html` (card images, per-swap arguments from the full VPS corpus via `scripts/corpus-stats-cache.sh` → `data/corpus-stats.json`, CF ranks, role bands, mana-curve buckets, pip-proportional colour-source balancing with basics first, single-copy assignment across decks, basics top-up only from <3 % cards); proposals `decks/paper/proposals/{meren,imotekh,tazri}-model.txt`. EDHPowerLevel.com algorithm extracted from its bundle (`verify-2026-09-09/edhpowerlevel-bundle.js`) and ported: `src/lib/power-level-edhpl.ts` (+14 tests), `scripts/power-level.ts`, `scripts/power-level-improve.ts` (greedy owned-card iterations), API `GET /api/decks/[id]/power-level` + `PowerLevelTile` in the Live Rail (commander formats, permanent credit link) — validated against the live site: efficiency/tipping exact, power ±0.02 (`verify-2026-09-09/power-level-report.md`). Codex gpt-6-astra second opinion: `decks/paper/proposals/*-astra.txt` + `decks/paper/astra-review.md` (valid: 100 cards, pool-only, no single-copy conflicts, ramp kept). OTJ keep list page `decks/paper/otj-keep-list.html` (`scripts/keep-list.cjs`); 97 OTJ rares + kept C/U added to the collection. Web: `docs/REFERENCE_SITES_2026-09-09.md` (edhcheck/deckcheck/recommander styling + monetization, AI-credits proposal on the existing Stripe/plan plumbing).
- **Why:** operator wants edits argued with model data (corpus inclusion/lift/CF rank) and owned cards only; EDHPowerLevel as a table-talk indicator with credit (its score is price+popularity, so it rewards off-theme expensive cards — shown, not used for the plan). Codex in the background must run with `< /dev/null` (it otherwise waits on stdin) and must be told not to dump large files (run 1 crashed at 1 MB of log).
- **Final recommendation (same day):** `decks/paper/proposals/{meren,imotekh,tazri}-final.txt` = corpus plan reconciled with the Astra review (Meren: model plan unchanged; Imotekh: Astra's 7-Swamp land plan + Plasmancer/Lychguard/Triarch Stalker/Thought Vessel/Reanimate/Feed the Swarm/Bitter Triumph, Culling the Weak and Syr Konrad kept; Tazri: party/dungeon plan + Thwart the Grave and Solemn Doomguide restored for Reconnaissance Mission and Emeritus of Ideation). `scripts/deck-edit-plan.ts` now annotates those three files (fixedSwaps) → `edit-plan.html`; ManaBox copies `Desktop/MTG collection/MTG decks/new lists/*(final).txt`. Numbers: Meren 72 / PL 7.35, Imotekh PL 6.29 (36 lands), Tazri 40 / PL 6.73 (the generic draw quota penalises the two 5–6 MV Tazri staples; corpus 57 %/+5.1 and 27 %/+5.3).
- **Necron powerhouse (same day, operator: "most optimal powerhouse deck ... keeping the necron theme"):** `decks/paper/proposals/imotekh-powerhouse.txt` (100, 35 lands) from the owned mono-black pool (`scripts/paper-pool.ts` = collection minus Tazri v14 and Meren-final copies, with corpus numbers → `verify-2026-09-09/imotekh-pool.txt`). Built around the on-theme infinite: Imotekh + Metalwork Colossus in the yard + a free artifact sac outlet (Ashnod's Altar / Umbral Collar Zealot) once noncreature artifacts total ≥11 MV → Colossus returns for two Warrior tokens, casts free, dies again; payoffs Marionette Master/Apprentice, Mirkwood Bats, Psychomancer, Syr Konrad, Biotransference tokens → Necron Overlord. Power level 7.00 (final plan 6.04), efficiency 6.68, avg MV 3.32. Pages `decks/paper/imotekh-powerhouse.html` + Desktop `new lists/Imotekh the Stormlord (powerhouse).{txt,html}`.
- **Open:** a subagent ran `taskkill /F /IM node.exe /T` and killed the operator's dev shell — restarted `next dev --port 3010` (log `verify-2026-09-09/next-dev-3010.log`); Electron window needs a reload. Reserved List flag and the 2-card combo bracket floor are not in the port. Physical decks still match the `decks/paper/decks/*.txt` originals; when re-sleeved, copy the chosen proposal over the deck file and run `npx tsx scripts/paper-sync.ts`. `.planning/` deletions still uncommitted. Optimizer resolver now skips art-series/token rows (`services/build-api/resolve.ts`) — deploy to the VPS build-api with the next web-side change.
