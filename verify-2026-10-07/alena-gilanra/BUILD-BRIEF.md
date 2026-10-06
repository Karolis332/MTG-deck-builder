# Build brief: Gilanra + Alena (paper, R/G partners), swap suggestions (Opus builder), 2026-10-07

**Goal.** The operator's sleeved deck is `decks/paper/decks/gilanra-alena-partners.txt`. Its first two lines are the partner commanders, Gilanra, Caller of Wirewood and Alena, Kessig Trapper; 100 cards in all. Find every swap from the operator's free card pool that makes the deck better at its own plan, and converge: keep swapping until a full pass finds nothing better. Deliver the result as a diff.

**Inputs** (repo root `C:/Users/QuLeR/MTG-deck-builder`, folder `verify-2026-10-07/alena-gilanra/`):
- `deck-oracle.md`: the current list with DB text.
- `pool.md`: 364 free R/G/colourless cards the operator owns that no other deck uses, with DB text. Grep it rather than reading it whole, but **every card must get a fair look**: sweep it role by role.
- Rules to follow: `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md` (read all of it), `reference/principles.md` (Karsten 99-card lands, valuing ramp), `reference/win-conditions.md`.
- Oracle text: `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, power, toughness, oracle_text from cards where name = '…'"`. Rulings come from Scryfall or the current CR, never from memory.

**Known facts.**
- **Commander text (DB):**
  - Gilanra: "{T}: Add {G}. When you spend this mana to cast a spell with mana value 6 or greater, draw a card."
  - Alena: "First strike / {T}: Add an amount of {R} equal to the greatest power among creatures you control that entered this turn."
  - The plan is big creatures: average MV 5.66, 62 nonland cards, 36 lands (18 Forest, 15 Mountain, Spinerock Knoll, Diamond City, Command Tower), 2 rocks and 1 dork.
- **Incumbents win near-ties.** This is the operator's own built deck: suggest a swap only if it is a clear improvement, and state why.
- **Land count.** The gate warns that 36 lands is short of Karsten's 45 ± 2 at this curve. Give your own land and ramp verdict with the maths. If you recommend a change, it is a proposal: the operator has the final say on land counts. Basics are unlimited.
- **Planetarium of Wan Shi Tong** is the operator's only copy. It is in this deck and also in the unsleeved Urza draft. Treat it as this deck's card and mention the conflict.
- **The gate reads only the first commander,** so its `identity` FAIL is expected. Check colour identity with `py verify-2026-10-07/alena-gilanra/identity.py <list>` instead.

**What may change.** Write only in `verify-2026-10-07/alena-gilanra/`:
- `quick.md`: write this **first, within about 15 tool calls**. List the 3–6 most obvious swaps, Out → In → one-line why, so the operator can start.
- `proposed.txt`: the 100-card list. The first two lines are the commanders, in `1 Name` format.
- `build-report.md`.

**What to verify.**
1. Each swap names the role it fills, with quotes of both cards. Cover ramp/fixing, draw, removal/interaction, protection, finishers and lands.
2. Synergy density: links to Gilanra's MV ≥ 6 draw, Alena's power-based mana, ETB value and fight. Report min/median and the 5 lowest.
3. Stop proof per role: the best unused pool card for each role, and why it loses.
4. Gate the proposed list:
   ```
   { printf 'Commander\n'; head -2 L.txt; printf '\nDeck\n'; tail -n +3 L.txt; } > "$TEMP/g.txt"
   MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
   ```
   Then run `identity.py`. `identity` and `plan` FAILs are false negatives here.

**What not to do.**
- No edits outside the folder. No DB writes, no paper-sync, no git, no taskkill.
- Never pre-filter the pool or cap at top-N.
- Don't use cards outside `pool.md` and the current list.
- Don't write a file named `report.md`.

**Output format.** `build-report.md` ≤ 130 lines:
- §1: the game plan in 3 lines, with the T1–3 / T4–6 / close shape.
- §2: the swap table, Out → In → role → why, with quotes.
- §3: the land/ramp verdict with maths.
- §4: stop proofs.
- §5: synergy.
- §6: the gate line.
- §7: near-ties left to the operator.
- §8: the Planetarium note.

**Output limit.** Final chat reply ≤ 10 lines: the number of swaps, the land verdict, and the gate result.

**Budget.** About 70 tool calls.
