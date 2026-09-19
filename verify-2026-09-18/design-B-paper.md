# Design B (paper) — The Cabbage Merchant, 4-player Commander

Upgrade of `decks/paper/decks/the-cabbage-merchant.txt`. Format is paper Commander, 4-player pod,
40 life. The Arena files (`design-B.txt` / `design-B.md`) are void and kept only as history.

## 1. Strategy

- The engine stays: Academy Manufactor triples every token, Peregrin Took adds one, Second Harvest doubles the board, Jaheira and Night of the Sweets' Revenge turn it into mana, Halsin and Displaced Dinosaurs turn it into attackers.
- **Table-resilient value** is the new frame. Three opponents means the commander's own trigger fires several times per turn cycle without help, so the deck is never short of Food.
- **The engine is natively wrath-resilient.** Food, Clue and Treasure tokens are noncreature artifacts. A board wipe leaves the mana and the Idol of Oblivion draws intact, and Halsin rebuilds an attack from the same pile the next turn.
- The defensive package stays and was a mistake to question: Fog, Spore Frog, Tangle and Arachnogenesis each answer a three-way alpha strike, and Arachnogenesis scales with the number of attackers.
- **The one new sub-engine is lifegain.** Every Food sacrifice is 3 life and Teething Wurmlet gains 1 per artifact. The deck was throwing that away. Well of Lost Dreams, Trudge Garden and Blossoming Bogbeast now convert it into cards, 4/4 tramplers and a repeatable Overrun.
- Politics: Hornet Nest and the fogs make you the wrong player to attack, which buys the turns the engine needs.
- Lands go 32 to 36 effective, average mana value 3.25 to 2.82, and the eight-plus slot is gone.

## 2. Role counts

| Role | Count | Notes |
|---|---|---|
| Lands (validator count) | 35 | |
| Lands (effective, +0.5 per modal double-faced card) | **36.0** | was 32 pure / 33.0 effective |
| Ramp / mana | 10 | plus Jaheira, Night of the Sweets' Revenge, Tireless Provisioner, Nissa, Seedborn Muse |
| Token and Food engine | 14 | |
| Artifact payoffs and card draw | 11 | |
| Lifegain payoffs | 2 | Trudge Garden, Blossoming Bogbeast |
| Removal / interaction | 8 | |
| Table defence | 5 | Fog, Spore Frog, Tangle, Arachnogenesis, Hornet Nest |
| Protection | 2 | Autumn's Veil, Snakeskin Veil |
| Recursion | 2 | Eternal Witness, Regrowth |
| Tutors | 2 | Chord of Calling, Invasion of Ikoria |
| Threats and finishers | 8 | |
| Non-commander cards | 99 | |
| Total | 100 | |

Sourcing: 71 cards kept from the physical deck, 19 added, 31 Forest. Three adds are marked
**(second copy assumed)**: Llanowar Elves, Eternal Witness and Sakura-Tribe Elder are on the spare
pile but also sleeved in another paper deck.

### 2a. Land count

- 35 in the list, 36.0 effective counting Bridgeworks Battle and Disciple of Freyalise at half. Inside the 35 to 37 the format wants.
- Four colourless or self-sacrificing lands are gone. Under Archdruid's Charm at green-green-green, Chord of Calling at X-green-green-green and Disciple of Freyalise at green-green-green, colourless lands were costing whole turns.
- 34 of the 35 produce green. Blighted Woodland is the one exception and it ramps two.
- Gingerbread Cabin is a Forest that makes a Food, so it is a free upgrade over a basic.

## 3. Mana curve

Non-land cards only, commander included at mana value 3. X-cost cards at printed mana value.

| MV | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|
| Current | 2 | 7 | 15 | 19 | 12 | 8 | 2 | 1 | 1 | 1 |
| Upgraded | 2 | 12 | 14 | 18 | 9 | 8 | 1 | 1 | 0 | 0 |

Average mana value: **3.25 to 2.82**. The five-drop slot is deliberately left at eight, because paper
Commander games reach seven and eight mana and the cards there are Seedborn Muse, Displaced
Dinosaurs and Disciple of Freyalise, not filler.

## 4. Twelve key inclusions

