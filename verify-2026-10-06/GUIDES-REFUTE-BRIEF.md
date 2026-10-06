# Refute brief: Urza + Inspirit pilot guides (Opus, fresh context), 2026-10-07

**Goal.** Two guides were just written or rewritten. Decide, with evidence, whether every rules claim and every number in them is true. Never trust the authors' review files.

**Scope.**
- `.claude/skills/deck-building/reference/decks/urza-lord-high-artificer.md`. List: `verify-2026-10-06/urza-found/final-3.txt`. Author notes: `verify-2026-10-06/urza-found/REVIEW.md`.
- `.claude/skills/deck-building/reference/decks/inspirit-flagship-vessel.md`. List: `verify-2026-10-06/urza-found/inspirit-hotswap.txt`. Author notes: `verify-2026-10-06/inspirit-guide/REVIEW.md`.
- You may reuse the scratch copies of the CR and the oracle text in `verify-2026-10-06/urza-found/review/` and `verify-2026-10-06/inspirit-guide/`. Check any line you rely on against the DB:
  ```
  PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, power, toughness, oracle_text from cards where name = '…'"
  ```

**Priority.** Recompute the maths yourself, from the board each line states:
1. **Urza Line A:** 40 unblockable, N = 12. Line B: 21 to each opponent. Line C: 10 burn + 30 unblockable from 6 Whirler activations.
2. **Inspirit:**
   - Depthshaker: 68 trample, 136 with Blade Historian.
   - Cyberdrive → Repurposing Bay → Craterclaw: 146.
   - Hard-cast Craterclaw: 77, or 141 with Panharmonicon.
   - Arsenal + Boros Charm: 21 commander damage from 6 artifacts.
   - Lux Artillery: 28 counters.
   - Traxos 7 + Emry 1 = station 8 on T4.
3. **Per line, check:**
   - Summoning sickness (CR 302.6), timing ("as a sorcery", "until end of turn", "beginning of combat").
   - Whether each card used is actually in that list, and whether the stated mana is really available.
4. **Each quote.** Spot-check at least 25 quotes across both guides, word for word against the DB.
5. **The two new traps in the Inspirit guide:** the Final Showdown mode 1 trap, and Bay needing to have been controlled since the turn began.

**What may change.** Write only `verify-2026-10-06/GUIDES-REFUTE.md` plus scratch files under `verify-2026-10-06/guides-refute/`. Never edit the guides or the lists.

**What not to do.**
- No DB writes, no git, no paper-sync, no taskkill.
- Don't write a file named `report.md`.

**Output.** `GUIDES-REFUTE.md`, ≤ 80 lines:
- Verdict per guide first: PASS or FAIL.
- An errors table: guide, claim, what is true, source, severity, and the exact replacement text.
- The quotes you checked, as a count.

**Output limit.** Final reply ≤ 8 lines.

**Budget.** About 50 tool calls.
