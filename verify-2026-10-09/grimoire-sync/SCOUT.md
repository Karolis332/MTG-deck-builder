# Scout — desktop ↔ web identity and sync (2026-10-09, haiku scout, read-only)

Operator request (parked for Plan Mode): integrate the vaporwave deck-check view into the Black Grimoire desktop app (tabs, deck cards) and give the desktop the same login as theblackgrimoire.com (Clerk), so decks sync. Symptom reported: the web password does not work on the local Grimoire — expected today, the two account systems are separate and only the sync token links them.

## Desktop (MTG-deck-builder)
- `src/lib/auth.ts:11` — local JWT (HS256, 7 days, issuer "mtg-deck-builder"), cookie `auth-token` read in `src/lib/auth-middleware.ts:12`.
- `src/lib/password.ts` — scrypt hashing; `electron/setup-handlers.ts:70–80` `setup:create-account` hashes before persisting; `src/lib/first-boot.ts:14–26` creates the account from `pendingAccount` in app-config.json.
- `src/lib/web-sync.ts:14,53–57` — default web URL `https://theblackgrimoire.com`; `web_sync_url` / `web_sync_token` live in `app_state`.
- `src/app/api/web-sync/route.ts:22–72` — POST actions `sync` (unauthenticated, app start), `test` / `save` (auth-gated); CSRF = Content-Type + origin check.
- `src/db/schema.ts:112` app_state; `:1146–1148` seeds `cf_api_url` / `cf_api_key`.

## Web (black-grimoire-web)
- `package.json:15` — `@clerk/nextjs ^7.0.12` is the only auth dependency; DEPLOY.md §24–28: accounts on since 2026-09-07, Clerk production instance `ins_3Iy0VNaH2tD1TQc0jswttCXQh7M`, email + password + code.
- `src/db/schema.ts:5–17` — `users` (clerkId unique, email, username, avatarUrl, plan, Stripe ids). Drizzle + Neon (`src/lib/db.ts:3`).
- `src/app/api/sync-token/route.ts:1–27` — POST creates a sync token (Clerk-gated), DELETE revokes.
- `src/app/api/matches/route.ts:28–50` — POST accepts Arena matches with a Bearer sync token (`@/lib/sync-tokens.verifyToken`), 60/h per token.
- Env names seen: `NEXT_PUBLIC_ACCOUNTS_ENABLED`, `DATABASE_URL`, `STRIPE_*`, `CF_API_URL`, `ANTHROPIC_API_KEY` (Clerk env names not checked).

## black-grimoire-web-desktop-link
- create-next-app boilerplate named `black-grimoire-web` 0.1.0 — looks like a duplicate/branch of the web app, not checked further.

## Gaps for a Clerk shared login (to grill before building)
1. Desktop accounts: replace the scrypt/local JWT account with a Clerk session (sign-in in Electron: hosted sign-in page or custom flow with the Clerk backend SDK; the desktop still needs an offline mode).
2. Desktop JWT: either mint the local `auth-token` after a verified Clerk session (keeps all `auth-middleware` routes untouched) or validate Clerk tokens in `auth-middleware.ts`.
3. Sync token: today a per-device bearer token minted on the web; with Clerk the desktop can call `/api/sync-token` itself after sign-in (no manual paste).
4. User record: desktop `users` table needs `clerk_id` (new migration) and a first-login link of the existing local user to the Clerk user (data stays local, user_id scoping unchanged).
5. Sync scope: today matches only (desktop → web). Decks / collection / deck-check views would need a contract (direction, conflict rule, which side is golden) before any code.

Open design questions for the operator: offline-first or Clerk-required; which data syncs (matches only, decks, collection, check-page views); whether the deck-check page becomes a desktop route (`src/app/deck-check/page.tsx` reading DB decks) or a web page fed by sync.
