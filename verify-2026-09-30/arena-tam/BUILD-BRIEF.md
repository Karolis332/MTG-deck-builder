# Arena Tam — fixed-point build (Fable)

**Goal.** Build the strongest Tam, the Possibility deck for MTG Arena Brawl (100 cards, singleton, commander included) from
the operator's owned Arena cards. Start from their current list. Swap until no remaining candidate beats any card in the deck.
The operator's rule: no top-N caps. The stop condition is that a full pass finds zero improving swaps, and you must prove it.

**Inputs (verify-2026-09-30/arena-tam/).**
- `deck.md`: the current 100 with oracle text (commander first).
- `screen-01.md` … `screen-11.md`: every owned, Brawl-legal card that screeners judged could earn a slot. Each line gives
  role, quoted clause, and which current card it would beat. Together they cover all 4,655 owned cards.
- `pool-NN.md`: the full oracle text of every owned card. Use it to check a screener's quote, or to look up a card a
  screener named.

**Engine and commander.**
- Tam: "Planeswalker spells you cast cost {1} less to cast." and "{W}{U}{B}{R}{G}, {T}: Proliferate X times, where X is
  the number of planeswalker types among planeswalkers you control."
- Way of the Paradox: life gain per loyalty activation. Way of the Mentor: a loyalty counter on each walker per life-gain
  event. Quote both Ways from deck.md.

**Method.**
1. Read deck.md. Name the plan, then the role of every card and the weakest card per role.
2. Read every screen file. For each role, rank ALL candidates together with the current cards of that role on one scale.
3. Swap the best candidate for the weakest card of the same role, or for the weakest card overall if the roles differ.
   Re-rank. Repeat until the best remaining candidate loses to the weakest kept card.
   - Mana: Arena Brawl is 1v1 at 25 life. Target 35–38 mana sources, counting lands and ramp.
   - A land that taps for 2+ of Tam's colours beats a basic unless the basic count would fall below what the basic-land-type
     payoffs need.
   - Keep the colour sources balanced against the pips.
4. Stop proof. For each role, write: "best remaining candidate X loses to the weakest kept card Y because …", quoting
   oracle text.

**Checks.**
- Write the final list as `verify-2026-09-30/arena-tam/final.txt` in Arena import format. Put `Commander` on the first line,
  then Tam's line, then a blank line, then `Deck`, then one card per line as `1 Name`. Omit set codes. For double-faced
  cards use the front name only.
- Run the gate, and fix everything except a `plan` FAIL:
  `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-09-30/arena-tam/final.txt --format brawl --owner 1 --source arena`
  `plan` FAIL is known: the gate has no superfriends plan.
- Total 100. Every card must be owned: the gate's ownership check proves it.

**Output files.**
- `final.txt`.
- `build-report.md` (≤ 250 lines):
  1. The plan (≤ 6 lines).
  2. A health table, current vs final: lands, ramp, draw, removal, wipes, counters, protection, walkers (count + distinct types), win lines, avg MV.
  3. Every swap, ranked: IN | OUT | role | why IN (quote) | why OUT is weaker.
  4. The stop proof per role.
  5. The gate lines.
  6. Mulligan / play notes (≤ 8 lines).
- Chat reply ≤ 15 lines: the swap count, the top 10 swaps, and the gate verdict.

**Do not.** Edit anything besides those two files. No DB writes, no paper-sync, no vitest, no taskkill, no git. Do not
invent cards: every IN must appear in a pool file.
