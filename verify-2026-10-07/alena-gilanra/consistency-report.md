# Gilanra + Alena: consistency pass (Opus builder), 2026-10-07

**Verdict.** `consistency.txt` makes 13 changes to `final.txt` and runs **38 lands** (36 → 38) plus the Tangled Vale MDFC.
- 11 changes from the first pass: 7 fatties and Planar Engineering out; 3 landcyclers, 4 cheap mana/selection pieces and Skyshroud Claim in; 2 fatties become fetch lands.
- 2 changes from the Omo box: **Apex Devastator** for Shriekwood Devourer, and **Horizon of Progress** for a Mountain. The other 42 new pool cards were each judged; none beats the weakest kept card of its role (§5).
- Against `final.txt`: keep-7 .638 → **.725**, 4 land drops .835 → **.891**, 6+ threat by T6 .924 → **.957**, screwed .026 → **.009**, spells cast T1–8 12.20 → **14.19**, 6+ threats cast by T8 6.38 → **6.92**.
- **Price:** the literal flood metric gets worse (.580 → .693). Idle turns, the honest flood measure, stay low (.159).
- **36-land option:** `cons/c36.txt` (keep .685, T6 .951, spells 13.83).
- **Gate:** all PASS except the expected `identity` FAIL; `lands`/`arenaNames` WARN. `identity.py`: 100 cards, none outside R/G.

## §1 Metrics (`sim4.py`, 30,000 goldfish games each, seed 7)
| List | Lands | Keep 7 | 4 drops T1–4 | 6+ threat T5 / T6 | Spells T1–8 | Screwed | Flooded / mean | Idle T5–8 | Extra draws | 6+ by T8 |
|---|---|---|---|---|---|---|---|---|---|---|
| Sleeved (`deck.txt`) | 36 | .604 | .837 | .770 / .906 | 11.61 | .036 | .481 / 3.75 | .087 | 11.18 | 6.44 |
| `final.txt` | 36 | .638 | .835 | .784 / .924 | 12.20 | .026 | .580 / 4.35 | .098 | 12.31 | 6.38 |
| first pass (`cons/consistency-pre-omo.txt`) | 38 | .720 | .893 | .802 / .957 | 12.99 | .007 | .655 / 5.17 | .172 | 12.65 | 6.22 |
| **`consistency.txt`** | **38** | **.725** | **.891** | **.800 / .957** | **14.19** | **.009** | .693 / 6.11 | .159 | **14.35** | **6.92** |
| 36 (`cons/c36.txt`) | 36 | .685 | .870 | .790 / .951 | 13.83 | .011 | .636 / 5.34 | .135 | 13.82 | 6.81 |
| 37 (`cons/c37.txt`) | 37 | .701 | .881 | .797 / .954 | 14.02 | .009 | .665 / 5.70 | .140 | 14.12 | 6.86 |
| 39 (`cons/c39.txt`) | 39 | .741 | .904 | .812 / .960 | 13.97 | .006 | .710 / 6.20 | .175 | 14.18 | 6.86 |

**Definitions.**
- Keep 7: 3–5 lands, or 2 lands + an MV ≤ 2 ramp piece. The first mulligan is free (pod), then London 6 (2–5 lands) and 5.
- 4 drops: a land played from hand on each of T1–T4. Screwed: < 4 lands + rocks + dorks at the end of T5, commanders excluded.
- Flooded: lands in hand + battlefield lands beyond 8 at the end of T8, ≥ 3. It rises with every land and every extra draw, so Apex's cascades raise it.
- Idle: turns T5–8 ending with ≥ 3 mana unspent and no spell in hand. That is the real flood cost; the Omo swaps lower it (.172 → .159).

