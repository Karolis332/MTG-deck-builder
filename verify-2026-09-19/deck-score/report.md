# Deck Score v1 calibration report

Generated 2026-09-21T14:06:20.911Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | plan | Q | R | b | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 68 | 97.8 | 94.4 | 95 | 82 | 59.8 | 100 | 50 | aristocrats | 0.495 | 1.000 | 0.683 | quality_cap<=67.8 | 65-80 | IN | 59.44 |
| cabbage-cedh-input | commander | 72 | 82.5 | 85.1 | 97.5 | 85 | 64.7 | 97.7 | 50 | conversion | 0.424 | 0.667 | 0.683 | quality_cap<=71.8 | 35-50 | OUT | 14.26 |
| precon-witherbloom | commander | 54 | 96.9 | 83 | 60.7 | 65 | 42.5 | 100 | 50 | lifegain | 0.485 | 0.833 | 0.683 | quality_cap<=54 | 40-55 | IN | 9.72 |
| the-cabbage-merchant | commander | 59 | 92.3 | 94.6 | 70.6 | 74.6 | 48.8 | 100 | 50 | conversion | 0.455 | 0.778 | 0.683 | quality_cap<=59 | 55-70 | IN | 9.88 |
| imotekh-the-stormlord | commander | 61 | 88.1 | 93.4 | 51.9 | 74.6 | 50.7 | 100 | 50 | recursion | 0.495 | 1.000 | 0.683 | quality_cap<=60.6 | 45-65 | IN | 12.75 |
| tazri-beacon-of-unity | commander | 75 | 90.4 | 94.4 | 96 | 65 | 68.7 | 100 | 50 | typal | 0.475 | 1.000 | 0.683 | quality_cap<=75 | 40-60 | OUT | 11.13 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 95 | 81.8 | 59.8 | 100 | 50 | recursion | 0.500 | 1.000 | 0.683 | fail:structure,size; size<=19,quality_cap<=67.8 | 0-19 | IN | 9.36 |
| ramos-dragon-engine | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | aggro | 0.000 | 0.000 | 0.683 | quality_cap<=20 | 0-19 | IN | 1.17 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 80.6 | 73.5 | 85 | 100 | 50 | conversion | 0.450 | 0.778 | 0.733 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=88 | 0-19 | IN | 9.92 |
| tazri-upgraded-arena | brawl | 68 | 60.4 | 87.9 | 84 | 73.5 | 92.2 | 100 | 50 | typal | 0.525 | 1.000 | 0.733 | quality_cap<=68.3 | 45-65 | OUT | 12.62 |
| kuja-genome-sorcerer-arena | brawl | 71 | 90 | 84.7 | 92 | 91.7 | 63.7 | 100 | 50 | spells | 0.545 | 1.000 | 0.733 | quality_cap<=71 | 60-80 | IN | 10.83 |
| vivi-battery-arena | brawl | 90 | 87.8 | 82 | 100 | 100 | 98.4 | 100 | 50 | spells | 0.566 | 1.000 | 0.733 | quality_cap<=90.2 | 70-85 | OUT | 9.18 |
| fire-lord-azula-competitive | competitivebrawl | 87 | 83.5 | 82 | 98 | 94.6 | 83.6 | 100 | 50 | spells | 0.470 | 1.000 | 0.733 | quality_cap<=86.8 | 75-90 | IN | 8.79 |
| cedhtop16-ballooncon6 | commander | 92 | 93.8 | 75 | 100 | 78.6 | 95 | 100 | 50 | spells | 0.500 | 0.500 | 0.683 | quality_cap<=95 | 80-95 | IN | 11.77 |
| standard-1445893-univerce | standard | 73 | 65.8 | 60.5 | 94 | 77.5 | 85 | 100 | 50 | midrange | 0.567 | 1.000 | 0.300 | quality_cap<=72.6 | 70-90 | IN | 3.90 |
| standard-1445867-aljce | standard | 68 | 75.1 | 78.6 | 81.7 | 86.3 | 60.1 | 96.6 | 50 | midrange | 0.467 | 1.000 | 0.300 | quality_cap<=68.1 | 65-90 | IN | 3.45 |

