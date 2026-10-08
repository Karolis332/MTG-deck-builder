# Bumi, Unleashed: review of the sleeved list (2026-10-09)

**Verdict.** The sleeved deck is illegal: three Landscapes are outside R/G. Fixing those three is mandatory. Five more swaps add a finisher, Bumi protection, haste and a better 5-drop. Score: -14.69 -> **37.37** objective, Deck Score 19 -> **57.2**. Most of that gain is the identity fix (97 legal cards become 100). The model cannot see Nissa or Overrun, so those two are judgment calls.

## Scores (score.ts, 300 games; climb at 100 games)
| List | Objective | Deck Score | Penalty | Win | Synergy | Structure | Bumi turn |
|---|---|---|---|---|---|---|---|
| sleeved (3 Landscapes "missing" = off-identity) | -14.69 | 19.0 | 23 | 38 | 72 | 0 | 5.39 |
| lab ALL, with Kami of Whispered Hopes in slot 8 | 29.51 | 51.3 | 17 | 39 | 84 | 100 | - |
| **final.txt** (Guardian Augmenter in slot 8) | **37.37** | **57.2** | 16 | 47 | 81 | 100 | 5.31 |
| model climb (`climb/results-0.jsonl`, not converged) | 78.41 | 68 | 1 | 60 | 70 | 100 | 5.12 |

How to read the climb's lead: it gets there by cutting ramp from 21 to 10 to fit the window (each card is worth +2 to the model) and by adding removal bodies. Our ramp is land drops, and land drops are the plan, so cutting them would gut the deck.

## Model climb (2 passes, 1,037 evaluations)
- **Cuts the model made:** Explore, Summon: G.F. Ifrit, Braulios, Seize the Spoils, Commander's Sphere, Frog Butler, Bushwhack, Tectonic Split, Circuitous Route, Shared Roots, Nature's Lore.
- **Cuts I take:** Ifrit, Tectonic Split, Circuitous Route.
- **Cuts I reject:** the rest. They are ramp-window cuts. Braulios ("draw a card, then you may put a land card from your hand onto the battlefield") is on-plan.
- **Adds the model made:** Cityscape Leveler, Terastodon, Cleanup Crew, Devourer of Destiny, Gigantic Big Bear, Meteor Golem, Guardian Augmenter, The Echoverse Fulcrum, Stump Stomp, Tangled Florahedron, Village Pillagers. It padded the three Landscape slots with Lair of the Hydra, Reliquary Tower and Gruul Turf.
- **Adds I take:** Guardian Augmenter, Lair of the Hydra and Gruul Turf.
- **Adds I reject:** the rest are filler, either generic removal fatties or Fulcrum and Reliquary Tower.

## Swaps (base = sleeved; delta = swap-lab single swap, 300 games)
| # | Out -> In | Why (oracle) | Source | Delta |
|---|---|---|---|---|
| 1 | Sheltering Landscape -> Riveteers Overlook | The Landscape has "Cycling {R}{G}{W}", which puts W in its identity. Overlook: "search ... basic Swamp, Mountain, or Forest ... onto the battlefield tapped". That is two landfall triggers (Earthbender Ascension, Mightform Harmonizer, Tireless Provisioner). | free (2 owned, 0 used) | +1.98 |
| 2 | Tranquil Landscape -> Lair of the Hydra | The Landscape has "Cycling {G}{W}{U}". Lair: "{X}{G}: ... becomes an X/X green Hydra creature. It's still a land". It is a sink for the mana Bumi untaps, and it can attack in the land-only combat. | free | +1.89 |
| 3 | Twisted Landscape -> Gruul Turf | The Landscape has "Cycling {B}{R}{G}". Turf: "{T}: Add {R}{G}", so Bumi's "untap all lands" pays 2 twice, and the returned land is a second landfall. | free (the pending Gilanra draft also lists it) | +1.89 |
| 4 | Tectonic Split -> Nissa, Who Shakes the World | Split makes you "sacrifice half the lands", which is anti-plan. Nissa: "Whenever you tap a Forest for mana, add an additional {G}" and "+1: three +1/+1 counters ... Untap it ... vigilance and haste". That is a new land attacker every turn for Toph GE, Solid Ground and Seismic Tutelage. | free | -0.01 (blind) |
| 5 | Owlbear Cub -> Overrun | Owlbear only works "attacks a player who controls eight or more lands". Overrun: "+3/+3 and gain trample until end of turn", which lasts through Bumi's extra combat. | free | -0.00 (blind) |
| 6 | Summon: G.F. Ifrit -> Lavaspur Boots | Ifrit is two loots and {R}{R} over four turns. Boots: "haste and ward {1}", equip {1}: Bumi swings the turn he lands, every game. | free | +3.99 (window) |
| 7 | Circuitous Route -> Silkguard | Route is a 4-MV duplicate of the deck's 2-MV ramp. Silkguard: "modified creatures you control gain hexproof". Every earthbended land has counters, and with X >= 1 on Bumi he is covered too. | free | +3.96 (protection window) |
| 8 | Part in Friendship -> Guardian Augmenter | Part in Friendship is a 5-MV death trigger the deck rarely sets up. Augmenter: "Flash / Commander creatures you control get +2/+2. / Commanders you control have hexproof." Bumi is the single point of failure. | free (left Beledros 10-08) | +7.86 vs the Kami variant (win step) |

