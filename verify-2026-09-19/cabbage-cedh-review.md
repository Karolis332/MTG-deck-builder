# The Cabbage Merchant — "cEDH" list review (2026-09-19)

**Verdict: not a cEDH deck, and cannot become one with this commander.** Mid-power Food midrange with a colourless-artifact subtheme bolted on. EDHPowerLevel port **7.22 / 10, bracket 3**; the operator's casual paper Cabbage deck scores **7.05**. "Voltron" is indefensible for a {2}{G} 2/2.

## 1. Validation — `deck-gate.ts --format commander --owner 1 --source paper`

```
totals : 100 cards | 35 lands (36.1 eff.) | 64 nonland | avg MV 2.72
curve  : 1:13 2:21 3:16 4:8 5:2 6:2 7:2                   VERDICT: FAIL
PASS size, singleton, legality, rules, identity (all cards inside G)
FAIL ownership  39 cards not in the paper collection (snapshot 1 day old)
WARN arenaNames 4 need front-face export (Sidequest, Disciple of Freyalise,
                Bridgeworks Battle, Tangled Florahedron)
PASS lands 35 (+3 MDFC backs); Karsten wants 35 +/-2 | PASS wincons 7 closers
PASS plan 49/64 interact (77%); only 43/64 (67%) satisfy "noncreature spell"
```

Colour identity is clean: all 20 colourless nonland cards and 5 colourless lands are legal mono-G. Ban check from the DB `legalities` column: Mana Crypt, Jeweled Lotus, Dockside and Nadu all `banned`, none present. Deck price, 28 Forest excluded: **$428**.

## 2. What the list actually is

| Role | n | Notes |
|---|---|---|
| Mana acceleration | 13 | 2 dorks, 7 rocks, 3 land-ramp, The Great Henge. Turn-1 accelerants: **2** |
| Food makers / payoffs | 12 | Took, Night of the Sweets' Revenge, Provisioner, Unlucky Cabbage Merchant, Bumi's Feast Lecture, Heaped Harvest, Bosco, Courier, Lembas, Doubling Season, Many Partings, commander |
| Draw / real tutors | 9 / 4 | only Worldly Tutor is efficient; the rest are sorcery-speed, to hand |
| Removal / wipes | 8 / 1 | Perilous Vault costs 9 total mana and exiles your own engine |
| Protection / counterspells | 5 / **0** | Heroic Intervention, Veil of Summer, Tamiyo's Safekeeping, Greaves, Boots |
| Go-wide payoffs | 5 | Craterhoof, Beastmaster Ascension, Garruk's Uprising, Chronicle of Victory, Oozewagg |
| Colourless-artifact subtheme | 5 | Glaring Fleshraker, Kozilek's Command, Traxos, Tezzeret, Chrome Dome |
| Equipment + auras | **3** | against the voltron template's own `equipment_or_auras: 10` minimum |

**Structural flaw:** the engine makes Food **artifacts**; every go-wide payoff counts **creatures**. 23 creature *cards* (one an enchantment front, one an MDFC land) means 5–8 real bodies, so Craterhoof is +6/+6, not a kill. **Archetype: Food-value midrange with an Eldrazi-Spawn side-quest.**

## 3. cEDH gap analysis

| cEDH demand | This list | |
|---|---|---|
| 8–12 fast-mana pieces | **2** (Llanowar Elves, Elvish Mystic). No Sol Ring, Mox, Lotus Petal, Spirit Guide | ❌ |
| Compact 2-card win, turns 3–5 | none; fastest is Bumi's Feast Lecture earthbending ~turn 6, one opponent | ❌ |
| 8–12 tutors | 4, one of them efficient | ❌ |
| Free / 1-mana interaction | 0 counterspells; Veil of Summer is blue-black only; Vexing Bauble is the lone free-spell answer | ❌ |
| Stax or a proactive turn-3 plan | Vexing Bauble alone | ❌ |
| Avg MV ~2.0, <= 30 lands | avg MV **2.72**, **35 lands** | ❌ |
| No do-nothing value cards | Harmonize, Oracle's Restoration, Chronicle of Victory, Dungeon Map, Starting Column | ❌ |
| Game Changers | **1** (Worldly Tutor, per the DB `game_changer` column); bracket-5 decks run 7+ | ❌ |

