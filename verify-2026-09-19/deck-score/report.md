# Deck Score v1 calibration report

Generated 2026-09-21T17:10:28.107Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | plan | Q | R | b | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 56 | 97.8 | 94.4 | 95 | 82 | 45.3 | 100 | 50 | aristocrats | 0.495 | 1.000 | 0.683 | quality_cap<=56.2 | 65-80 | OUT | 66.31 |
| cabbage-cedh-input | commander | 59 | 82.5 | 85.1 | 97.5 | 85 | 49 | 97.7 | 50 | conversion | 0.424 | 0.667 | 0.683 | quality_cap<=59.2 | 35-50 | OUT | 14.90 |
| precon-witherbloom | commander | 23 | 96.9 | 83 | 60.7 | 65 | 3.2 | 100 | 50 | lifegain | 0.485 | 0.833 | 0.683 | quality_cap<=22.6 | 40-55 | OUT | 10.42 |
| the-cabbage-merchant | commander | 54 | 92.3 | 94.6 | 70.6 | 74.6 | 42.5 | 100 | 50 | conversion | 0.455 | 0.778 | 0.683 | quality_cap<=54 | 55-70 | OUT | 11.54 |
| imotekh-the-stormlord | commander | 51 | 88.1 | 93.4 | 51.9 | 74.6 | 38.9 | 100 | 50 | recursion | 0.495 | 1.000 | 0.683 | quality_cap<=51.1 | 45-65 | IN | 18.50 |
| tazri-beacon-of-unity | commander | 56 | 90.4 | 94.4 | 96 | 65 | 45.3 | 100 | 50 | typal | 0.475 | 1.000 | 0.683 | quality_cap<=56.2 | 40-60 | IN | 14.13 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 95 | 81.8 | 45.3 | 100 | 50 | recursion | 0.500 | 1.000 | 0.683 | fail:structure,size; size<=19,quality_cap<=56.2 | 0-19 | IN | 11.75 |
| ramos-dragon-engine | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | aggro | 0.000 | 0.000 | 0.683 | fail:structure,size; size<=19,quality_cap<=20 | 0-19 | IN | 0.92 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 80.6 | 73.5 | 60.1 | 100 | 50 | conversion | 0.450 | 0.778 | 0.733 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=68.1 | 0-19 | IN | 14.16 |
| tazri-upgraded-arena | brawl | 68 | 60.4 | 87.9 | 84 | 73.5 | 65.2 | 100 | 50 | typal | 0.525 | 1.000 | 0.733 | quality_cap<=68.3 | 45-65 | OUT | 12.01 |
| kuja-genome-sorcerer-arena | brawl | 56 | 90 | 84.7 | 92 | 91.7 | 45 | 100 | 50 | spells | 0.545 | 1.000 | 0.733 | quality_cap<=56 | 60-80 | OUT | 11.79 |
| vivi-battery-arena | brawl | 86 | 87.8 | 82 | 100 | 100 | 82.7 | 100 | 50 | spells | 0.566 | 1.000 | 0.733 | quality_cap<=86.2 | 70-85 | OUT | 13.23 |
| fire-lord-azula-competitive | competitivebrawl | 76 | 83.5 | 82 | 98 | 94.6 | 70.3 | 100 | 50 | spells | 0.470 | 1.000 | 0.733 | quality_cap<=76.2 | 75-90 | IN | 9.39 |
| cedhtop16-ballooncon6 | commander | 92 | 93.8 | 75 | 100 | 78.6 | 95 | 100 | 50 | spells | 0.500 | 0.500 | 0.683 | quality_cap<=95 | 80-95 | IN | 15.57 |
| standard-1445893-univerce | standard | 73 | 65.8 | 60.5 | 94 | 77.5 | 85 | 100 | 50 | midrange | 0.567 | 1.000 | 0.300 | quality_cap<=72.6 | 70-90 | IN | 5.70 |
| standard-1445867-aljce | standard | 68 | 75.1 | 78.6 | 81.7 | 86.3 | 60.1 | 96.6 | 50 | midrange | 0.467 | 1.000 | 0.300 | quality_cap<=68.1 | 65-90 | IN | 3.43 |