| Card | inc% | lift | Reason |
|---|---|---|---|
| Peregrin Took | 95.7 | 3.10 | Kept. A free Food on every token event, and three spare Foods becomes a card. |
| Academy Manufactor | 93.8 | 3.37 | Kept. One Food becomes Food plus Clue plus Treasure, which is what makes everything downstream lethal. |
| Gilded Goose | 88.3 | 3.11 | **Added.** The largest omission at 88 percent inclusion. Turn-one Food, repeatable Food, and Food into any colour. |
| Jaheira, Friend of the Forest | 83.3 | 2.59 | Kept. Every token taps for green, and with Seedborn Muse the pile untaps three extra times per round. |
| Second Harvest | 68.4 | 2.17 | Kept. Instant speed, and after a wrath it rebuilds the whole artifact board in one card. |
| Sarinth Steelseeker | 68.4 | 3.75 | Kept. One trigger per artifact, so three per Food with Academy Manufactor out. |
| Llanowar Elves | 57.1 | 0.05 | **Added (second copy assumed).** The deck ran one turn-one accelerant. |
| Gingerbread Cabin | 46.2 | 2.34 | **Added.** A Forest that makes a Food. Free upgrade over the basic it replaces. |
| Elvish Spirit Guide | 34.9 | 1.64 | **Added.** Free green. In a pod it is the mana that lets you cast Arachnogenesis or Second Harvest on someone else's turn. |
| Seedborn Muse | 34.1 | 0.88 | Kept, and the single card most improved by the format correction. Three extra untaps per round across Jaheira tokens, Halsin, Idol of Oblivion and the dorks. |
| Well of Lost Dreams | 8.3 | 2.63 | **Added.** Every Food sacrifice is 3 life and Teething Wurmlet gains 1 per artifact. The deck was gaining life and drawing nothing from it. |
| Blossoming Bogbeast | 6.5 | 2.21 | **Added.** Sacrifice Foods before combat, then attack: trample and plus X where X is the life gained this turn. A repeatable Overrun that scales with the engine. |

## 5. Ten notable exclusions from the owned paper pool

| Card | inc% | lift | Why not |
|---|---|---|---|
| Helix Pinnacle | 7.5 | 0.96 | An alternate win at 100 tower counters. Even with Jaheira mana that is several uninterrupted turns, and the table gets three chances to answer it. |
| Hornet Queen | 1.4 | -1.20 | The best defensive board in the pool, but seven mana for it competes with Displaced Dinosaurs, which wins rather than stalls. Hornet Nest does the deterrent job for three. |
| Alhammarret's Archive | 0.7 | 0.14 | Doubles life and draw, but five mana that does nothing on arrival with three opponents untapped is how you get archenemied for free. |
| Mycoloth | 0.2 | -2.25 | Devour asks you to sacrifice creatures, and your creature count is low until Halsin animates. Then it is a lightning rod that must survive a rotation. |
| Carpet of Flowers | 6.8 | 0.57 | Strong against one blue opponent, dead against three green ones, and paper Commander has no sideboard. |
| Temple of the False God | 2.9 | -1.08 | The classic trap. It is a dead card in the opening hand and the deck's worst turns are the ones where it draws a land that does nothing. |
| Torpor Orb | 0.7 | 0.96 | It shuts off Academy Manufactor's own neighbours in the list: Unlucky Cabbage Merchant, Tough Cookie, Bosco, The Earth King, Hornet Queen. It hurts you more than the table. |
| Gilded Lotus | 0.7 | -0.38 | Five mana for three. Jaheira and Night of the Sweets' Revenge already turn the token pile into far more, for less. |
| Sword of the Animist | 0.3 | -2.95 | Equipment needs a creature to survive a combat, and until Halsin animates, this deck's board is artifacts that cannot attack. |
| Cityscape Leveler | 0.4 | -0.60 | Eight mana. The slot above seven was cut on purpose. |

