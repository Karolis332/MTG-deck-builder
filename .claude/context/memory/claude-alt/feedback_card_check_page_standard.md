---
name: feedback-card-check-page-standard
description: "The deck-check page (card images grouped by type, tap to tick, live text filter) is the operator's standard for visual deck lists (2026-10-02)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 810c1926-d20c-4357-a140-3277c23abe3e
  modified: 2026-10-02T06:04:20.812Z
---

When the operator needs to see or verify a deck visually, give them `verify-2026-10-02/tam-precons/check-page.ts` → `decks/paper/deck-check.html`, with a copy in `Desktop/MTG collection/MTG decks/`. The page has:
- one tab per deck;
- Scryfall images grouped Commander / Planeswalker / Creature / Instant-Sorcery / Artifact / Enchantment / Land;
- tap-to-tick with a found counter, saved in localStorage;
- gold NEW badges for cards in since the baseline, and a red "Should be OUT" row;
- a live text filter on name and type line.

**Why:** the operator used it to map the physical Tam box against the app ("this formatting is good, lets use this as a standard for future, just add a text filter"). It found a deck that differed from the registered list by 3 cards.

**How to apply:** reuse the generator for any physical-deck check or visual list. Change only the deck slugs and baselines; don't build a new page. Before showing it, verify it with Playwright through a local `py -m http.server`, because Playwright blocks `file://`. Related: [[feedback-game-report-format]], [[feedback-deck-gate-before-showing-lists]]
