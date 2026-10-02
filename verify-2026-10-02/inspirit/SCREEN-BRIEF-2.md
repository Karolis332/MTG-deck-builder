# Screen: every free owned card left out of the Inspirit round-2 list (2026-10-02)

**Goal.** Give EVERY card in your chunk an individual verdict against the converged list. The build claims convergence, but many free cards got no verdict or only a grouped one. Grouping was wrong at least once: Adaptive Automaton, an *artifact* Construct lord, sat in a "non-artifact" group.

Your job is to find any card that would improve the deck. You don't build. An Opus reviewer decides afterwards.

**Inputs** (repo root C:/Users/QuLeR/MTG-deck-builder):
- Your chunk: `verify-2026-10-02/inspirit/screen-input-<N>.md` (N is in your prompt). It holds 189 cards with full DB oracle text. Read ALL of it in 2–3 large chunks.
- `verify-2026-10-02/inspirit/inspirit-proposed-2.txt`: the converged 100-card list (Inspirit, Flagship Vessel; UWR artifacts and counters).
- `verify-2026-10-02/inspirit/build-report-2.md`:
  - §1 holds the plan. Its win lines:
    - Depthshaker Titan, Craterclaw Colossus and Cyberdrive Awakener alpha strikes.
    - Blade Historian's double strike.
    - Commander damage from Inspirit with Improvised Arsenal or All That Glitters.
    - Lux Artillery and Darksteel Reactor charge counters, plus proliferate.
  - §6 gives the **weakest kept card of each role**. That card is the bar a candidate must beat.
- Card text not in your chunk: `PYTHONIOENCODING=utf-8 py .claude/skills/deck-building/q.py "select name, oracle_text from cards where name in (...)"`.

**Method, per card:**
1. Assign a role: ramp, draw, removal, wipe, counter, protection, engine, payoff, finisher, land, or none.
2. Compare it with the weakest kept card of that role. Use the oracle text and how many cards in the list it directly interacts with.
3. Verdict:
   - **CANDIDATE** if it plausibly beats that weakest card. Name the card it would replace and quote the text that wins.
   - Otherwise **OUT**, with a one-line reason: what it loses to, or why it serves neither plan.

**Watch for:**
- Construct and Thopter lords, or token makers that use Urza's Construct or Thopters.
- Cards that add artifacts for the alpha strike.
- Cheap protection for the win turn.
- Untapped or utility lands.

Judge every card on its own text. Do not copy a verdict from build-report-2.md.

**Output.** Write `verify-2026-10-02/inspirit/screen-2-<N>.md`:
1. A table `Card | role | CANDIDATE/OUT | vs (weakest kept) | reason`, one row per input card, in input order.
2. The CANDIDATEs, ranked.
3. A final line `rows: <count>`, which must equal the number of input cards.

Check your row count before you reply.

**Do not.** Edit anything else; run git, paper-sync, vitest or taskkill; write to the DB. Budget ≤ 30 tool calls. Chat reply ≤ 8 lines: the number of CANDIDATEs and the top 5.
