# Arena Vivi — fixed-point competitive build (2026-09-30)

Inputs: `deck.md` (current 100), `screen-01..04.md` (581 candidates, `check-screens.py` OK x4), `pool-01..04.md`.
Output: `final.txt` (100 cards, 50 swaps). Scratch: `sim/mana_sim.py`, `sim/stats.py`, `sim/lookup.py`, `sim/own.ts`.

## 1. Plan and win lines

Spellslinger around A-Vivi Ornitier: 26 one-drops and 20 two-drops, 61 noncreature spells, 6 creatures. Every cheap spell
= +1/+1 counter, 1 damage (2 with Tomik, 3 with Artist's Talent L3, all doubled by Harmonic Prodigy — Vivi is a Wizard),
and Vivi taps for power-many U/R. Win lines, in order of frequency:
1. **Pings + burn.** 12–15 noncreature spells over turns 3–6 with Tomik/Guttersnipe on board is 25 damage; Boltwave, Grapeshot,
   Lightning Bolt/Strike, Choco-Comet close the last points.
2. **Hapatra loop.** "{2}{U}: Untap target creature." Vivi taps for X ≥ 4 (X ≥ 2 with Training Grounds: "cost {2} less …
   can't reduce … to less than one mana") → infinite U/R → Choco-Comet / Traumatic Critique / Ajani's Anguish for X = lethal
   (each cast also pings). Tutors: Mystical Tutor (the two X instants/sorceries), Gamble (Hapatra).
3. **Aggravated Assault.** "{3}{R}{R}: Untap all creatures you control … Activate only as a sorcery." — no once-per-turn clause.
   Vivi at power ≥ 6 = infinite mana in a main phase; any other creature then attacks in infinitely many combats.
4. **Vivi beats.** An 8/11 by turn 6; Past in Flames rebuys the cheap spells for a lethal ping turn if she is answered.

## 2. Health table

| Metric | Current | Final |
|---|---|---|
| Lands (+ land-face MDFC) | 35 (+1) | 32 (+3) — 35 land-capable |
| Ramp / rocks | 6 (Signet, Izzet Signet, Talisman, Mind Stone, Lantern, Bauble) | 4 (Signet, Izzet Signet, Talisman, Mox Amber) |
| Cantrips (≤ 2 MV, card-neutral) | 10 | 9 (Brainstorm, Ponder, Preordain, Opt, Consider, Bauble, Looting, Expressive Iteration, Gamble) |
| Draw engines / draw-2+ | 8 | 11 (One Ring, Jeska's Will, Frantic Search, Cruise, Windfall, Light Up the Stage, Curiosity, Ral, Chandra, Archmage Emeritus, Traumatic Critique) |
| Counters | 4 | 9 |
| Spot removal | 6 | 10 (+3 MDFC: Spikefield, Shatterskull, Sink into Stupor) |
| Wipes | 1 (Blasphemous Act, symmetric) | 1 (Nibelheim Aflame, one-sided) |
| Vivi protection | 0 | 6 (Boots, Greaves, Dive Down, Chase Inspiration, Magic Damper, Fleeting Reflection) |
| Rituals / cost reducers / extra spells | 3 | 5 (Birgi, Artist's Talent, Jeska's Will, Training Grounds, Past in Flames) |
| X spells / finishers | 3 | 8 (Choco-Comet, Traumatic Critique, Ajani's Anguish, Grapeshot, Boltwave, Aggravated Assault, Hapatra, Shatterskull X) |
| Creatures | 15 | 6 |
| Noncreature spells | 50 | 61 |
| Avg MV (nonland) | 2.54 | 2.04 |

## 3. Swaps (50), ranked by impact — IN | OUT | role | why IN | why OUT is weaker

1. Hapatra, the Desert Frost | Ovika, Enigma Goliath | combo | "{2}{U}: Untap target creature." = infinite mana with Vivi ≥ 4 power; ETB stuns their best creature | 7-mana creature that only makes tokens.
2. Choco-Comet | Involuntary Employment | X finisher | "deals X damage to any target" — the Hapatra/AA outlet, also a big removal spell | 4-mana Threaten with no board to sacrifice into.
3. Traumatic Critique | Shark Typhoon | X finisher | "deals X damage to any target. Draw two cards" at instant speed | 6-mana enchantment; cycling is not a spell, so no Vivi trigger.
4. Swiftfoot Boots | Agatha's Soul Cauldron | protection | "Equipped creature has hexproof and haste" — Vivi taps the turn she is (re)cast and dodges every targeted answer | needs exiled creatures; the deck has none.
5. Lightning Greaves | Ashnod's Altar | protection | "haste and shroud … Equip {0}" — free re-protection after each recast | sacrifice outlet with nothing to sacrifice.
6. Harmonic Prodigy | Electrostatic Infantry | engine | "If a triggered ability of a Shaman or another Wizard you control triggers, that ability triggers an additional time" — Vivi (Wizard) gets 2 counters + 2 pings per spell; Guttersnipe (Shaman) and Archmage (Wizard) double too | only grows on instants/sorceries, no reach.
7. Tomik, Izzet Sparkmage | Third Path Iconoclast | engine | "noncombat damage to an opponent … that much damage plus 1" — every ping is 2; a 2-mana Wizard | 1/1 Soldier tokens do not win a 1v1.
8. Aggravated Assault | Impact Tremors | finisher | infinite untaps at Vivi ≥ 6 (see §1) | 1 damage per creature entering in a deck with 6 creatures.
9. The One Ring | Panharmonicon | draw | "protection from everything until your next turn … draw a card for each burden counter" | doubles only ETB triggers; the deck has almost none.
10. Jeska's Will | Big Score | draw + ritual | with a commander "choose both": "Add {R} for each card in target opponent's hand" + "Exile the top three … you may play them this turn" for 3 mana | 4 mana for the same 2 cards + 2 Treasures as Windfall; the second copy is the worst 4-drop.
11. Swan Song | Contentious Plan | counter | "Counter target enchantment, instant, or sorcery spell" for {U} — answers their removal on Vivi | proliferate + draw for 2 is a slow cantrip.
12. Spell Pierce | Hard Evidence | counter | "Counter target noncreature spell unless its controller pays {2}" — 1 mana, protects the Vivi turn | a 0/3 Crab and a Clue for {U}.
13. Wizard's Retort | Clinquant Skymage | counter | "costs {1} less … if you control a Wizard. Counter target spell" — a {U}{U} Counterspell with Vivi out | 4-mana 1/1 flier.
14. Counterspell kept; Daze | Deduce | counter | "return an Island … rather than pay … Counter target spell unless its controller pays {1}" — free interaction while tapped out for Vivi | 2-mana cantrip.
15. Izzet Charm | Resculpt | counter/removal | counter noncreature unless {2}, 2 damage, or loot 2 — three modes at 2 mana | gives the opponent a 4/4.
16. Lightning Bolt kept; Burst Lightning | Planar Incision | removal | "2 damage to any target … kicked, 4" at {R} | flicker with a +1/+1 counter, no answer.
17. Unholy Heat | Sticky Fingers | removal | "2 damage … Delirium — 6 damage" for {R} | aura that needs Vivi to connect in combat.
18. Wrath of the Bloodmane | Waterbender Ascension | removal | "costs {1} less … if you control a legendary creature. 4 damage to target creature or planeswalker" — {1}{R} instant with Vivi | quest counters from combat damage the deck never deals.
19. Fiery Annihilation | Blasphemous Act | removal | "5 damage … If that creature would die this turn, exile it instead" — exiles opposing commanders | kills Vivi; symmetric 13 damage is wrong in a deck whose plan is one creature.
20. Lightning Strike | Dualcaster Mage | removal/burn | "3 damage to any target" instant | 3-mana creature that needs a spell on the stack.
21. Pongify | Kraum, Violent Cacophony | removal | "Destroy target creature" for {U} | 4-mana flier; Vivi is the only body worth drawing off.
22. Into the Flood Maw | Mulldrifter | removal | {U} bounce; gift mode hits any nonland permanent (planeswalkers, indestructible commanders) | 5-mana creature; 3-mana evoke draws 2 and is not a Vivi trigger.
23. Dive Down | Cavern of Souls | protection | "+0/+3 and gains hexproof" for {U} at instant speed | colourless land whose mode only helps creature spells.
24. Chase Inspiration | Secluded Courtyard | protection | same text as Dive Down | colourless land, creature-type restricted.
25. Magic Damper | Darksteel Citadel | protection | "+1/+1 and gains hexproof … Untap it" — protects and doubles Vivi's mana that turn | indestructible colourless land in a UU/RR deck.
26. Fleeting Reflection | Dramatic Reversal | protection | "gains hexproof … Untap that creature" — the same untap plus hexproof at instant speed | untap with no protection; not infinite without Isochron Scepter (not on Arena).
27. Birgi, God of Storytelling | Storm-Kiln Artist | ritual engine | "Whenever you cast a spell, add {R}. Until end of turn, you don't lose this mana" — every one-drop is free | 4 mana, Treasures only on instants/sorceries.
28. Archmage Emeritus | Ashling, Flame Dancer | draw engine | "Magecraft — … draw a card" — 2 cards per spell with Prodigy | 4-mana loot engine with a self-damage clause that rarely reaches 3 triggers.
29. Guttersnipe | Young Pyromancer | payoff | "Whenever you cast an instant or sorcery spell, this creature deals 2 damage to each opponent" (4 with Prodigy: Shaman) | 1/1 Elementals.
30. Ajani's Anguish | Goldspan Dragon | X finisher | "When this enchantment enters, it deals X damage to any target" — third infinite-mana outlet, a Vivi trigger | 5-mana creature spell; Treasures only on attack.
31. Grapeshot | Murmuring Mystic | finisher | "1 damage to any target. Storm" — the 5th spell of a Vivi turn is 5+ damage | 4-mana 1/1 tokens.
32. Boltwave | Tempest Angler | burn | "3 damage to each opponent" for {R} — 4 with Tomik, plus the ping | a second, worse Vivi that makes no mana.
33. Past in Flames | Leyline of Anticipation | extra spells | "Each instant and sorcery card in your graveyard gains flashback" — one Vivi turn recasts the cheap spells for lethal pings | 4-mana enchantment that does nothing to the board.
34. Chandra, Torch of Defiance | Brass's Tunnel-Grinder | draw/ramp | "+1: Exile the top card … you may cast that card … +1: Add {R}{R}. −3: 4 damage" | one-shot loot that needs three descents to flip.
35. Treasure Cruise | Seize the Spoils | draw | "Delve. Draw three cards" — {U} for three after two cantrip turns | 3 mana, discard, draw 2.
36. Light Up the Stage | Thrill of Possibility | draw | "Spectacle {R} … Exile the top two … you may play those cards" — every Vivi ping turns spectacle on | 2 mana, discard, draw 2.
37. Mishra's Bauble | Wayfarer's Bauble | cantrip | "{0} … Draw a card at the beginning of the next turn's upkeep" — a free Vivi trigger | 3 mana total for a tapped basic.
38. Mox Amber | Chromatic Lantern | rock | "{T}: Add one mana of any color among legendary creatures … you control" — {0} with Vivi out, a free trigger | 3-mana rock in a 2-colour deck.
39. Gamble | Stormchaser's Talent | tutor | "Search your library for a card, put that card into your hand, discard a card at random" — finds Hapatra / Boots / One Ring for {R} | 1/1 Otter; level 2 costs 4.
40. Nibelheim Aflame | Mind Stone | wipe | "Choose target creature you control. It deals damage equal to its power to each other creature" — one-sided once Vivi is 4+ | colourless rock; the deck wants coloured mana on turn 2.
41. Shatterskull Smashing | Terramorphic Expanse | MDFC | "X damage divided … If X is 6 or more … twice X" or an untapped Mountain | tapped fetch for a basic.
42. Spikefield Hazard | Evolving Wilds | MDFC | "1 damage to any target … exile it instead" (kills mana dorks, finishes a ping) or a land | tapped fetch.
43. Sink into Stupor kept; Multiversal Passage | Ash Barrens | land | "choose a basic land type. Then you may pay 2 life. If you don't, it enters tapped" — an untapped Island/Mountain (fetchable type) | colourless unless landcycled for {1}.
44. Riverpyre Verge | Buried Ruin | land | "{T}: Add {R}. {T}: Add {U}. Activate only if you control an Island or a Mountain" — untapped dual | colourless; 3 artifacts worth returning.
45. Thran Portal | Reliquary Tower | land | fast dual (untapped with ≤ 2 other lands) with a chosen basic type | colourless; hand size is not the problem.
46. Otawara, Soaring City | Rogue's Passage | land | untapped {U} plus "Channel — {3}{U} … Return target artifact, creature, enchantment, or planeswalker", cheaper with Vivi | colourless; 5 mana for unblockable.
47. Sokenzan, Crucible of Defiance | Gemstone Caverns | land | untapped {R} plus two hasty 1/1s late | colourless unless in the opening hand on the draw.
48. Island | Temple of Epiphany | land | untapped, fetchable by Tarn/Misty/Strand | enters tapped.
49. Island | Proft's Eidetic Memory | land | see §5: 35 land-capable beats 34 on Vivi-by-T3 without raising flood | 2 mana for one card; the counter mode needs 2 draws in a turn.
50. Mountain | Ragavan, Nimble Pilferer | land | 33rd coloured source | a creature spell (no trigger) that must connect in combat.

Kept from the current list (50): Abrade, An Offer You Can't Refuse, Arcane Signet, Artist's Talent, Brainstorm, Command Tower,
Consider, Counterspell, Curiosity ("Whenever enchanted creature deals damage to an opponent, you may draw a card" — Vivi's ping
is damage, so it draws per spell), Expressive Iteration, Fabled Passage, Faithless Looting, Flooded Strand, Frantic Search,
Island x7, Izzet Signet, Lightning Bolt, Misty Rainforest, Mountain x8, Mystic Sanctuary, Mystical Tutor, Negate, Opt, Ponder,
Preordain, Ral Crackling Wit, Rapid Hybridization, Scalding Tarn, Sink into Stupor, Spirebluff Canal, Steam Vents,
Stormcarved Coast, Talisman of Creativity, Three Steps Ahead, Training Grounds, Unexpected Windfall.

## 4. Stop proof — best remaining candidate per role vs weakest kept

- **Combo / finisher.** Best remaining: Kang the Conqueror ("{5}{U}{U}{U}: … Take an extra turn") and Mathemagics ("draws 2ˣ
  cards") — both need the loop to matter and do nothing before it; Fling ("sacrifice a creature … damage equal to the
  sacrificed creature's power") throws away the engine; Inescapable Blaze is 6 mana for 6. Weakest kept: Boltwave — {R}, 3
  damage now, a trigger, no setup. Each loses because Boltwave is live from turn 1 and every outlet slot beyond three
  (Choco-Comet, Traumatic Critique, Ajani's Anguish, all usable without the loop) is a dead draw. Dark Depths + Thespian's
  Stage: no land tutor exists in the U/R Arena pool; P(both among the ~17 cards seen by T6) = 17/99 · 16/98 ≈ 2.8 %, and
  Dark Depths makes no mana — loses to the 9th Mountain.
- **Engines.** Best remaining: Underworld Breach ("Each nonland card in your graveyard has escape … exile three other cards")
  — the same rebuy as Past in Flames but rationed at 3 graveyard cards per spell and sacrificed at end step; Thousand-Year
  Storm — 6 mana, copies do not trigger Vivi ("Whenever you cast"); Longshot — 4 mana for what Guttersnipe does at 3 without
  Prodigy doubling; Glamdring ("cost {X} less" reduces generic only — Ponder, Bolt, Counterspell, Expressive Iteration have
  none; Birgi refunds every spell); Storm-Kiln Artist, Electro, Goblin Electromancer / Ral Monsoon Mage (generic-only
  reducers) likewise. Weakest kept: Past in Flames — one card that converts a full graveyard into a lethal ping turn.
- **Protection.** Best remaining: Octopus Form (identical text to Magic Damper), Slip Out the Back, Mithril Coat ("Equipped
  creature has indestructible" — bounce and exile ignore it). Weakest kept: Chase Inspiration. A 7th reactive piece loses
  because each is dead without Vivi on board and six already cover the 6–8 targeted answers a 1v1 opponent draws by T7;
  Octopus Form is not better than any kept piece, so it cannot displace one.
- **Counters.** Best remaining: Mana Sculpt (3 mana; the {C} arrives next turn), Remand (tempo, 2 mana), Essence Scatter /
  Dispel (half the threats each), Miscast. Weakest kept: Daze — {0} with an Island, the only counter castable on the Vivi
  turn while tapped out; the 10th counter loses because past nine the deck taps out for Vivi and spells on its own turns.
- **Removal.** Best remaining: Scorching Dragonfire ({1}{R}, 3 exile), Play with Fire / Shock ({R}, 2 any target), Giantfall
  (needs Vivi on board), Thunder Magic. Weakest kept: Into the Flood Maw — {U}, answers anything at instant speed including
  indestructible or hexproof-to-red commanders (gift mode: "return target nonland permanent"). Dragonfire loses on mana;
  Shock loses on what it kills (2 damage misses most Brawl commanders); 13 answers + 9 counters is already 22 interaction.
- **Wipes.** Best remaining: Volcanic Torrent (5 mana, X = spells this turn), Pyroclasm / Fire Magic (kill a fresh 0/3 Vivi),
  River's Rebuke (6 mana). Nibelheim Aflame is one-sided at Vivi ≥ 4 and flashbacks for 4 cards.
- **Cantrips / selection.** Best remaining: Sleight of Hand (sorcery), Expedite / Crimson Wisps (blind draw + haste), Think
  Twice (2 mana), Lembas / Guidelight Matrix (2-mana artifacts). Weakest kept: Consider — {U} instant, surveil + draw, castable
  at end of turn while holding a counter. Sorcery selection and 2-mana cantrips lose on timing and rate; haste is only worth a
  slot when Boots and Greaves are both missing.
- **Draw.** Best remaining: Big Score (duplicate of Windfall at 4), Tezzeret's Gambit (4), Narset (3 mana, 2 cards over two
  turns), Stock Up (3), Chart a Course (2, discard). Weakest kept: Light Up the Stage — {R} for two cards whenever Vivi pinged.
  Every candidate pays 2–3 more mana for the same or fewer cards.
- **Creatures.** Best remaining: Longshot (see engines), Kessig Flamebreather (1 damage, 2 mana), Displacer Kitten (flickering
  Vivi resets her counters), Guttersnipe already in. Weakest kept: Archmage Emeritus — 4 mana, but draws one (two with Prodigy)
  per instant/sorcery in a 40-instant/sorcery deck; a 2-power pinger loses to card flow.
- **Rocks.** Best remaining: Mind Stone (colourless), Mox Opal (metalcraft off until T4+), Barrels of Blasting Jelly ({1}: one
  mana once per turn — a filter). Weakest kept: Talisman of Creativity — coloured mana on T2 for Vivi on T3.
- **Lands.** Best remaining: Thundering Falls / Temple of Epiphany (tapped), Airship Engine Room and Spectacle Summit (both
  "enters tapped" — the screeners misread them), Innovative Commons (tapped without a planeswalker), Fabled Passage kept.
  Weakest kept: Mystic Sanctuary — untapped once three Islands are out, rebuys Choco-Comet. A tapped dual loses a Vivi turn.
- **Tutors.** Best remaining: Sanar (creature), Micromancer (MV-1 only), Dragonologist (dig 6). Gamble's random discard costs
  1/N of the time; a 3–4 mana creature tutor loses on mana and does not trigger Vivi.

## 5. Monte Carlo (sim/mana_sim.py, 40,000 games per cell, London mulligan with Arena's free first mulligan; Bo1 hand smoothing not modelled)

"3 mana T3" counts a 2-mana rock cast on T2. "Vivi T3" additionally requires U and R among the lands. Flood = ≥ 8 land cards
among the cards seen by T6; screw = ≤ 2 lands in the first 10 (play) / 11 (draw) cards.

| Land-capable | side | 2 lands T2 | 3 mana T3 | Vivi T3 | 4 lands T4 | flood T6 | screw | mulligan |
|---|---|---|---|---|---|---|---|---|
| 30 + 3 MDFC | play | 99.7 | 85.8 | 82.2 | 57.9 | 1.4 | 11.9 | 25.9 |
| 30 + 3 MDFC | draw | 99.8 | 91.0 | 87.9 | 67.7 | 3.0 | 8.0 | 26.4 |
| 31 + 3 MDFC | play | 99.7 | 86.7 | 83.0 | 59.4 | 1.6 | 11.0 | 23.9 |
| 31 + 3 MDFC | draw | 99.8 | 91.9 | 88.7 | 69.9 | 3.7 | 7.1 | 24.4 |
| **32 + 3 MDFC (final)** | play | 99.8 | 87.8 | 83.9 | 61.8 | 1.9 | 10.2 | 22.5 |
| **32 + 3 MDFC (final)** | draw | 99.9 | 92.8 | 89.6 | 72.2 | 4.1 | 6.3 | 22.4 |
| 33 + 3 MDFC | play | 99.9 | 89.0 | 85.1 | 64.9 | 2.5 | 9.2 | 21.1 |
| 33 + 3 MDFC | draw | 99.9 | 93.2 | 90.0 | 73.8 | 4.9 | 5.7 | 20.7 |
| 34 + 3 MDFC | play | 99.9 | 89.8 | 85.9 | 66.4 | 2.9 | 8.5 | 19.4 |
| 34 + 3 MDFC | draw | 99.9 | 94.2 | 90.8 | 76.1 | 5.5 | 5.0 | 19.4 |

Chosen: **32 lands + 3 MDFC + 4 rocks.** Each extra land past 32 buys ~1 point of Vivi-on-3 for ~0.7 points of flood and one
fewer spell; after turn 3 Vivi is the mana engine, so the marginal land is worth less than the marginal one-drop. 31 → 32 was
kept because it removed the weakest spell (Proft's Eidetic Memory) for the best early-game gain per slot. Colours: 9 Island,
9 Mountain, 10 duals/any (Steam Vents, Spirebluff, Stormcarved, Verge, Thran Portal, Multiversal Passage, Command Tower, Tarn,
Misty, Strand), Otawara + Sanctuary + Sink into Stupor (U), Sokenzan + Spikefield + Shatterskull (R); Fabled Passage fetches
either. Blue sources 23, red 23 (duals counted in both, Fabled Passage in both) against 32 blue-pip and 31 red-pip nonland
cards (`sim/stats.py` companion count).

## 6. Gate

```
MTG_DB_DIR=".../the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-09-30/arena-vivi/final.txt --format brawl --owner 1 --source arena
totals    : 100 cards | 32 lands (33.1 eff.) | 67 nonland | avg MV 2.03
  PASS  size / singleton / legality / rules / identity / lands (Karsten 33 ±2) / plan (66/67 interact) / curve / wincons (3) / locks (5)
  FAIL  ownership   1 card(s) not in the arena collection: A-Vivi Ornitier
  WARN  arenaNames  4 card(s) must be exported front-face only: Birgi, Shatterskull Smashing, Sink into Stupor, Spikefield Hazard
```
- **ownership FAIL is the known `A-` gate defect** (Session Log 2026-09-26: ownership does not map `A-X` ↔ `X`). Direct query
  (`sim/own.ts`): collection user 1 / source arena holds `Vivi Ornitier` qty 4, `arena_id 102111`; the `A-Vivi Ornitier` card
  row carries the same `arena_id 102111`. Arena plays the rebalanced printing under that id, so the card is owned. Every other
  card passed the gate's own ownership check.
- **arenaNames WARN is a gate quirk**: `arenaNamesCheck` puts every front-face-only DFC line into `fixes` and warns even when
  the line is already correct. The four lines in `final.txt` are front-face names, which is what the warning asks for.
- No `plan` FAIL: 66/67 nonland cards interact with the commander.

## 7. Mulligan and play guide

- Keep 7 with 2–4 lands, a 1-drop, and either a counter or a rock; the first mulligan is free — ship 1-landers and 6-landers.
- T1 cantrip (Ponder/Preordain first) or Bauble; T2 rock or cantrip + hold Spell Pierce/Daze; T3 Vivi with Daze/Swan Song up.
- Sequence on every Vivi turn: cast the cheap spells first (each is +1 power), then tap Vivi, then the expensive spell. Mox Amber
  and Bauble are free triggers — cast them before tapping.
- Protect on their turn: Dive Down/Chase Inspiration/Magic Damper answer any single removal; Boots or Greaves first if the
  hand has one (Greaves before a Vivi recast, it is a free equip). Keep Counterspell/Retort for their commander or a wrath.
- Move Greaves off Vivi (equip {0} to any other creature) before Hapatra or Fleeting Reflection targets her.
- Combo: Hapatra with Vivi at 4+ power: tap for X, pay untap, repeat → Choco-Comet / Traumatic
  Critique / Ajani's Anguish for lethal. Aggravated Assault at 6+ power is the same loop without Hapatra; attack with
  Guttersnipe/Tomik every extra combat.
- Kill turns: T5–6 by pings + Grapeshot/burn with Tomik or Ojer Axonil on board; T6–7 through a Nibelheim wipe if they went wide;
  Past in Flames turn when Vivi has 8+ mana and the graveyard holds 5+ cheap spells.

## 8. Convergence review (Fable refuter, 2026-09-30)

Inputs re-read: `final.txt`, `deck.md`, `screen-01..04.md`; every claim below checked against `pool-0*.md` oracle text
(`sim/lookup.py`). Pre-review list kept at `sim/final-pre-review.txt`. §2/§5/§6 figures above are pre-review.

**Swaps applied (3): IN | OUT | why**
1. Fire Magic | Training Grounds | Training Grounds touches exactly one ability in the 100: Hapatra's "{2}{U}: Untap target creature"
   (Vivi's tap has no mana cost; Birgi, Tomik, Prodigy, Archmage, Guttersnipe have no activated abilities; Otawara/Sokenzan channel
   is not a creature ability). Its whole value is the loop at Vivi power 2–3 instead of 4 — needs Training Grounds AND Hapatra AND an
   outlet in the same ~15 cards (≈ 1–2 % of games). Fire Magic is the same {R} noncreature trigger plus an instant-speed sweeper that
   scales ("Fire — {0} — 1 damage to each creature … Fira — {2} — 2 … Firaga — {5} — 3"); Vivi (0/3 base) survives Fire and Fira,
   and the deck's only other wipe is a 4-mana sorcery. Loop threshold is now power ≥ 4 (2 spells with Prodigy on board).
2. Ojer Axonil, Deepest Might | Boltwave | Ojer: "If a red source you control would deal an amount of noncombat damage less than
   Ojer Axonil's power to an opponent, that source deals damage equal to Ojer Axonil's power instead." Vivi is a red source: every
   noncreature spell = 4 to the face (8 with Prodigy), Guttersnipe's 2 → 4; Vivi + Ojer kills from 25 with 7 cantrips (4 with Prodigy).
   4/4 trample body; on death "return it to the battlefield tapped and transformed" (a Mountain that re-transforms for {2}{R} after
   4 noncombat damage — trivial here). Boltwave is the builder's own weakest kept finisher (3 damage once). The §4 stop proof never
   weighed Ojer although screen-01 listed it ("beats: Goldspan Dragon"). Cost: creature count 6 → 7, avg MV 2.04 → 2.09.
3. Mountain (10th) | Thran Portal | Thran Portal is not a dual: "As this land enters, choose a basic land type … This land is the
   chosen type" (one colour for the game), "Mana abilities of this land cost an additional 1 life to activate" (every tap), and it
   "enters tapped unless you control two or fewer other lands" (tapped as the 4th+ land drop, i.e. in roughly half of its appearances);
   not fetchable (type is chosen on entry). Its only edge over a basic is choosing the colour on entry. `sim/review_variants.py`
   (40,000 games/cell, Portal modelled as an untapped UR dual = its ceiling): Vivi-T3 84.0/89.4 (play/draw) → 83.5/88.8 with a
   Mountain, 83.6/89.0 with an Island; all other cells within ±0.6. A ≤ 0.5-point ceiling does not pay for tapped-late plus a life per
   tap. Mountain over Island because Misty Rainforest and Flooded Strand fetch Islands only; sources are now 22 U / 22 R + Fabled.

**Screen misses checked** (searched every pool file by name; none present, so no screen miss): Riverglide Pathway, Sulfur Falls,
Frostboil Snarl, Shivan Reef, Fiery Islet, Training Center, Prismari Command, Galvanic Iteration, Expansion // Explosion,
Memory Lapse, Mystical Dispute, Saw It Coming, Jwari Disruption, Silundi Vision, Sea Gate Restoration, Valakut Awakening,
Brazen Borrower, Bonecrusher Giant, Fable of the Mirror-Breaker, Niv-Mizzet Parun, Ral Storm Conduit, Fiery Cannonade, Anger of the
Gods, Storm's Wrath, Sweltering Suns, Electrodominance, Jaya's Immolating Inferno, Banefire, Fight with Fire, Crackle with Power,
Thermo-Alchemist, Baral, Solve the Equation, Time Warp, Alrund's Epiphany, Karn's Temporal Sundering, Mind's Desire, Force of Negation.
Every land in the pool was read (`Land` type filter): no untapped U/R dual exists beyond the ones already in the list.

**Considered and rejected**
- Octopus Form (= Magic Damper text) for Chase Inspiration: hexproof is what beats targeted removal in both; +0/+3 saves Vivi from
  Anger/Storm's Wrath-class sweepers, the untap adds P mana once. Different insurance, not provably better; protection stays at 6.
- Tectonic Hazard ("1 damage to each opponent and each creature they control", {R} sorcery) — a one-sided sweep (2/2 with Tomik, 4 face
  with Ojer) but Fire Magic already fills the cheap-sweeper slot at instant speed and scales; taking a second one costs a protection
  piece or an X outlet.
- Strike It Rich ({R} Treasure, flashback {2}{R}: two triggers, four with Prodigy): mana-neutral trigger fodder; loses to every kept
  1-drop that also draws, counters or kills.
- Starting Town (any colour for 1 life, tapped from turn 4): strictly better than Thran Portal, still worse than a basic for the reasons
  in swap 3. Mistrise Village / Cori Mountain Monastery / Arena of Glory: conditional-untapped mono lands, not fetchable — no gain over
  the basic they would replace. Great Hall of the Citadel: net +1 only on legendary spells, colourless otherwise.
- Shock / Play with Fire for Abrade: Abrade's artifact mode and 3 damage beat 2 damage; Scorching Dragonfire same verdict (§4).
- Seething Song / Pyretic Ritual: net mana with no storm payoff beyond Grapeshot; Vivi is the ritual.
- Storm-Kiln Artist (Shaman → 2 Treasures per instant/sorcery with Prodigy) and Kessig Flamebreather (Shaman → 2 pings per noncreature
  spell with Prodigy): real engines, but an 8th creature would displace Archmage or Guttersnipe, which are better per mana here.
- Twinflame Tyrant (5 mana, double damage): Ojer does the small-ping job a mana cheaper with a higher floor.
- Ojer for Aggravated Assault instead of Boltwave: rejected — AA at Vivi power 5 (not 6) already wins: tap for 5, pay {3}{R}{R}, untap
  all creatures, extra combat; any other creature attacks in every extra combat (Vivi never attacks). At power ≥ 6 it is also infinite
  mana. That is a second loop piece, not a dead card; Boltwave was the weaker slot.
- Cutting Ajani's Anguish (third outlet): outside the loop it is an {X}{R} burn/removal spell, live as a 1-mana trigger at X = 0; kept.
- Lightning Greaves' shroud blanks Dive Down/Chase/Damper/Fleeting Reflection/Curiosity/Hapatra on Vivi while attached; §7 already
  says to move it (equip is sorcery-speed, so only in a main phase). Kept: shroud is the point, the instants are for when she is bare.

**Wrong or loose rules claims in §1–7**
- §4 Wipes: "Pyroclasm / Fire Magic (kill a fresh 0/3 Vivi)" — false. 2 damage does not kill a 0/3; only Firaga (3) does.
- §3 #45 / §5: Thran Portal is not a "fast dual" and not a dual at all (see swap 3); §5's "10 duals/any" and "23 U / 23 R" count
  Thran Portal and Multiversal Passage as duals — each is one colour once it enters (22/22 + Fabled Passage before the swap).
  `mana_sim.py` models both as untapped UR duals. §3 #43 "fetchable type": Passage has no type in the library, so no fetch finds it.
- §3 #19 Fiery Annihilation "exiles opposing commanders": a commander that would be exiled goes to the command zone if its owner
  chooses, so the exile clause buys nothing against commanders (it does stop recursion of ordinary creatures).
- §2 / §3 #40 Nibelheim Aflame "one-sided": it hits every other creature including Guttersnipe, Tomik, Prodigy, Archmage, Hapatra
  (and now Ojer, which comes back as a land).
- §1 line 3 undersells Aggravated Assault: infinite combats already at power 5 (see above), infinite mana from 6.
- §4 Engines omitted Ojer Axonil entirely (screened, not weighed) — the gap swap 2 closes.
- Verified correct: Hapatra loop thresholds (4 / 2 with the old Training Grounds), Aggravated Assault has no once-per-turn clause,
  Harmonic Prodigy doubles Vivi (Wizard), Guttersnipe (Goblin Shaman) and Archmage (Human Wizard), Tomik +1 replacement, Artist's
  Talent L3 +2, Birgi's mana persists, Jeska's Will "choose both", Curiosity draws off the ping, Mox Amber with Vivi/Ral/Chandra,
  Light Up the Stage spectacle off the ping, Wizard's Retort {U}{U} with a Wizard, Daze, Otawara/Sokenzan discounts, Mystic Sanctuary.

**Gate (after swaps)** — same command as §6:
```
totals    : 100 cards | 32 lands (33.1 eff.) | 67 nonland | avg MV 2.07
  PASS  size / singleton / legality / rules / identity / lands (Karsten 33 ±2) / plan (65/67 interact) / curve / locks (5)
  FAIL  ownership   1 card(s) not in the arena collection: A-Vivi Ornitier      <- known A- gate defect (§6), treated as PASS
  WARN  arenaNames  5 front-face-only lines (Birgi, Ojer Axonil, Shatterskull, Sink into Stupor, Spikefield) — already front-face
  WARN  wincons     2 (Chandra, Guttersnipe) — the gate's closer heuristic counted Boltwave and does not recognise Ojer, Choco-Comet,
                    Traumatic Critique, Ajani's Anguish, Hapatra or Aggravated Assault; the deck has more kill lines than before
```

**Final stop statement per role (pass 2 found zero improving swaps)**
- Combo / finisher: best remaining Kang the Conqueror / Mathemagics / Inescapable Blaze / Fling lose to weakest kept Ajani's Anguish
  because Anguish is an {X}{R} burn spell and a 1-mana trigger without the loop; they are dead or 6 mana without it.
- Engines / payoffs: best remaining Storm-Kiln Artist / Kessig Flamebreather / Twinflame Tyrant lose to weakest kept Archmage
  Emeritus because an 8th creature adds no new kill speed beyond Ojer + Guttersnipe + Prodigy, and Archmage is the card flow that
  keeps the spells coming.
- Protection: best remaining Octopus Form / Slip Out the Back / Mithril Coat lose to weakest kept Chase Inspiration because none
  answers a class of removal the six kept pieces miss (bounce and exile ignore Mithril Coat; phasing loses Vivi's untap-step mana).
- Counters: best remaining Remand / Miscast / Mana Sculpt lose to weakest kept Daze because Daze is the only counter castable with
  no mana on the Vivi turn; a 10th counter is a tapped-out dead card.
- Removal: best remaining Scorching Dragonfire / Shock / Play with Fire / Tectonic Hazard lose to weakest kept Abrade because Abrade
  kills a 3-toughness creature or an artifact at instant speed; 2-damage spells miss most Brawl commanders.
- Wipes: best remaining Pyroclasm / Jennika's Technique / Slagstorm lose to Fire Magic (instant, 1 mana, scales to 3) and Nibelheim
  Aflame (one-sided at Vivi power ≥ 4 vs the opponent's board).
- Cantrips / draw: best remaining Sleight of Hand / Strike It Rich / Chart a Course / Stock Up lose to weakest kept Consider and Light
  Up the Stage on timing and rate (§4 unchanged).
- Rocks / lands: best remaining Mind Stone / Starting Town / Mistrise Village lose to Talisman of Creativity and the 10th Mountain
  because coloured, untapped, fetchable mana on turns 2–4 is what casts Vivi on 3; every remaining pool land is tapped, conditional,
  colourless or costs life per tap.
- Tutors: unchanged (§4).

Converged: a full pass over every screen file and the pool land list against the post-swap 100 finds no further improving swap.