Anchors in band: 12/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 59.8 | Creature pressure (10 threats): closes T10, access 27% (u=0.66); independent backup A graveyard tutor + a reanimation spell u=0.13; none. |
| cabbage-cedh-input | 64.7 | Token/Food conversion (8 bodies): closes T10, access 16% (u=0.66); shared bottleneck, protection access 87%; none. |
| precon-witherbloom | 42.5 | Token/Food conversion (5 bodies): closes T12, access 22% (u=0.50); shared bottleneck, protection access 0%; none. |
| the-cabbage-merchant | 48.8 | Token/Food conversion (5 bodies): closes T11, access 98% (u=0.57); shared bottleneck, protection access 0%; none. |
| imotekh-the-stormlord | 50.7 | Creature pressure (7 threats): closes T11, access 48% (u=0.57); independent backup A graveyard tutor + a reanimation spell u=0.13; none. |
| tazri-beacon-of-unity | 68.7 | Token/Food conversion (8 bodies): closes T9, access 23% (u=0.76); shared bottleneck, protection access 38%; none. |
| meren-of-clan-nel-toth | 59.8 | Creature pressure (10 threats): closes T10, access 29% (u=0.66); independent backup A graveyard tutor + a reanimation spell u=0.12; none. |
| ramos-dragon-engine | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| cabbage-merchant-current-brawl | 85 | Creature pressure (4 threats): closes T6, access 81% (u=1.00); shared bottleneck, protection access 0%; none. |
| tazri-upgraded-arena | 92.2 | Creature pressure (3 threats): closes T6, access 97% (u=1.00); shared bottleneck, protection access 48%; none. |
| kuja-genome-sorcerer-arena | 63.7 | Creature pressure (3 threats): closes T8, access 67% (u=0.71); shared bottleneck, protection access 34%; none. |
| vivi-battery-arena | 98.4 | Token/Food conversion (1 bodies): closes T6, access 100% (u=1.00); shared bottleneck, protection access 89%; none. |
| fire-lord-azula-competitive | 83.6 | Creature pressure (4 threats): closes T7, access 29% (u=0.84); shared bottleneck, protection access 96%; none. |
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
| cabbage-cedh-input | 97.7 | 0 charged, 0 stranded, mean u 1.00 |
| precon-witherbloom | 100 | 1 charged, 0 stranded, mean u 1.00 |
| the-cabbage-merchant | 100 | 0 charged, 0 stranded, mean u 1.00 |
| imotekh-the-stormlord | 100 | 0 charged, 0 stranded, mean u 1.00 |
| tazri-beacon-of-unity | 100 | 0 charged, 0 stranded, mean u 1.00 |
| meren-of-clan-nel-toth | 100 | 1 charged, 0 stranded, mean u 1.00 |
| ramos-dragon-engine | 0 | 0 charged, 0 stranded, mean u 1.00 |
| cabbage-merchant-current-brawl | 100 | 0 charged, 0 stranded, mean u 1.00 |
| tazri-upgraded-arena | 100 | 0 charged, 0 stranded, mean u 1.00 |
| kuja-genome-sorcerer-arena | 100 | 0 charged, 0 stranded, mean u 1.00 |
| vivi-battery-arena | 100 | 2 charged, 2 stranded, mean u 0.00 |
| fire-lord-azula-competitive | 100 | 2 charged, 0 stranded, mean u 0.50 |
| cedhtop16-ballooncon6 | 100 | 0 charged, 0 stranded, mean u 1.00 |
| standard-1445893-univerce | 100 | 0 charged, 0 stranded, mean u 1.00 |
| standard-1445867-aljce | 96.6 | 0 charged, 0 stranded, mean u 1.00 |

## Section 8 acceptance, measured

n=200 piles, 30 cEDH lists, 120 held-out Standard positives.

| section-8 target | measured | |
|---|---|---|
| held-out Standard positive median >= 75 | 68 | FAIL |
| cEDH median >= 85 | 91.5 | PASS |
| >= 95% of piles < 25 | 8/200 | FAIL |
| S <= 5 on >= 95% of piles | 0/200 | FAIL |
| Meren S >= 85.5 | 100 | PASS |
| precon S >= 70 | 100 | PASS |
| held-out Standard S median 75-85 | 93.65 | FAIL |
| held-out Standard S zeros <= 6 | 0/120 | PASS |
| held-out Standard W zeros = 0 | 0/120 | PASS |

| Standard held-out cohort | n | total median | S median | S zeros | W median | W zeros |
|---|---:|---:|---:|---:|---:|---:|
| positives (newest 40%) | 120 | 68 | 93.65 | 0 | 85 | 0 |
| losing field (newest 40%) | 120 | 66.5 | 96.6 | 0 | 85 | 0 |

| pile distribution | min | median | max |
|---|---:|---:|---:|
| total | 20 | 59 | 72 |
| S | 30.2 | 55.8 | 81.4 |

Per section 5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. The synthetic basics no longer reuse the commander's card id (section 8), so pile lands are finally scored as lands.