## §10.9 item 7 — the 16 rank anchors (v1.4 stage 2c)

Graded against §10.9's rank table, through `scoreDeckSafely`. Absolute bands
below are the superseded §5/§8 ones, kept as diagnostics.
`scoreDeck` vs `scoreDeckSafely` total drift: none.

| # | anchor | format | total (unrounded) | rank | required | headline/evidence | verdict |
|---:|---|---|---:|---:|---|---|---|
| 1 | meren-powerhouse | commander | 56 (56.24) | 79.84 | p65-p90 | rank/calibrated | PASS (mandatory) |
| 2 | cabbage-cedh-input | commander | 59 (59.2) | 87.40 | p50-p90 | rank/calibrated | PASS (mandatory) |
| 3 | precon-witherbloom | commander | 23 (22.560000000000002) | 24.45 | p15-p40 | rank/calibrated | PASS (mandatory) |
| 4 | the-cabbage-merchant | commander | 54 (54) | 71.43 | p50-p90 | rank/calibrated | PASS (mandatory) |
| 5 | imotekh-the-stormlord | commander | 51 (51.120000000000005) | 61.64 | p40-p80 | rank/calibrated | PASS |
| 6 | tazri-beacon-of-unity | commander | 56 (56.24) | 79.84 | p35-p75 | rank/calibrated | FAIL |
| 7 | meren-of-clan-nel-toth | commander | 19 (19) | none | no rank + total 0-19 | none/invalid | PASS (mandatory) |
| 8 | ramos-dragon-engine | commander | 0 (0) | none | no rank + total 0-19 | none/invalid | PASS (mandatory) |
| 9 | cabbage-merchant-current-brawl | brawl | 19 (19) | none | no rank + total 0-19 | none/invalid | PASS (mandatory) |
| 10 | tazri-upgraded-arena | brawl | 68 (68.32) | 50.34 | p35-p65 | rank/calibrated | PASS |
| 11 | kuja-genome-sorcerer-arena | brawl | 56 (56) | 8.34 | p25-p60 | rank/calibrated | FAIL |
| 12 | vivi-battery-arena | brawl | 86 (86.16000000000001) | 99.86 | p80-p100 | rank/calibrated | PASS |
| 13 | fire-lord-azula-competitive | competitivebrawl | 76 (76.24000000000001) | none | p80-p100 | uncalibrated/uncalibrated | FAIL |
| 14 | cedhtop16-ballooncon6 | commander | 92 (92.02474226804125) | 99.77 | p95-p100 | rank/calibrated | PASS (mandatory) |
| 15 | standard-1445893-univerce | standard | 73 (72.64) | 77.64 | p65-p95 | rank/calibrated | PASS |
| 16 | standard-1445867-aljce | standard | 68 (68.08000000000001) | 66.10 | p55-p90 | rank/calibrated | PASS |

**13/16** in band (gate >= 14/16); legal subset **10/13** (gate >= 11/13); mandatory failures: none.
Overall: FAIL.

## §10.9 cEDH regression ranks

30 cEDH regression lists, 30 with a numeric rank.

| §10.9 cEDH requirement | measured | |
|---|---|---|
| rank p10 >= 95 | 96.51 | PASS |
| rank p50 >= 98 | 99.71 | PASS |
| cedh-0 (formerly missing line) rank >= 95 | 99.71 (T_abs 91.53814432989691, W 95) | PASS |
| cedh-1 (formerly missing line) rank >= 95 | 99.71 (T_abs 91.53814432989691, W 95) | PASS |
| cedh-2 Balloon Con rank >= 95 | 99.77 (T_abs 92.02474226804125, W 95) | PASS |
| W > 0 on 30/30 | 30/30 | PASS |

