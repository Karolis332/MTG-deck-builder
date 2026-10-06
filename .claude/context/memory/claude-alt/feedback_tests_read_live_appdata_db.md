---
name: tests-read-live-appdata-db
description: "MTG_DB_DIR must use forward slashes from Git Bash (backslashes create an empty DB); src/lib/db.ts prefers the operator's live Electron DB (%APPDATA%/the-black-grimoire/data) whenever MTG_DB_DIR is unset, so any bare test/script run reads or migrates the live 913 MB DB; vitest.config.ts pins the repo DB since 2026-09-21 and REFUSES the live dir since 2026-09-26 (a suite run on it emptied the collection table), scripts still need the env var"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0c6f5709-7ab2-42f9-8d4a-0eba683ab9d6
  modified: 2026-09-30T11:12:24.319Z
---

`src/lib/db.ts` resolves the database as `MTG_DB_DIR` → `%APPDATA%/the-black-grimoire/data/mtg-deck-builder.db` if it exists → `./data`. On this machine the APPDATA file is the operator's live desktop install (913 MB + WAL, a different `cards` table from the repo DB). On 2026-09-21 a bare `npx vitest run` read it and failed 13 deck-score pins that pass against the repo DB; earlier an agent's repro applied migration 46 to it.

**Why:** every calibration number, catalogue hash and pinned test in the Deck Score program is measured against `C:\Users\QuLeR\MTG-deck-builder\data\mtg-deck-builder.db`; the live DB drifts with the app and must never be read or written by agents.

**How to apply:** `vitest.config.ts` sets `test.env.MTG_DB_DIR` to the repo `data/` (commit on 2026-09-21), so the suite is safe without the env var. Scripts (`npx tsx scripts/deck-score-*.ts`, repros, one-off probes) are NOT covered — always prefix `MTG_DB_DIR=C:\Users\QuLeR\MTG-deck-builder\data`, and put that line in every agent brief. If a script must run against the live DB, that is an operator action, never an agent's. Related: [[deck-score-corpus-samples]], [[fable-orchestrator-only-routing]].

**Git Bash path form (2026-09-22):** `MTG_DB_DIR=C:\Users\QuLeR\MTG-deck-builder\data` typed in Git Bash reaches Node with the backslashes eaten (`C:UsersQuLeRMTG-deck-builderdata`); `src/lib/db.ts` then CREATES a fresh empty DB under a mangled `MTG-deck-builder/UsersQuLeRMTG-deck-builderdata/` directory and every query returns nothing — stages 3i/3j found that artefact and a property freeze that had written 0 picks. Always use forward slashes in briefs and commands: `MTG_DB_DIR=C:/Users/QuLeR/MTG-deck-builder/data`. A `UsersQuLeR…` directory in the repo root means a command ran with the mangled form: delete it and re-run.

**Collection wipe (2026-09-26):** my builder-unit briefs told agents to run `npx vitest run` with `MTG_DB_DIR` = the APPDATA dir. The explicit env var beat the pin, the build-api tests' `seedTempCollection` ran `DELETE FROM collection` on the whole table, and every user's collection went to 0. Restored the same day (CSV re-import, `paper-sync`, the 09-04 backup; free-page carver `verify-2026-09-26/incident/recover_collection.py` confirmed the restore row-for-row). Now the deletes are scoped to the temp user and `vitest.config.ts` throws on a live-dir MTG_DB_DIR. **How to apply:** in briefs, vitest runs get NO MTG_DB_DIR (repo DB); only read-only harness scripts that need the operator's collection (e.g. `scripts/build-regress.ts` collection builds) may name the live dir, and the brief must say "read-only". Before any run that may write the live DB, copy it to `…/data/mtg-deck-builder.db.bak-<date>`.

**Unknown-flag fallback (2026-09-30):** an agent ran `scripts/update-card-data.ts --prices-only --db <copy>`. The script had no `--db` flag and ignored it silently; with MTG_DB_DIR unset it wrote the live DB. The write only filled NULL prices (+1,492, verified against the auto-backup), so it was harmless. **How to apply:** in briefs, say "export MTG_DB_DIR=<copy> on every DB command; never rely on a `--db` flag unless the script's usage text lists it". The U9a fix adds `--db` and rejects unknown flags.

**Branch migrations leak into the live DB (2026-09-30):** an unscoped hotfix-branch run at 10:42 applied that branch's migration v47 to the live DB. The runner keys on version number only, so any migration that exists on one branch must be committed with the same number and SQL on every branch (v47 was ported to auto-improve as 30d1f51). **How to apply:** before adding a migration on a hotfix branch, reserve the number on auto-improve in the same session.
