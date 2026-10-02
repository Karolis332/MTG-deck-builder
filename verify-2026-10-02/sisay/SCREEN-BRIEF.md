# Captain Sisay — candidate screen (one chunk)

**Goal.** The operator is building **Captain Sisay** for MTG Arena **Historic Brawl** (100 cards singleton, 1v1,
25 starting life, GW colour identity). You screen ONE chunk of their owned GW Arena cards
(`verify-2026-10-02/sisay/pool-NN.md`, named in your prompt) and list EVERY card that could earn one of the 99 slots.
A later builder ranks survivors from all 6 chunks and optimises until no swap improves the deck. A strong card you drop
is lost for good; a weak card you let through costs one line. **When in doubt, include.** No cap on passes.

**Commander.** Captain Sisay {2}{G}{W}, 2/2: "{T}: Search your library for a legendary card, reveal that card, put it
into your hand, then shuffle." Every turn she finds any LEGENDARY card: planeswalker, legendary creature, legendary
artifact/enchantment (the Reality Fracture "Way of the …" enchantments are legendary), legendary land, legendary
sorcery/instant. Legendary status is a real bonus for a card here.

**Operator's plan:** planeswalkers + Ajani + lifegain, Reality Fracture Way cards, fast mana, tokens.
- **Engine:** Way of the Paradox ("Whenever you activate a loyalty ability, you gain 1 life. You may play an additional
  land this turn") + Way of the Mentor ("Whenever you gain life, put a loyalty counter on each planeswalker you control").
  Way of the Healer gives every walker "−2: Create a 2/2 Cadet token. Surveil 1"; Way of the Wildspeaker gives
  "−4: Create a 4/4 Beast with trample". Each Way also makes/empowers a Jace planeswalker token (−1 surveil, −3 draw).
- Only ~13 GW planeswalkers are owned, so creatures and tokens carry much of the deck.

**Roles (tag each passed card with one or more):**
walker · legendary-value (a legendary card worth tutoring) · lifegain-source (esp. repeatable: creature/token ETB,
loyalty, attack) · lifegain-payoff · tokens (makers, doublers) · counters (proliferate, counter doubling, +1/+1 synergy)
· finisher (anthem/overrun/Craterhoof/alt-win/big threat) · ramp (dorks, rocks, land ramp; 0–2 MV fast mana prized)
· draw · removal (spot, one-sided or walker-sparing wipes) · protection (hexproof/indestructible/phasing/fog for board
or walkers, counter-magic denial) · tutor · land (any land better than a basic Forest/Plains: duals, fetches, utility,
legendary lands, colourless utility).

**Pass rule.** Pass a card if it would plausibly make a strong 99 for this plan in Historic Brawl. Pass anything
filling interaction, protection, ramp, draw or land quality. Skip only cards clearly below the bar
(vanilla-ish creatures, narrow limited cards, cards that need off-colour mana or a different plan).

**Output.** Write `verify-2026-10-02/sisay/screen-NN.md` (NN = your chunk number):
- Line 1: `screened <count>/<chunk size>, passed <n>, last card read: <exact name of the last card in the chunk>`.
- Then one line per passed card: `- Name — role(s) — "key oracle clause, quoted from the chunk"`.
- Use the exact name as printed between ** ** in the chunk. Quote oracle text from the chunk file, not memory.

**Rules.**
- Read the WHOLE chunk in pieces (Read with offset/limit), first card to last. Do not stop early.
- Write only your screen file. No other edits, no DB writes, no taskkill, no git.
- Chat reply ≤ 3 lines: your file's line 1.
