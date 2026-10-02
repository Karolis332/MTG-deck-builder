# Inspirit, Flagship Vessel: round 2 + batches 2b–2g, converged rebuild (2026-10-02)
Proposed: `inspirit-proposed-2.txt` (100, commander first, **38 lands**). Baseline: the **sleeved** `inspirit-current.txt` (101). Every card the operator holds for Inspirit (`ADDENDUM-2B.md`, batches 2b–2g, 137 cards) was ranked against the weakest kept card of its role and swapped in where it won (§8). Every other open pool card with MV ≤ 3 gets a verdict in §9. The pass was repeated until it found no improving swap (§6).
Tools (read-only): `metrics2.py`, `landsim.py` (20k games, on the play, free mulligan; Mechanaut/Sculptor −1 each on Depthshaker; Urza = 2 {U}, Nyx Lotus = 2 from T+1, both floors), `open2.py`. Quotes: DB oracle text (`newcards-oracle.txt`, `batch2c/2d/2g-oracle.txt`).
## 1. Plan and win lines
- **Engine.** T1–2 rock or Etherium Sculptor; T3 Inspirit; T4 station 8+ (Bygone Colossus "Warp {3}", 9 power, or Traxos twice; station may tap a creature cast this turn, CR 302.6). Then "Other artifacts you control have hexproof and indestructible", and the 1+ trigger adds two charge counters: on Insight Engine ("draw a card for each charge counter on it") that is 3, then 6 cards.
- **Kill 1: Depthshaker Titan (locked).** "any number of target noncreature artifacts you control become 3/3 artifact creatures ... Each artifact creature you control has melee, trample, and haste". T7: 5 spares × 6/6 + Traxos 10/10 + Kilo 6/6 + Depthshaker 8/8 + Urza's Construct ("+1/+1 for each artifact", ~19/19) ≈ 73 trample; **Blade Historian ("Attacking creatures you control have double strike") doubles it.** The sacrifice "at the beginning of the next end step" ignores indestructible: animate spares only.
- **Kill 2: Craterclaw Colossus.** "Haste / ... creatures you control gain trample and get +X/+0 ..., where X is the number of artifacts you control": +16 each at 16 artifacts, **+32 with Panharmonicon** ("triggers an additional time"). No sacrifice. Nyx Lotus in R mode pays its RRR.
- **Kill 3: Cyberdrive Awakener.** "Other artifact creatures you control have flying. / ... each noncreature artifact you control becomes a 4/4 artifact creature until end of turn". No sacrifice. Equipment animates too and falls off Inspirit (an Equipment that is a creature can't stay attached; verify).
- **Commander damage.** On a stationed Inspirit: Improvised Arsenal ("+1/+0 for each artifact you control", "Equip {R}") or All That Glitters ("+1/+1 for each artifact and/or enchantment you control") → 21+ in one hit; Boros Charm's "double strike" halves the need; Gavel alone needs 6 counters.
- **Protection, setup, chip.** Boros Charm "Permanents you control gain indestructible" (Inspirit too, which its own grant excludes); Ripples phases out; Cyclonic Rift overloaded at the last end step clears blockers; Counterspell/Swan Song/Three Steps hold the alpha. Lasting Tarfire: 2 to each opponent per end step with a counter on a creature (6 repeatable sources). Backup: Darksteel Reactor (Skate doubles; Panharmonicon doubles Skate), Lux Artillery at 30 counters.
## 2. Health table
| metric | sleeved (101) | proposed (100) |
|---|---|---|
| lands (tapped / basics / colourless-only) | 39 (12 / 7 / 2) | **38 (8 / 9 / 2)** |
| land / rock sources U, R, W (filters ½–¾, fetch ⅔; Karsten rock weights) | 19.9, 21.2, 20.9 / 5.5, 5.0, 5.0 | 22.4, 19.7, 19.4 / 5.0, 4.5, 4.5 + Urza, Nyx Lotus |
| nonland pips U / R / W (hybrid not counted); avg MV (effective) | 27 / 10 / 13; 3.33 (3.10) | 29 / 13 / 12; 3.21 (2.92) |
| sim: Inspirit T3 / by T4; Depthshaker castable T7 | 68.2 / 83.6 %; 59.4 % | **75.5 / 87.6 %; 64.0 %** |
| ramp / draw / removal / counterspells | 14 / 10 / 5 / 1 | 13 / 9 (+Insight Engine) / 7 / 3 |
| wipes (one-sided) / protection / engines / payoffs | 3 (1) / 2 / 10 / 13 | 3 (3: Rift overload, Organic Extinction, Final Showdown's mode) / 2 / 8 / 16 |
| nonland artifacts (creature / noncreature); artifact lands | 39 (20 / 19); 6 | 35 (18 / 17); 6 |
**Land count.** Karsten regression (cheap = 10): 38.7 nominal, 37.8 effective; gate 39 ±2. Avg MV rose with Cyberdrive, Urza and Panharmonicon, so **38**: the sim at 37 / 38 / 39 lands gave T7 Depthshaker 60.0 / 62.6 / 64.6 % before Nyx Lotus (38 now 64.0 %), with T3 flat. The 38th land replaced Tezzeret's Gambit.
**Colour check.** Depthshaker 5CC needs 20: R = 24.2 weighted. Craterclaw RRR: 24.2 vs 28 for a 6-MV triple; Nyx Lotus in R mode (devotion to R ≈ 3 by T6) pays it, otherwise cast it T8+. Counterspell UU (2-MV CC wants 30): U = 27.4 plus Urza.
## 3. Swaps vs the sleeved list (27 nonland out, 27 in; 8 lands out, 7 in)
| # | Out | In | role | why (quote) |
|---|---|---|---|---|
| 1 | Hangarback Walker | Bygone Colossus | station | "Warp {3}", 9/9: one tap puts Inspirit at 8+ |
| 2 | Golem Foundry | Traxos, Scourge of Kroog | station | {4} 7/7 trample, "Whenever you cast a historic spell, untap Traxos" |
| 3 | Emry, Lurker of the Loch | Lost Jitte | cheap artifact | Inspirit's charge → "Untap target land" or "Target creature can't block this turn" |
| 4 | Thrummingbird | Improvised Arsenal | closer | "+1/+0 for each artifact you control", "Equip {R}" |
| 5 | Coretapper | Panharmonicon | engine | "triggers an additional time": Craterclaw, Skate, Surge, Kappa, Tezzeret, Urza, Thought Monitor ETBs |
| 6 | Soul-Guide Lantern | Generous Gift | removal | {2}{W} instant "Destroy target permanent" |
| 7 | Tractor Beam | Sheltered by Ghosts | removal | {1}{W}: "exile target nonland permanent an opponent controls" |
| 8 | Mountain | Bovine Intervention | removal | {1}{W} instant "Destroy target artifact or creature" |
| 9 | Wake the Past | Three Steps Ahead | counterspell | "Counter target spell" or "Create a token that's a copy of target artifact or creature" |
| 10 | The Eternity Elevator | Counterspell | counterspell | {U}{U} "Counter target spell" |
| 11 | Uthros Psionicist | Ornithopter of Paradise | ramp | {2} flier, "{T}: Add one mana of any color" |
| 12 | Cloud Key | Fellwar Stone | ramp | {2}, any colour an opponent's land could make (2 owned, Tazri 1) |
| 13 | Fumigate | Final Showdown | wipe | "It gains indestructible" + "Destroy all creatures", instant |
| 14 | Chain Reaction | Cyclonic Rift | wipe / removal | "Return target nonland permanent you don't control"; "Overload {6}{U}": one-sided, instant |
| 15 | Angel of the Ruins | Chaos Warp | removal | instant, any permanent, through indestructible |
| 16 | Threefold Thunderhulk | Craterclaw Colossus | finisher 2 | haste, "+X/+0 ... number of artifacts you control", trample |
| 17 | Moxite Refinery | Lasting Tarfire | chip | 2 to each opponent per end step with a counter placed |
| 18 | Mindless Automaton | Fact or Fiction | draw | {3}{U} instant: "Reveal the top five ... Put one pile into your hand" |
| 19 | Resourceful Defense | Cyberdrive Awakener | finisher 3 | "each noncreature artifact you control becomes a 4/4 artifact creature"; fliers |
| 20 | Patrolling Peacemaker | Boros Charm | protection / closer | "Permanents you control gain indestructible" or "double strike", {R}{W} |
| 21 | Pinnacle Emissary | Blade Historian | finisher amp | "Attacking creatures you control have double strike" |
| 22 | Crystalline Crawler | Etherium Sculptor | ramp | {1}{U}: "Artifact spells you cast cost {1} less" (35 artifacts); Crawler is {4} |
| 23 | Solar Array | Urza, Lord High Artificer | ramp / payoff | "Tap an untapped artifact you control: Add {U}"; Construct "+1/+1 for each artifact you control" |
| 24 | Experimental Augury | Insight Engine | draw | "draw a card for each charge counter on it"; Inspirit adds 2 charge per turn |
| 25 | Tezzeret's Gambit | Island | land 38 | §2 |
| 25b | Pull from Tomorrow | Reverse Engineer | draw | "Improvise" + "Draw three cards": ~{U}{U} plus spare artifacts, lands stay up for Counterspell/Rift |
| 25c | All-Fates Scroll | Nyx Lotus | ramp | "Add an amount of mana of that color equal to your devotion": 22 coloured permanents (U 17, R 16 if all out), ~3 by T6, pays RRR |
| 25d | Titan Forge | All That Glitters | closer | "+1/+1 for each artifact and/or enchantment you control": stationed Inspirit ≈ 23/23 flier for {1}{W}; Forge needs three charge counters per 9/9 |
| 26 | Lands (box → in) | — | land | Evolving Wilds → Fabled Passage; Temple of Triumph → Path of Ancestry (URW); Lonely Sandbar → Island; Glittering Massif → Inspiring Vantage (untapped T1–3); Buried Ruin → Island; The Mycosynth Gardens → Inventors' Fair ("Search your library for an artifact card") |
| 27 | Secluded Steppe | — | owed cut | "This land enters tapped" |
## 4. Land verdicts (open = not sleeved elsewhere; S = in the Inspirit box)
| Land(s) | open | untapped T1–3 | colours | utility | verdict |
|---|---|---|---|---|---|
| Adarkar Wastes, Battlefield Forge, Shivan Reef, Sacred Foundry | 1 S each (Reef: Tam 1; Foundry: Tazri 1) | yes (pain / 2 life) | WU, RW, UR, RW | Foundry: Mountain Plains | IN |
| Ancient Den, Great Furnace, Seat of the Synod; Razortide Bridge, Rustvale Bridge, Silverbluff Bridge | 1 S each | Den/Furnace/Seat yes; Bridges no | W, R, U; WU, RW, UR | artifact lands (Bridges indestructible) | IN: Surge, Kappa, Urza, Craterclaw/Arsenal X; die to artifact wipes |
| Clifftop Retreat, Glacial Fortress, Sulfur Falls; Cascade Bluffs, Rugged Prairie, Skycloud Expanse | 1 S each (Clifftop: Tam 1) | checks with 6 / 10 / 11 typed lands; filters with a matching source | RW, WU, UR; UR, RW, WU | — | IN |
| Command Tower, Exotic Orchard, Spire of Industry, Fabled Passage, **Inspiring Vantage** | 2 (1 S), 2 (1 S), 1 S, 2 (Meren 1), 1 (second copy) | yes (Fabled: from land 4) | URW / opponents' / any with an artifact / any basic / RW | — | IN |
| Mystic Monastery, Path of Ancestry, Irrigated Farmland, Temple of Enlightenment, Temple of Epiphany, Radiant Summit | 1 S, 3, 1 S, 1 S, 1 S, 1 S | no (Summit: with 2+ basics) | URW, URW, WU, WU, UR, RW | Farmland cycling + types; Temples scry 1 | IN |
| Karn's Bastion, **Inventors' Fair** | 1 S, 1 | yes | C | "{4}, {T}: Proliferate"; "{4}, {T}, Sacrifice ...: Search your library for an artifact card" | IN: the two colourless lands; Fair tutors Depthshaker/Craterclaw/Cyberdrive |
| Island / Mountain / Plains | basics | yes | U / R / W | check types | IN: 6 / 2 / 1 |
| Replaced from the box | 1 S each | — | — | — | OUT: Buried Ruin (C), Evolving Wilds, Glittering Massif (tapped RW), Lonely Sandbar, Secluded Steppe, Temple of Triumph, The Mycosynth Gardens (C copy, loses to Fair's tutor) |
| Operator-held, OUT | 1 each | see text | U | — | Archway of Innovation ("enters tapped unless you control an Island"), Uthros, Titanic Godcore ("enters tapped"; 12 station counters), Sink into Stupor // Soporific Springs (tapped or 3 life; the gate counts the back as 0.4 land) |
| Colourless utility and filters (≈ −2.6 pts T3 each) | 1 each; Rogue's Passage 2, Pylons 2, Opal 2, Study Hall 3 | yes | C | listed | OUT: Arcane Lighthouse, Nesting Grounds ("{1}, {T}: Move a counter"), Reliquary Tower, Rogue's Passage ("can't be blocked"), War Room, Ash Barrens, Radiant Fountain, Sandstorm Verge, Witch's Clinic, Skycoach Waypoint, Muraganda Raceway; filters Conduit Pylons, Hidden Grotto, Opal Palace, Rumble Arena, Study Hall (two lands → one coloured mana) |
| Tapped or slow | Abraded Bluffs, Eroded Canyon 2, Lonely Arroyo, Arid Archway, Temple of the False God 2, Mirage Mesa, Tarnation Vista; Maestros Theater, Riveteers Overlook 2, Terramorphic Expanse 4 | no | duals (1 dmg), CC, chosen; tapped fetches | — | OUT: worse than the kept Temples, Bridges and Fabled Passage |
| Tam's / Tazri's / other decks, 0 open | Dedicated Commons, Fatehold Annex, Innovative Commons, Interplanar Beacon, Deserted Beach, Great Hall of the Citadel, Mana Confluence, Seachrome Coast / Base Camp, Bloodstained Mire, Brokers Hideout, Cabaretti Courtyard, Windswept Heath, Wooded Foothills, Hallowed Fountain, Steam Vents, Spirebluff Canal, Glasspool Mimic // Glasspool Shore / Escape Tunnel, High Market, Myriad Landscape, Plaza of Harmony | — | — | — | off-limits |
## 5. Verdicts for artifacts with MV ≤ 2
| Card(s) | MV | open | verdict |
|---|---|---|---|
| Sol Ring, Arcane Signet, Everflowing Chalice, Pentad Prism, Astral Cornucopia, Fellwar Stone | 0–2 | S (Fellwar: 2 owned, Tazri 1) | IN: mana; Chalice/Cornucopia/Pentad charge grows with proliferate |
| Ornithopter of Paradise, Steelswarm Operator, Enthusiastic Mechanaut, **Etherium Sculptor**, Steel Overseer | 2 | 1 / S / S / 1 / S | IN: dorks; "Artifact spells you cast cost {1} less" ×2; "+1/+1 counter on each artifact creature" |
| **Lost Jitte**, **Improvised Arsenal**, Gavel of the Righteous | 1 / 2 / 2 | 1 / 1 / S | IN: land untaps / "can't block"; +X commander damage; double strike at 4 counters |
| The Echoverse Fulcrum | 2 | 2 | OUT: Cyclonic Rift's overload is one-sided; Fulcrum's wipe works only before station |
| Operator-held, OUT (§8) | 1–2 | 1 each | Basilisk Collar, Eye of Jace, Lavaspur Boots, Pearl Medallion, Sapphire Medallion, Sky Diamond, Sting, Bilbo's Sword, Sword of the Animist, Unlicensed Hearse, Wrecking Ball Arm, Zookeeper Mechan |
| Cut from the box | 0–2 | S | OUT: Hangarback Walker, Soul-Guide Lantern, Coretapper, Moxite Refinery (rows 1, 6, 5, 17) |
| Contagion Clasp, Stonecoil Serpent, Patchwork Automaton, Mishra's Bauble, Fountainport Bell, Lembas, Prophetic Prism, Mazemind Tome | 0–2 | 1 each | OUT: "{4}, {T}: Proliferate" per use; one growing body each; cantrips and filters |
| Elixir of Immortality, Multiclass Baldric, Demon's Horn, Sun Droplet, Gleaming Barrier, Wayfarer's Bauble, Idol of False Gods, Tablet of Compleation, The Key to the Vault, Torpor Orb | 1–2 | 1 each (Bauble: Imotekh 1) | OUT: no plan role; party; black; defender; slow basics; Spawns; oil; combat damage; Orb stops our ETBs |
| Unavailable / held elsewhere | 0–2 | 0 | Walking Ballista (Cabbage's combo kill), Peter Parker's Camera (not owned), Lightning Greaves (Meren), Talismans (Tam), Emerald Medallion, Idol of Oblivion, Syr Ginger, The Ooze (Cabbage), Myr Retriever, Thought Vessel (Imotekh), Stonework Packbeast (Tazri) |
## 6. Stop proof per role (the last full pass found no improving swap)
| role (count) | weakest kept | best remaining | why the kept card wins |
|---|---|---|---|
| ramp (13) | Astral Cornucopia | All-Fates Scroll, Zookeeper Mechan, Worn Powerstone, Solemn Simulacrum | "enters with X charge counters": Kilo/Surge proliferate (×2 with Tekuthal) grow it past 3 mana; Powerstone "enters tapped", colourless |
| draw (9) | Etched Oracle | Pull from Tomorrow, Tezzeret's Gambit, Scour for Scrap, Stroke of Genius | a 3/3 artifact body that draws 3 after one proliferate; Universal Surveillance is the kept X draw |
| removal (7) | Bovine Intervention | Rapid Hybridization, Abrade, Chains of Custody, Darksteel Mutation | {1}{W} instant, "artifact or creature" |
| counterspells (3) | Swan Song | Ionize, Negate, Flare of Denial, Return the Favor | {U} on the alpha turn against fogs and wipes; the others cost 3 or need RR |
| wipes (3) | Organic Extinction | Echoverse Fulcrum, Shatter the Sky, Hour of Reckoning | "Destroy all nonartifact creatures" with improvise; the others hit Inspirit or our board |
| protection (2) | Ripples of Potential | Shielded by Faith, Flare of Fortitude, Teyo LE | phases out (stops exile and bounce too) and proliferates; Shielded stops only destroy |
| engines (8) | Lost Jitte | Gandalf the White, Expansion Algorithm, Patrolling Peacemaker, Yoshimaru | a 1-MV spare that turns Inspirit's charge into land untaps or "can't block"; Gandalf is a {3}{W}{W} second doubler |
| payoffs (16) | Kappa Cannoneer | Titan Forge, Chandra SH, Sai, Chrome Host Seedshark, Saheeli JoA | improvise 4/4, ward 4, a counter and "can't be blocked" whenever an artifact enters (a Tarfire source) |
| lands (38) | Temple of Epiphany; utility: Inventors' Fair | Eroded Canyon; Mycosynth Gardens, Archway, Sink into Stupor | scry vs none; a finisher tutor vs a copy |
## 7. Gate (`gate-copy-2.txt`, `--format commander --owner 1 --source paper`)
```
PASS size 100 · singleton · legality · rules · identity RUW · arenaNames · locks 2
PASS ownership  all cards owned; paper collection imported 0 days ago
PASS lands 38 (Karsten wants 39 ±2) · curve avg MV 3.21 · wincons 14
FAIL plan  16/61 nonland cards interact (26%) — commander wants: general value   (known)
```
Near-ties left to the operator: Kappa Cannoneer vs Titan Forge / Sai / Chandra, Spark Hunter. Nothing is applied to `decks/paper/`.
## 8. Operator in-hand verdicts (ADDENDUM-2B incl. batches 2c–2g; every card)
| Card | role | IN/OUT | one-line reason (quote) |
|---|---|---|---|
| Abrade | removal | OUT | "3 damage to target creature" or "Destroy target artifact"; Bovine does either type |
| Everything Comes to Dust | wipe | OUT | "Exile ... all artifacts, and all enchantments": exiles Inspirit and our board |
| Spell Pierce | counter | OUT | "unless its controller pays {2}": soft |
| Requisition Raid | removal | OUT | sorcery spree; Gift, Chaos Warp and Rift hit any permanent at instant speed |
| Shatter the Sky | wipe | OUT | "destroy all creatures": a stationed Inspirit dies |
| No Admittance | removal | OUT | sorcery "3 damage" + "Empower Jace 1" |
| Kindred Judgment | wipe | OUT | "Destroy all creatures that aren't of the chosen type": Inspirit has no creature type |
| Consign to Memory | counter | OUT | "Counter target triggered ability or colorless spell": narrow |
| Unsummon | removal | OUT | "Return target creature to its owner's hand"; Rift does it to any nonland permanent |
| Chaos Warp | removal | **IN** | row 15 |
| Flesh Duplicate | payoff | OUT | "vanishing 3"; Phyrexian Metamorph is permanent and an artifact |
| Craterclaw Colossus | finisher | **IN** | row 16 |
| Super State | finisher | OUT | {7} "base power and toughness 9/9": 9 commander damage a hit; copies aren't combat damage |
| Lasting Tarfire | payoff | **IN** | row 17 |
| Etali, Primal Storm | finisher | OUT | value only "Whenever Etali attacks"; no haste |
| Sephiroth, Fallen Hero | finisher | OUT | "base power and toughness 7/5" needs Sephiroth to attack; no Depthshaker haste |
| Thorin, Mountain-king | payoff | OUT | free equips: 3 equipment, equip {R}/{1}/{3} |
| Winter, Team Player | payoff | OUT | "+1/+0" per noncreature spell |
| Spider-Man 2099 | payoff | OUT | "can't cast ... during your first, second, or third turns" |
| Warrior's Blades | payoff | OUT | {2}{R}{W} for 3 damage and "+2/+1" |
| Charge the Sanctum | payoff | OUT | "+2/+0" for one turn |
| Zookeeper Mechan | ramp | OUT | "{T}: Add {R}" only; ramp floor Astral Cornucopia wins (§6) |
| Wrecking Ball Arm | payoff | OUT | "base power and toughness 7/7": +2 on Inspirit |
| Treasure Keeper | payoff | OUT | value only "When this creature dies"; Inspirit 8+ makes it indestructible |
| Sting, Bilbo's Sword | payoff | OUT | hone counters, each "+1/+0"; Arsenal starts at ~10 |
| Improvised Arsenal | finisher | **IN** | row 4 |
| Interdimensional Web Watch | draw | OUT | "Spend this mana only to cast spells from exile" |
| Tablet of Discovery | ramp | OUT | {3} for "{T}: Add {R}" |
| Basilisk Collar | utility | OUT | "deathtouch and lifelink": no pinger |
| Resonating Lute | ramp | OUT | "only to cast instant and sorcery spells" |
| Eye of Jace | Jace | OUT | "seven or more cards in your graveyard": no mill |
| Murmuring Volume | ramp | OUT | "{2}, {T}, Discard a card: Draw a card" is card-neutral; loses even to All-Fates Scroll, itself cut for Nyx Lotus |
| Traxos, Scourge Eternal | station | OUT | 5/4, Kroog's untap job with 2 less power (redundancy) |
| Traxos, Academy Guardian | station | OUT | power 1. The three-Traxos package is redundancy |
| Sphinx of False Conclusions | draw | OUT | loots only "Whenever this creature attacks" |
| Denzilore Fatehold | payoff | OUT | "Whenever you scry or surveil": 2 Temples |
| Guiding Hydra | engine | OUT | Overseer and Iron Spider already spread counters to artifact creatures |
| Proctor of Potential | draw | OUT | surveil per creature ETB; no payoff |
| Flickering Hound | utility | OUT | "exile ... then return": the card loses its counters |
| Variable Chaser // Arc of Fortune | draw | OUT | "Each player may discard their hand and draw seven" |
| Geist of Saint Thalia | ramp | OUT | "Noncreature spells ... cost {1} less"; Sculptor/Mechanaut cover every artifact |
| Frantic Search | draw | OUT | "Draw two cards, then discard two cards" |
| Seize the Spoils | draw | OUT | discard, "Draw two cards and create a Treasure": +0 cards |
| Winternight Stories | draw | OUT | "Draw three ... discard two": Fact or Fiction (instant, 5 cards) took the slot |
| Ember Island Production | payoff | OUT | {5} sorcery copy; Three Steps Ahead copies at instant speed |
| Teyo, the Shieldmage | walker | OUT | "You have hexproof": the player, not the board |
| Mu Yanling, Sky Dancer | walker | OUT | "−3: ... 4/4 ... Bird": non-artifact body |
| Kasmina, Enigmatic Mentor | walker | OUT | tax + "−2: ... 2/2 ... Wizard" |
| Chandra, Fire Artisan | walker | OUT | "+1: Exile the top card ... play it this turn"; RR |
| Chandra, Spark Hunter | walker | OUT | near-tie at the payoff floor (§6); Cyberdrive took her round-2 slot |
| Dovin, Hand of Control | walker | OUT | opponents' tax and a one-target fog |
| Nahiri, Storm of Stone | walker | OUT | "first strike" adds nothing for indestructible tramplers |
| Daretti, Scrap Savant | walker | OUT | "−2: Sacrifice an artifact ... return target artifact card": low-value recursion here |
| Saheeli, Jewel of Avishkar | payoff | OUT | Thopter per noncreature spell; 4-MV non-artifact; ties the payoff floor |
| Jace, Reality Sculptor | walker | OUT | "0: Exile all but the bottom card" at 25 Jace loyalty: a second plan |
| Way of the Cryomancer | Jace | OUT | "[−3]: Draw a card" costs 3 loyalty per card |
| Way of the Pyromancer | Jace | OUT | "[+1]: Add {R}" on 1 walker + the token; non-artifact |
| Way of the Warlord | Jace | OUT | "[−4]: ... 2 damage" |
| Way of the Mentor | Jace | OUT | "Whenever you gain life": no life gain here |
| Bender's Waterskin | ramp | OUT | {3} for one mana untapping each turn |
| The Echoverse Fulcrum | wipe | OUT | Cyclonic Rift took the slot (§5) |
| Inspiring Vantage | land | **IN** | row 26 |
| Airbender Ascension | utility | OUT | blink at 4 quest counters: the card loses its counters |
| Unlicensed Hearse | utility | OUT | "{T}: Exile up to two target cards from a single graveyard"; body needs "Crew 2" |
| Pyre Rhymer // Molten Tide | ramp | OUT | "whenever you tap a Mountain": 2 Mountains |
| Yoshimaru, Beloved Companion | engine | OUT | "that many plus one +1/+1 counters": creature +1/+1 counters only; 2/2 non-artifact |
| Pia, Determined Rebuilder | payoff | OUT | "{5}{R}: ... +X/+0" on one creature; Arsenal does it for {R} |
| Twinned Vision | draw | OUT | "Draw a card" |
| Generous Revival | recursion | OUT | MV ≤ 3 creature back; indestructible artifacts rarely die |
| Team Avatar | payoff | OUT | "attacks alone": conflicts with the alpha |
| Balefire Liege | payoff | OUT | "Other red/white creatures ... +1/+1": our artifact creatures are colourless |
| Flare of Fortitude | protection | OUT | "hexproof and indestructible" for {2}{W}{W}; Boros Charm does it for {R}{W} |
| Hour of Reckoning | wipe | OUT | "Destroy all nontoken creatures": kills a stationed Inspirit |
| Lorehold Charm | utility | OUT | artifact edict / MV ≤ 2 rebuy / "+1/+1 and trample"; Boros Charm's modes win |
| Inspired Skypainter // Maestro's Gift | payoff | OUT | creature copy for {3}{U}{R}; Three Steps is cheaper and instant |
| Rapturous Moment | draw | OUT | {4}{U}{R}: draw 3, discard 2, add 5: net −1 mana, +1 card |
| Naktamun Lorespinner // Wheel of Fortune | draw | OUT | symmetric wheel |
| Embrace the Unknown | draw | OUT | 2 cards "Until the end of your next turn"; retrace eats lands |
| Blade Historian | finisher | **IN** | row 21 |
| Generous Gift | removal | **IN** | row 6 |
| Boros Charm | protection | **IN** | row 20 |
| Lavaspur Boots | utility | OUT | "haste and ward {1}": three cards already give haste |
| Fatehold Charm | utility | OUT | small modes: draw + "Empower Jace 2" / bounce / "+1/+2" |
| Teyo, Lightshield Expert | protection | OUT | "target permanent ... gains hexproof until end of turn": one target |
| Cyberdrive Awakener | finisher | **IN** | row 19 |
| Karn, the Great Creator | walker | OUT | "+1: ... up to one target noncreature artifact becomes an artifact creature": one per turn; "−2" needs cards from outside the game or face-up in exile |
| Panharmonicon | engine | **IN** | row 5 |
| Sai, Master Thopterist | payoff | OUT | "Whenever you cast an artifact spell, create a 1/1 ... Thopter": near-tie with Kappa; non-artifact |
| Efficient Construction | payoff | OUT | Sai's trigger on a {3}{U} enchantment |
| Chrome Host Seedshark | payoff | OUT | "incubate X" per noncreature spell; each Incubator needs "{2}: Transform"; non-artifact |
| Urza, Lord High Artificer | ramp / payoff | **IN** | row 23 |
| Dawnsire, Sunstar Dreadnought | finisher | OUT | "It's an artifact creature at 20+": 20 station counters on top of Inspirit's 8 |
| Sami, Wildcat Captain | ramp | OUT | "Spells you cast have affinity for artifacts" from a {4}{R}{W} non-artifact; Sculptor + Mechanaut + Urza already cut costs |
| Sword of the Animist | ramp | OUT | ramps only "Whenever equipped creature attacks"; equip {2} |
| Etherium Sculptor | ramp | **IN** | row 22 |
| Solemn Simulacrum | ramp | OUT | {4} for one tapped basic; Inspirit makes it indestructible, so the death-draw rarely fires |
| Sapphire Medallion | ramp | OUT | "Blue spells ... cost {1} less": most artifacts are colourless |
| Sky Diamond | ramp | OUT | "enters tapped", U only |
| Insight Engine | draw | **IN** | row 24 |
| Inspiring Statuary | ramp | OUT | improvise for "Nonartifact spells" only (~25) |
| Repurposing Bay | utility | OUT | "mana value equal to 1 plus" the sacrificed artifact: the 6→7 step costs a finisher to get a finisher |
| Bident of Thassa | draw | OUT | draws on combat damage, mostly on the turn that ends the game |
| Personal Tutor | utility | OUT | "Search ... for a sorcery card": few sorceries matter here |
| Scour for Scrap | draw | OUT | tutor and/or regrow an artifact for {3}{U}; Inventors' Fair already tutors |
| Cyclonic Rift | wipe / removal | **IN** | row 14 |
| Counterspell | counter | **IN** | row 10 (2 owned, Tam 1) |
| Flare of Denial | counter | OUT | {1}{U}{U}, or sacrifice a blue creature: the alpha turn leaves 1 mana |
| Negate | counter | OUT | "Counter target noncreature spell": Counterspell does more at the same cost |
| Sink into Stupor // Soporific Springs | land / removal | OUT | §4 |
| Ghostly Flicker | protection | OUT | "Exile two target artifacts, creatures, and/or lands ... then return": counters reset |
| Alms Collector | utility | OUT | draw hoser; non-artifact |
| The Seriema | utility | OUT | ETB "search ... for a legendary creature card"; WW; station 7 competes with Inspirit |
| Stock Up | draw | OUT | "Put two of them into your hand": FoF is instant and similar |
| Fact or Fiction | draw | **IN** | row 18 |
| Coastal Piracy | draw | OUT | draws on combat damage, like Bident |
| Inventors' Fair | land | **IN** | row 26 |
| Archway of Innovation | land | OUT | §4 |
| Uthros, Titanic Godcore | land | OUT | §4 |
| Ornithopter of Paradise | ramp | **IN** | row 11 |
| Reverse Engineer | draw | **IN** | row 25b |
| Windfall | draw | OUT | "Each player discards their hand, then draws": refills opponents |
| Pompous Battlemage // Improvised Act | draw | OUT | {R} 1/1 prowess; Act: "You may discard a card. If you do, draw a card" |
| Argentum Masticore | removal | OUT | "sacrifice this creature unless you discard a card" each upkeep (indestructible doesn't stop it) |
| Hindering Light | counter | OUT | "Counter target spell that targets you or a permanent you control": wipes and fogs don't target |
| Strix Serenade | counter | OUT | "Counter target artifact, creature, or planeswalker spell": not the wipes/fogs that stop the alpha |
| Nyx Lotus | ramp | **IN** | row 25c: devotion counted from the list; "enters tapped" |
| Pearl Medallion | ramp | OUT | "White spells you cast cost {1} less": white is the lightest colour (12 pips) |
| All That Glitters | finisher | **IN** | row 25d |
| Gandalf the White | engine | OUT | flash for artifacts and a second enter/leave doubler, but {3}{W}{W} non-artifact; Panharmonicon covers the key ETBs |
| Glaring Fleshraker | payoff | OUT | {2}{C}: 4 colourless sources; its Spawns aren't artifacts |
| Saheeli, Consul of Oversight | payoff | OUT | "Whenever you scry or surveil": 2 Temples |
| Getaway Glamer | removal | OUT | blink resets counters; "Destroy target creature if no other creature has greater power" |
| Essence Capture | counter | OUT | "Counter target creature spell": narrow |
| Return the Favor | counter | OUT | {R}{R} copy/redirect: no answer to wipes or fogs |
| Breeches, the Blastmaker | payoff | OUT | coin flip after "you may sacrifice an artifact" |
| Ionize | counter | OUT | {1}{U}{R} hard counter: the alpha turn leaves {U} for Swan Song, not 3 |
| One Last Job | recursion | OUT | spree reanimation; indestructible artifacts rarely die |
| Swords to Plowshares | removal | **IN** | kept from the sleeved list: {W} "Exile target creature" (2f: operator confirms it, with Fact or Fiction, Three Steps Ahead and Final Showdown, all IN) |
- **Walkers:** only Tezzeret, Cruel Captain is in; no OUT walker adds an artifact or alpha damage. **Jace tokens:** 12 non-artifact makers held; best output "[−3]: Draw a card": dilution.
## 9. Self-check: every other open pool card with MV ≤ 3 (pool.md; all OUT unless marked)
- **Kept, already IN:** Dispatch, Iron Spider, Stark Upgrade, Kilo, Apogee Mind, Surge Conductor, Thirst for Knowledge, Uthros Research Craft.
- **Ramp (lose to Astral Cornucopia):** Azorius Locket, Boros Locket (two colours, {3}), Commander's Sphere (one mana for {3}), Firdoch Core, Potioner's Trove, Pristine Talisman ({C}), Elementalist's Palette (charge only from {X} spells), Wickersmith's Tools (-1/-1 counters), Worn Powerstone ("enters tapped", {C}{C}), Palladium Myr ({C}{C}, summoning sick), Burnished Hart ("{3}, Sacrifice": 6 mana for 2 tapped basics), Druidic Satchel, Lotus Ring (equip {3}), Worldwalker Helm (Maps; few token makers left).
- **Counterspells (Counterspell/Swan Song/Three Steps kept):** Syncopate, Phantom Interference, Concerted Defense ("unless ... pays": soft), Countersculpt ("behold a Jace or pay {1}"), Bar the Gate (creature/planeswalker only), You Find the Villains' Lair ({1}{U}{U}), Aven Interrupter (the spell is plotted and comes back free).
- **Removal (floor Bovine):** Journey to Nowhere (creatures, undoable), Darksteel Mutation (leaves a 0/1 body), Chains of Custody (sorcery-speed aura), Curse of the Swine (blockers return as 2/2 Boars), Entrancing Melody, Shifting Grift, Take for a Ride (steal effects), Explosive Derailment, Cathartic Pyre, Slick Sequence, Skewer the Critics, Skullcrack (damage-limited), Essence Burn ("black or green" only), Flame of Anor (two modes only with a Wizard), Fierce Retribution, Ride Down, Practiced Tactics, Take the Fall, Caught in the Crossfire (combat-, party- or outlaw-conditional), Fling (sacrifices a creature), Metamorphic Blast, Jailbreak Scheme.
- **Draw (floor Etched Oracle):** Stroke of Genius, Commander's Insight (Universal Surveillance is the improvise X draw), Cathartic Reunion, Highway Robbery, Burning Curiosity (discard or expiring cards), Secret Rendezvous (an opponent draws 3), Seize the Secrets (crime-gated), Cruel Calculations (needs milled cards).
- **Protection (Boros Charm, Ripples kept):** Shielded by Faith (Inspirit indestructible, but no exile/bounce cover), Take Up the Shield (one target), Rustler Rampage (Boros Charm also gives double strike), Adept Watershaper (Inspirit already gives indestructible), Flickering Ward, Ghostly Prison (defence, no plan role).
- **Auras / equipment (Glitters, Arsenal, Gavel, Jitte kept):** Spirit Mantle, Sentinel's Eyes, Raffine's Guidance, Martial Impetus, Redemption Arc, Gift of Immortality, Demonic Ruckus, Eidolon of Countless Battles, Loxodon Warhammer (+3/+0 for equip {3}), Bitterthorn, Nissa's Animus; engines with 5 auras/equipment to trigger them: Sram, Senior Edificer, Kor Spiritdancer, Pearl-Ear, Imperial Advisor, Starfield Mystic, Transcendent Envoy.
- **Jace-token makers (dilution):** Academic Ascent, Campus Crier, Keeper of the Quiet Hour, Mindseeker Oculus, Repurposed Enforcer; Loyal Tutor (one walker, to the top).
- **Off-plan creatures and engines (non-artifact or no alpha/counter role):** Archpriest of Iona, Nadaar, Selfless Paladin, Hama Pashar, Ruin Seeker, Yuan-Ti Malison (party/dungeon), Lilah, Undefeated Slickshot, Slickshot Lockpicker, Slickshot Show-Off, Slickshot Vault-Buster, Nimble Brigand, Deadeye Duelist, Sterling Keykeeper, Deepmuck Desperado, Magda, the Hoardmaster (crime-gated Treasures), Treasure Nabber, Magebane Lizard (symmetric), Geralf, the Fleshwright (Zombies, not artifacts), Brimstone Roundup, Ferocification, Tomik, Orzhov Lawmage, Nils, Discipline Enforcer (counters opponents' creatures too), Fortune, Loyal Steed, Dawnbringer Cleric, Sygg, Wanderwine Wisdom, Eiganjo Dynastorian // Replenish, Emeritus of Truce // Swords to Plowshares (prepared only if an opponent has more creatures), Adaptive Automaton (~6 Constructs), Barkform Harvester (body only), Identity Echo, Another Round (blinks reset counters), Bandit's Haul.
- **Registered after 2g, MV ≤ 3:** Cloudshift (OUT: "Exile target creature you control, then return": the card loses its counters), Full Bore (OUT: "+3/+2 until end of turn" on one creature; trample and haste only "if that creature was cast for its warp cost": Bygone Colossus alone), Split Up (OUT: "Destroy all tapped creatures" or "Destroy all untapped creatures" hits one tap state of opponents' creatures; Organic Extinction takes every nonartifact one).
- **Coverage:** every ADDENDUM-2B name and every open MV ≤ 3 card has a row (`coverage.py`); the 70 open cards with MV ≥ 4 it still lists go to the screen (`SCREEN-BRIEF-2.md`).