- **Kami of Whispered Hopes.** Lab delta -1.93 (ramp window). It was replaced by Augmenter: the final list measured +7.86 over the Kami variant, which is mostly the win component's close-turn step, not a precise number.
- **ALL:** -14.69 -> 37.37 (**+52.06**). About +44 of that is the 100-card/identity restoration, measured in the lab's ALL row.

## 10-07 standalone draft: which swaps still hold
| Draft swap | Status today |
|---|---|
| Sheltering -> Riveteers Overlook | holds (#1) |
| Tranquil -> Yavimaya | no: Yavimaya is now sleeved in Beledros (only copy). Lair of the Hydra goes there instead. |
| Twisted -> Terramorphic Expanse | no: banned by name (Beledros runs it). Gruul Turf goes there instead. |
| Lotus Field -> Lair of the Hydra | Lair is used for #2. Lotus Field stays: sacrificed earthbended lands "return ... tapped". |
| Tectonic Split -> Exotic Orchard | Split is cut (#4). Orchard is banned by name (4 of 5 copies in decks). |
| Haste Magic -> Lavaspur Boots | Boots taken over Ifrit instead. Haste Magic keeps its impulse card. |
| Circuitous Route -> Cultivate | no: Cultivate 2/2 used. Route goes for Silkguard (#7). |
| Earth Kingdom General -> Nissa | Nissa taken over Tectonic Split. The General stays (earthbend 2 body). |
| Owlbear Cub -> Overrun | holds (#5) |
| Faithless Looting -> Rampant Growth | not taken (8-swap cap). Next in line. |
| Veil of Summer -> Silkguard | Silkguard taken over Route. Veil stays as the anti-counter piece. |

## Plan and win lines (checked against the oracle)
- **Primary plan.** Bumi: "Whenever Bumi deals combat damage to a player, untap all lands you control. After this phase, there is an additional combat phase. Only land creatures can attack during that combat phase." Toph GE: "Land creatures you control have double strike". Temur Battle Rage on Bumi gives two damage steps, so two Bumi triggers and two land-only combats.
- **Backup plan.** A land-creature army (earthbend 2-4 across 15+ cards) with Overrun / Germination Practicum / Awakening of Vitu-Ghazi.
- **Line 1, Bumi + Toph:** (5 + 3 + 2x4x2) + (2x4x2) = 40. Holds.
- **Line 2, TBR on Bumi:** two extra combats. Holds.
- **Line 3, Overrun:** pumps both combats ("until end of turn"). Holds.
- One pilot rule needs care: Nissa +1 targets "noncreature land" only, so it cannot hit an already-earthbended land.

## Risks
- **Card collisions:**
  - Gruul Turf and Riveteers Overlook are also in the pending Gilanra stompy draft. Overlook has 2 copies, Turf has 1; the fallback for Turf is Konstrari Annex or Bristling Backwoods.
  - A parallel Gilanra review may pick the same free R/G cards (Overrun, Nissa, Silkguard, Boots).
- **Lands:** 33 (gate WARN, Karsten 37+-2), plus ~19 ramp pieces.
- **Gate:** `gate-final.txt` all PASS except `lands` WARN and `plan` FAIL (the known earthbend false negative). Ownership checked by hand against collection.txt (the gate skipped it).
- **Model blind spots:** Nissa and Overrun deltas are 0. The model cannot see earthbend or extra combats.

## Guide errors (no .md guide; checked `decks/paper/primers/bumi-unleashed.json`)
1. `deck.list` points to the unapplied 10-07 draft, not the sleeved list. Phases and engines cite cards that are not sleeved (Overrun, Nissa, Boots, Lair, Silkguard, Rampant Growth, Cultivate, Yavimaya).
2. The "Nissa and Yavimaya" engine is no longer buildable: Yavimaya is sleeved in Beledros.
3. Win line 1's "P(kill <= T6) .655" is the draft's sim, not the sleeved deck's.
4. The Nissa flow omits "noncreature land": she cannot re-target an earthbended land.
5. nearTies / keepers cite Terramorphic Expanse and Cultivate as available. Neither is free today.
6. The sleeved list itself runs 3 off-identity Landscapes. The primer does not flag that the deck is illegal as sleeved.
