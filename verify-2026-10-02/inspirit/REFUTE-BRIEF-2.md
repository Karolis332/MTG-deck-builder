# Refute: Inspirit round 2 (fresh context, 2026-10-02)

**Goal.** Decide whether `verify-2026-10-02/inspirit/inspirit-proposed-2.txt` is the strongest consistent build of the operator's PAPER Commander deck *Inspirit, Flagship Vessel* (UWR, 4-player pod) from owned cards. Find errors and missed swaps. You do not build; you verify.

**Inputs** (repo root C:/Users/QuLeR/MTG-deck-builder):
- Sleeved list: `verify-2026-10-02/inspirit/inspirit-current.txt` (101 cards).
- Proposal: `inspirit-proposed-2.txt`, with its reasoning in `build-report-2.md`.
- The operator's in-hand cards: `ADDENDUM-2B.md`, all batches 2b–2h. All of them are free for Inspirit. Batch 2h (the final 6) has no verdict anywhere yet: give each one a row in your missed-swaps check.
- Round 1's refute: `REFUTE.md`. Its findings were folded into round 2.
- Rules and past mistakes: `.claude/skills/deck-building/SKILL.md` §2 and `LEARNINGS.md`. Read both first.
- Pool: `pool.md`, which is stale. Ownership truth is `decks/paper/collection.txt` minus the copies used in other `decks/paper/decks/*.txt`.
- Oracle text from the DB only: `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, oracle_text from cards where name in (...)"`. Rulings: Scryfall API rulings or the current Comprehensive Rules (magic.wizards.com/en/rules). Never from memory.

**Operator locks and facts.**
- Depthshaker Titan is the main finisher and is locked.
- Walking Ballista belongs to Cabbage.
- Peter Parker's Camera is no longer owned.
- Everything Comes to Dust exiles artifacts and enchantments too.

**Check, in this order:**
1. **Every quote.** Each oracle quote in build-report-2.md must match the DB, including timing words, "another", targets and counter types.
2. **Every number.** Recompute:
   - Craterclaw Colossus damage.
   - The Improvised Arsenal "one-hit commander kill at 16 artifacts" claim.
   - The Depthshaker example board (~100 trample).
   - Lasting Tarfire's "7 repeatable sources".
   - The land simulation's assumptions. Read `landsim.py` and judge whether its model is fair: rocks, fetches, Path of Ancestry, tapped lands.
   - Karsten's land count.
3. **Rules claims.** For example: Chandra, Spark Hunter's 0 makes a "noncreature Vehicle artifact" (does it count for Depthshaker and Craterclaw?); station with summoning-sick creatures; commander damage from Improvised Arsenal / Super State; Lost Jitte's untap use.
4. **Missed swaps.** For every role, take the best card the build left out and compare it with the weakest card kept. This covers the operator's in-hand cards in ADDENDUM-2B (batches 2b–2h) and every open card in the pool. The screens `screen-2-1.md` and `screen-2-2.md` each give every left-out free card a verdict; rule on every CANDIDATE they list and spot-check 10 of their OUT verdicts. Pay special attention to:
   - Super State.
   - The walkers, especially Teyo's "You have hexproof".
   - Boros Charm and Flare of Fortitude as protection on the win turn.
   - Utility lands, which the build rejected on a sim cost of 2.6 points each. Is that sim cost real?
   - The Ways / Jace package.
   - Zookeeper Mechan.
5. **One plan.** State the primary and backup plans and the T1–3 / T4–6 / close shape. Flag any card that serves neither plan.
6. **Mana.** Count coloured sources against pips, with Depthshaker at {5}{R}{R} and Craterclaw at {4}{R}{R}{R}. Also check whether the three-colour base supports RRR.

**Output.** Write `verify-2026-10-02/inspirit/REFUTE-2.md`, ≤ 160 lines:
- Verdict line: CONVERGED or NOT CONVERGED.
- A swap table vs sleeved: `Out | In | KEEP/REJECT | DB-quoted reason`.
- A table of errors and fixes.
- Missed swaps, ranked: `In | Out | why`.
- The operator decisions still open.

Chat reply ≤ 10 lines.

**Do not.** Edit anything but REFUTE-2.md. No git, paper-sync, DB writes, taskkill or vitest. Budget ≤ 60 tool calls; batch the DB queries.
