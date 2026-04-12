# Architecture

**Analysis Date:** 2026-04-12

## Pattern Overview

**Overall:** Hybrid Electron + Next.js (App Router) desktop application with multi-layered separation of concerns: Electron shell handles OS integration and process management, Next.js standalone server provides HTTP API and UI rendering, SQLite provides persistent data, Python orchestrates background ML pipeline.

**Key Characteristics:**
- Client-server hybrid: Electron main process spawns Next.js standalone server as child process on localhost
- User-scoped data: All database queries parameterized and filtered by `user_id`
- Singleton database pattern: Global connection via `globalThis._db` for Next.js HMR safety
- Multi-user support: JWT authentication with httpOnly cookies, scrypt password hashing
- Arena integration: Real-time log file watching, game state tracking, card recognition
- AI-powered suggestions: Claude API for deck building, EDHREC for commander recommendations, scikit-learn for card performance ML

## Layers

**Presentation (React/TypeScript):**
- Purpose: User-facing UI components, state management via hooks, real-time deck editing
- Location: `src/components/` and `src/app/` (pages)
- Contains: 33+ client components with `'use client'` directive, page components, modal dialogs
- Depends on: API routes, Electron IPC bridge for overlay features
- Used by: Web browser served by Next.js server

**API Routes (Next.js):**
- Purpose: Request handling, authentication, business logic coordination
- Location: `src/app/api/`
- Contains: 33+ route handlers organized by domain (auth, decks, cards, analytics, AI suggestions, arena telemetry)
- Pattern: All routes validate auth via `getAuthUser()` from `auth-middleware.ts`, return JSON responses
- Depends on: Database layer, external APIs (Scryfall, EDHREC, Claude), validation (Zod)
- Used by: Client components via `fetch()` calls

**Business Logic (TypeScript):**
- Purpose: Core game rules, deck algorithms, data transformations
- Location: `src/lib/`
- Contains: 40+ modules including deck building (constraints, synergy, templates), card matching (arena-parser, grp-id-resolver), game state tracking (game-state-engine, mulligan-advisor)
- Pattern: Pure functions where possible, explicit error handling, no API calls outside of dedicated client modules
- Examples: `deck-builder-ai.ts` (role-based card selection with synergy scoring), `commander-synergy.ts` (12 trigger categories), `land-intelligence.ts` (mana base optimization), `game-state-engine.ts` (draw probability calculations)

**Database (SQLite):**
- Purpose: Persistent storage for users, decks, cards, match history, ML statistics
- Location: `data/mtg-deck-builder.db` (or `%APPDATA%/the-black-grimoire/data/` in Electron)
- Contains: 51+ tables across 34 migrations, 35K+ cards from Scryfall
- Pattern: Better-sqlite3 with WAL mode, parameterized queries only, FTS5 full-text search on cards
- Migrations: Automatic on app startup via `src/db/schema.ts`

**Electron Main Process:**
- Purpose: Window management, Arena log watching, IPC coordination, native OS features
- Location: `electron/main.ts`
- Contains: Window lifecycle, Next.js server spawning, Arena watcher setup, overlay initialization
- Responsibilities: Port finding, splash screen, setup wizard, crash logging, process management

**Python ML Pipeline:**
- Purpose: Background training of card performance models, meta deck scraping, aggregation
- Location: `scripts/pipeline.py` (orchestrator), 16 step pipeline
- Contains: Scryfall seeding, MTGGoldfish/MTGTop8 scraping, community deck aggregation, model training, prediction generation
- Pattern: Step-based state tracking with cross-run failure detection, 3x retry with backoff, degraded-mode auto-skip for optional steps

## Data Flow

**Deck Building:**

1. User clicks "New Deck" in UI
2. Client → POST `/api/decks` with name, format, description
3. API route validates input via Zod, calls `createDeck(name, format, description, userId)`
4. `createDeck()` inserts into `decks` table with `user_id`, returns new deck
5. Client receives deck ID, navigates to `/deck/[id]`

**Deck Editor (Drag-and-Drop):**

1. User searches for a card in search bar
2. Client → GET `/api/cards/search?q=...`
3. API tries local FTS5 first, falls back to Scryfall API rate-limited to 100ms
4. Client renders card grid with dnd-kit drag-drop
5. User drags card from search results to main/sideboard zone
6. Client calls `updateDeckCard()` IPC handler or POST `/api/decks/[id]/cards`
7. API updates `deck_cards` table with `quantity`, `board`, `sort_order`
8. Client refetches deck to update stats

**AI Suggestions (Commander-Based):**

1. User selects commander (e.g., Golbez)
2. Client → POST `/api/ai-suggest` with `commander_id`, `format`, `included_cards`, `excluded_cards`
3. API orchestrates multi-source pipeline:
   - `analyzeCommander()` from `commander-synergy.ts` parses oracle text → 12 trigger categories
   - `getCommanderCardStats()` fetches per-commander inclusion rates from `commander_card_stats` table
   - `getTemplate()` selects archetype (ramp/draw/removal/etc) and mana curve
   - `getCommunityRecommendations()` fetches EDHREC themes and high-inclusion cards
   - `deck-builder-ai.ts` merges all signals with role-based quotas (12/12 ramp, 10/12 draw, 6/6 removal, etc)
4. Returns 50+ card suggestions ranked by score (baseline + synergy bonus + commander inclusion + color adjustment)
5. Client → POST `/api/ai-suggest/apply` to bulk-add top suggestions
6. Returns updated deck with new cards

**Arena Integration (Game State Tracking):**