**Ceiling.** Mono-green's cEDH-adjacent shells are fringe: Selvala, Heart of the Wilds (Selvala plus Umbral Mantle or Staff of Domination into Walking Ballista) and Yisan / Azusa land-turbo. Cabbage Merchant is worse than all of them — the Food trigger is **reactive**, firing only on opponents' noncreature spells, and tapping two Foods for one mana makes a 3-mana 2/2 into a Llanowar Elves. Realistic ceiling: **bracket 4 high-power casual**.

## 4. The 15 most damaging inclusions

| Card | Why it is bad **here** |
|---|---|
| Radioactive Spider | Fateful Bite searches for a **Spider Hero**; the deck has zero of the six that exist |
| Chrome Dome | Pumps "other artifact creatures" — there are 2; the copy ability costs {5} |
| Tezzeret, Cruel Captain | 3-mana walker whose −3 fetches a 1-MV artifact; the deck has none |
| Chronicle of Victory | 6 mana naming one creature type; the largest type here is 3 Citizens |
| Glaring Fleshraker | Eldrazi-Spawn payoff from an artifact deck; 0/1 Spawn do nothing for Food |
| Kozilek's Command | {X}{C}{C} on 4 colourless sources; its modes are scry and Spawn filler |
| Traxos | Stays tapped; only ~20 historic spells to untap it |
| Perilous Vault | 9 total mana to exile **your own** Food engine |
| Dungeon Map, Starting Column | 3 mana each for one mana; venture is a blank, Max speed is 4 turns away |
| Craterhoof Behemoth | 8 mana, counts creatures; Foods are artifacts |
| Beastmaster Ascension | Needs 7 attack triggers from ~5 attackers |
| Harmonize, Oracle's Restoration | 4-mana sorcery draw-3, and +1/+1 with a cantrip, in a Food-draw deck |
| Courier of Comestibles | ETB searches for a **Food card**; the deck has 2 (Heaped Harvest, Lembas) |
| Solemn Simulacrum | 4 mana for one tapped basic; corpus lift **−1.20** under this commander |
| Mirage Mirror, Moonsilver Key, Hedron Archive, Oozewagg | Copy target-less; sacrifices for an unwanted rock; a 4-mana rock at 35 lands; trample for "modified" when 3 cards modify |

**Five it got right:** Peregrin Took (96% corpus inclusion, lift +3.10); Night of the Sweets' Revenge (66%, +3.51), making every Food a Llanowar Elves; Doubling Season, the only true token multiplier present; Sylvan Library; and Vexing Bauble — correctly cEDH-shaped, taxing Force of Will, Pacts and 0-mana Moxen while mono-green does not care.

## 5A. Plan A — "as competitive as this commander gets" (no budget cap)

30 lands, avg MV ~2.0. Ownership from `decks/paper/collection.txt`; every add verified mono-G in the DB (Ignoble Hierarch and Vexing Shusher rejected as off-identity).

