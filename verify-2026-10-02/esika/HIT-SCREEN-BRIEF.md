# Bridge-hit screen (one chunk per screener)

**Goal.** Screen every card in your chunk `verify-2026-10-02/esika/hits-pool-NN.md` as a candidate for an Esika // The
Prismatic Bridge superfriends deck (MTG Arena Historic Brawl, 1v1, 25 life, five colours). PASS the cards that could earn a
slot over the weakest kept card of their role. FAIL the rest silently.

**Why these cards.** The Prismatic Bridge: "At the beginning of your upkeep, reveal cards from the top of your library until
you reveal a creature or planeswalker card. Put that card onto the battlefield…". Each hit enters for free, so a hit's value
is what it does the moment it is on the battlefield: ETB, static, attack/upkeep triggers, and its loyalty abilities. Its
mana cost does not matter on the Bridge. It does matter when the card is drawn and has to be cast (38 creature/planeswalker
cards in a 99-card deck, about 15 drawn per game).

**Deck engine (credit cards that feed it).**
- Way of the Mentor: "Whenever you gain life, put a loyalty counter on each planeswalker you control."
- Way of the Paradox: "Whenever you activate a loyalty ability, you gain 1 life. You may play an additional land this turn."
- Liliana the Faultless: "Whenever another creature or planeswalker you control enters, you gain 1 life."
- Doubling Season.
- Proliferate (Tam, Evolution Sage, Flux Channeler).
- Esika makes legendary creatures tap for any colour.
- Win lines: Sarkhan the Masterless dragons, Craterhoof Behemoth, Elesh Norn, Terror of the Peaks, Bloodthirsty Conqueror + Marauding Blight-Priest / Dina.

**Weakest kept card per role (the bar to beat; quoted from final.txt cards).**
- Big Bridge hit / finisher: Archon of Sun's Grace ("Flying, lifelink / pegasus token per enchantment").
- Planeswalker: Chandra, Acolyte of Flame.
- Ramp body: Great Divide Guide ("Each land and Ally you control has '{T}: Add one mana of any color.'").
- Value/engine creature: Pia, Aether Ascetic (tutors an enchantment).

**PASS bar.** A card passes only if at least one holds:
- It wins or nearly wins the game the turn after it enters.
- It removes or neutralises an opponent's threat on entry.
- It is repeatable card or mana advantage.
- It meaningfully feeds the engine: life gain per event, loyalty, proliferate, counters.

Vanilla big bodies, tribal payoffs for tribes the deck doesn't run, and "needs N other cards" pieces FAIL.

**Output.** Write `verify-2026-10-02/esika/hit-screen-NN.md` (NN = your chunk number):
- First line: `screened <n>/<n>, passed <k>, last card read: <exact name of the last card in the chunk>`.
- Then one line per PASS: `- <Name> — <role> — "<quoted clause that earns it>" — beats <kept card> because <reason>`.
- Read the chunk to the last card. The last-card line is checked.

**Final message ≤ 5 lines:** the counts and the top 5 passes.

**Do not.** Edit any other file. No DB writes, no git. Use only the oracle text in the chunk.
