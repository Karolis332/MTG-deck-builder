# Guide brief: Inspirit, Flagship Vessel pilot guide (Opus, fresh context), 2026-10-06

**Goal.** The deck has no pilot guide. Write a correct, visual one: card chips plus flow diagrams of the engine and the win lines. Every rules claim must be verified.

**Scope.**
- List: `verify-2026-10-06/urza-found/inspirit-hotswap.txt`. This is the sleeved paper list `decks/paper/decks/inspirit-flagship-vessel.txt` with one change: Urza, Lord High Artificer is out (he moves to the Urza deck) and Emry, Lurker of the Loch is in. The first line is the commander. UWR, 100 cards.
- Build history, for the reasons behind the cards: `verify-2026-10-02/inspirit/`.
  - `build-report.md`, `REFUTE.md` (round 1).
  - `build-report-2.md`, `REFUTE-2.md`, `ADDENDUM-2B.md` (round 2).
  - Session Log entries for Inspirit in `CLAUDE.md`.
- Existing guides, for depth and tone: `.claude/skills/deck-building/reference/decks/*.md`.

**What may change.**
- Write the guide to `.claude/skills/deck-building/reference/decks/inspirit-flagship-vessel.md`.
- Write the review notes to `verify-2026-10-06/inspirit-guide/REVIEW.md`.
- Put scratch files in that folder.

**What to verify.**
1. Every card claim quotes DB oracle text: `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, power, toughness, oracle_text from cards where name = '…'"`. Rules interactions get a CR number or Scryfall ruling, never memory. Known rulings from earlier rounds, to re-check rather than trust:
   - Station may tap summoning-sick creatures (CR 302.6).
   - Cyberdrive unattaches Equipment (CR 301.5c).
   - Cyberdrive → Repurposing Bay → Craterclaw/Depthshaker (CR 611.2a).
   - Proliferate refuels counters.
2. Emry, Lurker of the Loch replaces Urza. State what Emry does in this deck with its DB text: cost reduction per artifact, and casting artifacts from the graveyard. Note whether Urza's slot was doing something Emry can't, e.g. the artifact-mana engine. Recommendation only.
3. Win lines need exact maths: board, mana and damage. Tokens or copies made on the kill turn are summoning sick unless something gives haste. Depthshaker Titan is the operator's Craterhoof: quote it and do its maths.
4. Name every card the guide doesn't place in the engine, a win line, interaction or mana. The operator wants no dead cards. Recommendation only; the list does not change.

**What not to do.**
- No edits to deck lists, check-page.ts, collection files or other guides.
- No DB writes, no paper-sync, no git, no taskkill.
- Don't write a file named `report.md`.

**Output format.** The guide follows `verify-2026-10-06/GUIDE-FORMAT.md`, ≤ 150 lines, in this order:
1. Plan in one line, with an engine flow.
2. How Inspirit works (station, flying threshold), with a flow.
3. Win conditions table with chips.
4. Win lines, each a `=> ` flow with maths.
5. Engine map, with key interactions as flows.
6. Interaction and protection.
7. T1–3 / T4–6 / close shape.
8. Pilot rules and traps.
9. Mulligan.

`REVIEW.md` ≤ 50 lines: rulings checked, the Emry note, and cards with no role.

**Output limit.** Final chat reply ≤ 8 lines.

**Known facts.**
- Read `.claude/skills/deck-building/SKILL.md` §2 and `LEARNINGS.md`; the Inspirit entries matter.
- The operator's picks are final: 38 lands in round 2, Depthshaker stays, Lost Jitte + Zookeeper, Repurposing Bay.
- Budget: about 60 tool calls.
