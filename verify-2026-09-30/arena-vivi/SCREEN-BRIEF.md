# Arena Vivi: candidate screen (one chunk)

## Goal
The operator wants the strongest competitive **Vivi Ornitier** deck for **MTG Arena Historic Brawl**: 100 cards, singleton,
1v1, 25 life. Arena uses the rebalanced **A-Vivi Ornitier**.

You screen ONE chunk of their owned Arena cards (`pool-NN.md`, named in your prompt). The chunk holds only Brawl-legal
cards whose colour identity is U/R. List EVERY card that could earn a slot.

A later Fable builder ranks the survivors from all 4 chunks and optimises the deck until no swap improves it. A strong card
you drop here is lost for good; a weak card you let through costs one line. **When in doubt, include.** There is no cap on
how many you pass.

## The deck
Read the whole of `verify-2026-09-30/arena-vivi/deck.md` first. It is the operator's current 100, with oracle text; the
list is from May 2026.

**A-Vivi Ornitier ({1}{U}{R}, 0/3):**
- "{T}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power."
- "Whenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent."

Every noncreature spell grows Vivi, pings the opponent, and makes Vivi a bigger mana engine. The deck is a spells deck.

**Roles:**
- Cheap cantrips and card draw: cheap noncreature spells are both fuel and triggers.
- Counterspells and cheap spot removal (1v1 tempo). Protection for Vivi, which dies to every removal spell.
- Rituals, cost reducers and extra-spell engines: spell copies, storm, cast-from-graveyard or flashback, cost reduction.
- X spells and mana sinks that turn Vivi's big mana into damage or cards.
- Win conditions: burn to the face, storm or copy finishers, spell-count payoffs, Vivi herself as a huge attacker with
  evasion or haste enablers.
- Few creatures: creature spells do NOT trigger Vivi. A creature must earn its slot on raw power, as a payoff or engine.
- Lands, and mana rocks where they matter:
  - U/R duals, fast and utility lands with a real effect;
  - cards with a land face count as both a spell and a land.

## Pass rule
Pass a card if either:
- it plausibly beats the weakest current card of its role; or
- it fills a role the deck lacks.

Judge by 1v1 competitive power: speed, card quality, interaction density. Cheap noncreature spells are worth more here than
in a normal deck.

## Output
Write `verify-2026-09-30/arena-vivi/screen-NN.md`, where NN is your chunk number:
- Line 1: `screened <count>/<chunk size>, passed <n>, last card read: <exact name of the last card in the chunk>`.
- Then one line per passed card: `- Name — role — "key oracle clause, quoted" — beats: <current card it would replace>`.
- Quote oracle text from the chunk file, never from memory.

## Rules
- Read the WHOLE chunk, in pieces (offset/limit), from the first card to the last. Do not stop early.
- Write only your screen file. No other edits, no DB writes, no taskkill, no git.
- Chat reply: 3 lines or fewer, your file's line 1.
