# Urza full rebuild from the found cards + free pool (2026-10-06, Opus builder)

**Verdict:** ✅ `final-2.txt` = Urza + 99, rebuilt from `pool.md` (315 free cards, 109 [FOUND]) with Sol Ring, Cityscape Leveler, Emeritus of Ideation, Entrancing Melody and Perplexing Test removed (not located) and **The Echoverse Fulcrum locked in**. 20 one-for-one changes vs the 10-02 draft (§2). Gate: all PASS except the known `plan` false negative; ownership PASS (no new FAILs). ⚠️ Mana: 38 lands + Sink (38.4) vs Karsten regression 39.5 (effective cost) / 40.2 (printed), simulation 37.5 (§4).
- Format: same as the draft (commander first, `31 Island` on one line, 70 lines = 100 cards).
- Sources: card text = DB (`pool.md`, `found-all.md`, `q.py`); rulings = Scryfall API 2026-10-06. Links = `py synergy.py` (10-02 `verdicts.py` rules extended to all 109 found cards; DB read-only). Link counts are rule upper bounds: affinity and "any spell" rules inflate Yue, Professor, April, Guardian, Enforcer and Soul; where both cards had 3+ links, the card text decided.
- Untagged pool (150 cards): every one was verdicted OUT in `verify-2026-10-02/urza/verdicts.md`; §3 re-tests each role's best untagged candidates against the new weakest kept card.
## §1 Verdicts for the 109 found cards (links vs final-2; * = in final-2; ⚠️ = near-tie)
| Card | Role | Verdict | Loses to / replaces | DB-quoted reason · links |
|---|---|---|---|---|
| Cryogen Relic | cheap draw | ✅ IN | Witching Well | "enters or leaves the battlefield, draw a card"; Well is a card down until "{3}{U}, Sacrifice". 25 vs 24 |
| Sapphire Charm | cantrip | ❌ | Cryogen Relic | Delayed draw for {U}, not an artifact spell. 27 (flying mode) |
| Experimental Aviator | threat | ❌ ⚠️ | Flesh Duplicate | 5 MV for two Thopters vs {U}{U} for an N/N Urza-copy Construct. 28 |
| Jadzi | threat | ❌ | Flesh Duplicate | Card-neutral loot; Fractals are not artifacts. 16 |
| Curse of the Swine | removal | ✅ kept | — | "Exile X target creatures." 6 |
| Deduce | draw | ❌ ⚠️ | Cryogen Relic | +1 over 3–4 mana, instant. 16 |
| Echoing Truth | removal | ❌ | Zuko's Exile | Bounce vs "Exile". 6 |
| Occult Epiphany | X draw | ❌ | Finale | "draw X cards, then discard X cards": card-neutral. 6 |
| Careful Consideration | draw | ❌ | Distant Melody | +1 for 4 vs +2–4 for 4. 6 |
| Day's Undoing | draw | ❌ | Cryogen Relic | "If it's your turn, end the turn": skips Unstoppable Plan's end step; refills 3 opponents. 6 |
| Scour for Scrap | tutor | ✅ kept | — | Artifact tutor and/or regrowth. 29 |
| Aminatou's Augury | draw | ❌ | Cerebral Download | 8 MV; X spells at X = 0 (Scryfall). 6 |
| Elixir of Immortality | 1-MV artifact | ❌ | Noble's Purse | Shuffles away Ruin/Scour targets; no ramp. 24 |
| Library of Leng | 1-MV artifact | ❌ | Noble's Purse | Only re-stacks Fulcrum/Agna loots. 26 |
| Rise from the Tides | threat | ❌ | Flesh Duplicate | "tapped" non-artifact Zombies. 24 |
| Portent of Calamity | X draw | ❌ | Finale | One card per type. 6 |
| Bane's Contingency | counter | ✅ IN ⚠️ | Countersculpt | Counter + "scry 2, then draw a card" if it targets Urza on the battlefield (Scryfall 2022-06-10). 8 vs 6 |
| Finale of Revelation | X draw | ✅ IN | Pull from Tomorrow | +1 card at the same {X}{U}{U}; X ≥ 10 "untap up to five lands". 6 vs 6 |
| Geode Golem | threat | ❌ | Flesh Duplicate | Commander tax still paid (Scryfall): saves 4. 26 |
| Memory Guardian | threat | ❌ | Filigree Attendant | Static 3/4 flier vs power = number of artifacts. 46 (affinity) |
| Unauthorized Exit | removal | ❌ | Sink into Stupor | Bounce + surveil 1; Sink also hits spells and is a land. 7 |
| Mocking Doppelganger | clone | ❌ | Flesh Duplicate | "a creature an opponent controls": no Urza copy. 12 |
| Octavia | threat | ❌ | Lord | Needs 8 instants/sorceries in graveyard (18 in the list). 30 |
| Candlestick | cheap artifact | ❌ ⚠️ | Cryogen Relic | Cycles for {U}+{2}; surveil needs equip + attack. 36 (equip) |
| Darksteel Colossus | finisher | ❌ | Rite / Sun Quan | {11}, no haste; Urza {5} finds it ~1 in 55. 27 |
| Yue | engine | ❌ | Traxos Kroog | Free cast gains MV − 5 (Super State +2 only). 60 (nominal) |
| Mondo Gecko | draw | ❌ | Reconnaissance Mission | "each color among permanents" = 1. 13 |
| Mishra's Bauble | cheap artifact | ❌ (cut) | The Echoverse Fulcrum (lock) | Weakest cheap card-flow artifact: card-neutral, sacrificed. 24 |
| God-Pharaoh's Statue | utility | ❌ ⚠️ | Karn | 6 MV tax vs Karn's 4-MV artifact lock + −2 exile pickup. 24 vs 25 |
| Distant Melody | draw | ✅ IN | Stock Up | "Draw a card for each permanent you control of that type": Thopter or Construct. 17 vs 6 |
| Lotus Ring | ramp | ❌ | Noble's Purse | "Equip {3}" + sacrifice a creature. 34 (equip) |
| Worldwalker Helm | engine | ✅ kept | — | Copies artifact tokens. 33 |
| The Lord of the Eagles | threat | ✅ IN | Hangarback Walker | Flash 8/8 flier, "costs {X} less" by flying power. 20 vs 30 |
| Proft | draw | ❌ | Pensive Professor | 4 scry/surveil enablers. 15 |
| Pensive Professor | draw engine | ✅ IN ⚠️ | Commander's Insight | Increment draws while mana spent > power or toughness (Scryfall 2026-03-20). 62 vs 6 |
| Dour Port-Mage | draw | ❌ | April O'Neil | Needs creatures leaving "without dying". 12 |
| Wishing Well | recursion | ❌ | Scour for Scrap | Sorcery speed, coins = MV. 39 |
| Into the Flood Maw | removal | ❌ | Zuko's | Bounce. 6 |
| Way of the Cryomancer | draw | ❌ | Melody | One Jace "−3: Draw a card". 8 |
| Sorcerous Spyglass | utility | ❌ | Karn | One name, non-mana abilities. 24 |
| Explorer's Scope | ramp | ❌ | Purse | Lands on attack only. 24 |
| Reverse Engineer | draw | ❌ (cut) | Cerebral Download | With Urza out improvise ≈ Urza mana; Download is an instant + "Surveil X". 35 vs 35 |
| Ingenious Prodigy | draw | ❌ | Professor | 1 card per upkeep. 12 |
| Flight | evasion | ❌ | Sun Quan | Flying on one creature. 7 |
| Quick Study | draw | ❌ | Melody | +1 for 3. 6 |
| Soulless Jailer | gy hate | ❌ | Soul-Guide Lantern | "can't cast noncreature spells from … exile" blocks our Urza {5}. 26 |
| Rite of Replication | finisher | ✅ IN | Cityscape Leveler (unavailable) | Kicked on Urza: five copies, each ETB a Construct (Scryfall: ETBs trigger; token copies keep printed text). 21 |
| Awakened Awareness | pump | ❌ | Super State | Base 1/1 + X. 7 |
| Katara's Reversal | counter | ✅ IN | You Find the Villains' Lair | "Counter up to four target spells and/or abilities. Untap up to four target artifacts": a 4-mana refund through Urza. 35 vs 6 |
| Desculpting Blast | removal | ❌ | Zuko's | Bounce. 23 |
| Cerebral Download | draw | ✅ IN | Reverse Engineer | Instant "Surveil X, where X is the number of artifacts you control. Then draw three cards." 35 vs 35 |
| Essence Capture | counter | ❌ | Strix Serenade | Creature-only at {U}{U}. 6 |
| Soul of New Phyrexia | protection / threat | ✅ IN ⚠️ | Steel Hellkite | "{5}: Permanents you control gain indestructible until end of turn": saves the board from destroy-wipes and makes the locked Fulcrum one-sided (§4b). 53 vs 27 |
| Metamorphic Blast | interaction | ❌ | Zuko's | Rabbit until end of turn. 6 |
| Shifting Grift | removal | ✅ kept | — | Exchange control. 14 |
| Visage Bandit | clone | ❌ ⚠️ | Flesh Duplicate | Permanent copy for 4 vs Urza-copy Construct for 2. 18 |
| Torpor Orb | stax | ❌ | — | "Creatures entering don't cause abilities to trigger": kills Urza's Construct |
| Extraordinary Journey | removal | ❌ | Curse of the Swine | Owner "may play it". 7 |
| Duelist of the Mind | threat | ❌ | Lord | Power = cards drawn this turn. 13 |
| Harmonized Trio | draw | ❌ | Melody | Prepare costs two creature taps. 12 |
| Giant's Boulder | 1-MV artifact | ❌ ⚠️ | Cryogen Relic | Scry 2 + late "{7} … Destroy target permanent". 25 |
| Secluded Starforge | land | ✅ IN | 38th land (Sol Ring slot) | {C} + "{5}, {T}: Create a 2/2 colorless Robot artifact creature token". 40 |
| Filigree Attendant | threat | ✅ IN | Donatello | "Flying", power = number of artifacts. 45 vs 40 |
| Emissary Escort | threat | ❌ | Flesh Duplicate | Ground 6–7/4. 36 |
| Torrential Gearhulk | value / threat | ❌ ⚠️ | Soul of New Phyrexia | Flash 2-for-1, but no Fulcrum link. 38 |
| Ember Island Production | clone | ❌ | Rite | Copies are "not legendary": no Urza ETB value. 6 |
| Candlekeep Sage | draw | ❌ | April O'Neil | Commander ETB/LTB only. 8 |
| Padeem | protection / draw | ❌ ⚠️ | Karn | Artifact hexproof + conditional upkeep draw. 39 |
| Myr Enforcer | threat | ❌ | Filigree Attendant | Ground 4/4 with affinity. 45 (affinity) |
| Pol Jamaar | draw / threat | ❌ ⚠️ | Reconnaissance Mission | Melody on a 6-MV body; the deck's curve is already heavy (§4). 24 |
| April, Reporter of the Weird | draw | ❌ | Reconnaissance Mission | Must connect itself. 13 |
| April O'Neil, Hacktivist | draw engine | ✅ IN | Mazemind Tome | "draw a card for each card type among spells you've cast this turn": ~2 a turn. 62 vs 25 |
| Lost in the Maze | interaction | ❌ | Katara | Tap/stun. 7 |
| Sun Quan | finisher | ✅ IN | Dawnsire | "Creatures you control have horsemanship": team unblockable. 31 vs 34 |
| Body Double | clone | ❌ | Flesh Duplicate | Graveyard-only copy. 18 |
| Double Down | engine | ❌ | — | Outlaw spells only. 7 |
| Esoteric Duplicator | engine | ❌ | Cryogen Relic | {2} per copy. 29 |
| Geralf | tokens | ❌ | Sai | Non-artifact Zombies. 13 |
| Unsummon | removal | ❌ | Zuko's | Bounce. 6 |
| River's Rebuke | wipe | ✅ IN | Perplexing Test (unavailable) | "all nonland permanents target player controls": one-sided. 6 |
| Amazing Acrobatics | counter | ❌ ⚠️ | Negate | 3 mana vs 2. 6 |
| Exclude | counter | ❌ ⚠️ | Strix Serenade | Creature-only for 3, cantrip. 6 |
| Zuko's Exile | removal | ✅ IN | Entrancing Melody (unavailable) | Instant "Exile target artifact, creature, or enchantment". 6 |
| Worn Powerstone | ramp | ✅ kept | — | {C}{C}. 24 |
| Subterfuge | evasion / draw | ❌ ⚠️ | Whirler Rogue | Flying, not unblockable. 33 |
| Contentious Plan | cantrip | ❌ | Relic | 6 |
| Reenact the Crime | copy | ❌ | Scour | This-turn graveyard only. 6 |
| Interdisciplinary Mascot | draw | ❌ | Download | 8 MV. 15 |
| Nimble Thopterist | tokens | ❌ | Whirler Rogue | One Thopter for 4. 28 |
| Seize the Secrets | draw | ❌ | Melody | +1 for 3. 6 |
| Noble's Purse | ramp | ✅ IN | Wayfarer's Bauble | 3 Treasures = 3 artifact tokens. 25 vs 24 |
| Take the Fall | cantrip | ❌ | Relic | 6 |
| Mindseeker Oculus | draw | ❌ | Melody | 4-loyalty Jace. 15 |
| Yuriko | cantrip | ❌ | Relic | Surveil only. 17 |
| Jailbreak Scheme | removal | ❌ | Zuko's | Owner picks top or bottom. 6 |
| Step Between Worlds | wheel | ❌ | — | Symmetric. 6 |
| Bitterthorn | ramp | ❌ | Purse | "Equip {3}". 24 |
| Tezzeret's Gambit | draw | ❌ | Download | +1 + proliferate. 5 |
| Thrummingbird | proliferate | ❌ | Lord | 1/1. 12 |
| Experimental Augury | cantrip | ❌ | Relic | 6 |
| Seasoned Cryomancer | draw | ❌ | Melody | Card-neutral loot. 15 |
| Fblthp | draw | ❌ | Reconnaissance Mission | One-shot. 13 |
| Tractor Beam | removal | ✅ kept | — | "You control enchanted permanent." 8 |
| Traxos, Scourge Eternal | threat / mana | ❌ ⚠️ | Traxos, Scourge of Kroog | 5/4 vs 7/7 with the same untap engine. 50 |
| Patchwork Automaton | threat | ❌ | Filigree Attendant | Ground 1/1 that grows. 44 |
| Traxos, Scourge of Kroog | threat / mana | ✅ IN ⚠️ | Golem Foundry | 7/7 trample for 4; "Whenever you cast a historic spell, untap" = +{U} per historic cast via Urza (Scryfall: historic = legendary, artifact, Saga). 47 vs 48 |
| Argentum Masticore | removal | ❌ ⚠️ | Tractor Beam | Costs a card each upkeep. 26 |
| Variable Chaser | wheel | ❌ | — | Symmetric wheel. 12 |
| Tetsuko Umezawa | evasion | ❌ | Sun Quan | Power/toughness ≤ 1 only. 20 |
## §2 Changes vs `verify-2026-10-02/urza/final.txt` (20)
| # | Out | In | Why |
|---|---|---|---|
| 1 | Witching Well | Cryogen Relic | A card on arrival and on exit |
| 2 | Stock Up | Distant Melody | +2–4 for 4 vs +1 for 3 |
| 3 | Pull from Tomorrow | Finale of Revelation | +1 card; refunds 5 lands at X ≥ 10 |
| 4 | Countersculpt | Bane's Contingency ⚠️ | Cantrips when protecting Urza |
| 5 | Hangarback Walker | The Lord of the Eagles | 8/8 flash flier |
| 6 | Wayfarer's Bauble | Noble's Purse | 3 artifact Treasures |
| 7 | You Find the Villains' Lair | Katara's Reversal | Counters 4 + untaps 4 artifacts |
| 8 | Perplexing Test (unavailable) | River's Rebuke | One-sided bounce |
| 9 | Reverse Engineer | Cerebral Download | Instant + surveil X |
| 10 | Mazemind Tome | April O'Neil, Hacktivist | ~2 cards per turn |
| 11 | Commander's Insight | Pensive Professor ⚠️ | Repeating draw |
| 12 | Donatello | Filigree Attendant | Flying, power = artifacts |
| 13 | Dawnsire | Sun Quan | Team unblockable |
| 14 | Golem Foundry | Traxos, Scourge of Kroog ⚠️ | 7/7 + Urza mana |
| 15 | Steel Hellkite | Soul of New Phyrexia ⚠️ | Board indestructible; one-sided Fulcrum |
| 16 | Cityscape Leveler (unavailable) | Rite of Replication | Kicked: 5 Constructs |
| 17 | Sol Ring (unavailable) | Secluded Starforge (38th land) | Karsten (§4); the pool has no other 1–2-MV {C}{C} |
| 18 | Emeritus of Ideation (unavailable) | Reconnaissance Mission | "Whenever a creature you control deals combat damage to a player, you may draw a card" + "Cycling {2}" |
| 19 | Entrancing Melody (unavailable) | Zuko's Exile | Instant exile; Tractor Beam stays |
| 20 | Mishra's Bauble | The Echoverse Fulcrum 🔒 | Operator lock; cuts the weakest cheap card-flow artifact |

