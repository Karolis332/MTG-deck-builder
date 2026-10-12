# Deck Score v1.2 — typed-effect catalogue coverage

Generated 2026-09-21T07:32:27.685Z. Catalogue 14898 entries (14819 generated, 79 curated), version `deb73ed1`.
Copy-weighted share of NONLAND main-deck copies carrying a `known` catalogue entry whose reviewed oracle text still hashes to the printing being scored.
Lands and textless vanillas are covered by definition — they make no mechanical claim (§1 "no requirements means 1"); they are the `trivial` column.
`partial` = a catalogue entry exists but at least one clause is untyped; `unknown` = no entry, or the entry is stale.

| reference set | lists | worst | median | >80% | generated | curated | trivial | partial | unknown |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cEDH Top-16 | 30 | 87.1% | 94.4% | 30/30 | 59.6% | 34.3% | 0.0% | 6.1% | 0.0% |
| Standard positive cohort (first 200) | 200 | 37.5% | 94.3% | 168/200 | 66.4% | 24.3% | 0.0% | 9.3% | 0.0% |
| §5 fixtures | 16 | 83.3% | 91.4% | 16/16 | 80.5% | 9.7% | 0.0% | 9.8% | 0.0% |
| constrained random piles | 200 | 56.1% | 69.5% | 3/200 | 68.9% | 0.3% | 0.0% | 30.8% | 0.0% |

## Stale entries (reviewed text no longer matches the live printing)

No stale entries: every catalogue hit still hashes to the printing being scored.

## Per fixture

