# Gilanra, Caller of Wirewood + Alena, Kessig Trapper — sleeved review (2026-10-09)

**Verdict:** make 8 swaps. They fix the deck's real weakness, which is too little cheap mana (keep-7 .60). They add the operator's Hexhaven Invigorator and 3 FRA cards (Invigorator, Konstrari Annex, Violent Echoes). Nothing is taken from another sleeved deck. Result: `proposed.txt` (100 cards, 38 lands + Tangled Florahedron MDFC, 41 spells of MV 6+).

## Scores
The lab cannot score partners: 46 cards read as `missing`. So `score.ts` and the swap lab were **not run**, as the brief says. The numbers below come from the deck's own goldfish (`verify-2026-10-07/gilanra-engine/sim6.py` through `metrics.py`, seed 7, 10,000 games; logs `metrics-10k.log`, `var/metrics.log`).

| Metric | Sleeved | **Proposed (8 swaps)** | Pending draft `gilanra-stompy/final.txt` (about 25 changes, 10-08 metrics) |
|---|---|---|---|
| Lab objective / Deck Score | 0 (blind) | 0 (blind) | 0 (blind) |
| Keep 7 | .602 | **.687** | .705–.731 |
| 4th land on T4 | .841 | **.857** | .915 |
| Alena by T5 | .936 | **.951** | .960 |
| 6+ MV spells cast by T8 | 8.87 | **9.38** | 10.0–12.4 |
| Gilanra draws by T8 | 3.49 | **3.53** | 3.36–3.52 |
| Spells cast T1–8 | 14.82 | **16.37** | 18.9–20.8 |
| Screwed (< 4 sources T5) | .028 | **.016** | .009 |
| Clock to 40: by T7 / by T8 | .471 / .855 | **.468 / .871** | .53–.58 / .90 |

The sim does not model Hexhaven's land fetch or Violent Echoes. It does model Avatar of Slaughter's double strike against an empty board. So the proposed clock is a lower bound.

## Model cuts / adds
No lab model exists for partners. The "model" here is the pending draft (`verify-2026-10-08/gilanra-stompy/final.txt`): the 10-07 refuter-backed engine build plus the 10-08 FRA patches.
- **Cuts I agree with and use (8):** Avatar of Slaughter, Fling, Roxanne, Slinza, Planar Engineering, Sweet-Gum Recluse, Bane of Progress, Ruric Thar.
- **Cuts deferred (cap of 8 swaps):** Calamity, Conclave Sledge-Captain, Nessian Wilds Ravager, Emergent Woodwurm, Havoc Eater, Hoard-Smelter, Foe-Razer, Spearbreaker, Hideous Taskmaster, Rorix, Aurora Phoenix, Shamanic Revelation, Ulvenwald Observer, Planetarium, Domri, Diamond City, 2 Forests.
- **Draft adds no longer usable:**
  - Beast Within and Fabled Passage are in the ban file (Beledros / Inspirit). By copy count each still has one spare: 2 Beast Within owned, 3 Passages owned.
  - Evolving Wilds, Horizon of Progress and Thunderfoot Baloth went to Beledros.
  - Three Visits was deregistered.
- **Variants tested** (`var/`):
  - Diamond City → Thicket instead of Bane → Thicket: worse on every metric (keep .675, by T7 .455).
  - Shaper instead of Selvala: 6+ casts 8.76 vs 9.23.
  - Ruric kept: within noise.
  - Avatar kept with Hexhaven in for Taskmaster: by T7 .481. That gain is goldfish-only double strike.

## Swaps (all free: in `collection.txt`, in no `decks/paper/decks/*.txt`, not in the ban file; R/G identity; singleton)
| # | Out | In | Why (oracle, verbatim) | Source |
|---|---|---|---|---|
| 1 | Avatar of Slaughter | Hexhaven Invigorator | Operator's must-have. Out: "All creatures have double strike and attack each combat if able", which is symmetric. In: "Whenever this creature is dealt damage, you may search your library for up to that many land cards". Targets it can use: Warstorm, Terror, Burning Sun's Avatar, Drakuseth, Myojin, Ravager ("fight another target creature"), Ragebeast. Each fetched land is a Rampaging Baloths 4/4 and grows Ulvenwald Hydra | free |
| 2 | Fling | Poison Dart Frog | Out: "As an additional cost … sacrifice a creature". In: "{T}: Add one mana of any color". Gilanra on T2 | free |
| 3 | Roxanne, Starfall Savant | Ilysian Caryatid | Out: 5 MV, Meteorite enters "tapped". In: 2 MV, "add two mana of any one color" with power ≥ 4 (31 creatures have power 5+) | free |
| 4 | Slinza, the Spiked Stampede | Tangled Florahedron | Out: "Beast spells you cast cost {2} less" (few Beasts). In: "{T}: Add {G}" dork, or Tangled Vale when the hand needs a land | free |
| 5 | Planar Engineering | Selvala, Heart of the Wilds | Out: 4 MV, "Sacrifice two lands". In: "{G}, {T}: Add X mana … where X is the greatest power among creatures you control" (sim: +.47 6+ casts over Simulacrum Shaper) | free |
| 6 | Sweet-Gum Recluse | Konstrari Annex | Out: a 0/3 whose cascade from 6 MV hits mostly ramp. In: FRA "{T}: Add {R} or {G}". Land 37 | free |
| 7 | Bane of Progress | Sheltered Thicket | Out: "destroy all artifacts and enchantments", which kills our own Sol Ring, Signet, Talisman, Vortex, Warstorm, Cyclops, 2 Gearhulks, Planetarium. In: "Mountain Forest", "Cycling {2}". Land 38 | free |
| 8 | Ruric Thar, the Unbowed | Violent Echoes | Out: "Whenever a player casts a noncreature spell, Ruric Thar deals 6 damage to that player", and we cast 11 noncreature spells. In: FRA instant "6 damage to target creature or planeswalker". It is the deck's only instant-speed removal | free |

