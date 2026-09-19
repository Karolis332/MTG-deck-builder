# Design A — The Cabbage Merchant, upgraded from the operator's current Arena Brawl deck

List: `verify-2026-09-18/design-A.txt`
Baseline: `decks/brawl/cabbage-merchant-current.txt` (101 lines, 100 cards + commander)
Swap count: **36 cuts, 35 adds** (33 new names plus Forest 27 to 29). Four of the cuts are lands that produced colourless mana or no mana at all, so on card-quality swaps alone it is 32, inside the 15-35 range. The mana-base repair is separate and I would not trade it away to hit a number.

The corpus core is untouched: Academy Manufactor, Jaheira, Peregrin Took, Second Harvest, Sarinth Steelseeker, Syr Ginger, Displaced Dinosaurs, Idol of Oblivion, Archdruid's Charm, Teething Wurmlet, Tough Cookie, Giant Opportunity, Wicked Wolf, Halsin, Night of the Sweets' Revenge, Unlucky Cabbage Merchant, Tireless Provisioner, Many Partings, Bumi's Feast Lecture, Party Dude and Bosco all stay.

## 1. Strategy (8 lines)

1. The deck's identity is unchanged: Food and token value, with Jaheira and Academy Manufactor turning every token into mana and every token event into three artifacts.
2. What changed is the shape. Average mana value drops from 3.25 to **2.42** and the count of cards at MV 4 or above drops from 25 to 12.
3. The current build spent 7 slots on plain land-fetching that makes no Food and 4 on fog effects that win nothing in a 1v1 race. Both packages are gone.
4. **Displaced Dinosaurs** is the real finisher and was underbuilt: it animates each historic permanent that enters *after* it, and Food tokens are artifacts, so they arrive as 7/7 Dinosaurs. Thirteen new cheap Food and artifact sources feed it.
5. Artifact count was the other underbuilt axis. Sarinth Steelseeker, Teething Wurmlet, Syr Ginger, Idol of Oblivion and Mox Opal all scale on it, and Academy Manufactor triples every Food into Clue plus Food plus Treasure.
6. Interaction rose from 6 pieces to 9, and protection from zero (the fogs were doing that job badly) to Heroic Intervention, Veil of Summer and Tamiyo's Safekeeping.
7. Endurance comes in from the sideboard pile as a flash 3/4 reach blocker, because fliers are the axis mono-green loses on in 1v1.
8. Land count goes 33 true to 34 true, and four lands that produced colourless or no mana at all become Command Tower, Inventors' Fair, Fomori Vault and a Forest.

## 2. Role counts (99 non-commander cards)

| Role | Count |
|---|---|
| Lands (34 true + 2 MDFC) | 36 |
| Ramp / mana | 9 |
| Food makers | 17 |
| Card advantage / tutors | 10 |
| Food and artifact payoffs | 11 |
| Removal | 8 |
| Protection | 3 |
| Finishers | 5 |

Effective land count = 34 + (2 MDFC x 0.5) = **35**.

Roles overlap: 22 cards make or are a Food, 14 care about artifact count, and 5 can end a game on their own.

## 3. Mana curve (validator output, non-land, commander included)

| MV | 0 | 1 | 2 | 3 | 4 | 5 | 7 |
|---|---|---|---|---|---|---|---|
| Upgraded | 3 | 15 | 16 | 19 | 6 | 4 | 1 |
| Current deck | 2 | 7 | 15 | 18 | 12 | 8 | 1 |

Average MV non-land: **2.42**, down from 3.25. The current deck also had one card each at MV 6, 8 and 12.

## 4. Twelve key inclusions

