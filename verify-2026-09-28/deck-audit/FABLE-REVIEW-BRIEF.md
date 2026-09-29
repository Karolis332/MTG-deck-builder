# Fable review — one paper Commander deck (2026-09-28)

**Goal.** Review ONE paper deck (named in your prompt) with fresh eyes. Earlier Sonnet auditors proposed swaps and an Opus
reviewer checked them. Your job is to decide whether the final 100 plays well, and whether those passes got anything wrong in
either direction: good swaps they rejected, or bad swaps they kept.

**Inputs (all in `verify-2026-09-28/deck-audit/`).**
- `<slug>-final.txt`: the deck after every kept swap (100 cards, commander first). This is what you are reviewing.
- `<slug>-deck.md`: the current physical deck with oracle text.
- `<slug>-pool.md`: every open registered card in the colour identity, with oracle text, sorted by EDHREC rank.
- `<slug>-fra-assumed.md`: unregistered Reality Fracture cards. `[ASSUMED]` means the operator likely owns it; `[IF-OWNED]` means the operator may own it.
- `final-swaps.json`: your deck's rows, with every proposed swap (KEEP and REJECT) and its rationale.
- `decks/paper/HISTORY.md`: past operator decisions. Grep it for the commander's name.
- For the oracle text of an IN card that is not in deck.md, use the pool or fra-assumed file.

**What to judge.**
1. **Plan and function.** How the final deck wins and whether it reliably gets there: mana (land count, colour sources vs pips), curve, ramp, draw, interaction, protection, and redundancy of the key engine.
2. **The swaps.** For each KEEP: agree or disagree, with the reason from oracle text. Scan the REJECTs, and flag any you would overturn.
3. **Misses.** Up to 5 cards from the pool or fra-assumed files that clearly beat a card in the final list and were never proposed. Name the OUT card too.
4. **Weakest 5.** The five weakest cards still in the final list, with a one-line reason each.

**What may change.** Write exactly one file: `verify-2026-09-28/deck-audit/<slug>-fable-review.md` (≤ 160 lines). Nothing else:
- no deck, collection or DB edits;
- no paper-sync, vitest or npm test;
- no taskkill.

The read-only gate is allowed if you want it:
`MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <file> --format commander --owner 1 --source paper`
It needs `Commander` / blank line / `Deck` headers; build the file in /tmp. The ownership check fails on ASSUMED/IF-OWNED cards: they are not registered. A `plan` FAIL is known for commanders the gate has no plan for.

**Rules.**
- Every claim about a card quotes its oracle text from the files. Do not rely on memory of card text.
- Respect operator locks and decisions in HISTORY.md unless you give a concrete reason they are wrong.
- Lost cards (never recommend): Innkeeper's Talent, Konstrari Annex, Boros Charm.
- Singleton: one copy per card per deck. A card sleeved in another paper deck (`decks/paper/decks/*.txt`) is not available.

**Output file format.**
1. Verdict: 2–3 lines. Is the final 100 good, and is it better than the current deck?
2. Health table: current vs final, one row each for lands, ramp, draw, removal, wipes, protection and win lines.
3. Swap review table: IN | OUT | agree/disagree | reason.
4. Overturned rejects (if any).
5. Misses: up to 5.
6. Weakest 5.
7. The final recommended change list vs the CURRENT deck (IN → OUT), ranked.

**Chat reply.** ≤ 12 lines: the verdict and the final change list.
