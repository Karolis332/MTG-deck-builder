# Gilanra + Alena: consistency pass (Opus builder), 2026-10-07

**Verdict.** `consistency.txt` makes 11 changes to `final.txt`: 7 fatties and Planar Engineering out; 3 landcycling fatties, 4 cheap mana/selection pieces and Skyshroud Claim in; 2 fatties become fetch lands. It runs **38 lands** (36 → 38) plus the Tangled Vale MDFC.
- Against `final.txt`: keep-7 .638 → **.720**, 4 land drops .835 → **.893**, 6+ threat by T6 .924 → **.957**, screwed .026 → **.007**, spells cast T1–8 12.20 → **12.99**.
- **Price:** the literal flood metric gets worse (.580 → .655).
- **36-land option:** `cons/c36.txt` (keep .683, T6 .946, flood .597).
- **Gate:** all PASS except the expected `identity` FAIL; `lands`/`arenaNames` WARN. `identity.py`: 100 cards, none outside R/G.

## §1 Metrics (`sim4.py`, 30,000 goldfish games each, seed 7)
| List | Lands | Keep 7 | 4 land drops T1–4 | 6+ threat by T5 / T6 | Spells T1–8 | Screwed | Flooded / mean | Extra draws by T8 | 6+ threats by T8 |
|---|---|---|---|---|---|---|---|---|---|
| Sleeved (`deck.txt`) | 36 | .604 | .837 | .770 / .906 | 11.61 | .036 | .481 / 3.75 | 11.18 | 6.44 |
| `final.txt` | 36 | .638 | .835 | .784 / .924 | 12.20 | .026 | .580 / 4.35 | 12.31 | 6.38 |
| **`consistency.txt`** | **38** | **.720** | **.893** | **.802 / .957** | **12.99** | **.007** | .655 / 5.17 | 12.65 | 6.22 |
| same package, 36 (`cons/c36.txt`) | 36 | .683 | .868 | .788 / .946 | 12.73 | .012 | .597 / 4.57 | 12.25 | 6.16 |
| same package, 37 (`cons/c37.txt`) | 37 | .700 | .877 | .792 / .951 | 12.91 | .010 | .630 / 4.94 | 12.53 | 6.21 |
| same package, 39 (`cons/c39.txt`) | 39 | .738 | .901 | .810 / .961 | 12.84 | .007 | .677 / 5.32 | 12.61 | 6.21 |

**Definitions.**
- Keep 7: 3–5 lands, or 2 lands + an MV ≤ 2 ramp piece. The first mulligan is free (pod), then London 6 (2–5 lands) and 5.
- 4 land drops: a land played from hand on each of T1–T4.
- Screwed: < 4 lands + rocks + dorks at the end of T5, commanders excluded.
- Flooded: lands in hand + battlefield lands beyond 8 at the end of T8, ≥ 3. This literal metric rises with every land, every ramp land beyond 8 and every extra draw.
- Idle turns T5–8 (≥ 3 mana unspent with no spell in hand): .087 / .098 / .172 (sleeved / final / mine). That is the honest flood cost: about 1 idle turn in 6 games.

**Land count, recommended: 38.**
- It peaks spells cast (12.99 vs 12.91 at 37 and 12.84 at 39).
- From 36 it adds +.037 keep, +.025 land drops, +.011 T6 and −.005 screw. The cost is +.058 flood.
- 39 adds keep and T5 but casts fewer spells (fewer free cascades and discovers) and floods more.

**Ramp combinations tested:**
- 38 lands made by cutting Caryatid + Florahedron instead of fatties: keep .689 vs .720 ❌.
- 37 lands + Studious First-Year ≈ 38 lands (keep .712 vs .720, flood .594 vs .607): near-tie.
- Cultivate ≈ Planar Engineering < Skyshroud Claim.

**Model** (extends `refute/sim3.py`, card-level).
- Rules kept from sim3: pod T1 draw; Gilanra's mana on a 6+ spell draws; Alena = R equal to the greatest power that entered this turn, from her second turn; Selvala nets X − 1.
- Colour is modelled (R/G/either/C units).
- Modelled card effects: Kyoshi I/III, Bind to Life, Vortex/cascade/discover, Planetarium, Garruk +1, monarch, Regal, Packleader/Soul/Sage/Trailblazer/MG/Selvala draws, Cream selection, landcycling, Thicket cycling, Turf, fetches, Sower, Ghalta/Slinza discounts.
- Not modelled: combat, removal, opponents, Etali/Woodwurm/Shriekwood/Ventmaw attack triggers, and Greenwarden/Paleoloth recursion. Those cards were judged on text.

