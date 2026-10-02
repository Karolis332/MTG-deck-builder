# Refute: Urza `final.txt` (fresh context, 2026-10-02)

**Verdict: ❌ NOT CONVERGED.**
- **2 text-backed swaps:** Flesh Duplicate in for Stonecoil Serpent; Donatello (box) in for Patchwork Automaton.
- **If owned, no swap yet:** The Theorist, Jace Beleren in for Witching Well; Hall of Echoes in for War Room.
- **16 claim errors.** None of them changes another card.
- **Everything else recomputes exactly:** 31 artifacts, the curve, Karsten 37.5–38.1, the blue sources, the 9 + N Construct.

Sources:
- Card text: `pool.md` and `fra-supplement.md` (both DB), the DB via `q.py`, the Scryfall API for DFC faces.
- Rules: `MagicCompRules 20260925.txt` (magic.wizards.com/en/rules).
- Odds: `reference/calcs.py`; in its pod model every player draws on turn 1.

## 1. Box cuts (all 32 ruled)
| Out (box) | Loses to | Ruling | DB-quoted reason |
|---|---|---|---|
| Talrand, Sky Summoner | Sai / Efficient | ✅ KEEP | "Whenever you cast an instant or sorcery spell" = 18 cards. Sai's "artifact spell" = 30, and makes artifact Thopters. |
| Archmage Emeritus | Avatar Kuruk | ✅ KEEP | "Whenever you cast or copy an instant or sorcery spell" = 18. Kuruk: "Whenever you cast a spell". |
| Baral | Geist of Saint Thalia | ✅ KEEP | "Instant and sorcery spells … cost {1} less" (18) vs Geist's "Noncreature spells" (44). |
| Archaeomancer | Scour for Scrap | ✅ KEEP | "return target instant or sorcery card" for 4 MV. Scour is an instant: tutor and/or "Return target artifact card". |
| Solve the Equation | Scour for Scrap | ✅ KEEP | It finds "an instant or sorcery card", but the threats are artifacts. |
| Opt / Consider | Mishra's Bauble | ✅ KEEP | "Draw a card." from a non-artifact. The {0} Bauble triggers Sai, Efficient, Kappa and Foundry. |
| Ponder | Witching Well | ✅ KEEP | Well is an artifact with "scry 2" (a Planetarium trigger), then "Draw two cards". |
| Frantic Search | Stock Up | ✅ KEEP | "Draw two cards, then discard two cards" is card-neutral. Stock Up: "Put two of them into your hand". |
| Winternight Stories | Reverse Engineer | ✅ KEEP | "discard two … unless you discard a creature card" nets +1. Reverse Engineer: "Improvise … Draw three cards". |
| Commandeer | Countersculpt | ✅ KEEP | "{5}{U}{U}" or 3 cards, "noncreature spell" only. Countersculpt is "Counter target spell" for 3. |
| Spell Pierce | Strix Serenade | ✅ KEEP | "unless its controller pays {2}". Strix is a hard counter for {U}. |
| Vexing Bauble | — | ✅ KEEP | "if no mana was spent … counter that spell": hits Urza {5}, Planetarium, Flare's alternative cost, and our {0} Mishra's Bauble. |
| Shimmer Myr | Unstoppable Plan | ✅ KEEP | "cast artifact spells as though they had flash": off-turn mana already goes to 6 counters and the X instants. |
| Coretapper | Golem Foundry | ✅ KEEP | "{T}: Put a charge counter": 1 a turn, for Foundry and the Dawnsire station only. |
| Decanter | Bender's Waterskin | ✅ KEEP | Same 3-MV "{T}: Add one mana of any color". Waterskin also "Untap … each other player's untap step". |
| Hedron Archive | Worn Powerstone | ✅ KEEP | "{T}: Add {C}{C}" at 4 MV. Powerstone does the same at 3. |
| Expedition Map | Soul-Guide Lantern | ✅ KEEP | "{2}, {T}, Sacrifice …: Search … land card": 3 mana for one utility land. |
| Hammer of Nazahn | Ghostly Flicker | ⚠️ KEEP, reason wrong | The ETB "you may attach that Equipment" is free, so it costs **4, not 8**. Near-tie: Hammer protects the Super State host from "destroy"; Flicker saves Urza from exile. |
| Sewer-veillance Cam | Island #31 | ✅ KEEP | 37 lands is the house floor for an MV-4 commander (principles §3.1). Cam's "Draw two cards" is a near-tie with Well. |
| The Eternity Elevator | Thran Dynamo | ✅ KEEP | "{T}: Add {C}{C}{C}" at 5 MV vs 4. |
| Hydroelectric Specimen | Flicker / Island | ✅ KEEP | Redirects only "instant or sorcery spell with a single target". At 0.38 of a land, it would drop the deck to 36.8. |
| Tempest Djinn | Hangarback Walker | ✅ KEEP | "+1/+0 for each basic Island" has no artifact link. Hangarback leaves artifact Thopters. |
| Hydro-Man | — | ✅ KEEP | "he becomes a land … (He's not a creature during that time.)" |
| **Donatello** | **Patchwork Automaton** | ❌ **REJECT** | "Flying" and "Whenever an artifact you **control enters**": every Thopter, Incubator, Map, Golem and Construct token grows it. Patchwork's "Whenever you **cast** an artifact spell" is a ground 1/1. The builder compared Donatello with Kappa, a kept card. |
| Traxos, Academy Guardian | Hangarback | ✅ KEEP | A 1/5 "Prowess" artifact: too little power. |
| Uthros Psionicist | Medallion / Cloud Key | ✅ KEEP | "The second spell you cast each turn costs {2} less" is conditional. |
| Mu Yanling | — | ✅ KEEP | Loyalty 2, so "−3: Create a 4/4" needs a "+2" turn first. |
| Burnished Hart | Solemn Simulacrum | ✅ KEEP | "{3}, Sacrifice …" makes it 6 mana in total. Solemn ramps on ETB and draws when it dies. |
| Lonely Sandbar / Cephalid Coliseum / Evolving Wilds | Island | ✅ KEEP | "enters tapped" / "deals 1 damage to you" / "battlefield tapped". None is an Island for Scroll. |

