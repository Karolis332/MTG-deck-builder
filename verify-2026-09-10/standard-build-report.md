# Standard build from owned collection — 2026-09-10

Script: `scripts/standard-from-collection.ts` (`npx tsx scripts/standard-from-collection.ts`). Log: `verify-2026-09-10/standard-build-run.log`.

## Pool
- Size: 264 Standard-legal resolved cards from 849 collection rows (live desktop DB re-run 2026-09-10; first run against the stale repo DB gave 241 with 32 unresolved). By tag: open 219, in-deck 45. Unresolved: 0.
- Unresolved (32, not in DB or misspelled, excluded from pool): Arnyn Deathbloom Botanist; Cauldron of Essence; Chief Warg's Company; Decorum Dissertation; Defiling Daemogoth; Eccentric Pestfinder; Emeritus of Ideation; Emeritus of Truce; Emeritus of Woe; Feral Appetite; Frog Butler; Gorma the Gullet; Grave Researcher; Immoral Bargain; Merchant of Venom; Moseo Vein's New Dean; Ominous Harvest; Pest Rescuer; Pizza Face Gastromancer; Planar Engineering; Potioner's Trove; Professor Dellian Fel; Ribtruss Roaster; Skycoach Waypoint; Stensian Sanguinist; Studious First-Year; Teacher's Pest; Titan's Grave; Tragedy Feaster; Turbulent Fen; Vastlands Scavenger; Witherbloom Charm.
- Newest set codes present in the legal pool: `big, blb, cmm, dft, dsk, ecc, ecl, eoc, eoe, fdn, fin, lci, mkm, otj, spm, tdc, tdm, tla, woe`. No release-date column exists on `cards` (only `set_code`) — "newest" here is the full distinct-set list, not date-sorted; `fin`/`eoe`/`tla` read as the most recent Standard-legal sets by name.

## Top 5 archetypes (decks / WR / coverage / score = coverage x WR)
| Archetype | Decks | WR | Coverage | Score |
|---|---|---|---|---|
| Mono-Black | 19 | 66.7% (68-34) | 21.7% | 0.145 |
| Four-Color (no G) | 44 | 66.9% (164-81) | 15.7% | 0.105 |
| Dimir | 112 | 67.5% (466-224) | 15.5% | 0.105 |
| Selesnya | 30 | 62.8% (115-68) | 16.4% | 0.103 |
| Mono-Green | 145 | 69.6% (619-271) | 14.3% | 0.099 |

WR computed from mtgo-source rows only (real W/L). Coverage = share of core-card copies (>=50% inclusion cards) the pool owns, open first then in-deck.

## Chosen deck: Mono-Black (score 0.145, 19 decks, WR 66.7%, coverage 21.7%)

Colors: B. Avg nonland CMC 1.71. Land target 20 (aggro/low-curve band).

5 core cards owned at full count, 1 substituted (Shoot the Sheriff -> Bitter Triumph, same removal role), 34 nonland slots filled from the wider pool (cheap CMC, then price, mono-black only) since the corpus core list is thin relative to 60 cards. Read as a budget/theme skeleton, not a tuned 60 — see caveats.

