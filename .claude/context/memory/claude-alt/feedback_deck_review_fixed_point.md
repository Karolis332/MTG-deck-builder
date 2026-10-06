---
name: feedback-deck-review-fixed-point
description: "Deck optimisation/review must run until a full pass finds zero improving swaps — capped top-N passes are a \"crucial error\"; only recommend cards physically confirmed"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 11d220af-9960-4663-be00-7f202e55667e
  modified: 2026-09-28T17:53:30.494Z
---

Deck reviews (agent audits and the app's `/optimize`) must converge: the stop condition is "a full pass over every (candidate, slot) pair finds no improving swap". "Top 12 swaps", "up to 5 misses" or a single pass is not acceptable.

**Why:** on 2026-09-28 the paper-deck audit ran capped passes (≤12 swaps, ≤6 FRA swaps, Fable ≤5 misses). Every new reviewer then found swaps the previous one had missed (Ashiok, Dina, Blade Historian, Smothering Abomination), which proved the process had not converged. The operator called it a crucial error. `services/build-api/optimize.ts` has the same shape: MAX_CUTS 8 / MAX_ADDS 12, one pass.

**How to apply:**
- Rank every deck card and every candidate on one scale per role, with no cap. Swap the best candidate for the worst slot, and repeat until nothing beats the worst kept card.
- The refuter confirms that no improving swap remains.
- A coverage check proves each card got a verdict, not that the verdict is right.

Also: recommend only cards the operator physically has. Registrations from a published precon list (e.g. 35610b9 "Witherbloom leftovers (EDHREC list)") are assumptions: Well of Lost Dreams came from there and the operator questioned it. Flag such cards "check binder". Related: [[feedback-deck-gate-before-showing-lists]].
