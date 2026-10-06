# Gilanra + Alena (paper, R/G partners): converged build, 2026-10-07

**Verdict.** 11 changes: 9 nonland swaps, 1 land swap and 1 basic swap. The list stays at **36 lands**. The full list is in `proposed.txt`. Gate: all PASS except the expected `identity` FAIL, plus WARNs for `lands` (Karsten 45 ±2) and `arenaNames` (irrelevant for paper). `identity.py`: 100 cards, none outside R/G.
`quick.md` is superseded where it differs: Bane now goes out for Cleanup Crew, and Gruul Turf replaces Thicket.

## §1 Game plan
- **Primary (combat + ETB value).** Ramp into MV 6+ fatties. Gilanra's {G} draws a card for each one. Alena turns the power of the creature that entered into {R}, so one fatty pays for a second the same turn. Packleader, Sage, Soul, Trailblazer, Warstorm and Terror convert each body into cards and damage.
- **Turns 1–3:** Sol Ring, Signet, Talisman, Llanowar, Ruby, Nature's Lore and Farseek; then Gilanra, Selvala, Trailblazer, Vastlands Scavenger or Master's Guidance.
- **Turns 4–6:** Alena on turn 4–5, then one fatty per turn plus the Alena chain from her second turn.
- **Close (turn 7+), primary:** Warstorm Surge / Terror ETB burn, then a Pyrewood Gearhulk or Thunderfoot Baloth alpha, with Drakuseth and Hideous Taskmaster.
- **Close, backup (different axis):** direct damage that needs no board, from Myojin (3 × 7), Burning Sun's Avatar and Combustible Gearhulk.

