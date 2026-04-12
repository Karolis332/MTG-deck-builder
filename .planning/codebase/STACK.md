# Technology Stack

**Analysis Date:** 2025-04-12

## Languages

**Primary:**
- TypeScript 5.7.3 - Used in Next.js 14 app, Electron main/preload, and API routes
- JavaScript - Build scripts and configuration (next.config.js, postbuild-standalone.js, afterPack.js)
- Python 3.13 - ML pipeline, data scraping, and card database enrichment

**Secondary:**
- SQL - SQLite migrations in `src/db/schema.ts`

## Runtime

**Environment:**
- Node.js (via Next.js standalone runtime and Electron 33)
- Python 3.13 (for scripts directory pipeline)
- Electron 33 (desktop runtime, wraps Next.js standalone server)

**Package Manager:**
- npm (7+ for workspace support)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.2.21 (App Router, standalone output mode) - Primary web framework with `output: 'standalone'` for Electron bundling
- Electron 33.3.1 - Desktop wrapper with main process spawning Next.js standalone server
- React 18.3.1 - UI components (`'use client'` directive)

**Testing:**
- Vitest 4.0.18 - TypeScript test runner (`npm run test`, `npm run test:watch`)
- pytest (Python tests via `npm run test:python`)

**Build/Dev:**
- electron-builder 25.1.8 - Desktop app packaging (Windows/macOS/Linux installers)
- Overwolf OW-Electron 37.10.3 - Addon runtime for Overwolf distribution
- @overwolf/ow-electron-builder 26.0.12 - Overwolf packaging tool
- concurrently 9.1.0 - Run dev server and Electron in parallel
- wait-on 8.0.2 - Wait for dev server before launching Electron
- tsx 4.19.2 - TypeScript execution for scripts
- TypeScript 5.7.3 - Type checking
- ESLint 8.57.1 + next/eslint-config - Linting
- Tailwind CSS 3.4.17 - Utility-first styling
- PostCSS 8.4.49 - CSS processing
- autoprefixer 10.4.20 - Browser prefix injection
- sharp 0.34.5 - Image processing (icon generation)

## Key Dependencies

**Critical (Architecture):**
- better-sqlite3 11.7.0 - Embedded SQLite database with WAL mode, native module rebuilt per-platform
- zod 3.24.1 - Runtime type validation for API inputs
- jose 6.1.3 - JWT token signing/verification (scrypt password hashing via Node.js crypto)

**UI & Visualization:**
- recharts 2.15.0 - Chart library for analytics dashboard
- lucide-react - Icon library (imported as lucide-react, used throughout UI)
- clsx 2.1.1 - Utility for conditional class names
- tailwind-merge 2.6.0 - Merge Tailwind utilities without conflicts
- @dnd-kit/core 6.3.1 - Drag-and-drop library for deck editor
- @dnd-kit/sortable 10.0.0 - Sortable collections for dnd-kit
- @dnd-kit/utilities 3.2.2 - Utilities for dnd-kit

**Payments & Billing:**
- stripe 22.0.0 (Node.js SDK) - Subscription management and checkout, stored in app_state table

**Data Processing:**
- stream-json 1.9.1 - Streaming JSON parser for large card database imports

**Dev Dependencies (TypeScript/Types):**
- @types/node 22.10.5 - Node.js type definitions
- @types/react 18.3.18 - React type definitions
- @types/react-dom 18.3.5 - React DOM type definitions
- @types/better-sqlite3 7.6.12 - better-sqlite3 type definitions
- @vitejs/plugin-react 5.1.3 - Vitest React support
- typescript 5.7.3 - Type checker

**Python ML/Data Stack:**
- pandas 2.0.0+ - Data manipulation and analysis for meta aggregation
- numpy 1.24.0+ - Numerical computing for feature engineering
- scikit-learn 1.3.0+ - Gradient Boosting model for card predictions (25+ features)
- joblib 1.3.0+ - Model serialization (card_model.joblib)
- beautifulsoup4 4.12.0+ - HTML parsing for scraper scripts
- requests 2.31.0+ - HTTP client for external API calls
- pyedhrec 0.0.2+ - EDHREC Python client (optional, used in enrich_commander_synergies.py)

## Configuration

**Environment:**
- `MTG_DB_DIR` - Custom database directory (default: `data/` locally, `%APPDATA%/the-black-grimoire/data/` in Electron)
- `JWT_SECRET` - JWT signing secret for auth tokens (has development default)
- `NODE_ENV` - `development` or `production`
- `PORT` - Server port (default 3000, auto-scans 3000-3009 if occupied)
- `APPDATA` - Windows environment variable, used to detect Electron installation directory

**Build:**
- `tsconfig.json` - TypeScript configuration (strict mode enabled, path alias `@/*` → `./src/*`)
- `tsconfig.electron.json` - Separate tsconfig for Electron main process compilation
- `next.config.js` - Next.js configuration (standalone output, Scryfall image domain allowed)
- `electron-builder.yml` - Electron packaging config (Windows NSIS, macOS DMG, Linux AppImage/deb)
- `ow-electron-builder.yml` - Overwolf packaging configuration
- `package.json` - npm scripts and dependencies

**Editor/Linting:**
- `.eslintrc.json` - ESLint configuration
- 2-space indentation (enforced by Prettier via Next.js config)

## Platform Requirements

**Development:**
- Node.js 18+ (for npm, tsx, and Next.js dev server)
- Python 3.13+ (for ML pipeline and data scraping scripts)
- Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+) for Electron development
- ~500MB free disk space for node_modules

**Production (Electron Packaged App):**
- Windows 10+ (x64) - NSIS installer, portable .exe, or ZIP
- macOS 10.15+ (x64, arm64) - DMG + ZIP bundles
- Linux (x64) - AppImage, deb, tar.gz
- ~443MB unpacked app size (~153MB installer)
- SQLite database at `%APPDATA%/the-black-grimoire/data/mtg-deck-builder.db` (Windows)

**Web Deployment (Overwolf):**
- Overwolf 0.200+ (for ow-electron runtime)
- MTGA running on Windows 10+ (required by Overwolf game events API)

## Database

**Engine:**
- SQLite (embedded in Electron via better-sqlite3)
- WAL mode enabled (pragma journal_mode = WAL)
- Foreign keys enabled (pragma foreign_keys = ON)
- 5-second busy timeout (pragma busy_timeout = 5000)
- 34+ migrations auto-applied on startup (defined in `src/db/schema.ts`)
- FTS5 full-text search index on cards table (name, oracle_text, type_line)

**Data Directory:**
- Production: `%APPDATA%\The Black Grimoire\data\` (Windows) / `~/Library/Application Support/The Black Grimoire/data/` (macOS)
- Development: `./data/` (project root, via resolveDbDir() in `src/lib/db.ts`)

## Key Build Outputs

**Next.js Standalone:**
- Location: `.next/standalone/` (produced by `npm run build`)
- Size: ~55MB (traced dependencies only)
- Bundled into electron-builder via `extraResources` (bypasses node_modules filtering)
- Entry point: `server.js` (launched by Electron main process via `ELECTRON_RUN_AS_NODE`)

**Electron Packaged:**
- `dist-electron/` - Compiled TypeScript (main.ts, preload.ts, ipc-handlers.ts)
- `dist-electron/electron/main.js` - Main process entry point (specified in package.json `main` field)
- Packaged as NSIS installer (~153MB), portable .exe, or ZIP (Windows)

**Overwolf Packaged:**
- `dist-overwolf/` - ow-electron packaged addon
- Runs in Overwolf runtime with game event integrations

---

*Stack analysis: 2025-04-12*