Two notes on legality flags: **Master Chef**, **Regal Behemoth**, **Harvest Season**, **Broodhatch
Nantuko**, **Brawn**, **Yavimaya Bloomsage**, **Split the Spoils**, **Myconid Spore Tender**,
**Kozilek's Predator**, **Abundant Growth**, **Feral Appetite**, **Ribtruss Roaster**, **Blisterpod**
and **Erinis** carry a `db:not_legal` flag in the pool file. The paper validator resolves and clears
every card in this list, so none of them were needed; if the operator wants any of them, confirm the
Commander banlist first. **Sakura-Tribe Elder** was flagged on the Arena pool and is fine in paper,
so it is in.

### 5a. Dropped-card scan

Every card in `cabbage-pool-PAPER.txt` at **inc% 20 or higher, or lift 2.50 or higher**, checked
against the list.

| Cards meeting the threshold | 42 |
|---|---|
| In the list | **42** |
| Left out | **0** |

Nothing high-signal is dropped. The next band down (inc% 8 to 20, or lift 1.60 to 2.50) leaves out
five cards, and these are the reasons:

| Left out | inc% | lift | Reason |
|---|---|---|---|
| Kodama's Reach | 10.6 | -1.20 | Cut. A third three-mana ramp sorcery at 36 effective lands. |
| Rogue's Passage | 10.1 | -1.18 | Colourless, and the four-mana unblockable activation competes with casting the thing that wins. Under Archdruid's Charm and Disciple of Freyalise at triple green, colourless lands were the problem being fixed. |
| Explore | 8.6 | -0.84 | Cut. Weakest ramp slot once the land count is corrected. |
| Orchard Strider | 4.0 | 2.25 | Six mana for two Foods on a Treefolk body. The best thing about it is basic landcycling for {1}{G}, which is a worse Rampant Growth. Highest lift left out, and still not close. |
| Shortcut to Mushrooms | 0.3 | 1.64 | Its trigger needs a permanent to have left the battlefield, and the payoff is one +1/+1 counter. The Ring tempting you is a cost here, not a benefit. |

## 6. Buy list

Top corpus cards not owned in paper, from `verify-2026-09-18/cabbage-not-owned-PAPER.txt`.

| # | Buy | inc% | lift | Replaces | Why |
|---|---|---|---|---|---|
| 1 | Sol Ring | 83.7 | 0.17 | Mishra's Bauble | The format's most-played card. Two extra mana on turn one is a whole turn of engine in a pod. |
| 2 | Trail of Crumbs | 54.1 | 3.62 | Lembas | Every Food sacrifice digs for a permanent, and with three opponents the commander's own trigger feeds it. |
| 3 | Heroic Intervention | 64.2 | 0.30 | Snakeskin Veil | The list has two protection spells against three opponents' worth of wraths. This answers all of them for two mana. |
| 4 | Beast Within | 61.3 | 0.07 | Kenrith's Transformation | Green's only unconditional answer. In a pod you need to hit the one permanent that beats you, not just a creature. |
| 5 | Nuka-Cola Vending Machine | 81.5 | 3.60 | Party Dude | Repeatable Food production on an artifact body, at 81 percent inclusion. Party Dude hands three opponents a Food each. |
| 6 | Krark-Clan Ironworks | 55.5 | 3.89 | Guac & Marshmallow Pizza | Turns the whole artifact pile into mana without tapping, which is the one thing Jaheira cannot do through a Winter Orb or summoning sickness. |
| 7 | Transmutation Font | 52.5 | 3.82 | Regrowth | Converts surplus Foods into whatever the board needs. Highest lift in the buy list's top ten. |
| 8 | Inventors' Fair | 48.7 | 3.17 | Blighted Woodland | In paper the colourless cost is worth paying for a land that tutors Academy Manufactor and gains life every upkeep. |
| 9 | Worldly Tutor | 43.5 | 0.80 | Flare of Cultivation | One mana, instant speed, finds Academy Manufactor or the answer creature. The deck has only two tutors. |
| 10 | Boseiju, Who Endures | 51.9 | 0.57 | 1 Forest | Free interaction in a land slot, and in a pod there is always a target. |

## 7. Validator result

```
node verify-2026-09-18/check-deck-paper.cjs verify-2026-09-18/design-B-paper.txt --ci G

total cards     : 100   lands: 35   nonland: 65
avg MV (nonland): 2.82
curve           : 0:2 1:12 2:14 3:18 4:9 5:8 6:1 7:1
errors          : 0
```

