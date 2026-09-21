# Deck Score v1.2 — typed-effect catalogue coverage

Generated 2026-09-21T06:00:56.339Z. Catalogue 4546 entries (4467 generated, 79 curated), version `2c438df8`.
Copy-weighted share of NONLAND main-deck copies carrying a `known` catalogue entry whose reviewed oracle text still hashes to the printing being scored.
Lands and textless vanillas are covered by definition — they make no mechanical claim (§1 "no requirements means 1"); they are the `trivial` column.
`partial` = a catalogue entry exists but at least one clause is untyped; `unknown` = no entry, or the entry is stale.

| reference set | lists | worst | median | >80% | generated | curated | trivial | partial | unknown |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cEDH Top-16 | 30 | 87.5% | 93.0% | 30/30 | 58.8% | 34.3% | 0.0% | 6.9% | 0.0% |
| Standard positive cohort (first 200) | 200 | 37.5% | 92.1% | 156/200 | 64.3% | 24.3% | 0.0% | 11.5% | 0.0% |
| §5 fixtures | 16 | 81.8% | 90.0% | 16/16 | 78.8% | 9.7% | 0.0% | 11.5% | 0.0% |
| constrained random piles | 200 | 45.0% | 61.3% | 0/200 | 60.6% | 0.3% | 0.0% | 39.1% | 0.0% |

## Stale entries (reviewed text no longer matches the live printing)

No stale entries: every catalogue hit still hashes to the printing being scored.

## Per fixture

| fixture | nonland copies | typed | coverage |
|---|---:|---:|---:|
| meren-powerhouse | 63 | 58 | 92.1% |
| cabbage-cedh-input | 61 | 52 | 85.2% |
| precon-witherbloom | 59 | 54 | 91.5% |
| the-cabbage-merchant | 65 | 55 | 84.6% |
| imotekh-the-stormlord | 64 | 59 | 92.2% |
| tazri-beacon-of-unity | 63 | 53 | 84.1% |
| meren-of-clan-nel-toth | 64 | 59 | 92.2% |
| ramos-dragon-engine | 0 | 0 | 100.0% |
| cabbage-merchant-current-brawl | 65 | 55 | 84.6% |
| tazri-upgraded-arena | 58 | 52 | 89.7% |
| kuja-genome-sorcerer-arena | 64 | 55 | 85.9% |
| vivi-battery-arena | 70 | 63 | 90.0% |
| fire-lord-azula-competitive | 66 | 54 | 81.8% |
| cedhtop16-ballooncon6 | 70 | 65 | 92.9% |
| standard-1445893-univerce | 39 | 39 | 100.0% |
| standard-1445867-aljce | 36 | 30 | 83.3% |

## Work queue — uncovered cards by copy-weighted frequency (top 60)

Curation adds entries from the top of this list until every reference list is above 80%.
`npx tsx scripts/deck-score-coverage.ts --queue 30` prints the next batch with oracle text.

