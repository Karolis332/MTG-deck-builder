# Inspirit, Flagship Vessel: paper build report (2026-10-02)

Proposed list: `inspirit-proposed.txt`, 100 cards with the commander first. The current list was 101 cards, so the owed cut is Secluded Steppe.
Metrics come from `metrics.py`, a read-only DB script (`py metrics.py <list> --links --cands`). The gate copy is `gate-copy.txt`.

## 1. Plan and win lines
- **Primary: charge-and-proliferate.** Pile counters on protected artifacts. Inspirit's "1+ | At the beginning of combat on your turn, put your choice of a +1/+1 counter or two charge counters on up to one other target artifact" feeds Darksteel Reactor ("When this artifact has twenty or more charge counters on it, you win the game"). Lux Artillery ("if there are thirty or more counters among artifacts and creatures you control, this artifact deals 10 damage to each opponent") also counts Inspirit's own station counters.
- **Accelerators.** Kilo ("Whenever Kilo becomes tapped, proliferate", so stationing with Kilo proliferates), Surge Conductor, Contagion Clasp, Expansion Algorithm ("Proliferate X times"), and Tekuthal ("proliferate twice instead"). Deepglow Skate ("double the number of each kind of counter") takes Reactor from 10 to 20. Moxite Refinery ("Remove X counters ... Put X charge counters on target artifact") and Resourceful Defense ("Move any number of counters") funnel counters onto Reactor.
- **Backup: artifact-creature combat.** At 8+, Inspirit is a 5/5 flyer, and Gavel ("four or more counters ... double strike") makes it a 9/9 double striker: 18 commander damage per hit. Titan Forge makes 9/9 Golems, Kappa "can't be blocked this turn", and Alibou deals X damage, Ballista pings.
- **T1–3 setup:** a 2-drop rock (Sol Ring, Signet, Chalice, Pentad, Ornithopter, Steelswarm) or Steel Overseer, then Inspirit or Kilo on T3 ({U}{R}{W}).
- **T4–6 engine:** station Inspirit to 8+. Bygone Colossus "Warp {3}" (9/9) or Traxos (7/7) does it in one tap, after which "Other artifacts you control have hexproof and indestructible". Then deploy Reactor, Lux Artillery, Surge Conductor and Tekuthal.
- **Close (T7+):** Reactor at 20 through Expansion Algorithm, Skate or Moxite. Otherwise Lux Artillery deals 10 to each opponent per end step, or Inspirit swings with Gavel.
- **Wipe pattern:** "Other artifacts" excludes Inspirit, so Fumigate and Chain Reaction kill a stationed Inspirit (DB: 5/5). Cast them before station 8, or phase Inspirit out with Ripples ("Those permanents phase out"). Organic Extinction ("Destroy all nonartifact creatures") spares it.

## 2. Health table
| metric | current (101) | proposed (100) |
|---|---|---|
| lands (entering tapped) | 39 (13) | **37 (10)** |
| coloured land sources U / R / W | 22 / 23 / 23 | **23 / 21 / 21** |
| pips U / R / W (nonland) | 28 / 11 / 14 | 28 / 8 / 15 |
| rocks / ramp | 14 | 14 (Waterskin and Ornithopter in for Psionicist and Cloud Key) |
| draw | 10 | 10 |
| spot removal | 5 | **7** |
| counterspells | 1 | **2** |
| wipes | 3 | 3 |
| protection | 2 | 2 |
| counter / proliferate engines | 11 | 11 |
| proliferate sources (incl. doublers, Bastion) | 10 | **11** |
| payoffs / threats | 12 | 12 |
| creatures with power ≥3 (station) | 10 | **11**, two of which reach 8+ in one tap (Traxos 7, Colossus 9) |
| avg MV, nonland | 3.32 | 3.21 (Colossus counted at 9; at warp {3} it is 3.11) |
| synergy links, all nonland: min / median | 0 / 42 | 0 / 41 |
| synergy links, plan cards (excl. interaction, mana, draw): min / median | 22 / 47 (n=29) | 21 / 45 (n=27) |
| five lowest, all nonland | Chain Reaction, Fumigate, Pull from Tomorrow, Swan Song, Swords (all 0) | Bovine, Chain Reaction, Fumigate, Pull from Tomorrow, Rapid Hybridization (all 0; interaction or draw, judged by efficiency) |
| five lowest plan cards | Resourceful Defense 22, Ripples 23, Skate 24, Thrummingbird 24, Soul-Guide Lantern 26 | Resourceful Defense 21, Expansion Algorithm 22, Ripples 22, Skate 23, Bygone Colossus 30 |

