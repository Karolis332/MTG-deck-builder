---
name: feedback-card-check-page-standard
description: "The deck-check page (card images grouped by type, tap to tick, live text filter, copy block, primer) is the operator's standard for visual deck lists; since 2026-10-08 it wears the cyberpunk/vaporwave theme"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 810c1926-d20c-4357-a140-3277c23abe3e
  modified: 2026-10-07T23:57:46.916Z
---

When the operator needs to see or verify a deck visually, give them `verify-2026-10-02/tam-precons/check-page.ts` → `decks/paper/deck-check.html`, with a copy in `Desktop/MTG collection/MTG decks/`. The page has:
- one tab per deck (paper and Arena decks alike; Arena decks use the model's list as the baseline);
- Scryfall images grouped Commander / Planeswalker / Creature / Instant-Sorcery / Artifact / Enchantment / Land;
- tap-to-tick with a found counter, saved in localStorage;
- NEW badges for cards in since the baseline, and a "Should be OUT" row;
- a live text filter on name and type line;
- a "Copy decklist" block, the pilot guide (`[[Card]]` chips, `=>` flows) and the primer JSON rendered above the grid.

**Theme (2026-10-08, "i want the cyberpunk view to be the standard now"):** the page uses the vaporwave palette from `scripts/deck-view.html` (the model-lab deck view): deep violet background with a radial glow, striped sun, animated perspective grid floor, scanlines, neon cyan headings with glow, magenta for OUT / quantities / arrows, orange-sun for candidates, Segoe UI instead of Georgia. NEW = cyan border, OUT = magenta border. The old brown "grimoire" palette is retired for this page; do not reintroduce it.

**Why:** the operator used the page to map the physical Tam box against the app ("this formatting is good, lets use this as a standard for future, just add a text filter"); it found a deck that differed from the registered list by 3 cards. On 2026-10-08 the operator asked for the vaporwave deck view and then made it the standard look.

**How to apply:** reuse the generator for any physical-deck check or visual list. Change only the deck slugs, baselines, guides and primers; don't build a new page. Keep the CSS variables (`--cyan`, `--mag`, `--vio`, `--sun`, `--panel`) when adding elements. Before showing it, verify it with Playwright through a local `py -m http.server` (Playwright blocks `file://`) and look at the screenshot for contrast. Related: [[feedback-game-report-format]], [[feedback-deck-gate-before-showing-lists]], [[feedback-deck-building-skill]]