Exit code 0. No errors, no warnings. The current deck warns `LAND COUNT 32`; this one does not.

## 8. Cuts and adds

**24 cards out, 24 cards in.** Named cards: 24 out, 19 in. Forest: 26 to 31.

### Cuts

| Out | inc% | lift | Reason |
|---|---|---|---|
| Spry and Mighty | 0.3 | -1.45 | Five mana, and it needs exactly two creatures with a power gap between them. |
| Monstrous Vortex | 0.1 | -2.83 | Four-mana enabler that then needs a power-five creature spell. |
| Crystalline Armor | 0.9 | -0.60 | A four-mana Aura. In a pod there are three players who can two-for-one you with one removal spell. |
| Cycle of Renewal | 1.5 | -1.01 | Three mana to sacrifice a land for two tapped basics. A net of one tapped land. |
| Shared Roots | 4.9 | -0.25 | A strictly worse Rampant Growth, which is already in the deck. |
| Explore | 8.6 | -0.84 | Weakest ramp slot once the land count is fixed. |
| Kodama's Reach | 10.6 | -1.20 | A third three-mana ramp sorcery alongside Cultivate and Flare of Cultivation, at 36 lands. |
| Cream of the Crop | 0.0 | - | Triggers on creature ETB. This deck's board is artifact tokens. |
| Vivien's Arkbow | 0.3 | -0.65 | X plus tap plus discard a card, for one creature. |
| Oviya, Automech Artisan | 0.6 | -1.27 | Four mana, and the put-into-play ability needs a creature already stranded in hand. |
| Loot, Exuberant Explorer | 1.0 | -2.00 | An extra land drop attached to a six-mana activation. |
| Bloodspore Thrinax | 0.0 | - | Devour needs creature fodder, and it does not buff the artifact tokens already on board. |
| Lifeblood Hydra | 0.4 | -1.86 | X-green-green-green for a vanilla trampler. No board impact on arrival. |
| Sandman, Shifting Scoundrel | 0.1 | -2.20 | A three-mana X/X with no protection and a five-mana recursion clause. |
| Cankerbloom | 1.1 | -1.66 | One artifact or enchantment, once. Pest Infestation does it X times and leaves bodies. |
| Selvala, Heart of the Wilds | 1.8 | -2.25 | Its draw trigger is symmetric. With three opponents that is three gifts for every one you take. |
| Overrun | 1.3 | -1.69 | Five mana for one attack step. Blossoming Bogbeast does it every combat and gains life doing it. |
| Ghalta, Primal Hunger | 2.4 | -1.85 | Needs ten total power to be castable. Uncastable exactly when you are behind, which in a pod is most of the game. |
| Avatar Kyoshi, Earthbender | 1.2 | -0.36 | Eight mana for a repeating earthbend, and the land it animates dies to any wrath the table casts. |
| The Legend of Kyoshi | 2.3 | -0.32 | Six-mana Saga whose payoff lands three turns later. In a pod it is a lightning rod for all three of them. |
| Ash Barrens | 0.4 | -1.43 | Taps for colourless under four green-green-green costs. Basic landcycling does not fix that. |
| Escape Tunnel | 0.5 | -2.21 | Colourless, and it sacrifices itself for a tapped basic. |
| Nesting Grounds | 0.4 | -1.17 | Colourless counter-mover with no counters theme to serve. |
| Rumble Arena | 1.4 | 0.04 | Colourless, and its any-colour mode costs an extra mana in mono-green. |

### Adds

