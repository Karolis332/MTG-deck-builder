# Codebase Structure

**Analysis Date:** 2026-04-12

## Directory Layout

```
MTG-deck-builder/
├── electron/                    # Electron main process (native OS integration)
│   ├── main.ts                 # Entry point: window lifecycle, server spawn
│   ├── next-server.ts          # Standalone Next.js server launcher
│   ├── ipc-handlers.ts         # IPC message handlers (Arena watcher, telemetry)
│   ├── setup-handlers.ts       # Setup wizard IPC handlers (first-run account creation)
│   ├── arena-log-watcher.ts    # Real-time Arena.log file monitoring
│   ├── preload.ts              # Context isolation bridge
│   ├── platform-detect.ts      # Overwolf/Electron runtime detection
│   ├── overwolf-overlay.ts     # Overwolf-specific overlay manager
│   ├── overwolf-gep.ts         # Overwolf GEP (Game Event Provider) handler
│   ├── resources/
│   │   └── setup.html          # First-run setup wizard UI
│   └── [compiled JS output]    # electron-dist/ after build
│
├── src/                         # Next.js + TypeScript source
│   ├── app/                     # Next.js App Router (pages + API routes)
│   │   ├── layout.tsx           # Root layout with AuthProvider, ThemeProvider
│   │   ├── page.tsx             # Home page (deck list, quick actions)
│   │   ├── login/page.tsx       # Login page
│   │   ├── register/page.tsx    # Registration page
│   │   ├── deck-builder/page.tsx    # Main deck builder UI (drag-drop)
│   │   ├── deck/[id]/page.tsx       # Deck detail view (analytics, stats)
│   │   ├── collection/page.tsx      # Card collection browser
│   │   ├── analytics/page.tsx       # User stats dashboard
│   │   ├── analytics/matches/page.tsx   # Match history + detailed analysis
│   │   ├── game/page.tsx            # Live game tracker (overlay UI)
│   │   ├── draft/page.tsx           # Draft tracker interface
│   │   ├── landing/page.tsx         # Marketing landing page
│   │   ├── api/                     # API route handlers
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts              # JWT creation, cookie setting
│   │   │   │   ├── register/route.ts          # User creation with scrypt hashing
│   │   │   │   ├── logout/route.ts            # Cookie clearing
│   │   │   │   └── me/route.ts                # Current user info
│   │   │   ├── decks/
│   │   │   │   ├── route.ts                   # GET (list), POST (create)
│   │   │   │   ├── [id]/route.ts              # GET (detail), PUT (update), DELETE
│   │   │   │   ├── [id]/cards/route.ts        # Add/remove cards from deck
│   │   │   │   ├── auto-build/route.ts        # AI auto-fill suggestions
│   │   │   │   └── claude-build/route.ts      # Claude API deck construction
│   │   │   ├── cards/
│   │   │   │   ├── search/route.ts            # Card search (FTS5 + Scryfall fallback)
│   │   │   │   ├── autocomplete/route.ts      # Card name suggestions
│   │   │   │   └── seed/route.ts              # Bulk import from Scryfall
│   │   │   ├── collection/
│   │   │   │   ├── route.ts                   # GET (list), POST (add card)
│   │   │   │   ├── import/route.ts            # Arena/MTGO export parsing
│   │   │   │   └── import-csv/route.ts        # CSV bulk import
│   │   │   ├── ai-suggest/
│   │   │   │   ├── route.ts                   # Main AI suggestions
│   │   │   │   ├── chat/route.ts              # Claude conversational chat
│   │   │   │   ├── apply/route.ts             # Bulk-add suggestions to deck
│   │   │   │   ├── ml-predictions/route.ts    # ML-generated predictions
│   │   │   │   ├── ml-check/route.ts          # ML model status check
│   │   │   │   ├── stats/route.ts             # AI suggestion performance
│   │   │   │   └── benchmark/route.ts         # A/B test suggestions
│   │   │   ├── arena-telemetry/
│   │   │   │   ├── route.ts                   # Ingest game events from Electron
│   │   │   │   └── analyze/route.ts           # Analyze match data
│   │   │   ├── arena-matches/route.ts         # Get parsed Arena matches
│   │   │   ├── arena-collection/route.ts      # Get imported collection
│   │   │   ├── cf-player/route.ts             # Collaborative filtering player data
│   │   │   ├── cf-events/route.ts             # CF event tracking
│   │   │   ├── cf-optimize/route.ts           # CF recommendation optimization
│   │   │   ├── analytics/route.ts             # Deck/format analytics
│   │   │   ├── deck-analysis/route.ts         # Detailed deck scoring
│   │   │   ├── deck-combos/route.ts           # Card combo detection
│   │   │   ├── deck-versions/
│   │   │   │   ├── route.ts                   # Get version history
│   │   │   │   └── restore/route.ts           # Restore to previous version
│   │   │   ├── billing/
│   │   │   │   ├── checkout/route.ts          # Stripe checkout
│   │   │   │   ├── portal/route.ts            # Stripe customer portal
│   │   │   │   ├── subscription/route.ts      # Get subscription status
│   │   │   │   └── webhook/route.ts           # Stripe webhook handler
│   │   │   ├── data-export/route.ts           # Export user data as JSON
│   │   │   └── [others]/route.ts              # 33+ total routes organized by domain
│   │   └── globals.css                        # Root styles (Tailwind base)
│   │
│   ├── components/              # React client components ('use client')
│   │   ├── navbar.tsx                         # Top navigation bar
│   │   ├── auth-provider.tsx                  # Auth context + useAuth() hook
│   │   ├── theme-provider.tsx                 # Theme context
│   │   ├── deck-builder/
│   │   │   ├── deck-list.tsx                  # Main deck editor with dnd-kit
│   │   │   ├── deck-dnd-context.tsx           # Drag-drop setup
│   │   │   ├── card-grid.tsx                  # Search results grid
│   │   │   ├── deck-stats.tsx                 # CMC/mana/type distribution
│   │   │   └── deck-validation.tsx            # Format legality indicator
│   │   ├── game-tracking/
│   │   │   ├── game-deck-tracker.tsx          # Live deck zone tracking
│   │   │   ├── game-narrative.tsx             # Match story/events display
│   │   │   ├── mulligan-advisor.tsx           # Keep/mull suggestion UI
│   │   │   └── post-match-summary.tsx         # Game result + MVP cards
│   │   ├── ai-chat-panel.tsx                  # Claude conversational interface
│   │   ├── settings-dialog.tsx                # App settings (API keys, preferences)
│   │   ├── import-dialog.tsx                  # Arena/MTGO/CSV import UI
│   │   ├── card-*.tsx                         # Card display (image, zoom, inline)
│   │   ├── match-log-panel.tsx                # Match history list + filters
│   │   ├── match-detail-modal.tsx             # Detailed match analysis
│   │   └── [33+ total components]
│   │
│   ├── db/                      # Database schema & migrations
│   │   ├── schema.ts                          # 34 migrations (v1-v34) in SQL
│   │   └── seed.ts                            # Card seeding script
│   │
│   └── lib/                     # Business logic & utilities (40+ modules)
│       ├── db.ts                              # Database singleton + query helpers
│       ├── types.ts                           # TypeScript interfaces (ScryfallCard, DbCard, Deck, etc)
│       ├── constants.ts                       # Game constants (formats, mana, card types)
│       ├── utils.ts                           # Utility functions (cn, slugify, groupBy, debounce)
│       ├── auth.ts                            # JWT creation/verification, scrypt hashing
│       ├── auth-middleware.ts                 # Request auth guard
│       │
│       ├── [Card Data & Search]
│       │   ├── scryfall.ts                    # Scryfall API client (rate-limited)
│       │   ├── edhrec.ts                      # EDHREC recommendations + caching
│       │   ├── card-classifier.ts             # Card type/role classification
│       │   └── mtgjson-enrich.ts              # MTGJSON data enrichment
│       │
│       ├── [Deck Building & AI]
│       │   ├── deck-builder-ai.ts             # Multi-source card suggester (synergy+meta+community)
│       │   ├── deck-builder-constraints.ts    # Role-based card quotas (ramp/draw/removal)
│       │   ├── commander-synergy.ts           # Oracle text parser (12 trigger categories)
│       │   ├── commander-analysis.ts          # Commander profile analysis
│       │   ├── deck-templates.ts              # 11 archetype templates + mana curves
│       │   ├── land-intelligence.ts           # Mana base optimization + fetch-land logic
│       │   ├── ai-suggest.ts                  # Rule-based card suggestions
│       │   ├── claude-suggest.ts              # Claude API integration for deck chat
│       │   ├── openai-suggest.ts              # OpenAI alternative suggestions
│       │   ├── ai-deck-builder.ts             # High-level AI deck construction
│       │   ├── deck-export.ts                 # Export to Arena/MTGO/text formats
│       │   ├── deck-validation.ts             # Format legality checker (Standard/Pioneer/Modern/etc)
│       │   ├── deck-templates.ts              # Archetype templates
│       │   ├── deck-versioning.ts             # Auto-snapshot deck history
│       │   ├── deck-fingerprint.ts            # Jaccard similarity for deck matching
│       │   └── cf-api-client.ts               # Black Grimoire CF API integration
│       │
│       ├── [Arena Integration & Game State]
│       │   ├── arena-log-reader.ts            # Parse Player.log file
│       │   ├── arena-parser.ts                # Parse Arena export format
│       │   ├── arena-game-events.ts           # Extract 12 event types from JSON blocks
│       │   ├── game-state-engine.ts           # Real-time game state + draw probability
│       │   ├── grp-id-resolver.ts             # 4-layer Arena grpId → card resolution
│       │   ├── mulligan-advisor.ts            # Deterministic keep/mull heuristic
│       │   ├── sideboard-guide.ts             # AI-powered sideboard planning
│       │   ├── post-match-stats.ts            # MVP cards, efficiency metrics
│       │   ├── match-analyzer.ts              # Match performance analytics
│       │   ├── match-log-parser.ts            # Arena match parsing
│       │   ├── match-telemetry.ts             # Telemetry event batching
│       │   ├── match-ml-features.ts           # ML feature extraction from matches
│       │   ├── highlight-detector.ts          # Game highlight detection
│       │   └── first-boot.ts                  # First-launch setup (user creation, seeding)
│       │
│       ├── [ML & Learning]
│       │   ├── global-learner.ts              # Win-rate tracking + card ratings
│       │   └── knowledge-retrieval.ts         # Query personal + community ML data
│       │
│       ├── [Electron/Platform]
│       │   ├── electron-bridge.ts             # IPC message types & helpers
│       │   └── platform-detect.ts             # Overwolf/Electron detection
│       │
│       └── __tests__/                         # 340 unit tests across 18 files
│           ├── utils.test.ts
│           ├── arena-parser.test.ts
│           ├── game-state-engine.test.ts
│           ├── grp-id-resolver.test.ts
│           └── [15+ more test files]
│
├── scripts/                     # Python ML pipeline + build scripts
│   ├── pipeline.py                            # 16-step ML orchestrator (nightly)
│   ├── pipeline_state.py                      # Step state tracking + degradation
│   ├── pipeline_telegram_bot.py                # Telegram notifications
│   ├── scrape_mtggoldfish.py                  # Tournament deck scraper
│   ├── scrape_mtgtop8.py                      # Competitive meta scraper
│   ├── scrape_edhrec_articles.py              # EDHREC strategy article scraper
│   ├── fetch_avg_decklists.py                 # Average decklists per commander
│   ├── aggregate_community_meta.py             # Community data aggregation
│   ├── train_model.py                         # Scikit-learn model training
│   ├── predict_suggestions.py                 # Generate card suggestions
│   ├── postbuild-standalone.js                # Copy assets to standalone build
│   ├── afterPack.js                           # electron-builder hook: rebuild native modules
│   ├── download_arena_card_db.js              # Download Arena grpId cache
│   ├── generate_screenshots.js                # Playwright screenshot generator
│   ├── setup_scheduled_task.py                # Windows Task Scheduler setup
│   ├── import_user_data.py                    # Import exported user data
│   ├── telegram_claude_bridge.py              # Claude relay from Telegram
│   ├── tests/                                 # Python tests (pytest)
│   │   ├── test_pipeline.py
│   │   ├── test_scrapers.py
│   │   └── [5+ more test files]
│   └── cf-api-patches/                        # Collaborative filtering API optimization
│       ├── nightly_pipeline.py
│       ├── players.py
│       └── train_partition_fix.py
│
├── build/                       # Build artifacts & icons
│   ├── icon.svg                               # Grimoire book icon with gold pentagram
│   ├── icon.ico / icon.png                    # Icon variants for Windows/macOS/Linux
│   └── [dist outputs after build]
│
├── public/                      # Static assets
│   └── [card images, favicons, etc]
│
├── electron-builder.yml         # Electron packaging config (NSIS, DMG, AppImage, zip)
├── package.json                 # Node dependencies + scripts
├── tsconfig.json                # TypeScript configuration (strict mode)
├── tsconfig.electron.json       # Electron-specific TypeScript config
├── next.config.js               # Next.js configuration (standalone output)
├── tailwind.config.ts           # Tailwind CSS with grimoire theme
├── postcss.config.js            # PostCSS (autoprefixer)
├── vitest.config.ts             # Vitest configuration
├── jest.config.js               # Backup Jest config
├── .eslintrc.json               # ESLint rules
├── .prettierrc                  # Code formatter config
└── .gitignore                   # Excludes node_modules, builds, secrets
```

