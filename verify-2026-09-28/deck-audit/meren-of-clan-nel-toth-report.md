# Meren of Clan Nel Toth — audit report (2026-09-28)

## 1. Plan

"Whenever another creature you control dies, you get an experience counter... At the beginning of your end
step, choose target creature card in your graveyard. If that card's mana value is less than or equal to the
number of experience counters you have, return it to the battlefield." The deck fills its own graveyard fast
(Buried Alive, cheap sac outlets, edict effects) and Meren reanimates premium bodies for value or removal
(Ravenous Chupacabra, Junji). Blood Artist / Zulaport Cutthroat / Cauldron of Essence / Syr Konrad drain
opponents on every death; Braids (both), Liliana and Mazirek turn the sac engine into card advantage and
board pressure. Wins by grinding drain damage plus reanimated bombs, backed by 3 board wipes.

## 2. Health (current 101 vs proposed 100)

| Category | Current | Proposed | Note |
|---|---|---|---|
| Lands | 35 (18 nonbasic + 6 Forest + 11 Swamp) | 34 (19 nonbasic incl. Jungle Hollow + 6 Forest + 10 Swamp) | gate WARN, see §5 |
| Ramp | 8 (Sol Ring, Arcane Signet, Talisman, Elvish Mystic, Llanowar Elves, Sakura-Tribe Elder, Springbloom Druid, Solemn Simulacrum) | 8 (unchanged) | fine |
| Dedicated card draw | Deadly Dispute, Village Rites (+ ~5 incidental death-triggers) | + Night's Whisper | was thin outside death triggers |
| Spot removal | Assassin's Trophy, Infernal Grasp, Saw in Half, Ravenous Chupacabra | unchanged (4) | fine |
| Board wipes | Massacre Wurm, Toxic Deluge, Culling Ritual (3) | unchanged | operator-locked |
| Protection | Lightning Greaves, Veil of Summer (2) | unchanged | fine |
| Win conditions | Meren/Jarad/Liliana value engine, Gray Merchant + Massacre Wurm drain | + Vito (drain reach), + Grave Titan (body) | strengthened |
| Reanimation targets | Ravenous Chupacabra, Junji, Rune-Scarred Demon | Ravenous Chupacabra, Junji, Grave Titan | Grave Titan is a strictly bigger payoff |
| Avg MV | 2.88 (curve 1:10 2:18 3:19 4:9 5:6 6:4 7:2) | 2.88 (curve 1:10 2:19 3:19 4:7 5:6 6:4) | 2 seven-drops cut, 1 six-drop added — top end got cheaper |
| Game changers | 1 (Braids, Cabal Minion) | 1 (unchanged) | well under the bracket-3 cap of 3 |

No structural problems: card count now exactly 100, singleton respected, no missing category.

## 3. Swaps (ranked by impact)

| # | IN | OUT | Why IN | Why OUT is the weakest slot |
|---|---|---|---|---|
| 1 | Night's Whisper — "You draw two cards and lose 2 life." | Butcher of Malakir — "Whenever this creature or another creature you control dies, each opponent sacrifices a creature of their choice." | Fixes the deck's thinnest category (card draw outside death triggers) for 2 mana | 7-mana edict is redundant with the cheaper Braids, Cabal Minion (every-upkeep edict) and Accursed Marauder/Plaguecrafter; rarely reached live |
| 2 | Vito, Thorn of the Dusk Rose — "Whenever you gain life, target opponent loses that much life." | Grim Servant — "search your library for a card with mana value ≤ your devotion to black... You lose 3 life." | Turns the deck's many small incidental life gains (Blood Artist, Cauldron of Essence, Zulaport Cutthroat, Gray Merchant) into direct reach | Weak 3-power body, conditional tutor that overlaps with Emeritus of Woe // Demonic Tutor already in the 100 |
| 3 | Grave Titan — "Deathtouch. Whenever this creature enters or attacks, create two 2/2 black Zombie creature tokens." | Rune-Scarred Demon — "When this creature enters, search your library for a card, put it into your hand." | Strictly better reanimation payoff for Reanimate/Victimize/Jarad/Meren's end step: deathtouch blocker + instant board plus more sac fodder | Its tutor effect duplicates Emeritus of Woe // Demonic Tutor and Buried Alive already in the deck; body does nothing on its own |
| 4 | Jungle Hollow — "{T}: Add {B} or {G}." (+1 life ETB) | High Market — "{T}: Add {C}. {T}, Sacrifice a creature: You gain 1 life." | Colored dual fixes the BB/GG-heavy curve (Jarad {B}{B}{G}{G}, Mikaeus/Massacre Wurm {B}{B}{B}); Grim Backwoods already covers the colorless sac-outlet-land role | High Market only adds colorless mana; redundant with Grim Backwoods' identical colorless+sac-outlet template |
| 5 | — (no replacement) | 1x Swamp (11→10) | Trims to exactly 100 cards without touching a spell slot | Basics are unlimited and cheapest card to cut by one; land count moves from 35 to 34, flagged and justified below |

