# Review brief: Urza pilot guide, rules check + visual rewrite (Opus, fresh context), 2026-10-06

**Goal.** The operator asked to "review them, use card icons and diagrams on how this works". Make the Urza guide correct, then rewrite it as a visual guide with card chips and flow diagrams.

**Scope.**
- Guide: `.claude/skills/deck-building/reference/decks/urza-lord-high-artificer.md`.
- List it describes: `verify-2026-10-06/urza-found/final-3.txt`. The first line is the commander. It has 100 cards and 35 lands; the lands are 30 Islands plus 5 utility lands, and Sink into Stupor is the only MDFC.

**What may change.**
- Rewrite the guide file in the format of `verify-2026-10-06/GUIDE-FORMAT.md`.
- Write the review to `verify-2026-10-06/urza-found/REVIEW.md`.
- Put scratch files under `verify-2026-10-06/urza-found/review/`.
- The list itself does not change. Report any list problem in REVIEW.md only.

**What to verify.** Check every rules claim against DB oracle text (`PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, power, toughness, oracle_text from cards where name = '…'"`) and against Scryfall rulings or the current Comprehensive Rules. Never rely on memory. The orchestrator suspects these errors:
1. **Line A.** Tokens and copies made on the kill turn are summoning sick (CR 302.6). The new Worldwalker Helm copy and the Ember Island Production copy can't attack that turn unless something gives them haste. Redo Line A so that only creatures controlled since the start of the turn attack. Define the board exactly: what is on the battlefield, what counts as an artifact, and the mana spent. Recompute the damage.
2. **Sun Quan.** The guide says "cast the turn before (no haste)". Horsemanship is a static grant, so Sun Quan's own summoning sickness doesn't matter. Check the card text and the horsemanship rule (CR 702.31), then fix the line and the pilot rule.
3. **Remaining claims.** Re-check every one:
   - Super State: the base 9/9 plus the Construct's +N layering, haste, "each other opponent", and the N ≥ 11 → 20 maths.
   - The Fleshraker + kicked Rite on Whirler Rogue count. Whirler copies are blue, not colourless. Find out which tokens actually trigger Fleshraker.
   - Worldwalker Helm Maps: one per creation event.
   - Rite on Urza vs on the Construct.
   - Legend rule vs the copy's ETB trigger.
   - Tapping summoning-sick artifact creatures for Urza's "Tap an untapped artifact you control" and for Whirler's "Tap two untapped artifacts".
   - Mycosynth Gardens: "becomes" a copy, so no ETB. Check the MV of each target it names.
   - Kuruk waterbend {20}.
   - Karn +1: which Karn it is, and whether the animated artifacts can attack.
   - Ghostly Flicker targets.
   - Bident with non-combat damage.
   - Traxos untap.
   - Unstoppable Plan, Katara's Reversal, Padeem, Soul of New Phyrexia + Fulcrum.
   - The mulligan percentages.
4. **Cards the guide misses.** For every card in final-3 the guide never mentions, add a one-line role or name it in REVIEW.md. The operator wants no dead cards, so any card that serves neither the engine nor a win line nor interaction must be named.

**What not to do.**
- No edits to final-3.txt, check-page.ts, collection files or other guides.
- No DB writes, no paper-sync, no git, no taskkill.
- Don't write a file named `report.md`.

**Output format.**
- The guide (≤ 150 lines) keeps its sections, in this order:
  1. Plan in one line, with an engine flow.
  2. Win conditions table with chips.
  3. Win lines, each with a `=> ` flow and exact maths.
  4. Copy targets table with chips, plus 2–3 flows for the best copy chains.
  5. Engine map.
  6. Pilot rules.
  7. Mulligan.
- `REVIEW.md` (≤ 70 lines): verdict first. §1 is the errors table (claim, what is true, source, severity). §2 covers each card with no role. §3 covers anything that would change the list (recommendation only).

**Output limit.** Final chat reply ≤ 10 lines: the verdict, the error count, and the files written.

**Known facts.**
- Read `.claude/skills/deck-building/SKILL.md` §2 and `LEARNINGS.md`; the Urza entries matter.
- Build context is in `verify-2026-10-06/urza-found/` (`build-report.md`, `REFUTE.md`, `refute/final-2-oracle.md` = DB text of the earlier list).
- Operator decisions are final:
  - 35 lands.
  - River's Rebuke and Traxos stay.
  - The Echoverse Fulcrum is locked.
  - No Sol Ring and no Rogue's Passage (not owned).
- Budget: about 60 tool calls.
