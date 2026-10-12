# Gilanra + Alena, engine-first build (Opus builder), 2026-10-07

**Verdict.** `final.txt` keeps **41 spells of MV ≥ 6** (sleeved 46; floor 40) and runs **39 lands** (sleeved 36). It makes 20 changes to the sleeved list.
- 7 big drops become better big drops. 6 non-engine cards become cheap ramp, fixing or interaction. 3 weak big drops and Diamond City + 3 Forests become 7 lands.
- Against the sleeved list: keep-7 .601 → **.727**, 4th land on T4 .835 → **.903**, 6+ spells cast by T8 9.03 → **12.09**, screwed .036 → **.008**, goldfish median T8 → **T7**.
- The engine holds: Gilanra draws 3.48 → **3.51**, Alena chain turns 3.96 → **3.92**.
- Locks kept: Paleoloth, Oblivion Sower, Etali, Greenwarden. I also lock **Planetarium of Wan Shi Tong** (gate lock) and **Sakiko** + **Savage Ventmaw** (attack mana feeds the next big drop in main phase 2).
- **Gate:** all PASS except `identity` FAIL (partner false negative; `identity.py`: none outside R/G). WARN on lands and on arenaNames (paper).
- **Physical:** no card from the Bumi box and neither Moraug nor Fury of Akoum is used. All 19 adds are `[FREE]` in `gruul/pool.md`; the gate's ownership check passes.

## §1 Plan
- **Engine (one sentence):** every 6+ drop paid with Gilanra's {G} draws a card, and every big creature that enters lets Alena tap for its power in {R}, which casts the next big drop.
- **T1–3:** a 1–2 MV dork/rock/Three Visits, then Gilanra on T2–3. Selvala or Trailblazer on T3.
- **T4–6:** Alena T4–5. First big drop. Draw engines: Soul, Sage, Packleader, Garruk, Kyoshi, Vortex.
- **Close T6–8:** Cyclops or Surrak haste + Thunderfoot or Pyrewood alpha. Backup: Terror/Warstorm + Apex/Big Bear ETB damage, or Myojin/Drakuseth.
- **Alena pays red only.** 16 of the 41 big drops need no {G} (Drakuseth, Myojin, BSA, Rorix, Tyrant, Etali, Sower, Planetarium, Cyclops, both cascaders, Gearhulk, Carnosaur, Emissary, Taskmaster, Warstorm). So: green fatty first with lands + Gilanra, then a red one with Alena.

## §2 Metrics (`sim6.py`, 25,000 games, seed 7, `metrics.log` + `metrics2.log`)
`sim6.py` = `gruul/gilanra/sim5.py` (itself an extension of `alena-gilanra/sim4.py`) plus these counters: Gilanra draws (her {G} spent on MV ≥ 6, T1–8) and Alena chains (a creature cast after Alena tapped, T1–10). It also adds main phase 2 after attack mana (Shriekwood, Ventmaw, Sakiko), plus Studious First-Year, Lumra, Realm Seekers, Nissa and more dorks. Keep rule: 3–5 lands, or 2 lands + an MV ≤ 2 ramp piece; first mulligan free, then London.

| Metric | Sleeved | `consistency.txt` | **`final.txt` (39)** | `final-38.txt` |
|---|---|---|---|---|
| Keep 7 | .601 | .717 | **.727** | .710 |
| 4th land on T4 | .835 | .896 | **.903** | .892 |
| Gilanra by T3 / Alena by T5 | .947 / .926 | .932 / .960 | .934 / .959 | .937 / .957 |
| 6+ MV spells cast by T8 | 9.03 | 8.08 | **12.09** | 12.08 |
| Gilanra draws by T8 | 3.48 | 3.44 | **3.51** | 3.51 |
| Alena chain turns by T10 | 3.96 | 3.59 | 3.92 | 3.95 |
| Screwed (< 4 sources T5) | .036 | .009 | **.008** | .009 |
| Flooded (> 8 lands seen by T8) | .626 | .737 | .822 | .804 |
| Spells cast T1–8 | 14.82 | 15.97 | **20.32** | 20.43 |
| Clock to 40, median (mean; by T7) | T8 (7.73; .479) | T7 (7.53; .522) | **T7 (7.47; .574)** | T7 (7.50; .556) |

