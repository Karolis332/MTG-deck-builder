# Screen: free cards for the paper Tam deck (2026-10-03)

**Goal.** Give every card in your assigned file(s) one verdict row for the operator's paper Commander deck **Tam, the Possibility** (WUBRG superfriends, 4-player pod, 40 life). You screen; an Opus builder decides. Missing a strong card is the worst error; a generous MAYBE is cheap.

**Why the deck is being rebuilt (operator's words).** "Performed poorly… no clear wincon that I can follow or tutor for." The board got built but never closed; the walkers were attacked down; the deck ran out of cards. "We need to add more consistency and perhaps more protection for the planeswalker."

**The engine you are screening for** (from `.claude/skills/deck-building/reference/decks/tam-the-possibility.md`):
- Tam: "Planeswalker spells you cast cost {1} less" and "{W}{U}{B}{R}{G}, {T}: Proliferate X times, where X is the number of planeswalker types among planeswalkers you control".
- Way of the Paradox ("Whenever you activate a loyalty ability, you gain 1 life…") × Way of the Mentor ("Whenever you gain life, put a loyalty counter on each planeswalker you control"); 7 "Way of the …" enchantments that empower a Jace token and grant loyalty abilities.
- 21 planeswalkers, 34 lands, five colours.

**Roles** (pick the main one): `WIN` (a card that ends the game or is a piece of a kill: infinite combo, mass drain, alt-win, overrun, poison/proliferate finisher, extra turns) · `TUTOR` (finds a specific card: library search, walker/enchantment tutors, top-of-library) · `DRAW` (repeatable or burst card advantage) · `PROTECT` (keeps walkers alive: fogs, attack taxes like Propaganda/Ghostly Prison, blockers/token makers, hexproof/indestructible, counterspells, "can't attack you or planeswalkers you control", recursion of walkers) · `RAMP` · `REMOVAL` · `WIPE` · `PROLIF` (proliferate / counter doubling) · `LAND` · `OTHER`.

**Verdicts:** `CORE` (would be among the best ~10 cards in the deck) · `STRONG` (clearly playable, beats a weak slot) · `MAYBE` · `NO`.

**Inputs** (repo root C:/Users/QuLeR/MTG-deck-builder, folder `verify-2026-10-03/tam-wincon/`): your file(s) only. Every card there carries its DB oracle text; tags: `[ASSUMED FRA]` = probably owned, `[IF-OWNED FRA]` = owned only if the operator says yes, `[IN <deck>]` = sleeved in another deck (a move needs a backfill there).

**Rules.**
- Judge from the oracle text in the file, quoted verbatim in the reason. Check "another", "until end of turn", "as a sorcery", targets, "if you do".
- Read EVERY card to the last one. Do not skim by name.
- Two-card combos: if a card is half of an infinite or game-ending combo with any card you know is in Tam's colours, say so and name the partner (the builder checks ownership).

**Output.** Write `screen-<K>.md` (K given in your prompt), one Markdown table:
`| Card | Role | Verdict | Reason (DB quote, ≤ 25 words) |`
One row per card, in file order. Final line: `rows: <N>; last: <last card name>`. Chat reply ≤ 5 lines: counts per verdict and your top 5 CORE/STRONG.

**Do not.** Edit anything except your screen file. No git, DB writes, taskkill or vitest. Budget ≤ 25 tool calls.
