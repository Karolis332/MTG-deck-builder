---
name: feedback_deck_requests_quick_first
description: "Deck requests — hand the operator a playable, gated list within minutes; the converged Fable pipeline runs after and only sends a diff"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 11d220af-9960-4663-be00-7f202e55667e
  modified: 2026-09-30T21:36:12.072Z
---

On a deck request, deliver a playable list within minutes. It must be 100 cards, all owned and gate-passed, built from the existing pool and screens or by hand-swapping from a sibling list. Run the full map-reduce → Fable fixed-point → Fable review pipeline AFTER that, in the background, and send the result as a diff ("swap X for Y").

**Why:** on 2026-10-01 the operator asked "just give it to me to test", then "make it quick if possible", then "can we do something about the output times?". That happened when the Jace and Jace-planeswalker builds took 30–60 min each: screeners, then a builder, then a reviewer, all serial, before any list appeared.

**How to apply:**
- Reuse the owned pool and screens across commanders with the same colour identity; don't re-screen.
- Write the quick list to `quick-v1.txt`, run `scripts/deck-gate.ts`, then show it.
- The convergence rule ([[feedback_deck_review_fixed_point]]) still applies, but to the follow-up, not as a blocker on the first list.