| fixture | nonland copies | typed | coverage |
|---|---:|---:|---:|
| meren-powerhouse | 63 | 58 | 92.1% |
| cabbage-cedh-input | 61 | 54 | 88.5% |
| precon-witherbloom | 59 | 54 | 91.5% |
| the-cabbage-merchant | 65 | 57 | 87.7% |
| imotekh-the-stormlord | 64 | 60 | 93.8% |
| tazri-beacon-of-unity | 63 | 54 | 85.7% |
| meren-of-clan-nel-toth | 64 | 59 | 92.2% |
| ramos-dragon-engine | 0 | 0 | 100.0% |
| cabbage-merchant-current-brawl | 65 | 57 | 87.7% |
| tazri-upgraded-arena | 58 | 53 | 91.4% |
| kuja-genome-sorcerer-arena | 64 | 58 | 90.6% |
| vivi-battery-arena | 70 | 63 | 90.0% |
| fire-lord-azula-competitive | 66 | 55 | 83.3% |
| cedhtop16-ballooncon6 | 70 | 65 | 92.9% |
| standard-1445893-univerce | 39 | 39 | 100.0% |
| standard-1445867-aljce | 36 | 32 | 88.9% |

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
| 8 | Sarkhan, Dragon Ascendant | 20 | 5 | Legendary Creature — Human Druid |
| 9 | Smaug the Magnificent | 20 | 5 | Legendary Creature — Dragon |
| 10 | Braided Net // Braided Quipu | 18 | 10 | Artifact // Artifact |
| 11 | Magmatic Hellkite | 18 | 5 | Creature — Dragon |
| 12 | Bringer of the Last Gift | 16 | 4 | Creature — Vampire Demon |
| 13 | Oblivious Bookworm | 16 | 4 | Creature — Human Wizard |
| 14 | Tishana's Tidebinder | 16 | 9 | Creature — Merfolk Wizard |
| 15 | Cecil, Dark Knight // Cecil, Redeemed Paladin | 14 | 8 | Legendary Creature — Human Knight // Legendary Creature — Human Knight |
| 16 | Callous Sell-Sword // Burn Together | 13 | 4 | Creature — Human Soldier // Sorcery — Adventure |
| 17 | Spring-Loaded Sawblades // Bladewheel Chariot | 13 | 10 | Artifact // Artifact — Vehicle |
| 18 | Elusive Otter // Grove's Bounty | 12 | 3 | Creature — Otter // Sorcery — Adventure |
| 19 | Nowhere to Run | 12 | 7 | Enchantment |
| 20 | Ardyn, the Usurper | 10 | 4 | Legendary Creature — Elder Human Noble |
| 21 | Turn Inside Out | 10 | 3 | Instant |
| 22 | Day of Black Sun | 9 | 5 | Sorcery |
| 23 | Strategic Betrayal | 9 | 8 | Sorcery |
| 24 | Aang, Swift Savior // Aang and La, Ocean's Fury | 8 | 2 | Legendary Creature — Human Avatar Ally // Legendary Creature — Avatar Spirit Ally |
| 25 | Accumulate Wisdom | 8 | 2 | Instant — Lesson |
| 26 | Bender's Waterskin | 8 | 2 | Artifact |
| 27 | Beseech the Mirror | 8 | 8 | Sorcery |
| 28 | Break Out | 8 | 2 | Sorcery |
| 29 | Drake Hatcher | 8 | 3 | Creature — Human Wizard |
| 30 | Pinnacle Emissary | 8 | 2 | Artifact Creature — Robot |
| 31 | Tezzeret, Cruel Captain | 8 | 5 | Legendary Planeswalker — Tezzeret |
| 32 | Torpor Orb | 7 | 7 | Artifact |
| 33 | Aven Interrupter | 6 | 3 | Creature — Bird Rogue |
| 34 | Dyadrine, Synthesis Amalgam | 6 | 3 | Legendary Artifact Creature — Construct |
| 35 | Iron Hills Blacksmith | 6 | 2 | Creature — Dwarf Artificer |
| 36 | Jadzi, Steward of Fate // Oracle's Gift | 6 | 2 | Legendary Creature — Human Wizard // Sorcery |
| 37 | Opposition Agent | 6 | 6 | Creature — Human Rogue |
| 38 | Pym Particles | 6 | 2 | Sorcery |
| 39 | Terror of the Peaks | 6 | 2 | Creature — Dragon |
| 40 | Ugin, Eye of the Storms | 6 | 3 | Legendary Planeswalker — Ugin |
| 41 | Aang's Iceberg | 5 | 2 | Enchantment |
| 42 | Analyze the Pollen | 5 | 3 | Sorcery |
| 43 | Ashling, Rekindled // Ashling, Rimebound | 5 | 2 | Legendary Creature — Elemental Sorcerer // Legendary Creature — Elemental Wizard |
| 44 | Bloom Tender | 5 | 5 | Creature — Elf Druid |
| 45 | Carnage, Crimson Chaos | 5 | 2 | Legendary Creature — Symbiote Villain |
| 46 | Gilded Drake | 5 | 5 | Creature — Drake |
| 47 | Jennifer Walters // The Sensational She-Hulk | 5 | 3 | Legendary Creature — Human Advisor Hero // Legendary Creature — Gamma Hero |
| 48 | Noxious Revival | 5 | 5 | Instant |
| 49 | Nurturing Pixie | 5 | 3 | Creature — Faerie Rogue |
| 50 | Secret Identity | 5 | 2 | Instant |
| 51 | Settle the Wreckage | 5 | 3 | Instant |
| 52 | Subtlety | 5 | 5 | Creature — Elemental Incarnation |
| 53 | Teferi, Mage of Zhalfir | 5 | 5 | Legendary Creature — Human Wizard |
| 54 | Volatile Stormdrake | 5 | 5 | Creature — Drake |
| 55 | Agatha's Soul Cauldron | 4 | 4 | Legendary Artifact |
| 56 | Appa, Steadfast Guardian | 4 | 1 | Legendary Creature — Bison Ally |
| 57 | Bramble Familiar // Fetch Quest | 4 | 1 | Creature — Elemental Raccoon // Sorcery — Adventure |
| 58 | Calamity's Wake | 4 | 4 | Instant |
| 59 | Charismatic Conqueror | 4 | 4 | Creature — Vampire Soldier |
| 60 | Colorstorm Stallion | 4 | 1 | Creature — Elemental Horse |
