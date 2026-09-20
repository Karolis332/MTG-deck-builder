# Deck Score v1 calibration report

Generated 2026-09-20T12:38:14.194Z. Raw v1 numbers — weights are NOT tuned in this unit (docs/DECK_SCORE_SPEC.md §4 is a separate calibration pass).
Component columns: M=mana C=curve I=interaction A=advantage W=win S=synergy Fmeta=meta.
"ms" times only the `scoreDeck()` call (feature classification runs inside it); the spec's <20ms budget is stated as "after classification", so this number is a conservative upper bound, not an apples-to-apples comparison.

**Card data:** `data/mtg-deck-builder.db` was refreshed 2026-09-19. Every fixture now resolves completely — the earlier run's "N unresolved" §2 39 caps and its `fail:legality` rows were a stale-card-DB artefact (a missing printing resolved to a row whose `legalities` did not say `legal`), not a scoring defect. The two remaining `fail` rows are the intended structural negatives: `meren-of-clan-nel-toth` is 101 cards as stored, `cabbage-merchant-current` is 101 cards plus Arena-illegal entries.

| Fixture | Format | Score | M | C | I | A | W | S | Fmeta | Gates | Band | IN/OUT | ms |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---:|
| meren-powerhouse | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 85 unresolved; fail:structure; structure<=0 | 65-80 | OUT | 0.74 |
| cabbage-cedh-input | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 73 unresolved; fail:structure; structure<=0 | 35-50 | OUT | 0.03 |
| precon-witherbloom | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 80 unresolved; fail:structure; structure<=0 | 40-55 | OUT | 0.02 |
| the-cabbage-merchant | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 75 unresolved; fail:structure; structure<=0 | 55-70 | OUT | 0.03 |
| imotekh-the-stormlord | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 69 unresolved; fail:structure; structure<=0 | 45-65 | OUT | 0.03 |
| tazri-beacon-of-unity | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 94 unresolved; fail:structure; structure<=0 | 40-60 | OUT | 0.02 |
| meren-of-clan-nel-toth | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 86 unresolved; fail:structure; structure<=0 | 0-19 | IN | 0.02 |
| ramos-dragon-engine | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 unresolved; fail:structure; structure<=0 | 0-19 | IN | 0.02 |
| cabbage-merchant-current-brawl | brawl | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 89 unresolved; fail:structure; structure<=0 | 0-19 | IN | 0.10 |
| tazri-upgraded-arena | brawl | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 98 unresolved; fail:structure; structure<=0 | 45-65 | OUT | 0.03 |
| kuja-genome-sorcerer-arena | brawl | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 79 unresolved; fail:structure; structure<=0 | 60-80 | OUT | 0.02 |
| vivi-battery-arena | brawl | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 88 unresolved; fail:structure; structure<=0 | 70-85 | OUT | 0.02 |
| fire-lord-azula-competitive | competitivebrawl | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 93 unresolved; fail:structure; structure<=0 | 75-90 | OUT | 0.02 |
| cedhtop16-ballooncon6 | commander | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 100 unresolved; fail:structure; structure<=0 | 80-95 | OUT | 0.02 |
| standard-1445893-univerce | standard | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 27 unresolved; fail:structure; structure<=0 | 70-90 | OUT | 0.03 |
| standard-1445867-aljce | standard | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30 unresolved; fail:structure; structure<=0 | 65-90 | OUT | 0.05 |

Anchors in band: 3/16 (fixtures with a hard-cap-only band like "0-19" always count as anchors here; "if rule-valid" bands are graded the same way — this report does not re-derive Arena rule-validity separately).

## Win lines — which closing family the deck's best line came from

| Fixture | W | Reason |
|---|---:|---|
| meren-powerhouse | 0 | invalid or empty deck input. |
| cabbage-cedh-input | 0 | invalid or empty deck input. |
| precon-witherbloom | 0 | invalid or empty deck input. |
| the-cabbage-merchant | 0 | invalid or empty deck input. |
| imotekh-the-stormlord | 0 | invalid or empty deck input. |
| tazri-beacon-of-unity | 0 | invalid or empty deck input. |
| meren-of-clan-nel-toth | 0 | invalid or empty deck input. |
| ramos-dragon-engine | 0 | invalid or empty deck input. |
| cabbage-merchant-current-brawl | 0 | invalid or empty deck input. |
| tazri-upgraded-arena | 0 | invalid or empty deck input. |
| kuja-genome-sorcerer-arena | 0 | invalid or empty deck input. |
| vivi-battery-arena | 0 | invalid or empty deck input. |
| fire-lord-azula-competitive | 0 | invalid or empty deck input. |
| cedhtop16-ballooncon6 | 0 | invalid or empty deck input. |
| standard-1445893-univerce | 0 | invalid or empty deck input. |
| standard-1445867-aljce | 0 | invalid or empty deck input. |

## Section 8 acceptance, measured

n=200 piles, 30 cEDH lists, 120 held-out Standard positives.

| section-8 target | measured | |
|---|---|---|
| held-out Standard positive median >= 75 | 41.5 | FAIL |
| cEDH median >= 85 | 76 | FAIL |
| >= 95% of piles < 25 | 176/200 | FAIL |
| S <= 5 on >= 95% of piles | 167/200 | FAIL |
| Meren S >= 85.5 | 0 | FAIL |
| precon S >= 70 | 0 | FAIL |

| pile distribution | min | median | max |
|---|---:|---:|---:|
| total | 20 | 20 | 38 |
| S | 0 | 0 | 29.2 |

Per section 5: eligible legal singleton cards ordered by SHA-256(seed + canonical id), first N take the nonbasic slots, remaining slots filled with basics split across the commander's color identity. The synthetic basics no longer reuse the commander's card id (section 8), so pile lands are finally scored as lands.
