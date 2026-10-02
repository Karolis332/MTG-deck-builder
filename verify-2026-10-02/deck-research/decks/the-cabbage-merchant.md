# The Cabbage Merchant — pilot guide (paper, 4-player pod, 40 life)

List: `decks/paper/decks/the-cabbage-merchant.txt`. ⚠️ **It has 99 cards**; the 09-28 review proposed Elvish Archdruid as the 100th.
- Lands: 33 (27 Forest + Ash Barrens, Ba Sing Se, Escape Tunnel, Gingerbread Cabin, Mosswort Bridge, Nesting Grounds), plus the Bridgeworks Battle and Disciple of Freyalise MDFC lands.
- Ramp: Llanowar Elves, Elvish Mystic, Gilded Goose, Wild Growth, Emerald Medallion, Many Partings, Cultivate, Kodama's Reach, Tireless Provisioner, Greenhouse Propagator, Jaheira, The Earth King.
- Oracle text is from the DB. Rulings: Scryfall API; CR at https://yawgatog.com/resources/magic-rules/.

## 1. Plan in 3 lines
- Ramp, then multiply tokens:
  - Peregrin Took: "If one or more tokens would be created under your control, those tokens plus an additional Food token are created instead."
  - Academy Manufactor: "If you would create a Clue, Food, or Treasure token, instead create one of each."
- Turn tokens into mana (Jaheira, Night of the Sweets' Revenge, the commander's "Tap two untapped Foods you control: Add one mana of any color"). Turn life gain into 4/4s with Trudge Garden.
- Win with a trampling token alpha, Displaced Dinosaurs 7/7 tokens, or the Trudge loop into Walking Ballista.

