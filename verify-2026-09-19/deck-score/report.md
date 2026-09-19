# Deck Score v1 calibration report

Generated 2026-09-19T16:03:52.121Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 52 | 97.8 | 94.4 | 67.5 | 82 | 40.3 | 97.5 | 50 | quality_cap<=52.2 | 65-80 | OUT | 31.12 |
| cabbage-cedh-input | commander | 20 | 88.1 | 85.1 | 91.2 | 89.9 | 0 | 100 | 50 | quality_cap<=20 | 35-50 | OUT | 7.49 |
| precon-witherbloom | commander | 21 | 96.9 | 83 | 19.4 | 60.5 | 1.1 | 100 | 50 | quality_cap<=20.9,coverage<=69 | 40-55 | OUT | 4.41 |
| the-cabbage-merchant | commander | 20 | 92.3 | 94.6 | 26 | 82 | 0 | 91.3 | 50 | quality_cap<=20,coverage<=69 | 55-70 | OUT | 4.25 |
| imotekh-the-stormlord | commander | 30 | 88.1 | 93.4 | 38.8 | 74.6 | 13.1 | 100 | 50 | quality_cap<=30.5 | 45-65 | OUT | 6.46 |
| tazri-beacon-of-unity | commander | 20 | 90.4 | 96.7 | 59.4 | 54.9 | 0 | 82.5 | 50 | quality_cap<=20,coverage<=69 | 40-60 | OUT | 5.29 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 67.5 | 81.8 | 42.2 | 97.5 | 50 | fail:structure,size; size<=19,quality_cap<=53.8 | 0-19 | IN | 4.74 |
| ramos-dragon-engine | commander | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | quality_cap<=20 | 0-19 | IN | 1.70 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 24.9 | 80.2 | 19.2 | 91 | 50 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=35.4,coverage<=69 | 0-19 | IN | 4.97 |
| tazri-upgraded-arena | brawl | 49 | 60.4 | 84.3 | 65.4 | 77.1 | 36.2 | 83.1 | 50 | quality_cap<=49,coverage<=69 | 45-65 | IN | 4.77 |
| kuja-genome-sorcerer-arena | brawl | 26 | 90 | 84.7 | 90.3 | 93.3 | 7.1 | 100 | 50 | quality_cap<=25.7 | 60-80 | OUT | 4.51 |
| vivi-battery-arena | brawl | 20 | 87.8 | 82 | 91.1 | 100 | 0 | 93 | 50 | quality_cap<=20 | 70-85 | OUT | 3.33 |
| fire-lord-azula-competitive | competitivebrawl | 22 | 83.5 | 82 | 78.3 | 95.8 | 2.3 | 82.5 | 50 | quality_cap<=21.8 | 75-90 | OUT | 4.26 |
| cedhtop16-ballooncon6 | commander | 54 | 93.8 | 68 | 59.2 | 78.6 | 41.9 | 78.3 | 50 | quality_cap<=53.5,coverage<=69 | 85-100 | OUT | 5.30 |
| standard-1445893-univerce | standard | 26 | 65.8 | 60.5 | 76.3 | 77.5 | 7.5 | 65 | 50 | quality_cap<=26 | 85-100 | OUT | 1.46 |
| standard-1445867-aljce | standard | 20 | 75.1 | 78.6 | 58.8 | 92.3 | 0 | 65 | 50 | quality_cap<=20 | 85-100 | OUT | 1.53 |

Anchors in band: 4/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Random constrained-legal piles — The Cabbage Merchant, Commander, seeds 0-49

Per §5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. n=50, generated+scored in 1692ms.

| min | median | max | target |
|---:|---:|---:|---|
| 20 | 20 | 21 | <25 (§4 release target; not enforced/tuned here) |