Game changers: 1 before, 1 after (unchanged) — well under the bracket-3 cap of 3.

## 4. Coverage (every pool card meeting rank ≤3000, price ≥$4, game changer, or commander-referencing legendary/planeswalker)

No game changers and no legendary/planeswalker referencing Meren's experience-counter mechanic exist in the
pool. 171 cards meet the rank/price criteria; grouped by why they lost to the current build (0 cards omitted).

**ADD (in the swaps table above):** Night's Whisper #182, Vito, Thorn of the Dusk Rose #492, Grave Titan
#1400, Jungle Hollow #785.

**REJECT — not physically available (per brief):** Innkeeper's Talent #688.

**REJECT — already running one copy in the deck (duplicate open copy):** Path of Ancestry #14, Infernal
Grasp #261 (dup listing), Vernal Fen #693 (dup), Blooming Marsh #1530 (dup), Butcher of Malakir #1371 (dup,
also cut — see swaps), Festering Thicket #1899 (dup); Night's Whisper's 2nd copy #182 — one is enough.

**REJECT — operator already decided this exact card before (HISTORY.md), nothing new changes it:**
Diabolic Tutor #485 (superseded by Emeritus of Woe), Insidious Roots #1451 ("Culling Ritual back in over
Insidious Roots"), Umbral Collar Zealot #1326 ("Springbloom Druid over Umbral Collar Zealot"), Honest
Rutstein #1815 ("Saw in Half stays, Honest Rutstein out"), Mirkwood Bats #228 (cut from the physical deck
in v5).

**REJECT — ramp/land-fixing, redundant with the 8-piece ramp suite + 18 nonbasic lands already running:**
Cultivate #20, Rampant Growth #27, Evolving Wilds #19, Terramorphic Expanse #28 (×2), Skyshroud Claim #300,
Burnished Hart #497, Wayfarer's Bauble #124, Roiling Regrowth #1050, Harvest Season #2443, Flare of
Cultivation #2185, Blighted Woodland #925, Shared Roots #1063, Fertile Ground #1078, Abundant Growth #2428,
Temple of the False God #83, Palladium Myr #741, Worn Powerstone #574, Bender's Waterskin #567, Charcoal
Diamond #698, Elvish Spirit Guide #746, Devoted Druid #966, Everflowing Chalice #254, Opal Palace #676,
Muraganda Raceway #1432, Nesting Grounds #559, Commander's Sphere #52 (×2), Sword of the Animist #235,
Loot, Exuberant Explorer #893, Elvish Archdruid #880 (needs an Elf tribe this deck doesn't run), Ilysian
Caryatid #1779, Paradise Druid #2090, Nightshade Dryad #2780, Simulacrum Shaper #25232, Cycle of Renewal
#1932, Pristine Talisman #1354, Nyx Lotus #1761 (devotion too inconsistent), Ornithopter of Paradise #220,
Explore #234.

