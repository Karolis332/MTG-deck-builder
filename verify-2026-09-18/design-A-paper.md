# Design A — The Cabbage Merchant, PAPER Commander (4-player pod)

Upgrade of `decks/paper/decks/the-cabbage-merchant.txt`. **25 cuts / 25 adds** (21 new cards + 4 Forest).
Pool: `verify-2026-09-18/cabbage-pool-PAPER.txt` only, plus unlimited basic Forest.
`inc%` = share of 2,001 real paper Commander decks running the card. `lift` = commander-specificity (>2 strong, ~0 generic, <0 the corpus avoids it).
Second copy assumed (also sleeved elsewhere): **Llanowar Elves, Sakura-Tribe Elder, Eternal Witness**.

## 1. Strategy

- The commander is a **tax on the table, not on one opponent**: three opponents casting noncreature spells means roughly 3x the Foods a 1v1 build sees. The Food count is the deck's real mana curve.
- Foods are mana (Jaheira, Night of the Sweets' Revenge, the commander's own "tap two Foods"), then bodies (Halsin, Tough Cookie, Displaced Dinosaurs), then cards (Idol of Oblivion, Peregrin Took, Well of Lost Dreams).
- Peregrin Took + Academy Manufactor turn every token event anywhere in the deck into a Food batch; Second Harvest doubles the board once.
- **Defence replaces speed.** Seven fog/ambush effects buy the turns a pod costs. The commander's downside clause (sacrifice a Food when a creature damages you) is a free, untapped sacrifice that feeds Unlucky Cabbage Merchant and Syr Ginger, so getting hit is not pure loss.
- Seedborn Muse is the single best card here: it untaps Idol of Oblivion, Foods, and every fog three extra times per round.
- Win by making the board enormous once (Night of the Sweets' Revenge, Blossoming Bogbeast, Displaced Dinosaurs) rather than by grinding three opponents down.

## 2. Role counts

| Role | Count | Cards |
|---|---|---|
| Lands | 36 | 30 Forest + Ba Sing Se, Mosswort Bridge, Gingerbread Cabin, Sapseep Forest, Blighted Woodland, Rogue's Passage |
| Ramp / mana | 11 | Elvish Mystic, Llanowar Elves, Gilded Goose, Elvish Spirit Guide, Sakura-Tribe Elder, Rampant Growth, Cultivate, Kodama's Reach, Emerald Medallion, Nissa, Many Partings |
| Food / token makers | 11 | Guac & Marshmallow Pizza, Lembas, Spider-Ham, Tireless Provisioner, Giant Opportunity, Bosco, Orchard Strider, The Earth King, Tendershoot Dryad, Bumi's Feast Lecture, Party Dude |
| Food amplifiers | 3 | Peregrin Took, Academy Manufactor, Second Harvest |
| Food / artifact payoffs | 11 | Jaheira, Night of the Sweets' Revenge, Teething Wurmlet, Syr Ginger, Tough Cookie, Halsin, Displaced Dinosaurs, Unlucky Cabbage Merchant, Trudge Garden, Forgotten Ancient, Mishra's Bauble |
| Card advantage | 8 | Idol of Oblivion, Sarinth Steelseeker, Toski, Garruk's Uprising, Return of the Wildspeaker, Well of Lost Dreams, Ohran Frostfang, Disciple of Freyalise |
| Removal / interaction | 7 | Archdruid's Charm, Force of Vigor, Wicked Wolf, Kenrith's Transformation, Pest Infestation, Walking Ballista, Bridgeworks Battle |
| Defence / protection | 7 | Fog, Tangle, Spore Frog, Arachnogenesis, Autumn's Veil, Endurance, Hornet Nest |
| Tutors | 2 | Chord of Calling, Invasion of Ikoria |
| Recursion | 1 | Eternal Witness |
| Untap engine | 1 | Seedborn Muse |
| Finisher | 1 | Blossoming Bogbeast |

## 3. Mana curve

| MV | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Cards | 2 | 11 | 14 | 18 | 9 | 7 | 2 | 1 |

- Average MV (nonland) **2.86**, down from 3.25. Deliberately higher than a 1v1 curve: pods go long and 5-drops get cast.
- Top end is four cards that end games (Displaced Dinosaurs, Blossoming Bogbeast, Tendershoot Dryad, Bosco), not four cards that are merely large.
- The 12-drop is gone. Nothing costs more than seven.

## 4. Key inclusions

| Card | inc% | lift | Why |
|---|---|---|---|
| Peregrin Took | 95.7 | 3.10 | Every token event in the deck gains a Food. Sacrifice three Foods draws. |
| Academy Manufactor | 93.8 | 3.37 | Each Food becomes Clue + Food + Treasure: mana, cards, and artifact triggers at once. |
| Gilded Goose | 88.3 | 3.11 | **NEW.** One mana, makes Food, converts Food into any colour. Top-ranked owned card missing from the deck. |
| Jaheira, Friend of the Forest | 83.3 | 2.59 | Every token taps for {G}, including Saprolings, Spiders and Pests, not just Foods. |
| Sarinth Steelseeker | 68.4 | 3.75 | Turns the artifact flood into land drops and graveyard filling. |
| Second Harvest | 68.4 | 2.17 | One instant doubles the whole token board. Best single card with Tendershoot Dryad out. |
| Night of the Sweets' Revenge | 65.7 | 3.51 | Foods tap for {G} and the sacrifice mode is a pod-ending pump. |
| Tireless Provisioner | 57.0 | 1.29 | Landfall Food or Treasure every turn, and this deck plays 36 lands. |
| Llanowar Elves | 57.1 | 0.05 | **NEW.** Turn-one acceleration the deck was missing entirely *(second copy assumed)*. |
| Displaced Dinosaurs | 51.9 | 3.75 | Every artifact, legendary and Saga arrives as a 7/7. The deck's real finisher. |
| Unlucky Cabbage Merchant | 48.7 | 3.68 | Converts the commander's forced Food sacrifices into a free land. |
| Gingerbread Cabin | 46.2 | 2.34 | **NEW.** A Forest that makes a Food. Strictly better than the 31st basic. |

## 5. Notable exclusions

| Card | inc% | lift | Why not |
|---|---|---|---|
| Ghalta, Primal Hunger | 2.4 | -1.85 | MV 12 vanilla. One blocker in a pod and it did nothing. |
| Overrun | 1.3 | -1.69 | Night of the Sweets' Revenge and Blossoming Bogbeast do it scaled and repeatably. |
| Selvala, Heart of the Wilds | 1.8 | -2.25 | Its draw clause is symmetric. Three opponents draw off it. |
| Shamanic Revelation | 8.2 | -0.91 | Counts creatures. This deck's tokens are Foods, which are not creatures. |
| Explore / Shared Roots / Flare of Cultivation / Cycle of Renewal | 8.6 / 4.9 / 1.4 / 1.5 | all negative | Four more land-fetch spells on top of Cultivate, Kodama's Reach and Rampant Growth. Redundant. |
| Monstrous Vortex | 0.1 | -2.83 | Needs power-5 creature *spells*. The deck casts almost none. |
| Bloodspore Thrinax | 0.0 | - | Devour eats creatures; the deck makes artifacts. |
| Crystalline Armor | 0.9 | -0.60 | An aura in a four-player pod is a two-for-one waiting to happen. |
| Helix Pinnacle | 7.5 | 0.96 | 100 counters is a slower clock than attacking with 7/7s. |
| Craterhoof Behemoth | 21.4 | -0.05 | Not owned in paper. On the buy list below. |

### Dropped-card scan

Full sweep of all 278 pool rows for anything with **inc% >= 20 or lift >= 2.5**:

```
high-value rows: 42 | omitted: 0
```

**Every high-value card in the paper pool is in the 100.** Nothing was left behind. The lowest-inclusion cards that qualified on lift alone — Lembas (16.8 / 3.52), Party Dude (15.8 / 3.27), Well of Lost Dreams (8.3 / 2.63) — are all included. The only high-inclusion cards with negative lift that made it are the mana base and Cultivate, Rampant Growth and Emerald Medallion, which are generic staples the corpus runs everywhere.

## 6. Buy list — top 10 corpus cards not owned

| Card | inc% | lift | Replaces |
|---|---|---|---|
| Sol Ring | 83.7 | 0.17 | Emerald Medallion |
| Nuka-Cola Vending Machine | 81.5 | 3.60 | Mishra's Bauble |
| Heroic Intervention | 64.2 | 0.30 | Autumn's Veil |
| Beast Within | 61.3 | 0.07 | Kenrith's Transformation |
| Krark-Clan Ironworks | 55.5 | 3.89 | Sapseep Forest |
| Trail of Crumbs | 54.1 | 3.62 | Forgotten Ancient |
| The Shire | 53.9 | 2.51 | Blighted Woodland |
| Birds of Paradise | 53.6 | 0.81 | Sakura-Tribe Elder *(returns the borrowed copy)* |
| Transmutation Font | 52.5 | 3.82 | Ohran Frostfang |
| Boseiju, Who Endures | 51.9 | 0.57 | Rogue's Passage |

- Highest-value three: **Nuka-Cola Vending Machine**, **Krark-Clan Ironworks**, **Transmutation Font** — all above lift 3.5, meaning the corpus runs them *because* of this commander, not despite it.
- Sol Ring is the cheapest real upgrade in the deck at any price.

## 7. Validator

```
node verify-2026-09-18/check-deck-paper.cjs verify-2026-09-18/design-A-paper.txt --ci G
total cards     : 100   lands: 36   nonland: 64
avg MV (nonland): 2.86
curve           : 0:2 1:11 2:14 3:18 4:9 5:7 6:2 7:1
errors          : 0
```

## 8. Cuts and adds

Four cuts are lands, matched by four Forest, so **card-quality swaps are 21**.

### Cuts

| Out | inc% | lift | Reason | Slot taken by |
|---|---|---|---|---|
| Ghalta, Primal Hunger | 2.4 | -1.85 | MV 12, no text | Displaced-tier top end already covered |
| Avatar Kyoshi, Earthbender | 1.2 | -0.36 | Eight mana, does nothing on arrival | Tendershoot Dryad |
| Sandman, Shifting Scoundrel | 0.1 | -2.20 | Lowest-lift card in the deck | Gilded Goose |
| Monstrous Vortex | 0.1 | -2.83 | Trigger condition almost never met | Well of Lost Dreams |
| Crystalline Armor | 0.9 | -0.60 | Aura, two-for-one risk | Trudge Garden |
| Spry and Mighty | 0.3 | -1.45 | Five-mana combat trick | Blossoming Bogbeast |
| Oviya, Automech Artisan | 0.6 | -1.27 | Duplicates Garruk's Uprising | Hornet Nest |
| Bloodspore Thrinax | 0.0 | - | Devour wants creature tokens | Spider-Ham, Peter Porker |
| Loot, Exuberant Explorer | 1.0 | -2.00 | Off-plan | Lembas |
| Selvala, Heart of the Wilds | 1.8 | -2.25 | Symmetric draw helps three opponents | Llanowar Elves |
| The Legend of Kyoshi | 2.3 | -0.32 | Six mana, three turns to pay off | Endurance |
| Shamanic Revelation | 8.2 | -0.91 | Counts creatures, deck makes artifacts | Return of the Wildspeaker holds this role |
| Cream of the Crop | 0.0 | - | Zero corpus presence | Eternal Witness |
| Cankerbloom | 1.1 | -1.66 | Third-string artifact removal | Pest Infestation |
| Vivien's Arkbow | 0.3 | -0.65 | Mana sink that needs a creature-heavy deck | Autumn's Veil |
| Explore | 8.6 | -0.84 | Ramp glut | Elvish Spirit Guide |
| Cycle of Renewal | 1.5 | -1.01 | Ramp glut | Orchard Strider |
| Flare of Cultivation | 1.4 | -1.32 | Ramp glut | Sakura-Tribe Elder |
| Shared Roots | 4.9 | -0.25 | Ramp glut | Invasion of Ikoria |
| Lifeblood Hydra | 0.4 | -1.86 | Vanilla X-creature | Gingerbread Cabin |
| Overrun | 1.3 | -1.69 | Worse than the two overruns kept | Blossoming Bogbeast |
| Escape Tunnel | 0.5 | -2.21 | **Produces no mana at all** | Forest |
| Nesting Grounds | 0.4 | -1.17 | Counter-moving in a deck with few counters | Forest |
| Rumble Arena | 1.4 | 0.04 | Colourless in a {G}{G}{G} deck | Forest |
| Ash Barrens | 0.4 | -1.43 | Colourless unless cycled | Forest |

### Adds

| In | inc% | lift | MV | Why |
|---|---|---|---|---|
| Gilded Goose | 88.3 | 3.11 | 1 | Highest-inc owned card missing from the deck |
| Llanowar Elves | 57.1 | 0.05 | 1 | Turn-one ramp *(second copy assumed)* |
| Gingerbread Cabin | 46.2 | 2.34 | land | A Forest that makes a Food |
| Elvish Spirit Guide | 34.9 | 1.64 | 3 | Free {G}; turn-two Peregrin Took or Jaheira |
| Invasion of Ikoria | 30.6 | 1.49 | 2 | Puts a non-Human creature onto the battlefield from library **or graveyard** |
| Eternal Witness | 29.7 | 0.08 | 3 | Rebuys Second Harvest or a fog *(second copy assumed)* |
| Autumn's Veil | 27.2 | 1.81 | 1 | One mana blanks blue and black interaction for a turn |
| Endurance | 26.4 | 1.43 | 3 | Free flash 3/4 reach ambush plus graveyard hate |
| Lembas | 16.8 | 3.52 | 2 | Food that cantrips and shuffles itself back |
| Pest Infestation | 14.5 | 1.74 | X | Scales across three opponents' artifacts and enchantments, leaves 2X bodies |
| Rogue's Passage | 10.1 | -1.18 | land | Makes one 7/7 lethal through a clogged board |
| Well of Lost Dreams | 8.3 | 2.63 | 4 | Every Food sacrifice becomes up to three cards |
| Blossoming Bogbeast | 6.5 | 2.21 | 5 | A repeatable Overrun that scales with Food lifegain |
| Blighted Woodland | 6.5 | -0.58 | land | Fixes flood into two lands for Tireless Provisioner |
| Hornet Nest | 5.0 | 0.77 | 3 | Taxes all three opponents for attacking; tokens feed Peregrin Took |
| Sakura-Tribe Elder | 4.7 | -1.58 | 2 | Chump-block-and-ramp, premium in a pod *(second copy assumed)* |
| Tendershoot Dryad | 4.0 | 0.06 | 5 | Fires at **each** upkeep: four Saprolings and four Foods per round |
| Orchard Strider | 4.0 | 2.25 | 6 | Two Foods, or landcycles for {1}{G} when flooded |
| Spider-Ham, Peter Porker | 3.1 | 0.57 | 2 | Two-mana Food plus a real anthem for the Bears and Spiders |
| Trudge Garden | 2.8 | 2.29 | 3 | Converts Food lifegain into 4/4 tramplers |
| Sapseep Forest | 0.6 | -0.62 | land | A Forest with a repeatable lifegain trigger for Well and Trudge Garden |
| Forest x4 | - | - | land | 32 lands to 36 |

## 9. Considered cutting, kept

- **Forgotten Ancient** (1.8 / -1.75) — the corpus number is a 1v1 number. "Whenever a player casts a spell" fires roughly four times as often in a pod.
- **Ohran Frostfang** (3.4 / -1.56) — deathtouch on attackers makes every attack into a pod profitable, and it draws on each connection.
- **Return of the Wildspeaker** (10.9 / -1.20) — instant-speed draw equal to the greatest non-Human power. With Displaced Dinosaurs out that is seven cards for five mana.
- **Nissa, Who Shakes the World** (2.5 / -1.79) — 30 Forests plus Gingerbread Cabin and Sapseep Forest all double. Low corpus number, high in *this* mana base.
- **Toski, Bearer of Secrets** (10.4 / -0.57) — indestructible, uncounterable, and three opponents means three places to send it.
- **Fog, Tangle, Spore Frog, Arachnogenesis** — these were cut from the Arena build as 1v1 dead weight. In a pod they are the reason the deck survives to turn eight.
- **Kodama's Reach / Cultivate / Rampant Growth** — kept exactly three land-ramp spells; the other four were the glut.
- **Party Dude** (15.8 / 3.27) — its level 1 gives *each player* a Food, which is a real cost at four players. Kept because level 2 then draws a card whenever any opponent's artifact hits a graveyard, and it just handed them the artifact.
- **Mishra's Bauble** (0.1 / -1.09) — near-zero corpus presence, but it is a free artifact that triggers Sarinth Steelseeker, Teething Wurmlet and Syr Ginger.
- **Walking Ballista** (31.6 / 1.97) — the only card that kills a hexproof creature or finishes a player from four life.

## 10. Win conditions (ranked, vs a 3-opponent table)

**A 3-opponent table is 120 life. No line in this deck kills it in one turn, and none is claimed to.** Turn numbers below are the turn the plan first threatens lethal on **one** player, counted conservatively from a 36-land, 11-ramp mana base with no fast mana in the pool.

| # | Plan | Cards | Mana | Kills one opponent | Kills the table |
|---|---|---|---|---|---|
| 1 | Displaced Dinosaurs beatdown | Displaced Dinosaurs + 2 artifacts/legends entering after it | 7, then 2-4 | Turn 9-11 | No. 21 power per swing needs six connections to clear 120. |
| 2 | Night of the Sweets' Revenge sacrifice | Night of the Sweets' Revenge + 8 Foods + 3 animated bodies | 4, then 7 | Turn 10-12 | No. One player only, unless every attacker is unblocked across three boards. |
| 3 | Blossoming Bogbeast recursion | Bogbeast + Foods to sacrifice pre-combat | 5 | Turn 9-12, over 2-3 combats | No, but it is the only plan that scales across multiple combats. |
| 4 | Second Harvest amplification | Second Harvest on a token board | 4 | Not alone | No. Amplifier, not a win condition. |
| 5 | Tendershoot Dryad grind | Tendershoot Dryad + Peregrin Took | 5 | Turn 12+ | **Closest to a table kill.** Four Saprolings and four Foods per round cycle eventually outscales three players. |
| 6 | Idol of Oblivion Eldrazi | Idol + 8 mana | 2, then 8 | Not alone | No. Mana sink of last resort. |

- Displaced Dinosaurs is 7 mana and its 7/7s are **summoning sick on arrival**, so the earliest realistic attack is the turn after it lands, not the turn it lands.
- Night of the Sweets' Revenge costs 4 to deploy and 7 more to sacrifice, so eleven mana total across two turns before it does anything to a life total.
- **Realistic expectation:** remove one player with a big turn, then play a three-player game holding the best card engine at the table. Play for the second-place-into-first arc, not an alpha strike.

## 11. Combo and engine lines

**Rules caveats are marked with a bullet under the line they apply to.**

- **Peregrin Took + any token maker → one extra Food per creation event.**
  - It is a **replacement effect**, not a trigger. Second Harvest creating nine copies is a single event and yields **one** extra Food, not nine.
- **Peregrin Took + Academy Manufactor + create one Food → six artifacts.**
  - Order matters and **you choose it** (CR 616.1). Took first: Food becomes Food + Food, then Manufactor turns each into Clue + Food + Treasure = 6. Manufactor first: Food becomes Clue + Food + Treasure, then Took adds one Food = 4. **Always apply Took first.**
- **Jaheira + any tokens → each token taps for {G}.** Jaheira says *tokens*, not *Food tokens*: Saprolings, Spiders, Pests and Clues all tap for green.
- **Night of the Sweets' Revenge + Foods → Foods tap for {G}** independently of Jaheira, so the two stack for redundancy, not for extra mana per Food.
- **The Cabbage Merchant's mana ability: "Tap two untapped Foods: Add one mana of any color."**
  - This **taps** the Foods, it does **not** sacrifice them. They untap next turn and can be sacrificed later. Worse rate than Jaheira but it fixes colour.
- **Seedborn Muse + Idol of Oblivion → up to four cards per round.**
  - Idol only activates if you created a token *that turn*. On each opponent's turn the commander makes a Food when they cast a noncreature spell, which turns the ability on. Not guaranteed, but live most turns at four players.
- **Seedborn Muse + Foods + fogs → untap everything on all three opponents' turns.** This is what makes holding up Fog, Tangle and Arachnogenesis free rather than a tempo loss.
- **Displaced Dinosaurs + any historic permanent → a 7/7.** Historic means artifact, legendary or Saga; every Food qualifies.
  - The wording is "**As** a historic permanent you control **enters**". It only applies to permanents entering **after** it. It does **not** animate the Foods already on the battlefield.
  - Those 7/7s are creatures that just entered, so they have **summoning sickness** and cannot attack the turn they arrive.
- **Halsin + any token → a 4/4 Bear for {1}.**
  - Halsin changes an existing permanent's types, so a token that has been under your control since the turn began **can attack**. Distinct from Displaced Dinosaurs.
- **Tough Cookie + any noncreature artifact → a 4/4 for {2}{G}**, same summoning-sickness rule as Halsin: the permanent was already there, so it can attack.
- **Teething Wurmlet + artifacts entering → 1 life each, counter once.**
  - "**If this is the first time this ability has resolved this turn**" caps the +1/+1 counter at **one per turn**. Academy Manufactor tripling your artifacts triples the *life gain* only.
- **Well of Lost Dreams + Food sacrifice → draw up to 3.** Sacrifice a Food, gain 3 life, pay up to {3}, draw that many. With Sapseep Forest it is also a repeatable one-card-per-turn sink for {G} plus {1}.
- **Trudge Garden + Food sacrifice → a 4/4 trample for {2}.** Both Well and Trudge Garden trigger on the same lifegain event, so one Food can pay for both.
- **Giant Opportunity → sacrifice two Foods for a 7/7 Giant, or make three Foods.** With Peregrin Took the three-Food mode makes four.
- **Wicked Wolf + Foods → indestructible removal.** Sacrifice a Food to add a counter and gain indestructible until end of turn.
  - The ability **taps** Wicked Wolf, so it cannot be used repeatedly to survive combat while blocking more than once.
- **Chord of Calling convoke.**
  - Convoke taps **creatures**. Food tokens are **not creatures** and cannot help cast it unless animated by Halsin, Tough Cookie or Displaced Dinosaurs first.
- **Arachnogenesis at four players** — X equals the creatures attacking **you**, and it prevents all combat damage by non-Spider creatures **for the whole turn**, including damage between other players. The Spiders are tokens, so Peregrin Took adds a Food.
- **Unlucky Cabbage Merchant + the commander's damage clause** — being attacked forces a Food sacrifice, which fetches a basic land. It is a **one-shot**: the first search puts the Merchant on the bottom of your library.
- **Invasion of Ikoria for X=7 → Displaced Dinosaurs directly onto the battlefield** for nine total mana, and it can pull from the **graveyard** as well as the library.
- **Pest Infestation for X=3 → destroy three artifacts or enchantments across the table and make six Pests.** The Pests gain you 1 life each when they die, which feeds Well of Lost Dreams and Trudge Garden.

## 12. Opening hands

**Ideal seven**
- 3 lands including at least two green sources, one one-mana accelerant (Elvish Mystic, Llanowar Elves, Gilded Goose), Peregrin Took or Jaheira, one Food maker, one interaction or fog.
- That curve is turn 1 accelerant, turn 2 Food maker, turn 3 Took or Jaheira ahead of schedule.

**Minimum keep**
- 3 lands and any two of: an accelerant, a Food maker, a payoff.
- 2 lands **only** with Elvish Mystic or Llanowar Elves plus a two-drop; otherwise it is a mulligan even in a pod.
- 5 lands and two spells is a fine keep at four players. Games last long enough that flood is recoverable through Sarinth Steelseeker, Blighted Woodland and Orchard Strider's landcycling.

**Ship it**
- One or two lands with no accelerant.
- Six or seven lands.
- Three or more cards costing five or more with fewer than four lands.
- Zero Food makers and zero accelerants, however good the rest looks. The deck does nothing without Foods.

**Cards to see in the first five or six**
- **Peregrin Took** or **Academy Manufactor** — everything multiplies through them.
- **Jaheira** or **Night of the Sweets' Revenge** — turns Foods into the deck's second mana base.
- **Gilded Goose** or **Tireless Provisioner** — the cheapest repeatable Food sources.
- **Idol of Oblivion** — the deck runs out of cards before it runs out of mana.
- **One fog** — at four players something attacks you before turn six.

**Multiplayer note:** do not hold every fog for yourself. Arachnogenesis and Tangle stop combat between other players too, which is worth real goodwill early and a real tempo swing late.
