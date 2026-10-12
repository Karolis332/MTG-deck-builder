# Arena Jace, Multiverse Architect — fixed-point competitive build (2026-09-30)

Inputs: `deck.md` (engine seed, 62ccf14), `screen-01..08.md` (571 candidates, `check-screens.py` OK ×8), `pool-01..08.md`.
Output: `final.txt` (100, commander first). 45 swaps against the seed. Sims in `sim/` (`landsim.py`, `hits.py`).

## 1. Plan and win lines

Superfriends-polymorph control in W/U/B/R. Jace's +1 ("Draw two cards, then put a card from your hand on the bottom") is the
draw engine; the static ("they may pay {2}. If they don't, creatures they control can't attack Jaces you control") covers
Jace, The Theorist and every Jace token the Ways/empower spells make. The −3 ("Exile another target planeswalker or creature you
control. Reveal cards ... until you reveal a creature or planeswalker card. Put that card onto the battlefield") converts a spent
walker, a Jace token, a Cadet/Kithkin/Spirit token or a Sunfall Incubator into one of 19 hits, 9 of which are Zetalpa-class.
Identity Echo ("{3}{R}: Exile target creature or planeswalker you control. Reveal cards ...") repeats the −3 without Jace, and
Oath of Teferi lets Jace +1 and −3 in the same turn. 23 pieces of cheap interaction (7 counters, 12 spot removal, 4 wipes
that spare walkers) hold the board until turn 4–5. Win lines: (a) −3/Echo into Zetalpa, Krang, Valgavoth, Elesh Norn,
Sheoldred, Nissa (every land drop then draws and cheats a second creature); (b) walker attrition under the attack tax,
Eternal Wanderer −4, Sheoldred drain on every +1; (c) Armaggon/Sunfall/Overwrite to reset, then the same.

## 2. Health table (seed → final; nonland avg MV over the 99, land faces counted as lands)

| metric | seed | final |
|---|---|---|
| lands (front + MDFC backs) | 34 + 4 = 38 faces | 31 + 4 = 35 faces |
| ramp / rocks | 10 (5 Talismans, Arcane, Azorius, Mind Stone, Mox Amber, Solemn) | 9 (5 Talismans, Arcane, Azorius, Chromatic Lantern, Mox Amber) |
| cantrips (1 mana) | 0 | 3 (Brainstorm, Ponder, Preordain) |
| draw engines | 3 (The One Ring, The Theorist, Archmage Emeritus) | 3 (The One Ring, The Theorist, Caretaker's Talent) + Jace +1 |
| counters | 3 (Swan Song, Counterspell, Negate) | 7 |
| spot removal | 10 + 1 MDFC (Feed the Swarm, Abrade, Rakdos Charm, Resculpt …) | 12 + 3 MDFC (Bolt, Swords, Path, Erode, Bitter Triumph, Downfall, Terminate, GftT, Moon, VFM, Fracture, Charm) |
| wipes sparing walkers | 3 (Blasphemous Act, Overwrite, Fumigate) | 4 (Sunfall, Day of Judgment, Overwrite, Fire Covenant) |
| protection | 2 (Lightning Greaves — dead on walkers, Teferi's Protection) | 1 dedicated (Teferi's Protection) + Teyo hexproof, Kasmina tax, Eiganjo, Razorgrass, Otawara |
| walkers (count / types) | 11 / Ajani, Kaito, Jace, Ral, Tezzeret, Chandra ×2, Saheeli, Quintorius, Narset, Wanderer | 10 / Narset, Jace, Kaito, Chandra ×2, Kasmina, Ajani, Teyo, Ral, Wanderer |
| creatures (count / avg −3 hit value, 1–10) | 11 / 2.64 (Bats, Face-Breaker, Plunderer, Solemn, Trawler, Specimen …) | 9 / 8.78 (Zetalpa, Krang, Valgavoth 10; Norn, Sheoldred, Nissa 9; Armaggon 8; Terror, Wan Shi Tong 7) |
| E[−3 hit] over all creature+walker cards | 4.05 (22 hits, 5 % ≥ 8) | 7.21 (19 hits, 42 % ≥ 8) |
| token / fodder makers (noncreature cards) | 16 (7 Ways, Overwrite, 8 walkers) | 19 (3 Ways, Protege, VFM, Countersculpt, Overwrite, Sunfall, Charm, Sokenzan, Sanctum, 8 walkers) + Wan Shi Tong, Nissa |
| avg MV (nonland) | 2.98 | 2.95 |

## 3. Swaps, ranked (IN | OUT | role | why IN | why OUT is weaker)

| # | IN | OUT | role | why IN (oracle) | why OUT is weaker |
|---|---|---|---|---|---|
| 1 | Identity Echo | Plan for All Outcomes | engine | "{3}{R}: Exile target creature or planeswalker you control. Reveal cards from the top of your library until you reveal a creature or planeswalker card. Put that card onto the battlefield" — a second, Jace-free −3 every turn | 4-mana "empower Jace 1" per turn plus a tuck; no board impact |
| 2 | Sheoldred, the Apocalypse | Mirkwood Bats | creature | "Whenever you draw a card, you gain 2 life. Whenever an opponent draws a card, they lose 2 life" — Jace +1 = +4 life a turn; castable at 4 | "Whenever you create or sacrifice a token, each opponent loses 1 life" on a 2/2: a −3 reveal that does nothing |
| 3 | Zetalpa, Primal Dawn | Solemn Simulacrum | creature | "Flying, double strike, vigilance, trample, indestructible" — 16 damage a turn off one −3 | a 2/2 that fetches a basic: the seed's second-worst reveal |
| 4 | Krang, Utrom Warlord | Professional Face-Breaker | creature | "Flying, trample, indestructible, haste" 9/9 — attacks the turn it is revealed | 3/2 menace whose Treasure needs combat damage; poor reveal |
| 5 | Valgavoth, Terror Eater | Pitiless Plunderer | creature | "Flying, lifelink, Ward—Sacrifice three nonland permanents" 9/9 — exile-only answer | Treasure on death of *another* creature; 1/4 reveal |
| 6 | Elesh Norn, Grand Cenobite | Massacre Wurm | creature | "Creatures your opponents control get -2/-2" permanently, "Other creatures you control get +2/+2" — every Cadet is a 4/4 | one-shot −2/−2 at {3}{B}{B}{B}; the four wipes cover it |
| 7 | Nissa, Leyline Tamer | Ral, Monsoon Mage | creature | "Landfall — … draw a card. Then … reveal cards from the top of your library until you reveal a creature card. Put that card onto the battlefield" — every land drop is another polymorph | a 2-mana creature front: the worst possible −3 reveal in the seed |
| 8 | Armaggon, Future Shark | Tekuthal, Inquiry Dominus | creature | "Flash — When Armaggon enters, destroy up to three target creatures" on a 9/6 | proliferate doubler with no proliferate cards in the list |
| 9 | Protege's Awakening | Way of the Pyromancer | empower | "Empower Jace 6. Draw a card" — a 6-loyalty planeswalker plus a card for 4 | 2 loyalty for 2 and "[+1]: Add {R}" |
| 10 | Vraska's Final Mercy | Way of the Mentor | removal / empower | "You lose 2 life. Destroy target creature or planeswalker" or "Empower Jace 6" for {B}{B} | "Whenever you gain life" static with no lifegain cards in the final list |
| 11 | Countersculpt | Swan Song | counter | "Counter target spell. Empower Jace 1"; 2 mana whenever a Jace is on the table or The Theorist in hand | "Its controller creates a 2/2 blue Bird … with flying" that attacks Narset/Kaito/Teyo for free |
| 12 | Sunfall | Blasphemous Act | wipe | "Exile all creatures. Incubate X" — exile, spares walkers, leaves a −3 fodder token | "deals 13 damage to each creature": no exile, dead vs empty boards at {8}{R} |
| 13 | Imprisoned in the Moon | Lightning Greaves | removal | "Enchanted permanent is a colorless land … and loses all other card types and abilities" — the only permanent answer to an opposing commander (no exile → no command zone) | "shroud" makes the wearer untargetable by Jace −3; no creature in the final list wants haste |
| 14 | Lightning Bolt | Abrade | removal | "3 damage to any target" for {R}: creature, walker or face | 2 mana for the same 3 damage or an artifact |
| 15 | Fire Covenant | Frantic Search | wipe | "Fire Covenant deals X damage divided as you choose among any number of target creatures" — instant, one-sided, at 25 life | "Draw two cards, then discard two cards" is card-neutral |
| 16 | Wan Shi Tong, All-Knowing | Saheeli, Sublime Artificer | fodder engine | "target nonland permanent's owner puts it into their library"; "Whenever one or more cards are put into a library from anywhere, create two 1/1 … Spirit" — Jace +1 bottoms a card every turn: two tokens a turn plus removal, 7-value reveal | 3-mana walker with no plus ability; 4-value reveal |
| 17 | Kasmina, Enigmatic Mentor | Tezzeret, Cruel Captain | walker | "Spells your opponents cast that target a creature or planeswalker you control cost {2} more"; "−2: Create a 2/2 … Draw a card, then discard a card" | "−3: Search … artifact card with mana value 1 or less" finds only Mox Amber; the 0 untaps one rock |
| 18 | Ajani, Outland Chaperone | Ajani Unrelenting | walker | "+1: Create a 1/1 … Kithkin creature token" for 3 mana — −3 fodder every turn from turn 3 | 6 mana; "Discard your hand" on the −2 |
| 19 | Terror of the Peaks | Goldspan Dragon | creature | "Whenever another creature you control enters, this creature deals damage equal to that creature's power to any target" — every later reveal is burn | 4/4 haste that makes Treasures on attack; 5-value reveal |
| 20 | Day of Judgment | Fumigate | wipe | "Destroy all creatures" at {2}{W}{W} | the same at 5 mana plus lifegain the deck cannot use |
| 21 | Dovin's Veto | Rakdos Charm | counter | "This spell can't be countered. Counter target noncreature spell" | three narrow modes; "Each creature deals 1 damage to its controller" hits our tokens |
| 22 | Hero's Downfall | Rapid Hybridization | removal | "Destroy target creature or planeswalker" at instant speed | gives a 3/3 Frog Lizard that attacks walkers |
| 23 | Bitter Triumph | Feed the Swarm | removal | "Destroy target creature or planeswalker" for {1}{B} at instant speed | sorcery, "You lose life equal to that permanent's mana value" |
| 24 | Erode | Pongify | removal | "Destroy target creature or planeswalker" for {W}; the opponent gets a land, not a body | "Its controller creates a 3/3 green Ape" — a free attacker into the walkers |
| 25 | Teyo, the Shieldmage | Quintorius, History Chaser | walker | "You have hexproof"; "−2: Create a 0/3 white Wall creature token with defender" ×2 blockers, then a 1-loyalty −3 target | "Whenever one or more cards leave your graveyard" never triggers here |
| 26 | Caretaker's Talent | Archmage Emeritus | draw engine | "Whenever one or more tokens you control enter, draw a card. This ability triggers only once each turn" — every walker plus, Way, Sunfall, Charm | draws on instants/sorceries only and is a 2/2 reveal |
| 27 | Chromatic Lantern | Interplanar Beacon | ramp | "Lands you control have '{T}: Add one mana of any color.' {T}: Add one mana of any color" — turn-3 Lantern is a turn-4 Jace with the colours guaranteed | colourless unless casting a walker |
| 28 | An Offer You Can't Refuse | Resculpt | counter | "Counter target noncreature spell" for {U} | sorcery-speed-priced exile that "creates a 4/4 blue and red Elemental" |
| 29 | Brainstorm | Mind Stone | cantrip | "Draw three cards, then put two cards from your hand on top" with 3 fetches and Jace's bottom | colourless rock in a four-colour deck |
| 30 | No More Lies | Way of the Warlord | counter | "Counter target spell unless its controller pays {3} … exile it" | "[−4]: … 2 damage to up to one target creature or planeswalker and 2 damage to target player" once per 5-loyalty token |
| 31 | Three Steps Ahead | Way of the Necromancer | counter | "+ {1}{U} — Counter target spell", or copy a Sheoldred, or loot | 2-loyalty token; "Whenever a creature you control dies" needs bodies the deck rarely has |
| 32 | Stingerquill Charm | Deadly Dispute | removal / fodder | "3 damage to any target" or "Create a 2/2 … Cadet … haste" at instant speed | needs a sacrifice the −3 wants to keep |
| 33 | Fracture | Big Score | removal | "Destroy target artifact, enchantment, or planeswalker" — the list's only artifact/enchantment answer | 4 mana, discard a card |
| 34 | Ponder | Terramorphic Expanse | cantrip | "Look at the top three cards … You may shuffle. Draw a card" | tapped fetch for one of four basics the final list does not run |
| 35 | Preordain | Evolving Wilds | cantrip | "Scry 2, then draw a card" | same as Terramorphic Expanse |
| 36 | Urborg, Tomb of Yawgmoth | Swamp | land | "Each land is a Swamp in addition to its other land types" — every land taps for B, Bleachbone Verge always on | one B source |
| 37 | Theorist's Sanctum | Mistrise Village | land | "{2}{U}, {T}: Empower Jace 2" — repeatable fodder on a land | "enters tapped unless you control a Mountain or a Forest"; the uncounterable clause rarely matters in 1v1 |
| 38 | Otawara, Soaring City | Archway of Innovation | land | untapped U plus "Channel — {3}{U}, Discard this card: Return target artifact, creature, enchantment, or planeswalker" | "enters tapped unless you control an Island"; improvise is irrelevant |
| 39 | Sokenzan, Crucible of Defiance | Mountain | land | untapped R plus "Channel — {3}{R}, Discard this card: Create two 1/1 colorless Spirit creature tokens" — instant-speed −3 fodder | a Mountain |
| 40 | Eiganjo, Seat of the Empire | Plains | land | untapped W plus "Channel — {2}{W}, Discard this card: It deals 4 damage to target attacking or blocking creature" | a Plains |
| 41 | Savai Triome | Thran Portal | land | "{T}: Add {R}, {W}, or {B}", fetchable, "Cycling {3}" | "Mana abilities of this land cost an additional 1 life", tapped after turn 3 |
| 42 | Oscorp Industries | Boggart Trawler | land | "{T}: Add {U}, {B}, or {R}" | a 3-mana creature front that the −3 can reveal |
| 43 | Mystic Monastery | Cori Mountain Monastery | land | "{T}: Add {U}, {R}, or {W}" | R only, "enters tapped unless you control a Plains or an Island" |
| 44 | Shatterskull Smashing | Arena of Glory | land / removal | R land face or "X damage divided as you choose among up to two target creatures and/or planeswalkers" | R only, tapped without a Mountain, exert for creature haste |
| 45 | Razorgrass Ambush | Hydroelectric Specimen | land / protection | W land face or "3 damage to target attacking or blocking creature" | U land face whose front is a 1-mana-value creature reveal |

Seed mistakes worth feeding back to the builder: (1) it put 11 creature cards in a polymorph deck and 9 of them were filler
(Bats, Face-Breaker, Plunderer, Solemn, Emeritus, Trawler, Specimen, Monsoon Mage, Tekuthal) — the −3 needs *only* bombs; (2)
Lightning Greaves in a deck with no creature it wants to protect and a −3 that targets; (3) seven Ways plus Plan for All
Outcomes as "synergy" while it missed Identity Echo, Protege's Awakening, Vraska's Final Mercy and Countersculpt; (4) 47 mana
sources with 0 cantrips; (5) five mono-colour conditional lands (Mistrise, Archway, Arena of Glory, Thran Portal, Cori
Mountain) and two basic-only fetches in a four-colour deck with four basics; (6) 3 counters and Feed the Swarm / Abrade /
Rakdos Charm as removal while Bolt, Bitter Triumph, Hero's Downfall, Dovin's Veto, Offer, No More Lies were in the pool.

## 4. Stop proof (best remaining candidate loses to the weakest kept card of the role)

- **Creature / −3 hit.** Weakest kept: Terror of the Peaks (hit 7, castable at 5). Best remaining: Doctor Doom ("create two 3/3 …
  Doombot"; "At the beginning of your end step, you draw a card and lose 1 life") — hit 7 at 6 mana; adding it would be a 10th
  hit at the current mean 7.21 and cost Terror's "deals damage equal to that creature's power to any target" on every later
  reveal (a Krang reveal is 9 to the face). Overlord of the Boilerbilges ("deals 4 damage to any target") is the same 7 at
  6 (or a non-creature for 4 turns at impending 4); Medomai ("take an extra turn") is a 4/4 that must connect; Massacre Wurm
  needs {B}{B}{B}; Emeritus of Ideation's "draws three cards" is a 3/3 body; Gandalf the White doubles Way triggers but is a 4/5.
- **Walker.** Weakest kept: Teyo, the Shieldmage (3 mana, 5 loyalty, two 0/3 Walls, "You have hexproof"). Best remaining: The
  Wanderer ("Prevent all noncombat damage that would be dealt to you and other permanents you control"; "−2: Exile target creature
  with power 4 or greater") — 4 mana and matchup-bound; Ob Nixilis, the Hate-Twisted is 5 mana for two kills; Saheeli's servos
  need a spell each; Quintorius Kand and Garruk are 5. Teyo is the only 3-drop that both blocks and blanks Duress/Bolt-to-face.
- **Counter.** Weakest kept: Negate. Best remaining: Swan Song — "Its controller creates a 2/2 blue Bird creature token with
  flying" is a free evasive attacker into the non-Jace walkers; Spell Pierce is dead from turn 6; Remand is tempo only;
  Essence Scatter / Long River's Pull miss the noncreature spells the seven kept counters already stop creatures with
  (Counterspell, Countersculpt, No More Lies, Three Steps Ahead hit creatures).
- **Spot removal.** Weakest kept: Stingerquill Charm ({B}{R}: "3 damage to any target" / instant Cadet). Best remaining: Cut Down
  ("total power and toughness 5 or less") misses every commander that matters; Sear (4 damage) misses 5-toughness commanders;
  Pongify/Rapid Hybridization hand over a 3/3; Dreadbore is a sorcery with no walker-protecting mode; Unholy Heat needs
  delirium; Banishing Light / Aang's Iceberg / Perilous Snare exile → the commander returns to the command zone, unlike Moon.
- **Wipe.** Weakest kept: Fire Covenant. Best remaining: Slagstorm ("3 damage to each creature") kills our Cadets and Sheoldred's
  neighbours symmetrically at sorcery speed; Rise of the Deathbringer is 5 mana for −3/−3; Urza's Ruinous Blast exiles our 8
  rocks, Identity Echo and every token; Malicious Eclipse / Pyroclasm are −2/−2 sorceries; Divine Reckoning lets the opponent keep
  their commander.
- **Empower / Way / fodder.** Weakest kept: Way of the Cryomancer ("[−3]: When you next cast an instant or sorcery spell this
  turn, copy that spell" on every walker + a 5-loyalty token). Best remaining: Way of the Mentor ("Whenever you gain life")
  has no lifegain trigger source in the list; Way of the Necromancer is 2 loyalty; Way of the Mind Sculptor is 5 mana;
  Hexhaven Battalion is 6; Fatehold Charm / No Admittance / Solve for Disappointment give 1–2 loyalty; Outlaws' Merriment
  ({1}{R}{W}{W}) makes a random body per turn but no planeswalker.
- **Engine.** Weakest kept: Oath of Teferi (5). Best remaining: All Will Be One ("Whenever you put one or more counters on a
  permanent or player, … deals that much damage") is a 5-mana enchantment that does nothing the turn it lands and needs the
  Ways to resolve after it; Virtue of Knowledge is 5 for one copy; Displacer Kitten / Flux Channeler are 2/2 creature reveals.
- **Draw.** Weakest kept: Preordain. Best remaining: Tezzeret's Gambit (4 mana, one proliferate) / Night's Whisper / Expressive
  Iteration ({U}{R}) / Stock Up (3) / Treasure Cruise (delve rarely reaches 3 cards by turn 6 with 35 lands) / Phyrexian
  Arena (bleeds 1 a turn against the aggro decks the list fears) — none is castable on turn 1 to fix a four-colour hand.
- **Tutor.** Weakest kept: Enlightened Tutor (finds Ring, Oath, Echo, Lantern, Ways). Mystical Tutor finds only spells;
  Gamble discards at random; Loyal Tutor finds a class of 10 cards Jace +1 already digs to.
- **Protection.** Weakest kept: Teferi's Protection. Authority of the Consuls / Settle the Wreckage / Boros Charm / Aetherize
  each cover one attack pattern; Teferi's "All permanents you control phase out" covers attacks, wipes and Cyclonic effects.
- **Ramp.** Weakest kept: Azorius Signet (W/U, the two heaviest pips). Izzet/Rakdos/Boros Signets duplicate a Talisman pair; Mox
  Opal is off until three artifacts; Mind Stone is colourless; Jeska's Will makes only {R}; Wayfarer's Bauble finds one Island.
- **Land.** Weakest kept: Mystic Monastery. Nomad Outpost swaps U for B (U is the heaviest pip; B is covered by Urborg); Fabled
  Passage / Shattered Landscape fetch a basic the list has one of; Takenuma / Karn's Bastion / Interplanar Beacon are colourless
  or single-colour; the Annex/Commons duals enter tapped until a walker lands; Temples are tapped duals.
- **Roles not in the deck** (weakest overall kept card: Negate): Exsanguinate (X finisher) — the −3 already ends games;
  Twisted Fealty / Involuntary Employment (steal, then exile with −3) need Jace at 3 loyalty on the same turn; Duress /
  Solve for Disappointment; Dark Depths + Thespian's Stage (two colourless lands in a WUBR deck); Painful Quandary (5-mana
  lock that arrives after the game is decided). A seventh cheap counter beats each of them in 1v1.

## 5. Mana: Monte Carlo, land count, −3 hit distribution

`sim/landsim.py`, 40,000 games per row and side, seed 20260930. Rules in the file header: 99-card library, free first
mulligan (redraw once when the 7 has < 2 or > 5 land faces), London to 6 after that; one land drop a turn; rocks cast
greedily from turn 2 (8 counted: 5 Talismans, Arcane Signet, Azorius Signet, Chromatic Lantern at 3; Mox Amber never);
fetches count as the colours the shocks reach; Great Hall counts as any colour for Jace only. Values are % play / draw.

| land faces | 2 lands by T2 | 3 mana by T3 | 4 mana by T4 | Jace by T4 | Jace by T5 (5 sources + WUBR) | WUBR by T5 | flood: 7+ lands by T6 | screw: ≤2 lands by T4 |
|---|---|---|---|---|---|---|---|---|
| 33 | 98.8 / 99.1 | 89.8 / 93.8 | 75.6 / 83.7 | 29.8 / 38.3 | 56.6 / 67.1 | 86.0 / 88.8 | 6.5 / 10.7 | 13.4 / 8.8 |
| 34 | 99.0 / 99.2 | 90.6 / 94.2 | 77.4 / 85.0 | 30.8 / 39.1 | 58.4 / 68.6 | 85.6 / 88.6 | 7.6 / 12.4 | 12.0 / 7.9 |
| **35** | **99.3 / 99.4** | **91.6 / 95.0** | **79.6 / 86.7** | **32.8 / 40.5** | **61.2 / 71.2** | **86.5 / 89.2** | **8.6 / 14.0** | **10.8 / 7.1** |
| 36 | 99.4 / 99.6 | 92.3 / 95.8 | 80.8 / 87.9 | 33.8 / 42.3 | 63.3 / 73.3 | 87.7 / 90.3 | 9.7 / 15.9 | 10.0 / 6.1 |

Rock count at 35 faces (earlier run, 20,000 games, 2-mana rocks only): 7 rocks 58.7 / 68.2 Jace-by-T5, 8 rocks 61.0 / 70.8,
9 rocks 63.5 / 73.3 — a rock is worth about one land on the turn-5 metric and more on turn 4, but dies to artifact removal
and costs the turn-2/3 play. **Choice: 35 land faces (31 lands + 4 MDFC) and 8 rocks + Mox Amber.** 34 → 35 buys +2.8 on
Jace-by-T5 and −1.2 screw for +1.0 flood; 35 → 36 buys +2.1 for +1.1 flood and the loss of Negate (the weakest spell). Every
extra land is worth about one cheap interaction spell at this point of the curve, so the count stops at 35. Tapped or
conditional lands in the 35: Savai, Oscorp, Mystic Monastery (tapped); Theorist's Sanctum (tapped without a Jace);
Stormcarved / Deserted Beach / Shattered Sanctum / Sundown Pass (tapped as land 1–2); Spirebluff / Concealed Courtyard (tapped
as land 4+); Starting Town (tapped from turn 4); Verges (second colour needs the paired type — Urborg turns Bleachbone on);
the four MDFC backs and the five shocks cost life untapped. The gate's Karsten band (37 ±2) is a curve heuristic that does
not see the 8 rocks or the free mulligan; the sim above is the measurement.

**−3 / Identity Echo hit distribution** (`sim/hits.py`; uniform over the creature and planeswalker cards still in the
library, so the numbers below are the turn-0 distribution — every cheap walker cast from hand raises the remaining mean):

| value | cards | P(this value) |
|---|---|---|
| 10 | Zetalpa (8), Krang (9), Valgavoth (9) | 3/19 = 15.8 % |
| 9 | Sheoldred (4), Elesh Norn (7), Nissa, Leyline Tamer (7) | 15.8 % |
| 8 | The Eternal Wanderer (6), Armaggon (8) | 10.5 % |
| 7 | Chandra, Torch of Defiance (4), Wan Shi Tong (5), Terror of the Peaks (5) | 15.8 % |
| 6 | Narset (3), The Theorist (4), Kasmina (4), Ral (4) | 21.1 % |
| 5 | Kaito (3), Chandra, Acolyte (3), Ajani (3) | 15.8 % |
| 4 | Teyo (3) | 5.3 % |

E[hit] = 7.21 (seed 4.05); P(creature) = 9/19 = 47 % (creature mean 8.78, seed 2.64); P(hit ≥ 8) = 42 % (seed 5 %).
Expected mana value put onto the battlefield by one −3: 5.6 (seed 3.5). Cast values are kept honest: 4 of the 9 creatures
cost ≤ 5, 5 cost 7–9 and are what Jace +1 bottoms and a fetch reshuffles.

## 6. Gate

```
MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts verify-2026-09-30/arena-jace/final.txt --format brawl --owner 1 --source arena
totals    : 100 cards | 31 lands (32.5 eff.) | 68 nonland | avg MV 3.16
VERDICT   : FAIL
  PASS  size        100 cards (brawl wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in brawl
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside BRUW
  PASS  ownership   all cards owned; arena collection imported 0 days ago
  WARN  arenaNames  4 card(s) must be exported front-face only: Sink into Stupor, Fell the Profane, Shatterskull Smashing, Razorgrass Ambush
  WARN  lands       31 lands (+4 MDFC land backs = 32.5 effective); Karsten wants 37 ±2
  FAIL  plan        0/68 nonland cards interact (0%) — commander wants: draws cards
  PASS  curve       avg MV 3.16; commander sets no cost threshold
  PASS  wincons     10 win condition(s)/closer(s)
  PASS  locks       8 locked card(s) present and intact
```
Ownership PASS with plain names — no `A-` name was needed. The `plan` FAIL is the gate, not the deck: `deck-gate-plan.ts`
derives "draws cards" from Jace's +1 and has no noun for it, so even Brainstorm scores 0/68; the deck's real plan (the −3 /
Identity Echo reveal, 19 hits, 19 fodder makers) is not expressible in `CATEGORY_NOUNS`. The arenaNames WARN lists the four
MDFCs already written front-face only (informational). The lands WARN is answered by section 5.

## 7. Mulligan and play guide

- Keep 7 with 2–4 land faces and either a rock or a 1–2-mana play; keep any 3-land hand with a Talisman. Free mulligan every
  1-lander and every 6-lander; with a rock a 2-lander on the draw is a keep.
- Turn 1 cantrip (Brainstorm with a fetch, Ponder, Preordain) to line up WUBR; turn 2 Talisman; turn 3 Narset / Kaito / Ajani /
  Teyo / Chandra Acolyte or Lantern; turn 4 Jace if 4 lands + rock, else Ring / Kasmina / Theorist / Chandra Torch.
- +1 every turn Jace is not threatened: bottom the 8–9-drop, then crack a fetch to shuffle it back under the −3.
- −3 the turn you have a body to spare and Jace is at 4+: Jace token (any Way, Protege, VFM, Countersculpt, Sanctum), a Cadet /
  Kithkin / Wall / Spirit, a spent walker at 1–2 loyalty, a Sunfall Incubator, a stolen creature is not in the list — never a bomb.
- With Oath of Teferi: +1 then −3 the same turn (Jace 4 → 5 → 2), refill loyalty with Chandra Acolyte's first 0 (Jace is red).
- Identity Echo is the mana sink from turn 6: {3}{R} at sorcery speed, once a turn, on the same fodder.
- Hold Counterspell / Countersculpt / Offer for wipes, opposing walkers and the commander; use Fire Covenant and Bolt at end of turn.
- Wipes go before, not after, a reveal: Sunfall / Day of Judgment, untap, −3 into an empty board.
- Kill turns: a Krang or Zetalpa reveal on turn 5–6 ends the game two turns later; Sheoldred plus Jace +1 is 4 life a turn each
  way; Nissa turns every land into a second reveal.
- Against aggro: Cut the plan to turn-3 Fire Covenant / turn-4 Day of Judgment, Teyo walls, Eiganjo / Razorgrass on attackers,
  Teferi's Protection on the alpha; Jace comes down only behind a stabilised board.
- Against control: Narset first (their draw), Offer / Veto for their wipe, then Ways as uncounterable-by-Negate walker bodies
  (they are enchantments) and Countersculpt at 2 while a Jace is out.

## 8. Convergence review (Fable refuter, 2026-10-01)

Method: read `final.txt`, `deck.md`, all eight screens; probed every `pool-NN.md` by name for ~220 known W/U/B/R staples
(`sim/probe.py`) and scanned the pool by predicate (`sim/scan.py`: every planeswalker, every creature MV ≥ 6, every 2+-colour
land, every counter ≤ 3, every removal instant ≤ 2, every wipe ≤ 6, every draw/token engine ≤ 5). Re-ran `sim/hits.py`,
`sim/landsim.py` (10k games) and the gate. Two full passes; the second found no improving swap.

**Screen misses that matter (in the pool, in no screen):** Myr Battlesphere, Aurelia the Warleader, Meteor Golem, Gideon's
Sacrifice, It'll Quench Ya!, Get Out, Disdainful Stroke, Syncopate, Lightning Strike, Play with Fire, Consider, Dark Ritual,
Gemstone Caverns, Dark Fortress, Zodiark. None of the classic staples is owned: no Teferi (any), Wandering Emperor, Liliana,
Bolas Dragon-God, Elspeth, Farewell, Wrath, Damnation, Rift, Mana Drain, Memory Lapse, Absorb, Fatal Push, Grasp, Vindicate,
Anguished Unmaking, Smothering Tithe, Rhystic Study, Fact or Fiction, Sol Ring, Watery Grave, any Pathway, checkland,
painland, or the missing fast/slow/Verge duals. The screeners dropped nothing above the deck's bar except Tomik, which they
passed but the builder never weighed (it appears in no stop-proof line).

### Swaps applied

| IN | OUT | why |
|---|---|---|
| Tomik, Orzhov Lawmage | Negate | "Planeswalkers you control have 'No more than one creature can attack this planeswalker each combat.'" on a 2-mana 2/3 flyer. Jace has 4 loyalty and spends 3 of it; his static only taxes the attack ({2}), it does not cap it — a three-creature board kills him through one removal spell. With Tomik every one of the 11 walkers faces one attacker per combat, which Teyo's Walls, a Cadet, Eiganjo, Razorgrass or any of the 12 instant removal spells answers; Kasmina taxes the spells. Negate was the builder's own weakest card: the seventh counter, noncreature-only, in a deck whose stated fear is creature decks. Cost: a 20th −3 hit at value 5 (a revealed Tomik still installs the cap) — E[hit] 7.21 → 7.10, P(≥ 8) 42 % → 40 %. |

Gate after the swap: unchanged (100 / singleton / legality / identity / ownership PASS, `plan` FAIL as before, WARNs
informational). `sim/hits.py`: 20 hits = 10 creatures + 10 walkers, E[hit] 7.10, creature avg 8.40.

### Considered and rejected

- **Dovin, Hand of Control for Teyo** — "−1: Until your next turn, prevent all damage that would be dealt to and dealt by
  target permanent an opponent controls" five times, plus a {1} tax on their artifact/instant/sorcery spells, hybrid {W/U}.
  Rejected: with Tomik each walker faces one attacker, so a 0/3 defender Wall stops it every turn for good, twice, and both
  Walls are −3 fodder; Dovin's neutralisation lasts one turn cycle and makes no body. Teyo's "You have hexproof" also blanks
  Duress-class discard on the counters. Closest call in the review.
- **Karn, the Great Creator for Teyo** — static kills the opponent's Signets/Talismans/Treasures/equip/crew; "+1: … noncreature
  artifact becomes an artifact creature" turns a rock into a blocker and a −3 target. Rejected: the fodder costs a rock each
  time, 4 mana vs 3, no ultimate; the static is strong only against artifact-ramp opponents.
- **Myr Battlesphere for Terror of the Peaks** — "create four 1/1 colorless Myr" = four −3 fodder plus a 4/7, colourless at 7.
  Hit 8 vs 7, but cast 7 vs 5 in a deck that already carries six cards costing ≥ 7; not provable.
- **Bard, King of Dale for Terror** — doubles Jace's +1 to four cards and every token maker (Empower would make two Jace tokens).
  Hit 8 vs 7, cast 6 (WU) vs 5; same verdict as Battlesphere.
- **Absolute Virtue for Terror** — "You have protection from each of your opponents" ends damage and targeting on the player,
  not on the walkers; 8 mana; hit 8 vs 7. Rejected on cast value.
- **Aurelia, the Warleader** (unscreened, RRWW 6): extra combat on a 3/4 — hit 7 at best; loses to Terror/Wan Shi Tong on cast.
- **Meteor Golem** (unscreened, 7): Vindicate on a 3/3 — hit 7, no better than the kept 7s and a worse body.
- **Kaito, Bane of Nightmares for Kaito, Cunning Infiltrator** — "−2: Tap target creature. Put two stun counters on it" is
  protection; 4 mana vs 3 and no fodder mode. Coin flip; kept the builder's.
- **Gideon's Sacrifice** (unscreened, {W} instant): redirects all damage this turn to a chosen creature or walker — a 1-mana
  fog onto a Wall/Cadet. Dead against control; the removal suite and Tomik cover the aggro case.
- **Gideon's Memorial for Azorius Signet** — any-colour mana but "Spend this mana only to cast a planeswalker spell": dead on
  every turn the deck holds up a counter. The 4-damage discard mode does not pay for that.
- **It'll Quench Ya! / Get Out / Disdainful Stroke / Syncopate** — Mana Leak-class soft counters, or narrower than Negate;
  none beats the six kept counters, and the slot went to Tomik.
- **Phyrexian Arena** — the deck already draws off Jace +1, Ring, Theorist, Talent, three cantrips; BB at 3 competes with the
  walker turn and bleeds against aggro. Builder's rejection stands.
- **Gemstone Caverns / Dark Fortress / Hidden Lair** — Caverns is a colourless land in ~96 % of games; Fortress and Lair need a
  basic land on the battlefield after their entry turn and the deck runs one Island.
- **Chromatic Lantern → 2-mana B/R Signet** (`sim/rockvariant.py`, 10k games): Jace by T5 61.0/70.5 vs 60.8/70.4, WUBR by T5
  86.8/89.5 vs 86.5/89.2 — identical within noise, so Lantern's extra mana costs nothing measurable and its fixing stays.
- **Way of the Mentor** — see rules note 2; still not worth a slot (live only with Sheoldred or Valgavoth on the table).

### Land / rock split (builder's `landsim.py`, re-run at 10k games, seed 20260930)

35 faces: 2 lands by T2 99.2/99.4, 3 mana by T3 91.4/94.8, Jace by T4 31.6/40.6, Jace by T5 60.8/71.2, WUBR by T5 85.9/89.1,
flood 8.7/14.3, screw 10.8/7.1 — the report's numbers reproduce. 36 faces buys +2.5 Jace-by-T5 for +1.0/+1.4 flood and a
spell; 34 loses 2.5. The sim ignores tapped lands (9 of the 35 enter tapped on some turn), so real Jace-by-T5 is a few points
lower at every count, which does not change the ordering. No better split was proven; 31 + 4 MDFC + 8 rocks + Mox stands.

### Rules claims checked against the pool/deck oracle text

Correct: Identity Echo is a Jace-free −3 ("{3}{R}: Exile target creature or planeswalker you control … Activate only as a
sorcery") — and understated: there is no once-per-turn clause, so eight mana is two reveals. Oath of Teferi +1 then −3 (4 →
5 → 2). Countersculpt at {U}{U} with a Jace token on the table or The Theorist in hand. Chandra Acolyte's first 0 hits Jace
(he is red). Wan Shi Tong triggers on Jace +1's bottom, on the −3's "rest on the bottom", and on Brainstorm's put-back.
The static covers the commander, The Theorist and every Jace token ("Jaces you control"). Hit table = final list (19 → 20).

Wrong or loose:
1. "Valgavoth … exile-only answer" — he is not indestructible: "Flying, lifelink | Ward—Sacrifice three nonland permanents".
   Day of Judgment-class wipes kill him outright and any destroy spell does once the ward is paid.
2. "Way of the Mentor … no lifegain trigger source in the list" — Sheoldred ("Whenever you draw a card, you gain 2 life") and
   Valgavoth (lifelink) are in the list; Mentor would add a loyalty counter to every walker on each Sheoldred draw. The
   rejection still holds (dead without one of the two); the reason given was false.
3. "Sunfall … leaves a −3 fodder token" — the Incubator is a noncreature artifact until "{2}: Transform this token"; the −3
   needs the {2} first.
4. "Nissa … every land drop is another polymorph" — Nissa reveals "until you reveal a creature card": walkers are skipped and
   bottomed, and stay there until a fetch shuffles.
5. "Theorist's Sanctum … repeatable fodder" — Empower adds counters to an existing Jace token and creates one only if you
   control none; it is repeatable only after the previous token has been exiled.
6. §1 "23 pieces of cheap interaction" counts Sunfall (5), Overwrite (6), Day of Judgment (4) and Moon (3).

### Stop statement per role (after the swap)

- **Creature / −3 hit.** Weakest kept: Tomik (hit 5, cast 2) — kept for the cap, not the reveal; weakest bomb: Terror of the
  Peaks (7 at 5). Best remaining: Myr Battlesphere / Bard / Absolute Virtue at hit 8 lose because each costs 6–8 to cast in a
  deck already holding six ≥ 7-drops, and a one-point hit gain on one card in twenty is +0.05 per reveal.
- **Walker.** Weakest kept: Teyo. Best remaining: Dovin, Hand of Control loses because, under Tomik, two permanent 0/3 Walls
  plus player hexproof beat five one-turn neutralisations that leave no body; Karn loses on fodder cost and 4 mana.
- **Counter.** Weakest kept: An Offer You Can't Refuse ({U}, two Treasures to the opponent). Best remaining: Negate (cut) loses
  because the seventh counter was the slot Tomik needed; It'll Quench Ya! is a soft counter; Get Out counters only creature or
  enchantment spells.
- **Spot removal / wipe / empower / engine / draw / tutor / ramp / land.** Unchanged from §4 — no pool card found that the
  builder's lines do not already dominate; the probe confirmed the named alternatives are the only ones owned.
- **Protection.** Weakest kept: Teferi's Protection. Best remaining: Gideon's Sacrifice ({W}, a one-turn redirect) loses
  because Teferi's covers wipes and Cyclonic effects as well as combat; Tomik now covers the repeated-attack case.

Converged: yes. Second full pass over every role and the "roles not in the deck" list found zero improving swaps.