**Land count, recommended: 38.** It peaks spells cast (14.19 vs 14.02 at 37 and 13.97 at 39). From 36 it adds +.040 keep, +.021 land drops, +.006 T6 and +.36 spells; the cost is +.057 flood.
- c36 = `consistency.txt` −Evolving Wilds −1 Mountain +Emergent Woodwurm +Greenwarden; c37 = −1 Mountain +Greenwarden; c39 = −Sweet-Gum Recluse +1 Forest.
- **Ramp combinations:** 38 lands made by cutting Caryatid + Florahedron instead of fatties: keep .689 vs .720 ❌. 37 lands + Studious First-Year ≈ 38 lands (near-tie). Cultivate ≈ Planar Engineering < Skyshroud Claim.

**Model** (extends `refute/sim3.py`, card-level).
- Kept from sim3: pod T1 draw; Gilanra's mana on a 6+ spell draws; Alena = R equal to the greatest power that entered this turn, from her second turn; Selvala nets X − 1. Colour is modelled (R/G/either/C units).
- Modelled effects: Kyoshi, Bind to Life, Vortex/cascade/discover, Planetarium, Garruk +1, monarch, Regal, the draw engines, Cream, landcycling, Thicket cycling, Turf, fetches, Sower, Ghalta/Slinza.
- Added for the Omo box: Dryad (extra land, lands any colour), Lantern, Yavimaya, Horizon, Lair, Desert cycling, Sage/Frog dorks, Rejuvenator/Vinewall/Wayfinder/Scrying/Hour, Vivien +1, Mana Reflection, Apex ×4 cascade, Broodmaster, Sundial, Ramunap.
- Regression: the first-pass list reproduces exactly (.720 / .893 / 12.99).
- Not modelled: combat, removal, opponents, attack triggers (Shriekwood, Etali), and recursion (Paleoloth, Greenwarden). Those were judged on text.

## §2 Swaps vs `final.txt` (DB text; gain = single swap, 20k games unless marked)
| # | Out | In | Role | Gain |
|---|---|---|---|---|
| 1 | Conclave Sledge-Captain: 4/4, "Backup 1, backup 1, backup 1 … Trample" | Slavering Branchsnapper: 7/6 "Trample", "Forestcycling {2}" | fatty + land tutor | 4 drops +.018, T6 +.004 |
| 2 | Calamity, Galloping Inferno: 4/6 "Haste" … "Saddle 1" | Saber-Tooth Moose-Lion: 7/7 "Reach", "Forestcycling {2}" | same | 4 drops +.021, screw −.004 |
| 3 | Nessian Wilds Ravager: "Tribute 6 …" (the opponent decides) | Spinewoods Armadillo: 7/7, "{1}{G}, Discard this card: Search your library for a basic land card or a Desert card" | same | 4 drops +.022, screw −.005 |
| 4 | Boarding Party: 6/3 "Haste", "Cascade" | Three Visits: "Search your library for a Forest card, put it onto the battlefield" | 2-MV ramp | keep +.021, T5 +.009 |
| 5 | Foe-Razer Regent: 4/5 flyer, fight on ETB | Tangled Florahedron: "{T}: Add {G}." // Tangled Vale | dork / MDFC land | keep +.022, T6 +.006 |
| 6 | Havoc Eater: 3/3 flyer, goad | Cream of the Crop: "look at the top X cards … where X is that creature's power … put one of those cards on top" | selection | flood −.043, 4 drops +.007 |
| 7 | Savage Ventmaw: 4/4, mana on attack | Ilysian Caryatid: "{T}: Add one mana of any color. If you control a creature with power 4 or greater, add two mana" | dork | keep +.015, T6 +.009 |
| 8 | Planar Engineering: "Sacrifice two lands. Search … four basic land cards … tapped" | Skyshroud Claim: "Search your library for up to two Forest cards, put them onto the battlefield" | 4-MV ramp | spells +.19 |
| 9 | Emergent Woodwurm: 4/4 for 7, backup 3 | Riveteers Overlook: "search your library for a basic Swamp, Mountain, or Forest card, put it onto the battlefield tapped" | 37th land | keep +.017, T6 +.005 |
| 10 | Greenwarden of Murasa: "return target card from your graveyard to your hand" | Evolving Wilds: "Search your library for a basic land card, put it onto the battlefield tapped" | 38th land | keep +.020, spells +.08 |
| 11 | 1 Forest | 1 Mountain | colour | RRR fix (§4) |
| 12 | Shriekwood Devourer: 7/5 "Trample", "Whenever you attack with one or more creatures, untap up to X lands, where X is the greatest power among those creatures." | **Apex Devastator** (from Omo): {8}{G}{G} 10/10 "Cascade, cascade, cascade, cascade (… Multiple instances of cascade each trigger separately.)" | threat + card advantage | spells **+1.14**, extra draws +1.60, idle −.016, T6 −.003 |
| 13 | 1 Mountain | **Horizon of Progress** (from Omo): "{T}, Pay 1 life: Add one mana of any type that a land you control could produce." / "{1}, {T}, Sacrifice this land: Draw a card." | untapped dual + flood valve | 60k: T5 +.006, T6 +.003, spells +.15; G 1CC 26.0 → 27.0 |