## §2 Swaps (Out → In)
| # | Out | In | Role | Why (DB text) |
|---|---|---|---|---|
| 1 | Bane of Progress | Cleanup Crew | removal (art./ench.) | Bane: "destroy all artifacts and enchantments". It kills our Sol Ring, Signet, Talisman, Monstrous Vortex, Warstorm Surge, Planetarium, Cyclops (an enchantment creature) and both Gearhulks. Crew: "When this creature enters, choose one — • Destroy target artifact. • Destroy target enchantment." It is still a 6/6 for 6, so Gilanra draws and Alena makes 6. |
| 2 | Fling | Beast Within | instant interaction | Fling: "As an additional cost to cast this spell, sacrifice a creature." That costs us a card and a fatty. Beast Within: "Destroy target permanent." It is the list's only instant answer to every permanent type. |
| 3 | Sakiko, Mother of Summer | Selvala, Heart of the Wilds | ramp + draw | Sakiko is a 3/3 for 6 that makes mana only "Whenever a creature you control deals combat damage to a player". Selvala costs 3: "{G}, {T}: Add X mana in any combination of colors, where X is the greatest power among creatures you control". That is 6–10 mana of any colour every turn (fixes RRR), and "its controller may draw a card if its power is greater than each other creature's power". |
| 4 | Rorix Bladewing | Nature's Lore | ramp | Rorix: "Flying, haste". It is a vanilla 6/5, and Emissary of Grudges is the same body plus a redirect. Nature's Lore: "Search your library for a Forest card, put that card onto the battlefield". That is untapped on turn 2. MV ≤ 2 ramp goes 5 → 7. |
| 5 | Ruric Thar, the Unbowed | Farseek | ramp + red | Ruric: "Whenever a player casts a noncreature spell, Ruric Thar deals 6 damage to that player". This list casts 14 noncreature spells (rocks, Garruk, Warstorm, Beast Within …). Farseek: "Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped". It gets a Mountain, and red is the short colour (§3). |
| 6 | Shamanic Revelation | The Legend of Kyoshi | draw | Shamanic is MV 5 (no Gilanra draw): "Draw a card for each creature you control". Kyoshi is MV 6: "I — Draw cards equal to the greatest power among creatures you control" (typically 6–10). II: "Earthbend X, where X is the number of cards in your hand". III flips into Avatar Kyoshi (5/4, Scryfall): "{T}: Add X mana of any one color, where X is the greatest power among creatures you control." |
| 7 | Ulvenwald Observer | Vastlands Scavenger // Bind to Life | early body + fatty cheat | Observer only draws "Whenever a creature you control with toughness 4 or greater dies". Scavenger is a 3-MV 4/4 deathtouch, so it triggers Trailblazer and Packleader and turns on MG. It "enters prepared": Bind to Life (instant, {4}{G}) does "Mill seven cards. Then put a creature card from among them onto the battlefield". That is P(≥ 1 creature in 7) ≈ 0.99 with 47 creatures, and the best fatty of 7 for 5 mana; cast it in the main phase and Alena taps for its power. |
| 8 | Aurora Phoenix | Master's Guidance | draw engine | Phoenix's cascade hits a "nonland card that costs less", which late in the game is mostly a 2-MV rock. Its recursion needs "a spell with cascade" (2 others). MG: "At the beginning of your end step, if you control a creature with power 4 or greater, draw a card." Alena alone (4/3) turns it on. It also says "Whenever you attack with two or more legendary creatures, put a +1/+1 counter on each of up to two target attacking creatures" (12 legendary creatures, commanders included). |
| 9 | Hoard-Smelter Dragon | Gigantic Big Bear | threat / Alena fuel | Smelter is a 5/5 flyer: "{3}{R}: Destroy target artifact". Cards 1–2 now cover artifacts. Big Bear is a 10/7: "This spell can't be countered. Hexproof, haste". Power 10 is 10 {R} from Alena, 10 from Selvala and 10 cards from Kyoshi, and it triggers Vortex (discover 7), Paleoloth, Packleader and Trailblazer. |
| 10 | Diamond City | Gruul Turf | land / colour | City: "{T}: Add {C}". That is colourless in a list with 4 RRR cards (Burning Sun's Avatar, Drakuseth, Tyrant, Myojin). Turf: "{T}: Add {R}{G}" ("enters tapped", "return a land you control to its owner's hand"), so it is a source of both colours and +1 mana from turn 3. It also rebuys landfall for Rampaging Baloths. |
| 11 | 1 Forest | 1 Mountain | colour | 16 Mountain / 17 Forest. Red is short for {3}{R}{R}{R}, and green has a surplus (§3). |

## §3 Land and ramp verdict: keep 36 lands
- **Karsten regression** (31.42 + 3.13·avgMV − 0.28·cheap):
  - current: avgMV 5.66, 5 cheap → **47.7**;
  - proposed: 5.44, 7 cheap → **46.5**.
  - The fit comes from decks with avg MV ≈ 2.5–4, so at 5.4 it is extrapolating. It also ignores a commander dork (Gilanra) and Alena's doubling. The gate's 45 ± 2 comes from the same source.
- **Opening 7 (hypergeometric, 99 cards):**

| Configuration | P(≥ 3 lands) | "Keepable" (≥ 2 lands and lands + cheap ramp ≥ 3) |
|---|---|---|
| 36 lands, current | .501 | .596 |
| 36 lands, proposed | .501 | **.643** |
| 38 lands, no new ramp | .548 | .636 |
| 40 lands, no new ramp | .594 | — |

- **Goldfish** (`sim.py`, 25k pod games, colour ignored). Assumptions:
  - Gilanra: +1 from the turn after she is cast.
  - Alena: +6 once per turn after a fatty enters.
  - Selvala: X = greatest power.
  - Mulligan: free, then London.

| Configuration | 6-drop by T4 / T5 / T6 | Fatties cast by T8 | ≤ 1 fatty by T7 | Alena by T5 |
|---|---|---|---|---|
| current (36) | .15 / .75 / .88 | 5.47 | .07 | .95 |
| **proposed (36)** | .15 / .75 / **.91** | 5.21 | **.05** | .96 |
| proposed + 2 lands (38) | .15 / .79 / .93 | 5.14 | .04 | .97 |
| current + 4 lands (40) | .16 / .83 / .93 | 5.39 | .04 | .98 |

  - The throughput drop (5.47 → 5.21) is a model artefact: it counts only fatties cast, not the cards Kyoshi and MG draw, the fatty that Bind to Life cheats, or removal.
- **Colours** (Karsten 99-card table, scaled to 36 lands; rocks .75, fragile dorks .5, 2-MV land ramp .75):
  - {3}{R}{R}{R} needs 28/41 → **24.6** red sources. Current has **19** (17 lands + 2.0). Proposed has **22.25** (19 lands + 2.0 + Farseek .75 + Selvala .5). Alena covers RRR from her second turn.
  - {4}{G}{G} needs 22/41 → 19.3 green. Proposed has ≈ 23 (17 Forest + Tower + Turf + Llanowar, rocks, Ruby, Lore, Selvala, Gilanra).
- **Verdict.** 36 lands is enough: the commanders are effectively lands 37–38. The 3 ramp swaps give the same keepable-hand gain as +2 lands, and they also fix red. Going to 38 (e.g. Sheltered Thicket + a basic) adds about 2 points at T6 and costs ~0.07 fatties by T8. That is a near-tie: **operator's call, no change proposed.**

## §4 Stop proofs (best unused pool card vs weakest kept card, per role)
| Role | Weakest kept | Best unused | Why it loses |
|---|---|---|---|
| Cheap ramp | Talisman of Impulse ("{T}: Add {R} or {G}. This artifact deals 1 damage to you.") | Ilysian Caryatid ("If you control a creature with power 4 or greater, add two mana of any one color instead.") | The Caryatid is summoning-sick and dies to every wipe; the Talisman taps the turn it lands. Near-tie, so the incumbent stays. |
| Ramp vs threat slot | Boarding Party (6/3 haste, cascade) | Three Visits / Cultivate / Skyshroud Claim / Nissa, Who Shakes the World | A 3rd 2-MV land-ramp spell adds ≈ 1 point at T6 in the sim; Nissa costs 5 and doubles only Forests. Near-tie → keep. |
| Draw | Master's Guidance (new) / Etali | Hunter's Insight ("Whenever that creature deals combat damage to a player or planeswalker this turn, draw that many cards") | It needs an unblocked or trampling hit. MG draws with no combat. Harmonize (3 cards for 4) is below Kyoshi's rate. |
| Removal | Havoc Eater (goad) / Nessian Wilds Ravager (opponent picks tribute) | Rocky Rebuke ({1}{G} instant: "Target creature you control deals damage equal to its power …") | Strong, but the deck's removal rides on fatties that also feed Gilanra, Alena and the ETB engines. Cityscape Leveler ≈ Myojin (both 8 MV). Near-ties, §7. |
| Protection | Emissary of Grudges (one redirect) | Guardian Augmenter ("Commanders you control have hexproof", flash) / Tyvar's Stand | Spearbreaker (anti-destroy for power ≥ 5), Dawnglade (monarch hexproof) and Big Bear's hexproof meet B3's 3–4. Augmenter is the pick only if the table targets Alena, §7. |
| Finisher | Avatar of Slaughter (symmetric: "All creatures have double strike and attack each combat if able") | Overrun (+3/+3 trample, one-sided, MV 5) | Overrun closes more reliably. Avatar is an 8-power creature (Alena 8, Gilanra, Packleader, Vortex), which Overrun can't feed. Near-tie, §7. |
| Fatty / threat | Boarding Party / Conclave Sledge-Captain | Spinewoods Armadillo (7/7 reach, ward {3}, "{1}{G}, Discard this card: Search your library for a basic land card") / Gigantosaurus (10/10, {G}{G}{G}{G}{G}) | Armadillo trades haste + cascade for land flexibility, a near-tie. Gigantosaurus' GGGGG is rarely castable before turn 7. |
| Lands | basic Mountain / Spinerock Knoll | Sheltered Thicket (tapped R/G, cycling) / Temple of the False God / Oran-Rief | An untapped basic beats a tapped dual on turn 2 (Lore/Farseek turns). Temple is dead below 5 lands. Oran-Rief taps for a counter instead of mana. |

A full pass of all 364 pool cards finds no other card that clearly beats the weakest kept card of its role. Non-R/G-relevant cards were ruled out on text: Islands-based Carpet of Flowers, Pest/Food/Jace/party/outlaw/-1/-1/X-spell support, Eldrazi {C} costs, white/black hosers, and Wheel/Spree pieces.

## §5 Synergy density (`synergy.py`; links = other nonland cards a card directly interacts with)
- **Current:** min 0, median 30. **Proposed:** min 0, median **32**. Gilanra has 46 links, Alena 44.
- **5 lowest:** Arcane Signet 0, Beast Within 0, Sol Ring 0, Talisman of Impulse 0, Farseek 1. These are all mana or interaction, which the rule judges on efficiency.
- **Lowest threats:** Llanowar Elves 17 and Havoc Eater 19. Havoc Eater is undercounted: it is printed 3/3 but grows on ETB.
- **New cards:** Vastlands 52, Selvala 48, Master's Guidance 47, Kyoshi 33, Big Bear 31, Cleanup Crew 31.

## §6 Gate (proposed.txt)
```
size PASS · singleton PASS · legality PASS · rules PASS · identity FAIL (first commander only; identity.py: 100 cards, outside R/G: none)
ownership PASS · arenaNames WARN (paper) · lands WARN 36 vs 45±2 (§3) · plan PASS 42/62 · curve PASS avg MV 5.44 · wincons PASS · locks PASS
```

## §7 Near-ties left to the operator
- Overrun ↔ Avatar of Slaughter: one-sided and cheaper, vs an 8-power body that feeds the engines.
- Ilysian Caryatid ↔ Talisman of Impulse.
- Three Visits ↔ Boarding Party: a 3rd 2-MV land-ramp spell.
- Rocky Rebuke ↔ Havoc Eater: a cheap instant answer.
- Guardian Augmenter ↔ Emissary of Grudges: if the pod kills Alena on sight.
- Spinewoods Armadillo ↔ Boarding Party: landcycling.
- Cityscape Leveler ↔ Myojin of Roaring Blades.
- Hunter's Insight ↔ Master's Guidance.
- 38 lands (+ Sheltered Thicket, + basic) for Boarding Party and Sweet-Gum Recluse (§3).

## §8 Planetarium of Wan Shi Tong
The operator owns one copy. It is sleeved in this deck and kept here: "{1}, {T}: Scry 2" plus a free cast of the top card once per turn is strong value at 6 MV. It also appears in the unsleeved Urza draft (`verify-2026-10-06/urza-found/final-3.txt`). That draft needs a replacement before it is sleeved.
