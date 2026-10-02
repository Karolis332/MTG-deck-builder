# Inspirit refute, round 2 (2026-10-02, fresh context, Opus)

**Verdict: NOT CONVERGED.** All 27 nonland swaps and the land changes vs the sleeved list hold. There is one missed improving swap: **Zookeeper Mechan in, Lost Jitte out** (§4). Both screen CANDIDATEs are REJECTED. Thirteen text or maths errors were found, and none of them flips a swap (§3).

Method:
- Every quote in `build-report-2.md` (168) was machine-checked against the DB oracle text through `q.py`. 166 are verbatim and 2 are paraphrases (E7).
- Ownership: all 100 proposed cards are free (owned minus copies used in other `decks/paper/decks/*.txt`).
- Rules come from CR 2026-09-25 (media.wizards.com).
- `landsim.py` was re-run on variants (20k games each).

## 1. Swaps vs the sleeved list
| Out | In | Verdict | DB-quoted reason |
|---|---|---|---|
| Hangarback Walker | Bygone Colossus | KEEP | "Warp {3}", 9/9: one tap puts Inspirit at 8+. CR 302.6 restricts only "A creature's activated ability with the tap symbol", so station may tap it the turn it arrives |
| Golem Foundry | Traxos, Scourge of Kroog | KEEP | 7/7 trample, "Whenever you cast a historic spell, untap Traxos"; Foundry needs "Remove three charge counters" per 3/3 |
| Emry, Lurker of the Loch | Lost Jitte | KEEP the cut / ⚠️ the In | Emry is "mill four" plus a graveyard recast in a deck whose artifacts are indestructible. Jitte is the weakest kept card and loses to Zookeeper Mechan (§4) |
| Thrummingbird | Improvised Arsenal | KEEP | "+1/+0 for each artifact you control", "Equip {R}" (maths in §2) |
| Coretapper | Panharmonicon | KEEP | doubles Craterclaw, Skate, Thought Monitor, Surge, Kappa, Tezzeret and Urza's token. Doubling Depthshaker's ETB adds nothing: the second trigger finds no noncreature targets left |
| Soul-Guide Lantern | Generous Gift | KEEP | "Destroy target permanent", instant |
| Tractor Beam | Sheltered by Ghosts | KEEP | {1}{W} "exile target nonland permanent an opponent controls" vs {2}{U}{U} creature/Spacecraft steal |
| Mountain | Bovine Intervention | KEEP | "Destroy target artifact or creature", {1}{W} instant. 38 lands is justified (§5) |
| Wake the Past | Three Steps Ahead | KEEP | "Counter target spell" / "copy of target artifact or creature you control"; Wake costs {5}{R}{W} to return indestructible cards |
| The Eternity Elevator | Counterspell | KEEP | Elevator: "{T}: Add {C}{C}{C}" for {5}, and coloured only at "20+" |
| Uthros Psionicist | Ornithopter of Paradise | KEEP | non-artifact "second spell ... costs {2} less" vs a {2} artifact "Add one mana of any color" |
| Cloud Key | Fellwar Stone | KEEP | a free copy (2 owned, Tazri 1) |
| Fumigate | Final Showdown | KEEP | "Choose a creature you control. It gains indestructible" + "Destroy all creatures". The full spree is {4}{W}{W}{W} (E9) |
| Chain Reaction | Cyclonic Rift | KEEP | Chain Reaction "deals X damage to each creature", ours included; Rift's overload is one-sided |
| Angel of the Ruins | Chaos Warp | KEEP | {2}{R} instant, any permanent; Angel costs 7 |
| Threefold Thunderhulk | Craterclaw Colossus | KEEP | the operator's pick: "Haste", "+X/+0 ... trample" kills on the turn it lands. Thunderhulk's Gnomes are summoning-sick. Its RRR is met, barely (§6) |
| Moxite Refinery | Lasting Tarfire | KEEP | Moxite moves counters "as a sorcery". Tarfire has 8 repeatable sources (E4) |
| Mindless Automaton | Fact or Fiction | KEEP | instant, 5 cards; Automaton draws one per "Remove two +1/+1 counters" |
| Resourceful Defense | Cyberdrive Awakener | KEEP | "each noncreature artifact you control becomes a 4/4"; fliers. Equipment falls off (E1) |
| Patrolling Peacemaker | Boros Charm | KEEP | "Permanents you control gain indestructible" / "double strike". The indestructible mode matters for Inspirit and our non-artifacts only |
| Pinnacle Emissary | Blade Historian | KEEP | "Attacking creatures you control have double strike": the only zero-mana amplifier on the alpha turn |
| Crystalline Crawler | Etherium Sculptor | KEEP | {1}{U} "Artifact spells you cast cost {1} less" vs a {4} body |
| Solar Array | Urza, Lord High Artificer | KEEP | "Tap an untapped artifact you control: Add {U}", and the Construct gets "+1/+1 for each artifact you control" |
| Experimental Augury | Insight Engine | KEEP | "draw a card for each charge counter on it". With Inspirit's two counters it draws 3, then 6 (verified) |
| Tezzeret's Gambit | Island (38th land) | KEEP | land count (§5) |
| Pull from Tomorrow | Reverse Engineer | KEEP | improvise "Draw three cards"; a near-tie with Voyage Home (§4) |
| All-Fates Scroll | Nyx Lotus | KEEP | devotion mana; R devotion ≈ 3 by T6 pays Craterclaw's RRR |
| Titan Forge | All That Glitters | KEEP | at 8 artifacts, Glitters + Arsenal on Inspirit = 5+9+8 = 22 commander damage (§2) |
| Evolving Wilds, Temple of Triumph, Lonely Sandbar, Glittering Massif, Buried Ruin, The Mycosynth Gardens, Secluded Steppe | Fabled Passage, Path of Ancestry, Island, Inspiring Vantage, Island, Inventors' Fair, — | KEEP | fewer tapped lands (12 → 8). Fair: "Search your library for an artifact card" tutors a finisher |

