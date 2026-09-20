# Deck Score §4 calibration run (2026-09-19)

Generated 2026-09-20T12:06:27.194Z. Grid re-centred on the §7 v1.1 constants. 61239 candidates evaluated in 234s.

Loss is §4 verbatim: `mean_groups(mean_decks(distance(score,[lo,hi])^2)) + 4*mean_pairs(max(0,5-(strong-weak))^2) + .1*Σ(weight-initial)^2`.
The three profiles are searched independently because a Standard tuning cannot move a Commander deck.
Standard is split chronologically by `event_date` (oldest 60% train, newest 40% validation); Commander holds out 10 of 30 cEDH lists and scores the full pile set only at validation.

### commander

Candidates evaluated 20413. Train loss 106.62 (band 106.62, pairs 0.00, weight penalty 0.00).
Validation loss: searched 34.11 vs section-7 centre 34.11 -> keep the searched winner.

Chosen: weights mana=20.61855670103093 curve=10.309278350515465 interaction=16.494845360824744 advantage=14.43298969072165 win=20.61855670103093 synergy=17.52577319587629 · countMultiplier 1 · pWin 0.15 · h 5 · Tfast 7 · poolSizeCap 10 · cap 20+0.8*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| cedh | 10 | 69 | 76.5 | 85 | 4/10 (med dist 3.5) |
| curated+precon | 9 | 0 | 52 | 88 | 6/9 (med dist 0.0) |
| piles | 140 | 20 | 20 | 38 | 121/140 (med dist 0.0) |

### brawl

Candidates evaluated 20413. Train loss 33.80 (band 33.80, pairs 0.00, weight penalty 0.00).
Validation loss: searched 33.80 vs section-7 centre 33.80 -> keep the searched winner.

Chosen: weights mana=20.61855670103093 curve=15.463917525773196 interaction=20.61855670103093 advantage=12.371134020618557 win=16.494845360824744 synergy=14.43298969072165 · countMultiplier 1 · pWin 0.25 · h 4 · Tfast 6 · poolSizeCap 4 · cap 20+0.8*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| brawl fixtures | 5 | 19 | 71 | 87 | 4/5 (med dist 0.0) |

### standard

Candidates evaluated 20413. Train loss 973.78 (band 973.78, pairs 0.00, weight penalty 0.00).
Validation loss: searched 852.77 vs section-7 centre 853.72 -> keep the searched winner.

Chosen: weights mana=21.73913043478261 curve=17.391304347826086 interaction=21.73913043478261 advantage=10.869565217391305 win=15.217391304347826 synergy=13.043478260869565 · countMultiplier 1.15 · pWin 0.55 · h 3 · Tfast 7 · poolSizeCap 4 · cap 20+0.8*min(M,W,S)

| cohort | n | min | median | max | in band |
|---|---:|---:|---:|---:|---|
| std positives | 120 | 20 | 41.5 | 85 | 20/120 (med dist 23.5) |
| std negatives | 120 | 20 | 39 | 85 | 41/120 (med dist 21.0) |

## Section 4 adversarial checks

Price / EDHREC-rank permutation on 8 fixtures: 8/8 bit-identical results, max |delta total| 0.

Quota gaming (lands, size and MV histogram preserved; only producer->consumer links broken):
- the-cabbage-merchant: broke 5 payoff/converter copies -> W 48.8->48.8, S 71.2->71.2, total 59->59 PASS
- precon-witherbloom: broke 3 payoff/converter copies -> W 42.5->38.6, S 39.7->44.0, total 52->51 FAIL
- meren-powerhouse: broke 6 payoff/converter copies -> W 68.7->68.7, S 93.8->99.6, total 75->75 FAIL
