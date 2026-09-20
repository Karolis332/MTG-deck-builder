# Deck Score v1 calibration report

Generated 2026-09-20T07:15:51.220Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 54 | 97.8 | 94.4 | 67.5 | 82 | 42.7 | 81.5 | 50 | quality_cap<=54.2 | 65-80 | OUT | 27.86 |
| cabbage-cedh-input | commander | 20 | 88.1 | 85.1 | 91.2 | 89.9 | 0 | 100 | 50 | quality_cap<=20 | 35-50 | OUT | 10.79 |
| precon-witherbloom | commander | 35 | 96.9 | 83 | 19.4 | 60.5 | 24.9 | 19.1 | 50 | quality_cap<=35.3 | 40-55 | OUT | 3.93 |
| the-cabbage-merchant | commander | 20 | 92.3 | 94.6 | 26 | 82 | 0 | 67.3 | 50 | quality_cap<=20 | 55-70 | OUT | 4.67 |
| imotekh-the-stormlord | commander | 30 | 88.1 | 93.4 | 38.8 | 74.6 | 12 | 61.7 | 50 | quality_cap<=29.6 | 45-65 | OUT | 7.02 |
| tazri-beacon-of-unity | commander | 48 | 90.4 | 96.7 | 59.4 | 54.9 | 52.1 | 35.1 | 50 | quality_cap<=48.1 | 40-60 | IN | 5.72 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 67.5 | 81.8 | 47.6 | 82.8 | 50 | fail:structure,size; size<=19,quality_cap<=58.1 | 0-19 | IN | 5.84 |
| ramos-dragon-engine | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | quality_cap<=20 | 0-19 | IN | 1.26 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 28.1 | 80.2 | 0 | 67.3 | 50 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=20 | 0-19 | IN | 6.54 |
| tazri-upgraded-arena | brawl | 62 | 60.4 | 87.9 | 93.6 | 77.1 | 92.2 | 52.2 | 50 | quality_cap<=61.8 | 45-65 | IN | 5.30 |
| kuja-genome-sorcerer-arena | brawl | 71 | 90 | 84.7 | 93 | 93.3 | 63.7 | 90.2 | 50 | quality_cap<=71 | 60-80 | IN | 5.67 |
| vivi-battery-arena | brawl | 76 | 87.8 | 82 | 98 | 100 | 69.5 | 100 | 50 | quality_cap<=75.6 | 70-85 | IN | 5.09 |
| fire-lord-azula-competitive | competitivebrawl | 86 | 83.5 | 82 | 85.5 | 95.8 | 83.6 | 87.9 | 50 | quality_cap<=86.8 | 75-90 | IN | 6.64 |
| cedhtop16-ballooncon6 | commander | 55 | 93.8 | 76 | 92.5 | 78.6 | 90.5 | 44.3 | 50 | quality_cap<=55.4 | 80-95 | OUT | 17.38 |
| standard-1445893-univerce | standard | 73 | 65.8 | 60.5 | 76.3 | 77.5 | 85 | 100 | 50 | quality_cap<=72.6 | 70-90 | IN | 1.55 |
| standard-1445867-aljce | standard | 20 | 75.1 | 78.6 | 58.8 | 92.3 | 0 | 77.8 | 50 | quality_cap<=20 | 65-90 | OUT | 2.23 |

Anchors in band: 9/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 42.7 | Creature pressure (10 threats): closes T11, access 12% (u=0.47); shared bottleneck, protection access 38%; none. |
| cabbage-cedh-input | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| precon-witherbloom | 24.9 | Token/Food conversion (6 bodies): closes T12, access 9% (u=0.29); shared bottleneck, protection access 0%; none. |
| the-cabbage-merchant | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| imotekh-the-stormlord | 12 | Token/Food conversion (7 bodies): closes T12, access 4% (u=0.14); shared bottleneck, protection access 20%; none. |
| tazri-beacon-of-unity | 52.1 | Token/Food conversion (7 bodies): closes T11, access 16% (u=0.57); shared bottleneck, protection access 38%; none. |
| meren-of-clan-nel-toth | 47.6 | Creature pressure (10 threats): closes T11, access 14% (u=0.53); shared bottleneck, protection access 37%; none. |
| ramos-dragon-engine | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| cabbage-merchant-current-brawl | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| tazri-upgraded-arena | 92.2 | Creature pressure (3 threats): closes T6, access 84% (u=1.00); shared bottleneck, protection access 48%; none. |
| kuja-genome-sorcerer-arena | 63.7 | Control inevitability (5 finishers): closes T8, access 55% (u=0.71); shared bottleneck, protection access 34%; none. |
| vivi-battery-arena | 69.5 | Control inevitability (3 finishers): closes T8, access 38% (u=0.71); shared bottleneck, protection access 89%; none. |
| fire-lord-azula-competitive | 83.6 | Creature pressure (3 threats): closes T7, access 30% (u=0.84); shared bottleneck, protection access 96%; none. |
| cedhtop16-ballooncon6 | 90.5 | Alternate win condition: closes T7, access 14% (u=0.95); independent backup Dramatic Reversal + Isochron Scepter u=0.13; none. |
| standard-1445893-univerce | 85 | Creature pressure (4 threats): closes T6, access 76% (u=1.00); shared bottleneck, protection access 0%; none. |
| standard-1445867-aljce | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |

## Section 8 acceptance, measured

n=200 piles, 30 cEDH lists, 120 held-out Standard positives.

| section-8 target | measured | |
|---|---|---|
| held-out Standard positive median >= 75 | 36 | FAIL |
| cEDH median >= 85 | 50 | FAIL |
| >= 95% of piles < 25 | 135/200 | FAIL |
| S <= 5 on >= 95% of piles | 66/200 | FAIL |
| Meren S >= 85.5 | 81.5 | FAIL |
| precon S >= 70 | 19.1 | FAIL |

| pile distribution | min | median | max |
|---|---:|---:|---:|
| total | 20 | 20 | 55 |
| S | 0 | 10.2 | 60.2 |

Per section 5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. The synthetic basics no longer reuse the commander's card id (section 8), so pile lands are finally scored as lands.
