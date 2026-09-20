# Deck Score v1 calibration report

Generated 2026-09-20T11:57:21.871Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 75 | 97.8 | 94.4 | 95 | 82 | 68.7 | 93.8 | 50 | quality_cap<=75 | 65-80 | IN | 30.88 |
| cabbage-cedh-input | commander | 73 | 82.5 | 85.1 | 95 | 85 | 74.3 | 65.7 | 50 | quality_cap<=72.6 | 35-50 | OUT | 8.45 |
| precon-witherbloom | commander | 52 | 96.9 | 83 | 32.1 | 65 | 42.5 | 39.7 | 50 | quality_cap<=51.8 | 40-55 | IN | 5.42 |
| the-cabbage-merchant | commander | 59 | 92.3 | 94.6 | 62.5 | 74.6 | 48.8 | 71.2 | 50 | quality_cap<=59 | 55-70 | IN | 6.90 |
| imotekh-the-stormlord | commander | 44 | 88.1 | 93.4 | 49.7 | 74.6 | 50.6 | 29.9 | 50 | quality_cap<=43.9 | 45-65 | OUT | 9.04 |
| tazri-beacon-of-unity | commander | 32 | 90.4 | 94.4 | 76.6 | 61.4 | 59.8 | 14.7 | 50 | quality_cap<=31.8 | 40-60 | OUT | 6.36 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 95 | 81.8 | 68.7 | 92.8 | 50 | fail:structure,size; size<=19,quality_cap<=75 | 0-19 | IN | 5.50 |
| ramos-dragon-engine | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | quality_cap<=20 | 0-19 | IN | 1.04 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 71 | 73.5 | 85 | 70.4 | 50 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=76.3 | 0-19 | IN | 13.99 |
| tazri-upgraded-arena | brawl | 32 | 60.4 | 84.3 | 77.2 | 77.1 | 92.2 | 15.3 | 50 | quality_cap<=32.2 | 45-65 | OUT | 6.40 |
| kuja-genome-sorcerer-arena | brawl | 71 | 90 | 84.7 | 92 | 91.7 | 63.7 | 100 | 50 | quality_cap<=71 | 60-80 | IN | 5.47 |
| vivi-battery-arena | brawl | 76 | 87.8 | 82 | 100 | 100 | 69.5 | 85.7 | 50 | quality_cap<=75.6 | 70-85 | IN | 5.45 |
| fire-lord-azula-competitive | competitivebrawl | 87 | 83.5 | 82 | 96 | 94.6 | 83.6 | 99.2 | 50 | quality_cap<=86.8 | 75-90 | IN | 5.57 |
| cedhtop16-ballooncon6 | commander | 88 | 93.8 | 75 | 100 | 78.6 | 90.5 | 84.6 | 50 | quality_cap<=87.7 | 80-95 | IN | 7.02 |
| standard-1445893-univerce | standard | 73 | 65.8 | 60.5 | 94 | 77.5 | 85 | 100 | 50 | quality_cap<=72.6 | 70-90 | IN | 2.00 |
| standard-1445867-aljce | standard | 68 | 75.1 | 78.6 | 77.1 | 86.3 | 60.1 | 84.7 | 50 | quality_cap<=68.1 | 65-90 | IN | 1.96 |

Anchors in band: 12/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 68.7 | Control inevitability (15 finishers): closes T8, access 93% (u=0.76); shared bottleneck, protection access 38%; none. |
| cabbage-cedh-input | 74.3 | Control inevitability (13 finishers): closes T8, access 90% (u=0.76); shared bottleneck, protection access 87%; none. |
| precon-witherbloom | 42.5 | Token/Food conversion (5 bodies): closes T12, access 26% (u=0.50); shared bottleneck, protection access 0%; none. |
| the-cabbage-merchant | 48.8 | Token/Food conversion (5 bodies): closes T11, access 100% (u=0.57); shared bottleneck, protection access 0%; none. |
| imotekh-the-stormlord | 50.6 | Token/Food conversion (6 bodies): closes T11, access 16% (u=0.57); shared bottleneck, protection access 20%; none. |
| tazri-beacon-of-unity | 59.8 | Token/Food conversion (7 bodies): closes T10, access 36% (u=0.66); shared bottleneck, protection access 38%; none. |
| meren-of-clan-nel-toth | 68.7 | Control inevitability (16 finishers): closes T8, access 94% (u=0.76); shared bottleneck, protection access 37%; none. |
| ramos-dragon-engine | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| cabbage-merchant-current-brawl | 85 | Creature pressure (4 threats): closes T6, access 77% (u=1.00); shared bottleneck, protection access 0%; none. |
| tazri-upgraded-arena | 92.2 | Creature pressure (3 threats): closes T6, access 95% (u=1.00); shared bottleneck, protection access 48%; none. |
| kuja-genome-sorcerer-arena | 63.7 | Control inevitability (13 finishers): closes T8, access 100% (u=0.71); shared bottleneck, protection access 34%; none. |
| vivi-battery-arena | 69.5 | Control inevitability (11 finishers): closes T8, access 84% (u=0.71); shared bottleneck, protection access 89%; none. |
| fire-lord-azula-competitive | 83.6 | Creature pressure (3 threats): closes T7, access 51% (u=0.84); shared bottleneck, protection access 96%; none. |
| cedhtop16-ballooncon6 | 90.5 | Alternate win condition: closes T7, access 14% (u=0.95); independent backup Dramatic Reversal + Isochron Scepter u=0.13; none. |
| standard-1445893-univerce | 85 | Creature pressure (4 threats): closes T6, access 83% (u=1.00); shared bottleneck, protection access 0%; none. |
| standard-1445867-aljce | 60.1 | Token/Food conversion (1 bodies): closes T7, access 85% (u=0.71); shared bottleneck, protection access 0%; none. |

## Section 8 acceptance, measured

n=200 piles, 30 cEDH lists, 120 held-out Standard positives.

| section-8 target | measured | |
|---|---|---|
| held-out Standard positive median >= 75 | 41.5 | FAIL |
| cEDH median >= 85 | 76 | FAIL |
| >= 95% of piles < 25 | 176/200 | FAIL |
| S <= 5 on >= 95% of piles | 167/200 | FAIL |
| Meren S >= 85.5 | 93.8 | PASS |
| precon S >= 70 | 39.7 | FAIL |

| pile distribution | min | median | max |
|---|---:|---:|---:|
| total | 20 | 20 | 38 |
| S | 0 | 0 | 29.2 |

Per section 5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. The synthetic basics no longer reuse the commander's card id (section 8), so pile lands are finally scored as lands.
