---
inclusion: always
---

# Product — The Black Grimoire (MTG Deck Builder)

## What it is
A dark-themed desktop application ("The Black Grimoire") for building, analyzing, and
mastering Magic: The Gathering decks. Hybrid Electron + Next.js app with local SQLite
storage — not a hosted web app. Distributed as Windows/macOS/Linux installers via GitHub
Releases. Package name: `the-black-grimoire`, currently `1.0.0-alpha.5`.

## Target users
Magic: The Gathering players — primarily MTG Arena players who want AI-assisted deck
building plus match tracking. Secondary: Commander/EDH players wanting synergy-aware deck
construction from a single commander. Multi-user: separate local accounts (username +
scrypt-hashed password) share one installed app, each with isolated decks/collection/match
history.

## Core value proposition
1. **AI deck construction** — pick a commander/format + strategy, Claude (or GPT-4o/Ollama)
   builds a complete deck with per-card reasoning and role tags (Ramp, Draw, Removal,
   Synergy, etc.), or "Quick Build" does it for free via EDHREC + templates + synergy
   scoring (no API key required).
2. **Arena integration** — parses `Player.log` to import collection, match history, and
   deck submissions; a live overlay tracks the current match (draw probabilities, mulligan
   advisor, sideboard guide) via a floating always-on-top window (Alt+O toggle, Alt+L
   click-through).
3. **Personalized ML suggestions** — after 20+ logged games, a Python pipeline trains a
   Gradient Boosting model (personal/community/blended) on the user's own win-rate data to
   suggest card swaps.
4. **Collaborative-filtering recommendations** — the app is a *client* of a separate cloud
   service (see below), not a source of recommendations itself.

## Key features
- Claude-powered AI Deck Builder + conversational AI Chat (context-aware of deck/collection/format rules)
- Quick Build (EDHREC + 11 archetype templates + commander synergy scoring, free/offline-capable)
- Meta-aware suggestions for Standard/Modern/Pioneer (tournament inclusion/placement data, not EDHREC rank)
- Commander Synergy Engine (12 oracle-text trigger categories)
- Land Intelligence (tier + color-demand + fetch-aware mana base selection)
- Arena log parsing, live overlay, mulligan advisor, sideboard guide generator
- Analytics dashboard (win rates, card performance, mana curve)
- Deck versioning (automatic snapshots), export to Arena/MTGO/text, full data export/import
- Collection-aware suggestions (server-enforced: only cards the user owns)

## Relationship to the Black Grimoire CF API
This repo is the **desktop client only**. Collaborative-filtering recommendations (SVD +
Vowpal Wabbit contextual bandit, trained on 1.2M+ scraped decks from Moxfield/Archidekt/
EDHREC/MTGGoldfish/MTGTop8) are served by a **separate FastAPI project**
(`grimoire-cf-api`), deployed primarily on a VPS (with a Railway deployment as
disaster-recovery standby). This app calls it over HTTP:
- Endpoint + API key are **not env vars** — they are stored per-user in the local SQLite
  `app_state` table (`cf_api_url`, `cf_api_key`, `cf_enabled`), set during the setup
  wizard's "Connect to Recommendation Engine" step or the Settings dialog.
- Default URL constant: `CF_API_DEFAULT_URL` in `src/lib/constants.ts`.
- Client wrapper: `src/lib/cf-api-client.ts` (5s timeout, local SQLite caching for offline
  use, falls back gracefully if the CF API is unreachable or disabled).
- The app remains fully usable offline/without the CF API — Quick Build, synergy scoring,
  and EDHREC data are all local/bundled fallbacks.

## Non-goals / constraints
- Not a web SaaS — no hosted multi-tenant backend; each install is its own SQLite database.
- Not a rules engine / game simulator — it tracks decks and matches, it does not play Magic.
- AI API keys (Anthropic/OpenAI) are user-supplied and stored locally, never sent to third
  parties beyond the provider itself.