**REJECT — utility/fixing lands not needed over the current 19-land nonbasic base:** Rogue's Passage #18
(no evasion payoff big enough), Golgari Rot Farm #334 (×2, bounce tempo loss), Riveteers Overlook #715
(×2), Haunted Mire #1296, Arid Archway #1500, Maestros Theater #1281, Mudflat Village #2932, Hidden Grotto
#2257, Conduit Pylons #2014 (×2), Radiant Fountain #1559, Witch's Clinic #1069 ($15 for a niche
lifelink-commander mode this deck rarely wants).

**REJECT — card draw, weaker or narrower than Night's Whisper / the death-trigger draw suite already
running (Morbid Opportunist, Grim Haruspex, Midnight Reaper, Liliana):** Sign in Blood #232, Harmonize
#326, Painful Truths #1720 (same rate as Night's Whisper, redundant), Syphon Mind #1049, Peer into the
Abyss #1280 (BBB + half your life, too costly), Mishra's Bauble #1106, Greed #2191, Plumb the Forbidden
#1152, Corrupted Conviction #599 (×3, redundant with Deadly Dispute/Village Rites already running).

**REJECT — single-target/mass removal, redundant with the locked suite (Assassin's Trophy, Infernal Grasp,
Saw in Half, Ravenous Chupacabra, Massacre Wurm, Toxic Deluge, Culling Ritual):** Putrefy #339, Murder
#856, Sheoldred's Edict #1149, Murderous Rider // Swift End #1667, Black Sun's Zenith #1929, Massacre Girl,
Known Killer #1698 (wither hurts our own board), Casualties of War #1827 (BBGG, too symmetric/slow),
Consuming Corruption #2437 (×2), Binding the Old Gods #1358.

**REJECT — +1/+1 or -1/-1 counters sub-theme this deck doesn't run:** Glissa Sunslayer #1375, Archfiend of
Ifnir #1288, Contagion Clasp #1423, Qarsi Revenant #2379, Forsaken Miner #2434 (×2), Undying Malice #1311
(×2), Dread Presence #2575, Hornet Nest #2802, Bloated Contaminator #2606, Chomping Changeling #2554,
Earthshaker Dreadmaw #2391, Regal Behemoth #2417, Primordial Hydra #2433, Mycoloth #2104, Monstrous Vortex
#2177, Verdant Sun's Avatar #2179, Primeval Bounty #2180, Earthbender Ascension #2189, Springleaf Parade
#1869, Tendershoot Dryad #1304, Rishkar, Peema Renegade #870, Steel Overseer #809, Realmwalker #607,
Forgotten Ancient #390, Necroskitter #2939 (needs opponents taking -1/-1 counters, our wipes don't make
those).

**REJECT — reanimation targets/effects weaker than Grave Titan or the existing suite (Reanimate, Victimize,
Cauldron of Essence, Jarad):** Rise of the Dark Realms #495 (9 mana, too clunky), Noxious Gearhulk #1003,
Puppeteer Clique #2587 (temporary steal only), Persist #1349, Nether Traitor #2388 (Bloodghast already
covers this), Metamorphosis Fanatic #2850 (Miracle is unreliable), Supernatural Stamina #1767.

**REJECT — lifegain payoffs, redundant with Vito (added) or the existing Blood Artist/Zulaport/Cauldron
package:** Sanguine Bond #505, Alhammarret's Archive #970 (do-nothing rock), Well of Lost Dreams #1131
(do-nothing rock), Twilight Prophet #1134 (needs 10 permanents + city's blessing), Witch of the Moors
#2568, Venser's Journal #1998, Vengeful Bloodwitch #1764, Sangromancer #2023, Dina, Soul Steeper #2746.
**Archfiend of Despair #2680 — genuinely close call:** an 8-mana finisher that doubles every opponent's
life loss from our drain effects (Blood Artist, Zulaport, Syr Konrad). Benched this pass only because it
would be a 3rd 7+-mana card after keeping Jarad/Junji/Liliana at the curve top; worth a future look if the
curve gets more support.

