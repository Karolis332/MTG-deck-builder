# Paper Inspirit, round 2: rebuild with the operator's corrections (2026-10-02)

Round 1 (`BUILD-BRIEF.md`, `build-report.md`, `REFUTE.md`) produced `inspirit-proposed.txt`. The operator rejected parts of it. Read BUILD-BRIEF.md: its commander text, inputs, pool marks, Tam rules, method, checks and "Do not" all still apply. This brief overrides it where they differ.

**Goal.** The strongest, most consistent version of the PAPER deck from owned cards, converged with a stop proof. Start from the **sleeved list** `inspirit-current.txt` (101 cards; nothing from round 1 is sleeved). Treat round 1's draft and refuter as prior work to challenge, not as a baseline.

**What the operator corrected (round 1 got these wrong):**
1. **Depthshaker Titan is the finisher, and it is LOCKED.** "When this creature enters, any number of target noncreature artifacts you control become 3/3 artifact creatures. Sacrifice them at the beginning of the next end step. / Each artifact creature you control has melee, trample, and haste." In a deck with ~40 artifacts, that is an artifact Craterhoof. Round 1 cut it as "backup plan only". Re-derive the win lines with Depthshaker as the main alpha strike, and value cards by what they add on the Depthshaker turn: cheap noncreature artifacts, artifact creature bodies, tokens.
2. **Cheap artifacts were under-weighted.** The operator named **Zookeeper Mechan** ({1}{R} Artifact Creature, "{T}: Add {R}. / {6}{R}: Target creature you control gets +4/+0 …") and **Lost Jitte** ({1} legendary Equipment with charge counters: "Untap target land" / "can't block" / "+1/+1 counter"). Zookeeper Mechan is NOT in the registered collection: evaluate it as IF-OWNED and mark it so. Give EVERY artifact in the pool with MV ≤ 2 a verdict line, IN or OUT with a reason.
3. **Better lands.** The operator owns better lands than round 1 used (rule: premium lands first, basics last). Give EVERY land in the pool a verdict line: open count, whether it enters untapped on turns 1–3, which colours it makes, and any utility. Examples of utility to weigh: Nesting Grounds ("{1}, {T}: Move a counter from target permanent you control onto a second target permanent"), Rogue's Passage, Reliquary Tower, Fabled Passage. Artifact lands count for Depthshaker and improvise/affinity, but they die to artifact wipes. Then re-derive the land count with Karsten (`.claude/skills/deck-building/reference/principles.md`).

**Unavailable:** Peter Parker's Camera (no longer owned; pool.md is stale on it), Walking Ballista (Cabbage's combo kill), Tezzeret, Master of the Bridge (black). Multi-copy cards: open = owned (`decks/paper/collection.txt`) − copies used in the other `decks/paper/decks/*.txt`.

**Round 1 errors not to repeat** (also read `.claude/skills/deck-building/LEARNINGS.md`):
- Count each synergy pair once.
- Gavel of the Righteous needs 6 counters for a one-hit 21 commander damage.
- Ornithopter of Paradise tops out at 2/4.
- Expansion Algorithm X=3 gets Reactor 14 → 20 only with Tekuthal.
- Proliferate refills any "remove a counter" cost.
- A symmetric wipe kills a stationed Inspirit, but Final Showdown's indestructible mode doesn't.
- Station may tap a creature cast this turn (CR 302.6).

**Method.** As in BUILD-BRIEF.md, with three mandatory per-card verdict sections (lands, artifacts with MV ≤ 2, finishers/payoffs) in addition to the per-role stop proof. Keep the land count and colour sources honest: Depthshaker is {5}{R}{R}.

**Output.**
- `verify-2026-10-02/inspirit/inspirit-proposed-2.txt`: 100 lines, commander first.
- `verify-2026-10-02/inspirit/build-report-2.md`, ≤ 260 lines:
  1. Plan and win lines.
  2. Health table (sleeved vs proposed).
  3. Swaps vs the **sleeved** list: Out | In | role | why (quote).
  4. Land verdicts.
  5. Verdicts for MV ≤ 2 artifacts.
  6. Stop proof per role.
  7. Gate lines.
- Write the report early and overwrite it as you go. Chat reply ≤ 15 lines.

**Do not.** Edit `decks/paper/`, run paper-sync, write to the DB, use git, taskkill or vitest. Budget ≤ 70 tool calls. Read pool.md in a few large chunks, not card by card.
