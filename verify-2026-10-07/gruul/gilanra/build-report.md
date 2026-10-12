# Gruul build: Gilanra, Caller of Wirewood + Alena, Kessig Trapper (2026-10-07)

**Verdict.** `final.txt` (100 cards, 38 lands + the Tangled Florahedron MDFC) is the converged `consistency.txt` (prior pass) plus 9 changes from the merged pool.
- Seven of the nine cards come from the Bumi box: Elvish Mystic, Spider Manifestation, Smellerbee, Bushwhack, Temur Battle Rage, Ba Sing Se and Savage Mansion. Two are free: Apex Devastator and Samut. Farseek and Nature's Lore (also from the Bumi box) were already in `consistency.txt`.
- Against the sleeved deck: keep-7 .603 → **.743**, 4th land on T4 .835 → **.903**, screw .037 → **.007**, spells cast T1–8 12.1 → **16.7**, goldfish clock mean T7.78 → **T7.33**.
- **Gate:** all PASS except `identity` FAIL (false negative for partners; `identity.py`: none outside R/G). `plan` is a WARN, not a FAIL.

## §1 Plan
1. Ramp T1–3 (12 cheap mana pieces), then Gilanra (draws off every 6+ MV spell) and Alena (R equal to the greatest power that entered this turn). Chain one 6–7 drop per turn from T4–5.
2. Each fatty draws (Gilanra, Packleader, Soul, Sage, Trailblazer, Selvala) or finds the next one (Vortex, Garruk, Bind to Life, Planetarium, Cream).
3. Close with haste (Smellerbee, Samut, Cyclops, Surrak) plus a team pump (Pyrewood, Thunderfoot), Moraug's extra combats, or ETB damage (Terror, Warstorm).

**Shape.** T1–3: dork or rock, Gilanra, 2-MV land ramp · T4–6: Alena, Smellerbee or Samut, an engine (MG, Vortex, Packleader), first fatties · close T6–8: haste + Pyrewood/Thunderfoot alpha, or Apex/Ghalta + Temur Battle Rage.

## §2 Metrics (`sim5.py`, 25,000 games each, seed 7, same rules for every list)
| List | Lands | Keep 7 | 4th land T4 | Commander on curve | Screwed | Flooded | Spells T1–8 | Clock: median (mean; P by T7 / T8) |
|---|---|---|---|---|---|---|---|---|
| Gilanra current (`gilanra-alena-partners.txt`) | 36 | .603 | .835 | Gil T3 .948 · Alena T5 .926 | .037 | .232 | 12.12 | T8 (7.78; .451 / .828) |
| Bumi current (`bumi-unleashed.txt`) | 33† | .607 | .735 | Bumi T5 .791 | .042 | .029 | 11.72 | T7 (6.74; .835 / .935) |
| **`final.txt`** | **38** | **.743** | **.903** | Gil T3 .927 · Alena T5 .964 | **.007** | .113 | **16.73** | **T7 (7.33; .634 / .930)** |
| `final-36.txt` | 36 | .700 | .876 | Gil T3 .921 · Alena T5 .955 | .010 | .085 | 16.41 | T7 (7.39; .603 / .916) |

† The 33 includes the three illegal Landscapes, modelled as fetch lands.

