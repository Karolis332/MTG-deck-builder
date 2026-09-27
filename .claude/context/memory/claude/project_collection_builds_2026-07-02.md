---
name: project-collection-builds-2026-07-02
description: "Harness --collection mode, collection-constrained build results, and the Ramos counters-leak in collection mode"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7fbf5f4b-340f-47ab-8962-4cc85bb2a503
---

# Collection-constrained builds (2026-07-02)

- `npx tsx scripts/test-deck-builds.ts --collection` — builds the 9-commander roster **+ Meren + General Tazri** (COLLECTION_EXTRA), commander format only, from user's real collection (user_id 1, 3,526 cards). Outputs `<slug>--commander-collection.txt` + `results-collection.json` (baseline `results.json` for the auto-improve gate is never touched). `deck-fitness.mjs` accepts `RESULTS_FILE` env override.
- Verified: 0 unowned non-basics leak into any of the 11 builds.
- **Known engine gap:** in collection mode Ramos picks 5 counters-matters cards (Evolution Sage,
  Hardened Scales, Inspiring Call, Hydra's Growth, Kami of Whispered Hopes) despite 479 owned
  gold spells sitting unused (incl. Rakdos Charm — a winning-reference centerpiece). Netdeck
  inclusion stats outvote the multicolor-matters reward when the pool is collection-thin.
  Hand-fixed variant: `ramos-dragon-engine--commander-collection-optimal.txt` (5-for-5 swap,
  gold 28→33, counters 5→0). Feed this failure mode to the [[project-auto-improve-loop]].
- Fresh commander stats (3.17M-deck corpus) changed 36 card slots across 10/11 decks vs the
  stale June-13 stats (Ponder/Preordain/Opt → Orvar; Worldly Tutor → Thrasios; 2026-set cards
  → Ghalta/Tazri/Magus). Fitness score unchanged (58) because the score is ~Ramos-only.