## 2. Numbers recomputed
- **Craterclaw Colossus.** X counts every artifact when the trigger resolves, Craterclaw included. Only creatures present at that moment get +X/+0 (CR 611.2c).
  - Total damage = Σ power + N·X, where N = attacking creatures. Panharmonicon doubles the trigger: Σ + 2N·X.
  - The report's 16-artifact board without Depthshaker (Inspirit 5, Traxos 7, Kilo 3, Construct 16, Craterclaw 5): 36 + 80 = **116 trample**, or 196 with Panharmonicon. Inspirit alone reaches 21 commander damage.
  - Realistic T8 board (10 artifacts, 4 creatures): ≈ 56.
- **Improvised Arsenal at 16 artifacts.** 5 + 16 = 21 = one hit for commander damage (CR 903.10a). ✅ Inspirit and Arsenal both count. The real thresholds are lower:
  - With Boros Charm double strike: 6 artifacts (11 × 2).
  - With All That Glitters also on Inspirit: 8 artifacts (5 + 9 + 8 = 22). Inspirit has flying but no trample, so it can be chump-blocked.
- **Depthshaker board.** The report gives 73 = 5 spares × 6/6 + Traxos 10 + Kilo 6 (DB: 3/3 haste) + Depthshaker 8 + Construct 19. The arithmetic is right; melee is +3 vs 3 opponents (CR 702.121a). But:
  - (a) It omits Inspirit, an artifact creature at 8+ that gets melee and trample: **81**. Blade Historian takes it to **162**.
  - (b) The board needs ~16 artifacts plus 7 mana from sources other than the 5 spares (a rock tapped for mana can't attack). That is a T9–10 board, not T7.
  - A realistic T7 board (≈ 6 lands, 7 nonland permanents) makes ≈ 40 trample. Blade Historian, or Craterclaw/Panharmonicon, is needed to threaten 120 table life.
- **Lasting Tarfire.** The DB text is "At the beginning of each end step, if you put a counter on a creature this turn". There are 8 repeatable sources, not 6–7:
  - Inspirit 1+ (+1/+1 option), Steel Overseer, Iron Spider, Kappa, Kilo (proliferate when tapped), Surge Conductor, Tezzeret 0 ("If it's an artifact creature, put a +1/+1 counter on it"), and Karn's Bastion.
  - Stationing an Inspirit that is already at 8+ also counts.
- **landsim fairness.** Mostly fair: free mulligan, distinct-source colour matching, tapped-land sequencing, and floors for Urza and Nyx Lotus. Three flaws:
  - (1) Pentad Prism is modelled as a permanent rock. The DB says "Remove a charge counter ...: Add one mana", which is 2 mana in total. Blanking it drops T7 Depthshaker from 64.0 to 61.3, so the true figure is ≈ 62–63 %.
  - (2) Skycloud Expanse is in `SRC` as a free WU dual, but it needs another mana source (metrics2 weights it 0.5).
  - (3) Lands missing from `SRC` (Reliquary Tower, War Room, …) are loaded as spells, so testing a utility land needs a stand-in.
  - The model is on the play only, which is pessimistic in a pod.
- **Utility-land cost (measured, colourless stand-in, Buried Ruin).**

| Replaces | T3 Inspirit | by T4 | T7 Depthshaker |
|---|---|---|---|
| Temple of Epiphany | −2.9 | −1.8 | −0.3 |
| an Island | −2.4 | −1.3 | −0.1 |

  The report's "≈ −2.6" is real for T3 only. By the finisher turn it is ~0.
- **Karsten.** 31.42 + 3.13·3.21 − 0.28·10 = 38.7 (9 cheap → 38.9). Effective MV 2.92 → 37.8. **38 is right** (avg MV re-computed from the DB: 3.21).

## 3. Errors and fixes
| # | Where | Error | Fix |
|---|---|---|---|
| E1 | §1 Kill 3 "(verify)" | Cyberdrive's animation is mandatory. CR 301.5c: "An Equipment that's also a creature can't equip a creature" → it becomes unattached | Arsenal, Gavel and Jitte drop off Inspirit on a Cyberdrive turn. Never pair Cyberdrive with the commander-damage line |
| E2 | §1 Kill 1 | "T7 ≈ 73" omits Inspirit (81) and assumes a T9+ board | Say "late game ≈ 81, ×2 with Historian; T7 ≈ 40" |
| E3 | §2 colour check | Calls Craterclaw "a 6-MV triple (28)". It is {4}{R}{R}{R}, MV 7: 4CCC ≈ 26 @41 lands ≈ 24 @38 | R 24.2 meets it (barely); it is not short |
| E4 | §1, row 17 | "6 repeatable sources" | 8 (§2); row 17 should say "on a creature" |
| E5 | landsim | Pentad Prism modelled as a permanent rock; Skycloud Expanse as a free dual | T7 Depthshaker ≈ 62–63 %, not 64.0 |
| E6 | §4 lands | "−2.6 pts each" is presented as the whole cost | It is T3-only; −0.1 to −0.3 at T7 (§2). Utility lands become an operator call (§5) |
| E7 | §8 | Balefire Liege "Other red/white creatures" and Lorehold Charm "+1/+1 and trample" are paraphrases | DB: "Other red creatures you control get +1/+1. / Other white creatures …"; "get +1/+1 and gain trample until end of turn". Verdicts unchanged |
| E8 | §2 health | Organic Extinction listed as one-sided | "Destroy all nonartifact creatures" also kills our Urza, Jhoira, Tekuthal, Skate and Blade Historian. Call it artifact-sparing |
| E9 | row 13 | Final Showdown's protected wipe is {W}+{1}+{3}{W}{W} = 7 mana with WWW in the lightest colour | Note the cost; keep |
| E10 | §8 Super State | "9 commander damage a hit" | The base 9/9 is set first and Arsenal/Glitters add on top: Super State + Arsenal at 12 artifacts = 21 commander damage, plus 21 non-combat to each other opponent. Still OUT: {7}, on a commander its own grant leaves unprotected ("Other artifacts") |
| E11 | §6 / screen 1 | Lost Jitte called "single-charge". Inspirit gives it two | But two charge on Everflowing Chalice, Astral Cornucopia or Empowered Autogenerator = +2 mana *every* turn; on Jitte it is 2 untaps once. Jitte's main use is dominated (§4) |
| E12 | screen 2 | Alhammarret's Archive: "doubling only hits draw-step draws" | Inverted. DB: "draw a card except the first one you draw in each of your draw steps". Still OUT ({5}, no mana, no body) |
| E13 | screen 2 | Titan Forge: "far slower" | With Inspirit's +2 per turn it makes a 9/9 about every turn after setup, but it eats Inspirit's trigger. Near-tie, still OUT |

## 4. Missed swaps and candidate rulings (ranked)
| In | Out | Verdict | Why |
|---|---|---|---|
| **Zookeeper Mechan** | Lost Jitte | **SWAP** | "{T}: Add {R}" every turn from T3 feeds Depthshaker RR and Craterclaw RRR. It is an artifact creature for Overseer, Iron Spider and Tarfire, and a 4/6 melee trampler under Depthshaker. Sim: T7 Depthshaker 64.0 → 66.4 % (upper bound: Jitte's untaps are unmodelled, but each pair costs Inspirit's trigger, which is worth +2 mana every turn on Chalice). It loses only Jitte's "Target creature can't block", and every finisher already grants trample |
| Adaptive Automaton (screen 1) | Lost Jitte | REJECT | "Other creatures you control of the chosen type get +1/+1": 5 Constructs + Urza's token in 100 cards, and the animated artifacts from Depthshaker/Cyberdrive have no creature type. ≈ +2–3 power on the alpha for {3}. Zookeeper takes the slot |
| Jazal Goldmane (screen 2) | Kappa Cannoneer | REJECT (near-tie) | "{3}{W}{W}: Attacking creatures ... get +X/+X". Huge on 10 attackers (+100), but the Depthshaker/Craterclaw turn then needs 12 mana with WW twice, it is a non-artifact outside Inspirit's shield, and Blade Historian already doubles the alpha for 0. Kappa: "Improvise", "Ward {4}", an artifact |
| Voyage Home (2h) | Reverse Engineer | tie, no swap | "Affinity for artifacts": {W}{U} at 5+ artifacts and taps nothing, vs improvise tapping 3. Operator taste |
| War Room / Rogue's Passage | Temple of Epiphany | tie, no swap | −2.9 T3 / −0.3 T7 (§2). War Room "{3}, {T}, Pay life ...: Draw a card"; Passage "can't be blocked" for the Arsenal hit |
| Duke Ulder Ravengard (2h) | — | OUT | {4}{R}{W} non-artifact. Myriad (CR 702.116a) copies of Craterclaw re-trigger "+X/+0" twice, but only with Craterclaw already out (13 mana over two turns). Copies of Inspirit have no charge counters, so they aren't creatures |
| Captain Howler, Sea Scourge (2h) | — | OUT | "Whenever you discard one or more cards": only Three Steps Ahead's mode discards here |
| Malcolm, the Eyes (2h) | — | OUT | "Whenever you cast your second spell each turn, investigate": {2} per Clue; non-artifact; loses to Etched Oracle |
| Wild Ride (2h) | — | OUT | one target "+3/+0 and gains haste" |
| Fblthp, Lost on the Range (2h) | — | OUT | "You may plot nonland cards from the top": you pay full cost now and cast later; no artifact link, UU |
| The Key to the Vault (2h) | — | OUT | "Equip {2}{U}" competes with Arsenal/Gavel for Inspirit; value only "deals combat damage to a player" |
| Super State | — | OUT | E10 |
| Teyo, the Shieldmage | — | OUT | "You have hexproof": the player only; artifacts already have hexproof at 8+ |
| Flare of Fortitude | — | OUT | {2}{W}{W} on a 7-mana alpha turn. Its "hexproof and indestructible" adds only Inspirit and non-artifacts beyond the 8+ grant; Boros Charm does that for {R}{W} or doubles Inspirit |
| Chandra, Spark Hunter | Kappa | near-tie (report) | Rules check: the 0's "3/2 colorless Vehicle artifact token" is a noncreature artifact, so it is a valid Depthshaker target and counts for Craterclaw's X. It gets the +X only if crewed before the trigger resolves (611.2c), and her own animation comes "At the beginning of combat", after a main-phase Craterclaw |
| Ways / Jace RS / Jace makers | — | OUT | no Jace payoff; a 25-loyalty Jace line is a fourth plan |

Spot-check of 10 screen OUT verdicts against the DB:
- ✅ correct: Worldwalker Helm ("copy of target artifact token you control"), Strix Serenade, Take the Fall, Village Pillagers, Kindred Judgment, Hour of Reckoning, Negate, Expansion Algorithm.
- ⚠️ right verdict, wrong reason: Alhammarret's Archive (E12), Titan Forge (E13).

## 5. One plan
- **Primary: artifact alpha.**
  - T1–3: rocks, Sculptor or Mechanaut, then Inspirit.
  - T4–6: station to 8+ with Bygone or Traxos, which gives the board hexproof and indestructible. Draw with Insight Engine, Jhoira and Uthros, and build the board.
  - Close, T8–10: Depthshaker (locked), Craterclaw or Cyberdrive, amplified by Blade Historian or Panharmonicon, protected by Boros Charm and the counterspells.
- **Backup: Inspirit commander damage.** Arsenal, Glitters and Gavel, plus Boros Charm double strike; this needs 6–8 artifacts.
- ⚠️ **Third route:** Darksteel Reactor (20 counters), Lux Artillery (30 counters) and the Tarfire chip. They run off the same counters engine, but they are a second backup under §2's rule. Reactor has no role in either the primary or the backup plan. Lux Artillery at least adds "sunburst" to every artifact creature.
- No card serves *neither* the plans nor interaction, draw or mana, except Reactor, which is flagged above.

## 6. Mana
Requirements use Karsten's 41-land table × 38/41.

| Colour | Sources (weighted) | Key cost | Needs | Status |
|---|---|---|---|---|
| U | 22.4 lands + 5.0 rocks, + Urza | Counterspell UU | 27.8 | ✅ borderline |
| U | same | Urza/Tekuthal 2UU | 24.1 | ✅ |
| R | 19.7 + 4.5 = 24.2 | Depthshaker 5RR | 18.5 | ✅ |
| R | same | Craterclaw 4RRR | ≈ 24 | ✅ barely |
| W | 19.4 + 4.5 = 23.9 | Final Showdown, full spree 4WWW | ≈ 24 | ⚠️ |

- Pips (U / R / W): 29 / 13 / 12.
- The three-colour base supports RRR only with filter lands ("{U/R}, {T}: Add ... {R}{R}"), Nyx Lotus in R mode, or Zookeeper. That is one more reason for the §4 swap.
- Universal Surveillance's UUU is a late X spell, so it is fine.

## 7. Operator decisions still open
1. Zookeeper Mechan in for Lost Jitte (the recommended swap).
2. Darksteel Reactor: keep it as a near-unanswerable alt-win under Inspirit's 8+ grant, or cut it for one-plan purity. Replacement options: Jazal Goldmane or Threefold Thunderhulk.
3. A utility land (War Room / Rogue's Passage) for Temple of Epiphany: costs 2.9 T3 points, nothing at T7.
4. Near-ties: Kappa Cannoneer vs Chandra, Spark Hunter / Titan Forge; Reverse Engineer vs Voyage Home.
5. Nothing is applied. The operator confirms what is sleeved, then gate and paper-sync.
