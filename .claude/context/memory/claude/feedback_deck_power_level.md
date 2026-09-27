---
name: Deck power-level preference
description: User builds paper EDH decks at mid-power (bracket 2-3), never cEDH. Skip combo-warping staples when recommending upgrades.
type: feedback
originSessionId: b1adb513-96b4-491a-a685-834c91d4d2bd
---
User wants paper Commander decks **strong enough to win, never the strongest at the table** — kitchen-table mid-power, bracket 2-3.

**Why:** Stated explicitly during 2026-05-04 Meren build. Plays in casual pods; doesn't want to ruin tables or get archenemy'd every game.

**How to apply:**
- Skip these in upgrade lists: Demonic Tutor, Vampiric Tutor, Imperial Seal, Mystical Tutor, Phyrexian Altar, Bolas's Citadel, Necropotence, Survival of the Fittest, 2-card combos that win on resolution, mass land destruction.
- These are still fair game: Ashnod's Altar, Pernicious Deed, Volrath's Stronghold, Birthing Pod, Eternal Witness, Sol Ring, Skullclamp, free 1-mana sac outlets (Viscera Seer, Carrion Feeder).
- Default storage for paper decklists: `C:\Users\QuLeR\Desktop\MTG decks\` (not the MTG-deck-builder repo).

**Exceptions where user pushes past mid-power for specific cards:** On 2026-05-04 user explicitly added Braids, Cabal Minion to Meren despite my mid-power objection. Accept similar overrides — when user names a specific high-power card they want, apply it and warn about pod-meta implications, don't re-litigate the mid-power principle.

**Required output format for paper deck-building sessions:** After any card evaluation that may result in deck changes, always include at the end:
1. Total add/cut list (cumulative for the session) — IF any swaps were applied
2. Final 100-card section tally — IF any swaps were applied
3. WotC Bracket assessment (1-5) with reasoning citing Game Changers count + key warping cards

Bracket reference: B1 Exhibition / B2 Core / B3 Upgraded (≤3 Game Changers) / B4 Optimized (unlimited GCs, fast mana, tutors) / B5 cEDH.

**Important: do NOT auto-apply swaps.** When user asks "what about X?" treat as evaluation request, not approval. Only apply when user says "add it", "do it", "apply", or similar explicit direction. Past mistake (2026-05-04): jumped to apply Rankle when user only asked for evaluation — had to revert.