## §2 Swaps vs `final.txt` (DB text; gain = single swap vs `final.txt`, 20k games. Rows 4–7 were measured with Boarding Party as the out-card and row 2 as Ventmaw → Moose-Lion; all are power-4/6 bodies in the sim. Row 8 was measured against the 38-land base and rows 9–10 are the land-count steps of §1)
| # | Out | In | Role | Gain |
|---|---|---|---|---|
| 1 | Conclave Sledge-Captain: 4/4, "Backup 1, backup 1, backup 1 … Trample" | Slavering Branchsnapper: 7/6 "Trample", "Forestcycling {2}" | fatty → fatty + land tutor | 4 drops +.018, T6 +.004 |
| 2 | Calamity, Galloping Inferno: 4/6 "Haste", "Whenever Calamity attacks while saddled …", "Saddle 1" (power 4: no Vortex/Paleoloth trigger) | Saber-Tooth Moose-Lion: 7/7 "Reach", "Forestcycling {2}" | same | 4 drops +.021, screw −.004 |
| 3 | Nessian Wilds Ravager: "Tribute 6 … if tribute wasn't paid, you may have this creature fight" (opponent decides) | Spinewoods Armadillo: 7/7 "Reach", "Ward {3}", "{1}{G}, Discard this card: Search your library for a basic land card or a Desert card … You gain 3 life." | same | 4 drops +.022, screw −.005 |
| 4 | Boarding Party: 6/3 "Haste", "Cascade" | Three Visits: "Search your library for a Forest card, put it onto the battlefield" | 2-MV ramp | keep +.021, T5 +.009 |
| 5 | Foe-Razer Regent: 4/5 flyer, "you may have it fight target creature you don't control" | Tangled Florahedron: "{T}: Add {G}." // Tangled Vale: "This land enters tapped. {T}: Add {G}." | dork / MDFC land | keep +.022, T6 +.006, flood −.005 |
| 6 | Havoc Eater: 3/3 flyer, "goad up to one target creature … Put X +1/+1 counters on this creature" | Cream of the Crop: "Whenever a creature you control enters, you may look at the top X cards … where X is that creature's power … put one of those cards on top" | selection | flood −.043, 4 drops +.007 |
| 7 | Savage Ventmaw: 4/4 flyer, "Whenever this creature attacks, add {R}{R}{R}{G}{G}{G}" (pays a turn later) | Ilysian Caryatid: "{T}: Add one mana of any color. If you control a creature with power 4 or greater, add two mana of any one color instead." | dork (Alena 4/3 turns on 2) | keep +.015, T6 +.009, flood −.011 |
| 8 | Planar Engineering: "Sacrifice two lands. Search your library for four basic land cards, put them onto the battlefield tapped" | Skyshroud Claim: "Search your library for up to two Forest cards, put them onto the battlefield" (untapped; Thicket included) | 4-MV ramp | spells +.19 |
| 9 | Emergent Woodwurm: 7 MV 4/4, "Backup 3 …", attack trigger | Riveteers Overlook: "When this land enters, sacrifice it. When you do, search your library for a basic Swamp, Mountain, or Forest card, put it onto the battlefield tapped … you gain 1 life." | 37th land + fixing | keep +.017, T6 +.005 |
| 10 | Greenwarden of Murasa: "When this creature enters, you may return target card from your graveyard to your hand." | Evolving Wilds: "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped" | 38th land + fixing | keep +.020, spells +.08 |
| 11 | 1 Forest | 1 Mountain | colour | RRR fix (§4) |

- Both fetches give Moraug and Rampaging Baloths two landfalls each (a main-phase fetch = two extra combats).
- **Synergy** (`synergy.py`, Moraug and Cream rules added): `final.txt` min 0 / median 32 → `consistency.txt` min 0 / median 31. The 5 lowest are Signet, Beast Within, Sol Ring and Talisman at 0 (mana/interaction, judged on efficiency) and Planetarium at 2. New cards: Cream 47, Caryatid 43, the three cyclers 30 each, Florahedron 15, Three Visits 2, Claim 2.

