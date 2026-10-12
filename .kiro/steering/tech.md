---
inclusion: always
---

# Tech — The Black Grimoire (MTG Deck Builder)

## Stack
- **Frontend/server:** Next.js 14 (App Router, `output: 'standalone'`) + React 18
- **Desktop shell:** Electron 33 (also ships an Overwolf variant via `@overwolf/ow-electron`)
- **Language:** TypeScript strict mode (`src/`, `electron/`) + Python 3.13 (ML pipeline, `scripts/`)
- **Database:** SQLite via `better-sqlite3` (WAL mode, FTS5 full-text search), 31+ migrations
  in `src/db/schema.ts`, run automatically on startup
- **Auth:** JWT (`jose`) + `scrypt` password hashing, httpOnly cookies
- **Styling:** Tailwind CSS 3 + Lucide icons + Recharts, custom "grimoire" dark theme
  (Cinzel headings, Crimson Text body, gold accents)
- **Validation:** Zod
- **Payments:** Stripe (`stripe` npm package) — subscription/billing routes
- **Drag & drop:** `@dnd-kit/*`
- **Testing:** Vitest (unit/integration, TS) + pytest (Python pipeline)
- **ML:** scikit-learn Gradient Boosting, 25-26 features, personal/community/blended
  training modes

## Dev tools / build chain
- `tsx` — run TypeScript scripts directly (e.g. DB seed)
- `concurrently` + `wait-on` — orchestrate Next.js dev server + Electron/Overwolf launch
- `electron-builder` — packaging (NSIS/portable/zip for Windows, DMG/zip for macOS,
  AppImage/deb/tar.gz for Linux); config in `electron-builder.yml`
- `sharp` — icon/image generation at build time
- ESLint (`eslint-config-next`) via `next lint`

## Exact commands
```bash
npm install                      # install deps
npm run dev                      # Next.js dev server, http://localhost:3000
npm run dev:electron             # Next.js + Electron together (dev mode)
npm run start:ow                 # Next.js + Overwolf electron together (dev mode)
npm run build                    # next build + scripts/postbuild-standalone.js
npm run build:electron           # tsc -p tsconfig.electron.json (compile Electron main/preload)
npm run start                    # next start (prod, non-Electron)
npm run lint                     # next lint
npm test                         # vitest run (single pass)
npm run test:watch               # vitest (watch mode)
npm run test:python              # py -m pytest scripts/tests/ -v
npm run test:all                 # vitest run && pytest
npm run db:seed                  # tsx src/db/seed.ts — seed ~35K cards from Scryfall
npm run dist:win                 # build + build:electron + electron-builder --win
npm run dist:mac                 # ...--mac
npm run dist:linux               # ...--linux
npm run dist:all                 # ...--win --mac --linux
npm run dist:portable            # Windows portable only
npm run dist:zip                 # zip archives, all platforms
npm run update:arena-cards       # node scripts/download_arena_card_db.js
npm run dist:overwolf            # Overwolf-specific packaging

# Python ML pipeline (from repo root, Python 3.13+)
pip install -r scripts/requirements.txt
py scripts/pipeline.py                       # full 10-step pipeline
py scripts/pipeline.py --skip-scrape         # retrain only, cached data
py scripts/pipeline.py --reset-step <STEP>   # clear a degraded/stuck pipeline step
py scripts/train_model.py --target community # or --target blended
py scripts/predict_suggestions.py
py scripts/setup_scheduled_task.py           # Windows Task Scheduler daily run
```

## Path alias
`@/*` → `./src/*` (set in `tsconfig.json`).

## Environment variables (NAMES ONLY — never values)
Runtime (Next.js/Electron app):
| Variable | Purpose |
|---|---|
| `MTG_DB_DIR` | Custom SQLite database directory (default `data/`; in packaged Electron: `%APPDATA%/The Black Grimoire/data/`) |
| `JWT_SECRET` | JWT signing secret (has an insecure dev default — must be overridden for any real deployment) |
| `NODE_ENV` | `development` \| `production` |
| `PORT` | Server port (default 3000; app auto-finds a free port in range 3000-3009) |
| `APPDATA` | Windows user data root (read, not app-defined) — used to resolve default DB/log paths |
| `HOME` / `USERPROFILE` | Cross-platform home dir fallback (first-boot path resolution) |
| `ELECTRON_USER_DATA` | Electron-provided user data path override |
| `APP_DIR` / `STANDALONE_DIR` / `HOSTNAME` | Set by `electron/main.ts` when spawning the standalone Next.js server as a child process |

Local automation only (`.env.hermes` — gitignored, unrelated to the shipped app):
`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `DB_HOST_DIR`, `REPO_SLUG`, `IMPROVE_BRANCH`,
`BASE_BRANCH`, `ROUNDS_PER_BATCH`, `DB_REFRESH` — used by a Docker-based auto-improve bot,
not by the app itself.

**Not env vars:** Anthropic/OpenAI API keys, Stripe keys, and the CF API URL/key are all
**user-supplied at runtime and stored in the local SQLite `app_state` table**, entered via
the Settings dialog or first-run setup wizard — never read from `process.env`.

## API integration points
- **Scryfall API** — card data source (`src/lib/scryfall.ts`), rate-limited ~100ms between
  requests; local FTS5 search is tried first, Scryfall is the fallback/seed source.
- **EDHREC** — commander synergy/average-decklist data (`src/lib/edhrec.ts`), cached locally.
- **MTGGoldfish / MTGTop8** — tournament and competitive meta data (scraped by Python
  scripts, feeds `meta_card_stats` / `archetype_win_stats`).
- **Black Grimoire CF API** (separate FastAPI service — see `product.md`) —
  `src/lib/cf-api-client.ts`. Endpoints consumed: `POST /recommend`, `POST /optimize`,
  `POST /events`, `GET /commander_stats`, `GET /health`. Auth via `x-api-key` header, key
  read from `app_state.cf_api_key`. Default URL constant `CF_API_DEFAULT_URL` in
  `src/lib/constants.ts` (`http://187.77.110.100/cf-api`); Railway DR fallback documented in
  the top-level `CLAUDE.md` under "Cloud Topology".
- **Claude / OpenAI / Ollama** — AI deck building and chat (`src/lib/claude-suggest.ts`,
  `src/lib/openai-suggest.ts`); tries Claude → Ollama (local) → OpenAI → rule-based
  fallback, per the README troubleshooting section.
- **Stripe** — subscription billing (`src/lib/stripe.ts`, `src/app/api/billing/*`).
- **MTG Arena** — not an API; parses the local `Player.log` file
  (`src/lib/arena-log-reader.ts`, `electron/arena-log-watcher.ts`) and Arena's JSON game
  event stream (`src/lib/arena-game-events.ts`).

## Testing
- Vitest specs live in `src/lib/__tests__/` and `tests/` (~340+ tests across 18 files) —
  run via `npm test` / `npm run test:watch`.
- Python tests in `scripts/tests/` — run via `npm run test:python`.
- `npm run test:all` runs both suites; this is the gate to check before packaging a release.