Composition: 61 nonland, 25 artifacts (+ Treasures/tokens), 18 instants/sorceries, 12 ramp, 14 card advantage, 6 counters, 8 removal, 1 wipe + Fulcrum.
## §3 Stop proof (weakest kept per role vs the best remaining pool card, found or untagged)
| Role | Weakest kept | Best left out | Why it stops |
|---|---|---|---|
| Ramp | Sky Diamond / Worn Powerstone / Sphere | Hedron Archive ⚠️, Decanter, Murmuring Volume, Firdoch Core, other 3-MV rocks, Wayfarer's (cut) | Under Urza any artifact taps for {U}, so a 1-mana 3-MV rock adds nothing; the kept rocks are the only ≤ 2-MV accelerants or add a second axis ({C}{C}, untap, draw) |
| Cheap draw | Cryogen Relic / Waterbending Scroll | Bauble (lock cut), Candlestick ⚠️, Deduce ⚠️, Boulder ⚠️, Sewer-veillance Cam, Witching Well | All card-neutral or +1 for more mana |
| Draw | Melody / Professor / Mission | Pol Jamaar ⚠️, Harmonized Crescendo, Coastal Piracy (= Mission without cycling), Commander's Insight, Stroke of Genius, Padeem ⚠️ | Pol and Crescendo are Melody for +2 mana |
| X draw | Finale / Wan Shi Tong | Insight, Stroke, Occult, Portent | Finale draws more per mana |
| Engines | Glaring Fleshraker | Golem Foundry ⚠️, Traxos Eternal ⚠️, Owlin (3 X spells left), Yue | Fleshraker pings per colourless creature entering |
| Threats | Flesh Duplicate (19) / Lord (20) | Gearhulk ⚠️, Hangarback, Donatello, Aviator ⚠️, Visage Bandit ⚠️, Tempest Djinn, Guardian | Duplicate's Urza copy makes an N/N Construct for {U}{U}; Lord is 8 flying power for ~4 |
| Finishers | Super State / Whirler / Rite | Steel Hellkite, Dawnsire, Colossus, Eldrazi Conscription, Subterfuge ⚠️ | Rite and Sun Quan win the win-turn test |
| Counters | Negate / Strix | Acrobatics ⚠️, Exclude ⚠️, Countersculpt, Lair, Spell Pierce, Syncopate | 2-MV and 1-MV vs 3 |
| Removal | Tractor Beam (8) / Shifting Grift (14) | Masticore ⚠️, Plan for All Outcomes, Devourer ({C}{C}), the bounces | Permanent answers vs card-per-turn or tempo |
| Wipe | River's Rebuke | Zimone's Hypothesis | One-sided vs parity bounce |
| Protection / utility | Ghostly Flicker / Karn | Padeem ⚠️, Statue ⚠️, Hammer of Nazahn | Flicker re-triggers Urza; Karn locks opposing artifacts |
| Lands | War Room / Island | Command Tower, the tapped and filter lands | 10-02 verdicts stand |

