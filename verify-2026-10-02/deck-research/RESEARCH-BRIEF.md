# Deep research: Commander deck building, win conditions, play lines, mulligans (2026-10-02)

**Goal.** Build a reference that makes the orchestrator an expert Commander deck builder and coach for this operator. The operator plays PAPER Commander in 4-player pods (40 life) and Arena Historic Brawl (1v1, 25 life). Every claim must be sourced and practical. The output feeds the project skill `.claude/skills/deck-building/`.

**Research** (web: WebSearch / WebFetch / Exa). Prefer primary and expert sources:
- Frank Karsten's mana-base maths (Commander source counts, hypergeometric).
- EDHREC articles and data.
- The Command Zone's deck-building template and its later revisions.
- Wizards' Commander Brackets (Game Changers, bracket definitions as of 2026).
- Strong cEDH/high-power primers (Moxfield primers, cEDH Decklist Database), and mulligan articles (London mulligan, Commander free mulligan).
- Reputable articles on threat assessment and politics in multiplayer.

Note dates. Where sources disagree, say so and give the reasoned recommendation.

**Deliverables.** Write to `verify-2026-10-02/deck-research/`. Each file ≤ 250 lines; tables over prose; every non-obvious claim carries a source URL.
1. `principles.md`:
   - Deck construction: role ratios (lands, ramp, draw, removal, wipes, protection, win cons) by power level/bracket, and when to deviate.
   - Mana base: land count vs ramp and curve; coloured source counts per pip intensity (Karsten); tapped-land budget; fetch/check/fast/pain/"Turbulent"/"Annex" style conditional lands in 4-pod vs 1v1.
   - Curve.
   - Synergy vs raw power: how to score card-to-card interaction density, redundancy of key effects, tutor targets.
   - Consistency metrics you can compute: P(commander castable on curve), P(key engine by turn N).
   - The 1v1 Brawl differences.
2. `win-conditions.md`:
   - Taxonomy (combat, commander damage, drain/aristocrats, combo, alt-win, mill, lock/value, poison/infect, superfriends ultimates).
   - How many closers a deck needs per bracket, and redundancy.
   - Protecting the win turn.
   - Speed benchmarks per bracket (typical win turn).
   - How to evaluate whether a list actually closes games: a checklist the orchestrator can apply to a decklist.
3. `lines-and-mulligans.md`:
   - Mulligan rules (Commander free mulligan, London) and keep/mull heuristics by archetype (ramp, engine, aggro, combo, superfriends, artifacts).
   - "Hands to avoid" patterns, with concrete example hands.
   - Sequencing principles: land-drop order with check/slow/turbulent/fetch lands, when to play rocks vs threats, holding interaction, engine-first vs threat-first, wipe timing, deploying walkers safely.
   - Threat assessment and politics in 4-player pods.
   - A pre-turn visualisation checklist ("lines to visualise") the operator can use at the table.
4. `sources.md`: every URL used, with one line on what it supports.

**Rules.**
- Practical over encyclopedic. Each section ends with "Apply:", a 1–3 line rule the orchestrator can run on a decklist.
- Do not invent statistics. If a number is your own calculation, show the calculation.
- Write each file early and overwrite as you improve.

**Do not.** Edit anything outside `verify-2026-10-02/deck-research/`. No git, no DB writes. Budget ≤ 70 tool calls.

**Chat reply** ≤ 12 lines: files written and the 5 most important rules found. If the harness blocks a write, put the content in the reply.