**How links are counted.** A and B are linked when one provides what the other needs:
- an artifact, for Inspirit protection and artifact payoffs;
- creature power, for station;
- counters, for proliferate, doublers and movers;
- charge counters, for charge placers;
- +1/+1 counters, for +1/+1 placers.

The plan-card median drops by 2 because Golem Foundry and Hangarback (high artifact-link counts) left for Ballista and Colossus. Ballista and Colossus are stronger, and both are still 3+ link cards. Two slots also moved into interaction.

**Mana.** Blue carries 28 of 51 pips, including Universal Surveillance {U}{U}{U} and Pull, Tekuthal and Algorithm at UU. Red carries 8 after Depthshaker left. So Glittering Massif (tapped R/W) became an Island and one Mountain became an Island. 21 R/W sources still cover {U}{R}{W} on T3 and Chain Reaction's {R}{R}. 37 lands plus 14 rocks is inside the gate's Karsten band (39 ±2).

## 3. Swaps, ranked by impact
| # | IN | OUT | role | source | why IN (oracle) | why OUT is weaker |
|---|---|---|---|---|---|---|
| 1 | Bygone Colossus | Hangarback Walker | payoff / station | open | 9/9 for "Warp {3}". Station's "Tap another creature you control" is Inspirit's cost, not the Colossus's {T}, so it can tap the turn it arrives (as with crew). 9 counters puts Inspirit at "8+" in one tap | "{1}, {T}: Put a +1/+1 counter" taps itself, so it can't station that turn, and its "When this creature dies" rarely fires once Inspirit grants indestructible |
| 2 | Traxos, Scourge of Kroog | Depthshaker Titan | payoff / station | open | {4} 7/7 trample. "Whenever you cast a historic spell, untap Traxos" (~45 artifacts plus legends), so it stations 7 almost every turn | {5}{R}{R}, backup plan only. Its ETB animates artifacts that you "Sacrifice ... at the beginning of the next end step" |
| 3 | Walking Ballista | Golem Foundry | payoff | Cabbage (see §4) | "Remove a +1/+1 counter from this creature: It deals 1 damage to any target". Every Overseer, Iron Spider or proliferate counter becomes removal or reach. Tezzeret's −3 finds it (MV 0 in library) | "Remove three charge counters ... Create a 3/3": three artifact spells per body, no reach |
| 4 | Contagion Clasp | Thrummingbird | engine | open | "{4}, {T}: Proliferate" every turn, with no combat. It is an artifact, so Inspirit protects it and Surge Conductor, Kappa and Tezzeret trigger on it | "Whenever this creature deals combat damage to a player, proliferate": a 1/1 that has to connect in a 4-player pod |
| 5 | Expansion Algorithm | Coretapper | engine | open | "Proliferate X times", doubled by Tekuthal. It is the Reactor kill spell (Reactor 14 plus X=3 equals 20) | "{T}: Put a charge counter on target artifact": +1 per turn |
| 6 | Rapid Hybridization | Soul-Guide Lantern | removal (slot from utility) | open | {U} instant: "Destroy target creature" | Graveyard hate ("Exile each opponent's graveyard") serves neither plan |
| 7 | Sheltered by Ghosts | Tractor Beam | removal | open | {1}{W}: "exile target nonland permanent an opponent controls". On an artifact creature under Inspirit (hexproof/indestructible) the Aura stays. On Inspirit it adds "ward {2}" | {2}{U}{U}, creature or Spacecraft only. The stolen permanent "doesn't untap", so it can't station |
| 8 | Bovine Intervention | Lonely Sandbar | removal (slot from the 39th land) | open | {1}{W} instant: "Destroy target artifact or creature" | "enters tapped. {T}: Add {U}. Cycling {U}": an Island that enters tapped. 39 lands with 14 rocks is too many |
| 9 | Three Steps Ahead | Wake the Past | counterspell (slot from recursion) | open | "+ {1}{U} — Counter target spell", plus "+ {3} — Create a token that's a copy of target artifact" (a second Lux Artillery doubles the 10 damage) | {5}{R}{W} rebuy after a wipe. Inspirit 8+ already makes artifacts indestructible, and Wake does nothing against exile |
| 10 | Bender's Waterskin | Uthros Psionicist | ramp | open | "{T}: Add one mana of any color" and "Untap this artifact during each other player's untap step" | "The second spell you cast each turn costs {2} less" adds no mana and no colour, on a non-artifact body |
| 11 | Ornithopter of Paradise | Cloud Key | ramp | open | {2}: "{T}: Add one mana of any color". It is an artifact creature, so Lux Artillery's sunburst makes it a 3/5 | {3} for "cost {1} less" on one type. No fixing, and it doesn't pay activations |
| 12 | Island | Glittering Massif | land | basic | Untapped U, the colour carrying 28 pips | "This land enters tapped" and adds only R/W, the two oversupplied colours |
| 13 | Island | Mountain | land | basic | Shifts the basics to blue demand (U 23 / R 21 sources) | Red is down to 8 pips |
| 14 | (none) | Secluded Steppe | land, the owed cut | | | "This land enters tapped. {T}: Add {W}" is worse than a Plains, and the land count drops 39 → 37 |