## §3 Closers and threat density
**Closers: 10.** Each one ends games on the turn it resolves or the turn after:
| Closer | Win-turn effect (DB) |
|---|---|
| Pyrewood Gearhulk | "other creatures you control get +2/+2 and gain vigilance and menace" |
| Thunderfoot Baloth | "other creatures you control get +2/+2 and have trample" |
| Moraug | an extra combat with untap per main-phase landfall |
| Warstorm Surge | ETB damage equal to power |
| Terror of the Peaks | ETB damage equal to power |
| Hideous Taskmaster | steals 1 creature per opponent, annihilator |
| Drakuseth | 4 + 3 + 3 damage per attack |
| Myojin | 7 to each of three targets |
| Ghalta | 12/12 trample |
| Gigantic Big Bear | 10/7 hexproof haste |

- **Enablers:** Cyclops (team haste), Surrak (haste), Spearbreaker (team indestructible).
- **Access:** Garruk +1, Bind to Life, Monstrous Vortex, Planetarium, Cream of the Crop, Kyoshi I.
- P(≥ 1 closer seen by T6): .77 from 13 natural cards, ≈ .88 with about 5 extra draws. B3 wants 2–4 closers and 5–8 access, so 10 + 6 is ample.
- **Density:**
  - MV-6+ creatures: 38 → 32, plus 4 noncreature 6-drops.
  - Power ≥ 5 creatures: unchanged at 31, because the cyclers are 7-power Alena/Gilanra/Packleader fuel.
  - 6+ threats cast by T8: 6.38 → 6.22, so the deck does not run dry.