| In | inc% | lift | Slot it takes |
|---|---|---|---|
| Gilded Goose | 88.3 | 3.11 | Explore. Turn-one Food, repeatable Food, Food into mana. |
| Llanowar Elves | 57.1 | 0.05 | Shared Roots. Second turn-one accelerant. **(second copy assumed)** |
| Elvish Spirit Guide | 34.9 | 1.64 | Cycle of Renewal. Free green for an instant-speed Arachnogenesis or Second Harvest on another player's turn. |
| Invasion of Ikoria | 30.6 | 1.49 | Vivien's Arkbow. At X=3 it puts Academy Manufactor onto the battlefield from library **or graveyard**, which is the wrath answer the deck lacked. |
| Eternal Witness | 29.7 | 0.08 | Cream of the Crop. Rebuys Second Harvest, Force of Vigor or Archdruid's Charm. **(second copy assumed)** |
| Autumn's Veil | 27.2 | 1.81 | Crystalline Armor. One mana stops the blue and black half of the table countering or killing your engine piece. |
| Endurance | 26.4 | 1.43 | Ohran Frostfang stays; this takes Lifeblood Hydra. Flash 3/4 reach, or free off evoke, plus instant-speed graveyard hate for someone else's reanimator. |
| Lembas | 16.8 | 3.52 | Mishra's Bauble stays; this takes Monstrous Vortex. A Food that scries, draws and shuffles itself back when it dies. |
| Pest Infestation | 14.5 | 1.74 | Cankerbloom. X artifacts and enchantments destroyed across the table, plus 2X blockers. Scales with a pod. |
| Well of Lost Dreams | 8.3 | 2.63 | Spry and Mighty. Converts the lifegain the deck already produces into cards. |
| Snakeskin Veil | 8.3 | -0.85 | Sandman. One-mana counter plus hexproof, in a list with almost no protection. |
| Hornet Nest | 5.0 | 0.77 | Oviya. A defender that punishes whoever swings at you. Political deterrent, not a threat. |
| Sakura-Tribe Elder | 4.7 | -1.58 | Loot. Chump block a 6/6 and ramp on the way out. A pod staple. **(second copy assumed)** |
| Tendershoot Dryad | 4.0 | 0.06 | Bloodspore Thrinax. A Saproling on **each** upkeep, so four per round in a four-player pod, each one a Peregrin Took Food and a Jaheira mana. |
| Trudge Garden | 2.8 | 2.29 | Selvala. Every Food sacrifice becomes a 4/4 trampler for two mana. |
| Regrowth | 2.7 | -1.06 | Overrun. Second wrath answer. |
| Blossoming Bogbeast | 6.5 | 2.21 | Ghalta. Sacrifice Foods pre-combat, then attack for trample and plus X. A repeatable Overrun. |
| Gingerbread Cabin | 46.2 | 2.34 | Ash Barrens. A Forest that makes a Food. |
| Blighted Woodland | 6.5 | -0.58 | Escape Tunnel. Colourless, but it fetches two basics instead of one. |
| 5 Forest | 95.2 | 0.00 | Nesting Grounds, Rumble Arena, Avatar Kyoshi, The Legend of Kyoshi, Kodama's Reach. Raises effective lands 33.0 to 36.0. |

## 9. Considered for the cut, kept

| Card | inc% | lift | Why it survived the multiplayer re-read |
|---|---|---|---|
| Fog | 26.7 | 0.48 | One mana blanks a three-way alpha strike. Against one opponent it buys a turn; against three it buys a rotation. |
| Spore Frog | 7.0 | 0.58 | The same effect on a body that also blocks and feeds Chord of Calling convoke. |
| Tangle | 9.2 | 1.71 | The attackers also do not untap, so the table loses a whole turn of offence, not one attack step. |
| Arachnogenesis | 17.0 | 1.67 | X equals the number of creatures attacking you, which is the whole point in a pod. It also leaves a wall of Spiders. |
| Seedborn Muse | 34.1 | 0.88 | I cut this for 1v1 and was wrong. Three extra untaps per round across Jaheira tokens, Halsin, Idol and the dorks. |
| Toski, Bearer of Secrets | 10.4 | -0.57 | Uncounterable and indestructible, and the forced attack is a benefit when you can pick whichever of three opponents is open. |
| Forgotten Ancient | 1.8 | -1.75 | It counts spells cast by **any** player, so four players roughly quadruples its rate over a duel. |
| Party Dude | 15.8 | 3.27 | It gives three opponents a Food, but level two then draws a card whenever any of their artifacts dies, and they will sacrifice those Foods for life. |
| Displaced Dinosaurs | 51.9 | 3.75 | Seven mana, but paper Commander reaches seven mana and this is the kill. |
| Ohran Frostfang | 3.4 | -1.56 | Deathtouch on attackers is a multiplayer deterrent, and the draw trigger fires once per player you connect with. |
| Bosco, Just a Bear | 25.1 | 2.96 | Food per legendary creature, and the list still fields six. |
| Mishra's Bauble | 0.1 | -1.09 | A free artifact that triggers Teething Wurmlet, Sarinth Steelseeker and Syr Ginger, then cantrips. |

