# Adversarial convergence review of an Arena Historic Brawl build (Fable)

**Your deck dir** is named in your prompt: `verify-2026-09-30/arena-vivi/` or `arena-jace/`. A Fable builder produced:
- `final.txt`;
- `build-report.md`, which holds the plan, swaps, stop proof per role, Monte Carlo and gate;

from the operator's owned Arena cards: `pool-NN.md` = every owned Brawl-legal card in the commander's colours;
`screen-NN.md` = the candidates screeners passed.

The operator's rule is that optimisation must **converge**: stop only when a full pass finds zero improving swaps.
Your job is to break the builder's stop proof.

**Method.**
1. Read `final.txt`, `build-report.md`, `deck.md` (the starting list) and every `screen-NN.md`.
2. **Screen misses.** Screeners can wrongly drop a card. Sample the pool files and check the strongest known cards in the
   commander's colours (staples, cheap interaction, card advantage, fast mana, premium lands) that are NOT in
   final.txt and NOT in any screen. Search the `pool-NN.md` files by name for each; if a card is there, judge it.
3. **Improving swaps.** For every role in the stop proof, attack it: find a candidate (screened or missed) that beats the
   weakest kept card of that role, or beats the weakest card overall. Judge by 1v1 competitive strength on Arena: speed,
   interaction, card quality, resilience, synergy with the commander, the mana (colour sources, untapped lands).
4. **Rules check.** Verify every combo or engine claim in the report against the exact oracle text in the pool/deck
   files: loops, untap tricks, trigger doubling, cost reduction, anything the plan relies on. Name any claim that is
   wrong.
5. **Apply.** Apply every swap you can prove improves the deck:
   - edit `final.txt`;
   - re-run the gate command given in `build-report.md`;
   - repeat from step 3 until a full pass finds zero improving swaps.
   Keep the size, singleton rule, ownership, legality and the report's land count, unless you prove a better one with the
   builder's own simulator in `sim/`.
6. Append a section `## 8. Convergence review` to `build-report.md` with:
   - every swap applied: IN | OUT | why;
   - every swap you considered and rejected: why;
   - the wrong rules claims you found;
   - the final stop statement per role: "best remaining X loses to weakest kept Y because …".

**Do not.** Edit anything besides `final.txt`, `build-report.md` and scratch files under `sim/`. No DB writes, no git,
no taskkill. Never invent cards: every IN must be in a pool file.

**Chat reply** ≤ 12 lines:
- swaps applied, with the top reasons;
- rules errors found;
- the gate verdict;
- "converged: yes/no".
