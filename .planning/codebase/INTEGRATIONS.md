# External Integrations

**Analysis Date:** 2025-04-12

## APIs & External Services

**Card Data:**
- **Scryfall API** - Primary card database and search
  - Base: `https://api.scryfall.com`
  - Rate limit: 100ms between requests (enforced in `src/lib/scryfall.ts`)
  - Client: `src/lib/scryfall.ts` (rateLimitedFetch with automatic 429 retry)
  - Used for: Card search, individual card details, legality lookups, autocomplete
  - No auth required

- **MTGJSON** - Comprehensive MTG metadata (subtypes, arena IDs, prices)
  - Source: `https://mtgjson.com/api/v5/AtomicCards.json.gz`
  - Pipeline step: `scripts/fetch_mtgjson.py`
  - Fetched into `src/db/schema.ts` cards table during pipeline
  - No auth required

**Competitive Meta & Tournament Data:**
- **MTGGoldfish** - Metagame archetypes and tournament results
  - Base: `https://www.mtggoldfish.com`
  - Formats: Standard, Commander (metagame pages + tournament history)
  - Scraper: `scripts/scrape_mtggoldfish.py`
  - Method: HTML parsing (BeautifulSoup), no API
  - Rate limit: 2.5s between requests
  - Stored in: `community_decks`, `community_deck_cards`, `meta_card_stats` tables
  - No auth required

- **MTGTop8** - Competitive tournament deck results
  - Base: `https://www.mtgtop8.com`
  - Scraper: `scripts/scrape_mtgtop8.py`
  - Method: HTML parsing
  - Formats: Standard, Modern, Legacy, Vintage, Pioneer, etc.
  - Stored in: `community_decks` + `community_deck_cards` tables
  - No auth required

**Commander Format Meta & Synergies:**
- **EDHREC** - Commander recommendations and average decks
  - HTML base: `https://edhrec.com`
  - JSON base: `https://json.edhrec.com/pages/average-decks/{slug}.json`
  - Scrapers:
    - `scripts/fetch_avg_decklists.py` - Average decklists per commander (JSON then HTML fallback)
    - `scripts/scrape_edhrec_articles.py` - Strategy articles
    - `scripts/enrich_commander_synergies.py` - Commander synergy enrichment (pyedhrec client)
  - Method: JSON API + HTML scraping (API locked down mid-2025, uses __NEXT_DATA__ fallback)
  - Rate limit: 1s per request (respect server)
  - Stored in: `edhrec_knowledge`, `edhrec_avg_decks`, `commander_synergies`, `commander_card_stats` tables
  - No auth required

- **Commander Spellbook** - Combo database
  - API: `https://backend.commanderspellbook.com`
  - Endpoints:
    - `/variants/` (paginated combo database)
    - `/find-my-combos/` (POST: find combos in a deck)
  - Scraper: `scripts/scrape_commander_spellbook.py`
  - Method: REST API (JSON)
  - Pagination: Page size 50, respects `next` URL
  - Stored in: `spellbook_combos`, `spellbook_deck_combos` tables
  - No auth required

**Arena Game Integration:**
- **Magic Arena Game Logs** - Local Arena game event parsing
  - File: `%LOCALAPPDATA%\Wizards of the Coast\Mtga\Player.log` (Windows)
  - Consumer: `electron/arena-log-watcher.ts` (live file monitoring + streaming)
  - Parser: `src/lib/arena-log-reader.ts` (JSON block extraction)
  - Game events: `src/lib/arena-game-events.ts` (12 event types: GameStateChanged, DeclareAttackers, etc.)
  - Stored in: `arena_parsed_matches`, `live_game_sessions` tables
  - GrpId resolution: `src/lib/grp-id-resolver.ts` (4-layer pipeline)
  - No external call required (local file)