## 10. Win conditions against three opponents, ranked

Turn numbers below are honest for a 4-player pod: 120 total life across three opponents, and
blockers, removal and wraths all in the way. **No line in this deck kills the table in one turn.**
Every plan here kills one opponent per combat at best, so the realistic shape of a win is three
attack steps across three of your turns, choosing the order by who can stop you.

**1. Halsin animation into a wide attack.** Cheapest and most repeatable.
- Cards: Halsin, Emerald Archdruid + eight or more tokens + Garruk's Uprising for trample.
- Mana: 4 for Halsin, then {1} per token, which Jaheira pays for out of the same token pile.
- **Kills one opponent turn 9 to 10.** Ten animated tokens is 40 trampling power, which is exactly one player, and only if the attack is unblocked.
- **Kills the table turn 11 to 13**, over three combats. Seedborn Muse shortens that by giving you the mana to animate and block on their turns as well.
- Pod note: attack the player who can answer you, not the player on the lowest life.

**2. Blossoming Bogbeast alpha.** The highest-ceiling turn in the deck.
- Cards: Blossoming Bogbeast + four or more spare Foods + an animated or creature board.
- Mana: 5 for the Bogbeast, then {2} and a tap per Food sacrificed in your first main phase. Four Foods is 12 life, plus the Bogbeast's own 2 on attack, so +14/+14 and trample on everything.
- **Kills one opponent turn 9 to 10**, and can kill two in the same combat if you split five animated bodies across them.
- **Kills the table turn 10 to 12**, and it repeats every combat because the Bogbeast is not sacrificed.

**3. Displaced Dinosaurs plus Academy Manufactor.**
- Cards: Displaced Dinosaurs + Academy Manufactor + any token maker.
- Mana: 7, then 3, then 1 to 3 for the maker. That is two or three turns of deployment, not one.
- One Food creation is three 7/7 Dinosaur tokens, 21 power, and each one entering draws a card off Garruk's Uprising.
- **Kills one opponent turn 10 to 11.** The tokens enter summoning sick, so nothing you make this turn attacks this turn.
- **Kills the table turn 12 or later.** This is the most expensive plan in the deck and the easiest to wrath before it connects. It is a payoff, not a race.
- Caveat: the summoning-sick Dinosaurs cannot use Jaheira's granted tap ability the turn they arrive, but they can be tapped for Chord of Calling's convoke.

**4. Trudge Garden grind.**
- Cards: Trudge Garden + a Food supply.
- Mana: 3 to deploy, then roughly 4 mana per 4/4 trampler counting the Food sacrifice that triggers it.
- **Online turn 5, kills nobody on its own.** Its job is to out-grind removal and rebuild through wraths, because the Foods survive them. It gets you to plan 1 or 2, it is not a plan itself.

**5. Night of the Sweets' Revenge sacrifice pump.**
- Cards: Night of the Sweets' Revenge + a board of creatures.
- Mana: {5}{G}{G} and sacrifice it, sorcery speed only, so it telegraphs for a full turn cycle.
- Its own static ability makes Foods tap for green, so the token pile pays for most of the activation, and tapping a Food for mana does not reduce X.
- **Kills one opponent turn 9 to 11.** One shot, and the card is gone.

**6. Walking Ballista as reach.**
- Not a win condition on its own. It is the last few points at instant speed, the answer to a hexproof creature, and the only damage in the list that ignores blockers entirely.

## 11. Combo and engine lines

Checked against the oracle text in `cabbage-pool-PAPER.txt`. **The list contains no infinite loop.**