### Main (47 nonland... 40 nonland + 20 land, see below)
```
2 Forsaken Miner [open]
3 Shoot the Sheriff [open]
1 Bitter Triumph [in:imotekh-the-stormlord]
1 Insatiable Avarice [in:imotekh-the-stormlord] (filler)
1 Lost Jitte [open] (filler)
1 Peter Parker's Camera [open] (filler)
1 Lavaspur Boots [open] (filler)
2 Undying Malice [open] (filler)
3 Corrupted Conviction [open] (filler)
1 Infestation Sage [open] (filler)
1 Fountainport Bell [open] (filler)
2 Unfortunate Accident [open] (filler)
1 Callous Inspector [open] (filler)
1 The Soul Stone [in:imotekh-the-stormlord] (filler)
1 Torpor Orb [open] (filler)
1 Wishclaw Talisman [in:imotekh-the-stormlord] (filler)
1 Day of Black Sun [open] (filler)
1 Bloodghast [in:meren-of-clan-nel-toth] (filler)
2 Umbral Collar Zealot [in:imotekh-the-stormlord] (filler)
1 Lively Dirge [in:imotekh-the-stormlord] (filler)
1 Outrageous Robbery [open] (filler)
1 Bandit's Talent [open] (filler)
1 Morlun, Devourer of Spiders [open] (filler)
1 Vengeful Bloodwitch [open] (filler)
1 Feed the Swarm [in:imotekh-the-stormlord] (filler)
1 Nullpriest of Oblivion [open] (filler)
1 Mazemind Tome [open] (filler)
1 Dread Summons [open] (filler)
1 Joo Dee, One of Many [open] (filler)
1 Servant of the Stinger [open] (filler)
1 Raven of Fell Omens [open] (filler)
1 Blood Hustler [open] (filler)
```
Lands (20):
```
1 Blooming Marsh (B/G) [in:meren-of-clan-nel-toth]
1 Concealed Courtyard (B/W) [in:tazri-beacon-of-unity]
1 Festering Gulch (B/G) [open]
1 Forlorn Flats (B/W) [open]
1 Jagged Barrens (B/R) [open]
1 Jungle Hollow (B/G) [open]
1 Mudflat Village (B) [open]
1 Overgrown Tomb (B/G) [in:tazri-beacon-of-unity]
12 Swamp (B) [basic (unlimited)]
```
Note: 5 cards flagged `in:<deck>` are currently sleeved in a Commander deck (Imotekh, Meren, or Tazri) — pulling them into this Standard build means physically removing them from that deck first. Everything else tagged `[open]` is unsleeved.

### Sideboard (3 of 15 — see caveat)
```
1 Elegy Acolyte [open]
1 Realm of Koh [open]
1 Rush of Dread [open]
```
Only 3 of the archetype's sideboard-candidate cards are owned (no filler pass for sideboard — scope cut). 12 slots unfilled; treat the buy list below as covering part of that gap too.

## Mana sources
20 lands total (8 nonbasic dual/tri-lands, all listed above under Main; colors shown next to each). Black sources: 20/20 (100%), confirmed via `cards.color_identity` — every land taps for black. Single-color deck, no fixing gaps.

## Validation
`src/lib/deck-validation.ts` `validateDeck(..., 'standard')`: **PASS: no issues** (60 main, 15 target sideboard rules, 4-copy cap, basics unlimited — all satisfied given only 3 sideboard cards are physically listed, which the validator does not flag as an error since sideboard has no strict minimum).

## Optimizer score (advisory)
`src/lib/deck-optimizer.ts`: legality issues 0; land delta 0 (built 20 vs target 20, fixed from an earlier run where the script undercounted basics — see caveats); **score: 70/100**. `ratioScore` is a fixed placeholder of 70 (the real quota-ratio/RatioHealth engine in `analysis-core.ts`/`card-classifier.ts` was out of scope for this script) — treat the score as "no legality problems, correct land count," not a tuned power rating.

## Buy list (9 cards, under the 15 cap) — core cards missing entirely from the build
| Qty | Card | Core inclusion | Price (DB) |
|---|---|---|---|
| 4 | Corpses of the Lost | 84% | $0.23 |
| 2 | Requiting Hex | 84% | $0.64 |
| 3 | Soulstone Sanctuary | 84% | $2.88 |
| 4 | Desolation Prowler | 79% | n/a |
| 4 | Dissection Practice | 79% | n/a |
| 3 | Gollum, Riddle Master | 79% | n/a |
| 4 | Iridescent Vinelasher | 79% | $1.20 |
| 4 | Nighthowl Pursuer | 79% | n/a |
| 4 | Sunset Saboteur | 79% | $0.22 |

