# Refute: paper Sisay/Tam superfriends lists (fresh context, 2026-10-03)

**Goal.** Decide whether `sisay-buys.txt` (list C) and `sisay-owned.txt` (list A) are correct and the strongest consistent builds. You verify; you do not build. The operator's complaint: "no clear wincon that I can follow or tutor for", walkers attacked down, ran out of cards; wants consistency + walker protection. Commander: **Sisay, Weatherlight Captain** (being bought); Tam, the Possibility moves to the 99. `tam-fallback.txt` (list B) is the play-now list until Sisay arrives.

**Inputs** (repo root C:/Users/QuLeR/MTG-deck-builder, folder `verify-2026-10-03/tam-wincon/`):
- `build-report.md` (the builder's claims, §1–§8), the three lists, `buys.md` (38 buy candidates with DB text), `deck.md` (the sleeved list with text).
- Pool: `chunk-1.md` … `chunk-8.md` (1,135 free cards), `other.md` (cards sleeved in other decks). Grep them; do not read them whole.
- Rules first: `.claude/skills/deck-building/SKILL.md` §2 and `LEARNINGS.md`.
- Oracle text: the files above or `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, oracle_text from cards where name in (...)"`. Rulings: Scryfall API (`/cards/named?exact=` then `rulings_uri`) or the current CR (magic.wizards.com/en/rules). Never from memory.

**Check, in this order:**
1. **The loop (list C primary).** The Chain Veil + Teferi, Temporal Archmage: step by step with CR/Scryfall citations — activation timing, what Teferi's −1 untaps, mana per loop (Timeless Lotus "enters tapped"; Sol Ring; Hierarchs; lands), loyalty sustain (Way of the Paradox → Way of the Mentor; Carth the Lion's "cost an additional [+1]" ruling), and the kill (Chandra, Torch of Defiance +1 ×20, Sisay fetching both Jaces, Ichormoon Gauntlet). Is it a deterministic table kill? What breaks it (artifact removal, a Teferi bolt in response, enchantment removal)?
2. **Sisay's chain.** "Sisay gets +1/+1 for each color among other legendary permanents you control": recount the colour sources in each list (colour, not colour identity), the fetch order to power 5 (Veil) / 6 (Jaces) / 7 (Teferi), and the WUBRG cost per fetch.
3. **Every quote and number** in build-report.md: probabilities (recompute with `.claude/skills/deck-building/reference/calcs.py` or a stated hypergeometric), synergy median, land/ramp counts.
4. **Buy verdicts.** For each of the 38 rows in §8: KEEP or REJECT the verdict, with a DB quote. Especially: The Eternal Wanderer, Vraska Soul of Stone, Wrenn and Realmbreaker, Commodore Guff, Oath of Teferi, Oath of Nissa, Oath of Ajani, Gideon's Memorial (rated SKIP/BENCH by the builder).
5. **Swaps vs the sleeved deck** (`decks/paper/decks/tam-the-possibility.txt`): KEEP/REJECT each with a quote. Operator locks: Quintorius Kand, Entrust the Spark, 34 lands, Turbulent Wilderness; Tekuthal in (operator's call). The two Inspirit moves (Tekuthal → backfill Contagion Clasp; Ripples of Potential → Experimental Augury): check what each card does in `decks/paper/decks/inspirit-flagship-vessel.txt`.
6. **Missed swaps**: per role (tutors, draw, walker protection, ramp, removal, wipes, walkers, Ways), the best card left out vs the weakest kept, from the pool and the buys. Ask "what does it do on the turn I win?" before endorsing any cut of an expensive card.
7. **Gate** list C and A:
   ```
   { printf 'Commander\n'; head -1 L.txt; printf '\nDeck\n'; tail -n +2 L.txt; } > "$TEMP/g.txt"
   MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts "$(cygpath -m "$TEMP")/g.txt" --format commander --owner 1 --source paper
   ```
   (`plan` FAIL is a known false negative; ownership FAILs on buys and Noble Hierarch are expected. If a list already starts with a `Commander` header, use it as is.)

**Output.** Write `REFUTE.md`, ≤ 150 lines: verdict line (CONVERGED / NOT CONVERGED), loop verdict (works / breaks, with citations), errors table, swap and buy KEEP/REJECT tables, missed swaps ranked `In | Out | why`, operator decisions still open. Chat reply ≤ 8 lines.

**Do not.** Edit anything but REFUTE.md. No git, paper-sync, DB writes, taskkill or vitest. Budget ≤ 50 tool calls; batch DB queries.