- **Why these 9 went:**
  - Power-4 bodies: Calamity, Ventmaw, Foe-Razer, Sledge-Captain base.
  - Value the opponent controls (Ravager's tribute) or that is fragile (Boarding Party 6/3, Havoc Eater 3/3).
  - Slow 7-drop value (Woodwurm) and one-shot recursion (Greenwarden).
  - None of them is a closer.
- **Big Bear** is the most vanilla body left. It stays as a closer: 10 hasty hexproof power, and 10 for Alena, Selvala and Kyoshi.

## §4 Colours (`colours.py`; Karsten 99-card, scaled to the land count)
Weights: rocks 3/4, fragile dorks 1/2, 2-MV land ramp 3/4, fetches full for both colours.
| Requirement | `final.txt` (36) | `consistency.txt` (38) | `cons/c36.txt` (36) |
|---|---|---|---|
| R for {3}{R}{R}{R} (Burning Sun's Avatar) | 23.25 / need 24.59 ❌ | **26.75** / 25.95 ✅ | 24.75 / 24.59 ✅ |
| G for {1}{G}{G} (Selvala, Vastlands) | 23.25 / 24.59 ❌ | **26.00** / 25.95 ✅ | 25.00 / 24.59 ✅ |
| R for {3}{R}{R} / G for {2}{G}{G} / G for {4}{G}{G} | ✅ | 26.75/21.32 · 26.50/24.10 · 26.50/20.39 ✅ | ✅ |

- **Lands:** 15 Forest, 16 Mountain, Command Tower, Gruul Turf, Sheltered Thicket, Fabled Passage, Riveteers Overlook, Evolving Wilds, Spinerock Knoll.
- **Recount after each swap:** green 1CC is the binding row (+0.05). Any further Forest → Mountain shift breaks it.
- **Taplands:** Knoll, Turf, Thicket, Wilds, Overlook, Passage (early) and Vale ≈ 7, under the ≈ 15 pod budget.

## §5 Stop proofs (best unused vs weakest kept; sim vs `consistency.txt`, 20k, unless marked text)
| Role | Weakest kept | Best unused → result |
|---|---|---|
| Rocks | Talisman of Impulse | Commander's Sphere: keep −.015, spells −.19 · Fertile Ground: T6 −.009, screw +.006 → stop |
| Dorks | Llanowar Elves / Caryatid | Studious First-Year (for Llanowar): T5 −.017, spells −.30 · Paradise Druid < Caryatid · Domri (for Caryatid): keep −.012 → stop |
| 2-MV land ramp | Three Visits / Florahedron | Rampant Growth: −.002 to −.008 on keep/T6, flood +.018 · Cultivate (a10) < Three Visits → stop |
| 3–4-MV ramp | Skyshroud Claim | Cultivate ≈ Planar Engineering (spells −.18) · Loot, Exuberant Explorer: T6 −.006 · Shaper/Map the Frontier (text: tapped, slower) → stop |
| Land tutors | 4 cyclers (Aberration + 3 new) | Topiary Panther (for Paleoloth): 4 drops +.013, rest ±0 → near-tie §7 · Orchard Strider 6/4 < Panther |
| Creature tutors | Garruk, Bind to Life, Vortex | You Meet in a Tavern: T6 −.006 · Vivien's Arkbow (text: discard + X, slow) → none |
| Card draw | Combustible Gearhulk (opponent chooses) | Harmonize (for Shriekwood): spells +.17, draws +.47, flood +.021, T6 −.003 → near-tie §7 · Hunter's Insight needs combat |
| Selection | Cream of the Crop | Harmonize (for Cream): spells +.21 but flood +.044; Cream has 47 links and sets up Planetarium → stop · Explore/Rumble one-shot |
| Cost reducers | Slinza | none applies (Ezzaroot = life gained, Inspiring Statuary = artifacts) |
| Recursion | Paleoloth | Greenwarden (for Sower): T6 −.006, spells −.15, recursion unmodelled → near-tie §7 · Pulse/Regrowth/Glade (text) < a fatty slot |
| Lands | Evolving Wilds / Spinerock Knoll | Forest for Wilds: T6 −.002, spells +.06 (noise), and red 26.75 → 25.75 < 25.95 ❌ · Mountain for Knoll: ±0 → stop · Konstrari Annex/Bristling Backwoods = Wilds on sources, no double landfall |
| Fatty slot | Oblivion Sower / Shriekwood / Etali | Colossal Rattlewurm (for Sweet-Gum): spells −.18 · Lumra < Ulvenwald Hydra (Hydra fetches a land) → stop |

A full sweep of `pool.md` finds no other card clearly beating the weakest kept card of its role. The refuter's §4 near-ties were re-judged:
- **In:** a 3rd dual (Overlook + Wilds), Three Visits.
- **Near-ties:** Studious First-Year, Harmonize.
- **Out:**
  - Domri, Cultivate: worse than Caryatid and Claim respectively.
  - Hunter's Insight: needs combat.
  - Lumra: Ulvenwald Hydra stays.
  - Rocky Rebuke: interaction, not consistency; Havoc Eater's slot went to Cream.

## §6 Gate (`consistency.txt`)
```
size PASS · singleton PASS · legality PASS · rules PASS · identity FAIL (expected, first commander only) · ownership PASS
arenaNames WARN (paper) · lands WARN 38 (+MDFC 38.4) vs 45±2 · plan PASS 36/60 · curve PASS avg MV 5.07 · wincons PASS 37 · locks PASS (Planetarium)
```
- `identity.py`: 100 cards; outside R/G: none.
- `cons/c36.txt` gate: identical, lands WARN 36, avg MV 5.11.

## §7 Near-ties (operator's call)
- **36 vs 38 lands:** `cons/c36.txt` = `consistency.txt` −Evolving Wilds −1 Mountain +Emergent Woodwurm +Greenwarden. Keep .683 vs .720, T6 .946 vs .957, flood .597 vs .655.
- **Harmonize ↔ Shriekwood Devourer:** more gas vs untap-on-attack.
- **Topiary Panther ↔ Paleoloth or Oblivion Sower:** a 5th landcycler vs recursion or ramp.
- **Greenwarden ↔ Oblivion Sower.**
- **Studious First-Year ↔ the 38th land.**
- **Physical:** Planetarium stays. Pull Sledge-Captain, Calamity, Ravager, Boarding Party, Foe-Razer, Havoc Eater, Ventmaw, Woodwurm, Greenwarden, Planar Engineering and 1 Forest. Sleeve the 10 pool cards + 1 Mountain.