**Machine Learning / Recommendations:**
- **Black Grimoire CF API (Internal)** - Collaborative filtering recommendations
  - Base: `http://187.77.110.100/cf-api` (default, configurable in app_state)
  - Client: `src/lib/cf-api-client.ts`
  - Endpoints:
    - `POST /recommendations` - Get card recommendations for a deck
    - `POST /similar-decks` - Find similar decks in corpus
  - Auth: Bearer token via `X-API-Key` header (stored in app_state as `cf_api_key`)
  - Timeout: 5s
  - Cache: Local SQLite `cf_recommendations_cache` (24h TTL)
  - Fallback: Cached results available if API unreachable

- **scikit-learn** (Local) - Gradient Boosting model for personal suggestions
  - Training: `scripts/train_model.py` (26 features from personal + community data)
  - Model: `data/card_model.joblib` (serialized via joblib)
  - Predictions: `scripts/predict_suggestions.py`
  - Stored in: `personalized_suggestions` table
  - No external service (trained and runs locally)

**AI Chat & Deck Suggestion:**
- **Anthropic Claude API** - AI-powered deck advice and card suggestions
  - Base: `https://api.anthropic.com/v1/messages`
  - Models: claude-sonnet-4-5-20250929, claude-opus-4-6-20250514 (configurable)
  - Auth: `Authorization: Bearer {API_KEY}` header
  - API key: Stored in app_state as `setting_anthropic_api_key` (user-configured)
  - Used in:
    - `src/lib/claude-suggest.ts` - Deck improvement suggestions
    - `src/lib/sideboard-guide.ts` - AI sideboard plan generation
    - `src/app/api/ai-suggest/route.ts` - API endpoint
  - Knowledge base: `docs/MTG_DECK_BUILDING_KNOWLEDGE.md` (included in Electron package)
  - No charge if key not configured (feature disabled)

- **OpenAI API** (Optional) - Alternative AI provider
  - Base: `https://api.openai.com/v1/chat/completions`
  - Models: gpt-4, gpt-4o (configurable)
  - Auth: `Authorization: Bearer {API_KEY}` header
  - API key: Stored in app_state as `setting_openai_api_key` (user-configured)
  - Used in: `src/lib/openai-suggest.ts`
  - No charge if key not configured

- **Groq API** (Optional) - Fast inference alternative
  - Models: Llama, Mixtral (fast, cost-effective)
  - Auth: API key in app_state as `setting_groq_api_key`
  - Used as fallback to Anthropic/OpenAI

- **xAI Grok API** (Optional) - Alternative AI provider
  - Auth: API key in app_state as `setting_xai_api_key`
  - Used as fallback option

## Data Storage

**Databases:**
- **SQLite (better-sqlite3)** - Local embedded database
  - Path: `data/mtg-deck-builder.db` (dev) or `%APPDATA%/the-black-grimoire/data/mtg-deck-builder.db` (Electron)
  - Tables: 52+ across 34 migrations (cards, users, decks, deck_cards, collection, matches, community data, cache, settings)
  - Full-text search: FTS5 on cards table (name, oracle_text, type_line)
  - Client: better-sqlite3 11.7.0 (native module, WAL mode)
  - Connection: Singleton via `getDb()` in `src/lib/db.ts` (HMR-safe with globalThis)

**File Storage:**
- **Local filesystem only** - No cloud storage
  - Arena grpId cache: `data/arena_grp_ids.json` (Arena card ID mapping)
  - ML model: `data/card_model.joblib` (joblib serialized scikit-learn model)
  - Pipeline metadata: `data/pipeline_failures.json`, `data/pipeline_run.log` (not packaged in Electron)
  - User data exports: Via `src/app/api/data-export/route.ts`

**Caching:**
- **SQLite cache tables:**
  - `meta_cache` - EDHREC, MTGGoldfish, EDHRec article caching (168h TTL)
  - `cf_recommendations_cache` - CF API results (24h TTL)
  - `grp_id_cache` - Arena grpId→card name mapping (persistent)

