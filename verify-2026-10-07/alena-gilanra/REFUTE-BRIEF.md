# Refute brief: Gilanra + Alena swap suggestions (Opus refuter, fresh context), 2026-10-07

**Goal.** Decide whether `verify-2026-10-07/alena-gilanra/proposed.txt` is converged and whether every claim in `build-report.md` is true. Find any swaps the builder missed. Never edit the builder's files.

**Inputs** (repo root `C:/Users/QuLeR/MTG-deck-builder`):
- **In `verify-2026-10-07/alena-gilanra/`:**
  - `proposed.txt`, `build-report.md`, `sim.py`, `synergy.py`.
  - `deck-oracle.md`: the sleeved list with DB text.
  - `pool.md`: 364 free R/G/colourless owned cards with DB text. Grep it; sweep it role by role.
  - `identity.py`.
- **Sleeved list:** `decks/paper/decks/gilanra-alena-partners.txt`.
- **Rules:** `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md`, `reference/principles.md`, `reference/win-conditions.md`.
- **Oracle text:** `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, power, toughness, oracle_text from cards where name = '…'"`.
- **Rulings:** Scryfall or the current CR only, never memory.

**Operator rules.**
- This is the operator's own sleeved deck, so incumbents win near-ties. A swap must be a clear improvement.
- The land count is the operator's call: the deck runs 36 now. Judge the builder's verdict on its maths.
- Planetarium of Wan Shi Tong stays in this deck.

**Check, with evidence.**
1. Every DB quote in `build-report.md`, word for word. Check timing words, "another"/"other", targets, "if you do" and "enters this turn" (Alena).
2. Each of the 11 swaps: KEEP or REJECT, with the reason. Ask whether the card cut was better at the deck's plan (Gilanra MV ≥ 6 draw, Alena power-based mana, big-creature finish) than the builder claims. Specifically:
   - Rorix Bladewing and Ruric Thar went out for Nature's Lore and Farseek.
   - Hoard-Smelter Dragon went out for Gigantic Big Bear.
   - Diamond City went out for Gruul Turf.
3. Recompute the numbers yourself:
   - The land/ramp maths (36 vs 38 vs Karsten).
   - The red-source count, 19 → 22.25, against the 24.6 needed for {3}{R}{R}{R}.
   - The sim deltas: re-run or review `sim.py` for bugs.
   - Synergy median 30 → 32.
4. Missed swaps: sweep the pool for ramp, draw, removal, protection, finishers and lands. For each closer, ask what it does on the turn you win.
5. Gate:
   ```
   { printf 'Commander\n'; head -2 L.txt; printf '\nDeck\n'; tail -n +3 L.txt; } > "$TEMP/g.txt"
   MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
   ```
   Then run `identity.py`. The `identity` and `plan` FAILs are expected false negatives.

**Not allowed.**
- Write only `verify-2026-10-07/alena-gilanra/REFUTE.md` plus scratch files under `verify-2026-10-07/alena-gilanra/refute/`.
- No DB writes, no paper-sync, no git, no taskkill.
- Don't write a file named `report.md`.

**Output.** `REFUTE.md`, ≤ 110 lines:
- Verdict first: CONVERGED or NOT CONVERGED.
- §1 errors table: claim, finding with source, severity, and whether it changes the list.
- §2 swap verdicts: one row per swap, 11 rows.
- §3 numbers re-checked.
- §4 missed swaps, ranked.
- §5 the final list after your changes, as `final.txt` in the folder, plus its gate line.

**Output limit.** Final reply ≤ 8 lines.

**Budget.** About 60 tool calls.