| Card | inc% | lift | Reason |
|---|---|---|---|
| Academy Manufactor | 93.8 | 3.37 | Already in the deck and the single best card in it: every Food becomes Clue plus Food plus Treasure, which is three artifacts and three Jaheira mana. |
| Gilded Goose | 88.3 | 3.11 | One mana, a flier, a Food on arrival and a Food on demand; the best turn-one play available and it was sitting in the sideboard. |
| Jaheira, Friend of the Forest | 83.3 | 2.59 | Turns the token pile into a mana engine, which is what makes the top end castable at all. |
| Sarinth Steelseeker | 68.4 | 3.75 | Every artifact entering digs for a land; with Academy Manufactor that fires three times per Food. |
| Second Harvest | 68.4 | 2.17 | One instant doubles the entire token board, and Academy Manufactor upgrades each copy. |
| Heroic Intervention | 64.2 | 0.30 | The deck is almost entirely permanents, and it previously had no answer to a sweeper. |
| Beast Within | 61.3 | 0.07 | The only unconditional instant answer to any permanent in green; the current build had none. |
| Displaced Dinosaurs | 51.9 | 3.75 | Every historic permanent that enters after it arrives as a 7/7, which means every Food token. It does not animate what is already on board. This is the win condition the rest of the deck supports. |
| Idol of Oblivion | 49.2 | 2.49 | Draws a card every turn the deck makes a token, which is nearly every turn. |
| Unlucky Cabbage Merchant | 48.7 | 3.68 | Two-mana Food plus the cheapest sacrifice-a-Food payoff in the pool. |
| Heaped Harvest | 29.6 | 3.05 | Replaces the cut land-ramp with a card that fetches twice and is itself a Food. |
| Teething Wurmlet | 39.0 | 3.49 | One mana; it gains 1 life per artifact entering, so Academy Manufactor triples the life, but the +1/+1 counter is capped at once per turn. |

## 5. Ten notable exclusions from the pool

| Card | inc% | lift | Why not |
|---|---|---|---|
| Emergence Zone | 32.7 | 1.66 | A colourless land in a deck with {G}{G}{G} costs on Archdruid's Charm and Chord of Calling. |
| Gemstone Caverns | 31.0 | 1.70 | Dead on the play and colourless the rest of the time. |
| Vexing Bauble | 29.5 | 2.50 | Its tax only hits spells cast for no mana, which Standard Brawl opponents essentially never do. |
| Chrome Dome | 27.9 | 3.88 | Five mana to copy one artifact until end of turn is unplayable tempo in 1v1. |
| Noxious Revival | 25.9 | 1.43 | A graveyard-order card in a deck that wins on the board. |
| Swiftfoot Boots | 16.7 | -0.55 | Equipment slots compete with Nettlecyst, which actually scales with the Food pile. |
| Agatha's Soul Cauldron | 15.1 | 2.64 | Wants exiled creature cards with worthwhile activated abilities, and this pool has almost none. |
| Mirrormind Crown | 5.1 | 2.51 | Four mana plus two to equip before it does anything, and it layers badly with Peregrin Took. |
| Karn, the Great Creator | 3.3 | 1.84 | Brawl has no sideboard, so the minus-two that makes the card is blank. |
| Craterhoof Behemoth | 21.4 | -0.05 | Eight mana for an effect Displaced Dinosaurs, Halsin and Garruk's Uprising already provide more cheaply. |

Two pool rows were left alone on a legality flag rather than on judgement. **Pick Your Poison** (7.1 / 0.86) is marked `legal` in the regenerated pool but the validator's card database gives it a **BG** colour identity and `brawl=not_legal`; the deck has Force of Vigor and Archdruid's Charm for that job. **Elvish Spirit Guide** (34.9 / 1.64) carries `side/db:not_legal` — it is in the operator's Arena sideboard so it exists on Arena, but I did not risk an unverified Brawl legality for a one-shot ritual.

## 6. Wildcard craft list (not owned after these additions — verify on Arena before crafting)

All ten confirmed absent from the regenerated 1,069-row pool.

