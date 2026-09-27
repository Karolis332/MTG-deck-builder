---
name: project-match-sync-desktop-web
description: "Match sync desktop → theblackgrimoire.com shipped 2026-09-19 — contract file, token model, live probe on the VPS, web port 3100, CSRF guard on the local /api/web-sync route"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0c6f5709-7ab2-42f9-8d4a-0eba683ab9d6
  modified: 2026-09-19T12:25:16.257Z
---

Desktop → web match sync shipped 2026-09-19 (web commit 341197b deployed; desktop in v1.0.0-beta.2).
Contract: `~/.claude/harness/briefs/match-sync-contract-2026-09-19.md` (Bearer token = 32 random bytes
base64url, stored sha256 hex; `POST /api/matches` ≤200 per call, upsert by (user_id, match_id), 60/h per
token; `GET /api/matches/ping`; `POST|DELETE /api/sync-token` Clerk-only; `/dashboard/matches`).
Desktop: migration 45 (`web_synced_at`, `web_sync_error`), `src/lib/web-sync.ts`, `POST /api/web-sync`
(`sync` cookie-less for the Electron startup call, `save`/`test` JWT-gated, JSON content-type + same-origin
guard), Settings → Web Sync.

**Why:** the local Next server is loopback-bound but any web page can still POST `text/plain` to
localhost:3000-3009 without a preflight — the Opus refuter proved a cross-origin `save` that repointed the
sync destination, so every mutating local route needs the JSON-only + Origin guard, not just a cookie.
Rows with no valid date or matchId are marked locally instead of sent, because the web validates
all-or-nothing and one corrupt row would 422 a 200-row batch.

**How to apply:** live check = `MTG-deck-builder/verify-2026-09-19/web-sync-probe.cjs` scp'd to the VPS and
run with `PROBE_BASE=https://theblackgrimoire.com NODE_PATH=/opt/black-grimoire-web/node_modules node
--env-file=.env.local` from `/opt/black-grimoire-web` (the site listens on 127.0.0.1:3100, not 3000; the
probe creates and deletes user `user_sync_probe_2026_09_19`). Web rate limiter is per-process memory.
See [[reference-vps-ssh-and-neon-probe]] and [[reference-desktop-release-github]].
