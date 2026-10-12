---
inclusion: always
---

# Structure — The Black Grimoire (MTG Deck Builder)

## Top-level layout
```
src/                  # Next.js app + shared TS business logic
  app/                # App Router pages + API routes
  components/         # React client components ('use client')
  db/                 # schema.ts — all SQLite migrations
  hooks/              # shared React hooks
  lib/                # business logic, API clients, auth, DB access
electron/              # Electron main/preload/IPC (desktop shell)
scripts/               # Python ML pipeline + scrapers + Node/PS1 utility scripts
build/                 # app icons (source + generated variants)
data/                  # local SQLite DB file (dev; gitignored)
tests/                 # cross-cutting Vitest specs (see tech.md)
.kiro/steering/         # this steering set
```

## `src/app/` — route structure (App Router)
Page routes (each a directory containing `page.tsx`, typically client components):
`analytics/`, `collection/`, `deck/[id]/` (deck editor, dynamic), `deck-builder/`
(deck list/management), `draft/`, `duel/`, `game/`, `landing/`, `login/`, `register/`,
`overlay-game/` (renders inside the live Arena overlay window). Root `page.tsx` +
`layout.tsx` + `globals.css` at `src/app/`.

`src/app/api/` — Route Handlers, one directory per resource, each with `route.ts`:
`ai-suggest/`, `analytics/`, `arena-collection/`, `arena-matches/`, `arena-telemetry/`,
`auth/`, `billing/`, `card-ratings/`, `cards/`, `cf-events/`, `cf-optimize/`, `cf-player/`,
`collection/`, `data-export/`, `deck-analysis/`, `deck-combos/`, `deck-versions/`,
`decks/`, `edhrec-consensus/`, `favourites/`, `game-deck-preference/`, `live-session/`,
`match-logs/`, `meta/`, `ml-pipeline/`, `mtgjson-enrich/`, `settings/`, `sideboard-guide/`,
`similar-decks/`. Naming: resource-per-directory, `route.ts` file, kebab-case directory
names (multi-word resources use hyphens, e.g. `arena-collection`, `sideboard-guide`).

## `src/lib/` — business logic (flat, one file per concern)
Notable files beyond auth/db/types/constants/utils (already load-bearing, keep flat):
`scryfall.ts` (card API client), `edhrec.ts` (EDHREC data + caching), `cf-api-client.ts`
(Black Grimoire CF API client), `claude-suggest.ts` / `openai-suggest.ts` (AI providers),
`ai-deck-builder.ts` / `deck-builder-ai.ts` (deck construction), `deck-builder-constraints.ts`,
`commander-synergy.ts` / `commander-analysis.ts`, `deck-templates.ts` (11 archetypes),
`land-intelligence.ts`, `mana-sources.ts`, `craft-suggestions.ts` / `craft-path-panel`
(companion component), `deck-validation.ts`, `deck-export.ts`, `deck-versioning.ts`,
`deck-fingerprint.ts`, `deck-auditor.ts`, `arena-parser.ts` / `arena-log-reader.ts` /
`arena-game-events.ts` (Arena log/event parsing), `grp-id-resolver.ts` (Arena grpId → card
resolution), `game-state-engine.ts` (live match state + draw probabilities),
`mulligan-advisor.ts`, `sideboard-guide.ts`, `match-analyzer.ts` / `match-log-parser.ts` /
`match-ml-features.ts` / `match-telemetry.ts` / `post-match-stats.ts`,
`global-learner.ts` / `highlight-detector.ts` / `knowledge-retrieval.ts` /
`pilot-guide.ts` (AI chat support), `card-classifier.ts` / `card-claim-validator.ts`,
`mtgjson-enrich.ts`, `sync-commander-stats.ts`, `stripe.ts`, `subscription.ts`,
`electron-bridge.ts` (IPC bridge, incl. overlay events), `first-boot.ts` (first-launch
account + card seeding), `auth-middleware.ts` (API route auth guard). Tests colocated in
`src/lib/__tests__/`.

## `electron/` — desktop shell
`main.ts` (main process: splash screen, spawns Next.js standalone as child process),
`next-server.ts` (standalone server launcher), `preload.ts` / `setup-preload.ts` (context
isolation bridges), `ipc-handlers.ts` / `setup-handlers.ts` (IPC message handlers),
`arena-log-watcher.ts` (live Player.log monitoring), `match-recorder.ts`,
`screen-recorder.ts`, `overwolf-gep.ts` / `overwolf-overlay.ts` (Overwolf variant),
`platform-detect.ts`, `register-aliases.ts`, `resources/setup.html` (first-run wizard UI).

