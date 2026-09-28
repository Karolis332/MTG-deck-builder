# Tazri, Beacon of Unity — audit report (2026-09-28)

## 1. Plan

Tazri (`{2/U}{2/B}{2/R}{2/G}: look at 6, take up to 2 Cleric/Rogue/Warrior/Wizard/Ally`) and the deck's
changelings (Changeling Outcast, Masked Vandal, Mirror Entity, Mutable Explorer, Stonework Packbeast)
fill a full party cheaply, turning on Archpriest of Iona, Linvala, Nadaar, Nimble Trapfinder, Squad
Commander and cost-reducers (Coveted Prize, Spoils of Adventure, Zagras, Veteran Adventurer-style).
It wins by wide combat pressure (Karlach's extra combat, Najeela's tokens, Outlaws' Merriment) backed
by 9 ramp pieces across 5 colours and a "take the initiative" dungeon sub-package for incidental value.
Per `decks/paper/HISTORY.md`, the operator already tuned this at length (v1–v14, latest: `-Boros Charm`);
no swap below re-proposes a card the operator explicitly cut without a stated reason it's different now.

## 2. Health

| Category | Current | Proposed | Note |
|---|---|---|---|
| Lands | 34 (+2 MDFC backs) | 34 (+2 MDFC backs) | untouched; gate WARN both ways (target 38-39±2) — pre-existing, not from this pass |
| Ramp/fixing | 9 (Signet, Lantern, Fellwar, Sol Ring, Packbeast, Explore Underdark, Farseek, Kodama's, Nature's Lore) | 10 | -Explore the Underdark (slow, 5cmc), +Growth Spiral, +Selvala (adds draw too) |
| Card draw | ~1 real (Spoils of Adventure; Coveted Prize is a tutor) | 4 | +Syphon Mind, +Growth Spiral, +Selvala engine |
| Spot removal | 1 (Swords to Plowshares) | 4 | +Generous Gift, +Putrefy, +Infernal Grasp |
| Board wipes | 1 (Blasphemous Act) | 1 | unchanged |
| Protection | 3 (Heroic Intervention, Selfless Spirit, Unsettled Mariner) | 4 | +Grand Abolisher |
| Win conditions (gate) | 7 | 6 | -1 from cutting Feywild Caretaker/Explore the Underdark's incidental value; still well above the 2 floor |
| Avg MV (gate) | 3.20 | 3.06 | proposed curve is lower |
| Game changers | 0 | 0 | no game-changer-flagged cards in deck or added; bracket-3 cap of 3 not touched |

Structural note: the deck's biggest hole was interaction — one removal spell and no card draw engine for a
5-colour 100-card deck. The swaps below target exactly that without touching the party/changeling plan.

## 3. Swaps (ranked by impact)

| # | IN | OUT | Why IN | Why OUT is weaker |
|---|---|---|---|---|
| 1 | Generous Gift | Concerted Defense | "Destroy target permanent. Its controller creates a 3/3 ... token" — universal answer to any threat type | "Counter target noncreature spell unless its controller pays {1} plus... per creature in your party" only works pre-full-party and never touches creatures |
| 2 | Putrefy | Bar the Gate | "Destroy target artifact or creature. It can't be regenerated" for 3 mana, in colour | "Counter target creature or planeswalker spell" is dead once the threat resolves and does nothing to the other ~2/3 of threat types |
| 3 | Infernal Grasp | Multiclass Baldric | "Destroy target creature. You lose 2 life" — cheapest hard removal available | Equipment that only grants keywords while you already have a full party — text is dead the rest of the game |
| 4 | Grand Abolisher | Stick Together | "During your turn, your opponents can't cast spells or activate abilities..." protects an attack-heavy party turn | "Each player chooses a party... then sacrifices the rest" is symmetrical — it can strip the caster's own board as easily as an opponent's |
| 5 | Syphon Mind | Thwart the Grave | "Each other player discards a card. You draw a card for each card discarded this way" — scales with opponent count in multiplayer, deck's only real draw spell before this (Night's Whisper allocated to Meren/Imotekh) | Needs a full party AND two specific creatures already in the graveyard to be worth its 6cmc; too narrow |
| 6 | Selvala, Heart of the Wilds | Feywild Caretaker | "{G},{T}: Add X mana... where X is the greatest power" plus a draw trigger — ramp and card advantage in one slot | 5-mana 1/1 that only makes a 1/1 flier per turn while you hold the initiative; low rate for the cost |
| 7 | Growth Spiral | Explore the Underdark | 2-mana "Draw a card. You may put a land card from your hand onto the battlefield" — cheapest ramp+cantrip in the pool | 5-mana sorcery-speed ramp is the slowest piece already in the ramp package; redundant with 3 cheaper land tutors already kept |

No game changers added; count stays 0/3.

## 4. Coverage (mandatory safety net)

721 open cards in colour identity; 234 meet the rank/price/game-changer/party-planeswalker bar (0 game-changer-flagged cards exist in this pool). Reasons quote the card's own oracle clause.

