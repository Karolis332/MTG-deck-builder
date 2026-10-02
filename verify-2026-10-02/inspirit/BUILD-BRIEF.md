# Paper Inspirit: fixed-point optimisation (2026-10-02)

**Goal.** Make the operator's PAPER Commander deck *Inspirit, Flagship Vessel* (UWR, 4-player pod, 40 life) as strong and consistent as possible using cards they own. Converge: stop only when a full pass finds no improving swap, and prove it. No top-N caps.

**Commander** (quote from the DB): Inspirit, Flagship Vessel {U}{R}{W}, Legendary Artifact — Spacecraft.
- "Station (Tap another creature you control: Put charge counters equal to its power on this Spacecraft. Station only as a sorcery. It's an artifact creature at 8+.)"
- "1+ | At the beginning of combat on your turn, put your choice of a +1/+1 counter or two charge counters on up to one other target artifact."
- "8+ | Flying / Other artifacts you control have hexproof and indestructible."

Work out the plan from the list itself: artifacts, counters, proliferate, charge-counter payoffs, station creatures. Name the plan and the win lines in the report.

**Inputs** (repo root C:/Users/QuLeR/MTG-deck-builder):
- Current list: `verify-2026-10-02/inspirit/inspirit-current.txt` (commander first). It is **101 cards**, so one cut is owed. It runs **39 lands**; judge that count against its rocks.
- Pool: `verify-2026-10-02/inspirit/pool.md` holds every owned paper card inside the identity: 470 cards with full oracle text, owned copies, EDHREC rank, and marks. Read all of it.
  - **[-]** = open, free to use. This includes the Reality Fracture pulls and the Strixhaven precon leftovers.
  - **[S]** = already in Inspirit.
  - **[T]** = in Tam. You may take it only as a swap that leaves Tam at least whole: give Tam back an Inspirit or open card that is at least as good for Tam's plan, and state both sides. Tam locks are never cut:
    - all seven Ways, Kaya's Ghostform, both Ob Nixilis, Thrummingbird, Kaito, Chimil, Esika, Jace Memory Adept, Great Divide Guide, Timeless Lotus;
    - Great Hall of the Citadel, Seachrome Coast, Cinder Glade, Fumigate, Shivan Reef, Mana Confluence;
    - operator keeps: Entrust the Spark, Quintorius Kand, Turbulent Wilderness, Nomad Outpost.
  - Tam is a superfriends deck (Way of the Paradox × Way of the Mentor; "{W}{U}{B}{R}{G},{T}: Proliferate X times"). Its list is in `decks/paper/decks/tam-the-possibility.txt`. Swapping is optional: propose one only if both decks gain.
  - **[Z]** = Tazri. Off-limits.
  - **[M]/[I]/[C]/[R]** = Meren / Imotekh / Cabbage / Ramos. You may take a card only with a backfill for the donor, inside its identity and plan, from open cards. State both sides.
  - A count like `x2` means owned copies. Cards marked in two decks hold separate copies.
- For any card not in the pool, query the DB:
  `PYTHONIOENCODING=utf-8 py verify-2026-10-02/sisay/q.py "select name, mana_cost, type_line, oracle_text from cards where name = '...'"`

**Method.**
1. Give every card in the current list a role and mark the weakest card per role.
2. Per role, rank ALL pool candidates together with the current cards on one scale.
3. Swap the best candidate for the weakest card of the same role. Repeat until the best remaining candidate loses to the weakest kept card.
4. Mana: count coloured sources against pips. A tapped land must earn its slot over a basic or an untapped dual.
5. Stop proof per role: "best remaining X loses to weakest kept Y because …", quoting oracle text.

**Checks.**
- Write `verify-2026-10-02/inspirit/inspirit-proposed.txt` as `1 Name` lines, commander first, exactly 100 cards.
- If you propose a Tam swap, also write `verify-2026-10-02/inspirit/tam-proposed.txt`.
- Gate the list. Make a temp copy with `Commander`/`Deck` headers (the commander is the first line), then run:
  `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <copy> --format commander --owner 1 --source paper`
  Ownership must PASS. The `plan` FAIL is known.

**Output.** `verify-2026-10-02/inspirit/build-report.md`, ≤ 220 lines:
1. Plan and win lines (≤ 8 lines).
2. Health table current vs proposed: lands, rocks/ramp, draw, removal, wipes, protection, counters/proliferate engines, payoffs, avg MV.
3. Swaps ranked: IN | OUT | role | source | why IN (quote) | why OUT is weaker.
4. Tam / donor swaps with both sides.
5. Stop proof per role.
6. Gate lines.

Chat reply ≤ 15 lines. Write the report early and overwrite it as you converge. If the harness blocks the write, put the full report in your chat reply.

**Do not.** Edit decks/paper/, run paper-sync, write to the DB, use git, taskkill or vitest. Budget ≤ 60 tool calls.