| Craft | inc% | lift | Replaces | Why |
|---|---|---|---|---|
| Trail of Crumbs | 54.1 | 3.62 | Mirage Mirror | Every Food sacrifice digs two for a permanent; the biggest missing engine piece. Verify on Arena. |
| The Shire | 53.9 | 2.51 | Fomori Vault | A green-producing utility land instead of a colourless one. Verify on Arena. |
| Transmutation Font | 52.5 | 3.82 | Tezzeret, Cruel Captain | Turns idle Foods into repeatable selection and artifact recursion. Verify on Arena. |
| Gingerbread Cabin | 46.2 | 2.34 | 1 Forest | A Forest that also makes a Food costs nothing to include. Verify on Arena. |
| Feasting Troll King | 45.5 | 3.56 | Bosco, Just a Bear | Recurs itself for three Foods and leaves free 4/4s, which Bosco does not. Verify on Arena. |
| Quina, Qu Gourmet | 45.1 | 3.66 | Hot Dog Cart | A Food payoff on a body rather than a three-mana rock. Verify on Arena. |
| Elanor Gardner | 42.7 | 3.46 | Courier of Comestibles | Repeating Food generation instead of a one-shot enter-the-battlefield trigger. Verify on Arena. |
| Bristlebud Farmer | 40.6 | 3.78 | Eager Trufflesnout | Makes Food without having to connect in combat. Verify on Arena. |
| Honored Dreyleader | 40.3 | 2.45 | Nettlecyst | Same artifact-count scaling, but green and on a creature. Verify on Arena. |
| Inspiring Statuary | 36.1 | 3.66 | Emerald Medallion | Improvise lets Foods pay for the whole deck, not only green spells. Verify on Arena. |

## 7. Validator result

```
file            : verify-2026-09-18/design-A.txt
commander       : The Cabbage Merchant
total cards     : 100   lands: 36   nonland: 64
wizards (typed) : 0
noncreature non-land spells: 36
avg MV (nonland): 2.42
curve           : 0:3 1:15 2:16 3:19 4:6 5:4 7:1
errors          : 0
```

Zero ERROR lines and zero WARN lines. Command: `node verify-2026-09-18/check-deck.cjs verify-2026-09-18/design-A.txt --ci G`

## 8. Cuts and adds

### 8a. Cuts (36)

**Surplus land ramp — 7 cards.** The deck had 33 lands plus Jaheira, Academy Manufactor and Elvish Mystic. Seven more cards whose whole text is "find a basic" is the largest single redundancy in the list, and none of them makes a Food.

| Cut | inc% | lift | Reason |
|---|---|---|---|
| Cultivate | 23.3 | -0.73 | Three mana for one land on the battlefield; the deck is not short of lands. |
| Kodama's Reach | 10.6 | -1.20 | The same card as Cultivate; running both is pure redundancy. |
| Rampant Growth | 21.5 | -0.64 | Two mana, no Food, no card, no body. |
| Shared Roots | 4.9 | -0.25 | A worse Rampant Growth. |
| Cycle of Renewal | 1.5 | -1.01 | Sacrifices a land to find two, so it nets one land for three mana and a card. |
| Flare of Cultivation | 1.4 | -1.32 | The free mode eats a nontoken green creature, which this deck would rather keep. |
| Explore | 8.6 | -0.84 | Only ramps if a land is already in hand. |

**Fog package — 4 cards.** These are multiplayer politics cards. In 1v1 they buy a turn and change no outcome.

| Cut | inc% | lift | Reason |
|---|---|---|---|
| Fog | 26.7 | 0.48 | Buys one turn against one opponent and wins nothing. |
| Tangle | 9.2 | 1.71 | Same, and the do-not-untap clause is far weaker against a single attacker. |
| Arachnogenesis | 17.0 | 1.67 | X equals creatures attacking you; in 1v1 that is usually one or two. |
| Spore Frog | 7.0 | 0.58 | A one-shot fog on a body with no recursion in the deck to rebuy it. |

**Off-plan top end and filler — 21 cards.** Every one of these is either uncastable, replaceable by a cheaper card already in the deck, or asks for a board the Food plan does not build.

