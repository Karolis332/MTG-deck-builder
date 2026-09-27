---
name: project-auto-improve-loop
description: "Autonomous deck-engine self-improvement loop (\"hermes\") — how to run it, its gate, and its ceilings"
metadata: 
  node_type: memory
  type: project
  originSessionId: ae687b34-1f5b-4114-8d0a-c2b7cf71c2a5
---

Autonomous deck-engine improver added 2026-07-01 (user asked to "activate hermes agent"; Nous Hermes is an external download, so we built the in-repo equivalent instead).

**Files:** `scripts/auto-improve.sh` (loop) + `scripts/deck-fitness.mjs` (gate). Drives the existing harness `scripts/test-deck-builds.ts` + `docs/DECK_ENGINE_TESTING_PROTOCOL.md`.

**Run:** `bash scripts/auto-improve.sh [ROUNDS]` (default 10). Stop: `touch data/auto-improve.stop`. Watch: `tail -f data/auto-improve.log`. Review: `git log auto-improve`.

**Loop:** per round a headless `claude -p` (Sonnet, tools `Read,Edit,Grep,Glob`, no Bash, 12-min timeout) makes ONE small edit to `src/lib/{deck-builder-ai,commander-synergy,card-classifier}.ts` → re-run full-roster harness → keep only if `deck-fitness.mjs` says strict improvement, else `git checkout -- src/` revert.

**Gate (`deck-fitness.mjs`):** `hardFails` (failed build / illegal cards / Ramos counters leak) must not rise AND `score` (Σ referenceOverlapPct + Ramos min(gold,50)) must strictly rise. Self-test: `node scripts/deck-fitness.mjs --selftest`.

**Guardrails:** commits land on branch `auto-improve` (NOT main); snapshots dirty tracked tree as a wip commit first so revert never eats your WIP; bounded rounds + stop-file.

**Why gated, not free-editing:** engine is fragile (MDFC leaks, optimizer games naive metrics — see [[project_deck_sim_optimizer_2026-06-22]]). Harness is the reviewer.

**How to apply / ceilings:**
- **Signal is ~Ramos-only** — only `ramos-dragon-engine` has a `--winning-reference.txt`, so other 8 commanders contribute 0 score. Add more `*--winning-reference.txt` fixtures (per the protocol's match-log feedback loop) to broaden what it optimizes.
- **`hardFails:1` at baseline is a harness artifact** — `magus-lucea-kane/brawl` (commander not Arena-legal). Not an engine bug; gate pins it. Consider dropping that scenario/format from the roster.
- **Nondeterminism risk** — if `autoBuildDeck` has random tie-breaks, the gate has run-to-run noise. Watch early rounds; make harness seed-stable if churn appears.

**First run (2 rounds, 2026-07-01):** round 1 KEPT — Sonnet added a -18 penalty to mono/colorless spells inside the `five_colors` block; Ramos gold 32/30→45/43 (cleared ≥35 gate), score 103→131. Commit `7430b96` on `auto-improve`. Round 2's headless `claude -p` hung ~45min → added 12-min per-round `timeout` guard.

**Dockerized (2026-07-02):** `docker/Dockerfile` + `docker/hermes-entrypoint.sh` + `docker-compose.hermes.yml` + `.env.hermes.example` (`.env.hermes` gitignored). Self-contained bot: clones repo from GitHub, runs loop on `hermes-auto` branch, pushes back — NEVER touches local working tree (avoids the shared-working-tree footgun of bind-mounting). Card DB bind-mounted read-only from APPDATA, copied to `/work/db` (avoids WAL cross-OS locking). Entrypoint: clone → `npm ci --ignore-scripts` + `npm rebuild better-sqlite3` → DB snapshot → forever-loop with exponential backoff (cap 1h) on plateau to limit token burn. Needs `ANTHROPIC_API_KEY` (no subscription-in-container) + `GITHUB_TOKEN` (write). Validated: image builds, tools present, 556MB DB visible via mount. UNVALIDATED (needs user keys): npm ci/better-sqlite3 linux build, clone auth, live loop. Start: `docker compose -f docker-compose.hermes.yml up -d --build`; pause: `exec hermes touch /work/stop`. **Same Ramos-only signal ceiling — running forever ≠ improving forever; add reference fixtures.**
