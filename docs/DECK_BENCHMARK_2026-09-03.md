# Deck Benchmark — 2026-09-03

Each "set" below is a fetched batch of best-regarded published decklists for that commander (Moxfield top-liked, EDHREC average, tournament results where they exist, etc — see decks/test-builds/refs/<slug>/<set>.json for provenance per deck). No results/win-rate data exists for casual (non-tournament) Commander, so casual-bracket build quality is measured against these best-regarded lists rather than win rates. Reference decks are filtered to the build's targetBracket when at least 5 match; otherwise all fetched refs for that commander are used and bracketFilterApplied is false. qualityIndex (0-100) = 50% card overlap with the reference set + 30% composition-count similarity (ramp/draw/removal/etc) + 20% bracket match. 56 reference card name(s) were not found in the local card DB (mostly recent-set crossover/token cards — the local card data is stale) and were treated as unknown rather than crashing the run; see the appendix. Brawl builds compare against `<set>--brawl.json` refs when available; where no brawl-specific set exists, the commander-format set is used as a fallback (marked "(commander refs)" in the table, formatMismatch: true in benchmark.json) and excluded from the most-missed-staples tally below.

## Portfolio

| Scenario | Format | Bracket (build/target) | Set | Quality | Overlap (mean) | Staples missing |
|---|---|---|---|---|---|---|
| vivi-ornitier | commander | 4/3 | cedhtop16 | 35 | 37% | 10 |
| vivi-ornitier | commander | 4/3 | edhrec-avg | 54 | 69% | 10 |
| vivi-ornitier | commander | 4/3 | moxfield-top | 36 | 29% | 2 |
| ramos-dragon-engine | commander | 2/3 | cedhtop16 | 15 | 7% | 1 |
| ramos-dragon-engine | commander | 2/3 | edhrec-avg | 23 | 11% | 10 |
| ramos-dragon-engine | commander | 2/3 | moxfield-top | 25 | 15% | 0 |
| ramos-dragon-engine | brawl | 2/3 | cedhtop16 | 15 (commander refs) | 6% | 2 |
| ramos-dragon-engine | brawl | 2/3 | edhrec-avg | 27 | 18% | 10 |
| ramos-dragon-engine | brawl | 2/3 | moxfield-top | 21 | 10% | 2 |
| magus-lucea-kane | commander | 2/3 | cedhtop16 | 22 | 36% | 10 |
| magus-lucea-kane | commander | 2/3 | edhrec-avg | 45 | 64% | 10 |
| magus-lucea-kane | commander | 2/3 | moxfield-top | 36 | 39% | 5 |
| thrasios-tymna | commander | 4/5 | cedhtop16 | 47 | 62% | 10 |
| thrasios-tymna | commander | 4/5 | edhrec-avg | 21 | 28% | 10 |
| thrasios-tymna | commander | 4/5 | moxfield-top | 40 | 55% | 10 |
| thrasios-tymna | brawl | 4/5 | cedhtop16 | 41 (commander refs) | 52% | 10 |
| thrasios-tymna | brawl | 4/5 | edhrec-avg | - | - | (no refs) |
| thrasios-tymna | brawl | 4/5 | moxfield-top | 27 | 22% | 7 |
| mono-w-heliod | commander | 3/3 | cedhtop16 | 46 | 29% | 7 |
| mono-w-heliod | commander | 3/3 | edhrec-avg | 68 | 61% | 10 |
| mono-w-heliod | commander | 3/3 | moxfield-top | 50 | 31% | 1 |
| mono-w-heliod | brawl | 4/3 | cedhtop16 | 27 (commander refs) | 26% | 10 |
| mono-w-heliod | brawl | 4/3 | edhrec-avg | - | - | (no refs) |
| mono-w-heliod | brawl | 4/3 | moxfield-top | 22 | 27% | 10 |
| mono-u-orvar | commander | 3/3 | cedhtop16 | 45 | 32% | 10 |
| mono-u-orvar | commander | 3/3 | edhrec-avg | 70 | 67% | 10 |
| mono-u-orvar | commander | 3/3 | moxfield-top | 51 | 33% | 1 |
| mono-u-orvar | brawl | 3/3 | cedhtop16 | 38 (commander refs) | 21% | 10 |
| mono-u-orvar | brawl | 3/3 | edhrec-avg | - | - | (no refs) |
| mono-u-orvar | brawl | 3/3 | moxfield-top | 52 | 35% | 9 |
| mono-b-sheoldred | commander | 4/3 | cedhtop16 | 31 | 36% | 5 |
| mono-b-sheoldred | commander | 4/3 | edhrec-avg | 52 | 77% | 10 |
| mono-b-sheoldred | commander | 4/3 | moxfield-top | 34 | 41% | 2 |
| mono-b-sheoldred | brawl | 4/3 | cedhtop16 | 26 (commander refs) | 31% | 8 |
| mono-b-sheoldred | brawl | 4/3 | edhrec-avg | - | - | (no refs) |
| mono-b-sheoldred | brawl | 4/3 | moxfield-top | 25 | 24% | 9 |
| mono-r-krenko | commander | 2/3 | cedhtop16 | 38 | 46% | 2 |
| mono-r-krenko | commander | 2/3 | edhrec-avg | 52 | 75% | 10 |
| mono-r-krenko | commander | 2/3 | moxfield-top | 39 | 49% | 10 |
| mono-r-krenko | brawl | 2/3 | cedhtop16 | 34 (commander refs) | 37% | 9 |
| mono-r-krenko | brawl | 2/3 | edhrec-avg | - | - | (no refs) |
| mono-r-krenko | brawl | 2/3 | moxfield-top | 30 | 33% | 2 |
| mono-g-ghalta | commander | 2/3 | cedhtop16 | 21 | 20% | 3 |
| mono-g-ghalta | commander | 2/3 | edhrec-avg | 51 | 75% | 10 |
| mono-g-ghalta | commander | 2/3 | moxfield-top | 31 | 35% | 4 |
| mono-g-ghalta | brawl | 2/3 | cedhtop16 | 20 (commander refs) | 19% | 4 |
| mono-g-ghalta | brawl | 2/3 | edhrec-avg | - | - | (no refs) |
| mono-g-ghalta | brawl | 2/3 | moxfield-top | 29 | 28% | 1 |

