# Arena Esika // The Prismatic Bridge superfriends: fixed-point build

**Goal.** Build the strongest Esika, God of the Tree // The Prismatic Bridge superfriends deck for MTG Arena Historic Brawl
(100 cards, singleton, commander included, 1v1 at 25 life) from the operator's owned Arena cards. Start from the quick list
`verify-2026-10-02/esika/quick-v1.txt`. Swap until no remaining candidate beats any card in the deck. Operator rule: no top-N
caps. The stop condition is a full pass that finds zero improving swaps, and you must prove it.

**Commander (verbatim).**
- Esika, God of the Tree {1}{G}{G}: "Vigilance / {T}: Add one mana of any color. / Other legendary creatures you control have
  vigilance and "{T}: Add one mana of any color.""
- The Prismatic Bridge {W}{U}{B}{R}{G}: "At the beginning of your upkeep, reveal cards from the top of your library until you
  reveal a creature or planeswalker card. Put that card onto the battlefield and the rest on the bottom of your library in a
  random order."
- The commander is an MDFC, so either face can be cast from the command zone.

**What follows from that.**
- Bridge hits are every creature and planeswalker card. The hit's QUALITY is what matters: the first hit is taken, so a weak
  creature dilutes every later Bridge trigger. A card that is not a creature or planeswalker never comes off the Bridge. It is
  fine when drawn, but it must earn its slot on its own.
- Esika is turn-3 ramp and fixing. Legendary creatures become any-colour mana sources.
- Engine to keep honest, quoting deck text:
  - Way of the Paradox: life per loyalty activation, plus an extra land.
  - Way of the Mentor: a loyalty counter on each walker per life-gain event.
  - Liliana the Faultless: life whenever another creature or walker enters, so every Bridge hit is a Mentor trigger.
  - Sanctum Lurker: walkers survive at 0 loyalty, and "+2: 1 damage to each opponent, gain 1 life".
  - Doubling Season.
  - Tam, the Possibility in the 99: the walker discount, plus "{W}{U}{B}{R}{G}, {T}: proliferate X times".
- Tracked Arena games (12, Tam builds): land drops on own turns 3/4/5/6 hit 92/83/73/71 %. No mulligans. Colour screw is
  rare. So mana DEVELOPMENT is the weak point. Bridge needs WUBRG.
  - Consider 36–38 lands + ramp; target 37–40 mana sources counting lands, rocks and dorks, Esika included.
  - Basics: the operator wants a few for opponents' Path / Erode / Trophy. Keep ≥ 3, of the most-demanded colours.

**Inputs.**
- Candidates come from all of the following:
  - `verify-2026-09-30/arena-tam/screen-01.md` … `screen-11.md`: screened owned Brawl-legal cards. They were screened against a
    Tam list, so re-judge each for this plan; a screener's "beats X" is a hint, not a verdict.
  - `verify-2026-09-30/arena-tam/pool-01.md` … `pool-11.md`: full oracle text of every owned card NOT in that 09-30 list. Use it
    to check quotes and to find creatures/walkers a Tam screener may have dismissed but a Bridge deck wants.
  - `verify-2026-09-30/arena-tam/current.txt` and `decks/arena/tam-superfriends-v1.txt`: owned too (they were excluded from the
    pool because they were in the deck).
  - Owned since the 09-30 collection snapshot, so the gate's ownership check FAILS on them; that FAIL is accepted:
    Liliana the Faultless, Sanctum Lurker, Sarkhan the Masterless, Ugin, the Ineffable.
- Oracle text of anything else: query the live DB read-only:
  `C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data/mtg-deck-builder.db`, table `cards`; skip `layout` art_series/token rows.

**Method.**
1. Name the plan. Give every card in quick-v1 a role. Name the weakest card per role.
2. Rank ALL candidates with the current cards of each role on one scale. Swap the best candidate for the weakest card of that
   role, or the weakest overall if the roles differ. Re-rank and repeat until the best remaining candidate loses to the weakest
   kept card.
3. Stop proof per role: "best remaining candidate X loses to weakest kept Y because …", quoting oracle text.

**Checks.**
- Write `verify-2026-10-02/esika/final.txt` in Arena import format: `Commander`, `1 Esika, God of the Tree`, a blank line,
  `Deck`, then `1 Name` lines. Front-face names only, no set codes. Basics as `N Plains` etc.
- Gate, and fix everything except `plan` (known: no Esika/superfriends model) and the 4-card ownership FAIL above:
  `MTG_DB_DIR="C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-10-02/esika/final.txt --format brawl --owner 1 --source arena`

**Output files** (only these two).
- `final.txt`
- `build-report.md` (≤ 250 lines):
  1. The plan (≤ 6 lines).
  2. A health table, quick-v1 vs final: lands, ramp, draw, removal, wipes, protection, walkers (count + distinct types),
     creatures, Bridge-hit count and hit quality, win lines, avg MV.
  3. Every swap: IN | OUT | role | why IN (quote) | why OUT is weaker.
  4. The stop proof.
  5. The gate lines.
  6. Play notes (≤ 8 lines): when to cast Esika vs the Bridge first.

**Chat reply ≤ 20 lines:** the swap count, every swap as `+IN −OUT`, the land count, the gate verdict.

**Do not.**
- Edit anything else: not `decks/arena/`, not repo source.
- No DB writes, no git, no taskkill, no vitest.
- Never invent cards: every IN must be owned (pool/screen/current/v1 file, or the 4 named above).