## 4. Tam and donor swaps
- **Tam: no swap proposed.** The only Tam cards that would lift Inspirit are Flux Channeler ("Whenever you cast a noncreature spell, proliferate"), Path to Exile, Counterspell, Dovin's Veto and the Talismans. Open cards already fill those roles here: Rapid Hybridization, Three Steps Ahead and Bender's Waterskin.
  - For Channeler, Tam would need back a walker-proliferate engine at least as good. Inspirit or open cards offer only Contagion Clasp ("{4}, {T}: Proliferate", paid every use) or one-shot spells (Tezzeret's Gambit, Experimental Augury). Tam loses, so the swap fails the both-gain test.
  - Tekuthal ("proliferate twice instead") would gain Tam, but it is Inspirit's doubler, so Inspirit loses.
  - Fumigate, Thrummingbird and Shivan Reef are marked [ST] x2, so they are separate copies. The Inspirit Thrummingbird becomes open.
- **Cabbage ⇄ Inspirit (proposed).**
  - **Inspirit gets:** Walking Ballista (row 3).
  - **Cabbage gets back:** Stonecoil Serpent [-], same colourless identity and same role: an X mana sink that "enters with X +1/+1 counters on it". It keeps feeding The Ooze ("Whenever a creature you control with a +1/+1 counter on it leaves the battlefield, create a Mutagen token for each +1/+1 counter on it") and adds "Reach, trample, protection from multicolored".
  - **Not applied:** decks/paper/ was not touched. If you reject the swap, put Stonecoil in Ballista's slot here; it's open and the gate still passes.
- **Meren / Imotekh: none.** Foundry Inspector [I] only duplicates Mechanaut's "Artifact spells you cast cost {1} less". Lightning Greaves [M] needs a creature, and Inspirit is a creature only at 8+. Solemn Simulacrum [MI] has both copies in use.

## 5. Stop proofs, per role (final pass found no improving swap)
- **Lands (37).**
  - The weakest kept land is Evolving Wilds: a tapped basic of any of the three colours.
  - Best remaining is Nesting Grounds (one open copy): "{1}, {T}: Move a counter ... Activate only as a sorcery". It would be colourless land #3 next to Buried Ruin and Karn's Bastion, in a deck whose commander and Kilo cost {U}{R}{W}, and Moxite already moves X counters at once.
  - War Room ("{3}, {T}, Pay life ...: Draw a card") is colourless too. Conduit Pylons, Study Hall and Opal Palace make one coloured mana from two lands. Tapped duals (Eroded Canyon, Lonely Arroyo, Abraded Bluffs) only equal the kept Temples, which add "scry 1".
  - Every kept tapped land earns its slot:
    - Monastery is the only tri-land.
    - The three Bridges are artifacts (metalcraft, affinity, improvise, Surge Conductor and Kappa triggers).
    - Farmland is "Plains Island" (enables Glacial Fortress, and is an Angel plainscycling target).
    - Radiant Summit ("enters tapped unless you control two or more basic lands") is untapped once two of the 8 basics are down.
  - Basics are used only because no owned untapped dual is free: Hallowed Fountain, Steam Vents, Spirebluff Canal and Inspiring Vantage are Tazri's [Z], and Deserted Beach is Tam's.
- **Ramp (14).**
  - The weakest kept is The Eternity Elevator ({5}, "{T}: Add {C}{C}{C}").
  - Best remaining is Palladium Myr ("{T}: Add {C}{C}", {3}). Ten rocks at MV ≤3 already cover the early turns. Elevator takes Inspirit's "two charge counters" toward "20+ | {T}: Add X mana of any one color", which powers Expansion Algorithm and Pull from Tomorrow X.
  - Commander's Sphere ({3}, one mana) loses to Steelswarm Operator, which comes down a turn earlier and has "{T}: Add {U}{U}. Spend this mana only to activate abilities of artifact sources".
- **Draw (10).** The weakest kept is Experimental Augury ({1}{U}: one of three, plus "Proliferate"). Best remaining is Stroke of Genius ("{X}{2}{U} ... draws X cards"), which needs 5 mana for 2 cards and repeats Pull from Tomorrow and Universal Surveillance without proliferating. Nulldrifter's evoke ({2}{U}) is 2 cards at sorcery speed with no counter.
- **Removal (7).**
  - The weakest kept is Angel of the Ruins ({5}{W}{W}).
  - Best remaining is Journey to Nowhere ({1}{W}, "exile target creature"). Five kept cards already answer creatures (Swords, Rapid, Dispatch, Bovine, Sheltered). Angel is one of three answers to enchantments ("exile up to two target artifacts and/or enchantments"), is a 5/7 flying artifact that stations 5, and has "Plainscycling {2}".
  - Darksteel Mutation and Flame of Anor ({1}{U}{R}, two modes only with a Wizard) lose on the same coverage point.
- **Counterspells (2).** The weakest kept is Swan Song ({U}). Best remaining is Negate ({1}{U}, "Counter target noncreature spell"). Swan Song covers the same wipes and removal ("enchantment, instant, or sorcery") for one mana less. The tie keeps the incumbent.
- **Wipes (3).** The weakest kept is Chain Reaction ({2}{R}{R}, "X damage to each creature, where X is the number of creatures"), which our indestructible artifact creatures survive. Best remaining is Curse of the Swine ("{X}{U}{U} Exile X target creatures"), which costs 2 plus one mana per creature and can't clear token boards.
- **Protection (2).**
  - The weakest kept is Resourceful Defense: "{4}{W}: Move any number of counters" moves charge from Cornucopia, Elevator, Autogenerator or Lux Cannon onto Reactor (primary plan, 21 links).
  - Best remaining is Boros Charm ("Permanents you control gain indestructible until end of turn"). It has 0 links and repeats Inspirit's own "hexproof and indestructible", so it loses under the synergy rule.
  - Teyo, Lightshield Expert protects one target, once.
- **Engines (11).**
  - The weakest kept is Moxite Refinery. It is the only card that turns the +1/+1 half (Overseer, Iron Spider, Kappa, Ballista, Thunderhulk) into Reactor charge: "Remove X counters ... Put X charge counters on target artifact".
  - Best remaining is Peter Parker's Camera. It needs "{2}, {T}, Remove a film counter" per copy and stops at three film counters, while Moxite moves X counters per activation.
  - Coretapper is +1 charge per turn. Lost Jitte only charges "Whenever equipped creature deals combat damage". Flux Channeler is Tam's (see §4).
- **Payoffs (12).**
  - The weakest kept is Pinnacle Emissary ("Whenever you cast an artifact spell, create a 1/1 colorless Drone artifact creature token"). Each Drone takes Steel Overseer's and Iron Spider's "+1/+1 counter on each artifact creature", so it scales Lux Artillery's 30.
  - Patchwork Automaton ("put a +1/+1 counter on this creature") grows one body.
  - Golem Foundry needs three artifact spells per 3/3.
  - Hangarback taps itself to grow.
  - Depthshaker is {5}{R}{R}, backup plan only.
  - Terror of the Peaks is not an artifact, so it gets no Inspirit protection (5 links vs 56).
  - Stonecoil is reserved for Cabbage.
- **Recursion (Emry).** Wake the Past lost its slot to Three Steps Ahead: countering the wipe for 3 beats rebuying for 7. Buried Ruin stays as the land rebuy.

## 6. Gate (`gate-copy.txt`, `--format commander --owner 1 --source paper`)
```
PASS size 100 · PASS singleton · PASS legality · PASS rules · PASS identity RUW
PASS ownership  all cards owned; paper collection imported 0 days ago
PASS arenaNames · PASS lands 37 (Karsten wants 39 ±2) · PASS curve avg MV 3.21
PASS wincons 11 · PASS locks 1
FAIL plan  18/62 nonland cards interact (29%) — commander wants: general value   (known)
```
Ownership passes for Walking Ballista because the gate counts owned copies. Its one copy is in Cabbage, so apply the §4 swap or use the Stonecoil fallback.
