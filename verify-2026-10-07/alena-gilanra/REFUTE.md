# Refute: Gilanra + Alena converged build (Opus refuter, fresh context), 2026-10-07

**Verdict: NOT CONVERGED.** All 11 builder swaps hold ✅, but the pass missed 2 clear improvements (3 cards):
- **Lands:** −1 Forest, −1 Mountain → +Fabled Passage, +Sheltered Thicket. Both colours were short, not only red.
- **Finisher:** −Avatar of Slaughter → +Moraug, Fury of Akoum.

`final.txt` = `proposed.txt` + these 3 changes. It still has 36 lands. Gate: all PASS except the expected `identity` FAIL; `lands`/`arenaNames` WARN.

## §1 Errors (DB text unless marked)
| # | Builder claim | Finding (source) | Sev. | List? |
|---|---|---|---|---|
| 1 | §3/#11 "green has a surplus" | It was checked only against {4}{G}{G}. Selvala and Vastlands are {1}{G}{G}: Karsten 1CC needs 28/41 × 36 = **24.6** green. Surrak {2}{G}{G} needs 22.8. Green at MV 3 = 17 Forest + Tower + Turf + Signet .75 + Talisman .75 + Llanowar .5 + Ruby .5 + Lore .75 = **22.25**. Both colours are 2.35 short. | MED | ✅ duals |
| 2 | §4 lands: "an untapped basic beats a tapped dual on turn 2" | Only 2 of 62 spells cost 1 (Sol Ring, Llanowar), so a tapland is usually free on turn 1. Fabled Passage: "Then if you control four or more lands, untap that land". Sheltered Thicket is "Land — Mountain Forest", so Nature's Lore ("a Forest card"), Farseek ("…or Mountain card"), Elvish Aberration (Forestcycling) and Ulvenwald Hydra can all fetch it. Sim cost: −1 pt at T5, 0 at T6 (§3). | MED | ✅ |
| 3 | §4 finisher stop proof (Avatar ↔ Overrun) | It never tested Moraug: "Landfall — Whenever a land you control enters, if it's your main phase, there's an additional combat phase after this phase. At the beginning of that combat, untap all creatures you control." Scryfall ruling 2020-09-25: two landfalls in main 2 give two consecutive extra combats, each with an untap. See §4. | MED | ✅ |
| 4 | #5 Ruric Thar: "This list casts 14 noncreature spells" | 7 of the 14 are T1–3 ramp/MG, cast before a 6-drop Ruric lands. The claim also ignores the pod upside: "deals 6 damage to that player" for every opponent noncreature spell, which taxes their removal too. The builder's own §4 names Boarding Party as the weakest threat → the cut is a near-tie with Boarding Party. | MED | no |
| 5 | #10 Turf "+1 mana from turn 3" | "return a land you control to its owner's hand": the turn Turf is played costs a land drop. Mana then equals the basic line until land drops run out. The gain is one extra land card, not +1 mana from T3. Turf still beats colourless Diamond City. | LOW | no |
| 6 | §3 "Alena covers RRR from her second turn" | "…greatest power among creatures you control **that entered this turn**". So RRR is paid only for the 2nd creature after another creature has entered that turn. | LOW | no |
| 7 | §3 keepable .643 (proposed) | With the 7 cheap pieces named (MV ≤ 2), multivariate hypergeometric gives **.628**; .643 is the value for 8 cheap. So "same gain as +2 lands (.636)" is really ≈ +1.5 lands. | LOW | no |
| 8 | #8 Phoenix "cascade hits … mostly a 2-MV rock" | 7 of the 20 nonland MV ≤ 5 cards are MV ≤ 2 mana pieces (35 %). The rest include Terror, Packleader, Slinza, Vortex, Selvala. Swap still right: MG draws every end step at MV 3. | LOW | no |
| 9 | #3 Selvala "6–10 mana … every turn" | "{G}, {T}: Add X": net X − 1. Before a fatty lands, X = 2–4. The draw is symmetric: "its controller may draw … greater than each other creature's power" includes opponents' creatures. | LOW | no |
| 10 | #1/#2 quotes | Cleanup Crew quote silently drops 2 of its 4 modes. Beast Within quote drops "Its controller creates a 3/3 green Beast creature token." | LOW | no |
| 11 | #7 "47 creatures"; Bind to Life | 48 creatures in the 99; P(≥ 1 in 7) = .996. Bind to Life "put[s] … onto the battlefield", which is not a cast: no Gilanra draw, no Vortex discover, no Sage, Taskmaster or Sower cast trigger. ETB/enter triggers and Alena still work. Copy costs {4}{G} (Scryfall ruling 2026-03-20: not an alternative cost). | LOW | no |
| 12 | §1 backup "direct damage that needs no board" | Myojin, Burning Sun's Avatar and Combustible are creatures. This axis is ≈ 21 + 3 + whatever the opponent allows, vs 120 pod life, so it is a thin backup. | LOW | no |
| 13 | §4 protection count includes Big Bear | Big Bear's hexproof protects only itself. Team protection = Spearbreaker, Dawnglade, Emissary (one redirect). | LOW | no |
| 14 | sim.py | Reproduces exactly. Biases: noncreature 6-drops (Garruk, Planetarium, Warstorm, +Kyoshi) give Alena 6; MG/Beast Within/Fling set power 4 (inflates Selvala); 7–12 MV cost 6; Alena is cast first at ≥ 5 mana (masks ramp at T5); taplands are never played on T1; Turf is a plain tapland. Corrected runs keep the builder's deltas (§3). | LOW | no |
| 15 | §5 synergy | Reproduced (median 30 → 32). 5th-lowest is a three-way tie at 1 (Lore, Farseek, Planar Engineering). Sakiko had no payoff rule (undercounted). | LOW | no |