- **Apex:** at MV 10 it draws off Gilanra's mana; Alena taps for 10 R the turn it enters; each of the four cascades casts a nonland card with MV ≤ 9 for free (6+ threats by T8 ≈ +.6). It replaces Shriekwood rather than Paleoloth because Shriekwood is a 7-drop whose untap needs a surviving attacker. Against Paleoloth Apex gains +1.04 (§7).
- **Horizon:** a Scryfall ruling (2024-06-07) says it "checks the effects of all mana-producing abilities of lands you control". With a Forest and a Mountain out it is an untapped dual (1 life). The sim counts it as either colour from T1, a slight overstatement on T1.
- **Synergy** (`synergy.py`): `final.txt` min 0 / median 32 → `consistency.txt` min 0 / median 30. The 5 lowest are Signet, Beast Within, Sol Ring and Talisman at 0 (judged on efficiency) and Planetarium at 2. Apex 29, Cream 47, Caryatid 43, cyclers 29 each, Florahedron 15, Three Visits and Claim 2.

## Taken from the Omo precon box (pull these physical cards)
| Card | Goes into | Replaces |
|---|---|---|
| Apex Devastator | `consistency.txt` and every land option (c36/c37/c39) | Shriekwood Devourer |
| Horizon of Progress | `consistency.txt` and every land option | 1 Mountain |
- Nothing else from the box is used. The box's second copies of Sol Ring, Arcane Signet, Rampaging Baloths and Command Tower are not needed (singleton; the deck has one each). Chromatic Lantern and Ramunap Excavator lose (§5).

## §3 Closers and threat density
**Closers: 10.** Each ends games on the turn it resolves or the turn after:
- Anthems: Pyrewood Gearhulk "other creatures you control get +2/+2 and gain vigilance and menace"; Thunderfoot Baloth "+2/+2 and have trample".
- Combat: Moraug (extra combat per main-phase landfall), Drakuseth (4 + 3 + 3 per attack), Ghalta (12/12 trample), Gigantic Big Bear (10/7 hexproof haste).
- Damage: Warstorm Surge and Terror of the Peaks (ETB damage equal to power), Myojin (7 to each of three targets).
- Theft: Hideous Taskmaster.
- **Enablers:** Cyclops (team haste), Surrak (haste), Spearbreaker (team indestructible).
- **Access:** Garruk +1, Bind to Life, Monstrous Vortex, Planetarium, Cream, Kyoshi I, and now Apex's four cascades.
- P(≥ 1 closer seen by T6) ≈ .77 from 13 natural cards, ≈ .88 with about 5 extra draws. B3 wants 2–4 closers and 5–8 access; 10 + 7 is ample.
- **Density:** MV-6+ creatures 38 → 32 (+4 noncreature 6-drops); power-5+ creatures 31. 6+ threats cast by T8 rise 6.38 → 6.92, so the deck does not run dry.
- **Cut and not closers:** power-4 bodies (Calamity, Ventmaw, Foe-Razer, Sledge-Captain), opponent-controlled or fragile value (Ravager, Boarding Party, Havoc Eater), slow value (Woodwurm, Greenwarden, Shriekwood).

