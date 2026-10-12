# Refute brief: one strong Gruul deck, Bumi vs Gilanra + Alena (Opus refuter, fresh context), 2026-10-07

**Goal.** Two Opus builders each built the strongest list for one commander from the same 534-card pool. The operator will keep only one of the two decks. You need to answer two questions with evidence:
- (a) Is each list correct: legal, owned, quotes true and maths true?
- (b) Which deck is stronger?

The builders used **different simulators**. Their numbers cannot be compared directly, so produce a fair head-to-head.

**Inputs** (repo root `C:/Users/QuLeR/MTG-deck-builder`, folder `verify-2026-10-07/gruul/`):
- `bumi/final.txt`, `bumi/build-report.md`, `bumi/final-36.txt`, and that builder's sim (`bumi/sim*.py`).
- `gilanra/final.txt`, `gilanra/build-report.md`, `gilanra/final-36.txt`, `gilanra/sim5.py`.
- `pool.md`: 534 cards with DB text. Its `[ILLEGAL]` tag on Earth Rumble is reportedly wrong; check it.
- The current decks: `decks/paper/decks/bumi-unleashed.txt` and `decks/paper/decks/gilanra-alena-partners.txt`.
- Rules:
  - `.claude/skills/deck-building/SKILL.md` §2
  - `LEARNINGS.md`
  - `reference/principles.md`
  - `reference/win-conditions.md`
- Oracle text: `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "…"`.
- Rulings: Scryfall or the current CR only. Check earthbend, Bumi's extra combat "Only land creatures can attack", and summoning sickness on land creatures that became creatures this turn (CR 302.6: a land that has been under your control since the start of the turn can attack).

**Check, with evidence.**
1. **Per list:**
   - Card count and singleton.
   - Colour identity: run `py verify-2026-10-07/alena-gilanra/identity.py <list>`.
   - Commander legality.
   - Ownership: one physical copy per card, unless `decks/paper/collection.txt` lists more. Cards in other decks (Tam, Tazri, Meren, Imotekh, Cabbage, Inspirit, Ramos, the Urza draft `verify-2026-10-06/urza-found/final-3.txt`) are not available.
   - Gate:
     ```
     { printf 'Commander\n'; head -N L.txt; printf '\nDeck\n'; tail -n +(N+1) L.txt; } > "$TEMP/g.txt"
     MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
     ```
     Use N = 1 for Bumi and N = 2 for the partners.
2. **Quotes and claims:** spot-check at least 20 DB quotes per report, word for word, plus each closer's "turn you win" claim.
3. **Fair head-to-head:**
   - Run **both** final lists (and both current decks) through **one** simulator. Either use one of the builders' sims after making it model both commanders correctly, or write a neutral one.
   - Use the same keep rule, the same number of games (20k or more) and the same clock definition: median turn to deal 40 to one opponent, unblocked. Report a blocker-sensitivity note too: what happens to each clock if one opponent chump-blocks the biggest attacker each combat.
   - Report keep 7, 4th land on T4, commander(s) on curve, screwed, flooded, spells T1–8, the clock median, and P(≤T6) and P(≤T7).
4. **Sim bugs:** review both sims for modelling errors that favour their own deck. Examples: tapped lands, summoning sickness, Alena's mana counting only creatures that entered this turn, Gilanra's draw needing her own mana spent on MV ≥ 6, Bumi needing to deal combat damage to a player.
5. **Missed swaps** in the winning list, if any, ranked.

**Not allowed.**
- Write only `verify-2026-10-07/gruul/REFUTE.md` and scratch files under `verify-2026-10-07/gruul/refute/`.
- No edits to the builders' files.
- No DB writes, no git, no paper-sync, no taskkill.
- No file named `report.md`.

**Output.** `REFUTE.md`, ≤ 120 lines, in this order:
- The verdict first: PASS/FAIL for each list, then **the recommended deck**, with the 3 decisive reasons.
- §1: errors table (list, claim, finding, source, severity).
- §2: the head-to-head metrics table, one simulator for all four lists.
- §3: the sim bugs found.
- §4: missed swaps.
- §5: the recommended final list's file name, plus any edits, written as `winner.txt` in the folder.

**Output limit.** Final reply ≤ 8 lines.

**Budget.** About 80 tool calls.