| Cut | inc% | lift | Reason |
|---|---|---|---|
| Ghalta, Primal Hunger | 2.4 | -1.85 | MV 12; needs a board that has already won the game. |
| Avatar Kyoshi, Earthbender | 1.2 | -0.36 | Eight mana for earthbend, which Bumi's Feast Lecture does for two. |
| The Legend of Kyoshi | 2.3 | -0.32 | Six mana and three turns before the payoff arrives. |
| Lifeblood Hydra | 0.4 | -1.86 | A vanilla X-body with no Food or artifact interaction. |
| Sandman, Shifting Scoundrel | 0.1 | -2.20 | Power equal to lands does nothing for the token plan. |
| Monstrous Vortex | 0.1 | -2.83 | Needs power-5 creature spells; after these cuts the deck has almost none. |
| Crystalline Armor | 0.9 | -0.60 | An aura loses two cards to one removal spell. |
| Spry and Mighty | 0.3 | -1.45 | Five mana and it needs two specific creatures with a power gap. |
| Oviya, Automech Artisan | 0.6 | -1.27 | Duplicates the trample that Garruk's Uprising already grants. |
| Bloodspore Thrinax | 0.0 | - | Devour wants a wide creature board; this deck's tokens are Foods, not creatures. |
| Loot, Exuberant Explorer | 1.0 | -2.00 | Extra land drops are dead once the land-ramp package is gone. |
| Forgotten Ancient | 1.8 | -1.75 | Slow, and its counters have no payoff here. |
| Selvala, Heart of the Wilds | 1.8 | -2.25 | Mana scaled off big power, which the deck no longer has on board early. |
| Ohran Frostfang | 3.4 | -1.56 | Five mana for a combat anthem; Toski draws the cards more cheaply. |
| Overrun | 1.3 | -1.69 | Night of the Sweets' Revenge already has an overrun mode scaled by Food count. |
| Shamanic Revelation | 8.2 | -0.91 | Five-mana draw tied to creature count in a deck whose tokens are artifacts. |
| Return of the Wildspeaker | 10.9 | -1.20 | The same problem at the same cost. |
| Cream of the Crop | 0.0 | - | Top-of-library selection only, and it does nothing the turn it lands. |
| Cankerbloom | 1.1 | -1.66 | A 2/2 that trades for one artifact; Force of Vigor takes two. |
| Vivien's Arkbow | 0.3 | -0.65 | Mana-hungry and needs spare cards to discard. |
| The Earth King | 7.8 | 0.16 | A fine card, but MV 4 was the most crowded slot in the deck and the Bear token is worse than a Food here. |

**Lands — 4 cards.**

| Cut | inc% | lift | Reason |
|---|---|---|---|
| Escape Tunnel | 0.5 | -2.21 | Produces no mana at all; it only sacrifices to find a basic. |
| Nesting Grounds | 0.4 | -1.17 | Colourless, and moving counters is not something this deck ever wants to do. |
| Ash Barrens | 0.4 | -1.43 | Colourless, and the landcycling mode is the ramp package that just got cut. |
| Rumble Arena | 1.4 | 0.04 | Colourless with a one-mana tax for colour; Command Tower is strictly better. |

### 8b. Adds (35: 33 names plus Forest 27 to 29)

