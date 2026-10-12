# Primer brief: deck primers for the deck-check page (2026-10-07)

**Goal.** Write a primer for each paper deck on the deck-check page. A primer:
- explains how the deck wins;
- justifies **every** change shown on the page, with each cut and each add given a reason;
- explains why the obvious cuts stay.

The operator reads it while sleeving and while playing. The same JSON will later feed the Black Grimoire app, so it must be exact.

**Format.** One JSON file per deck at `decks/paper/primers/<slug>.json`.
- **Schema:** `src/lib/deck-primer.ts` (zod). Read the field comments.
- **Renderer:** `verify-2026-10-02/tam-precons/check-page.ts` (`primerHtml`).
- **Card images:**
  - Commanders, win pieces, swap pairs, phase cards and keepers render as card images.
  - In any text field, `[[Exact Card Name]]` renders as a card chip with an image. Use it for every card you mention in prose.
  - A `flow` is a 2–7 step diagram. Each step is a short phrase, ideally one `[[Card]]` plus ≤ 8 words, e.g. `"[[Alena, Kessig Trapper]] taps for 7"`.
- **Card names:** card fields hold exact DB names, using the front face for double-faced cards.

**Content rules.**
1. **Oracle text from the DB only.** Use
   `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, oracle_text from cards where name = '…'"`.
   - `quoteOut` / `quoteIn` are verbatim DB text: the clause that decides the swap, not the whole card.
   - Rules claims cite the CR or a Scryfall ruling.
2. **Every swap reason** says what the cut card fails to do in *this* deck and what the added card does better, concretely: mana, turn, card count, synergy links, or a sim number with its source file.
   - Each reason is 1–3 sentences. No "solid card", no "upgrade", no adjectives without a fact.
   - Take the reason from the deck's build/refute reports when one exists. Cite the file in `evidence`, e.g. `"REFUTE.md row 7; sim4 keep7 .81 → .86"`. Check it against the DB before copying.
   - If a report's reason is wrong, write the correct one and note it in your reply.
3. **Win conditions.**
   - `pieces`: the cards on the battlefield or cast that turn.
   - `flow`: the sequence.
   - `damage`: the maths, e.g. `"8 trample × 2 combats + 3 = 19 per opponent"`.
   - `turn`: the realistic turn, with its source if simulated.
   - Rank them: primary first, then the backup.
   - No win line that needs a card not in the list.
4. **Phases:** the T1–3, T4–6 and close plan, with the 3–8 most important cards of each phase.
5. **Engine:** the 2–5 interactions that make the deck work, each as a flow.
6. **Keepers:** the 4–10 cards a reader would cut first (high MV, odd, slow), and why each stays. Use the operator's locks and the near-ties from the reports.
7. **Metrics:** only numbers that come from a sim or a report, with the source in `metrics.note`. Columns: `["Metric", "<base label>", "<list label>"]`.
8. **Mulligan:** 3–5 keep patterns and 3–5 mulligan patterns, specific to the deck.
   **Pilot rules:** at most 8 rules: sequencing, what to hold, and the traps.
9. **Sources** (`sources`): the repo files you used.
10. **Style.** Plain English, short sentences, numbers over adjectives. No emojis. Say "the operator", never a gendered pronoun.

**Verify, and loop until PASS.**
```
MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/primer-check.ts decks/paper/primers/<slug>.json --base <base list>
```
It checks:
- the schema;
- that every name is in the DB;
- that every IN is in the list and every OUT has left it;
- that win pieces, keepers and phase cards are in the list;
- and, with `--base`, that **every** card changed between base and list has a swap entry. Basics changed by count need an entry too.

Where a cut has no replacement (base was short of 100), use `out: null` or `in: null`.

**Known facts.**
- **Paper ownership:** `decks/paper/collection.txt` + `decks/paper/decks/*.txt`. The registry can be one card stale:
  - Tam's box holds Lifecrafter's Bestiary, which is not in the Tam file.
  - Tazri's box holds Moraug, Fury of Akoum, which is not in the Tazri file.
  - Do **not** edit registry files. Name such gaps in your reply.
- **Rules and learnings:**
  - `.claude/skills/deck-building/SKILL.md` §2
  - `.claude/skills/deck-building/LEARNINGS.md`
  - `.claude/skills/deck-building/reference/{principles,win-conditions,lines-and-mulligans}.md`
  - Existing pilot guides: `.claude/skills/deck-building/reference/decks/<slug>.md`. Reuse their content, and fix it where it is wrong.
- **Session Log** at the bottom of `CLAUDE.md`: the decision history per deck, i.e. the operator's choices and why.

**Not allowed.**
- No edits to `decks/paper/decks/*`, `collection.txt`, the DB, `check-page.ts`, `deck-primer.ts`, or other agents' primers.
- No git, no paper-sync, no taskkill.
- No file named `report.md`.

**Output limit.** Final reply ≤ 8 lines:
- `primer-check` result per deck;
- report errors you corrected;
- registry gaps;
- anything you could not justify.