1. Electron watcher monitors `Player.log` file (Arena location)
2. ArenaLogWatcher detects new game lines, parses JSON blocks
3. `arena-game-events.ts` extracts 12 event types (GameStart, Draw, Cast, Combat, etc)
4. `game-state-engine.ts` builds real-time game state (zones, life, cards drawn, draw probability)
5. `mulligan-advisor.ts` applies deterministic heuristic to suggest keep/mull (sub-10ms, no API calls)
6. Overlay shows deck tracker with life, hand, drawn cards, mulligan suggestion, sideboard plan
7. At match end, `post-match-stats.ts` computes MVP cards, efficiency metrics
8. IPC handler sends telemetry to `/api/arena-telemetry` (queued if server not ready)

**State Management:**

- **Auth state:** JWT in httpOnly cookie, verified per-request via `verifyToken()` in `jose` library
- **User context:** React Context via `AuthProvider` in `src/components/auth-provider.tsx`, provides `useAuth()` hook
- **Deck data:** Client-side state in components, refetched via API after mutations
- **Game state:** Ephemeral in Electron process (ArenaLogWatcher), sent to browser via IPC
- **ML models:** Trained nightly via Python pipeline, persisted as JSON suggestions in `meta_card_stats` table

## Key Abstractions

**DeckBuilder (AI):**
- Purpose: Multi-source card recommendation engine merging synergy, meta, community data
- Examples: `deck-builder-ai.ts`, `commander-synergy.ts`, `deck-builder-constraints.ts`
- Pattern: Pure function takes commander profile + templates + meta stats → returns ranked card list

**GameStateEngine:**
- Purpose: Real-time game state tracking from Arena events
- Examples: `game-state-engine.ts`, `arena-game-events.ts`
- Pattern: Immutable snapshots on each event, queries for draw probability, mulligan advice

**GrpIdResolver:**
- Purpose: 4-layer Arena grpId → card name resolution pipeline
- Examples: `grp-id-resolver.ts`, arena-log-reader.ts`
- Pattern: Memory cache → SQLite cache → Scryfall `arena_id` → API fallback, with exponential backoff

**CommanderSynergy:**
- Purpose: Oracle text parser for commander-specific trigger categories
- Examples: `commander-synergy.ts` (12 categories: exile_cast, creature_etb, spell_cast, etc)
- Pattern: Regex matching on oracle_text, confidence scoring per trigger

**DeckTemplates:**
- Purpose: Archetype-based mana curve and role quotas (ramp/draw/removal/wipes/protection/payoffs)
- Examples: `deck-templates.ts` (11 archetypes: aggro, midrange, control, ramp, storm, etc)
- Pattern: Baseline curve + color-adjusted multiplier for each role

**AuthMiddleware:**
- Purpose: Request authentication guard
- Examples: `auth-middleware.ts`, `auth.ts` (JWT verification, scrypt hashing)
- Pattern: Extract JWT from httpOnly cookie, verify with `jose`, return `AuthenticatedUser` or null

## Entry Points

**Electron Main Entry:**
- Location: `electron/main.ts`
- Triggers: Package.json `"main": "electron-dist/electron/main.js"`, Electron binary launch
- Responsibilities: Port detection (3000-3009), Next.js server spawn, splash screen, setup wizard, IPC setup, Overwolf overlay init

**Next.js Server Entry:**
- Location: `electron/next-server.js` (spawned as child process with ELECTRON_RUN_AS_NODE=1)
- Triggers: Electron main process after port discovery
- Responsibilities: Load `.next/standalone/` from `extraResources`, start HTTP server on `PORT`, serve UI and API routes

**API Route Entry:**
- Location: `src/app/api/[path]/route.ts`
- Pattern: Handle GET/POST/PUT/DELETE, extract auth, validate input, call db functions, return JSON
- Example: `src/app/api/decks/route.ts` handles GET (list user decks) and POST (create deck)

**Page Component Entry:**
- Location: `src/app/[path]/page.tsx` with `'use client'`
- Pattern: React component with hooks, fetch from `/api/...` on mount, state management
- Example: `src/app/deck-builder/page.tsx` is main deck builder UI with dnd-kit drag-drop

**Python Pipeline Entry:**
- Location: `scripts/pipeline.py --reset-step [N] --force-degraded --no-notify`
- Triggers: Scheduled via Windows Task Scheduler (nightly 09:00 UTC) or manual invocation
- Responsibilities: 16-step orchestration (seed cards, scrape MTGGoldfish, train models, predict suggestions)

## Error Handling

**Strategy:** Try-catch at request boundaries (API routes, IPC handlers), explicit validation with Zod, user-friendly error messages in JSON responses.

**Patterns:**

- **API routes:** Catch all errors, return `{ error: string }` with appropriate HTTP status (400 for validation, 401 for auth, 500 for server errors)
- **Database operations:** Throw descriptive errors, caught by API route handlers
- **External APIs:** Explicit error handling in fetch calls, timeout/retry logic in `scryfall.ts` (rate-limit aware)
- **Electron IPC:** Error handler on response promise, logged to crash.log, displayed via dialog
- **Game state parsing:** Silent skips invalid lines, no-throw parser for resilience

## Cross-Cutting Concerns

**Logging:** Console.log in development, file-based trace logs in production (`telemetry-debug.log`, `crash.log`) at `$APPDATA/the-black-grimoire/`

**Validation:** Zod schemas in API routes (auth, deck creation, card updates), type guards in business logic functions

**Authentication:** JWT httpOnly cookie set on login (`/api/auth/login`), verified per-request via `getAuthUser()` middleware, 7-day expiry

**Authorization:** User-scoped database queries via `WHERE user_id = ?` parameter in all DML operations, prevents cross-user data access

**Caching:** EDHREC recommendations cached in `edhrec_knowledge` table, meta stats in `meta_card_stats`, Arena grpId in `grp_id_cache`, short-term meta cache in `meta_cache` with TTL

---

*Architecture analysis: 2026-04-12*
