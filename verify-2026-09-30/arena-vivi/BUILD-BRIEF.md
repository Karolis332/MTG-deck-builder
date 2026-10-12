# Arena Vivi — fixed-point competitive build (Fable)

**Goal.** Build the strongest competitive **A-Vivi Ornitier** deck for **MTG Arena Historic Brawl** from the operator's
owned Arena cards. The format is 100 cards, singleton, commander included, 1v1, 25 life. The operator's collection is
current (`Downloads/collection(6).csv`, imported today).

Start from their current list and swap until no remaining candidate beats any card in the deck. Operator rule: no
top-N caps. The stop condition is a full pass with zero improving swaps, and you must prove it.

**Inputs** (all in `verify-2026-09-30/arena-vivi/`).
- `deck.md` — the current 100 with oracle text, commander first. The list is from May 2026, so some cards may be weak or
  outdated.
- `screen-01.md` … `screen-04.md` — every owned, Brawl-legal U/R card that the Fable screeners judged could earn a slot.
  Each line gives the role, the quoted clause, and which current card it would beat. Together they cover all 1,781 owned
  U/R cards.
- `pool-NN.md` — full oracle text of every owned U/R card. Use it to verify quotes and to look up anything a screener
  named. Check `check-screens.py` output first (`PYTHONIOENCODING=utf-8 py verify-2026-09-30/arena-vivi/check-screens.py`).
  If a screen is BAD, re-screen that chunk yourself before building.

**Commander.**
- A-Vivi Ornitier ({1}{U}{R}, 0/3): "{T}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's
  power." and "Whenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each
  opponent."
- Plan the deck around it: cheap noncreature spells fuel it; Vivi becomes a mana engine; X spells, copies and storm turn
  that mana into a kill.
- Vivi dies to all removal. Commander tax matters, so protection and card advantage that keeps the engine running are
  real roles.
- Creature spells don't trigger Vivi.

**Method.**
1. Read deck.md. Name the plan and the win lines. Then assign a role to every card and find the weakest card per role.
2. Read every screen file. For each role, rank ALL candidates together with the current cards of that role on one scale.
   Judge by 1v1 competitive strength:
   - speed and mana efficiency;
   - interaction density;
   - card quality;
   - resilience to removal and counters;
   - how the card wins with or without Vivi.
3. Swap the best candidate for the weakest card of the same role, or for the weakest card overall when the roles differ.
   Re-rank and repeat until the best remaining candidate loses to the weakest kept card.
4. **Mana.** Choose the land count, ramp and rock count by a Monte Carlo simulation you write and run. Report:
   - P(2 lands by T2) and P(3 mana by T3), on the play and on the draw, with Arena's Brawl free mulligan rule;
   - the flood rate by T6;
   - two or three candidate land counts compared side by side.
   Cards with a land face count toward lands. U/R lands that enter untapped beat basics unless a payoff needs basics.
   Balance U and R sources against the pips.
5. **Stop proof.** For each role, write "best remaining candidate X loses to weakest kept Y because …", quoting oracle
   text from the pool/deck files.

**Checks.**
- Write the final list as `verify-2026-09-30/arena-vivi/final.txt` in Arena import format:
  - `Commander` on the first line, then `1 A-Vivi Ornitier`, a blank line, then `Deck`;
  - one card per line, `1 Name`, no set codes;
  - front names only for double-faced cards;
  - use the `A-` name when the operator's Arena version is the rebalanced one, as deck.md shows.
- Run the gate and fix everything it flags, except that a `plan` FAIL is acceptable if you can argue it:
  `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-09-30/arena-vivi/final.txt --format brawl --owner 1 --source arena`
- Total 100. Every card owned; the gate's ownership check proves it. If the gate misreads an `A-` name, report the gate
  defect and prove ownership with a direct query instead.

**Output files.**
- `final.txt`.
- `build-report.md`, ≤ 250 lines:
  1. Plan and win lines, ≤ 8 lines.
  2. Health table, current vs final: lands, ramp/rocks, cantrips, draw engines, counters, spot removal, wipes, protection,
     rituals/cost reducers, X spells/finishers, creatures, noncreature spell count, avg MV.
  3. Every swap, ranked: IN | OUT | role | why IN (quote) | why OUT is weaker.
  4. Stop proof per role.
  5. Monte Carlo table and the chosen land count.
  6. Gate lines.
  7. Mulligan and play guide, ≤ 12 lines: opening hands to keep, sequencing Vivi, when to hold counters, the kill turns.
- Chat reply ≤ 15 lines: swap count, top 10 swaps, gate verdict, chosen land count.

**Do not.**
- Edit anything besides those two files, plus scratch scripts under `verify-2026-09-30/arena-vivi/sim/`.
- Write to the DB, run paper-sync or vitest, taskkill, or use git.
- Invent cards: every IN must appear in a pool file or in deck.md.
