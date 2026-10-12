# Brief: paper Bumi, Unleashed, standalone fix plus primer (Opus), 2026-10-07

**Goal.** The operator built this deck and sleeved it: `decks/paper/decks/bumi-unleashed.txt`, Bumi on line 1. Keep it as the operator's deck. Change only what is wrong or clearly beaten, then write its primer.

**Required fix.** Three landscapes are illegal in R/G (off-colour cycling costs). Replace each with the best owned option:
- Sheltering Landscape (GRW)
- Tranquil Landscape (GUW)
- Twisted Landscape (BGR)

**Optional upgrades.** Use `[FREE]` cards from `verify-2026-10-07/gruul/pool.md` only.
- Do not take `[GIL]` cards; the Gilanra deck stays whole.
- A swap qualifies only when the added card is clearly better in this deck: a measurable sim gain, or 2+ more synergy links at equal or better efficiency.
- Mark such swaps `"verdict": "optional"`. The 3 land fixes are `"recommended"`.
- Converge: a stop proof per role. Never cap at top-N, and never pre-filter the pool.

**Inputs.**
- **Commander:** Bumi, Unleashed {3}{R}{G}, with DB text: "Trample / When Bumi enters, earthbend 4. / Whenever Bumi deals combat damage to a player, untap all lands you control. After this phase, there is an additional combat phase. Only land creatures can attack during that combat phase."
- **Earlier analysis, re-verified, ideas only:**
  - `verify-2026-10-07/gruul/bumi/{build-report.md,final.txt,sim*.py}`. That build used `[GIL]` cards; you may not.
  - `verify-2026-10-07/gruul/refute/rulings.txt`.
- **Rules:**
  - Earthbend, the extra combat, "Only land creatures can attack", and land creatures that became creatures this turn (CR 302.6).
  - Check each one against the CR or Scryfall, never memory.
- **Deck-building references:** `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md`, `reference/principles.md`, `reference/win-conditions.md`.
- **Oracle text:** `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "…"`.

**Metrics.** Compute for the sleeved list and yours, over 20k+ games with the London keep rule: 3–5 lands, or 2 lands plus ramp.
- P(keep 7)
- P(4th land on T4)
- Bumi by T5
- Screwed (< 4 sources at T5)
- Flooded
- Goldfish clock: median turn to 40 to one opponent unblocked, with the attack model stated
- The clock with one chump-blocker per combat

**Verify.**
- Gate, with N = 1:
  ```
  { printf 'Commander\n'; head -1 L.txt; printf '\nDeck\n'; tail -n +2 L.txt; } > "$TEMP/g.txt"
  MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
  ```
  `plan` FAIL is a known false negative for earthbend.
- `py verify-2026-10-07/alena-gilanra/identity.py <list>` must pass.

**Then write the primer.** Follow `verify-2026-10-07/primers/PRIMER-BRIEF.md` (read it):
- `decks/paper/primers/bumi-unleashed.json`
- `deck.list = "verify-2026-10-07/bumi-standalone/final.txt"`, status `proposed`
- `primer-check` PASS with `--base decks/paper/decks/bumi-unleashed.txt`
- Win conditions must show the extra-combat maths: land creature power × combats, with Bumi's untap.

**Not allowed.**
- Write only `verify-2026-10-07/bumi-standalone/*` and that primer JSON.
- No DB writes, git, paper-sync or taskkill.
- No file named `report.md`.

**Output.**
- `final.txt`: 100 lines, commander first.
- `build-report.md` (≤ 100 lines): plan, metrics, swaps, stop proofs, gate.
- Final reply ≤ 8 lines.

**Budget.** About 70 tool calls.