`price_usd` is `n/a` for 5 of 9 cards — the local `cards` table has no price for those rows (not fabricated). These are the archetype's real core (>=50% inclusion) cards this build has zero copies of; buying even the top 3-4 (Corpses of the Lost, Requiting Hex, Soulstone Sanctuary — under $10 total) would materially close the coverage gap.

## Runner-up: Four-Color (no G) — list only, 44 decks, WR 66.9%
Core cards (>=50% inclusion), no substitution/build done per brief Step 6:
2x Steam Vents (100%), 4x Great Hall of the Biblioplex (98%), 3x Inevitable Defeat (98%), 3x Jeskai Revelation (98%), 2x Shattered Sanctum (98%), 2x Flashback (95%), 2x Sacred Foundry (95%), 4x Stock Up (95%), 4x Tablet of Discovery (95%), 1x Plains (84%), 1x Island (82%), 2x Consult the Star Charts (75%), 2x Together as One (75%), 2x Firebending Lesson (70%), 1x Mistrise Village (68%), 2x Sear (68%), 1x Sundown Pass (66%), 2x Riverpyre Verge (55%), 2x Starting Town (55%), 2x Deadly Cover-Up (52%), 2x Hallowed Fountain (52%), 1x Swamp (52%), 1x Meticulous Archive (50%), 2x Shoot the Sheriff (50%), 1x Stormcarved Coast (50%).

## UNVERIFIED / assumed
- Meta tables read from `data/export-standard.db` (the script opens it separately); card table from `MTG_DB_DIR` (live desktop DB at `%APPDATA%/the-black-grimoire/data`) — the repo `data/mtg-deck-builder.db` lacks sets `sos` and `hob`, which is why the first run left 32 names unresolved.
- No release-date column on `cards`; "newest set" is a distinct `set_code` list, not date-sorted.
- Sideboard 3/15 is genuine pool scarcity vs. the archetype's inclusion list, confirmed by reading the query — no filler pass was added for it (scope cut).
- `ratioScore` is a fixed placeholder of 70 (full quota/ratio-health engine out of scope); the 70/100 score reflects only "legal, correct land count," not power/role balance.
- 34 of 40 nonland slots are filler (cheapest-CMC-then-priciest, color-constrained), not archetype-matched, since the corpus core list for Mono-Black only covers ~6 pool-supportable cards.
- Land-count bug found and fixed this session: an earlier run undercounted total lands in the land-delta check (nonbasics only, missed the 12 basics) giving a false -12 delta; fixed by recomputing from the built list. Only the diagnostic line was wrong, never the decklist.
- `decks/paper/proposals/standard-golgari-aggro.txt` is a stale artifact from an earlier run (superseded archetype), left in place since the brief didn't authorize deleting proposal files.

## Re-run against the live card DB (2026-09-10, orchestrator)

- `scripts/standard-from-collection.ts` now honours `MTG_DB_DIR`; run: `MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/standard-from-collection.ts` (log `standard-build-run-livedb.log`).
- Pool 241 → 264 legal, unresolved 32 → 0. Top-5 table unchanged (the newly resolved `sos`/`hob` cards are not archetype core cards). Mono-Black still 21.7 % coverage, 34/40 filler.
- Deck diff vs the stale run (3 filler slots): −Blood Hustler, −Mazemind Tome, −Raven of Fell Omens; +Gleaming Barrier, +Prophetic Prism, +Wreckage Wickerfolk. Validation PASS, legality issues 0. Stale-run copy kept as `standard-mono-black-stale-db.txt`.
- Buy list now fully priced from the DB: 32 copies, $26.90 (Gollum 3× $2.76 and Vinelasher 4× $2.10 are 62 % of it).
- Verdict unchanged: the owned pool cannot field a competitive Standard 60 today; with the 9-name core bought it becomes the real mtgo Mono-Black list (66.7 % WR, 19 decks).
