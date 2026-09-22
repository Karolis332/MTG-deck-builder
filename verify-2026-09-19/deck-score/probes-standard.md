## §10.4 gaming probes — standard training stride (499 fully resolved lists)

Allowance for the WHOLE k-copy edit: max +0 S (1e-6), +1 displayed total,
+1 unrounded rank and +1 displayed rank (§10.9 item 5).
`rank absent` counts edits where one endpoint left the rank domain: no
numeric rank delta exists there, so it is counted, never graded as 0.
`swap-lands` and `metadata` are equivalences: |ΔS| and |Δtotal| must be 0.
`add-ramp-unmatched` is an UNMATCHED edit: extra ramp can be a real mana
upgrade, so its movement is reported, not graded.
The `ΔU>0` columns hold the lists where the edit raised the §10.2 useful
mass itself — a real assignment gain, reported and excluded from grading.
`repaired` counts edits that removed a card the deck was ILLEGAL for:
lifting a rule failure is a benefit, so those totals are not graded.

| probe | k | lists | skipped | max ΔS | max ΔT_abs | max Δtotal | max Δrank | max Δrank shown | S viol | total viol | rank viol | rank absent | repaired | ΔU>0 | max ΔU | max ΔS there | worst lists |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| delete-offplan-typed | 1 | 41 | 458 | 1.60 | 0.23 | 1 | 0.41 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | standard:1445911(+1.6) |
| delete-offplan-typed | 5 | 25 | 474 | 0.00 | 0.23 | 1 | 0.30 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| delete-offplan-typed | 10 | 21 | 478 | 0.00 | 0.58 | 1 | 0.64 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| replace-offplan-unknown | 1 | 41 | 458 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| replace-offplan-unknown | 5 | 25 | 474 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| replace-offplan-unknown | 10 | 21 | 478 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped | 1 | 499 | 0 | 0.00 | 14.08 | 14 | 27.08 | 27 | 0 | 8+ | 8+ | 11 | 0 | 0 | 0.0 | 0.0 | standard:1487164(rank+1.77/disp+2) standard:1485624(rank+1.11/disp+1) standard:1481357(rank+1.11/disp+1) |
| add-untyped | 5 | 499 | 0 | 0.00 | 14.64 | 14 | 27.66 | 27 | 0 | 8+ | 8+ | 11 | 0 | 0 | 0.0 | 0.0 | standard:1487164(rank+6.54/disp+7) standard:1485624(rank+6.87/disp+6) standard:1481357(rank+6.87/disp+6) |
| add-untyped | 10 | 499 | 0 | 0.00 | 18.80 | 19 | 38.82 | 38 | 0 | 8+ | 8+ | 11 | 0 | 0 | 0.0 | 0.0 | standard:1487164(rank+28.15/disp+28) standard:1485624(rank+27.49/disp+27) standard:1481357(rank+27.49/disp+27) |
| add-saturated-staples | 1 | 479 | 20 | 0.00 | 16.48 | 16 | 34.20 | 34 | 0 | 8+ | 8+ | 11 | 0 | 36 | 1.0 | 2.6 | standard:1445953(rank+27.08/disp+27) standard:1446029(rank+27.08/disp+27) standard:1445983(rank+3.44/disp+3) |
| add-saturated-staples | 5 | 387 | 112 | 0.00 | 16.16 | 16 | 34.20 | 34 | 0 | 8+ | 8+ | 11 | 0 | 87 | 5.0 | 6.6 | standard:1484640(rank+30.11/disp+30) standard:1478801(rank+34.20/disp+34) standard:1474208(rank+1.16/disp+1) |
| add-saturated-staples | 10 | 141 | 358 | 0.00 | 18.96 | 19 | 27.08 | 27 | 0 | 8+ | 8+ | 2 | 0 | 64 | 7.0 | 6.9 | standard:1474208(rank+3.16/disp+3) standard:1445911(rank+9.82/disp+10) standard:1446023(rank+10.72/disp+10) |
| add-ramp-unmatched | 1 | 499 | 0 | 0.00 | 2.27 | 3 | 2.70 | 2 | 0 | 0 | 0 | 0 | 0 | 489 | 11.0 | 36.7 | — |
| add-ramp-unmatched | 5 | 499 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 499 | 19.0 | 44.8 | — |
| add-ramp-unmatched | 10 | 498 | 1 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 498 | 24.0 | 45.3 | — |
| swap-lands | 1 | 499 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0.0 | 0.0 | — |
| swap-lands | 5 | 307 | 192 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 0.0 | 0.0 | — |
| swap-lands | 10 | 128 | 371 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0.0 | 0.0 | — |
| metadata | - | 499 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0.0 | 0.0 | — |
