# Follow-up: unregistered Reality Fracture cards (2026-09-28)

**Goal.** The operator never registered most Reality Fracture cards. They own most commons and uncommons,
some rares and mythics, most echo pairs (two legendary versions of one character), both Karns and both Traxos.
They do NOT own Chandra, Chill of Compliance, Chandra, Torch of Defiance (FRA copy), Garruk, Curse Breaker, or
Garruk, Veiled Butcher (these are already excluded). Give a verdict on every card in your deck's
`<slug>-fra-assumed.md` and name the ones that would improve the deck.

**Inputs.**
- `<slug>-fra-assumed.md`: every unregistered, commander-legal FRA/FRC card in your colour identity, with oracle text.
  Tag `[ASSUMED]` = very likely owned. Tag `[IF-OWNED]` = rare/mythic the operator may own.
- Baseline: `REFUTE.md` (final verdicts on your earlier swaps) plus your own report, including section 6. Compare
  each new card with the deck AFTER the KEEP swaps. Only replace a slot that REFUTE.md kept if the new card is clearly better.

**What may change.** You write one new file only: `verify-2026-09-28/deck-audit/<slug>-fra-verdicts.md`. Do not edit
your report, your proposed list, or any other file. Do not run the gate: these cards are not in the collection
table, so the ownership check would fail on all of them.

**Output file format (≤ 260 lines).**
1. `## Swaps` (at most 6, ranked): IN | tier | OUT | why IN (quote the oracle clause) | why OUT is weaker than every card kept.
2. `## Verdicts`: one line for EVERY card in the file. Format: `- Name — ADD` or `- Name — REJECT: <reason from its text vs this deck>`.
   A checker fails the audit if any card is missing, so do not skip or group cards.

**Rules.**
- Quote the oracle text from the file for every claim. Do not rely on memory.
- A physical card can go in one deck only. Recommend freely; the orchestrator resolves conflicts.
- Never recommend the lost cards: Innkeeper's Talent, Konstrari Annex, Boros Charm.
- Tam locks (never cut): 35 lands, Kaya's Ghostform, both Ob Nixilis, Thrummingbird, Kaito, Chimil, Esika, Jace, Memory
  Adept, Great Divide Guide, every Way, Jared, Saheeli, both Talismans, Final Act.
- Final chat reply: ≤ 10 lines (the swaps and the count of cards with a verdict).
