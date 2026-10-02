# Deck-building learnings (append-only, newest last)

Format: `YYYY-MM-DD — deck — what happened → rule`.

## Operator preferences
- 2026-09-28 — all — capped top-N reviews were called a "crucial error" → always converge, with a stop proof.
- 2026-09-30 — Arena Tam — the operator rejected a 20-basic mana base ("I have way better lands") → use the owned premium lands; basics last.
- 2026-10-01 — all — the operator wants a playable list in minutes → quick list first, then the converged diff.
- 2026-10-02 — all — "be careful with the oracle text; cards should synergise; solid, consistent game plan" → §2 rules on oracle exactness, synergy density and one plan.
- 2026-10-02 — all — the check page (image tiles, tap-to-tick, text filter) is the standard for any visual list or box check.

## Evaluation corrections
- 2026-10-02 — Tam — Entrust the Spark: we scored "sacrifice a planeswalker" as losing a real walker. The operator sacrifices **Jace tokens** (the Ways keep recreating them) → when a cost says "sacrifice a planeswalker/creature", check for token fodder in the deck before scoring.
- 2026-10-02 — Tam — Tomik, Wielder of Law was first rejected for the wrong reason ("protection"). It is conditional draw, and its 3-life tax deters the very attacks that trigger it → classify a card's role from its text before comparing.
- 2026-10-02 — Tam — Loyal Tutor puts the walker **on top** → a top-of-library tutor costs a card in a deck that already draws walkers.
- 2026-10-02 — Tam — Turbulent lands ("unless your opponents control eight or more lands") enter untapped around turn 3 in a 4-player pod. The operator prefers Turbulent Wilderness over Llanowar Wastes → value them as near-duals in pods, as tapped lands in 1v1.
- 2026-10-02 — Tam — the operator keeps Quintorius Kand and Entrust the Spark, and plays 34 lands by choice → don't propose those cuts again without new information.

## Physical-deck pitfalls
- 2026-10-02 — Tam — the box differed from the registry by 3 cards (Dragonskull Summit in; Woodland Cemetery and a Plains out) → before recommending swaps on a deck changed recently, get a box check (check page).
- 2026-10-02 — Tam — "commence" applied the swaps in the app, but the operator sleeved a variant (kept Entrust and Nomad Outpost, added Turbulent Wilderness) → after applying, ask what was actually sleeved and reconcile. When adds ≠ cuts, find the missing card before writing the DB.
- 2026-10-02 — Inspirit — the operator's list had 101 cards and 17 typos → always resolve names and count first.
- 2026-10-02 — Inspirit — 6 cards appeared in two boxes (Thrummingbird, Shivan Reef, Fumigate, Clifftop Retreat with Tam; Swords, Sacred Foundry with Tazri) → treat them as second copies when both boxes are confirmed sleeved; never assume a card moved.
- 2026-10-02 — all — the operator's messages sometimes land in another Claude session → one session owns `decks/paper/`; reconcile via the cross-session message, never double-apply.
- 2026-10-02 — Inspirit — the builder's first pass gave no stop proof for planeswalkers, Ways or Reality Fracture pulls, and the operator asked about exactly those → briefs must list the operator's new pulls and named card classes explicitly, and the report must give each one a verdict.

## Names the operator uses
- "Ingris Silverquill" = Ingris Stingerquill; "Variable Chase" = Variable Chaser // Arc of Fortune (unconfirmed but registered).
