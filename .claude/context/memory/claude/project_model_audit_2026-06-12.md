---
name: project-model-audit-2026-06-12
description: "Deck-builder model audit/fix session — harness, EDHREC comparison, land system root causes, remaining gaps"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdad4f46-bb0e-4eac-ba91-e643be3da73a
---

2026-06-12 model overhaul (commits: alpha.5 WIP + "deck-builder model overhaul").

**Harness**: `npx tsx scripts/test-deck-builds.ts` (9 commanders × commander/brawl → decks/test-builds/),
`npx tsx scripts/compare-edhrec.ts` (joins results.json + edhrec-reference.json → COMPARISON.md).
EDHREC refresh: `node decks/test-builds/.edhrec-raw/build-reference.js`. Card data refresh:
`npx tsx scripts/update-card-data.ts` (Scryfall oracle bulk, keyed by oracle_id, preserves arena_id).
Full diagnosis in `decks/test-builds/MODEL-DIAGNOSIS.md`.

**Root causes fixed**: land_classifications was EMPTY in prod (classify_lands.py defaulted to legacy
./data path — now APPDATA-aware; rerun after each card-data update). Transform "// Land" cards counted
as lands. produces_colors ignored cards.produced_mana. MDFC +25 blanket bonus (now modal-only +10, cap 4).
No commander-legality check (Vivi banned in Brawl, 40K not on Arena — now refused). EDHREC/tribal/CF pool
injections skipped legality. Commander-stats injection SQL was silently dead (missing alias). Partner
support added (BuildOptions.partnerName). New synergy cats: x_spells (Vivi "add X mana", Magus), five_colors
(Ramos "for each of that spell's colors"). Counters suppressed when self-only UNLESS counters-as-resource.
Pass B role caps (quota+3..5) stop 19-removal/28-ramp overfill.

**Post-fix overlap vs EDHREC avg**: Krenko 74/81%, Sheoldred 57/80%, Orvar 42/75%, Ghalta 63/71%,
Magus 52%, Vivi 52%, Heliod 49%, Thrasios+Tymna 35/58%, Ramos 11/14% (was 1.6-4.7%).

**Known remaining gaps**: [[project-model-remaining-gaps]] — Ramos arsenal (commander-analysis.ts
doesn't know five_colors; misses Door to Nothingness 38%, Maelstrom Nexus, charms), pool exhaustion
pads lands to 42-45 (Thrasios 4c, brawl monos), Heliod/Orvar miss-top 7-11, no devotion detection,
EDHREC overlap metric strict name-match. Magus Lucea Kane Brawl correctly impossible (not on Arena).
Vivi IS on Arena as the Oct-2025 rebalance (A-Vivi Ornitier, taps to activate) — paper Vivi is
Standard-banned (Nov 10 2025) but Commander/Brawl playable; engine falls back to A- rows for Arena formats.
- Improvement loop seeded: scripts/generate-training-data.ts → data/training/*.jsonl (picked vs inclusion_rate pairs). First sample: prec 0.35-0.77, weakest = newest sets (Leonardo TMNT 0.35). Vivi brawl = A-Vivi rebalance fallback (commit bd6e9a3).
- Trained scoring weights (2026-06-12 evening): instrumented score components, 100-commander dataset labeled from VPS corpus (54,983 rates via /tmp/cmdr_inclusion.csv query, ~6min), logistic fit -> cf x0.25 / theme x0.5 / metaStats x0.5. Holdout: ALL 10 unseen commanders improved (prec 0.55->0.69, recall 0.46->0.59). Engine loads APPDATA/data/scoring-weights.json, identity fallback. Retrain: 4x 'npx tsx scripts/generate-training-data.ts --sample 25 --offset N' then 'py scripts/fit_scoring_weights.py --apply'.
- KNOWN: commander_synergies table EMPTY locally (edhrec component dormant in training); Thrasios 4c brawl pool exhaustion -> 52 lands. Next: populate commander_synergies, re-shard, refit.

## Session 2026-06-12 evening (product hardening)
- Pool land-leak ROOT CAUSE: EDHREC/stats/staple injections pushed utility lands into the NONLAND pool; synergy swaps traded spells for lands (Thrasios brawl 52 lands). Fixed: validForPool guard + MDFC land-back budget(4) in pickByRole/swaps + land-step compensation. Post-fix: all decks 34-39 lands, Sheoldred brawl 91.3% overlap.
- commander_synergies: pyedhrec BROKEN (API drift) — use 'npx tsx scripts/enrich-commander-synergies.ts --from-stats 120' (json.edhrec.com). 33K rows/125 commanders.
- Model server: weights served at http://187.77.110.100/cf-api/weights (nginx alias /var/www/grimoire/scoring-weights.json); first-boot syncs to APPDATA data dir. After refit: scp new weights to VPS path.
- VPS watchdog: /opt/grimoire-routines/check_cf_health.py cron */10min, latched Telegram alert after 2 fails.
- Fonts self-hosted via next/font (Cinzel/Crimson Text) — offline Electron theming; favicon = src/app/icon.png.
- Run scripts with 'py -3.13' (py launcher reads shebang and may pick 3.12/3.11 without packages).
- Rarity builds: BuildOptions.rarityFilter pauper/peasant threaded through pool+injections+lands (validForPool enforces). Hints: src/lib/build-hints.ts deterministic parse (strategy/budget/emphasize/avoid/excludes) -> BuildOptions.buildHints. UI: rarity selector + fine-tune textarea in deck dialog (commit 5147851).
- Corpus 2026-06-12: moxfield 1.27M + archidekt 965K = 2.23M decks, 6164 distinct commanders, scrape rate 111.5K/week. Full-public-corpus est: 6-8M decks total available.
