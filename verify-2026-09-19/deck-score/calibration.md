# Deck Score §4 calibration run (2026-09-19)

Generated 2026-09-19T17:32:37.676Z. Grid re-centred on the §7 v1.1 constants. 123877 candidates evaluated in 117s.

Loss is §4 verbatim: `mean_groups(mean_decks(distance(score,[lo,hi])^2)) + 4*mean_pairs(max(0,5-(strong-weak))^2) + .1*Σ(weight-initial)^2`.
The three profiles are searched independently because a Standard tuning cannot move a Commander deck.
Standard is split chronologically by `event_date` (oldest 60% train, newest 40% validation); Commander holds out 10 of 30 cEDH lists and scores the full pile set only at validation.

### commander

Candidates evaluated 44581. Train loss 307.36 (band 292.56, pairs 3.70, weight penalty 0.00).
Validation loss: searched 163.67 vs section-7 centre 212.42 -> keep the searched winner.

Chosen: weights mana=20 curve=10 interaction=16 advantage=14 win=20 synergy=17 · countMultiplier 1 · pWin 0.15 · h 5 · Tfast 7 · poolSizeCap 10 · cap 20+0.8*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| cedh | 10 | 69 | 69 | 86 | 1/10 (med dist 16.0) |
| curated+precon | 9 | 2 | 30 | 69 | 3/9 (med dist 11.0) |
| piles | 200 | 20 | 20 | 55 | 180/200 (med dist 0.0) |

### brawl

Candidates evaluated 20413. Train loss 0.20 (band 0.20, pairs 0.00, weight penalty 0.00).
Validation loss: searched 0.20 vs section-7 centre 501.80 -> keep the searched winner.

Chosen: weights mana=20 curve=15 interaction=20 advantage=12 win=16 synergy=14 · countMultiplier 0.85 · pWin 0.25 · h 4 · Tfast 6 · poolSizeCap 4 · cap 15+0.85*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| brawl fixtures | 5 | 15 | 69 | 84 | 4/5 (med dist 0.0) |

### standard

Candidates evaluated 58883. Train loss 1499.81 (band 945.09, pairs 137.58, weight penalty 4.40).
Validation loss: searched 1856.18 vs section-7 centre 1775.80 -> REJECT the searched winner, freeze the centre (search overfitted the train fold).

Chosen: weights mana=20 curve=16 interaction=20 advantage=10 win=14 synergy=12 · countMultiplier 1 · pWin 0.60 · h 2 · Tfast 6 · poolSizeCap 4 · cap 20+0.8*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| std positives | 86 | 20 | 42 | 79 | 0/86 (med dist 43.0) |
| std negatives | 38 | 20 | 40 | 70 | 36/38 (med dist 0.0) |

## Section 4 adversarial checks

Price / EDHREC-rank permutation on 8 fixtures: 8/8 bit-identical results, max |delta total| 0.

Quota gaming (lands, size and MV histogram preserved; only producer->consumer links broken):
- the-cabbage-merchant: broke 5 payoff/converter copies -> W 0.0->0.0, S 91.3->91.3, total 20->20 PASS
- precon-witherbloom: broke 3 payoff/converter copies -> W 47.7->32.0, S 100.0->100.0, total 58->46 PASS
- meren-powerhouse: broke 5 payoff/converter copies -> W 57.1->57.1, S 97.5->87.5, total 66->66 PASS
