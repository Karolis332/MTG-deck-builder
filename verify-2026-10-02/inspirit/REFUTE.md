# Inspirit refute (2026-10-02, fresh context, Opus)

**Verdict: NOT CONVERGED.** 13 of the 14 swaps hold. The Walking Ballista transfer fails the donor-fairness check, and 4 improving swaps were missed. Five errors in the report's text or maths don't change any swap but need fixing (§3). All oracle text below was re-pulled from the DB through `q.py`.

## 1. Swap verdicts
| # | IN / OUT | Verdict | Notes (DB text) |
|---|---|---|---|
| 1 | Bygone Colossus / Hangarback Walker | KEEP | "Warp {3}", 9/9. Station legally taps it on the turn it arrives (§2). Bonus: Lux Artillery gives "sunburst" to artifact creature spells, so a 3-colour warp enters with 3 counters → 12/12 → 12 station counters. After the first warp, recasting from exile costs **{9}**: warp works only from hand (§2). Treat it as one cheap use. |
| 2 | Traxos / Depthshaker Titan | KEEP | "Traxos enters tapped and doesn't untap during your untap step. Whenever you cast a historic spell, untap Traxos." It can't station on the turn it's cast unless another historic spell follows. The list has **43** historic nonland spells (39 artifacts plus legends), not "~45 artifacts plus legends". |
| 3 | Walking Ballista / Golem Foundry | **REJECT (source)** | The card is strong here. The Cabbage transfer is not fair (§6). Take Peter Parker's Camera in this slot instead (missed swap #1). |
| 4 | Contagion Clasp / Thrummingbird | KEEP | "{4}, {T}: Proliferate." Note: the ETB "put a -1/-1 counter on target creature" is mandatory. With no opposing creature, it must hit one of yours. |
| 5 | Expansion Algorithm / Coretapper | KEEP | **Maths error:** "Reactor 14 plus X=3 equals 20" is true only with Tekuthal ("proliferate twice instead"). Without Tekuthal it's 14 + 3 = 17, and 20 needs X=6 (8 mana). |
| 6 | Rapid Hybridization / Soul-Guide Lantern | KEEP | Quote correct. |
| 7 | Sheltered by Ghosts / Tractor Beam | KEEP | It is "Enchant creature you control", so Inspirit is a legal host only at 8+. If Moxite or Resourceful Defense pulls Inspirit below 8, the Aura falls off and the exiled card returns. |
| 8 | Bovine Intervention / Lonely Sandbar | KEEP | Quote correct. |
| 9 | Three Steps Ahead / Wake the Past | KEEP | The copy mode on Lux Artillery really does double the 10 damage: two triggers. |
| 10 | Bender's Waterskin / Uthros Psionicist | KEEP | Quote correct. |
| 11 | Ornithopter of Paradise / Cloud Key | KEEP | **Misquote:** "sunburst makes it a 3/5" is wrong. A {2} cost can spend at most 2 colours, so it maxes at **2/4** (1/3 with Mechanaut). |
| 12 | Island / Glittering Massif | KEEP | It "enters tapped" and adds only R/W, which are oversupplied. |
| 13 | Island / Mountain | KEEP | Red pips drop to 8. |
| 14 | (owed cut) Secluded Steppe | KEEP | "enters tapped", W only. |

