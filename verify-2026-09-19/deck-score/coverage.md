# Deck Score v1.2 — typed-effect catalogue coverage

Generated 2026-09-20T08:07:34.370Z. Catalogue 4158 entries (4079 generated, 79 curated), version `e47a2f76`.
Copy-weighted share of NONLAND main-deck copies carrying a `known` catalogue entry whose reviewed oracle text still hashes to the printing being scored.
Lands and textless vanillas are covered by definition — they make no mechanical claim (§1 "no requirements means 1"); they are the `trivial` column.
`partial` = a catalogue entry exists but at least one clause is untyped; `unknown` = no entry, or the entry is stale.

| reference set | lists | worst | median | >80% | generated | curated | trivial | partial | unknown |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cEDH Top-16 | 30 | 85.7% | 93.0% | 30/30 | 58.4% | 34.3% | 0.0% | 7.3% | 0.0% |
| Standard positive cohort (first 200) | 200 | 37.5% | 91.9% | 156/200 | 63.0% | 24.3% | 0.0% | 12.7% | 0.0% |
| §5 fixtures | 16 | 52.4% | 83.3% | 12/16 | 69.3% | 9.7% | 0.0% | 20.9% | 0.0% |
| constrained random piles | 200 | 37.9% | 56.1% | 0/200 | 55.6% | 0.3% | 0.0% | 44.1% | 0.0% |

## Stale entries (reviewed text no longer matches the live printing)

No stale entries: every catalogue hit still hashes to the printing being scored.

## Per fixture

| fixture | nonland copies | typed | coverage |
|---|---:|---:|---:|
| meren-powerhouse | 63 | 56 | 88.9% |
| cabbage-cedh-input | 61 | 51 | 83.6% |
| precon-witherbloom | 59 | 39 | 66.1% |
| the-cabbage-merchant | 65 | 54 | 83.1% |
| imotekh-the-stormlord | 64 | 39 | 60.9% |
| tazri-beacon-of-unity | 63 | 33 | 52.4% |
| meren-of-clan-nel-toth | 64 | 57 | 89.1% |
| ramos-dragon-engine | 0 | 0 | 100.0% |
| cabbage-merchant-current-brawl | 65 | 54 | 83.1% |
| tazri-upgraded-arena | 58 | 34 | 58.6% |
| kuja-genome-sorcerer-arena | 64 | 53 | 82.8% |
| vivi-battery-arena | 70 | 61 | 87.1% |
| fire-lord-azula-competitive | 66 | 53 | 80.3% |
| cedhtop16-ballooncon6 | 70 | 64 | 91.4% |
| standard-1445893-univerce | 39 | 39 | 100.0% |
| standard-1445867-aljce | 36 | 30 | 83.3% |

## Work queue — uncovered cards by copy-weighted frequency (top 60)

Curation adds entries from the top of this list until every reference list is above 80%.
`npx tsx scripts/deck-score-coverage.ts --queue 30` prints the next batch with oracle text.

