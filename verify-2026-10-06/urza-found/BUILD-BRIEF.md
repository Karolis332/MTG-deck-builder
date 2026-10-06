# Build brief: place the operator's found cards in the paper Urza deck, 2026-10-06 (Opus builder)

**Goal.** The operator found 19 cards. Decide which ones improve the converged Urza draft `verify-2026-10-02/urza/final.txt` (commander Urza, Lord High Artificer, mono-U artifacts, 100 cards, first line = commander, no headers). Converge: swap each found card for the weakest kept card of its role until a full pass finds nothing better. Deliver as a diff.

**The 19 found cards** (all owned, paper, one copy each, none sleeved in another deck):
- Newly registered today (16): Cryogen Relic, Sapphire Charm, Experimental Aviator, Jadzi, Steward of Fate // Oracle's Gift, Deduce, Echoing Truth, Occult Epiphany, Careful Consideration, Day's Undoing, Aminatou's Augury, Library of Leng, Rise from the Tides, Portent of Calamity, Bane's Contingency, Finale of Revelation, Geode Golem.
- Already registered, now physically located (3): Curse of the Swine and Scour for Scrap (both already in the draft), Elixir of Immortality (not in the draft).

**Known facts.**
- Repo root `C:/Users/QuLeR/MTG-deck-builder`. Rules: `.claude/skills/deck-building/SKILL.md` §2 (oracle exactness, synergy density, one plan, converge with stop proof), `LEARNINGS.md` (read all; the 2026-10-02 Urza entries are about this deck: copy ETB vs legend rule, mixed-plan boxes), `reference/principles.md`, `reference/win-conditions.md`.
- Draft materials in `verify-2026-10-02/urza/`: `build-report.md` (plan, roles, stop proofs, near-ties), `verdicts.md` (244 pool verdicts), `REFUTE.md`, `pool.md` (free mono-U/colourless pool with DB text), `fra-supplement.md`.
- The draft is not sleeved and not applied yet. The plan: artifacts = blue mana through Urza, the Construct scales with artifact count, Urza's {5} ability, close with Worldwalker Helm Construct copies + Whirler Rogue / Rogue's Passage. The box's spell package (Talrand etc.) was cut on purpose; a Talrand spells deck is a separate future request.
- Oracle text: `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, power, toughness, oracle_text from cards where name = '…'"` (Jadzi's DB name is `Jadzi, Steward of Fate // Oracle's Gift`). Rulings: Scryfall API or the current CR, never memory.

**What may change.** Write only in `verify-2026-10-06/urza-found/`. Swaps may use any found card. If a found card frees a better use of a cut draft card, that cascade is allowed, but only with cards already in the draft or the 19.

**What to verify.**
1. Every found card gets a verdict row: IN (for which draft card, same role, DB quote of both) or OUT (named weakest kept card of its role that it loses to, and why, quoting both).
2. Score each card by synergy links with the final list (artifact count, Urza's mana, the Construct, Thopter/Clue tokens as artifacts, untap/tap effects). Note Geode Golem against a 4-MV commander, Day's Undoing's "end the turn", Library of Leng with discard effects, and Finale of Revelation at X ≥ 10 with Urza's mana.
3. Gate the final list:
   ```
   { printf 'Commander\n'; head -1 L.txt; printf '\nDeck\n'; tail -n +2 L.txt; } > "$TEMP/g.txt"
   MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
   ```
   `plan` FAIL is a known false negative. Any `ownership` FAIL beyond the draft's known ones must be reported.
4. Also list which found cards would suit a future Talrand spells deck (one line each, no build).

**What not to do.** No edits outside the folder, no DB writes, no paper-sync, no git, no taskkill. No top-N cap. Don't touch other decks.

**Output format.** `final-2.txt` (same format as the draft: commander first line, 100 lines of `1 Name`) and `report.md`: §1 verdict table for all 19 (card, role, IN/OUT, vs which draft card, DB quotes); §2 swap table `Out → In → why`; §3 stop proof per role touched; §4 synergy (min/median, 5 lowest after swaps); §5 gate line; §6 near-ties for the operator; §7 Talrand-deck notes.

**Output limit.** `report.md` ≤ 120 lines. Final chat reply ≤ 12 lines: the swaps and the gate result. Budget: about 50 tool calls.
