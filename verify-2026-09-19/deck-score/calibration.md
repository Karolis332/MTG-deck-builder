# Deck Score §4 calibration run (2026-09-19)

Generated 2026-09-20T15:28:02.699Z. Grid re-centred on the §7 v1.1 constants. 61239 candidates evaluated in 377s.

Loss is §4 verbatim: `mean_groups(mean_decks(distance(score,[lo,hi])^2)) + 4*mean_pairs(max(0,5-(strong-weak))^2) + .1*Σ(weight-initial)^2`.
The three profiles are searched independently because a Standard tuning cannot move a Commander deck.
Standard is split chronologically by `event_date` (oldest 60% train, newest 40% validation); Commander holds out 10 of 30 cEDH lists and scores the full pile set only at validation.

### commander

Candidates evaluated 20413. Train loss 130.00 (band 120.00, pairs 2.50, weight penalty 0.00).
Validation loss: searched 0.83 vs section-7 centre 0.83 -> keep the searched winner.

Chosen: weights mana=20.61855670103093 curve=10.309278350515465 interaction=16.494845360824744 advantage=14.43298969072165 win=20.61855670103093 synergy=17.52577319587629 · countMultiplier 1 · pWin 0.15 · h 5 · Tfast 7 · poolSizeCap 10 · cap 20+0.8*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| cedh | 10 | 75 | 89.5 | 92 | 9/10 (med dist 0.0) |
| curated+precon | 9 | 0 | 54 | 91 | 9/9 (med dist 0.0) |
| piles | 140 | 20 | 20 | 20 | 140/140 (med dist 0.0) |

### brawl

Candidates evaluated 20413. Train loss 0.80 (band 0.80, pairs 0.00, weight penalty 0.00).
Validation loss: searched 0.80 vs section-7 centre 0.80 -> keep the searched winner.

Chosen: weights mana=20.61855670103093 curve=15.463917525773196 interaction=20.61855670103093 advantage=12.371134020618557 win=16.494845360824744 synergy=14.43298969072165 · countMultiplier 1 · pWin 0.25 · h 4 · Tfast 6 · poolSizeCap 4 · cap 20+0.8*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| brawl fixtures | 5 | 19 | 68 | 87 | 4/5 (med dist 0.0) |

### standard

Candidates evaluated 20413. Train loss 453.74 (band 453.74, pairs 0.00, weight penalty 0.00).
Validation loss: searched 388.60 vs section-7 centre 407.16 -> keep the searched winner.

Chosen: weights mana=21.73913043478261 curve=17.391304347826086 interaction=21.73913043478261 advantage=10.869565217391305 win=15.217391304347826 synergy=13.043478260869565 · countMultiplier 0.85 · pWin 0.65 · h 3 · Tfast 7 · poolSizeCap 4 · cap 20+0.8*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| std positives | 120 | 20 | 59 | 88 | 40/120 (med dist 7.5) |
| std negatives | 120 | 20 | 61.5 | 88 | 59/120 (med dist 1.0) |

## Section 4 adversarial checks

Price / EDHREC-rank permutation on 8 fixtures: 8/8 bit-identical results, max |delta total| 0.

Quota gaming (lands, size and MV histogram preserved; only producer->consumer links broken):
- the-cabbage-merchant: broke 5 payoff/converter copies -> W 48.8->48.8, S 48.0->23.4, total 58->39 PASS
- precon-witherbloom: broke 3 payoff/converter copies -> W 42.5->32.3, S 100.0->100.0, total 54->46 PASS
- meren-powerhouse: broke 6 payoff/converter copies -> W 68.7->68.7, S 100.0->98.9, total 75->75 PASS