## Authentication & Identity

**Auth Provider:**
- **Custom JWT** - In-app auth
  - Implementation: `src/lib/auth.ts` (jose for JWT, Node.js scrypt for password hashing)
  - Token: Stored in httpOnly cookie `authToken`
  - Secret: Stored in environment as `JWT_SECRET` (or development default)
  - Scope: User-scoped API routes via `src/lib/auth-middleware.ts`
  - Middleware: All data-mutating routes validate `userId` from JWT

- **No external auth provider** (no Google, GitHub, Supabase, etc.)
  - Users table: username, email, password_hash (scrypt, hex salt:hash)
  - Sessions: JWT-based, 24h default expiry (configurable in token)

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar configured

**Logs:**
- **Console logging** - `console.log()` in API routes and server-side code
- **Arena log streaming** - Raw read of `Player.log` with event extraction (`src/lib/arena-log-reader.ts`)
- **Pipeline logs:**
  - `data/pipeline_run.log` - Full pipeline run transcript
  - `data/pipeline_failures.json` - Cross-run failure tracking (3-failure threshold triggers 24h degraded mode)
  - Telegram notifications via `scripts/pipeline_telegram_bot.py` (optional, requires bot token in app_state)

**Observability Gap:** No centralized logging, no OpenTelemetry or log drains configured.

## CI/CD & Deployment

**Hosting:**
- **Electron Desktop App** - Standalone Windows/macOS/Linux packages
  - Build: electron-builder 25.1.8
  - Output: Installers (NSIS, DMG, AppImage) in `dist-electron/`
  - Size: ~443MB unpacked, ~153MB installer

- **Overwolf Addon** - In-game overlay for Overwolf-enabled games
  - Build: @overwolf/ow-electron-builder 26.0.12
  - Runtime: Overwolf 0.200+ required
  - Game: Magic: The Gathering Arena (MTGA Class ID 21308)

- **Web App (Planned)** - Black Grimoire Web (separate repo)
  - Target: Vercel (Next.js 16)
  - Domain: blackgrimoire.gg
  - Status: Scaffolding phase (Clerk, Neon, Stripe integration pending)

**CI Pipeline:**
- None detected - No GitHub Actions, GitLab CI, or similar
- Manual local builds via `npm run dist:win|mac|linux`
- Python pipeline: Manual execution of `py scripts/pipeline.py` (scheduled via Windows Task Scheduler in production)

**Environment Variables (Production):**
- `JWT_SECRET` - JWT signing key
- `NODE_ENV` - Set to `production`
- `PORT` - Typically 3000 (auto-port-forward if occupied)
- `MTG_DB_DIR` - Custom DB path (optional)
- Stripe API key - In app_state table (user-configured)
- Claude API key - In app_state table (user-configured)
- CF API key - In app_state table (user-configured)

## Webhooks & Callbacks

**Incoming:**
- **Stripe Webhook** - Optional for hosted deployments
  - Endpoint: `POST /api/billing/webhook`
  - Events: `customer.subscription.created|updated|deleted`
  - Signature verification: Stripe webhook secret (app_state `stripe_webhook_secret`)
  - Fallback mechanism: Polling via `GET /api/billing/subscription?sync=true` for local Electron (primary)
  - Notes: Webhook is secondary; Electron polls on startup and after checkout

- **Arena Game Events** - IPC callbacks from live game
  - Channel: Electron IPC (`electron-bridge.ts` message handlers)
  - Events: GameStateChanged, DeclareAttackers, ResolutionComplete (12 types total)
  - Handler: `src/lib/game-state-engine.ts` consumes events for live overlay tracking

**Outgoing:**
- None detected - No webhooks to external services
- Pipeline notifications: Telegram bot via HTTP POST (optional, in `scripts/pipeline_telegram_bot.py`)

---

*Integration audit: 2025-04-12*