| Add | inc% | lift | Source | Takes the slot of | Reason |
|---|---|---|---|---|---|
| Gilded Goose | 88.3 | 3.11 | side | Spore Frog | One mana, flier, Food on arrival and Food on demand. |
| Llanowar Elves | 57.1 | 0.05 | side | Rampant Growth | Turn-one acceleration that also crews Chord of Calling's convoke. |
| Worldly Tutor | 43.5 | 0.80 | legal | Cream of the Crop | Finds Academy Manufactor, Displaced Dinosaurs or Gilded Goose for one mana. |
| Veil of Summer | 38.0 | 1.12 | legal | Fog | Replaces a fog with a card that actually stops removal and counterspells. |
| Utopia Sprawl | 16.0 | -0.07 | legal | Shared Roots | One-mana ramp on a Forest, of which there are now 29, and it pairs with Nissa. |
| Tamiyo's Safekeeping | 21.8 | 0.14 | legal | Tangle | One mana saves Academy Manufactor or Displaced Dinosaurs instead of saving one turn. |
| Mox Opal | 10.3 | 2.27 | legal | Arachnogenesis | Free artifact; metalcraft is trivial once Academy Manufactor is out. |
| Gingerbrute | 9.7 | 2.84 | legal | Cankerbloom | One-mana Food creature with built-in evasion. |
| Nutrient Block | 8.2 | 3.89 | legal | Explore | An indestructible Food that returns itself to hand. |
| Candy Trail | 8.0 | 3.52 | legal | Cycle of Renewal | One mana, scry 2, and later gain 3 and draw. |
| Expedition Map | 26.2 | 2.01 | legal | Flare of Cultivation | Real land search that is also an artifact trigger for Sarinth Steelseeker. |
| Arcane Signet | 30.3 | 0.11 | legal | Cultivate | Two mana for a permanent green source beats three mana for one land. |
| Sylvan Library | 24.6 | 0.24 | legal | Shamanic Revelation | Draw that costs two, not five, and that scales into the late game. |
| Courier of Comestibles | 6.2 | 3.44 | legal | Kodama's Reach | Tutors Tough Cookie, Syr Ginger, Lembas or Heaped Harvest, all of which are Food cards. |
| Michelangelo, the Heart | 12.2 | 2.58 | legal | Bloodspore Thrinax | Two-mana trample that adds a Food and a counter every turn it attacks. |
| Curious Pair // Treats to Share | 2.9 | 2.64 | legal | Loot, Exuberant Explorer | One mana for a Food now and a 2/2 later out of exile. |
| Lembas | 16.8 | 3.52 | legal | Crystalline Armor | Food that replaces itself and shuffles back on death. |
| Instant Ramen | 11.8 | 3.59 | legal | Monstrous Vortex | Flash Food that draws, so it is never a blank turn. |
| Heroic Intervention | 64.2 | 0.30 | legal | Spry and Mighty | The deck had no answer to a sweeper; now it has the best one in green. |
| Heaped Harvest | 29.6 | 3.05 | legal | Rampant Growth | A Food that fetches a basic twice; the only land-ramp that earned its slot. |
| Eager Trufflesnout | 13.8 | 3.28 | legal | Oviya, Automech Artisan | Trample that converts connecting into Food. |
| Hot Dog Cart | 10.6 | 3.17 | legal | Ohran Frostfang | Food plus an any-colour rock on an artifact body. |
| Nettlecyst | 9.3 | 2.54 | legal | Sandman, Shifting Scoundrel | Living weapon whose size is the Food and enchantment count, which is the stat the deck actually has. |
| Mirage Mirror | 29.7 | 3.29 | legal | Lifeblood Hydra | Copies Academy Manufactor, Displaced Dinosaurs, or the opponent's best permanent. |
| Tezzeret, Cruel Captain | 14.7 | 2.12 | legal | Vivien's Arkbow | Gains loyalty on every artifact entering, which with Academy Manufactor is three per Food. |
| Formidable Speaker | 31.8 | 1.52 | legal | Selvala, Heart of the Wilds | Creature tutor, and the untap ability re-taps a token for Jaheira mana. |
| Eternal Witness | 29.7 | 0.08 | legal | Forgotten Ancient | Rebuys Second Harvest, Beast Within or Displaced Dinosaurs. |
| Endurance | 26.4 | 1.43 | side | The Legend of Kyoshi | Flash 3/4 reach; the only clean answer to fliers the owned pool offers at three mana. |
| Beast Within | 61.3 | 0.07 | legal | Overrun | Unconditional instant removal, which the deck did not have. |
| Doubling Season | 32.6 | 0.93 | legal | Return of the Wildspeaker | Doubles every Food, every Academy Manufactor trigger and every earthbend counter. |
| Command Tower | 7.0 | 0.13 | legal | Rumble Arena | A green source replacing a colourless one. |
| Inventors' Fair | 48.7 | 3.17 | legal | Nesting Grounds | Tutors Academy Manufactor, Nettlecyst or Idol of Oblivion once three artifacts are out. |
| Fomori Vault | 46.3 | 3.93 | legal | Ash Barrens | Digs as deep as the artifact count, which this deck maxes out. |
| Forest x2 | 95.2 | 0.00 | deck | Escape Tunnel, The Earth King | 29 Forests supports Nissa and the {G}{G}{G} costs on Archdruid's Charm and Chord of Calling. |