## vivi-ornitier / commander

### vs cedhtop16 (30 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 26 | +12 |
| ramp | 13 | 17 | -4 |
| draw | 21 | 13 | +8 |
| removal | 11 | 9 | +2 |
| boardWipes | 1 | 1 | +0 |
| tutors | 2 | 7 | -5 |
| winCons | 6 | 3 | +3 |
| protection | 7 | 11 | -4 |
| avgCmcNonLand | 2 | 2 | +0 |

**Top staples missing:**
- Rite of Flame (in 100% of refs)
- Simian Spirit Guide (in 100% of refs)
- Mox Amber (in 97% of refs)
- Mental Misstep (in 97% of refs)
- Chrome Mox (in 97% of refs)
- Mox Opal (in 97% of refs)
- Mox Diamond (in 93% of refs)
- Force of Will (in 93% of refs)
- Mana Vault (in 93% of refs)
- Jeweled Amulet (in 93% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 17 | +21 |
| ramp | 13 | 15 | -2 |
| draw | 21 | 18 | +3 |
| removal | 11 | 7 | +4 |
| boardWipes | 1 | 2 | -1 |
| tutors | 2 | 2 | +0 |
| winCons | 6 | 6 | +0 |
| protection | 7 | 15 | -8 |
| avgCmcNonLand | 2 | 2 | +0 |

**Top staples missing:**
- Chrome Mox (in 100% of refs)
- Fellwar Stone (in 100% of refs)
- Lightning Greaves (in 100% of refs)
- Mox Amber (in 100% of refs)
- Swiftfoot Boots (in 100% of refs)
- Thought Vessel (in 100% of refs)
- Birgi, God of Storytelling (in 100% of refs)
- Coruscation Mage (in 100% of refs)
- Hexing Squelcher (in 100% of refs)
- Simian Spirit Guide (in 100% of refs)

### vs moxfield-top (7 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 33 | +5 |
| ramp | 13 | 10 | +3 |
| draw | 21 | 26 | -5 |
| removal | 11 | 8 | +3 |
| boardWipes | 1 | 1 | +0 |
| tutors | 2 | 0 | +2 |
| winCons | 6 | 6 | +0 |
| protection | 7 | 8 | -1 |
| avgCmcNonLand | 2 | 3 | 0 |

**Top staples missing:**
- Reality Shift (in 86% of refs)
- Slip Out the Back (in 71% of refs)

## ramos-dragon-engine / commander

### vs cedhtop16 (2 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 27 | +12 |
| ramp | 20 | 20 | +0 |
| draw | 19 | 10 | +9 |
| removal | 10 | 4 | +6 |
| boardWipes | 4 | 0 | +4 |
| tutors | 2 | 5 | -2 |
| winCons | 17 | 10 | +8 |
| protection | 3 | 4 | 0 |
| avgCmcNonLand | 3 | 3 | +1 |

**Top staples missing:**
- Demonic Tutor (in 100% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 30 | +8 |
| ramp | 20 | 20 | +0 |
| draw | 19 | 13 | +6 |
| removal | 10 | 20 | -10 |
| boardWipes | 4 | 1 | +3 |
| tutors | 2 | 1 | +1 |
| winCons | 17 | 14 | +3 |
| protection | 3 | 3 | +0 |
| avgCmcNonLand | 3 | 3 | +1 |

**Top staples missing:**
- Fracture (in 100% of refs)
- Peter Parker (in 100% of refs)
- Elusive Otter (in 100% of refs)
- Avacyn's Pilgrim (in 100% of refs)
- Dovin's Veto (in 100% of refs)
- Talisman of Progress (in 100% of refs)
- Aang, Swift Savior (in 100% of refs)
- Silverquill Charm (in 100% of refs)
- Silverquill, the Disputant (in 100% of refs)
- Moment of Reckoning (in 100% of refs)

### vs moxfield-top (12 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 37 | +1 |
| ramp | 20 | 13 | +8 |
| draw | 19 | 11 | +8 |
| removal | 10 | 9 | +1 |
| boardWipes | 4 | 2 | +2 |
| tutors | 2 | 2 | +1 |
| winCons | 17 | 14 | +3 |
| protection | 3 | 5 | -2 |
| avgCmcNonLand | 3 | 4 | 0 |

## ramos-dragon-engine / brawl

### vs cedhtop16 (2 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 27 | +12 |
| ramp | 21 | 20 | +1 |
| draw | 19 | 10 | +9 |
| removal | 9 | 4 | +5 |
| boardWipes | 4 | 0 | +4 |
| tutors | 2 | 5 | -2 |
| winCons | 15 | 10 | +6 |
| protection | 4 | 4 | +1 |
| avgCmcNonLand | 3 | 3 | +1 |

**Top staples missing:**
- Sol Ring (in 100% of refs)
- Demonic Tutor (in 100% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 35 | +3 |
| ramp | 21 | 32 | -11 |
| draw | 19 | 16 | +3 |
| removal | 9 | 9 | +0 |
| boardWipes | 4 | 0 | +4 |
| tutors | 2 | 3 | -1 |
| winCons | 15 | 13 | +2 |
| protection | 4 | 2 | +2 |
| avgCmcNonLand | 3 | 3 | +1 |

**Top staples missing:**
- The Wandering Minstrel (in 100% of refs)
- Gates Ablaze (in 100% of refs)
- Dovin's Veto (in 100% of refs)
- Guild Summit (in 100% of refs)
- Circuitous Route (in 100% of refs)
- Open the Gates (in 100% of refs)
- Glacial Dragonhunt (in 100% of refs)
- Broodheart Engine (in 100% of refs)
- A-Navigation Orb (in 100% of refs)
- Manamorphose (in 100% of refs)

### vs moxfield-top (4 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 39 | 0 |
| ramp | 21 | 20 | +1 |
| draw | 19 | 12 | +7 |
| removal | 9 | 6 | +4 |
| boardWipes | 4 | 1 | +4 |
| tutors | 2 | 1 | +2 |
| winCons | 15 | 18 | -3 |
| protection | 4 | 3 | +1 |
| avgCmcNonLand | 3 | 4 | 0 |

**Top staples missing:**
- Blitzball (in 75% of refs)
- Dragonlord Kolaghan (in 75% of refs)

## magus-lucea-kane / commander

### vs cedhtop16 (5 refs, bracketFilterApplied: true)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 17 | +21 |
| ramp | 17 | 13 | +4 |
| draw | 24 | 12 | +12 |
| removal | 10 | 1 | +9 |
| boardWipes | 0 | 2 | -2 |
| tutors | 2 | 0 | +2 |
| winCons | 4 | 2 | +2 |
| protection | 5 | 11 | -6 |
| avgCmcNonLand | 3 | 2 | +0 |

**Top staples missing:**
- Cyclonic Rift (in 100% of refs)
- Lightning Greaves (in 100% of refs)
- Ingenious Prodigy (in 100% of refs)
- Kiora, Behemoth Beckoner (in 100% of refs)
- Jaya's Immolating Inferno (in 100% of refs)
- Loading Zone (in 100% of refs)
- Lattice Library (in 100% of refs)
- Zimone, Infinite Analyst (in 100% of refs)
- Swiftfoot Boots (in 60% of refs)
- Swan Song (in 60% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 22 | +16 |
| ramp | 17 | 14 | +3 |
| draw | 24 | 17 | +7 |
| removal | 10 | 4 | +6 |
| boardWipes | 0 | 1 | -1 |
| tutors | 2 | 0 | +2 |
| winCons | 4 | 4 | +0 |
| protection | 5 | 6 | -1 |
| avgCmcNonLand | 3 | 2 | +0 |

**Top staples missing:**
- Lightning Greaves (in 100% of refs)
- Swiftfoot Boots (in 100% of refs)
- The Ozolith (in 100% of refs)
- Twinning Staff (in 100% of refs)
- Atalan Jackal (in 100% of refs)
- Hormagaunt Horde (in 100% of refs)
- Incubation Druid (in 100% of refs)
- Ingenious Prodigy (in 100% of refs)
- Old One Eye (in 100% of refs)
- Owlin Spiralmancer (in 100% of refs)

### vs moxfield-top (10 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 36 | +3 |
| ramp | 17 | 16 | +1 |
| draw | 24 | 12 | +13 |
| removal | 10 | 5 | +6 |
| boardWipes | 0 | 0 | +0 |
| tutors | 2 | 1 | +1 |
| winCons | 4 | 5 | -1 |
| protection | 5 | 7 | -2 |
| avgCmcNonLand | 3 | 3 | +0 |

**Top staples missing:**
- Incubation Druid (in 60% of refs)
- Lightning Greaves (in 60% of refs)
- Selvala, Heart of the Wilds (in 60% of refs)
- Three Visits (in 60% of refs)
- Bloom Tender (in 60% of refs)

## thrasios-tymna / commander

### vs cedhtop16 (26 refs, bracketFilterApplied: true)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 39 | 27 | +12 |
| ramp | 20 | 20 | +0 |
| draw | 17 | 10 | +8 |
| removal | 13 | 5 | +9 |
| boardWipes | 0 | 0 | +0 |
| tutors | 4 | 10 | -6 |
| winCons | 2 | 5 | -3 |
| protection | 6 | 9 | -3 |
| avgCmcNonLand | 2 | 2 | +0 |

**Top staples missing:**
- Mental Misstep (in 100% of refs)
- Thassa's Oracle (in 100% of refs)
- Pact of Negation (in 96% of refs)
- Noble Hierarch (in 92% of refs)
- Eldritch Evolution (in 88% of refs)
- Devoted Druid (in 81% of refs)
- Nature's Rhythm (in 77% of refs)
- Chord of Calling (in 77% of refs)
- Survival of the Fittest (in 69% of refs)
- Hazel's Brewmaster (in 69% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 39 | 20 | +19 |
| ramp | 20 | 26 | -6 |
| draw | 17 | 10 | +7 |
| removal | 13 | 4 | +9 |
| boardWipes | 0 | 1 | -1 |
| tutors | 4 | 2 | +2 |
| winCons | 2 | 9 | -7 |
| protection | 6 | 11 | -5 |
| avgCmcNonLand | 2 | 2 | 0 |

**Top staples missing:**
- Basalt Monolith (in 100% of refs)
- Lightning Greaves (in 100% of refs)
- Simic Signet (in 100% of refs)
- Talisman of Curiosity (in 100% of refs)
- Thought Vessel (in 100% of refs)
- Aesi, Tyrant of Gyre Strait (in 100% of refs)
- Avenger of Zendikar (in 100% of refs)
- Azusa, Lost but Seeking (in 100% of refs)
- Coiling Oracle (in 100% of refs)
- Elvish Mystic (in 100% of refs)

### vs moxfield-top (24 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 39 | 28 | +11 |
| ramp | 20 | 20 | +0 |
| draw | 17 | 9 | +8 |
| removal | 13 | 5 | +8 |
| boardWipes | 0 | 1 | -1 |
| tutors | 4 | 12 | -8 |
| winCons | 2 | 4 | -2 |
| protection | 6 | 9 | -2 |
| avgCmcNonLand | 2 | 2 | +0 |

**Top staples missing:**
- Noble Hierarch (in 100% of refs)
- Thassa's Oracle (in 100% of refs)
- Mental Misstep (in 92% of refs)
- Pact of Negation (in 92% of refs)
- Eldritch Evolution (in 79% of refs)
- Force of Negation (in 79% of refs)
- Neoform (in 75% of refs)
- Chord of Calling (in 71% of refs)
- Cyclonic Rift (in 71% of refs)
- Imperial Seal (in 71% of refs)

## thrasios-tymna / brawl

### vs cedhtop16 (26 refs, bracketFilterApplied: true)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 39 | 27 | +12 |
| ramp | 21 | 20 | +1 |
| draw | 16 | 10 | +7 |
| removal | 5 | 5 | +1 |
| boardWipes | 2 | 0 | +2 |
| tutors | 5 | 10 | -5 |
| winCons | 2 | 5 | -3 |
| protection | 5 | 9 | -4 |
| avgCmcNonLand | 2 | 2 | +0 |

**Top staples missing:**
- Lotus Petal (in 100% of refs)
- Tainted Pact (in 100% of refs)
- Fierce Guardianship (in 100% of refs)
- Mental Misstep (in 100% of refs)
- Demonic Tutor (in 100% of refs)
- Chrome Mox (in 100% of refs)
- Demonic Consultation (in 100% of refs)
- Mindbreak Trap (in 100% of refs)
- Thassa's Oracle (in 100% of refs)
- Sol Ring (in 96% of refs)

### vs moxfield-top (14 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 39 | 39 | +1 |
| ramp | 21 | 9 | +12 |
| draw | 16 | 10 | +6 |
| removal | 5 | 6 | 0 |
| boardWipes | 2 | 1 | +1 |
| tutors | 5 | 5 | +0 |
| winCons | 2 | 4 | -1 |
| protection | 5 | 11 | -5 |
| avgCmcNonLand | 2 | 2 | 0 |

**Top staples missing:**
- Thoughtseize (in 86% of refs)
- Inquisition of Kozilek (in 79% of refs)
- Fatal Push (in 71% of refs)
- Force of Negation (in 71% of refs)
- Mystical Tutor (in 71% of refs)
- Reanimate (in 71% of refs)
- Wash Away (in 71% of refs)

## mono-w-heliod / commander

### vs cedhtop16 (17 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 13 | +25 |
| ramp | 12 | 8 | +4 |
| draw | 17 | 7 | +10 |
| removal | 13 | 10 | +3 |
| boardWipes | 4 | 0 | +4 |
| tutors | 3 | 4 | -1 |
| winCons | 8 | 5 | +3 |
| protection | 3 | 5 | -2 |
| avgCmcNonLand | 3 | 2 | +0 |

**Top staples missing:**
- Drannith Magistrate (in 71% of refs)
- Boromir, Warden of the Tower (in 71% of refs)
- Deafening Silence (in 71% of refs)
- Aven Mindcensor (in 71% of refs)
- Silence (in 65% of refs)
- Archon of Emeria (in 65% of refs)
- Giver of Runes (in 65% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 9 | +29 |
| ramp | 12 | 7 | +5 |
| draw | 17 | 13 | +4 |
| removal | 13 | 9 | +4 |
| boardWipes | 4 | 4 | +0 |
| tutors | 3 | 4 | -1 |
| winCons | 8 | 8 | +0 |
| protection | 3 | 2 | +1 |
| avgCmcNonLand | 3 | 3 | 0 |

**Top staples missing:**
- Cosmos Elixir (in 100% of refs)
- Mind Stone (in 100% of refs)
- Oketra's Monument (in 100% of refs)
- Pristine Talisman (in 100% of refs)
- The Wind Crystal (in 100% of refs)
- Angel of Vitality (in 100% of refs)
- Dusk Legion Duelist (in 100% of refs)
- Haliya, Guided by Light (in 100% of refs)
- Knight of the White Orchid (in 100% of refs)
- Ranger-Captain of Eos (in 100% of refs)

### vs moxfield-top (8 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 34 | +4 |
| ramp | 12 | 7 | +5 |
| draw | 17 | 9 | +8 |
| removal | 13 | 7 | +6 |
| boardWipes | 4 | 2 | +3 |
| tutors | 3 | 3 | +0 |
| winCons | 8 | 7 | +1 |
| protection | 3 | 5 | -1 |
| avgCmcNonLand | 3 | 3 | +0 |

**Top staples missing:**
- Speaker of the Heavens (in 63% of refs)

## mono-w-heliod / brawl

### vs cedhtop16 (17 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 13 | +25 |
| ramp | 12 | 8 | +4 |
| draw | 17 | 7 | +10 |
| removal | 10 | 10 | +0 |
| boardWipes | 4 | 0 | +4 |
| tutors | 5 | 4 | +1 |
| winCons | 6 | 5 | +1 |
| protection | 3 | 5 | -2 |
| avgCmcNonLand | 3 | 2 | +1 |

**Top staples missing:**
- Sol Ring (in 100% of refs)
- Triskelion (in 76% of refs)
- Walking Ballista (in 76% of refs)
- Drannith Magistrate (in 71% of refs)
- Boromir, Warden of the Tower (in 71% of refs)
- Deafening Silence (in 71% of refs)
- Aven Mindcensor (in 71% of refs)
- Silence (in 65% of refs)
- Archon of Emeria (in 65% of refs)
- Giver of Runes (in 65% of refs)

### vs moxfield-top (10 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 36 | +2 |
| ramp | 12 | 3 | +9 |
| draw | 17 | 7 | +10 |
| removal | 10 | 5 | +5 |
| boardWipes | 4 | 0 | +4 |
| tutors | 5 | 0 | +5 |
| winCons | 6 | 6 | +0 |
| protection | 3 | 7 | -4 |
| avgCmcNonLand | 3 | 2 | +0 |

**Top staples missing:**
- Lunarch Veteran // Luminous Phantom (in 90% of refs)
- Shadowspear (in 80% of refs)
- Griffin Aerie (in 80% of refs)
- A-Ocelot Pride (in 70% of refs)
- Hinterland Sanctifier (in 70% of refs)
- Essence Channeler (in 70% of refs)
- A-The One Ring (in 60% of refs)
- Enduring Innocence (in 60% of refs)
- Envoy of the Ancestors (in 60% of refs)
- The Book of Exalted Deeds (in 60% of refs)

## mono-u-orvar / commander

### vs cedhtop16 (27 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 14 | +24 |
| ramp | 11 | 10 | +1 |
| draw | 25 | 15 | +10 |
| removal | 8 | 5 | +3 |
| boardWipes | 0 | 1 | -1 |
| tutors | 2 | 7 | -5 |
| winCons | 8 | 3 | +5 |
| protection | 3 | 9 | -6 |
| avgCmcNonLand | 3 | 2 | +0 |

**Top staples missing:**
- Force of Negation (in 89% of refs)
- Flusterstorm (in 89% of refs)
- Mystic Remora (in 89% of refs)
- Force of Will (in 89% of refs)
- Mana Vault (in 89% of refs)
- Fierce Guardianship (in 85% of refs)
- Chrome Mox (in 85% of refs)
- Roaming Throne (in 85% of refs)
- Mystical Tutor (in 81% of refs)
- Mindbreak Trap (in 81% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 9 | +29 |
| ramp | 11 | 9 | +2 |
| draw | 25 | 24 | +1 |
| removal | 8 | 5 | +3 |
| boardWipes | 0 | 1 | -1 |
| tutors | 2 | 3 | -1 |
| winCons | 8 | 8 | +0 |
| protection | 3 | 5 | -2 |
| avgCmcNonLand | 3 | 3 | 0 |

**Top staples missing:**
- Fellwar Stone (in 100% of refs)
- Gilded Lotus (in 100% of refs)
- Mirror Box (in 100% of refs)
- Swiftfoot Boots (in 100% of refs)
- Aether Channeler (in 100% of refs)
- Agent of Treachery (in 100% of refs)
- Archmage of Runes (in 100% of refs)
- Cloud of Faeries (in 100% of refs)
- Master of Waves (in 100% of refs)
- Phyrexian Metamorph (in 100% of refs)

### vs moxfield-top (9 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 36 | +2 |
| ramp | 11 | 8 | +3 |
| draw | 25 | 16 | +9 |
| removal | 8 | 6 | +2 |
| boardWipes | 0 | 2 | -2 |
| tutors | 2 | 5 | -3 |
| winCons | 8 | 5 | +3 |
| protection | 3 | 7 | -4 |
| avgCmcNonLand | 3 | 3 | 0 |

**Top staples missing:**
- Fellwar Stone (in 67% of refs)

## mono-u-orvar / brawl

### vs cedhtop16 (27 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 14 | +24 |
| ramp | 12 | 10 | +2 |
| draw | 26 | 15 | +11 |
| removal | 14 | 5 | +9 |
| boardWipes | 2 | 1 | +1 |
| tutors | 2 | 7 | -5 |
| winCons | 9 | 3 | +6 |
| protection | 5 | 9 | -4 |
| avgCmcNonLand | 3 | 2 | +1 |

**Top staples missing:**
- Sol Ring (in 100% of refs)
- Whim of Volrath (in 96% of refs)
- Clockspinning (in 96% of refs)
- High Tide (in 93% of refs)
- Force of Negation (in 89% of refs)
- Flusterstorm (in 89% of refs)
- Force of Will (in 89% of refs)
- Mana Vault (in 89% of refs)
- Fierce Guardianship (in 85% of refs)
- Chrome Mox (in 85% of refs)

### vs moxfield-top (5 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 35 | +3 |
| ramp | 12 | 9 | +3 |
| draw | 26 | 20 | +6 |
| removal | 14 | 10 | +4 |
| boardWipes | 2 | 1 | +1 |
| tutors | 2 | 1 | +1 |
| winCons | 9 | 7 | +2 |
| protection | 5 | 12 | -7 |
| avgCmcNonLand | 3 | 3 | +0 |

**Top staples missing:**
- Three Steps Ahead (in 100% of refs)
- Eluge, the Shoreless Sea (in 60% of refs)
- Negate (in 60% of refs)
- Relm's Sketching (in 60% of refs)
- Stormchaser Drake (in 60% of refs)
- Bender's Waterskin (in 60% of refs)
- Geistwave (in 60% of refs)
- Ornithopter of Paradise (in 60% of refs)
- Disdainful Stroke (in 60% of refs)

## mono-b-sheoldred / commander

### vs cedhtop16 (10 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 11 | +27 |
| ramp | 14 | 10 | +5 |
| draw | 32 | 13 | +19 |
| removal | 14 | 6 | +9 |
| boardWipes | 1 | 2 | -1 |
| tutors | 3 | 6 | -2 |
| winCons | 11 | 12 | 0 |
| protection | 2 | 2 | +0 |
| avgCmcNonLand | 4 | 3 | +0 |

**Top staples missing:**
- Sensei's Divining Top (in 60% of refs)
- The One Ring (in 60% of refs)
- Opposition Agent (in 60% of refs)
- Aetherflux Reservoir (in 60% of refs)
- Damnation (in 60% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 9 | +29 |
| ramp | 14 | 5 | +9 |
| draw | 32 | 24 | +8 |
| removal | 14 | 9 | +5 |
| boardWipes | 1 | 2 | -1 |
| tutors | 3 | 2 | +1 |
| winCons | 11 | 14 | -3 |
| protection | 2 | 3 | -1 |
| avgCmcNonLand | 4 | 3 | +0 |

**Top staples missing:**
- Alhammarret's Archive (in 100% of refs)
- The One Ring (in 100% of refs)
- Bloodletter of Aclazotz (in 100% of refs)
- Bloodthirsty Conqueror (in 100% of refs)
- Elder Brain (in 100% of refs)
- Erebos, God of the Dead (in 100% of refs)
- Witch of the Moors (in 100% of refs)
- Bloodchief Ascension (in 100% of refs)
- No Mercy (in 100% of refs)
- Blood Pact (in 100% of refs)

### vs moxfield-top (30 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 35 | +4 |
| ramp | 14 | 9 | +5 |
| draw | 32 | 16 | +17 |
| removal | 14 | 8 | +7 |
| boardWipes | 1 | 2 | -1 |
| tutors | 3 | 4 | -1 |
| winCons | 11 | 11 | +1 |
| protection | 2 | 1 | +1 |
| avgCmcNonLand | 4 | 3 | +0 |

**Top staples missing:**
- Vampiric Tutor (in 77% of refs)
- Bloodchief Ascension (in 60% of refs)

## mono-b-sheoldred / brawl

### vs cedhtop16 (10 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 39 | 11 | +28 |
| ramp | 12 | 10 | +3 |
| draw | 30 | 13 | +17 |
| removal | 10 | 6 | +5 |
| boardWipes | 4 | 2 | +2 |
| tutors | 3 | 6 | -2 |
| winCons | 11 | 12 | 0 |
| protection | 3 | 2 | +1 |
| avgCmcNonLand | 4 | 3 | +1 |

**Top staples missing:**
- Sol Ring (in 100% of refs)
- Demonic Tutor (in 80% of refs)
- Teferi's Puzzle Box (in 80% of refs)
- Sensei's Divining Top (in 60% of refs)
- The One Ring (in 60% of refs)
- Orcish Bowmasters (in 60% of refs)
- Opposition Agent (in 60% of refs)
- Aetherflux Reservoir (in 60% of refs)

### vs moxfield-top (7 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 39 | 40 | -1 |
| ramp | 12 | 4 | +8 |
| draw | 30 | 18 | +12 |
| removal | 10 | 14 | -4 |
| boardWipes | 4 | 2 | +2 |
| tutors | 3 | 2 | +1 |
| winCons | 11 | 7 | +4 |
| protection | 3 | 2 | +1 |
| avgCmcNonLand | 4 | 3 | +1 |

**Top staples missing:**
- Sheoldred's Edict (in 100% of refs)
- Dismember (in 86% of refs)
- Thoughtseize (in 86% of refs)
- A-The One Ring (in 71% of refs)
- Bitter Triumph (in 71% of refs)
- Duress (in 71% of refs)
- Go for the Throat (in 71% of refs)
- Invoke Despair (in 71% of refs)
- The Meathook Massacre (in 71% of refs)

## mono-r-krenko / commander

### vs cedhtop16 (30 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 6 | +33 |
| ramp | 12 | 9 | +4 |
| draw | 13 | 5 | +8 |
| removal | 6 | 7 | -1 |
| boardWipes | 3 | 0 | +3 |
| tutors | 2 | 3 | 0 |
| winCons | 7 | 6 | +1 |
| protection | 3 | 3 | +0 |
| avgCmcNonLand | 3 | 2 | +0 |

**Top staples missing:**
- Thousand-Year Elixir (in 60% of refs)
- Sting, the Glinting Dagger (in 60% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 6 | +32 |
| ramp | 12 | 7 | +5 |
| draw | 13 | 7 | +6 |
| removal | 6 | 10 | -4 |
| boardWipes | 3 | 1 | +2 |
| tutors | 2 | 2 | +0 |
| winCons | 7 | 6 | +1 |
| protection | 3 | 3 | +0 |
| avgCmcNonLand | 3 | 3 | +0 |

**Top staples missing:**
- Coat of Arms (in 100% of refs)
- Hazoret's Monument (in 100% of refs)
- Patriar's Seal (in 100% of refs)
- Sting, the Glinting Dagger (in 100% of refs)
- Thousand-Year Elixir (in 100% of refs)
- Goblin Piledriver (in 100% of refs)
- Kiki-Jiki, Mirror Breaker (in 100% of refs)
- Treasure Nabber (in 100% of refs)
- Blood Moon (in 100% of refs)
- Boggart Shenanigans (in 100% of refs)

### vs moxfield-top (8 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 34 | +5 |
| ramp | 12 | 11 | +1 |
| draw | 13 | 5 | +9 |
| removal | 6 | 11 | -4 |
| boardWipes | 3 | 1 | +3 |
| tutors | 2 | 4 | -1 |
| winCons | 7 | 6 | +1 |
| protection | 3 | 2 | +2 |
| avgCmcNonLand | 3 | 3 | +0 |

**Top staples missing:**
- Abrade (in 75% of refs)
- Treasure Nabber (in 75% of refs)
- Dark-Dweller Oracle (in 63% of refs)
- Goblin Sharpshooter (in 63% of refs)
- Jeska's Will (in 63% of refs)
- Kiki-Jiki, Mirror Breaker (in 63% of refs)
- Lightning Bolt (in 63% of refs)
- Mana Echoes (in 63% of refs)
- Umbral Mantle (in 63% of refs)
- Goblin Lookout (in 63% of refs)

## mono-r-krenko / brawl

### vs cedhtop16 (30 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 6 | +33 |
| ramp | 11 | 9 | +3 |
| draw | 13 | 5 | +8 |
| removal | 9 | 7 | +2 |
| boardWipes | 3 | 0 | +3 |
| tutors | 2 | 3 | 0 |
| winCons | 6 | 6 | +0 |
| protection | 3 | 3 | +0 |
| avgCmcNonLand | 3 | 2 | +0 |

**Top staples missing:**
- Sol Ring (in 90% of refs)
- Goblin Recruiter (in 80% of refs)
- Brightstone Ritual (in 77% of refs)
- Goblin King (in 77% of refs)
- Skullclamp (in 67% of refs)
- Goblin Chirurgeon (in 63% of refs)
- Goblin War Strike (in 63% of refs)
- Thousand-Year Elixir (in 60% of refs)
- Sting, the Glinting Dagger (in 60% of refs)

### vs moxfield-top (28 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 38 | 36 | +2 |
| ramp | 11 | 7 | +4 |
| draw | 13 | 6 | +8 |
| removal | 9 | 10 | -1 |
| boardWipes | 3 | 1 | +3 |
| tutors | 2 | 1 | +1 |
| winCons | 6 | 5 | +1 |
| protection | 3 | 2 | +1 |
| avgCmcNonLand | 3 | 2 | +0 |

**Top staples missing:**
- Fanatical Firebrand (in 71% of refs)
- Goblin Gang Leader (in 64% of refs)

## mono-g-ghalta / commander

### vs cedhtop16 (2 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 40 | 8 | +32 |
| ramp | 21 | 16 | +5 |
| draw | 19 | 12 | +8 |
| removal | 4 | 7 | -2 |
| boardWipes | 2 | 0 | +2 |
| tutors | 1 | 2 | 0 |
| winCons | 5 | 8 | -3 |
| protection | 4 | 2 | +2 |
| avgCmcNonLand | 3 | 3 | 0 |

**Top staples missing:**
- Pick Your Poison (in 100% of refs)
- Bushwhack (in 100% of refs)
- Fight Rigging (in 100% of refs)

### vs edhrec-avg (1 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 40 | 7 | +33 |
| ramp | 21 | 20 | +1 |
| draw | 19 | 13 | +6 |
| removal | 4 | 4 | +0 |
| boardWipes | 2 | 0 | +2 |
| tutors | 1 | 0 | +1 |
| winCons | 5 | 8 | -3 |
| protection | 4 | 7 | -3 |
| avgCmcNonLand | 3 | 4 | 0 |

**Top staples missing:**
- Defiler of Vigor (in 100% of refs)
- Disciple of Freyalise (in 100% of refs)
- Eternal Witness (in 100% of refs)
- Ghalta, Stampede Tyrant (in 100% of refs)
- Gwenna, Eyes of Gaea (in 100% of refs)
- Karametra's Acolyte (in 100% of refs)
- Kogla, the Titan Ape (in 100% of refs)
- Slumbering Trudge (in 100% of refs)
- Zopandrel, Hunger Dominus (in 100% of refs)
- Colossal Majesty (in 100% of refs)

### vs moxfield-top (11 refs, bracketFilterApplied: true)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 40 | 34 | +6 |
| ramp | 21 | 18 | +3 |
| draw | 19 | 10 | +9 |
| removal | 4 | 6 | -2 |
| boardWipes | 2 | 1 | +1 |
| tutors | 1 | 5 | -4 |
| winCons | 5 | 14 | -9 |
| protection | 4 | 3 | +1 |
| avgCmcNonLand | 3 | 3 | 0 |

**Top staples missing:**
- Natural Order (in 82% of refs)
- Finale of Devastation (in 73% of refs)
- Concordant Crossroads (in 64% of refs)
- Eternal Witness (in 64% of refs)

## mono-g-ghalta / brawl

### vs cedhtop16 (2 refs, bracketFilterApplied: false)

_No per-card quantities in this source — lands/counts below use 1 per unique name, not true copy counts. Treat land/count deltas as a floor, not a real comparison._

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 42 | 8 | +34 |
| ramp | 26 | 16 | +10 |
| draw | 15 | 12 | +4 |
| removal | 4 | 7 | -2 |
| boardWipes | 2 | 0 | +2 |
| tutors | 1 | 2 | 0 |
| winCons | 3 | 8 | -5 |
| protection | 5 | 2 | +3 |
| avgCmcNonLand | 3 | 3 | 0 |

**Top staples missing:**
- Arbor Elf (in 100% of refs)
- Pick Your Poison (in 100% of refs)
- Fight Rigging (in 100% of refs)
- Majestic Genesis (in 100% of refs)

### vs moxfield-top (8 refs, bracketFilterApplied: false)

| Metric | Build | Ref median | Delta |
|---|---|---|---|
| lands | 42 | 40 | +2 |
| ramp | 26 | 19 | +7 |
| draw | 15 | 11 | +4 |
| removal | 4 | 5 | -1 |
| boardWipes | 2 | 0 | +2 |
| tutors | 1 | 0 | +1 |
| winCons | 3 | 12 | -9 |
| protection | 5 | 8 | -2 |
| avgCmcNonLand | 3 | 3 | 0 |

**Top staples missing:**
- Delighted Halfling (in 63% of refs)

## Most-missed staples across fixtures

| Card | Fixtures missing it |
|---|---|
| Lightning Greaves | 3 |
| Swiftfoot Boots | 3 |
| Force of Negation | 3 |
| Mental Misstep | 2 |
| Chrome Mox | 2 |
| Force of Will | 2 |
| Mana Vault | 2 |
| Fellwar Stone | 2 |
| Thought Vessel | 2 |
| Dovin's Veto | 2 |
| Cyclonic Rift | 2 |
| Thoughtseize | 2 |
| Mystical Tutor | 2 |
| A-The One Ring | 2 |
| Rite of Flame | 1 |

## Appendix: reference card names not found in local DB

56 name(s), stale local card data (mostly 2026-set crossover/token cards):

- "the very hungry archaic"
- _____ goblin
- a-the meathook massacre
- aang, swift savior
- agadeem's awakening
- ajani resolute
- angel
- beast
- belladonna took
- bilbo's gambit
- birgi, god of storytelling
- dancing from dark to dawn
- disciple of freyalise
- dr. beverly crusher
- elephant
- elf warrior
- elusive otter
- fungus dinosaur
- giant's boulder
- gleaming splendor
- goblin-town flunkies
- horse
- human
- inside information
- kefka, court mage
- liliana the faultless
- malakir rebirth
- map
- misty mountains raider
- orcrist, goblin-cleaver
- peter parker
- phyrexian beast
- phyrexian germ
- pinnacle monk
- ragged short spear
- reverent howl
- revitalizing repast
- shatterskull smashing
- sink into stupor
- smaug the impenetrable
- smaug's fury
- snowslope hunter
- soldier
- stump stomp
- sundering eruption
- the emperor of palamecia
- the lonely mountain
- the queen of dale
- thor, guardian of midgard
- thrór's map
- tidings of war
- tyranid
- vampire
- well-worn spatula
- wizard's staff
- wurm
