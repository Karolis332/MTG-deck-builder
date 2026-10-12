# Deck-quality audit B — no-collection builds at a21f2ff (2026-09-30)

Engine: `autoBuildDeck` from the read-only worktree, DB copy `C:/Users/QuLeR/AppData/Local/Temp/audit-B-db` (live DB copy, `classify_lands.py --db` re-run, `cf_api_url` = dead port).
Builds, scorer dumps and scratch scripts: `verify-2026-09-30/audit-B/{build-all.ts,builds/*.txt|json,land-scores.ts,land-scores.txt,profiles.ts,classify.ts}`.
No engine code was changed. The DB copy was deleted after the run.

Note for the brief: `scripts/classify_lands.py` ignores `MTG_DB_DIR` (`scripts/classify_lands.py:19-29` prefers `%APPDATA%`); it must be given `--db <copy>`. My first run hit the live DB before I noticed — the script is idempotent (re-derives the same 1,292 rows), no content changed.

## Headline numbers

| Deck | Format | Strategy chosen | Land-capable (real + spell-side MDFC) | avg MV nonland | Non-land mana pieces | Real sources vs pips |
|---|---|---|---|---|---|---|
| Atraxa, Praetors' Voice | commander | superfriends | 38 (38 + 0) | 3.30 | 15 | W29/U31/B30/G35 vs W8/U15/B14/G26 |
| Edgar Markov | commander | tribal (vampire) | 38 (35 + 3) | 3.02 | 9 | W22/B32/R18 vs W20/B55/R4 |
| Niv-Mizzet Reborn ($150, bracket 2) | commander | midrange | 38 (38 + 0), 8 nonbasic | 2.97 | 15 | W26/U22/B23/R23/G24 vs 17–22 each |
| Krenko, Mob Boss | brawl | tribal (goblin) | 38 (35 + 3) | 2.84 | 10 "ramp" (3 real) | R43 vs R61 |
| Kess, Dissident Mage | commander | **reanimator** | 38 (37 + 1) | 2.67 | 12 | U31/B28/R28 vs U26/B18/R13 |
| Ygra, Eater of All | brawl | **aggro** | 40 (35 + 5) | 2.37 | 13 "ramp" | B36/G35 vs B26/G30 |
| Tymna + Thrasios | commander | **aggro** | 39 (39 + 0) | 1.90 | 16 (5 fast-mana artifacts) | W30/U35/B30/G29 vs W11/U25/B10/G7 |

Every build lands on the flat 38 (`DEFAULT_LAND_COUNT`), then adds spell-side MDFCs on top. Expert counts: 28–30 (Tymna/Thrasios), 33–34 (Kess, Krenko, Ygra), 34–35 (Edgar), 35–36 (Atraxa, Niv).

Colour sources are never the problem (the repair loop over-serves every colour: Edgar has 18 red sources for 4 red pips). The problem is which lands fill the slots: in all six multicolour decks the top-30 ranking contains Temple of the Dragon Queen, Starting Town, Three Tree City, Grand Coliseum and (WUBG) Murmuring Bosk, while Mana Confluence, Reflecting Pool, painlands, pathways, triomes and bond lands miss the cut. Ranks from `land-scores.txt`:

| Land | Atraxa rank (score) | Edgar | Kess | Niv | Why |
|---|---|---|---|---|---|
| Three Tree City (no tribe) | #16 (219) | #1 (254, tribal) | #10 (219) | #24 (215) | tier 2 + untapped + "produces WUBRG"; the mono-only strip at `land-intelligence.ts:322` never runs in multicolour |
| Starting Town | #20 (218) | #12 | #13 | #29 | untapped only turns 1–3, credited as always untapped |
| Temple of the Dragon Queen | #21 (214) | #13 | #14 | #30 | `enters_untapped=1`, condition "reveal card of type" (Dragon) never checked |
| Murmuring Bosk | #22 (214) | – | – | #31 | classified 'pain' (`classify_lands.py:174`) before its reveal-Treefolk clause |
| Grand Coliseum ("This land enters tapped.") | #23 (211) | #17 | #19 | #38 | pain branch leaves `enters_untapped` at its default True (`classify_lands.py:90,174-177`) |
| Mana Confluence | #40 (193) | #25 | #28 | #72 | tier 3 'utility' — below every tier-2 conditional land |
| Painlands | #42–#83 | #16–#26 | #18–#53 | #76–#105 | tier 2 but only 2 colours |
| Pathways | #109 | – | #42–#44 | #137–#144 | tier 2, 2 colours, no heavy-colour bonus |
| Triomes | #186 (143) | #127 | #128 | #346 | tier 4 = same tier as a gainland |
| Bond lands (Vault of Champions…) | #482–#593 | #219 | #221 | #604–#733 | "unless you have two or more opponents" read as always tapped |
| Reflecting Pool | #641 (73) | #503 | #501 | #837 | `mana-sources.ts:167` marks "any type that a land you control could produce" never-coloured |

