# Refuter brief — model-optimised top decks

**Goal.** The lists in `<RUN_DIR>/top-*.txt` were produced by a swap search (`scripts/collection-best-deck.ts`). It maximises the app's Deck Score plus a goldfish Monte Carlo over the operator's whole collection. Search optimisers exploit model blind spots. Find every card or omission a strong Commander player would correct, so the operator needs no further corrections.

**Scope.** Only the lists named in the run message. Format: <FORMAT>. Ownership is already guaranteed (every card is owned), so do not check it.

**What may change.** Nothing. You are read-only. Return constraints; the orchestrator re-runs the optimiser with them.

**Check every list for:**
1. **Dead cards in this deck.** The card does nothing or almost nothing here. Examples:
   - a colour-identity mana producer under a colourless commander;
   - a type payoff with ≤ 3 of that type in the list;
   - an "X = number of <type>" card where the count is low;
   - tribal cards with no tribe;
   - a "commander" clause that this commander fails.
   Quote the oracle text from the DB:
   `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, mana_cost, type_line, oracle_text from cards where name = '…'"`
2. **Role floors** (Commander norms, reference `.claude/skills/deck-building/reference/principles.md`). Count each role and flag a shortfall:
   - spot removal / interaction ≥ 6 (incl. ≥ 2 that hit noncreature permanents);
   - board wipe ≥ 1 unless the plan is go-wide;
   - card draw/advantage ≥ 8;
   - ramp ≥ 8;
   - land count within Karsten ±2 for the deck's curve and ramp;
   - coloured sources sufficient for the pips.
3. **Plan coherence.** Name one primary plan and the T1–3 / T4–6 / close shape. Flag cards that serve neither plan nor a role in item 2.
4. **Closers.** Does the list actually win (`reference/win-conditions.md` checklist)? State the kill turn and the board it needs, as "held since the turn began".
5. **Commander fit.** Does the list use what the commander does? Flag any obvious owned payoff that is missing.

For every flagged defect, propose the concrete fix as a constraint:
- `ban` for a card that must leave the pool for this commander;
- `lock` for an owned card that must be in the list.

Cite the oracle text for both sides. Never ban a card because it is merely weaker; the optimiser handles that. Ban only dead or anti-synergistic cards. Lock only cards whose absence is a real hole the model cannot see.

**Hard rules.**
- Oracle exactness: quote DB text verbatim and check timing words, "another", targets and counter types.
- Recompute every number yourself.
- Never correct a card or rule from memory.

**Output.** Write `<RUN_DIR>/REFUTE.md`:
- per deck: verdict PASS (no change needed) or FIX;
- role counts table;
- defects with quotes.

End with one fenced ```json block, `{ "<commander name>": { "ban": [...], "lock": [...] } }`, covering only decks with a FIX. Return a 15-line summary as your final message: the verdict per deck plus the constraint count.

**Output limit.** REFUTE.md ≤ 300 lines.

**Known facts.**
- Paper basics are unlimited, except Wastes (not owned).
- Deck Score components (mana, curve, interaction, advantage, win, synergy, meta, structure) are in `<RUN_DIR>/results-*.jsonl` (`components[].reason`).
- Goldfish stats per list are in the same JSONL (`goldfish`).
- `LEARNINGS.md` in `.claude/skills/deck-building/` lists past evaluation mistakes. Read it first and apply it both ways: don't ban a card that the learnings show is good, e.g. Jace tokens as sacrifice fodder.
