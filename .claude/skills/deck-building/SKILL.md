---
name: deck-building
description: Build, optimise, review or re-balance the operator's MTG decks (paper Commander or Arena Brawl). Covers placing new cards and precons, swaps between decks, checking a physical deck box against the app, and pilot guides (lines, mulligans). Use WHENEVER a deck list, a card pull, "optimise/upgrade/swap/what should I cut", a physical-deck check, or "how do I play this deck" comes up.
---

# Deck building — operator standard

Read `LEARNINGS.md` (this folder) first: it holds the operator's preferences and past corrections.
Theory and coaching live in `reference/`: principles, win conditions, lines and mulligans, plus per-deck pilot guides.

## 0. Ground truth
| Question | Source |
|---|---|
| Paper or Arena? | **Ask if unclear.** Never assume Arena. |
| Paper ownership | `decks/paper/collection.txt` + `decks/paper/decks/*.txt` (owned = max(listed, used across decks)). `open-cards.txt` is generated. |
| Arena ownership | DB `collection` rows with `source='arena'`, user 1 (Untapped CSV imports) |
| Oracle text | DB only: `py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, oracle_text from cards where name = '…'"` (set `PYTHONIOENCODING=utf-8`) |
| Owned pool for a commander | `npx tsx scripts/paper-pool.ts "<commander>" --mark K=list.txt,…` (truncates oracle at 110 chars: rebuild the full text from the DB for agents) |
| What is sleeved | The operator's word, or the check page below. The registry can be stale. |
| Strongest deck the collection can build / score + climb any list without AI | `scripts/collection-best-deck.ts` (CLI, sharded) and `scripts/model-lab.ts` (local page, `http://localhost:3210`): Deck Score + goldfish + role windows, swaps need `--epsilon` 0.25 gain. Model output is a candidate, never a verdict: refute dead cards, plan and closers by oracle text. |

## 1. Workflow
1. **Resolve and count.** Fix typos, resolve names against the DB (state any guesses), and count to 100 (Commander) or the format size.
2. **Gate** every list before showing it:
   `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <list> --format commander|brawl --owner 1 --source paper|arena`
   The gate needs `Commander`/`Deck` headers to see the commander. `plan` FAIL is a known false negative for superfriends, artifact and tutor commanders.
3. **Quick answer first:** a playable, gated list or the obvious swaps within minutes.
4. **Converged pass:** an Opus builder with the full pool, followed by a fresh-context Opus refuter. Deliver the result as a diff.
5. **Apply only after the operator confirms what is physically sleeved.**
   - Back up the DB first: `cp …/mtg-deck-builder.db …db.bak-<date>-<why>`.
   - Edit `decks/paper/decks/*.txt` and `collection.txt`.
   - Run `MTG_DB_DIR=… npx tsx scripts/paper-sync.ts` (`--dry` first when registering many cards).
   - Gate again.
6. **Check page:** `verify-2026-10-02/tam-precons/check-page.ts` → `decks/paper/deck-check.html` + Desktop copy. It shows image tiles by type, tap-to-tick, NEW/OUT rows and a text filter. To change which decks appear, edit only the deck slugs and baselines.
   **Primer:** every deck on the page gets `decks/paper/primers/<slug>.json` (schema `src/lib/deck-primer.ts`; writer brief `verify-2026-10-07/primers/PRIMER-BRIEF.md`): plan, engine and win-line flows, one reason per swap with verbatim quotes, keepers, mulligan. Gate it with `npx tsx scripts/primer-check.ts <json> --base <list the page diffs against>`, then a fresh Opus refuter (`REFUTE-BRIEF.md` there).
7. **Close out.**
   - Append a Session Log entry to `CLAUDE.md` and commit by pathspec.
   - Append learnings (§4).
   - For Arena, export through the `arena-import` skill.

## 2. Hard rules for every builder and refuter brief
- **Oracle exactness.** Every card claim quotes the DB text verbatim. Check timing words ("as a sorcery", "until end of turn"), "another"/"other", targets, counter types (+1/+1, charge, loyalty, oil), and "if you do" conditions. The refuter re-checks every quote.
- **Synergy density.** Score each card by how many cards in the final list it directly interacts with. A slightly weaker card with 3+ links beats a generically strong card with 0, except interaction, mana and draw, which are judged on efficiency. Report min/median and the 5 lowest.
- **One game plan.** One primary plan, at most one backup, and a T1–3 / T4–6 / close shape. Cards serving neither plan go.
- **Converge.** Swap the best candidate for the weakest kept card of its role until a full pass finds nothing better. A stop proof per role is mandatory. Never cap at top-N.
- **Never pre-filter the pool.** Colour identity and legality are the only filters. Give agents everything, sorted by relevance.
- **One physical copy per card.**
  - Moving a card between decks needs a backfill for the donor, and both sides must be stated.
  - Top-priority decks (Tam, Tazri) give cards only in trades that leave them at least whole.
  - Locks are never cut.
- **Ownership:** a precon counts as owned once it is physically in hand; register the full precon list. Card names from precon decklists are unconfirmed until hand-counted.
- **Mana maths** comes from `reference/principles.md`: Karsten's 99-card land formula, coloured-source table, and how to value rocks, dorks and conditional lands in a pod vs 1v1. Closers come from the checklist in `reference/win-conditions.md`. A deviation (e.g. the operator's 34-land Tam) is the operator's call; state the number once, then respect it.
- **Pilot guides:** `reference/decks/<slug>.md` covers plan, engine map, T1–T6 lines, keep/mulligan example hands, misplays and traps. Update a deck's guide whenever its list changes.

## 3. Output format
- Lead with the verdict.
- Swap tables: **Out → In → why** (with the source deck).
- ✅/⚠️/❌ for status.
- Name every open question once, at the end.
- Hand over the check page link for anything the operator has to sleeve.

## 4. Learn from every deck conversation
At the end of each deck task, and immediately when the operator corrects you or overrides a recommendation, append to `LEARNINGS.md`:
- `YYYY-MM-DD — <deck> — <what the operator decided or corrected> → <rule for next time>`
- Record evaluation mistakes too (e.g. "refuter undervalued Jace tokens as sacrifice fodder").

Keep it ≤ 150 lines. When it grows past that, fold repeated lessons into §2 and delete them from the log.