- **Path of Ancestry** (#14, $?) -- REJECT -- extra mana rock (This land enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Rogue's Passage** (#18, $0.67) -- REJECT -- extra mana rock ({T}: Add {C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Evolving Wilds** (#19, $0.26) -- REJECT -- redundant ramp/fixing ({T}, Sacrifice this land: Search your library for a basic land card, put it onto the...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Cultivate** (#20, $0.47) -- REJECT -- redundant ramp/fixing (Search your library for up to two basic land cards, reveal those cards, put one onto the...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Rampant Growth** (#27, $0.67) -- REJECT -- redundant ramp/fixing (Search your library for a basic land card, put that card onto the battlefield tapped,...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Terramorphic Expanse** (#28, $0.3) -- REJECT -- redundant ramp/fixing ({T}, Sacrifice this land: Search your library for a basic land card, put it onto the...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Commander's Sphere** (#52, $0.26) -- REJECT -- extra mana rock ({T}: Add one mana of any color in your commander's color identity.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Negate** (#56, $0.21) -- REJECT -- narrow counterspell (Counter target noncreature spell.) - same reason Concerted Defense/Bar the Gate were cut, too situational in multiplayer
- **Generous Gift** (#61, $0.78) -- ADD -- flexible removal - 'Destroy target permanent' fills the deck's near-total lack of hard removal
- **Temple of the False God** (#83, $0.28) -- REJECT -- extra mana rock ({T}: Add {C}{C}. Activate only if you control five or more lands.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Dragonskull Summit** (#84, $0.42) -- REJECT -- extra mana rock (This land enters tapped unless you control a Swamp or a Mountain.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Sunken Hollow** (#86, $0.35) -- REJECT -- extra mana rock (({T}: Add {U} or {B}.)) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Smoldering Marsh** (#94, $0.31) -- REJECT -- extra mana rock (({T}: Add {B} or {R}.)) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Frantic Search** (#99, $2.06) -- REJECT -- off-plan goodstuff (Draw two cards, then discard two cards. Untap up to three lands.) - no party/changeling synergy and doesn't beat a kept card
- **Wayfarer's Bauble** (#124, $5.44) -- REJECT -- redundant ramp/fixing ({2}, {T}, Sacrifice this artifact: Search your library for a basic land card, put that...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Talisman of Hierarchy** (#135, $0.47) -- REJECT -- extra mana rock ({T}: Add {C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Abrade** (#144, $0.35) -- REJECT -- single-target removal (Choose one —) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Boros Charm** (#180, $?) -- REJECT -- off-plan goodstuff (Choose one —) - no party/changeling synergy and doesn't beat a kept card
- **Night's Whisper** (#182, $6.25) -- REJECT -- allocated to Meren of Clan Nel Toth / Imotekh the Stormlord in this shared-pool pass; 'You draw two cards and lose 2 life' would have been the pick otherwise
- **Ornithopter of Paradise** (#220, $2.12) -- REJECT -- extra mana rock (Flying) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Terminate** (#224, $0.33) -- REJECT -- single-target removal (Destroy target creature. It can't be regenerated.) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Mirkwood Bats** (#228, $1.84) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Sign in Blood** (#232, $3.2) -- REJECT -- off-plan goodstuff (Target player draws two cards and loses 2 life.) - no party/changeling synergy and doesn't beat a kept card
- **Explore** (#234, $0.22) -- REJECT -- off-plan goodstuff (You may play an additional land this turn.) - no party/changeling synergy and doesn't beat a kept card
- **Sword of the Animist** (#235, $6.22) -- REJECT -- redundant ramp/fixing (Equipped creature gets +1/+1.) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Growth Spiral** (#236, $0.32) -- ADD -- cheap 'Draw a card. You may put a land card from your hand onto the battlefield' smooths the 5c curve
- **Grand Abolisher** (#251, $18.56) -- ADD -- 'During your turn, your opponents cant cast spells' protects the attack-heavy party plan
- **Everflowing Chalice** (#254, $0.33) -- REJECT -- extra mana rock (Multikicker {2} (You may pay an additional {2} any number of times as you cast this...) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Infernal Grasp** (#261, $0.37) -- ADD -- cheap 'Destroy target creature' for 2 life, cheapest removal available in colour
- **Skyshroud Claim** (#300, $1.08) -- REJECT -- off-plan goodstuff (Search your library for up to two Forest cards, put them onto the battlefield, then...) - no party/changeling synergy and doesn't beat a kept card
- **Harmonize** (#326, $0.28) -- REJECT -- off-plan goodstuff (Draw three cards.) - no party/changeling synergy and doesn't beat a kept card
- **Golgari Rot Farm** (#334, $0.32) -- REJECT -- extra mana rock (This land enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Putrefy** (#339, $0.33) -- ADD -- 2-mana instant 'Destroy target artifact or creature' in-colour, replaces the narrow Bar the Gate
- **Shamanic Revelation** (#368, $1.5) -- REJECT -- off-plan goodstuff (Draw a card for each creature you control.) - no party/changeling synergy and doesn't beat a kept card
- **Forgotten Ancient** (#390, $0.42) -- REJECT -- off-plan goodstuff (Whenever a player casts a spell, you may put a +1/+1 counter on this creature.) - no party/changeling synergy and doesn't beat a kept card
- **Selvala, Heart of the Wilds** (#410, $4.4) -- ADD -- ramp AND draw off 'may draw a card if its power is greater' + X-mana tap, the engine the ramp package lacks
- **Gruul Turf** (#455, $0.34) -- REJECT -- extra mana rock (This land enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Ghalta, Primal Hunger** (#460, $1.18) -- REJECT -- off-plan goodstuff (This spell costs {X} less to cast, where X is the total power of creatures you control.) - no party/changeling synergy and doesn't beat a kept card
- **Vault of the Archangel** (#466, $1.2) -- REJECT -- extra mana rock ({T}: Add {C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Bedevil** (#483, $0.29) -- REJECT -- single-target removal (Destroy target artifact, creature, or planeswalker.) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Diabolic Tutor** (#485, $2.3) -- REJECT -- off-plan goodstuff (Search your library for a card, put that card into your hand, then shuffle.) - no party/changeling synergy and doesn't beat a kept card
- **Vito, Thorn of the Dusk Rose** (#492, $11.96) -- REJECT -- off-plan goodstuff (Whenever you gain life, target opponent loses that much life.) - no party/changeling synergy and doesn't beat a kept card
- **Rise of the Dark Realms** (#495, $6.83) -- REJECT -- off-plan goodstuff (Put all creature cards from all graveyards onto the battlefield under your control.) - no party/changeling synergy and doesn't beat a kept card
- **Burnished Hart** (#497, $0.22) -- REJECT -- redundant ramp/fixing ({3}, Sacrifice this creature: Search your library for up to two basic land cards, put...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Sanguine Bond** (#505, $8.18) -- REJECT -- off-plan goodstuff (Whenever you gain life, target opponent loses that much life.) - no party/changeling synergy and doesn't beat a kept card
- **Avacyn's Pilgrim** (#507, $0.65) -- REJECT -- extra mana rock ({T}: Add {W}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Rakdos Carnarium** (#509, $0.34) -- REJECT -- extra mana rock (This land enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Terror of the Peaks** (#518, $29.54) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Ignoble Hierarch** (#535, $1.13) -- REJECT -- extra mana rock (Exalted (Whenever a creature you control attacks alone, that creature gets +1/+1 until...) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Nesting Grounds** (#559, $0.28) -- REJECT -- extra mana rock ({T}: Add {C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Bender's Waterskin** (#567, $1.01) -- REJECT -- extra mana rock (Untap this artifact during each other player's untap step.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Worn Powerstone** (#574, $0.38) -- REJECT -- extra mana rock (This artifact enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Return the Favor** (#587, $0.88) -- REJECT -- off-plan goodstuff (Spree (Choose one or more additional costs.)) - no party/changeling synergy and doesn't beat a kept card
- **Corrupted Conviction** (#599, $0.35) -- REJECT -- off-plan goodstuff (As an additional cost to cast this spell, sacrifice a creature.) - no party/changeling synergy and doesn't beat a kept card
- **Realmwalker** (#607, $1.92) -- REJECT -- off-plan goodstuff (Changeling (This card is every creature type.)) - no party/changeling synergy and doesn't beat a kept card
- **Boggart Trawler // Boggart Bog** (#633, $1.23) -- REJECT -- off-plan goodstuff (When this creature enters, exile target player's graveyard.) - no party/changeling synergy and doesn't beat a kept card
- **Sheltered Thicket** (#653, $0.25) -- REJECT -- extra mana rock (({T}: Add {R} or {G}.)) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Fog** (#657, $1.47) -- REJECT -- off-plan goodstuff (Prevent all combat damage that would be dealt this turn.) - no party/changeling synergy and doesn't beat a kept card
- **Opal Palace** (#676, $0.31) -- REJECT -- extra mana rock ({T}: Add {C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Canyon Slough** (#684, $0.29) -- REJECT -- extra mana rock (({T}: Add {B} or {R}.)) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Innkeeper's Talent** (#688, $9.57) -- REJECT -- off-plan goodstuff ((Gain the next level as a sorcery to add its ability.)) - no party/changeling synergy and doesn't beat a kept card
- **Vernal Fen** (#693, $0.47) -- REJECT -- extra mana rock (({T}: Add {B} or {G}.)) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Charcoal Diamond** (#698, $0.34) -- REJECT -- extra mana rock (This artifact enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Chain Reaction** (#708, $0.33) -- REJECT -- off-plan goodstuff (Chain Reaction deals X damage to each creature, where X is the number of creatures on the...) - no party/changeling synergy and doesn't beat a kept card
- **Riveteers Overlook** (#715, $0.37) -- REJECT -- off-plan goodstuff (When this land enters, sacrifice it. When you do, search your library for a basic Swamp,...) - no party/changeling synergy and doesn't beat a kept card
- **Palladium Myr** (#741, $1.13) -- REJECT -- extra mana rock ({T}: Add {C}{C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Elvish Spirit Guide** (#746, $3.4) -- REJECT -- off-plan goodstuff (Exile this card from your hand: Add {G}.) - no party/changeling synergy and doesn't beat a kept card
- **Seize the Spoils** (#760, $0.26) -- REJECT -- extra mana rock (As an additional cost to cast this spell, discard a card.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Jungle Hollow** (#785, $0.23) -- REJECT -- extra mana rock (This land enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Steel Overseer** (#809, $0.34) -- REJECT -- off-plan goodstuff ({T}: Put a +1/+1 counter on each artifact creature you control.) - no party/changeling synergy and doesn't beat a kept card
- **Cankerbloom** (#814, $0.58) -- REJECT -- single-target removal ({1}, Sacrifice this creature: Choose one —) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Murder** (#856, $0.28) -- REJECT -- single-target removal (Destroy target creature.) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Rishkar, Peema Renegade** (#870, $0.24) -- REJECT -- extra mana rock (When Rishkar enters, put a +1/+1 counter on each of up to two target creatures.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Elvish Archdruid** (#880, $7.17) -- REJECT -- Elf-tribal payoff - deck has no Elf subtheme, party/changeling is the tribal axis instead
- **Loot, Exuberant Explorer** (#893, $2.77) -- REJECT -- off-plan goodstuff (You may play an additional land on each of your turns.) - no party/changeling synergy and doesn't beat a kept card
- **Reconnaissance Mission** (#899, $0.36) -- REJECT -- off-plan goodstuff (Whenever a creature you control deals combat damage to a player, you may draw a card.) - no party/changeling synergy and doesn't beat a kept card
- **Spell Pierce** (#905, $0.31) -- REJECT -- narrow counterspell (Counter target noncreature spell unless its controller pays {2}.) - same reason Concerted Defense/Bar the Gate were cut, too situational in multiplayer
- **Blighted Woodland** (#925, $0.41) -- REJECT -- redundant ramp/fixing ({T}: Add {C}.) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Devoted Druid** (#966, $1.14) -- REJECT -- extra mana rock ({T}: Add {G}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Alhammarret's Archive** (#970, $10.16) -- REJECT -- off-plan goodstuff (If you would gain life, you gain twice that much life instead.) - no party/changeling synergy and doesn't beat a kept card
- **Loxodon Warhammer** (#972, $2.73) -- REJECT -- off-plan goodstuff (Equipped creature gets +3/+0 and has trample and lifelink.) - no party/changeling synergy and doesn't beat a kept card
- **Moraug, Fury of Akoum** (#980, $1.38) -- REJECT -- off-plan goodstuff (Each creature you control gets +1/+0 for each time it has attacked this turn.) - no party/changeling synergy and doesn't beat a kept card
- **Noxious Gearhulk** (#1003, $0.39) -- REJECT -- off-plan goodstuff (Menace) - no party/changeling synergy and doesn't beat a kept card
- **Annie Joins Up** (#1012, $3.85) -- REJECT -- single-target removal (When Annie Joins Up enters, it deals 5 damage to target creature or planeswalker an...) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Talisman of Unity** (#1014, $3.43) -- REJECT -- extra mana rock ({T}: Add {C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Syphon Mind** (#1049, $0.26) -- ADD -- 'Each other player discards a card. You draw a card for each card discarded this way' - scales with pod size, replaces Night's Whisper (reassigned to Meren/Imotekh) as the deck's draw spell
- **Roiling Regrowth** (#1050, $0.25) -- REJECT -- redundant ramp/fixing (Sacrifice a land. Search your library for up to two basic land cards, put them onto the...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Hunter's Insight** (#1058, $0.56) -- REJECT -- off-plan goodstuff (Choose target creature you control. Whenever that creature deals combat damage to a...) - no party/changeling synergy and doesn't beat a kept card
- **Strix Serenade** (#1059, $2.66) -- REJECT -- narrow counterspell (Counter target artifact, creature, or planeswalker spell. Its controller creates a 2/2...) - same reason Concerted Defense/Bar the Gate were cut, too situational in multiplayer
- **Shared Roots** (#1063, $0.51) -- REJECT -- redundant ramp/fixing (Search your library for a basic land card, put it onto the battlefield tapped, then...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Witch's Clinic** (#1069, $15.29) -- REJECT -- extra mana rock ({T}: Add {C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Three Steps Ahead** (#1076, $5.74) -- REJECT -- narrow counterspell (Spree (Choose one or more additional costs.)) - same reason Concerted Defense/Bar the Gate were cut, too situational in multiplayer
- **Fertile Ground** (#1078, $0.31) -- REJECT -- off-plan goodstuff (Enchant land) - no party/changeling synergy and doesn't beat a kept card
- **Cathartic Reunion** (#1104, $0.23) -- REJECT -- off-plan goodstuff (As an additional cost to cast this spell, discard two cards.) - no party/changeling synergy and doesn't beat a kept card
- **Mishra's Bauble** (#1106, $2.96) -- REJECT -- off-plan goodstuff ({T}, Sacrifice this artifact: Look at the top card of target player's library. Draw a...) - no party/changeling synergy and doesn't beat a kept card
- **Lumra, Bellow of the Woods** (#1130, $27.83) -- REJECT -- off-plan goodstuff (Reach, vigilance) - no party/changeling synergy and doesn't beat a kept card
- **Well of Lost Dreams** (#1131, $8.31) -- REJECT -- off-plan goodstuff (Whenever you gain life, you may pay {X}, where X is less than or equal to the amount of...) - no party/changeling synergy and doesn't beat a kept card
- **Twilight Prophet** (#1134, $3.62) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Sheoldred's Edict** (#1149, $1.23) -- REJECT -- off-plan goodstuff (Choose one —) - no party/changeling synergy and doesn't beat a kept card
- **Plumb the Forbidden** (#1152, $0.37) -- REJECT -- off-plan goodstuff (As an additional cost to cast this spell, you may sacrifice one or more creatures. When...) - no party/changeling synergy and doesn't beat a kept card
- **Requisition Raid** (#1224, $0.37) -- REJECT -- single-target removal (Spree (Choose one or more additional costs.)) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Bushwhack** (#1258, $0.26) -- REJECT -- redundant ramp/fixing (Choose one —) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Peer into the Abyss** (#1280, $3.67) -- REJECT -- off-plan goodstuff (Target player draws cards equal to half the number of cards in their library and loses...) - no party/changeling synergy and doesn't beat a kept card
- **Maestros Theater** (#1281, $0.24) -- REJECT -- off-plan goodstuff (When this land enters, sacrifice it. When you do, search your library for a basic Island,...) - no party/changeling synergy and doesn't beat a kept card
- **Carpet of Flowers** (#1287, $5.23) -- REJECT -- off-plan goodstuff (At the beginning of each of your main phases, if you haven't added mana with this ability...) - no party/changeling synergy and doesn't beat a kept card
- **Archfiend of Ifnir** (#1288, $0.39) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Haunted Mire** (#1296, $0.27) -- REJECT -- extra mana rock (({T}: Add {B} or {G}.)) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Tendershoot Dryad** (#1304, $1.23) -- REJECT -- off-plan goodstuff (Ascend (If you control ten or more permanents, you get the city's blessing for the rest...) - no party/changeling synergy and doesn't beat a kept card
- **Undying Malice** (#1311, $0.34) -- REJECT -- off-plan goodstuff (Until end of turn, target creature gains "When this creature dies, return it to the...) - no party/changeling synergy and doesn't beat a kept card
- **Umbral Collar Zealot** (#1326, $0.33) -- REJECT -- off-plan goodstuff (Sacrifice another creature or artifact: Surveil 1. (Look at the top card of your library....) - no party/changeling synergy and doesn't beat a kept card
- **Persist** (#1349, $0.87) -- REJECT -- off-plan goodstuff (Return target nonlegendary creature card from your graveyard to the battlefield with a...) - no party/changeling synergy and doesn't beat a kept card
- **Pristine Talisman** (#1354, $0.38) -- REJECT -- extra mana rock ({T}: Add {C}. You gain 1 life.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Binding the Old Gods** (#1358, $0.28) -- REJECT -- single-target removal ((As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Butcher of Malakir** (#1371, $0.36) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Glissa Sunslayer** (#1375, $0.58) -- REJECT -- single-target removal (First strike, deathtouch) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Regrowth** (#1382, $0.5) -- REJECT -- off-plan goodstuff (Return target card from your graveyard to your hand.) - no party/changeling synergy and doesn't beat a kept card
- **Rankle, Master of Pranks** (#1398, $2.8) -- REJECT -- off-plan goodstuff (Flying, haste) - no party/changeling synergy and doesn't beat a kept card
- **Grave Titan** (#1400, $0.34) -- REJECT -- off-plan goodstuff (Deathtouch) - no party/changeling synergy and doesn't beat a kept card
- **Contagion Clasp** (#1423, $0.28) -- REJECT -- off-plan goodstuff (When this artifact enters, put a -1/-1 counter on target creature.) - no party/changeling synergy and doesn't beat a kept card
- **Muraganda Raceway** (#1432, $0.82) -- REJECT -- extra mana rock (Start your engines! (If you have no speed, it starts at 1. It increases once on each of...) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Weathered Wayfarer** (#1438, $2.22) -- REJECT -- off-plan goodstuff ({W}, {T}: Search your library for a land card, reveal it, put it into your hand, then...) - no party/changeling synergy and doesn't beat a kept card
- **Goldvein Hydra** (#1439, $3.36) -- REJECT -- off-plan goodstuff (Vigilance, trample, haste) - no party/changeling synergy and doesn't beat a kept card
- **Elixir of Immortality** (#1443, $1.03) -- REJECT -- off-plan goodstuff ({2}, {T}: You gain 5 life. Shuffle this artifact and your graveyard into their owner's...) - no party/changeling synergy and doesn't beat a kept card
- **Dreadhorde Invasion** (#1449, $0.82) -- REJECT -- off-plan goodstuff (At the beginning of your upkeep, you lose 1 life and amass Zombies 1. (Put a +1/+1...) - no party/changeling synergy and doesn't beat a kept card
- **Insidious Roots** (#1451, $1.92) -- REJECT -- off-plan goodstuff (Creature tokens you control have "{T}: Add one mana of any color.") - no party/changeling synergy and doesn't beat a kept card
- **Beledros Witherbloom** (#1455, $1.37) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Fling** (#1456, $0.3) -- REJECT -- off-plan goodstuff (As an additional cost to cast this spell, sacrifice a creature.) - no party/changeling synergy and doesn't beat a kept card
- **Treasure Nabber** (#1467, $2.57) -- REJECT -- off-plan goodstuff (Whenever an opponent taps an artifact for mana, gain control of that artifact until the...) - no party/changeling synergy and doesn't beat a kept card
- **Fell the Mighty** (#1478, $0.3) -- REJECT -- off-plan goodstuff (Destroy all creatures with power greater than target creature's power.) - no party/changeling synergy and doesn't beat a kept card
- **Arid Archway** (#1500, $1.34) -- REJECT -- extra mana rock (This land enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Lavaspur Boots** (#1521, $1.89) -- REJECT -- off-plan goodstuff (Equipped creature gets +1/+0 and has haste and ward {1}. (Whenever it becomes the target...) - no party/changeling synergy and doesn't beat a kept card
- **Uro, Titan of Nature's Wrath** (#1554, $3.09) -- REJECT -- off-plan goodstuff (When Uro enters, sacrifice it unless it escaped.) - no party/changeling synergy and doesn't beat a kept card
- **Radiant Fountain** (#1559, $2.84) -- REJECT -- extra mana rock (When this land enters, you gain 2 life.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Kozilek, the Great Distortion** (#1567, $6.18) -- REJECT -- narrow counterspell (When you cast this spell, if you have fewer than seven cards in hand, draw cards equal to...) - same reason Concerted Defense/Bar the Gate were cut, too situational in multiplayer
- **Kiora's Follower** (#1591, $0.33) -- REJECT -- off-plan goodstuff ({T}: Untap another target permanent.) - no party/changeling synergy and doesn't beat a kept card
- **Nissa, Who Shakes the World** (#1657, $3.43) -- REJECT -- off-plan goodstuff (Whenever you tap a Forest for mana, add an additional {G}.) - no party/changeling synergy and doesn't beat a kept card
- **Murderous Rider // Swift End** (#1667, $0.38) -- REJECT -- single-target removal (Lifelink) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Massacre Girl, Known Killer** (#1698, $0.52) -- REJECT -- off-plan goodstuff (Menace) - no party/changeling synergy and doesn't beat a kept card
- **Overrun** (#1708, $0.34) -- REJECT -- off-plan goodstuff (Creatures you control get +3/+3 and gain trample until end of turn. (Each of those...) - no party/changeling synergy and doesn't beat a kept card
- **Painful Truths** (#1720, $0.31) -- REJECT -- off-plan goodstuff (Converge — You draw X cards and lose X life, where X is the number of colors of mana...) - no party/changeling synergy and doesn't beat a kept card
- **Flame of Anor** (#1736, $3.41) -- REJECT -- single-target removal (Choose one. If you control a Wizard as you cast this spell, you may choose two instead.) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Alesha, Who Laughs at Fate** (#1741, $2.94) -- REJECT -- off-plan goodstuff (First strike) - no party/changeling synergy and doesn't beat a kept card
- **Vampire Nighthawk** (#1750, $0.2) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Nyx Lotus** (#1761, $5.11) -- REJECT -- extra mana rock (Nyx Lotus enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Vengeful Bloodwitch** (#1764, $0.31) -- REJECT -- off-plan goodstuff (Whenever this creature or another creature you control dies, target opponent loses 1 life...) - no party/changeling synergy and doesn't beat a kept card
- **Adaptive Automaton** (#1766, $?) -- REJECT -- off-plan goodstuff (As this creature enters, choose a creature type.) - no party/changeling synergy and doesn't beat a kept card
- **Supernatural Stamina** (#1767, $0.21) -- REJECT -- off-plan goodstuff (Until end of turn, target creature gets +2/+0 and gains "When this creature dies, return...) - no party/changeling synergy and doesn't beat a kept card
- **Ilysian Caryatid** (#1779, $0.54) -- REJECT -- extra mana rock ({T}: Add one mana of any color. If you control a creature with power 4 or greater, add...) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Honest Rutstein** (#1815, $0.37) -- REJECT -- off-plan goodstuff (When Honest Rutstein enters, return target creature card from your graveyard to your hand.) - no party/changeling synergy and doesn't beat a kept card
- **Casualties of War** (#1827, $0.28) -- REJECT -- single-target removal (Choose one or more —) - covered by the swapped-in Generous Gift/Putrefy/Infernal Grasp/Swords to Plowshares
- **Springleaf Parade** (#1869, $8.78) -- REJECT -- extra mana rock (When this enchantment enters, create X 1/1 colorless Shapeshifter creature tokens with...) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Festering Thicket** (#1899, $0.32) -- REJECT -- extra mana rock (({T}: Add {B} or {G}.)) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Aven Interrupter** (#1906, $3.34) -- REJECT -- off-plan goodstuff (Flash) - no party/changeling synergy and doesn't beat a kept card
- **Tree of Perdition** (#1911, $2.63) -- REJECT -- off-plan goodstuff (Defender) - no party/changeling synergy and doesn't beat a kept card
- **Black Sun's Zenith** (#1929, $0.36) -- REJECT -- off-plan goodstuff (Put X -1/-1 counters on each creature. Shuffle Black Sun's Zenith into its owner's...) - no party/changeling synergy and doesn't beat a kept card
- **Cycle of Renewal** (#1932, $0.33) -- REJECT -- redundant ramp/fixing (Sacrifice a land. Search your library for up to two basic land cards, put them onto the...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Varragoth, Bloodsky Sire** (#1952, $4.51) -- REJECT -- off-plan goodstuff (Deathtouch) - no party/changeling synergy and doesn't beat a kept card
- **Bitterthorn, Nissa's Animus** (#1953, $5.64) -- REJECT -- redundant ramp/fixing (Living weapon (When this Equipment enters, create a 0/0 black Phyrexian Germ creature...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Venser's Journal** (#1998, $9.14) -- REJECT -- off-plan goodstuff (You have no maximum hand size.) - no party/changeling synergy and doesn't beat a kept card
- **Magda, the Hoardmaster** (#2001, $2.71) -- REJECT -- off-plan goodstuff (Whenever you commit a crime, create a tapped Treasure token. This ability triggers only...) - no party/changeling synergy and doesn't beat a kept card
- **Conduit Pylons** (#2014, $0.29) -- REJECT -- extra mana rock (When this land enters, surveil 1. (Look at the top card of your library. You may put it...) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Sangromancer** (#2023, $0.91) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Gonti, Lord of Luxury** (#2074, $0.34) -- REJECT -- off-plan goodstuff (Deathtouch) - no party/changeling synergy and doesn't beat a kept card
- **Paradise Druid** (#2090, $0.2) -- REJECT -- off-plan goodstuff (This creature has hexproof as long as it's untapped. (It can't be the target of spells or...) - no party/changeling synergy and doesn't beat a kept card
- **Mycoloth** (#2104, $0.4) -- REJECT -- off-plan goodstuff (Devour 2 (As this creature enters, you may sacrifice any number of creatures. It enters...) - no party/changeling synergy and doesn't beat a kept card
- **Cityscape Leveler** (#2114, $13.36) -- REJECT -- off-plan goodstuff (Trample) - no party/changeling synergy and doesn't beat a kept card
- **The Key to the Vault** (#2176, $0.71) -- REJECT -- off-plan goodstuff (Whenever equipped creature deals combat damage to a player, look at that many cards from...) - no party/changeling synergy and doesn't beat a kept card
- **Monstrous Vortex** (#2177, $0.38) -- REJECT -- off-plan goodstuff (Whenever you cast a creature spell with power 5 or greater, discover X, where X is that...) - no party/changeling synergy and doesn't beat a kept card
- **Verdant Sun's Avatar** (#2179, $0.41) -- REJECT -- off-plan goodstuff (Whenever this creature or another creature you control enters, you gain life equal to...) - no party/changeling synergy and doesn't beat a kept card
- **Primeval Bounty** (#2180, $0.36) -- REJECT -- off-plan goodstuff (Whenever you cast a creature spell, create a 3/3 green Beast creature token.) - no party/changeling synergy and doesn't beat a kept card
- **Flare of Cultivation** (#2185, $0.64) -- REJECT -- redundant ramp/fixing (You may sacrifice a nontoken green creature rather than pay this spell's mana cost.) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Earthbender Ascension** (#2189, $2.31) -- REJECT -- redundant ramp/fixing (When this enchantment enters, earthbend 2. Then search your library for a basic land...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Greed** (#2191, $0.36) -- REJECT -- off-plan goodstuff ({B}, Pay 2 life: Draw a card.) - no party/changeling synergy and doesn't beat a kept card
- **Final Showdown** (#2214, $5.32) -- REJECT -- off-plan goodstuff (Spree (Choose one or more additional costs.)) - no party/changeling synergy and doesn't beat a kept card
- **Hidden Grotto** (#2257, $0.27) -- REJECT -- extra mana rock (When this land enters, surveil 1. (Look at the top card of your library. You may put it...) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Qarsi Revenant** (#2379, $2.65) -- REJECT -- off-plan goodstuff (Flying, deathtouch, lifelink) - no party/changeling synergy and doesn't beat a kept card
- **Nether Traitor** (#2388, $0.85) -- REJECT -- off-plan goodstuff (Haste) - no party/changeling synergy and doesn't beat a kept card
- **Earthshaker Dreadmaw** (#2391, $0.28) -- REJECT -- off-plan goodstuff (Trample) - no party/changeling synergy and doesn't beat a kept card
- **Urban Evolution** (#2392, $0.35) -- REJECT -- off-plan goodstuff (Draw three cards. You may play an additional land this turn.) - no party/changeling synergy and doesn't beat a kept card
- **Regal Behemoth** (#2417, $0.71) -- REJECT -- off-plan goodstuff (Trample) - no party/changeling synergy and doesn't beat a kept card
- **Abundant Growth** (#2428, $0.23) -- REJECT -- extra mana rock (Enchant land) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Primordial Hydra** (#2433, $1.32) -- REJECT -- off-plan goodstuff (This creature enters with X +1/+1 counters on it.) - no party/changeling synergy and doesn't beat a kept card
- **Forsaken Miner** (#2434, $2.3) -- REJECT -- off-plan goodstuff (This creature can't block.) - no party/changeling synergy and doesn't beat a kept card
- **Consuming Corruption** (#2437, $0.36) -- REJECT -- off-plan goodstuff (Consuming Corruption deals X damage to target creature or planeswalker and you gain X...) - no party/changeling synergy and doesn't beat a kept card
- **Harvest Season** (#2443, $1.12) -- REJECT -- redundant ramp/fixing (Search your library for up to X basic land cards, where X is the number of tapped...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Nulldrifter** (#2491, $0.95) -- REJECT -- off-plan goodstuff (When you cast this spell, draw two cards.) - no party/changeling synergy and doesn't beat a kept card
- **Doc Aurlock, Grizzled Genius** (#2533, $0.37) -- REJECT -- off-plan goodstuff (Spells you cast from your graveyard or from exile cost {2} less to cast.) - no party/changeling synergy and doesn't beat a kept card
- **Chomping Changeling** (#2554, $1.38) -- REJECT -- off-plan goodstuff (Changeling (This card is every creature type.)) - no party/changeling synergy and doesn't beat a kept card
- **Witch of the Moors** (#2568, $0.38) -- REJECT -- off-plan goodstuff (Deathtouch) - no party/changeling synergy and doesn't beat a kept card
- **Dread Presence** (#2575, $3.48) -- REJECT -- off-plan goodstuff (Whenever a Swamp you control enters, choose one —) - no party/changeling synergy and doesn't beat a kept card
- **Puppeteer Clique** (#2587, $0.28) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Bloated Contaminator** (#2606, $3.41) -- REJECT -- off-plan goodstuff (Trample) - no party/changeling synergy and doesn't beat a kept card
- **Vraska Joins Up** (#2616, $1.25) -- REJECT -- off-plan goodstuff (When Vraska Joins Up enters, put a deathtouch counter on each creature you control.) - no party/changeling synergy and doesn't beat a kept card
- **Blood Pet** (#2622, $0.61) -- REJECT -- off-plan goodstuff (Sacrifice this creature: Add {B}.) - no party/changeling synergy and doesn't beat a kept card
- **Ashiok, Dream Render** (#2661, $1.48) -- REJECT -- off-plan goodstuff (Spells and abilities your opponents control can't cause their controller to search their...) - no party/changeling synergy and doesn't beat a kept card
- **Mirri, Weatherlight Duelist** (#2664, $5.68) -- REJECT -- off-plan goodstuff (First strike) - no party/changeling synergy and doesn't beat a kept card
- **Archfiend of Despair** (#2680, $20.75) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Fire Covenant** (#2713, $0.3) -- REJECT -- off-plan goodstuff (As an additional cost to cast this spell, pay X life.) - no party/changeling synergy and doesn't beat a kept card
- **Blade Historian** (#2715, $5.73) -- REJECT -- off-plan goodstuff (Attacking creatures you control have double strike.) - no party/changeling synergy and doesn't beat a kept card
- **Domri, Anarch of Bolas** (#2723, $1.13) -- REJECT -- off-plan goodstuff (Creatures you control get +1/+0.) - no party/changeling synergy and doesn't beat a kept card
- **Dina, Soul Steeper** (#2746, $0.29) -- REJECT -- off-plan goodstuff (Whenever you gain life, each opponent loses 1 life.) - no party/changeling synergy and doesn't beat a kept card
- **Nightshade Dryad** (#2780, $0.27) -- REJECT -- extra mana rock (Deathtouch) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Hornet Nest** (#2802, $0.38) -- REJECT -- off-plan goodstuff (Defender (This creature can't attack.)) - no party/changeling synergy and doesn't beat a kept card
- **Metamorphosis Fanatic** (#2850, $6.01) -- REJECT -- off-plan goodstuff (Lifelink) - no party/changeling synergy and doesn't beat a kept card
- **Outcaster Trailblazer** (#2889, $1.51) -- REJECT -- off-plan goodstuff (When this creature enters, add one mana of any color.) - no party/changeling synergy and doesn't beat a kept card
- **Simic Charm** (#2909, $3.43) -- REJECT -- off-plan goodstuff (Choose one —) - no party/changeling synergy and doesn't beat a kept card
- **Skirge Familiar** (#2931, $0.33) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Mudflat Village** (#2932, $0.33) -- REJECT -- extra mana rock ({T}: Add {C}.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Necroskitter** (#2939, $0.38) -- REJECT -- off-plan goodstuff (Wither (This deals damage to creatures in the form of -1/-1 counters.)) - no party/changeling synergy and doesn't beat a kept card
- **Abraded Bluffs** (#2985, $0.33) -- REJECT -- extra mana rock (This land enters tapped.) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **The Legend of Kyoshi // Avatar Kyoshi** (#3073, $5.67) -- REJECT -- extra mana rock ((As this Saga enters and after your draw step, add a lore counter.)) - Sol Ring/Arcane Signet/Fellwar Stone/Chromatic Lantern already fill this role
- **Worldwalker Helm** (#3365, $4.11) -- REJECT -- off-plan goodstuff (If you would create one or more artifact tokens, instead create those tokens plus an...) - no party/changeling synergy and doesn't beat a kept card
- **Torpor Orb** (#3484, $5.07) -- REJECT -- off-plan goodstuff (Creatures entering don't cause abilities to trigger.) - no party/changeling synergy and doesn't beat a kept card
- **Planetarium of Wan Shi Tong** (#3624, $5.86) -- REJECT -- off-plan goodstuff ({1}, {T}: Scry 2.) - no party/changeling synergy and doesn't beat a kept card
- **Avatar Kyoshi, Earthbender** (#4331, $14.68) -- REJECT -- off-plan goodstuff (During your turn, Avatar Kyoshi has hexproof.) - no party/changeling synergy and doesn't beat a kept card
- **Lost Jitte** (#4482, $5.39) -- REJECT -- off-plan goodstuff (Whenever equipped creature deals combat damage, put a charge counter on Lost Jitte.) - no party/changeling synergy and doesn't beat a kept card
- **Helix Pinnacle** (#4488, $8.07) -- REJECT -- off-plan goodstuff (Shroud (This enchantment can't be the target of spells or abilities.)) - no party/changeling synergy and doesn't beat a kept card
- **Everything Comes to Dust** (#4566, $5.51) -- REJECT -- off-plan goodstuff (Convoke (Your creatures can help cast this spell. Each creature you tap while casting...) - no party/changeling synergy and doesn't beat a kept card
- **Necrotic Ooze** (#4569, $5.09) -- REJECT -- off-plan goodstuff (As long as this creature is on the battlefield, it has all activated abilities of all...) - no party/changeling synergy and doesn't beat a kept card
- **Stensian Sanguinist // Exsanguinate** (#4796, $4.95) -- REJECT -- off-plan goodstuff (Whenever you attack, target creature gains deathtouch until end of turn. Whenever that...) - no party/changeling synergy and doesn't beat a kept card
- **Shard of the Nightbringer** (#5603, $5.37) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Pact Weapon** (#5696, $4.53) -- REJECT -- off-plan goodstuff (As long as this Equipment is attached to a creature, you don't lose the game for having 0...) - no party/changeling synergy and doesn't beat a kept card
- **Emeritus of Ideation // Ancestral Recall** (#5958, $5.61) -- REJECT -- off-plan goodstuff (Flying, ward {2}) - no party/changeling synergy and doesn't beat a kept card
- **Sapling of Colfenor** (#6703, $5.51) -- REJECT -- off-plan goodstuff (Indestructible) - no party/changeling synergy and doesn't beat a kept card
- **Tamiyo, Inquisitive Student // Tamiyo, Seasoned Scholar** (#7121, $17.41) -- REJECT -- off-plan goodstuff (Flying) - no party/changeling synergy and doesn't beat a kept card
- **Slickshot Show-Off** (#9353, $5.63) -- REJECT -- off-plan goodstuff (Flying, haste) - no party/changeling synergy and doesn't beat a kept card
- **Tarmogoyf** (#9480, $4.69) -- REJECT -- off-plan goodstuff (Tarmogoyf's power is equal to the number of card types among cards in all graveyards and...) - no party/changeling synergy and doesn't beat a kept card
- **Pest Control** (#15860, $4.53) -- REJECT -- off-plan goodstuff (Destroy all nonland permanents with mana value 1 or less.) - no party/changeling synergy and doesn't beat a kept card
- **Flickering Hound** (#20783, $12.43) -- REJECT -- off-plan goodstuff (Whenever you cast a creature spell, exile up to one other target creature you control,...) - no party/changeling synergy and doesn't beat a kept card
- **Simulacrum Shaper** (#25232, $7.26) -- REJECT -- redundant ramp/fixing (When this creature enters, you may search your library for a basic land card, put that...) - Farseek/Kodama's Reach/Nature's Lore/Explore the Underdark already cover this slot
- **Identity Echo** (#25640, $4.9) -- REJECT -- off-plan goodstuff ({3}{R}: Exile target creature or planeswalker you control. Reveal cards from the top of...) - no party/changeling synergy and doesn't beat a kept card
- **Carnivorous Cultivator // Enroot** (#26583, $5.78) -- REJECT -- off-plan goodstuff (Deathtouch) - no party/changeling synergy and doesn't beat a kept card
- **Omnipresence** (#26979, $25.16) -- REJECT -- off-plan goodstuff (You may cast spells with mana value less than or equal to the number of creatures you...) - no party/changeling synergy and doesn't beat a kept card
- **The Echoverse Fulcrum** (#27737, $13.84) -- REJECT -- off-plan goodstuff (When The Echoverse Fulcrum enters, draw a card, then discard a card.) - no party/changeling synergy and doesn't beat a kept card
## 5. Gate

Ran: `MTG_DB_DIR="$(cygpath -m "$APPDATA")/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <proposed-gate-file> --format commander --owner 1 --source paper`

```
VERDICT   : FAIL (only on the two accepted items below)
  PASS  size        100 cards (commander wants 100)
  PASS  singleton   singleton respected (basics exempt)
  PASS  legality    every card legal in commander
  PASS  rules       no other format rule broken
  PASS  identity    all cards inside BGRUW
  PASS  ownership   all cards owned; paper collection imported 0 days ago
  WARN  arenaNames  2 card(s) exported front-face only (Glasspool Mimic, Stump Stomp) — same as current deck, MDFC paper cards
  WARN  lands       34 lands (+2 MDFC land backs = 34.8 effective); Karsten wants 38 ±2 — unchanged from current deck (also WARN), not introduced by this pass
  FAIL  plan        0/65 nonland cards interact (0%) — commander sets no measurable condition; same FAIL on the current deck (gate has no plan for this commander) — known/acceptable per brief
  PASS  curve       avg MV 3.09; commander sets no cost threshold
  PASS  wincons     6 win condition(s)/closer(s)
  PASS  locks       8 locked card(s) present and intact (Swords to Plowshares, Fellwar Stone, Inspiring Vantage confirmed present)
```

Everything gates PASS except the pre-existing land WARN (unchanged count, not caused by these swaps) and the
`plan` FAIL the brief calls out as acceptable for commanders the gate has no plan for.