The nonbasic quota (`land-intelligence.ts:623-629`: 24 for 3 colours, 30 for 4–5) exceeds the number of lands that genuinely clear the bar, so the junk is guaranteed a slot.

---

## Per-deck review

### 1. Atraxa, Praetors' Voice — commander, superfriends

**Mana base.** 38 real lands + Sol Ring, Arcane Signet, 2 Signets, 4 Talismans, Mind Stone, Thought Vessel, Everflowing Chalice, Lotus Petal, Dark Ritual, Elvish Mystic, Llanowar Elves, Zaxara, The Great Henge = 53 mana producers in 99 cards for average MV 3.3. Colour sources fine (G35/U31/B30/W29). Duals/fetches/shocks correct. Junk: Temple of the Dragon Queen, Grand Coliseum (enters tapped), Murmuring Bosk (tapped, no Treefolk), Three Tree City (no tribe), Starting Town, Brokers Hideout + Deceptive/Foreboding/Tranquil Landscape (four tapped basic-fetchers next to six real fetches). Missing: Mana Confluence, Reflecting Pool, Karn's Bastion, Yavimaya Coast, Llanowar Wastes.

**Nonland.** The superfriends read is right (11 walkers, proliferate package: Contagion Clasp/Engine, Thrummingbird, Viral Drake, Evolution Sage, Flux Channeler, Tekuthal, Inexorable Tide, Ezuri, Tezzeret's Gambit). Off-plan: Tyvar Kell (3 Elves), Lolth, Night of the Sweets' Revenge (1 Food maker), Marionette Apprentice, Pitiless Plunderer, Ashnod's Altar, Dark Ritual, Lotus Petal (an aristocrats/fast-mana splinter with nothing to feed), Idol of Oblivion (token-gated), Archdruid's Charm ({G}{G}{G} in 4 colours), Garruk's Uprising, Felidar Retreat, Zaxara. Removal thin and low quality (Cankerbloom, Origin of Metalbending, Feed the Swarm; no Swords/Path/Anguished Unmaking/Assassin's Trophy). Missing staples: Deepglow Skate, The Chain Veil, Doubling Season, Oath of Teferi, Hardened Scales/Winding Constrictor.

| Out | In | Why |
|---|---|---|
| Temple of the Dragon Queen | Mana Confluence | tapped-unless-Dragon → untapped 4-colour |
| Grand Coliseum | Reflecting Pool | enters tapped + pain → untapped, all four colours |
| Murmuring Bosk | Karn's Bastion | tapped tri-land → proliferate on a land |
| Three Tree City | Yavimaya Coast | colourless without a tribe → untapped dual in the two heaviest colours |
| Deceptive Landscape, Brokers Hideout (cut, 38 → 36 lands) | Deepglow Skate, Doubling Season | 15 non-land mana pieces already; the two best Atraxa payoffs are absent |
| Night of the Sweets' Revenge | The Chain Veil | no Food engine → walker engine |
| Tyvar Kell | Oath of Teferi | Elf walker → double activations |
| Marionette Apprentice | Swords to Plowshares | dead aristocrat → premium removal |
| Archdruid's Charm | Assassin's Trophy | GGG in 4 colours → castable removal |
| Idol of Oblivion | Anguished Unmaking | token-gated draw → removal (6 → 8) |
| Pitiless Plunderer, Ashnod's Altar, Dark Ritual | Hardened Scales, Winding Constrictor, Vraska's Contempt | sac-mana splinter with no fodder → counters engine + walker removal |

Stop proof: after the swaps every remaining card is a walker, a proliferate/counters piece, a rock, interaction or a wipe; Lolth and Kaito, Dancing Shadow are the weakest walkers but no unpicked walker in these colours is clearly better at bracket 3. No further swap improves the deck.

### 2. Edgar Markov — commander, vampire tribal