## Directory Purposes

**`electron/`** — Electron main process and native integration
- **main.ts**: App lifecycle, window creation, Next.js server spawn
- **ipc-handlers.ts**: Arena log watcher IPC, game state events, telemetry flushing
- **arena-log-watcher.ts**: Real-time file monitoring of Player.log, event extraction
- **setup-handlers.ts**: First-run wizard IPC for account creation

**`src/app/`** — Next.js pages and API routes
- **Page routes** (`page.tsx`): User-facing UI pages (deck builder, collection, analytics)
- **API routes** (`route.ts`): 33+ endpoints organized by domain (auth, decks, cards, AI, arena)
- **`layout.tsx`**: Root layout with providers (Auth, Theme, Navbar)

**`src/components/`** — React client components with `'use client'`
- Organized by feature: deck-builder, game-tracking, modals
- 33+ components total, heavy use of Tailwind + Lucide icons
- State management via hooks + React Context (AuthProvider)

**`src/db/`** — Database schema and migrations
- **schema.ts**: 34 migrations (v1-v34) defining all 51+ tables
- Auto-run on app startup via `runMigrations()` in `db.ts`

**`src/lib/`** — Business logic, utilities, external integrations
- **Database**: `db.ts` (singleton), query helpers
- **Auth**: JWT creation, scrypt hashing, middleware
- **Deck Building**: Commander synergy, templates, constraints, AI suggestions
- **Arena**: Log parsing, game state tracking, card resolution
- **External APIs**: Scryfall, EDHREC, Claude, Black Grimoire CF API
- **ML**: Global learner (win-rate tracking), knowledge retrieval
- **Tests**: 340 tests across 18 files in `__tests__/`

