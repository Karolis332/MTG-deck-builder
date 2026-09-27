---
name: project_ramos_engine_misread_2026-06-20
description: "RESOLVED 2026-06-21 — Ramos multicolor-matters fix: reward cast-colors, drop counters tag, mana-sink payoffs. Gold density 10→43."
metadata: 
  node_type: memory
  type: project
  originSessionId: a8890f34-6f73-48f3-b526-9ef73c6b0fb0
---

**RESOLVED 2026-06-21.** Three edits + harness gate + reference fixture:
1. `commander-synergy.ts` analyzeCommander: when `five_colors` trigger present, DROP the `counters` tag (Ramos's counters are a mana battery, not a proliferate theme — reverses the old "wants counters package to refuel" carve-out at ~line 474; removes protected Hardened Scales/Doubling Season).
2. `deck-builder-ai.ts` `five_colors` scorer (~line 1220): reward the spell's ACTUAL cast colors (`card.colors`, NOT color_identity) — `+14 × castColors` so 2-color charms get +28 (was: only 3+ color identity rewarded, charms got 0). +10 for multicolor instants/sorceries. New `MANA_SINK_PAYOFFS` set (+45): Door to Nothingness, Progenitus, Bring to Light, Maelstrom Archangel, Timeless Lotus, etc.
3. Harness `scripts/test-deck-builds.ts`: emits `goldSpellCount` (2+ cast colors) + `counterMattersCount` gates.

**Result:** Ramos gold density 7→43 (cmdr) / 42 (brawl), counters 0, 11 charms + all 5 mana sinks. Mono commanders unaffected (gated on trigger): Ghalta gold=0, Thrasios/Tymna gold=4-7 (not flooded). Ground truth: `decks/test-builds/ramos-dragon-engine--winning-reference.txt` (QuLeR's match-winning build). Protocol: `docs/DECK_ENGINE_TESTING_PROTOCOL.md`. NOTE: ships in dev server immediately; packaged app needs rebuild. Theme-string tagger still cosmetically noisy (says artifacts/tokens) but card selection is correct.

---

Tested `autoBuildDeck` on **Ramos, Dragon Engine** (Commander + Brawl) via `scripts/test-deck-builds.ts --only ramos-dragon-engine` on 2026-06-20.

**Defect:** Builds are legal and have a strong 5c mana base (38 lands, deep rainbow fixing), but they DO NOT execute Ramos's game plan. Ramos = cast multicolored spells → +1/+1 counter per color → remove 5 counters for WWUUBBRRGG once/turn → dump into a big payoff (Door to Nothingness, huge X-spells, bombs).

**Evidence (Commander build, 62 nonland spells):**
- multicolored (≥2 colored pips, the fuel): **7** (~11%)
- mono-colored: 35
- colorless (no trigger at all): 20 — incl. 9 mana rocks + Door to Nothingness

**Root cause:** theme detection saw "+1/+1 counter" in Ramos's oracle text and built a generic +1/+1-counters / treasure-aristocrats midrange goodstuff pile (Storm-Kiln Artist, Pitiless Plunderer, Marionette Apprentice, Korvold, Evolution Sage, Cathars' Crusade, Champion of Lambholt, Inspiring Call). It missed that Ramos is a **mana engine** where the counters are just fuel, and that the deck wants high multicolor-spell density + a mana-sink payoff suite.

**Fix path:** commander-analysis module needs a "cast-a-multicolored-spell-matters + big-mana-sink payoff" archetype detector that (a) heavily biases the candidate pool toward gold/WUBRG spells and (b) seeds expensive X-spells / bombs as payoffs. Verify with the same harness; target multicolor density ~40-60% of nonland spells. Related: [[feedback_ramos_deck_prefs]], [[project_engine_bughunt_2026-06-13]], [[project_model_audit_2026-06-12]].
