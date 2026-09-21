# Deck Score v1 calibration report

Generated 2026-09-21T11:34:45.885Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | plan | Q | R | b | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 68 | 97.8 | 94.4 | 95 | 82 | 59.8 | 100 | 50 | aristocrats | 0.778 | 1.000 | 0.683 | quality_cap<=67.8 | 65-80 | IN | 79.13 |
| cabbage-cedh-input | commander | 20 | 82.5 | 85.1 | 97.5 | 85 | 64.7 | 0 | 50 | control | 0.600 | 1.000 | 0.683 | quality_cap<=20 | 35-50 | OUT | 22.21 |
| precon-witherbloom | commander | 54 | 96.9 | 83 | 60.7 | 65 | 42.5 | 83.3 | 50 | lifegain | 0.814 | 0.833 | 0.683 | quality_cap<=54 | 40-55 | IN | 12.26 |
| the-cabbage-merchant | commander | 20 | 92.3 | 94.6 | 70.6 | 74.6 | 48.8 | 0 | 50 | midrange | 0.615 | 1.000 | 0.683 | quality_cap<=20 | 55-70 | OUT | 12.44 |
| imotekh-the-stormlord | commander | 56 | 88.1 | 93.4 | 51.9 | 74.6 | 44.4 | 100 | 50 | recursion | 0.703 | 1.000 | 0.683 | quality_cap<=55.5 | 45-65 | IN | 18.19 |
| tazri-beacon-of-unity | commander | 20 | 90.4 | 94.4 | 96 | 65 | 68.7 | 0 | 50 | typal | 0.667 | 1.000 | 0.683 | quality_cap<=20 | 40-60 | OUT | 11.75 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 95 | 81.8 | 59.8 | 100 | 50 | aristocrats | 0.766 | 1.000 | 0.683 | fail:structure,size; size<=19,quality_cap<=67.8 | 0-19 | IN | 8.75 |
| ramos-dragon-engine | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | aggro | 0.000 | 0.000 | 0.683 | quality_cap<=20 | 0-19 | IN | 1.06 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 80.6 | 73.5 | 85 | 0 | 50 | tokens | 0.634 | 0.330 | 0.733 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=20 | 0-19 | IN | 11.92 |
| tazri-upgraded-arena | brawl | 68 | 60.4 | 90.3 | 84 | 73.5 | 92.2 | 66.7 | 50 | tokens | 0.759 | 0.667 | 0.733 | quality_cap<=68.3 | 45-65 | OUT | 14.33 |
| kuja-genome-sorcerer-arena | brawl | 63 | 90 | 84.7 | 92 | 91.7 | 53.6 | 100 | 50 | spells | 0.781 | 1.000 | 0.733 | quality_cap<=62.9 | 60-80 | IN | 9.18 |
| vivi-battery-arena | brawl | 67 | 87.8 | 82 | 100 | 100 | 58.5 | 96.6 | 50 | spells | 0.757 | 1.000 | 0.733 | quality_cap<=66.8 | 70-85 | OUT | 9.16 |
| fire-lord-azula-competitive | competitivebrawl | 20 | 83.5 | 82 | 98 | 94.6 | 83.6 | 0 | 50 | spells | 0.705 | 1.000 | 0.733 | quality_cap<=20 | 75-90 | OUT | 10.03 |
| cedhtop16-ballooncon6 | commander | 92 | 93.8 | 75 | 100 | 78.6 | 95 | 100 | 50 | spells | 0.701 | 0.505 | 0.683 | quality_cap<=95 | 80-95 | IN | 13.74 |
| standard-1445893-univerce | standard | 73 | 65.8 | 60.5 | 94 | 77.5 | 85 | 100 | 50 | midrange | 0.872 | 1.000 | 0.300 | quality_cap<=72.6 | 70-90 | IN | 4.07 |
| standard-1445867-aljce | standard | 68 | 75.1 | 78.6 | 81.7 | 86.3 | 60.1 | 100 | 50 | midrange | 0.778 | 1.000 | 0.300 | quality_cap<=68.1 | 65-90 | IN | 3.83 |