Swap-lab delta: not run (lab blind). Combined goldfish delta vs sleeved: keep-7 +.085, 4th land T4 +.016, 6+ casts +.51, spells +1.55, screw −.012, by T8 +.016.

## Plan and win lines (verified against oracle)
- **Primary plan:** ramp T1–3, Gilanra T3, Alena T5, then one fatty per turn.
  - Gilanra: "When you spend this mana to cast a spell with mana value 6 or greater, draw a card". The proposed list has 41 such spells.
  - Alena: "Add an amount of {R} equal to the greatest power among creatures you control that entered this turn". Tap her after the fatty, from her second turn on (it is a {T} ability).
  - Each entry deals damage: Warstorm Surge ("it deals damage equal to its power to any target") and Terror of the Peaks.
  - The kill is a hasted alpha: Cyclops ("Creatures you control have haste"), Surrak formidable, Pyrewood Gearhulk's +2/+2, Ghalta trample. **Valid.**
- **Backup:** cascade and discover chains (Boarding Party, Aurora Phoenix, Monstrous Vortex "discover X", Trumpeting Carnosaur "discover 5") rebuild after a wipe. **Valid.**
- **Weak spots:**
  - The deck has no enchantment answer once Bane leaves (see risks).
  - Planetarium is a 6-MV "{1}, {T}: Scry 2" free-cast engine that the Urza draft wants back.

## Risks
- **No artifact/enchantment answer after swap 7.** Cleanup Crew is free and is the next swap (for Hoard-Smelter Dragon, which only hits artifacts).
- **Hexhaven needs GGGG.** Green sources: 18 Forest, Tower, Thicket, Annex, Signet, Talisman, Llanowar, Frog, Caryatid, Florahedron, Ruby, Gilanra, Selvala. The lands it fetches enter tapped.
- **Selvala's draw is symmetric.** "its controller may draw a card if its power is greater than each other creature's power".
- **Konstrari Annex** enters tapped unless Domri or Garruk is out.
- **The clock by T7 does not improve in the sim.** That is because Avatar's double strike is modelled with no blockers and Hexhaven's lands are not modelled. The full draft is still stronger on consistency (39 lands, 4th land .915). Treat these 8 as stage 1.
- **The pending draft uses Beast Within and Fabled Passage.** Both are banned by name, although one spare copy of each exists by count. The ban file needs a ruling before that draft is sleeved.

## Guide errors (`.claude/skills/deck-building/reference/decks/gilanra-alena-partners.md`)
1. The guide describes the unsleeved draft (`gilanra-stompy/final.txt`), not the sleeved list. The sleeved deck has no pilot guide of its own.
2. §2 row 1 says "41 spells of MV 6+ in the 98". The draft has **37** (the 10-08 patches swapped 6+ drops for Loot, Echoes, Charm, Identity Echo, Hexhaven, Shaper).
3. §2 row 11 says "36 of 39 creatures are 5+ power". The draft has **48 creatures in the 98, 32 with power ≥ 5**.
4. §2 row 9 says "Block with it; every Moraug landfall from it is another combat". Wrong: Moraug's trigger says "if it's your main phase". Lands fetched while blocking (combat, often an opponent's turn) add no combat. Only main-phase damage counts, for example the Ragebeast fight.
5. §8 lists Earthshaker Dreadmaw as a maybeboard option ("Kozilek … / Earthshaker Dreadmaw | Oblivion Sower") although it is already in the main deck.
6. §3 / §7 count Fabled Passage and Beast Within as free. Both are now in the ban file (Beledros, Inspirit).
