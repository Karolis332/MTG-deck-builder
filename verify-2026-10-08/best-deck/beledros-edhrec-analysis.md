# Beledros Witherbloom — EDHREC oracle analysis (2026-10-08)

Sources: EDHREC optimized page (188 decks, `beledros-edhrec-optimized.txt`) and the optimized Lifegain theme page
(33 decks, `beledros-edhrec-lifegain.txt`). Oracle text from the DB. Ownership = `collection.txt` + deck files
(Meren's deck counts as dismantled). Lab = model-lab `/api/score`, base objective 101.01, epsilon 0.25
(`edhrec-lab.md` = weakest-3 slots, `edhrec-lab-all.md` = every nonland slot).

Engine the cards are judged against: a Pest every upkeep ("When this token dies, you gain 1 life"),
sacrifice outlets (Ashnod's Altar lock, Viscera Seer, Priest of Forgotten Gods, Woe Strider…), death
payoffs (Blood Artist, Zulaport Cutthroat, Moldervine Reclamation, Midnight Reaper), lifegain payoffs
(Dina, Soul Steeper "Whenever you gain life, each opponent loses 1 life"; Vito and Sanguine Bond "Whenever
you gain life, target opponent loses that much life"), Mikaeus undying, and Beledros "Pay 10 life: Untap all
lands you control" (Beledros is an Elder Dragon).

## 1. The lab verdict

No owned, free EDHREC card clears +0.25 in any of the 62 nonland slots (best: Skyshroud Claim +0.13, Harrow +0.11, Rampant Growth +0.10, all for Priest of Forgotten Gods; Vilis −0.02 for Liliana). The score keeps the 99 as it is (operator rule 2026-10-08).
The cards the lab is blind to are exactly the high-lift ones: it has no model of life payment (Font of Agonies),
life-loss draw (Vilis, Greed, Stinging Study), graveyard recursion, or counters. Window penalty −2 hits every
extra ramp/removal/draw card because those roles are already full.

## 2. Not owned — buy tier, ranked by what the oracle text does in this engine

| # | Card | € (CM) | EDHREC (lifegain page) | Oracle, verbatim | What it does here |
|---|---|---|---|---|---|
| 1 | Skullclamp | 4,30 | 82 % · 2.2x | "Equipped creature gets +1/-1. Whenever equipped creature dies, draw two cards. Equip {1}" | Equip a 1/1 Pest: it dies as a state-based action → draw 2, gain 1, every death and lifegain trigger. {1} per Pest. The best card in the deck. |
| 2 | Exquisite Blood | 27,75 | 67 % · 1.3x | "Whenever an opponent loses life, you gain that much life." | Infinite with Sanguine Bond or Vito (both in the 99): any 1 point of drain loops until the table is dead. Two two-card wins. |
| 2b | Bloodthirsty Conqueror | 25,01 | 27 % · 0.9x | "Flying, deathtouch. Whenever an opponent loses life, you gain that much life." | Exquisite Blood on a 5/4 body: the same two infinite loops, but dies to removal. Pick one of the two. |
| 3 | Ayara, First of Locthwain | 3,62 | 61 % · 3.5x | "Whenever Ayara or another black creature you control enters, each opponent loses 1 life and you gain 1 life. {T}, Sacrifice another black creature: Draw a card." | Pests are black: every Pest entering drains 1 each and gains 1 (→ Dina/Vito/Bond). Her sac ability draws. {B}{B}{B}. |
| 4 | Marauding Blight-Priest | 0,11 | 45 % · 1.6x | "Whenever you gain life, each opponent loses 1 life." | A second Dina, Soul Steeper. Every Pest death = 1 to each opponent. |
| 5 | Bastion of Remembrance | — | 52 % · 1.6x | "Whenever a creature you control dies, each opponent loses 1 life and you gain 1 life." | Zulaport as an enchantment (survives wipes); the gain also triggers Dina/Vito/Bond. |
| 6 | Prosperous Innkeeper | 0,23 | 64 % · 2.1x | "When this creature enters, create a Treasure token. Whenever another creature you control enters, you gain 1 life." | Every Pest entering gains 1 → a drain. 2 mana + Treasure. |
| 7 | Essence Warden | 2,73 | 82 % · 1.8x | "Whenever another creature enters, you gain 1 life." | Innkeeper that also counts opponents' creatures. {G}. |
| 8 | Savra, Queen of the Golgari | 1,53 | 42 % · 3.8x | "Whenever you sacrifice a black creature, you may pay 2 life. If you do, each other player sacrifices a creature of their choice. Whenever you sacrifice a green creature, you may gain 2 life." | Pests are black AND green: each Pest sacrificed = an edict and gain 2. Pays life Beledros-style and refunds it. |
| 9 | Vampiric Rites | — | 30 % · 2.5x | "{1}{B}, Sacrifice a creature: You gain 1 life and draw a card." | Sac outlet that draws and gains (two lifegain triggers per Pest with the token's own). |
| 10 | Warren Soultrader | 13,98 | 45 % · 2.3x | "Pay 1 life, Sacrifice another creature: Create a Treasure token." | Free sac outlet that nets mana; the Pest refunds the life. |
| 11 | Pitiless Plunderer | 3,10 | 33 % · 1.3x | "Whenever another creature you control dies, create a Treasure token." | Every death = a Treasure; with Altar each Pest is 3 mana. |
| 12 | Exsanguinate | — | 55 % · 2.1x | "Each opponent loses X life. You gain life equal to the life lost this way." | The mana sink for Beledros's untap: pay 10, untap, X doubles; the gain triggers Dina/Vito/Bond on top. |
| 13 | Torment of Hailfire | 23,87 | 48 % · 5.5x | "Repeat the following process X times. Each opponent loses 3 life unless that player sacrifices a nonland permanent or discards a card." | Same sink, no lifegain; expensive. Exsanguinate first. |
| 14 | Bolas's Citadel | — | 61 % · 1.6x | "…cast spells from the top of your library. If you cast a spell this way, pay life equal to its mana value… {T}, Sacrifice ten nonland permanents: Each opponent loses 10 life." | Life is the resource this deck refunds; ten Pests = 10 to each. {3}{B}{B}{B}. |
| 15 | Tend the Pests | — | 24 % · 1.5x | "As an additional cost, sacrifice a creature. Create X 1/1 Pest tokens where X is the sacrificed creature's power." | Sacrifice Massacre Wurm (6) or Thunderfoot Baloth (5) at instant speed → that many Pests. Pest Summoning (two Pests for 3) is the weak version. |
| 16 | Stinging Study | 13,56 | 33 % · 7.9x | "You draw X cards and you lose X life, where X is the mana value of a commander you own…" | Draw 7 at instant speed (Beledros MV 7); the 7 life lost is what the deck refunds. |
| 17 | Krav, the Unredeemed | 2,93 | 12 % · 10x | "{B}, Sacrifice X creatures: Target player draws X cards and gains X life. Put X +1/+1 counters on Krav." | Sac outlet that draws and gains per creature. 5 mana. |
| 18 | Razaketh, the Foulblooded | 10,44 | 15 % · 13x | "Pay 2 life, Sacrifice another creature: Search your library for a card…" | Every Pest becomes a tutor. 8 mana. |
| 19 | Crux of Fate | — | 5–6 % · 17x | "Choose one — Destroy all Dragon creatures. / Destroy all non-Dragon creatures." | Beledros is an Elder Dragon: the wipe spares him; with Mikaeus your non-Humans return and every death trigger fires. |
| 20 | Nyxbloom Ancient | — | 19 % · 13x | "If you tap a permanent for mana, it produces three times as much of that mana instead." | Triple mana, then Beledros untaps everything. 7 mana. |
| 21 | Profane Transfusion | 1,50 | 18 % · 11x | "Two target players exchange life totals. You create an X/X Horror… where X is the difference." | After paying 10 to Beledros twice, swap with the healthiest opponent and get the Horror. 9 mana, cute. |
| 22 | Chatterfang, Squirrel General | 7,39 | 48 % · 2.1x | "If one or more tokens would be created under your control, those tokens plus that many 1/1 green Squirrel creature tokens are created instead." | Doubles every Pest (the Squirrel has no lifegain clause, but it is a body for the Altar and the death triggers). |
| 23 | Yawgmoth, Thran Physician | 25,60 | 36 % · 4.6x | "Pay 1 life, Sacrifice another creature: Put a -1/-1 counter on up to one target creature and draw a card." | Free sac outlet that draws and kills x/1s. |
| 24 | Enduring Tenacity | 11,45 | 33 % · 1.0x | "Whenever you gain life, target opponent loses that much life. When it dies, if it was a creature, return it… as an enchantment." | A third Vito/Sanguine Bond that survives one removal. |
| 25 | Starscape Cleric | 1,50 | 18 % · 0.8x | "Offspring {2}{B}… Whenever you gain life, each opponent loses 1 life." | Blight-Priest with flying; offspring = two copies for 5 mana. |
| — | Phyrexian Altar, Phyrexian Tower, Cabal Coffers, Urborg, Field of the Dead, Parallel Lives, The Meathook Massacre, Aetherflux Reservoir, Well of Lost Dreams, Demonic Tutor | — | | | Standard upgrades; Parallel Lives doubles Pests, Meathook is a wipe that drains, Reservoir/Well turn lifegain into reach/cards. |

## 3. Owned and free — what the text does, and the lab's number

| Card | Oracle, verbatim | Fit | Lab Δ (best slot) |
|---|---|---|---|
| Vilis, Broker of Blood | "Flying. {B}, Pay 2 life: Target creature gets -1/-1 until end of turn. Whenever you lose life, draw that many cards." | Beledros's pay 10 = draw 10 with every land untapped; -1/-1 on your own Pest = a death trigger plus 2 cards. 52 % of the 33 lifegain decks run him (10x lift). The model cannot see the draw: window overflow only. | −0.02 (for Liliana, Dreadhorde General) |
| Font of Agonies | "Whenever you pay life, put that many blood counters on this enchantment. {1}{B}, Remove four blood counters: Destroy target creature." | One Beledros activation = 10 counters = two removals, for {B}. 47x lift on the main page. Model-blind. | +0.00 |
| Healing Technique | "Return target card from your graveyard to your hand. You gain life equal to that card's mana value. Demonstrate…" | Regrowth that gains 5–7 (→ Dina/Vito/Bond drain the same). Copy it for a second return. | +0.06 |
| Dina, Essence Brewer | "Whenever you sacrifice a creature, draw a card. This ability triggers only once each turn. {2}, {T}, Sacrifice another creature: You gain X life and put X +1/+1 counters…" | A sac outlet that draws once a turn and gains. Registered today. | +0.00 |
| Harrow | "As an additional cost, sacrifice a land. Search your library for up to two basic land cards, put them onto the battlefield, then shuffle." | Both lands untapped, instant speed: the best tempo ramp in the deck's price range. Registered today. For a ramp slot (Priest of Forgotten Gods) the model is flat. | +0.11 |
| Skyshroud Claim | "Search your library for up to two Forest cards, put them onto the battlefield, then shuffle." | Two untapped Forests (incl. duals) for 4. Same slot. | +0.13 (the best number of the pass, below 0.25) |
| Arnyn, Deathbloom Botanist | "Deathtouch. Whenever a creature you control with power or toughness 1 or less dies, target opponent loses 2 life and you gain 2 life." | Every Pest death drains 2 and gains 2 — a double Blood Artist for Pests. The model is flat on it. | +0.04 |
| Blech, Loafing Pest | "Whenever you gain life, put a +1/+1 counter on each Pest, Bat, Insect, Snake, and Spider you control." | Swarm growth; counters cancel Mikaeus undying on those Pests (CR 702.93a). | +0.04 |
| Massacre Girl, Most Wanted | "Whenever another creature or planeswalker you control dies, Massacre Girl deals 1 damage to target opponent and you gain 1 life." | Blood Artist #3 with the gain attached. | +0.06 |
| Woe Strider | "Create a 0/1 Goat. Sacrifice another creature: Scry 1. Escape…" | Free sac outlet, recurs itself. | +0.04 |
| Mana Reflection | "If a permanent you control would produce mana, it produces twice that much instead." | Double mana then untap. 6 mana. | +0.07 |
| Verdant Sun's Avatar | "Whenever this creature or another creature you control enters, you gain life equal to that creature's toughness." | Every Pest entering gains 1 → drain. 7 mana. | +0.01 |
| Immoral Bargain | "Sacrifice X creatures. Destroy X target nonland permanents." | Pests into removal at sorcery speed. | +0.04 |
| Gaze of Granite | "Destroy each nonland permanent with mana value X or less." | A wipe that spares your 3+ drops at X=2; Pests die (triggers). | +0.03 |
| Omnipresence | "Cast spells with mana value ≤ the number of creatures you control from your hand without paying their mana costs." | 8 mana; the deck already has mana. | +0.01 |
| Greed | "{B}, Pay 2 life: Draw a card." | Life-to-cards at instant speed; refunded by Pests. | +0.03 |
| Dread Return | "Return target creature card from your graveyard to the battlefield. Flashback—Sacrifice three creatures." | Three Pests = a reanimation (triggers too). | not tested (model-neutral) |
| Return of the Wildspeaker | "Draw cards equal to the greatest power among non-Human creatures you control / +3/+3." | Draw 6–7 off Massacre Wurm or Baloth. | not tested |
| Insidious Roots, Fertile Ground, Wight of the Reliquary, Rampant Growth, Hour of Promise, Flare of Cultivation, Open the Way, Expedition Map, Carpet of Flowers | ramp | Ramp-for-ramp swaps are flat; into any other role −2 (window). | −0.02 to +0.10 |
| Reliquary Tower, Thespian's Stage, Talon Gates of Madara | colourless lands | Colour loss vs a Swamp. | −0.16 to −0.26 |

## 4. Owned but sleeved elsewhere (needs a backfill for the donor)

Nature's Lore (Bumi, Tazri), Farseek (Bumi, Tazri), Heroic Intervention (Tazri), Putrefy (Tazri), Sylvan Library (Tam),
Professor Dellian Fel (Tam), Dark Ritual / Crypt Ghast / Culling the Weak / Feed the Swarm / Thought Vessel /
The Soul Stone / Decorum Dissertation / Ominous Harvest (Imotekh), Chord of Calling / Archdruid's Charm / Wild Growth /
Seedborn Muse / Second Harvest / Force of Vigor / Trudge Garden (Cabbage), Explore / Shared Roots / Rogue's Passage
(Bumi), Shamanic Revelation (Gilanra). Tam and Tazri give nothing (top-priority rule).
