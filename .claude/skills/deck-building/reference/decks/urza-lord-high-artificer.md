# Urza, Lord High Artificer: pilot guide (paper)

List: `verify-2026-10-06/urza-found/final-3.txt`. 100 cards, 35 lands (30 Islands + Seat of the Synod, Agna Qel'a, Buried Ruin, The Mycosynth Gardens, Secluded Starforge) plus the MDFC Sink into Stupor, avg MV 3.38. Card text is quoted from the DB; rules were checked against CR 2026-09-25 and the Scryfall rulings (`verify-2026-10-06/urza-found/REVIEW.md`, 2026-10-07).

## Plan in one line

Every artifact is mana and size. [[Urza, Lord High Artificer]] says "Tap an untapped artifact you control: Add {U}", and his Construct "gets +1/+1 for each artifact you control". N below = artifacts you control; tapped ones still count. Grow N, copy Constructs, then make them unblockable or put Super State on one.

=> Cast artifacts; every token event adds more → [[Urza, Lord High Artificer]] taps each artifact for {U} → Construct copies on opponents' end steps → [[Sun Quan, Lord of Wu]] or Super State → **20–40 damage per swing**

**Summoning sickness (CR 302.6).** Only creatures you have controlled since your turn began can attack. Tokens and copies made this turn stay home unless Super State gives haste. Tapping them for Urza, Whirler Rogue, Secluded Starforge or waterbend is fine, because those costs say "tap an untapped artifact" and don't use the creature's own {T} (Urza and Whirler Rogue rulings).

## Win conditions

| # | Kill | Pieces | Damage |
|---|---|---|---|
| A | **Construct alpha, unblockable** | 3 Constructs made by last turn + [[Sun Quan, Lord of Wu]] ("Creatures you control have horsemanship") | 12 + 12 + 16 = **40 to one opponent** at N = 12 |
| B | **Super State Construct** | Any Construct + [[Super State]] ("base power and toughness 9/9", flying, first strike, trample, haste) | 9 + N to the defender, then "that much damage to each other opponent". N ≥ 11 → 20 each per hit; N ≥ 31 → 40 |
| C | **Thopter burn + evasion** | [[Glaring Fleshraker]] + [[Whirler Rogue]] + kicked [[Rite of Replication]] | **10 to each opponent**, plus 30 unblockable = **40 to one** |
| + | **Extra turn** | [[The Legend of Kuruk]] → Avatar Kuruk: "Exhaust — Waterbend {20}: Take an extra turn after this one" | A second attack for A or B; last turn's tokens can attack in it |

## Win lines (the turn you win)

### Line A: Sun Quan alpha (one opponent)

- **Setup (turn before).** [[Ember Island Production]] copies the Construct "except it's not legendary and it's a 4/4": base 4/4 + N. At an opponent's end step, [[Worldwalker Helm]] ("{1}{U}, {T}", instant speed) copies the Construct again. Both tokens can attack next turn.
- **Kill-turn board.** Urza; Constructs A (Urza's), B (Helm copy) and C (Ember copy); Helm and 2 Maps; Arcane Signet, Thran Dynamo, Sapphire Medallion and Commander's Sphere; 7 Islands. Artifacts: 3 Constructs, Helm, 2 Maps and 4 rocks, so **N = 10**.
- **Mana.** Sun Quan costs {4}{U}{U} − 1 (Medallion) = 5, and Helm costs 2: 7 in total, all from the Islands. The rocks plus Urza taps of the Maps, Medallion and the new copy leave **10 open** for Katara's Reversal or Counterspell.
- **Sun Quan's grant is static.** It works the turn he enters; only Sun Quan himself can't attack. Horsemanship: "can't be blocked by creatures without horsemanship" (CR 702.31b).
- **Helm again.** A new Construct and a Map, so N = 12. That copy is summoning sick and stays home.
- **Damage.** A 12 + B 12 + C 16 = **40 unblockable**; Urza can add 1. Each artifact added before combat is +3.

=> Last turn: [[Ember Island Production]] copies the Construct (4 + N) → Opponent's end step: [[Worldwalker Helm]] copies it again → Kill turn: cast [[Sun Quan, Lord of Wu]]; horsemanship at once → Helm again: N = 12, the new copy stays home → **12 + 12 + 16 = 40 unblockable to one opponent**

### Line B: Super State (whole table)

- **Board.** The same as Line A's kill turn (N = 10), without Sun Quan.
- **Cast [[Super State]] ({7}) on Construct A.** It is colourless, so Medallion doesn't reduce it; Geist of Saint Thalia does. The base becomes 9/9 (CR 613.4b), and the Construct's +N applies on top of that (613.4c): 19/19 with haste. A Construct made this turn can carry it too.
- **Helm.** A copy plus a Map make N = 12, so the Construct is a **21/21** flier with first strike and trample. Total cost 9 = 7 Islands + Signet + Sphere, with Dynamo still open.
- **Hit.** 21 combat damage to the defender, and Super State repeats it as 21 to each other opponent. If a 1-toughness flier blocks, trample still sends 20 through. Only the damage that reaches the opponent is copied.
- **Second hit.** Next turn (Super State stays on), or in Kuruk's extra turn. A one-hit table kill needs N ≥ 31, or [[Secluded Starforge]]: "{2}, {T}, Tap X untapped artifacts you control: Target creature gets +X/+0". Each artifact tapped this way adds 1 damage to every opponent.

=> [[Super State]] on a Construct: base 9/9 plus N, haste → Helm copy: N = 12, a 21/21 flier → 21 combat damage to the defender → **21 to each other opponent** → Second hit next turn or in Kuruk's extra turn: **42 each**

### Line C: Fleshraker + kicked Rite on Whirler Rogue

- **Board.** Urza, Construct A, Fleshraker, Whirler Rogue with its 2 Thopters, Helm, 1 Map, Arcane Signet, Medallion, Thran Dynamo and 7 Islands. **N = 8**. Mana: 7 Islands + Signet 1 + Dynamo 3 + Urza taps of the Map and Medallion = 13.
- **Kicked [[Rite of Replication]] on Whirler.** It costs {2}{U}{U} + {5} − 1 = 8 and makes 5 Whirlers. They are blue, since a copy takes the original's colour (CR 707.2a), so they don't trigger Fleshraker.
- **Thopters.** Each Whirler ETB says "create two 1/1 colorless Thopter artifact creature tokens", for 10 in all. Fleshraker deals 1 "whenever another colorless creature you control enters": **10 to each opponent**. Each ETB is its own token event, so Helm adds 5 Maps. N = 8 + 10 + 5 = **23**.
- **Evasion.** Whirler: "Tap two untapped artifacts you control: Target creature can't be blocked this turn". The 15 new artifacts pay 6 of these, which makes Construct A (23), the 2 old Thopters (1 + 1), Whirler (2), Fleshraker (2) and Urza (1) unblockable.
- **Damage.** 30 combat + 10 burn = **40 to one opponent**, and 10 to each other opponent.

=> [[Glaring Fleshraker]] on board with Whirler Rogue and Helm → Kicked [[Rite of Replication]] on Whirler: 8 mana → 10 colourless Thopters: **10 to each opponent**, N = 23 → New artifacts pay 6 Whirler activations: six attackers unblockable → **30 combat + 10 burn = 40 to one opponent**

### Extra turn: Avatar Kuruk

- **Flip.** [[The Legend of Kuruk]] chapters I and II say "Scry 2, then draw a card". Chapter III flips it into Avatar Kuruk two turns after you cast it.
- **Waterbend {20}.** "For each generic mana in that cost, you may tap an untapped artifact or creature you control" (CR 701.67a), so sick tokens and non-artifact creatures help pay. Exhaust means "Activate only once" (702.177a), per Kuruk.
- **Order.** Attack first, then pay in main phase 2 with lands, rocks and every non-attacker. In the extra turn everything untaps, and last turn's tokens can attack.
- **Second extra turn.** Ember Island on Avatar Kuruk makes a non-legendary copy with its own exhaust, which buys another extra turn for another 20.

=> [[The Legend of Kuruk]] flips at chapter III → Attack with Line A or B first → Main 2: waterbend {20} with lands, rocks and non-attackers → Extra turn: all untap, last turn's tokens attack → **second Super State hit kills the table**

## Copy targets (best first)

| Effect | Text | Best targets | Avoid |
|---|---|---|---|
| [[Rite of Replication]], kicked | "create five of those tokens" | [[Urza, Lord High Artificer]]: 5 ETBs = 5 Constructs + 5 Maps with Helm, so N +10. The Construct as target gives 5 Constructs + 1 Map (N +6) · [[Whirler Rogue]] (10 Thopters) · [[Thought Monitor]] (10 cards) · [[Meteor Golem]] (5 permanents) | Other legends (the legend rule keeps one) |
| [[Ember Island Production]] | "except it's not legendary and it's a 4/4" | Urza: a 4/4 Urza that stays, plus a Construct · the Construct ((4 + N)/(4 + N)) · Avatar Kuruk (a second extra turn) · [[Sai, Master Thopterist]] (2 Thopters per artifact spell) · [[Padeem, Consul of Innovation]] (2 upkeep draws while you hold the top-MV artifact). Mode 2: an opponent's best creature as a 2/2 | — |
| [[Worldwalker Helm]] | "Create a token that's a copy of target artifact token you control"; each token event adds a Map | The Construct (at an opponent's end step, so it can attack) · Golem 3/3 · Treasure · Clue | Incubator (counters don't copy: a 0/0) |
| [[Flesh Duplicate]] | "enter as a copy of any creature on the battlefield" (vanishing 3) | Urza (a Construct; keep the original) · Meteor Golem, yours or an opponent's · Whirler Rogue · Thought Monitor · [[Solemn Simulacrum]] (a land now, a card when vanishing sacrifices it) | [[Kappa Cannoneer]] (counters don't copy) |
| [[The Mycosynth Gardens]] | "becomes a copy of target nontoken artifact you control with mana value X" | Helm (X = 3) · [[Thran Dynamo]] (X = 4) · [[Sapphire Medallion]] (X = 2). It stops being a land and counts for N | Cards with "as enters" or "enters with", because it never enters: [[Cloud Key]] would get no type and [[Noble's Purse]] no counters. Legendary ones (Planetarium, Bident, Fulcrum) |
| [[Ghostly Flicker]] (instant) | "Exile two target artifacts, creatures, and/or lands you control, then return those cards" | Urza + Meteor Golem · [[Cryogen Relic]] (leaves + enters = 2 cards) + Thought Monitor (2 more) · Flesh Duplicate (re-enters as a fresh copy) · Urza in response to removal | Tokens (they cease to exist) · Kappa (it loses its counters) |
| [[Karn, the Great Creator]] +1 (animates, doesn't copy) | "becomes an artifact creature with power and toughness each equal to its mana value" until your next turn | One at a time: [[Planetarium of Wan Shi Tong]] 6/6 or Thran Dynamo 4/4. It attacks only if you have controlled it since the turn began | — |

=> Kicked [[Rite of Replication]] on Urza (8 with Medallion) → Five Urza tokens; the legend rule keeps the original → Five ETB triggers: five Constructs, five Maps with Helm → **N +10: every Construct +10/+10**

=> [[The Mycosynth Gardens]] pays {3}: it becomes a second Helm → Every artifact-token event now adds two Maps → [[Unstoppable Plan]] untaps both Helms at your end step → **four Construct copies per turn cycle, all attacking next turn**

=> [[Ember Island Production]] on Urza: a non-legendary 4/4 Urza → Its ETB makes a Construct (and a Map with Helm) → The original gets removed; the copy still taps artifacts for {U} → **engine survives; recast the commander later**

## Engine map

=> Cast one artifact (+1) → [[Sai, Master Thopterist]]: a Thopter (+1) → [[Efficient Construction]]: a Thopter (+1) → [[Worldwalker Helm]]: a Map per Thopter event (+2) → **N +5: every Construct +5/+5**

- **Mana.** Urza turns every artifact into {U}. [[Traxos, Scourge of Kroog]] ("Whenever you cast a historic spell, untap Traxos"): tap it for Urza's {U}, and each artifact or legendary spell refunds that {U}. [[Unstoppable Plan]] ("untap all nonland permanents you control" at your end step) gives two Helm uses a cycle and keeps counters up. [[Katara's Reversal]] counters up to four and untaps four artifacts, for 4 {U} back.
- **Mana sink.** Urza's "{5}: Shuffle your library, then exile the top card. Until end of turn, you may play that card without paying its mana cost." X spells cast this way have X = 0.
- **N growers.** Sai and Efficient Construction (a Thopter per artifact spell) · [[Golem Foundry]] (3 charge counters = a 3/3 Golem) · [[Chrome Host Seedshark]] ("incubate X" on each noncreature spell: an artifact token) · [[Hangarback Walker]] · [[Deduce]] (a Clue) · Noble's Purse (3 Treasures) · [[Seat of the Synod]] · Secluded Starforge ({5}: a 2/2 Robot). With Helm, each token event also adds a Map.
- **More N-sized threats.** [[Filigree Attendant]] (a flier, "power is equal to the number of artifacts you control") · Kappa Cannoneer (+1/+1 and "can't be blocked this turn" whenever an artifact enters; ward 4).
- **Fleshraker.** It makes a Spawn for each colourless spell, and deals 1 to each opponent whenever "another colorless creature you control enters": Spawn, Thopters, Constructs, Golems, Robots, Kuruk Spirits, Hangarback, Traxos, Solemn, Palladium Myr and Soul. Blue creatures and their copies (Whirler, Kappa, Thought Monitor, Filigree) don't count.
- **Ramp.** [[Arcane Signet]], [[Sky Diamond]], Noble's Purse, [[Commander's Sphere]], [[Palladium Myr]], [[Worn Powerstone]], [[Bender's Waterskin]] (it untaps in each other player's untap step), Thran Dynamo and Solemn.
- **Cost reducers.** Sapphire Medallion (blue spells), Cloud Key (name artifact) and [[Geist of Saint Thalia]] (noncreature spells).
- **Card flow.** [[Bident of Thassa]] (a card per creature that connects) · [[April O'Neil, Hacktivist]] (a card per card type cast this turn) · Padeem (upkeep, if you control the highest-MV artifact) · [[Pensive Professor]] · Planetarium (a free cast after a scry or surveil, once a turn) · [[Waterbending Scroll]] (free with 6+ Islands) · [[Cerebral Download]] (surveil N, then draw three) · [[Pull from Tomorrow]] · [[Wan Shi Tong, Librarian]] · [[Stock Up]] · Thought Monitor · Cryogen Relic · [[Soul-Guide Lantern]] (also graveyard hate) · [[Agna Qel'a]] (loot) · Kuruk chapters I–II.
- **Counters (7).** [[Counterspell]], [[Negate]], [[Flare of Denial]] (free if you sacrifice a nontoken blue creature), [[Strix Serenade]], [[Bane's Contingency]] (also scry 2 and draw when the spell targets Urza), [[You Find the Villains' Lair]] and Katara's Reversal. [[Sink into Stupor]] also bounces a spell.
- **Removal and theft.** [[Resculpt]] · [[Zuko's Exile]] · [[Curse of the Swine]] · [[Tractor Beam]] · [[Volatile Stormdrake]] (a swap; its 4 energy keeps a stolen creature of MV ≤ 4) · Sink into Stupor · [[River's Rebuke]] (all nonland permanents of one player) · Meteor Golem.
- **Protection.** Padeem: "Artifacts you control have hexproof", which covers Constructs, Helm and the rocks. [[Soul of New Phyrexia]] gives indestructible for {5}, also from the graveyard. Kappa has ward 4, and there are 7 counters.
- **One-sided wipe.** Soul's {5} first and let it resolve, then [[The Echoverse Fulcrum]]: "{5}, {T}, Exile The Echoverse Fulcrum: Destroy all creatures" (sorcery speed). 10 mana in total.
- **Recursion.** [[Scour for Scrap]] tutors or regrows an artifact (Helm, Meteor Golem, Fulcrum); it can't get Super State, which is an enchantment. [[Buried Ruin]] regrows an artifact. Karn's −2 returns a face-up artifact card you own from exile, such as Soul after its graveyard ability.

## Pilot rules

- **Make copies early.** Use Helm at an opponent's end step, and cast Ember Island the turn before. Copies made on the kill turn only add N.
- **Don't tap attackers for mana.** Pay with lands, rocks, Maps, Spawn and this turn's tokens; tapped artifacts still count for N.
- **Sun Quan is cast before combat on the kill turn.** His grant is static, and only he can't attack.
- **Copies of Urza.** The legend rule removes the extra Urzas before their ETB triggers go on the stack (CR 704.5j), but the Constructs still arrive. Keep the original, because it is your commander. Ember Island's copy is not legendary and stays.
- **Super State's second damage is not combat damage,** so Bident draws only for the hit itself.
- **Kuruk.** Attack first, then waterbend {20} in main phase 2. Exhaust works once per Kuruk.
- **Karn +1** animates one artifact at a time, and it attacks only if you have controlled it since the turn began.
- **Protect Urza** with a counter or Ghostly Flicker. Flicker brings him back as a new object, which makes a new Construct.

## Mulligan

- **Keep** 3–4 lands (44 % of 7-card hands), or 2 lands + a rock or reducer (18 %). That is 62 % of hands; Sink into Stupor counts as a land.
- **Rocks and reducers (10):** Arcane Signet, Sky Diamond, Sapphire Medallion, Noble's Purse, Commander's Sphere, Palladium Myr, Cloud Key, Worn Powerstone, Bender's Waterskin and Geist of Saint Thalia.
- **Mulligan** 0–1 lands (20 %), 5+ lands (6 %), and 2 lands with no rock (12 %).
- **Top end.** 8 cards cost 6+ (River's Rebuke, Kappa, Planetarium, Super State, Sun Quan, Soul, Thought Monitor and Meteor Golem). 9.8 % of hands hold 2+ of them and 1.1 % hold 3+. Kappa (improvise) and Thought Monitor (affinity) cost far less once artifacts are out.
