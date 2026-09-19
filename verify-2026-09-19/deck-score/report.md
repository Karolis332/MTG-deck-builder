# Deck Score v1 calibration report

Generated 2026-09-19T16:34:46.569Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 41 | 97.8 | 94.4 | 67.5 | 82 | 26.6 | 97.5 | 50 | quality_cap<=41.3 | 65-80 | OUT | 46.98 |
| cabbage-cedh-input | commander | 20 | 88.1 | 85.1 | 91.2 | 89.9 | 0 | 100 | 50 | quality_cap<=20 | 35-50 | OUT | 9.41 |
| precon-witherbloom | commander | 26 | 96.9 | 83 | 19.4 | 60.5 | 7.5 | 100 | 50 | quality_cap<=26,coverage<=69 | 40-55 | OUT | 4.86 |
| the-cabbage-merchant | commander | 20 | 92.3 | 94.6 | 26 | 82 | 0 | 91.3 | 50 | quality_cap<=20,coverage<=69 | 55-70 | OUT | 4.68 |
| imotekh-the-stormlord | commander | 26 | 88.1 | 93.4 | 38.8 | 74.6 | 7 | 100 | 50 | quality_cap<=25.6 | 45-65 | OUT | 8.25 |
| tazri-beacon-of-unity | commander | 41 | 90.4 | 96.7 | 59.4 | 54.9 | 26.6 | 82.5 | 50 | quality_cap<=41.3,coverage<=69 | 40-60 | IN | 6.55 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 67.5 | 81.8 | 26.6 | 97.5 | 50 | fail:structure,size; size<=19,quality_cap<=41.3 | 0-19 | IN | 5.42 |
| ramos-dragon-engine | commander | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | quality_cap<=20 | 0-19 | IN | 1.26 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 24.9 | 80.2 | 0 | 91 | 50 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=20,coverage<=69 | 0-19 | IN | 6.66 |
| tazri-upgraded-arena | brawl | 66 | 60.4 | 84.3 | 65.4 | 77.1 | 57.4 | 83.1 | 50 | quality_cap<=65.9,coverage<=69 | 45-65 | OUT | 4.86 |
| kuja-genome-sorcerer-arena | brawl | 42 | 90 | 84.7 | 90.3 | 93.3 | 28.1 | 100 | 50 | quality_cap<=42.5 | 60-80 | OUT | 5.80 |
| vivi-battery-arena | brawl | 20 | 87.8 | 82 | 91.1 | 100 | 0 | 93 | 50 | quality_cap<=20 | 70-85 | OUT | 4.21 |
| fire-lord-azula-competitive | competitivebrawl | 53 | 83.5 | 82 | 78.3 | 95.8 | 41.8 | 82.5 | 50 | quality_cap<=53.4 | 75-90 | OUT | 3.94 |
| cedhtop16-ballooncon6 | commander | 54 | 93.8 | 68 | 59.2 | 78.6 | 41.9 | 78.3 | 50 | quality_cap<=53.5,coverage<=69 | 85-100 | OUT | 6.15 |
| standard-1445893-univerce | standard | 54 | 65.8 | 60.5 | 76.3 | 77.5 | 42.5 | 65 | 50 | quality_cap<=54 | 85-100 | OUT | 2.23 |
| standard-1445867-aljce | standard | 20 | 75.1 | 78.6 | 58.8 | 92.3 | 0 | 65 | 50 | quality_cap<=20 | 85-100 | OUT | 1.91 |

Anchors in band: 4/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 26.6 | Creature pressure (6 threats): closes T11, access 85% (u=0.30); shared bottleneck, protection access 30%; none. |
| cabbage-cedh-input | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| precon-witherbloom | 7.5 | Token/Food conversion (6 bodies): closes T12, access 9% (u=0.09); shared bottleneck, protection access 0%; none. |
| the-cabbage-merchant | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| imotekh-the-stormlord | 7 | Token/Food conversion (6 bodies): closes T12, access 8% (u=0.08); shared bottleneck, protection access 16%; none. |
| tazri-beacon-of-unity | 26.6 | Creature pressure (6 threats): closes T11, access 54% (u=0.30); shared bottleneck, protection access 30%; none. |
| meren-of-clan-nel-toth | 26.6 | Creature pressure (6 threats): closes T11, access 86% (u=0.30); shared bottleneck, protection access 30%; none. |
| ramos-dragon-engine | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| cabbage-merchant-current-brawl | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| tazri-upgraded-arena | 57.4 | Creature pressure (3 threats): closes T6, access 84% (u=0.63); shared bottleneck, protection access 41%; none. |
| kuja-genome-sorcerer-arena | 28.1 | Creature pressure (2 threats): closes T9, access 69% (u=0.31); shared bottleneck, protection access 29%; none. |
| vivi-battery-arena | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| fire-lord-azula-competitive | 41.8 | Creature pressure (3 threats): closes T7, access 30% (u=0.43); shared bottleneck, protection access 87%; none. |
| cedhtop16-ballooncon6 | 41.9 | Alternate win condition: closes T4, access 11% (u=0.45); independent backup Dramatic Reversal + Isochron Scepter u=0.05; none. |
| standard-1445893-univerce | 42.5 | Creature pressure (4 threats): closes T6, access 76% (u=0.50); shared bottleneck, protection access 0%; none. |
| standard-1445867-aljce | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |

## Random constrained-legal piles — The Cabbage Merchant, Commander, seeds 0-49

Per §5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. n=50, generated+scored in 2030ms.

| min | median | max | >=25 | target |
|---:|---:|---:|---:|---|
| 20 | 20 | 37 | 8/50 | §4 wants >=95% under 25 |