## §4 Colours (`colours.py`; Karsten 99-card, scaled to the land count; rocks 3/4, fragile dorks 1/2, 2-MV land ramp 3/4, fetches full)
| Requirement | `final.txt` (36) | `consistency.txt` (38) | `cons/c36.txt` (36) |
|---|---|---|---|
| R for {3}{R}{R}{R} (Burning Sun's Avatar) | 23.25 / need 24.59 ❌ | **26.75** / 25.95 ✅ | 24.75 / 24.59 ✅ |
| G for {1}{G}{G} (Selvala, Vastlands) | 23.25 / 24.59 ❌ | **27.00** / 25.95 ✅ | 26.00 / 24.59 ✅ |
| R {3}{R}{R} · G {2}{G}{G} · G {4}{G}{G} | ✅ | 26.75/21.32 · 27.50/24.10 · 27.50/20.39 ✅ | ✅ |
- **Lands (38):** 15 Forest, 15 Mountain, Command Tower, Horizon of Progress, Gruul Turf, Sheltered Thicket, Fabled Passage, Riveteers Overlook, Evolving Wilds, Spinerock Knoll.
- **Recount after every swap:** red {R}{R}{R} is now the binding row (slack 0.80). No Mountain, Knoll or dual may become a mono-G or colourless land.
- **Fix to the checker:** it now knows the short name "Tangled Florahedron"; the first pass's 26.00 G was measured before that rename.
- **Taplands:** Knoll, Turf, Thicket, Wilds, Overlook, Passage (early) and Vale ≈ 7, under the ≈ 15 pod budget.

## §5 Stop proofs (best unused vs weakest kept; sim single swaps, 20k / 60k as marked)
| Role | Weakest kept | Best unused → result |
|---|---|---|
| Rocks | Talisman of Impulse | Chromatic Lantern for Talisman: keep −.012, spells −.28; for Traverse (60k): T5 +.005, spells −.16 → near-tie §7 · Commander's Sphere: spells −.19 → stop |
| Dorks | Llanowar / Caryatid / Aberration | Poison Dart Frog for Aberration: 4 drops −.017; for Paleoloth (60k): keep +.009, spells −.07, threats −.19 · Sage of the Maze for Aberration: 4 drops −.014 · Dryad for Aberration: T6 −.010, 4 drops −.019 → stop |
| 2-MV land ramp | Three Visits / Florahedron | Sylvan Scrying / Vinewall / Wayfinder for Florahedron: keep −.014 to −.020, spells −.16 to −.24 · Rampant Growth: flood +.018 → stop |
| 3–5-MV ramp | Skyshroud Claim / Traverse | Elvish Rejuvenator: spells −.08 to −.41 · Hour of Promise: −.10 to −.46 · Ramunap: +.06 to −.25 spells, T6 −.004 to −.011 · Cultivate (spells −.18) → stop |
| Land tutors | 4 landcyclers | Topiary Panther for Paleoloth (60k): 4 drops +.010, spells −.08 → near-tie · Expedition Map: 3 mana for one land in hand, worse than a cycler that is also a 7-power body → stop |
| Card draw / engines | Combustible Gearhulk | Harmonize for Paleoloth (60k): spells −.03, T5 −.004 · Vivien Reid for Paleoloth (60k): idle −.016, T5/T6 ±0, spells 0 · Seer's Sundial: T6 −.010 to −.014 → stop |
| Mana doubling | — | Mana Reflection for Paleoloth (60k): spells +.10, T5 −.003, T6 ±0; it does nothing the turn it lands → near-tie §7 |
| Fatty slot | Paleoloth / Oblivion Sower | Hydra Broodmaster: spells −.07 · Avenger of Zendikar: −.21 / −.24 (Bear) · Terastodon: −.04 to −.15 · Acidic Slime 2/2, Scute Swarm 1/1, Rampant Frogantua 3/3 (text) → stop |
| Recursion | Paleoloth | Greenwarden for Sower: T6 −.006 · Skullwinder returns a card to an opponent too (text) → stop |
| Lands | Evolving Wilds / Knoll | Yavimaya for Forest (60k): spells −.12; for Knoll it breaks red (25.75 < 25.95) · Lair of the Hydra: spells +.02 to −.14, T6 −.002 to −.007 · Desert of the Indomitable: ±0, tapped · Hidden Nursery (tapped; its discover 4 hits mostly ramp here) and Hashep Oasis (G only for 1 life) are worse Forests → stop |
| Colourless lands | — | Urza's Tower/Mine/Power Plant, Cloudpost, Glimmerpost, Trenchpost, Talon Gates, Planar Nexus, Volatile Fault, Blast Zone, Basilisk Gate, Vesuva, Thespian's Stage + Dark Depths, Lazotep Quarry: replacing a Mountain breaks {R}{R}{R} (slack 0.80); replacing a Forest leaves G 26.00 / 25.95 for a utility ability the plan does not use → stop |
| Other Omo cards | — | Desert Warfare (no Deserts), Mirage Mirror, Oblivion Stone (symmetric wipe, 8 mana) → off-plan |

- Growth Spiral is G/U, outside identity, so it is not in `pool.md`. Beast Within stays; Harmonize is no longer a near-tie (Shriekwood left).
- **Convergence:** a pass on the final list (`omo_stage3.log`, 11 swaps at 60k) finds nothing better; `omo_screen.log` has the 119-swap screen.

## §6 Gate (`consistency.txt`)
```
size PASS · singleton PASS · legality PASS · rules PASS · identity FAIL (expected, first commander only) · ownership PASS
arenaNames WARN (paper) · lands WARN 38 (+MDFC 38.4) vs 45±2 · plan PASS 36/60 · curve PASS avg MV 5.12 · wincons PASS 37 · locks PASS (Planetarium)
```
- `identity.py`: 100 cards; outside R/G: none. `cons/c36.txt` gate: identical, lands WARN 36, avg MV 5.16, wincons 39.

## §7 Near-ties (operator's call)
- **36 vs 38 lands:** `cons/c36.txt` keeps .685 vs .725, T6 .951 vs .957, spells 13.83 vs 14.19, flood .636 vs .693.
- **Apex's out-card:** Shriekwood (spells +1.14) vs Paleoloth (+1.04). Shriekwood's untap needs a surviving attacker; Paleoloth's recursion needs creatures in the graveyard.
- **Horizon's out-card:** a Mountain (T5 +.006) vs Spinerock Knoll (T5 +.010, spells +.12). Knoll's hideaway is unmodelled, so the Mountain goes.
- **Chromatic Lantern ↔ Traverse the Outlands:** faster T5 vs more late ramp and spells.
- **Mana Reflection ↔ Paleoloth:** +.10 spells late vs recursion.
- **Poison Dart Frog ↔ Paleoloth; Topiary Panther ↔ Paleoloth; Greenwarden ↔ Oblivion Sower; Studious First-Year ↔ the 38th land.**
- **Physical (vs `final.txt`):**
  - Pull Sledge-Captain, Calamity, Ravager, Boarding Party, Foe-Razer, Havoc Eater, Ventmaw, Woodwurm, Greenwarden, Shriekwood, Planar Engineering and 1 Forest.
  - Sleeve the 10 free pool cards, plus Apex Devastator and Horizon of Progress from the Omo box. The Mountain count is unchanged.
  - Planetarium stays.
