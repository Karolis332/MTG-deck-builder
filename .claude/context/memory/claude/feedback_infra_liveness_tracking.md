---
name: Track infra liveness across sessions
description: User expects me to actively monitor cloud infra dormancy and surface it before it rots. Don't let trial accounts silently expire and lose data.
type: feedback
originSessionId: b1adb513-96b4-491a-a685-834c91d4d2bd
---
User expects me to **proactively flag dormant cloud infrastructure** at session start, not wait until they hit a broken pipeline 2 months later.

**Why:** On 2026-05-04, Railway garbage-collected the `grimoire-cf-api` Postgres volume because the trial expired Feb 26 and the project sat untouched for ~2 months. Lost ~500K scraped community decks. User's words: "you were supposed to keep this on track." Recoverable (pipeline rebuilds via re-scrape) but a real failure of session continuity.

**How to apply:**
- At session start in projects with cloud dependencies (Railway, Vercel, Neon, Supabase, VPS), spot-check `.env` mtime vs current date. If `.env` is >30 days old AND project is paid/trial cloud infra, ping connectivity early in the session and warn user.
- When user upgrades/configures a paid plan, *immediately* offer to set up: (a) a backup cron, (b) a low-credit / dead-service alert in their Telegram bot, (c) a recurring liveness check.
- Don't assume past Claude sessions did this — assume nothing is set up unless verified.
- Specific to this project: VPS Telegram bot at 187.77.110.100 (PM2 service `telegram-bot`) is the right place to wire periodic Railway+Neon+Supabase liveness pings.
