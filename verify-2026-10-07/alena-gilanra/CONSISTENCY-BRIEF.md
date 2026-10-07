# Build brief v2: Gilanra + Alena, consistency pass (Opus builder), 2026-10-07

**Goal.** The operator asked: "is there nothing to do to make the deck more consistent?" The first pass (`final.txt`, 13 swaps) only made clear improvements, and incumbents won near-ties. **The objective has now changed: maximise consistency.** That means every game should:
- hit its land drops,
- cast a 6+ MV threat on turn 5–6 with Gilanra or Alena helping,
- keep drawing gas,
- rarely mulligan, get stuck, or flood.

Rebuild from `final.txt` and converge under this objective.

**Inputs** (repo root `C:/Users/QuLeR/MTG-deck-builder`, folder `verify-2026-10-07/alena-gilanra/`):
- **Baseline:**
  - `final.txt` (the refuted list).
  - `REFUTE.md` §4: its near-ties were rejected only because the incumbent won ties. Re-judge them under the new objective: Domri, a third dual, Studious First-Year, Cultivate/Three Visits, Harmonize, Hunter's Insight, Lumra, Rocky Rebuke.
  - `build-report.md`.
- **Pool:** `pool.md` (364 free R/G/colourless owned cards with DB text) and `deck-oracle.md`. Sweep every role: ramp, rocks, dorks, land tutors, creature tutors, card draw, card selection, cost reducers, recursion, lands.
- **Sim:** `refute/sim3.py` (goldfish, both commanders modelled). Extend it, don't replace it. Model it with:
  - Any new card kinds you add.
  - Mulligans (London; keep 7s with 3–5 lands, or 2 lands + a ramp piece).
  - A **flood** metric: lands in hand plus lands on the battlefield beyond 8 by turn 8.
- **Rules:** `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md`, `reference/principles.md`, `reference/win-conditions.md`.
- **Oracle text:** `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "…"`.
- **Rulings:** Scryfall or the current CR only.

**Metrics.** Report each one for the sleeved list, `final.txt` and your list, from 20k+ games each:
- P(keep 7)
- P(4th land on T4)
- P(6+ MV threat cast by T5) and by T6
- Average spells cast T1–8
- P(screwed: < 4 mana sources by T5)
- P(flooded)
- Average cards drawn beyond the natural draw by T8

**Constraints.**
- **Threat density.** Keep enough real closers that the deck still wins once it has mana. State the closer count and argue for it; each closer must actually win games. Cut the weakest fatties first: vanilla bodies with no ETB, no evasion and no other link.
- **Lands.** Test 36, 37, 38 and 39 lands plus ramp combinations. Recommend the best by the metrics. The operator has the final say, so present 36 and your best count as two options if they differ.
- **Colours.** Red and green sources must stay at or above the {R}{R}/{G}{G} needs. Recount after every swap; the first pass got this wrong.
- **Pool only.** Use only cards from `pool.md` or the current list. One copy per card. Planetarium stays.
- **Partners.** The gate reads only the first commander. Use `identity.py` for colour identity.

**What may change.** Write only in this folder:
- `consistency.txt`: 100 cards, first two lines the commanders.
- `consistency-report.md`.
- Scratch: `sim4.py` etc.

**What to verify.**
- Swap table: Out → In → role → metric gained, with DB quotes of both cards.
- A stop proof per role.
- Synergy min/median.
- The gate on `consistency.txt`:
  ```
  { printf 'Commander\n'; head -2 L.txt; printf '\nDeck\n'; tail -n +3 L.txt; } > "$TEMP/g.txt"
  MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
  ```
- `identity.py`.

**What not to do.**
- No edits outside the folder.
- No DB writes, no paper-sync, no git, no taskkill.
- No top-N cap.
- No file named `report.md`.

**Output format.** `consistency-report.md`, ≤ 140 lines:
- §1: metrics table (sleeved / final / yours, plus the land options).
- §2: swaps vs `final.txt`.
- §3: closer list and threat density.
- §4: colours.
- §5: stop proofs.
- §6: gate.
- §7: near-ties.

**Output limit.** Final reply ≤ 10 lines.

**Budget.** About 80 tool calls. Write `consistency.txt` early and refine it.
