# Design B — The Cabbage Merchant, 1v1 Arena Brawl (upgrade of the current deck)

Derived from `decks/brawl/cabbage-merchant-current.txt`. The identity is unchanged: an artifact-token
engine that turns Food, Clue and Treasure into mana, cards and attackers.

## 1. Strategy

- The current deck already owns the right engine. Academy Manufactor triples every token, Peregrin Took adds one more, Second Harvest doubles the pile, Jaheira and Night of the Sweets' Revenge turn it into mana, Halsin and Displaced Dinosaurs turn it into attackers. All of that is kept.
- What it lacked was a 1v1 shape: five damage-prevention cards that only pay off against three opponents, twenty-five cards at mana value four or more, four colourless lands under green-green-green costs, and zero protection for the engine pieces every removal spell aims at.
- The upgrade keeps all twenty engine cards and rebuilds everything else around them.
- Average mana value drops 3.25 to 2.45. Cards at mana value four or more drop 25 to 11.
- Protection goes 0 to 6, interaction 5 to 11. The mana is now 35 green sources out of 35 lands.

## 2. Role counts

| Role | Count | Notes |
|---|---|---|
| Lands (cards) | 35 | 33 pure + 2 modal double-faced cards |
| Lands (effective, MDFC = 0.5) | **34.0** | argued in section 2a; was 33.0 |
| Ramp / mana | 10 | plus Jaheira, Night of the Sweets' Revenge, Tireless Provisioner, Nissa |
| Token and Food engine | 16 | |
| Artifact payoffs and card draw | 10 | |
| Cheap artifact glue | 5 | Candy Trail, Nutrient Block, Instant Ramen, Gingerbrute, Guac & Marshmallow Pizza |
| Removal / interaction | 10 | plus Bridgeworks Battle, which occupies a land slot |
| Protection | 6 | up from zero |
| Tutors | 2 | Worldly Tutor, Chord of Calling |
| Finishers and payoff threats | 5 | Displaced Dinosaurs, Halsin, The Earth King, Goldvein Hydra, Nissa |
| Non-commander cards | 99 | |
| Total | 100 | |

Sourcing: 40 cards kept from the current deck, 22 from the owned pool, 8 from the sideboard pile,
30 Forest. No card marked `db:not_legal` is used.

### 2a. Why 34.0 effective lands, not 35 or 36