**Mana base.** 35 lands + 3 spell-side MDFCs at average MV 3.0 with 9 rocks: 34 + MDFCs is the expert count. Red is a 4-pip splash (Anger, Face-Breaker, Stromkirk Captain, Vampire Socialite) served by 18 sources including Plateau ($225), Sacred Foundry, Badlands, Blood Crypt, Arid Mesa, Bloodstained Mire, Dragonskull Summit — six premium slots for a splash. Junk: Temple of the Dragon Queen, Grand Coliseum, Starting Town. Missing: Path of Ancestry (EDHREC #14), Mana Confluence, Vault of Champions, Concealed Courtyard, Silent Clearing, Sulfurous Springs. Three Tree City and Cavern of Souls are correct here.

**Nonland.** 35 Vampires, the right lords, Skullclamp, Anointed Procession, Bitterblossom, Teferi's Protection — good. Off-plan: Walking Ballista (nothing puts counters), Whispersilk Cloak, Invasion of Fiora (6-mana battle), Venat (marginal), Anger (needs a Mountain in the yard with 4 red lands). Missing go-wide finishers: Shared Animosity, Coat of Arms, Impact Tremors, Herald's Horn; removal lacks Anguished Unmaking/Vindicate.

| Out | In | Why |
|---|---|---|
| Temple of the Dragon Queen | Path of Ancestry | tapped-unless-Dragon → tapped tri-land that scries every Vampire |
| Grand Coliseum | Mana Confluence | enters tapped → untapped rainbow |
| Sacred Foundry | Vault of Champions | 18 red sources for 4 pips → untapped W/B in multiplayer |
| Arid Mesa | Concealed Courtyard | same |
| Starting Town | Silent Clearing | conditional → untapped W/B with draw |
| Whispersilk Cloak | Shared Animosity | voltron piece in a go-wide deck → the finisher |
| Walking Ballista | Coat of Arms | no counters engine → tribal anthem |
| Invasion of Fiora | Impact Tremors | 6-mana battle → damage on every eminence token |
| Venat | Herald's Horn | marginal draw → cost reduction + tribal draw |
| Anger | Anguished Unmaking | dead haste → removal (6 → 7) |
| 2 Swamp (cut, 38 → 36 land-capable) | Cathars' Crusade, Kindred Dominance | 9 rocks + eminence tokens; +1 anthem engine, +1 one-sided wipe |

Stop proof: after the swaps every non-tribal card is a rock, removal, wipe, protection or a token/anthem engine; the remaining red cards justify the 10-source splash that remains. No further swap improves the deck.

### 3. Niv-Mizzet Reborn — commander, maxDeckPrice 150, bracket 2

**Mana base.** 38 lands, 30 of them basics in five colours: 8 Forest, 7 Plains, 5 Island, 5 Mountain, 5 Swamp, six shocks, Command Tower, Exotic Orchard, Temple of the Dragon Queen. The budget loop swapped every fetch, OG dual, City of Brass, Three Tree City, Starting Town, Steam Vents, Sacred Foundry, Breeding Pool, Watery Grave and Blood Crypt for a basic (17 land rows in `replacedForBudget`), never for the $0.60–$1.50 painlands/checklands/Thriving lands that keep two-colour spells castable. Per-colour counts look fine (22–26) but only 9 lands make two colours, so a T2 gold two-drop needs two specific basics.

**Nonland.** Niv wants exactly-two-colour cards; the picker did that well (Assassin's Trophy, Baleful Strix, Dovin's Veto, Growth Spiral, Terminate, Putrefy, Prismari Command, Rhythm of the Wild…). Budget replacements are bulk: Roilmage's Trick (edhrec 29,439), Ticket Turbotubes (20,279), Centaur Nurturer (22,258), Lifespring Druid (16,455), Professional Wrestler (20,693). Off-plan: Fierce Empath (0 MV≥6 creatures), Korvold and Hearthhull (three-colour — never revealed by Niv), Loran and Toski (mono-coloured, $7–8 each), Lunar Convocation, Sorcerer Class, Idol of Oblivion. Bracket 2 verified.

| Out | In | Why |
|---|---|---|
| Loran of the Third Path ($7.33), Toski ($8.06) | Underground River, Sulfurous Springs, Shivan Reef, Caves of Koilos, Llanowar Wastes, Yavimaya Coast, Brushland, Adarkar Wastes, Karplusan Forest, Battlefield Forge (≈$9 total) | two mono-coloured non-hits → ten untapped duals (30 basics → 22, ten guild pairs covered) |
| 8 basics (cut) | (the ten painlands take 10 slots; 38 → 36 lands frees 2) | flat 38 → 36 with 15 rocks |
| Roilmage's Trick | Expressive Iteration ($1) | bulk → premium two-colour draw |
| Ticket Turbotubes | Drown in the Loch ($1) | bulk rock → two-colour interaction |
| Centaur Nurturer | Mortify ($0.50) | bulk dork → two-colour removal |
| Professional Wrestler | Vanishing Verse ($1) | bulk → two-colour removal |
| Fierce Empath | Fire // Ice ($1.50) | tutor with no target → two-colour utility |
| Korvold, Fae-Cursed King | Kaya's Guile ($1) | three-colour non-hit → two-colour modal |
| Hearthhull, the Worldseed | Deathsprout ($0.30) | three-colour non-hit → two-colour removal + ramp |
| Temple of the Dragon Queen | Thriving Isle ($0.30) | tapped-unless-Dragon → tapped dual with a chosen colour |

Stop proof: after the swaps every nonland card except rocks and wipes is exactly two colours; Uro, Deathrite Shaman and Baleful Strix stay. The remaining ~$5 has no better use than checklands replacing basics 1:1. No further swap improves the deck.

### 4. Krenko, Mob Boss — brawl (Arena, 100 cards), mono-red goblins

**Mana base.** 35 lands + 3 spell-side MDFCs at average MV 2.84 with Arcane Signet and Skirk Prospector: 33 + MDFCs is the expert count. Four fetchlands (Arid Mesa, Bloodstained Mire, Scalding Tarn, Wooded Foothills, $102) in a mono-colour 100-card deck are a worse Mountain (1 life, 0.7 % thinning, Castle Embereth/Arena of Glory stay off until cracked). Castle Embereth, Arena of Glory, Three Tree City are right; Den of the Bugbear, Sokenzan and Mutavault (Brawl-legal) are absent.

**Nonland.** The goblin core is right (Chieftain, Warchief, Tin Street Kingpin, Matron, Ringleader, Muxus, Siege-Gang, Legion Warboss, Pashalik Mons, Snoop, Hobgoblin Bandit Lord, Rundvelt Hordemaster, Battle Cry Goblin, Purphoros, Impact Tremors, Goblin Bombardment, Shared Animosity, Vanquisher's Banner). Dead: Dragon's Hoard (0 Dragons), Well of Lost Dreams (0 lifegain), Ashling (no instants worth copying), Zada (0 targeted pump), Collector's Vault, Roiling Vortex, Smash to Dust, Goblin Motivator. "ramp 10" is Reckless Lackey/Scuzzback/Crime Novelist/Howlsquad/Ashling/Dragon's Hoard/Collector's Vault — Treasure reminder text, not ramp.

| Out | In | Why |
|---|---|---|
| Dragon's Hoard | Icon of Ancestry | Dragon payoff in a goblin deck → tribal anthem + impulse |
| Well of Lost Dreams | Torbran, Thane of Red Fell | lifegain payoff with no lifegain → +2 damage per goblin |
| Ashling, Flame Dancer | Embercleave | spells payoff in a creature deck → Krenko finisher |
| Zada, Hedron Grinder | Rabble Rousing | no targeted spells → go-wide token engine |
| Collector's Vault | Goblin Gathering | rock that loots → goblins |
| Roiling Vortex | Chandra, Torch of Defiance | symmetrical pinger → ramp/removal/draw |
| Arid Mesa, Bloodstained Mire, Scalding Tarn, Wooded Foothills | Den of the Bugbear, Sokenzan, Crucible of Defiance, Mutavault, Mountain | fetches in mono-red → manlands + a basic |
| Mountain, Mountain (cut, 38 → 36 land-capable) | Wily Goblin, Legion Loyalist | 33 real lands + 3 MDFC is enough at MV 2.8 |

Stop proof: after the swaps every nonland card is a goblin, a goblin payoff, a rock or interaction; Goblin Motivator and Smash to Dust are marginal but no unpicked Brawl-legal goblin card outranks them. No further swap improves the deck.

### 5. Kess, Dissident Mage — commander, read as "reanimator"

**Mana base.** 37 lands + 1 MDFC at average MV 2.67 with 12 rocks/rituals and ten cantrips: 33–34 is the expert count. Duals correct. Junk: Temple of the Dragon Queen, Grand Coliseum, Three Tree City (no tribe), Starting Town, Maestros Theater and Seething Landscape (tapped basic-fetchers next to three real fetches). Missing: Mana Confluence, Riverglide/Clearwater Pathway, Sulfurous Springs, Xander's Lounge, Otawara/Takenuma/Sokenzan.

**Nonland.** `analyzeCommander` returned `graveyard` only → archetype reanimator → synergy minimum `graveyard: 8` filled with Entomb, Reanimate, Stitcher's Supplier, Bloodghast, Stinkweed Imp, Altar of Dementia, Mesmeric Orb, Syr Konrad — eight cards with zero reanimation targets (Niv-Mizzet, Parun is the only creature above MV 4). The real Kess plan (cast cheap instants/sorceries twice) is present by accident through spellslinger scoring (Brainstorm, Ponder, Preordain, Consider, Frantic Search, Mystical/Demonic Tutor, Cyclonic Rift, Archmage Emeritus, Storm-Kiln Artist, Mizzix's Mastery) but under-supported: no Past in Flames, Underworld Breach, Baral, Talrand, Thousand-Year Storm, Deflecting Swat; "wincons" are Vohar, Ashling, The Indomitable, Thopter Spy Network, Inventive Iteration — none wins. Vanquisher's Banner and Chronicle of Victory in a deck with 11 creatures of 9 types are dead; Idol of Oblivion has one token maker. Bracket 4 (5 game changers) with no line to close.

| Out | In | Why |
|---|---|---|
| Entomb | Past in Flames | reanimator tutor with no target → second cast of every spell |
| Reanimate | Torment of Hailfire | no targets → a wincon for the ritual/rock mana |
| Stitcher's Supplier | Baral, Chief of Compliance | self-mill body → cost reduction + loot |
| Bloodghast | Exsanguinate | recursive 2/1 in a spells deck → wincon |
| Stinkweed Imp | Underworld Breach | dredge with no payoff → the Kess engine |
| Mesmeric Orb | Talrand, Sky Summoner | symmetrical mill → spells-matter threat |
| Altar of Dementia | Thassa's Oracle | sac outlet with 11 creatures → compact win with Demonic Consultation |
| Vanquisher's Banner | Demonic Consultation | no tribe → Oracle line |
| Chronicle of Victory | Deflecting Swat | no tribe → free protection |
| Thopter Spy Network, Inventive Iteration, The Indomitable | Thousand-Year Storm, Mana Geyser, Sea Gate Restoration | non-wincons → storm payoff, burst, land/draw |
| Temple of the Dragon Queen, Grand Coliseum, Three Tree City, Maestros Theater | Mana Confluence, Xander's Lounge, Riverglide Pathway, Sulfurous Springs | conditional/tapped junk → untapped fixing |
| Starting Town, Seething Landscape, 1 Island, 1 Swamp (cut, 38 → 34) | Otawara, Soaring City, Takenuma, Abandoned Mire, Rielle the Everwise, Jeska's Will | land count for MV 2.67 + 12 rocks; channel lands count as spells |

Stop proof: after the swaps every nonland card is an instant/sorcery, a spells payoff, a rock/ritual, interaction, or one of two compact wincon lines; Syr Konrad and Vohar remain marginal but no unpicked Grixis spells card clearly beats them. No further swap improves the deck.

### 6. Ygra, Eater of All — brawl (Arena), read as "aggro"

**Mana base.** 35 lands + 5 spell-side MDFCs = 40 land-capable at average MV 2.37 with Arcane Signet, Mind Stone, Gilded Goose, Fanatic of Rhonas, Thornvault Forager, Dark Ritual and Cultivate: 33 + 3 MDFCs is the expert count. Duals correct. Junk: Temple of the Dragon Queen, Three Tree City (no tribe), Starting Town, Midgar (tapped). Missing: Restless Cottage, Underground Mortuary, Takenuma, Boseiju, Castle Locthwain.

**Nonland.** `analyzeCommander` returned null (no pattern for "Whenever a Food is put into a graveyard from the battlefield" or for Food), so the strategy fell to the EDHREC theme label "aggro" — but the picks are the right Food/aristocrats shell (Gilded Goose, Witch's Oven, Cauldron Familiar, Academy Manufactor, Peregrin Took, Savvy Hunter, Experimental Confectioner, Greta, Scavenger's Talent, Trail of Crumbs, Warren Soultrader, Priest of Forgotten Gods, Blood Artist, Mirkwood Bats, Chatterfang, Camellia). Dead: Tyvar Kell (0 Elves), Gorbag (1 Goblin/Orc), Tribute to Horobi (gives opponents Rats), Party Dude, Skullport Merchant, Collector's Vault; Dark Ritual is a one-shot in a value deck. Missing: Feasting Troll King, The Goose Mother, Tough Cookie, Wicked Wolf, Bake into a Pie, Old Flitterfang.

| Out | In | Why |
|---|---|---|
| Tyvar Kell | Feasting Troll King | Elf walker → recursive Food finisher |
| Gorbag of Minas Morgul | Tough Cookie | Orc payoff → Food engine |
| Tribute to Horobi | The Goose Mother | feeds opponents → Food + draw |
| Party Dude | Wicked Wolf | symmetrical Food → Food-fed removal body |
| Skullport Merchant | Bake into a Pie | filler → removal that makes Food (5 → 6) |
| Collector's Vault | Old Flitterfang | rock that loots → Food on every death |
| Dark Ritual | Village Rites | burst in a value deck → sac draw |
| Temple of the Dragon Queen, Three Tree City, Starting Town | Restless Cottage, Takenuma, Abandoned Mire, Boseiju, Who Endures | junk → manland + two channel lands |
| Midgar, 1 Forest, 1 Swamp (cut, 40 → 37 land-capable) | Castle Locthwain (land), Underground Mortuary (land), Rotten Reunion | 33 real lands + MDFCs with 13 mana pieces at MV 2.37 |

Stop proof: after the swaps every nonland card makes, sacrifices or pays off Food/tokens, or is a rock/interaction. No further swap improves the deck.

### 7. Tymna the Weaver + Thrasios, Triton Hero — commander (partner), read as "aggro"

**Mana base.** 39 real lands next to Chrome Mox, Mox Diamond, Mox Amber, Lion's Eye Diamond, Lotus Petal, Mana Vault, Sol Ring, Birds of Paradise, Dark Ritual and eight signets/talismans, at average MV 1.90 — a cEDH shell (the cEDH staples lookup fired) with a precon land count; expert lists run 27–29. Junk: Temple of the Dragon Queen, Grand Coliseum, Murmuring Bosk, Three Tree City, Starting Town, Brokers Hideout, Obscura Storefront, Tranquil/Contaminated/Foreboding Landscape (ten slots). Missing: Mana Confluence, Reflecting Pool, Ancient Tomb, Otawara, Boseiju. Tainted Pact is in the deck next to 4 Island / 2 Plains / 2 Swamp — the Oracle line whiffs on the second Island.

**Nonland.** Both partner profiles are null (Tymna's "deal combat damage" misses the `deals combat damage` regex; Thrasios has no matching category), so the strategy fell to the EDHREC theme "aggro" and the picker added Sram, Senior Edificer (0 Auras/Equipment/Vehicles), Voice of Victory, Tataru Taru, Garruk's Uprising, Season of Gathering (6-mana sorcery), The Great Henge, Idol of Oblivion. Every data signal (EDHREC recs, commander_card_stats, CF, `edhrec_avg_decks` lands) was queried for Tymna alone. Interaction suite is right. Wincons: Thassa's Oracle + Tainted Pact only — no Demonic Consultation, Ad Nauseam, Necropotence, Underworld Breach/Brain Freeze.

| Out | In | Why |
|---|---|---|
| Temple of the Dragon Queen, Grand Coliseum, Murmuring Bosk, Three Tree City, Starting Town | Mana Confluence, Reflecting Pool, Ancient Tomb, Otawara, Soaring City, Boseiju, Who Endures | conditional/tapped junk → untapped rainbow, fast mana, channel lands |
| Brokers Hideout, Obscura Storefront, Tranquil Landscape, Contaminated Landscape, Foreboding Landscape (cut) | Demonic Consultation, Ad Nauseam, Necropotence, Underworld Breach, Brain Freeze | 39 → 34 lands; the missing cEDH win lines |
| 3 Island, 1 Plains, 1 Swamp (cut, 34 → 29 lands; every basic singleton for Tainted Pact) | Drannith Magistrate, Praetor's Grasp, Opposition Agent, Mnemonic Betrayal, Culling the Weak | 29 lands + 16 mana pieces at MV 1.9 |
| Season of Gathering | Toxic Deluge | 6-mana sorcery → the wipe this deck can cast |
| The Great Henge | Sylvan Library | power-based draw with no big creature → draw |
| Garruk's Uprising | Windfall | power-4 draw → refill |
| Sram, Senior Edificer | Notion Thief | 0 Auras/Equipment/Vehicles → draw denial |
| Idol of Oblivion | Snow-Covered Island (land) | token-gated draw → a 30th unique land name |

Stop proof: after the swaps the deck is 30 lands, 16 mana pieces, 20 interaction, tutors, draw engines and three win lines; Voice of Victory, Tataru Taru and Mockingbird are the weakest remaining but on plan for Tymna. No further swap improves the deck.

---

## Builder defects (ranked)

Deck Score imports: `classifyCard/isBoardWipe/isDrawEngine/ownAbilities` (`deck-score-features.ts:15`), `countColorSources` without ctx (`deck-score-mana.ts:46`), `analyzeCommander/mergeProfiles` (`deck-score.ts:11`), `getScaledCurve` (`deck-score-mana.ts:7`). Anything in `deck-builder-ai.ts`, `land-intelligence.ts`, `deck-auditor.ts` is builder-only. Fixes to `classifyCard`/`analyzeCommander` must sit behind the existing opt-in flags (`ClassifyOpts` at `card-classifier.ts:322-327`; `analyzeCommander` opts `{ superfriends, tribalPayoff }` as passed at `deck-builder-ai.ts:873`) to keep Deck Score byte-identical.

| # | Sev | Defect | Decks | Root cause (file:line) | Fix | Off default path? |
|---|---|---|---|---|---|---|
| D1 | HIGH | Flat 38-land target; curve, rock/dork count and fast mana never move it (Tymna 39 lands at MV 1.9 with 16 mana pieces; Ygra 40 land-capable at MV 2.37; Krenko mono-R 38) | all 7 | `constants.ts:85-91` (`commander: 38, brawl: 38`) → `deck-builder-ai.ts:665`; archetype land bands (`deck-templates.ts:171-660`, `getRecommendedLands` :135) only consulted under the "consistent mana" hint (`deck-builder-ai.ts:1719-1732`); `:2336` subtracts spell-side MDFCs only | After Step 4: `target = clamp(getRecommendedLands(strategy, colours) − floor(max(0, realRamp − 8) / 3) − (avgMV < 2.5 ? 2 : avgMV < 3 ? 1 : 0), 30, 38)`; refill freed slots from the pool; `realRamp` from D5's honest read | yes (builder-only) |
| D2 | HIGH | Land ranking: conditional-untapped and literally-tapped lands get the flat +40 untapped bonus and out-rank Mana Confluence, painlands, pathways, triomes, bond lands; Three Tree City / Reflecting Pool mis-read | 6 multicolour decks | `land-intelligence.ts:370-374` trusts `enters_untapped === 1`, never reads `enters_untapped_condition` or the oracle "enters tapped" when a classification exists; `classify_lands.py:90,174-177` (pain branch keeps the default untapped: Grand Coliseum, Murmuring Bosk) and `:199-202` (reveal-type filter lands untapped); `land-intelligence.ts:322` Three Tree City strip is mono-only; `mana-sources.ts:167` marks "any type that a land you control could produce" never-coloured (Reflecting Pool → 73 pts); bond lands fall to the generic tapped branch `classify_lands.py:213` tier 4; `land-intelligence.ts:629` quota of 30 nonbasics for 4–5 colours guarantees the junk a slot | In `scoreLandsForDeck`: `entersUntapped = classified && !(unconditional "this land enters tapped." in oracle) && satisfiable(condition)` (reveal-type → only with that tribe; first-three-turns → 0.5; check-type → a named type is a deck colour); run the `:322` strip whenever `!tribalTypes?.length`; `:167` → match only "a gate you control could produce"; commander-family formats treat "two or more opponents" as untapped tier 2; tier-4 lands producing ≥3 deck colours in ≥3-colour decks → tier 3; cap nonbasics at the count that clears `tierBase ≥ 70 && entersUntapped` | yes — all in `land-intelligence.ts`; the `mana-sources.ts:167` change is ctx-gated and Deck Score calls `countColorSources` without ctx |
| D3 | HIGH | Archetype misread → wrong plan and quotas: Kess = reanimator (8-card package, 0 targets), Ygra = aggro (null profile), Tymna+Thrasios = aggro (both null) | Kess, Ygra, Tymna | `commander-synergy.ts:185-188` alt_zone_cast has no "cast … from your graveyard" form, so Kess matches only `graveyard` (`:244`) and `inferArchetype :568` returns reanimator before the `:573` alt_zone_cast check; `:205-209` creature_dies misses "Whenever a Food is put into a graveyard from the battlefield"; `:216` `whenever .+ deals combat damage` misses Tymna's plural "deal combat damage"; `deck-builder-ai.ts:1110` falls back to the EDHREC theme label (`'aggro'`) for any null profile | Add the three patterns behind a new opt (`opts.builderPatterns`), reorder `:568`/`:573`; null profile → derive the strategy from `detectDeckThemes(edhrecResolvedCards)` composition and never 'aggro' for a partner pair / noncreature commander without an attack keyword | yes if opts-gated (Deck Score passes no opts) |
| D4 | HIGH | Partner blindness: every data signal reads the primary commander only | Tymna+Thrasios (any partner/background pair) | `deck-builder-ai.ts:780` `getEdhrecRecommendations(commanderName)`, `:831` `detectTribalTheme(db, commanderName)`, `:1153` `getCFRecommendations(…, commanderName)`, `:1180` `getCommanderCardStats(commanderName, 300)`, `land-intelligence.ts:193-199` `edhrec_avg_decks WHERE commander_name = ?` | Iterate `[commanderName, partnerName]` and union; try the EDHREC pair slug first | yes |
| D5 | HIGH | 'ramp' read from Treasure reminder text — every Treasure maker is ramp, including An Offer You Can't Refuse (opponent's Treasures); Kess "ramp 16/12", Krenko 10, Ygra 13 with 3–8 real sources; also why D1 cannot use the ramp count today | Kess, Tymna, Krenko, Ygra, Niv | `card-classifier.ts:314-318` `isRamp` runs `RAMP_PATTERNS` (`:172-181`, `add one mana of any`) on the raw oracle text instead of `ownAbilities()` (`:301`) | `matchesPatterns(ownAbilities(text), RAMP_PATTERNS)` behind `ClassifyOpts.builder`; exclude "its controller creates" | yes if opts-gated (`deck-score-features.ts:15` passes none) |
| D6 | MED | Conditional payoffs with no enabler survive the quotas and the dead-card pass: Idol of Oblivion ×4, Well of Lost Dreams, Dragon's Hoard, Vanquisher's Banner, Chronicle of Victory, Sram, Garruk's Uprising, Night of the Sweets' Revenge, Tyvar Kell ×2, Fierce Empath (narrow-tutor rule misses "mana value 6 or greater"), Ashling/Zada | all 7 | `deck-builder-ai.ts:3070-3082` `deadReason` knows only narrow tutors, {C} pips, mono fixers; `card-classifier.ts:184-198` DRAW_PATTERNS ignore the trigger clause | Extend `deadReason` with an enabler census (lifegain / Dragon / chosen type / token / power≥4 / Aura-Equipment-Vehicle / targeted-spell triggers → count in main deck via the `countTargets` helpers; dead below 4, tribe below 8); parse "mana value N or greater" in `narrowTutorTarget` | yes |
| D7 | MED | Budget swaps reach for bulk: 17 land swaps all to basics; Roilmage's Trick (edhrec 29,439), Ticket Turbotubes, Centaur Nurturer, Lifespring Druid, Professional Wrestler | Niv (any `maxDeckPrice` build) | `deck-builder-ai.ts:2926-2938` land branch only knows basics; `:2949-2953` `fitting` else `cheapest` from the build's own drained pool, no quality floor | Lands → best unpicked land from `scoreLandsForDeck({ maxCardPrice: targetPrice − 0.01 })` producing the deficit colour; nonland → require `edhrec_rank ≤ 5000` (or score ≥ the deck's 25th percentile), else basic/stuck | yes |
| D8 | LOW | Singleton-library combo next to duplicate basics (Tainted Pact + 4 Island) | Tymna | `land-intelligence.ts:661-699` basic distribution and `deck-builder-ai.ts:2556` top-up are combo-unaware | If Tainted Pact / Demonic Consultation picked → cap each basic name at 1, fill with snow basics/nonbasics | yes |
| D9 | LOW | Mono-colour untapped fetches kept as "real thinning" (Krenko: 4 fetches, $102, 1 life each, Castle/Arena checks off) | Krenko (any mono build) | `land-intelligence.ts:272-279` | Exclude typed fetches in mono unless landfall/Titania payoffs present | yes |

Known and not re-reported: Step 4b ramp over-protection, Ways in superfriends builds, optimizer land-row mismatch.
