# Refute brief: paper Urza rebuild, 2026-10-06 (Opus refuter, fresh context)

**Goal.** Decide whether `verify-2026-10-06/urza-found/final-2.txt` (100 cards; commander Urza, Lord High Artificer on the first line; `31 Island`-style counts allowed) is converged and every claim in `build-report.md` is true. Find missed swaps. Never edit the builder's files.

**Inputs** (repo root `C:/Users/QuLeR/MTG-deck-builder`):
- `verify-2026-10-06/urza-found/`: `final-2.txt`, `build-report.md`, `gate-final-2.txt`, `synergy.py`, `pool.md` (315 free mono-U/colourless cards with DB text; tags [FOUND] = 109 cards the operator located today, [IN 10-02 DRAFT]; grep it, don't read it whole), `found-all.md`.
- Baseline: `verify-2026-10-02/urza/final.txt`, `build-report.md`, `REFUTE.md`, `verdicts.md`.
- Rules: `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md` (the Urza and Inspirit entries matter), `reference/principles.md` (Karsten 99-card), `reference/win-conditions.md`. Oracle text: pool.md or `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "<sql>"`. Rulings: Scryfall API or the current CR, never memory.

**Operator constraints (hard).**
- **Lock:** The Echoverse Fulcrum must stay in.
- **Unavailable** (not located): Sol Ring, Cityscape Leveler, Entrancing Melody, Perplexing Test, Emeritus of Ideation. None may be in the list. Emeritus may be named only as a later swap-in.
- **One physical copy per card.** Ownership = `decks/paper/collection.txt` minus `decks/paper/decks/*.txt`. Ingenious Prodigy and Traxos, Scourge of Kroog have a found second copy. Urza hot-swaps from the Inspirit box (Emry takes its Inspirit slot).

**Check, with evidence per item.**
1. Every DB quote in build-report.md, word for word. Check timing words, "another"/"other", targets, counters, "if you do", and Enchant lines.
2. Every number: land count vs Karsten (recompute; the report says 38 + Sink against 38.7–40), curve/avg MV, the synergy min/median, The Lord of the Eagles' realistic cost, Distant Melody's draw count by creature type, Finale X ≥ 10 mana. Give your own land verdict: does the list need land 39, and which card goes?
3. The Fulcrum line: Soul of New Phyrexia "{5}" indestructible + Fulcrum = a one-sided wipe (quote both cards; check that the Fulcrum's exile-as-cost doesn't break it).
4. Each of the 20 swaps: KEEP or REJECT, with the reason. The near-ties marked ⚠️ get a firm verdict.
5. Every [FOUND] card's OUT verdict: does the named winner really beat it? Spot-check at least the 25 strongest OUT cards (clones, artifact makers, Gearhulk-tier threats, cheap interaction).
6. Missed swaps: sweep the 315-card pool by role (mana rocks, artifact makers, Urza payoffs, draw, interaction, closers, lands). Ask "what does it do on the turn I win?" for each closer. Rank any swap you find.
7. Gate: `{ printf 'Commander\n'; head -1 L.txt; printf '\nDeck\n'; tail -n +2 L.txt; } > "$TEMP/g.txt"` then `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper`. `plan` FAIL is the known false negative.

**Not allowed.** No edits to final-2.txt, build-report.md or the pool. Write only `verify-2026-10-06/urza-found/REFUTE.md` (if a hook blocks that name, return the report inline) and scratch files under `verify-2026-10-06/urza-found/refute/`. No DB writes, no paper-sync, no git, no taskkill.

**Output.** `REFUTE.md` ≤ 120 lines: verdict (CONVERGED / NOT CONVERGED) first; §1 errors table (claim, finding with source, severity, changes the list?); §2 numbers re-checked, including the land verdict; §3 swap verdicts (20 rows); §4 missed swaps, ranked; §5 the list after your swaps, with its gate line. Final chat reply ≤ 10 lines. Budget: about 70 tool calls.
