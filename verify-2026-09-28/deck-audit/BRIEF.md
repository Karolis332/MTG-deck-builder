# Paper deck audit — shared brief (2026-09-28)

**Goal.** For ONE paper Commander deck (named in your prompt), find the swaps from the operator's open
collection that improve it most, and prove that no strong open card was overlooked. Last time a strong
card (Chimil, the Inner Sun) sat unused because nobody weighed it against a slot — that must not repeat.

**Scope / inputs (all in `verify-2026-09-28/deck-audit/`).**
- `<slug>-deck.md` — the current physical deck: every card with oracle text, MV, type, EDHREC rank, price,
  game-changer flag. First card = commander.
- `<slug>-pool.md` — EVERY open card (owned, in no other deck) inside the commander's colour identity,
  with the same fields, sorted by EDHREC rank. Nothing was filtered by relevance. Read ALL of it (in
  chunks with offset/limit), not just the head.
- `decks/paper/HISTORY.md` — past operator decisions; grep it for your commander's name and respect
  them (do not re-propose a swap the operator reversed unless you say why it is different now).

**What may change.** Nothing in `decks/`, `src/`, `scripts/`, or the DB. You write exactly two files:
`verify-2026-09-28/deck-audit/<slug>-report.md` and `verify-2026-09-28/deck-audit/<slug>-proposed.txt`
(the full proposed decklist in the same "1 Name" format, commander first, total 100 cards).

**What to verify.**
1. Every claim about a card comes from its oracle text in the files — quote the key clause. No memory.
2. Run the gate on your proposed list (read-only, safe):
   `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <file> --format commander --owner 1 --source paper`
   The gate wants a file with `Commander` / blank line / `Deck` headers: build it in `/tmp/<slug>-gate.txt`
   (first line of the proposal under `Commander`, the rest under `Deck`). Report its PASS/WARN/FAIL lines.
   `plan` FAIL on commanders the gate has no plan for is known and acceptable; everything else must PASS
   except a land-count WARN you justify.
3. Total = 100 cards exactly (commander included). Basics are unlimited (the operator owns all basics).

**What NOT to do.** Do not run `paper-sync.ts`, vitest, npm test, or anything that writes to the DB. Do
not edit other agents' files. Do not taskkill node.exe. Do not invent cards: an ADD must be in your
pool file. Do not add more than 3 game changers total to the deck (bracket 3 cap) unless the deck
already exceeds that — report the count before/after.

**Output format — `<slug>-report.md` (≤ 220 lines).**
1. **Plan** (≤ 5 lines): what the deck does and how it wins, from the commander's and key cards' text.
2. **Health** table: lands, ramp, card draw, spot removal, wipes, protection, win conditions, avg MV,
   game changers — current vs proposed. Flag structural problems (wrong card count, missing category).
3. **Swaps** table ranked by impact (at most 12): IN | OUT | why IN (oracle clause) | why OUT is the
   weakest slot. Prefer cutting the deck's genuinely weakest cards; say why each OUT is weaker than every
   card you kept.
4. **Coverage (mandatory safety net).** Every pool card that meets ANY of: EDHREC rank ≤ 3000, price
   ≥ $4, game changer, or is a planeswalker/legendary that references the commander's mechanic — one
   line each: `ADD` (in swaps) / `REJECT — <reason from its text vs this deck>`. No card meeting a
   criterion may be missing from this list.
5. **Gate** result lines for the proposed list.

**Output limit.** Your final chat reply: ≤ 20 lines — the swap list (IN → OUT) and gate verdict. Put
everything else in the report file.

**Known facts.**
- All paper; the operator owns every basic land. One copy of each non-basic unless the pool says `Nx`.
- The open pool is shared by five decks audited in parallel; the orchestrator resolves conflicts, so
  recommend freely but rank.
- Tam, the Possibility (5c superfriends) was just built from the open pool; its cards are no longer open.