| Cut | Add | Owned | Reason |
|---|---|---|---|
| Chronicle of Victory | Sol Ring | ✅ | 83.7% of the Cabbage corpus runs it; the best rock in the format was omitted |
| Perilous Vault | Gaea's Cradle | ❌ | A Food deck holds bodies; best land in green ramp (Game Changer) |
| Hedron Archive | Ancient Tomb | ❌ | 2 colourless on turn 1 beats a 4-mana rock (Game Changer) |
| Dungeon Map, Starting Column | Mana Vault, Grim Monolith | ❌ | Real fast mana replacing two 3-mana do-nothings |
| Mirage Mirror, Moonsilver Key | Chrome Mox, Lotus Petal | ❌ | Turn-0 mana; 40+ green cards to imprint |
| Chrome Dome | Elvish Spirit Guide | ✅ | Free green on turn 1; 34.9% corpus inclusion |
| Traxos, Glaring Fleshraker | Delighted Halfling, Bloom Tender | ❌ | Dorks that accelerate; Halfling also makes the commander uncounterable |
| Kozilek's Command, Tezzeret, Radioactive Spider | Arbor Elf, Utopia Sprawl, Wild Growth | ❌ | Turn-1 two-mana acceleration, three ways |
| Solemn Simulacrum | Selvala, Heart of the Wilds | ✅ | The mono-green engine and half of the deck's only real combo |
| Courier, Oozewagg | Umbral Mantle, Staff of Domination | ❌ | Either plus Selvala is infinite green mana; Staff also draws |
| Craterhoof Behemoth | Walking Ballista | ✅ | Infinite-mana kill that ignores blockers; fair removal otherwise |
| Beastmaster Ascension | Finale of Devastation | ❌ | Tutor **and** the backup kill at large X |
| Harmonize, Oracle's Restoration | Green Sun's Zenith, Sylvan Tutor | ❌ | Tutors; Zenith finds Selvala or Dryad Arbor straight to the battlefield |
| Open the Gates, Bushwhack | Once Upon a Time, Crop Rotation | ❌ | Free on the first spell; 1 mana to find Gaea's Cradle (Game Changer) |
| Many Partings, You Find a Cursed Idol | Force of Vigor, Endurance | ✅ | The only two free answers green owns |
| Origin of Metalbending, Kenrith's Transformation | Autumn's Veil, Allosaurus Shepherd | 1 of 2 | Protects the engine from the only colours that fight it |
| Doubling Season, Bosco | Carpet of Flowers, Birthing Pod | 1 of 2 | 5-mana do-nothings out; turn-1 mana vs blue and a repeatable tutor in |
| 5 Forest | Dryad Arbor, Yavimaya, Boseiju, Wooded Foothills, Windswept Heath | 2 of 5 | Fetches shuffle Sylvan Library and find Dryad Arbor off Green Sun's Zenith |

Result: 30 lands, avg MV ~2.0, 11 fast-mana pieces, 8 tutors, one 2-card infinite, zero counterspells. **Still bracket 4.**

## 5B. Plan B — what the request actually asked for

Food synergy, go wide, consistent manabase. 100 cards, **33 lands** (31 Forest + Gingerbread Cabin + Ash Barrens; Tangled Florahedron and 2 MDFC backs make ~35 effective), avg MV **2.6**, curve 1:12 2:18 3:16 4:10 5:5 6:2. Corpus inclusion bracketed.