- **Engine floor:** I keep 41, so no lower-count table is needed. `consistency.txt` (36 big drops) loses 0.37 chains and 0.04 draws against the sleeved list.
- **Alena chains −0.04:** more mana means Alena's tap is needed less. Sakiko → Topiary Panther gives chains +.19 and spells −2.83 (`screen-C.log`), so the metric falls as mana rises. 6+ casts (+3.06) are the engine's output.
- **Flood is literal:** "lands seen" counts every land drawn, and the list draws ~5 more cards by T8. Mana sinks (Planetarium, Garruk, Ghalta, Traverse) absorb it.
- **Sim limits:** blockers, removal and opponents are not modelled, so Sakiko's mana (all combat damage) is an upper bound. Realm Seekers' X is modelled as 12 + own hand.

## §3 Swaps (sleeved → final; the "back" column = the sleeved card put back into `final.txt`, 8,000 games, `screen-final.log`)
| # | Out | In | Role | Why (DB) | Back |
|---|---|---|---|---|---|
| 1 | Avatar of Slaughter | Apex Devastator | big drop | "All creatures have double strike…" is symmetric → "Cascade, cascade, cascade, cascade": MV 10 draws off Gilanra, Alena taps 10, 39 of the 57 cascade hits are 6+ MV | spells −2.10, 6+ −1.44 |
| 2 | Calamity | Gigantic Big Bear | big drop | 4/6 "Haste" (Alena 4) → 10/7 "Hexproof, haste" (Alena 10) | by T7 −.020 |
| 3 | Conclave Sledge-Captain | Slavering Branchsnapper | big drop / land | 4/4 "Backup 1…" for 6 → 7/6 "Trample", "Forestcycling {2}" | 4th land −.018 |
| 4 | Nessian Wilds Ravager | Saber-Tooth Moose-Lion | big drop / land | "Tribute 6" (opponent picks) → 7/7 "Reach", "Forestcycling {2}" | 4th land −.019 |
| 5 | Emergent Woodwurm | Spinewoods Armadillo | big drop / land | 4/4 "Backup 3" for 7 → 7/7 "Ward {3}", "{1}{G}, Discard this card: Search … basic land" | 4th land −.021, spells −.31 |
| 6 | Havoc Eater | The Legend of Kyoshi | big drop / draw | 3/3, counters depend on opponents → "I — Draw cards equal to the greatest power…", flips into a mana creature | spells −1.18, by T7 −.032 |
| 7 | Hoard-Smelter Dragon | Cleanup Crew | answer | "{3}{R}: Destroy target artifact" → artifact **or enchantment** or graveyard card; the deck had no enchantment answer | ±0 (near-tie §7) |
| 8 | Fling | Poison Dart Frog | ramp | "sacrifice a creature" → "{T}: Add one mana of any color"; Gilanra T2 | keep −.015 |
| 9 | Planar Engineering | Three Visits | ramp | 4 MV, "Sacrifice two lands" → 2 MV untapped Forest (finds Thicket) | keep −.011, spells −.24 |
| 10 | Roxanne | Ilysian Caryatid | ramp | 5 MV, Meteorite "tapped" → 2 MV, "add two mana" with power ≥ 4 | spells −.89 |
| 11 | Slinza | Tangled Florahedron | ramp / land | "Beast spells … cost {2} less" (6 Beasts) → 2 MV dork or land | keep −.014, spells −.39 |
| 12 | Foe-Razer Regent | Selvala | ramp / draw | 4/5 fight → "Add X mana … greatest power" and a draw on each biggest ETB | spells −1.04, by T7 −.023 |
| 13 | Ruric Thar | Beast Within | answer | "Whenever a player casts a noncreature spell, Ruric Thar deals 6 damage to that player" hits us for each of 12 noncreature spells → instant "Destroy target permanent" | sim +.28 spells for Ruric (self-damage unmodelled) |
| 14 | Bane of Progress | Mountain (37th land) | land | "destroy all artifacts and enchantments" kills Sol Ring, Signet, Talisman, Planetarium, Vortex, Warstorm, Cyclops, both Gearhulks | keep −.026, by T7 −.024 |
| 15 | Spearbreaker Behemoth | Konstrari Annex (38th) | land | 5/5; "{1}: … indestructible" needs held mana the deck spends → R/G land | spells −.78, by T7 −.037 |
| 16 | Sweet-Gum Recluse | Evolving Wilds (39th) | land | 0/3; its cascade hits a ≤ 5 MV mana piece → R/G fetch | keep −.015, 4th land −.018 |
| 17 | Diamond City | Sheltered Thicket | colour | "{T}: Add {C}" → "Mountain Forest", "Cycling {2}" | spells +.34 (colour wins, §5) |
| 18–20 | Forest ×3 | Horizon of Progress, Fabled Passage, Riveteers Overlook | colour | basics → R/G sources for RRR and 1GG (§5) | ±0 / ±0 / +.33 spells for a Forest (R 26.5 < 26.63 without it) |

