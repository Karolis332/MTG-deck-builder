---
name: feedback-ramos-deck-prefs
description: "User's preferences and feedback on their collection Ramos Dragon Engine Brawl deck"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdad4f46-bb0e-4eac-ba91-e643be3da73a
---

User plays Ramos, Dragon Engine in **Arena Brawl** (1v1, 100-card singleton) from their
own collection (~3,645 distinct cards, imported from `Downloads/collection(1).csv`).

Feedback given:
- **No Massacre Wurm** (2026-06-13) — considers it a bad include in this deck. Excluded via
  build hint "no massacre wurm".
- Was bricking on mana / mana-screwed most games → root cause was restricted mana producers
  (Cavern of Souls-class) counted as rainbow fixing; fixed engine-wide. See [[project-model-audit-2026-06-12]].
- Wants consistent untapped mana + more card draw. Collection is tapped-land heavy, so builds
  warn "61% tapped" (grade B) — honest collection limitation, not a bug. Crafting untapped
  duals/triomes is the wildcard priority.

**Why:** real Arena pilot, real meta read — trust their card-level calls.
**How to apply:** when building Ramos for this user, pass hint "multicolor counters value,
consistent untapped mana, card draw engines, no massacre wurm". Latest build:
`decks/ramos-improved-v3.txt`. Their archetype preference vs the model: model builds
counters-midrange (drops the Gates/Maze's End package); if they want the Gates plan back,
hint "gates, maze's end wincon".