**Model** (`sim5.py`, extends `alena-gilanra/sim4.py`; on the sleeved Gilanra list both give keep .612).
- Pod rules: T1 draw, first mulligan free, then London. Keep 7 = 3–5 lands or 2 lands + an MV ≤ 2 rock/dork/land-ramp; keep 6 = 2–5 lands. Commanders are cast first whenever castable.
- 4th land = 4 land drops from hand by T4. Screwed = < 4 lands + rocks + dorks at end of T5 (commanders excluded). Flooded = > 8 land cards drawn by T8 and no mana sink in play (Planetarium, Garruk, Ba Sing Se, Mansion, Omashu, Caves, Barrens, Passage, Spearbreaker, Hoard-Smelter, Bitter Work).
- **Clock:** goldfish, no blockers, all damage to one opponent at 40. Every untapped non-dork creature that is not summoning-sick (or has haste) attacks.
  - Haste: Cyclops, Smellerbee ("Other creatures"), Samut team; Surrak and Halana one creature; earthbended lands (ruling: "0/0 land creature with haste").
  - Bumi: when he connects, all lands untap; land creatures attack again in the extra combat (ruling: the "only land creatures" limit applies to Bumi's combat only); main phase 2 has land mana again.
  - Modelled: Toph double strike for land creatures; Moraug (+1 combat per main-phase landfall, +1/+0 per attack); Thunderfoot, Pyrewood, Germination, Tutelage, Tale, Bulk Up, TBR; direct damage from Terror, Warstorm, Burning Sun's Avatar 3, Drakuseth 4, Myojin 7, Fling when lethal. Ignored: removal, Etali's cards, Taskmaster theft.
  - Bumi's faster goldfish comes from doubling counters and double strike on unblocked land creatures; blockers, invisible to a goldfish, cut that most.

**Land count: 38 recommended.** Sweep, each land replacing a spell (keep / 4th land / spells / flood / mean clock):
- 36: .700 / .876 / 16.41 / .085 / 7.39 · 37: .728 / .892 / 16.50 / .109 / 7.36 · **38: .743 / .903 / 16.73 / .113 / 7.33** · 39: .756 / .912 / 16.80 / .122 / 7.31 · 40: .779 / .918 / 16.50 / .125 / 7.31.
- Spells and clock are flat from 38 to 39; the 39th land costs a closer (TBR) for +.013 keep, and the first mulligan is free.
- Karsten's regression gives 31.42 + 3.13·4.80 − 0.28·12 = 43, but it counts neither the 4 landcyclers, Bushwhack nor the MDFC (6 cards that become lands on demand).
- **36-land variant:** `final-36.txt` = −1 Forest −1 Mountain +Bitter Work +Paleoloth (colours OK, §5).

## §3 Swaps vs the sleeved deck (31 out / 31 in; DB text)
| # | Out | In | Role | Why |
|---|---|---|---|---|
| 1 | Planar Engineering ("Sacrifice two lands … four basic … tapped") | Skyshroud Claim | ramp 4 | "two Forest cards, put them onto the battlefield": untapped, no sacrifice |
| 2 | Shamanic Revelation | The Legend of Kyoshi | draw | "I — Draw cards equal to the greatest power"; flips into Avatar Kyoshi, which taps for "X mana … greatest power" |
| 3 | Ulvenwald Observer (draws only when a toughness-4 creature dies) | Master's Guidance | draw | "end step, if you control a creature with power 4 or greater, draw a card"; 3 MV |
| 4 | Greenwarden of Murasa | Vastlands Scavenger // Bind to Life | tutor | 4/4 deathtouch for 3, then "Mill seven … put a creature card … onto the battlefield" |
| 5 | Sakiko, Mother of Summer | Cream of the Crop | selection | "look at the top X cards … X is that creature's power … one … on top" |
| 6 | Fling (sacrifice a creature) | Bushwhack (Bumi box) | removal / land | "basic land card … into your hand" early, or "fights" late; 1 MV |
| 7 | Avatar of Slaughter ("All creatures have double strike and attack each combat": symmetric) | Temur Battle Rage (Bumi box) | closer | "double strike", "also … trample if you control a creature with power 4 or greater"; Ghalta = 24 |
| 8 | Bane of Progress ("destroy all artifacts and enchantments": kills our 3 rocks, Vortex, MG, Cream, Warstorm, Planetarium) | Cleanup Crew | answer | 6/6, "Destroy target artifact / enchantment / Exile target card from a graveyard" |
| 9 | Hoard-Smelter Dragon | Beast Within | answer | "Destroy target permanent", instant |
| 10 | Rorix Bladewing ({3}{R}{R}{R} 6/5) | Gigantic Big Bear | closer | 10/7 "can't be countered. Hexproof, haste" |
| 11 | Ruric Thar (punishes noncreature spells only) | Moraug, Fury of Akoum | closer | "Landfall — … additional combat phase … untap all creatures"; fetches = 2 combats |
| 12 | Aurora Phoenix | Smellerbee, Rebel Fighter (Bumi box) | haste | "Other creatures you control have haste" for 4 MV: every fatty attacks the turn it lands |
| 13 | Boarding Party (6/3) | Samut, Tyrant Smasher | haste | "Creatures you control have haste"; a walker, so it survives creature wipes; −1 "Scry 1" feeds Planetarium |
| 14 | Havoc Eater | Spider Manifestation (Bumi box) | dork | "{T}: Add {R} or {G} … cast a spell with mana value 4 or greater, untap": 2 mana on most turns; spells +0.9 vs Three Visits |
| 15 | Emergent Woodwurm | Elvish Mystic (Bumi box) | dork | 1-drop "{T}: Add {G}" → T2 Gilanra |
| 16 | Calamity, Galloping Inferno | Ilysian Caryatid | dork | "two mana of any one color" with a power-4 creature |
| 17 | Savage Ventmaw | Tangled Florahedron // Tangled Vale | dork / land | "{T}: Add {G}" or a land |
| 18 | Foe-Razer Regent | Nature's Lore (Bumi box) | ramp 2 | "Forest card … onto the battlefield", untapped |
| 19 | Nessian Wilds Ravager (opponent picks the tribute) | Farseek (Bumi box) | ramp 2 | "Plains, Island, Swamp, or Mountain card": R fixing, Thicket |
| 20 | Conclave Sledge-Captain | Slavering Branchsnapper | fatty / land | 7/6 trample, "Forestcycling {2}" |
| 21 | Paleoloth | Saber-Tooth Moose-Lion | fatty / land | 7/7 reach, "Forestcycling {2}" |
| 22 | Oblivion Sower | Spinewoods Armadillo | fatty / land | 7/7 "Ward {3}", "{1}{G}, Discard: … basic land … gain 3 life" |
| 23 | Shriekwood Devourer | Selvala, Heart of the Wilds | dork / draw | "{G},{T}: Add X mana … greatest power"; draws on each biggest ETB |
| 24 | Etali, Primal Storm (no haste, no evasion) | Apex Devastator | closer / value | 10/10 "Cascade" ×4; Gilanra draws; Alena taps for 10; by-T7 kill +.018 |
| 25 | Sweet-Gum Recluse | Sheltered Thicket | land 37 | "Mountain Forest", "Cycling {2}" |
| 26 | Tyrant of Discord (random sacrifice; {4}{R}{R}{R}) | Gruul Turf | land 38 | "{T}: Add {R}{G}"; bounce = replayed landfall |
| 27 | 4 Forest, Diamond City (colourless) | Ba Sing Se, Savage Mansion (Bumi box), Fabled Passage, Evolving Wilds, Riveteers Overlook | lands | Ba Sing Se "{2}{G},{T}: Earthbend 2" sink; Mansion is R/G, "{4},{T}: Surveil 1" → Planetarium; fetches fix and give Moraug/Baloths 2 landfalls |

Rows 1–5, 8–11, 16–23 and 25–27 (lands, except Ba Sing Se and Mansion) are the refuted `consistency.txt` swaps, with sim gains in `alena-gilanra/consistency-report.md` §2. Rows 6, 7, 12–15, 24 and the Ba Sing Se/Mansion part of row 27 are new in this pass.
- **Physical pulls from the Bumi box:** Elvish Mystic, Spider Manifestation, Smellerbee, Bushwhack, Temur Battle Rage, Farseek, Nature's Lore, Ba Sing Se, Savage Mansion.

## §4 Closers (what each does on the win turn)
| Closer | Win-turn effect (DB) |
|---|---|
| Pyrewood Gearhulk | "other creatures you control get +2/+2 and gain vigilance and menace": a hasted board (Smellerbee/Samut/Cyclops) swings through blockers |
| Thunderfoot Baloth | with a commander out, "other creatures … +2/+2 and have trample" |
| Moraug | each main-phase land (a fetch = 2) is another combat with untap, "+1/+0 for each time it has attacked" |
| Terror of the Peaks / Warstorm Surge | every creature entering deals its power to any target: Apex (10) + 4 cascades spread over the table |
| Temur Battle Rage | double strike + trample on Ghalta 12, Apex 10 or Big Bear 10 hexproof = 20–24 to one player |
| Apex Devastator / Ghalta / Gigantic Big Bear | 10–12 power tramplers or hexproof haste |
| Drakuseth | each attack "4 damage to any target and 3 damage to each of up to two other targets": all three opponents |
| Myojin | "7 damage to each of up to three targets" |
| Hideous Taskmaster | steals a creature from each opponent, "trample, haste, annihilator 1" |

- **Access:** 12 closers, plus Garruk +1, Vortex, Bind to Life, Planetarium, Cream and Kyoshi.
- **Backup on a different axis:** Myojin, Drakuseth, Terror and Warstorm do direct damage, so they work through a board stall.

## §5 Colours and lands (`colours2.py`: Karsten 99-card, scaled to 38 lands)
| Pip pattern (card) | Need | Have | |
|---|---|---|---|
| R {3}{R}{R}{R} (Burning Sun's Avatar, Drakuseth, Myojin) | 25.95 | 27.25 | ✅ |
| G {1}{G}{G} (Selvala, Vastlands) | 25.95 | 27.25 | ✅ |
| G {2}{G}{G} (Surrak) | 24.10 | 27.75 | ✅ |
| R {3}{R} (Smellerbee) | 14.83 | 27.25 | ✅ |
| G {G} on T1 (Elvish Mystic, untapped sources) | 17.61 | 22.00 | ✅ |

- **`final-36`:** every row OK (R 26.25 / 24.59, G 1CC 26.25 / 24.59).
- **Lands:** 14 Forest, 15 Mountain, Command Tower, Ba Sing Se, Savage Mansion, Gruul Turf, Sheltered Thicket, Fabled Passage, Evolving Wilds, Riveteers Overlook, Spinerock Knoll.
- **Taplands:** Knoll, Turf, Thicket, Mansion, Wilds, Overlook, Passage (early) and Vale ≈ 8, under the ≈ 15 pod budget. They are the likely cause of Gilanra-on-T3 .948 → .927 (sleeved list is near-all basics).

## §6 Stop proofs (best unused vs weakest kept; sim5 15k games vs `final.txt` unless marked text)
| Role | Weakest kept | Best unused → result |
|---|---|---|
| Lands / count | 38th land | 39 = −TBR +Forest: keep +.013, clock ±.002, flood +.009 (§2) · Omashu City / Hidden Nursery for a basic: an extra tapland (text) → stop |
| Rocks | Talisman of Impulse | Sage of the Maze: keep −.006, spells −.32, by T7 −.023 · Commander's Sphere: keep −.015 (prior) → stop |
| Dorks | Ruby | Sage of the Maze for Ruby: spells −.26 · Frog Butler for Three Visits: by T8 −.010 → stop |
| Land ramp | Farseek | Three Visits lost its slot to Spider (+0.9 spells) · Tireless Provisioner, Lumbering Worldwagon: keep −.006/−.012, spells ±0 → stop |
| Draw engines | Combustible Gearhulk / MG | Bitter Work for Emissary: flood −.024, by T7 −.018 → near-tie §8 · Ohran, Spry and Mighty: ±0 → stop |
| Haste | Samut | Halana and Alena for Samut: by T7 −.010, spells −.12; Samut also survives creature wipes → stop |
| Closers | Temur Battle Rage | was +.016 by T7 over Tyrant · Avatar Kyoshi Earthbender for Big Bear: ±0 → stop |
| Fatty slot | Emissary of Grudges (6/5 flying haste) | for Emissary, by T7 (final .636): Quilled .636, Halana .633, Braulios .626, Earth King .626, Amarant .625, Avenger .617, Tyrant .618, Paleoloth .618 → none better; Quilled = near-tie |
| Interaction | Beast Within / Bushwhack | Decimate for Tyrant ≈ (text: needs all four targets, sorcery) · Rocky Rebuke, Savage Smash, Longstalk Brawl: creature-only and slower than Bushwhack's land mode → stop |
| Landcyclers | Spinewoods Armadillo | Topiary Panther / Orchard Strider (prior: ≤ Armadillo, which also gains 3) → stop |
| Tutors | Bind to Life, Vortex, Garruk | You Meet in a Tavern (prior T6 −.006), Vivien's Arkbow (text: discard + X) → stop |

**Synergy** (`synergy2.py`: prior rules + Spider, Smellerbee, Samut, Bushwhack, TBR): sleeved min 0 / median 30 → **min 0 / median 32.5**.
- **5 lowest:** Arcane Signet 0, Beast Within 0, Sol Ring 0, Talisman 0, Farseek 2. All are mana or interaction, judged on efficiency.

## §7 Gate (`final.txt`)
```
size PASS · singleton PASS · legality PASS · rules PASS · identity FAIL (partners: gate reads Gilanra only) · ownership PASS
arenaNames WARN (paper) · lands WARN 38 (+MDFC 38.4) vs 43±2 · plan WARN 31/60 MV 6+ · curve PASS avg MV 4.80 · wincons PASS 32 · locks PASS
```
- `identity.py`: 100 cards, none outside R/G. The illegal Landscapes are not used.
- **Curve (nonland):** 1-drops 4, 2-drops 10, 3-drops 5, 4-drops 5, 5-drops 5, 6-drops 22, 7+ 9.

## §8 Near-ties (operator's call)
- **Land count:** 39 = −Temur Battle Rage +Forest (keep .756, 4th land .912); 36 = `final-36.txt`.
- **Swaps:** Bitter Work ↔ Emissary of Grudges (draw + sink vs a hasty flier; flood .114 → .090) · Quilled Greatwurm ↔ Emissary · Halana and Alena ↔ Samut · Decimate ↔ Beast Within.

## §9 Other legends as commander
- **Amarant Coral:** a reason. "deals that much damage to each other opponent" triples every connection in a pod, but it is a voltron/aggro plan, not this ramp plan.
- **Halana and Alena, Partners:** a reason. Haste and +2 counters every combat from the command zone. Weaker than the partner pair: it loses Gilanra's draws and Alena's mana.
- **Toph, Greatest Earthbender:** belongs to the Bumi builder's earthbend plan; no reason here.
- **No reason:** Ruby, Roxanne. **Ruled out by colour identity:** Selvala, Surrak, Ohran Frostfang, The Earth King (mono-G); Moraug, Etali (mono-R).
