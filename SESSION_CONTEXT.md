# MTG Deck Builder - Session Context

> Auto-generated context file for continuity between coding sessions.
> Last updated: 2026-02-03

## Project Overview

Next.js 14 + TypeScript + SQLite (better-sqlite3) MTG deck builder with multi-user accounts. REST API routes, Tailwind CSS, Scryfall card database integration, JWT auth.

## Tech Stack

- **Framework**: Next.js 14.2.21, React 18.3.1, TypeScript 5.7.3
- **Database**: SQLite via better-sqlite3 (WAL mode, stored at `data/mtg-deck-builder.db`)
- **Auth**: JWT via `jose` (HS256), password hashing via Node crypto scrypt, httpOnly cookies
- **Testing**: Vitest 4.x (95 tests across 5 files)
- **Styling**: Tailwind CSS 3.4.17, custom dark theme, shadcn-style components
- **Validation**: Zod 3.24.1
- **Charts**: Recharts 2.15.0
- **Icons**: Lucide React + inline SVGs in navbar
- **External APIs**: Scryfall (cards), EDHRec (commander recommendations), optional Ollama (AI suggestions)

## Directory Structure

```
src/
├── app/
│   ├── page.tsx                    # Home/dashboard
│   ├── layout.tsx                  # Root layout (AuthProvider > ThemeProvider)
│   ├── globals.css
│   ├── login/page.tsx              # Login form
│   ├── register/page.tsx           # Registration form
│   ├── deck-builder/page.tsx       # Deck list management
│   ├── deck/[id]/page.tsx          # Deck editor
│   ├── collection/page.tsx         # Collection browser
│   └── api/
│       ├── auth/
│       │   ├── register/route.ts   # POST - create account (Zod validated)
│       │   ├── login/route.ts      # POST - authenticate
│       │   ├── logout/route.ts     # POST - clear cookie
│       │   └── me/route.ts         # GET - current user from JWT
│       ├── decks/route.ts          # GET (list), POST (create) - auth required
│       ├── decks/[id]/route.ts     # GET, PUT, DELETE, PATCH - auth + ownership
│       ├── cards/search/route.ts   # Full-text search (public)
│       ├── cards/autocomplete/route.ts  # (public)
│       ├── cards/seed/route.ts     # Download Scryfall bulk data (public)
│       ├── collection/route.ts     # GET (list + stats) - auth required
│       ├── collection/import/route.ts # POST (Arena format) - auth required
│       └── ai-suggest/route.ts     # Card suggestions (public)
├── components/
│   ├── auth-provider.tsx           # AuthContext: user, login, register, logout
│   ├── navbar.tsx                  # Sticky nav with auth state (Sign In/Out)
│   ├── theme-provider.tsx          # Dark/light context
│   ├── card-detail-modal.tsx, card-grid.tsx, card-image.tsx
│   ├── deck-list.tsx, deck-stats.tsx, deck-validation.tsx
│   ├── collection-filters.tsx
│   ├── export-dialog.tsx, import-dialog.tsx
│   ├── mana-cost.tsx, mana-curve.tsx
│   ├── playtest-modal.tsx, search-bar.tsx
├── db/
│   └── schema.ts                   # Migration v1 (tables) + v2 (users + user_id)
└── lib/
    ├── auth.ts                     # hashPassword, verifyPassword, createToken, verifyToken
    ├── auth-middleware.ts           # getAuthUser(request), unauthorizedResponse()
    ├── db.ts                       # SQLite singleton + all query functions (user-scoped)
    ├── types.ts                    # DbCard, Deck, DeckCardEntry, ArenaImportLine, etc.
    ├── constants.ts                # FORMATS, MANA_COLORS, DEFAULT_DECK_SIZE, etc.
    ├── utils.ts                    # cn(), formatNumber(), slugify(), debounce(), groupBy()
    ├── deck-validation.ts          # validateDeck()
    ├── deck-export.ts              # exportToArena(), exportToText(), exportToMtgo()
    ├── arena-parser.ts             # parseArenaExport(), formatArenaExport()
    ├── scryfall.ts                 # Rate-limited Scryfall API client
    ├── edhrec.ts                   # EDHRec recommendations with cache
    ├── ai-suggest.ts               # Rule-based + Ollama suggestions
    └── __tests__/                  # 95 Vitest unit tests
        ├── utils.test.ts           # 21 tests
        ├── arena-parser.test.ts    # 19 tests
        ├── deck-export.test.ts     # 15 tests
        ├── deck-validation.test.ts # 29 tests
        └── constants.test.ts       # 11 tests
```

## Database Schema

### Migration v1 (initial_schema)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `cards` | id (TEXT PK), name, mana_cost, cmc, type_line, legalities, ... | ~100MB from Scryfall |
| `cards_fts` | FTS5 on name, oracle_text, type_line | Triggers auto-sync |
| `collection` | card_id (FK), quantity, foil, user_id | UNIQUE(card_id, foil) |
| `decks` | name, format, description, user_id | Timestamps |
| `deck_cards` | deck_id (FK CASCADE), card_id (FK), quantity, board | UNIQUE(deck_id, card_id, board) |
| `meta_cache` | key (PK), data, fetched_at, ttl_hours | For EDHRec cache |
| `app_state` | key (PK), value | Generic KV store |

### Migration v2 (add_users_and_ownership)
| Table | Columns | Notes |
|-------|---------|-------|
| `users` | id (autoincrement), username (UNIQUE), email (UNIQUE), password_hash, created_at | |
| `decks` | + user_id (FK nullable) | Existing rows have NULL user_id |
| `collection` | + user_id (FK nullable) | Existing rows have NULL user_id |

## Auth System

- **Password hashing**: Node crypto `scryptSync` with random 16-byte salt, stored as `salt:hash`
- **JWT**: jose library, HS256, 7-day expiry, `auth-token` httpOnly cookie
- **Secret**: `JWT_SECRET` env var (falls back to dev default)
- **Middleware**: `getAuthUser(request)` extracts user from cookie in API routes
- **Data scoping**: All deck/collection queries accept optional `userId` parameter
- **Card routes stay public**: cards/search, cards/autocomplete, cards/seed, ai-suggest

## Setup Scripts

| Script | Platform | Usage |
|--------|----------|-------|
| `setup.js` | All (primary) | `node setup.js [--dev\|--build\|--prod\|--seed\|--test]` |
| `setup.sh` | Unix/macOS | `./setup.sh [--dev\|--build\|--prod\|--seed\|--test]` |
| `setup.bat` | Windows | `setup.bat [--dev\|--build\|--prod\|--seed\|--test]` |

## Key Patterns & Conventions

- All page components are `'use client'` with useState/useEffect
- API routes use `NextRequest`/`NextResponse`, try-catch error handling
- Database queries in `src/lib/db.ts` using prepared statements
- Context providers: AuthProvider (outermost) > ThemeProvider
- Path alias: `@/` -> `./src/` (tsconfig.json + vitest.config.ts)
- Styling: Tailwind utility classes, `cn()` helper for conditional classes
- Test runner: `npm test` (vitest run), `npm run test:watch` (vitest)

## Known Gaps / Future Work

- `db:seed` script references nonexistent `src/db/seed.ts` (seeding happens via API instead)
- No email verification on registration
- No password reset flow
- Pre-existing data (before auth) has `user_id = NULL` and won't appear for any user
- No rate limiting on auth endpoints