| Cut | Add | Owned | Reason |
|---|---|---|---|
| Chrome Dome | Academy Manufactor (93.8%) | ✅ | Every Food becomes Food + Clue + Treasure — the biggest multiplier in green |
| Tezzeret, Cruel Captain | Gilded Goose (88.3%) | ✅ | Turn-1 Food **and** turn-1 mana |
| Glaring Fleshraker | Jaheira, Friend of the Forest (83.3%) | ✅ | Tokens gain "{T}: Add {G}"; the Food pile becomes a mana engine |
| Kozilek's Command | Second Harvest (68.4%) | ✅ | Instant-speed copy of every token; triples through Manufactor |
| Traxos | Sarinth Steelseeker (68.4%) | ✅ | Artifact-entry card selection; every Food digs |
| Chronicle of Victory | Trail of Crumbs (54.1%) | ❌ | Sacrifice a Food, dig 2 — the grind engine |
| Perilous Vault | Displaced Dinosaurs (51.9%) | ✅ | **The go-wide bridge**: every artifact token enters as a 7/7 |
| Hedron Archive | Idol of Oblivion (49.2%) | ✅ | Draws on every token-creation event |
| Dungeon Map | Feasting Troll King (45.5%) | ❌ | Recursive fatty that eats and remakes Foods |
| Starting Column | Syr Ginger, the Meal Ender (42.2%) | ✅ | Grows on every Food that dies |
| Mirage Mirror | Tough Cookie (35.1%) | ✅ | {2}: animate a Food into a 4/4 — the second go-wide bridge |
| Moonsilver Key | Teething Wurmlet (39.0%) | ✅ | 1-drop that grows on every artifact and gains life |
| Radioactive Spider, Courier | Quina, Qu Gourmet (45.1%), Feasting Hobbit (47.2%) | ❌ | Food-fuelled card flow and a cheap Food maker with a real body |
| Temperamental Oozewagg | Giant Opportunity (29.3%) | ✅ | Makes a 7/7 Giant off Foods; Garruk's Uprising draws off it |
| Craterhoof Behemoth | Halsin, Emerald Archdruid | ✅ | Animates a token per {1}: Foods to damage without counting creatures |
| Harmonize, Oracle's Restoration | Well of Lost Dreams, Trudge Garden | ✅ | Each Food sacrifice is 3 life: draw X, then 4/4 tramplers that re-trigger Took |
| Solemn Simulacrum | Archdruid's Charm (48.3%) | ✅ | Tutor, removal or ramp at instant speed |
| Open the Gates, Bushwhack | Seedborn Muse, Chord of Calling (40.5%) | ✅ | Untaps the Food pile each opponent's turn; Dinosaur and animated tokens convoke |
| You Find a Cursed Idol, Kenrith's Transformation | Fog (26.7%), Arachnogenesis | ✅ | A Food deck has to reach turn 8; Arachnogenesis is the pod-scale blowout |
| Doubling Season, Bosco | Transmutation Font (52.5%), Wicked Wolf | ✅ | Repeatable Food-to-value engine; a free sacrifice outlet that is also removal |
| 2 Forest | Gingerbread Cabin (46.2%), Ash Barrens | ✅ | A land that is also a Food; fixing without entering tapped |

Everything else stays, plus Sol Ring. This converges on the operator's existing `decks/paper/proposals/cabbage-merchant-upgrade.md` (33 lands, avg MV 2.88, 0 validator errors).

## 6. What this says about the builder

- **The label is a template, not a read of the commander.** "Voltron" is one of 11 hard-coded archetypes at `src/lib/deck-templates.ts:372`; nothing in the commander's text supports it.
- **The colourless padding is that template's quota.** Voltron wants `lands [34,36]`, `rocks [5,8]`, `dorks [1,3]`, `landRamp [2,3]`, `totalMax 13`. The list delivers 35 / 7 / 3 / 3 / 13 — every number inside the band.
- **`powerLevel: 'cedh'` is accepted, then silently does nothing.** `getCedhStaples(colors, format)` queries `cedh_staples WHERE format = ?`; that table holds 120 rows, **all `historic_brawl`**. A Commander build matches zero, so the +80 staple bonus never fires and only the penalty branch (−40 for MV >= 5 non-staples) applies — exactly the deck produced: avg MV 2.72, five nonland cards at MV >= 5, no Sol Ring, despite Sol Ring being in that table and in the operator's collection.
- **That table would still be wrong if the format matched:** it lists Mana Crypt and Jeweled Lotus at `power_tier: cedh`; both read `banned` in the Commander `legalities` column.
- **A synergy score of 0 is consistent with the chosen template.** Voltron demands `equipment_or_auras: 10`; the deck has 3. The score reports a real miss against the wrong target.
- **The free-text request was not honoured:** no Academy Manufactor (93.8% corpus inclusion), no Gilded Goose (88.3%), no Jaheira (83.3%), no Sarinth Steelseeker or Second Harvest (68.4% each) — all Commander-legal, all already owned.