## `scripts/` — Python ML pipeline + operational scripts
Core pipeline: `pipeline.py` (10-step orchestrator), `pipeline_state.py`,
`pipeline_telegram_bot.py`, `train_model.py`, `predict_suggestions.py`,
`aggregate_community_meta.py` / `aggregate_commander_stats.py` / `aggregate_matches.py`.
Scrapers: `scrape_mtggoldfish*.py`, `scrape_mtgtop8.py`, `scrape_edhrec_*.py`,
`scrape_commander_spellbook.py`, `scrape_topdeck.py`, `edhrec_scraper_vps.py`.
Node/TS utility scripts (run via `tsx`/`node`, not part of the npm-scripted pipeline):
`compare-edhrec.ts`, `enrich-commander-synergies.ts`, `generate-training-data.ts`,
`golbez_rebuild.ts`, `test-deck-builds.ts`, `update-card-data.ts`, `upload-highlights.ts`.
Build hooks: `afterPack.js` (rebuilds `better-sqlite3` for Electron's Node ABI),
`postbuild-standalone.js` (copies static assets + native modules into `.next/standalone`).
`scripts/vps/` — health-check/monitoring scripts that run on the CF API's VPS host (not
part of this app's runtime). `scripts/tests/` — pytest suite for the pipeline.
Ad-hoc diagnostic scripts prefixed `diag-*`, `check-*`, `scan-*` are one-off debugging aids,
not part of the maintained pipeline — do not wire new features to them without review.

## Database
SQLite file at `data/mtg-deck-builder.db` (or `MTG_DB_DIR`). Single schema file
`src/db/schema.ts` holds the ordered `MIGRATIONS` array — migrations run automatically on
startup, never hand-edit the DB file directly. Key tables: `cards` (35K+, FTS5), `users`,
`decks` / `deck_cards`, `deck_versions`, `collection`, `match_logs`, `card_performance`,
`community_decks` / `community_deck_cards`, `meta_card_stats`, `archetype_win_stats`,
`edhrec_knowledge` / `edhrec_avg_decks` (FTS5), `app_state` (settings + API keys/URLs —
see tech.md), `arena_parsed_matches`, `grp_id_cache`, `sideboard_guides`,
`live_game_sessions`.

## Naming conventions
- Files: `kebab-case.ts` / `.tsx` (components too, e.g. `card-detail-modal.tsx`)
- Functions/variables: `camelCase` | Constants: `UPPER_SNAKE_CASE` | Types/interfaces: `PascalCase`
- DB columns: `snake_case`, all user-scoped tables filtered by `WHERE user_id = ?`
- API routes: directory-per-resource + `route.ts`, kebab-case directory names
- Components: `'use client'` directive at top for anything interactive (this codebase is
  client-component-heavy — most of `src/components/` and `src/app/*/page.tsx` are client)
- DB queries: always parameterized prepared statements via `better-sqlite3`

## Key architectural decisions
- **Electron wraps a standalone Next.js server**, not a raw SPA: `electron/main.ts` spawns
  `.next/standalone/server.js` as a child process (`ELECTRON_RUN_AS_NODE`) and loads
  `http://localhost:{port}` in the `BrowserWindow`. Same app also ships an Overwolf variant
  (`ow-electron`) sharing the same Next.js server.
- **Standalone output mode** (`output: 'standalone'`) traces only used dependencies
  (~55MB vs 190MB full `node_modules`); `postbuild-standalone.js` copies `.next/static`,
  `public/`, and native modules in; packaged in `electron-builder.yml` via `extraResources`
  to bypass default `node_modules` glob filtering.
- **`better-sqlite3` is native** — `afterPack.js` rebuilds it for Electron's bundled Node
  ABI at package time; a global singleton (`globalThis`) in `src/lib/db.ts` keeps one
  connection alive across Next.js HMR reloads in dev.
- **Local-first, cloud-optional**: every AI/CF feature degrades gracefully — Quick Build,
  EDHREC data, and rule-based suggestions all work with zero network calls; the CF API and
  Claude/OpenAI are optional enhancements gated by user-supplied keys in `app_state`.
- **Arena data flows one way**: the app never writes to Arena, only reads `Player.log`
  (one-shot parse + optional live watcher) — all writes stay inside this app's own SQLite DB.
- **CF API and this repo are deployed independently** — do not assume shared TypeScript
  types or a monorepo; the contract is the HTTP API documented in `tech.md`.