**`scripts/`** — Python ML pipeline, build hooks, utilities
- **pipeline.py**: 16-step nightly orchestrator (scrape, train, predict)
- **postbuild-standalone.js**: Copies assets/native modules after Next.js build
- **afterPack.js**: electron-builder hook to rebuild better-sqlite3 for Electron
- **tests/**: Python pytest suite

**`build/`** — Icons and static build artifacts
- SVG source icon, generated .ico/.png variants

## Key File Locations

**Entry Points:**
- `electron/main.ts`: Electron app entry (window management, server spawn)
- `.next/standalone/server.js`: Next.js production server (built from `src/`)
- `src/app/page.tsx`: Home page (deck list, quick actions)
- `src/app/deck-builder/page.tsx`: Main deck editor with dnd-kit drag-drop

**Configuration:**
- `package.json`: Dependencies, build/dev/test scripts
- `tsconfig.json`: TypeScript strict mode, `@/*` alias
- `next.config.js`: `output: 'standalone'` for Electron bundling
- `electron-builder.yml`: NSIS/DMG/AppImage packaging
- `tailwind.config.ts`: Grimoire dark theme (Cinzel headings, crimson text, gold accents)

**Core Logic:**
- `src/lib/db.ts`: Database singleton + 50+ query helpers
- `src/lib/deck-builder-ai.ts`: Multi-source card suggester (synergy + meta + community)
- `src/lib/commander-synergy.ts`: Oracle text parser (12 trigger categories)
- `src/lib/game-state-engine.ts`: Real-time game state + draw probabilities
- `src/lib/grp-id-resolver.ts`: Arena grpId → card resolution (4-layer pipeline)

**Authentication:**
- `src/lib/auth.ts`: JWT creation/verification, scrypt hashing
- `src/lib/auth-middleware.ts`: Request guard, cookie extraction
- `src/app/api/auth/login/route.ts`: Login endpoint (JWT creation)
- `src/app/api/auth/register/route.ts`: Registration endpoint

**Testing:**
- `src/lib/__tests__/`: 340 unit tests (vitest)
- `scripts/tests/`: Python tests (pytest)

## Naming Conventions

**Files:**
- Components: PascalCase (`DeckList.tsx`, `CardGrid.tsx`)
- Utilities/logic: kebab-case (`deck-builder-ai.ts`, `game-state-engine.ts`)
- API routes: `route.ts` in feature directories (`api/decks/route.ts`)
- Tests: `.test.ts` or `.spec.ts` suffix

**Directories:**
- Features: kebab-case (`deck-builder/`, `game-tracking/`, `arena-telemetry/`)
- APIs: kebab-case plural (`api/decks/`, `api/cards/`, `api/analytics/`)
- Utilities: `lib/`, descriptive names per module

**TypeScript/Code:**
- Constants: UPPER_SNAKE_CASE (`DEFAULT_LAND_COUNT`, `COMMANDER_FORMATS`)
- Functions: camelCase (`createDeck()`, `analyzeCommander()`)
- Types/Interfaces: PascalCase (`Deck`, `DbCard`, `CommanderSynergyProfile`)
- Variables: camelCase
- Database columns: snake_case

## Where to Add New Code

**New Deck Building Feature (e.g., new suggestion source):**
- Primary logic: `src/lib/` (e.g., `new-source-suggester.ts`)
- API route: `src/app/api/ai-suggest/new-source/route.ts`
- Tests: `src/lib/__tests__/new-source.test.ts`
- Integration: Merge results in `deck-builder-ai.ts` with other sources

**New Card Analysis Tool:**
- Logic: `src/lib/card-*.ts` (e.g., `card-combo-detector.ts`)
- API route: `src/app/api/deck-combos/route.ts`
- Component: `src/components/card-*.tsx` (e.g., `card-combo-list.tsx`)
- Page: `src/app/analysis/page.tsx` (if new page needed)

**New Game Event Type (Arena Integration):**
- Parser: Add to `arena-game-events.ts` (extract from JSON block)
- Engine: Update `game-state-engine.ts` to consume event
- Tests: Add to `src/lib/__tests__/arena-game-events.test.ts`
- IPC: If needs UI update, emit via `ipc.invoke('game-event', data)`

**New API Endpoint:**
- Route: `src/app/api/[feature]/[action]/route.ts`
- Auth: Always use `getAuthUser()` from `auth-middleware.ts` at start
- Validation: Use Zod schema for request body
- DB: Call helpers from `db.ts` (all user-scoped)
- Error: Return `{ error: string }` with appropriate status

**Utility Function:**
- Helper: `src/lib/utils.ts` for general utilities
- Domain-specific: New module in `src/lib/` if cohesive set (e.g., `new-domain.ts`)

## Special Directories

**`data/`** — SQLite database (generated, not committed)
- Purpose: `mtg-deck-builder.db` with 51+ tables, 35K+ cards
- Generated: On first app run via `createDatabase()` in `db.ts`
- Committed: No (in .gitignore)
- Location in Electron: `%APPDATA%/the-black-grimoire/data/` (Windows) or `~/Library/Application Support/the-black-grimoire/data/` (macOS)

**`.next/`** — Next.js build output (generated, not committed)
- Purpose: Compiled Next.js app with `standalone/` subdirectory
- Generated: `npm run build`
- Committed: No
- Packaged: `.next/standalone/` copied to Electron's `extraResources/` via `postbuild-standalone.js`

**`electron-dist/`** — Compiled Electron TypeScript (generated, not committed)
- Purpose: JS output from `tsc -p tsconfig.electron.json`
- Generated: `npm run build:electron`
- Committed: No

**`.planning/`** — Orchestrator working directory
- Purpose: Codebase analysis docs, planning artifacts
- Generated: Automatically by `/gsd-*` commands
- Committed: No (ignore in git)

---

*Structure analysis: 2026-04-12*