## 9. Considered cutting, kept

| Card | inc% | lift | Why it stayed |
|---|---|---|---|
| Seedborn Muse | 34.1 | 0.88 | Only one extra untap per cycle in 1v1, but with Jaheira's token-mana plus instant-speed Archdruid's Charm and Chord of Calling that untap is a whole extra turn of mana. |
| Nissa, Who Shakes the World | 2.5 | -1.79 | The corpus actively avoids her, but 29 Forests is a very different deck from the average paper list, and her plus-one makes a hasty 3/3 that protects her. |
| Garruk's Uprising | 7.1 | -1.63 | Negative lift, but trample is what converts a board of 7/7 Foods under Displaced Dinosaurs into a kill rather than a stall. |
| Toski, Bearer of Secrets | 10.4 | -0.57 | Indestructible and uncounterable, and the forced attack is a cost the deck can pay once Halsin is making 4/4 blockers. |
| Mishra's Bauble | 0.1 | -1.09 | The delayed draw is slow, but a free artifact triggers Sarinth Steelseeker, Teething Wurmlet and Syr Ginger and turns on metalcraft. |
| Chord of Calling | 40.5 | 1.09 | Convoke taps creatures, and Food tokens are not creatures until Halsin, Tough Cookie or Displaced Dinosaurs animates them, so it is cheaper than it looks only on a developed board. Kept because Jaheira's token mana pays the triple green regardless. |
| Ghalta, Primal Hunger | 2.4 | -1.85 | Considered keeping for the Displaced Dinosaurs turn where power is enormous; cut because that turn already wins without it. |
| Emerald Medallion | 37.1 | -0.09 | Negative lift and it does nothing for the artifacts, but it discounts roughly two thirds of the deck. |
| Bosco, Just a Bear | 25.1 | 2.96 | Five mana is a lot after the curve cuts, but Food per legendary creature is a genuine payoff with Jaheira, Syr Ginger, Toski and Halsin around. |
| Walking Ballista | 31.6 | 1.97 | Flagged only because Doubling Season makes it a combo piece rather than a fair card; kept because it is the deck's only repeatable reach and flier removal. |

## 10. Win conditions (ranked)

**1. Displaced Dinosaurs + any Food maker + Garruk's Uprising — primary.**
- Cards: Displaced Dinosaurs {5}{G}{G}, plus Academy Manufactor / Gilded Goose / Tireless Provisioner / Giant Opportunity, plus Garruk's Uprising for trample.
- Mana: 7 for the Dinosaurs, then 0 to 3 per turn to keep making Foods.
- Online: turn 5 to 6. Jaheira plus one Academy Manufactor trigger is already 3 extra mana.
- Why it wins: each Food token that enters afterwards is a 7/7. Two Foods is 14 trampling power. Garruk's Uprising also draws a card for each one, because a 7/7 has power 4 or greater.
- Caveat: those 7/7s enter as creatures, so they are summoning sick that turn and cannot tap for Jaheira mana.