| # | Win line (most frequent first) | Closer text (DB) |
|---|---|---|
| 1 | Wide trample alpha | Garruk's Uprising: "Creatures you control have trample." · Return of the Wildspeaker: "Non-Human creatures you control get +3/+3 until end of turn." · Night of the Sweets' Revenge: "{5}{G}{G}, Sacrifice this enchantment: Creatures you control get +X/+X until end of turn, where X is the number of Foods you control." · Ghalta: "Other creatures you control have trample." |
| 2 | Displaced Dinosaurs | "As a historic permanent you control enters, it becomes a 7/7 Dinosaur creature in addition to its other types." Every Food, Clue and Treasure becomes a 7/7. Uprising then draws: "Whenever a creature you control with power 4 or greater enters, draw a card." Ruling: it "enters as a 7/7", so power-4 triggers see it ([rulings](https://api.scryfall.com/cards/43319645-53b0-41f6-be90-9690e86e12d3/rulings)). |
| 3 | Fat bodies + connect draw | Hornet Queen ("create four 1/1 … flying and deathtouch"), Verdant Kraken, Feasting Troll King, Ghalta. Draw on connect: Ohran Frostfang ("Attacking creatures you control have deathtouch." / "Whenever a creature you control deals combat damage to a player, draw a card.") and Toski. |
| 4 | Halsin Bears | "{1}: Until end of turn, target token you control becomes a green Bear creature with base power and toughness 4/4". Spider-Ham gives Bears +1/+1. Only tokens you have controlled since your turn began can attack (CR 302.6). |
| 5 | Trudge loop → Ballista | Unbounded mana, tokens and draws (§2 row 3). Then Walking Ballista: "Remove a +1/+1 counter from this creature: It deals 1 damage to any target." |

## 2. Engine map
| # | Interaction | Text (DB) | Why it works / caveat |
|---|---|---|---|
| 1 | Took + Manufactor ordering | (above) | You choose the order of the replacements (CR 616.1). **Apply Took first.** One Food becomes 2 Foods, which Manufactor turns into 2 Food + 2 Clue + 2 Treasure. Manufactor first gives only 4 tokens. Any non-Food token (Beast, Pest, Spider, Tentacle) also brings Took's Food, which becomes Food + Clue + Treasure. Rulings: [Took](https://api.scryfall.com/cards/f5baee8d-88e7-4468-94a9-66ca8e2caf15/rulings) ("applies to all kinds of tokens"), [Manufactor](https://api.scryfall.com/cards/76480f4d-ad6d-4ed6-82c6-fa12abc22557/rulings) ("that many" of each). |
| 2 | Wurmlet / Propagator → Trudge Garden | Wurmlet: "Whenever an artifact you control enters, you gain 1 life." · Propagator: "Whenever another creature you control enters, you gain 1 life." · Trudge: "Whenever you gain life, you may pay {2}. If you do, create a 4/4 green Fungus Beast creature token with trample." | Each artifact that enters is its own life event (CR 603.2c). The Trudge ruling: "You may only pay {2} once for each life gain event" ([rulings](https://api.scryfall.com/cards/80dd8180-668a-41e4-a4e9-ebdd71345841/rulings)). |
| 3 | **Trudge loop** (Trudge + Took + Manufactor + Wurmlet or Propagator + Jaheira) | Jaheira: "Tokens you control have '{T}: Add {G}.'" | Each {2} paid makes Beast + Food + Clue + Treasure. The three noncreature tokens tap for {G}{G}{G} (no summoning sickness; they are not creatures), so you net +{G}. Wurmlet gives 3 new triggers per pass; Propagator gives 1. Both are unbounded. Start it by sacrificing a Food ("{2}, {T}, Sacrifice this token: You gain 3 life"). Kill: Took's "Sacrifice three Foods: Draw a card" draws to Ballista; cast it with huge X. Night of the Sweets' Revenge in Jaheira's place is mana-neutral (Food {G} + Treasure). |
| 4 | Commander Food mana | "Whenever an opponent casts a noncreature spell, create a Food token." / "Tap two untapped Foods you control: Add one mana of any color." | The tapping is a cost and uses no {T} symbol, so summoning-sick Food creatures (under Dinosaurs) can still pay it (CR 302.6). With Took + Manufactor, each opponent spell gives 2 Food + 2 Clue + 2 Treasure. |
| 5 | Jiang Yanggu / Seedborn Muse | Jiang: "At the beginning of your end step, untap all tokens you control." · Seedborn: "Untap all permanents you control during each other player's untap step." | With Jaheira, you have all your token mana on opponents' turns for Chord of Calling (convoke), Second Harvest, Return of the Wildspeaker, Arachnogenesis and Force of Vigor. |
| 6 | Verdant Kraken + Idol of Oblivion | Kraken: "At the beginning of each player's upkeep, you create a 3/3 green Forest Tentacle land creature token." · Idol: "{T}: Draw a card. Activate only if you created a token this turn." | You get a token on every player's turn, so Idol draws every turn. With Took + Manufactor that is +3 artifacts per upkeep (Wurmlet/Trudge). |
| 7 | Second Harvest | "For each token you control, create a token that's a copy of that permanent." | Copying N Food/Clue/Treasure tokens with Manufactor out gives N of each type, plus Took's extra Food. Copies do not keep Halsin's Bear effect (CR 707.2 copies only printed values). |
| 8 | Food-sacrifice payoffs | Trail of Crumbs: "Whenever you sacrifice a Food, you may pay {1}. If you do, look at the top two cards". · Wicked Wolf: "Sacrifice a Food: Put a +1/+1 counter on this creature. It gains indestructible until end of turn. Tap it." · Feasting Troll King: "Sacrifice three Foods: Return this card from your graveyard to the battlefield. Activate only during your turn." | Every Food spent digs, protects or rebuys. Hungering Puppetbeast's "{1}, Sacrifice another artifact" is the repeatable artifact outlet. |
| 9 | Tutors for the engine | Chord of Calling: "creature card with mana value X or less" · Invasion of Ikoria: "non-Human creature card" · Archdruid's Charm: "creature or land card" · Transmutation Font: "Search your library for an artifact card, put it onto the battlefield" | Took is a Halfling (non-Human, Invasion-legal); Manufactor is an Assembly-Worker. Jaheira is a Human, so not Invasion. Font finds Manufactor. |

**Does NOT work the way it looks**
- ❌ **Displaced Dinosaurs breaks the Trudge loop.** Food, Clue and Treasure enter as summoning-sick 7/7 creatures. That means:
  - Jaheira's "{T}: Add {G}" is off for them that turn.
  - Treasure "{T}, Sacrifice" is off.
  - Food "{2}, {T}, Sacrifice" is off (CR 302.6).
  - Only the commander's tap-two-Foods mana survives, at ½ mana per Food. Dinosaurs is a separate plan, not a loop piece.
- ❌ **Walking Ballista from Chord, Invasion or Font** enters with X = 0 ("enters with X +1/+1 counters") and dies at once. Hard-cast it from hand.
- ⚠️ **Halsin on a Dinosaur token** sets "base power and toughness 4/4" with a later timestamp, so the 7/7 shrinks. Animate plain tokens only.
- ⚠️ **The commander's drawback:** "Whenever a creature deals combat damage to you, sacrifice a Food token." Ruling: you gain no life from it ([rulings](https://api.scryfall.com/cards/2fea0356-6684-4730-9eb4-0262856bc1f9/rulings)). It does trigger Trail of Crumbs and Unlucky Cabbage Merchant.
- ⚠️ **Unlucky Cabbage Merchant:** "If you search your library this way, put this creature on the bottom." Each search costs you the body.

## 3. Turn by turn
| Turn | Ideal | Realistic (average hand) |
|---|---|---|
| T1 | Forest, Llanowar Elves | Forest, Gilded Goose or Wild Growth |
| T2 | Forest, **The Cabbage Merchant** | Many Partings + Tough Cookie, or Elvish Mystic + 2-drop |
| T3 | Forest, Peregrin Took + Teething Wurmlet | **The Cabbage Merchant** + 1-drop |
| T4 | Academy Manufactor + Trail of Crumbs (Trail's Food → 2 Food, 2 Clue, 2 Treasure → 6 Wurmlet triggers) | Cultivate / Kodama's Reach, or Jaheira + Tough Cookie |
| T5 | Trudge Garden + Jaheira; sacrifice a Food → loop → draw to Ballista → win | Peregrin Took + Trail of Crumbs, or Garruk's Uprising |
| T6 | — | Hornet Queen / Displaced Dinosaurs / Verdant Kraken; swing with trample once the board is bigger than the table's |

## 4. Mulligan
Keep: 3+ lands, or 2 lands + a 1-mana accelerant. You also need one engine piece (Took, Manufactor, Trail, Jaheira, Trudge) or a ramp spell. Fogs and protection in hand are not plays.

| Keep | Why |
|---|---|
| Forest, Forest, Gingerbread Cabin, Llanowar Elves, Tough Cookie, Peregrin Took, Trail of Crumbs | Commander T2, Took T3 with Foods already flowing |
| Forest, Forest, Forest, Ash Barrens, Cultivate, Academy Manufactor, Snakeskin Veil | Land-rich, ramp, engine piece plus its protection |
| Forest, Forest, Escape Tunnel, Elvish Mystic, Jaheira, Trudge Garden, Teething Wurmlet | Three loop pieces; Mystic gives a T2 commander |

| Mulligan | Why |
|---|---|
| Forest, Hornet Queen, Verdant Kraken, Displaced Dinosaurs, Feasting Troll King, Ghalta, Seedborn Muse | 1 land; every spell costs 5+ |
| Forest, Forest, Forest, Forest, Mosswort Bridge, Nesting Grounds, Autumn's Veil | 6 lands, one narrow protection spell |
| Forest, Gilded Goose, Spore Frog, Arachnogenesis, Force of Vigor, Pest Infestation, Kenrith's Transformation | 1 land, all reactive; Goose is one-shot mana without Foods |

## 5. Lines to visualise each turn
- **Hold up:**
  - Snakeskin Veil ({G}, hexproof) for Took or Manufactor.
  - Autumn's Veil works only against "blue or black spells".
  - Force of Vigor is free on an opponent's turn ("exile a green card from your hand").
  - Endurance (Flash, Evoke) answers a graveyard deck.
  - Chord of Calling at instant speed with convoke.
- **Fogs keep your Foods:** Spore Frog ("Prevent all combat damage") and Arachnogenesis ("Prevent all combat damage that would be dealt this turn by non-Spider creatures"). They stop the commander's Food tax, and the Spiders still make Took Foods.
- **When to deploy the engine:** Took or Manufactor first, then token makers. Don't cast Trail of Crumbs, Giant Opportunity or Bumi's Feast Lecture before Took is down.
- **No wipes in the deck:** never overextend. Hold Second Harvest, Displaced Dinosaurs and Hornet Queen for after a wipe. Wicked Wolf can make itself indestructible with a Food.
- **The alpha turn:**
  1. Count the lethal before you commit.
  2. Uprising or Ghalta gives trample.
  3. Return of the Wildspeaker (+3/+3, non-Human; Toski and Took qualify, Jaheira and The Earth King don't).
  4. Night of the Sweets' Revenge (+X = Foods) is sorcery speed: crack it precombat.
- **Threat cues:**
  - Fliers are your problem (reach: Endurance, Titanbones, Arachnogenesis Spiders; Hornet Queen).
  - Kill artifact and enchantment hate first: Force of Vigor, Archdruid's Charm "Exile target artifact or enchantment", Pest Infestation.

## 6. Misplays to avoid
1. Applying Manufactor before Took. You lose a third of the tokens.
2. Casting Displaced Dinosaurs before you go for the Trudge loop.
3. Fetching Walking Ballista with Chord, Invasion or Font.
4. Halsin-animating a 7/7 Dinosaur token.
5. Eating Food for life with no Trudge Garden or Titanbones ("Whenever you gain life, put two +1/+1 counters") out. The Food is worth more as mana, a Wolf counter or a Troll King rebuy.
6. Taking combat damage with a Food-rich board when a block or Spore Frog was available.
7. Forgetting Jiang Yanggu's end-step untap. Leave tokens tapped for mana in your second main phase, and they are fresh for opponents' turns.
8. Feasting Troll King cast from anywhere but hand: "if you cast it from your hand" makes the 3 Foods.
9. Searching with Unlucky Cabbage Merchant when its body is the Food-sacrifice fodder you need.
10. Toski: "Toski attacks each combat if able". It is indestructible, but it taps; keep that in mind on defence.

## 7. Weak spots and how to play around them
| Threat | Why it hurts | Play-around |
|---|---|---|
| Board wipes | No wipes of its own; the plan is a wide board | Hold the second wave (Hornet Queen, Dinosaurs, Second Harvest); Wicked Wolf indestructible; Feasting Troll King rebuys with 3 Foods |
| Artifact hate | Foods, Clues, Treasures, Manufactor, Font, Idol | Spread engines across enchantments (Trudge, Trail, Night, Uprising) and creatures (Took, Jaheira) |
| Creature-light tables | The commander needs opponents' noncreature spells, and that is the only Food source when Took is absent | Rely on Took/Trail/Goose/Cookie Foods instead |
| Fliers | Ground deck | Hornet Queen deathtouch fliers, reach (Endurance, Titanbones, Arachnogenesis), Kenrith's Transformation ("loses all abilities"), Bridgeworks Battle fight |
| Fast combo | Interaction is light: Force of Vigor, Archdruid's Charm, Kenrith's, Endurance | Hold Force of Vigor for the combo artifact/enchantment; Endurance vs graveyard combo |
| 99-card list | Not a legal 100 | Add the 100th (Elvish Archdruid, per the 09-28 review) before the next game |