Verified verbatim (DB, Scryfall for the back face): Avatar Kyoshi 5/4 and its "{T}: Add X mana of any one color…"; Master's Guidance (both abilities); Big Bear; Farseek; Nature's Lore; Gruul Turf; Rorix; Ruric; Observer; Shamanic; Hoard-Smelter; Bane; Fling; Sakiko; every §4 quote. 12 legendary creatures ✅, 14 noncreature spells ✅, Emissary = Rorix's body ✅.

## §2 Swap verdicts
| # | Out → In | Verdict | Reason |
|---|---|---|---|
| 1 | Bane of Progress → Cleanup Crew | ✅ KEEP | Bane destroys 9 of our own permanents (11 with MG + Kyoshi). Crew is a 6/6 (Alena 6, Gilanra draw) with a targeted answer. |
| 2 | Fling → Beast Within | ✅ KEEP | Fling's only upside is single-target reach; Beast Within is the only instant answer to any permanent. |
| 3 | Sakiko → Selvala | ✅ KEEP | Sakiko is a 3/3 whose mana needs connected hits. Selvala ramps from T4 and scales with every fatty (net X − 1). |
| 4 | Rorix → Nature's Lore | ✅ KEEP | Vanilla RRR flyer; Emissary duplicates the body. Lore is an untapped T2 Forest (or Thicket). |
| 5 | Ruric Thar → Farseek | ✅ KEEP (near-tie on the cut) | Farseek is right: red fix, and it can fetch Thicket. Ruric ≈ Boarding Party as the card to cut (error 4); operator's call. |
| 6 | Shamanic Revelation → Kyoshi | ✅ KEEP | MV 6 (Gilanra draws); I draws greatest power; II makes a hasty X/X land; III is a mana creature. Strictly more. |
| 7 | Ulvenwald Observer → Vastlands Scavenger | ✅ KEEP | 3-MV 4/4 deathtouch that feeds Trailblazer, Packleader and MG; Bind to Life cheats the best fatty of 7 for 5. |
| 8 | Aurora Phoenix → Master's Guidance | ✅ KEEP | A card every end step from Alena alone beats a 5/3 cascade (claim 8 is wrong, but the verdict stands). |
| 9 | Hoard-Smelter → Gigantic Big Bear | ✅ KEEP | Power 10 = Alena 10, Selvala 9 net, Kyoshi 10. Hexproof and haste. Crew and Beast Within cover artifacts. |
| 10 | Diamond City → Gruul Turf | ✅ KEEP | Colourless vs R+G. The "+1 mana" reason is wrong (error 5). |
| 11 | Forest → Mountain | ✅ KEEP | Red 21.25 → 22.25, green 23.25 → 22.25: the shortfalls are now equal. The real fix is duals (§4 #1). |

## §3 Numbers re-checked (`refute/numbers.py`, `refute/sim2.py`, `refute/sim3.py`)
- **Karsten regression ✅:** current 47.7 (avg MV 5.66, 5 cheap); proposed 46.5 (5.44, 7); final 46.4 (5.40, 7). The gate's 45 ± 2 has the same source. 36 is the operator's call; the builder's verdict (no land change) is sound.
- **Opening 7:**

  | Config | P(≥ 3 lands) | Keepable (2–5 lands, lands + cheap ≥ 3) |
  |---|---|---|
  | 36 / 5 cheap (current) | .501 ✅ | .596 ✅ |
  | 36 / 7 cheap (proposed, final) | .501 ✅ | **.628** (builder: .643 ❌) |
  | 38 / 5 cheap | .548 ✅ | .636 ✅ |
  | 37 / 7 cheap | .525 | .648 |

- **Red sources ✅ (builder):** {3}{R}{R}{R} needs 24.6. Current 19.0, proposed 22.25.
- **Final colours:** red = 20 lands (15 Mountain, Tower, Knoll, Turf, Passage, Thicket) + 3.25 = **23.25**; green at MV 3 = 20 lands + 3.25 = **23.25**. Both +1 over proposed, still ~1.35 short of 24.6. A 3rd dual reaches 24.25 (near-tie, §4).
- **Sim (25k games, colour ignored):**

  | Config | 6-drop T5 / T6 | 6-drops by T8 | ≤ 1 fatty by T7 |
  |---|---|---|---|
  | builder current / proposed | .75 / .88 → .75 / .91 | 5.47 → 5.21 | .07 → .05 |
  | corrected (noncreature fixed), seeds 1 and 2 | .75 / .88 → .75 / .91 | 5.39 → 5.15 | .08 → .06 |
  | T1-tapland policy: current / proposed / **final** | .77 / .89, .78 / .92, **.77 / .92** | 5.41, 5.18, **5.16** | .08, .06, **.06** |

  - The two duals cost 1 point at T5, 0 at T6 and 0.02 fatties, for +1 source of each colour.
  - The 38-land option is +2 pts at T6 (.91 → .93): a near-tie, as the builder said.
- **Synergy ✅:** current median 30, proposed 32, final 32. The builder's script has no Moraug rule; with a rule the same as Avatar's plus the landfall cards, Moraug has 58 links and Avatar of Slaughter's slot is replaced like for like.

## §4 Missed swaps (ranked; 1–2 applied in `final.txt`)
1. **−1 Forest −1 Mountain → +Fabled Passage +Sheltered Thicket** (both free in the pool).
   - +1 red and +1 green source each. Lore, Farseek, Aberration and Hydra can fetch Thicket, so those cards fix both colours.
   - Passage is untapped from land 4, and it is two landfalls (Rampaging Baloths, Moraug).
   - Thicket cycles {2} when flooded. Taplands: 2 → 4 (Passage only early), far below the ≈ 15 pod budget.
2. **−Avatar of Slaughter → +Moraug, Fury of Akoum.**
   - Win turn with a board of n creatures and total power P held since the turn began:
     - Avatar (8 MV) deals 2P, but opponents' blockers get double strike and every creature "attack[s] each combat if able" on their turns too.
     - Moraug (6 MV, one-sided) attacks normally (+1 each), then a main-2 land gives an extra combat with an untap (+2 each): **2P + 3n**. Passage or a 2-land fetch gives 3 combats (**3P + 6n**).
   - Traverse (X basics), Planar Engineering (4), Hydra, Sower's stolen lands, Lore, Farseek and Turf all make extra combats.
   - With no land available, Moraug is a 6/6 for 6 that still feeds Gilanra (MV 6) and Alena (6).
3. **Near-ties, not applied (operator's call):**
   - Ruric Thar ↔ Boarding Party as the Farseek cut (error 4).
   - Domri, Anarch of Bolas ↔ Boarding Party: 3-MV +1 R/G every turn, +1/+0 to Alena/Selvala X, −2 fight.
   - 3rd dual (Evolving Wilds/Terramorphic) ↔ basic (24.25/24.25).
   - Studious First-Year // Rampant Growth ↔ Boarding Party.
   - Lumra ↔ Ulvenwald Hydra.
   - Rocky Rebuke / Clear Shot ↔ Havoc Eater.
   - Tyvar's Stand / Guardian Augmenter ↔ Emissary.
   - Also the builder's §7 list.
4. **Swept with no change:**
   - Ramp: rocks MV 3–4, dorks, Cultivate/Three Visits, Explore.
   - Draw: Harmonize, Hunter's Insight, You Meet in a Tavern.
   - Removal: Violent Echoes, Savage Smash, Knockout Maneuver.
   - Protection: Warg Tactics, Silkguard.
   - Finishers: Overrun, Omnipresence, Crystalline Armor, Steel Hellkite.
   - Lands: Konstrari Annex / Bristling Backwoods (tapped duals, weaker than Thicket), Riveteers Overlook, Exotic Orchard, Rumble Arena / Conduit Pylons (filter lands).
   - No other card clearly beats the weakest kept card of its role.
- **Closers on the win turn (final):**
  - Same-turn impact: Pyrewood (+2/+2, menace), Thunderfoot (+2/+2 trample, static), Moraug (extra combats), Warstorm/Terror (power as damage per ETB), Taskmaster (steals, annihilator, haste), Big Bear (10 haste), Myojin (21).
  - Need a turn or Cyclops/Surrak haste: Drakuseth, Ghalta.

## §5 Final list
- **`final.txt`:** 100 cards, 36 lands (15 Mountain, 16 Forest, Command Tower, Spinerock Knoll, Gruul Turf, Fabled Passage, Sheltered Thicket); avg MV 5.40. Identity check (`identity.py`): 100 cards, none outside R/G.
- **Gate:**
  ```
  size PASS · singleton PASS · legality PASS · rules PASS · identity FAIL (expected, first commander only) · ownership PASS
  arenaNames WARN (paper) · lands WARN 36 vs 45±2 · plan PASS 42/62 · curve PASS avg MV 5.40 · wincons PASS 43 · locks PASS (Planetarium)
  ```
