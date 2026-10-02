# Captain Sisay — fixed-point build

**Goal.** Build the strongest Captain Sisay deck for MTG Arena **Historic Brawl** (100 cards singleton incl. commander,
1v1, 25 starting life) from the operator's owned GW Arena cards. Start from `quick-v1.txt`. Swap until no remaining
candidate beats any card in the deck. Operator rule: no top-N caps — the stop condition is a full pass with zero
improving swaps, and you must prove it.

**Operator's ask (verbatim intent):** "the most optimal deck that revolves around planeswalkers and ajani and lifegain,
since the commander can tutor legendaries. I want reality fracture way cards, fast mana, tokens etc." Honour that
identity: walkers, both Ajanis, lifegain, the four GW Ways, fast mana and tokens stay the core; optimise inside it.

**Inputs (verify-2026-10-02/sisay/).**
- `quick-v1.txt`: the current 100 (gate-checked). Look up each card's oracle in the pool files.
- `screen-01.md` … `screen-06.md`: every owned, Brawl-legal GW card the screeners judged could earn a slot, with role
  and quoted clause. Together they cover all 1,775 owned GW cards.
- `pool-01.md` … `pool-06.md`: full oracle text of every owned GW card ([LIST] = in the operator's pasted list).
  Verify a screener's quote here before relying on it. A card absent from every pool file is NOT owned.

**Commander and engine (quote these from the pool files).**
- Captain Sisay {2}{G}{W}: "{T}: Search your library for a legendary card, reveal that card, put it into your hand,
  then shuffle." Legendary density and untap effects (Tezzeret, Cruel Captain 0; Formidable Speaker) multiply her.
  Haste (Lightning Greaves, Swiftfoot Boots) lets her tutor the turn she lands.
- Way of the Paradox (gain 1 life per loyalty activation, extra land drop) + Way of the Mentor (loyalty counter on each
  walker per life-gain event); Way of the Healer (every walker gets −2: 2/2 Cadet + surveil 1); Way of the Wildspeaker
  (every walker gets −4: 4/4 trample Beast). Each Way empowers a Jace token walker.
- Life-gain events, not amounts, drive Mentor: creature/token ETB triggers (Liliana the Faultless, Aunt May, Haliya,
  Greenhouse Propagator, Dazzling Angel, Belladonna Took) and separate lifelink sources each count.

**Method.**
1. Name the plan and every card's role in quick-v1; mark the weakest card per role.
2. Read every screen file in full. Per role, rank ALL candidates together with the current cards of that role on one scale.
3. Swap the best candidate for the weakest card of the same role (or the weakest card overall if roles differ).
   Re-rank. Repeat until the best remaining candidate loses to the weakest kept card.
   - Mana: 1v1 at 25 life. quick-v1 runs 35 lands + 10 dorks/rocks; justify any change with a count of sources and pips.
     Nissa, Who Shakes the World rewards Forests. Keep G and W sources balanced against pips.
   - A tapped land must earn its slot over a basic.
   - Arena Brawl has no sideboard: "outside the game" effects find nothing.
4. Stop proof per role: "best remaining candidate X loses to weakest kept card Y because …", quoting oracle text.

**Checks.**
- Write `final.txt` in Arena import format: `Commander`, `1 Captain Sisay`, blank line, `Deck`, then `1 Name` lines
  (basics as `N Forest`). No set codes; double-faced cards by front name only.
- Run the gate and fix everything except the two known false FAILs:
  `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-10-02/sisay/final.txt --format brawl --owner 1`
  Known: `plan` FAIL (the gate cannot model a legendary-tutor commander); `ownership` FAIL ONLY for cards tagged [LIST]
  in the pool whose names are Liliana the Faultless, Germinate Recruits, Kindred Judgment, Guiding Hydra, Tarmogoyf,
  Jiang Yanggu, Never Alone, Ghalta the Unstoppable (owned per the operator's paste, newer than the DB snapshot).
  Any other ownership failure is a real error.
- Flawless Maneuver and Obscuring Haze are banned in Brawl: never include them.

**Output files.**
- `final.txt`.
- `build-report.md` (≤ 250 lines):
  1. The plan (≤ 6 lines) and the legendary count (Sisay targets).
  2. Health table quick-v1 vs final: lands, ramp, draw, removal, wipes, protection, walkers, lifegain engines,
     token makers, tutors/untappers, win lines, avg MV.
  3. Every swap, ranked: IN | OUT | role | why IN (quote) | why OUT is weaker.
  4. Stop proof per role.
  5. The gate lines.
  6. Mulligan / play notes (≤ 8 lines), incl. the best Sisay tutor sequence.
- Chat reply ≤ 15 lines: swap count, top 10 swaps, gate verdict.

**Do not.** Edit anything besides `final.txt` and `build-report.md`. No DB writes, no vitest, no taskkill, no git.
Do not invent cards: every IN must appear in a pool file.
