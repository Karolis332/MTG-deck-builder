---
name: project-engine-bughunt-2026-06-13
description: "Adversarial multi-agent engine review — 18 bugs found+fixed, plus open follow-ups"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdad4f46-bb0e-4eac-ba91-e643be3da73a
---

2026-06-13: ran an 8-dimension Workflow bug hunt (reviewer + adversarial verifier per dimension)
on the deck engine. 18 confirmed bugs fixed in commit ddf639b. Pattern: every bug = "engine trusts
card data / a heuristic with an unhandled exception class." See [[project-model-audit-2026-06-12]].

Fixed: pump spells tagged removal (negative-toughness regex now); -1/-1 counter removal; isDrawEngine
etbOnly false-neg (Guardian Project class) + treasure false-pos; scry/tutor/look-at-top no longer
draw; ramp 'put onto battlefield' needs 'land'; legality SQL LIKE 'legal' excluded 'restricted' (now
json_extract IN (legal,restricted)) in deck-builder-ai + ai-suggest; UNLIMITED_COPIES runtime oracle
detection; conditional any-color lands (Mirrex/Nykthos/Spire) not reliable fixing; tapped fetches lose
untapped bonus; Step 8 repair protects payoffs+tribal (passed commanderOracle to classifyCard, synergy
branch was dead); tribal_lands anthem false-pos (Nadaar) fixed; tribal-attack -> 'tribal' not voltron.

Verification approach that works here: deterministic regression probe (classifyCard/isDrawEngine/
realManaSources on named good+bad cards) + invariant sweep, NOT LLM agents — correctness is code-checkable.

**RESOLVED 2026-06-13 (commit 68ec83f):** The "transform empty oracle" follow-up was a MIS-DIAGNOSIS
— real transform cards (Tovolar "Dire Overlord // the Midnight Scourge") have correct oracle; I'd
probed an art_series duplicate row ("X // X" name, empty oracle). Real bug was tribal detection:
detectTribalTheme used array-order early-return → mislabeled Tovolar 'human'. Fixed to score+return
DOMINANT tribe; resolvedStrategy now lets a detected tribe outrank generic voltron/midrange (not
specific archetypes). Tovolar now tribal/wolf/38 creatures.

NOTE: 2041 art_series rows in DB (layout='art_series', empty oracle, "X // X" names) = legacy bloat.
Excluded from all builds, 0 deck refs, 11 collection refs. Updated seed no longer creates them.
Harmless — left in place (deleting risks collection FKs for no build benefit).

**OPEN follow-ups (not yet fixed):**
- Venture/dungeon synergy category not detected (missing feature, not a bug).
- meld cards (21) have single-face oracle (niche).
- Workflow bug-hunt is repeatable: 8 dimensions in scripts/workflows; rerun after big engine changes.

## Features 2026-06-13 (commit 37a5c2a)
- **What-to-craft**: src/lib/craft-suggestions.ts getCraftPath() builds ideal(full)+owned(collection), diffs unowned cards grouped by Arena rarity, ranked by ideal score, + health delta. /api/decks/craft-path, CraftPathPanel on commander deck detail.
- **Pilot guide**: src/lib/pilot-guide.ts buildPilotGuide() deterministic gameplan (mulligan/turns/signature-lines/key-cards/pitfalls) from deck composition + commander mechanics, NO LLM. /api/decks/pilot-guide (GET ?deckId), PilotGuidePanel on deck detail.
- Both surface on commander deck detail page below DeckAnalysisPanel. alpha.5 installer rebuilt with both.

## Scraping + stats sync 2026-06-13 (afternoon)
- Backfill working: nightly run added 2382 decks/50 commanders (48 hit 200). Bumped cron to --commanders 100 (200/day). Manual run kicked during work-hours (network-bound, fine).
- Corpus 2.29M decks; shortfall band ~4388 commanders <200 (actionable 20-199 subset targeted).
- **CRITICAL FLOW**: scraping deepens VPS Postgres, but desktop engine uses LOCAL commander_card_stats. Must run 'py -3.13 scripts/sync_commander_stats.py --db <APPDATA db> --min-decks 20' to push deepened stats to desktop. Ran it: 2106 commanders / 627K card stats refreshed, atomic swap, 0 errors. Endpoints /cf-api/commander-list + /commander-stats are anon (no key needed).
- Re-run sync periodically as backfill deepens coverage. Consider adding it as a pipeline step or app-side periodic sync.

## Backlog cleared 2026-06-13 (commit 157d66c)
- Auto-sync: src/lib/sync-commander-stats.ts (TS port, no Python dep). first-boot syncCommanderStatsIfStale() fire-and-forget, >7day staleness, commander_stats_synced_at in app_state. Scraping now reaches desktop automatically.
- Venture/dungeon: new dungeon_venture SynergyCategory wired through commander-synergy + SYNERGY_REQUIREMENTS_MAP + ARCHETYPE_PAYOFFS.
- Alembic deploy bug FIXED in grimoire-cf-api (commit ce0c9b6): config.py derives sync URL from async URL when DATABASE_URL_SYNC unset (root cause: env var missing in container -> localhost:5433 default). Image rebuilt; fix active in running container (durable across restart; redeploy uses baked image). Did NOT force-recreate prod container (name conflict, benign migration fix not worth downtime).
- Meld 'oracle gap' = NOT a bug (meld cards are separate cards w/ correct single-face oracle).
- Added guard: unresolvable commanderName throws instead of building broken 72-card deck.