**Token multiplication**
- Peregrin Took + any token creation → **one** extra Food per event. It is a replacement effect reading "one or more tokens", so it applies once to the event, not once per token.
- Academy Manufactor + create a Food → one Clue, one Food and one Treasure. Also a replacement effect, and it applies to each Clue, Food or Treasure token in the event.
- **Peregrin Took + Academy Manufactor → you choose the order and it changes the count.** Apply Took first: "create three Foods" becomes four Foods, then Manufactor makes that four Clues, four Foods, four Treasures = **12 tokens**. Apply Manufactor first: nine tokens, then Took adds one Food = **10 tokens**. Always apply Took first.
- Second Harvest + Academy Manufactor → Second Harvest copies every token you control, and a copy of a Food token is itself a Food token, so Manufactor applies to each copy created.
- Tendershoot Dryad + Peregrin Took → a Saproling on **each** upkeep, four per round, and each of those events makes a Food as well.

**Token to mana**
- Jaheira + any tokens → every token gains "tap: add green". Food, Clue, Treasure, Pest, Saproling and Role tokens are not summoning sick for this **unless they are creatures**. Artifact tokens tap the turn they arrive. Pest and Saproling creature tokens must wait a turn.
- Night of the Sweets' Revenge + Foods → the same, Foods only, and Foods are always noncreature, so always immediate.
- Seedborn Muse + Jaheira → the token pile untaps on each of the three opponents' untap steps, so the mana is available four times per round rather than once.
- Jaheira or Night + Displaced Dinosaurs → **anti-synergy for one turn.** Tokens that enter as 7/7 creatures are summoning sick and cannot use the granted tap ability until your next turn.
- The commander's **"tap two untapped Foods: add one mana of any colour" is a tap cost, not a sacrifice.** Those Foods stay on the battlefield and still count for Night of the Sweets' Revenge's X. It is strictly worse than Jaheira or Night once either is out, because two Foods tapped individually give two green instead of one, and mono-green never needs the colour.

**Lifegain to value (the new sub-engine)**
- Any Food sacrifice → 3 life. Teething Wurmlet → 1 life per artifact entering, which is three per Food with Manufactor out.
- That lifegain + Well of Lost Dreams → pay {X} up to the life gained, draw X.
- That lifegain + Trudge Garden → pay {2}, get a 4/4 green Fungus Beast with trample. It is a token, so Peregrin Took adds a Food to that event too.
- Blossoming Bogbeast attacks → gain 2, then everything gets trample and plus X where X is **all** life gained this turn, including the Foods you cracked in your first main phase.
- Sequencing note: sacrifice Foods in the **first** main phase, before declaring attackers, or Bogbeast's X misses them.

**Token to damage**
- Halsin + a token + {1} → a 4/4 green Bear until end of turn. Repeatable per token, no tap.
- A token animated the turn it was created cannot attack. Animate tokens that have been under your control since your turn began.
- Tough Cookie + {2}{G} → a noncreature artifact becomes a 4/4 until end of turn.
- Displaced Dinosaurs + any historic permanent entering → a 7/7 Dinosaur. Artifacts, legendaries and Sagas are historic, so every Food, Clue and Treasure qualifies. It only affects permanents entering after it resolves.
- Garruk's Uprising fires on a power-4 creature **entering**. Displaced Dinosaurs tokens, The Earth King's Bear, Giant Opportunity's Giant and Trudge Garden's Fungus Beast all trigger it. **Halsin and Tough Cookie animation do not**, because animating is not entering.

**Free sacrifice outlets**
- Wicked Wolf: "Sacrifice a Food: put a +1/+1 counter on this creature, it gains indestructible, tap it." No mana, repeatable. The tap is part of the effect, not a cost, so it works again while already tapped.
- Peregrin Took: sacrifice three Foods, draw a card. Also free.
- Either outlet + Syr Ginger → each artifact hitting the graveyard is a +1/+1 counter and a scry 1.
- Either outlet + Well of Lost Dreams and Trudge Garden → the 3 life from each Food becomes cards and 4/4s.
- The commander's forced "whenever a creature deals combat damage to you, sacrifice a Food" is **three opponents operating a free sacrifice outlet on your behalf**, and every one of those triggers feeds Syr Ginger, Well of Lost Dreams and Trudge Garden.