rank p10/p50/p90: 96.51 / 99.71 / 99.83

Anchors in band (superseded absolute bands): 9/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 45.3 | Creature pressure (8 threats): closes T12, access 79% (u=0.50); independent backup A graveyard tutor + a reanimation spell u=0.13; none. |
| cabbage-cedh-input | 49 | Token/Food conversion (7 bodies): closes T12, access 46% (u=0.50); shared bottleneck, protection access 87%; none. |
| precon-witherbloom | 3.2 | Token/Food conversion (5 bodies): closes T14, access 1% (u=0.04); shared bottleneck, protection access 0%; none. |
| the-cabbage-merchant | 42.5 | Token/Food conversion (5 bodies): closes T12, access 97% (u=0.50); shared bottleneck, protection access 0%; none. |
| imotekh-the-stormlord | 38.9 | Creature pressure (5 threats): closes T13, access 22% (u=0.44); independent backup A graveyard tutor + a reanimation spell u=0.13; none. |
| tazri-beacon-of-unity | 45.3 | Creature pressure (6 threats): closes T12, access 94% (u=0.50); shared bottleneck, protection access 38%; none. |
| meren-of-clan-nel-toth | 45.3 | Creature pressure (8 threats): closes T12, access 80% (u=0.50); independent backup A graveyard tutor + a reanimation spell u=0.12; none. |
| ramos-dragon-engine | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 20 turns. |
| cabbage-merchant-current-brawl | 60.1 | Token/Food conversion (3 bodies): closes T8, access 99% (u=0.71); shared bottleneck, protection access 0%; none. |
| tazri-upgraded-arena | 65.2 | Creature pressure (2 threats): closes T8, access 100% (u=0.71); shared bottleneck, protection access 48%; none. |
| kuja-genome-sorcerer-arena | 45 | Creature pressure (2 threats): closes T10, access 93% (u=0.50); shared bottleneck, protection access 34%; none. |
| vivi-battery-arena | 82.7 | Creature pressure (1 threats): closes T7, access 100% (u=0.84); shared bottleneck, protection access 89%; none. |
| fire-lord-azula-competitive | 70.3 | Creature pressure (3 threats): closes T8, access 60% (u=0.71); shared bottleneck, protection access 96%; none. |
| cedhtop16-ballooncon6 | 95 | Thassa's Oracle + Demonic Consultation: closes T7, access 17% (u=1.00); shared bottleneck, protection access 67%; none. |
| standard-1445893-univerce | 85 | Token/Food conversion (2 bodies): closes T6, access 61% (u=1.00); shared bottleneck, protection access 0%; none. |
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
| held-out Standard positive median >= 75 | 59.5 | FAIL |
| cEDH median >= 85 | 91.5 | PASS |
| >= 95% of piles < 25 | 15/200 | FAIL |
| S <= 5 on >= 95% of piles | 0/200 | FAIL |
| Meren S >= 85.5 | 100 | PASS |
| precon S >= 70 | 100 | PASS |
| held-out Standard S median 75-85 | 93.65 | FAIL |
| held-out Standard S zeros <= 6 | 0/120 | PASS |
| held-out Standard W zeros = 0 | 4/120 | FAIL |

| Standard held-out cohort | n | total median | S median | S zeros | W median | W zeros |
|---|---:|---:|---:|---:|---:|---:|
| positives (newest 40%) | 120 | 59.5 | 93.65 | 0 | 60.1 | 4 |
| losing field (newest 40%) | 120 | 54 | 96.6 | 0 | 60.1 | 3 |

| pile distribution | min | median | max |
|---|---:|---:|---:|
| total | 20 | 50 | 57 |
| S | 30.2 | 55.8 | 81.4 |

Per section 5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. The synthetic basics no longer reuse the commander's card id (section 8), so pile lands are finally scored as lands.
