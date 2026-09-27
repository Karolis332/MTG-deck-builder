---
name: project_deck_sim_optimizer_2026-06-22
description: Monte Carlo goldfish simulator + 10k manabase optimizer for Ramos; collection imported; honest findings on metric-gaming
metadata: 
  node_type: memory
  type: project
  originSessionId: 519b7497-cb9e-455c-b45e-256e350b3f6d
---

Built a deck-consistency optimization toolchain (2026-06-22 session) in `scripts/_scratch/`:
- **`goldfish-sim.mjs`** — Monte Carlo mana-consistency sim (shuffle, London mulligan, play 6-7 turns, model lands via `land_classifications` produces/untapped + rocks). Metrics: keepable%, all-5-colors-by-T4/5/6, Ramos-castable-by-T6, color-screw%. 10k games ≈ 1s. Usage: `node scripts/_scratch/goldfish-sim.mjs <deckfile> 10000`.
- **`optimize-manabase.mjs`** — 10k-iteration hill-climb over OWNED lands, recalibrating every 100, holding nonland spells fixed. Writes `decks/test-builds/ramos--optimized.txt`.
- **`build-from-collection.ts`** — imports an Untapped CSV into the `collection` table, then runs `autoBuildDeck` collection-constrained with `buildHints` excludes. Use `buildHints` (NOT `strategy`) for "no <card>" excludes.

**Collection state:** the `collection` table now holds the user's REAL Arena collection (3526 cards matched from `~/Downloads/collection(1).csv`, Untapped format, Count>0), replacing the old bogus 3665-row bulk import. user_id=1 (QuLeR), source='arena'. (Supersedes the warning in [[project_collection_table_unreliable]] — it's now real.)

**Consistency ladder (Ramos, 10k games):** user's hand-built deck **56.9** (48% color-screwed, only 30 lands) < builder's collection deck **71.6** (38 lands, shocks/fetches/talismans) < optimizer ~**82-84**.

**KEY LESSON — naive consistency-max games the metric:**
1. Optimizer stacked 3× Cavern of Souls (singleton violation) — fixed by enforcing singleton + excluding conditional "any color" creature-type lands.
2. Then it loaded slow tri-TAPLANDS (max color count, awful tempo) — fixed by a tempo penalty (`tappedPenalty = 0.6 × tapped-nonbasic-count`). Result: sensible base (mostly basics + untapped shocks).
**Any deck-build fitness MUST be legality-aware + tempo-aware, or the optimizer produces exactly the bad manabase the user complained about.**

**Big caveat:** the sim measures MANA consistency ONLY — not power, synergy, or aggression. The user's hand-built deck wins on speed the sim can't see, so "more consistent" ≠ "wins more." The recommended playable deck is the **collection build** (`decks/test-builds/ramos--collection-build.txt`): talismans + shocks/fetches + 12 draw + gold-heavy + no Massacre Wurm.

**Web research (workflow `commander-winning-research`):** Ramos top decks = high-power blink/untap combo (Lux Artillery + Temur Sabertooth, Thassa's Oracle) OR mid gold-charm engine. Counter-per-COLOR-of-spell (not per mana). Full piloting guide in task output. Workflow is parameterized by `args.commander` — reuse for other commanders. Related: [[project_ramos_engine_misread_2026-06-20]], [[feedback_ramos_deck_prefs]].

**OPEN:** need exact printings for the rest of the roster (Ashling ?, Quintorius/Lorehold ?, + others) to extend research+build+optimize per commander.
