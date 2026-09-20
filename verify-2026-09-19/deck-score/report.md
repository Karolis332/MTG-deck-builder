# Deck Score v1 calibration report

Generated 2026-09-20T15:20:22.826Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | plan | Q | R | b | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 75 | 97.8 | 94.4 | 95 | 82 | 68.7 | 100 | 50 | aristocrats | 0.778 | 1.000 | 0.559 | quality_cap<=75 | 65-80 | IN | 40.61 |
| cabbage-cedh-input | commander | 48 | 82.5 | 85.1 | 97.5 | 85 | 74.3 | 35 | 50 | midrange | 0.607 | 0.857 | 0.542 | quality_cap<=48 | 35-50 | IN | 12.85 |
| precon-witherbloom | commander | 54 | 96.9 | 83 | 60.7 | 65 | 42.5 | 100 | 50 | lifegain | 0.814 | 1.000 | 0.559 | quality_cap<=54 | 40-55 | IN | 9.87 |
| the-cabbage-merchant | commander | 58 | 92.3 | 94.6 | 62.5 | 74.6 | 48.8 | 48 | 50 | conversion | 0.649 | 0.750 | 0.559 | quality_cap<=58.4 | 55-70 | IN | 11.19 |
| imotekh-the-stormlord | commander | 60 | 88.1 | 93.4 | 51.9 | 74.6 | 50.6 | 100 | 50 | recursion | 0.750 | 1.000 | 0.559 | quality_cap<=60.5 | 45-65 | IN | 11.67 |
| tazri-beacon-of-unity | commander | 54 | 90.4 | 94.4 | 96 | 70.1 | 59.8 | 42.6 | 50 | typal | 0.619 | 1.000 | 0.559 | quality_cap<=54.1 | 40-60 | IN | 19.86 |
| meren-of-clan-nel-toth | commander | 19 | 97.5 | 95.6 | 95 | 81.8 | 68.7 | 99 | 50 | aristocrats | 0.766 | 0.990 | 0.559 | fail:structure,size; size<=19,quality_cap<=75 | 0-19 | IN | 8.15 |
| ramos-dragon-engine | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | aggro | 0.000 | 0.000 | 0.542 | quality_cap<=20 | 0-19 | IN | 1.52 |
| cabbage-merchant-current-brawl | brawl | 19 | 95.6 | 94.6 | 71 | 73.5 | 85 | 48.6 | 50 | conversion | 0.651 | 0.742 | 0.559 | fail:structure,size,legality; size<=19,legality<=19,quality_cap<=58.9 | 0-19 | IN | 8.69 |
| tazri-upgraded-arena | brawl | 50 | 60.4 | 84.3 | 80.4 | 77.1 | 92.2 | 37.4 | 50 | midrange | 0.621 | 0.750 | 0.542 | quality_cap<=49.9 | 45-65 | IN | 10.27 |
| kuja-genome-sorcerer-arena | brawl | 71 | 90 | 84.7 | 92 | 91.7 | 63.7 | 100 | 50 | spells | 0.750 | 1.000 | 0.559 | quality_cap<=71 | 60-80 | IN | 7.62 |
| vivi-battery-arena | brawl | 68 | 87.8 | 82 | 100 | 100 | 69.5 | 59.5 | 50 | spells | 0.643 | 1.000 | 0.559 | quality_cap<=67.6 | 70-85 | OUT | 10.36 |
| fire-lord-azula-competitive | competitivebrawl | 87 | 83.5 | 82 | 96 | 94.6 | 83.6 | 92.5 | 50 | spells | 0.689 | 1.000 | 0.559 | quality_cap<=86.8 | 75-90 | IN | 7.89 |
| cedhtop16-ballooncon6 | commander | 91 | 93.8 | 75 | 100 | 78.6 | 90.5 | 100 | 50 | spells | 0.705 | 1.000 | 0.559 | quality_cap<=92.4 | 80-95 | IN | 11.08 |
| standard-1445893-univerce | standard | 73 | 65.8 | 60.5 | 94 | 77.5 | 85 | 100 | 50 | midrange | 0.872 | 1.000 | 0.300 | quality_cap<=72.6 | 70-90 | IN | 2.84 |
| standard-1445867-aljce | standard | 68 | 75.1 | 86.4 | 89 | 86.3 | 60.1 | 84.7 | 50 | aggro | 0.639 | 1.000 | 0.300 | quality_cap<=68.1 | 65-90 | IN | 4.96 |