**REJECT — off-plan finishers/value engines that don't use the sac/graveyard shell:** Lumra, Bellow of the
Woods #1130, Ghalta, Primal Hunger #460, Cityscape Leveler #2114, Omnipresence #26979, The Echoverse
Fulcrum #27737, Avatar Kyoshi, Earthbender #4331, The Legend of Kyoshi // Avatar Kyoshi #3073, Helix
Pinnacle #4488, Tarmogoyf #9480 (cares about card types, not creature count), Sapling of Colfenor #6703,
Carnivorous Cultivator // Enroot #26583, Necrotic Ooze #4569 (few relevant activated abilities in this
graveyard), Shard of the Nightbringer #5603, Torpor Orb #3484 (would shut off our own ETBs — Ravenous
Chupacabra, Solemn Simulacrum), Planetarium of Wan Shi Tong #3624, Lost Jitte #4482, Pact Weapon #5696,
Stensian Sanguinist // Exsanguinate #4796, Vampire Nighthawk #1750, Loxodon Warhammer #972, Gonti, Lord of
Luxury #2074, Skirge Familiar #2931, Adaptive Automaton #1766, Boggart Trawler // Boggart Bog #633
(actively anti-synergy — exiles a graveyard), Elixir of Immortality #1443 (resets our own graveyard), Fog
#657, Bushwhack #1258, Hunter's Insight #1058, Carpet of Flowers #1287, Overrun #1708, Lavaspur Boots
#1521, Tree of Perdition #1911, Outcaster Trailblazer #2889, Blood Pet #2622 (×3).

**REJECT — individually checked, oracle text vs this deck:** Shamanic Revelation #368 — "Draw a card for
each creature you control. Ferocious — gain 4 life for each creature with power 4+" — needs a wide,
standing board; this deck's own sac outlets keep creature count low, so it rarely beats Night's Whisper's
guaranteed draw 2. Cankerbloom #814 — "{1}, Sacrifice this creature: Destroy target artifact/enchantment,
or proliferate" — Haywire Mite already covers this exact artifact/enchantment-answer role and is
operator-locked. Goldvein Hydra #1439 — "Enters with X +1/+1 counters. Vigilance, trample, haste. When this
creature dies, create Treasure tokens equal to its power" — an X-spell body with no sac-engine synergy
(doesn't discount our sacrifices, just dies into mana); off-plan. Dreadhorde Invasion #1449 — "upkeep, lose
1 life and amass Zombies 1... Zombie tokens with power 6+ gain lifelink when attacking" — the Zombie-amass
subtheme isn't present anywhere else in the 100; too slow on its own. Beledros Witherbloom #1455 — "Flying.
upkeep, create a 1/1 Pest... Pay 10 life: untap all lands you control" — 7-mana BG body that doesn't touch
the graveyard, and paying 10 life is too risky in a deck that already pays life for Reanimate/Toxic
Deluge/Infernal Grasp. Bitterthorn, Nissa's Animus #1953 — "Living weapon... Equipped creature gets +1/+1.
Whenever equipped creature attacks, search your library for a basic land card" — a 3-mana equipment body
that duplicates the ramp package's land-tutor effect at a slower clock (needs to attack first); redundant
with the ramp-rejection bucket above. None of these six beat an existing 100-card slot — swaps unchanged.

**REJECT — planeswalkers off-plan (no card in the pool references Meren's experience-counter mechanic):**
Selvala, Heart of the Wilds #410, Nissa, Who Shakes the World #1657 (needs a heavy Forest count we don't
run), Kozilek, the Great Distortion #1567 (10 mana), Rankle, Master of Pranks #1398 (needs reliable combat
damage), Varragoth, Bloodsky Sire #1952, Vraska Joins Up #2616.

## 5. Gate result

`MTG_DB_DIR=... npx tsx scripts/deck-gate.ts <proposed> --format commander --owner 1 --source paper`