**Tutors and recursion**
- Invasion of Ikoria at X=3 → search library **and graveyard** for a non-Human creature with mana value 3 or less and put it onto the battlefield. Academy Manufactor is an Assembly-Worker, so it is a legal target either before or after a wrath.
- Chord of Calling + an animated or Dinosaur board → convoke can tap summoning-sick creatures, because tapping for convoke is not a tap ability cost.
- Eternal Witness and Regrowth → rebuy Second Harvest, Force of Vigor or Archdruid's Charm after a wipe.

**Table defence**
- Arachnogenesis → X equals creatures attacking **you**, and it prevents all combat damage from non-Spider creatures, so it stops the whole alpha strike and leaves the Spiders behind.
- Hornet Nest → it only makes Insects when it is **dealt damage**, so its real job is deterrence. Nobody profitably attacks into it.
- Endurance → flash, or free by exiling a green card, which answers a reanimator at instant speed on someone else's turn.

**Three rules corrections carried over from the refuter's pass on the Arena version**
- **Flare of Cultivation's alternative cost needs a nontoken *green* creature.** A Food, Clue, Treasure, Saproling or Dinosaur token can never pay it, and neither can the three colourless artifact creatures in this list: Academy Manufactor, Syr Ginger and Walking Ballista. The other 27 nontoken creatures here are green, so the card is live, but never plan to pay it with the token pile.
- **Nutrient Block is not in this list, and that is deliberate.** It is a nontoken Food *card*, and the commander's trigger sacrifices a Food **token**, so the commander can never feed it. Any claim that it does is wrong.
- **A 0-mana artifact is not mana.** Mishra's Bauble produces no mana on any turn. It is in the list as free artifact-count for Teething Wurmlet, Sarinth Steelseeker and Syr Ginger, and it is never an accelerant in a keep decision.

## 12. Opening hands

**What counts as an accelerant**
- Exactly four cards: Gilded Goose, Llanowar Elves, Elvish Mystic and Elvish Spirit Guide. Nothing else in the list adds mana on turn one or two.
- Mishra's Bauble, Lembas and every Food token are **not** accelerants. A 0-mana artifact produces no mana, and a Food only taps for green once Jaheira or Night of the Sweets' Revenge is already on the battlefield, which is turn three at the earliest.

**The ideal seven**
- 3 or 4 lands.
- One turn-one accelerant from the four named above.
- One two- or three-mana engine piece: Peregrin Took, Jaheira, Academy Manufactor, Sarinth Steelseeker, Tireless Provisioner or Unlucky Cabbage Merchant.
- One defensive card: Fog, Spore Frog, Tangle or Arachnogenesis. You will be attacked before you are ready.
- One card that draws or digs.

**Minimum acceptable keep**
- 3 lands plus an accelerant, or
- 4 lands plus two spells castable by turn three, or
- 3 lands plus two engine pieces with no accelerant. Slower, but a pod gives you the turns.

**Ship it**
- 0 or 1 land.
- 7, 6 or 5 lands with no accelerant and nothing to cast before turn four.
- Hands whose only action is Displaced Dinosaurs, Chord of Calling, Bosco, Seedborn Muse or Shamanic Revelation. Those are payoffs, not starts.
- All defence and no engine. Four fogs do not win, they postpone.
- Two or more of Second Harvest, Night of the Sweets' Revenge, Halsin and Blossoming Bogbeast with no token maker.

**Pod-specific**
- Keep looser than in a duel. Three opponents means turn-one and turn-two plays are less likely to be punished, and games run long enough to draw out of a slow hand.
- A hand with Arachnogenesis or Tangle and two lands is keepable on the draw in a pod. It is not in a duel.
- Do not deploy Academy Manufactor and Jaheira in the same turn if you cannot protect them. Two engine pieces on an empty board makes you the archenemy; one piece plus a Hornet Nest does not.

**The six cards you most want to see early**
1. Gilded Goose. Turn one, and it is both acceleration and the Food the engine runs on.
2. Academy Manufactor. Every later token is tripled from the moment it lands.
3. Jaheira, Friend of the Forest. Converts the token pile into mana, and Seedborn Muse multiplies that by four.
4. Peregrin Took. A free Food on every event and a sacrifice outlet that draws.
5. Sarinth Steelseeker. Turns the artifact churn into land drops and card selection.
6. Llanowar Elves or Elvish Mystic. Turn-one mana is what makes the turn-three Manufactor happen.