Anchors in band: 15/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 68.7 | Control inevitability (15 finishers): closes T8, access 93% (u=0.76); shared bottleneck, protection access 38%; none. |
| cabbage-cedh-input | 74.3 | Control inevitability (13 finishers): closes T8, access 90% (u=0.76); shared bottleneck, protection access 87%; none. |
| precon-witherbloom | 42.5 | Token/Food conversion (5 bodies): closes T12, access 26% (u=0.50); shared bottleneck, protection access 0%; none. |
| the-cabbage-merchant | 48.8 | Token/Food conversion (5 bodies): closes T11, access 100% (u=0.57); shared bottleneck, protection access 0%; none. |
| imotekh-the-stormlord | 50.6 | Token/Food conversion (6 bodies): closes T11, access 17% (u=0.57); shared bottleneck, protection access 20%; none. |
| tazri-beacon-of-unity | 59.8 | Creature pressure (7 threats): closes T10, access 74% (u=0.66); shared bottleneck, protection access 38%; none. |
| meren-of-clan-nel-toth | 68.7 | Control inevitability (16 finishers): closes T8, access 94% (u=0.76); shared bottleneck, protection access 37%; none. |
| ramos-dragon-engine | 0 | no supported closing line: no catalogued win recipe present; t* never reached within 12 turns. |
| cabbage-merchant-current-brawl | 85 | Creature pressure (4 threats): closes T6, access 77% (u=1.00); shared bottleneck, protection access 0%; none. |
| tazri-upgraded-arena | 92.2 | Creature pressure (3 threats): closes T6, access 97% (u=1.00); shared bottleneck, protection access 48%; none. |
| kuja-genome-sorcerer-arena | 63.7 | Control inevitability (13 finishers): closes T8, access 100% (u=0.71); shared bottleneck, protection access 34%; none. |
| vivi-battery-arena | 69.5 | Control inevitability (11 finishers): closes T8, access 84% (u=0.71); shared bottleneck, protection access 89%; none. |
| fire-lord-azula-competitive | 83.6 | Creature pressure (3 threats): closes T7, access 51% (u=0.84); shared bottleneck, protection access 96%; none. |
| cedhtop16-ballooncon6 | 90.5 | Alternate win condition: closes T7, access 14% (u=0.95); independent backup Dramatic Reversal + Isochron Scepter u=0.13; none. |
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
| cabbage-cedh-input | 35 | 0 charged, 0 stranded, mean u 1.00 |
| precon-witherbloom | 100 | 1 charged, 0 stranded, mean u 1.00 |
| the-cabbage-merchant | 48 | 0 charged, 0 stranded, mean u 1.00 |
| imotekh-the-stormlord | 100 | 0 charged, 0 stranded, mean u 1.00 |
| tazri-beacon-of-unity | 42.6 | 0 charged, 0 stranded, mean u 1.00 |
| meren-of-clan-nel-toth | 99 | 1 charged, 0 stranded, mean u 1.00 |
| ramos-dragon-engine | 0 | 0 charged, 0 stranded, mean u 1.00 |
| cabbage-merchant-current-brawl | 48.6 | 0 charged, 0 stranded, mean u 1.00 |
| tazri-upgraded-arena | 37.4 | 0 charged, 0 stranded, mean u 1.00 |
| kuja-genome-sorcerer-arena | 100 | 0 charged, 0 stranded, mean u 1.00 |
| vivi-battery-arena | 59.5 | 2 charged, 2 stranded, mean u 0.00 |
| fire-lord-azula-competitive | 92.5 | 2 charged, 0 stranded, mean u 0.50 |
| cedhtop16-ballooncon6 | 100 | 0 charged, 0 stranded, mean u 1.00 |
| standard-1445893-univerce | 100 | 0 charged, 0 stranded, mean u 1.00 |
| standard-1445867-aljce | 84.7 | 0 charged, 0 stranded, mean u 1.00 |

## Section 8 acceptance, measured

n=200 piles, 30 cEDH lists, 120 held-out Standard positives.

| section-8 target | measured | |
|---|---|---|
| held-out Standard positive median >= 75 | 55 | FAIL |
| cEDH median >= 85 | 88.5 | PASS |
| >= 95% of piles < 25 | 200/200 | PASS |
| S <= 5 on >= 95% of piles | 200/200 | PASS |
| Meren S >= 85.5 | 100 | PASS |
| precon S >= 70 | 100 | PASS |
| held-out Standard S median 75-85 | 84.7 | PASS |
| held-out Standard S zeros <= 6 | 3/120 | PASS |
| held-out Standard W zeros = 0 | 1/120 | FAIL |

| Standard held-out cohort | n | total median | S median | S zeros | W median | W zeros |
|---|---:|---:|---:|---:|---:|---:|
| positives (newest 40%) | 120 | 55 | 84.7 | 3 | 85 | 1 |
| losing field (newest 40%) | 120 | 56 | 98.1 | 13 | 85 | 0 |

| pile distribution | min | median | max |
|---|---:|---:|---:|
| total | 20 | 20 | 20 |
| S | 0 | 0 | 0 |

Per section 5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. The synthetic basics no longer reuse the commander's card id (section 8), so pile lands are finally scored as lands.