```
totals    : 100 cards | 34 lands (34.4 eff.) | 65 nonland | avg MV 2.88
VERDICT   : FAIL (only on `plan`, expected)
  PASS  size        100 cards (commander wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in commander
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside BG
  PASS  ownership   all cards owned
  WARN  arenaNames  3 card(s) exported front-face only (Emeritus of Woe, Grave Researcher, Revitalizing
                    Repast) — cosmetic for a paper deck; was a FAIL before I dropped the "// Back" suffix
  WARN  lands       34 lands (37 ±2 target) — justified: 8 ramp pieces (Sol Ring, Arcane Signet, Talisman
                    of Resilience, Elvish Mystic, Llanowar Elves, Sakura-Tribe Elder, Springbloom Druid,
                    Solemn Simulacrum) push effective mana sources to ~42, well inside the normal range
  FAIL  plan        gate has no plan profile for Meren ("general value" placeholder) — known/acceptable
                    per brief
  PASS  curve       avg MV 2.88
  PASS  wincons     11 win condition(s)/closer(s)
  PASS  locks       1 locked card(s) present and intact
```

## 6. Reality Fracture pass

Baseline (REFUTE.md §2, final): deck − Creakwood Liege + Vito, Thorn of the Dusk Rose (− Grim Servant) +
Grave Titan (− Rune-Scarred Demon) + Jungle Hollow (− High Market). Butcher of Malakir stays; no Night's
Whisper. All nine cards below REJECT — none beat a slot in that 100.

- **Edgar, Moonlit Sovereign** — REJECT: "At the beginning of your end step, if you didn't cast a spell
  this turn, put two +1/+1 counters on Edgar" is anti-synergy with a deck that casts sac/removal spells
  most turns, and there is no +1/+1-counters payoff to catch what it does grow.
- **Eye of Jace** — REJECT: "sacrifice this artifact, it deals 2 damage to each opponent, and you gain 2
  life" fires once, ever, and only after 7+ graveyard cards; Blood Artist/Zulaport/Syr Konrad already
  drain on a repeating trigger for less setup.
- **Fblthp, Knows the Way** — REJECT: "Fblthp's power is equal to the number of basic land types among
  lands you control" caps at 2 (Forest, Swamp are the only basics run), so it's a small body that tutors
  basics — same bucket as the 8 ramp cards already rejected; the ramp suite is full.
- **Inspired Tethermage** — REJECT: "Whenever you put one or more loyalty counters on a planeswalker" only
  fires off Liliana's own +1 (once a turn at best) — no other planeswalker or proliferate effect is in the
  100 to feed it, and "{6}: Empower Jace 2" is a dead Jace-token subtheme.
- **Keeper of the Quiet Hour** — REJECT: "empower Jace 2" creates/feeds a Jace planeswalker token with zero
  other support anywhere in the deck (no proliferate, no second Jace card); a vanilla 3-mana body otherwise.
- **Loot, the Nexus** — REJECT: "Add one mana of that color for each different power among creatures you
  control" needs a stable, power-diverse board; this deck's own sac outlets (Viscera Seer, Carrion Feeder,
  Woe Strider, Yahenni) actively thin the board every turn, undercutting its own ramp.
- **Murmuring Volume** — REJECT: "{T}: Add one mana of any color" is another mana rock in the already-full
  ramp bucket; "{2}, {T}, Discard a card: Draw a card" is card-neutral, weaker than any draw already
  considered.
- **Solve for Disappointment** — REJECT (closest call): "choose a nonland permanent card from [their hand],
  that player discards that card" is real hand disruption the 100 doesn't otherwise run, but there's no
  open slot for it — Butcher of Malakir was confirmed KEEP in REFUTE.md §2 (a repeatable edict off free sac
  outlets, not redundant), and every remaining card is either operator-locked or a confirmed KEEP.
- **Teyo, Diamondblade Mage** — REJECT: "target permanent you control gains deathtouch... a +1/+1 counter
  on it if it's a creature" is a one-shot combat trick on a 4-mana flash body; no counters payoff exists to
  make it repeat, and it never touches the graveyard/sac plan.