**The spell package loses under Urza.** Urza's "Add {U}" does pay for spells, but an artifact is also {U} a turn and +1/+1 on every Construct, and it triggers six engines. Talrand, Archmage and Baral need about 30 instants and sorceries; getting there cuts about 12 artifacts, which costs about 12 Construct power and 12 mana a turn. It is a comparable plan only under Eluge (not owned), so keep the 12 cards bagged together.

## 2. Errors and fixes
| # | Where | Wrong | Fact (DB / CR) → fix |
|---|---|---|---|
| 1 | §2 T1–3 | Geist accelerates Urza; **40.5 %** | Geist reads "**Noncreature** spells"; Urza is a creature. Pods draw on turn 1 (CR 103.8c), so 9 cards are seen by turn 2. Correct: 5 accelerants → **38.6 %**. P(Urza by turn 4) = **0.91** (calcs.py). |
| 2 | §4 cost reducers | All three "still tap for Urza" | Geist is not an artifact. Only Medallion and Cloud Key tap for Urza. |
| 3 | §4 X draw | WST has the "Same {X}+3 cost" | It costs {X}{U}{U} and draws "half X cards, rounded down". |
| 4 | §4 / verdicts: Donatello | "Kappa without ward" | Donatello has "Flying" and costs 3. Compare it with the weakest kept threat → swap. |
| 5 | verdicts: Hammer | "8 mana total" | The ETB attach is free, so it costs 4. |
| 6 | verdicts: Sink into Stupor | "Island-type land face" | Soporific Springs is just "Land" (Scryfall). It does not count for Scroll or Agna. |
| 7 | §2 Fleshraker | "each artifact spell … 3 damage" | The trigger is "a **colorless** spell". The 6 blue artifacts ping for 2, not 3. |
| 8 | §3 Perplexing Test | "our Constructs … stay" | It also bounces Urza and 17 of our own creatures, and resets their counters. It is a mass bounce, not one-sided. |
| 9 | §2 close | The kill is Super State | It is a 1-of with no tutor (Scour finds only an "artifact card"), seen by turn 8 in **15.2 %** of games. If its token leaves, the token ceases to exist (CR 111.7/111.8) and the Aura goes to the graveyard (704.5m). The real close is Helm copies of the Construct with Whirler/Passage. Host Super State on Kappa (ward 4) when opponents hold removal. |
| 10 | §2 Kuruk | Second alpha the same turn as Super State | Exhaust is "Activate only once" (702.177a). Super State + waterbend need 27; at 13 artifacts the deck has 25. It works only with Plan's end-step untap, or with Super State cast a turn earlier. |
| 11 | §7 Karn −2 | "playgroup call" | CR 903.11 allows cards from outside the game only via "effects that specifically bring cards into Commander games"; 903.11a bars starting-deck names and off-identity cards. Cite those rules. |
| 12 | §1 Eluge | "costs {U} (or {1}) less" | The quote drops "for each land you control with a flood counter on it" without an ellipsis. |
| 13 | §5 cheap = 11 | Counts Geist and Medallion | The regression counts "draw or ramp". Without the two reducers it gives 38.6 / 38.1. 37.4 effective is within 1; state the assumption. |
| 14 | §5 | No P(commander on curve) | Add **0.91** (turn 4) / 0.94 (turn 5). That is above the 0.85 flag. |
| 15 | verdicts: Flesh Duplicate | "vanishing 3: temporary" | A copy of Urza keeps its Construct permanently (§4). |
| 16 | verdicts: Visage Bandit | "the legend rule removes one copy. Low impact" | Urza's ETB still creates a Construct before the legend rule applies (§4). |

