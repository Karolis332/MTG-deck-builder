---
name: Deck Picker Overlay Feature
description: Match-start deck selection overlay for automatic match-to-deck association
type: project
---

Deck picker overlay added (2026-03-21) to eliminate manual ArenaTutor uploads.

**How it works:**
- On `match-started` event, a modal overlay appears on `game/page.tsx`
- User selects which deck they're playing from their saved decks
- Selection writes to `live_game_sessions.deck_id` AND `arena_parsed_matches.deck_id` (confidence 1.0)
- Last-used deck saved to `app_state` key `game_deck_preference` for pre-selection
- 30-second auto-dismiss countdown
- Format-aware: filters/sorts decks based on detected Arena format
- Match-end result persisted to `live_game_sessions` via `/api/live-session/result`

**Files created:**
- `src/components/deck-picker-overlay.tsx` — Modal UI component
- `src/app/api/live-session/route.ts` — GET/POST for deck-match linking
- `src/app/api/live-session/result/route.ts` — POST for match-end result persistence
- `src/app/api/game-deck-preference/route.ts` — GET/POST for last-used deck preference

**Files modified:**
- `src/db/schema.ts` — Migration v29: `result` and `opponent_name` columns on `live_game_sessions`
- `src/lib/db.ts` — Added `updateLiveSessionDeck()` and `updateLiveSessionResult()`
- `src/app/game/page.tsx` — Integrated deck picker, match-end result persistence

**Why:** User was manually uploading match data from ArenaTutor. With the watcher already detecting matches, adding deck selection at match start closes the loop for automatic per-deck stat tracking.
