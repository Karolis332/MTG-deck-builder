# Deck Score v1 calibration report

Generated 2026-09-20T07:48:05.579Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 62 | 97.8 | 94.4 | 82.9 | 82 | 52.1 | 100 | 50 | quality_cap<=61.7 | 65-80 | OUT | 33.65 |
| cabbage-cedh-input | commander | 79 | 82.5 | 85.1 | 95 | 85 | 74.3 | 88.3 | 50 | quality_cap<=79.4 | 35-50 | OUT | 12.99 |
| precon-witherbloom | commander | 53 | 96.9 | 83 | 29.7 | 65 | 40.9 | 97 | 50 | quality_cap<=52.7 | 40-55 | IN | 6.18 |
| the-cabbage-merchant | commander | 20 | 92.3 | 94.6 | 36.7 | 74.6 | 0 | 28.8 | 50 | quality_cap<=20 | 55-70 | OUT | 9.69 |
| imotekh-the-stormlord | commander | 55 | 88.1 | 93.4 | 44.2 | 74.6 | 44 | 43.8 | 50 | quality_cap<=55 | 45-65 | IN | 20.85 |
| tazri-beacon-of-unity | commander | 40 | 90.4 | 96.7 | 74.8 | 61.4 | 52.1 | 25.4 | 50 | quality_cap<=40.3 | 40-60 | IN | 6.22 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 82.9 | 81.8 | 52 | 100 | 50 | fail:structure,size; size<=19,quality_cap<=61.6 | 0-19 | IN | 8.42 |
| ramos-dragon-engine | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | quality_cap<=20 | 0-19 | IN | 1.45 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 41.7 | 73.5 | 0 | 28.6 | 50 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=20 | 0-19 | IN | 7.10 |
| tazri-upgraded-arena | brawl | 44 | 60.4 | 84.3 | 77.2 | 77.1 | 92.2 | 29.5 | 50 | quality_cap<=43.6 | 45-65 | OUT | 6.83 |
| kuja-genome-sorcerer-arena | brawl | 71 | 90 | 84.7 | 92 | 91.7 | 63.7 | 100 | 50 | quality_cap<=71 | 60-80 | IN | 6.04 |
| vivi-battery-arena | brawl | 76 | 87.8 | 82 | 98 | 100 | 69.5 | 100 | 50 | quality_cap<=75.6 | 70-85 | IN | 6.52 |
| fire-lord-azula-competitive | competitivebrawl | 87 | 83.5 | 82 | 96 | 94.6 | 83.6 | 100 | 50 | quality_cap<=86.8 | 75-90 | IN | 7.03 |
| cedhtop16-ballooncon6 | commander | 34 | 93.8 | 75 | 99 | 78.6 | 90.5 | 17.3 | 50 | quality_cap<=33.8 | 80-95 | OUT | 9.07 |
| standard-1445893-univerce | standard | 73 | 65.8 | 60.5 | 94 | 77.5 | 85 | 100 | 50 | quality_cap<=72.6 | 70-90 | IN | 2.10 |
| standard-1445867-aljce | standard | 20 | 75.1 | 78.6 | 77.1 | 86.3 | 0 | 100 | 50 | quality_cap<=20 | 65-90 | OUT | 2.70 |

Anchors in band: 10/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 52.1 | Creature pressure (10 threats): closes T11, access 22% (u=0.57); shared bottleneck, protection access 38%; none. |
| cabbage-cedh-input | 74.3 | Control inevitability (6 finishers): closes T8, access 64% (u=0.76); shared bottleneck, protection access 87%; none. |
| precon-witherbloom | 40.9 | Token/Food conversion (6 bodies): closes T12, access 14% (u=0.48); shared bottleneck, protection access 0%; none. |
| the-cabbage-merchant | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| imotekh-the-stormlord | 44 | Creature pressure (6 threats): closes T12, access 51% (u=0.50); shared bottleneck, protection access 20%; none. |
| tazri-beacon-of-unity | 52.1 | Creature pressure (6 threats): closes T11, access 77% (u=0.57); shared bottleneck, protection access 38%; none. |
| meren-of-clan-nel-toth | 52 | Creature pressure (10 threats): closes T11, access 24% (u=0.57); shared bottleneck, protection access 37%; none. |
| ramos-dragon-engine | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| cabbage-merchant-current-brawl | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| tazri-upgraded-arena | 92.2 | Creature pressure (3 threats): closes T6, access 94% (u=1.00); shared bottleneck, protection access 48%; none. |
| kuja-genome-sorcerer-arena | 63.7 | Control inevitability (5 finishers): closes T8, access 55% (u=0.71); shared bottleneck, protection access 34%; none. |
| vivi-battery-arena | 69.5 | Control inevitability (3 finishers): closes T8, access 38% (u=0.71); shared bottleneck, protection access 89%; none. |
| fire-lord-azula-competitive | 83.6 | Creature pressure (3 threats): closes T7, access 46% (u=0.84); shared bottleneck, protection access 96%; none. |
| cedhtop16-ballooncon6 | 90.5 | Alternate win condition: closes T7, access 14% (u=0.95); independent backup Dramatic Reversal + Isochron Scepter u=0.13; none. |
| standard-1445893-univerce | 85 | Creature pressure (4 threats): closes T6, access 83% (u=1.00); shared bottleneck, protection access 0%; none. |
| standard-1445867-aljce | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |

## Section 8 acceptance, measured

n=200 piles, 30 cEDH lists, 120 held-out Standard positives.

| section-8 target | measured | |
|---|---|---|
| held-out Standard positive median >= 75 | 32.5 | FAIL |
| cEDH median >= 85 | 29.5 | FAIL |
| >= 95% of piles < 25 | 184/200 | FAIL |
| S <= 5 on >= 95% of piles | 169/200 | FAIL |
| Meren S >= 85.5 | 100 | PASS |
| precon S >= 70 | 97 | PASS |

| pile distribution | min | median | max |
|---|---:|---:|---:|
| total | 20 | 20 | 39 |
| S | 0 | 1.1 | 27.2 |

Per section 5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. The synthetic basics no longer reuse the commander's card id (section 8), so pile lands are finally scored as lands.