## 3. Numbers recomputed: all ✅ except error 1
- **Construct and kill:** 9 + N; 22/22 at 13 artifacts (CR 613.4b sets the base, 613.4c adds the bonus, the token counts itself); 22 to each opponent per swing, 44 over two swings.
- **Counts:** 31 artifacts; 27 colourless / 35 blue spells (Super State is {7}); curve 3/5/17/17/9/4/3/4 with avg 3.113; 13 instants, 5 sorceries, 7 X spells; 7 rocks + Sol Ring; Flare fodder 8 (Avatar Kuruk is colourless, Scryfall `colors: []`).
- **Lands and odds:** Karsten 38.08 / 37.53, simulation 37.5; blue sources needed 23.46 / 27.07; {C} needs 16.24, P(≥ 1 of 8 in 16) = 0.7696; P(≥ 3 lands in the opening 7) = 0.5247.

## 4. Rules claims
- ✅ **Urza taps summoning-sick artifacts.** CR 302.6 restricts only "A creature's activated ability with the tap symbol"; Urza's cost is "Tap an untapped artifact you control" (a 605.1a mana ability), as Scryfall 2022-12-08 confirms. ✅ Super State's mirrored hit is noncombat, so no commander damage (903.10a), and the Construct is not a commander anyway. ✅ Vexing Bauble counters our free casts (Scryfall 2024-06-07). ✅ Plan untaps a Tractor Beam target at end step.
- ✅ **A copy of Urza makes a Construct.** "enters as" a copy is a replacement effect (614.1c), so "When Urza enters" triggers (603.2, 603.6a). The legend rule (704.5j) is an SBA performed first (704.3, 117.5), then the waiting trigger goes on the stack and resolves independently of its source (603.3, 113.7a). Result: 1 Construct, and you keep the original Urza.
- ❌ **Hall of Echoes cannot do this.** It "becomes a copy" without entering, so there is no ETB (603.6a; compare 707.4).