Full pass over 315 cards: no improving swap. Stop.
## §4 Synergy and mana
- Synergy: 939 pairs, min 1, median 25, max 63. 5 lowest: Agna Qel'a 1, War Room 1, Counterspell 6, Curse 6, Finale 6 (exempt roles). Lowest non-exempt: Ghostly Flicker 15, Volatile Stormdrake 15, Wan Shi Tong 17, Flesh Duplicate 19, Lord 20. Fulcrum 24.
- Karsten regression 31.42 + 3.13·3.525 − 0.28·8 = **40.2** printed; **39.5** with Lord ~4, Monitor 2, Kappa 3. Karsten simulation: 42 − 3 to 4 (≈ 9 rocks) − 1 (cheap draw) = **37.5**. The list: 38 + Sink = **38.4**. ⚠️ Gate: "Karsten wants 40 ±2", PASS. Purse adds 3 one-shot Treasures.
- Blue: 33 blue lands (31 Island, Seat, Agna) + Sink. {C} for Glaring Fleshraker ({2}{C}): 8 sources (5 lands, Powerstone, Dynamo, Palladium Myr; Sol Ring gone) ⚠️.
## §4b The Echoverse Fulcrum (lock): plan interaction and pilot line
- **As an artifact (most games).** It is a 2-MV legendary artifact: "draw a card, then discard a card" on ETB. It taps for {U} through Urza, counts +1 for the Construct and Filigree Attendant, triggers Sai, Efficient and Seedshark, and untaps Traxos (historic).
- **As a wipe.** "{5}, {T}, Exile The Echoverse Fulcrum: Destroy all creatures. Activate only as a sorcery."
  - It kills Urza (send him to the command zone; the tax rises by {2}), every Construct, Thopter, Golem, Robot and Spawn, plus Attendant, Lord, Kroog, Kappa, Whirler, Sai, Seedshark, Professor, April and WST.
  - Survivors: every noncreature artifact (rocks, Helm, Planetarium, Purse and its Treasures, Scroll, Relic) and the enchantments. Super State goes to the graveyard with its host.