Anchors in band: 10/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 59.8 | Creature pressure (10 threats): closes T10, access 27% (u=0.66); independent backup A graveyard tutor + a reanimation spell u=0.13; none. |
| cabbage-cedh-input | 64.7 | Token/Food conversion (8 bodies): closes T10, access 60% (u=0.66); shared bottleneck, protection access 87%; none. |
| precon-witherbloom | 42.5 | Token/Food conversion (5 bodies): closes T12, access 26% (u=0.50); shared bottleneck, protection access 0%; none. |
| the-cabbage-merchant | 48.8 | Token/Food conversion (5 bodies): closes T11, access 100% (u=0.57); shared bottleneck, protection access 0%; none. |
| imotekh-the-stormlord | 44.4 | Creature pressure (6 threats): closes T12, access 75% (u=0.50); independent backup A graveyard tutor + a reanimation spell u=0.13; none. |
| tazri-beacon-of-unity | 68.7 | Token/Food conversion (8 bodies): closes T9, access 35% (u=0.76); shared bottleneck, protection access 38%; none. |
| meren-of-clan-nel-toth | 59.8 | Creature pressure (10 threats): closes T10, access 32% (u=0.66); independent backup A graveyard tutor + a reanimation spell u=0.12; none. |
| ramos-dragon-engine | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| cabbage-merchant-current-brawl | 85 | Creature pressure (4 threats): closes T6, access 81% (u=1.00); shared bottleneck, protection access 0%; none. |
| tazri-upgraded-arena | 92.2 | Creature pressure (3 threats): closes T6, access 98% (u=1.00); shared bottleneck, protection access 48%; none. |
| kuja-genome-sorcerer-arena | 53.6 | Creature pressure (2 threats): closes T9, access 85% (u=0.59); shared bottleneck, protection access 34%; none. |
| vivi-battery-arena | 58.5 | Token/Food conversion (2 bodies): closes T9, access 96% (u=0.59); shared bottleneck, protection access 89%; none. |
| fire-lord-azula-competitive | 83.6 | Creature pressure (3 threats): closes T7, access 61% (u=0.84); shared bottleneck, protection access 96%; none. |
| cedhtop16-ballooncon6 | 95 | Thassa's Oracle + Demonic Consultation: closes T7, access 17% (u=1.00); shared bottleneck, protection access 67%; none. |
| standard-1445893-univerce | 85 | Creature pressure (4 threats): closes T6, access 83% (u=1.00); shared bottleneck, protection access 0%; none. |
| standard-1445867-aljce | 60.1 | Token/Food conversion (1 bodies): closes T7, access 85% (u=0.71); shared bottleneck, protection access 0%; none. |

## Producer utilisation — the term that replaced B (section 9 decision 3)

A copy is "charged" when its only output is life, Food, a token, creature deaths or
graveyard fill: none of those reach a plan without a route. A copy whose output is
pressure, mana, cards or answers is a direct plan use and never appears here.
"stranded" copies have u = 0 and earn no Q or R credit at all.

| Fixture | S | producers |
|---|---:|---|
| meren-powerhouse | 100 | 1 charged, 0 stranded, mean u 1.00 |
| cabbage-cedh-input | 0 | 0 charged, 0 stranded, mean u 1.00 |
| precon-witherbloom | 83.3 | 1 charged, 0 stranded, mean u 1.00 |
| the-cabbage-merchant | 0 | 0 charged, 0 stranded, mean u 1.00 |
| imotekh-the-stormlord | 100 | 0 charged, 0 stranded, mean u 1.00 |
| tazri-beacon-of-unity | 0 | 0 charged, 0 stranded, mean u 1.00 |
| meren-of-clan-nel-toth | 100 | 1 charged, 0 stranded, mean u 1.00 |
| ramos-dragon-engine | 0 | 0 charged, 0 stranded, mean u 1.00 |
| cabbage-merchant-current-brawl | 0 | 0 charged, 0 stranded, mean u 1.00 |
| tazri-upgraded-arena | 66.7 | 0 charged, 0 stranded, mean u 1.00 |
| kuja-genome-sorcerer-arena | 100 | 0 charged, 0 stranded, mean u 1.00 |
| vivi-battery-arena | 96.6 | 2 charged, 2 stranded, mean u 0.00 |
| fire-lord-azula-competitive | 0 | 2 charged, 0 stranded, mean u 0.50 |
| cedhtop16-ballooncon6 | 100 | 0 charged, 0 stranded, mean u 1.00 |
| standard-1445893-univerce | 100 | 0 charged, 0 stranded, mean u 1.00 |
| standard-1445867-aljce | 100 | 0 charged, 0 stranded, mean u 1.00 |

## Section 8 acceptance, measured

n=200 piles, 30 cEDH lists, 120 held-out Standard positives.

| section-8 target | measured | |
|---|---|---|
| held-out Standard positive median >= 75 | 57.5 | FAIL |
| cEDH median >= 85 | 90 | PASS |
| >= 95% of piles < 25 | 200/200 | PASS |
| S <= 5 on >= 95% of piles | 200/200 | PASS |
| Meren S >= 85.5 | 100 | PASS |
| precon S >= 70 | 83.3 | PASS |
| held-out Standard S median 75-85 | 87.5 | FAIL |
| held-out Standard S zeros <= 6 | 3/120 | PASS |
| held-out Standard W zeros = 0 | 0/120 | PASS |

| Standard held-out cohort | n | total median | S median | S zeros | W median | W zeros |
|---|---:|---:|---:|---:|---:|---:|
| positives (newest 40%) | 120 | 57.5 | 87.5 | 3 | 85 | 0 |
| losing field (newest 40%) | 120 | 54.5 | 98.1 | 12 | 85 | 0 |

| pile distribution | min | median | max |
|---|---:|---:|---:|
| total | 20 | 20 | 20 |
| S | 0 | 0 | 0 |

Per section 5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. The synthetic basics no longer reuse the commander's card id (section 8), so pile lands are finally scored as lands.
