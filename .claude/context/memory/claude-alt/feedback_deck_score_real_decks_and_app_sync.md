---
name: deck-score-real-decks-and-app-sync
description: "Operator's bar for Deck Score (2026-09-21) — acceptance is measured on real corpus lists through the shipped entry point, and every surface (build-api, web, desktop) must show the same number at the same SCORE_VERSION; deploy only on a refuter's DEPLOYABLE"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0c6f5709-7ab2-42f9-8d4a-0eba683ab9d6
  modified: 2026-09-21T07:57:43.307Z
---

On 2026-09-21 the operator said "we need the thorough sync with the application and flawless model performance" after the v1.3 refutation showed real held-out corpus decks scoring ≤ 20 through `scoreDeckSafely` while fixtures, piles and cEDH cohorts all passed.

**Why:** fixture anchors, pile separation and cEDH medians can all pass while the product scores the median real deck like a random pile (catalogue coverage 33 % on real lists vs 93 % on the controls the floors were drawn to). Numbers measured with the coverage gate lifted (`--raw`) are not product numbers.

**How to apply:** every Deck Score stage reports the real-list distribution (share at S = 0, S/total p10/p50/p90) through the shipped entry point, per profile, as an acceptance number; frozen constants are re-measured after the LAST catalogue change (`bands verify`) — pins that copy artefacts are not evidence; an Opus refuter runs before each deploy and the deploy waits for DEPLOYABLE; after each build-api deploy and each desktop release run the app-sync brief (`deck-score-app-sync-verify-2026-09-21.md`): engine truth = build-api = web card = desktop tile, same `SCORE_VERSION`, else the lagging surface is named. Related: [[deck-score-corpus-samples]], [[commit-on-test-exit-status]], [[release-from-clean-checkout]].
