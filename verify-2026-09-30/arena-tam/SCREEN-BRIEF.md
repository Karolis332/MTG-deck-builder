# Arena Tam — candidate screen (one chunk)

**Goal.** The operator is building Tam, the Possibility for MTG Arena Brawl (100 cards, singleton). You screen ONE chunk
of their owned Arena cards (`pool-NN.md`, named in your prompt) and list EVERY card that could earn a slot. A later Fable
builder ranks the survivors from all 11 chunks and optimises the deck until no swap improves it. A strong card you drop
here is lost for good; a weak card you let through costs one line. **When in doubt, include.** There is no cap on how
many you pass.

**The deck.** `verify-2026-09-30/arena-tam/deck.md` is the current 100 with oracle text. Read the whole file first.
- **Tam, the Possibility:** "Planeswalker spells you cast cost {1} less to cast." and "{W}{U}{B}{R}{G}, {T}: Proliferate X
  times, where X is the number of planeswalker types among planeswalkers you control."
- **Engine:** Way of the Paradox (you gain 1 life whenever you activate a loyalty ability) plus Way of the Mentor (whenever you
  gain life, put a loyalty counter on each planeswalker you control). Every loyalty activation and every life-gain event
  grows all the walkers.
- **Roles:**
  - planeswalkers (any; a new walker type adds to Tam's X);
  - proliferate or loyalty doubling;
  - life-gain triggers (each is a Mentor trigger);
  - protection for walkers: fog, blockers, damage redirection, hexproof;
  - ramp and fixing for five colours: lands that tap for 2+ of Tam's colours, rocks, dorks;
  - card draw;
  - removal: spot removal, board wipes that spare planeswalkers;
  - counterspells;
  - tutors for walkers or enchantments;
  - win conditions.
- The current list is weak in places: 20 basics, 7 two-colour Signets, 4 interaction cards in 63 nonland cards. A land that
  taps for 2+ of Tam's colours may beat a basic.

**Pass rule.** Pass a card if it plausibly beats the weakest current card of its role. Also pass any card that fills a role
the deck lacks: interaction, protection, draw.

**Output.** Write `verify-2026-09-30/arena-tam/screen-NN.md` (NN = your chunk number):
- Line 1: `screened <count>/<chunk size>, passed <n>, last card read: <exact name of the last card in the chunk>`.
- Then one line per passed card: `- Name — role — "key oracle clause, quoted" — beats: <current card it would replace>`.
- Quote the oracle text from the chunk file. Do not rely on memory of card text.

**Rules.**
- Read the WHOLE chunk in pieces (offset/limit), from the first card to the last. Do not stop early.
- Write only your screen file. No other edits, no DB writes, no taskkill, no git.
- Chat reply ≤ 3 lines: your file's line 1.
