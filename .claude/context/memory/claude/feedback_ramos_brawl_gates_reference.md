---
name: feedback-ramos-brawl-gates-reference
description: "User's WINNING Ramos Historic Brawl list is a Gates/Maze's End + charm hybrid with Jegantha companion — saved as brawl-specific reference fixture"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7fbf5f4b-340f-47ab-8962-4cc85bb2a503
---

# Ramos Brawl winning list = Gates hybrid (2026-07-03)

User's live Arena list "winning multiple games": **17 Gate-typed lands + Maze's End** alt-win,
Guild Summit draw engine, Gates Ablaze wipe, Plaza of Harmony, gate tutors (Open the Gates,
Circuitous Route, Golos, Crop Rotation) — LAYERED ON TOP of the charm/gold package + Door to
Nothingness. **Jegantha, the Wellspring companion** (no-duplicate-pip constraint holds).

**Why:** confirms [[feedback-ramos-deck-prefs]] — the engine keeps dropping the Gates package,
but Gates + charms is the user's actual winning shape in Brawl. Untapped mana + draw priority.

**How to apply:**
- Fixture: `decks/test-builds/ramos-dragon-engine--brawl-winning-reference.txt` (target
  metrics in header: gateCount ≥ 15, Guild Summit/Gates Ablaze/Maze's End present, hybrid
  gold package, Jegantha-legal).
- Harness `loadReferenceNames(slug, format)` now prefers `--<format>-winning-reference.txt`
  over the generic file — Commander keeps the paper charm-engine reference.
- Contains Arena-only cards (HBG, Y25, `A-` Alchemy names) that are NOT in the paper card DB —
  overlap scoring silently skips names it can't match; don't "fix" them into paper builds.
- Deck-2 lesson same session: `POST /api/decks/auto-build` (Quick Build) produced the
  goodstuff pile; only `claude-build` writes `ai_build_logs` with per-card reasons.