**2. Bumi's Feast Lecture earthbend — fastest, hardest to see coming.**
- Cards: Bumi's Feast Lecture {1}{G} plus any Food board. Doubling Season doubles the counters.
- Mana: 2.
- Online: turn 4 to 5, whenever 4 or more Foods are out.
- Why it wins: it creates a Food first, then earthbends twice the Food count. Five Foods is a 10/10 land **with haste**, so it attacks the turn it happens. With Doubling Season it is 20 counters.
- Caveat: the land is now a creature and dies to creature removal; it returns to the battlefield tapped.

**3. Night of the Sweets' Revenge overrun.**
- Cards: Night of the Sweets' Revenge {3}{G} plus creatures on board.
- Mana: 4 to cast, then {5}{G}{G} to sacrifice it.
- Online: turn 6 to 7, and cheaper than it reads because the enchantment gives every Food "{T}: Add {G}".
- Why it wins: creatures get +X/+X where X is the number of Foods. Foods you tapped for mana to pay the cost still count, because the ability counts Foods you control, not untapped ones.
- Caveat: it needs actual creatures. Foods alone do nothing here unless Halsin or Tough Cookie animated them first.

**4. Halsin turning the token pile into a Bear army.**
- Cards: Halsin, Emerald Archdruid {3}{G}, plus 4 or more tokens, plus Garruk's Uprising.
- Mana: 4 plus {1} per token animated.
- Online: turn 5 to 6.
- Why it wins: 4/4s for one mana each, and tokens already on board since the turn began are **not** summoning sick, so they attack immediately.

**5. Grind: Toski plus Idol of Oblivion plus Giant Opportunity.**
- The slowest plan and the backup when the opponent answers the others. Toski draws on every connection, Idol draws every turn a token is made, and Giant Opportunity is a 7/7 for three mana and two Foods.

## 11. Combo and engine lines

**Token multiplication.** All of these are replacement effects, so you choose the order they apply (CR 616.1).

- **Academy Manufactor + Peregrin Took → 6 tokens from one Food trigger.** Apply Took first: one Food becomes two Foods. Then Manufactor replaces each of those, giving 2 Clues, 2 Foods and 2 Treasures. The wrong order gives only 4, because Took adds a single Food to the whole event.
- **Two Academy Manufactor effects (the second via Mirage Mirror) → 9 tokens.** The first replaces one Food with one of each; the second has not applied yet and replaces each of those three.
- **Doubling Season stacks with both**, and separately doubles counters from Bumi's Feast Lecture, Walking Ballista and Teething Wurmlet.
- Caveat: Peregrin Took replaces the *event*, so it adds exactly one Food no matter how many tokens that event makes.

**Mana.**

- **Jaheira + any tokens → {G} each.** Jaheira grants "{T}: Add {G}" to *all* tokens, not only artifacts. Food, Clue and Treasure tokens are not creatures, so they have no summoning sickness and tap the turn they arrive.
- **Academy Manufactor + Jaheira → 3 green per Food trigger**, because one trigger now makes three tokens.
- **Night of the Sweets' Revenge** does the same for Foods only. It stacks with Jaheira in the sense that a Food has two mana abilities, but a Food still taps once, for one mana.
- **Seedborn Muse + Jaheira:** every token untaps during the opponent's untap step, paying for Archdruid's Charm, Second Harvest or Chord of Calling at instant speed.
- **Nissa, Who Shakes the World** adds an extra {G} whenever a Forest is tapped, and there are 29 Forests.
- **The commander's own ability taps two untapped Foods and does NOT sacrifice them.** With Jaheira or Night of the Sweets' Revenge out it is strictly worse, since those tap one Food for one mana. It is a backup only, and in mono-green the any-colour clause is never relevant.

**Card draw.**

