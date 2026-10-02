# Urza build report: paper mono-blue artifacts (2026-10-02)

**Verdict:** ✅ `final.txt` is the operator's box (`urza-box.txt`, 86 cards) completed and converged under **Urza, Lord High Artificer**.

| Box → final | Count |
|---|---|
| Box cards that stay | 27 (+ 27 Islands) |
| Box cards that leave | 32 (§3, one row each) |
| Pool cards added | 41 (+ 4 Islands) |

- **Gate:** every check PASSes except `plan`, the known false negative.
- **Verdicts:** `verdicts.md` has `rows: 244`, one per pool.md card (69 IN, 175 OUT), built by `verdicts.py` from `verdicts-src.txt`. A script checks that the 32 box-outs map to cards in the list.
- **Numbers:** every count comes from `stats.py` / `verdicts.py`, not from estimates.

## §1 Commander comparison and pick

| Candidate | DB text that matters | Fit with the box (24 artifacts, 13 instants/sorceries) | Verdict |
|---|---|---|---|
| **Urza, Lord High Artificer** {2}{U}{U} | "Tap an untapped artifact you control: Add {U}." · Construct "gets +1/+1 for each artifact you control" · "{5}: ... you may play that card without paying its mana cost." | Every box artifact (Thran Dynamo, Cloud Key, Waterskin, Sphere, Seat, Witching Well, Thought Monitor, Hellkite, Meteor Golem, Dawnsire …) becomes a blue source and Construct power | ✅ **Pick** (hot swap with Inspirit) |
| Talrand, Sky Summoner {2}{U}{U} (in box) | "Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying." | Triggers on 13 box spells; the 24 box artifacts do nothing for it | ❌ (spell deck: §7) |
| Eluge, the Shoreless Sea {1}{U}{U}{U} (not owned) | "power and toughness are each equal to the number of Islands you control" · "The first instant or sorcery spell you cast each turn costs {U} (or {1}) less" | Islands + 1 discounted spell a turn; no artifact text | ❌ Not a buy |
| Emry, Lurker of the Loch {2}{U} | "Affinity for artifacts" · "{T}: ... You may cast that card this turn. (You still pay its costs.)" | Recursion only, with no mana engine and no closer; goes to Inspirit while Urza is here | ❌ |
| Sai, Master Thopterist {2}{U} | "Whenever you cast an artifact spell, create a 1/1 ... Thopter" | One engine; it is in the 99 anyway | ❌ |
| Baral / Archmage-style / Deekah / Wan Shi Tong / Kozilek | Instants-only discounts, magecraft, an X flier, colourless identity | Narrower than Urza, or illegal with blue cards (Kozilek) | ❌ |

**Why Urza.** Urza turns the box's artifact half into mana and a threat. Talrand and Eluge would use only its 13 spells.

## §2 Plan

**Primary.** Artifact density feeds Urza's mana, then token engines grow the board, then a Construct closes.

