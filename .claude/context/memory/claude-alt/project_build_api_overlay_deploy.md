---
name: project-build-api-overlay-deploy
description: VPS build-api = Deck Score 1.2.0 tree + a 9-file best-deck overlay (2026-10-12); a plain git-archive HEAD deploy would ship unreleased Deck Score 1.4 rc
metadata:
  node_type: memory
  type: project
  originSessionId: 5e9a99de-b2fa-445d-922f-131b02b695f6
  modified: 2026-10-12T10:14:01.045Z
---

The VPS build-api (`/opt/grimoire-build-api/app`) runs the 2026-09-30 Deck Score **1.2.0** tree plus a hand overlay of 9 best-deck files from f2451a0:
- `src/lib/{best-deck,best-deck-run,deck-climb,goldfish-sim}.ts`
- `services/build-api/{resolve,server,best-deck-worker,best-deck-jobs,best-deck-routes}.ts`

The pre-overlay backup is `/opt/grimoire-build-api/backup-2026-10-12-pre-best-deck.tgz`. The repo HEAD carries Deck Score 1.4.0-rc4, and the working tree rc10.

**Why:** DEPLOY.md §5's `git archive HEAD src services …` would have shipped the unreleased Deck Score with best-deck. Deck Score changes need a refuter DEPLOYABLE verdict first ([[feedback-deck-score-real-decks-and-app-sync]]).

**How to apply:**
- Before the next build-api deploy, either:
  - overlay only the changed files (stage a copy at `/opt/grimoire-build-api/staging-*` with `node_modules` symlinked, run `tsc --noEmit -p .`, and expect only the 4 baseline `resourcesPath` errors); or
  - take Deck Score 1.4 through its refuter and then deploy the whole tree.
- `deckScoreTotal()` reads `absoluteTotal ?? score`, so best-deck works on both payloads.
- Best-deck jobs take 1–10 s on the VPS with 1.2.0, against ~180 s locally with rc10. Re-measure against the 420 s kill once 1.4 ships.