- **One-sided line.** Soul of New Phyrexia "{5}: Permanents you control gain indestructible until end of turn", then Fulcrum "{5}, {T}". That is 10 mana and leaves only the opponents' creatures dead.
  - Do not tap Fulcrum for Urza mana that turn.
  - Soul's graveyard ability ("{5}, Exile this card from your graveyard") also works if Soul has already died.
- **When to activate:**
  - (a) We are behind on board, and an opposing creature board or a creature combo threatens to kill us before our Construct closes.
  - (b) With Soul available, as a precombat one-sided wipe, then attack into an empty board (indestructible lasts until end of turn).
  - Never activate it while our Construct + Super State is the only threat on the table, unless Soul is active.
- **What to hold back before a symmetric activation:** Urza goes to the command zone. Keep Rite of Replication, Flesh Duplicate, Whirler Rogue or Filigree Attendant in hand to rebuild. The noncreature artifacts survive, so the recast Urza's new Construct enters at N/N at once.
## §5 Gate (`gate-final-2.txt`, brief command, `--owner 1 --source paper`)
```
PASS size/singleton/legality/rules/identity | PASS ownership (all owned; imported 0 days ago)
WARN arenaNames (Arena only) | PASS lands 38 (+1 MDFC = 38.4), Karsten wants 40 ±2
FAIL plan 13/61 (21%), known false negative | PASS curve 3.52 | wincons 12 | locks 0
```
## §6 Operator decisions and near-ties
1. **Emeritus of Ideation** (hidden): when found, it goes in for Reconnaissance Mission (its replacement slot). Near-tie alternative: for Pensive Professor.
2. **Mana:** 38.4 vs regression 39.5–40.2. If the deck stumbles, Island #32 in for Shifting Grift.
3. **Sol Ring**, if found: in for Island #31 (−1 land; cheap count +1).
4. Near-ties to flip:
   | Swap | Trade-off |
   |---|---|
   | Soul of New Phyrexia ↔ Torrential Gearhulk | Fulcrum one-sided + anti-wipe vs a flash 2-for-1 |
   | Traxos Kroog ↔ Golem Foundry | 7/7 plus Urza mana vs a 3/3 Golem every 3 artifact spells |
   | Pensive Professor ↔ Commander's Insight | Repeating draw vs an instant X draw |
   | Bane's ↔ Countersculpt | Cantrips when protecting Urza vs a surveil-1 Jace token |
   | Reconnaissance Mission ↔ Pol Jamaar | 4-MV combat draw + cycling vs a 6-MV draw on a body |
   | Padeem / God-Pharaoh's Statue ↔ Karn | Hexproof + draw, or a spell tax, vs Karn's artifact lock |
   | Hedron Archive ↔ Secluded Starforge | Rock + draw 2 vs the 38th land |
## §7 Talrand-deck candidates (found cards not used here)
Sapphire Charm, Echoing Truth, Occult Epiphany, Careful Consideration, Day's Undoing, Aminatou's Augury, Rise from the Tides, Portent of Calamity, Unauthorized Exit, Octavia, Jadzi, Library of Leng, Into the Flood Maw, Quick Study, Desculpting Blast, Essence Capture, Metamorphic Blast, Unsummon, Amazing Acrobatics, Exclude, Contentious Plan, Reenact the Crime, Seize the Secrets, Take the Fall, Jailbreak Scheme, Step Between Worlds, Tezzeret's Gambit, Experimental Augury, Wishing Well, Way of the Cryomancer, Harmonized Trio, Variable Chaser, Geralf, Deduce. Already in Urza (one copy each): Bane's, Finale, Katara's, Download, Zuko's, Rebuke, Curse, Rite.
