# Arena Jace — fixed-point competitive build (Fable)

**Goal.** Build the strongest competitive **Jace, Multiverse Architect** deck for **MTG Arena Historic Brawl** from the operator's
owned Arena cards. The format is 100 cards, singleton, commander included, 1v1, 25 life. The operator's collection is
current (`Downloads/collection(6).csv`, imported today).

Start from the seed list in deck.md and swap until no remaining candidate beats any card in the deck. Operator rule: no
top-N caps. The stop condition is a full pass with zero improving swaps, and you must prove it.

**Inputs** (all in `verify-2026-09-30/arena-jace/`).
- `deck.md` — a SEED 100 (commander first) that OUR deck builder produced from the operator's collection (merged engine
  62ccf14). It is not the operator's list. Rebuild freely, and record in the report where the seed was wrong; that feeds the
  builder's quality work.
- `screen-01.md` … `screen-08.md` — every owned, Brawl-legal W/U/B/R card that the Fable screeners judged could earn a slot.
  Each line gives the role, the quoted clause, and which current card it would beat. Together they cover all 3,525 owned
  W/U/B/R cards.
- `pool-NN.md` — full oracle text of every owned W/U/B/R card. Use it to verify quotes and to look up anything a screener
  named. Check `check-screens.py` output first (`PYTHONIOENCODING=utf-8 py verify-2026-09-30/arena-jace/check-screens.py`).
  If a screen is BAD, re-screen that chunk yourself before building.

**Commander.** Jace, Multiverse Architect ({1}{W}{U}{B}{R}, loyalty 4):
- Static: on each opponent's turn they may pay {2}; if they don't, their creatures can't attack Jaces you control.
- +1: draw two, then put a card from your hand on the bottom.
- −3: exile another creature or planeswalker you control; reveal until a creature or planeswalker card and put it onto
  the battlefield. Quote the full text from deck.md.

**Design questions to answer:**
- What does the −3 hit? Compute the expected quality of a −3 reveal (the distribution over the deck's creature and
  planeswalker cards) for your final list. Weigh every creature card by its hit value as well as its cast value.
- What does the −3 exile? Cheap fodder, tokens from spells or walkers, and spent walkers.
- How does Jace survive to use it in 1v1? Protection and board control.

**Method.**
1. Read deck.md. Name the plan and the win lines. Then assign a role to every card and find the weakest card per role.
2. Read every screen file. For each role, rank ALL candidates together with the current cards of that role on one scale.
   Judge by 1v1 competitive strength:
   - speed and mana efficiency;
   - interaction density;
   - card quality;
   - resilience to removal and counters;
   - how the card works with and without Jace on the battlefield.
3. Swap the best candidate for the weakest card of the same role, or for the weakest card overall when the roles differ.
   Re-rank and repeat until the best remaining candidate loses to the weakest kept card.
4. **Mana.** Choose the land count, ramp and rock count by a Monte Carlo simulation you write and run. Report:
   - P(2 lands by T2) and P(3 mana by T3), on the play and on the draw, with Arena's Brawl free mulligan rule;
   - the flood rate by T6;
   - two or three candidate land counts compared side by side.
   Cards with a land face count toward lands. Lands that enter untapped and tap for 2+ of W/U/B/R beat basics unless a
   payoff needs basics. Jace needs WUBR on turn 5: report P(all four colours by T5).
5. **Stop proof.** For each role, write "best remaining candidate X loses to weakest kept Y because …", quoting oracle
   text from the pool/deck files.

**Checks.**
- Write the final list as `verify-2026-09-30/arena-jace/final.txt` in Arena import format:
  - `Commander` on the first line, then `1 Jace, Multiverse Architect`, a blank line, then `Deck`;
  - one card per line, `1 Name`, no set codes;
  - front names only for double-faced cards;
  - use `A-` names for Arena rebalanced cards.
- Run the gate and fix everything it flags, except that a `plan` FAIL is acceptable if you can argue it:
  `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-09-30/arena-jace/final.txt --format brawl --owner 1 --source arena`
- Total 100. Every card owned; the gate's ownership check proves it. If the gate misreads an `A-` name, report the gate
  defect and prove ownership with a direct query instead.

**Output files.**
- `final.txt`.
- `build-report.md`, ≤ 250 lines:
  1. Plan and win lines, ≤ 8 lines.
  2. Health table, seed vs final: lands, ramp/rocks, cantrips, draw engines, counters, spot removal, wipes, protection,
     walkers (count and types), creatures (count and average −3 hit value), token/fodder makers, avg MV.
  3. Every swap, ranked: IN | OUT | role | why IN (quote) | why OUT is weaker.
  4. Stop proof per role.
  5. Monte Carlo table, the chosen land count, and the −3 hit distribution.
  6. Gate lines.
  7. Mulligan and play guide, ≤ 12 lines: opening hands to keep, when to +1 and when to −3, the fodder, the kill turns.
- Chat reply ≤ 15 lines: swap count, top 10 swaps, the seed's biggest mistakes, gate verdict, chosen land count.

**Do not.**
- Edit anything besides those two files, plus scratch scripts under `verify-2026-09-30/arena-jace/sim/`.
- Write to the DB, run paper-sync or vitest, taskkill, or use git.
- Invent cards: every IN must appear in a pool file or in deck.md.