## §4 Stop proofs (best unused vs weakest kept, single swaps, 6,000 games; logs `screen-A`…`E`, `screen-final`)
| Role | Weakest kept | Best unused → result |
|---|---|---|
| Land count | 39th land | 40 (−Rorix +Forest, `metrics3.log`): keep +.012, 6+ casts +.21, by T8 +.009, chains −.02, flood +.021, and it leaves exactly 40 big drops · 38 = `final-38.txt` (keep −.017, by T7 −.018) |
| Taplands | Konstrari Annex, Riveteers Overlook | as basics: spells +.27 / +.33, but R or G falls below 26.63 (§5) · Gruul Turf cut (Turf → Forest: spells +.31, Gilanra T3 +.020, `screen-C`) |
| Rocks | Talisman | Paradise Druid for Talisman/Signet: spells −.86 / −1.17 · Chromatic Lantern (prior: keep −.012, spells −.28) → stop |
| Dorks | Ruby, Frog | Paradise Druid for Ruby −.36 · Channeler Initiate, Elvish Archdruid, Loot the Nexus, Domri for Frog: −.24 to −.54 → stop |
| Land ramp | Three Visits, Traverse | Planar Engineering −.24 · Skyshroud Claim for Traverse −.71 · Rampant Growth < a Forest (`screen-A`) · Cultivate < Claim → stop |
| Draw | Shamanic, Packleader, Vortex | Master's Guidance for each: −.71 / −.40 / −2.41 · Harmonize for Vortex −1.32 · Cream < Vastlands → stop |
| Haste | Surrak | Samut: +.09 to +.46 spells, by T7 ±.02 across three runs → near-tie, the sleeved card stays |
| Answers | Beast Within, Cleanup Crew | Fling for Beast Within −.46 · Hoard-Smelter / Tyrant for Cleanup ±0 (Tyrant now kept as a big drop) · Terastodon for Rorix −.37 |
| Fatty slot | Ulvenwald Observer, Dawnglade | Realm Seekers +.53 / +.59 spells, by T7 −.010 / +.005, chains −.05 / −.07, X assumed → near-tie · Avatar Kyoshi, Lumra, Avenger, Broodmaster, Molimo, Havoc Eater, Terastodon as the 100th card: all ≤ the open slot's alternatives (`screen-A`) |
| Landcyclers | Branchsnapper | Topiary Panther / Orchard Strider lost to the sleeved bodies (Observer, Sakiko: `screen-B/C`) → only 4 cyclers stay |
| Walkers | — | Nissa, Who Shakes the World for Shamanic/Traverse/Surrak/Terror/Observer: −.15 to −.95 · Domri −.12 to −.24 → stop |
| Vastlands Scavenger | — | for Tyrant: 6+ casts −.21, Gilanra −.04, chains −.06 → Tyrant (sleeved, removal, payable with Alena's R) stays |

Unmodelled cards ruled out on text: Mana Reflection, Primeval Bounty and Omnipresence do nothing on the turn they land. Verdant Confluence and Through the Forest Gate are 6–8 MV sorceries with no board. Kozilek, Breaker of Creation and Devourer of Destiny need {C}{C}, which only Sol Ring makes. Cityscape Leveler was not located (Urza log).

**Synergy** (`gruul/gilanra/synergy2.py`): sleeved median 30 → final **median 24**, min 0. The 5 lowest are Sol Ring, Signet, Talisman, Beast Within and Shamanic Revelation, all judged on efficiency.

## §5 Lands (39: 15 Forest, 16 Mountain, Command Tower, Sheltered Thicket, Fabled Passage, Evolving Wilds, Riveteers Overlook, Horizon of Progress, Konstrari Annex, Spinerock Knoll)
- **Karsten simulation rule:** 42 with Sol Ring, −1 for Signet + Talisman, −2 for six cheap dorks (Llanowar, Frog, Caryatid, Florahedron, Ruby, Selvala) = **39**.
- **Karsten regression:** 31.42 + 3.13 × 5.39 − 0.28 × 9 = 45.8. It counts neither the 4 landcyclers nor the MDFC (0.38): 45.8 − 4.4 ≈ 41. The gate's "45 ±2" is the raw regression.
- **Sim sweep** (25k): 38 / 39 / 40 = keep .710 / .727 / .739, by T7 .556 / .574 / .574, by T8 .899 / .906 / .915, 6+ casts 12.08 / 12.09 / 12.30 (40 = −Rorix, `final-40.txt`). 40 is a near-tie that the goldfish slightly favours; 39 matches the Karsten simulation rule and keeps one big drop of slack over the floor. **38-land variant:** `final-38.txt` = −1 Mountain +Sweet-Gum Recluse.
- **Colours** (`colours3.py`, Karsten 99-card scaled to 39): R for {3}{R}{R}{R} needs 26.63, has 27.50. G for {1}{G}{G} (Selvala) needs 26.63, has 26.75. Every other row is OK.
  - Any further dual → basic breaks one colour, which is why Annex, Overlook and Wilds stay.
- **Taplands:** Thicket, Wilds, Overlook, Annex, Knoll and early Passage ≈ 6, under the pod budget of ≈ 15.

## §6 Gate (`gate.txt`)
```
size PASS · singleton PASS · legality PASS · rules PASS · identity FAIL (partners: gate reads Gilanra) · ownership PASS
arenaNames WARN · lands WARN 39 (+MDFC 39.4) vs 45±2 · plan PASS 41/59 · curve PASS avg MV 5.39 · wincons PASS 40 · locks PASS
```
`identity.py final.txt`: 100 cards, none outside R/G. Curve (nonland): 1-drops 2, 2-drops 7, 3-drops 4, 4-drops 2, 5-drops 5, 6-drops 31, 7+ 10 (incl. Gilanra and Alena).

## §7 Near-ties (operator's call)
- **Realm Seekers ↔ Ulvenwald Observer / Dawnglade Regent:** +.5 spells in the sim. Its X ("total number of cards in all players' hands") is assumed to be 12 + our hand. Observer draws on every toughness-4 death in a wipe.
- **Samut ↔ Surrak:** within noise. Samut is a walker (survives creature wipes) and gives team haste.
- **Hoard-Smelter Dragon ↔ Cleanup Crew** (±0) · **Fling ↔ Poison Dart Frog** (Fling by T7 +.013, Frog keep +.015) · **Avatar of Slaughter ↔ Rorix** (goldfish favours the symmetric double strike).
- **Sakiko:** the sim's biggest single card (+2.8 spells), but every point assumes unblocked damage.
- **Physical pulls (19 free cards):** Apex Devastator, Gigantic Big Bear, The Legend of Kyoshi, Slavering Branchsnapper, Saber-Tooth Moose-Lion, Spinewoods Armadillo, Cleanup Crew, Poison Dart Frog, Three Visits, Ilysian Caryatid, Tangled Florahedron, Selvala, Beast Within, Sheltered Thicket, Horizon of Progress, Fabled Passage, Riveteers Overlook, Evolving Wilds, Konstrari Annex, + 1 Mountain.
