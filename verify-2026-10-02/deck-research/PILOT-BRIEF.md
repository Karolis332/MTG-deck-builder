# Pilot guides for the operator's paper Commander decks (2026-10-02)

**Goal.** For each deck assigned to you, write a pilot guide the operator can use at the table: what the deck is trying to do, the lines to visualise, the hands to keep and avoid, and the misplays to avoid. Format: 4-player paper pod, 40 life.

**Inputs** (repo root C:/Users/QuLeR/MTG-deck-builder):
- Deck lists: `decks/paper/decks/<slug>.txt`. The first line is the commander. These are the physically sleeved lists.
- Oracle text: ALWAYS quote from the DB, never from memory:
  `PYTHONIOENCODING=utf-8 py verify-2026-10-02/sisay/q.py "select name, mana_cost, type_line, oracle_text from cards where name = '...'"`
  For many cards at once: `... where name in ('A','B',...)`.
- Prior analysis, if present: `verify-2026-09-28/deck-audit/<slug>-report.md`, `-fable-review.md`, and `verify-2026-10-02/tam-precons/REFUTE.md`.
- For rulings on tricky interactions (e.g. Way of the Mentor × Way of the Paradox, proliferate on tokens, Station), use Scryfall rulings or the Comprehensive Rules via the web. Cite the URL.

**Per deck,** write `verify-2026-10-02/deck-research/decks/<slug>.md` (≤ 140 lines):
1. **Plan in 3 lines**, plus win lines ranked by frequency. Quote each closer's oracle text.
2. **Engine map:** the 5–10 key interactions, with quoted text and why they work. Flag any interaction that does NOT work the way it looks.
3. **Turn-by-turn ideal line,** T1–T6, and a realistic line with an average hand.
4. **Mulligan guide:**
   - Keep criteria (lands, ramp, engine pieces).
   - 3 example keepable hands and 3 example hands to mulligan, built from cards actually in the list, each with a one-line reason.
5. **Lines to visualise each turn:** what to hold up, when to deploy the engine, when to wipe, how to protect the win turn, threat assessment cues for this deck.
6. **Misplays to avoid:** concrete and deck-specific.
7. **Weak spots:** what beats this deck, and how to play around it.

**Rules.**
- Every card claim is quoted from the DB.
- Example hands use only cards from the list.
- Tables and bullets, not prose.

**Do not.** Edit anything outside `verify-2026-10-02/deck-research/decks/`. No git, no DB writes. Budget ≤ 60 tool calls.

**Chat reply** ≤ 10 lines. If the harness blocks a write, put the content in the reply.
