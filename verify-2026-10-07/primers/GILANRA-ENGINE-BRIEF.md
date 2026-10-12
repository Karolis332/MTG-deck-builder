# Build brief: Gilanra + Alena, engine-first (Opus builder), 2026-10-07

**Why this exists.** The operator asked why the big drops were being cut, since they fuel the engine.
- The two earlier passes cut 6+ MV spells from 46 to 31 for consistency:
  - `verify-2026-10-07/alena-gilanra/consistency.txt`
  - `verify-2026-10-07/gruul/gilanra/final.txt`
- Along the way they cut engine pieces: Paleoloth, Oblivion Sower, Etali, Primal Storm and Greenwarden of Murasa.
- That was wrong. The big drops **are** the engine:
  - **Gilanra** — "{T}: Add {G}. When you spend this mana to cast a spell with mana value 6 or greater, draw a card." Every 6-drop cast with her mana is a free card.
  - **Alena** — "First strike / {T}: Add an amount of {R} equal to the greatest power among creatures you control that entered this turn." A big creature landing makes the mana for the next one.

**Goal.** Build the strongest list that **keeps the big-drop engine**. Raise consistency only through:
- (a) better big drops in place of weaker big drops (vanilla bodies → ETB/cast value, cascade, recursion);
- (b) cheap ramp, fixing and draw in place of the weakest **non-engine** cards;
- (c) the land count.

Then write the primer.

**Inputs** (repo root `C:/Users/QuLeR/MTG-deck-builder`):
- Sleeved list: `decks/paper/decks/gilanra-alena-partners.txt`. Line 1 is Gilanra, line 2 is Alena.
- Pool: `verify-2026-10-07/gruul/pool.md`. Use **only** `[GIL]` and `[FREE]` cards. `[BUMI]` cards stay in the Bumi deck.
  - Grep the pool and sweep every role. Never pre-filter.
- Prior work (ideas only, re-verify everything):
  - `verify-2026-10-07/alena-gilanra/{final.txt,consistency.txt,consistency-report.md,REFUTE.md,sim4.py}`
  - `verify-2026-10-07/gruul/gilanra/{final.txt,build-report.md,sim5.py}`
- Rules: `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md` (all of it), `reference/principles.md`, `reference/win-conditions.md`.
- Oracle text: `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "…"`.
- Rulings: Scryfall or the current CR only.

**Constraints.**
- **Engine floor.** At least 40 spells with MV ≥ 6, unless the sim proves a lower count gives *more* Gilanra draws plus Alena chains per game; show that table if so.
- **Locked, never cut:** Paleoloth, Oblivion Sower, Etali, Primal Storm and Greenwarden of Murasa (all four are in the sleeved list). Name any other engine piece you lock.
- **Ownership:** one physical copy per card. Fury of Akoum and Moraug are in Tazri, so they are unavailable.
- **Land count:** recommend one count with Karsten maths, and give the 36- or 38-land variant if yours differs.

**Metrics.** Compute for the sleeved list, `consistency.txt` and yours. Use one sim (extend `sim4.py`), 20k+ games, and the London mulligan keep rule: 3–5 lands, or 2 lands plus ramp.
- P(keep 7) and P(4th land on T4)
- Gilanra by T3 and Alena by T5
- 6+ MV spells cast by T8
- **Gilanra draws per game by T8.** Count only the mana spent from Gilanra on MV ≥ 6.
- **Alena chain turns by T10:** turns where Alena's mana from an ETB creature casts another creature.
- Screwed (< 4 sources T5) and flooded (> 8 lands seen by T8)
- Goldfish clock: median turn to deal 40 to one opponent, unblocked.

**Verify.**
- **Swap table:** Out → In → role → why, with DB quotes.
- **Stop proof** per role: the best unused candidate vs the weakest kept card.
- **Gate:**
  ```
  { printf 'Commander\n'; head -2 L.txt; printf '\nDeck\n'; tail -n +3 L.txt; } > "$TEMP/g.txt"
  MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
  ```
  The `identity` FAIL for partners is a known false negative. Run `py verify-2026-10-07/alena-gilanra/identity.py <list>` instead.

**Then write the primer.** Follow `verify-2026-10-07/primers/PRIMER-BRIEF.md` (read it):
- `decks/paper/primers/gilanra-alena-partners.json` with `deck.list = "verify-2026-10-07/gilanra-engine/final.txt"` and status `proposed`.
- `primer-check` must PASS with `--base decks/paper/decks/gilanra-alena-partners.txt`.
- The primer's `metrics` table shows Sleeved vs Engine-first, with the Gilanra-draw and Alena-chain rows.
- The summary states the engine in one sentence.

**Not allowed.**
- Write only `verify-2026-10-07/gilanra-engine/*` and that one primer JSON.
- No DB writes, no git, no paper-sync, no taskkill.
- No file named `report.md`.

**Output.**
- `final.txt`: 100 lines, commanders first.
- `build-report.md` (≤ 120 lines): §1 plan, §2 metrics, §3 swaps, §4 stop proofs, §5 lands, §6 gate, §7 near-ties.

**Budget.** About 80 tool calls; write `final.txt` early. Final reply ≤ 8 lines: the metrics rows, gate, and primer-check.