| # | card | copies | lists | type |
|---:|---|---:|---:|---|
| 1 | Dáin's Company | 56 | 14 | Creature — Dwarf Warrior |
| 2 | Cool but Rude | 28 | 7 | Enchantment — Class |
| 3 | Iron-Shield Elf | 28 | 7 | Creature — Elf Warrior |
| 4 | Marauding Mako | 28 | 7 | Creature — Shark Pirate |
| 5 | Moonshadow | 28 | 7 | Creature — Elemental |
| 6 | Seam Rip | 26 | 9 | Enchantment |
| 7 | The Last Ronin's Technique | 26 | 8 | Instant |
| 8 | The Wondrous Wasp | 25 | 13 | Legendary Creature — Human Hero |
| 9 | Clarion Conqueror | 22 | 8 | Creature — Dragon |
| 10 | Flashback | 21 | 12 | Instant |
| 11 | Sarkhan, Dragon Ascendant | 20 | 5 | Legendary Creature — Human Druid |
| 12 | Smaug the Magnificent | 20 | 5 | Legendary Creature — Dragon |
| 13 | Braided Net // Braided Quipu | 18 | 10 | Artifact // Artifact |
| 14 | Magmatic Hellkite | 18 | 5 | Creature — Dragon |
| 15 | Gollum, Riddle Master | 17 | 6 | Legendary Creature — Halfling Horror |
| 16 | Bringer of the Last Gift | 16 | 4 | Creature — Vampire Demon |
| 17 | Oblivious Bookworm | 16 | 4 | Creature — Human Wizard |
| 18 | Tishana's Tidebinder | 16 | 9 | Creature — Merfolk Wizard |
| 19 | Leonardo, Cutting Edge | 15 | 9 | Legendary Creature — Mutant Ninja Turtle |
| 20 | Cecil, Dark Knight // Cecil, Redeemed Paladin | 14 | 8 | Legendary Creature — Human Knight // Legendary Creature — Human Knight |
| 21 | Overlord of the Balemurk | 14 | 4 | Enchantment Creature — Avatar Horror |
| 22 | Professor Dellian Fel | 14 | 6 | Legendary Planeswalker — Dellian |
| 23 | Callous Sell-Sword // Burn Together | 13 | 4 | Creature — Human Soldier // Sorcery — Adventure |
| 24 | Spring-Loaded Sawblades // Bladewheel Chariot | 13 | 10 | Artifact // Artifact — Vehicle |
| 25 | Elusive Otter // Grove's Bounty | 12 | 3 | Creature — Otter // Sorcery — Adventure |
| 26 | Nowhere to Run | 12 | 7 | Enchantment |
| 27 | Ardyn, the Usurper | 10 | 4 | Legendary Creature — Elder Human Noble |
| 28 | Elspeth, Storm Slayer | 10 | 5 | Legendary Planeswalker — Elspeth |
| 29 | The Fire Crystal | 10 | 10 | Legendary Artifact |
| 30 | Turn Inside Out | 10 | 3 | Instant |
| 31 | Day of Black Sun | 9 | 5 | Sorcery |
| 32 | Emeritus of Truce // Swords to Plowshares | 9 | 3 | Creature — Cat Cleric // Instant |
| 33 | Strategic Betrayal | 9 | 8 | Sorcery |
| 34 | Aang, Swift Savior // Aang and La, Ocean's Fury | 8 | 2 | Legendary Creature — Human Avatar Ally // Legendary Creature — Avatar Spirit Ally |
| 35 | Accumulate Wisdom | 8 | 2 | Instant — Lesson |
| 36 | Bender's Waterskin | 8 | 2 | Artifact |
| 37 | Beseech the Mirror | 8 | 8 | Sorcery |
| 38 | Break Out | 8 | 2 | Sorcery |
| 39 | Combustion Technique | 8 | 2 | Instant — Lesson |
| 40 | Drake Hatcher | 8 | 3 | Creature — Human Wizard |
| 41 | Pinnacle Emissary | 8 | 2 | Artifact Creature — Robot |
| 42 | Tezzeret, Cruel Captain | 8 | 5 | Legendary Planeswalker — Tezzeret |
| 43 | Wishclaw Talisman | 8 | 8 | Artifact |
| 44 | Flash Photography | 7 | 7 | Sorcery |
| 45 | Torpor Orb | 7 | 7 | Artifact |
| 46 | Unidentified Hovership | 7 | 7 | Artifact — Vehicle |
| 47 | Ancient Cornucopia | 6 | 2 | Artifact |
| 48 | Aven Interrupter | 6 | 3 | Creature — Bird Rogue |
| 49 | Dyadrine, Synthesis Amalgam | 6 | 3 | Legendary Artifact Creature — Construct |
| 50 | Iron Hills Blacksmith | 6 | 2 | Creature — Dwarf Artificer |
| 51 | Jadzi, Steward of Fate // Oracle's Gift | 6 | 2 | Legendary Creature — Human Wizard // Sorcery |
| 52 | Mutable Explorer | 6 | 3 | Creature — Shapeshifter |
| 53 | Opposition Agent | 6 | 6 | Creature — Human Rogue |
| 54 | Pym Particles | 6 | 2 | Sorcery |
| 55 | Terror of the Peaks | 6 | 2 | Creature — Dragon |
| 56 | Ugin, Eye of the Storms | 6 | 3 | Legendary Planeswalker — Ugin |
| 57 | Aang's Iceberg | 5 | 2 | Enchantment |
| 58 | Abhorrent Oculus | 5 | 5 | Creature — Eye |
| 59 | Analyze the Pollen | 5 | 3 | Sorcery |
| 60 | Ashling, Rekindled // Ashling, Rimebound | 5 | 2 | Legendary Creature — Elemental Sorcerer // Legendary Creature — Elemental Wizard |
