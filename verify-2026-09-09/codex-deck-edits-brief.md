# Second-opinion deck edits (Commander, paper) — brief for gpt-6-astra

You are reviewing three real paper Commander decks and proposing edits. Hard constraint: every card
you add must come from the owner's unassigned pool; you may not suggest cards they do not own.
Work only with files under `decks/paper/`. Do not modify anything outside `decks/paper/proposals/`
and `decks/paper/astra-review.md`.

## Inputs (read them)

- Current decks (ManaBox lines, first line is the commander):
  `decks/paper/decks/meren-of-clan-nel-toth.txt`, `decks/paper/decks/imotekh-the-stormlord.txt`,
  `decks/paper/decks/tazri-beacon-of-unity.txt`
- The owner's unassigned pool (only these cards may be added): `decks/paper/open-cards.txt`
- Corpus statistics for each commander: `data/corpus-stats.json` — map of commander → card →
  `[inclusion_rate, lift]`. Inclusion = share of that commander's decks (4M-deck corpus) running the
  card; lift = ln(rate with this commander ÷ rate in decks of the same colours), positive = commander-specific.
- The model's own plan for comparison (do not copy it, critique it where you disagree):
  `decks/paper/edit-plan.html` (open as text; each `<p class="why">` is one argued swap) and the
  resulting lists `decks/paper/proposals/{meren,imotekh,tazri}-model.txt`.
- Card data if you need oracle text or mana costs: the SQLite table `cards` at
  `%APPDATA%/the-black-grimoire/data/mtg-deck-builder.db` (columns name, mana_cost, cmc, type_line,
  oracle_text, color_identity, edhrec_rank, price_usd). Read-only.

## Owner's stated preferences (binding)

- Meren of Clan Nel Toth: graveyard/aristocrats value deck.
- Imotekh the Stormlord: Necron tribal, artifact recursion; the list is short on lands (31) — fix that
  first with basic Swamps. Culling the Weak stays.
- Tazri, Beacon of Unity: D&D party theme (Cleric/Rogue/Warrior/Wizard) with a dungeon/venture
  package around Acererak; keep ALL ramp pieces (including Firdoch Core and Mutable Explorer, which are
  changelings); Explore the Underdark, Manor Gate and Plaza of Harmony are reserved for another deck.
- Most cards exist as a single copy: a card you ADD from the pool may go into only one of the three lists. Cards already present in two current decks (Sol Ring, Arcane Signet, basics) are real separate copies — leave them.
- Basics are unlimited; everything else must be in the pool or already in the deck.

## Deliverables

1. `decks/paper/proposals/meren-astra.txt`, `imotekh-astra.txt`, `tazri-astra.txt`: full 100-card lists
   (commander first, `1 Card Name` lines, front face names only for double-faced cards). Verify the
   quantities sum to exactly 100 and that every non-basic added card is present in `open-cards.txt`.
2. `decks/paper/astra-review.md` (≤ 150 lines): per deck, a table of swaps (OUT → IN) with a one-line
   argument each citing the corpus numbers where useful, a short paragraph on mana base and curve,
   and a list of points where you disagree with the model's plan and why. State clearly which of your
   picks are theme/synergy calls the corpus does not support.

Do not run builds or tests. Do not commit.

## Working rules (the previous attempt crashed on these)
- Never print whole files to the terminal: `data/corpus-stats.json` is 700 KB and `edit-plan.html` is large. Load them in Python and print only the numbers you need (a few lines at a time).
- When you run Python, set `$env:PYTHONIOENCODING='utf-8'` first (arrows and accents in card names crash the default codec).
- No clarifying questions: nobody is watching; decide and state the assumption in the review.