- Sixteen one-drops and seventeen two-drops. The deck's worst outcome is flooding, not stumbling.
- Ten dedicated ramp cards, plus four cards that produce mana off the engine itself (Jaheira, Night of the Sweets' Revenge, Tireless Provisioner, Nissa). Effective mana sources are closer to 48 than 34.
- Three of the four cards above six mana were cut, so the deck no longer needs to reach eight lands.
- Every land now produces green. At 33.0 the deck was missing land drops behind green-green-green costs because four lands were colourless; fixing the colour problem is worth more than raising the count.
- I landed at 34.0 rather than my instinctive 33 because Chord of Calling, Archdruid's Charm and Displaced Dinosaurs still want the seventh land, and Tireless Provisioner rewards hitting every drop.

## 3. Mana curve

Non-land cards only, commander included at mana value 3. X-cost cards sit at printed mana value.

| MV | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|
| Current | 2 | 7 | 15 | 18 | 12 | 8 | 2 | 1 | 1 | 1 |
| Upgraded | 2 | 16 | 17 | 19 | 6 | 3 | 1 | 1 | 0 | 0 |

Average mana value: **3.25 to 2.45**.

## 4. Twelve key inclusions

| Card | inc% | lift | Reason |
|---|---|---|---|
| Academy Manufactor | 93.8 | 3.37 | Kept. Every Food becomes Food plus Clue plus Treasure, which is what makes Displaced Dinosaurs and Second Harvest lethal rather than cute. |
| Peregrin Took | 95.7 | 3.10 | Kept. A free Food on every token event and three spare Foods becomes a card. |
| Gilded Goose | 88.3 | 3.11 | **Added from the sideboard.** The single largest omission. Turn-one Food, repeatable Food, and Food into any colour. |
| Jaheira, Friend of the Forest | 83.3 | 2.59 | Kept. Turns the whole token pile into mana, which is how a six-mana turn happens on turn four. |
| Second Harvest | 68.4 | 2.17 | Kept. Instant-speed doubling of every token on board. The deck's biggest single swing. |
| Sarinth Steelseeker | 68.4 | 3.75 | Kept. Card selection on every artifact that enters, which with Academy Manufactor is three triggers per Food. |
| Heroic Intervention | 64.2 | 0.30 | **Added.** The deck had no answer to a wrath and commits its whole board. |
| Beast Within | 61.3 | 0.07 | **Added.** The only unconditional answer in green, in a deck whose interaction was five conditional cards. |
| Llanowar Elves | 57.1 | 0.05 | **Added from the sideboard.** The deck ran exactly one turn-one accelerant. |
| Displaced Dinosaurs | 51.9 | 3.75 | Kept. With Academy Manufactor out, every Food trigger arrives as three 7/7 Dinosaurs. This is the kill, not Craterhoof. |
| Idol of Oblivion | 49.2 | 2.49 | Kept. A free card every turn the deck does what it already does. |
| Veil of Summer | 38.0 | 1.12 | **Added.** Arena 1v1 is dense with blue and black. One mana protects the engine and replaces itself. |

## 5. Ten notable exclusions from the owned pool

High-inclusion or high-lift owned cards that did **not** make the list.

| Card | inc% | lift | Why not |
|---|---|---|---|
| Craterhoof Behemoth | 21.4 | -0.05 | Its X counts creatures. The token pile is artifacts until Halsin or Tough Cookie animates it, so Craterhoof is usually a 5-power trampler for eight mana. |
| Doubling Season | 32.6 | 0.93 | The closest call. It doubles everything the engine makes, but it is five mana that changes nothing the turn it lands, and a blank turn five loses 1v1 games. |
| Inventors' Fair | 48.7 | 3.17 | A colourless land under Archdruid's Charm at green-green-green and Chord of Calling at X-green-green-green. Its artifact tutor also costs four mana. |
| Fomori Vault | 46.3 | 3.93 | Same objection. Colourless, ability costs three mana plus a card. |
| Emergence Zone | 32.7 | 1.66 | A third colourless land for a one-shot flash effect. |
| Gemstone Caverns | 31.0 | 1.70 | Free land on the draw, dead card on the play, colourless once the luck counter is gone. |
| The Great Henge | 11.2 | -0.76 | Cost reduction keys off greatest creature power. This board is artifact tokens, so it is routinely a nine-mana card. |
| Crop Rotation | 37.2 | 0.64 | The owned land pool has nothing worth tutoring. No Gaea's Cradle, no Nykthos, no Boseiju. |
| Vexing Bauble | 29.5 | 2.50 | Punishes free spells, of which Brawl 1v1 has almost none, and it would counter this deck's own Force of Vigor and Flare of Cultivation. |
| Chrome Dome | 27.9 | 3.88 | An anthem for artifact creatures. The deck runs six, and its copy ability costs five mana for one turn. |

Data note: ten sideboard cards carry `side/db:not_legal` (Predatory Impetus, Harvest Season, Elvish
Spirit Guide, Sweet-Gum Recluse, Molimo, Sakura-Tribe Elder, Fertile Ground, Erinis, Broodhatch
Nantuko, Brawn). None are used. Holding a card in the Arena sideboard proves ownership, not Brawl
legality, and the list should not gamble a slot on a disputed one. Sakura-Tribe Elder and Fertile
Ground would otherwise be real considerations.

## 6. Wildcard craft list

Cards **not owned** after these additions. Arena availability is not in the data for any of them.
**Verify on Arena before crafting each one.**

| # | Craft | inc% | lift | Replaces | Why |
|---|---|---|---|---|---|
| 1 | Trail of Crumbs | 54.1 | 3.62 | Nutrient Block | Every Food sacrifice digs for a permanent, and the commander's own damage clause sacrifices Foods for you. Verify on Arena. |
| 2 | Parallel Lives | 36.6 | 1.61 | Guac & Marshmallow Pizza | Doubles every token created. Stacks multiplicatively with Academy Manufactor and Peregrin Took. Verify on Arena. |
| 3 | Sculpting Steel | 25.8 | 3.66 | Instant Ramen | A second Academy Manufactor for three mana. Two Manufactors turn one Food into nine tokens. Verify on Arena. |
| 4 | Gingerbread Cabin | 46.2 | 2.34 | 1 Forest | A Forest that also makes a Food token. Strictly better than the basic it replaces. Verify on Arena. |
| 5 | Boseiju, Who Endures | 51.9 | 0.57 | Mosswort Bridge | An untapped green source that is also a removal spell, replacing a land that enters tapped. Verify on Arena. |
| 6 | Delighted Halfling | 46.9 | 1.06 | Elvish Mystic | Same turn-one acceleration, plus it makes the commander, Peregrin Took, Jaheira, Syr Ginger and Halsin uncounterable. Verify on Arena. |
| 7 | Green Sun's Zenith | 40.7 | 0.78 | Worldly Tutor | Tutors to the battlefield instead of to the top of the library. Verify on Arena. |
| 8 | Pawpatch Formation | 31.2 | 2.86 | Knockout Maneuver | Modal instant: destroy an artifact, destroy an enchantment, or fight. Never a dead card. Verify on Arena. |
| 9 | Nature's Claim | 36.8 | 0.58 | Origin of Metalbending | One mana instead of two for the same answer. Verify on Arena. |
| 10 | Inspiring Statuary | 36.1 | 3.66 | Hot Dog Cart | Improvise lets the Food, Clue and Treasure pile pay for Second Harvest, Beast Within and Chord of Calling. Verify on Arena. |

## 7. Validator result

```
file            : verify-2026-09-18/design-B.txt
commander       : The Cabbage Merchant
total cards     : 100   lands: 35   nonland: 65
wizards (typed) : 0
noncreature non-land spells: 38
avg MV (nonland): 2.45
curve           : 0:2 1:16 2:17 3:19 4:6 5:3 6:1 7:1
errors          : 0
```

Command: `node verify-2026-09-18/check-deck.cjs verify-2026-09-18/design-B.txt --ci G`
Exit code 0. No errors, no warnings.

## 8. Cuts and adds

**35 cards out, 34 cards in.** The counts differ by one because the current list is 101 cards. Named cards: 34 out, 30 in. Forest: 27 to 30.

### Cuts (34 named plus one Forest)

| Out | inc% | lift | Reason |
|---|---|---|---|
| 1 Forest | 95.2 | 0.00 | The 101st card the operator typed. A basic is the correct place to take it. |
| Fog | 26.7 | 0.48 | A one-shot fog. Against one opponent it buys a single turn and costs a card. |
| Spore Frog | 7.0 | 0.58 | The same effect stapled to a 1/1. Recurring it needs a graveyard engine this deck does not have. |
| Tangle | 9.2 | 1.71 | Third fog. The no-untap clause is real, but it is still a card spent on one attack step. |
| Arachnogenesis | 17.0 | 1.67 | X equals the number of creatures attacking you. That is one player's board in 1v1, not three. |
| Party Dude | 15.8 | 3.27 | It gives the opponent a Food, which in 1v1 is three life and a free artifact for the player racing you. Level two keys off their artifacts dying. |
| Seedborn Muse | 34.1 | 0.88 | Untaps on each opponent's untap step. One opponent means one third of the value, for five mana with no board impact. |
| Toski, Bearer of Secrets | 10.4 | -0.57 | Must attack every combat. Forcing a 1/1 into a single opponent's blockers is a liability, not a draw engine. |
| Ghalta, Primal Hunger | 2.4 | -1.85 | Needs ten total power to be castable. Uncastable exactly when you are behind. |
| Avatar Kyoshi, Earthbender | 1.2 | -0.36 | Eight mana. Past the point where 1v1 games are decided. |
| The Legend of Kyoshi // Avatar Kyoshi | 2.3 | -0.32 | Six-mana Saga whose payoff lands three turns after you cast it. |
| Ohran Frostfang | 3.4 | -1.56 | Five mana, and deathtouch on attackers is a multiplayer deterrent effect. |
| Lifeblood Hydra | 0.4 | -1.86 | X-green-green-green for a vanilla trampler with a death trigger. No impact on arrival. |
| Overrun | 1.3 | -1.69 | Weakest finisher. Return of the Wildspeaker, Displaced Dinosaurs and Night of the Sweets' Revenge already cover it. |
| Shamanic Revelation | 8.2 | -0.91 | Draws per creature, but the token pile is artifacts until something animates it. |
| Forgotten Ancient | 1.8 | -1.75 | Counters on every spell cast by any player. With one opponent that rate halves, and it does nothing the turn it lands. |
| Cream of the Crop | 0.0 | - | Triggers on creature ETB. The deck fields few creatures and many artifact tokens. |
| Selvala, Heart of the Wilds | 1.8 | -2.25 | Its draw trigger is symmetric, which in 1v1 is a gift to the only player who matters, on a 1/1 body. |
| Monstrous Vortex | 0.1 | -2.83 | Four-mana enabler that then needs a power-five creature spell. Two conditions, no board. |
| Spry and Mighty | 0.3 | -1.45 | Five mana, needs exactly two creatures with a power gap. |
| Crystalline Armor | 0.9 | -0.60 | A four-mana Aura. Two-for-one to any removal spell. |
| Vivien's Arkbow | 0.3 | -0.65 | X plus tap plus discard a card. Too many resources for one creature. |
| Oviya, Automech Artisan | 0.6 | -1.27 | Four mana, and the put-into-play ability needs a creature already stranded in hand. |
| Loot, Exuberant Explorer | 1.0 | -2.00 | An extra land drop attached to a six-mana activation. |
| Bloodspore Thrinax | 0.0 | - | Devour needs fodder, and it does not buff tokens already on board. |
| Sandman, Shifting Scoundrel | 0.1 | -2.20 | A three-mana X/X with no protection and a five-mana recursion clause. |
| Cankerbloom | 1.1 | -1.66 | Weak interaction. Beast Within and Origin of Metalbending replace it at better rates. |
| Cycle of Renewal | 1.5 | -1.01 | Three mana to sacrifice a land for two tapped basics. A net of one tapped land. |
| Shared Roots | 4.9 | -0.25 | A strictly worse Rampant Growth, which is already in the deck. |
| Explore | 8.6 | -0.84 | The weakest ramp slot once the curve drops. |
| Kodama's Reach | 10.6 | -1.20 | A fourth three-mana ramp sorcery alongside Cultivate and Flare of Cultivation. |
| Escape Tunnel | 0.5 | -2.21 | Colourless, and it sacrifices itself for a tapped basic. |
| Nesting Grounds | 0.4 | -1.17 | Colourless counter-mover with no counters theme to serve. |
| Ash Barrens | 0.4 | -1.43 | Colourless. A Forest is a better green source under four green-green-green costs. |
| Rumble Arena | 1.4 | 0.04 | Colourless, and its any-colour mode costs an extra mana in a mono-green deck. |

### Adds (35, including four Forest)

| In | inc% | lift | Source | Slot it takes |
|---|---|---|---|---|
| Gilded Goose | 88.3 | 3.11 | sideboard | Seedborn Muse. Turn-one Food, repeatable Food, Food into mana. |
| Llanowar Elves | 57.1 | 0.05 | sideboard | Cream of the Crop. Second turn-one accelerant. |
| Heroic Intervention | 64.2 | 0.30 | pool | Fog. A fog that saves the board permanently instead of for one attack step. |
| Beast Within | 61.3 | 0.07 | pool | Arachnogenesis. The unconditional answer the deck had none of. |
| Veil of Summer | 38.0 | 1.12 | pool | Spore Frog. Protection against the blue and black on the ladder. |
| Worldly Tutor | 43.5 | 0.80 | pool | Overrun. Finds Academy Manufactor or Jaheira for one mana. |
| Sylvan Library | 24.6 | 0.24 | pool | Shamanic Revelation. Card advantage that does not need a wide creature board. |
| Arcane Signet | 30.3 | 0.11 | pool | Shared Roots. Two-mana green source that is also an artifact for Teething Wurmlet and Sarinth Steelseeker. |
| Utopia Sprawl | 16.0 | -0.07 | pool | Explore. Turn-one ramp that no creature removal answers. |
| Lightning Greaves | 26.9 | 0.13 | pool | Vivien's Arkbow. Equip zero shroud and haste on Academy Manufactor or Jaheira. |
| Tamiyo's Safekeeping | 21.8 | 0.14 | pool | Crystalline Armor. One mana protects any permanent, including the artifact engine pieces. |
| Snakeskin Veil | 8.3 | -0.85 | sideboard | Spry and Mighty. One-mana counter plus hexproof. |
| Royal Treatment | 13.1 | 1.22 | pool | Monstrous Vortex. Hexproof that leaves a Role token behind, which Peregrin Took converts into a Food. |
| Origin of Metalbending | 9.4 | 0.64 | pool | Cankerbloom. Modal: artifact and enchantment removal, or a counter plus indestructible. Never dead. |
| Knockout Maneuver | 0.2 | -1.24 | sideboard | Toski. Counter plus fight. The deck's creatures are 4/4 Bears and 7/7 Dinosaurs, so it kills almost anything. |
| Endurance | 26.4 | 1.43 | sideboard | Ohran Frostfang. Flash 3/4 reach for three, or free off evoke. Covers fliers, mono-green's hole. |
| Mirage Mirror | 29.7 | 3.29 | pool | Forgotten Ancient. Copies Academy Manufactor, or the opponent's best permanent, at instant speed. |
| Eternal Witness | 29.7 | 0.08 | sideboard | Selvala. Rebuys Second Harvest, Beast Within or Archdruid's Charm. |
| Michelangelo, the Heart | 12.2 | 2.58 | pool | Bloodspore Thrinax. Two-mana trampler that makes a Food token every turn it attacks. |
| Courier of Comestibles | 6.2 | 3.44 | pool | Sandman. Two-mana body that tutors a Food card or makes a Food token. |
| Hot Dog Cart | 10.6 | 3.17 | pool | Oviya. Food token plus an any-colour rock, and an artifact trigger for three payoffs. |
| Heaped Harvest | 29.6 | 3.05 | pool | Loot. A Food that fetches a basic land on arrival and again when sacrificed. |
| Candy Trail | 8.0 | 3.52 | pool | Lifeblood Hydra. One-mana artifact, scry two, cashes in for a card and three life. |
| Nutrient Block | 8.2 | 3.89 | pool | Tangle. One-mana indestructible artifact that draws a card when the commander's damage clause eats it. |
| Instant Ramen | 11.8 | 3.59 | pool | Party Dude. Flash artifact that replaces itself and triggers the artifact payoffs at instant speed. |
| Gingerbrute | 9.7 | 2.84 | pool | Cycle of Renewal. One-mana Food artifact creature with haste that can buy near-unblockability for one more. |
| Formidable Speaker | 31.8 | 1.52 | pool | Ghalta. Creature tutor on a body, plus a repeatable untap for a Food or a mana dork. |
| Goldvein Hydra | 1.5 | -0.96 | sideboard | Avatar Kyoshi. Hasty mana sink that dies into Treasure tokens, which Academy Manufactor triples. |
| Orchard Strider | 4.0 | 2.25 | sideboard | The Legend of Kyoshi. Two Food tokens, nine tokens with Academy Manufactor, or basic-landcycles for two. |
| Command Tower | 7.0 | 0.13 | pool | Escape Tunnel. Untapped green source. |
| 4 Forest | 95.2 | 0.00 | basic | Nesting Grounds, Ash Barrens, Rumble Arena, plus the slot left by Kodama's Reach. Raises effective lands 33.0 to 34.0 and green sources to 35 of 35. |

## 9. Considered for the cut, kept

| Card | inc% | lift | Why it survived |
|---|---|---|---|
| Displaced Dinosaurs | 51.9 | 3.75 | Seven mana is above the new curve target, but it is the deck's actual kill. With Academy Manufactor out, one Food trigger arrives as three 7/7 Dinosaurs. |
| Bosco, Just a Bear | 25.1 | 2.96 | Five mana that does little on an empty board, but the deck still fields six legendary creatures and Academy Manufactor triples every Food it makes. |
| Many Partings | 47.5 | 2.89 | I cut this from a from-scratch build as card-neutral. Here it creates a token, so one mana becomes three artifacts through Academy Manufactor and Peregrin Took. |
| Mishra's Bauble | 0.1 | -1.09 | Looks like filler at zero mana. It is a free artifact that triggers Teething Wurmlet, Sarinth Steelseeker and Syr Ginger, then cantrips. |
| Chord of Calling | 40.5 | 1.09 | X-green-green-green is punishing, but convoke off an animated token board is nearly free and it finds Academy Manufactor at instant speed. |
| Nissa, Who Shakes the World | 2.5 | -1.79 | The corpus dislikes it. Forests tapping for double green is what makes the green-green-green costs castable, and the plus one makes a 3/3 haste land immediately. |
| Garruk's Uprising | 7.1 | -1.63 | Bad lift, but Displaced Dinosaurs' 7/7s and The Earth King's Bear trigger the draw, and trample is what converts an animated token board into damage. |
| Walking Ballista | 31.6 | 1.97 | A slow threat, kept purely as repeatable removal that is also an artifact for three payoffs. |
| Flare of Cultivation | 1.4 | -1.32 | Worse than Cultivate on rate, but the alternative cost makes it a free spell when a token body is expendable. |
| Guac & Marshmallow Pizza | 3.0 | 1.81 | Near-blank on rate. Kept as a one-mana artifact that is also an instant-speed combat trick. |

## 10. Win conditions, ranked

**1. Halsin animation plus Garruk's Uprising trample.** Cheapest and most repeatable.
- Cards: Halsin, Emerald Archdruid + any 3 or more tokens + Garruk's Uprising.
- Mana: 4 to deploy Halsin, then {1} per token animated. A five-token board is 5 mana for twenty trampling power.
- Online turn 5 to 6. Turn 4 with Jaheira or a dork.
- Caveat: Halsin animating a token does **not** trigger Garruk's Uprising. Uprising's draw fires on a power-4 creature *entering*; animation is not entering. Uprising is here for trample.
- Caveat: a token animated the turn it was created cannot attack. Animate tokens that have been under your control since your turn began.

**2. Displaced Dinosaurs plus Academy Manufactor.**
- Cards: Displaced Dinosaurs + Academy Manufactor + any token maker.
- Mana: 7 for the Dinosaurs, 3 for Manufactor, then 1 to 3 for a token maker.
- Online turn 6 to 8, faster off Jaheira or Night of the Sweets' Revenge mana.
- One Food creation becomes three 7/7 Dinosaur creature tokens, and each entering as a 7/7 draws a card off Garruk's Uprising.
- Caveat: those tokens enter as creatures and are summoning sick. They cannot attack or use Jaheira's granted tap ability that turn, but they **can** be tapped for convoke on Chord of Calling.
- Caveat: Displaced Dinosaurs only affects permanents entering after it resolves. Tokens already on board stay artifacts.

**3. Night of the Sweets' Revenge sacrifice pump.**
- Cards: Night of the Sweets' Revenge + a wide animated board.
- Mana: {5}{G}{G} and sacrifice it, sorcery speed only. Creatures get +X/+X where X is your Food count.
- Online turn 6 to 8. Its own static ability ("Foods you control have tap: add green") pays for a large part of the activation.
- Caveat: tapping Foods for mana does not remove them, so they still count toward X.

**4. Bumi's Feast Lecture earthbend clock.** The fastest single card.
- Cards: Bumi's Feast Lecture, ideally with 1 to 2 Foods already out.
- Mana: 2.
- Online turn 3 to 4. It creates a Food first, then earthbends X where X is twice your Food count, so two Foods after resolution is an 4/4 hasty land; four Foods is an 8/8.
- Caveat: the land is a 0/0 with counters. Remove the counters and it dies, but it returns to the battlefield tapped.

**5. Giant Opportunity plus Second Harvest.**
- Cards: Giant Opportunity + Second Harvest, optionally Academy Manufactor.
- Mana: 3 then 4.
- Online turn 5 to 7. Giant Opportunity either makes three Foods (nine tokens with Manufactor) or trades two Foods for a 7/7 Giant. Second Harvest then doubles whatever is on board.

**6. Walking Ballista as reach.**
- Cards: Walking Ballista alone, with spare mana.
- The last 2 to 5 damage when the opponent has stabilised behind blockers. Also the deck's only way to kill a hexproof or protected creature.

## 11. Combo and engine lines

All lines are checked against the oracle text in the pool file. **The deck contains no infinite loop.**

**Token multiplication**
- Peregrin Took + any token creation → that event makes **one** extra Food. Took is a replacement effect reading "one or more tokens", so it applies once per event, not once per token.
- Academy Manufactor + create a Food → create one Clue, one Food and one Treasure. Also a replacement effect, and it applies to each Clue, Food or Treasure token in the event.
- Peregrin Took + Academy Manufactor → **order matters and you choose it.** Apply Took first: "create 3 Foods" becomes 4 Foods, then Manufactor makes it 4 Clues, 4 Foods, 4 Treasures = 12 tokens. Apply Manufactor first and you get 9 tokens plus Took's single Food = 10. Always apply Took first.
- Academy Manufactor + Mirage Mirror ({2}: copy Manufactor) → two Manufactors. Creating one Food becomes three Clues, three Foods, three Treasures. The copy is summoning sick, which is irrelevant because the ability is static.
- Second Harvest + Academy Manufactor → Second Harvest copies every token you control, and copies of Clue, Food and Treasure tokens are themselves Clue, Food and Treasure tokens, so Manufactor applies to each copy created.

**Token to mana**
- Jaheira + any tokens → every token, not just Food, gains "tap: add green". Food, Clue, Treasure and Role tokens are noncreature artifacts or enchantments, so they can tap the turn they arrive with no summoning sickness.
- Night of the Sweets' Revenge + Foods → the same for Foods only.
- Jaheira or Night + Displaced Dinosaurs → **anti-synergy for one turn.** Once the tokens enter as 7/7 creatures they are summoning sick and cannot use the granted tap ability until your next turn.
- The commander's own "tap two untapped Foods: add one mana of any colour" is **strictly worse** than Jaheira or Night once either is out: two Foods tapped individually give two green instead of one. The deck is mono-green, so the any-colour clause is never relevant. Treat it as a pre-Jaheira backup only.
- The ability taps Foods, it does **not** sacrifice them. Tapped Foods still count for Night of the Sweets' Revenge's X and for Wicked Wolf fodder.

**Token to damage**
- Halsin + a token + {1} → a 4/4 green Bear until end of turn, repeatable for every token.
- Tough Cookie + {2}{G} → a noncreature artifact becomes a 4/4 until end of turn. Slower than Halsin, but it survives Halsin dying.
- Displaced Dinosaurs + any historic permanent entering → a 7/7 Dinosaur. Artifacts, legendaries and Sagas are all historic, so every Food, Clue and Treasure token qualifies.
- Garruk's Uprising + anything entering with power 4 or greater → draw a card. Fires off Displaced Dinosaurs tokens, The Earth King's 4/4 Bear and Giant Opportunity's 7/7 Giant. It does **not** fire off Halsin or Tough Cookie animation.
- The Earth King + attacking with power-4 creatures → fetch that many basics, which is also that many Tireless Provisioner landfall triggers.

**Free sacrifice outlets and payoffs**
- Wicked Wolf + Foods → "Sacrifice a Food: put a +1/+1 counter on this creature, it gains indestructible until end of turn, tap it." No mana cost, repeatable. The tap is part of the effect, not a cost, so it works again while already tapped.
- Peregrin Took + 3 Foods → draw a card. Also free.
- Either outlet + Syr Ginger → each artifact hitting the graveyard is a +1/+1 counter and a scry 1 on Syr Ginger.
- Either outlet + Nutrient Block → Nutrient Block draws a card when it is put into a graveyard from the battlefield. It is indestructible, so sacrificing is the only way to cash it.
- The commander's forced "whenever a creature deals combat damage to you, sacrifice a Food" is a **free sacrifice outlet the opponent operates for you**, feeding Syr Ginger and Nutrient Block.

**Artifacts entering**
- Sarinth Steelseeker → one trigger per artifact. With Manufactor, one Food creation is three triggers, so three looks at the top card.
- Teething Wurmlet → 1 life per artifact entering, but only one +1/+1 counter per turn. It has deathtouch while you control three or more artifacts, which is nearly always.
- Idol of Oblivion → tap to draw, needs only that you created a token this turn. Gilded Goose, Tireless Provisioner and Michelangelo each turn it on by themselves.

**Mana**
- Nissa, Who Shakes the World + 30 Forests → every Forest taps for two green. Her plus one makes a noncreature land a 3/3 with vigilance and haste that can attack immediately. Her static does **not** double token mana from Jaheira.
- Chord of Calling + an animated or Dinosaur board → convoke can tap summoning-sick creatures, because tapping for convoke is not a tap ability cost.
- Formidable Speaker → {1}, tap: untap another permanent. One extra Food or dork per turn, not a loop.

## 12. Opening hands

**The ideal seven**
- 3 lands.
- One turn-one accelerant: Gilded Goose, Llanowar Elves, Elvish Mystic or Utopia Sprawl.
- One two- or three-mana engine piece: Peregrin Took, Jaheira, Academy Manufactor, Sarinth Steelseeker, Tireless Provisioner or Unlucky Cabbage Merchant.
- One interaction or protection spell.
- One card that draws or digs: Sylvan Library, Idol of Oblivion, Candy Trail or Mishra's Bauble.

**Minimum acceptable keep**
- 3 lands plus an accelerant, or
- 4 lands plus two spells that are castable by turn three, or
- 2 lands plus two accelerants plus a two-drop. On the draw only.

**Ship it**
- 0 or 1 land, with no exception.
- 6 or more lands.
- 5 lands with no accelerant and nothing to do before turn four.
- Hands whose only action is Displaced Dinosaurs, Chord of Calling, Bosco, Orchard Strider or Return of the Wildspeaker.
- Hands that are all interaction and no engine. This deck wins by deploying, not by trading one for one.
- Two or more of Second Harvest, Night of the Sweets' Revenge and Halsin with no token maker. They are payoffs, not starts.

**The six cards you most want to see early**
1. Gilded Goose. Turn one, and it is both acceleration and the Food the engine runs on.
2. Academy Manufactor. Every later token is tripled from the moment it lands.
3. Jaheira, Friend of the Forest. Converts the token pile into the mana that casts everything else.
4. Peregrin Took. Free Food on every event, and a sacrifice outlet that draws.
5. Sarinth Steelseeker. Turns the artifact churn into land drops and card selection.
6. Llanowar Elves or Elvish Mystic. Turn-one mana is what makes the turn-three Manufactor happen.
