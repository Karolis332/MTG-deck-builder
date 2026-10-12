# Arena Jace: candidate screen (one chunk)

## Goal
The operator wants the strongest competitive **Jace, Multiverse Architect** deck for **MTG Arena Historic Brawl**: 100
cards, singleton, 1v1, 25 life.

You screen ONE chunk of their owned Arena cards (`pool-NN.md`, named in your prompt). The chunk holds only Brawl-legal
cards whose colour identity is within W/U/B/R. List EVERY card that could earn a slot.

A later Fable builder ranks the survivors from all 8 chunks and optimises the deck until no swap improves it. A strong
card you drop here is lost for good; a weak card you let through costs one line. **When in doubt, include.** There is no
cap on how many you pass.

## The deck
Read the whole of `verify-2026-09-30/arena-jace/deck.md` first. It is a SEED list, not the operator's: our own deck
builder made it from their collection. Treat it as a weak baseline: its weakest cards are the bar to beat.

**Jace, Multiverse Architect ({1}{W}{U}{B}{R}, loyalty 4):**
- "At the beginning of combat on each opponent's turn, they may pay {2}. If they don't, creatures they control can't
  attack Jaces you control this turn."
- "+1: Draw two cards, then put a card from your hand on the bottom of your library."
- "−3: Exile another target planeswalker or creature you control. Reveal cards from the top of your library until you
  reveal a creature or planeswalker card. Put that card onto the battlefield and the rest on the bottom of your library
  in a random order."

The −3 turns any creature, token or spent planeswalker into the next creature or planeswalker in the library. The
deck therefore wants two things:
- cheap bodies and tokens to exile;
- a library whose creatures and planeswalkers are nearly all high-impact, because every low-value creature dilutes the
  hit.

The +1 is card selection every turn, and the static taxes attacks on Jaces.

**Roles:**
- Planeswalkers: any with real impact. Another Jace also benefits from the attack tax.
- Big, high-impact creatures worth revealing.
- Cheap token makers and fodder that are NOT creature cards themselves: token-making spells and walkers are best.
- Loyalty support: proliferate, loyalty doubling, Ways and other walker engines.
- Protection for walkers: fog, blockers, attack taxes, removal.
- Ramp and fixing for four colours: lands tapping for 2+ of W/U/B/R, rocks.
- Card draw.
- Removal and board wipes, especially ones that spare planeswalkers.
- Counterspells.
- Tutors.
- Win conditions.

## Pass rule
Pass a card if either:
- it plausibly beats the weakest current card of its role; or
- it fills a role the deck lacks.

Judge by 1v1 competitive power: speed, card quality, interaction density.

A weak creature card has a hidden cost here, because it dilutes the −3. Note that cost; do not drop the card for it.

## Output
Write `verify-2026-09-30/arena-jace/screen-NN.md`, where NN is your chunk number:
- Line 1: `screened <count>/<chunk size>, passed <n>, last card read: <exact name of the last card in the chunk>`.
- Then one line per passed card: `- Name — role — "key oracle clause, quoted" — beats: <current card it would replace>`.
- Quote oracle text from the chunk file, never from memory.

## Rules
- Read the WHOLE chunk, in pieces (offset/limit), from the first card to the last. Do not stop early.
- Write only your screen file. No other edits, no DB writes, no taskkill, no git.
- Chat reply: 3 lines or fewer, your file's line 1.