- **Displaced Dinosaurs + Garruk's Uprising → draw a card per Food token.** Every Food enters as a 7/7, and Garruk's Uprising draws whenever a creature with power 4 or greater enters.
- **Sarinth Steelseeker + Academy Manufactor → 3 looks per Food trigger.** It triggers on each artifact entering and has no once-per-turn limit.
- **Idol of Oblivion** draws once per turn for any token created that turn.
- **Peregrin Took:** sacrifice three Foods, draw a card. A mana-free outlet.
- Caveat: **Teething Wurmlet** gains 1 life per artifact entering, but puts a +1/+1 counter on itself only the first time each turn.

**Sacrifice payoffs.**

- **Gilded Goose:** {T}, sacrifice a Food, add one mana of any colour. This is a real sacrifice, unlike the commander's ability.
- **Syr Ginger:** every other artifact put into the graveyard from the battlefield gives a +1/+1 counter and scry 1. Feeding Foods to Gilded Goose, Peregrin Took or Giant Opportunity grows it and digs.
- **Unlucky Cabbage Merchant:** the first Food you sacrifice fetches a basic land, then it puts itself on the bottom of the library. One-shot, not an engine.
- **Wicked Wolf:** sacrifice a Food for a counter and indestructible, but it taps itself each time, so this is defence rather than a repeated attacker.

**Copy and animate.**

- **Second Harvest + Academy Manufactor:** each copy of a Clue, Food or Treasure is itself a Clue, Food or Treasure being created, so Manufactor replaces each copy with one of each.
- **Tough Cookie:** {2}{G} makes a noncreature artifact you control a 4/4 until end of turn. Animated tokens can then convoke **Chord of Calling**; Food tokens cannot convoke on their own, because convoke taps creatures.
- **Halsin and Tough Cookie versus Displaced Dinosaurs on summoning sickness:** Halsin and Tough Cookie change the types of a permanent already on the battlefield, so it can attack if you have controlled it since your turn began. Displaced Dinosaurs animates on entry, so those bodies are sick the turn they arrive.

**Non-lines, stated so nobody wastes a turn trying.**

- Walking Ballista plus Doubling Season is not infinite. {4} puts one counter, doubled to two, and removing counters to deal damage is not replaced by anything.
- There is no sacrifice loop in this list. Foods do not return themselves, and Nutrient Block did not make the final 100.

## 12. Opening hands

**The ideal 7**
- 3 lands including at least 2 green sources, a one-mana Food maker (Gilded Goose, Party Dude, Teething Wurmlet), a two-drop (Unlucky Cabbage Merchant, Sylvan Library, Courier of Comestibles), and Academy Manufactor or Jaheira.
- That curves into the commander on turn 3 and a real engine on turn 4.

**Minimum acceptable keep**
- 2 lands **plus** a one-mana accelerant (Llanowar Elves, Elvish Mystic, Gilded Goose, Utopia Sprawl, Mox Opal) **plus** a play on turn 2.
- 4 lands plus any two of Academy Manufactor, Jaheira, Peregrin Took, Sarinth Steelseeker, Idol of Oblivion.
- 3 lands and no accelerant is keepable only if two of the remaining spells cost 2 or less.

**Ship it**
- 0, 1, 6 or 7 lands. At 34 true lands plus two double-faced cards there is no excuse for keeping a one-lander.
- 2 lands with nothing castable at one or two mana.
- Hands whose only action costs 4 or more: Displaced Dinosaurs, Doubling Season, Seedborn Muse, Night of the Sweets' Revenge, Bosco.
- All-interaction hands. Beast Within and Heroic Intervention do not develop a board, and this deck loses by durdling.

**Cards you most want to see early**
1. Academy Manufactor — triples every later Food trigger.
2. Jaheira, Friend of the Forest — turns tokens into mana, which is what makes the top end castable.
3. Gilded Goose — turn-one Food and a mana outlet.
4. Peregrin Took — a free extra Food on every token event.
5. Sylvan Library — the only card here that repairs a bad draw step.
6. Sarinth Steelseeker — keeps land drops coming while the artifacts pile up.

**Mulligan to 6 or 5**
- Apply the same rule at 6. At 5, keep any 2 lands plus one accelerant and bottom the most expensive card.