| # | card | copies | lists | type |
|---:|---|---:|---:|---|
| 1 | Amalia Benavides Aguirre | 50 | 13 | Legendary Creature — Vampire Scout |
| 2 | Cool but Rude | 28 | 7 | Enchantment — Class |
| 3 | Moonshadow | 28 | 7 | Creature — Elemental |
| 4 | Seam Rip | 26 | 9 | Enchantment |
| 5 | The Last Ronin's Technique | 26 | 8 | Instant |
| 6 | The Wondrous Wasp | 25 | 13 | Legendary Creature — Human Hero |
| 7 | Clarion Conqueror | 22 | 8 | Creature — Dragon |
| 8 | Flashback | 21 | 12 | Instant |
| 9 | Sarkhan, Dragon Ascendant | 20 | 5 | Legendary Creature — Human Druid |
| 10 | Smaug the Magnificent | 20 | 5 | Legendary Creature — Dragon |
| 11 | Braided Net // Braided Quipu | 18 | 10 | Artifact // Artifact |
| 12 | Magmatic Hellkite | 18 | 5 | Creature — Dragon |
| 13 | Gollum, Riddle Master | 17 | 6 | Legendary Creature — Halfling Horror |
| 14 | Bringer of the Last Gift | 16 | 4 | Creature — Vampire Demon |
| 15 | Oblivious Bookworm | 16 | 4 | Creature — Human Wizard |
| 16 | Tishana's Tidebinder | 16 | 9 | Creature — Merfolk Wizard |
| 17 | Leonardo, Cutting Edge | 15 | 9 | Legendary Creature — Mutant Ninja Turtle |
| 18 | Cecil, Dark Knight // Cecil, Redeemed Paladin | 14 | 8 | Legendary Creature — Human Knight // Legendary Creature — Human Knight |
| 19 | Overlord of the Balemurk | 14 | 4 | Enchantment Creature — Avatar Horror |
| 20 | Professor Dellian Fel | 14 | 6 | Legendary Planeswalker — Dellian |
| 21 | Callous Sell-Sword // Burn Together | 13 | 4 | Creature — Human Soldier // Sorcery — Adventure |
| 22 | Spring-Loaded Sawblades // Bladewheel Chariot | 13 | 10 | Artifact // Artifact — Vehicle |
| 23 | Elusive Otter // Grove's Bounty | 12 | 3 | Creature — Otter // Sorcery — Adventure |
| 24 | Nowhere to Run | 12 | 7 | Enchantment |
| 25 | Ardyn, the Usurper | 10 | 4 | Legendary Creature — Elder Human Noble |
| 26 | Elspeth, Storm Slayer | 10 | 5 | Legendary Planeswalker — Elspeth |
| 27 | The Fire Crystal | 10 | 10 | Legendary Artifact |
| 28 | Turn Inside Out | 10 | 3 | Instant |
| 29 | Day of Black Sun | 9 | 5 | Sorcery |
| 30 | Strategic Betrayal | 9 | 8 | Sorcery |
| 31 | Aang, Swift Savior // Aang and La, Ocean's Fury | 8 | 2 | Legendary Creature — Human Avatar Ally // Legendary Creature — Avatar Spirit Ally |
| 32 | Accumulate Wisdom | 8 | 2 | Instant — Lesson |
| 33 | Bender's Waterskin | 8 | 2 | Artifact |
| 34 | Beseech the Mirror | 8 | 8 | Sorcery |
| 35 | Break Out | 8 | 2 | Sorcery |
| 36 | Combustion Technique | 8 | 2 | Instant — Lesson |
| 37 | Drake Hatcher | 8 | 3 | Creature — Human Wizard |
| 38 | Pinnacle Emissary | 8 | 2 | Artifact Creature — Robot |
| 39 | Tezzeret, Cruel Captain | 8 | 5 | Legendary Planeswalker — Tezzeret |
| 40 | Flash Photography | 7 | 7 | Sorcery |
| 41 | Torpor Orb | 7 | 7 | Artifact |
| 42 | Unidentified Hovership | 7 | 7 | Artifact — Vehicle |
| 43 | Ancient Cornucopia | 6 | 2 | Artifact |
| 44 | Aven Interrupter | 6 | 3 | Creature — Bird Rogue |
| 45 | Dyadrine, Synthesis Amalgam | 6 | 3 | Legendary Artifact Creature — Construct |
| 46 | Iron Hills Blacksmith | 6 | 2 | Creature — Dwarf Artificer |
| 47 | Jadzi, Steward of Fate // Oracle's Gift | 6 | 2 | Legendary Creature — Human Wizard // Sorcery |
| 48 | Opposition Agent | 6 | 6 | Creature — Human Rogue |
| 49 | Pym Particles | 6 | 2 | Sorcery |
| 50 | Terror of the Peaks | 6 | 2 | Creature — Dragon |
| 51 | Ugin, Eye of the Storms | 6 | 3 | Legendary Planeswalker — Ugin |
| 52 | Aang's Iceberg | 5 | 2 | Enchantment |
| 53 | Abhorrent Oculus | 5 | 5 | Creature — Eye |
| 54 | Analyze the Pollen | 5 | 3 | Sorcery |
| 55 | Ashling, Rekindled // Ashling, Rimebound | 5 | 2 | Legendary Creature — Elemental Sorcerer // Legendary Creature — Elemental Wizard |
| 56 | Bloom Tender | 5 | 5 | Creature — Elf Druid |
| 57 | Carnage, Crimson Chaos | 5 | 2 | Legendary Creature — Symbiote Villain |
| 58 | Clay-Fired Bricks // Cosmium Kiln | 5 | 3 | Artifact // Artifact |
| 59 | Gilded Drake | 5 | 5 | Creature — Drake |
| 60 | Jennifer Walters // The Sensational She-Hulk | 5 | 3 | Legendary Creature — Human Advisor Hero // Legendary Creature — Gamma Hero |
