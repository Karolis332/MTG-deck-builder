# Refute brief: Arena Standard R/G Ways + walkers, 2026-10-06 (Opus refuter, fresh context)

**Goal.** Decide whether `verify-2026-10-06/rg-ways/final.txt` is converged and every claim in `build-report.md` is true. Find missed swaps. Never edit the builder's files.

**Inputs** (repo root `C:/Users/QuLeR/MTG-deck-builder`, folder `verify-2026-10-06/rg-ways/`): `input.txt` (operator), `quick-v1.txt`, `final.txt`, `build-report.md`, `BUILD-BRIEF.md` (ownership facts), `model*.json`, `alt/` (builder's scored alternatives), pool `verify-2026-10-05/ghalta/pool.md` (1,284 owned cards with DB text; grep, don't read whole). Rules: `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md`, `reference/principles.md`. Oracle text from pool.md or `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "<sql>"`. Rulings from the Scryfall API or the current CR (magic.wizards.com/en/rules), never memory.

**Check, with evidence per item.**
1. Every DB quote in build-report.md, word for word (timing, "another", targets, counters, "if you do").
2. Every number: Karsten (`src/lib/land-math.ts`), colour sources, T1 untapped G, curve/avg MV, Craterclaw X (artifacts) vs Craterhoof X (creatures) by T7, the Demon discard odds, the Emrakul T6/T7 mana lines, and the model scores (re-run: `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx verify-2026-10-06/rg-ways/run-model.ts <list>`).
3. The unverified rule the builder flagged: does mana stay in the pool across a loyalty-ability activation inside one main phase? Cite the CR rule number and text. Say which line (T6 or T7) it changes.
4. Ownership and legality of every card the builder added, Craterhoof Behemoth and Tyvar, the Pummeler especially: the pool's owned count, the gate, Standard legality in the DB.
5. Each cut of the operator's cards (Craterclaw ×3, Puppetbeast, Aerid, Tethermage, Grab, Bushwhack, Capstone, Passage, 2nd Emrakul, 3rd Paradox): KEEP or REJECT, with the reason. The operator chose the artifact/Craterclaw direction on purpose, so the bar for reversing it is a concrete arithmetic win, not taste.
6. Missed swaps: sweep the pool by role (lands, dorks, Ways, walkers incl. every 0/+ ability, threats/closers, interaction, card flow). Walk "what does it do on the turn I win?" for each closer. Rank any swap you find.
7. Gate: `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-10-06/rg-ways/final.txt --format standard --owner 1 --source arena`. Expected ownership FAILs: Curse-Marred Demon, Emrakul.

**Not allowed.** No edits to final.txt or build-report.md; write only `REFUTE.md` and scratch lists in `verify-2026-10-06/rg-ways/refute/`. No DB writes, no git, no taskkill.

**Output.** `REFUTE.md` ≤ 110 lines: verdict (CONVERGED / NOT CONVERGED) first; §1 errors table (claim, finding with source, severity, changes the list?); §2 numbers re-checked; §3 cut verdicts; §4 missed swaps ranked with model scores; §5 the list after your swaps (if any) with its gate line. Final chat reply ≤ 10 lines. Budget: about 60 tool calls.