| Window | Lines |
|---|---|
| T1–3 | A land plus a cheap accelerant (Sol Ring, Arcane Signet, Sky Diamond, Sapphire Medallion, Geist, Wayfarer's Bauble) gives a turn-3 Urza. Holding at least 1 of the 6 by turn 2 on the play is **40.5 %** (hypergeometric, 8 cards); otherwise Urza lands on turn 4. Spare mana goes to 0–2-MV artifacts (Bauble, Witching Well, Lantern, Tome, Waterbending Scroll, Patchwork). |
| T4–6 | Urza and its Construct, then Sai, Efficient Construction, Seedshark, Worldwalker Helm, Golem Foundry and Fleshraker. Unstoppable Plan ("untap all nonland permanents you control" at the end step) frees Urza mana for counters and X draws on opponents' turns. Thought Monitor costs {U} once 6 artifacts are out. |
| Close (≈T7–9) | **Super State** on the Construct: base 9/9 "flying, first strike, trample, and haste" plus +1/+1 per artifact (CR 613.4b/c layers 7b → 7c). At 13 artifacts it is **22/22**, and it "deals that much damage to each other opponent", so two swings deal 44 to each player at 40 life. **Evasion:** Whirler Rogue ("Target creature can't be blocked"), Rogue's Passage, and Kappa ("can't be blocked" per artifact ETB). **Second alpha:** Kuruk's "Waterbend {20}: Take an extra turn", paid by tapping artifacts. |

**Backup.** Grind with card advantage, then win with fliers and pings.
- **Card advantage:** Urza {5}, Planetarium, Waterbending Scroll, the X draws.
- **Fliers:** Steel Hellkite ("{2}: +1/+0" eats spare mana), Wan Shi Tong, Emeritus, Thought Monitor.
- **Fleshraker pings:** with Sai and Efficient Construction out, each artifact spell makes 1 Spawn and 2 Thopters, which is **3 damage to each opponent**.

**Is the box's spell package a second plan?** No. The box holds 13 instants/sorceries and 5 spell payoffs (Talrand, Archmage Emeritus, Baral, Archaeomancer, Solve the Equation). The final list keeps 18 instants/sorceries, so Talrand would trigger about 18 times a game where Sai triggers on 30 artifact spells, and Talrand's Drakes are not artifacts. Running both halves would halve each engine. A separate spells deck is possible (§7).

## §3 Swap table against the box (`urza-box.txt` → `final.txt`)

| # | Out (box) | In | DB-quoted reason |
|---|---|---|---|
| 1 | Talrand, Sky Summoner | Sai, Master Thopterist | "Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake" (18 in the list) vs "Whenever you cast an artifact spell, create a 1/1 colorless Thopter artifact creature token" (30), and each Thopter taps for Urza and pumps the Construct |
| 2 | Archmage Emeritus | Chrome Host Seedshark | "Whenever you cast or copy an instant or sorcery spell, draw a card" (18) vs "Whenever you cast a noncreature spell, incubate X" (44); Incubators are artifact tokens |
| 3 | Baral, Chief of Compliance | Geist of Saint Thalia | "Instant and sorcery spells you cast cost {1} less" (18) vs "Noncreature spells you cast cost {1} less" (44) |
| 4 | Archaeomancer | Emeritus of Ideation | 4 MV to "return target instant or sorcery card" vs a "Flying, ward {2}" 5/5 that "enters prepared": {U} casts "Target player draws three cards." |
| 5 | Solve the Equation | Scour for Scrap | Sorcery "Search your library for an instant or sorcery card" vs instant "Search your library for an artifact card" and/or "Return target artifact card from your graveyard" (finds Kappa, Helm, Hellkite) |
| 6 | Opt | Mishra's Bauble | "Scry 1. Draw a card." vs a {0} artifact that "Draw[s] a card at the beginning of the next turn's upkeep"; it also makes a Thopter, a Kappa counter and an Incubator |
| 7 | Consider | Mazemind Tome | "Surveil 1. Draw a card." once vs "{2}, {T}, Put a page counter on this artifact: Draw a card." four times (twice a round with Unstoppable Plan) |
| 8 | Ponder | Stock Up | "Look at the top three ... Draw a card." vs "Look at the top five cards ... Put two of them into your hand" |
| 9 | Frantic Search | Reverse Engineer | "Draw two cards, then discard two cards" (card-neutral) vs "Improvise ... Draw three cards." |
| 10 | Winternight Stories | Commander's Insight | "Draw three cards. Then discard two cards unless you discard a creature card" vs instant "draws X cards plus an additional card for each time they've cast a commander" |
| 11 | Commandeer | You Find the Villains' Lair | "{5}{U}{U}" or "exile two blue cards", noncreature spells only, vs {1}{U}{U} "Counter target spell" or "Draw two cards, then discard two cards" |
| 12 | Spell Pierce | Strix Serenade | "unless its controller pays {2}" vs a hard {U} "Counter target artifact, creature, or planeswalker spell" |
| 13 | Hydro-Man, Fluid Felon | Patchwork Automaton | "+1/+1 until end of turn" per blue spell, and "he becomes a land" each end step, vs "Ward {2}" and a permanent "+1/+1 counter" per artifact spell |
| 14 | Tempest Djinn | Kappa Cannoneer | "+1/+0 for each basic Island", no artifact link, vs "Ward {4}" and per artifact ETB "+1/+1 counter ... It can't be blocked this turn." |
| 15 | Donatello, Way with Machines | Hangarback Walker | A 1/2 that gets a counter per artifact ETB vs an X sink that leaves "a 1/1 colorless Thopter artifact creature token with flying for each +1/+1 counter" |
| 16 | Traxos, Academy Guardian | Stonecoil Serpent | A 1/5 "Flying, vigilance, Prowess" vs "enters with X +1/+1 counters" with "Reach, trample, protection from multicolored" |
| 17 | Mu Yanling, Sky Dancer | Super State | 2 loyalty, so "−3: Create a 4/4" waits a turn, vs Construct "base power and toughness 9/9 ... haste" with damage "to each other opponent" |
| 18 | Uthros Psionicist | Sapphire Medallion | "The second spell you cast each turn costs {2} less" (conditional) vs "Blue spells you cast cost {1} less" on 35 spells (Urza costs 3) |
| 19 | Shimmer Myr | Palladium Myr | "cast artifact spells as though they had flash" (Unstoppable Plan already gives instant mana) vs "{T}: Add {C}{C}", a {C} source for Fleshraker |
| 20 | Coretapper | Golem Foundry | "{T}: Put a charge counter on target artifact" (a 1/1) vs a counter per artifact spell; three make "a 3/3 colorless Golem artifact creature token" |
| 21 | Decanter of Endless Water | Arcane Signet | The same "{T}: Add one mana" at 3 vs 2 (turn-3 Urza) |
| 22 | Hedron Archive | Sol Ring | The same "{T}: Add {C}{C}" at 4 vs 1 (turn-2 Urza) |
| 23 | Expedition Map | Rogue's Passage | "{2}, {T}, Sacrifice ...: Search your library for a land card" would fetch Passage; run "{4}, {T}: Target creature can't be blocked this turn" directly |
| 24 | Hammer of Nazahn | Countersculpt | "indestructible" for one creature at 4 + "Equip {4}" vs "Counter target spell" (removal or wipe) for 3 |
| 25 | Sewer-veillance Cam | Island | "{3}{U}, Sacrifice this artifact: Draw two cards." Karsten asks for 37.5–38.1 lands (§5). Witching Well holds the same draw-2 and adds "scry 2" for Planetarium |
| 26 | Vexing Bauble | Flare of Denial | "if no mana was spent to cast it, counter that spell" counters our own Urza {5} plays, Planetarium casts and Flare's "sacrifice a nontoken blue creature rather than pay" |
| 27 | The Eternity Elevator | Worn Powerstone | 5 MV "{T}: Add {C}{C}{C}" vs 3 MV "{T}: Add {C}{C}", ready for a turn-4 Urza |
| 28 | Burnished Hart | Solemn Simulacrum | "{3}, Sacrifice this creature: ... two basic land cards" (6 mana in total) vs a land on ETB and "When this creature dies, you may draw a card" |
| 29 | Hydroelectric Specimen | Sink into Stupor | Both MDFC lands. "change the target of target instant or sorcery spell with a single target" vs "Return target spell or nonland permanent an opponent controls to its owner's hand" |
| 30 | Lonely Sandbar | Island | "This land enters tapped." vs untapped, and it counts for Waterbending Scroll ("{1} less ... for each Island") |
| 31 | Cephalid Coliseum | War Room | "This land deals 1 damage to you", draw 3 / discard 3 at threshold, vs "{3}, {T}, Pay life ...: Draw a card" (1 life) every turn, and a {C} source |
| 32 | Evolving Wilds | Island | Fetches an Island "tapped" vs an untapped Island |
| 33 | — (86 → 99) | Efficient Construction | "Whenever you cast an artifact spell, create a 1/1 colorless Thopter artifact creature token with flying" (a second Sai) |
| 34 | — | Worldwalker Helm | "{1}{U}, {T}: Create a token that's a copy of target artifact token you control": a new Construct every turn, plus Maps |
| 35 | — | Glaring Fleshraker | Spawn per "colorless spell"; "Whenever another colorless creature you control enters, this creature deals 1 damage to each opponent" |
| 36 | — | Planetarium of Wan Shi Tong | "{1}, {T}: Scry 2." then "You may cast that card without paying its mana cost." once per turn |
| 37 | — | Bident of Thassa | "Whenever a creature you control deals combat damage to a player, you may draw a card." with flying Thopters |
| 38 | — | Cityscape Leveler | "When you cast this spell and whenever this creature attacks, destroy up to one target nonland permanent" |
| 39 | — | Curse of the Swine | "Exile X target creatures." Scales with Urza mana |
| 40 | — | Entrancing Melody | "Gain control of target creature with mana value X." |
| 41 | — | Shifting Grift | "+ {2} — Exchange control of two target creatures.": a Thopter for their best creature |
| 42 | — | Tractor Beam | "You control enchanted permanent." Unstoppable Plan untaps it |
| 43 | — | Perplexing Test | "Return all nontoken creatures to their owners' hands": our Constructs, Thopters and Golems stay |
| 44 | — | Wayfarer's Bauble | "{2}, {T}, Sacrifice ...: ... basic land ... onto the battlefield": turn-3 Urza with no rock |
| 45 | — | Island | 31st Island (box 27 + 4); Karsten §5 |
| Cmd | — | Urza, Lord High Artificer | From the Inspirit box (hot swap) |

**Box cards that stay (27):** Counterspell, Negate, Resculpt, Volatile Stormdrake, Meteor Golem, Steel Hellkite, Thought Monitor, Whirler Rogue, Wan Shi Tong, The Legend of Kuruk, Unstoppable Plan, Waterbending Scroll, Witching Well, Soul-Guide Lantern, Thran Dynamo, Bender's Waterskin, Commander's Sphere, Cloud Key, Sky Diamond, Karn, Dawnsire, Ghostly Flicker, Pull from Tomorrow, Seat of the Synod, Agna Qel'a, Buried Ruin, The Mycosynth Gardens.

**Final by role (99):**

| Role | Count |
|---|---|
| Ramp | 13 |
| Card advantage | 14 |
| Engines | 7 |
| Threats | 5 |
| Finishers | 4 |
| Counters | 6 |
| Removal | 8 |
| Wipe | 1 |
| Protection / tutor / graveyard hate | 4 |
| Lands | 37 |

**Composition.**
- 62 nonland cards (44 noncreature) and 31 artifacts.
- Spell types: 35 blue, 27 colourless, 13 instants, 5 sorceries, 7 X spells.
- Curve (MV 0/1/2/3/4/5/6/7+): 3/5/17/17/9/4/3/4.

**Synergy density** (rule-based, each pair counted once):
- 760 pairs; degree min 0, median 20.
- 5 lowest: War Room and Agna Qel'a (lands), then Sink into Stupor, Strix Serenade and Pull from Tomorrow, all exempt roles.
- Lowest non-exempt: Perplexing Test, Flare of Denial and Shifting Grift at 12.

## §4 Stop proof: weakest kept vs best left out, per role

| Role | Weakest kept | Best left out | Why the pass stops |
|---|---|---|---|
| Ramp | Wayfarer's Bauble | Hedron Archive (4 MV {C}{C}) | 4 MV cannot speed up a turn-3/4 Urza |
| Cost reducers | Cloud Key (30) / Medallion (35) / Geist (44) | Uthros Psionicist | Conditional "second spell" discount |
| Card advantage | Witching Well | Sewer-veillance Cam | **Near-tie.** Well's "scry 2" triggers Planetarium; the slot went to land 37 |
| X draw | Commander's Insight / Wan Shi Tong | Stroke of Genius ("draws X cards") | Same {X}+3; Insight adds commander casts, WST adds a body and search draws |
| Draw engine | The Legend of Kuruk | Tezzeret's Gambit / Experimental Augury | Kuruk draws 2 plus scry 4, then an extra turn |
| Counters | Countersculpt | Essence Capture ("Counter target creature spell") | Creature-only |
| Removal | Tractor Beam | Plan for All Outcomes ("their choice of the top or bottom") | The owner picks the top |
| Wipe | Perplexing Test | The Echoverse Fulcrum ("Destroy all creatures") | Kills our Construct board (LEARNINGS 2026-10-02) |
| Protection | Ghostly Flicker | Hydroelectric Specimen | **Near-tie.** Flicker re-triggers Urza (new Construct), Meteor Golem and Thought Monitor |
| Engines | Golem Foundry / Fleshraker | Owlin Spiralmancer (copies the first X spell) | **Near-tie.** Owlin links 7 X spells; the kept two link 30 artifact spells |
| Threats | Patchwork / Stonecoil | Tempest Djinn / Donatello | No artifact link / Kappa without ward or evasion |
| Finishers | Dawnsire (one 10-power station) | Omni-Changeling / Eldrazi Conscription | Win-turn test: Omni's copy is summoning-sick; Conscription costs 8 with no haste. Dawnsire kills a blocker every attack |
| Lands | Island 31 / War Room | Specimen (0.38 land), Lonely Sandbar (tapped), Command Tower | Command Tower is not an Island for Scroll or Agna Qel'a |

**Win-turn check on expensive cuts.** Eldrazi Conscription, Kozilek ({8}{C}{C}), Necron Monolith and Bane of Bala Ged were each asked "what does it do on the turn I win?". None has haste or evasion beyond Super State or Steel Hellkite. A full pass over all 244 rows found no improving swap.

## §5 Mana and land count

| Method (reference/principles.md) | Inputs | Lands |
|---|---|---|
| Karsten regression, printed MV | 31.42 + 3.13·3.113 − 0.28·11 | **38.1** |
| Same with improvise/affinity at effective cost (Thought Monitor 2, Kappa 3, Reverse Engineer 2) | avgMV 2.935 | **37.5** |
| Karsten simulation | 42 (with Sol Ring) − 3 (7 rocks) − 1.5 (≈5 cheap cantrips) | 37.5, floor 37 |
| **Chosen** | 37 lands + Sink into Stupor MDFC (0.38) | **37.4** |

- **cheap** = 11 cards of MV ≤ 2 that draw or ramp; cost reducers count as ramp. X spells are counted at X = 0.
- **The box ran 34 lands + Specimen**, which is 3–4 below Karsten.
- **Blue:**
  - Urza needs 26/41 → **23.5** sources and Counterspell needs 30/41 → **27**.
  - We have **33** (31 Island, Seat, Agna) plus Sink's land face. ✅
- **Colourless:**
  - Fleshraker ({2}{C}) needs 16 for on-curve; we have **8** (Sol Ring, Palladium, Dynamo, Powerstone, Passage, Buried Ruin, War Room, Mycosynth).
  - P(≥ 1 in the top 16 cards) = **0.770**. ⚠️ Accepted: it is a mid-game backup engine.
- **Lands in hand:** P(≥ 3 lands in the opening 7) = **0.525**.
- **Flood sinks:** Urza {5}, Hellkite pump, 7 X spells, War Room, Agna Qel'a, Tome, Rogue's Passage, Mycosynth, Kuruk's waterbend.

## §6 Gate output (`gate-final.txt`)

```
  PASS  size        100 cards (commander wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in commander
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside U
  PASS  ownership   all cards owned; paper collection imported 0 days ago
  WARN  arenaNames  3 card(s) must be exported front-face only   (Arena only)
  PASS  lands       37 lands (+1 MDFC land backs = 37.4 effective); Karsten wants 38 ±2
  FAIL  plan        12/62 nonland cards interact (19%)   (known false negative)
  PASS  curve       avg MV 3.11
  PASS  wincons     11 win condition(s)/closer(s)
  PASS  locks       0 locked card(s) present and intact
```

- **Ownership:** PASS with no Island shortfall.
- **Game changers:** Scryfall and the DB flag none in the list (`rulings.txt`).

## §7 Operator decisions and buys

1. **Hot swap.** Pull Urza from the Inspirit box, and Emry takes its slot there. Add 4 Islands to the box (27 → 31).
2. **Spell deck instead?** The pool holds **49** instants/sorceries, plus Talrand, Archmage Emeritus, Baral, Archaeomancer and Deekah. A Talrand-commander spells deck is buildable, but it would use only the box's 13 spells and drop its 24 artifacts; Eluge is not owned. Recommendation: Urza now; a Talrand build is a separate request.
3. **Near-ties the operator may flip** (each is a one-for-one swap; each costs the noted point):

   | Swap | Cost |
   |---|---|
   | Sewer-veillance Cam ↔ Island 31 | Karsten |
   | Hydroelectric Specimen ↔ Ghostly Flicker | — |
   | Owlin Spiralmancer ↔ Golem Foundry | — |
   | Omni-Changeling ↔ Dawnsire | — |
   | Stroke of Genius ↔ Commander's Insight | — |
   | Hedron Archive ↔ Worn Powerstone | — |

4. **Karn's −2.** Scryfall 2019-05-03: "In a casual game, a card you choose from outside the game comes from your personal collection." Whether that is allowed is a playgroup call; the list does not count on it.
5. **Buys:** none needed. Eluge is not a fit (Islands plus instants/sorceries; this list is artifact-led).
6. **Not applied.** Nothing was written to `decks/paper/`. Registering the list and paper-sync wait for the operator's sleeve confirmation.