## 2. Rulings
- **Station works with a creature cast this turn. YES.** Summoning sickness covers only "A creature's activated ability with the tap symbol or the untap symbol in its activation cost" and attacking (CR 302.6). Station is the Spacecraft's ability: "Tap another untapped creature you control: Put a number of charge counters on this permanent equal to the tapped creature's power. Activate only as a sorcery." (CR 702.184a) The release notes rule the same way for a sister cost (Gene Pollinator): "You can tap any untapped permanent you control, including a creature you haven't controlled continuously since the beginning of your most recent turn, to pay the cost". The release notes also say: "it doesn't matter how long it's been a creature, just how long it's been on the battlefield". So an Inspirit already in play can attack on the turn it reaches 8. Sources: https://media.wizards.com/2025/downloads/MagicCompRules%2020250919.txt and https://magic.wizards.com/en/news/feature/edge-of-eternities-release-notes
- **Colossus and Traxos both work.** Colossus warp-taps for 9 (12 with Lux Artillery). Traxos taps whenever a historic spell has untapped it, and its trigger "resolves before the spell that caused it to trigger" (https://api.scryfall.com/cards/8566e91a-5f2c-4854-aeb3-68b3c4344582/rulings). Scryfall lists no rulings for Inspirit or Colossus: /cards/46900ec7-…/rulings and /cards/4bb8f2ef-…/rulings are empty.
- **Warp recast** (CR 702.185a): "You may cast this card **from your hand** by paying [cost]… Its owner may cast this card after the current turn has ended for as long as it remains exiled". So a recast from exile costs the full mana cost.
- **"Until end of turn" lasts through the end step** (CR 514.2): such effects end in cleanup. This matters for Saheeli's −2 copy in §7(d).
- **Intervening "if"** (CR 603.4): Lux Artillery's 30-counter condition is checked again on resolution, and on copies too.

## 3. Maths
- **Darksteel Reactor alone.** Inspirit's "two charge counters" plus the Reactor's own upkeep counter make **+3 per turn**. Cast in main phase 1, it has 2 after the first combat and reaches 20 on the 7th combat. Kilo stationing adds proliferate: +1 per tap, or +2 with Tekuthal. Deepglow Skate takes 10 to 20. Algorithm: see #5 above.
- **Gavel.** A 5/5 with 4 counters is a 9/9 double striker = **18, which is below the 21 commander-damage threshold**. A one-hit commander kill needs **6 Gavel counters** (11/11 × 2 = 22). Gavel gains +1 each combat, +2 when Inspirit targets it, and +1 per proliferate. So 6 counters is 2 combats after it lands. Inspirit's +2 then can't go on the Reactor that turn.
- **Lux Artillery.** "10 damage to each opponent" per end step means 4 end steps from 40 life. A second copy (Metamorph, Three Steps, or Saheeli's −2) halves that to 2. Station counters on Inspirit count toward the 30. Colossus (9–12) plus Traxos (7 per tap) reach 30 fast. Loyalty counters on walkers do NOT count: the text says "artifacts and creatures".
- **Inspirit at 8+ grants "Other artifacts … hexproof and indestructible".** Inspirit itself and nonartifact permanents get nothing.

## 4. Plan and synergy
- **One plan plus a backup holds.** Primary: counters to the Reactor at 20 or Lux Artillery at 30. Backup: an 8+ Inspirit with Gavel, Titan Forge Golems, and Traxos/Colossus beats. Shape: T1–3 rocks / T3 Inspirit or Kilo / T4 Colossus or Traxos station.
- **Cards serving neither plan:** Chain Reaction and Fumigate are anti-synergy: before 8 they kill your own artifact creatures; after 8 they kill Inspirit itself plus Tekuthal, Jhoira, Emry and Skate. Emry is marginal recursion (1/2 body).
- **`metrics.py` is counting noise.** Links come from tag membership, not card-to-card interaction. Every artifact provides `A`, and `A` links to every card that "needs A", artifact lands included. Result: Dispatch 46, Thirst for Knowledge 46, Organic Extinction 46, Universal Surveillance 46 and Sol Ring 24. Dispatch's metalcraft is always on here, so its real link count is ~1. `CR` links every creature to every station card regardless of power (Steel Overseer, power 1, counts in full). `HOLD` links every counter holder to every proliferate card, even where the counters do nothing. So the 45–47 plan-card median is inflated roughly 2×. Strict counts for artifact-typed cards run at ~40–60% of the script's.
- **My strict count for the 10 lowest** (direct interaction only):

| Card | Strict links | Basis |
|---|---|---|
| Swords | 0 | none |
| Rapid Hybridization | 0 | none |
| Bovine Intervention | 0 | none |
| Swan Song | 0 | none |
| Pull from Tomorrow | 0 | none |
| Sheltered by Ghosts | 1 | Inspirit at 8+ as an indestructible host |
| Chain Reaction | +1 / −5 | kills Inspirit at ≥5 creatures, plus Tekuthal, Jhoira, Emry, Skate |
| Fumigate | +1 / −5 | same |
| Resourceful Defense | ~15 | Inspirit, Reactor, Lux Artillery, Gavel, Titan Forge, Lux Cannon, Elevator, Autogenerator, Cornucopia, Oracle, Crawler, Mindless, Kappa, Thunderhulk, Peacemaker |
| Expansion Algorithm | ~17 | the same holders plus Chalice, Pentad, Tezzeret, Tekuthal |

  The script's 21–22 for the last two is close. Its 0s for interaction are correct, and §2 exempts those cards anyway.
- **Wrong stop-proof readings:** **Peter Parker's Camera** was rejected because it "stops at three film counters". Proliferate adds film counters ("a counter of each kind already there"), so it refuels. **Boros Charm** was rejected as repeating "Inspirit's own hexproof and indestructible". Inspirit grants only *other* artifacts protection, so the Charm is the one card that makes Inspirit itself indestructible. Even so, it can't be placed: it was not physically found on 09-28 (Session Log). Locate it first.

## 5. Mana
- **Counts.** 37 lands, 10 entering tapped: Monastery, 3 Temples, Farmland, 3 Bridges, Wilds, and Radiant Summit (conditional).
- **Sources vs pips.** Nominal sources are U 23 / R 21 / W 21. Honest counts are ~20/18/18, because Wilds yields one colour and Orchard, Spire and Mycosynth are conditional or filters. Pips are U 28 / R 8 / W 15. Adequate.
- **No better land exists.** The free untapped duals are all taken: Hallowed Fountain, Steam Vents, Spirebluff and Vantage are [Z]; Deserted Beach is [T]. Every open [-] land is either tapped (Lonely Arroyo, Eroded Canyon, Abraded Bluffs, Mirage Mesa) or a colourless/filter land (Conduit Pylons, Hidden Grotto, Study Hall, Opal Palace, Rumble Arena). The land stop proof holds.
- **39 → 37 accepted.** The deck has 14 rocks (6 at MV ≤2), plus improvise/affinity (Kappa, Organic, Surveillance, Thought Monitor) and Mechanaut.
- **After my swaps 2–3:** R pips fall to 6 and W rise to 16 (Final Showdown needs WWW). Change one Mountain → Plains. Clifftop is still enabled by Sacred Foundry, Plains, Farmland and the last Mountain.

## 6. Allocation
- **Walking Ballista from Cabbage: unfair, REJECT.** The Cabbage report §1 says: the infinite (Trudge Garden + Teething Wurmlet + Peregrin Took + Academy Manufactor + Jaheira) produces unbounded mana, "Walking Ballista or Pest Infestation then kills the table". Ballista is the instant-speed outlet and also one of Cabbage's 7 interaction pieces. Stonecoil ("Reach, trample, protection from multicolored / This creature enters with X +1/+1 counters on it") turns infinite mana into one sorcery-speed attacker: at most one opponent per combat, and blockable by chumps. Keep Ballista in Cabbage.
- **Every other IN is open [-] x1**, and none appears in any `decks/paper/decks/*.txt`. I grepped Camera, Final Showdown, Fulcrum and Mu Yanling.
- **Wipes vs a stationed Inspirit.** Fumigate and Chain Reaction are wrong for this deck (missed swaps #2 and #3). Organic Extinction ("Destroy all nonartifact creatures") is right; keep it.

## 7. Walkers / Ways / Reality Fracture
**(a) Open walkers.** Proliferate and Tekuthal do add loyalty, but no open walker is a plan card. Inspirit doesn't protect walkers, and loyalty doesn't count for Lux Artillery or Moxite.

| Walker | Key text | Verdict |
|---|---|---|
| Chandra, Spark Hunter | "choose up to one target Vehicle". Inspirit, Elevator and Research Craft are Spacecraft, not Vehicles. "0: Create a 3/2 colorless Vehicle artifact token with crew 1". The −7 emblem ("Whenever an artifact you control enters … 3 damage") is real with drones and gnomes, but needs 7 loyalty. | REJECT (ties Pinnacle Emissary at best) |
| Dovin, Hand of Control | Tax, plus "−1: … prevent all damage … dealt to and dealt by target permanent" | REJECT |
| Mu Yanling, Sky Dancer | Loyalty 2. "−3: Create a 4/4 … Bird" needs a proliferate first. | REJECT here; Tam backfill in (d) |
| Teyo, the Shieldmage | "You have hexproof. −2: … 0/3 … Wall" | REJECT |
| Kasmina | "−2: Create a 2/2 … Wizard … Draw a card, then discard a card" | REJECT |
| Nahiri, Storm of Stone | First strike on your turn, equip {1} less, "−X: … target tapped creature" | REJECT |
| Jaya | "+1" damage only for red sources (Alibou, Chain Reaction) | REJECT |
| The Wanderer | "Prevent all noncombat damage … to you and other permanents you control" would make Chain Reaction one-sided. "−2: Exile … power 4 or greater" | REJECT (Fulcrum fixes the wipe problem in one card) |
| Chandra, Fire Artisan | "+1: Exile the top card … You may play it this turn", RR | REJECT (ties the draw slot; needs defending) |
| Sarkhan, the Dragonspeaker | "+1: … becomes a … 4/4 … creature" can station 4. "−3: … 4 damage" | REJECT (Traxos and Colossus station more) |

**(b) The Jace-empower package as a unit: REJECT.**
- **How it works.** The token is "[−1]: Surveil 1" / "[−3]: Draw a card". It needs 1–2 empower cards on top of the 11 proliferate sources already in the deck.
- **Why not as a package.** Each further empower card (Mindseeker Oculus 4, Protege's Awakening 6, Academic Ascent, Fatehold Charm, No Admittance, Violent Echoes, Repurposed Enforcer 3/2, Campus Crier) is a weaker version of a slot that's already filled. Taken together they dilute the artifact/counter plan. Countersculpt ({U}{U} + {1}, "Counter target spell") only ties Three Steps Ahead.
- **Single-card exception: Way of the Cryomancer** (missed swap #4). It's "empower Jace 5" for 3 mana and is legendary, so it's historic (Traxos, Jhoira). It gives every walker, Tezzeret included, "[−3]: When you next cast an instant or sorcery spell this turn, copy that spell". Copying Expansion Algorithm at X=3 makes 6 proliferates, 12 with Tekuthal. About 20 strict links.
- **Keeper of the Quiet Hour** ({3} 3/2 artifact, "empower Jace 2") ties Mindless Automaton. No swap.

**(c) Other open FRA cards.** **The Echoverse Fulcrum: IN** (missed swap #3). The rest are REJECT:
- Teyo, Lightshield Expert ("target permanent you control gains hexproof until end of turn"; ties Resourceful Defense); Plan for All Outcomes (owner picks "top or bottom": weak removal); Hexhaven Battalion (6 mana, 3×2/2; Colossus/Traxos station better); Flickering Hound (blink resets counters).
- Yuriko (double strike only when attacking "alone"); Kindred Judgment (destroys Inspirit); Essence Burn (black/green only); Cruel Calculations (only Emry mills); Murmuring Volume (ties All-Fates Scroll).
- Eye of Jace, Loyal Tutor (Tezzeret the only target), Identity Echo (random), Sphinx of False Conclusions (0 counter links), Variable Chaser (wheel), Proctor of Potential, Tomik.

**(d) Tam ↔ Inspirit trade.**
- **Tezzeret, Master of the Bridge is {4}{U}{B}**: black is outside Inspirit's UWR identity, so it's illegal there.
- **Saheeli, Sublime Artificer ({1}{U/R}{U/R}) is legal** and stronger in Inspirit: "Whenever you cast a noncreature spell, create a 1/1 colorless Servo artifact creature token" fires on 37 noncreature spells. Servos are protected Overseer/Iron Spider counter holders, Kappa triggers and station fodder. Its "−2: Target artifact you control becomes a copy of another target artifact …" can turn a Servo into Lux Artillery in main phase 2. Because of CR 514.2 the copy survives the end step, so 2 triggers deal 20 to each opponent.
- **Tam's side.** Tam would take Mu Yanling, Sky Dancer [-]. Yanling is a new type for Tam, and Tam's ability counts "planeswalker types among planeswalkers you control", so the type count stays even. Its "+2" activation feeds Way of the Paradox → Way of the Mentor every turn; Saheeli has only a −2. Tam stays whole, but loses Servo chump blockers.
- **Verdict: OPTIONAL.** Saheeli IN for Pinnacle Emissary in Inspirit; Mu Yanling to Tam. Tam is top priority, so this needs the operator's yes. Not counted in the missed-swap total below.

## 8. Missed swaps (ranked)
| # | IN | OUT | Why (quoted) |
|---|---|---|---|
| 1 | Peter Parker's Camera [-] | Walking Ballista (Golem Foundry's slot; Ballista stays in Cabbage) | "{2}, {T}, Remove a film counter from this artifact: Copy target activated or triggered ability you control." Proliferate refills it. Copy targets: Lux Artillery's trigger (+10 to each opponent), Titan Forge's "{T}, Remove three charge counters … Create a 9/9" (a free Golem), Lux Cannon's "Destroy target permanent", Skate's doubling, Inspirit's combat trigger, a Tezzeret loyalty ability. MV 1, so Tezzeret's −3 can tutor it. Its cast/ETB triggers Surge, Kappa, Emissary, Jhoira and Research Craft. |
| 2 | Final Showdown [-] | Fumigate | Instant. "+ {1} — Choose a creature you control. It gains indestructible until end of turn. + {3}{W}{W} — Destroy all creatures." For {4}{W}{W}{W} it is one-sided: a stationed Inspirit survives, and Inspirit keeps the other artifacts indestructible. It doubles as 2-mana instant protection for Inspirit. Never add the "lose all abilities" mode: it would strip Inspirit's 8+ grant. |
| 3 | The Echoverse Fulcrum [-] | Chain Reaction | "When The Echoverse Fulcrum enters, draw a card, then discard a card. {5}, {T}, Exile The Echoverse Fulcrum: Destroy all creatures." A 2-MV legendary artifact: historic, a Surge/Kappa/Emissary/Jhoira trigger, and protected at 8+. Unconditional, whereas Chain Reaction's X is "the number of creatures", and it costs no RR. Inspirit still dies at 8+, so hold it for pre-station or pair it with Ripples. |
| 4 | Way of the Cryomancer [-] | Mindless Automaton | "empower Jace 5", so it draws immediately with "[−3]: Draw a card". The 11 proliferate sources refill it. It also gives the copy line ("copy that spell") for Expansion Algorithm and Pull. It costs 1 less than the 4-MV 2/2 that "Remove two +1/+1 counters … Draw a card". |
| — | Ties (no swap): Keeper of the Quiet Hour, Mishra's Bauble vs Experimental Augury, Firdoch Core vs Ornithopter, Cityscape Leveler vs Angel of the Ruins. Boros Charm would be IN for Resourceful Defense if found. | | |

**Mana follow-up:** after #2 and #3, change one Mountain → Plains.

INSPIRIT: NOT CONVERGED (4)
