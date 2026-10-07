# Build brief: one strong paper Gruul deck (two Opus builders, one per commander), 2026-10-07

**Goal.** The operator has two built paper R/G decks and wants **one strong Gruul deck** in their place.
- `decks/paper/decks/gilanra-alena-partners.txt`: Gilanra, Caller of Wirewood + Alena, Kessig Trapper (partners), big-creature ramp.
- `decks/paper/decks/bumi-unleashed.txt`: Bumi, Unleashed, an earthbend / land-creature / extra-combat deck built earlier in the app.

Each builder builds the strongest, most consistent 100-card list for **its assigned commander** from the merged pool. The orchestrator then compares the two lists for the operator.

**Your assignment** is in your prompt: COMMANDER = "Bumi, Unleashed" (folder `verify-2026-10-07/gruul/bumi/`) or "Gilanra, Caller of Wirewood + Alena, Kessig Trapper" (folder `verify-2026-10-07/gruul/gilanra/`). Write only in your folder.

**Inputs** (repo root `C:/Users/QuLeR/MTG-deck-builder`):
- **`verify-2026-10-07/gruul/pool.md`:** 534 cards with DB text.
  - `[GIL]`: in the Gilanra deck.
  - `[BUMI]`: in the Bumi deck.
  - `[FREE]`: in no deck; this includes the dismantled Omo precon.
  - Grep it, and sweep every role; never pre-filter it.
- **Prior work on the Gilanra side:** `verify-2026-10-07/alena-gilanra/consistency.txt`, `consistency-report.md` and `sim4.py` (a goldfish sim with both partners modelled; extend or adapt it). Note that it was built from a smaller pool: Bumi's cards were not available then.
- **Rules:** `.claude/skills/deck-building/SKILL.md` §2, `LEARNINGS.md` (read all of it), `reference/principles.md`, `reference/win-conditions.md`.
- **Oracle text:** `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, power, toughness, oracle_text from cards where name = '…'"`.
- **Rulings:** Scryfall or the current CR, never memory. Earthbend, extra combats, "Only land creatures can attack during that combat phase", and land creatures with summoning sickness all need to be checked, not assumed.

**Known facts.**
- **Commander text (DB):**
  - **Bumi, Unleashed** {3}{R}{G}: "Trample / When Bumi enters, earthbend 4. / Whenever Bumi deals combat damage to a player, untap all lands you control. After this phase, there is an additional combat phase. Only land creatures can attack during that combat phase."
  - **Gilanra:** "{T}: Add {G}. When you spend this mana to cast a spell with mana value 6 or greater, draw a card."
  - **Alena:** "First strike / {T}: Add an amount of {R} equal to the greatest power among creatures you control that entered this turn."
- **Illegal cards.** Three landscapes in the Bumi box have off-colour cycling costs and are illegal in R/G: Sheltering Landscape (GRW), Tranquil Landscape (GUW), Twisted Landscape (BGR). Never use them.
- **Ownership.** One physical copy per card, except where the pool lists more. Cards in other decks are not in the pool and stay there.
- **Land count.** The operator has the final say. Recommend one count with maths, and give a 36-land variant if yours differs by 2 or more.

**Metrics.** Compute every metric for **both current decks and your list**, over 20k+ games, with the same London-mulligan keep rule: 3–5 lands, or 2 lands plus a ramp piece.
- P(keep 7)
- P(4th land on T4)
- P(commander(s) cast on curve): Bumi by T5; Gilanra by T3 and Alena by T5
- P(screwed: < 4 mana sources at T5)
- P(flooded: > 8 lands seen by T8 with no sink)
- Average spells cast T1–8
- **Goldfish clock:** the median turn to deal 40 damage to one opponent, unblocked. State the attack model: earthbended land creatures, Bumi's extra combat and untap, and haste. Without blockers, combat damage on its own is fine.

**What to verify.**
- Swap table against your commander's current deck: Out → In → role → why, with DB quotes.
- Closers, with what each does on the turn you win.
- Colour sources against the pips.
- A stop proof per role.
- Synergy min/median.
- Gate:
  ```
  { printf 'Commander\n'; head -N L.txt; printf '\nDeck\n'; tail -n +(N+1) L.txt; } > "$TEMP/g.txt"
  MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
  ```
  N = 1 for Bumi, 2 for the partners.
- `py verify-2026-10-07/alena-gilanra/identity.py <list>` (checks R/G identity).
- Known false negatives: `plan` FAIL for earthbend decks, and `identity` FAIL for partners.

**What not to do.**
- No edits outside your folder. No DB writes, no paper-sync, no git, no taskkill.
- Never pre-filter or cap at top-N.
- No file named `report.md`.
- Don't touch the other builder's folder.

**Output format.**
- **`final.txt`:** 100 lines, commander(s) first.
- **`build-report.md`** (≤ 140 lines):
  - §1: the plan in 3 lines, plus the T1–3 / T4–6 / close shape.
  - §2: metrics table (Gilanra current, Bumi current, yours).
  - §3: swaps vs your commander's current deck.
  - §4: closers.
  - §5: colours and lands.
  - §6: stop proofs.
  - §7: gate.
  - §8: near-ties.
  - §9: one line per other legend in the pool that could beat your commander as the deck's commander (Halana and Alena, Partners; Amarant Coral; Toph; The Earth King; Selvala; Surrak; Moraug; Etali; Ruby; Roxanne; Ohran Frostfang), naming it only if you have a reason.

**Output limit.** Final reply ≤ 10 lines: the metrics row for your list vs both current decks, and the gate result.

**Budget.** About 80 tool calls. Write `final.txt` early and refine it.