## 5. Missed swaps, ranked
| In | Out | Why |
|---|---|---|
| **Flesh Duplicate** | Stonecoil Serpent | For {U}{U} it is a permanent N/N artifact Construct (Urza's ETB, §4), or Meteor Golem's, Thought Monitor's or Emeritus's ETB. Stonecoil is X/X for X, and had the builder's lowest synergy score among non-interaction cards (20). |
| **Donatello** (box) | Patchwork Automaton | It grows on token *entries*, plus "Flying". Patchwork grows only on casts, as a 1/1. |

**Stop proof per role:**
- **Swaps:** threats (two, above).
- **Near-ties:** engines (Foundry vs Visage Bandit / Owlin), draw (Well vs Lembas / Cam), removal (Tractor Beam vs Archive Arbiter / Living Library), protection (Flicker vs Hammer).
- **Holds:** ramp (the pool has no other 2-MV rock), finishers, counters, wipe, lands (the 37 floor).

## 6. Spot-check: 10 OUT rows
- ❌ Hammer (error 5), Donatello (error 4), Flesh Duplicate (error 15), Visage Bandit (error 16).
- ⚠️ Titan Forge ignores Plan (2 turns, not 4). Harmonized Crescendo's "only Thopters" misses Construct as a type.
- ✅ Mu Yanling, Burnished Hart, Coretapper, Plan for All Outcomes.

## 7. Plan and mana
- **Plans:** Primary is artifacts → Urza mana and Construct size → engines and Helm copies → Whirler, Passage or Kappa for unblockability; Super State and Kuruk speed up the kill. Backup is card advantage, fliers, Leveler, Dawnsire and Fleshraker pings. No card serves neither plan. Shape: T1–3 a 2-MV rock, Medallion, Sol Ring or a turn-1 Wayfarer's (38.6 %); T4–6 Urza (0.91), engines, Plan; T7–9 Constructs plus evasion.
- **Mana:** ✅ Blue is 33 lands + Sink + 4 {U} rocks + Urza, enough for Insight's UUU (32.5) and Counterspell's CC (27). ⚠️ {C} has 8 sources against 16 needed; accepted for a backup engine. ✅ Rocks: 3 true 2-MV accelerants, Sol Ring and Wayfarer's; the pool has no more, and 0.91 on curve clears the 0.85 flag.

## 8. Reality Fracture + copy effects
Weakest kept per role after the swaps: threats Hangarback, engines Golem Foundry, draw Witching Well, removal Tractor Beam, lands War Room / Island #31. ASSUMED cards count as owned; IF-OWNED cards win only as "if owned". The copy rules are in §4: a copy of Urza makes a permanent Construct; Hall of Echoes does not.

**Winners, ranked:**
1. Flesh Duplicate: **swap** for Stonecoil Serpent.
2. The Theorist, Jace Beleren: if owned, in for Witching Well.
3. Hall of Echoes: if owned, in for War Room.

Then the near-ties: Visage Bandit, Chandra, Archive Arbiter, Living Library.

| Card | Tier | IN/OUT | vs (weakest kept) | DB-quoted reason |
|---|---|---|---|---|
| **Flesh Duplicate** (pool) | owned, free | ✅ **IN** | Stonecoil Serpent | "enter as a copy of any creature" for {U}{U}. A copy of Urza gives an N/N Construct, and "vanishing 3" hits only the copy. Copying Meteor Golem destroys a permanent, Thought Monitor draws 2, and Emeritus enters prepared (Ancestral Recall for {U}). Stonecoil only gives X/X for X. |
| **Visage Bandit** (pool) | owned, 2 free | ⚠️ near-tie | Golem Foundry | A permanent copy for {3}{U}, or "Plot {2}{U}": Urza (a Construct), a nontoken Construct, Kappa or Emeritus. Foundry repeats a 3/3 Golem every 3 artifact spells. |
| Phyrexian Metamorph | 1 owned, sleeved in Inspirit | ❌ not free | Stonecoil Serpent | "it's an artifact in addition": the best Urza copier. It can come over only as a trade, with an Inspirit backfill. |
| Omni-Changeling (pool) | owned | OUT | Visage Bandit | The same copy at 5 MV with "Convoke". |
| Ember Island Production (pool) | owned | OUT | Worldwalker Helm (kept) | A "not legendary … 4/4 Hero" copy as a 5-MV sorcery. Helm copies the Construct for {1}{U}. |
| **Hall of Echoes** | IF-OWNED | ✅ if owned | War Room | "{5}: … becomes a copy of target creature you control" on the Construct makes an extra N+1 attacker each turn, and it stays a {C} land. Copying Urza gives no Construct (no ETB). |
| **The Theorist, Jace Beleren** | IF-OWNED | ✅ if owned | Witching Well | "At the beginning of each opponent's draw step, you draw a card": 3 cards a round in a pod. |
| Chandra, Chill of Compliance | IF-OWNED | ⚠️ near-tie | Mazemind Tome | "+1: Surveil 1 … put that card into your hand" triggers Planetarium every turn. |
| Archive Arbiter | ASSUMED | ⚠️ near-tie | Tractor Beam | A 6-MV 4/4 flying artifact: "Destroy target noncreature, nonland permanent". Tractor Beam's 4-mana steal is more efficient. |
| Living Library | ASSUMED | ⚠️ near-tie | Tractor Beam | A 2-MV artifact with "{6}, Sacrifice …: … shuffles it into their library": 8 mana in total. |
| Medic's Kitesail | ASSUMED | OUT | Whirler Rogue | "flying" at "Equip {2}" can still be blocked. Whirler's "can't be blocked" is the real evasion. |
| Arni, Humble Scribe | ASSUMED | OUT | Witching Well | "{T}: Draw a card, then discard a card" is a loot only. |
| Fblthp, Impossibly Lost | ASSUMED | OUT | Witching Well | A one-shot "draw two cards", after which the owner "shuffles him into their library". |
| Hapatra, the Desert Frost | ASSUMED | OUT | Tractor Beam | Stun on ETB; "{2}{U}: Untap target creature" gains no mana. |
| Hexhaven Dueling Arena | ASSUMED | OUT | War Room | "{4}, {T}: … becomes prepared" pays off only with Emeritus. |
| Perfected Theory | ASSUMED | OUT | Strix Serenade | Base P/T "until end of turn" only. |
| Precise Redaction | ASSUMED | OUT | Negate | "Counter target white or black spell": narrow. |
| Proft, Consulting Detective | ASSUMED | OUT | Witching Well | "pay {2} … draw a card" per scry, with about 4 enablers. |
| Ruric Thar, Biomagus | ASSUMED | OUT | Steel Hellkite | A 6-MV 4/6 flier with no artifact link. |
| Yargle, Goliath of Otaria | ASSUMED | OUT | Hangarback | A vanilla 3/9 for 5. |
| Yuriko, Hope from the Shadows | ASSUMED | OUT | Mishra's Bauble | "Surveil 2" with no draw. |
| Afterthought Sentry | ASSUMED | OUT | Hangarback | A 2/2 artifact with "{2}: … flying until end of turn". |
| Cryotheory Adept | ASSUMED | OUT | Hangarback | A "Prowess" 2-drop with no artifact link. |
| Divining Duelist | ASSUMED | OUT | Witching Well | A one-shot tap, untap or loot. |
| Icy Reception | ASSUMED | OUT | Strix Serenade | "unless its controller pays {3}": soft. |
| Infinite Coursework | ASSUMED | OUT | Tractor Beam | "loses all abilities and doesn't untap". Tractor Beam steals the creature instead. |
| Room of Refuge | ASSUMED | OUT | Island #31 | "This land enters tapped." |
| Sphinx's Approach | ASSUMED | OUT | Stock Up | "Draw two cards" for 3. Stock Up picks 2 of 5. |
| Surveillance Phantasm | ASSUMED | OUT | Witching Well | "Defender" plus "{3}{U}: Surveil 1". |
| Undulating Witness | ASSUMED | OUT | Emeritus of Ideation | A 5-MV 3/5 flier with "Basic landcycling {2}". |
| Darksteel Angel | IF-OWNED | OUT | Cityscape Leveler | "You can't lose the game": it does not win, and costs 9. |
| Diviner of Victory | IF-OWNED | OUT | Tractor Beam | Its bounce hits only "mana value 3 or less". |
| Jace's Machinations | IF-OWNED | OUT | Witching Well | "Empower Jace 8" for 3 is a slow draw. |
| Karn, Argent Defender | IF-OWNED | OUT | — (anti-synergy) | "Artifacts and creatures entering … don't cause abilities to trigger" kills Urza's Construct, Kappa and Whirler. |
| Lyra, Tolarian Archangel | IF-OWNED | OUT | Hangarback | Needs "three or more cards this turn" for a 3/3. |
| Memnarch, the Warden | IF-OWNED | OUT | Cityscape Leveler | 10 MV, and it draws only "Whenever Memnarch attacks". |
| Omnath, Locus of the Void | IF-OWNED | OUT | Golem Foundry | Rewards "unspent mana": off-plan. |
| Samut, Tyrant of Naktamun | IF-OWNED | OUT | — | "split second" for only 18 instants and sorceries. |
| Theorist's Proxy | IF-OWNED | OUT | Witching Well | "empower Jace 3" on a 0/3. |
| Theorist's Sanctum | IF-OWNED | OUT | Island #31 | Enters tapped unless you behold a Jace; "{2}{U}, {T}: Empower Jace 2" is a weak sink. |
| Emrakul, the Exigent Doom | IF-OWNED | OUT | Cityscape Leveler | A 10-MV 12/12 with no haste: it fails the win-turn test. |
| Seasoned Cryomancer | IF-OWNED | OUT | Witching Well | "draw two cards, then discard two cards" is card-neutral. |

## 9. Operator decisions still open
1. Confirm the hot swap: Urza comes from the Inspirit box, and Emry takes his Inspirit slot.
2. The two swaps: Flesh Duplicate ↔ Stonecoil Serpent; Donatello ↔ Patchwork Automaton.
3. Do you own The Theorist, Jace Beleren, Hall of Echoes or Chandra, Chill of Compliance? If so, they go in for Witching Well, War Room, and Mazemind Tome (near-tie) respectively.
4. Near-ties to flip if wanted: Visage Bandit ↔ Golem Foundry, Hammer ↔ Flicker, Cam ↔ Island #31, Archive Arbiter ↔ Tractor Beam.
5. Phyrexian Metamorph comes over only as a trade from Inspirit, with a backfill there.
6. Karn −2 from your collection: CR 903.11/903.11a; whether to use it is playgroup etiquette.
7. Registry: register the box's 27 Islands plus 4 more. Counterspell is fine: 3 owned, 1 each in Tam and Inspirit, so 1 is free. Register the FRA cards before applying.
