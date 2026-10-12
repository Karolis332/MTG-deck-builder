# Plan (for approval, nothing built) — Clerk shared login, desktop ↔ web deck sync, vaporwave deck view in the desktop app

Operator asks (2026-10-09): "integrate the vaporwave display into the Black Grimoire", "sync the desktop Grimoire with the online one via Clerk", "my password doesn't work on the local Grimoire". Facts from `SCOUT.md`: the desktop keeps its own scrypt accounts and a local HS256 JWT; the web app is Clerk-only (`@clerk/nextjs 7`, `users.clerkId`), and the only link today is a per-device sync token that carries Arena matches desktop → web. So the web password is not supposed to work locally yet; this plan makes one login serve both.

## Phase A — one login (fixes the password symptom)
1. Desktop sign-in through Clerk: the setup wizard and the login page open Clerk's hosted sign-in (email + password + code, the same instance `ins_3Iy0VNaH2tD1TQc0jswttCXQh7M`) in the Electron window; on success the renderer holds a Clerk session token.
2. New local route `POST /api/auth/clerk-exchange`: verifies the Clerk session token with the Clerk backend SDK (publishable + secret key from the setup wizard / env, never committed), finds or creates the local user by a new `users.clerk_id` column (migration 39), and mints the existing local `auth-token` cookie. Every other API route stays untouched (`auth-middleware.ts` unchanged).
3. The desktop then calls the web `POST /api/sync-token` with the Clerk session and stores the result in `app_state.web_sync_token` itself — no more manual token paste.
4. Offline rule: the local JWT keeps working for 7 days without the network; sign-in needs the network once. The old local password path stays available behind a "local account" link for the single-user offline case (operator's call — see question 1).
Files: `src/lib/auth.ts`, new `src/app/api/auth/clerk-exchange/route.ts`, `src/db/schema.ts` (+1 migration), `electron/setup-handlers.ts`, `electron/resources/setup.html`, login page component, `src/lib/web-sync.ts`. Web: no change if the Clerk session token is accepted by `/api/sync-token` as today.

## Phase B — deck sync (contract first)
1. Contract file (like the match-sync one): entities `decks`, `deck_cards`, `deck_versions`; direction both ways; identity = `(clerk_id, deck.uuid)`; conflict rule = last-writer-wins on `updated_at`, the loser saved as a `deck_versions` snapshot on both sides.
2. Web: new tables `decks`, `deck_cards` keyed by `users.id`, routes `GET/PUT /api/sync/decks` under the existing Bearer sync token (rate limit as matches).
3. Desktop: `web-sync.ts` gains a deck pass (push dirty decks, pull newer ones) on app start and after each save; a sync status chip in the deck list.
Files: web `src/db/schema.ts` + migration, `src/app/api/sync/decks/route.ts`; desktop `src/lib/web-sync.ts`, `src/lib/db.ts` (dirty flags), `src/app/api/web-sync/route.ts`.

## Phase C — the vaporwave deck view inside the desktop app
1. Port `verify-2026-10-02/tam-precons/check-page.ts` (renderer) to a React route `src/app/deck-check/page.tsx` with the same CSS: tabs = the user's decks (from `/api/decks`), tiles by type with images from the local cards table, NEW / OUT rows against a chosen baseline version (from `deck_versions`), tap-to-tick persisted per deck, text filter, copy block, guide panel from a `primer` JSON stored per deck (new column `decks.primer_json` or table `deck_primers`).
2. The generator scripts keep working for the file-based paper workflow; the app view reads the DB only. One shared module for the tile/diff logic so the two never drift (`src/lib/deck-check-view.ts`).
3. Playwright E2E check of the page before shipping (rule 2 of the agent discipline).
Files: new page + component, `src/db/schema.ts` (+1 migration), `src/app/api/decks/[id]/primer/route.ts`.

## Order and size
A (≈ 1 day), then C (≈ 1–2 days, independent of B), then B (≈ 2 days, needs the contract approved). Each phase ships behind its own commit set with tests (auth exchange unit tests, sync contract tests, page E2E).

## Questions that change the build (answer before Phase A)
1. Offline-first: keep the local password account as a fallback, or Clerk only (no login without the network)?
2. What syncs in Phase B: decks only, or also collection and match history both ways?
3. Which side is golden when both edited the same deck offline: last writer wins (proposed) or web always wins?
4. Should the deck-check view in the app also show the generated proposals (the `verify-*` drafts), or only the user's own decks and their versions?
